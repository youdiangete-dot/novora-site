import {
  GATEWAY_CONTRACT_VERSION,
  type DesignSpec,
  type FirstPreviewGatewayRequest,
  type GenerationOptions,
  type HandSketchInstruction,
  type ReferenceAsset,
} from "./contracts.ts";

export type ValidationIssue = Readonly<{
  path: string;
  message: string;
}>;

export type ValidationResult =
  | { ok: true; value: FirstPreviewGatewayRequest }
  | { ok: false; requestId: string | null; issues: readonly ValidationIssue[] };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ASSET_ID_PATTERN = /^novora_ref_[A-Za-z0-9_-]{1,96}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const MAX_TEXT_LENGTH = 4_000;
const MAX_ARRAY_LENGTH = 32;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const required = [...expected].sort();
  return actual.length === required.length && actual.every((key, index) => key === required[index]);
}

function addIssue(issues: ValidationIssue[], path: string, message: string) {
  issues.push({ path, message });
}

function isBoundedText(value: unknown, maxLength = MAX_TEXT_LENGTH): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= maxLength &&
    !CONTROL_CHARACTER_PATTERN.test(value)
  );
}

function isStringArray(
  value: unknown,
  options: { min?: number; max?: number; itemMax?: number } = {},
): value is string[] {
  const min = options.min ?? 0;
  const max = options.max ?? MAX_ARRAY_LENGTH;
  const itemMax = options.itemMax ?? 500;
  return (
    Array.isArray(value) &&
    value.length >= min &&
    value.length <= max &&
    value.every((item) => isBoundedText(item, itemMax))
  );
}

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === "string" && allowed.includes(value as T);
}

function validateDesignSpec(value: unknown, issues: ValidationIssue[]): value is DesignSpec {
  const path = "$.design_spec";
  const keys = [
    "spec_version",
    "language",
    "piece_type",
    "normalized_intent_summary",
    "design_direction",
    "materials",
    "stones",
    "dimensions",
    "production_constraints",
    "unresolved_items",
  ] as const;

  if (!isRecord(value) || !hasExactKeys(value, keys)) {
    addIssue(issues, path, "design_spec must contain only the Gateway Contract v1 fields.");
    return false;
  }

  let valid = true;
  if (value.spec_version !== "1") {
    addIssue(issues, `${path}.spec_version`, "spec_version must be 1.");
    valid = false;
  }
  if (!isOneOf(value.language, ["en", "zh-Hant", "ja"] as const)) {
    addIssue(issues, `${path}.language`, "language is not supported by Contract v1.");
    valid = false;
  }
  if (
    !isOneOf(
      value.piece_type,
      ["ring", "necklace", "pendant", "earrings", "bracelet", "other"] as const,
    )
  ) {
    addIssue(issues, `${path}.piece_type`, "piece_type is invalid.");
    valid = false;
  }
  if (!isBoundedText(value.normalized_intent_summary, 2_000)) {
    addIssue(issues, `${path}.normalized_intent_summary`, "A bounded normalized summary is required.");
    valid = false;
  }

  const direction = value.design_direction;
  if (
    !isRecord(direction) ||
    !hasExactKeys(direction, ["style_keywords", "form", "composition"]) ||
    !isStringArray(direction.style_keywords, { min: 1, max: 12, itemMax: 100 }) ||
    !isBoundedText(direction.form, 1_000) ||
    !isBoundedText(direction.composition, 1_000)
  ) {
    addIssue(issues, `${path}.design_direction`, "design_direction is invalid or contains unknown fields.");
    valid = false;
  }

  if (!Array.isArray(value.materials) || value.materials.length > 8) {
    addIssue(issues, `${path}.materials`, "materials must be an array with at most 8 items.");
    valid = false;
  } else {
    value.materials.forEach((material, index) => {
      if (
        !isRecord(material) ||
        !hasExactKeys(material, ["type", "color", "finish"]) ||
        !isOneOf(material.type, ["platinum", "gold", "silver", "other", "unknown"] as const) ||
        !isBoundedText(material.color, 200) ||
        !isBoundedText(material.finish, 200)
      ) {
        addIssue(issues, `${path}.materials[${index}]`, "material is invalid or contains unknown fields.");
        valid = false;
      }
    });
  }

  if (!Array.isArray(value.stones) || value.stones.length > 24) {
    addIssue(issues, `${path}.stones`, "stones must be an array with at most 24 items.");
    valid = false;
  } else {
    value.stones.forEach((stone, index) => {
      if (
        !isRecord(stone) ||
        !hasExactKeys(stone, ["role", "type", "shape", "color", "setting", "quantity"]) ||
        !isOneOf(stone.role, ["center", "accent", "other"] as const) ||
        !isBoundedText(stone.type, 200) ||
        !isBoundedText(stone.shape, 200) ||
        !isBoundedText(stone.color, 200) ||
        !isBoundedText(stone.setting, 300) ||
        !Number.isInteger(stone.quantity) ||
        (stone.quantity as number) < 1 ||
        (stone.quantity as number) > 100
      ) {
        addIssue(issues, `${path}.stones[${index}]`, "stone is invalid or contains unknown fields.");
        valid = false;
      }
    });
  }

  const dimensions = value.dimensions;
  if (
    !isRecord(dimensions) ||
    !hasExactKeys(dimensions, ["summary", "unknown_or_to_confirm"]) ||
    !isBoundedText(dimensions.summary, 1_000) ||
    !isStringArray(dimensions.unknown_or_to_confirm, { max: 16, itemMax: 300 })
  ) {
    addIssue(issues, `${path}.dimensions`, "dimensions is invalid or contains unknown fields.");
    valid = false;
  }
  if (!isStringArray(value.production_constraints, { max: 24, itemMax: 500 })) {
    addIssue(issues, `${path}.production_constraints`, "production_constraints is invalid.");
    valid = false;
  }
  if (!isStringArray(value.unresolved_items, { max: 24, itemMax: 500 })) {
    addIssue(issues, `${path}.unresolved_items`, "unresolved_items is invalid.");
    valid = false;
  }

  return valid;
}

