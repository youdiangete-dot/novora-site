import { expect, test } from "@playwright/test";

import { createUnavailableFirstPreviewRepository } from "../../lib/server/ai-sketch/first-preview-persistence-contract";
import {
  createFirstPreviewDatabaseClient,
  createSupabaseFirstPreviewRepository,
} from "../../lib/server/ai-sketch/supabase-first-preview-repository";
import {
  FIRST_PREVIEW_ASSET_BUCKET,
  FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION,
  FIRST_PREVIEW_PROVIDER_PROFILE,
  type PersistFirstPreviewOutputInput,
  type ReserveFirstPreviewJobInput,
} from "../../lib/server/ai-sketch/first-preview-persistence-contract";
import { FakeFirstPreviewDatabaseClient } from "../fixtures/ai-sketch/fake-first-preview-database-client";
import { FIRST_PREVIEW_COST_CONTRACT } from "../../lib/server/ai-sketch/first-preview-cost-contract";

const BRIEF_ID = "123e4567-e89b-42d3-a456-426614174000";
const OTHER_BRIEF_ID = "223e4567-e89b-42d3-a456-426614174000";
const JOB_ID = "323e4567-e89b-42d3-a456-426614174000";
const OTHER_JOB_ID = "423e4567-e89b-42d3-a456-426614174000";
const THIRD_JOB_ID = "723e4567-e89b-42d3-a456-426614174000";
const FOURTH_JOB_ID = "823e4567-e89b-42d3-a456-426614174000";
const OUTPUT_ID = "523e4567-e89b-42d3-a456-426614174000";
const OTHER_OUTPUT_ID = "623e4567-e89b-42d3-a456-426614174000";
const SECOND_OUTPUT_ID = "923e4567-e89b-42d3-a456-426614174000";
const DESIGN_HASH = "a".repeat(64);
const INSTRUCTION_HASH = "b".repeat(64);
const CONTENT_HASH = "c".repeat(64);

const PASSING_GATES = {
  outputValid: true,
  assetExists: true,
  ownershipConsistent: true,
  privacyPassed: true,
  customerAccessEligible: true,
  lifecycleEligible: true,
} as const;

function reservation(
  overrides: Partial<ReserveFirstPreviewJobInput> = {},
): ReserveFirstPreviewJobInput {
  return {
    jobId: JOB_ID,
    conceptBriefId: BRIEF_ID,
    attemptNumber: 1,
    parentJobId: null,
    sourceOutputId: null,
    designSpecVersion: "novora_design_spec_v1",
    designSpecSha256: DESIGN_HASH,
    handSketchInstructionVersion: "novora_hand_sketch_instruction_v1",
    handSketchInstructionSha256: INSTRUCTION_HASH,
    estimatedCostMicros: 42_000,
    costCurrency: "USD",
    pricingAssumptionVersion: "openai-gpt-image-2-2026-04-21-v1",
    ...overrides,
  };
}

function output(
  overrides: Partial<PersistFirstPreviewOutputInput> = {},
): PersistFirstPreviewOutputInput {
  return {
    outputId: OUTPUT_ID,
    jobId: JOB_ID,
    conceptBriefId: BRIEF_ID,
    assetId: "first-preview/123e4567/output.png",
    assetPersisted: true,
    bucketName: FIRST_PREVIEW_ASSET_BUCKET,
    mimeType: "image/png",
    byteSize: 65_536,
    widthPx: 1024,
    heightPx: 1024,
    contentSha256: CONTENT_HASH,
    assetCreatedAt: "2026-07-22T00:00:10.000Z",
    assetValidatedAt: "2026-07-22T00:00:11.000Z",
    ...overrides,
  };
}

function harness() {
  const client = new FakeFirstPreviewDatabaseClient();
  let tick = 0;
  const repository = createSupabaseFirstPreviewRepository(client, {
    clock: () => `2026-07-22T00:00:${String(tick++).padStart(2, "0")}.000Z`,
    processingTimeoutMs: 30_000,
  });
  return { client, repository };
}

async function reserveStartedJob() {
  const state = harness();
  expect(await state.repository.reserveJob(reservation())).toMatchObject({
    ok: true,
    value: { disposition: "created", job: { status: "queued" } },
  });
  expect(await state.repository.startJob(JOB_ID)).toMatchObject({
    ok: true,
    value: { status: "processing" },
  });
  return state;
}

