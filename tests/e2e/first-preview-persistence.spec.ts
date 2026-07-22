import { expect, test } from "@playwright/test";

import { InMemoryFirstPreviewRepository } from "../../lib/server/ai-sketch/in-memory-first-preview-repository";
import {
  createFirstPreviewCanonicalIdentity,
  createUnavailableFirstPreviewRepository,
  deriveFirstPreviewIdempotencyKey,
  FIRST_PREVIEW_IDEMPOTENCY_VERSION,
  FIRST_PREVIEW_LINEAGE_IDENTITY,
  FIRST_PREVIEW_ASSET_BUCKET,
  FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION,
  type FirstPreviewAutomaticGateEvidence,
  type FirstPreviewFailureCategory,
  type ReserveFirstPreviewJobInput,
} from "../../lib/server/ai-sketch/first-preview-persistence-contract";

const BRIEF_ID = "123e4567-e89b-42d3-a456-426614174000";
const OTHER_BRIEF_ID = "223e4567-e89b-42d3-a456-426614174000";
const JOB_1_ID = "323e4567-e89b-42d3-a456-426614174000";
const JOB_2_ID = "423e4567-e89b-42d3-a456-426614174000";
const JOB_3_ID = "523e4567-e89b-42d3-a456-426614174000";
const OUTPUT_1_ID = "623e4567-e89b-42d3-a456-426614174000";
const DESIGN_SPEC_SHA256 = "a".repeat(64);
const INSTRUCTION_SHA256 = "b".repeat(64);
const CONTENT_SHA256 = "c".repeat(64);

const PASSING_GATES: FirstPreviewAutomaticGateEvidence = {
  outputValid: true,
  assetExists: true,
  ownershipConsistent: true,
  privacyPassed: true,
  customerAccessEligible: true,
  lifecycleEligible: true,
};

function createRepository() {
  let tick = 0;
  return new InMemoryFirstPreviewRepository(
    () => `2026-07-20T00:00:${String(tick++).padStart(2, "0")}.000Z`,
  );
}

function reservationInput(
  overrides: Partial<ReserveFirstPreviewJobInput> = {},
): ReserveFirstPreviewJobInput {
  return {
    jobId: JOB_1_ID,
    conceptBriefId: BRIEF_ID,
    attemptNumber: 1,
    parentJobId: null,
    designSpecVersion: "novora_design_spec_v1",
    designSpecSha256: DESIGN_SPEC_SHA256,
    handSketchInstructionVersion: "novora_hand_sketch_instruction_v1",
    handSketchInstructionSha256: INSTRUCTION_SHA256,
    estimatedCostMicros: 42_000,
    costCurrency: "USD",
    pricingAssumptionVersion: "openai-gpt-image-2-v1",
    ...overrides,
  };
}

function outputInput(overrides = {}) {
  return {
    outputId: OUTPUT_1_ID,
    jobId: JOB_1_ID,
    conceptBriefId: BRIEF_ID,
    assetId: "first-preview/brief/output.png",
    assetPersisted: true,
    bucketName: FIRST_PREVIEW_ASSET_BUCKET,
    mimeType: "image/png" as const,
    byteSize: 12_345,
    widthPx: 1024 as const,
    heightPx: 1024 as const,
    contentSha256: CONTENT_SHA256,
    assetCreatedAt: "2026-07-20T00:00:10.000Z",
    assetValidatedAt: "2026-07-20T00:00:11.000Z",
    ...overrides,
  };
}

async function reserveAndStart(repository: InMemoryFirstPreviewRepository) {
  const reservation = await repository.reserveJob(reservationInput());
  expect(reservation.ok).toBe(true);
  const started = await repository.startJob(JOB_1_ID);
  expect(started.ok).toBe(true);
  const providerRequest = await repository.recordProviderRequest(JOB_1_ID, {
    providerRequestId: "fake-provider-request-001",
  });
  expect(providerRequest.ok).toBe(true);
}

async function persistAndComplete(repository: InMemoryFirstPreviewRepository) {
  const persisted = await repository.persistOutput(outputInput());
  expect(persisted.ok).toBe(true);
  const completed = await repository.recordJobSucceeded(JOB_1_ID, {
    actualCostMicros: 41_000,
  });
  expect(completed.ok).toBe(true);
}

async function reserveAttemptTwo(repository: InMemoryFirstPreviewRepository) {
  return repository.reserveJob(
    reservationInput({
      jobId: JOB_2_ID,
      attemptNumber: 2,
      parentJobId: JOB_1_ID,
    }),
  );
}

