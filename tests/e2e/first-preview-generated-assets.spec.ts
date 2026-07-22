import { expect, test } from "@playwright/test";

import {
  FIRST_PREVIEW_GENERATED_ASSET_CACHE_CONTROL,
  FIRST_PREVIEW_GENERATED_ASSET_MAX_BYTES,
  deriveFirstPreviewGeneratedAssetId,
  sha256FirstPreviewAsset,
  type FirstPreviewAuthorizedAssetDescriptor,
  type FirstPreviewStoredAssetMetadata,
  type PersistFirstPreviewGeneratedAssetInput,
} from "../../lib/server/ai-sketch/first-preview-generated-assets-contract";
import { FIRST_PREVIEW_ASSET_BUCKET } from "../../lib/server/ai-sketch/first-preview-persistence-contract";
import {
  createFirstPreviewGeneratedAssetStoreBinding,
  createSupabaseFirstPreviewGeneratedAssetStore,
} from "../../lib/server/ai-sketch/supabase-first-preview-generated-assets";
import {
  FakeFirstPreviewAssetAuthorizer,
  FakeFirstPreviewStorageClient,
  createSyntheticFirstPreviewPng,
} from "../fixtures/ai-sketch/fake-first-preview-storage-client";

const PUBLIC_REFERENCE = "NOVORA-CB-20260722-A540";
const BRIEF_ID = "123e4567-e89b-42d3-a456-426614174000";
const JOB_ID = "223e4567-e89b-42d3-a456-426614174000";
const OUTPUT_ID = "323e4567-e89b-42d3-a456-426614174000";
const OTHER_OUTPUT_ID = "423e4567-e89b-42d3-a456-426614174000";
const ASSET_ID = deriveFirstPreviewGeneratedAssetId({
  conceptBriefId: BRIEF_ID,
  jobId: JOB_ID,
  outputId: OUTPUT_ID,
})!;
const VALID_PNG = createSyntheticFirstPreviewPng();
const VALIDATED_AT = "2026-07-22T12:00:01.000Z";

function input(
  overrides: Partial<PersistFirstPreviewGeneratedAssetInput> = {},
): PersistFirstPreviewGeneratedAssetInput {
  return {
    conceptBriefId: BRIEF_ID,
    jobId: JOB_ID,
    outputId: OUTPUT_ID,
    mimeType: "image/png",
    imageBytes: VALID_PNG,
    ...overrides,
  };
}

function harness() {
  const storage = new FakeFirstPreviewStorageClient();
  const authorizer = new FakeFirstPreviewAssetAuthorizer();
  const store = createSupabaseFirstPreviewGeneratedAssetStore(storage, authorizer, {
    clock: () => VALIDATED_AT,
  });
  return { storage, authorizer, store };
}

function metadata(
  overrides: Partial<FirstPreviewStoredAssetMetadata> = {},
): FirstPreviewStoredAssetMetadata {
  return {
    assetId: ASSET_ID,
    assetPersisted: true,
    bucketName: FIRST_PREVIEW_ASSET_BUCKET,
    mimeType: "image/png",
    byteSize: VALID_PNG.byteLength,
    widthPx: 1024,
    heightPx: 1024,
    contentSha256: sha256FirstPreviewAsset(VALID_PNG),
    assetCreatedAt: "2026-07-22T12:00:00.000Z",
    assetValidatedAt: VALIDATED_AT,
    ...overrides,
  };
}

function descriptor(
  asset: FirstPreviewStoredAssetMetadata = metadata(),
): FirstPreviewAuthorizedAssetDescriptor {
  return {
    conceptBriefId: BRIEF_ID,
    jobId: JOB_ID,
    outputId: OUTPUT_ID,
    asset,
    readinessStatus: "first_preview_ready",
    isCurrentCustomerPreview: true,
  };
}

