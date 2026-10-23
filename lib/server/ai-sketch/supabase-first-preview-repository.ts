import type { SupabaseClient } from "@supabase/supabase-js";

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

// This dependency-injected implementation contains no credentials and creates
// no client by itself. Production construction is exposed only through the
// mechanically server-only first-preview-persistence facade.

import {
  deriveFirstPreviewIdempotencyKey,
  FIRST_PREVIEW_ASSET_BUCKET,
  FIRST_PREVIEW_ASSET_VALIDATOR_VERSION,
  FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION,
  FIRST_PREVIEW_LINEAGE_IDENTITY,
  FIRST_PREVIEW_MAX_ATTEMPT_NUMBER,
  FIRST_PREVIEW_PERSISTENCE_CONTRACT_VERSION,
  FIRST_PREVIEW_POST_SUCCESS_PENDING_MAX_AGE_SECONDS,
  FIRST_PREVIEW_PROVIDER_PROFILE,
  parseFirstPreviewCanonicalUtcTimestampMicros,
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
  automatic_gate_status?: "pending" | "passed" | "failed" | null;
  automatic_gate_evidence?: unknown;
  automatic_gate_policy_version?: string | null;
  automatic_gate_passed_at?: string | null;
};

export type FirstPreviewReviewRow = {
  ai_sketch_output_id: string;
  concept_brief_id: string;
  review_status: string;
  revision_instruction: string | null;
  created_at: string;
  updated_at?: string | null;
  approved_for_customer_at?: string | null;
  approved_by?: string | null;
  approval_revoked_at?: string | null;
  revoked_by?: string | null;
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
  claimProviderDispatch(
    id: string,
    actualCostMicros: number,
    updatedAt: string,
  ): DatabaseResult<FirstPreviewJobRow>;
  claimProviderRequestIdentity(
    id: string,
    requestId: string,
    updatedAt: string,
  ): DatabaseResult<FirstPreviewJobRow>;
  insertOutput(row: RowPatch): DatabaseResult<FirstPreviewOutputRow>;
  findOutputById(id: string): DatabaseResult<FirstPreviewOutputRow>;
  findOutputByJobId(jobId: string): DatabaseResult<FirstPreviewOutputRow>;
  findOutputsByConceptBriefId(conceptBriefId: string): DatabaseResult<FirstPreviewOutputRow[]>;
  claimOutputAutomaticGate(
    subject: VisualPrivacySubject,
    expectedStatus: "pending" | null,
    expectedPolicyVersion: string | null,
    patch: RowPatch,
  ): DatabaseResult<FirstPreviewOutputRow>;
  findCustomerReadyOutput(conceptBriefId: string): DatabaseResult<FirstPreviewOutputRow>;
  updateOutput(
    identity: { id: string; jobId: string; conceptBriefId: string },
    allowedReadinessStatuses: readonly string[],
    patch: RowPatch,
  ): DatabaseResult<FirstPreviewOutputRow>;
  insertReview(row: RowPatch): DatabaseResult<FirstPreviewReviewRow>;
  findReviewByConceptBriefId(conceptBriefId: string): DatabaseResult<FirstPreviewReviewRow>;
  relinkProvisionalReview(
    conceptBriefId: string,
    oldOutputId: string,
    newOutputId: string,
    expectedUpdatedAt: string | null,
  ): DatabaseResult<FirstPreviewReviewRow>;
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
  "automatic_gate_status", "automatic_gate_evidence", "automatic_gate_policy_version",
  "automatic_gate_passed_at",
  "created_at",
].join(", ");

