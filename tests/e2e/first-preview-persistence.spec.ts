import { expect, test } from "@playwright/test";

import { InMemoryFirstPreviewRepository } from "../../lib/server/ai-sketch/in-memory-first-preview-repository";
import {
  createFirstPreviewRepository,
  type FirstPreviewAutomaticGateEvidence,
} from "../../lib/server/ai-sketch/first-preview-persistence";

const BRIEF_ID = "123e4567-e89b-42d3-a456-426614174000";
const OTHER_BRIEF_ID = "223e4567-e89b-42d3-a456-426614174000";

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

async function reserveAndStart(repository: InMemoryFirstPreviewRepository) {
  const reservation = await repository.reserveJob({
    jobId: "job-1",
    conceptBriefId: BRIEF_ID,
    attemptNumber: 1,
    idempotencyKey: "idempotency-1",
    parentJobId: null,
  });
  expect(reservation.ok).toBe(true);
  const started = await repository.startJob("job-1");
  expect(started.ok).toBe(true);
}

async function persistAndComplete(repository: InMemoryFirstPreviewRepository) {
  const persisted = await repository.persistOutput({
    outputId: "output-1",
    jobId: "job-1",
    conceptBriefId: BRIEF_ID,
    assetId: "preview_asset_fake_001",
    assetPersisted: true,
  });
  expect(persisted.ok).toBe(true);
  const completed = await repository.recordJobSucceeded("job-1");
  expect(completed.ok).toBe(true);
}

test.describe("server-only First Preview persistence foundation", () => {
  test("reserves one queued job with deterministic identity", async () => {
    const repository = createRepository();
    const result = await repository.reserveJob({
      jobId: "job-1",
      conceptBriefId: BRIEF_ID,
      attemptNumber: 1,
      idempotencyKey: "idempotency-1",
      parentJobId: null,
    });

    expect(result).toMatchObject({
      ok: true,
      value: {
        disposition: "created",
        job: {
          id: "job-1",
          conceptBriefId: BRIEF_ID,
          generationPurpose: "first_preview",
          attemptNumber: 1,
          status: "queued",
        },
      },
    });
    expect(repository.snapshot().jobs).toHaveLength(1);
  });

  test("returns the same job for an identical idempotent reservation", async () => {
    const repository = createRepository();
    const input = {
      jobId: "job-1",
      conceptBriefId: BRIEF_ID,
      attemptNumber: 1 as const,
      idempotencyKey: "idempotency-1",
      parentJobId: null,
    };

    await repository.reserveJob(input);
    const duplicate = await repository.reserveJob(input);

    expect(duplicate).toMatchObject({
      ok: true,
      value: { disposition: "existing", job: { id: "job-1" } },
    });
    expect(repository.snapshot().jobs).toHaveLength(1);
  });

  test("fails closed on idempotency reuse with a different identity", async () => {
    const repository = createRepository();
    await repository.reserveJob({
      jobId: "job-1",
      conceptBriefId: BRIEF_ID,
      attemptNumber: 1,
      idempotencyKey: "idempotency-1",
      parentJobId: null,
    });

    const conflict = await repository.reserveJob({
      jobId: "job-2",
      conceptBriefId: OTHER_BRIEF_ID,
      attemptNumber: 1,
      idempotencyKey: "idempotency-1",
      parentJobId: null,
    });

    expect(conflict).toEqual({ ok: false, code: "idempotency_conflict" });
    expect(repository.snapshot().jobs).toHaveLength(1);
  });

  test("rejects a concurrent active job for the same brief", async () => {
    const repository = createRepository();
    await reserveAndStart(repository);

    const concurrent = await repository.reserveJob({
      jobId: "job-2",
      conceptBriefId: BRIEF_ID,
      attemptNumber: 2,
      idempotencyKey: "idempotency-2",
      parentJobId: "job-1",
    });

    expect(concurrent).toEqual({ ok: false, code: "active_job_exists" });
    expect(repository.snapshot().jobs).toHaveLength(1);
  });

  test("persists an asset-backed output as not ready before validation gates", async () => {
    const repository = createRepository();
    await reserveAndStart(repository);

    const output = await repository.persistOutput({
      outputId: "output-1",
      jobId: "job-1",
      conceptBriefId: BRIEF_ID,
      assetId: "preview_asset_fake_001",
      assetPersisted: true,
    });

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
    const input = {
      outputId: "output-1",
      jobId: "job-1",
      conceptBriefId: BRIEF_ID,
      assetId: "preview_asset_fake_001",
      assetPersisted: true,
    };

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
      outputId: "output-1",
      jobId: "job-1",
      conceptBriefId: BRIEF_ID,
      gates: PASSING_GATES,
    });

    expect(ready).toMatchObject({
      ok: true,
      value: {
        readinessStatus: "first_preview_ready",
        isCurrentCustomerPreview: true,
      },
    });
    expect(await repository.findCustomerReadyOutput(BRIEF_ID)).toMatchObject({
      id: "output-1",
      readinessStatus: "first_preview_ready",
    });
  });

  test("keeps the output not ready when any automatic gate fails", async () => {
    const repository = createRepository();
    await reserveAndStart(repository);
    await persistAndComplete(repository);

    const denied = await repository.markOutputReady({
      outputId: "output-1",
      jobId: "job-1",
      conceptBriefId: BRIEF_ID,
      gates: { ...PASSING_GATES, privacyPassed: false },
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

    const missingAsset = await repository.persistOutput({
      outputId: "output-1",
      jobId: "job-1",
      conceptBriefId: BRIEF_ID,
      assetId: "preview_asset_fake_001",
      assetPersisted: false,
    });
    const wrongBrief = await repository.persistOutput({
      outputId: "output-1",
      jobId: "job-1",
      conceptBriefId: OTHER_BRIEF_ID,
      assetId: "preview_asset_fake_001",
      assetPersisted: true,
    });

    expect(missingAsset).toEqual({ ok: false, code: "asset_not_persisted" });
    expect(wrongBrief).toEqual({ ok: false, code: "linkage_mismatch" });
    expect(repository.snapshot().outputs).toHaveLength(0);
  });

  test("records a safe terminal failure without fabricating an output", async () => {
    const repository = createRepository();
    await reserveAndStart(repository);

    const failed = await repository.recordJobFailure("job-1", "provider_failure");

    expect(failed).toMatchObject({
      ok: true,
      value: { status: "failed", failureCategory: "provider_failure" },
    });
    expect(repository.snapshot().outputs).toHaveLength(0);
    expect(await repository.findCustomerReadyOutput(BRIEF_ID)).toBeNull();
  });

  test("uses an unavailable fail-closed repository for the unconfigured production binding", async () => {
    const repository = createFirstPreviewRepository();

    expect(repository.kind).toBe("unavailable");
    expect(
      await repository.reserveJob({
        jobId: "job-1",
        conceptBriefId: BRIEF_ID,
        attemptNumber: 1,
        idempotencyKey: "idempotency-1",
        parentJobId: null,
      }),
    ).toEqual({ ok: false, code: "repository_unavailable" });
    expect(await repository.findJobByIdempotencyKey("idempotency-1")).toBeNull();
    expect(await repository.findCustomerReadyOutput(BRIEF_ID)).toBeNull();
  });
});
