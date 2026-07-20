// Deterministic fake repository for tests and local orchestration only.
// It has no Supabase, Storage, Provider, environment, or network dependency.

import {
  deriveFirstPreviewIdempotencyKey,
  FIRST_PREVIEW_LINEAGE_IDENTITY,
  type FirstPreviewAutomaticGateEvidence,
  type FirstPreviewFailureCategory,
  type FirstPreviewJobRecord,
  type FirstPreviewJobStatus,
  type FirstPreviewOutputRecord,
  type FirstPreviewRepository,
  type FirstPreviewRepositoryFailure,
  type FirstPreviewRepositoryResult,
  type MarkFirstPreviewReadyInput,
  type PersistFirstPreviewOutputInput,
  type RecordFirstPreviewJobFailureInput,
  type ReserveFirstPreviewJobInput,
  type ReserveFirstPreviewJobResult,
} from "./first-preview-persistence-contract";

type Clock = () => string;

const ACTIVE_JOB_STATUSES = new Set<FirstPreviewJobStatus>([
  "queued",
  "processing",
]);

function failure(code: FirstPreviewRepositoryFailure["code"]): FirstPreviewRepositoryFailure {
  return { ok: false, code };
}

function isNonblank(value: string): boolean {
  return value.trim().length > 0;
}

function gatesPassed(gates: FirstPreviewAutomaticGateEvidence): boolean {
  return Object.values(gates).every((value) => value === true);
}

function copyJob(job: FirstPreviewJobRecord): FirstPreviewJobRecord {
  return { ...job };
}

function copyOutput(output: FirstPreviewOutputRecord): FirstPreviewOutputRecord {
  return { ...output };
}

export class InMemoryFirstPreviewRepository implements FirstPreviewRepository {
  readonly kind = "memory_fake" as const;

  private readonly jobsById = new Map<string, FirstPreviewJobRecord>();
  private readonly jobIdByIdempotencyKey = new Map<string, string>();
  private readonly outputsById = new Map<string, FirstPreviewOutputRecord>();
  private readonly outputIdByJobId = new Map<string, string>();

  constructor(private readonly clock: Clock = () => new Date().toISOString()) {}

  async reserveJob(input: ReserveFirstPreviewJobInput): Promise<ReserveFirstPreviewJobResult> {
    const idempotencyKey = deriveFirstPreviewIdempotencyKey(input);
    if (!idempotencyKey) {
      return failure("invalid_input");
    }

    const existingId = this.jobIdByIdempotencyKey.get(idempotencyKey);
    if (existingId) {
      const existing = this.jobsById.get(existingId);
      if (!existing) {
        return failure("repository_unavailable");
      }

      const identityMatches =
        existing.conceptBriefId === input.conceptBriefId &&
        existing.attemptNumber === input.attemptNumber &&
        existing.parentJobId === input.parentJobId &&
        existing.designSpecVersion === input.designSpecVersion &&
        existing.designSpecSha256 === input.designSpecSha256 &&
        existing.handSketchInstructionVersion ===
          input.handSketchInstructionVersion &&
        existing.handSketchInstructionSha256 ===
          input.handSketchInstructionSha256;

      return identityMatches
        ? { ok: true, value: { disposition: "existing", job: copyJob(existing) } }
        : failure("idempotency_conflict");
    }

    if (this.jobsById.has(input.jobId)) {
      return failure("idempotency_conflict");
    }

    const attemptConflict = [...this.jobsById.values()].some(
      (job) =>
        job.conceptBriefId === input.conceptBriefId &&
        job.attemptNumber === input.attemptNumber,
    );
    if (attemptConflict) {
      return failure("attempt_identity_conflict");
    }

    const activeJobExists = [...this.jobsById.values()].some(
      (job) =>
        job.conceptBriefId === input.conceptBriefId &&
        ACTIVE_JOB_STATUSES.has(job.status),
    );
    if (activeJobExists) {
      return failure("active_job_exists");
    }

    if (input.attemptNumber === 2) {
      const parent = input.parentJobId
        ? this.jobsById.get(input.parentJobId)
        : undefined;
      if (
        !parent ||
        parent.conceptBriefId !== input.conceptBriefId ||
        parent.attemptNumber !== 1
      ) {
        return failure("parent_job_invalid");
      }
      if (parent.status !== "failed" || parent.retryEligible !== true) {
        return failure("retry_not_eligible");
      }
    }

    const now = this.clock();
    const job: FirstPreviewJobRecord = {
      id: input.jobId,
      conceptBriefId: input.conceptBriefId,
      generationPurpose: "first_preview",
      attemptNumber: input.attemptNumber,
      idempotencyKey,
      lineageIdentity: FIRST_PREVIEW_LINEAGE_IDENTITY,
      parentJobId: input.parentJobId,
      sourceOutputId: null,
      designSpecVersion: input.designSpecVersion,
      designSpecSha256: input.designSpecSha256,
      handSketchInstructionVersion: input.handSketchInstructionVersion,
      handSketchInstructionSha256: input.handSketchInstructionSha256,
      status: "queued",
      failureCategory: null,
      retryEligible: null,
      createdAt: now,
      updatedAt: now,
    };

    this.jobsById.set(job.id, job);
    this.jobIdByIdempotencyKey.set(job.idempotencyKey, job.id);

    return { ok: true, value: { disposition: "created", job: copyJob(job) } };
  }