const REVIEW_COLUMNS =
  "ai_sketch_output_id, concept_brief_id, review_status, revision_instruction, created_at, updated_at, approved_for_customer_at, approved_by, approval_revoked_at, revoked_by";

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
    async claimProviderDispatch(id, actualCostMicros, updatedAt) {
      return supabase
        .from("ai_sketch_jobs")
        .update({
          actual_cost_micros: actualCostMicros,
          updated_at: updatedAt,
        })
        .eq("id", id)
        .eq("status", "processing")
        .is("actual_cost_micros", null)
        .select(JOB_COLUMNS)
        .maybeSingle();
    },
    async claimProviderRequestIdentity(id, requestId, updatedAt) {
      return supabase
        .from("ai_sketch_jobs")
        .update({ provider_request_id: requestId, updated_at: updatedAt })
        .eq("id", id)
        .eq("status", "processing")
        .is("provider_request_id", null)
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
    async findOutputsByConceptBriefId(conceptBriefId) {
      return supabase.from("ai_sketch_outputs").select(OUTPUT_COLUMNS)
        .eq("concept_brief_id", conceptBriefId).limit(3).returns<FirstPreviewOutputRow[]>();
    },
    async claimOutputAutomaticGate(subject, expectedStatus, expectedPolicyVersion, patch) {
      let query = supabase.from("ai_sketch_outputs").update(patch)
        .eq("id", subject.outputId)
        .eq("job_id", subject.jobId)
        .eq("concept_brief_id", subject.conceptBriefId)
        .eq("content_sha256", subject.contentSha256)
        .eq("readiness_status", "not_ready")
        .eq("is_current_customer_preview", false)
        .eq("asset_validation_status", "passed")
        .not("asset_validated_at", "is", null)
        .is("automatic_gate_evidence", null)
        .is("automatic_gate_passed_at", null);
      query = expectedStatus === null
        ? query.is("automatic_gate_status", null)
        : query.eq("automatic_gate_status", expectedStatus);
      query = expectedPolicyVersion === null
        ? query.is("automatic_gate_policy_version", null)
        : query.eq("automatic_gate_policy_version", expectedPolicyVersion);
      return query.select(OUTPUT_COLUMNS).maybeSingle();
    },
    async findCustomerReadyOutput(conceptBriefId) {
      return supabase
        .from("ai_sketch_outputs")
        .select(OUTPUT_COLUMNS)
        .eq("concept_brief_id", conceptBriefId)
        .eq("readiness_status", "first_preview_ready")
        .eq("is_current_customer_preview", true)
        .eq("automatic_gate_status", "passed")
        .eq("automatic_gate_policy_version", FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION)
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
    async relinkProvisionalReview(conceptBriefId, oldOutputId, newOutputId, expectedUpdatedAt) {
      let query = supabase.from("ai_sketch_reviews")
        .update({ ai_sketch_output_id: newOutputId })
        .eq("concept_brief_id", conceptBriefId)
        .eq("ai_sketch_output_id", oldOutputId)
        .eq("review_status", "draft_generated_internal_only")
        .is("revision_instruction", null)
        .is("approved_for_customer_at", null)
        .is("approved_by", null)
        .is("approval_revoked_at", null)
        .is("revoked_by", null);
      query = expectedUpdatedAt === null
        ? query.is("updated_at", null)
        : query.eq("updated_at", expectedUpdatedAt);
      return query.select(REVIEW_COLUMNS).maybeSingle();
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
  "configuration_missing", "invalid_structured_input", "precondition_failed",
  "invalid_request", "authentication_failed", "permission_denied",
  "moderation_blocked", "rate_limited", "provider_unavailable",
  "network_failure", "timeout", "cancelled", "invalid_provider_response",
  "invalid_base64", "invalid_image_format", "invalid_image_dimensions",
  "image_too_large", "unsafe_output", "privacy_failure", "access_failure",
  "storage_failure", "lifecycle_conflict", "budget_blocked",
  "unexpected_provider_error",
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

function normalizeRevisionInstruction(
  value: unknown,
): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length >= 1 && trimmed.length <= 2000 ? trimmed : undefined;
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
    output.conceptBriefId === subject.conceptBriefId &&
    output.contentSha256 === subject.contentSha256;
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

function isSafeAssetPath(value: string): boolean {
  return (
    isNonblank(value) &&
    value.length <= 512 &&
    /^first-preview\/(?:[A-Za-z0-9][A-Za-z0-9_-]{0,127}\/)*[A-Za-z0-9][A-Za-z0-9_-]{0,127}\.png$/.test(value)
  );
}

function mapJob(row: FirstPreviewJobRow | null): FirstPreviewJobRecord | null {
  if (
    !row || !UUID_PATTERN.test(row.id) || !UUID_PATTERN.test(row.concept_brief_id) ||
    !JOB_STATUSES.has(row.status as FirstPreviewJobStatus) ||
    row.generation_purpose !== "first_preview" ||
    typeof row.attempt_number !== "number" ||
    !Number.isSafeInteger(row.attempt_number) ||
    row.attempt_number < 1 ||
    row.attempt_number > FIRST_PREVIEW_MAX_ATTEMPT_NUMBER ||
    !SHA256_PATTERN.test(row.idempotency_key ?? "") ||
    row.lineage_identity !== FIRST_PREVIEW_LINEAGE_IDENTITY ||
    (row.source_output_id !== null && !UUID_PATTERN.test(row.source_output_id)) ||
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
    sourceOutputId: row.source_output_id,
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
    automaticGateStatus: row.automatic_gate_status ?? null,
    automaticGateEvidence: row.automatic_gate_evidence ?? null,
    automaticGatePolicyVersion: row.automatic_gate_policy_version ?? null,
    automaticGatePassedAt: row.automatic_gate_passed_at ?? null,
  };
}

function mapReview(row: FirstPreviewReviewRow | null): FirstPreviewReviewRecord | null {
  const revisionInstruction = normalizeRevisionInstruction(row?.revision_instruction);
  if (
    !row || !UUID_PATTERN.test(row.ai_sketch_output_id) ||
    !UUID_PATTERN.test(row.concept_brief_id) ||
    !REVIEW_STATUSES.has(row.review_status as FirstPreviewReviewRecord["reviewStatus"]) ||
    revisionInstruction === undefined ||
    !isIsoTimestamp(row.created_at)
  ) {
    return null;
  }
  return {
    outputId: row.ai_sketch_output_id,
    conceptBriefId: row.concept_brief_id,
    reviewStatus: row.review_status as FirstPreviewReviewRecord["reviewStatus"],
    revisionInstruction,
    createdAt: row.created_at,
  };
}

function identityMatches(job: FirstPreviewJobRecord, input: ReserveFirstPreviewJobInput): boolean {
  return job.conceptBriefId === input.conceptBriefId &&
    job.attemptNumber === input.attemptNumber && job.parentJobId === input.parentJobId &&
    job.sourceOutputId === input.sourceOutputId &&
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
        : 150_000;
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

    if (input.attemptNumber >= 2) {
      const parentResult = await this.database.findJobById(input.parentJobId!);
      if (parentResult.error) return failure("repository_unavailable");
      const parent = mapJob(parentResult.data);
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

        const outputResult = await this.database.findOutputById(input.sourceOutputId);
        if (outputResult.error) return failure("repository_unavailable");
        const output = mapOutput(outputResult.data);
        if (outputResult.data && !output) return failure("repository_unavailable");
        if (!output) return failure("output_not_found");
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

        const reviewResult = await this.database.findReviewByConceptBriefId(
          input.conceptBriefId,
        );
        if (reviewResult.error) return failure("repository_unavailable");
        const review = mapReview(reviewResult.data);
        if (
          !review ||
          review.outputId !== input.sourceOutputId ||
          review.conceptBriefId !== input.conceptBriefId ||
          review.reviewStatus !== "needs_revision" ||
          review.revisionInstruction === null
        ) {
          return failure("revision_not_eligible");
        }
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
      parent_generation_purpose: input.attemptNumber >= 2 ? "first_preview" : null,
      parent_attempt_number:
        input.attemptNumber >= 2 ? input.attemptNumber - 1 : null,
      source_output_id: input.sourceOutputId,
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

  async recordProviderDispatch(
    jobId: string,
  ): Promise<FirstPreviewRepositoryResult<FirstPreviewJobRecord>> {
    if (!UUID_PATTERN.test(jobId)) return failure("invalid_input");
    const claim = await this.database.claimProviderDispatch(
      jobId,
      FIRST_PREVIEW_COST_CONTRACT.estimatedCostMicros,
      this.clock(),
    );
    if (claim.error) return failure("repository_unavailable");
    const claimed = mapJob(claim.data);
    if (claim.data && !claimed) return failure("repository_unavailable");
    if (claimed) return { ok: true, value: claimed };

    const currentResult = await this.database.findJobById(jobId);
    if (currentResult.error) return failure("repository_unavailable");
    const current = mapJob(currentResult.data);
    if (!current) {
      return currentResult.data
        ? failure("repository_unavailable")
        : failure("job_not_found");
    }
    return current.status === "processing" &&
      current.actualCostMicros !== null
      ? failure("idempotency_conflict")
      : failure("job_not_active");
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
    const claimResult = await this.database.claimProviderRequestIdentity(
      jobId,
      request.providerRequestId,
      this.clock(),
    );
    if (claimResult.error) return failure("repository_unavailable");
    const claimed = mapJob(claimResult.data);
    if (claimed) return { ok: true, value: claimed };
    if (claimResult.data) return failure("repository_unavailable");

    const winnerResult = await this.database.findJobById(jobId);
    if (winnerResult.error) return failure("repository_unavailable");
    const winner = mapJob(winnerResult.data);
    if (!winner) return winnerResult.data
      ? failure("repository_unavailable")
      : failure("job_not_found");
    if (winner.status !== "processing") return failure("job_not_active");
    if (winner.providerRequestId === request.providerRequestId) {
      return { ok: true, value: winner };
    }
    return winner.providerRequestId === null
      ? failure("repository_unavailable")
      : failure("idempotency_conflict");
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
    const output = mapOutput(outputResult.data);
    if (!output) return failure("repository_unavailable");
    const jobResult = await this.database.findJobById(jobId);
    if (jobResult.error) return failure("repository_unavailable");
    const job = mapJob(jobResult.data);
    const completedAt = this.clock();
    if (!job || job.status !== "processing" || !isIsoTimestamp(job.startedAt) ||
      !isIsoTimestamp(job.deadlineAt) || !isIsoTimestamp(completedAt) ||
      Date.parse(completedAt) > Date.parse(job.deadlineAt) ||
      Date.parse(completedAt) < Date.parse(job.startedAt) ||
      Date.parse(completedAt) < Date.parse(output.assetValidatedAt)) return failure("job_not_active");
    return this.updateJob(jobId, ["processing"], {
      status: "succeeded", completed_at: completedAt, actual_cost_micros: success.actualCostMicros,
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

  async reserveVisualPrivacyInspection(subject: VisualPrivacySubject): Promise<FirstPreviewRepositoryResult<FirstPreviewOutputRecord>> {
    if (!isVisualPrivacySubject(subject)) return failure("invalid_input");
    const outputResult = await this.database.findOutputById(subject.outputId);
    if (outputResult.error) return failure("repository_unavailable");
    const output = mapOutput(outputResult.data);
    if (!output) return failure("output_not_found");
    if (!subjectMatches(output, subject)) return failure("linkage_mismatch");
    if (output.readinessStatus !== "not_ready" || output.isCurrentCustomerPreview ||
      output.automaticGateStatus !== null || output.automaticGatePolicyVersion !== null ||
      output.automaticGateEvidence !== null || output.automaticGatePassedAt !== null) {
      return failure("idempotency_conflict");
    }
    const jobResult = await this.database.findJobById(subject.jobId);
    if (jobResult.error) return failure("repository_unavailable");
    const job = mapJob(jobResult.data);
    const now = this.clock();
    if (!job || job.conceptBriefId !== subject.conceptBriefId || job.status !== "processing" ||
      (job.attemptNumber !== 1 && job.attemptNumber !== 2) || job.actualCostMicros === null ||
      !isNonblank(job.providerRequestId) || !isIsoTimestamp(job.deadlineAt) ||
      !isIsoTimestamp(now) || Date.parse(job.deadlineAt) <= Date.parse(now)) {
      return failure("job_not_active");
    }
    const rows = await this.database.findOutputsByConceptBriefId(subject.conceptBriefId);
    if (rows.error || !rows.data) return failure("repository_unavailable");
    if (rows.data.length > 2) return failure("automatic_gates_not_passed");
    let accountedCost = FIRST_PREVIEW_VISUAL_PRIVACY_RESERVATION_MICROS;
    for (const row of rows.data) {
      const candidate = mapOutput(row);
      if (!candidate || candidate.conceptBriefId !== subject.conceptBriefId) return failure("repository_unavailable");
      if (candidate.automaticGateStatus === null && candidate.automaticGatePolicyVersion === null &&
        candidate.automaticGateEvidence === null && candidate.automaticGatePassedAt === null) continue;
      if (candidate.automaticGatePolicyVersion !== FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION) {
        return failure("automatic_gates_not_passed");
      }
      let charge: number = FIRST_PREVIEW_VISUAL_PRIVACY_RESERVATION_MICROS;
      if (candidate.automaticGateStatus === "pending") {
        if (candidate.automaticGateEvidence !== null || candidate.automaticGatePassedAt !== null) return failure("automatic_gates_not_passed");
      } else if (candidate.automaticGateStatus === "failed" || candidate.automaticGateStatus === "passed") {
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
    // Unique brief/attempt and one-output/job constraints, combined with the
    // attempt 1|2 restriction, bound concurrent claims to two reservations.
    // Pending v2 always accounts for 30000 micros, including a crash before
    // dispatch or an unknown bill. It never replays as a successful claim.
    const claimed = await this.database.claimOutputAutomaticGate(subject, null, null, {
      automatic_gate_status: "pending",
      automatic_gate_policy_version: FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION,
      automatic_gate_evidence: null,
      automatic_gate_passed_at: null,
    });
    if (claimed.error) return failure("repository_unavailable");
    const reserved = mapOutput(claimed.data);
    if (!reserved || !subjectMatches(reserved, subject) ||
      reserved.automaticGateStatus !== "pending" ||
      reserved.automaticGatePolicyVersion !== FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION ||
      reserved.automaticGateEvidence !== null || reserved.automaticGatePassedAt !== null) return failure("idempotency_conflict");
    const currentJobResult = await this.database.findJobById(subject.jobId);
    if (currentJobResult.error) return failure("repository_unavailable");
    const currentJob = mapJob(currentJobResult.data);
    const claimedAt = Date.parse(this.clock());
    if (!currentJob || currentJob.status !== "processing" ||
      currentJob.conceptBriefId !== subject.conceptBriefId || !isIsoTimestamp(currentJob.deadlineAt) ||
      !Number.isFinite(claimedAt) || Date.parse(currentJob.deadlineAt) <= claimedAt) return failure("job_not_active");
    return { ok: true, value: reserved };
  }

  async recordVisualPrivacyInspectionFailure(subject: VisualPrivacySubject, evidence: FirstPreviewVisualPrivacyEvidence): Promise<FirstPreviewRepositoryResult<FirstPreviewOutputRecord>> {
    if (!isVisualPrivacySubject(subject) || evidence?.result !== "failed" ||
      !validateFirstPreviewVisualPrivacyEvidence(evidence, subject, false)) return failure("invalid_input");
    const updated = await this.database.claimOutputAutomaticGate(
      subject, "pending", FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION,
      {
        automatic_gate_status: "failed",
        automatic_gate_evidence: { result: "failed", visualPrivacyEvidence: sanitizedVisualEvidence(evidence) },
        automatic_gate_passed_at: null,
      },
    );
    if (updated.error) return failure("repository_unavailable");
    const output = mapOutput(updated.data);
    return output && subjectMatches(output, subject)
      ? { ok: true, value: output } : failure("idempotency_conflict");
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
    const evidence = {
      result: "failed" as const,
      reason,
      subject,
      billingStatus: "unknown" as const,
      reservedCostMicros: FIRST_PREVIEW_VISUAL_PRIVACY_RESERVATION_MICROS,
      ...(visualEvidence ? { visualPrivacyEvidence: sanitizedVisualEvidence(visualEvidence) } : {}),
    };
    if (!validateFirstPreviewInspectionInterruptionEvidence(evidence, subject)) return failure("invalid_input");
    const updated = await this.database.claimOutputAutomaticGate(
      subject, "pending", FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION,
      { automatic_gate_status: "failed", automatic_gate_evidence: evidence, automatic_gate_passed_at: null },
    );
    if (updated.error) return failure("repository_unavailable");
    const output = mapOutput(updated.data);
    return output && subjectMatches(output, subject)
      ? { ok: true, value: output } : failure("idempotency_conflict");
  }

  async reconcileInterruptedInspection(
    jobId: string,
    conceptBriefId: string,
  ): Promise<FirstPreviewRepositoryResult<FirstPreviewOutputRecord | null>> {
    if (!UUID_PATTERN.test(jobId) || !UUID_PATTERN.test(conceptBriefId)) return failure("invalid_input");
    const [jobResult, outputResult] = await Promise.all([
      this.database.findJobById(jobId), this.database.findOutputByJobId(jobId),
    ]);
    if (jobResult.error || outputResult.error) return failure("repository_unavailable");
    const job = mapJob(jobResult.data);
    if (!job || job.conceptBriefId !== conceptBriefId) return failure("linkage_mismatch");
    if (!outputResult.data) return { ok: true, value: null };
    const output = mapOutput(outputResult.data);
    if (!output || output.jobId !== jobId || output.conceptBriefId !== conceptBriefId) return failure("linkage_mismatch");
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
    if (!terminalFailure && !expired) return { ok: true, value: output };
    if (output.automaticGateStatus === "pending" &&
      output.automaticGatePolicyVersion === FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION &&
      output.automaticGateEvidence === null && output.automaticGatePassedAt === null &&
      output.readinessStatus === "not_ready" && !output.isCurrentCustomerPreview) {
      const settled = await this.recordVisualPrivacyOperationalFailure(
        visualSubject(output), "inspection_interrupted",
      );
      if (settled.ok === false && settled.code !== "idempotency_conflict") return failure(settled.code);
    }
    // A second invocation finishes a crash between Output and Job settlement.
    if (job.status === "processing" && expired) {
      const timedOut = await this.recordJobFailure(jobId, {
        category: "timeout", retryEligible: false, actualCostMicros: job.actualCostMicros,
      });
      if (timedOut.ok === false && timedOut.code !== "job_not_active") return failure(timedOut.code);
    }
    const current = await this.database.findOutputByJobId(jobId);
    if (current.error) return failure("repository_unavailable");
    const currentOutput = mapOutput(current.data);
    return currentOutput && currentOutput.conceptBriefId === conceptBriefId
      ? { ok: true, value: currentOutput } : failure("linkage_mismatch");
  }

  async markOutputReady(input: MarkFirstPreviewReadyInput): Promise<FirstPreviewRepositoryResult<FirstPreviewOutputRecord>> {
    if (input.automaticGatePolicyVersion !== FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION) return failure("invalid_input");
    const outputResult = await this.database.findOutputById(input.outputId);
    if (outputResult.error) return failure("repository_unavailable");
    const output = mapOutput(outputResult.data);
    if (!output) return outputResult.data ? failure("repository_unavailable") : failure("output_not_found");
    if (output.jobId !== input.jobId || output.conceptBriefId !== input.conceptBriefId) return failure("linkage_mismatch");
    if (!hasPassedFirstPreviewAutomaticGateEvidence({ ...input.gates, result: "passed" }, visualSubject(output))) return failure("automatic_gates_not_passed");
    if (output.readinessStatus !== "not_ready" || output.isCurrentCustomerPreview ||
      output.automaticGateStatus !== "pending" ||
      output.automaticGatePolicyVersion !== FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION ||
      output.automaticGateEvidence !== null || output.automaticGatePassedAt !== null) return failure("automatic_gates_not_passed");
    const jobResult = await this.database.findJobById(input.jobId);
    if (jobResult.error) return failure("repository_unavailable");
    const job = mapJob(jobResult.data);
    if (!job || job.status !== "succeeded") return failure("job_not_active");
    const now = this.clock();
    if (!isIsoTimestamp(job.startedAt) || !isIsoTimestamp(job.completedAt) ||
      !isIsoTimestamp(job.deadlineAt) || !isIsoTimestamp(now) ||
      Date.parse(now) > Date.parse(job.deadlineAt) ||
      Date.parse(job.completedAt) > Date.parse(job.deadlineAt) ||
      Date.parse(job.completedAt) < Date.parse(job.startedAt) ||
      Date.parse(job.completedAt) < Date.parse(output.assetValidatedAt) ||
      Date.parse(now) < Date.parse(job.completedAt)) return failure("job_not_active");
    const passedAt = this.clock();
    if (!isIsoTimestamp(passedAt) || Date.parse(passedAt) > Date.parse(job.deadlineAt) ||
      Date.parse(passedAt) < Date.parse(job.completedAt)) return failure("job_not_active");
    const updated = await this.database.claimOutputAutomaticGate(
      visualSubject(output), "pending", FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION,
      {
        automatic_gate_status: "passed",
        automatic_gate_evidence: sanitizedGateEvidence(input.gates),
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
    if (!ready) return failure("job_not_active");
    // Review is post-preview human workflow. A crash here leaves a genuine
    // ready Output; an authorized admin read/write can repair the link later.
    await this.ensureReadyReviewLink(ready.id, ready.conceptBriefId);
    return { ok: true, value: ready };
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

  async findJobById(jobId: string): Promise<FirstPreviewJobRecord | null> {
    if (!UUID_PATTERN.test(jobId)) return null;
    const result = await this.database.findJobById(jobId);
    return result.error ? null : mapJob(result.data);
  }

  async findCustomerReadyOutput(conceptBriefId: string): Promise<FirstPreviewOutputRecord | null> {
    if (!UUID_PATTERN.test(conceptBriefId)) return null;
    const result = await this.database.findCustomerReadyOutput(conceptBriefId);
    const output = result.error ? null : mapOutput(result.data);
    return output && output.automaticGateStatus === "passed" &&
      output.automaticGatePolicyVersion === FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION &&
      isIsoTimestamp(output.automaticGatePassedAt) &&
      hasPassedFirstPreviewAutomaticGateEvidence(output.automaticGateEvidence, visualSubject(output))
      ? output : null;
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

  async ensureReadyReviewLink(outputId: string, conceptBriefId: string): Promise<FirstPreviewRepositoryResult<FirstPreviewReviewRecord>> {
    if (!UUID_PATTERN.test(outputId) || !UUID_PATTERN.test(conceptBriefId)) return failure("invalid_input");
    const readyResult = await this.database.findCustomerReadyOutput(conceptBriefId);
    if (readyResult.error) return failure("repository_unavailable");
    const ready = mapOutput(readyResult.data);
    if (!ready || ready.id !== outputId || ready.conceptBriefId !== conceptBriefId ||
      ready.readinessStatus !== "first_preview_ready" || !ready.isCurrentCustomerPreview ||
      ready.automaticGateStatus !== "passed" ||
      ready.automaticGatePolicyVersion !== FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION ||
      !hasPassedFirstPreviewAutomaticGateEvidence(ready.automaticGateEvidence, visualSubject(ready))) {
      return failure("automatic_gates_not_passed");
    }
    const existingResult = await this.database.findReviewByConceptBriefId(conceptBriefId);
    if (existingResult.error) return failure("repository_unavailable");
    const existing = mapReview(existingResult.data);
    if (existingResult.data && !existing) return failure("repository_unavailable");
    if (existing) {
      if (existing.outputId === outputId) return { ok: true, value: existing };
      const raw = existingResult.data!;
      if (existing.reviewStatus !== "draft_generated_internal_only" ||
        existing.revisionInstruction !== null ||
        raw.approved_for_customer_at != null || raw.approved_by != null ||
        raw.approval_revoked_at != null || raw.revoked_by != null ||
        !isIsoTimestamp(raw.updated_at)) return failure("review_linkage_conflict");
      const oldResult = await this.database.findOutputById(existing.outputId);
      if (oldResult.error) return failure("repository_unavailable");
      const oldOutput = mapOutput(oldResult.data);
      if (!oldOutput || oldOutput.conceptBriefId !== conceptBriefId ||
        oldOutput.readinessStatus !== "not_ready" || oldOutput.readyAt !== null ||
        oldOutput.isCurrentCustomerPreview || oldOutput.automaticGateStatus !== "failed") {
        return failure("review_linkage_conflict");
      }
      const oldJobResult = await this.database.findJobById(oldOutput.jobId);
      if (oldJobResult.error) return failure("repository_unavailable");
      const oldJob = mapJob(oldJobResult.data);
      if (!oldJob || oldJob.conceptBriefId !== conceptBriefId ||
        !["failed", "cancelled", "timed_out", "succeeded"].includes(oldJob.status)) {
        return failure("review_linkage_conflict");
      }
      const relinked = await this.database.relinkProvisionalReview(
        conceptBriefId, existing.outputId, outputId, raw.updated_at!,
      );
      if (relinked.error) return failure("repository_unavailable");
      const repaired = mapReview(relinked.data);
      return repaired && repaired.outputId === outputId && repaired.conceptBriefId === conceptBriefId
        ? { ok: true, value: repaired } : failure("review_linkage_conflict");
    }
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
