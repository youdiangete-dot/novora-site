// Server-only OpenAI Image API adapter foundation.
// Keep this module out of Client Components and application routes. It accepts
// an injected, already-constructed client and never reads credentials or uses
// the network directly.

import {
  FIRST_PREVIEW_PROVIDER_CONTRACT_VERSION,
  type FirstPreviewProviderRequest,
} from "./first-preview-runtime";

export const OPENAI_FIRST_PREVIEW_MODEL =
  "gpt-image-2-2026-04-21" as const;
export const OPENAI_FIRST_PREVIEW_TIMEOUT_MS = 150_000;
export const OPENAI_API_KEY_ENV_NAME = "OPENAI_API_KEY" as const;
export const OPENAI_FIRST_PREVIEW_MAX_IMAGE_BYTES = 16 * 1024 * 1024;

export type OpenAiApiKeyConfiguration =
  | {
      status: "configured";
      variableName: typeof OPENAI_API_KEY_ENV_NAME;
    }
  | {
      status: "missing";
      variableName: typeof OPENAI_API_KEY_ENV_NAME;
    };

export type OpenAiImageGenerateRequest = {
  model: typeof OPENAI_FIRST_PREVIEW_MODEL;
  prompt: string;
  n: 1;
  size: "1024x1024";
  quality: "medium";
  output_format: "png";
  moderation: "auto";
};

export interface OpenAiImageClient {
  images: {
    generate(
      request: OpenAiImageGenerateRequest,
      options?: { signal?: AbortSignal },
    ): Promise<unknown>;
  };
}

export type OpenAiFirstPreviewFailureCategory =
  | "configuration_missing"
  | "invalid_request"
  | "authentication_failed"
  | "permission_denied"
  | "moderation_blocked"
  | "rate_limited"
  | "provider_unavailable"
  | "network_failure"
  | "timeout"
  | "cancelled"
  | "invalid_provider_response"
  | "invalid_base64"
  | "invalid_image_format"
  | "invalid_image_dimensions"
  | "image_too_large"
  | "unexpected_provider_error";

export type OpenAiFirstPreviewAdapterResult =
  | {
      ok: true;
      imageBase64: string;
      mimeType: "image/png";
      width: 1024;
      height: 1024;
      byteSize: number;
      model: typeof OPENAI_FIRST_PREVIEW_MODEL;
      providerRequestId: string | null;
    }
  | {
      ok: false;
      category: OpenAiFirstPreviewFailureCategory;
      retryEligible: boolean;
    };

export interface OpenAiFirstPreviewProviderAdapter {
  generateFirstPreviewImage(
    request: FirstPreviewProviderRequest,
    context: { signal: AbortSignal },
  ): Promise<OpenAiFirstPreviewAdapterResult>;
}

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const MAX_PROMPT_LENGTH = 32_000;
const CANONICAL_BASE64_PATTERN =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const SAFE_PROVIDER_REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;
const SENSITIVE_VALUE_PATTERNS = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /\bNOVORA-CB-\d{8}-[A-Z0-9]{4}\b/,
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i,
  /\bsk-[A-Za-z0-9_-]{8,}\b/,
  /\b(?:OPENAI_API_KEY|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_DATABASE_URL)\s*[:=]/i,
  /(?:https?:\/\/|s3:\/\/|gs:\/\/|\/storage\/v1\/object|novora-ai-sketches\/)/i,
  /(?:\+?\d[\d\s().-]{7,}\d)/,
] as const;
const NETWORK_ERROR_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ENOTFOUND",
  "EAI_AGAIN",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_SOCKET",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function failure(
  category: OpenAiFirstPreviewFailureCategory,
): OpenAiFirstPreviewAdapterResult {
  return {
    ok: false,
    category,
    retryEligible:
      category === "rate_limited" ||
      category === "provider_unavailable" ||
      category === "network_failure",
  };
}