  async startJob(
    jobId: string,
  ): Promise<FirstPreviewRepositoryResult<FirstPreviewJobRecord>> {
    return this.transitionJob(jobId, "processing", null, null, new Set(["queued"]));
  }

  async recordJobSucceeded(
    jobId: string,
  ): Promise<FirstPreviewRepositoryResult<FirstPreviewJobRecord>> {
    if (!this.outputIdByJobId.has(jobId)) {
      return failure("output_not_found");
    }
    return this.transitionJob(
      jobId,
      "succeeded",
      null,
      false,
      new Set(["processing"]),
    );
  }

  async recordJobFailure(
    jobId: string,
    failureInput: RecordFirstPreviewJobFailureInput,
  ): Promise<FirstPreviewRepositoryResult<FirstPreviewJobRecord>> {
    const { category, retryEligible } = failureInput;
    if ((category === "timeout" || category === "cancelled") && retryEligible) {
      return failure("invalid_input");
    }
    const status =
      category === "timeout"
        ? "timed_out"
        : category === "cancelled"
          ? "cancelled"
          : "failed";
    return this.transitionJob(
      jobId,
      status,
      category,
      status === "failed" ? retryEligible : false,
      new Set(["queued", "processing"]),
    );
  }

  async persistOutput(
    input: PersistFirstPreviewOutputInput,
  ): Promise<FirstPreviewRepositoryResult<FirstPreviewOutputRecord>> {
    if (
      !isNonblank(input.outputId) ||
      !isNonblank(input.jobId) ||
      !isNonblank(input.conceptBriefId) ||
      !isNonblank(input.assetId)
    ) {
      return failure("invalid_input");
    }
    if (input.assetPersisted !== true) {
      return failure("asset_not_persisted");
    }

    const job = this.jobsById.get(input.jobId);
    if (!job) {
      return failure("job_not_found");
    }
    if (job.conceptBriefId !== input.conceptBriefId) {
      return failure("linkage_mismatch");
    }
    if (job.status !== "processing") {
      return failure("job_not_active");
    }
    const existingById = this.outputsById.get(input.outputId);
    const existingForJobId = this.outputIdByJobId.get(input.jobId);
    if (existingById || existingForJobId) {
      const existing = existingById ?? this.outputsById.get(existingForJobId!);
      const identityMatches =
        existing?.id === input.outputId &&
        existing.jobId === input.jobId &&
        existing.conceptBriefId === input.conceptBriefId &&
        existing.assetId === input.assetId;
      return identityMatches && existing
        ? { ok: true, value: copyOutput(existing) }
        : failure("output_already_exists");
    }

    const output: FirstPreviewOutputRecord = {
      id: input.outputId,
      jobId: input.jobId,
      conceptBriefId: input.conceptBriefId,
      assetId: input.assetId,
      assetPersisted: true,
      readinessStatus: "not_ready",
      isCurrentCustomerPreview: false,
      createdAt: this.clock(),
      readyAt: null,
    };

    this.outputsById.set(output.id, output);
    this.outputIdByJobId.set(output.jobId, output.id);
    return { ok: true, value: copyOutput(output) };
  }

