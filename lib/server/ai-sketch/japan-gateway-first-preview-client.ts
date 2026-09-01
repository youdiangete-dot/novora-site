import "server-only";

import { createHash, randomUUID } from "node:crypto";

import type { FirstPreviewValidatedUsage } from "./first-preview-cost-contract";
import { FIRST_PREVIEW_PROVIDER_PROFILE } from "./first-preview-persistence-contract";
import type {
  FirstPreviewProviderAdapterResult,
  FirstPreviewProviderBinding,
} from "./first-preview-provider-binding";
import {
  FIRST_PREVIEW_PROVIDER_CONTRACT_VERSION,
  type FirstPreviewProviderRequest,
} from "./first-preview-runtime";

export const JAPAN_GATEWAY_URL_ENV_NAME =
  "NOVORA_JAPAN_AI_GATEWAY_URL" as const;
export const JAPAN_GATEWAY_TOKEN_ENV_NAME =
  "NOVORA_JAPAN_AI_GATEWAY_TOKEN" as const;
export const JAPAN_GATEWAY_CONTRACT_VERSION =
  "novora_gateway_first_preview_v1" as const;

const JAPAN_GATEWAY_FIRST_PREVIEW_PATH = "/v1/first-preview";
const MAX_SUCCESS_RESPONSE_CHARACTERS = 24 * 1024 * 1024;
const MAX_ERROR_RESPONSE_CHARACTERS = 32 * 1024;
const MAX_IMAGE_BYTES = 16 * 1024 * 1024;
const MAX_REQUEST_BODY_CHARACTERS = 512 * 1024;
const SAFE_PROVIDER_REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;
const SAFE_MODEL_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const CANONICAL_BASE64_PATTERN =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const NETWORK_ERROR_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ENOTFOUND",
  "EAI_AGAIN",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_SOCKET",
]);
const SENSITIVE_VALUE_PATTERNS = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /\bNOVORA-CB-\d{8}-[A-Z0-9]{4}\b/,
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i,
  /\bsk-[A-Za-z0-9_-]{8,}\b/,
  /\b(?:OPENAI_API_KEY|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_DATABASE_URL|NOVORA_JAPAN_AI_GATEWAY_TOKEN)\s*[:=]/i,
  /(?:https?:\/\/|s3:\/\/|gs:\/\/|\/storage\/v1\/object|novora-ai-sketches\/)/i,
  /(?:\+?\d[\d\s().-]{7,}\d)/,
] as const;

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

type GatewayRequest = Readonly<{
  contract_version: typeof JAPAN_GATEWAY_CONTRACT_VERSION;
  request_id: string;
  design_spec: JsonValue;
  hand_sketch_instruction: JsonValue;
  reference_assets: readonly [];
  generation_options: Readonly<{
    size: "1024x1024";
    quality: "medium";
    output_format: "png";
    background: "opaque";
  }>;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return (
    actual.length === sortedExpected.length &&
    actual.every((key, index) => key === sortedExpected[index])
  );
}

function isNonnegativeSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

function boundedText(value: unknown, maximumLength: number): string | null {
  return typeof value === "string" &&
    value.length > 0 &&
    value.length <= maximumLength &&
    !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)
    ? value
    : null;
}

function boundedStrings(
  values: readonly unknown[],
  maximumItems: number,
  maximumItemLength: number,
): string[] | null {
  if (values.length > maximumItems) return null;
  const result: string[] = [];
  for (const value of values) {
    const text = boundedText(value, maximumItemLength);
    if (text === null) return null;
    result.push(text);
  }
  return result;
}

function containsSensitiveValue(value: JsonValue): boolean {
  if (typeof value === "string") {
    return SENSITIVE_VALUE_PATTERNS.some((pattern) => pattern.test(value));
  }
  if (Array.isArray(value)) return value.some(containsSensitiveValue);
  if (isRecord(value)) {
    return Object.values(value).some((child) =>
      containsSensitiveValue(child as JsonValue),
    );
  }
  return false;
}

