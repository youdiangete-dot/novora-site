import { expect, test } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  createFirstPreviewGeneratedAssetDeliveryServiceBinding,
  createFirstPreviewGeneratedAssetRouteHandler,
  createUnavailableFirstPreviewGeneratedAssetDeliveryService,
  type FirstPreviewGeneratedAssetDeliveryService,
} from "../../lib/server/ai-sketch/first-preview-generated-asset-delivery";
import {
  deriveFirstPreviewGeneratedAssetId,
  sha256FirstPreviewAsset,
  type FirstPreviewAssetDeliveryDiagnostic,
  type FirstPreviewAuthorizedAssetDescriptor,
  type FirstPreviewStoredAssetMetadata,
} from "../../lib/server/ai-sketch/first-preview-generated-assets-contract";
import { FIRST_PREVIEW_ASSET_BUCKET } from "../../lib/server/ai-sketch/first-preview-persistence-contract";
import type { FirstPreviewCustomerAccessAuthorizer } from "../../lib/server/ai-sketch/supabase-first-preview-customer-access";
import { createSupabaseFirstPreviewGeneratedAssetStore } from "../../lib/server/ai-sketch/supabase-first-preview-generated-assets";
import {
  FakeFirstPreviewAssetAuthorizer,
  FakeFirstPreviewStorageClient,
  createSyntheticFirstPreviewPng,
} from "../fixtures/ai-sketch/fake-first-preview-storage-client";

const PUBLIC_REFERENCE = "NOVORA-CB-20260928-BEJM";
const CONCEPT_BRIEF_ID = "123e4567-e89b-42d3-a456-426614174000";
const JOB_ID = "223e4567-e89b-42d3-a456-426614174000";
const OUTPUT_ID = "323e4567-e89b-42d3-a456-426614174000";
const ACCESS_PROOF = "forbidden-access-proof";
const VALID_PNG = createSyntheticFirstPreviewPng();
const ASSET_ID = deriveFirstPreviewGeneratedAssetId({
  conceptBriefId: CONCEPT_BRIEF_ID,
  jobId: JOB_ID,
  outputId: OUTPUT_ID,
})!;
const CREATED_AT = "2026-09-28T04:00:00.000Z";
const VALIDATED_AT = "2026-09-28T04:00:01.000Z";

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
    assetCreatedAt: CREATED_AT,
    assetValidatedAt: VALIDATED_AT,
    ...overrides,
  };
}

function descriptor(
  asset: FirstPreviewStoredAssetMetadata = metadata(),
): FirstPreviewAuthorizedAssetDescriptor {
  return {
    publicReference: PUBLIC_REFERENCE,
    conceptBriefId: CONCEPT_BRIEF_ID,
    jobId: JOB_ID,
    outputId: OUTPUT_ID,
    asset,
    readinessStatus: "first_preview_ready",
    isCurrentCustomerPreview: true,
  };
}

function request() {
  return new Request(
    `https://novora.test/api/first-preview-assets/${PUBLIC_REFERENCE}/${OUTPUT_ID}`,
  );
}

function context() {
  return { params: Promise.resolve({ publicReference: PUBLIC_REFERENCE, outputId: OUTPUT_ID }) };
}

function deliveryHarness() {
  const storage = new FakeFirstPreviewStorageClient();
  storage.createdAt = CREATED_AT;
  const authorizer = new FakeFirstPreviewAssetAuthorizer();
  const generatedAssetStore = createSupabaseFirstPreviewGeneratedAssetStore(
    storage,
    authorizer,
  );
  const bindingAuthorizer = {
    kind: "supabase" as const,
    authorize: authorizer.authorize.bind(authorizer),
  } satisfies FirstPreviewCustomerAccessAuthorizer;
  const service = createFirstPreviewGeneratedAssetDeliveryServiceBinding({
    signingSecret: "synthetic-binding-only",
    adminClient: {} as SupabaseClient,
    bucketName: FIRST_PREVIEW_ASSET_BUCKET,
    authorizer: bindingAuthorizer,
    generatedAssetStore,
  });
  return { authorizer, service, storage };
}

async function execute(
  service: FirstPreviewGeneratedAssetDeliveryService,
  accessProof: string | null = ACCESS_PROOF,
) {
  const diagnostics: FirstPreviewAssetDeliveryDiagnostic[] = [];
  const handler = createFirstPreviewGeneratedAssetRouteHandler({
    async readAccessProof() {
      return accessProof;
    },
    async createService() {
      return service;
    },
    reportDiagnostic(value) {
      diagnostics.push(value);
    },
  });
  return {
    diagnostics,
    response: await handler.get(request(), context()),
  };
}

async function expectOpaque404(response: Response) {
  expect(response.status).toBe(404);
  expect((await response.arrayBuffer()).byteLength).toBe(0);
  expect([...response.headers]).toEqual([
    ["cache-control", "private, no-store"],
    ["content-length", "0"],
    ["x-content-type-options", "nosniff"],
  ]);
}

function expectOnlyDiagnostic(
  diagnostics: readonly FirstPreviewAssetDeliveryDiagnostic[],
  assetDeliveryStage: FirstPreviewAssetDeliveryDiagnostic["assetDeliveryStage"],
  assetDeliveryFailureCode: FirstPreviewAssetDeliveryDiagnostic["assetDeliveryFailureCode"],
) {
  expect(diagnostics).toEqual([{
    assetDeliveryStage,
    assetDeliveryFailureCode,
  }]);
}

