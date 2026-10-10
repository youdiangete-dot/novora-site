import { createHash } from "node:crypto";
import type {
  FirstPreviewVisualPrivacyEvidence,
  VisualPrivacySubject,
} from "./first-preview-visual-privacy-contract";

export const FIRST_PREVIEW_PERSISTENCE_CONTRACT_VERSION =
  "novora_first_preview_persistence_v1" as const;
export const FIRST_PREVIEW_IDEMPOTENCY_VERSION =
  "novora:first-preview-idempotency:v1" as const;
export const FIRST_PREVIEW_LINEAGE_IDENTITY = "first-preview:v1" as const;
export const FIRST_PREVIEW_POST_SUCCESS_PENDING_MAX_AGE_SECONDS = 1_800 as const;

const CANONICAL_UTC_TIMESTAMP_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?(?:Z|\+00:00)$/;
const DAYS_BEFORE_MONTH = [
  0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334,
] as const;
const MICROSECONDS_PER_SECOND = BigInt(1_000_000);
const SECONDS_PER_DAY = BigInt(86_400);

function isGregorianLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysBeforeGregorianYear(year: number): number {
  return (
    365 * year +
    Math.floor((year + 3) / 4) -
    Math.floor((year + 99) / 100) +
    Math.floor((year + 399) / 400)
  );
}

export function parseFirstPreviewCanonicalUtcTimestampMicros(value: unknown): bigint | null {
  if (typeof value !== "string") return null;
  const match = CANONICAL_UTC_TIMESTAMP_PATTERN.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  if (month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59) return null;
  const daysInMonth =
    month === 2 && isGregorianLeapYear(year)
      ? 29
      : ([31, 28, 31, 30, 31, 30, 31, 31, 30, 31] as const)[month - 1];
  if (day < 1 || day > daysInMonth) return null;
  const daysSinceEpoch =
    daysBeforeGregorianYear(year) -
    daysBeforeGregorianYear(1970) +
    DAYS_BEFORE_MONTH[month - 1] +
    (month > 2 && isGregorianLeapYear(year) ? 1 : 0) +
    day - 1;
  return (
    (BigInt(daysSinceEpoch) * SECONDS_PER_DAY +
      BigInt(hour * 3_600 + minute * 60 + second)) *
      MICROSECONDS_PER_SECOND +
    BigInt((match[7] ?? "").padEnd(6, "0") || "0")
  );
}

export type FirstPreviewJobStatus =
  | "queued"
  | "processing"
  | "succeeded"
  | "failed"
  | "timed_out"
  | "cancelled";

export const FIRST_PREVIEW_MAX_ATTEMPT_NUMBER = 32_767 as const;

export type FirstPreviewAttemptNumber = number;

export type FirstPreviewFailureCategory =
  | "configuration_missing"
  | "invalid_structured_input"
  | "precondition_failed"
  | "invalid_request"
  | "authentication_failed"
  | "permission_denied"
  | "moderation_blocked"
  | "rate_limited"
  | "provider_unavailable"
  | "network_failure"
  | "timeout"
  | "cancelled"
  | "invalid_provider_response"
  | "invalid_base64"
  | "invalid_image_format"
  | "invalid_image_dimensions"
  | "image_too_large"
  | "unsafe_output"
  | "privacy_failure"
  | "access_failure"
  | "storage_failure"
  | "lifecycle_conflict"
  | "budget_blocked"
  | "unexpected_provider_error";

export const FIRST_PREVIEW_PROVIDER_PROFILE = {
  providerName: "openai",
  modelName: "gpt-image-2-2026-04-21",
  providerEndpoint: "/v1/images/generations",
  requestImageCount: 1,
  requestStreaming: false,
  requestPartialImages: 0,
  requestSize: "1024x1024",
  requestQuality: "medium",
  outputFormat: "png",
  moderationMode: "auto",
} as const;