function mapPieceType(
  pieceType: FirstPreviewProviderRequest["designSpec"]["piece_type"],
): "ring" | "pendant" | "earrings" | "bracelet" | "other" {
  if (pieceType === "ring") return "ring";
  if (pieceType === "pendant_necklace") return "pendant";
  if (pieceType === "earrings") return "earrings";
  if (pieceType === "bracelet_bangle") return "bracelet";
  return "other";
}

function mapViewType(
  viewType: FirstPreviewProviderRequest["handSketchInstruction"]["views"][number]["view_type"],
): "front" | "side" | "top" | "perspective" | "detail" {
  if (viewType === "main_hero_view") return "perspective";
  if (viewType === "optional_side_profile_view") return "side";
  if (viewType === "optional_top_or_detail_view") return "top";
  return "detail";
}

function buildGatewayRequest(
  request: FirstPreviewProviderRequest,
  requestId: string,
): GatewayRequest | null {
  if (
    request.contractVersion !== FIRST_PREVIEW_PROVIDER_CONTRACT_VERSION ||
    request.purpose !== "first_preview" ||
    request.imageCount !== 1 ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      requestId,
    )
  ) {
    return null;
  }

  const design = request.designSpec;
  const instruction = request.handSketchInstruction;
  const intent = boundedText(design.customer_intent_summary, 2_000);
  const styleKeywords = boundedStrings(
    design.design_direction.style_keywords,
    12,
    100,
  );
  const form = boundedText(design.jewelry_structure.primary_form, 1_000);
  const composition = boundedText(
    instruction.composition_instructions.layout,
    1_000,
  );
  const dimensionParts = [
    instruction.dimension_and_scale_notes.approximate_size,
    instruction.dimension_and_scale_notes.ring_size_if_applicable,
    instruction.dimension_and_scale_notes.pendant_scale_if_applicable,
  ].filter((value) => typeof value === "string" && value.length > 0);
  const dimensionSummary = boundedText(dimensionParts.join("; "), 1_000);
  const unresolved = boundedStrings(
    [
      ...instruction.dimension_and_scale_notes.unknown_or_to_confirm,
      ...design.materials.unknown_or_to_confirm,
    ],
    24,
    500,
  );
  const productionConstraints = boundedStrings(
    design.production_feasibility_notes,
    24,
    500,
  );
  const views = instruction.views.map((view) => ({
    view: mapViewType(view.view_type),
    required: view.required,
    instruction: view.instruction,
  }));
  if (
    views.length < 1 ||
    views.length > 8 ||
    views.some((view) => boundedText(view.instruction, 1_000) === null)
  ) {
    return null;
  }

  const lineStyle = boundedText(
    instruction.sheet_style.consistent_line_weight
      ? "Consistent line weight with a clean jewelry hand-sketch feel."
      : "Clean jewelry hand-sketch line work.",
    500,
  );
  const background = boundedText(
    instruction.sheet_style.warm_light_background
      ? "Warm light background."
      : "Neutral opaque background.",
    500,
  );
  const branding = boundedText(
    instruction.brand_placement.placement_instruction,
    500,
  );

  const drawingInstructions = boundedStrings(
    [
      instruction.jewelry_rendering_instructions.primary_form,
      instruction.jewelry_rendering_instructions.setting_logic,
      ...instruction.jewelry_rendering_instructions.construction_consistency,
      ...instruction.jewelry_rendering_instructions.material_rendering_direction,
      ...instruction.jewelry_rendering_instructions.production_feasibility_reminders,
      instruction.stone_and_setting_instructions.center_stone,
      instruction.stone_and_setting_instructions.side_stones,
      instruction.stone_and_setting_instructions.repeated_stones,
      instruction.stone_and_setting_instructions.stone_color_direction,
      instruction.stone_and_setting_instructions.stone_shape_direction,
      instruction.stone_and_setting_instructions.stone_size_relationship,
      instruction.stone_and_setting_instructions.setting_logic,
      ...instruction.stone_and_setting_instructions.special_stone_rules,
      ...instruction.motif_instructions.motif_planning,
      instruction.motif_instructions.motif_placement,
      instruction.motif_instructions.motif_to_structure_relationship,
    ],
    32,
    1_000,
  );
  const annotations = boundedStrings(
    instruction.annotation_instructions.labels.map(
      (label) => `${label.label}: ${label.target} — ${label.instruction}`,
    ),
    32,
    1_000,
  );
  const mustInclude = boundedStrings(
    [
      ...design.design_direction.style_keywords,
      ...instruction.motif_instructions.motif_types,
    ],
    32,
    1_000,
  );
  const mustAvoid = boundedStrings(
    instruction.negative_constraints,
    32,
    1_000,
  );
  const disclaimer = boundedText(
    `${instruction.disclaimer_instructions.required_label}. Concept preview only; not CAD, a quote, an order approval, a payment approval, or a production approval.`,
    1_000,
  );

  if (
    intent === null ||
    styleKeywords === null ||
    styleKeywords.length < 1 ||
    form === null ||
    composition === null ||
    dimensionSummary === null ||
    unresolved === null ||
    productionConstraints === null ||
    lineStyle === null ||
    background === null ||
    branding === null ||
    drawingInstructions === null ||
    annotations === null ||
    mustInclude === null ||
    mustAvoid === null ||
    disclaimer === null
  ) {
    return null;
  }

  const designSpec: JsonValue = {
    spec_version: "1",
    language: design.language,
    piece_type: mapPieceType(design.piece_type),
    normalized_intent_summary: intent,
    design_direction: {
      style_keywords: styleKeywords,
      form,
      composition,
    },
    materials: [],
    stones: [],
    dimensions: {
      summary: dimensionSummary,
      unknown_or_to_confirm: unresolved,
    },
    production_constraints: productionConstraints,
    unresolved_items: unresolved,
  };
  const handSketchInstruction: JsonValue = {
    instruction_version: "1",
    design_spec_version: "1",
    language: instruction.language,
    views,
    sheet_style: {
      line_style: lineStyle,
      background,
      branding,
    },
    drawing_instructions: drawingInstructions,
    annotations,
    must_include: mustInclude,
    must_avoid: mustAvoid,
    disclaimer,
  };

  if (
    design.language !== instruction.language ||
    containsSensitiveValue(designSpec) ||
    containsSensitiveValue(handSketchInstruction)
  ) {
    return null;
  }

  return {
    contract_version: JAPAN_GATEWAY_CONTRACT_VERSION,
    request_id: requestId,
    design_spec: designSpec,
    hand_sketch_instruction: handSketchInstruction,
    reference_assets: [],
    generation_options: {
      size: "1024x1024",
      quality: "medium",
      output_format: "png",
      background: "opaque",
    },
  };
}

