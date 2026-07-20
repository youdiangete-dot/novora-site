// Server-only persistence contract. Do not import this module from Client
// Components. The default repository deliberately performs no external I/O.

export const FIRST_PREVIEW_PERSISTENCE_CONTRACT_VERSION =
  "novora_first_preview_persistence_v1" as const;

export type FirstPreviewJobStatus =
  | "queued"
  | "processing"
  | "succeeded"
  | "failed"
  | "timed_out"
  | "cancelled";

export type FirstPreviewAttemptNumber = 1 | 2;

export type FirstPreviewJobRecord = Readonly<{
  id: string;
  conceptBriefId: string;
  generationPurpose: "first_preview";
  attemptNumber: FirstPreviewAttemptNumber;
  idempotencyKey: string;
  parentJobId: string | null;
  status: FirstPreviewJobStatus;
  failureCategory: FirstPreviewFailureCategory | null;
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

export type FirstPreviewFailureCategory =
  | "provider_failure"
  | "invalid_output"
  | "asset_persistence_failure"
  | "automatic_gate_failure"
  | "timeout"
  | "cancelled";

export type FirstPreviewRepositoryFailureCode =
  | "repository_unavailable"
  | "invalid_input"
  | "idempotency_conflict"
  | "attempt_identity_conflict"
  | "active_job_exists"
  | "job_not_found"
  | "job_not_active"
  | "parent_job_invalid"
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
  idempotencyKey: string;
  parentJobId: string | null;
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
    category: FirstPreviewFailureCategory,
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

function unavailable<T>(): Promise<FirstPreviewRepositoryResult<T>> {
  return Promise.resolve({ ok: false, code: "repository_unavailable" });
}

class FailClosedFirstPreviewRepository implements FirstPreviewRepository {
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

export function createFirstPreviewRepository(): FirstPreviewRepository {
  return new FailClosedFirstPreviewRepository();
}
