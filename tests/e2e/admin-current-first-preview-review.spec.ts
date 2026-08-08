import { expect, test } from "@playwright/test";
import Module, { createRequire } from "node:module";
import path from "node:path";

import type {
  FirstPreviewOutputRecord,
  FirstPreviewRepository,
} from "../../lib/server/ai-sketch/first-preview-persistence-contract";
import {
  createSyntheticFirstPreviewPng,
  FakeFirstPreviewStorageClient,
} from "../fixtures/ai-sketch/fake-first-preview-storage-client";

const moduleInternals = Module as unknown as {
  _resolveFilename(
    request: string,
    parent: unknown,
    isMain: boolean,
    options?: unknown,
  ): string;
};
const serverOnlyTestShim = path.join(
  process.cwd(),
  "node_modules",
  "next",
  "dist",
  "compiled",
  "server-only",
  "empty.js",
);

function loadWithServerOnlyTestShim<T>(load: () => T): T {
  const originalResolveFilename = moduleInternals._resolveFilename;
  moduleInternals._resolveFilename = function resolveTestModule(
    request,
    parent,
    isMain,
    options,
  ) {
    return request === "server-only"
      ? serverOnlyTestShim
      : originalResolveFilename.call(this, request, parent, isMain, options);
  };
  try {
    return load();
  } finally {
    moduleInternals._resolveFilename = originalResolveFilename;
  }
}

const testRequire = createRequire(
  path.join(process.cwd(), "tests", "e2e", "admin-current-first-preview-review.spec.ts"),
);
const modules = loadWithServerOnlyTestShim(() => ({
  adminPreview: testRequire(
    "../../lib/server/admin-first-preview",
  ) as typeof import("../../lib/server/admin-first-preview"),
  reviewRead: testRequire(
    "../../lib/server/admin-ai-sketch-review-read",
  ) as typeof import("../../lib/server/admin-ai-sketch-review-read"),
  reviewWrite: testRequire(
    "../../lib/server/admin-ai-sketch-review-write",
  ) as typeof import("../../lib/server/admin-ai-sketch-review-write"),
  assetContract: testRequire(
    "../../lib/server/ai-sketch/first-preview-generated-assets-contract",
  ) as typeof import("../../lib/server/ai-sketch/first-preview-generated-assets-contract"),
}));

const BRIEF_ID = "123e4567-e89b-42d3-a456-426614174000";
const OTHER_BRIEF_ID = "223e4567-e89b-42d3-a456-426614174000";
const JOB_ID = "323e4567-e89b-42d3-a456-426614174000";
const OUTPUT_ID = "423e4567-e89b-42d3-a456-426614174000";
const OTHER_OUTPUT_ID = "523e4567-e89b-42d3-a456-426614174000";
const PNG = createSyntheticFirstPreviewPng();

function output(overrides: Partial<FirstPreviewOutputRecord> = {}): FirstPreviewOutputRecord {
  const assetId = modules.assetContract.deriveFirstPreviewGeneratedAssetId({
    conceptBriefId: BRIEF_ID,
    jobId: JOB_ID,
    outputId: OUTPUT_ID,
  })!;

  return {
    id: OUTPUT_ID,
    jobId: JOB_ID,
    conceptBriefId: BRIEF_ID,
    assetId,
    assetPersisted: true,
    bucketName: "novora-ai-sketches",
    mimeType: "image/png",
    byteSize: PNG.byteLength,
    widthPx: 1024,
    heightPx: 1024,
    contentSha256: modules.assetContract.sha256FirstPreviewAsset(PNG),
    assetCreatedAt: "2026-08-07T10:00:00.000Z",
    assetValidatedAt: "2026-08-07T10:00:01.000Z",
    readinessStatus: "first_preview_ready",
    isCurrentCustomerPreview: true,
    createdAt: "2026-08-07T10:00:00.000Z",
    readyAt: "2026-08-07T10:00:02.000Z",
    revokedAt: null,
    ...overrides,
  };
}

function repository(currentOutput: FirstPreviewOutputRecord | null): FirstPreviewRepository {
  return {
    kind: "memory_fake",
    async findCustomerReadyOutput() {
      return currentOutput;
    },
  } as unknown as FirstPreviewRepository;
}

