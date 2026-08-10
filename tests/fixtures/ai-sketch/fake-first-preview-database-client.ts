import type {
  FirstPreviewDatabaseClient,
  FirstPreviewJobRow,
  FirstPreviewOutputRow,
  FirstPreviewReviewRow,
} from "../../../lib/server/ai-sketch/supabase-first-preview-repository";

type Operation =
  | "insertJob"
  | "findJobById"
  | "findJobByIdempotencyKey"
  | "findJobByAttempt"
  | "findActiveJob"
  | "findJobByProviderRequestId"
  | "updateJob"
  | "claimProviderDispatch"
  | "claimProviderRequestIdentity"
  | "insertOutput"
  | "findOutputById"
  | "findOutputByJobId"
  | "findCustomerReadyOutput"
  | "updateOutput"
  | "insertReview"
  | "findReviewByConceptBriefId";

const FAKE_ERROR = { code: "FAKE_DATABASE_ERROR" };
const UNIQUE_ERROR = { code: "23505" };

export class FakeFirstPreviewDatabaseClient implements FirstPreviewDatabaseClient {
  readonly jobs = new Map<string, FirstPreviewJobRow>();
  readonly outputs = new Map<string, FirstPreviewOutputRow>();
  readonly reviews = new Map<string, FirstPreviewReviewRow>();
  readonly operations: Operation[] = [];
  readonly insertedJobRows: Record<string, unknown>[] = [];
  readonly insertedOutputRows: Record<string, unknown>[] = [];
  readonly insertedReviewRows: Record<string, unknown>[] = [];
  readonly jobUpdates: Record<string, unknown>[] = [];
  readonly outputUpdates: Record<string, unknown>[] = [];
  private readonly failures = new Set<Operation>();

  failNext(operation: Operation) {
    this.failures.add(operation);
  }

  async insertJob(row: Record<string, unknown>) {
    if (this.failed("insertJob")) return { data: null, error: FAKE_ERROR };
    this.insertedJobRows.push({ ...row });
    const id = String(row.id);
    const duplicate = [...this.jobs.values()].some(
      (job) =>
        job.id === id ||
        job.idempotency_key === row.idempotency_key ||
        (job.concept_brief_id === row.concept_brief_id &&
          job.generation_purpose === row.generation_purpose &&
          job.attempt_number === row.attempt_number) ||
        (job.concept_brief_id === row.concept_brief_id &&
          job.generation_purpose === row.generation_purpose &&
          ["queued", "processing"].includes(job.status)),
    );
    if (duplicate) return { data: null, error: UNIQUE_ERROR };
    const job: FirstPreviewJobRow = {
      ...(row as FirstPreviewJobRow),
      provider_request_id: null,
      actual_cost_micros: null,
      failure_category: null,
      retry_eligible: null,
      started_at: null,
      deadline_at: null,
      completed_at: null,
      failed_at: null,
      cancelled_at: null,
      timed_out_at: null,
    };
    this.jobs.set(job.id, job);
    return { data: { ...job }, error: null };
  }

  async findJobById(id: string) {
    if (this.failed("findJobById")) return { data: null, error: FAKE_ERROR };
    return { data: this.copy(this.jobs.get(id)), error: null };
  }

  async findJobByIdempotencyKey(key: string) {
    if (this.failed("findJobByIdempotencyKey")) return { data: null, error: FAKE_ERROR };
    return {
      data: this.copy([...this.jobs.values()].find((job) => job.idempotency_key === key)),
      error: null,
    };
  }

  async findJobByAttempt(conceptBriefId: string, attemptNumber: number) {
    if (this.failed("findJobByAttempt")) return { data: null, error: FAKE_ERROR };
    return {
      data: this.copy([...this.jobs.values()].find(
        (job) => job.concept_brief_id === conceptBriefId && job.attempt_number === attemptNumber,
      )),
      error: null,
    };
  }

  async findActiveJob(conceptBriefId: string) {
    if (this.failed("findActiveJob")) return { data: null, error: FAKE_ERROR };
    return {
      data: this.copy([...this.jobs.values()].find(
        (job) => job.concept_brief_id === conceptBriefId && ["queued", "processing"].includes(job.status),
      )),
      error: null,
    };
  }

  async findJobByProviderRequestId(requestId: string) {
    if (this.failed("findJobByProviderRequestId")) return { data: null, error: FAKE_ERROR };
    return {
      data: this.copy([...this.jobs.values()].find((job) => job.provider_request_id === requestId)),
      error: null,
    };
  }

  async updateJob(id: string, allowedStatuses: readonly string[], patch: Record<string, unknown>) {
    if (this.failed("updateJob")) return { data: null, error: FAKE_ERROR };
    this.jobUpdates.push({ id, allowedStatuses: [...allowedStatuses], patch: { ...patch } });
    const job = this.jobs.get(id);
    if (!job || !allowedStatuses.includes(job.status)) return { data: null, error: null };
    const updated = { ...job, ...patch } as FirstPreviewJobRow;
    this.jobs.set(id, updated);
    return { data: { ...updated }, error: null };
  }