test.describe("server-only private First Preview generated assets", () => {
  test("persists to one deterministic private object without upsert, then validates the stored bytes", async () => {
    const { storage, store } = harness();
    const result = await store.persistValidatedPng(input());

    expect(result).toEqual({
      ok: true,
      value: {
        disposition: "created",
        asset: metadata(),
      },
    });
    expect(storage.operations).toEqual([
      "inspectBucket",
      "uploadObject",
      "downloadObject",
      "inspectObject",
    ]);
    expect(storage.uploads).toHaveLength(1);
    expect(storage.uploads[0]).toMatchObject({
      bucketName: FIRST_PREVIEW_ASSET_BUCKET,
      objectPath: ASSET_ID,
      contentType: "image/png",
      upsert: false,
    });
    expect(storage.uploads[0].body).toEqual(VALID_PNG);
    expect(JSON.stringify(result)).not.toContain("http");
    expect(JSON.stringify(result)).not.toContain("provider");
    expect(store).not.toHaveProperty("delete");
    expect(store).not.toHaveProperty("createSignedUrl");
  });

  test("makes duplicate and concurrent writes idempotent without overwriting", async () => {
    const { storage, store } = harness();
    const first = await store.persistValidatedPng(input());
    const replay = await store.persistValidatedPng(input());
    expect(first).toMatchObject({ ok: true, value: { disposition: "created" } });
    expect(replay).toMatchObject({ ok: true, value: { disposition: "existing" } });
    expect(storage.objects.size).toBe(1);

    const concurrent = harness();
    const results = await Promise.all([
      concurrent.store.persistValidatedPng(input()),
      concurrent.store.persistValidatedPng(input()),
    ]);
    expect(results.map((result) => result.ok === true ? result.value.disposition : result.code).sort())
      .toEqual(["created", "existing"]);
    expect(concurrent.storage.objects.size).toBe(1);
  });

  test("fails closed when the same deterministic identity already contains different bytes", async () => {
    const { storage, store } = harness();
    const alternate = createSyntheticFirstPreviewPng(1024, 1024, [
      { type: "sRGB", data: "\0" },
    ]);
    storage.seedObject(ASSET_ID, alternate);

    expect(await store.persistValidatedPng(input())).toEqual({
      ok: false,
      code: "idempotency_conflict",
    });
    expect(storage.objects.get(`${FIRST_PREVIEW_ASSET_BUCKET}\n${ASSET_ID}`)?.body)
      .toEqual(alternate);
  });

  test("keeps invalid persisted bytes private and not ready without deleting them", async () => {
    for (const imageBytes of [
      new Uint8Array([1, 2, 3, 4]),
      createSyntheticFirstPreviewPng(512, 1024),
      createSyntheticFirstPreviewPng(1024, 1024, [
        { type: "tEXt", data: "internal metadata" },
      ]),
    ]) {
      const { storage, store } = harness();
      const result = await store.persistValidatedPng(input({ imageBytes }));
      expect(result).toEqual({ ok: false, code: "invalid_persisted_png" });
      expect(storage.operations.slice(0, 3)).toEqual([
        "inspectBucket",
        "uploadObject",
        "downloadObject",
      ]);
      expect(storage.objects.size).toBe(1);
      expect(store).not.toHaveProperty("delete");
    }
  });

  test("rejects missing, oversized, or malformed identity input before Storage access", async () => {
    for (const invalidInput of [
      input({ outputId: "not-a-uuid" }),
      input({ imageBytes: new Uint8Array() }),
      input({ imageBytes: new Uint8Array(FIRST_PREVIEW_GENERATED_ASSET_MAX_BYTES + 1) }),
    ]) {
      const { storage, store } = harness();
      expect(await store.persistValidatedPng(invalidInput)).toEqual({
        ok: false,
        code: "invalid_input",
      });
      expect(storage.operations).toEqual([]);
    }
  });

  test("refuses a public or mismatched bucket before upload or download", async () => {
    const publicHarness = harness();
    publicHarness.storage.bucketIsPublic = true;
    expect(await publicHarness.store.persistValidatedPng(input())).toEqual({
      ok: false,
      code: "privacy_failure",
    });
    expect(publicHarness.storage.uploads).toEqual([]);

    const mismatched = harness();
    mismatched.storage.bucketName = "unexpected-bucket";
    expect(await mismatched.store.persistValidatedPng(input())).toEqual({
      ok: false,
      code: "privacy_failure",
    });
    expect(mismatched.storage.uploads).toEqual([]);
  });

  test("normalizes Storage failures without exposing raw details", async () => {
    for (const operation of [
      "inspectBucket",
      "uploadObject",
      "downloadObject",
      "inspectObject",
    ] as const) {
      const { storage, store } = harness();
      storage.failNext(operation);
      expect(await store.persistValidatedPng(input())).toEqual({
        ok: false,
        code: "storage_unavailable",
      });
    }
  });

  test("serves validated bytes only through an exact authorized ready/current descriptor", async () => {
    const { storage, authorizer, store } = harness();
    storage.seedObject(ASSET_ID, VALID_PNG);
    authorizer.result = { authorized: true, descriptor: descriptor() };

    const result = await store.readAuthorizedPng({
      publicReference: PUBLIC_REFERENCE,
      outputId: OUTPUT_ID,
    });
    expect(result).toEqual({
      ok: true,
      value: {
        body: VALID_PNG,
        mimeType: "image/png",
        contentLength: VALID_PNG.byteLength,
        contentSha256: sha256FirstPreviewAsset(VALID_PNG),
        cacheControl: FIRST_PREVIEW_GENERATED_ASSET_CACHE_CONTROL,
      },
    });
    expect(authorizer.requests).toEqual([{
      publicReference: PUBLIC_REFERENCE,
      outputId: OUTPUT_ID,
    }]);
    expect(JSON.stringify(result)).not.toContain(ASSET_ID);
    expect(JSON.stringify(result)).not.toContain(FIRST_PREVIEW_ASSET_BUCKET);
    expect(JSON.stringify(result)).not.toContain("signedUrl");
  });

  test("denies unauthorized, revoked, non-current, and wrongly linked access before download", async () => {
    const scenarios: FirstPreviewAuthorizedAssetDescriptor[] = [
      {
        ...descriptor(),
        readinessStatus: "revoked",
      } as unknown as FirstPreviewAuthorizedAssetDescriptor,
      {
        ...descriptor(),
        isCurrentCustomerPreview: false,
      } as unknown as FirstPreviewAuthorizedAssetDescriptor,
      {
        ...descriptor(),
        outputId: OTHER_OUTPUT_ID,
      },
      descriptor(metadata({ assetId: "first-preview/unsafe.png" })),
    ];

    const denied = harness();
    expect(await denied.store.readAuthorizedPng({
      publicReference: PUBLIC_REFERENCE,
      outputId: OUTPUT_ID,
    })).toEqual({ ok: false, code: "access_denied" });
    expect(denied.storage.operations).toEqual([]);

    const invalidRequest = harness();
    expect(await invalidRequest.store.readAuthorizedPng({
      publicReference: "not-a-public-reference",
      outputId: OUTPUT_ID,
    })).toEqual({ ok: false, code: "invalid_input" });
    expect(invalidRequest.authorizer.requests).toEqual([]);
    expect(invalidRequest.storage.operations).toEqual([]);

    const authorizerFailure = harness();
    authorizerFailure.authorizer.shouldThrow = true;
    expect(await authorizerFailure.store.readAuthorizedPng({
      publicReference: PUBLIC_REFERENCE,
      outputId: OUTPUT_ID,
    })).toEqual({ ok: false, code: "access_denied" });
    expect(authorizerFailure.storage.operations).toEqual([]);

    for (const invalidDescriptor of scenarios) {
      const { storage, authorizer, store } = harness();
      authorizer.result = { authorized: true, descriptor: invalidDescriptor };
      expect(await store.readAuthorizedPng({
        publicReference: PUBLIC_REFERENCE,
        outputId: OUTPUT_ID,
      })).toEqual({ ok: false, code: "access_denied" });
      expect(storage.operations).toEqual([]);
    }
  });

  test("fails closed for missing or tampered authorized objects", async () => {
    const missing = harness();
    missing.authorizer.result = { authorized: true, descriptor: descriptor() };
    expect(await missing.store.readAuthorizedPng({
      publicReference: PUBLIC_REFERENCE,
      outputId: OUTPUT_ID,
    })).toEqual({ ok: false, code: "asset_not_found" });

    const tampered = harness();
    tampered.storage.seedObject(ASSET_ID, VALID_PNG);
    tampered.storage.tamperObject(ASSET_ID, createSyntheticFirstPreviewPng(512, 1024));
    tampered.authorizer.result = { authorized: true, descriptor: descriptor() };
    expect(await tampered.store.readAuthorizedPng({
      publicReference: PUBLIC_REFERENCE,
      outputId: OUTPUT_ID,
    })).toEqual({ ok: false, code: "asset_integrity_failure" });
  });

  test("keeps the Production binding unavailable unless every server-only dependency matches", async () => {
    const storage = new FakeFirstPreviewStorageClient();
    const authorizer = new FakeFirstPreviewAssetAuthorizer();
    const configured = createFirstPreviewGeneratedAssetStoreBinding({
      storageClient: storage,
      authorizer,
      bucketName: FIRST_PREVIEW_ASSET_BUCKET,
      clock: () => VALIDATED_AT,
    });
    expect(configured.kind).toBe("supabase");

    for (const store of [
      createFirstPreviewGeneratedAssetStoreBinding({
        storageClient: null,
        authorizer,
        bucketName: FIRST_PREVIEW_ASSET_BUCKET,
      }),
      createFirstPreviewGeneratedAssetStoreBinding({
        storageClient: storage,
        authorizer: null,
        bucketName: FIRST_PREVIEW_ASSET_BUCKET,
      }),
      createFirstPreviewGeneratedAssetStoreBinding({
        storageClient: storage,
        authorizer,
        bucketName: "unexpected-bucket",
      }),
    ]) {
      expect(store.kind).toBe("unavailable");
      expect(await store.persistValidatedPng(input())).toEqual({
        ok: false,
        code: "storage_unavailable",
      });
      expect(await store.readAuthorizedPng({
        publicReference: PUBLIC_REFERENCE,
        outputId: OUTPUT_ID,
      })).toEqual({ ok: false, code: "storage_unavailable" });
    }
    expect(storage.operations).toEqual([]);
  });
});