export const FIRST_PREVIEW_ASSET_BUCKET = "novora-ai-sketches" as const;
export const FIRST_PREVIEW_ASSET_VALIDATOR_VERSION =
  "novora_first_preview_asset_validator_v1" as const;
export const FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION =
  "novora_first_preview_automatic_gates_v2" as const;

export type FirstPreviewJobRecord = Readonly<{
  id: string;
  conceptBriefId: string;
  generationPurpose: "first_preview";
  attemptNumber: FirstPreviewAttemptNumber;
  idempotencyKey: string;
  lineageIdentity: typeof FIRST_PREVIEW_LINEAGE_IDENTITY;
  parentJobId: string | null;
  sourceOutputId: string | null;
  designSpecVersion: string;
  designSpecSha256: string;
  handSketchInstructionVersion: string;
  handSketchInstructionSha256: string;
  providerName: typeof FIRST_PREVIEW_PROVIDER_PROFILE.providerName;
  providerRequestId: string | null;
  estimatedCostMicros: number;
  actualCostMicros: number | null;
  costCurrency: "USD";
  pricingAssumptionVersion: string;
  status: FirstPreviewJobStatus;
  failureCategory: FirstPreviewFailureCategory | null;
  retryEligible: boolean | null;
  startedAt: string | null;
  deadlineAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  cancelledAt: string | null;
  timedOutAt: string | null;
  createdAt: string;
  updatedAt: string;
}>;

export type FirstPreviewOutputRecord = Readonly<{
  id: string;
  jobId: string;
  conceptBriefId: string;
  assetId: string;
  assetPersisted: true;
  bucketName: typeof FIRST_PREVIEW_ASSET_BUCKET;
  mimeType: "image/png";
  byteSize: number;
  widthPx: 1024;
  heightPx: 1024;
  contentSha256: string;
  assetCreatedAt: string;
  assetValidatedAt: string;
  readinessStatus: "not_ready" | "first_preview_ready" | "revoked";
  isCurrentCustomerPreview: boolean;
  createdAt: string;
  readyAt: string | null;
  revokedAt: string | null;
  automaticGateStatus?: "pending" | "passed" | "failed" | null;
  automaticGateEvidence?: unknown;
  automaticGatePolicyVersion?: string | null;
  automaticGatePassedAt?: string | null;
}>;

export type FirstPreviewReviewRecord = Readonly<{
  outputId: string;
  conceptBriefId: string;
  reviewStatus:
    | "internal_draft_not_generated"
    | "draft_generated_internal_only"
    | "needs_revision"
    | "approved_for_customer";
  revisionInstruction: string | null;
  createdAt: string;
}>;

export type FirstPreviewRepositoryFailureCode =
  | "repository_unavailable"
  | "invalid_input"
  | "idempotency_conflict"
  | "attempt_identity_conflict"
  | "active_job_exists"
  | "job_not_found"
  | "job_not_active"
  | "parent_job_invalid"
  | "retry_not_eligible"
  | "revision_not_eligible"
  | "output_not_found"
  | "output_already_exists"
  | "review_linkage_conflict"
  | "linkage_mismatch"
  | "asset_not_persisted"
  | "automatic_gates_not_passed";

export type FirstPreviewRepositoryFailure = Readonly<{
  ok: false;
  code: FirstPreviewRepositoryFailureCode;
}>;

export type FirstPreviewRepositorySuccess<T> = Readonly<{
  ok: true;
  value: T;
}>;

export type FirstPreviewRepositoryResult<T> =
  | FirstPreviewRepositorySuccess<T>
  | FirstPreviewRepositoryFailure;

export type ReserveFirstPreviewJobInput = Readonly<{
  jobId: string;
  conceptBriefId: string;
  attemptNumber: FirstPreviewAttemptNumber;
  parentJobId: string | null;
  sourceOutputId: string | null;
  designSpecVersion: string;
  designSpecSha256: string;
  handSketchInstructionVersion: string;
  handSketchInstructionSha256: string;
  estimatedCostMicros: number;
  costCurrency: "USD";
  pricingAssumptionVersion: string;
}>;

