import { expect, test } from "@playwright/test";

import type { SupabaseClient } from "@supabase/supabase-js";

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
  createFirstPreviewStorageClient,
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
const CREATED_AT = "2026-07-22T12:00:00.000Z";
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
    publicReference: PUBLIC_REFERENCE,
    conceptBriefId: BRIEF_ID,
    jobId: JOB_ID,
    outputId: OUTPUT_ID,
    asset,
    readinessStatus: "first_preview_ready",
    isCurrentCustomerPreview: true,
  };
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function addHighBitAliasToChunkName(
  imageBytes: Uint8Array,
  byteIndex: 0 | 1 | 2 | 3,
): Uint8Array {
  const buffer = Buffer.from(imageBytes);
  let offset = 8;

  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const typeStart = offset + 4;
    const dataEnd = offset + 8 + length;
    if (buffer.toString("ascii", typeStart, typeStart + 4) === "sRGB") {
      buffer[typeStart + byteIndex] |= 0x80;
      buffer.writeUInt32BE(
        crc32(buffer.subarray(typeStart, dataEnd)),
        dataEnd,
      );
      return new Uint8Array(buffer);
    }
    offset = dataEnd + 4;
  }

  throw new Error("synthetic sRGB chunk not found");
}

async function expectPngRejectedByPersistenceAndRead(
  imageBytes: Uint8Array,
): Promise<void> {
  const persisted = harness();
  expect(await persisted.store.persistValidatedPng(input({ imageBytes }))).toEqual({
    ok: false,
    code: "invalid_persisted_png",
  });

  const authorizedRead = harness();
  authorizedRead.storage.seedObject(ASSET_ID, imageBytes);
  authorizedRead.authorizer.result = {
    authorized: true,
    descriptor: descriptor(metadata({
      byteSize: imageBytes.byteLength,
      contentSha256: sha256FirstPreviewAsset(imageBytes),
    })),
  };
  expect(await authorizedRead.store.readAuthorizedPng({
    publicReference: PUBLIC_REFERENCE,
    outputId: OUTPUT_ID,
    accessProof: "test-access-proof",
  })).toEqual({ ok: false, code: "asset_integrity_failure" });
}

type RawBucketInspection = Readonly<{
  data: unknown;
  error: unknown;
}>;

