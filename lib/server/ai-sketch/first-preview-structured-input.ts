import "server-only";

import { createHash } from "node:crypto";

import {
  type NovoraDesignSpec,
  validateNovoraDesignSpec,
} from "./design-spec";
import {
  type NovoraHandSketchInstruction,
  validateNovoraHandSketchInstruction,
} from "./hand-sketch-instruction";
import {
  structureConceptBriefForInstantPreview,
  type InstantPreviewAgentStructuredInput,
} from "./instant-preview-agent-core";
import { executeNovoraJewelryDesignSkills } from "./jewelry-design-skills";
import { isValidFirstPreviewPublicReference } from "./first-preview-generated-assets-contract";

export type FirstPreviewStructuredGenerationInput = Readonly<{
  structuredBrief: InstantPreviewAgentStructuredInput;
  designSpec: NovoraDesignSpec;
  handSketchInstruction: NovoraHandSketchInstruction;
  designSpecSha256: string;
  handSketchInstructionSha256: string;
}>;

export type BuildFirstPreviewStructuredGenerationInputResult =
  | Readonly<{ ok: true; value: FirstPreviewStructuredGenerationInput }>
  | Readonly<{
      ok: false;
      category:
        | "invalid_structured_input"
        | "unsafe_input"
        | "oversized_input"
        | "contradictory_input";
    }>;

const PIECE_TYPE_MAP: Readonly<Record<string, string>> = {
  ring: "ring",
  pendant_necklace: "pendant necklace",
  earrings: "earrings",
  bracelet_bangle: "bracelet bangle",
  other_custom: "custom jewelry",
};

const LONG_TEXT_FIELDS = new Set([
  "designIntent",
  "aiSketchInstruction",
  "designDescription",
  "emotionalStory",
  "customLook",
  "referenceDetails",
]);

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function readOwnValue(record: Record<string, unknown>, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  return descriptor && "value" in descriptor ? descriptor.value : undefined;
}

function readString(
  record: Record<string, unknown>,
  key: string,
  maximum = 2_000,
): string | null {
  const value = readOwnValue(record, key);
  if (typeof value !== "string" || value.length > maximum) return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized || null;
}

function readStringList(
  record: Record<string, unknown>,
  key: string,
  maximumCount = 12,
): string[] {
  const value = readOwnValue(record, key);
  if (typeof value === "string") {
    const normalized = value.replace(/\s+/g, " ").trim();
    return normalized && normalized.length <= 500 ? [normalized] : [];
  }
  if (!Array.isArray(value) || value.length > maximumCount) return [];
  const result: string[] = [];
  for (const item of value) {
    if (typeof item !== "string" || item.length > 500) return [];
    const normalized = item.replace(/\s+/g, " ").trim();
    if (normalized) result.push(normalized);
  }
  return result;
}

function compact(values: Array<string | null>, maximum = 12): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))].slice(
    0,
    maximum,
  );
}

function joinBounded(values: Array<string | null>, fallback: string): string {
  const result = compact(values, 16).join("; ");
  return (result || fallback).slice(0, 2_000);
}

function selectBriefRecord(payload: unknown): Record<string, unknown> | null {
  if (!isPlainRecord(payload)) return null;
  const brief = readOwnValue(payload, "brief");
  if (isPlainRecord(brief)) return brief;
  const conceptBrief = readOwnValue(payload, "conceptBrief");
  return isPlainRecord(conceptBrief) ? conceptBrief : payload;
}

function containsOversizedStructuredValue(
  value: unknown,
  key = "",
  depth = 0,
): boolean {
  if (depth > 4) return true;
  if (typeof value === "string") {
    return value.length > (LONG_TEXT_FIELDS.has(key) ? 2_000 : 500);
  }
  if (Array.isArray(value)) {
    return (
      value.length > 12 ||
      value.some((item) => containsOversizedStructuredValue(item, key, depth + 1))
    );
  }
  if (!isPlainRecord(value)) return false;
  const keys = Object.keys(value);
  if (keys.length > 100) return true;
  return keys.some((childKey) =>
    containsOversizedStructuredValue(
      readOwnValue(value, childKey),
      childKey,
      depth + 1,
    ),
  );
}

