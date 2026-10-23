// Deterministic fake repository for tests and local orchestration only.
// It has no Supabase, Storage, Provider, environment, or network dependency.

import { FIRST_PREVIEW_COST_CONTRACT } from "./first-preview-cost-contract";
import {
  FIRST_PREVIEW_VISUAL_PRIVACY_BRIEF_LIMIT_MICROS,
  FIRST_PREVIEW_VISUAL_PRIVACY_RESERVATION_MICROS,
  hasPassedFirstPreviewAutomaticGateEvidence,
  isVisualPrivacySubject,
  validateFirstPreviewInspectionInterruptionEvidence,
  validateFirstPreviewVisualPrivacyEvidence,
  type FirstPreviewVisualPrivacyEvidence,
  type VisualPrivacySubject,
} from "./first-preview-visual-privacy-contract";

import {
  deriveFirstPreviewIdempotencyKey,
  FIRST_PREVIEW_ASSET_BUCKET,
  FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION,
  FIRST_PREVIEW_LINEAGE_IDENTITY,
  FIRST_PREVIEW_POST_SUCCESS_PENDING_MAX_AGE_SECONDS,
  FIRST_PREVIEW_PROVIDER_PROFILE,
  parseFirstPreviewCanonicalUtcTimestampMicros,
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

function normalizeRevisionInstruction(
  value: string | null,
): string | null | undefined {
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length >= 1 && trimmed.length <= 2000 ? trimmed : undefined;
}

function visualSubject(output: FirstPreviewOutputRecord): VisualPrivacySubject {
  return {
    conceptBriefId: output.conceptBriefId,
    jobId: output.jobId,
    outputId: output.id,
    contentSha256: output.contentSha256,
  };
}

function subjectMatches(output: FirstPreviewOutputRecord, subject: VisualPrivacySubject): boolean {
  return output.id === subject.outputId && output.jobId === subject.jobId &&
    output.conceptBriefId === subject.conceptBriefId && output.contentSha256 === subject.contentSha256;
}

function sanitizedVisualEvidence(evidence: FirstPreviewVisualPrivacyEvidence): FirstPreviewVisualPrivacyEvidence {
  return {
    subject: {
      conceptBriefId: evidence.subject.conceptBriefId,
      jobId: evidence.subject.jobId,
      outputId: evidence.subject.outputId,
      contentSha256: evidence.subject.contentSha256,
    },
    inspectorVersion: evidence.inspectorVersion,
    policyVersion: evidence.policyVersion,
    model: evidence.model,
    result: evidence.result,
    usageTrusted: evidence.usageTrusted,
    actualCostMicros: evidence.actualCostMicros,
  };
}

function sanitizedGateEvidence(gates: FirstPreviewAutomaticGateEvidence) {
  return {
    outputValid: gates.outputValid,
    assetExists: gates.assetExists,
    ownershipConsistent: gates.ownershipConsistent,
    privacyPassed: gates.privacyPassed,
    customerAccessEligible: gates.customerAccessEligible,
    lifecycleEligible: gates.lifecycleEligible,
    visualPrivacyEvidence: sanitizedVisualEvidence(gates.visualPrivacyEvidence),
    result: "passed",
  };
}

function copyJob(job: FirstPreviewJobRecord): FirstPreviewJobRecord {
  return { ...job };
}

function copyOutput(output: FirstPreviewOutputRecord): FirstPreviewOutputRecord {
  return structuredClone(output);
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
        existing.sourceOutputId === input.sourceOutputId &&
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

    if (input.attemptNumber >= 2) {
      const parent = input.parentJobId
        ? this.jobsById.get(input.parentJobId)
        : undefined;
      if (
        !parent ||
        parent.conceptBriefId !== input.conceptBriefId ||
        parent.attemptNumber !== input.attemptNumber - 1
      ) {
        return failure("parent_job_invalid");
      }
      if (input.sourceOutputId === null) {
        if (
          parent.status !== "failed" ||
          parent.retryEligible !== true ||
          (parent.attemptNumber !== 1 && parent.sourceOutputId === null)
        ) {
          return failure("retry_not_eligible");
        }
      } else {
        if (parent.status !== "succeeded") {
          return failure("revision_not_eligible");
        }
        const output = this.outputsById.get(input.sourceOutputId);
        if (!output) {
          return failure("output_not_found");
        }
        if (
          output.id !== input.sourceOutputId ||
          output.jobId !== parent.id ||
          output.conceptBriefId !== input.conceptBriefId
        ) {
          return failure("linkage_mismatch");
        }
        if (
          output.readinessStatus !== "first_preview_ready" ||
          output.isCurrentCustomerPreview !== true
        ) {
          return failure("revision_not_eligible");
        }
        const review = this.reviewsByConceptBriefId.get(input.conceptBriefId);
        const revisionInstruction = normalizeRevisionInstruction(
          review?.revisionInstruction ?? null,
        );
        if (
          !review ||
          review.outputId !== input.sourceOutputId ||
          review.conceptBriefId !== input.conceptBriefId ||
          review.reviewStatus !== "needs_revision" ||
          revisionInstruction === null ||
          revisionInstruction === undefined
        ) {
          return failure("revision_not_eligible");
        }
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
      sourceOutputId: input.sourceOutputId,
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
        deadlineAt: addSeconds(now, 150),
      },
    );
  }

  async recordProviderDispatch(
    jobId: string,
  ): Promise<FirstPreviewRepositoryResult<FirstPreviewJobRecord>> {
    const current = this.jobsById.get(jobId);
    if (!current) return failure("job_not_found");
    if (current.status !== "processing") return failure("job_not_active");
    if (current.actualCostMicros !== null) {
      return failure("idempotency_conflict");
    }
    return this.transitionJob(jobId, new Set(["processing"]), {
      actualCostMicros:
        FIRST_PREVIEW_COST_CONTRACT.estimatedCostMicros,
    });
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
    const job = this.jobsById.get(jobId);
    const output = this.outputsById.get(this.outputIdByJobId.get(jobId)!);
    const completedAt = this.clock();
    const completedTime = Date.parse(completedAt);
    if (!job || job.status !== "processing" || !output || !job.startedAt || !job.deadlineAt ||
      !Number.isFinite(completedTime) || !Number.isFinite(Date.parse(job.startedAt)) ||
      !Number.isFinite(Date.parse(job.deadlineAt)) || completedTime > Date.parse(job.deadlineAt) ||
      completedTime < Date.parse(job.startedAt) || completedTime < Date.parse(output.assetValidatedAt)) return failure("job_not_active");
    return this.transitionJob(jobId, new Set(["processing"]), {
      status: "succeeded",
      failureCategory: null,
      retryEligible: null,
      actualCostMicros: success.actualCostMicros,
      completedAt,
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
      automaticGateStatus: null,
      automaticGateEvidence: null,
      automaticGatePolicyVersion: null,
      automaticGatePassedAt: null,
    };

    this.outputsById.set(output.id, output);
    this.outputIdByJobId.set(output.jobId, output.id);
    return { ok: true, value: copyOutput(output) };
  }

  async reserveVisualPrivacyInspection(subject: VisualPrivacySubject): Promise<FirstPreviewRepositoryResult<FirstPreviewOutputRecord>> {
    if (!isVisualPrivacySubject(subject)) return failure("invalid_input");
    const output = this.outputsById.get(subject.outputId);
    if (!output) return failure("output_not_found");
    if (!subjectMatches(output, subject)) return failure("linkage_mismatch");
    if (output.readinessStatus !== "not_ready" || output.isCurrentCustomerPreview ||
      output.automaticGateStatus !== null || output.automaticGatePolicyVersion !== null ||
      output.automaticGateEvidence !== null || output.automaticGatePassedAt !== null) return failure("idempotency_conflict");
    const job = this.jobsById.get(subject.jobId);
    const now = Date.parse(this.clock());
    if (!job || job.conceptBriefId !== subject.conceptBriefId || job.status !== "processing" ||
      (job.attemptNumber !== 1 && job.attemptNumber !== 2) || job.actualCostMicros === null ||
      !isNonblank(job.providerRequestId ?? "") || !job.deadlineAt ||
      !Number.isFinite(now) || !Number.isFinite(Date.parse(job.deadlineAt)) ||
      Date.parse(job.deadlineAt) <= now) return failure("job_not_active");
    const briefOutputs = [...this.outputsById.values()].filter(
      (candidate) => candidate.conceptBriefId === subject.conceptBriefId,
    );
    if (briefOutputs.length > 2) return failure("automatic_gates_not_passed");
    let accountedCost: number = FIRST_PREVIEW_VISUAL_PRIVACY_RESERVATION_MICROS;
    for (const candidate of briefOutputs) {
      if (candidate.automaticGateStatus === null && candidate.automaticGatePolicyVersion === null &&
        candidate.automaticGateEvidence === null && candidate.automaticGatePassedAt === null) continue;
      if (candidate.automaticGatePolicyVersion !== FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION) return failure("automatic_gates_not_passed");
      let charge: number = FIRST_PREVIEW_VISUAL_PRIVACY_RESERVATION_MICROS;
      if (candidate.automaticGateStatus === "pending") {
        if (candidate.automaticGateEvidence !== null || candidate.automaticGatePassedAt !== null) return failure("automatic_gates_not_passed");
      } else if (candidate.automaticGateStatus === "passed" || candidate.automaticGateStatus === "failed") {
        const evidence = candidate.automaticGateEvidence;
        if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) return failure("automatic_gates_not_passed");
        if (candidate.automaticGateStatus === "failed" &&
          validateFirstPreviewInspectionInterruptionEvidence(evidence, visualSubject(candidate))) {
          charge = Math.max(charge, evidence.visualPrivacyEvidence?.actualCostMicros ?? 0);
        } else {
          const visualEvidence = (evidence as Record<string, unknown>).visualPrivacyEvidence;
          if (!validateFirstPreviewVisualPrivacyEvidence(visualEvidence, visualSubject(candidate), false)) return failure("automatic_gates_not_passed");
          charge = Math.max(charge, (visualEvidence as FirstPreviewVisualPrivacyEvidence).actualCostMicros);
        }
      } else return failure("automatic_gates_not_passed");
      accountedCost += charge;
      if (!Number.isSafeInteger(accountedCost) || accountedCost > FIRST_PREVIEW_VISUAL_PRIVACY_BRIEF_LIMIT_MICROS) return failure("automatic_gates_not_passed");
    }
    // No await separates this compare-and-set. Every pending row permanently
    // retains its full reservation and replay never authorizes another call.
    const reserved: FirstPreviewOutputRecord = {
      ...output,
      automaticGateStatus: "pending",
      automaticGatePolicyVersion: FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION,
      automaticGateEvidence: null,
      automaticGatePassedAt: null,
    };
    this.outputsById.set(reserved.id, reserved);
    return { ok: true, value: copyOutput(reserved) };
  }

  async recordVisualPrivacyInspectionFailure(subject: VisualPrivacySubject, evidence: FirstPreviewVisualPrivacyEvidence): Promise<FirstPreviewRepositoryResult<FirstPreviewOutputRecord>> {
    if (!isVisualPrivacySubject(subject) || evidence?.result !== "failed" ||
      !validateFirstPreviewVisualPrivacyEvidence(evidence, subject, false)) return failure("invalid_input");
    const output = this.outputsById.get(subject.outputId);
    if (!output) return failure("output_not_found");
    if (!subjectMatches(output, subject)) return failure("linkage_mismatch");
    if (output.readinessStatus !== "not_ready" || output.isCurrentCustomerPreview ||
      output.automaticGateStatus !== "pending" ||
      output.automaticGatePolicyVersion !== FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION ||
      output.automaticGateEvidence !== null || output.automaticGatePassedAt !== null) return failure("idempotency_conflict");
    const failed: FirstPreviewOutputRecord = {
      ...output,
      automaticGateStatus: "failed",
      automaticGateEvidence: { result: "failed", visualPrivacyEvidence: sanitizedVisualEvidence(evidence) },
      automaticGatePassedAt: null,
    };
    this.outputsById.set(failed.id, failed);
    return { ok: true, value: copyOutput(failed) };
  }

  async recordVisualPrivacyOperationalFailure(
    subject: VisualPrivacySubject,
    reason: "inspection_interrupted" | "gate_pipeline_failed",
    visualEvidence?: FirstPreviewVisualPrivacyEvidence,
  ): Promise<FirstPreviewRepositoryResult<FirstPreviewOutputRecord>> {
    if (!isVisualPrivacySubject(subject) ||
      (visualEvidence !== undefined && !validateFirstPreviewVisualPrivacyEvidence(visualEvidence, subject, false))) {
      return failure("invalid_input");
    }
    const output = this.outputsById.get(subject.outputId);
    if (!output || !subjectMatches(output, subject) ||
      output.readinessStatus !== "not_ready" || output.isCurrentCustomerPreview ||
      output.automaticGateStatus !== "pending" ||
      output.automaticGatePolicyVersion !== FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION ||
      output.automaticGateEvidence !== null || output.automaticGatePassedAt !== null) return failure("idempotency_conflict");
    const evidence = {
      result: "failed" as const, reason, subject, billingStatus: "unknown" as const,
      reservedCostMicros: FIRST_PREVIEW_VISUAL_PRIVACY_RESERVATION_MICROS,
      ...(visualEvidence ? { visualPrivacyEvidence: sanitizedVisualEvidence(visualEvidence) } : {}),
    };
    if (!validateFirstPreviewInspectionInterruptionEvidence(evidence, subject)) return failure("invalid_input");
    const failed: FirstPreviewOutputRecord = {
      ...output, automaticGateStatus: "failed", automaticGateEvidence: evidence,
      automaticGatePassedAt: null,
    };
    this.outputsById.set(failed.id, failed);
    return { ok: true, value: copyOutput(failed) };
  }

  async reconcileInterruptedInspection(
    jobId: string,
    conceptBriefId: string,
  ): Promise<FirstPreviewRepositoryResult<FirstPreviewOutputRecord | null>> {
    const job = this.jobsById.get(jobId);
    if (!job || job.conceptBriefId !== conceptBriefId) return failure("linkage_mismatch");
    const outputId = this.outputIdByJobId.get(jobId);
    if (!outputId) return { ok: true, value: null };
    const output = this.outputsById.get(outputId);
    if (!output || output.conceptBriefId !== conceptBriefId) return failure("linkage_mismatch");
    const now = parseFirstPreviewCanonicalUtcTimestampMicros(this.clock());
    const deadline = parseFirstPreviewCanonicalUtcTimestampMicros(job.deadlineAt);
    if (now === null || deadline === null) return failure("job_not_active");
    const terminalFailure = job.status === "failed" || job.status === "cancelled" || job.status === "timed_out";
    let expired = now > deadline;
    if (job.status === "succeeded") {
      const completed = parseFirstPreviewCanonicalUtcTimestampMicros(job.completedAt);
      const started = parseFirstPreviewCanonicalUtcTimestampMicros(job.startedAt);
      if (completed === null || started === null || completed < started || completed > deadline || now < completed) {
        return failure("job_not_active");
      }
      expired = now >= completed + BigInt(FIRST_PREVIEW_POST_SUCCESS_PENDING_MAX_AGE_SECONDS) * BigInt(1_000_000);
    }
    if (!terminalFailure && !expired) return { ok: true, value: copyOutput(output) };
    if (output.automaticGateStatus === "pending" &&
      output.automaticGatePolicyVersion === FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION &&
      output.automaticGateEvidence === null && output.automaticGatePassedAt === null &&
      output.readinessStatus === "not_ready" && !output.isCurrentCustomerPreview) {
      await this.recordVisualPrivacyOperationalFailure(visualSubject(output), "inspection_interrupted");
    }
    if (job.status === "processing" && expired) {
      await this.recordJobFailure(jobId, {
        category: "timeout", retryEligible: false, actualCostMicros: job.actualCostMicros,
      });
    }
    return { ok: true, value: copyOutput(this.outputsById.get(outputId)!) };
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
    if (!hasPassedFirstPreviewAutomaticGateEvidence({ ...input.gates, result: "passed" }, visualSubject(output))) {
      return failure("automatic_gates_not_passed");
    }
    if (output.readinessStatus !== "not_ready" || output.isCurrentCustomerPreview ||
      output.automaticGateStatus !== "pending" ||
      output.automaticGatePolicyVersion !== FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION ||
      output.automaticGateEvidence !== null || output.automaticGatePassedAt !== null) return failure("automatic_gates_not_passed");
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
    const now = this.clock();
    const nowTime = Date.parse(now);
    if (!job.startedAt || !job.completedAt || !job.deadlineAt ||
      !Number.isFinite(nowTime) || !Number.isFinite(Date.parse(job.startedAt)) ||
      !Number.isFinite(Date.parse(job.completedAt)) || !Number.isFinite(Date.parse(job.deadlineAt)) ||
      nowTime > Date.parse(job.deadlineAt) || Date.parse(job.completedAt) > Date.parse(job.deadlineAt) ||
      Date.parse(job.completedAt) < Date.parse(job.startedAt) ||
      Date.parse(job.completedAt) < Date.parse(output.assetValidatedAt) ||
      nowTime < Date.parse(job.completedAt)) return failure("job_not_active");

    const conflictingCurrent = [...this.outputsById.values()].some(
      (candidate) =>
        candidate.id !== output.id &&
        candidate.conceptBriefId === output.conceptBriefId &&
        candidate.isCurrentCustomerPreview,
    );
    if (conflictingCurrent) {
      return failure("attempt_identity_conflict");
    }

    const readyAt = now;
    const ready: FirstPreviewOutputRecord = {
      ...output,
      readinessStatus: "first_preview_ready",
      isCurrentCustomerPreview: true,
      readyAt,
      revokedAt: null,
      automaticGateStatus: "passed",
      automaticGatePolicyVersion: FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION,
      automaticGateEvidence: sanitizedGateEvidence(input.gates),
      automaticGatePassedAt: readyAt,
    };
    this.outputsById.set(ready.id, ready);
    await this.ensureReadyReviewLink(ready.id, ready.conceptBriefId);
    return { ok: true, value: copyOutput(ready) };
  }

  async ensureReadyReviewLink(outputId: string, conceptBriefId: string): Promise<FirstPreviewRepositoryResult<FirstPreviewReviewRecord>> {
    const ready = this.outputsById.get(outputId);
    if (!ready || ready.conceptBriefId !== conceptBriefId ||
      ready.readinessStatus !== "first_preview_ready" || !ready.isCurrentCustomerPreview ||
      ready.automaticGateStatus !== "passed" ||
      !hasPassedFirstPreviewAutomaticGateEvidence(ready.automaticGateEvidence, visualSubject(ready))) {
      return failure("automatic_gates_not_passed");
    }
    const existing = this.reviewsByConceptBriefId.get(conceptBriefId);
    if (existing?.outputId === outputId) return { ok: true, value: existing };
    if (existing) {
      const old = this.outputsById.get(existing.outputId);
      const oldJob = old ? this.jobsById.get(old.jobId) : null;
      if (existing.reviewStatus !== "draft_generated_internal_only" ||
        existing.revisionInstruction !== null || !old ||
        old.conceptBriefId !== conceptBriefId || old.readinessStatus !== "not_ready" ||
        old.readyAt !== null || old.isCurrentCustomerPreview || old.automaticGateStatus !== "failed" ||
        !oldJob || !["failed", "cancelled", "timed_out", "succeeded"].includes(oldJob.status)) {
        return failure("review_linkage_conflict");
      }
    }
    const review: FirstPreviewReviewRecord = {
      outputId, conceptBriefId, reviewStatus: "draft_generated_internal_only",
      revisionInstruction: null, createdAt: existing?.createdAt ?? this.clock(),
    };
    this.reviewsByConceptBriefId.set(conceptBriefId, review);
    return { ok: true, value: review };
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

  async findJobById(jobId: string): Promise<FirstPreviewJobRecord | null> {
    const job = this.jobsById.get(jobId);
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
    return output && output.automaticGateStatus === "passed" &&
      output.automaticGatePolicyVersion === FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION &&
      !!output.automaticGatePassedAt &&
      hasPassedFirstPreviewAutomaticGateEvidence(output.automaticGateEvidence, visualSubject(output))
      ? copyOutput(output) : null;
  }

  async findReviewByConceptBriefId(
    conceptBriefId: string,
  ): Promise<FirstPreviewReviewRecord | null> {
    const review = this.reviewsByConceptBriefId.get(conceptBriefId);
    return review ? copyReview(review) : null;
  }

  setReviewForTest(
    review: Omit<FirstPreviewReviewRecord, "createdAt">,
  ): boolean {
    const revisionInstruction = normalizeRevisionInstruction(
      review.revisionInstruction,
    );
    if (revisionInstruction === undefined) {
      return false;
    }
    const existing = this.reviewsByConceptBriefId.get(review.conceptBriefId);
    this.reviewsByConceptBriefId.set(review.conceptBriefId, {
      ...review,
      revisionInstruction,
      createdAt: existing?.createdAt ?? this.clock(),
    });
    return true;
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
