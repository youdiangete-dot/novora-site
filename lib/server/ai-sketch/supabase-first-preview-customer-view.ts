import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  FIRST_PREVIEW_GENERATED_ASSET_MAX_BYTES,
  deriveFirstPreviewGeneratedAssetId,
  isValidFirstPreviewAssetUuid,
  isValidFirstPreviewContentSha256,
  isValidFirstPreviewPublicReference,
} from "./first-preview-generated-assets-contract";
import {
  FIRST_PREVIEW_ASSET_BUCKET,
  FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION,
} from "./first-preview-persistence-contract";
import type {
  FirstPreviewCustomerPreviewStateLookup,
  FirstPreviewCustomerPreviewStateSource,
} from "./first-preview-customer-view";

export const FIRST_PREVIEW_CUSTOMER_VIEW_CANDIDATE_LIMIT = 3 as const;

type DatabaseError = Readonly<{ kind: "unavailable" }>;
type CandidateResult = Promise<
  Readonly<{ data: readonly unknown[] | null; error: DatabaseError | null }>
>;

export interface FirstPreviewCustomerViewDatabaseClient {
  findBriefCandidates(
    publicReference: string,
    limit: typeof FIRST_PREVIEW_CUSTOMER_VIEW_CANDIDATE_LIMIT,
  ): CandidateResult;
  findOutputCandidates(
    conceptBriefId: string,
    limit: typeof FIRST_PREVIEW_CUSTOMER_VIEW_CANDIDATE_LIMIT,
  ): CandidateResult;
  findJobCandidates(
    conceptBriefId: string,
    limit: typeof FIRST_PREVIEW_CUSTOMER_VIEW_CANDIDATE_LIMIT,
  ): CandidateResult;
}

const BRIEF_COLUMNS = "id, public_reference";
const OUTPUT_COLUMNS = [
  "id",
  "job_id",
  "concept_brief_id",
  "bucket_name",
  "object_path",
  "mime_type",
  "byte_size",
  "width_px",
  "height_px",
  "content_sha256",
  "asset_created_at",
  "asset_validation_status",
  "asset_validated_at",
  "automatic_gate_status",
  "automatic_gate_evidence",
  "automatic_gate_policy_version",
  "automatic_gate_passed_at",
  "readiness_status",
  "first_preview_ready_at",
  "readiness_revoked_at",
  "is_current_customer_preview",
  "created_at",
].join(", ");
const JOB_COLUMNS = [
  "id",
  "concept_brief_id",
  "generation_purpose",
  "attempt_number",
  "lineage_identity",
  "parent_job_id",
  "parent_generation_purpose",
  "parent_attempt_number",
  "source_output_id",
  "status",
  "failure_category",
  "retry_eligible",
  "terminal_reason",
  "started_at",
  "deadline_at",
  "completed_at",
  "failed_at",
  "cancelled_at",
  "timed_out_at",
  "created_at",
  "updated_at",
].join(", ");

function normalizeCandidates(
  data: unknown,
  error: unknown,
): Readonly<{ data: readonly unknown[] | null; error: DatabaseError | null }> {
  return !error &&
    Array.isArray(data) &&
    data.length <= FIRST_PREVIEW_CUSTOMER_VIEW_CANDIDATE_LIMIT
    ? { data, error: null }
    : { data: null, error: { kind: "unavailable" } };
}

