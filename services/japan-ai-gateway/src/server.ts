import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { pathToFileURL } from "node:url";
import { isAuthorized } from "./auth.ts";
import { loadGatewayConfig, type GatewayConfig } from "./config.ts";
import {
  GATEWAY_CONTRACT_VERSION,
  type FirstPreviewGatewayResponse,
  type GatewayError,
  type GatewayProviderName,
  type GatewayStatus,
} from "./contracts.ts";
import { MockFirstPreviewProvider } from "./providers/mock-provider.ts";
import { OpenAiFirstPreviewProvider } from "./providers/openai-provider.ts";
import {
  ProviderFailure,
  type FirstPreviewProvider,
} from "./providers/provider.ts";
import { validateGatewayRequest } from "./validation.ts";

const MAX_REQUEST_BODY_BYTES = 512 * 1024;

function writeJson(response: ServerResponse, statusCode: number, body: unknown) {
  response.writeHead(statusCode, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(body));
}

function gatewayResponse(options: {
  requestId: string | null;
  status: GatewayStatus;
  provider: GatewayProviderName | null;
  error: GatewayError;
}): FirstPreviewGatewayResponse {
  return {
    contract_version: GATEWAY_CONTRACT_VERSION,
    request_id: options.requestId,
    status: options.status,
    provider: options.provider,
    provider_request_id: null,
    model: null,
    outputs: [],
    usage: null,
    error: options.error,
  };
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  let bytesRead = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytesRead += buffer.length;
    if (bytesRead > MAX_REQUEST_BODY_BYTES) {
      throw new Error("request_too_large");
    }
    chunks.push(buffer);
  }
  if (bytesRead === 0) throw new Error("empty_request");
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function createProvider(config: GatewayConfig): FirstPreviewProvider {
  if (config.provider === "mock") return new MockFirstPreviewProvider();
  if (config.openAi.apiKey === null || config.openAi.model === null) {
    throw new Error("OpenAI provider configuration is unavailable.");
  }
  return new OpenAiFirstPreviewProvider({
    apiKey: config.openAi.apiKey,
    model: config.openAi.model,
  });
}

export function createGatewayServer(config: GatewayConfig) {
  const provider = createProvider(config);

  return createServer(async (request, response) => {
    const pathname = new URL(request.url ?? "/", "http://gateway.invalid").pathname;

    if (request.method === "GET" && pathname === "/healthz") {
      writeJson(response, 200, { status: "ok", service: "japan-ai-gateway" });
      return;
    }

    if (request.method !== "POST" || pathname !== "/v1/first-preview") {
      writeJson(response, 404, { status: "not_found" });
      return;
    }

    if (!isAuthorized(request.headers.authorization, config.gatewayToken)) {
      writeJson(
        response,
        401,
        gatewayResponse({
          requestId: null,
          status: "unauthorized",
          provider: null,
          error: { code: "unauthorized", message: "Gateway authorization failed.", retryable: false },
        }),
      );
      return;
    }

    if (!(request.headers["content-type"] ?? "").toLowerCase().startsWith("application/json")) {
      writeJson(
        response,
        400,
        gatewayResponse({
          requestId: null,
          status: "invalid_request",
          provider: provider.name,
          error: { code: "invalid_request", message: "Content-Type must be application/json.", retryable: false },
        }),
      );
      return;
    }

    let requestBody: unknown;
    try {
      requestBody = await readJsonBody(request);
    } catch {
      writeJson(
        response,
        400,
        gatewayResponse({
          requestId: null,
          status: "invalid_request",
          provider: provider.name,
          error: { code: "invalid_request", message: "Request body is invalid.", retryable: false },
        }),
      );
      return;
    }

    const validation = validateGatewayRequest(requestBody);
    if (!validation.ok) {
      writeJson(
        response,
        400,
        gatewayResponse({
          requestId: validation.requestId,
          status: "invalid_request",
          provider: provider.name,
          error: { code: "invalid_request", message: "Request failed Gateway Contract v1 validation.", retryable: false },
        }),
      );
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);
    try {
      const result = await provider.generate(validation.value, controller.signal);
      const body: FirstPreviewGatewayResponse = {
        contract_version: GATEWAY_CONTRACT_VERSION,
        request_id: validation.value.request_id,
        status: "success",
        provider: provider.name,
        provider_request_id: result.providerRequestId,
        model: result.model,
        outputs: result.outputs,
        usage: result.usage,
        error: null,
      };
      writeJson(response, 200, body);
    } catch (error) {
      if (error instanceof ProviderFailure) {
        const timedOut = error.kind === "timeout";
        writeJson(
          response,
          timedOut ? 504 : 502,
          gatewayResponse({
            requestId: validation.value.request_id,
            status: timedOut ? "timeout" : "provider_error",
            provider: provider.name,
            error: {
              code: timedOut ? "provider_timeout" : "provider_failure",
              message: timedOut ? "Provider request timed out." : "Provider request failed.",
              retryable: error.retryable,
            },
          }),
        );
      } else {
        writeJson(
          response,
          500,
          gatewayResponse({
            requestId: validation.value.request_id,
            status: "provider_error",
            provider: provider.name,
            error: {
              code: "unexpected_internal_failure",
              message: "Gateway request failed safely.",
              retryable: false,
            },
          }),
        );
      }
    } finally {
      clearTimeout(timeout);
    }
  });
}

function start() {
  try {
    const config = loadGatewayConfig();
    const server = createGatewayServer(config);
    server.listen(config.port, "0.0.0.0");
  } catch {
    console.error("Japan AI Gateway failed to start.");
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  start();
}