  async markOutputReady(
    input: MarkFirstPreviewReadyInput,
  ): Promise<FirstPreviewRepositoryResult<FirstPreviewOutputRecord>> {
    const output = this.outputsById.get(input.outputId);
    if (!output) {
      return failure("output_not_found");
    }
    if (
      output.jobId !== input.jobId ||
      output.conceptBriefId !== input.conceptBriefId
    ) {
      return failure("linkage_mismatch");
    }
    if (!gatesPassed(input.gates)) {
      return failure("automatic_gates_not_passed");
    }

    const job = this.jobsById.get(output.jobId);
    if (!job || job.status !== "succeeded") {
      return failure("job_not_active");
    }

    const conflictingCurrent = [...this.outputsById.values()].some(
      (candidate) =>
        candidate.id !== output.id &&
        candidate.conceptBriefId === output.conceptBriefId &&
        candidate.isCurrentCustomerPreview,
    );
    if (conflictingCurrent) {
      return failure("attempt_identity_conflict");
    }

    const ready: FirstPreviewOutputRecord = {
      ...output,
      readinessStatus: "first_preview_ready",
      isCurrentCustomerPreview: true,
      readyAt: this.clock(),
    };
    this.outputsById.set(ready.id, ready);
    return { ok: true, value: copyOutput(ready) };
  }

  async findJobByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<FirstPreviewJobRecord | null> {
    const jobId = this.jobIdByIdempotencyKey.get(idempotencyKey);
    const job = jobId ? this.jobsById.get(jobId) : undefined;
    return job ? copyJob(job) : null;
  }

  async findCustomerReadyOutput(
    conceptBriefId: string,
  ): Promise<FirstPreviewOutputRecord | null> {
    const output = [...this.outputsById.values()].find(
      (candidate) =>
        candidate.conceptBriefId === conceptBriefId &&
        candidate.readinessStatus === "first_preview_ready" &&
        candidate.isCurrentCustomerPreview,
    );
    return output ? copyOutput(output) : null;
  }

  snapshot(): Readonly<{
    jobs: FirstPreviewJobRecord[];
    outputs: FirstPreviewOutputRecord[];
  }> {
    return {
      jobs: [...this.jobsById.values()].map(copyJob),
      outputs: [...this.outputsById.values()].map(copyOutput),
    };
  }

  private async transitionJob(
    jobId: string,
    status: FirstPreviewJobStatus,
    failureCategory: FirstPreviewFailureCategory | null,
    retryEligible: boolean | null,
    allowedFrom: ReadonlySet<FirstPreviewJobStatus>,
  ): Promise<FirstPreviewRepositoryResult<FirstPreviewJobRecord>> {
    const job = this.jobsById.get(jobId);
    if (!job) {
      return failure("job_not_found");
    }
    if (!allowedFrom.has(job.status)) {
      return failure("job_not_active");
    }

    const updated: FirstPreviewJobRecord = {
      ...job,
      status,
      failureCategory,
      retryEligible,
      updatedAt: this.clock(),
    };
    this.jobsById.set(jobId, updated);
    return { ok: true, value: copyJob(updated) };
  }
}
