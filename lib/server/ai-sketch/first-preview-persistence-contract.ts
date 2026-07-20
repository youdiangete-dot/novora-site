import { createHash } from "node:crypto";

export const FIRST_PREVIEW_PERSISTENCE_CONTRACT_VERSION =
  "novora_first_preview_persistence_v1" as const;
export const FIRST_PREVIEW_IDEMPOTENCY_VERSION =
  "novora:first-preview-idempotency:v1" as const;
export const FIRST_PREVIEW_LINEAGE_IDENTITY = "first-preview:v1" as const;

export type FirstPreviewJobStatus =
  | "queued"
  | "processing"
  | "succeeded"
  | "failed"
  | "timed_out"
  | "cancelled";

export type FirstPreviewAttemptNumber = 1 | 2;

export type FirstPreviewFailureCategory =
  | "provider_failure"
  | "invalid_output"
  | "asset_persistence_failure"
  | "automatic_gate_failure"
  | "timeout"
  | "cancelled";

export type FirstPreviewJobRecord = Readonly<{
  id: string;
  conceptBriefId: string;
  generationPurpose: "first_preview";
  attemptNumber: FirstPreviewAttemptNumber;
  idempotencyKey: string;
  lineageIdentity: typeof FIRST_PREVIEW_LINEAGE_IDENTITY;
  parentJobId: string | null;
  sourceOutputId: null;
  designSpecVersion: string;
  designSpecSha256: string;
  handSketchInstructionVersion: string;
  handSketchInstructionSha256: string;
  status: FirstPreviewJobStatus;
  failureCategory: FirstPreviewFailureCategory | null;
  retryEligible: boolean | null;
  createdAt: string;
  updatedAt: string;
}>;

export type FirstPreviewOutputRecord = Readonly<{
  id: string;
  jobId: string;
  conceptBriefId: string;
  assetId: string;
  assetPersisted: true;
  readinessStatus: "not_ready" | "first_preview_ready";
  isCurrentCustomerPreview: boolean;
  createdAt: string;
  readyAt: string | null;
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
  | "output_not_found"
  | "output_already_exists"
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
  designSpecVersion: string;
  designSpecSha256: string;
  handSketchInstructionVersion: string;
  handSketchInstructionSha256: string;
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
  source_output_id: null;
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
}>;

export type FirstPreviewAutomaticGateEvidence = Readonly<{
  outputValid: boolean;
  assetExists: boolean;
  ownershipConsistent: boolean;
  privacyPassed: boolean;
  customerAccessEligible: boolean;
  lifecycleEligible: boolean;
}>;

export type MarkFirstPreviewReadyInput = Readonly<{
  outputId: string;
  jobId: string;
  conceptBriefId: string;
  gates: FirstPreviewAutomaticGateEvidence;
}>;

export type RecordFirstPreviewJobFailureInput = Readonly<{
  category: FirstPreviewFailureCategory;
  retryEligible: boolean;
}>;

export interface FirstPreviewRepository {
  readonly kind: "unavailable" | "memory_fake";

  reserveJob(input: ReserveFirstPreviewJobInput): Promise<ReserveFirstPreviewJobResult>;

  startJob(
    jobId: string,
  ): Promise<FirstPreviewRepositoryResult<FirstPreviewJobRecord>>;

  recordJobSucceeded(
    jobId: string,
  ): Promise<FirstPreviewRepositoryResult<FirstPreviewJobRecord>>;

  recordJobFailure(
    jobId: string,
    failure: RecordFirstPreviewJobFailureInput,
  ): Promise<FirstPreviewRepositoryResult<FirstPreviewJobRecord>>;

  persistOutput(
    input: PersistFirstPreviewOutputInput,
  ): Promise<FirstPreviewRepositoryResult<FirstPreviewOutputRecord>>;

  markOutputReady(
    input: MarkFirstPreviewReadyInput,
  ): Promise<FirstPreviewRepositoryResult<FirstPreviewOutputRecord>>;

  findJobByIdempotencyKey(idempotencyKey: string): Promise<FirstPreviewJobRecord | null>;

  findCustomerReadyOutput(conceptBriefId: string): Promise<FirstPreviewOutputRecord | null>;
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
    (input.attemptNumber === 1 || input.attemptNumber === 2) &&
    (input.parentJobId === null || UUID_PATTERN.test(input.parentJobId)) &&
    isTrimmedSystemIdentifier(input.designSpecVersion) &&
    SHA256_PATTERN.test(input.designSpecSha256) &&
    isTrimmedSystemIdentifier(input.handSketchInstructionVersion) &&
    SHA256_PATTERN.test(input.handSketchInstructionSha256) &&
    (input.attemptNumber === 1
      ? input.parentJobId === null
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
    source_output_id: null,
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

  recordJobSucceeded(): Promise<FirstPreviewRepositoryResult<FirstPreviewJobRecord>> {
    return unavailable();
  }

  recordJobFailure(): Promise<FirstPreviewRepositoryResult<FirstPreviewJobRecord>> {
    return unavailable();
  }

  persistOutput(): Promise<FirstPreviewRepositoryResult<FirstPreviewOutputRecord>> {
    return unavailable();
  }

  markOutputReady(): Promise<FirstPreviewRepositoryResult<FirstPreviewOutputRecord>> {
    return unavailable();
  }

  findJobByIdempotencyKey(): Promise<null> {
    return Promise.resolve(null);
  }

  findCustomerReadyOutput(): Promise<null> {
    return Promise.resolve(null);
  }
}

export function createUnavailableFirstPreviewRepository(): FirstPreviewRepository {
  return new UnavailableFirstPreviewRepository();
}