async function reserveAndStart() {
  const state = await reserveStartedJob();
  expect(await state.repository.recordProviderDispatch(JOB_ID)).toMatchObject({
    ok: true,
    value: {
      actualCostMicros:
        FIRST_PREVIEW_COST_CONTRACT.perAttemptReservationLimitMicros,
    },
  });
  expect(
    await state.repository.recordProviderRequest(JOB_ID, {
      providerRequestId: "openai-request-001",
    }),
  ).toMatchObject({
    ok: true,
    value: { providerRequestId: "openai-request-001" },
  });
  return state;
}

async function completeWithOutput() {
  const state = await reserveAndStart();
  expect(await state.repository.persistOutput(output())).toMatchObject({
    ok: true,
    value: { readinessStatus: "not_ready", assetPersisted: true },
  });
  expect(
    await state.repository.recordJobSucceeded(JOB_ID, { actualCostMicros: 41_000 }),
  ).toMatchObject({
    ok: true,
    value: { status: "succeeded", actualCostMicros: 41_000 },
  });
  return state;
}

function revisionReservation(
  overrides: Partial<ReserveFirstPreviewJobInput> = {},
): ReserveFirstPreviewJobInput {
  return reservation({
    jobId: OTHER_JOB_ID,
    attemptNumber: 2,
    parentJobId: JOB_ID,
    sourceOutputId: OUTPUT_ID,
    ...overrides,
  });
}

async function readyForRevision() {
  const state = await completeWithOutput();
  expect(
    await state.repository.markOutputReady({
      outputId: OUTPUT_ID,
      jobId: JOB_ID,
      conceptBriefId: BRIEF_ID,
      gates: PASSING_GATES,
      automaticGatePolicyVersion: FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION,
    }),
  ).toMatchObject({
    ok: true,
    value: {
      readinessStatus: "first_preview_ready",
      isCurrentCustomerPreview: true,
    },
  });
  state.client.reviews.set(BRIEF_ID, {
    ...state.client.reviews.get(BRIEF_ID)!,
    review_status: "needs_revision",
    revision_instruction: "  Refine the center-stone orientation.  ",
  });
  return state;
}