function readGatewayConfiguration(
  environment: Readonly<Record<string, string | undefined>>,
): Readonly<{ endpoint: string; token: string }> | null {
  const urlValue = environment[JAPAN_GATEWAY_URL_ENV_NAME];
  const token = environment[JAPAN_GATEWAY_TOKEN_ENV_NAME];
  if (
    typeof urlValue !== "string" ||
    urlValue !== urlValue.trim() ||
    typeof token !== "string" ||
    token !== token.trim() ||
    token.length < 32 ||
    token.length > 512 ||
    !/^[^\s]+$/.test(token)
  ) {
    return null;
  }

  try {
    const url = new URL(urlValue);
    if (
      url.protocol !== "https:" ||
      url.username !== "" ||
      url.password !== "" ||
      (url.pathname !== "" && url.pathname !== "/") ||
      url.search !== "" ||
      url.hash !== ""
    ) {
      return null;
    }
    return {
      endpoint: `${url.origin}${JAPAN_GATEWAY_FIRST_PREVIEW_PATH}`,
      token,
    };
  } catch {
    return null;
  }
}

async function readBoundedJson(
  response: Response,
  maximumCharacters: number,
): Promise<unknown> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maximumCharacters) {
    throw new Error("Gateway response exceeded the safe size boundary.");
  }
  const text = await response.text();
  if (text.length === 0 || text.length > maximumCharacters) {
    throw new Error("Gateway response was unavailable.");
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("Gateway response was invalid.");
  }
}