function validateHandSketchInstruction(
  value: unknown,
  issues: ValidationIssue[],
): value is HandSketchInstruction {
  const path = "$.hand_sketch_instruction";
  const keys = [
    "instruction_version",
    "design_spec_version",
    "language",
    "views",
    "sheet_style",
    "drawing_instructions",
    "annotations",
    "must_include",
    "must_avoid",
    "disclaimer",
  ] as const;

  if (!isRecord(value) || !hasExactKeys(value, keys)) {
    addIssue(issues, path, "hand_sketch_instruction must contain only the Contract v1 fields.");
    return false;
  }

  let valid = true;
  if (value.instruction_version !== "1" || value.design_spec_version !== "1") {
    addIssue(issues, path, "Instruction and Design Spec versions must both be 1.");
    valid = false;
  }
  if (!isOneOf(value.language, ["en", "zh-Hant", "ja"] as const)) {
    addIssue(issues, `${path}.language`, "language is invalid.");
    valid = false;
  }
  if (!Array.isArray(value.views) || value.views.length < 1 || value.views.length > 8) {
    addIssue(issues, `${path}.views`, "views must contain 1 to 8 structured view instructions.");
    valid = false;
  } else {
    value.views.forEach((view, index) => {
      if (
        !isRecord(view) ||
        !hasExactKeys(view, ["view", "required", "instruction"]) ||
        !isOneOf(view.view, ["front", "side", "top", "perspective", "detail"] as const) ||
        typeof view.required !== "boolean" ||
        !isBoundedText(view.instruction, 1_000)
      ) {
        addIssue(issues, `${path}.views[${index}]`, "view is invalid or contains unknown fields.");
        valid = false;
      }
    });
  }
  const sheetStyle = value.sheet_style;
  if (
    !isRecord(sheetStyle) ||
    !hasExactKeys(sheetStyle, ["line_style", "background", "branding"]) ||
    !isBoundedText(sheetStyle.line_style, 500) ||
    !isBoundedText(sheetStyle.background, 500) ||
    !isBoundedText(sheetStyle.branding, 500)
  ) {
    addIssue(issues, `${path}.sheet_style`, "sheet_style is invalid or contains unknown fields.");
    valid = false;
  }
  for (const field of ["drawing_instructions", "annotations", "must_include", "must_avoid"] as const) {
    if (!isStringArray(value[field], { max: 32, itemMax: 1_000 })) {
      addIssue(issues, `${path}.${field}`, `${field} is invalid.`);
      valid = false;
    }
  }
  if (!isBoundedText(value.disclaimer, 1_000)) {
    addIssue(issues, `${path}.disclaimer`, "A concept-preview disclaimer is required.");
    valid = false;
  }
  return valid;
}

function isSafeReferenceUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2_048) return false;
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    return (
      url.protocol === "https:" &&
      url.username === "" &&
      url.password === "" &&
      hostname !== "localhost" &&
      hostname !== "127.0.0.1" &&
      hostname !== "::1" &&
      !hostname.endsWith(".local")
    );
  } catch {
    return false;
  }
}

function validateReferenceAssets(value: unknown, issues: ValidationIssue[]): value is ReferenceAsset[] {
  const path = "$.reference_assets";
  if (!Array.isArray(value) || value.length > 4) {
    addIssue(issues, path, "reference_assets must be an array with at most 4 items.");
    return false;
  }
  let valid = true;
  value.forEach((asset, index) => {
    if (
      !isRecord(asset) ||
      !hasExactKeys(asset, ["asset_id", "purpose", "media_type", "sha256", "byte_length", "fetch_url"]) ||
      typeof asset.asset_id !== "string" ||
      !ASSET_ID_PATTERN.test(asset.asset_id) ||
      !isOneOf(asset.purpose, ["inspiration", "composition", "detail"] as const) ||
      !isOneOf(asset.media_type, ["image/png", "image/jpeg", "image/webp"] as const) ||
      typeof asset.sha256 !== "string" ||
      !SHA256_PATTERN.test(asset.sha256) ||
      !Number.isInteger(asset.byte_length) ||
      (asset.byte_length as number) < 1 ||
      (asset.byte_length as number) > 20 * 1024 * 1024 ||
      !isSafeReferenceUrl(asset.fetch_url)
    ) {
      addIssue(issues, `${path}[${index}]`, "Reference asset metadata is invalid or contains unknown fields.");
      valid = false;
    }
  });
  return valid;
}

function validateGenerationOptions(value: unknown, issues: ValidationIssue[]): value is GenerationOptions {
  const path = "$.generation_options";
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["size", "quality", "output_format", "background"]) ||
    !isOneOf(value.size, ["1024x1024", "1024x1536", "1536x1024"] as const) ||
    !isOneOf(value.quality, ["low", "medium", "high"] as const) ||
    value.output_format !== "png" ||
    !isOneOf(value.background, ["opaque", "transparent"] as const)
  ) {
    addIssue(issues, path, "generation_options is invalid or contains provider configuration.");
    return false;
  }
  return true;
}

export function validateGatewayRequest(value: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];
  const topLevelKeys = [
    "contract_version",
    "request_id",
    "design_spec",
    "hand_sketch_instruction",
    "reference_assets",
    "generation_options",
  ] as const;

  if (!isRecord(value) || !hasExactKeys(value, topLevelKeys)) {
    return {
      ok: false,
      requestId: null,
      issues: [{ path: "$", message: "Request must contain only Gateway Contract v1 fields." }],
    };
  }

  const requestId = typeof value.request_id === "string" && UUID_PATTERN.test(value.request_id)
    ? value.request_id
    : null;
  if (value.contract_version !== GATEWAY_CONTRACT_VERSION) {
    addIssue(issues, "$.contract_version", "Unsupported Gateway contract version.");
  }
  if (requestId === null) {
    addIssue(issues, "$.request_id", "request_id must be a UUID.");
  }

  const designSpec = value.design_spec;
  const handSketchInstruction = value.hand_sketch_instruction;
  const designSpecValid = validateDesignSpec(designSpec, issues);
  const instructionValid = validateHandSketchInstruction(handSketchInstruction, issues);
  const assetsValid = validateReferenceAssets(value.reference_assets, issues);
  const optionsValid = validateGenerationOptions(value.generation_options, issues);

  if (designSpecValid && instructionValid) {
    if (designSpec.spec_version !== handSketchInstruction.design_spec_version) {
      addIssue(issues, "$.hand_sketch_instruction.design_spec_version", "Design Spec versions do not match.");
    }
    if (designSpec.language !== handSketchInstruction.language) {
      addIssue(issues, "$.hand_sketch_instruction.language", "Design Spec and instruction languages do not match.");
    }
  }

  if (
    issues.length > 0 ||
    requestId === null ||
    !designSpecValid ||
    !instructionValid ||
    !assetsValid ||
    !optionsValid
  ) {
    return { ok: false, requestId, issues };
  }

  return { ok: true, value: value as FirstPreviewGatewayRequest };
}