test("accepts only the exact ready, current, brief-bound output with expected asset metadata", () => {
  expect(modules.adminPreview.isExactAdminCurrentFirstPreview(output(), BRIEF_ID)).toBe(true);
  expect(modules.adminPreview.isExactAdminCurrentFirstPreview(output(), OTHER_BRIEF_ID)).toBe(false);
  expect(
    modules.adminPreview.isExactAdminCurrentFirstPreview(
      output({ isCurrentCustomerPreview: false }),
      BRIEF_ID,
    ),
  ).toBe(false);
  expect(
    modules.adminPreview.isExactAdminCurrentFirstPreview(
      output({ readinessStatus: "not_ready" }),
      BRIEF_ID,
    ),
  ).toBe(false);
  expect(
    modules.adminPreview.isExactAdminCurrentFirstPreview(
      output({ assetId: "first-preview/arbitrary.png" }),
      BRIEF_ID,
    ),
  ).toBe(false);
});

test("classifies exact, missing, unbound, and conflicting review linkage without rebinding", () => {
  expect(
    modules.reviewRead.classifyAdminAiSketchReviewBinding({
      currentAiSketchOutputId: OUTPUT_ID,
      hasPersistedReview: true,
      reviewAiSketchOutputId: OUTPUT_ID,
      reviewConceptBriefMatches: true,
    }),
  ).toBe("exact");
  expect(
    modules.reviewRead.classifyAdminAiSketchReviewBinding({
      currentAiSketchOutputId: OUTPUT_ID,
      hasPersistedReview: false,
      reviewAiSketchOutputId: null,
      reviewConceptBriefMatches: true,
    }),
  ).toBe("missing-review");
  expect(
    modules.reviewRead.classifyAdminAiSketchReviewBinding({
      currentAiSketchOutputId: OUTPUT_ID,
      hasPersistedReview: true,
      reviewAiSketchOutputId: null,
      reviewConceptBriefMatches: true,
    }),
  ).toBe("unbound-review");
  expect(
    modules.reviewRead.classifyAdminAiSketchReviewBinding({
      currentAiSketchOutputId: OUTPUT_ID,
      hasPersistedReview: true,
      reviewAiSketchOutputId: OTHER_OUTPUT_ID,
      reviewConceptBriefMatches: true,
    }),
  ).toBe("conflict");
  expect(
    modules.reviewWrite.isExactAdminAiSketchReviewIdentity(
      { concept_brief_id: BRIEF_ID, ai_sketch_output_id: OTHER_OUTPUT_ID },
      BRIEF_ID,
      OUTPUT_ID,
    ),
  ).toBe(false);
});

test("delivers only the exact current PNG from the expected private bucket", async () => {
  const currentOutput = output();
  const storage = new FakeFirstPreviewStorageClient();
  storage.createdAt = currentOutput.assetCreatedAt;
  storage.seedObject(currentOutput.assetId, PNG);

  await expect(
    modules.adminPreview.readAdminFirstPreviewAsset(BRIEF_ID, OUTPUT_ID, {
      supabaseClient: null,
      repository: repository(currentOutput),
      storageClient: storage,
    }),
  ).resolves.toMatchObject({ ok: true, contentLength: PNG.byteLength });

  await expect(
    modules.adminPreview.readAdminFirstPreviewAsset(BRIEF_ID, OTHER_OUTPUT_ID, {
      supabaseClient: null,
      repository: repository(currentOutput),
      storageClient: storage,
    }),
  ).resolves.toEqual({ ok: false, reason: "not-found" });

  storage.bucketIsPublic = true;
  await expect(
    modules.adminPreview.readAdminFirstPreviewAsset(BRIEF_ID, OUTPUT_ID, {
      supabaseClient: null,
      repository: repository(currentOutput),
      storageClient: storage,
    }),
  ).resolves.toEqual({ ok: false, reason: "asset-invalid" });
});

test("rejects an unauthenticated Admin First Preview asset request", async ({ request }) => {
  const response = await request.get(
    `/admin/briefs/first-preview-assets/${BRIEF_ID}/${OUTPUT_ID}`,
  );

  expect(response.status()).toBe(401);
  expect(await response.body()).toHaveLength(0);
});