function failure(
  category: Extract<FirstPreviewProviderAdapterResult, { ok: false }>["category"],
  retryEligible =
    category === "rate_limited" ||
    category === "provider_unavailable" ||
    category === "network_failure",
): FirstPreviewProviderAdapterResult {
  return { ok: false, category, retryEligible };
}

function normalizeFailureResponse(
  status: number,
  value: unknown,
): FirstPreviewProviderAdapterResult {
  if (status === 401) return failure("authentication_failed", false);
  if (status === 403) return failure("permission_denied", false);
  if (status === 429) return failure("rate_limited", true);
  if (status === 408 || status === 504) return failure("timeout", false);
  if (status === 400) return failure("invalid_request", false);

  if (
    status === 502 &&
    isRecord(value) &&
    value.contract_version === JAPAN_GATEWAY_CONTRACT_VERSION &&
    value.status === "provider_error" &&
    isRecord(value.error) &&
    typeof value.error.retryable === "boolean"
  ) {
    return value.error.retryable
      ? failure("provider_unavailable", true)
      : failure("unexpected_provider_error", false);
  }
  if (status >= 500 && status <= 599) {
    return failure("provider_unavailable", true);
  }
  return failure("unexpected_provider_error", false);
}

function readValidatedUsage(value: unknown): FirstPreviewValidatedUsage | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "input_tokens",
      "output_tokens",
      "total_tokens",
      "image_count",
    ]) ||
    !isNonnegativeSafeInteger(value.input_tokens) ||
    !isNonnegativeSafeInteger(value.output_tokens) ||
    !isNonnegativeSafeInteger(value.total_tokens) ||
    value.total_tokens !== value.input_tokens + value.output_tokens ||
    value.image_count !== 1
  ) {
    return null;
  }
  return {
    textInputTokens: value.input_tokens,
    imageOutputTokens: value.output_tokens,
  };
}

function normalizeSuccessResponse(
  value: unknown,
  expectedRequestId: string,
): Readonly<{
  result: FirstPreviewProviderAdapterResult;
  usage: FirstPreviewValidatedUsage | null;
  providerRequestId: string | null;
}> {
  const invalid = () => ({
    result: failure("invalid_provider_response", false),
    usage: null,
    providerRequestId: null,
  });
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "contract_version",
      "request_id",
      "status",
      "provider",
      "provider_request_id",
      "model",
      "outputs",
      "usage",
      "error",
    ]) ||
    value.contract_version !== JAPAN_GATEWAY_CONTRACT_VERSION ||
    value.request_id !== expectedRequestId ||
    value.status !== "success" ||
    value.provider !== "openai" ||
    value.error !== null ||
    value.model !== FIRST_PREVIEW_PROVIDER_PROFILE.modelName ||
    !SAFE_MODEL_PATTERN.test(value.model) ||
    !Array.isArray(value.outputs) ||
    value.outputs.length !== 1 ||
    !isRecord(value.outputs[0])
  ) {
    return invalid();
  }

  const output = value.outputs[0];
  if (
    !hasExactKeys(output, [
      "output_id",
      "media_type",
      "encoding",
      "data_base64",
      "sha256",
      "byte_length",
      "width",
      "height",
    ]) ||
    typeof output.output_id !== "string" ||
    !SAFE_PROVIDER_REQUEST_ID_PATTERN.test(output.output_id) ||
    output.media_type !== "image/png" ||
    output.encoding !== "base64" ||
    typeof output.data_base64 !== "string" ||
    output.data_base64.length === 0 ||
    output.data_base64.length % 4 !== 0 ||
    !CANONICAL_BASE64_PATTERN.test(output.data_base64) ||
    typeof output.sha256 !== "string" ||
    !SHA256_PATTERN.test(output.sha256) ||
    !isNonnegativeSafeInteger(output.byte_length) ||
    output.byte_length < 1 ||
    output.byte_length > MAX_IMAGE_BYTES ||
    output.width !== 1024 ||
    output.height !== 1024
  ) {
    return invalid();
  }

  const bytes = Buffer.from(output.data_base64, "base64");
  if (
    bytes.length !== output.byte_length ||
    bytes.length > MAX_IMAGE_BYTES ||
    bytes.toString("base64") !== output.data_base64 ||
    !bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE) ||
    createHash("sha256").update(bytes).digest("hex") !== output.sha256
  ) {
    return invalid();
  }

  const providerRequestId =
    typeof value.provider_request_id === "string" &&
    SAFE_PROVIDER_REQUEST_ID_PATTERN.test(value.provider_request_id)
      ? value.provider_request_id
      : value.provider_request_id === null
        ? null
        : undefined;
  if (providerRequestId === undefined) return invalid();

  return {
    result: {
      ok: true,
      imageBase64: output.data_base64,
      mimeType: "image/png",
      width: 1024,
      height: 1024,
      byteSize: bytes.length,
      model: value.model,
      providerRequestId,
    },
    usage: readValidatedUsage(value.usage),
    providerRequestId,
  };
}