export type FirstPreviewCanonicalIdentity = Readonly<{
  attempt_number: FirstPreviewAttemptNumber;
  concept_brief_id: string;
  design_spec_sha256: string;
  design_spec_version: string;
  generation_purpose: "first_preview";
  hand_sketch_instruction_sha256: string;
  hand_sketch_instruction_version: string;
  lineage_identity: typeof FIRST_PREVIEW_LINEAGE_IDENTITY;
  parent_job_id: string | null;
  source_output_id: string | null;
  version: typeof FIRST_PREVIEW_IDEMPOTENCY_VERSION;
}>;

export type ReserveFirstPreviewJobResult = FirstPreviewRepositoryResult<
  Readonly<{
    disposition: "created" | "existing";
    job: FirstPreviewJobRecord;
  }>
>;

export type PersistFirstPreviewOutputInput = Readonly<{
  outputId: string;
  jobId: string;
  conceptBriefId: string;
  assetId: string;
  assetPersisted: boolean;
  bucketName: typeof FIRST_PREVIEW_ASSET_BUCKET;
  mimeType: "image/png";
  byteSize: number;
  widthPx: 1024;
  heightPx: 1024;
  contentSha256: string;
  assetCreatedAt: string;
  assetValidatedAt: string;
}>;

export type FirstPreviewAutomaticGateEvidence = Readonly<{
  outputValid: boolean;
  assetExists: boolean;
  ownershipConsistent: boolean;
  privacyPassed: boolean;
  customerAccessEligible: boolean;
  lifecycleEligible: boolean;
  visualPrivacyEvidence: FirstPreviewVisualPrivacyEvidence;
}>;

export type MarkFirstPreviewReadyInput = Readonly<{
  outputId: string;
  jobId: string;
  conceptBriefId: string;
  gates: FirstPreviewAutomaticGateEvidence;
  automaticGatePolicyVersion: typeof FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION;
}>;

export type RecordFirstPreviewProviderRequestInput = Readonly<{
  providerRequestId: string;
}>;

export type RecordFirstPreviewJobSuccessInput = Readonly<{
  actualCostMicros: number;
}>;

export type RecordFirstPreviewJobFailureInput = Readonly<{
  category: FirstPreviewFailureCategory;
  retryEligible: boolean;
  actualCostMicros: number | null;
}>;

export type RevokeFirstPreviewOutputInput = Readonly<{
  outputId: string;
  jobId: string;
  conceptBriefId: string;
}>;

export interface FirstPreviewRepository {
  readonly kind: "unavailable" | "memory_fake" | "supabase";

  reserveJob(input: ReserveFirstPreviewJobInput): Promise<ReserveFirstPreviewJobResult>;

  startJob(
    jobId: string,
  ): Promise<FirstPreviewRepositoryResult<FirstPreviewJobRecord>>;

  recordProviderDispatch(
    jobId: string,
  ): Promise<FirstPreviewRepositoryResult<FirstPreviewJobRecord>>;

  recordProviderRequest(
    jobId: string,
    request: RecordFirstPreviewProviderRequestInput,
  ): Promise<FirstPreviewRepositoryResult<FirstPreviewJobRecord>>;

  recordJobSucceeded(
    jobId: string,
    success: RecordFirstPreviewJobSuccessInput,
  ): Promise<FirstPreviewRepositoryResult<FirstPreviewJobRecord>>;

  recordJobFailure(
    jobId: string,
    failure: RecordFirstPreviewJobFailureInput,
  ): Promise<FirstPreviewRepositoryResult<FirstPreviewJobRecord>>;

  persistOutput(
    input: PersistFirstPreviewOutputInput,
  ): Promise<FirstPreviewRepositoryResult<FirstPreviewOutputRecord>>;