export function validateOpenAiApiKeyConfiguration(
  environment: Readonly<Record<string, string | undefined>>,
): OpenAiApiKeyConfiguration {
  const configured =
    typeof environment[OPENAI_API_KEY_ENV_NAME] === "string" &&
    environment[OPENAI_API_KEY_ENV_NAME]!.trim().length > 0;

  return {
    status: configured ? "configured" : "missing",
    variableName: OPENAI_API_KEY_ENV_NAME,
  };
}

function selectAllowedHandSketchInstruction(
  request: FirstPreviewProviderRequest,
): JsonValue {
  const instruction = request.handSketchInstruction;

  return {
    instruction_version: instruction.instruction_version,
    design_spec_version: instruction.design_spec_version,
    language: instruction.language,
    sheet_style: {
      style_version: instruction.sheet_style.style_version,
      warm_light_background: instruction.sheet_style.warm_light_background,
      consistent_line_weight: instruction.sheet_style.consistent_line_weight,
      clean_jewelry_hand_sketch_feel:
        instruction.sheet_style.clean_jewelry_hand_sketch_feel,
      main_view_plus_optional_detail_views:
        instruction.sheet_style.main_view_plus_optional_detail_views,
      clear_annotations_and_callouts:
        instruction.sheet_style.clear_annotations_and_callouts,
      subtle_text_only_novora_watermark_or_footer_label:
        instruction.sheet_style
          .subtle_text_only_novora_watermark_or_footer_label,
      concept_preview_label: instruction.sheet_style.concept_preview_label,
      disclaimer_placement: instruction.sheet_style.disclaimer_placement,
      no_cad_drawing_framing:
        instruction.sheet_style.no_cad_drawing_framing,
      no_quote_order_or_production_approval_framing:
        instruction.sheet_style
          .no_quote_order_or_production_approval_framing,
    },
    brand_placement: {
      novora_text_watermark_allowed:
        instruction.brand_placement.novora_text_watermark_allowed,
      official_logo_asset_path_remains_separate_if_not_documented:
        instruction.brand_placement
          .official_logo_asset_path_remains_separate_if_not_documented,
      logo_or_brand_mark_must_not_be_jewelry_structure:
        instruction.brand_placement
          .logo_or_brand_mark_must_not_be_jewelry_structure,
      logo_or_brand_mark_must_not_cover_jewelry_annotations_or_view_labels:
        instruction.brand_placement
          .logo_or_brand_mark_must_not_cover_jewelry_annotations_or_view_labels,
      placement_instruction:
        instruction.brand_placement.placement_instruction,
    },
    views: instruction.views.map((view) => ({
      view_type: view.view_type,
      required: view.required,
      instruction: view.instruction,
    })),
    jewelry_rendering_instructions: {
      piece_type: instruction.jewelry_rendering_instructions.piece_type,
      primary_form: instruction.jewelry_rendering_instructions.primary_form,
      construction_consistency: [
        ...instruction.jewelry_rendering_instructions
          .construction_consistency,
      ],
      setting_logic: instruction.jewelry_rendering_instructions.setting_logic,
      setting_treatments: [
        ...instruction.jewelry_rendering_instructions.setting_treatments,
      ],
      material_rendering_direction: [
        ...instruction.jewelry_rendering_instructions
          .material_rendering_direction,
      ],
      production_feasibility_reminders: [
        ...instruction.jewelry_rendering_instructions
          .production_feasibility_reminders,
      ],
      structure_risk_flags: [
        ...instruction.jewelry_rendering_instructions.structure_risk_flags,
      ],
    },
    stone_and_setting_instructions: {
      center_stone: instruction.stone_and_setting_instructions.center_stone,
      side_stones: instruction.stone_and_setting_instructions.side_stones,
      repeated_stones:
        instruction.stone_and_setting_instructions.repeated_stones,
      stone_color_direction:
        instruction.stone_and_setting_instructions.stone_color_direction,
      stone_shape_direction:
        instruction.stone_and_setting_instructions.stone_shape_direction,
      stone_size_relationship:
        instruction.stone_and_setting_instructions.stone_size_relationship,
      setting_logic: instruction.stone_and_setting_instructions.setting_logic,
      special_stone_rules: [
        ...instruction.stone_and_setting_instructions.special_stone_rules,
      ],
    },
    motif_instructions: {
      motif_types: [...instruction.motif_instructions.motif_types],
      motif_planning: [...instruction.motif_instructions.motif_planning],
      motif_placement: instruction.motif_instructions.motif_placement,
      motif_to_structure_relationship:
        instruction.motif_instructions.motif_to_structure_relationship,
      avoid_impossible_motif_construction:
        instruction.motif_instructions.avoid_impossible_motif_construction,
      motif_must_not_conflict_with_setting_or_wearability:
        instruction.motif_instructions
          .motif_must_not_conflict_with_setting_or_wearability,
    },
    annotation_instructions: {
      callout_style: instruction.annotation_instructions.callout_style,
      labels: instruction.annotation_instructions.labels.map((label) => ({
        label: label.label,
        target: label.target,
        instruction: label.instruction,
      })),
      avoid_pricing_cad_production_or_approval_claims:
        instruction.annotation_instructions
          .avoid_pricing_cad_production_or_approval_claims,
    },
    dimension_and_scale_notes: {
      approximate_size:
        instruction.dimension_and_scale_notes.approximate_size,
      ring_size_if_applicable:
        instruction.dimension_and_scale_notes.ring_size_if_applicable,
      pendant_scale_if_applicable:
        instruction.dimension_and_scale_notes.pendant_scale_if_applicable,
      unknown_or_to_confirm: [
        ...instruction.dimension_and_scale_notes.unknown_or_to_confirm,
      ],
    },
    composition_instructions: {
      layout: instruction.composition_instructions.layout,
      main_view_priority:
        instruction.composition_instructions.main_view_priority,
      detail_views_optional:
        instruction.composition_instructions.detail_views_optional,
      keep_disclaimer_and_branding_outside_jewelry:
        instruction.composition_instructions
          .keep_disclaimer_and_branding_outside_jewelry,
    },
    disclaimer_instructions: {
      required_label: instruction.disclaimer_instructions.required_label,
      concept_preview_only:
        instruction.disclaimer_instructions.concept_preview_only,
      not_cad: instruction.disclaimer_instructions.not_cad,
      not_quote: instruction.disclaimer_instructions.not_quote,
      not_order_approval:
        instruction.disclaimer_instructions.not_order_approval,
      not_payment_approval:
        instruction.disclaimer_instructions.not_payment_approval,
      not_production_approval:
        instruction.disclaimer_instructions.not_production_approval,
    },
    negative_constraints: [...instruction.negative_constraints],
  };
}