function normalizeNetworkError(
  error: unknown,
  signal: AbortSignal,
): FirstPreviewProviderAdapterResult {
  const code = isRecord(error) && typeof error.code === "string" ? error.code : null;
  const name = isRecord(error) && typeof error.name === "string" ? error.name : null;
  if (signal.aborted || name === "AbortError" || code === "ABORT_ERR") {
    return failure("cancelled", false);
  }
  if (name === "TimeoutError" || code === "ETIMEDOUT") {
    return failure("timeout", false);
  }
  if (error instanceof TypeError || (code !== null && NETWORK_ERROR_CODES.has(code))) {
    return failure("network_failure", true);
  }
  return failure("unexpected_provider_error", false);
}

export function createJapanGatewayFirstPreviewProviderBinding(options: {
  environment?: Readonly<Record<string, string | undefined>>;
  fetchImplementation?: typeof fetch;
  requestIdSource?: () => string;
} = {}): FirstPreviewProviderBinding | null {
  const configuration = readGatewayConfiguration(
    options.environment ?? process.env,
  );
  if (!configuration) return null;

  const fetchImplementation = options.fetchImplementation ?? fetch;
  const requestIdSource = options.requestIdSource ?? randomUUID;
  let usage: FirstPreviewValidatedUsage | null = null;
  let providerRequestId: string | null = null;

  return {
    adapter: {
      async generateFirstPreviewImage(request, context) {
        if (context.signal.aborted) return failure("cancelled", false);

        const requestId = requestIdSource();
        const gatewayRequest = buildGatewayRequest(request, requestId);
        if (!gatewayRequest) return failure("invalid_request", false);
        const body = JSON.stringify(gatewayRequest);
        if (body.length > MAX_REQUEST_BODY_CHARACTERS) {
          return failure("invalid_request", false);
        }

        let response: Response;
        try {
          response = await fetchImplementation(configuration.endpoint, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${configuration.token}`,
              "Content-Type": "application/json",
            },
            body,
            signal: context.signal,
          });
        } catch (error) {
          return normalizeNetworkError(error, context.signal);
        }

        let value: unknown;
        try {
          value = await readBoundedJson(
            response,
            response.ok
              ? MAX_SUCCESS_RESPONSE_CHARACTERS
              : MAX_ERROR_RESPONSE_CHARACTERS,
          );
        } catch {
          return failure("invalid_provider_response", false);
        }

        if (!response.ok) return normalizeFailureResponse(response.status, value);

        const normalized = normalizeSuccessResponse(value, requestId);
        usage = normalized.usage;
        providerRequestId = normalized.providerRequestId;
        return normalized.result;
      },
    },
    readValidatedUsage: () => usage,
    readProviderRequestId: () => providerRequestId,
  };
}