  async claimProviderDispatch(id: string, actualCostMicros: number, updatedAt: string) {
    if (this.failed("claimProviderDispatch")) return { data: null, error: FAKE_ERROR };
    const job = this.jobs.get(id);
    if (!job || job.status !== "processing" || job.actual_cost_micros !== null) {
      return { data: null, error: null };
    }
    const updated = {
      ...job,
      actual_cost_micros: actualCostMicros,
      updated_at: updatedAt,
    } as FirstPreviewJobRow;
    this.jobs.set(id, updated);
    return { data: { ...updated }, error: null };
  }

  async claimProviderRequestIdentity(id: string, requestId: string, updatedAt: string) {
    if (this.failed("claimProviderRequestIdentity")) return { data: null, error: FAKE_ERROR };
    const job = this.jobs.get(id);
    if (!job || job.status !== "processing" || job.provider_request_id !== null) {
      return { data: null, error: null };
    }
    const updated = {
      ...job,
      provider_request_id: requestId,
      updated_at: updatedAt,
    } as FirstPreviewJobRow;
    this.jobs.set(id, updated);
    return { data: { ...updated }, error: null };
  }

  async insertOutput(row: Record<string, unknown>) {
    if (this.failed("insertOutput")) return { data: null, error: FAKE_ERROR };
    this.insertedOutputRows.push({ ...row });
    const duplicate = [...this.outputs.values()].some(
      (output) => output.id === row.id || output.job_id === row.job_id,
    );
    if (duplicate) return { data: null, error: UNIQUE_ERROR };
    const output = row as FirstPreviewOutputRow;
    this.outputs.set(output.id, output);
    return { data: { ...output }, error: null };
  }

  async findOutputById(id: string) {
    if (this.failed("findOutputById")) return { data: null, error: FAKE_ERROR };
    return { data: this.copy(this.outputs.get(id)), error: null };
  }

  async findOutputByJobId(jobId: string) {
    if (this.failed("findOutputByJobId")) return { data: null, error: FAKE_ERROR };
    return {
      data: this.copy([...this.outputs.values()].find((output) => output.job_id === jobId)),
      error: null,
    };
  }

  async findCustomerReadyOutput(conceptBriefId: string) {
    if (this.failed("findCustomerReadyOutput")) return { data: null, error: FAKE_ERROR };
    return {
      data: this.copy([...this.outputs.values()].find(
        (output) =>
          output.concept_brief_id === conceptBriefId &&
          output.readiness_status === "first_preview_ready" &&
          output.is_current_customer_preview,
      )),
      error: null,
    };
  }

  async updateOutput(
    identity: { id: string; jobId: string; conceptBriefId: string },
    allowedReadinessStatuses: readonly string[],
    patch: Record<string, unknown>,
  ) {
    if (this.failed("updateOutput")) return { data: null, error: FAKE_ERROR };
    this.outputUpdates.push({ identity: { ...identity }, allowedReadinessStatuses: [...allowedReadinessStatuses], patch: { ...patch } });
    const output = this.outputs.get(identity.id);
    if (
      !output || output.job_id !== identity.jobId ||
      output.concept_brief_id !== identity.conceptBriefId ||
      !allowedReadinessStatuses.includes(output.readiness_status ?? "")
    ) return { data: null, error: null };
    const updated = { ...output, ...patch } as FirstPreviewOutputRow;
    this.outputs.set(output.id, updated);
    return { data: { ...updated }, error: null };
  }

  async insertReview(row: Record<string, unknown>) {
    if (this.failed("insertReview")) return { data: null, error: FAKE_ERROR };
    this.insertedReviewRows.push({ ...row });
    const conceptBriefId = String(row.concept_brief_id);
    if (this.reviews.has(conceptBriefId)) return { data: null, error: UNIQUE_ERROR };
    const review: FirstPreviewReviewRow = {
      ai_sketch_output_id: String(row.ai_sketch_output_id),
      concept_brief_id: conceptBriefId,
      review_status: String(row.review_status),
      revision_instruction:
        typeof row.revision_instruction === "string"
          ? row.revision_instruction
          : null,
      created_at: "2026-07-22T00:00:30.000Z",
    };
    this.reviews.set(conceptBriefId, review);
    return { data: { ...review }, error: null };
  }

  async findReviewByConceptBriefId(conceptBriefId: string) {
    if (this.failed("findReviewByConceptBriefId")) return { data: null, error: FAKE_ERROR };
    return { data: this.copy(this.reviews.get(conceptBriefId)), error: null };
  }

  private failed(operation: Operation): boolean {
    this.operations.push(operation);
    if (!this.failures.has(operation)) return false;
    this.failures.delete(operation);
    return true;
  }

  private copy<T>(value: T | undefined): T | null {
    return value ? { ...value } : null;
  }
}
