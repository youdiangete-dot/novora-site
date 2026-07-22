// Deterministic fake repository for tests and local orchestration only.
// It has no Supabase, Storage, Provider, environment, or network dependency.

import {
  deriveFirstPreviewIdempotencyKey,
  FIRST_PREVIEW_ASSET_BUCKET,
  FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION,
  FIRST_PREVIEW_LINEAGE_IDENTITY,
  FIRST_PREVIEW_PROVIDER_PROFILE,
  type FirstPreviewAutomaticGateEvidence,
  type FirstPreviewFailureCategory,
  type FirstPreviewJobRecord,
  type FirstPreviewJobStatus,
  type FirstPreviewOutputRecord,
  type FirstPreviewReviewRecord,
  type FirstPreviewRepository,
  type FirstPreviewRepositoryFailure,
  type FirstPreviewRepositoryResult,
  type MarkFirstPreviewReadyInput,
  type PersistFirstPreviewOutputInput,
  type RecordFirstPreviewJobFailureInput,
  type RecordFirstPreviewJobSuccessInput,
  type RecordFirstPreviewProviderRequestInput,
  type RevokeFirstPreviewOutputInput,
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

function copyReview(review: FirstPreviewReviewRecord): FirstPreviewReviewRecord {
  return { ...review };
}

function addSeconds(value: string, seconds: number): string {
  return new Date(new Date(value).getTime() + seconds * 1000).toISOString();
}

function isValidCost(value: number | null): boolean {
  return value === null || (Number.isSafeInteger(value) && value >= 0);
}

export class InMemoryFirstPreviewRepository implements FirstPreviewRepository {
  readonly kind = "memory_fake" as const;

  private readonly jobsById = new Map<string, FirstPreviewJobRecord>();
  private readonly jobIdByIdempotencyKey = new Map<string, string>();
  private readonly outputsById = new Map<string, FirstPreviewOutputRecord>();
  private readonly outputIdByJobId = new Map<string, string>();
  private readonly reviewsByConceptBriefId = new Map<string, FirstPreviewReviewRecord>();

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
      providerName: FIRST_PREVIEW_PROVIDER_PROFILE.providerName,
      providerRequestId: null,
      estimatedCostMicros: input.estimatedCostMicros,
      actualCostMicros: null,
      costCurrency: input.costCurrency,
      pricingAssumptionVersion: input.pricingAssumptionVersion,
      status: "queued",
      failureCategory: null,
      retryEligible: null,
      startedAt: null,
      deadlineAt: null,
      completedAt: null,
      failedAt: null,
      cancelledAt: null,
      timedOutAt: null,
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
    const now = this.clock();
    return this.transitionJob(
      jobId,
      new Set(["queued"]),
      {
        status: "processing",
        startedAt: now,
        deadlineAt: addSeconds(now, 30),
      },
    );
  }

  async recordProviderRequest(
    jobId: string,
    request: RecordFirstPreviewProviderRequestInput,
  ): Promise<FirstPreviewRepositoryResult<FirstPreviewJobRecord>> {
    if (!isNonblank(request.providerRequestId)) {
      return failure("invalid_input");
    }
    const current = this.jobsById.get(jobId);
    if (!current) {
      return failure("job_not_found");
    }
    if (current.status !== "processing") {
      return failure("job_not_active");
    }
    if (current.providerRequestId === request.providerRequestId) {
      return { ok: true, value: copyJob(current) };
    }
    if (current.providerRequestId !== null) {
      return failure("idempotency_conflict");
    }
    const duplicate = [...this.jobsById.values()].some(
      (job) =>
        job.id !== jobId &&
        job.providerName === FIRST_PREVIEW_PROVIDER_PROFILE.providerName &&
        job.providerRequestId === request.providerRequestId,
    );
    if (duplicate) {
      return failure("idempotency_conflict");
    }
    return this.transitionJob(jobId, new Set(["processing"]), {
      providerRequestId: request.providerRequestId,
    });
  }

  async recordJobSucceeded(
    jobId: string,
    success: RecordFirstPreviewJobSuccessInput,
  ): Promise<FirstPreviewRepositoryResult<FirstPreviewJobRecord>> {
    if (!this.outputIdByJobId.has(jobId)) {
      return failure("output_not_found");
    }
    if (!isValidCost(success.actualCostMicros)) {
      return failure("invalid_input");
    }
    return this.transitionJob(jobId, new Set(["processing"]), {
      status: "succeeded",
      failureCategory: null,
      retryEligible: null,
      actualCostMicros: success.actualCostMicros,
      completedAt: this.clock(),
    });
  }

  async recordJobFailure(
    jobId: string,
    failureInput: RecordFirstPreviewJobFailureInput,
  ): Promise<FirstPreviewRepositoryResult<FirstPreviewJobRecord>> {
    const { category, retryEligible } = failureInput;
    const retryableCategory =
      category === "rate_limited" ||
      category === "provider_unavailable" ||
      category === "network_failure";
    if (
      ((category === "timeout" || category === "cancelled") && retryEligible) ||
      (retryEligible && !retryableCategory) ||
      !isValidCost(failureInput.actualCostMicros)
    ) {
      return failure("invalid_input");
    }
    const status =
      category === "timeout"
        ? "timed_out"
        : category === "cancelled"
          ? "cancelled"
          : "failed";
    const job = this.jobsById.get(jobId);
    const now = this.clock();
    const terminalAt =
      status === "timed_out" && job?.deadlineAt && now < job.deadlineAt
        ? job.deadlineAt
        : now;
    return this.transitionJob(jobId, new Set(["queued", "processing"]), {
      status,
      failureCategory: category,
      retryEligible: status === "failed" ? retryEligible : false,
      actualCostMicros: failureInput.actualCostMicros,
      failedAt: status === "failed" ? terminalAt : null,
      cancelledAt: status === "cancelled" ? terminalAt : null,
      timedOutAt: status === "timed_out" ? terminalAt : null,
    });
  }

  async persistOutput(
    input: PersistFirstPreviewOutputInput,
  ): Promise<FirstPreviewRepositoryResult<FirstPreviewOutputRecord>> {
    if (
      !isNonblank(input.outputId) ||
      !isNonblank(input.jobId) ||
      !isNonblank(input.conceptBriefId) ||
      !isNonblank(input.assetId) ||
      input.bucketName !== FIRST_PREVIEW_ASSET_BUCKET ||
      input.mimeType !== "image/png" ||
      !Number.isSafeInteger(input.byteSize) ||
      input.byteSize < 1 ||
      input.byteSize > 16_777_216 ||
      input.widthPx !== 1024 ||
      input.heightPx !== 1024 ||
      !/^[0-9a-f]{64}$/.test(input.contentSha256) ||
      !Number.isFinite(Date.parse(input.assetCreatedAt)) ||
      !Number.isFinite(Date.parse(input.assetValidatedAt)) ||
      input.assetValidatedAt < input.assetCreatedAt
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
    if (!isNonblank(job.providerRequestId ?? "")) {
      return failure("invalid_input");
    }
    const existingById = this.outputsById.get(input.outputId);
    const existingForJobId = this.outputIdByJobId.get(input.jobId);
    if (existingById || existingForJobId) {
      const existing = existingById ?? this.outputsById.get(existingForJobId!);
      const identityMatches =
        existing?.id === input.outputId &&
        existing.jobId === input.jobId &&
        existing.conceptBriefId === input.conceptBriefId &&
        existing.assetId === input.assetId &&
        existing.contentSha256 === input.contentSha256;
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
      bucketName: input.bucketName,
      mimeType: input.mimeType,
      byteSize: input.byteSize,
      widthPx: input.widthPx,
      heightPx: input.heightPx,
      contentSha256: input.contentSha256,
      assetCreatedAt: input.assetCreatedAt,
      assetValidatedAt: input.assetValidatedAt,
      readinessStatus: "not_ready",
      isCurrentCustomerPreview: false,
      createdAt: this.clock(),
      readyAt: null,
      revokedAt: null,
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
    if (
      input.automaticGatePolicyVersion !==
      FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION
    ) {
      return failure("invalid_input");
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

    const existingReview = this.reviewsByConceptBriefId.get(input.conceptBriefId);
    if (existingReview && existingReview.outputId !== input.outputId) {
      return failure("review_linkage_conflict");
    }
    if (!existingReview) {
      this.reviewsByConceptBriefId.set(input.conceptBriefId, {
        outputId: input.outputId,
        conceptBriefId: input.conceptBriefId,
        reviewStatus: "draft_generated_internal_only",
        createdAt: this.clock(),
      });
    }

    const now = this.clock();
    const readyAt = now >= output.assetValidatedAt ? now : output.assetValidatedAt;
    const ready: FirstPreviewOutputRecord = {
      ...output,
      readinessStatus: "first_preview_ready",
      isCurrentCustomerPreview: true,
      readyAt,
      revokedAt: null,
    };
    this.outputsById.set(ready.id, ready);
    return { ok: true, value: copyOutput(ready) };
  }

  async revokeOutput(
    input: RevokeFirstPreviewOutputInput,
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
    if (
      output.readinessStatus !== "first_preview_ready" ||
      !output.isCurrentCustomerPreview
    ) {
      return failure("job_not_active");
    }
    const revokedNow = this.clock();
    const revoked: FirstPreviewOutputRecord = {
      ...output,
      readinessStatus: "revoked",
      isCurrentCustomerPreview: false,
      revokedAt:
        output.readyAt && revokedNow < output.readyAt
          ? output.readyAt
          : revokedNow,
    };
    this.outputsById.set(revoked.id, revoked);
    return { ok: true, value: copyOutput(revoked) };
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

  async findReviewByConceptBriefId(
    conceptBriefId: string,
  ): Promise<FirstPreviewReviewRecord | null> {
    const review = this.reviewsByConceptBriefId.get(conceptBriefId);
    return review ? copyReview(review) : null;
  }

  snapshot(): Readonly<{
    jobs: FirstPreviewJobRecord[];
    outputs: FirstPreviewOutputRecord[];
    reviews: FirstPreviewReviewRecord[];
  }> {
    return {
      jobs: [...this.jobsById.values()].map(copyJob),
      outputs: [...this.outputsById.values()].map(copyOutput),
      reviews: [...this.reviewsByConceptBriefId.values()].map(copyReview),
    };
  }

  private async transitionJob(
    jobId: string,
    allowedFrom: ReadonlySet<FirstPreviewJobStatus>,
    patch: Partial<FirstPreviewJobRecord>,
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
      ...patch,
      updatedAt: this.clock(),
    };
    this.jobsById.set(jobId, updated);
    return { ok: true, value: copyJob(updated) };
  }
}