  reserveVisualPrivacyInspection(
    subject: VisualPrivacySubject,
  ): Promise<FirstPreviewRepositoryResult<FirstPreviewOutputRecord>>;

  recordVisualPrivacyInspectionFailure(
    subject: VisualPrivacySubject,
    evidence: FirstPreviewVisualPrivacyEvidence,
  ): Promise<FirstPreviewRepositoryResult<FirstPreviewOutputRecord>>;

  recordVisualPrivacyOperationalFailure(
    subject: VisualPrivacySubject,
    reason: "inspection_interrupted" | "gate_pipeline_failed",
    visualEvidence?: FirstPreviewVisualPrivacyEvidence,
  ): Promise<FirstPreviewRepositoryResult<FirstPreviewOutputRecord>>;

  reconcileInterruptedInspection(
    jobId: string,
    conceptBriefId: string,
  ): Promise<FirstPreviewRepositoryResult<FirstPreviewOutputRecord | null>>;

  ensureReadyReviewLink(
    outputId: string,
    conceptBriefId: string,
  ): Promise<FirstPreviewRepositoryResult<FirstPreviewReviewRecord>>;

  markOutputReady(
    input: MarkFirstPreviewReadyInput,
  ): Promise<FirstPreviewRepositoryResult<FirstPreviewOutputRecord>>;

  revokeOutput(
    input: RevokeFirstPreviewOutputInput,
  ): Promise<FirstPreviewRepositoryResult<FirstPreviewOutputRecord>>;

  findJobByIdempotencyKey(idempotencyKey: string): Promise<FirstPreviewJobRecord | null>;

  findJobById(jobId: string): Promise<FirstPreviewJobRecord | null>;

  findCustomerReadyOutput(conceptBriefId: string): Promise<FirstPreviewOutputRecord | null>;

  findReviewByConceptBriefId(
    conceptBriefId: string,
  ): Promise<FirstPreviewReviewRecord | null>;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

function isTrimmedSystemIdentifier(value: string): boolean {
  return value.length > 0 && value === value.trim();
}

export function isValidFirstPreviewReservationIdentity(
  input: ReserveFirstPreviewJobInput,
): boolean {
  return (
    UUID_PATTERN.test(input.jobId) &&
    UUID_PATTERN.test(input.conceptBriefId) &&
    Number.isSafeInteger(input.attemptNumber) &&
    input.attemptNumber >= 1 &&
    input.attemptNumber <= FIRST_PREVIEW_MAX_ATTEMPT_NUMBER &&
    (input.parentJobId === null || UUID_PATTERN.test(input.parentJobId)) &&
    (input.sourceOutputId === null || UUID_PATTERN.test(input.sourceOutputId)) &&
    isTrimmedSystemIdentifier(input.designSpecVersion) &&
    SHA256_PATTERN.test(input.designSpecSha256) &&
    isTrimmedSystemIdentifier(input.handSketchInstructionVersion) &&
    SHA256_PATTERN.test(input.handSketchInstructionSha256) &&
    Number.isSafeInteger(input.estimatedCostMicros) &&
    input.estimatedCostMicros >= 0 &&
    input.costCurrency === "USD" &&
    isTrimmedSystemIdentifier(input.pricingAssumptionVersion) &&
    (input.attemptNumber === 1
      ? input.parentJobId === null && input.sourceOutputId === null
      : input.parentJobId !== null)
  );
}

export function createFirstPreviewCanonicalIdentity(
  input: ReserveFirstPreviewJobInput,
): FirstPreviewCanonicalIdentity | null {
  if (!isValidFirstPreviewReservationIdentity(input)) {
    return null;
  }

  // Keys are deliberately inserted in RFC 8785 lexicographic order. Every
  // value is a string, JSON integer, or null, so JSON.stringify emits the JCS
  // representation without locale-sensitive or floating-point ambiguity.
  return {
    attempt_number: input.attemptNumber,
    concept_brief_id: input.conceptBriefId,
    design_spec_sha256: input.designSpecSha256,
    design_spec_version: input.designSpecVersion,
    generation_purpose: "first_preview",
    hand_sketch_instruction_sha256: input.handSketchInstructionSha256,
    hand_sketch_instruction_version: input.handSketchInstructionVersion,
    lineage_identity: FIRST_PREVIEW_LINEAGE_IDENTITY,
    parent_job_id: input.parentJobId,
    source_output_id: input.sourceOutputId,
    version: FIRST_PREVIEW_IDEMPOTENCY_VERSION,
  };
}

export function deriveFirstPreviewIdempotencyKey(
  input: ReserveFirstPreviewJobInput,
): string | null {
  const identity = createFirstPreviewCanonicalIdentity(input);
  if (!identity) {
    return null;
  }
  return createHash("sha256").update(JSON.stringify(identity), "utf8").digest("hex");
}

function unavailable<T>(): Promise<FirstPreviewRepositoryResult<T>> {
  return Promise.resolve({ ok: false, code: "repository_unavailable" });
}

class UnavailableFirstPreviewRepository implements FirstPreviewRepository {
  readonly kind = "unavailable" as const;

