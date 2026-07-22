import type { SupabaseClient } from "@supabase/supabase-js";

// This dependency-injected implementation contains no credentials and creates
// no client by itself. Production construction is exposed only through the
// mechanically server-only first-preview-persistence facade.

import {
  deriveFirstPreviewIdempotencyKey,
  FIRST_PREVIEW_ASSET_BUCKET,
  FIRST_PREVIEW_ASSET_VALIDATOR_VERSION,
  FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION,
  FIRST_PREVIEW_LINEAGE_IDENTITY,
  FIRST_PREVIEW_PERSISTENCE_CONTRACT_VERSION,
  FIRST_PREVIEW_PROVIDER_PROFILE,
  type FirstPreviewAutomaticGateEvidence,
  type FirstPreviewFailureCategory,
  type FirstPreviewJobRecord,
  type FirstPreviewJobStatus,
  type FirstPreviewOutputRecord,
  type FirstPreviewRepository,
  type FirstPreviewRepositoryFailure,
  type FirstPreviewRepositoryResult,
  type FirstPreviewReviewRecord,
  type MarkFirstPreviewReadyInput,
  type PersistFirstPreviewOutputInput,
  type RecordFirstPreviewJobFailureInput,
  type RecordFirstPreviewJobSuccessInput,
  type RecordFirstPreviewProviderRequestInput,
  type ReserveFirstPreviewJobInput,
  type ReserveFirstPreviewJobResult,
  type RevokeFirstPreviewOutputInput,
} from "./first-preview-persistence-contract";

type DatabaseError = Readonly<{ code?: string; message?: string }>;
type DatabaseResult<T> = Promise<Readonly<{ data: T | null; error: DatabaseError | null }>>;

export type FirstPreviewJobRow = {
  id: string;
  concept_brief_id: string;
  status: string;
  generation_purpose: string | null;
  idempotency_key: string | null;
  attempt_number: number | null;
  lineage_identity: string | null;
  parent_job_id: string | null;
  parent_generation_purpose: string | null;
  parent_attempt_number: number | null;
  source_output_id: string | null;
  design_spec_version: string | null;
  design_spec_hash: string | null;
  hand_sketch_instruction_version: string | null;
  hand_sketch_instruction_hash: string | null;
  provider_name: string | null;
  provider_request_id: string | null;
  estimated_cost_micros: number | string | null;
  actual_cost_micros: number | string | null;
  cost_currency: string | null;
  pricing_assumption_version: string | null;
  failure_category: string | null;
  retry_eligible: boolean | null;
  started_at: string | null;
  deadline_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  cancelled_at: string | null;
  timed_out_at: string | null;
  created_at: string;
  updated_at: string;
};

export type FirstPreviewOutputRow = {
  id: string;
  job_id: string;
  concept_brief_id: string;
  bucket_name: string;
  object_path: string | null;
  mime_type: string | null;
  byte_size: number | string | null;
  width_px: number | null;
  height_px: number | null;
  content_sha256: string | null;
  asset_created_at: string | null;
  asset_validation_status: string | null;
  asset_validated_at: string | null;
  readiness_status: string | null;
  first_preview_ready_at: string | null;
  readiness_revoked_at: string | null;
  is_current_customer_preview: boolean;
  created_at: string;
};

export type FirstPreviewReviewRow = {
  ai_sketch_output_id: string;
  concept_brief_id: string;
  review_status: string;
  created_at: string;
};

type RowPatch = Record<string, unknown>;

export interface FirstPreviewDatabaseClient {
  insertJob(row: RowPatch): DatabaseResult<FirstPreviewJobRow>;
  findJobById(id: string): DatabaseResult<FirstPreviewJobRow>;
  findJobByIdempotencyKey(key: string): DatabaseResult<FirstPreviewJobRow>;
  findJobByAttempt(
    conceptBriefId: string,
    attemptNumber: number,
  ): DatabaseResult<FirstPreviewJobRow>;
  findActiveJob(conceptBriefId: string): DatabaseResult<FirstPreviewJobRow>;
  findJobByProviderRequestId(requestId: string): DatabaseResult<FirstPreviewJobRow>;
  updateJob(
    id: string,
    allowedStatuses: readonly FirstPreviewJobStatus[],
    patch: RowPatch,
  ): DatabaseResult<FirstPreviewJobRow>;
  insertOutput(row: RowPatch): DatabaseResult<FirstPreviewOutputRow>;
  findOutputById(id: string): DatabaseResult<FirstPreviewOutputRow>;
  findOutputByJobId(jobId: string): DatabaseResult<FirstPreviewOutputRow>;
  findCustomerReadyOutput(conceptBriefId: string): DatabaseResult<FirstPreviewOutputRow>;
  updateOutput(
    identity: { id: string; jobId: string; conceptBriefId: string },
    allowedReadinessStatuses: readonly string[],
    patch: RowPatch,
  ): DatabaseResult<FirstPreviewOutputRow>;
  insertReview(row: RowPatch): DatabaseResult<FirstPreviewReviewRow>;
  findReviewByConceptBriefId(conceptBriefId: string): DatabaseResult<FirstPreviewReviewRow>;
}