test.describe("Supabase-backed First Preview repository", () => {
  test("reserves a deterministic queued job with the pinned profile and bounded cost metadata", async () => {
    const { client, repository } = harness();
    const created = await repository.reserveJob(reservation());
    const replay = await repository.reserveJob(reservation({ jobId: OTHER_JOB_ID }));

    expect(created).toMatchObject({
      ok: true,
      value: {
        disposition: "created",
        job: {
          providerName: "openai",
          providerRequestId: null,
          estimatedCostMicros: 42_000,
          actualCostMicros: null,
          costCurrency: "USD",
        },
      },
    });
    expect(replay).toMatchObject({
      ok: true,
      value: { disposition: "existing", job: { id: JOB_ID } },
    });
    expect(client.jobs.size).toBe(1);
    expect(client.insertedJobRows[0]).toMatchObject({
      model_name: FIRST_PREVIEW_PROVIDER_PROFILE.modelName,
      provider_endpoint: "/v1/images/generations",
      request_image_count: 1,
      request_streaming: false,
      request_partial_images: 0,
      request_size: "1024x1024",
      request_quality: "medium",
      output_format: "png",
      moderation_mode: "auto",
      prompt_payload: {},
    });
  });

  test("persists an immutable per-job Provider request identity only while processing", async () => {
    const { client, repository } = await reserveAndStart();
    const recorded = await repository.recordProviderRequest(JOB_ID, {
      providerRequestId: "openai-request-001",
    });
    const replay = await repository.recordProviderRequest(JOB_ID, {
      providerRequestId: "openai-request-001",
    });
    const conflictingReplacement = await repository.recordProviderRequest(JOB_ID, {
      providerRequestId: "openai-request-002",
    });

    expect(recorded).toMatchObject({
      ok: true,
      value: { providerRequestId: "openai-request-001" },
    });
    expect(replay).toEqual(recorded);
    expect(conflictingReplacement).toEqual({ ok: false, code: "idempotency_conflict" });
    expect(client.jobs.get(JOB_ID)?.provider_request_id).toBe("openai-request-001");
  });

  test("atomically claims Provider dispatch once with conservative durable cost", async () => {
    const { client, repository } = await reserveStartedJob();
    expect(client.jobs.get(JOB_ID)?.actual_cost_micros).toBeNull();

    const claims = await Promise.all([
      repository.recordProviderDispatch(JOB_ID),
      repository.recordProviderDispatch(JOB_ID),
    ]);
    expect(claims.filter((claim) => claim.ok)).toHaveLength(1);
    expect(claims).toContainEqual({
      ok: false,
      code: "idempotency_conflict",
    });
    expect(client.jobs.get(JOB_ID)?.actual_cost_micros).toBe(100_000);
    expect(
      client.operations.filter(
        (operation) => operation === "claimProviderDispatch",
      ),
    ).toHaveLength(2);

    const terminatedAfterDispatch = await repository.findJobById(JOB_ID);
    expect(terminatedAfterDispatch).toMatchObject({
      status: "processing",
      actualCostMicros: 100_000,
      retryEligible: null,
    });
    expect(await repository.findCustomerReadyOutput(BRIEF_ID)).toBeNull();
  });

  test("builds the Production dispatch claim with exact status and null-cost CAS filters", async () => {
    const operations: Array<readonly unknown[]> = [];
    const builder = {
      update(patch: Record<string, unknown>) {
        operations.push(["update", patch]);
        return builder;
      },
      eq(column: string, value: unknown) {
        operations.push(["eq", column, value]);
        return builder;
      },
      is(column: string, value: unknown) {
        operations.push(["is", column, value]);
        return builder;
      },
      select(columns: string) {
        operations.push(["select", columns]);
        return builder;
      },
      maybeSingle() {
        operations.push(["maybeSingle"]);
        return Promise.resolve({ data: null, error: null });
      },
    };
    const supabase = {
      from(table: string) {
        operations.push(["from", table]);
        return builder;
      },
    } as unknown as Parameters<typeof createFirstPreviewDatabaseClient>[0];

    const database = createFirstPreviewDatabaseClient(supabase);
    await database.claimProviderDispatch(
      JOB_ID,
      100_000,
      "2026-08-03T00:00:00.000Z",
    );
    expect(operations).toEqual([
      ["from", "ai_sketch_jobs"],
      ["update", {
        actual_cost_micros: 100_000,
        updated_at: "2026-08-03T00:00:00.000Z",
      }],
      ["eq", "id", JOB_ID],
      ["eq", "status", "processing"],
      ["is", "actual_cost_micros", null],
      ["select", expect.stringContaining("actual_cost_micros")],
      ["maybeSingle"],
    ]);
  });

  test("dispatch claim rejects malformed, wrong-state, duplicate, and repository-error cases", async () => {
    const queued = harness();
    await queued.repository.reserveJob(reservation());
    expect(await queued.repository.recordProviderDispatch("invalid")).toEqual({
      ok: false,
      code: "invalid_input",
    });
    expect(await queued.repository.recordProviderDispatch(JOB_ID)).toEqual({
      ok: false,
      code: "job_not_active",
    });

    const failed = await reserveStartedJob();
    failed.client.failNext("claimProviderDispatch");
    expect(await failed.repository.recordProviderDispatch(JOB_ID)).toEqual({
      ok: false,
      code: "repository_unavailable",
    });
    expect(failed.client.jobs.get(JOB_ID)?.actual_cost_micros).toBeNull();
  });

  test("normal success and failure reconcile the conservative dispatch marker", async () => {
    const failureState = await reserveAndStart();
    expect(await failureState.repository.recordJobFailure(JOB_ID, {
      category: "provider_unavailable",
      retryEligible: true,
      actualCostMicros: 17_500,
    })).toMatchObject({
      ok: true,
      value: {
        status: "failed",
        actualCostMicros: 17_500,
        retryEligible: true,
      },
    });

    const successState = await completeWithOutput();
    expect(await successState.repository.findJobById(JOB_ID)).toMatchObject({
      status: "succeeded",
      actualCostMicros: 41_000,
    });
  });

  test("atomically rejects a concurrent Provider request identity replacement", async () => {
    const { client, repository } = await reserveStartedJob();
    const results = await Promise.all([
      repository.recordProviderRequest(JOB_ID, { providerRequestId: "openai-request-race-a" }),
      repository.recordProviderRequest(JOB_ID, { providerRequestId: "openai-request-race-b" }),
    ]);

    const successes = results.filter((result) => result.ok);
    const failureCodes = results.flatMap((result) => result.ok === false ? [result.code] : []);
    const persistedRequestId = client.jobs.get(JOB_ID)?.provider_request_id;
    expect(successes).toHaveLength(1);
    expect(failureCodes).toEqual(["idempotency_conflict"]);
    expect(["openai-request-race-a", "openai-request-race-b"]).toContain(persistedRequestId);
    expect(results).toContainEqual(expect.objectContaining({
      ok: true,
      value: expect.objectContaining({ providerRequestId: persistedRequestId }),
    }));
  });

  test("uses database uniqueness plus bounded parent rules for one eligible retry", async () => {
    const { client, repository } = await reserveAndStart();
    await repository.recordJobFailure(JOB_ID, {
      category: "provider_unavailable",
      retryEligible: true,
      actualCostMicros: 5_000,
    });

    const retry = await repository.reserveJob(
      reservation({ jobId: OTHER_JOB_ID, attemptNumber: 2, parentJobId: JOB_ID }),
    );
    const duplicateAttempt = await repository.reserveJob(
      reservation({
        jobId: "723e4567-e89b-42d3-a456-426614174000",
        attemptNumber: 2,
        parentJobId: JOB_ID,
        designSpecSha256: "d".repeat(64),
      }),
    );

    expect(retry).toMatchObject({
      ok: true,
      value: {
        job: {
          attemptNumber: 2,
          parentJobId: JOB_ID,
          sourceOutputId: null,
        },
      },
    });
    expect(duplicateAttempt).toEqual({ ok: false, code: "attempt_identity_conflict" });
    expect(client.jobs.size).toBe(2);
  });

  test("blocks retry-of-retry chains and rejects skipped or older parents", async () => {
    const { repository } = await reserveAndStart();
    await repository.recordJobFailure(JOB_ID, {
      category: "provider_unavailable",
      retryEligible: true,
      actualCostMicros: 5_000,
    });
    expect(
      await repository.reserveJob(
        reservation({
          jobId: OTHER_JOB_ID,
          attemptNumber: 2,
          parentJobId: JOB_ID,
        }),
      ),
    ).toMatchObject({ ok: true });
    await repository.recordJobFailure(OTHER_JOB_ID, {
      category: "provider_unavailable",
      retryEligible: true,
      actualCostMicros: null,
    });

    expect(
      await repository.reserveJob(
        reservation({
          jobId: THIRD_JOB_ID,
          attemptNumber: 3,
          parentJobId: OTHER_JOB_ID,
          sourceOutputId: null,
        }),
      ),
    ).toEqual({ ok: false, code: "retry_not_eligible" });
    expect(
      await repository.reserveJob(
        reservation({
          jobId: THIRD_JOB_ID,
          attemptNumber: 3,
          parentJobId: JOB_ID,
          sourceOutputId: null,
        }),
      ),
    ).toEqual({ ok: false, code: "parent_job_invalid" });
    expect(
      await repository.reserveJob(
        reservation({
          jobId: FOURTH_JOB_ID,
          attemptNumber: 4,
          parentJobId: OTHER_JOB_ID,
          sourceOutputId: null,
        }),
      ),
    ).toEqual({ ok: false, code: "parent_job_invalid" });
  });

  test("supports exact human revision lineage after a successful retry", async () => {
    const { client, repository } = await reserveAndStart();
    await repository.recordJobFailure(JOB_ID, {
      category: "provider_unavailable",
      retryEligible: true,
      actualCostMicros: 5_000,
    });
    expect(
      await repository.reserveJob(
        reservation({
          jobId: OTHER_JOB_ID,
          attemptNumber: 2,
          parentJobId: JOB_ID,
        }),
      ),
    ).toMatchObject({ ok: true });
    expect(await repository.startJob(OTHER_JOB_ID)).toMatchObject({ ok: true });
    expect(
      await repository.recordProviderRequest(OTHER_JOB_ID, {
        providerRequestId: "openai-request-retry-002",
      }),
    ).toMatchObject({ ok: true });
    expect(
      await repository.persistOutput(
        output({
          outputId: SECOND_OUTPUT_ID,
          jobId: OTHER_JOB_ID,
          assetId: "first-preview/123e4567/retry-2.png",
          contentSha256: "d".repeat(64),
        }),
      ),
    ).toMatchObject({ ok: true });
    expect(
      await repository.recordJobSucceeded(OTHER_JOB_ID, { actualCostMicros: 41_000 }),
    ).toMatchObject({ ok: true });
    expect(
      await repository.markOutputReady({
        outputId: SECOND_OUTPUT_ID,
        jobId: OTHER_JOB_ID,
        conceptBriefId: BRIEF_ID,
        gates: PASSING_GATES,
        automaticGatePolicyVersion: FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION,
      }),
    ).toMatchObject({ ok: true });
    client.reviews.set(BRIEF_ID, {
      ...client.reviews.get(BRIEF_ID)!,
      ai_sketch_output_id: SECOND_OUTPUT_ID,
      review_status: "needs_revision",
      revision_instruction: "Refine the successful retry.",
    });

    expect(
      await repository.reserveJob(
        revisionReservation({
          jobId: THIRD_JOB_ID,
          attemptNumber: 3,
          parentJobId: OTHER_JOB_ID,
          sourceOutputId: SECOND_OUTPUT_ID,
        }),
      ),
    ).toMatchObject({
      ok: true,
      value: {
        job: {
          attemptNumber: 3,
          parentJobId: OTHER_JOB_ID,
          sourceOutputId: SECOND_OUTPUT_ID,
        },
      },
    });
    expect(client.insertedJobRows.at(-1)).toMatchObject({
      parent_generation_purpose: "first_preview",
      parent_attempt_number: 2,
    });
  });

  test("reserves an exact source-linked human revision and preserves source state", async () => {
    const { client, repository } = await readyForRevision();
    const sourceOutputBefore = { ...client.outputs.get(OUTPUT_ID)! };
    const reviewBefore = { ...client.reviews.get(BRIEF_ID)! };
    expect(await repository.findReviewByConceptBriefId(BRIEF_ID)).toMatchObject({
      revisionInstruction: "Refine the center-stone orientation.",
    });
    const operationStart = client.operations.length;

    const revision = await repository.reserveJob(revisionReservation());

    expect(revision).toMatchObject({
      ok: true,
      value: {
        disposition: "created",
        job: {
          id: OTHER_JOB_ID,
          parentJobId: JOB_ID,
          sourceOutputId: OUTPUT_ID,
          status: "queued",
          providerRequestId: null,
          startedAt: null,
        },
      },
    });
    expect(client.insertedJobRows.at(-1)).toMatchObject({
      parent_job_id: JOB_ID,
      source_output_id: OUTPUT_ID,
    });
    expect(client.outputs.get(OUTPUT_ID)).toEqual(sourceOutputBefore);
    expect(client.reviews.get(BRIEF_ID)).toEqual(reviewBefore);
    expect(client.operations.slice(operationStart)).toEqual([
      "findJobByIdempotencyKey",
      "findJobById",
      "findJobByAttempt",
      "findActiveJob",
      "findJobById",
      "findOutputById",
      "findReviewByConceptBriefId",
      "insertJob",
    ]);
  });

  test("supports another exact human revision after a successful revision", async () => {
    const { client, repository } = await readyForRevision();
    expect(await repository.reserveJob(revisionReservation())).toMatchObject({
      ok: true,
    });
    expect(await repository.startJob(OTHER_JOB_ID)).toMatchObject({ ok: true });
    expect(
      await repository.recordProviderRequest(OTHER_JOB_ID, {
        providerRequestId: "openai-request-revision-002",
      }),
    ).toMatchObject({ ok: true });
    expect(
      await repository.persistOutput(
        output({
          outputId: SECOND_OUTPUT_ID,
          jobId: OTHER_JOB_ID,
          assetId: "first-preview/123e4567/revision-2.png",
          contentSha256: "d".repeat(64),
        }),
      ),
    ).toMatchObject({ ok: true });
    expect(
      await repository.recordJobSucceeded(OTHER_JOB_ID, { actualCostMicros: 41_000 }),
    ).toMatchObject({ ok: true });
    expect(
      await repository.revokeOutput({
        outputId: OUTPUT_ID,
        jobId: JOB_ID,
        conceptBriefId: BRIEF_ID,
      }),
    ).toMatchObject({ ok: true });
    client.reviews.set(BRIEF_ID, {
      ...client.reviews.get(BRIEF_ID)!,
      ai_sketch_output_id: SECOND_OUTPUT_ID,
      review_status: "draft_generated_internal_only",
      revision_instruction: null,
    });
    expect(
      await repository.markOutputReady({
        outputId: SECOND_OUTPUT_ID,
        jobId: OTHER_JOB_ID,
        conceptBriefId: BRIEF_ID,
        gates: PASSING_GATES,
        automaticGatePolicyVersion: FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION,
      }),
    ).toMatchObject({ ok: true });
    client.reviews.set(BRIEF_ID, {
      ...client.reviews.get(BRIEF_ID)!,
      review_status: "needs_revision",
      revision_instruction: "Refine the second generated direction.",
    });

    expect(
      await repository.reserveJob(
        revisionReservation({
          jobId: THIRD_JOB_ID,
          attemptNumber: 3,
          parentJobId: OTHER_JOB_ID,
          sourceOutputId: SECOND_OUTPUT_ID,
        }),
      ),
    ).toMatchObject({
      ok: true,
      value: {
        job: {
          attemptNumber: 3,
          parentJobId: OTHER_JOB_ID,
          sourceOutputId: SECOND_OUTPUT_ID,
        },
      },
    });
  });

  test("allows one null-source retry after a failed human revision", async () => {
    const { repository } = await readyForRevision();
    expect(await repository.reserveJob(revisionReservation())).toMatchObject({
      ok: true,
    });
    expect(
      await repository.recordJobFailure(OTHER_JOB_ID, {
        category: "provider_unavailable",
        retryEligible: true,
        actualCostMicros: null,
      }),
    ).toMatchObject({ ok: true });

    expect(
      await repository.reserveJob(
        reservation({
          jobId: THIRD_JOB_ID,
          attemptNumber: 3,
          parentJobId: OTHER_JOB_ID,
          sourceOutputId: null,
        }),
      ),
    ).toMatchObject({
      ok: true,
      value: {
        job: {
          attemptNumber: 3,
          parentJobId: OTHER_JOB_ID,
          sourceOutputId: null,
        },
      },
    });
  });

  test("fails revision closed for missing and mismatched source outputs", async () => {
    const missing = await readyForRevision();
    expect(
      await missing.repository.reserveJob(
        revisionReservation({ sourceOutputId: OTHER_OUTPUT_ID }),
      ),
    ).toEqual({ ok: false, code: "output_not_found" });

    for (const mismatch of [
      { job_id: OTHER_JOB_ID },
      { concept_brief_id: OTHER_BRIEF_ID },
    ]) {
      const state = await readyForRevision();
      state.client.outputs.set(OUTPUT_ID, {
        ...state.client.outputs.get(OUTPUT_ID)!,
        ...mismatch,
      });
      expect(
        await state.repository.reserveJob(revisionReservation()),
      ).toEqual({ ok: false, code: "linkage_mismatch" });
      expect(state.client.jobs.size).toBe(1);
    }
  });

  test("requires the source output to be current and first-preview ready", async () => {
    for (const outputState of [
      { readiness_status: "not_ready", is_current_customer_preview: false },
      { readiness_status: "first_preview_ready", is_current_customer_preview: false },
      { readiness_status: "revoked", is_current_customer_preview: false },
    ]) {
      const state = await readyForRevision();
      state.client.outputs.set(OUTPUT_ID, {
        ...state.client.outputs.get(OUTPUT_ID)!,
        ...outputState,
      });
      expect(
        await state.repository.reserveJob(revisionReservation()),
      ).toEqual({ ok: false, code: "revision_not_eligible" });
      expect(state.client.jobs.size).toBe(1);
    }
  });

  test("requires the exact needs-revision review and a valid persisted instruction", async () => {
    const missing = await readyForRevision();
    missing.client.reviews.delete(BRIEF_ID);
    expect(
      await missing.repository.reserveJob(revisionReservation()),
    ).toEqual({ ok: false, code: "revision_not_eligible" });

    for (const reviewPatch of [
      { ai_sketch_output_id: OTHER_OUTPUT_ID },
      { concept_brief_id: OTHER_BRIEF_ID },
      { review_status: "approved_for_customer", revision_instruction: null },
      { revision_instruction: null },
      { revision_instruction: "   " },
      { revision_instruction: "x".repeat(2001) },
    ]) {
      const state = await readyForRevision();
      state.client.reviews.set(BRIEF_ID, {
        ...state.client.reviews.get(BRIEF_ID)!,
        ...reviewPatch,
      });
      expect(
        await state.repository.reserveJob(revisionReservation()),
      ).toEqual({ ok: false, code: "revision_not_eligible" });
      expect(state.client.jobs.size).toBe(1);
    }
  });

  test("requires a succeeded revision parent and keeps attempt uniqueness controlling", async () => {
    const ineligible = await readyForRevision();
    ineligible.client.jobs.set(JOB_ID, {
      ...ineligible.client.jobs.get(JOB_ID)!,
      status: "failed",
      retry_eligible: true,
    });
    expect(
      await ineligible.repository.reserveJob(revisionReservation()),
    ).toEqual({ ok: false, code: "revision_not_eligible" });

    const eligible = await readyForRevision();
    expect(
      await eligible.repository.reserveJob(revisionReservation()),
    ).toMatchObject({ ok: true, value: { disposition: "created" } });
    expect(
      await eligible.repository.reserveJob(
        revisionReservation({
          jobId: "723e4567-e89b-42d3-a456-426614174000",
          designSpecSha256: "d".repeat(64),
        }),
      ),
    ).toEqual({ ok: false, code: "attempt_identity_conflict" });
  });

  test("persists only private asset metadata after validation and remains not ready", async () => {
    const { client, repository } = await reserveAndStart();
    const persisted = await repository.persistOutput(output());
    const replay = await repository.persistOutput(output());

    expect(persisted).toMatchObject({
      ok: true,
      value: {
        assetId: "first-preview/123e4567/output.png",
        bucketName: FIRST_PREVIEW_ASSET_BUCKET,
        contentSha256: CONTENT_HASH,
        readinessStatus: "not_ready",
        isCurrentCustomerPreview: false,
      },
    });
    expect(replay).toEqual(persisted);
    expect(client.insertedOutputRows).toHaveLength(1);
    expect(client.insertedOutputRows[0]).toMatchObject({
      object_path: "first-preview/123e4567/output.png",
      asset_validation_status: "passed",
      automatic_gate_status: null,
      readiness_status: "not_ready",
      is_current_customer_preview: false,
    });
    expect(JSON.stringify(client.insertedOutputRows[0])).not.toContain("http");
    expect(await repository.findCustomerReadyOutput(BRIEF_ID)).toBeNull();
  });

  test("fails closed before writing when asset persistence or linkage is invalid", async () => {
    const { client, repository } = await reserveAndStart();

    expect(await repository.persistOutput(output({ assetPersisted: false }))).toEqual({
      ok: false,
      code: "asset_not_persisted",
    });
    expect(
      await repository.persistOutput(output({ conceptBriefId: OTHER_BRIEF_ID })),
    ).toEqual({ ok: false, code: "linkage_mismatch" });
    for (const assetId of [
      "https://provider.invalid/temporary.png",
      "https:provider.invalid/temporary.png",
      "data:image/png;base64,temporary",
      "first-preview\\123e4567\\output.png",
      "first-preview/123e4567/../output.png",
      "first-preview/123e4567/output.png?token=temporary",
      "first-preview/123e4567/output.png#fragment",
    ]) {
      expect(await repository.persistOutput(output({ assetId }))).toEqual({
        ok: false,
        code: "invalid_input",
      });
    }
    expect(client.outputs.size).toBe(0);
  });

  test("creates the required output-linked review before making the output current", async () => {
    const { client, repository } = await completeWithOutput();
    const operationStart = client.operations.length;
    const ready = await repository.markOutputReady({
      outputId: OUTPUT_ID,
      jobId: JOB_ID,
      conceptBriefId: BRIEF_ID,
      gates: PASSING_GATES,
      automaticGatePolicyVersion: FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION,
    });

    expect(ready).toMatchObject({
      ok: true,
      value: { readinessStatus: "first_preview_ready", isCurrentCustomerPreview: true },
    });
    expect(client.operations.slice(operationStart)).toEqual([
      "findOutputById",
      "findJobById",
      "findReviewByConceptBriefId",
      "insertReview",
      "updateOutput",
    ]);
    expect(client.insertedReviewRows).toEqual([
      {
        ai_sketch_output_id: OUTPUT_ID,
        concept_brief_id: BRIEF_ID,
        review_status: "draft_generated_internal_only",
      },
    ]);
    expect(await repository.findReviewByConceptBriefId(BRIEF_ID)).toMatchObject({
      outputId: OUTPUT_ID,
      reviewStatus: "draft_generated_internal_only",
      revisionInstruction: null,
    });

    client.reviews.set(BRIEF_ID, {
      ...client.reviews.get(BRIEF_ID)!,
      review_status: "needs_revision",
    });
    expect(
      await repository.markOutputReady({
        outputId: OUTPUT_ID,
        jobId: JOB_ID,
        conceptBriefId: BRIEF_ID,
        gates: PASSING_GATES,
        automaticGatePolicyVersion: FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION,
      }),
    ).toMatchObject({
      ok: true,
      value: { readinessStatus: "first_preview_ready" },
    });
    expect(client.insertedReviewRows).toHaveLength(1);
  });

  test("does not create a review or ready state when any automatic gate fails", async () => {
    const { client, repository } = await completeWithOutput();
    const result = await repository.markOutputReady({
      outputId: OUTPUT_ID,
      jobId: JOB_ID,
      conceptBriefId: BRIEF_ID,
      gates: { ...PASSING_GATES, privacyPassed: false },
      automaticGatePolicyVersion: FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION,
    });

    expect(result).toEqual({ ok: false, code: "automatic_gates_not_passed" });
    expect(client.reviews.size).toBe(0);
    expect(client.outputs.get(OUTPUT_ID)?.readiness_status).toBe("not_ready");
  });

  test("refuses readiness when an existing review points at another output", async () => {
    const { client, repository } = await completeWithOutput();
    client.reviews.set(BRIEF_ID, {
      ai_sketch_output_id: OTHER_OUTPUT_ID,
      concept_brief_id: BRIEF_ID,
      review_status: "draft_generated_internal_only",
      revision_instruction: null,
      created_at: "2026-07-22T00:00:30.000Z",
    });

    expect(
      await repository.markOutputReady({
        outputId: OUTPUT_ID,
        jobId: JOB_ID,
        conceptBriefId: BRIEF_ID,
        gates: PASSING_GATES,
        automaticGatePolicyVersion: FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION,
      }),
    ).toEqual({ ok: false, code: "review_linkage_conflict" });
    expect(client.outputs.get(OUTPUT_ID)?.readiness_status).toBe("not_ready");
  });

  test("revokes customer readiness without deleting output or review history", async () => {
    const { client, repository } = await completeWithOutput();
    await repository.markOutputReady({
      outputId: OUTPUT_ID,
      jobId: JOB_ID,
      conceptBriefId: BRIEF_ID,
      gates: PASSING_GATES,
      automaticGatePolicyVersion: FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION,
    });
    const revoked = await repository.revokeOutput({
      outputId: OUTPUT_ID,
      jobId: JOB_ID,
      conceptBriefId: BRIEF_ID,
    });

    expect(revoked).toMatchObject({
      ok: true,
      value: { readinessStatus: "revoked", isCurrentCustomerPreview: false },
    });
    expect(await repository.findCustomerReadyOutput(BRIEF_ID)).toBeNull();
    expect(client.outputs.size).toBe(1);
    expect(client.reviews.size).toBe(1);
  });

  test("returns safe failures on database errors and keeps the unconfigured factory unavailable", async () => {
    const { client, repository } = harness();
    client.failNext("insertJob");

    expect(await repository.reserveJob(reservation())).toEqual({
      ok: false,
      code: "repository_unavailable",
    });
    expect(client.jobs.size).toBe(0);

    const unavailable = createUnavailableFirstPreviewRepository();
    expect(unavailable.kind).toBe("unavailable");
    expect(await unavailable.reserveJob(reservation())).toEqual({
      ok: false,
      code: "repository_unavailable",
    });
  });
});
