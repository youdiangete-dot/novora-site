import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import Module, { createRequire } from "node:module";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";

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
const adminBriefDetailSource = readFileSync(
  path.join(
    process.cwd(),
    "app",
    "admin",
    "briefs",
    "[id]",
    "AdminBriefDetailClient.tsx",
  ),
  "utf8",
);
const customerPreviewSource = readFileSync(
  path.join(process.cwd(), "app", "design", "preview", "[public_reference]", "page.tsx"),
  "utf8",
);
const customerSubmittedSource = readFileSync(
  path.join(process.cwd(), "app", "design", "submitted", "page.tsx"),
  "utf8",
);

type ReviewRow = {
  ai_sketch_output_id: string | null;
  concept_brief_id: string | null;
  review_status: string | null;
  revision_instruction: string | null;
};

function reviewRow(overrides: Partial<ReviewRow> = {}): ReviewRow {
  return {
    ai_sketch_output_id: OUTPUT_ID,
    concept_brief_id: BRIEF_ID,
    review_status: "draft_generated_internal_only",
    revision_instruction: null,
    ...overrides,
  };
}

function reviewPersistence(input: {
  existingRow: ReviewRow | null;
  savedRow: ReviewRow | null;
}) {
  const updateCalls: Array<{
    values: Record<string, unknown>;
    filters: Array<[string, unknown]>;
  }> = [];

  const client = {
    from(table: string) {
      expect(table).toBe("ai_sketch_reviews");

      return {
        select() {
          return {
            eq() {
              return {
                async maybeSingle() {
                  return { data: input.existingRow, error: null };
                },
              };
            },
          };
        },
        update(values: Record<string, unknown>) {
          const call = { values, filters: [] as Array<[string, unknown]> };
          updateCalls.push(call);
          const chain = {
            eq(column: string, value: unknown) {
              call.filters.push([column, value]);
              return chain;
            },
            select() {
              return {
                async maybeSingle() {
                  return { data: input.savedRow, error: null };
                },
              };
            },
          };

          return chain;
        },
      };
    },
  } as unknown as SupabaseClient;

  return { client, updateCalls };
}

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

test("rejects the pre-generation status for output-bound ready preview reviews", async () => {
  await expect(
    modules.reviewWrite.updateAdminAiSketchReview(
      BRIEF_ID,
      OUTPUT_ID,
      "internal_draft_not_generated",
      null,
    ),
  ).resolves.toMatchObject({ ok: false, reason: "invalid-input" });

  expect(
    modules.reviewWrite.isAdminCurrentFirstPreviewReviewStatus(
      "internal_draft_not_generated",
    ),
  ).toBe(false);
  expect(
    modules.reviewWrite.isAdminCurrentFirstPreviewReviewStatus(
      "draft_generated_internal_only",
    ),
  ).toBe(true);
  expect(
    modules.reviewWrite.isAdminCurrentFirstPreviewReviewStatus("needs_revision"),
  ).toBe(true);
  expect(
    modules.reviewWrite.isAdminCurrentFirstPreviewReviewStatus(
      "approved_for_customer",
    ),
  ).toBe(true);
});

test("normalizes only bounded needs-revision instructions", () => {
  expect(
    modules.reviewWrite.normalizeAdminAiSketchRevisionInstruction(
      "needs_revision",
      "  Refine the center-stone orientation.  ",
    ),
  ).toBe("Refine the center-stone orientation.");
  expect(
    modules.reviewWrite.normalizeAdminAiSketchRevisionInstruction("needs_revision", ""),
  ).toBeUndefined();
  expect(
    modules.reviewWrite.normalizeAdminAiSketchRevisionInstruction("needs_revision", "   "),
  ).toBeUndefined();
  expect(
    modules.reviewWrite.normalizeAdminAiSketchRevisionInstruction(
      "needs_revision",
      "x".repeat(2001),
    ),
  ).toBeUndefined();
  expect(
    modules.reviewWrite.normalizeAdminAiSketchRevisionInstruction(
      "needs_revision",
      { instruction: "must be a string" },
    ),
  ).toBeUndefined();
  expect(
    modules.reviewWrite.normalizeAdminAiSketchRevisionInstruction(
      "approved_for_customer",
      "stale instruction",
    ),
  ).toBeNull();
});