const JOB_COLUMNS = [
  "id", "concept_brief_id", "status", "generation_purpose", "idempotency_key",
  "attempt_number", "lineage_identity", "parent_job_id", "parent_generation_purpose",
  "parent_attempt_number", "source_output_id", "design_spec_version", "design_spec_hash",
  "hand_sketch_instruction_version", "hand_sketch_instruction_hash", "provider_name",
  "provider_request_id", "estimated_cost_micros", "actual_cost_micros", "cost_currency",
  "pricing_assumption_version", "failure_category", "retry_eligible", "started_at",
  "deadline_at", "completed_at", "failed_at", "cancelled_at", "timed_out_at",
  "created_at", "updated_at",
].join(", ");

const OUTPUT_COLUMNS = [
  "id", "job_id", "concept_brief_id", "bucket_name", "object_path", "mime_type",
  "byte_size", "width_px", "height_px", "content_sha256", "asset_created_at",
  "asset_validation_status", "asset_validated_at", "readiness_status",
  "first_preview_ready_at", "readiness_revoked_at", "is_current_customer_preview",
  "created_at",
].join(", ");

const REVIEW_COLUMNS =
  "ai_sketch_output_id, concept_brief_id, review_status, created_at";

export function createFirstPreviewDatabaseClient(
  supabase: SupabaseClient,
): FirstPreviewDatabaseClient {
  return {
    async insertJob(row) {
      return supabase.from("ai_sketch_jobs").insert(row).select(JOB_COLUMNS).single();
    },
    async findJobById(id) {
      return supabase.from("ai_sketch_jobs").select(JOB_COLUMNS).eq("id", id).maybeSingle();
    },
    async findJobByIdempotencyKey(key) {
      return supabase
        .from("ai_sketch_jobs")
        .select(JOB_COLUMNS)
        .eq("idempotency_key", key)
        .maybeSingle();
    },
    async findJobByAttempt(conceptBriefId, attemptNumber) {
      return supabase
        .from("ai_sketch_jobs")
        .select(JOB_COLUMNS)
        .eq("concept_brief_id", conceptBriefId)
        .eq("generation_purpose", "first_preview")
        .eq("attempt_number", attemptNumber)
        .maybeSingle();
    },
    async findActiveJob(conceptBriefId) {
      return supabase
        .from("ai_sketch_jobs")
        .select(JOB_COLUMNS)
        .eq("concept_brief_id", conceptBriefId)
        .eq("generation_purpose", "first_preview")
        .in("status", ["queued", "processing"])
        .limit(1)
        .maybeSingle();
    },
    async findJobByProviderRequestId(requestId) {
      return supabase
        .from("ai_sketch_jobs")
        .select(JOB_COLUMNS)
        .eq("provider_name", FIRST_PREVIEW_PROVIDER_PROFILE.providerName)
        .eq("provider_request_id", requestId)
        .limit(1)
        .maybeSingle();
    },
    async updateJob(id, allowedStatuses, patch) {
      return supabase
        .from("ai_sketch_jobs")
        .update(patch)
        .eq("id", id)
        .in("status", [...allowedStatuses])
        .select(JOB_COLUMNS)
        .maybeSingle();
    },
    async insertOutput(row) {
      return supabase.from("ai_sketch_outputs").insert(row).select(OUTPUT_COLUMNS).single();
    },
    async findOutputById(id) {
      return supabase.from("ai_sketch_outputs").select(OUTPUT_COLUMNS).eq("id", id).maybeSingle();
    },
    async findOutputByJobId(jobId) {
      return supabase
        .from("ai_sketch_outputs")
        .select(OUTPUT_COLUMNS)
        .eq("job_id", jobId)
        .maybeSingle();
    },
    async findCustomerReadyOutput(conceptBriefId) {
      return supabase
        .from("ai_sketch_outputs")
        .select(OUTPUT_COLUMNS)
        .eq("concept_brief_id", conceptBriefId)
        .eq("readiness_status", "first_preview_ready")
        .eq("is_current_customer_preview", true)
        .maybeSingle();
    },
    async updateOutput(identity, allowedReadinessStatuses, patch) {
      return supabase
        .from("ai_sketch_outputs")
        .update(patch)
        .eq("id", identity.id)
        .eq("job_id", identity.jobId)
        .eq("concept_brief_id", identity.conceptBriefId)
        .in("readiness_status", [...allowedReadinessStatuses])
        .select(OUTPUT_COLUMNS)
        .maybeSingle();
    },
    async insertReview(row) {
      return supabase.from("ai_sketch_reviews").insert(row).select(REVIEW_COLUMNS).single();
    },
    async findReviewByConceptBriefId(conceptBriefId) {
      return supabase
        .from("ai_sketch_reviews")
        .select(REVIEW_COLUMNS)
        .eq("concept_brief_id", conceptBriefId)
        .maybeSingle();
    },
  };
}