  reserveJob(): Promise<ReserveFirstPreviewJobResult> {
    return unavailable();
  }

  startJob(): Promise<FirstPreviewRepositoryResult<FirstPreviewJobRecord>> {
    return unavailable();
  }

  recordProviderDispatch(): Promise<FirstPreviewRepositoryResult<FirstPreviewJobRecord>> {
    return unavailable();
  }

  recordJobSucceeded(): Promise<FirstPreviewRepositoryResult<FirstPreviewJobRecord>> {
    return unavailable();
  }

  recordProviderRequest(): Promise<FirstPreviewRepositoryResult<FirstPreviewJobRecord>> {
    return unavailable();
  }

  recordJobFailure(): Promise<FirstPreviewRepositoryResult<FirstPreviewJobRecord>> {
    return unavailable();
  }

  persistOutput(): Promise<FirstPreviewRepositoryResult<FirstPreviewOutputRecord>> {
    return unavailable();
  }

  reserveVisualPrivacyInspection(): Promise<FirstPreviewRepositoryResult<FirstPreviewOutputRecord>> {
    return unavailable();
  }

  recordVisualPrivacyInspectionFailure(): Promise<FirstPreviewRepositoryResult<FirstPreviewOutputRecord>> {
    return unavailable();
  }

  recordVisualPrivacyOperationalFailure(): Promise<FirstPreviewRepositoryResult<FirstPreviewOutputRecord>> {
    return unavailable();
  }

  reconcileInterruptedInspection(): Promise<FirstPreviewRepositoryResult<FirstPreviewOutputRecord | null>> {
    return unavailable();
  }

  ensureReadyReviewLink(): Promise<FirstPreviewRepositoryResult<FirstPreviewReviewRecord>> {
    return unavailable();
  }

  markOutputReady(): Promise<FirstPreviewRepositoryResult<FirstPreviewOutputRecord>> {
    return unavailable();
  }

  revokeOutput(): Promise<FirstPreviewRepositoryResult<FirstPreviewOutputRecord>> {
    return unavailable();
  }

  findJobByIdempotencyKey(): Promise<null> {
    return Promise.resolve(null);
  }

  findJobById(): Promise<null> {
    return Promise.resolve(null);
  }

  findCustomerReadyOutput(): Promise<null> {
    return Promise.resolve(null);
  }

  findReviewByConceptBriefId(): Promise<null> {
    return Promise.resolve(null);
  }
}

export function createUnavailableFirstPreviewRepository(): FirstPreviewRepository {
  return new UnavailableFirstPreviewRepository();
}