export function createFirstPreviewCustomerViewDatabaseClient(
  supabase: SupabaseClient,
): FirstPreviewCustomerViewDatabaseClient {
  return {
    async findBriefCandidates(publicReference, limit) {
      try {
        const { data, error } = await supabase
          .from("concept_briefs")
          .select(BRIEF_COLUMNS)
          .eq("public_reference", publicReference)
          .limit(limit);
        return normalizeCandidates(data, error);
      } catch {
        return { data: null, error: { kind: "unavailable" } };
      }
    },
    async findOutputCandidates(conceptBriefId, limit) {
      try {
        const { data, error } = await supabase
          .from("ai_sketch_outputs")
          .select(OUTPUT_COLUMNS)
          .eq("concept_brief_id", conceptBriefId)
          .order("created_at", { ascending: true })
          .limit(limit);
        return normalizeCandidates(data, error);
      } catch {
        return { data: null, error: { kind: "unavailable" } };
      }
    },
    async findJobCandidates(conceptBriefId, limit) {
      try {
        const { data, error } = await supabase
          .from("ai_sketch_jobs")
          .select(JOB_COLUMNS)
          .eq("concept_brief_id", conceptBriefId)
          .eq("generation_purpose", "first_preview")
          .order("attempt_number", { ascending: true })
          .limit(limit);
        return normalizeCandidates(data, error);
      } catch {
        return { data: null, error: { kind: "unavailable" } };
      }
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readPositiveInteger(value: unknown): number | null {
  const normalized =
    typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  return Number.isSafeInteger(normalized) && Number(normalized) > 0
    ? Number(normalized)
    : null;
}

const CANONICAL_UTC_TIMESTAMP_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?(?:Z|\+00:00)$/;
const DAYS_BEFORE_MONTH = [
  0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334,
] as const;
const MICROSECONDS_PER_SECOND = BigInt(1_000_000);
const SECONDS_PER_DAY = BigInt(86_400);
const FIRST_PREVIEW_QUEUED_JOB_MAX_AGE_SECONDS = BigInt(1_800);
const FIRST_PREVIEW_FAILURE_CATEGORIES = new Set([
  "configuration_missing",
  "invalid_structured_input",
  "precondition_failed",
  "invalid_request",
  "authentication_failed",
  "permission_denied",
  "moderation_blocked",
  "rate_limited",
  "provider_unavailable",
  "network_failure",
  "timeout",
  "cancelled",
  "invalid_provider_response",
  "invalid_base64",
  "invalid_image_format",
  "invalid_image_dimensions",
  "image_too_large",
  "unsafe_output",
  "privacy_failure",
  "access_failure",
  "storage_failure",
  "lifecycle_conflict",
  "budget_blocked",
  "unexpected_provider_error",
]);
const FIRST_PREVIEW_RETRYABLE_FAILURE_CATEGORIES = new Set([
  "rate_limited",
  "provider_unavailable",
  "network_failure",
]);

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

function parseCanonicalUtcTimestampMicros(value: unknown): bigint | null {
  if (typeof value !== "string") return null;
  const match = CANONICAL_UTC_TIMESTAMP_PATTERN.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  if (
    month < 1 ||
    month > 12 ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return null;
  }
  const daysInMonth =
    month === 2 && isGregorianLeapYear(year)
      ? 29
      : ([31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const)[
          month - 1
        ];
  if (day < 1 || day > daysInMonth) return null;
  const daysSinceEpoch =
    daysBeforeGregorianYear(year) -
    daysBeforeGregorianYear(1970) +
    DAYS_BEFORE_MONTH[month - 1] +
    (month > 2 && isGregorianLeapYear(year) ? 1 : 0) +
    day -
    1;
  return (
    (BigInt(daysSinceEpoch) * SECONDS_PER_DAY +
      BigInt(hour * 3_600 + minute * 60 + second)) *
      MICROSECONDS_PER_SECOND +
    BigInt((match[7] ?? "").padEnd(6, "0") || "0")
  );
}

const AUTOMATIC_GATE_EVIDENCE_KEYS = [
  "result",
  "outputValid",
  "assetExists",
  "ownershipConsistent",
  "privacyPassed",
  "customerAccessEligible",
  "lifecycleEligible",
] as const;

function hasPassedAutomaticGateEvidence(value: unknown): boolean {
  return (
    isRecord(value) &&
    Object.keys(value).length === AUTOMATIC_GATE_EVIDENCE_KEYS.length &&
    AUTOMATIC_GATE_EVIDENCE_KEYS.every((key) =>
      Object.prototype.hasOwnProperty.call(value, key),
    ) &&
    value.result === "passed" &&
    value.outputValid === true &&
    value.assetExists === true &&
    value.ownershipConsistent === true &&
    value.privacyPassed === true &&
    value.customerAccessEligible === true &&
    value.lifecycleEligible === true
  );
}

function isValidReadyOutput(
  output: Record<string, unknown>,
  conceptBriefId: string,
): boolean {
  const byteSize = readPositiveInteger(output.byte_size);
  const assetCreatedAt = parseCanonicalUtcTimestampMicros(
    output.asset_created_at,
  );
  const assetValidatedAt = parseCanonicalUtcTimestampMicros(
    output.asset_validated_at,
  );
  const gatePassedAt = parseCanonicalUtcTimestampMicros(
    output.automatic_gate_passed_at,
  );
  const readyAt = parseCanonicalUtcTimestampMicros(
    output.first_preview_ready_at,
  );
  const createdAt = parseCanonicalUtcTimestampMicros(output.created_at);
  return (
    typeof output.id === "string" &&
    isValidFirstPreviewAssetUuid(output.id) &&
    typeof output.job_id === "string" &&
    isValidFirstPreviewAssetUuid(output.job_id) &&
    output.concept_brief_id === conceptBriefId &&
    output.readiness_status === "first_preview_ready" &&
    output.is_current_customer_preview === true &&
    output.readiness_revoked_at === null &&
    output.bucket_name === FIRST_PREVIEW_ASSET_BUCKET &&
    output.mime_type === "image/png" &&
    output.asset_validation_status === "passed" &&
    byteSize !== null &&
    byteSize <= FIRST_PREVIEW_GENERATED_ASSET_MAX_BYTES &&
    output.width_px === 1024 &&
    output.height_px === 1024 &&
    typeof output.content_sha256 === "string" &&
    isValidFirstPreviewContentSha256(output.content_sha256) &&
    assetCreatedAt !== null &&
    assetValidatedAt !== null &&
    output.automatic_gate_status === "passed" &&
    output.automatic_gate_policy_version ===
      FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION &&
    hasPassedAutomaticGateEvidence(output.automatic_gate_evidence) &&
    gatePassedAt !== null &&
    readyAt !== null &&
    createdAt !== null &&
    assetCreatedAt <= assetValidatedAt &&
    assetValidatedAt <= gatePassedAt &&
    gatePassedAt <= readyAt &&
    output.object_path ===
      deriveFirstPreviewGeneratedAssetId({
        conceptBriefId,
        jobId: output.job_id,
        outputId: output.id,
      })
  );
}

type SafeJob = Readonly<{
  id: string;
  parentJobId: string | null;
  attemptNumber: 1 | 2;
  status:
    | "queued"
    | "processing"
    | "succeeded"
    | "failed"
    | "timed_out"
    | "cancelled";
  retryEligible: boolean | null;
  createdAt: bigint;
  startedAt: bigint | null;
  deadlineAt: bigint | null;
  completedAt: bigint | null;
}>;

type SafeOutput = Readonly<{
  id: string;
  jobId: string;
  readinessStatus: "not_ready" | "first_preview_ready" | "revoked";
  assetValidationStatus: null | "pending" | "passed" | "failed";
  automaticGateStatus: null | "pending" | "passed" | "failed";
  assetValidatedAt: bigint | null;
  automaticGatePassedAt: bigint | null;
  readyAt: bigint | null;
}>;

function isNullableCanonicalTimestamp(value: unknown): boolean {
  return value === null || parseCanonicalUtcTimestampMicros(value) !== null;
}

function hasNullValues(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  return keys.every((key) => value[key] === null);
}

function hasNonblankString(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 512 &&
    value.length > 0 &&
    value === value.trim()
  );
}

function mapSafeJob(value: unknown, conceptBriefId: string): SafeJob | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    !isValidFirstPreviewAssetUuid(value.id) ||
    value.concept_brief_id !== conceptBriefId ||
    value.generation_purpose !== "first_preview" ||
    (value.attempt_number !== 1 && value.attempt_number !== 2) ||
    value.lineage_identity !== "first-preview:v1" ||
    value.source_output_id !== null ||
    ![
      "queued",
      "processing",
      "succeeded",
      "failed",
      "timed_out",
      "cancelled",
    ].includes(String(value.status)) ||
    (value.retry_eligible !== null &&
      typeof value.retry_eligible !== "boolean") ||
    !isNullableCanonicalTimestamp(value.started_at) ||
    !isNullableCanonicalTimestamp(value.deadline_at) ||
    !isNullableCanonicalTimestamp(value.completed_at) ||
    !isNullableCanonicalTimestamp(value.failed_at) ||
    !isNullableCanonicalTimestamp(value.cancelled_at) ||
    !isNullableCanonicalTimestamp(value.timed_out_at)
  ) {
    return null;
  }

  const createdAt = parseCanonicalUtcTimestampMicros(value.created_at);
  const updatedAt = parseCanonicalUtcTimestampMicros(value.updated_at);
  const startedAt = parseCanonicalUtcTimestampMicros(value.started_at);
  const deadlineAt = parseCanonicalUtcTimestampMicros(value.deadline_at);
  const completedAt = parseCanonicalUtcTimestampMicros(value.completed_at);
  const failedAt = parseCanonicalUtcTimestampMicros(value.failed_at);
  const cancelledAt = parseCanonicalUtcTimestampMicros(value.cancelled_at);
  const timedOutAt = parseCanonicalUtcTimestampMicros(value.timed_out_at);
  if (createdAt === null || updatedAt === null || updatedAt < createdAt) {
    return null;
  }
  if (
    [startedAt, completedAt, failedAt, cancelledAt, timedOutAt].some(
      (timestamp) =>
        timestamp !== null &&
        (timestamp < createdAt || timestamp > updatedAt),
    )
  ) {
    return null;
  }

  const parentJobId =
    typeof value.parent_job_id === "string" ? value.parent_job_id : null;
  const validLineage =
    (value.attempt_number === 1 &&
      value.parent_job_id === null &&
      value.parent_generation_purpose === null &&
      value.parent_attempt_number === null) ||
    (value.attempt_number === 2 &&
      parentJobId !== null &&
      isValidFirstPreviewAssetUuid(parentJobId) &&
      value.parent_generation_purpose === "first_preview" &&
      value.parent_attempt_number === 1);
  if (!validLineage) return null;

  const hasNoTerminalTimestamp = hasNullValues(value, [
    "completed_at",
    "failed_at",
    "cancelled_at",
    "timed_out_at",
  ]);
  const hasNoFailureState = hasNullValues(value, [
    "failure_category",
    "retry_eligible",
    "terminal_reason",
  ]);
  const hasValidAttemptWindow =
    startedAt !== null && deadlineAt !== null && deadlineAt > startedAt;
  const validLifecycle =
    (value.status === "queued" &&
      value.started_at === null &&
      value.deadline_at === null &&
      hasNoTerminalTimestamp &&
      hasNoFailureState) ||
    (value.status === "processing" &&
      hasValidAttemptWindow &&
      hasNoTerminalTimestamp &&
      hasNoFailureState) ||
    (value.status === "succeeded" &&
      hasValidAttemptWindow &&
      completedAt !== null &&
      completedAt >= startedAt! &&
      value.failed_at === null &&
      value.cancelled_at === null &&
      value.timed_out_at === null &&
      hasNoFailureState) ||
    (value.status === "failed" &&
      value.completed_at === null &&
      failedAt !== null &&
      value.cancelled_at === null &&
      value.timed_out_at === null &&
      hasNonblankString(value.failure_category) &&
      FIRST_PREVIEW_FAILURE_CATEGORIES.has(value.failure_category) &&
      value.failure_category !== "timeout" &&
      value.failure_category !== "cancelled" &&
      typeof value.retry_eligible === "boolean" &&
      (value.retry_eligible === false ||
        FIRST_PREVIEW_RETRYABLE_FAILURE_CATEGORIES.has(
          value.failure_category,
        )) &&
      hasNonblankString(value.terminal_reason) &&
      ((value.started_at === null &&
        value.deadline_at === null) ||
        (hasValidAttemptWindow && failedAt >= startedAt!))) ||
    (value.status === "timed_out" &&
      hasValidAttemptWindow &&
      value.completed_at === null &&
      value.failed_at === null &&
      value.cancelled_at === null &&
      timedOutAt !== null &&
      timedOutAt >= deadlineAt! &&
      value.failure_category === "timeout" &&
      value.retry_eligible === false &&
      hasNonblankString(value.terminal_reason)) ||
    (value.status === "cancelled" &&
      value.completed_at === null &&
      value.failed_at === null &&
      cancelledAt !== null &&
      value.timed_out_at === null &&
      value.failure_category === "cancelled" &&
      value.retry_eligible === false &&
      hasNonblankString(value.terminal_reason) &&
      ((value.started_at === null &&
        value.deadline_at === null) ||
        (hasValidAttemptWindow && cancelledAt >= startedAt!)));
  if (!validLifecycle) {
    return null;
  }
  return {
    id: value.id,
    parentJobId,
    attemptNumber: value.attempt_number,
    status: value.status as SafeJob["status"],
    retryEligible: value.retry_eligible as boolean | null,
    createdAt,
    startedAt,
    deadlineAt,
    completedAt,
  };
}

function mapSafeOutput(
  value: unknown,
  conceptBriefId: string,
): SafeOutput | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    !isValidFirstPreviewAssetUuid(value.id) ||
    typeof value.job_id !== "string" ||
    !isValidFirstPreviewAssetUuid(value.job_id) ||
    value.concept_brief_id !== conceptBriefId ||
    !["not_ready", "first_preview_ready", "revoked"].includes(
      String(value.readiness_status),
    ) ||
    typeof value.is_current_customer_preview !== "boolean" ||
    ![null, "pending", "passed", "failed"].includes(
      value.asset_validation_status as null | string,
    ) ||
    ![null, "pending", "passed", "failed"].includes(
      value.automatic_gate_status as null | string,
    ) ||
    parseCanonicalUtcTimestampMicros(value.created_at) === null
  ) {
    return null;
  }

  const assetCreatedAt = parseCanonicalUtcTimestampMicros(
    value.asset_created_at,
  );
  const assetValidatedAt = parseCanonicalUtcTimestampMicros(
    value.asset_validated_at,
  );
  const gatePassedAt = parseCanonicalUtcTimestampMicros(
    value.automatic_gate_passed_at,
  );
  const readyAt = parseCanonicalUtcTimestampMicros(
    value.first_preview_ready_at,
  );
  const revokedAt = parseCanonicalUtcTimestampMicros(
    value.readiness_revoked_at,
  );

  const validAssetValidation =
    (value.asset_validation_status === null &&
      value.asset_created_at === null &&
      value.asset_validated_at === null) ||
    ((value.asset_validation_status === "pending" ||
      value.asset_validation_status === "failed") &&
      assetCreatedAt !== null &&
      value.asset_validated_at === null) ||
    (value.asset_validation_status === "passed" &&
      assetCreatedAt !== null &&
      assetValidatedAt !== null &&
      assetCreatedAt <= assetValidatedAt);
  if (!validAssetValidation) return null;

  const validAutomaticGate =
    (value.automatic_gate_status === null &&
      value.automatic_gate_evidence === null &&
      value.automatic_gate_policy_version === null &&
      value.automatic_gate_passed_at === null) ||
    (value.automatic_gate_status === "pending" &&
      value.asset_validation_status === "passed" &&
      hasNonblankString(value.automatic_gate_policy_version) &&
      value.automatic_gate_evidence === null &&
      value.automatic_gate_passed_at === null) ||
    (value.automatic_gate_status === "failed" &&
      value.asset_validation_status === "passed" &&
      hasNonblankString(value.automatic_gate_policy_version) &&
      isRecord(value.automatic_gate_evidence) &&
      Object.keys(value.automatic_gate_evidence).length > 0 &&
      value.automatic_gate_passed_at === null) ||
    (value.automatic_gate_status === "passed" &&
      value.asset_validation_status === "passed" &&
      value.automatic_gate_policy_version ===
        FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION &&
      hasPassedAutomaticGateEvidence(value.automatic_gate_evidence) &&
      gatePassedAt !== null &&
      assetValidatedAt !== null &&
      assetValidatedAt <= gatePassedAt);
  if (!validAutomaticGate) return null;

  let validReadiness = false;
  if (value.readiness_status === "not_ready") {
    validReadiness =
      value.is_current_customer_preview === false &&
      value.first_preview_ready_at === null &&
      value.readiness_revoked_at === null;
  } else if (value.readiness_status === "revoked") {
    validReadiness =
      value.is_current_customer_preview === false &&
      readyAt !== null &&
      revokedAt !== null &&
      gatePassedAt !== null &&
      gatePassedAt <= readyAt &&
      readyAt <= revokedAt;
  } else {
    validReadiness =
      value.is_current_customer_preview === true &&
      value.readiness_revoked_at === null &&
      readyAt !== null &&
      gatePassedAt !== null &&
      gatePassedAt <= readyAt &&
      isValidReadyOutput(value, conceptBriefId);
  }
  if (!validReadiness) return null;

  return {
    id: value.id,
    jobId: value.job_id,
    readinessStatus: value.readiness_status as SafeOutput["readinessStatus"],
    assetValidationStatus:
      value.asset_validation_status as SafeOutput["assetValidationStatus"],
    automaticGateStatus:
      value.automatic_gate_status as SafeOutput["automaticGateStatus"],
    assetValidatedAt,
    automaticGatePassedAt: gatePassedAt,
    readyAt,
  };
}

