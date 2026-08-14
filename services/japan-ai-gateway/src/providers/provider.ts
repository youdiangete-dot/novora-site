import type {
  FirstPreviewGatewayRequest,
  GatewayOutput,
  GatewayProviderName,
  GatewayUsage,
} from "../contracts.ts";

export type ProviderResult = Readonly<{
  providerRequestId: string | null;
  model: string;
  outputs: readonly GatewayOutput[];
  usage: GatewayUsage;
}>;

export class ProviderFailure extends Error {
  readonly kind: "timeout" | "failure";
  readonly safeCode: string;
  readonly retryable: boolean;

  constructor(options: {
    kind: "timeout" | "failure";
    safeCode: string;
    retryable: boolean;
  }) {
    super(options.safeCode);
    this.name = "ProviderFailure";
    this.kind = options.kind;
    this.safeCode = options.safeCode;
    this.retryable = options.retryable;
  }
}

export interface FirstPreviewProvider {
  readonly name: GatewayProviderName;
  generate(
    request: FirstPreviewGatewayRequest,
    signal: AbortSignal,
  ): Promise<ProviderResult>;
}