function isSupportedJsonValue(value: unknown): value is JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return true;
  }

  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  if (Array.isArray(value)) {
    return value.every(isSupportedJsonValue);
  }

  if (isRecord(value)) {
    return Object.values(value).every(isSupportedJsonValue);
  }

  return false;
}

function containsSensitiveValue(value: JsonValue): boolean {
  if (typeof value === "string") {
    return SENSITIVE_VALUE_PATTERNS.some((pattern) => pattern.test(value));
  }

  if (Array.isArray(value)) {
    return value.some(containsSensitiveValue);
  }

  if (isRecord(value)) {
    return Object.values(value).some((child) =>
      containsSensitiveValue(child as JsonValue),
    );
  }

  return false;
}

function sortJsonValue(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map(sortJsonValue);
  }

  if (isRecord(value)) {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, JsonValue>>((sorted, key) => {
        sorted[key] = sortJsonValue(value[key] as JsonValue);
        return sorted;
      }, {});
  }

  return value;
}

function buildOpenAiRequest(
  request: FirstPreviewProviderRequest,
): OpenAiImageGenerateRequest | null {
  if (
    request.contractVersion !== FIRST_PREVIEW_PROVIDER_CONTRACT_VERSION ||
    request.purpose !== "first_preview" ||
    request.imageCount !== 1
  ) {
    return null;
  }

  try {
    const allowedInstruction = selectAllowedHandSketchInstruction(request);

    if (
      !isSupportedJsonValue(allowedInstruction) ||
      containsSensitiveValue(allowedInstruction)
    ) {
      return null;
    }

    const prompt = [
      "NOVORA internal first-preview image instruction.",
      "Create exactly one AI hand-drawn jewelry concept sketch sheet.",
      "Treat the result as an early concept direction only, not CAD, a quotation, payment confirmation, order approval, production approval, or a manufacturability guarantee.",
      "Use only this validated, privacy-minimized Hand Sketch Instruction JSON:",
      JSON.stringify(sortJsonValue(allowedInstruction)),
    ].join("\n");

    if (prompt.length > MAX_PROMPT_LENGTH) {
      return null;
    }

    return {
      model: OPENAI_FIRST_PREVIEW_MODEL,
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "medium",
      output_format: "png",
      moderation: "auto",
    };
  } catch {
    return null;
  }
}