function mapPieceType(value: string | null): string | null {
  if (!value) return null;
  return PIECE_TYPE_MAP[value.toLowerCase()] ?? value;
}

function buildStoneInput(brief: Record<string, unknown>): unknown[] {
  const direct = readOwnValue(brief, "stones");
  if (Array.isArray(direct)) return direct;

  const type = readString(brief, "focalStoneType", 500);
  const color = readString(brief, "focalStoneColor", 500);
  const shape = readString(brief, "focalStoneShape", 500);
  const size = readString(brief, "focalStoneSize", 500);
  const setting =
    readString(brief, "stationSetting", 500) ??
    readString(brief, "repeatedSettingStyle", 500);
  if (!type && !color && !shape && !size && !setting) return [];

  return [
    {
      role: "center",
      type,
      color,
      shape,
      setting,
      orientation: readString(brief, "stoneDirection", 500),
      sizeRelationship: size,
      relationshipToOtherStones:
        readString(brief, "multiStoneSizeRelationship", 500),
    },
  ];
}

function createCoreInput(payload: unknown): Record<string, unknown> | null {
  if (!isPlainRecord(payload)) return null;
  const brief = selectBriefRecord(payload);
  if (!brief) return null;

  const requestedLanguage =
    readString(brief, "language", 32) ?? readString(payload, "language", 32);
  if (requestedLanguage && requestedLanguage !== "en") return null;

  const rawPieceType =
    readString(brief, "pieceType", 500) ?? readString(payload, "pieceType", 500);
  const pieceType = mapPieceType(rawPieceType);
  if (!pieceType) return null;

  const directDesignIntent =
    readString(brief, "designIntent") ?? readString(payload, "designIntent");
  const designIntent =
    directDesignIntent ??
    readString(brief, "aiSketchInstruction") ??
    joinBounded(
      [
        pieceType,
        readString(brief, "structure"),
        readString(brief, "subStructure"),
        readString(brief, "visualFocus"),
        readString(brief, "customPieceNote"),
      ],
      `${pieceType} concept direction`,
    );

  const otherJewelryType =
    pieceType === "custom jewelry"
      ? readString(brief, "customUse", 500) ??
        readString(brief, "structure", 500) ??
        "brooch"
      : readString(brief, "otherJewelryType", 500);

  return {
    pieceType,
    pieceSubtype:
      readString(brief, "subStructure", 500) ??
      readString(brief, "structure", 500),
    otherJewelryType,
    designIntent,
    designDescription: joinBounded(
      [
        readString(brief, "designDescription"),
        readString(brief, "emotionalStory"),
        readString(brief, "customLook"),
        readString(brief, "referenceDetails"),
      ],
      "Concept direction supplied through NOVORA guided intake.",
    ),
    styleDirection: compact([
      ...readStringList(brief, "styleDirection"),
      readString(brief, "silhouette", 500),
      readString(brief, "finishDirection", 500),
    ]),
    materialDirection: compact([
      ...readStringList(brief, "materialDirection"),
      readString(brief, "metalDirection", 500),
      readString(brief, "customMetalDirection", 500),
    ]),
    stones: buildStoneInput(brief),
    centerStoneDirection: joinBounded(
      [
        readString(brief, "centerStoneDirection"),
        readString(brief, "stoneDirection"),
        readString(brief, "focalStoneShape"),
      ],
      "stone orientation to confirm",
    ),
    stoneArrangement: joinBounded(
      [
        readString(brief, "stoneArrangement"),
        readString(brief, "multiStoneLayout"),
        readString(brief, "repeatedStoneCoverage"),
      ],
      "stone arrangement to confirm",
    ),
    dimensions: compact([
      ...readStringList(brief, "dimensions"),
      readString(brief, "sizeDirection", 500),
      readString(brief, "focalStoneSize", 500),
      readString(brief, "customScale", 500),
      readString(brief, "chainLength", 500),
    ]),
    composition:
      readString(brief, "composition", 500) ??
      readString(brief, "visualFocus", 500) ??
      readString(brief, "silhouette", 500),
    motif:
      readString(brief, "motif", 500) ??
      readString(brief, "customSymbol", 500) ??
      readString(brief, "personalization", 500),
    colorDirection:
      readString(brief, "colorDirection", 500) ??
      readString(brief, "focalStoneColor", 500),
    wearabilityRequirements: compact([
      ...readStringList(brief, "wearabilityRequirements"),
      readString(brief, "wearability", 500),
      readString(brief, "customWearable", 500),
    ]),
    manufacturingConstraints: compact([
      ...readStringList(brief, "manufacturingConstraints"),
      readString(brief, "productionConcernNote", 500),
    ]),
    referenceObservations: compact([
      ...readStringList(brief, "referenceObservations"),
      readString(brief, "referenceDetails", 500),
      readString(brief, "referenceNotes", 500),
    ]),
    unknowns: compact([
      ...readStringList(brief, "unknowns"),
      readString(brief, "manualConfirmation", 500),
    ]),
    avoid: compact([
      ...readStringList(brief, "avoid"),
      readString(brief, "mustAvoid", 500),
    ]),
    requestedViews:
      readStringList(brief, "requestedViews").length > 0
        ? readStringList(brief, "requestedViews")
        : ["front view", "side profile", "setting detail"],
  };
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256Canonical(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
}

function mapFailureCategory(
  category: string,
): "invalid_structured_input" | "unsafe_input" | "oversized_input" | "contradictory_input" {
  if (category === "unsafe_input") return "unsafe_input";
  if (category === "oversized_input") return "oversized_input";
  if (category === "contradictory_input") return "contradictory_input";
  return "invalid_structured_input";
}

function buildFirstPreviewStructuredGenerationInputUnsafe(input: {
  payload: unknown;
  publicReference: string;
}): BuildFirstPreviewStructuredGenerationInputResult {
  if (!isValidFirstPreviewPublicReference(input.publicReference)) {
    return { ok: false, category: "invalid_structured_input" };
  }

  const selectedBrief = selectBriefRecord(input.payload);
  if (!selectedBrief) {
    return { ok: false, category: "invalid_structured_input" };
  }
  if (containsOversizedStructuredValue(selectedBrief)) {
    return { ok: false, category: "oversized_input" };
  }

  const coreInput = createCoreInput(input.payload);
  if (!coreInput) {
    return { ok: false, category: "invalid_structured_input" };
  }

  const structured = structureConceptBriefForInstantPreview(coreInput);
  if (structured.ok === false) {
    return { ok: false, category: mapFailureCategory(structured.error.category) };
  }

  const skills = executeNovoraJewelryDesignSkills(structured.value);
  if (skills.ok === false) {
    return { ok: false, category: mapFailureCategory(skills.error.category) };
  }

  const designSpec: NovoraDesignSpec = {
    ...skills.value.designSpec,
    public_reference: input.publicReference,
  };
  const handSketchInstruction: NovoraHandSketchInstruction = {
    ...skills.value.handSketchInstruction,
    public_reference: input.publicReference,
  };

  if (
    !validateNovoraDesignSpec(designSpec).ok ||
    !validateNovoraHandSketchInstruction(handSketchInstruction).ok ||
    designSpec.public_reference !== handSketchInstruction.public_reference ||
    designSpec.spec_version !== handSketchInstruction.design_spec_version ||
    designSpec.language !== handSketchInstruction.language ||
    designSpec.piece_type !==
      handSketchInstruction.source_design_spec_summary.piece_type
  ) {
    return { ok: false, category: "invalid_structured_input" };
  }

  return {
    ok: true,
    value: {
      structuredBrief: structured.value,
      designSpec,
      handSketchInstruction,
      designSpecSha256: sha256Canonical(designSpec),
      handSketchInstructionSha256: sha256Canonical(handSketchInstruction),
    },
  };
}

export function buildFirstPreviewStructuredGenerationInput(input: {
  payload: unknown;
  publicReference: string;
}): BuildFirstPreviewStructuredGenerationInputResult {
  try {
    return buildFirstPreviewStructuredGenerationInputUnsafe(input);
  } catch {
    return { ok: false, category: "invalid_structured_input" };
  }
}
