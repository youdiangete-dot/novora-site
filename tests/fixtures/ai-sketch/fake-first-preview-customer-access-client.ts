import type {
  FirstPreviewCustomerAccessDatabaseClient,
} from "../../../lib/server/ai-sketch/supabase-first-preview-customer-access";

type Operation = "brief" | "output" | "job";

export class FakeFirstPreviewCustomerAccessDatabaseClient
  implements FirstPreviewCustomerAccessDatabaseClient
{
  briefCandidates: readonly unknown[] = [];
  outputCandidates: readonly unknown[] = [];
  jobCandidates: readonly unknown[] = [];
  readonly requests: Array<Readonly<{
    operation: Operation;
    value: string;
    limit: 2;
  }>> = [];
  private readonly failures = new Set<Operation>();
  private readonly throws = new Set<Operation>();

  failNext(operation: Operation): void {
    this.failures.add(operation);
  }

  throwNext(operation: Operation): void {
    this.throws.add(operation);
  }

  async findBriefCandidates(publicReference: string, limit: 2) {
    return this.result("brief", publicReference, limit, this.briefCandidates);
  }

  async findOutputCandidates(outputId: string, limit: 2) {
    return this.result("output", outputId, limit, this.outputCandidates);
  }

  async findJobCandidates(jobId: string, limit: 2) {
    return this.result("job", jobId, limit, this.jobCandidates);
  }

  private result(
    operation: Operation,
    value: string,
    limit: 2,
    candidates: readonly unknown[],
  ) {
    this.requests.push({ operation, value, limit });
    if (this.throws.delete(operation)) {
      throw new Error("synthetic database exception must not escape");
    }
    if (this.failures.delete(operation)) {
      return {
        data: null,
        error: { kind: "unavailable" as const },
      };
    }
    return { data: candidates, error: null };
  }
}
