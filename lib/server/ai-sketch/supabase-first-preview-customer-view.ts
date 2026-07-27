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
  "status",
  "retry_eligible",
  "completed_at",
  "failed_at",
  "cancelled_at",
  "timed_out_at",
  "created_at",
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

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
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
  const assetValidatedAt = parseCanonicalUtcTimestampMicros(
    output.asset_validated_at,
  );
  const gatePassedAt = parseCanonicalUtcTimestampMicros(
    output.automatic_gate_passed_at,
  );
  const readyAt = parseCanonicalUtcTimestampMicros(
    output.first_preview_ready_at,
  );
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
    isIsoTimestamp(output.asset_created_at) &&
    assetValidatedAt !== null &&
    output.automatic_gate_status === "passed" &&
    output.automatic_gate_policy_version ===
      FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION &&
    hasPassedAutomaticGateEvidence(output.automatic_gate_evidence) &&
    gatePassedAt !== null &&
    readyAt !== null &&
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
  attemptNumber: 1 | 2;
  status:
    | "queued"
    | "processing"
    | "succeeded"
    | "failed"
    | "timed_out"
    | "cancelled";
  retryEligible: boolean | null;
  completedAt: string | null;
}>;

function mapSafeJob(
  value: unknown,
  conceptBriefId: string,
): SafeJob | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    !isValidFirstPreviewAssetUuid(value.id) ||
    value.concept_brief_id !== conceptBriefId ||
    value.generation_purpose !== "first_preview" ||
    (value.attempt_number !== 1 && value.attempt_number !== 2) ||
    ![
      "queued",
      "processing",
      "succeeded",
      "failed",
      "timed_out",
      "cancelled",
    ].includes(String(value.status)) ||
    (value.retry_eligible !== null &&
      typeof value.retry_eligible !== "boolean")
  ) {
    return null;
  }
  const hasNoTerminalTimestamp =
    value.completed_at === null &&
    value.failed_at === null &&
    value.cancelled_at === null &&
    value.timed_out_at === null;
  const validLifecycle =
    ((value.status === "queued" || value.status === "processing") &&
      hasNoTerminalTimestamp &&
      value.retry_eligible === null) ||
    (value.status === "succeeded" &&
      isIsoTimestamp(value.completed_at) &&
      value.failed_at === null &&
      value.cancelled_at === null &&
      value.timed_out_at === null &&
      value.retry_eligible === null) ||
    (value.status === "failed" &&
      value.completed_at === null &&
      isIsoTimestamp(value.failed_at) &&
      value.cancelled_at === null &&
      value.timed_out_at === null &&
      typeof value.retry_eligible === "boolean") ||
    (value.status === "timed_out" &&
      value.completed_at === null &&
      value.failed_at === null &&
      value.cancelled_at === null &&
      isIsoTimestamp(value.timed_out_at) &&
      value.retry_eligible === false) ||
    (value.status === "cancelled" &&
      value.completed_at === null &&
      value.failed_at === null &&
      isIsoTimestamp(value.cancelled_at) &&
      value.timed_out_at === null &&
      value.retry_eligible === false);
  if (!validLifecycle) {
    return null;
  }
  return {
    id: value.id,
    attemptNumber: value.attempt_number,
    status: value.status as SafeJob["status"],
    retryEligible: value.retry_eligible as boolean | null,
    completedAt:
      typeof value.completed_at === "string" ? value.completed_at : null,
  };
}

function hasSafeOutputLifecycle(
  value: unknown,
  conceptBriefId: string,
): value is Record<string, unknown> {
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
    typeof value.is_current_customer_preview !== "boolean"
  ) {
    return false;
  }
  if (value.readiness_status === "not_ready") {
    return (
      value.is_current_customer_preview === false &&
      value.readiness_revoked_at === null
    );
  }
  if (value.readiness_status === "revoked") {
    return (
      value.is_current_customer_preview === false &&
      isIsoTimestamp(value.readiness_revoked_at)
    );
  }
  return (
    value.is_current_customer_preview === true &&
    value.readiness_revoked_at === null
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
  constructor(private readonly database: FirstPreviewCustomerViewDatabaseClient) {}

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

      const outputs = outputResult.data;
      if (
        outputs.some(
          (output) => !hasSafeOutputLifecycle(output, lookup.conceptBriefId),
        )
      ) {
        return unavailable();
      }
      const jobs = jobResult.data.map((job) =>
        mapSafeJob(job, lookup.conceptBriefId),
      );
      if (
        jobs.some((job) => job === null) ||
        new Set(jobs.map((job) => job?.attemptNumber)).size !== jobs.length
      ) {
        return unavailable();
      }
      const safeJobs = jobs as SafeJob[];

      const readyCandidates = outputs.filter(
        (output) =>
          isRecord(output) &&
          output.readiness_status === "first_preview_ready" &&
          output.is_current_customer_preview === true &&
          output.readiness_revoked_at === null,
      );
      if (readyCandidates.length > 1) return unavailable();
      if (readyCandidates.length === 1) {
        const ready = readyCandidates[0] as Record<string, unknown>;
        if (!isValidReadyOutput(ready, lookup.conceptBriefId)) {
          return unavailable();
        }
        const job = safeJobs.find((candidate) => candidate.id === ready.job_id);
        if (!job || job.status !== "succeeded" || !job.completedAt) {
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
        outputs.some(
          (output) =>
            isRecord(output) &&
            (output.readiness_status === "revoked" ||
              output.readiness_revoked_at !== null),
        )
      ) {
        return unavailable();
      }
      if (
        safeJobs.length === 0 ||
        safeJobs.some(
          (job) => job.status === "queued" || job.status === "processing",
        ) ||
        safeJobs.some((job) => job.status === "succeeded")
      ) {
        return { state: "pending" } as const;
      }

      const latest = [...safeJobs].sort(
        (left, right) => right.attemptNumber - left.attemptNumber,
      )[0];
      return latest.status === "failed" &&
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
): FirstPreviewCustomerPreviewStateSource {
  return new SupabaseFirstPreviewCustomerViewStateSource(database);
}