test("reports one bounded stage/code pair while preserving protected asset responses", async () => {
  const successfulService: FirstPreviewGeneratedAssetDeliveryService = {
    kind: "supabase",
    async read() {
      return {
        ok: true,
        body: VALID_PNG,
        contentLength: VALID_PNG.byteLength,
      };
    },
  };

  await test.step("missing proof", async () => {
    const result = await execute(successfulService, null);
    await expectOpaque404(result.response);
    expectOnlyDiagnostic(result.diagnostics, "access_proof", "access_denied");
  });

  await test.step("unavailable binding", async () => {
    const result = await execute(
      createUnavailableFirstPreviewGeneratedAssetDeliveryService(),
    );
    await expectOpaque404(result.response);
    expectOnlyDiagnostic(
      result.diagnostics,
      "service_binding",
      "unavailable_binding",
    );
  });

  await test.step("initial authorization rejection", async () => {
    const state = deliveryHarness();
    const result = await execute(state.service);
    await expectOpaque404(result.response);
    expectOnlyDiagnostic(
      result.diagnostics,
      "initial_authorization",
      "access_denied",
    );
  });

  await test.step("private bucket failure", async () => {
    const state = deliveryHarness();
    state.authorizer.result = { authorized: true, descriptor: descriptor() };
    state.storage.bucketIsPublic = true;
    const result = await execute(state.service);
    await expectOpaque404(result.response);
    expectOnlyDiagnostic(
      result.diagnostics,
      "bucket_privacy",
      "privacy_failure",
    );
  });

  await test.step("missing object", async () => {
    const state = deliveryHarness();
    state.authorizer.result = { authorized: true, descriptor: descriptor() };
    const result = await execute(state.service);
    await expectOpaque404(result.response);
    expectOnlyDiagnostic(
      result.diagnostics,
      "object_download",
      "asset_not_found",
    );
  });

  await test.step("image integrity mismatch", async () => {
    const state = deliveryHarness();
    state.authorizer.result = { authorized: true, descriptor: descriptor() };
    state.storage.seedObject(
      ASSET_ID,
      createSyntheticFirstPreviewPng(512, 1024),
    );
    const result = await execute(state.service);
    await expectOpaque404(result.response);
    expectOnlyDiagnostic(
      result.diagnostics,
      "image_integrity",
      "asset_integrity_failure",
    );
  });

  await test.step("object metadata mismatch", async () => {
    const state = deliveryHarness();
    state.authorizer.result = { authorized: true, descriptor: descriptor() };
    state.storage.seedObject(ASSET_ID, VALID_PNG, {
      mimeType: "image/jpeg",
    });
    const result = await execute(state.service);
    await expectOpaque404(result.response);
    expectOnlyDiagnostic(
      result.diagnostics,
      "object_metadata",
      "asset_integrity_failure",
    );
  });

  await test.step("final authorization rejection", async () => {
    const state = deliveryHarness();
    state.storage.seedObject(ASSET_ID, VALID_PNG);
    state.authorizer.results = [
      { authorized: true, descriptor: descriptor() },
      { authorized: false },
    ];
    const result = await execute(state.service);
    await expectOpaque404(result.response);
    expectOnlyDiagnostic(
      result.diagnostics,
      "final_authorization",
      "access_denied",
    );
  });

  await test.step("successful delivery", async () => {
    const state = deliveryHarness();
    state.storage.seedObject(ASSET_ID, VALID_PNG);
    state.authorizer.result = { authorized: true, descriptor: descriptor() };
    const result = await execute(state.service);
    expect(result.response.status).toBe(200);
    expect(new Uint8Array(await result.response.arrayBuffer())).toEqual(VALID_PNG);
    expect([...result.response.headers]).toEqual([
      ["cache-control", "private, no-store"],
      ["content-disposition", 'inline; filename="novora-first-preview.png"'],
      ["content-length", String(VALID_PNG.byteLength)],
      ["content-type", "image/png"],
      ["cross-origin-resource-policy", "same-origin"],
      ["referrer-policy", "no-referrer"],
      ["vary", "Cookie"],
      ["x-content-type-options", "nosniff"],
    ]);
    expectOnlyDiagnostic(result.diagnostics, "delivered", "none");
  });
});

test("diagnostics contain only the bounded contract and no prohibited values", async () => {
  const state = deliveryHarness();
  state.storage.seedObject(ASSET_ID, VALID_PNG);
  state.authorizer.result = { authorized: true, descriptor: descriptor() };
  const { diagnostics, response } = await execute(state.service);
  expect(response.status).toBe(200);

  for (const value of diagnostics) {
    expect(Object.keys(value).sort()).toEqual([
      "assetDeliveryFailureCode",
      "assetDeliveryStage",
    ]);
  }

  const serialized = JSON.stringify(diagnostics);
  for (const prohibited of [
    ACCESS_PROOF,
    PUBLIC_REFERENCE,
    CONCEPT_BRIEF_ID,
    JOB_ID,
    OUTPUT_ID,
    ASSET_ID,
    metadata().contentSha256,
    "signed-url",
    "PNG bytes",
    "prompt",
    "Design Spec",
    "secret",
    "exception message",
    "stack trace",
  ]) {
    expect(serialized).not.toContain(prohibited);
  }
});