function readErrorCode(error: unknown): string | null {
  if (!isRecord(error)) {
    return null;
  }

  if (typeof error.code === "string") {
    return error.code;
  }

  return isRecord(error.error) && typeof error.error.code === "string"
    ? error.error.code
    : null;
}

function readErrorStatus(error: unknown): number | null {
  if (!isRecord(error)) {
    return null;
  }

  if (typeof error.status === "number") {
    return error.status;
  }

  return isRecord(error.error) && typeof error.error.status === "number"
    ? error.error.status
    : null;
}

function normalizeProviderError(
  error: unknown,
  signal: AbortSignal,
): OpenAiFirstPreviewAdapterResult {
  const code = readErrorCode(error);
  const status = readErrorStatus(error);
  const name = isRecord(error) && typeof error.name === "string" ? error.name : null;

  if (signal.aborted || name === "AbortError" || code === "ABORT_ERR") {
    return failure("cancelled");
  }

  if (code === "moderation_blocked") {
    return failure("moderation_blocked");
  }

  if (name === "TimeoutError" || code === "ETIMEDOUT") {
    return failure("timeout");
  }

  if (status === 400) {
    return failure("invalid_request");
  }
  if (status === 401) {
    return failure("authentication_failed");
  }
  if (status === 403) {
    return failure("permission_denied");
  }
  if (status === 429) {
    return failure("rate_limited");
  }
  if (status !== null && status >= 500 && status <= 599) {
    return failure("provider_unavailable");
  }
  if (
    error instanceof TypeError ||
    (code !== null && NETWORK_ERROR_CODES.has(code))
  ) {
    return failure("network_failure");
  }

  return failure("unexpected_provider_error");
}

function extractSafeProviderRequestId(response: Record<string, unknown>) {
  const candidate = response._request_id ?? response.request_id;

  return typeof candidate === "string" &&
    SAFE_PROVIDER_REQUEST_ID_PATTERN.test(candidate)
    ? candidate
    : null;
}