test.describe("server-only First Preview persistence foundation", () => {
  test("derives the canonical RFC 8785 identity and lowercase SHA-256 key", () => {
    const input = reservationInput();
    const identity = createFirstPreviewCanonicalIdentity(input);
    const key = deriveFirstPreviewIdempotencyKey(input);

    expect(identity).toEqual({
      attempt_number: 1,
      concept_brief_id: BRIEF_ID,
      design_spec_sha256: DESIGN_SPEC_SHA256,
      design_spec_version: "novora_design_spec_v1",
      generation_purpose: "first_preview",
      hand_sketch_instruction_sha256: INSTRUCTION_SHA256,
      hand_sketch_instruction_version: "novora_hand_sketch_instruction_v1",
      lineage_identity: FIRST_PREVIEW_LINEAGE_IDENTITY,
      parent_job_id: null,
      source_output_id: null,
      version: FIRST_PREVIEW_IDEMPOTENCY_VERSION,
    });
    expect(Object.keys(identity ?? {})).toEqual(
      [...Object.keys(identity ?? {})].sort(),
    );
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(key).toBe(deriveFirstPreviewIdempotencyKey({ ...input }));
  });

  test("rejects malformed canonical identity before reservation", async () => {
    const repository = createRepository();
    const invalidHash = await repository.reserveJob(
      reservationInput({ designSpecSha256: "NOT-A-SHA256" }),
    );
    const invalidRoot = await repository.reserveJob(
      reservationInput({ parentJobId: JOB_2_ID }),
    );

    expect(invalidHash).toEqual({ ok: false, code: "invalid_input" });
    expect(invalidRoot).toEqual({ ok: false, code: "invalid_input" });
    expect(repository.snapshot().jobs).toHaveLength(0);
  });

  test("reserves one queued job with deterministic identity", async () => {
    const repository = createRepository();
    const result = await repository.reserveJob(reservationInput());

    expect(result).toMatchObject({
      ok: true,
      value: {
        disposition: "created",
        job: {
          id: JOB_1_ID,
          conceptBriefId: BRIEF_ID,
          generationPurpose: "first_preview",
          attemptNumber: 1,
          lineageIdentity: FIRST_PREVIEW_LINEAGE_IDENTITY,
          sourceOutputId: null,
          status: "queued",
          retryEligible: null,
        },
      },
    });
    expect(repository.snapshot().jobs).toHaveLength(1);
  });

  test("replays the same canonical identity despite a fresh proposed job UUID", async () => {
    const repository = createRepository();
    const first = await repository.reserveJob(reservationInput());
    const replay = await repository.reserveJob(reservationInput({ jobId: JOB_2_ID }));

    expect(first).toMatchObject({ ok: true, value: { disposition: "created" } });
    expect(replay).toMatchObject({
      ok: true,
      value: { disposition: "existing", job: { id: JOB_1_ID } },
    });
    expect(repository.snapshot().jobs).toHaveLength(1);
  });

  test("creates a different key when canonical structured identity changes", async () => {
    const original = reservationInput();
    const changed = reservationInput({
      jobId: JOB_2_ID,
      conceptBriefId: OTHER_BRIEF_ID,
      designSpecSha256: "c".repeat(64),
    });

    expect(deriveFirstPreviewIdempotencyKey(original)).not.toBe(
      deriveFirstPreviewIdempotencyKey(changed),
    );
  });

  test("rejects a concurrent active job for the same brief", async () => {
    const repository = createRepository();
    await reserveAndStart(repository);

    const concurrent = await reserveAttemptTwo(repository);

    expect(concurrent).toEqual({ ok: false, code: "active_job_exists" });
    expect(repository.snapshot().jobs).toHaveLength(1);
  });

  test("allows exactly one attempt-2 child after an eligible failed attempt 1", async () => {
    const repository = createRepository();
    await reserveAndStart(repository);
    await repository.recordJobFailure(JOB_1_ID, {
      category: "provider_unavailable",
      retryEligible: true,
      actualCostMicros: null,
    });

    const retry = await reserveAttemptTwo(repository);
    const duplicateAttempt = await repository.reserveJob(
      reservationInput({
        jobId: JOB_3_ID,
        attemptNumber: 2,
        parentJobId: JOB_1_ID,
        designSpecSha256: "c".repeat(64),
      }),
    );

    expect(retry).toMatchObject({
      ok: true,
      value: {
        disposition: "created",
        job: {
          id: JOB_2_ID,
          attemptNumber: 2,
          parentJobId: JOB_1_ID,
        },
      },
    });
    expect(duplicateAttempt).toEqual({
      ok: false,
      code: "attempt_identity_conflict",
    });
  });

  for (const scenario of [
    { name: "non-retryable failure", category: "invalid_provider_response", retry: false },
    { name: "timeout", category: "timeout", retry: false },
    { name: "cancellation", category: "cancelled", retry: false },
  ] as const satisfies ReadonlyArray<{
    name: string;
    category: FirstPreviewFailureCategory;
    retry: boolean;
  }>) {
    test(`denies attempt 2 after ${scenario.name}`, async () => {
      const repository = createRepository();
      await reserveAndStart(repository);
      await repository.recordJobFailure(JOB_1_ID, {
        category: scenario.category,
        retryEligible: scenario.retry,
        actualCostMicros: null,
      });

      expect(await reserveAttemptTwo(repository)).toEqual({
        ok: false,
        code: "retry_not_eligible",
      });
    });
  }

  test("denies attempt 2 after a succeeded attempt 1", async () => {
    const repository = createRepository();
    await reserveAndStart(repository);
    await persistAndComplete(repository);

    expect(await reserveAttemptTwo(repository)).toEqual({
      ok: false,
      code: "retry_not_eligible",
    });
  });

  test("rejects retry eligibility for timeout and cancellation records", async () => {
    const repository = createRepository();
    await reserveAndStart(repository);

    expect(
      await repository.recordJobFailure(JOB_1_ID, {
        category: "timeout",
        retryEligible: true,
        actualCostMicros: null,
      }),
    ).toEqual({ ok: false, code: "invalid_input" });
  });

  test("persists an asset-backed output as not ready before validation gates", async () => {
    const repository = createRepository();
    await reserveAndStart(repository);

    const output = await repository.persistOutput(outputInput());

    expect(output).toMatchObject({
      ok: true,
      value: {
        readinessStatus: "not_ready",
        isCurrentCustomerPreview: false,
        assetPersisted: true,
      },
    });
    expect(await repository.findCustomerReadyOutput(BRIEF_ID)).toBeNull();
  });

  test("makes an identical output-persistence retry idempotent", async () => {
    const repository = createRepository();
    await reserveAndStart(repository);
    const input = outputInput();

    const first = await repository.persistOutput(input);
    const repeated = await repository.persistOutput(input);

    expect(first).toEqual(repeated);
    expect(repository.snapshot().outputs).toHaveLength(1);
  });

  test("becomes customer-ready only after persistence, success, and every automatic gate", async () => {
    const repository = createRepository();
    await reserveAndStart(repository);
    await persistAndComplete(repository);

    const ready = await repository.markOutputReady({
      outputId: OUTPUT_1_ID,
      jobId: JOB_1_ID,
      conceptBriefId: BRIEF_ID,
      gates: PASSING_GATES,
      automaticGatePolicyVersion: FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION,
    });

    expect(ready).toMatchObject({
      ok: true,
      value: {
        readinessStatus: "first_preview_ready",
        isCurrentCustomerPreview: true,
      },
    });
    expect(await repository.findCustomerReadyOutput(BRIEF_ID)).toMatchObject({
      id: OUTPUT_1_ID,
      readinessStatus: "first_preview_ready",
    });
  });

  test("keeps the output not ready when any automatic gate fails", async () => {
    const repository = createRepository();
    await reserveAndStart(repository);
    await persistAndComplete(repository);

    const denied = await repository.markOutputReady({
      outputId: OUTPUT_1_ID,
      jobId: JOB_1_ID,
      conceptBriefId: BRIEF_ID,
      gates: { ...PASSING_GATES, privacyPassed: false },
      automaticGatePolicyVersion: FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION,
    });

    expect(denied).toEqual({ ok: false, code: "automatic_gates_not_passed" });
    expect(repository.snapshot().outputs[0]).toMatchObject({
      readinessStatus: "not_ready",
      isCurrentCustomerPreview: false,
      readyAt: null,
    });
    expect(await repository.findCustomerReadyOutput(BRIEF_ID)).toBeNull();
  });

  test("rejects missing asset persistence and wrong brief/output linkage", async () => {
    const repository = createRepository();
    await reserveAndStart(repository);

    const missingAsset = await repository.persistOutput(
      outputInput({ assetPersisted: false }),
    );
    const wrongBrief = await repository.persistOutput(
      outputInput({ conceptBriefId: OTHER_BRIEF_ID }),
    );

    expect(missingAsset).toEqual({ ok: false, code: "asset_not_persisted" });
    expect(wrongBrief).toEqual({ ok: false, code: "linkage_mismatch" });
    expect(repository.snapshot().outputs).toHaveLength(0);
  });

  test("records a safe terminal failure without fabricating an output", async () => {
    const repository = createRepository();
    await reserveAndStart(repository);

    const failed = await repository.recordJobFailure(JOB_1_ID, {
      category: "invalid_provider_response",
      retryEligible: false,
      actualCostMicros: 10_000,
    });

    expect(failed).toMatchObject({
      ok: true,
      value: {
        status: "failed",
        failureCategory: "invalid_provider_response",
        retryEligible: false,
      },
    });
    expect(repository.snapshot().outputs).toHaveLength(0);
    expect(await repository.findCustomerReadyOutput(BRIEF_ID)).toBeNull();
  });

  test("uses an unavailable fail-closed repository for the unconfigured Production binding", async () => {
    const repository = createUnavailableFirstPreviewRepository();

    expect(repository.kind).toBe("unavailable");
    expect(await repository.reserveJob(reservationInput())).toEqual({
      ok: false,
      code: "repository_unavailable",
    });
    expect(await repository.findJobByIdempotencyKey("a".repeat(64))).toBeNull();
    expect(await repository.findCustomerReadyOutput(BRIEF_ID)).toBeNull();
  });
});