function actualAdapterHarness(
  inspectBucket: () => Promise<RawBucketInspection>,
) {
  const objects = new Map<string, Uint8Array>();
  const supabase = {
    storage: {
      getBucket: inspectBucket,
      from(bucketName: string) {
        return {
          async upload(
            objectPath: string,
            body: Uint8Array,
            options: { contentType: string; upsert: boolean },
          ) {
            const key = `${bucketName}\n${objectPath}`;
            if (objects.has(key)) {
              return { data: null, error: { statusCode: "409" } };
            }
            objects.set(key, new Uint8Array(body));
            return {
              data: { path: objectPath, contentType: options.contentType },
              error: null,
            };
          },
          async download(objectPath: string) {
            const body = objects.get(`${bucketName}\n${objectPath}`);
            return body
              ? {
                  data: {
                    arrayBuffer: async () => new Uint8Array(body).buffer,
                  },
                  error: null,
                }
              : { data: null, error: { statusCode: "404" } };
          },
          async list(folder: string, options: { search: string }) {
            const objectPath = `${folder}/${options.search}`;
            const body = objects.get(`${bucketName}\n${objectPath}`);
            return {
              data: body
                ? [{
                    name: options.search,
                    created_at: CREATED_AT,
                    metadata: {
                      size: body.byteLength,
                      mimetype: "image/png",
                    },
                  }]
                : [],
              error: null,
            };
          },
        };
      },
    },
  } as unknown as SupabaseClient;
  const storage = createFirstPreviewStorageClient(supabase);
  const authorizer = new FakeFirstPreviewAssetAuthorizer();
  const store = createSupabaseFirstPreviewGeneratedAssetStore(storage, authorizer, {
    clock: () => VALIDATED_AT,
  });
  return { objects, authorizer, store };
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

    const indexedHarness = harness();
    const legalIndexedPng = createSyntheticFirstPreviewPng(1024, 1024, [
      { type: "PLTE", data: "abcdef" },
    ], { bitDepth: 1, colorType: 3 });
    expect(await indexedHarness.store.persistValidatedPng(input({
      imageBytes: legalIndexedPng,
    }))).toMatchObject({ ok: true, value: { disposition: "created" } });
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
      createSyntheticFirstPreviewPng(1024, 1024, [], {
        rawIdat: new Uint8Array(),
      }),
      createSyntheticFirstPreviewPng(1024, 1024, [], {
        rawIdat: new Uint8Array([1, 2, 3, 4]),
      }),
      createSyntheticFirstPreviewPng(1024, 1024, [], { bitDepth: 3 }),
      createSyntheticFirstPreviewPng(1024, 1024, [], { compressionMethod: 1 }),
      createSyntheticFirstPreviewPng(1024, 1024, [], { filterMethod: 1 }),
      createSyntheticFirstPreviewPng(1024, 1024, [], { interlaceMethod: 1 }),
      createSyntheticFirstPreviewPng(1024, 1024, [], { firstScanlineFilter: 5 }),
      createSyntheticFirstPreviewPng(1024, 1024, [], { truncateScanlines: true }),
      createSyntheticFirstPreviewPng(1024, 1024, [
        { type: "ABCD", data: "unknown critical chunk" },
      ]),
      createSyntheticFirstPreviewPng(1024, 1024, [
        { type: "abca", data: "lowercase reserved bit" },
      ]),
      createSyntheticFirstPreviewPng(1024, 1024, [
        { type: "PLTE", data: "abcdefghi" },
      ], { bitDepth: 1, colorType: 3 }),
      createSyntheticFirstPreviewPng(1024, 1024, [], {
        trailingIdatBytes: new Uint8Array([1, 2, 3]),
      }),
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

  test("rejects high-bit aliases in every raw PNG chunk-name byte on persistence and authorized read", async () => {
    const base = createSyntheticFirstPreviewPng(1024, 1024, [
      { type: "sRGB", data: "\0" },
    ]);

    for (const byteIndex of [0, 1, 2, 3] as const) {
      await test.step(`chunk-name byte ${byteIndex + 1}`, async () => {
        await expectPngRejectedByPersistenceAndRead(
          addHighBitAliasToChunkName(base, byteIndex),
        );
      });
    }
  });

  test("rejects the explicit unsafe PNG corpus on persistence and authorized read", async () => {
    const incorrectSignature = new Uint8Array(VALID_PNG);
    incorrectSignature[0] ^= 0x01;

    const corruptChunkCrc = new Uint8Array(VALID_PNG);
    corruptChunkCrc[32] ^= 0x01;

    const cases = [
      { name: "full-length incorrect signature", bytes: incorrectSignature },
      { name: "corrupt chunk CRC", bytes: corruptChunkCrc },
      {
        name: "illegal color type",
        bytes: createSyntheticFirstPreviewPng(1024, 1024, [], { colorType: 1 }),
      },
      {
        name: "bytes following IEND",
        bytes: new Uint8Array(Buffer.concat([Buffer.from(VALID_PNG), Buffer.from([0x00])])),
      },
    ];

    for (const unsafePng of cases) {
      await test.step(unsafePng.name, async () => {
        await expectPngRejectedByPersistenceAndRead(unsafePng.bytes);
      });
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

  test("actual adapter permits persistence and authorized read only for literal public false", async () => {
    const actual = actualAdapterHarness(async () => ({
      data: { name: FIRST_PREVIEW_ASSET_BUCKET, public: false },
      error: null,
    }));
    const persisted = await actual.store.persistValidatedPng(input());
    expect(persisted).toMatchObject({
      ok: true,
      value: { disposition: "created" },
    });
    if (!persisted.ok) throw new Error("literal public false should permit persistence");

    actual.authorizer.result = {
      authorized: true,
      descriptor: descriptor(persisted.value.asset),
    };
    expect(await actual.store.readAuthorizedPng({
      publicReference: PUBLIC_REFERENCE,
      outputId: OUTPUT_ID,
      accessProof: "test-access-proof",
    })).toMatchObject({ ok: true });
  });

  test("actual adapter rejects every non-false or unknown bucket privacy value", async () => {
    const unsafeBucketData = [
      { name: "public true", data: { name: FIRST_PREVIEW_ASSET_BUCKET, public: true } },
      { name: "public undefined", data: { name: FIRST_PREVIEW_ASSET_BUCKET, public: undefined } },
      { name: "public null", data: { name: FIRST_PREVIEW_ASSET_BUCKET, public: null } },
      { name: "missing public", data: { name: FIRST_PREVIEW_ASSET_BUCKET } },
      { name: "string public", data: { name: FIRST_PREVIEW_ASSET_BUCKET, public: "false" } },
      { name: "numeric public", data: { name: FIRST_PREVIEW_ASSET_BUCKET, public: 0 } },
      { name: "object public", data: { name: FIRST_PREVIEW_ASSET_BUCKET, public: {} } },
    ];

    for (const scenario of unsafeBucketData) {
      await test.step(scenario.name, async () => {
        const actual = actualAdapterHarness(async () => ({
          data: scenario.data,
          error: null,
        }));
        expect(await actual.store.persistValidatedPng(input())).toEqual({
          ok: false,
          code: "privacy_failure",
        });

        actual.objects.set(`${FIRST_PREVIEW_ASSET_BUCKET}\n${ASSET_ID}`, VALID_PNG);
        actual.authorizer.result = { authorized: true, descriptor: descriptor() };
        expect(await actual.store.readAuthorizedPng({
          publicReference: PUBLIC_REFERENCE,
          outputId: OUTPUT_ID,
          accessProof: "test-access-proof",
        })).toEqual({ ok: false, code: "privacy_failure" });
      });
    }
  });

  test("actual adapter rejects returned bucket-inspection errors for persistence and authorized read", async () => {
    const actual = actualAdapterHarness(async () => ({
      data: { name: FIRST_PREVIEW_ASSET_BUCKET, public: false },
      error: { message: "synthetic bucket inspection error" },
    }));
    expect(await actual.store.persistValidatedPng(input())).toEqual({
      ok: false,
      code: "storage_unavailable",
    });

    actual.authorizer.result = { authorized: true, descriptor: descriptor() };
    expect(await actual.store.readAuthorizedPng({
      publicReference: PUBLIC_REFERENCE,
      outputId: OUTPUT_ID,
      accessProof: "test-access-proof",
    })).toEqual({ ok: false, code: "storage_unavailable" });
  });

  test("actual adapter rejects thrown bucket-inspection errors for persistence and authorized read", async () => {
    const actual = actualAdapterHarness(async () => {
      throw new Error("synthetic bucket inspection exception");
    });
    expect(await actual.store.persistValidatedPng(input())).toEqual({
      ok: false,
      code: "storage_unavailable",
    });

    actual.authorizer.result = { authorized: true, descriptor: descriptor() };
    expect(await actual.store.readAuthorizedPng({
      publicReference: PUBLIC_REFERENCE,
      outputId: OUTPUT_ID,
      accessProof: "test-access-proof",
    })).toEqual({ ok: false, code: "storage_unavailable" });
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

  test("normalizes thrown Storage exceptions for persistence and authorized reads", async () => {
    for (const operation of [
      "inspectBucket",
      "uploadObject",
      "downloadObject",
      "inspectObject",
    ] as const) {
      const { storage, store } = harness();
      storage.throwNext(operation);
      await expect(store.persistValidatedPng(input())).resolves.toEqual({
        ok: false,
        code: "storage_unavailable",
      });
    }

    for (const operation of [
      "inspectBucket",
      "downloadObject",
      "inspectObject",
    ] as const) {
      const { storage, authorizer, store } = harness();
      storage.seedObject(ASSET_ID, VALID_PNG);
      storage.throwNext(operation);
      authorizer.result = { authorized: true, descriptor: descriptor() };
      await expect(store.readAuthorizedPng({
        publicReference: PUBLIC_REFERENCE,
        outputId: OUTPUT_ID,
        accessProof: "test-access-proof",
      })).resolves.toEqual({ ok: false, code: "storage_unavailable" });
    }
  });

  test("serves validated bytes only through an exact authorized ready/current descriptor", async () => {
    const { storage, authorizer, store } = harness();
    storage.seedObject(ASSET_ID, VALID_PNG);
    authorizer.result = { authorized: true, descriptor: descriptor() };

    const result = await store.readAuthorizedPng({
      publicReference: PUBLIC_REFERENCE,
      outputId: OUTPUT_ID,
      accessProof: "test-access-proof",
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
    expect(authorizer.requests).toEqual([
      {
        publicReference: PUBLIC_REFERENCE,
        outputId: OUTPUT_ID,
        accessProof: "test-access-proof",
      },
      {
        publicReference: PUBLIC_REFERENCE,
        outputId: OUTPUT_ID,
        accessProof: "test-access-proof",
      },
    ]);
    expect(storage.operations).toEqual([
      "inspectBucket",
      "downloadObject",
      "inspectObject",
    ]);
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
        publicReference: "NOVORA-CB-20260722-B640",
      },
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
      accessProof: "test-access-proof",
    })).toEqual({ ok: false, code: "access_denied" });
    expect(denied.storage.operations).toEqual([]);

    const invalidRequest = harness();
    expect(await invalidRequest.store.readAuthorizedPng({
      publicReference: "not-a-public-reference",
      outputId: OUTPUT_ID,
      accessProof: "test-access-proof",
    })).toEqual({ ok: false, code: "invalid_input" });
    expect(invalidRequest.authorizer.requests).toEqual([]);
    expect(invalidRequest.storage.operations).toEqual([]);

    const authorizerFailure = harness();
    authorizerFailure.authorizer.shouldThrow = true;
    expect(await authorizerFailure.store.readAuthorizedPng({
      publicReference: PUBLIC_REFERENCE,
      outputId: OUTPUT_ID,
      accessProof: "test-access-proof",
    })).toEqual({ ok: false, code: "access_denied" });
    expect(authorizerFailure.storage.operations).toEqual([]);

    for (const invalidDescriptor of scenarios) {
      const { storage, authorizer, store } = harness();
      authorizer.result = { authorized: true, descriptor: invalidDescriptor };
      expect(await store.readAuthorizedPng({
        publicReference: PUBLIC_REFERENCE,
        outputId: OUTPUT_ID,
        accessProof: "test-access-proof",
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
      accessProof: "test-access-proof",
    })).toEqual({ ok: false, code: "asset_not_found" });

    const tampered = harness();
    tampered.storage.seedObject(ASSET_ID, VALID_PNG);
    tampered.storage.tamperObject(ASSET_ID, createSyntheticFirstPreviewPng(512, 1024));
    tampered.authorizer.result = { authorized: true, descriptor: descriptor() };
    expect(await tampered.store.readAuthorizedPng({
      publicReference: PUBLIC_REFERENCE,
      outputId: OUTPUT_ID,
      accessProof: "test-access-proof",
    })).toEqual({ ok: false, code: "asset_integrity_failure" });
  });

  test("fails closed when authorization expires or is revoked during the Storage read", async () => {
    for (const finalResult of [
      { authorized: false } as const,
      {
        authorized: true,
        descriptor: {
          ...descriptor(),
          isCurrentCustomerPreview: false,
        } as unknown as FirstPreviewAuthorizedAssetDescriptor,
      } as const,
    ]) {
      const { storage, authorizer, store } = harness();
      storage.seedObject(ASSET_ID, VALID_PNG);
      authorizer.results = [
        { authorized: true, descriptor: descriptor() },
        finalResult,
      ];

      expect(await store.readAuthorizedPng({
        publicReference: PUBLIC_REFERENCE,
        outputId: OUTPUT_ID,
        accessProof: "test-access-proof",
      })).toEqual({ ok: false, code: "access_denied" });
      expect(authorizer.requests).toHaveLength(2);
    }
  });

  test("fails closed when the re-authorized descriptor no longer matches the initial reference-bound asset", async () => {
    const { storage, authorizer, store } = harness();
    storage.seedObject(ASSET_ID, VALID_PNG);
    authorizer.results = [
      { authorized: true, descriptor: descriptor() },
      {
        authorized: true,
        descriptor: descriptor(metadata({
          assetValidatedAt: "2026-07-22T12:00:02.000Z",
        })),
      },
    ];

    expect(await store.readAuthorizedPng({
      publicReference: PUBLIC_REFERENCE,
      outputId: OUTPUT_ID,
      accessProof: "test-access-proof",
    })).toEqual({ ok: false, code: "access_denied" });
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
        accessProof: "test-access-proof",
      })).toEqual({ ok: false, code: "storage_unavailable" });
    }
    expect(storage.operations).toEqual([]);
  });
});