function readPngDimensions(bytes: Buffer):
  | { ok: true; width: number; height: number }
  | { ok: false } {
  if (bytes.length < 45 || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return { ok: false };
  }

  let offset = 8;
  let width: number | null = null;
  let height: number | null = null;
  let sawIdat = false;
  let sawIend = false;

  while (offset < bytes.length) {
    if (offset + 12 > bytes.length) {
      return { ok: false };
    }

    const chunkLength = bytes.readUInt32BE(offset);
    const chunkEnd = offset + 12 + chunkLength;

    if (chunkEnd > bytes.length) {
      return { ok: false };
    }

    const chunkType = bytes.toString("ascii", offset + 4, offset + 8);

    if (offset === 8) {
      if (chunkType !== "IHDR" || chunkLength !== 13) {
        return { ok: false };
      }
      width = bytes.readUInt32BE(offset + 8);
      height = bytes.readUInt32BE(offset + 12);
    } else if (chunkType === "IHDR") {
      return { ok: false };
    }

    if (chunkType === "IDAT") {
      sawIdat = true;
    }

    if (chunkType === "IEND") {
      if (chunkLength !== 0 || chunkEnd !== bytes.length) {
        return { ok: false };
      }
      sawIend = true;
      break;
    }

    offset = chunkEnd;
  }

  return width !== null && height !== null && sawIdat && sawIend
    ? { ok: true, width, height }
    : { ok: false };
}

function normalizeProviderResponse(
  value: unknown,
): OpenAiFirstPreviewAdapterResult {
  if (!isRecord(value)) {
    return failure("invalid_provider_response");
  }

  if (
    "type" in value ||
    "partial_image_index" in value ||
    "b64_json" in value ||
    Symbol.asyncIterator in value
  ) {
    return failure("invalid_provider_response");
  }

  if (!Array.isArray(value.data) || value.data.length !== 1) {
    return failure("invalid_provider_response");
  }

  const image = value.data[0];

  if (!isRecord(image) || typeof image.b64_json !== "string") {
    return failure("invalid_provider_response");
  }

  const imageBase64 = image.b64_json;

  if (imageBase64.length === 0 || imageBase64.length % 4 !== 0) {
    return failure("invalid_base64");
  }

  const base64Padding = imageBase64.endsWith("==")
    ? 2
    : imageBase64.endsWith("=")
      ? 1
      : 0;
  const decodedByteLength = (imageBase64.length / 4) * 3 - base64Padding;

  if (decodedByteLength > OPENAI_FIRST_PREVIEW_MAX_IMAGE_BYTES) {
    return failure("image_too_large");
  }

  if (!CANONICAL_BASE64_PATTERN.test(imageBase64)) {
    return failure("invalid_base64");
  }

  const bytes = Buffer.from(imageBase64, "base64");

  if (bytes.length === 0 || bytes.toString("base64") !== imageBase64) {
    return failure("invalid_base64");
  }

  if (bytes.length > OPENAI_FIRST_PREVIEW_MAX_IMAGE_BYTES) {
    return failure("image_too_large");
  }

  const dimensions = readPngDimensions(bytes);

  if (!dimensions.ok) {
    return failure("invalid_image_format");
  }

  if (dimensions.width !== 1024 || dimensions.height !== 1024) {
    return failure("invalid_image_dimensions");
  }

  return {
    ok: true,
    imageBase64,
    mimeType: "image/png",
    width: 1024,
    height: 1024,
    byteSize: bytes.length,
    model: OPENAI_FIRST_PREVIEW_MODEL,
    providerRequestId: extractSafeProviderRequestId(value),
  };
}

export function createOpenAiFirstPreviewProviderAdapter(dependencies: {
  client: OpenAiImageClient;
  configuration: OpenAiApiKeyConfiguration;
}): OpenAiFirstPreviewProviderAdapter {
  return {
    async generateFirstPreviewImage(request, context) {
      if (dependencies.configuration.status !== "configured") {
        return failure("configuration_missing");
      }

      if (context.signal.aborted) {
        return failure("cancelled");
      }

      const openAiRequest = buildOpenAiRequest(request);

      if (!openAiRequest) {
        return failure("invalid_request");
      }

      try {
        const response = await dependencies.client.images.generate(
          openAiRequest,
          { signal: context.signal },
        );

        return normalizeProviderResponse(response);
      } catch (error) {
        return normalizeProviderError(error, context.signal);
      }
    },
  };
}