function hasValidCandidateLineage(
  jobs: readonly SafeJob[],
  outputs: readonly SafeOutput[],
): boolean {
  if (
    new Set(jobs.map((job) => job.id)).size !== jobs.length ||
    new Set(jobs.map((job) => job.attemptNumber)).size !== jobs.length ||
    new Set(outputs.map((output) => output.id)).size !== outputs.length ||
    new Set(outputs.map((output) => output.jobId)).size !== outputs.length
  ) {
    return false;
  }

  const orderedJobs = [...jobs].sort(
    (left, right) => left.attemptNumber - right.attemptNumber,
  );
  if (
    orderedJobs.length > 0 &&
    orderedJobs[0].attemptNumber !== 1
  ) {
    return false;
  }
  if (orderedJobs.length === 2) {
    const [first, second] = orderedJobs;
    if (
      second.attemptNumber !== 2 ||
      second.parentJobId !== first.id ||
      first.status !== "failed" ||
      first.retryEligible !== true
    ) {
      return false;
    }
  }

  const jobsById = new Map(jobs.map((job) => [job.id, job]));
  if (outputs.some((output) => !jobsById.has(output.jobId))) return false;
  if (
    jobs.some(
      (job) =>
        job.status === "queued" &&
        outputs.some((output) => output.jobId === job.id),
    )
  ) {
    return false;
  }
  if (
    jobs.some(
      (job) =>
        job.status === "succeeded" &&
        outputs.filter((output) => output.jobId === job.id).length !== 1,
    )
  ) {
    return false;
  }

  const activeJobs = jobs.filter(
    (job) => job.status === "queued" || job.status === "processing",
  );
  return (
    activeJobs.length <= 1 &&
    (activeJobs.length === 0 ||
      activeJobs[0].attemptNumber ===
        Math.max(...jobs.map((job) => job.attemptNumber)))
  );
}

