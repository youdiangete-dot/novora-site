import type { GatewayProviderName } from "./contracts.ts";

export type GatewayConfig = Readonly<{
  provider: GatewayProviderName;
  gatewayToken: string;
  port: number;
  requestTimeoutMs: number;
  openAi: Readonly<{
    apiKey: string | null;
    model: string | null;
  }>;
}>;

function parseInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
  name: string,
): number {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${name} is invalid.`);
  }
  return parsed;
}

export function loadGatewayConfig(
  environment: NodeJS.ProcessEnv = process.env,
): GatewayConfig {
  const portValue = environment.PORT ?? environment.GATEWAY_PORT;
  const portName = environment.PORT === undefined ? "GATEWAY_PORT" : "PORT";
  const providerValue = environment.AI_PROVIDER?.trim() || "mock";
  if (providerValue !== "mock" && providerValue !== "openai") {
    throw new Error("AI_PROVIDER must be mock or openai.");
  }

  const gatewayToken = environment.NOVORA_GATEWAY_TOKEN?.trim() ?? "";
  if (gatewayToken.length < 32) {
    throw new Error("NOVORA_GATEWAY_TOKEN must be configured with at least 32 characters.");
  }

  const apiKey = environment.OPENAI_API_KEY?.trim() || null;
  const model = environment.OPENAI_IMAGE_MODEL?.trim() || null;
  if (providerValue === "openai") {
    if (apiKey === null || model === null) {
      throw new Error("OpenAI server configuration is incomplete.");
    }
    if (!/^[A-Za-z0-9._:-]{1,128}$/.test(model)) {
      throw new Error("OPENAI_IMAGE_MODEL is invalid.");
    }
  }

  return {
    provider: providerValue,
    gatewayToken,
    port: parseInteger(portValue, 8787, 1, 65_535, portName),
    requestTimeoutMs: parseInteger(
      environment.GATEWAY_REQUEST_TIMEOUT_MS,
      150_000,
      1_000,
      300_000,
      "GATEWAY_REQUEST_TIMEOUT_MS",
    ),
    openAi: { apiKey, model },
  };
}
