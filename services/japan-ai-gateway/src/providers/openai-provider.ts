import { createHash } from "node:crypto";
import type {
  FirstPreviewGatewayRequest,
  GatewayOutput,
  GatewayUsage,
} from "../contracts.ts";
import {
  ProviderFailure,
  type FirstPreviewProvider,
  type ProviderResult,
} from "./provider.ts";

const OPENAI_IMAGE_GENERATION_ENDPOINT =
  "https://api.openai.com/v1/images/generations";
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const CANONICAL_BASE64_PATTERN =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const SAFE_REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

type FetchImplementation = typeof fetch;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalNonNegativeInteger(value: unknown): number | null {
  return Number.isInteger(value) && (value as number) >= 0 ? (value as number) : null;
}

function buildStructuredPrompt(request: FirstPreviewGatewayRequest): string {
  return [
    "Create exactly one NOVORA hand-drawn jewelry concept preview from the structured data below.",
    "This is a concept direction only, not CAD, a quote, an order, payment approval, production approval, or a manufacturability guarantee.",
    "Use the Hand Sketch Instruction as the drawing authority. Preserve unresolved items instead of inventing final specifications.",
    JSON.stringify({
      design_spec: request.design_spec,
      hand_sketch_instruction: request.hand_sketch_instruction,
    }),
  ].join("\n\n");
}

function parsePngDimensions(bytes: Buffer): { width: number; height: number } | null {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (
    bytes.length < 24 ||
    !bytes.subarray(0, 8).equals(signature) ||
    bytes.toString("ascii", 12, 16) !== "IHDR"
  ) {
    return null;
  }
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  return width > 0 && height > 0 ? { width, height } : null;
}

function expectedDimensions(size: FirstPreviewGatewayRequest["generation_options"]["size"]) {
  const [width, height] = size.split("x").map(Number);
  return { width, height };
}

function normalizeUsage(value: unknown): GatewayUsage {
  const usage = isRecord(value) ? value : {};
  return {
    input_tokens: optionalNonNegativeInteger(usage.input_tokens),
    output_tokens: optionalNonNegativeInteger(usage.output_tokens),
    total_tokens: optionalNonNegativeInteger(usage.total_tokens),
    image_count: 1,
  };
}

function normalizeOutput(
  value: unknown,
  request: FirstPreviewGatewayRequest,
): GatewayOutput {
  if (!isRecord(value) || !Array.isArray(value.data) || value.data.length !== 1) {
    throw new ProviderFailure({ kind: "failure", safeCode: "invalid_provider_response", retryable: false });
  }
  const image = value.data[0];
  if (!isRecord(image) || typeof image.b64_json !== "string") {
    throw new ProviderFailure({ kind: "failure", safeCode: "invalid_provider_response", retryable: false });
  }

  const encoded = image.b64_json;
  if (
    encoded.length === 0 ||
    encoded.length % 4 !== 0 ||
    !CANONICAL_BASE64_PATTERN.test(encoded)
  ) {
    throw new ProviderFailure({ kind: "failure", safeCode: "invalid_image_encoding", retryable: false });
  }
  const bytes = Buffer.from(encoded, "base64");
  if (
    bytes.length === 0 ||
    bytes.length > MAX_IMAGE_BYTES ||
    bytes.toString("base64") !== encoded
  ) {
    throw new ProviderFailure({ kind: "failure", safeCode: "invalid_image_encoding", retryable: false });
  }
  const dimensions = parsePngDimensions(bytes);
  const expected = expectedDimensions(request.generation_options.size);
  if (
    dimensions === null ||
    dimensions.width !== expected.width ||
    dimensions.height !== expected.height
  ) {
    throw new ProviderFailure({ kind: "failure", safeCode: "invalid_image_dimensions", retryable: false });
  }

  return {
    output_id: `openai_${request.request_id}`,
    media_type: "image/png",
    encoding: "base64",
    data_base64: encoded,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    byte_length: bytes.length,
    width: dimensions.width,
    height: dimensions.height,
  };
}

export class OpenAiFirstPreviewProvider implements FirstPreviewProvider {
  readonly name = "openai" as const;
  readonly #apiKey: string;
  readonly #model: string;
  readonly #fetch: FetchImplementation;

  constructor(options: { apiKey: string; model: string; fetchImplementation?: FetchImplementation }) {
    this.#apiKey = options.apiKey;
    this.#model = options.model;
    this.#fetch = options.fetchImplementation ?? fetch;
  }

  async generate(
    request: FirstPreviewGatewayRequest,
    signal: AbortSignal,
  ): Promise<ProviderResult> {
    if (request.reference_assets.length > 0) {
      throw new ProviderFailure({
        kind: "failure",
        safeCode: "reference_assets_not_supported",
        retryable: false,
      });
    }

    let response: Response;
    try {
      response = await this.#fetch(OPENAI_IMAGE_GENERATION_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.#apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.#model,
          prompt: buildStructuredPrompt(request),
          n: 1,
          size: request.generation_options.size,
          quality: request.generation_options.quality,
          output_format: "png",
          background: request.generation_options.background,
          moderation: "auto",
        }),
        signal,
      });
    } catch (error) {
      if (signal.aborted || (error instanceof DOMException && error.name === "AbortError")) {
        throw new ProviderFailure({ kind: "timeout", safeCode: "provider_timeout", retryable: true });
      }
      throw new ProviderFailure({ kind: "failure", safeCode: "provider_network_failure", retryable: true });
    }

    const providerRequestIdHeader = response.headers.get("x-request-id");
    const providerRequestId =
      providerRequestIdHeader !== null && SAFE_REQUEST_ID_PATTERN.test(providerRequestIdHeader)
        ? providerRequestIdHeader
        : null;

    if (!response.ok) {
      throw new ProviderFailure({
        kind: response.status === 408 || response.status === 504 ? "timeout" : "failure",
        safeCode:
          response.status === 401
            ? "provider_authentication_failed"
            : response.status === 403
              ? "provider_permission_denied"
              : response.status === 429
                ? "provider_rate_limited"
                : response.status >= 500
                  ? "provider_unavailable"
                  : "provider_rejected_request",
        retryable: response.status === 408 || response.status === 429 || response.status >= 500,
      });
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new ProviderFailure({ kind: "failure", safeCode: "invalid_provider_response", retryable: false });
    }

    const output = normalizeOutput(payload, request);
    return {
      providerRequestId,
      model: this.#model,
      outputs: [output],
      usage: normalizeUsage(isRecord(payload) ? payload.usage : null),
    };
  }
}