type RepositoryOptions = Readonly<{
  clock?: () => string;
  processingTimeoutMs?: number;
}>;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const FAILURE_CATEGORIES = new Set<FirstPreviewFailureCategory>([
  "rate_limited", "provider_unavailable", "network_failure",
  "invalid_provider_response", "storage_failure", "privacy_failure",
  "access_failure", "lifecycle_conflict", "timeout", "cancelled",
]);
const JOB_STATUSES = new Set<FirstPreviewJobStatus>([
  "queued", "processing", "succeeded", "failed", "timed_out", "cancelled",
]);
const REVIEW_STATUSES = new Set<FirstPreviewReviewRecord["reviewStatus"]>([
  "internal_draft_not_generated",
  "draft_generated_internal_only",
  "needs_revision",
  "approved_for_customer",
]);
const RETRYABLE_FAILURES = new Set<FirstPreviewFailureCategory>([
  "rate_limited", "provider_unavailable", "network_failure",
]);

function failure(code: FirstPreviewRepositoryFailure["code"]): FirstPreviewRepositoryFailure {
  return { ok: false, code };
}

function isUniqueConflict(error: DatabaseError | null): boolean {
  return error?.code === "23505";
}

function isNonblank(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value === value.trim();
}

function readSafeInteger(value: unknown): number | null {
  const numberValue = typeof value === "string" && /^\d+$/.test(value)
    ? Number(value)
    : value;
  return Number.isSafeInteger(numberValue) && Number(numberValue) >= 0
    ? Number(numberValue)
    : null;
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function addMilliseconds(value: string, milliseconds: number): string {
  return new Date(new Date(value).getTime() + milliseconds).toISOString();
}

function maxTimestamp(left: string, right: string): string {
  return left >= right ? left : right;
}

function gatesPassed(gates: FirstPreviewAutomaticGateEvidence): boolean {
  return Object.values(gates).every((value) => value === true);
}

function isSafeAssetPath(value: string): boolean {
  return (
    isNonblank(value) &&
    value.length <= 512 &&
    !value.includes("://") &&
    !value.startsWith("/") &&
    !value.split("/").includes("..")
  );
}

function mapJob(row: FirstPreviewJobRow | null): FirstPreviewJobRecord | null {
  if (
    !row || !UUID_PATTERN.test(row.id) || !UUID_PATTERN.test(row.concept_brief_id) ||
    !JOB_STATUSES.has(row.status as FirstPreviewJobStatus) ||
    row.generation_purpose !== "first_preview" ||
    (row.attempt_number !== 1 && row.attempt_number !== 2) ||
    !SHA256_PATTERN.test(row.idempotency_key ?? "") ||
    row.lineage_identity !== FIRST_PREVIEW_LINEAGE_IDENTITY ||
    !isNonblank(row.design_spec_version) || !SHA256_PATTERN.test(row.design_spec_hash ?? "") ||
    !isNonblank(row.hand_sketch_instruction_version) ||
    !SHA256_PATTERN.test(row.hand_sketch_instruction_hash ?? "") ||
    row.provider_name !== FIRST_PREVIEW_PROVIDER_PROFILE.providerName ||
    readSafeInteger(row.estimated_cost_micros) === null ||
    row.cost_currency !== "USD" || !isNonblank(row.pricing_assumption_version) ||
    !isIsoTimestamp(row.created_at) || !isIsoTimestamp(row.updated_at)
  ) {
    return null;
  }
  const actualCost = row.actual_cost_micros === null
    ? null
    : readSafeInteger(row.actual_cost_micros);
  if (row.actual_cost_micros !== null && actualCost === null) {
    return null;
  }
  if (row.failure_category !== null && !FAILURE_CATEGORIES.has(row.failure_category as FirstPreviewFailureCategory)) {
    return null;
  }
  return {
    id: row.id,
    conceptBriefId: row.concept_brief_id,
    generationPurpose: "first_preview",
    attemptNumber: row.attempt_number,
    idempotencyKey: row.idempotency_key!,
    lineageIdentity: FIRST_PREVIEW_LINEAGE_IDENTITY,
    parentJobId: row.parent_job_id,
    sourceOutputId: null,
    designSpecVersion: row.design_spec_version!,
    designSpecSha256: row.design_spec_hash!,
    handSketchInstructionVersion: row.hand_sketch_instruction_version!,
    handSketchInstructionSha256: row.hand_sketch_instruction_hash!,
    providerName: FIRST_PREVIEW_PROVIDER_PROFILE.providerName,
    providerRequestId: row.provider_request_id,
    estimatedCostMicros: readSafeInteger(row.estimated_cost_micros)!,
    actualCostMicros: actualCost,
    costCurrency: "USD",
    pricingAssumptionVersion: row.pricing_assumption_version!,
    status: row.status as FirstPreviewJobStatus,
    failureCategory: row.failure_category as FirstPreviewFailureCategory | null,
    retryEligible: row.retry_eligible,
    startedAt: row.started_at,
    deadlineAt: row.deadline_at,
    completedAt: row.completed_at,
    failedAt: row.failed_at,
    cancelledAt: row.cancelled_at,
    timedOutAt: row.timed_out_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapOutput(row: FirstPreviewOutputRow | null): FirstPreviewOutputRecord | null {
  const byteSize = readSafeInteger(row?.byte_size);
  if (
    !row || !UUID_PATTERN.test(row.id) || !UUID_PATTERN.test(row.job_id) ||
    !UUID_PATTERN.test(row.concept_brief_id) || row.bucket_name !== FIRST_PREVIEW_ASSET_BUCKET ||
    !isSafeAssetPath(row.object_path ?? "") || row.mime_type !== "image/png" ||
    byteSize === null || byteSize < 1 || byteSize > 16_777_216 ||
    row.width_px !== 1024 || row.height_px !== 1024 ||
    !SHA256_PATTERN.test(row.content_sha256 ?? "") ||
    !isIsoTimestamp(row.asset_created_at) || !isIsoTimestamp(row.asset_validated_at) ||
    row.asset_validation_status !== "passed" || !isIsoTimestamp(row.created_at) ||
    !["not_ready", "first_preview_ready", "revoked"].includes(row.readiness_status ?? "")
  ) {
    return null;
  }
  return {
    id: row.id,
    jobId: row.job_id,
    conceptBriefId: row.concept_brief_id,
    assetId: row.object_path!,
    assetPersisted: true,
    bucketName: FIRST_PREVIEW_ASSET_BUCKET,
    mimeType: "image/png",
    byteSize,
    widthPx: 1024,
    heightPx: 1024,
    contentSha256: row.content_sha256!,
    assetCreatedAt: row.asset_created_at!,
    assetValidatedAt: row.asset_validated_at!,
    readinessStatus: row.readiness_status as FirstPreviewOutputRecord["readinessStatus"],
    isCurrentCustomerPreview: row.is_current_customer_preview,
    createdAt: row.created_at,
    readyAt: row.first_preview_ready_at,
    revokedAt: row.readiness_revoked_at,
  };
}

function mapReview(row: FirstPreviewReviewRow | null): FirstPreviewReviewRecord | null {
  if (
    !row || !UUID_PATTERN.test(row.ai_sketch_output_id) ||
    !UUID_PATTERN.test(row.concept_brief_id) ||
    !REVIEW_STATUSES.has(row.review_status as FirstPreviewReviewRecord["reviewStatus"]) ||
    !isIsoTimestamp(row.created_at)
  ) {
    return null;
  }
  return {
    outputId: row.ai_sketch_output_id,
    conceptBriefId: row.concept_brief_id,
    reviewStatus: row.review_status as FirstPreviewReviewRecord["reviewStatus"],
    createdAt: row.created_at,
  };
}

function identityMatches(job: FirstPreviewJobRecord, input: ReserveFirstPreviewJobInput): boolean {
  return job.conceptBriefId === input.conceptBriefId &&
    job.attemptNumber === input.attemptNumber && job.parentJobId === input.parentJobId &&
    job.designSpecVersion === input.designSpecVersion &&
    job.designSpecSha256 === input.designSpecSha256 &&
    job.handSketchInstructionVersion === input.handSketchInstructionVersion &&
    job.handSketchInstructionSha256 === input.handSketchInstructionSha256;
}

export class SupabaseFirstPreviewRepository implements FirstPreviewRepository {
  readonly kind = "supabase" as const;
  private readonly clock: () => string;
  private readonly processingTimeoutMs: number;

  constructor(
    private readonly database: FirstPreviewDatabaseClient,
    options: RepositoryOptions = {},
  ) {
    this.clock = options.clock ?? (() => new Date().toISOString());
    this.processingTimeoutMs =
      Number.isSafeInteger(options.processingTimeoutMs) && options.processingTimeoutMs! > 0
        ? options.processingTimeoutMs!
        : 30_000;
  }

  async reserveJob(input: ReserveFirstPreviewJobInput): Promise<ReserveFirstPreviewJobResult> {
    const key = deriveFirstPreviewIdempotencyKey(input);
    if (!key) return failure("invalid_input");

    const replay = await this.database.findJobByIdempotencyKey(key);
    if (replay.error) return failure("repository_unavailable");
    const existing = mapJob(replay.data);
    if (replay.data && !existing) return failure("repository_unavailable");
    if (existing) {
      return identityMatches(existing, input)
        ? { ok: true, value: { disposition: "existing", job: existing } }
        : failure("idempotency_conflict");
    }

    const existingId = await this.database.findJobById(input.jobId);
    if (existingId.error) return failure("repository_unavailable");
    if (existingId.data) return failure("idempotency_conflict");

    const attempt = await this.database.findJobByAttempt(input.conceptBriefId, input.attemptNumber);
    if (attempt.error) return failure("repository_unavailable");
    if (attempt.data) return failure("attempt_identity_conflict");

    const active = await this.database.findActiveJob(input.conceptBriefId);
    if (active.error) return failure("repository_unavailable");
    if (active.data) return failure("active_job_exists");

    if (input.attemptNumber === 2) {
      const parentResult = await this.database.findJobById(input.parentJobId!);
      if (parentResult.error) return failure("repository_unavailable");
      const parent = mapJob(parentResult.data);
      if (!parent || parent.conceptBriefId !== input.conceptBriefId || parent.attemptNumber !== 1) {
        return failure("parent_job_invalid");
      }
      if (parent.status !== "failed" || parent.retryEligible !== true) {
        return failure("retry_not_eligible");
      }
    }

    const now = this.clock();
    const inserted = await this.database.insertJob({
      id: input.jobId,
      concept_brief_id: input.conceptBriefId,
      status: "queued",
      prompt_version: input.handSketchInstructionVersion,
      prompt_payload: {},
      model_name: FIRST_PREVIEW_PROVIDER_PROFILE.modelName,
      generation_purpose: "first_preview",
      idempotency_key: key,
      attempt_number: input.attemptNumber,
      lineage_identity: FIRST_PREVIEW_LINEAGE_IDENTITY,
      parent_job_id: input.parentJobId,
      parent_generation_purpose: input.attemptNumber === 2 ? "first_preview" : null,
      parent_attempt_number: input.attemptNumber === 2 ? 1 : null,
      source_output_id: null,
      design_spec_version: input.designSpecVersion,
      design_spec_hash: input.designSpecSha256,
      hand_sketch_instruction_version: input.handSketchInstructionVersion,
      hand_sketch_instruction_hash: input.handSketchInstructionSha256,
      provider_name: FIRST_PREVIEW_PROVIDER_PROFILE.providerName,
      provider_request_id: null,
      provider_endpoint: FIRST_PREVIEW_PROVIDER_PROFILE.providerEndpoint,
      request_image_count: FIRST_PREVIEW_PROVIDER_PROFILE.requestImageCount,
      request_streaming: FIRST_PREVIEW_PROVIDER_PROFILE.requestStreaming,
      request_partial_images: FIRST_PREVIEW_PROVIDER_PROFILE.requestPartialImages,
      request_size: FIRST_PREVIEW_PROVIDER_PROFILE.requestSize,
      request_quality: FIRST_PREVIEW_PROVIDER_PROFILE.requestQuality,
      output_format: FIRST_PREVIEW_PROVIDER_PROFILE.outputFormat,
      moderation_mode: FIRST_PREVIEW_PROVIDER_PROFILE.moderationMode,
      estimated_cost_micros: input.estimatedCostMicros,
      actual_cost_micros: null,
      cost_currency: input.costCurrency,
      pricing_assumption_version: input.pricingAssumptionVersion,
      created_at: now,
      updated_at: now,
    });
    if (inserted.error) {
      if (isUniqueConflict(inserted.error)) {
        return this.resolveReservationConflict(input, key);
      }
      return failure("repository_unavailable");
    }
    const job = mapJob(inserted.data);
    return job
      ? { ok: true, value: { disposition: "created", job } }
      : failure("repository_unavailable");
  }

  async startJob(jobId: string): Promise<FirstPreviewRepositoryResult<FirstPreviewJobRecord>> {
    if (!UUID_PATTERN.test(jobId)) return failure("invalid_input");
    const startedAt = this.clock();
    return this.updateJob(jobId, ["queued"], {
      status: "processing",
      started_at: startedAt,
      deadline_at: addMilliseconds(startedAt, this.processingTimeoutMs),
    });
  }

  async recordProviderRequest(
    jobId: string,
    request: RecordFirstPreviewProviderRequestInput,
  ): Promise<FirstPreviewRepositoryResult<FirstPreviewJobRecord>> {
    if (!UUID_PATTERN.test(jobId) || !isNonblank(request.providerRequestId) || request.providerRequestId.length > 255) {
      return failure("invalid_input");
    }
    const currentResult = await this.database.findJobById(jobId);
    if (currentResult.error) return failure("repository_unavailable");
    const current = mapJob(currentResult.data);
    if (!current) return currentResult.data
      ? failure("repository_unavailable")
      : failure("job_not_found");
    if (current.status !== "processing") return failure("job_not_active");
    if (current.providerRequestId === request.providerRequestId) {
      return { ok: true, value: current };
    }
    if (current.providerRequestId !== null) return failure("idempotency_conflict");
    const duplicateResult = await this.database.findJobByProviderRequestId(request.providerRequestId);
    if (duplicateResult.error) return failure("repository_unavailable");
    const duplicate = mapJob(duplicateResult.data);
    if (duplicateResult.data && !duplicate) return failure("repository_unavailable");
    if (duplicate && duplicate.id !== jobId) return failure("idempotency_conflict");
    if (duplicate?.id === jobId) return { ok: true, value: duplicate };
    return this.updateJob(jobId, ["processing"], {
      provider_request_id: request.providerRequestId,
    });
  }

  async recordJobSucceeded(
    jobId: string,
    success: RecordFirstPreviewJobSuccessInput,
  ): Promise<FirstPreviewRepositoryResult<FirstPreviewJobRecord>> {
    if (!UUID_PATTERN.test(jobId) || readSafeInteger(success.actualCostMicros) === null) {
      return failure("invalid_input");
    }
    const outputResult = await this.database.findOutputByJobId(jobId);
    if (outputResult.error) return failure("repository_unavailable");
    if (!outputResult.data) return failure("output_not_found");
    if (!mapOutput(outputResult.data)) return failure("repository_unavailable");
    return this.updateJob(jobId, ["processing"], {
      status: "succeeded", completed_at: this.clock(), actual_cost_micros: success.actualCostMicros,
      failure_category: null, retry_eligible: null, terminal_reason: null, error_message: null,
    });
  }

  async recordJobFailure(
    jobId: string,
    input: RecordFirstPreviewJobFailureInput,
  ): Promise<FirstPreviewRepositoryResult<FirstPreviewJobRecord>> {
    if (
      !UUID_PATTERN.test(jobId) || !FAILURE_CATEGORIES.has(input.category) ||
      (input.retryEligible && !RETRYABLE_FAILURES.has(input.category)) ||
      (input.actualCostMicros !== null && readSafeInteger(input.actualCostMicros) === null)
    ) return failure("invalid_input");
    const currentResult = await this.database.findJobById(jobId);
    if (currentResult.error) return failure("repository_unavailable");
    const current = mapJob(currentResult.data);
    if (!current) return currentResult.data ? failure("repository_unavailable") : failure("job_not_found");
    if (current.status !== "queued" && current.status !== "processing") return failure("job_not_active");
    if (input.category === "timeout" && current.status !== "processing") {
      return failure("job_not_active");
    }

    const status = input.category === "timeout" ? "timed_out" : input.category === "cancelled" ? "cancelled" : "failed";
    const now = this.clock();
    const terminalAt = status === "timed_out" && current.deadlineAt
      ? maxTimestamp(now, current.deadlineAt)
      : now;
    return this.updateJob(jobId, ["queued", "processing"], {
      status,
      failure_category: input.category,
      retry_eligible: status === "failed" ? input.retryEligible : false,
      terminal_reason: input.category,
      actual_cost_micros: input.actualCostMicros,
      failed_at: status === "failed" ? terminalAt : null,
      cancelled_at: status === "cancelled" ? terminalAt : null,
      timed_out_at: status === "timed_out" ? terminalAt : null,
      completed_at: null,
      error_message: null,
    });
  }

  async persistOutput(input: PersistFirstPreviewOutputInput): Promise<FirstPreviewRepositoryResult<FirstPreviewOutputRecord>> {
    if (!this.isValidOutputInput(input)) return failure("invalid_input");
    if (input.assetPersisted !== true) return failure("asset_not_persisted");
    const jobResult = await this.database.findJobById(input.jobId);
    if (jobResult.error) return failure("repository_unavailable");
    const job = mapJob(jobResult.data);
    if (!job) return jobResult.data ? failure("repository_unavailable") : failure("job_not_found");
    if (job.conceptBriefId !== input.conceptBriefId) return failure("linkage_mismatch");
    if (job.status !== "processing") return failure("job_not_active");
    if (!isNonblank(job.providerRequestId)) return failure("invalid_input");

    const existingById = await this.database.findOutputById(input.outputId);
    if (existingById.error) return failure("repository_unavailable");
    const existingByJob = await this.database.findOutputByJobId(input.jobId);
    if (existingByJob.error) return failure("repository_unavailable");
    const existingRow = existingById.data ?? existingByJob.data;
    if (existingRow) {
      const existing = mapOutput(existingRow);
      if (!existing) return failure("repository_unavailable");
      return existing.id === input.outputId && existing.jobId === input.jobId &&
        existing.conceptBriefId === input.conceptBriefId && existing.assetId === input.assetId &&
        existing.contentSha256 === input.contentSha256
        ? { ok: true, value: existing }
        : failure("output_already_exists");
    }

    const inserted = await this.database.insertOutput({
      id: input.outputId,
      job_id: input.jobId,
      concept_brief_id: input.conceptBriefId,
      bucket_name: input.bucketName,
      object_path: input.assetId,
      metadata: { persistence_contract_version: FIRST_PREVIEW_PERSISTENCE_CONTRACT_VERSION },
      mime_type: input.mimeType,
      byte_size: input.byteSize,
      width_px: input.widthPx,
      height_px: input.heightPx,
      content_sha256: input.contentSha256,
      asset_created_at: input.assetCreatedAt,
      asset_validation_status: "passed",
      asset_validation_evidence: {
        validator_version: FIRST_PREVIEW_ASSET_VALIDATOR_VERSION,
        result: "passed",
        content_sha256: input.contentSha256,
        mime_type: input.mimeType,
        byte_size: input.byteSize,
        width_px: input.widthPx,
        height_px: input.heightPx,
      },
      asset_validated_at: input.assetValidatedAt,
      automatic_gate_status: null,
      automatic_gate_evidence: null,
      automatic_gate_policy_version: null,
      automatic_gate_passed_at: null,
      readiness_status: "not_ready",
      first_preview_ready_at: null,
      readiness_revoked_at: null,
      is_current_customer_preview: false,
      created_at: this.clock(),
    });
    if (inserted.error) {
      if (!isUniqueConflict(inserted.error)) return failure("repository_unavailable");
      const racedById = await this.database.findOutputById(input.outputId);
      if (racedById.error) return failure("repository_unavailable");
      const racedByJob = await this.database.findOutputByJobId(input.jobId);
      if (racedByJob.error) return failure("repository_unavailable");
      const raced = mapOutput(racedById.data ?? racedByJob.data);
      return raced && raced.id === input.outputId && raced.jobId === input.jobId &&
        raced.conceptBriefId === input.conceptBriefId && raced.assetId === input.assetId &&
        raced.contentSha256 === input.contentSha256
        ? { ok: true, value: raced }
        : failure("output_already_exists");
    }
    const output = mapOutput(inserted.data);
    return output ? { ok: true, value: output } : failure("repository_unavailable");
  }

  async markOutputReady(input: MarkFirstPreviewReadyInput): Promise<FirstPreviewRepositoryResult<FirstPreviewOutputRecord>> {
    if (!gatesPassed(input.gates)) return failure("automatic_gates_not_passed");
    if (input.automaticGatePolicyVersion !== FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION) return failure("invalid_input");
    const outputResult = await this.database.findOutputById(input.outputId);
    if (outputResult.error) return failure("repository_unavailable");
    const output = mapOutput(outputResult.data);
    if (!output) return outputResult.data ? failure("repository_unavailable") : failure("output_not_found");
    if (output.jobId !== input.jobId || output.conceptBriefId !== input.conceptBriefId) return failure("linkage_mismatch");
    const jobResult = await this.database.findJobById(input.jobId);
    if (jobResult.error) return failure("repository_unavailable");
    const job = mapJob(jobResult.data);
    if (!job || job.status !== "succeeded") return failure("job_not_active");
    const review = await this.ensureReviewLink(input.outputId, input.conceptBriefId);
    if (review.ok === false) return review;
    if (output.readinessStatus === "first_preview_ready" && output.isCurrentCustomerPreview) {
      return { ok: true, value: output };
    }
    if (output.readinessStatus !== "not_ready") return failure("job_not_active");
    const passedAt = maxTimestamp(this.clock(), output.assetValidatedAt);
    const updated = await this.database.updateOutput(
      { id: input.outputId, jobId: input.jobId, conceptBriefId: input.conceptBriefId },
      ["not_ready"],
      {
        automatic_gate_status: "passed",
        automatic_gate_evidence: { ...input.gates, result: "passed" },
        automatic_gate_policy_version: input.automaticGatePolicyVersion,
        automatic_gate_passed_at: passedAt,
        readiness_status: "first_preview_ready",
        first_preview_ready_at: passedAt,
        readiness_revoked_at: null,
        is_current_customer_preview: true,
      },
    );
    if (updated.error) return isUniqueConflict(updated.error)
      ? failure("attempt_identity_conflict") : failure("repository_unavailable");
    const ready = mapOutput(updated.data);
    return ready ? { ok: true, value: ready } : failure("job_not_active");
  }

  async revokeOutput(input: RevokeFirstPreviewOutputInput): Promise<FirstPreviewRepositoryResult<FirstPreviewOutputRecord>> {
    const currentResult = await this.database.findOutputById(input.outputId);
    if (currentResult.error) return failure("repository_unavailable");
    const current = mapOutput(currentResult.data);
    if (!current) return currentResult.data ? failure("repository_unavailable") : failure("output_not_found");
    if (current.jobId !== input.jobId || current.conceptBriefId !== input.conceptBriefId) return failure("linkage_mismatch");
    if (current.readinessStatus !== "first_preview_ready" || !current.isCurrentCustomerPreview) return failure("job_not_active");
    const revokedAt = current.readyAt
      ? maxTimestamp(this.clock(), current.readyAt)
      : this.clock();
    const updated = await this.database.updateOutput(
      { id: input.outputId, jobId: input.jobId, conceptBriefId: input.conceptBriefId },
      ["first_preview_ready"],
      { readiness_status: "revoked", readiness_revoked_at: revokedAt, is_current_customer_preview: false },
    );
    if (updated.error) return failure("repository_unavailable");
    const revoked = mapOutput(updated.data);
    return revoked ? { ok: true, value: revoked } : failure("job_not_active");
  }

  async findJobByIdempotencyKey(key: string): Promise<FirstPreviewJobRecord | null> {
    if (!SHA256_PATTERN.test(key)) return null;
    const result = await this.database.findJobByIdempotencyKey(key);
    return result.error ? null : mapJob(result.data);
  }

  async findCustomerReadyOutput(conceptBriefId: string): Promise<FirstPreviewOutputRecord | null> {
    if (!UUID_PATTERN.test(conceptBriefId)) return null;
    const result = await this.database.findCustomerReadyOutput(conceptBriefId);
    return result.error ? null : mapOutput(result.data);
  }

  async findReviewByConceptBriefId(conceptBriefId: string): Promise<FirstPreviewReviewRecord | null> {
    if (!UUID_PATTERN.test(conceptBriefId)) return null;
    const result = await this.database.findReviewByConceptBriefId(conceptBriefId);
    return result.error ? null : mapReview(result.data);
  }

  private async resolveReservationConflict(input: ReserveFirstPreviewJobInput, key: string): Promise<ReserveFirstPreviewJobResult> {
    const replay = await this.database.findJobByIdempotencyKey(key);
    if (replay.error) return failure("repository_unavailable");
    const existing = mapJob(replay.data);
    if (existing) return identityMatches(existing, input)
      ? { ok: true, value: { disposition: "existing", job: existing } }
      : failure("idempotency_conflict");
    const attempt = await this.database.findJobByAttempt(input.conceptBriefId, input.attemptNumber);
    if (attempt.error) return failure("repository_unavailable");
    if (attempt.data) return failure("attempt_identity_conflict");
    const active = await this.database.findActiveJob(input.conceptBriefId);
    if (active.error) return failure("repository_unavailable");
    return active.data ? failure("active_job_exists") : failure("idempotency_conflict");
  }

  private async updateJob(id: string, allowed: readonly FirstPreviewJobStatus[], patch: RowPatch): Promise<FirstPreviewRepositoryResult<FirstPreviewJobRecord>> {
    const updated = await this.database.updateJob(id, allowed, { ...patch, updated_at: this.clock() });
    if (updated.error) return failure("repository_unavailable");
    const job = mapJob(updated.data);
    if (job) return { ok: true, value: job };
    if (updated.data) return failure("repository_unavailable");
    const current = await this.database.findJobById(id);
    return current.data ? failure("job_not_active") : failure("job_not_found");
  }

  private async ensureReviewLink(outputId: string, conceptBriefId: string): Promise<FirstPreviewRepositoryResult<FirstPreviewReviewRecord>> {
    const existingResult = await this.database.findReviewByConceptBriefId(conceptBriefId);
    if (existingResult.error) return failure("repository_unavailable");
    const existing = mapReview(existingResult.data);
    if (existingResult.data && !existing) return failure("repository_unavailable");
    if (existing) return existing.outputId === outputId
      ? { ok: true, value: existing }
      : failure("review_linkage_conflict");
    const inserted = await this.database.insertReview({
      ai_sketch_output_id: outputId,
      concept_brief_id: conceptBriefId,
      review_status: "draft_generated_internal_only",
    });
    if (inserted.error) {
      if (!isUniqueConflict(inserted.error)) return failure("repository_unavailable");
      const raced = await this.database.findReviewByConceptBriefId(conceptBriefId);
      const racedReview = raced.error ? null : mapReview(raced.data);
      return racedReview?.outputId === outputId
        ? { ok: true, value: racedReview }
        : failure("review_linkage_conflict");
    }
    const review = mapReview(inserted.data);
    return review ? { ok: true, value: review } : failure("repository_unavailable");
  }

  private isValidOutputInput(input: PersistFirstPreviewOutputInput): boolean {
    return UUID_PATTERN.test(input.outputId) && UUID_PATTERN.test(input.jobId) &&
      UUID_PATTERN.test(input.conceptBriefId) && isSafeAssetPath(input.assetId) &&
      input.bucketName === FIRST_PREVIEW_ASSET_BUCKET && input.mimeType === "image/png" &&
      Number.isSafeInteger(input.byteSize) && input.byteSize >= 1 && input.byteSize <= 16_777_216 &&
      input.widthPx === 1024 && input.heightPx === 1024 && SHA256_PATTERN.test(input.contentSha256) &&
      isIsoTimestamp(input.assetCreatedAt) && isIsoTimestamp(input.assetValidatedAt) &&
      input.assetValidatedAt >= input.assetCreatedAt;
  }
}

export function createSupabaseFirstPreviewRepository(
  database: FirstPreviewDatabaseClient,
  options?: RepositoryOptions,
): FirstPreviewRepository {
  return new SupabaseFirstPreviewRepository(database, options);
}