test("saves needs_revision and its exact instruction for the exact current output", async () => {
  const instruction = "Refine the center-stone orientation.";
  const persistence = reviewPersistence({
    existingRow: reviewRow(),
    savedRow: reviewRow({
      review_status: "needs_revision",
      revision_instruction: instruction,
    }),
  });

  await expect(
    modules.reviewWrite.updateAdminAiSketchReview(
      BRIEF_ID,
      OUTPUT_ID,
      "needs_revision",
      instruction,
      {
        supabaseClient: persistence.client,
        repository: repository(output()),
      },
    ),
  ).resolves.toEqual({
    ok: true,
    reviewStatus: "needs_revision",
    aiSketchOutputId: OUTPUT_ID,
    revisionInstruction: instruction,
  });

  expect(persistence.updateCalls).toEqual([
    {
      values: {
        review_status: "needs_revision",
        revision_instruction: instruction,
      },
      filters: [
        ["concept_brief_id", BRIEF_ID],
        ["ai_sketch_output_id", OUTPUT_ID],
      ],
    },
  ]);
});

test("keeps output mismatch and review linkage conflict fail-closed", async () => {
  const outputMismatchPersistence = reviewPersistence({
    existingRow: reviewRow(),
    savedRow: null,
  });

  await expect(
    modules.reviewWrite.updateAdminAiSketchReview(
      BRIEF_ID,
      OUTPUT_ID,
      "needs_revision",
      "Refine the setting.",
      {
        supabaseClient: outputMismatchPersistence.client,
        repository: repository(null),
      },
    ),
  ).resolves.toMatchObject({ ok: false, reason: "output-mismatch" });
  expect(outputMismatchPersistence.updateCalls).toHaveLength(0);

  const linkageConflictPersistence = reviewPersistence({
    existingRow: reviewRow({ ai_sketch_output_id: OTHER_OUTPUT_ID }),
    savedRow: null,
  });

  await expect(
    modules.reviewWrite.updateAdminAiSketchReview(
      BRIEF_ID,
      OUTPUT_ID,
      "needs_revision",
      "Refine the setting.",
      {
        supabaseClient: linkageConflictPersistence.client,
        repository: repository(output()),
      },
    ),
  ).resolves.toMatchObject({ ok: false, reason: "linkage-conflict" });
  expect(linkageConflictPersistence.updateCalls).toHaveLength(0);
});

for (const reviewStatus of [
  "draft_generated_internal_only",
  "approved_for_customer",
] as const) {
  test(`${reviewStatus} clears a stale revision instruction`, async () => {
    const persistence = reviewPersistence({
      existingRow: reviewRow({
        review_status: "needs_revision",
        revision_instruction: "Stale revision request",
      }),
      savedRow: reviewRow({ review_status: reviewStatus, revision_instruction: null }),
    });

    await expect(
      modules.reviewWrite.updateAdminAiSketchReview(
        BRIEF_ID,
        OUTPUT_ID,
        reviewStatus,
        null,
        {
          supabaseClient: persistence.client,
          repository: repository(output()),
        },
      ),
    ).resolves.toMatchObject({
      ok: true,
      reviewStatus,
      revisionInstruction: null,
    });
    expect(persistence.updateCalls[0]?.values).toEqual({
      review_status: reviewStatus,
      revision_instruction: null,
    });
  });
}

test("fails closed when the returned instruction differs from the requested state", async () => {
  const persistence = reviewPersistence({
    existingRow: reviewRow(),
    savedRow: reviewRow({
      review_status: "needs_revision",
      revision_instruction: "A different instruction",
    }),
  });

  await expect(
    modules.reviewWrite.updateAdminAiSketchReview(
      BRIEF_ID,
      OUTPUT_ID,
      "needs_revision",
      "Requested instruction",
      {
        supabaseClient: persistence.client,
        repository: repository(output()),
      },
    ),
  ).resolves.toMatchObject({ ok: false, reason: "write-failed" });
});

test("does not offer the pre-generation status in current First Preview review controls", () => {
  expect(adminBriefDetailSource).toContain(
    "reviewStatus !== AI_SKETCH_REVIEW_INITIAL_STATUS",
  );
  expect(adminBriefDetailSource).toContain(
    "currentFirstPreviewReviewStatuses.map((option)",
  );
});

test("shows and submits a bounded internal revision instruction only for needs_revision", () => {
  expect(adminBriefDetailSource).toContain("selectedAiSketchReviewStatus === 'needs_revision'");
  expect(adminBriefDetailSource).toContain("maxLength={2000}");
  expect(adminBriefDetailSource).toContain("useState(aiSketchReview.revisionInstruction || '')");
  expect(adminBriefDetailSource).toContain("revisionInstruction: normalizedRevisionInstruction");
  expect(adminBriefDetailSource).toContain("savedRevisionInstruction !== normalizedRevisionInstruction");
  expect(adminBriefDetailSource).toContain("setRevisionInstruction(normalizedRevisionInstruction || '')");
  expect(customerPreviewSource).not.toContain("revisionInstruction");
  expect(customerSubmittedSource).not.toContain("revisionInstruction");
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