function unavailable() {
  return { state: "unavailable" } as const;
}

class UnavailableFirstPreviewCustomerViewStateSource
  implements FirstPreviewCustomerPreviewStateSource
{
  readonly readExactCustomerPreviewState = () => unavailable();
}

export function createUnavailableFirstPreviewCustomerViewStateSource(): FirstPreviewCustomerPreviewStateSource {
  return new UnavailableFirstPreviewCustomerViewStateSource();
}

export class SupabaseFirstPreviewCustomerViewStateSource
  implements FirstPreviewCustomerPreviewStateSource
{
  private readonly clock: () => number;

  constructor(
    private readonly database: FirstPreviewCustomerViewDatabaseClient,
    options: Readonly<{ clock?: () => number }> = {},
  ) {
    this.clock = options.clock ?? (() => Math.floor(Date.now() / 1_000));
  }

  readonly readExactCustomerPreviewState = async (
    lookup: FirstPreviewCustomerPreviewStateLookup,
  ) => {
    try {
      if (
        !isValidFirstPreviewAssetUuid(lookup.conceptBriefId) ||
        !isValidFirstPreviewPublicReference(lookup.publicReference)
      ) {
        return unavailable();
      }

      const briefResult = await this.database.findBriefCandidates(
        lookup.publicReference,
        FIRST_PREVIEW_CUSTOMER_VIEW_CANDIDATE_LIMIT,
      );
      if (
        briefResult.error ||
        briefResult.data?.length !== 1 ||
        !isRecord(briefResult.data[0]) ||
        briefResult.data[0].id !== lookup.conceptBriefId ||
        briefResult.data[0].public_reference !== lookup.publicReference
      ) {
        return unavailable();
      }

      const [outputResult, jobResult] = await Promise.all([
        this.database.findOutputCandidates(
          lookup.conceptBriefId,
          FIRST_PREVIEW_CUSTOMER_VIEW_CANDIDATE_LIMIT,
        ),
        this.database.findJobCandidates(
          lookup.conceptBriefId,
          FIRST_PREVIEW_CUSTOMER_VIEW_CANDIDATE_LIMIT,
        ),
      ]);
      if (
        outputResult.error ||
        jobResult.error ||
        !outputResult.data ||
        !jobResult.data ||
        outputResult.data.length > 2 ||
        jobResult.data.length > 2
      ) {
        return unavailable();
      }

      const outputs = outputResult.data.map((output) =>
        mapSafeOutput(output, lookup.conceptBriefId),
      );
      if (outputs.some((output) => output === null)) {
        return unavailable();
      }
      const jobs = jobResult.data.map((job) =>
        mapSafeJob(job, lookup.conceptBriefId),
      );
      if (jobs.some((job) => job === null)) {
        return unavailable();
      }
      const safeOutputs = outputs as SafeOutput[];
      const safeJobs = jobs as SafeJob[];
      if (!hasValidCandidateLineage(safeJobs, safeOutputs)) {
        return unavailable();
      }

      const nowEpochSeconds = this.clock();
      if (
        !Number.isSafeInteger(nowEpochSeconds) ||
        nowEpochSeconds < 0 ||
        Object.is(nowEpochSeconds, -0)
      ) {
        return unavailable();
      }
      const nowMicros =
        BigInt(nowEpochSeconds) * MICROSECONDS_PER_SECOND;
      if (safeJobs.some((job) => job.createdAt > nowMicros)) {
        return unavailable();
      }

      const readyCandidates = safeOutputs.filter(
        (output) => output.readinessStatus === "first_preview_ready",
      );
      if (readyCandidates.length > 1) return unavailable();
      if (readyCandidates.length === 1) {
        if (safeOutputs.length !== 1) return unavailable();
        const ready = readyCandidates[0];
        const job = safeJobs.find((candidate) => candidate.id === ready.jobId);
        if (
          !job ||
          job.status !== "succeeded" ||
          job.completedAt === null ||
          ready.assetValidatedAt === null ||
          ready.automaticGatePassedAt === null ||
          ready.readyAt === null ||
          ready.assetValidatedAt > job.completedAt ||
          job.completedAt > ready.automaticGatePassedAt
        ) {
          return unavailable();
        }
        return {
          state: "ready",
          conceptBriefId: lookup.conceptBriefId,
          publicReference: lookup.publicReference,
          outputId: ready.id,
          readinessStatus: "first_preview_ready",
          isCurrentCustomerPreview: true,
          readinessRevokedAt: null,
          authorizationEligible: true,
        } as const;
      }

      if (
        safeOutputs.some(
          (output) =>
            output.readinessStatus === "revoked" ||
            output.assetValidationStatus === "failed" ||
            output.automaticGateStatus === "failed" ||
            (output.readinessStatus === "not_ready" &&
              output.automaticGateStatus === "passed"),
        )
      ) {
        return unavailable();
      }

      const activeJobs = safeJobs.filter(
        (job) => job.status === "queued" || job.status === "processing",
      );
      if (activeJobs.length === 1) {
        const active = activeJobs[0];
        const isStale =
          active.status === "queued"
            ? nowMicros - active.createdAt >
              FIRST_PREVIEW_QUEUED_JOB_MAX_AGE_SECONDS *
                MICROSECONDS_PER_SECOND
            : active.deadlineAt === null || nowMicros > active.deadlineAt;
        if (isStale) return unavailable();
        return { state: "pending" } as const;
      }

      const latest = [...safeJobs].sort(
        (left, right) => right.attemptNumber - left.attemptNumber,
      )[0];
      if (!latest) return unavailable();

      if (latest.status === "succeeded") {
        const linkedOutput = safeOutputs.find(
          (output) => output.jobId === latest.id,
        );
        return safeOutputs.length === 1 &&
          linkedOutput?.readinessStatus === "not_ready" &&
          linkedOutput.assetValidationStatus === "passed" &&
          linkedOutput.assetValidatedAt !== null &&
          latest.completedAt !== null &&
          linkedOutput.assetValidatedAt <= latest.completedAt &&
          (linkedOutput.automaticGateStatus === null ||
            linkedOutput.automaticGateStatus === "pending")
          ? ({ state: "pending" } as const)
          : unavailable();
      }

      return safeJobs.length === 1 &&
        safeOutputs.length === 0 &&
        latest.status === "failed" &&
        latest.attemptNumber === 1 &&
        latest.retryEligible === true
        ? ({ state: "pending" } as const)
        : unavailable();
    } catch {
      return unavailable();
    }
  };
}

export function createSupabaseFirstPreviewCustomerViewStateSource(
  database: FirstPreviewCustomerViewDatabaseClient,
  options: Readonly<{ clock?: () => number }> = {},
): FirstPreviewCustomerPreviewStateSource {
  return new SupabaseFirstPreviewCustomerViewStateSource(database, options);
}
