import "server-only";

export const INSTANT_PREVIEW_AGENT_CORE_VERSION =
  "novora_instant_preview_agent_core_v1" as const;

export const INSTANT_PREVIEW_AGENT_LIMITS = {
  maximumDescriptionLength: 2_000,
  maximumCombinedDescriptionLength: 3_000,
  maximumIndividualStringLength: 500,
  maximumStones: 12,
  maximumMaterialDirections: 8,
  maximumReferenceObservations: 8,
  maximumUnknowns: 12,
  maximumAvoidRules: 12,
  maximumManufacturingConstraints: 12,
  maximumRequestedViews: 8,
  maximumInputDepth: 5,
  maximumInputNodes: 300,
  maximumInputStringCharacters: 10_000,
  maximumStructuredOutputCharacters: 24_000,
  maximumDesignSpecReviewRequirements: 12,
  maximumHandSketchReviewRequirements: 12,
  maximumCandidateObservations: 12,
  maximumStructuralReviewRequirements: 16,
  maximumRevisionInstructions: 8,
  maximumRevisionInstructionLength: 300,
  maximumRevisionPayloadCharacters: 1_200,
} as const;

export type InstantPreviewAgentFailureCategory =
  | "invalid_input"
  | "unsupported_piece"
  | "oversized_input"
  | "unsafe_input"
  | "contradictory_input"
  | "reviewer_unavailable"
  | "malformed_review"
  | "unsafe_review"
  | "internal_failure";

export type InstantPreviewAgentCanonicalPieceType =
  | "ring"
  | "pendant_necklace"
  | "earrings"
  | "bracelet_bangle"
  | "other_custom";

export type InstantPreviewAgentPieceCategory =
  | "ring"
  | "pendant_necklace"
  | "earrings"
  | "bracelet_bangle"
  | "animal_sculpture_concept"
  | "other_jewelry";

export type InstantPreviewAgentStone = {
  role: string | null;
  type: string | null;
  color: string | null;
  shape: string | null;
  setting: string | null;
  orientation: string | null;
  tableOrientation: string | null;
  sizeRelationship: string | null;
  relationshipToOtherStones: string | null;
  quantity: number | null;
};

export type InstantPreviewAgentStructuredInput = {
  contractVersion: typeof INSTANT_PREVIEW_AGENT_CORE_VERSION;
  purpose: "internal_first_preview_input";
  customerIntent: {
    designIntent: string;
    designDescription: string | null;
  };
  piece: {
    canonicalType: InstantPreviewAgentCanonicalPieceType;
    category: InstantPreviewAgentPieceCategory;
    subtype: string | null;
    boundedOtherJewelryType: string | null;
  };
  style: {
    directions: string[];
    colorDirection: string | null;
  };
  materials: {
    directions: string[];
  };
  stones: {
    items: InstantPreviewAgentStone[];
    centerStoneDirection: string | null;
    arrangement: string | null;
  };
  composition: {
    direction: string | null;
    motif: string | null;
    requestedViews: string[];
  };
  dimensions: {
    relationships: string[];
  };
  wearability: {
    requirements: string[];
  };
  manufacturingConstraints: string[];
  referenceObservations: {
    observations: string[];
    inspirationOnly: true;
    doNotCopyExactly: true;
  };
  unknowns: string[];
  avoid: string[];
  generationNotes: {
    structuredTransformationRequired: true;
    rawCustomerProseIsFinalImageGenerationInstruction: false;
    designSpecRequiredBeforeSketchInstruction: true;
    handSketchInstructionRequiredBeforeGeneration: true;
  };
  reviewRequirements: string[];
  productBoundaries: {
    internalFirstPreviewInputOnly: true;
    cad: false;
    quotation: false;
    pricing: false;
    paymentConfirmation: false;
    order: false;
    productionApproval: false;
    manufacturabilityGuarantee: false;
  };
};

export type StructureConceptBriefForInstantPreviewResult =
  | {
      ok: true;
      value: InstantPreviewAgentStructuredInput;
    }
  | {
      ok: false;
      error: {
        category: InstantPreviewAgentFailureCategory;
      };
    };

const STRUCTURAL_REVIEW_REQUIREMENTS = [
  "center-stone orientation must remain consistent",
  "center-stone and accent-stone table orientation must remain consistent",
  "directional stones must not rotate 90 degrees between views",
  "prong count and placement must be structurally explainable",
  "do not introduce an accidental extra ring shank",
  "stacked rings must not collide",
  "front stacking elevation must not be presented as a side or section view",
  "overall and detail views must describe the same jewelry construction",
  "a requested motif must not override basic jewelry structure",
  "do not introduce CAD, manufacturing, pricing, or production claims",
] as const;

const EMPTY_OPTIONAL_VALUES = new Set(["", "-", "n/a", "not applicable"]);
const OTHER_JEWELRY_TYPE_PATTERN =
  /\b(brooch|pin|charm|anklet|cufflink|tie clip|tiara|hairpin|body jewelry)\b/i;
const SENSITIVE_DESIGN_VALUE_PATTERNS = [
  /https?:\/\//i,
  /file:\/\//i,
  /\b[A-Z]:[\\/]/i,
  /(?:^|[\s"'(])(?:\.\.[\\/]|\/(?:etc|home|users|var|tmp)[\\/])/i,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /(?:\+?\d[\d\s().-]{7,}\d)/,
  /\bNOVORA-CB-[A-Z0-9-]+\b/i,
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i,
  /\b(api[ _-]?key|bearer token|password|credential|secret|cookie|capability proof)\b/i,
  /\b(process\.env|environment variable|storage bucket|storage object path|signed url|private url)\b/i,
  /\b(customer name|email address|phone number|whatsapp|contact note|admin note|reviewer note)\b/i,
] as const;

class ParseFailure extends Error {
  constructor(readonly category: InstantPreviewAgentFailureCategory) {
    super(category);
  }
}

type GraphInspection = {
  nodes: number;
  stringCharacters: number;
  seen: WeakSet<object>;
};

function fail(category: InstantPreviewAgentFailureCategory): never {
  throw new ParseFailure(category);
}

function failure(
  category: InstantPreviewAgentFailureCategory,
): StructureConceptBriefForInstantPreviewResult {
  return {
    ok: false,
    error: { category },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function inspectInputGraph(
  value: unknown,
  depth: number,
  inspection: GraphInspection,
): void {
  if (depth > INSTANT_PREVIEW_AGENT_LIMITS.maximumInputDepth) {
    fail("oversized_input");
  }

  if (
    value === null ||
    value === undefined ||
    typeof value === "boolean" ||
    typeof value === "number"
  ) {
    return;
  }

  if (typeof value === "string") {
    inspection.stringCharacters += value.length;
    if (
      inspection.stringCharacters >
      INSTANT_PREVIEW_AGENT_LIMITS.maximumInputStringCharacters
    ) {
      fail("oversized_input");
    }
    return;
  }

  if (typeof value !== "object") {
    fail("invalid_input");
  }

  if (inspection.seen.has(value)) {
    fail("invalid_input");
  }
  inspection.seen.add(value);
  inspection.nodes += 1;

  if (inspection.nodes > INSTANT_PREVIEW_AGENT_LIMITS.maximumInputNodes) {
    fail("oversized_input");
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      inspectInputGraph(item, depth + 1, inspection);
    }
    return;
  }

  if (!isPlainRecord(value) || Reflect.ownKeys(value).some((key) => typeof key === "symbol")) {
    fail("invalid_input");
  }

  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const descriptor of Object.values(descriptors)) {
    if (!("value" in descriptor)) {
      fail("invalid_input");
    }
    inspectInputGraph(descriptor.value, depth + 1, inspection);
  }
}

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function containsSensitiveDesignValue(value: string): boolean {
  return SENSITIVE_DESIGN_VALUE_PATTERNS.some((pattern) => pattern.test(value));
}

function normalizeString(
  value: unknown,
  maximumLength: number =
    INSTANT_PREVIEW_AGENT_LIMITS.maximumIndividualStringLength,
): string {
  if (typeof value !== "string") {
    fail("invalid_input");
  }

  const normalized = normalizeWhitespace(value);
  if (normalized.length > maximumLength) {
    fail("oversized_input");
  }
  if (containsSensitiveDesignValue(normalized)) {
    fail("unsafe_input");
  }

  return normalized;
}

function normalizeOptionalString(
  value: unknown,
  maximumLength: number =
    INSTANT_PREVIEW_AGENT_LIMITS.maximumIndividualStringLength,
): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = normalizeString(value, maximumLength);
  return EMPTY_OPTIONAL_VALUES.has(normalized.toLowerCase()) ? null : normalized;
}

function normalizeStringList(value: unknown, maximumCount: number): string[] {
  if (value === undefined || value === null) {
    return [];
  }

  const values = typeof value === "string" ? [value] : value;
  if (!Array.isArray(values)) {
    fail("invalid_input");
  }
  if (values.length > maximumCount) {
    fail("oversized_input");
  }

  const normalized: string[] = [];
  for (const item of values) {
    const parsed = normalizeOptionalString(item);
    if (parsed !== null) {
      normalized.push(parsed);
    }
  }
  return normalized;
}

function normalizeUnorderedSet(value: unknown, maximumCount: number): string[] {
  const values = normalizeStringList(value, maximumCount);
  const uniqueByFoldedValue = new Map<string, string>();

  for (const item of values) {
    const folded = item.toLowerCase();
    if (!uniqueByFoldedValue.has(folded)) {
      uniqueByFoldedValue.set(folded, item);
    }
  }

  return [...uniqueByFoldedValue.entries()]
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([, original]) => original);
}

function classifyPieceTokens(value: string): InstantPreviewAgentCanonicalPieceType[] {
  const matches: InstantPreviewAgentCanonicalPieceType[] = [];
  const add = (piece: InstantPreviewAgentCanonicalPieceType) => {
    if (!matches.includes(piece)) {
      matches.push(piece);
    }
  };

  if (/\bring\b/.test(value)) add("ring");
  if (/\b(pendant|necklace)\b/.test(value)) add("pendant_necklace");
  if (/\bearrings?\b/.test(value)) add("earrings");
  if (/\b(bracelet|bangle)\b/.test(value)) add("bracelet_bangle");
  if (/\b(animal|sculpture|other|custom)\b/.test(value)) add("other_custom");

  return matches;
}

function parsePiece(
  pieceTypeValue: unknown,
  subtypeValue: unknown,
  otherJewelryTypeValue: unknown,
): InstantPreviewAgentStructuredInput["piece"] {
  if (typeof pieceTypeValue !== "string") {
    fail("invalid_input");
  }

  const pieceType = normalizeWhitespace(pieceTypeValue)
    .toLowerCase()
    .replace(/[_-]+/g, " ");
  if (!pieceType) {
    fail("invalid_input");
  }

  const pieceTokenMatches = classifyPieceTokens(pieceType);
  if (pieceTokenMatches.length > 1) {
    fail("contradictory_input");
  }

  let canonicalType: InstantPreviewAgentCanonicalPieceType;
  let category: InstantPreviewAgentPieceCategory;

  if (pieceType === "ring") {
    canonicalType = "ring";
    category = "ring";
  } else if (pieceType === "pendant" || pieceType === "necklace" || pieceType === "pendant necklace") {
    canonicalType = "pendant_necklace";
    category = "pendant_necklace";
  } else if (pieceType === "earring" || pieceType === "earrings") {
    canonicalType = "earrings";
    category = "earrings";
  } else if (pieceType === "bracelet" || pieceType === "bangle" || pieceType === "bracelet bangle") {
    canonicalType = "bracelet_bangle";
    category = "bracelet_bangle";
  } else if (
    pieceType === "animal" ||
    pieceType === "sculpture" ||
    pieceType === "animal sculpture" ||
    pieceType === "animal or sculpture concept"
  ) {
    canonicalType = "other_custom";
    category = "animal_sculpture_concept";
  } else if (pieceType === "other" || pieceType === "other jewelry" || pieceType === "custom jewelry") {
    canonicalType = "other_custom";
    category = "other_jewelry";
  } else {
    fail("unsupported_piece");
  }

  const subtype = normalizeOptionalString(subtypeValue);
  if (subtype !== null) {
    const subtypeMatches = classifyPieceTokens(subtype.toLowerCase());
    if (subtypeMatches.some((match) => match !== canonicalType)) {
      fail("contradictory_input");
    }
  }

  const boundedOtherJewelryType = normalizeOptionalString(otherJewelryTypeValue);
  if (category === "other_jewelry") {
    if (
      boundedOtherJewelryType === null ||
      !OTHER_JEWELRY_TYPE_PATTERN.test(boundedOtherJewelryType)
    ) {
      fail("unsupported_piece");
    }
  }

  return {
    canonicalType,
    category,
    subtype,
    boundedOtherJewelryType:
      category === "other_jewelry" ? boundedOtherJewelryType : null,
  };
}

function parseStones(value: unknown): InstantPreviewAgentStone[] {
  if (value === undefined || value === null) {
    return [];
  }
  if (!Array.isArray(value)) {
    fail("invalid_input");
  }
  if (value.length > INSTANT_PREVIEW_AGENT_LIMITS.maximumStones) {
    fail("oversized_input");
  }

  return value.map((item) => {
    if (!isPlainRecord(item)) {
      fail("invalid_input");
    }

    const quantityValue = item.quantity;
    let quantity: number | null = null;
    if (quantityValue !== undefined && quantityValue !== null) {
      if (
        typeof quantityValue !== "number" ||
        !Number.isInteger(quantityValue) ||
        quantityValue < 1 ||
        quantityValue > 100
      ) {
        fail("invalid_input");
      }
      quantity = quantityValue;
    }

    const stone: InstantPreviewAgentStone = {
      role: normalizeOptionalString(item.role),
      type: normalizeOptionalString(item.type),
      color: normalizeOptionalString(item.color),
      shape: normalizeOptionalString(item.shape),
      setting: normalizeOptionalString(item.setting),
      orientation: normalizeOptionalString(item.orientation),
      tableOrientation: normalizeOptionalString(item.tableOrientation),
      sizeRelationship: normalizeOptionalString(item.sizeRelationship),
      relationshipToOtherStones: normalizeOptionalString(
        item.relationshipToOtherStones,
      ),
      quantity,
    };

    if (Object.values(stone).every((entry) => entry === null)) {
      fail("invalid_input");
    }

    return stone;
  });
}

function assertDimensionConsistency(
  piece: InstantPreviewAgentStructuredInput["piece"],
  dimensions: string[],
): void {
  if (
    piece.canonicalType !== "ring" &&
    dimensions.some((dimension) => /\bring size\b/i.test(dimension))
  ) {
    fail("contradictory_input");
  }

  if (
    piece.canonicalType === "ring" &&
    dimensions.some((dimension) => /\b(chain length|earring drop|wrist circumference)\b/i.test(dimension))
  ) {
    fail("contradictory_input");
  }
}

function createStructuredInput(
  source: Record<string, unknown>,
): InstantPreviewAgentStructuredInput {
  const designIntent = normalizeString(
    source.designIntent,
    INSTANT_PREVIEW_AGENT_LIMITS.maximumDescriptionLength,
  );
  if (!designIntent || EMPTY_OPTIONAL_VALUES.has(designIntent.toLowerCase())) {
    fail("invalid_input");
  }

  const designDescription = normalizeOptionalString(
    source.designDescription,
    INSTANT_PREVIEW_AGENT_LIMITS.maximumDescriptionLength,
  );
  if (
    designIntent.length + (designDescription?.length ?? 0) >
    INSTANT_PREVIEW_AGENT_LIMITS.maximumCombinedDescriptionLength
  ) {
    fail("oversized_input");
  }

  const piece = parsePiece(
    source.pieceType,
    source.pieceSubtype,
    source.otherJewelryType,
  );
  const dimensions = normalizeStringList(source.dimensions, 12);
  assertDimensionConsistency(piece, dimensions);

  const structured: InstantPreviewAgentStructuredInput = {
    contractVersion: INSTANT_PREVIEW_AGENT_CORE_VERSION,
    purpose: "internal_first_preview_input",
    customerIntent: {
      designIntent,
      designDescription,
    },
    piece,
    style: {
      directions: normalizeStringList(source.styleDirection, 12),
      colorDirection: normalizeOptionalString(source.colorDirection),
    },
    materials: {
      directions: normalizeStringList(
        source.materialDirection,
        INSTANT_PREVIEW_AGENT_LIMITS.maximumMaterialDirections,
      ),
    },
    stones: {
      items: parseStones(source.stones),
      centerStoneDirection: normalizeOptionalString(source.centerStoneDirection),
      arrangement: normalizeOptionalString(source.stoneArrangement),
    },
    composition: {
      direction: normalizeOptionalString(source.composition),
      motif: normalizeOptionalString(source.motif),
      requestedViews: normalizeStringList(
        source.requestedViews,
        INSTANT_PREVIEW_AGENT_LIMITS.maximumRequestedViews,
      ),
    },
    dimensions: {
      relationships: dimensions,
    },
    wearability: {
      requirements: normalizeStringList(source.wearabilityRequirements, 12),
    },
    manufacturingConstraints: normalizeStringList(
      source.manufacturingConstraints,
      INSTANT_PREVIEW_AGENT_LIMITS.maximumManufacturingConstraints,
    ),
    referenceObservations: {
      observations: normalizeStringList(
        source.referenceObservations,
        INSTANT_PREVIEW_AGENT_LIMITS.maximumReferenceObservations,
      ),
      inspirationOnly: true,
      doNotCopyExactly: true,
    },
    unknowns: normalizeStringList(
      source.unknowns,
      INSTANT_PREVIEW_AGENT_LIMITS.maximumUnknowns,
    ),
    avoid: normalizeUnorderedSet(
      source.avoid,
      INSTANT_PREVIEW_AGENT_LIMITS.maximumAvoidRules,
    ),
    generationNotes: {
      structuredTransformationRequired: true,
      rawCustomerProseIsFinalImageGenerationInstruction: false,
      designSpecRequiredBeforeSketchInstruction: true,
      handSketchInstructionRequiredBeforeGeneration: true,
    },
    reviewRequirements: [...STRUCTURAL_REVIEW_REQUIREMENTS],
    productBoundaries: {
      internalFirstPreviewInputOnly: true,
      cad: false,
      quotation: false,
      pricing: false,
      paymentConfirmation: false,
      order: false,
      productionApproval: false,
      manufacturabilityGuarantee: false,
    },
  };

  if (
    JSON.stringify(structured).length >
    INSTANT_PREVIEW_AGENT_LIMITS.maximumStructuredOutputCharacters
  ) {
    fail("oversized_input");
  }

  return structured;
}

export function structureConceptBriefForInstantPreview(
  input: unknown,
): StructureConceptBriefForInstantPreviewResult {
  try {
    inspectInputGraph(input, 1, {
      nodes: 0,
      stringCharacters: 0,
      seen: new WeakSet<object>(),
    });

    if (!isPlainRecord(input)) {
      return failure("invalid_input");
    }

    return {
      ok: true,
      value: createStructuredInput(input),
    };
  } catch (error) {
    return failure(
      error instanceof ParseFailure ? error.category : "internal_failure",
    );
  }
}

export type InstantPreviewAgentReviewInput = {
  structuredIntent: InstantPreviewAgentStructuredInput;
  designSpecRequirements: string[];
  handSketchInstructionRequirements: string[];
  candidateObservations: string[];
  structuralReviewRequirements: string[];
  metadata: {
    purpose: "first_preview_automatic_review";
    candidateSequence: number;
  };
};

export interface InstantPreviewAgentReviewer {
  reviewCandidate(input: InstantPreviewAgentReviewInput): Promise<unknown>;
}

export type InstantPreviewAgentPassQuality = "acceptable" | "strong";

export type InstantPreviewAgentFailSafeReason =
  | "candidate_invalid"
  | "quality_below_threshold"
  | "reviewer_unavailable"
  | "malformed_review"
  | "unsafe_review"
  | "internal_failure";

export type InstantPreviewAgentAutomaticReviewResult =
  | {
      outcome: "PASS";
      quality?: InstantPreviewAgentPassQuality;
    }
  | {
      outcome: "REGENERATE";
      revisionInstructions: string[];
    }
  | {
      outcome: "FAIL_SAFE";
      reason: InstantPreviewAgentFailSafeReason;
    };

const REVIEW_INPUT_KEYS = new Set([
  "structuredIntent",
  "designSpecRequirements",
  "handSketchInstructionRequirements",
  "candidateObservations",
  "structuralReviewRequirements",
  "metadata",
]);
const REVIEW_METADATA_KEYS = new Set(["purpose", "candidateSequence"]);
const PASS_RESULT_KEYS = new Set(["outcome", "quality"]);
const REGENERATE_RESULT_KEYS = new Set([
  "outcome",
  "revisionInstructions",
]);
const FAIL_SAFE_RESULT_KEYS = new Set(["outcome", "reason"]);
const REVIEWER_FAIL_SAFE_REASONS = new Set([
  "candidate_invalid",
  "quality_below_threshold",
]);
const PASS_QUALITIES = new Set(["acceptable", "strong"]);
const ALLOWED_REVISION_LANGUAGE =
  /\b(jewel(?:ry)?|design|composition|stone|gem|center|accent|orientation|table|prong|setting|ring|shank|stacked|collision|motif|view|overall|detail|sketch|presentation|structure|profile|front|side|placement|proportion|silhouette|bail|clasp|hinge|support|alignment)\b/i;
const UNSAFE_REVISION_PATTERNS = [
  /https?:\/\//i,
  /file:\/\//i,
  /\b[A-Z]:[\\/]/i,
  /(?:^|[\s"'(])(?:\\\\|\.{1,2}[\\/]|\/(?:etc|home|users|var|tmp|network)[\\/])/i,
  /\b(process\.env|environment variable|\$env:|OPENAI_API_KEY|SUPABASE_[A-Z_]+|API_KEY)\b/i,
  /\b(credential|api key|bearer token|cookie|password|secret)\b/i,
  /\b(SELECT\s+.+\s+FROM|INSERT\s+INTO|UPDATE\s+.+\s+SET|DELETE\s+FROM|DROP\s+TABLE|ALTER\s+TABLE|CREATE\s+TABLE|SQL statement|database schema|database table|database column|postgres|supabase)\b/i,
  /\b(shell command|powershell|cmd\.exe|bash|invoke-webrequest|curl|wget)\b/i,
  /\b(execute (?:a |the )?(?:tool|code|command|script)|run (?:a |the )?(?:tool|command|script)|tool execution|code execution)\b/i,
  /\b(npm|pnpm|yarn|pip)\s+(?:install|add)\b/i,
  /\b(package installation|install (?:a |the )?package)\b/i,
  /\b(payment|order|shipping|quotation|quote|pricing|price)\b/i,
  /\bCAD\b.*\b(complete|ready|finished|approved)\b/i,
  /\b(complete|ready|finished|approved)\b.*\bCAD\b/i,
  /\bproduction\b.*\b(approved|ready|confirmed)\b/i,
  /\b(approved|ready|confirmed)\b.*\bproduction\b/i,
  /\b(guaranteed?|guarantee)\b.*\b(manufacturability|manufacturable|manufacturing)\b/i,
  /\b(customer name|email address|phone number|whatsapp|contact the customer)\b/i,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /(?:\+?\d[\d\s().-]{7,}\d)/,
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i,
  /\bNOVORA-CB-[A-Z0-9-]+\b/i,
  /\b(storage bucket|storage object|storage path|private path|signed url|private url)\b/i,
  /```|<script\b/i,
] as const;

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowedKeys: ReadonlySet<string>,
): boolean {
  return Object.keys(value).every((key) => allowedKeys.has(key));
}

function failSafe(
  reason: InstantPreviewAgentFailSafeReason,
): InstantPreviewAgentAutomaticReviewResult {
  return {
    outcome: "FAIL_SAFE",
    reason,
  };
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function exactKeys(
  value: unknown,
  keys: readonly string[],
): value is Record<string, unknown> {
  if (!isPlainRecord(value)) {
    return false;
  }
  const actual = Object.keys(value);
  return (
    actual.length === keys.length &&
    keys.every((key) => Object.prototype.hasOwnProperty.call(value, key))
  );
}

function cloneStringArray(
  value: unknown,
  maximumCount: number,
): string[] {
  if (!Array.isArray(value) || value.length > maximumCount) {
    fail("invalid_input");
  }
  return value.map((item) => {
    const normalized = normalizeString(item);
    if (!normalized) {
      fail("invalid_input");
    }
    return normalized;
  });
}

function cloneNullableSafeString(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  const normalized = normalizeString(value);
  if (!normalized) {
    fail("invalid_input");
  }
  return normalized;
}

function cloneStructuredIntentForReview(
  value: unknown,
): InstantPreviewAgentStructuredInput {
  if (
    !exactKeys(value, [
      "contractVersion",
      "purpose",
      "customerIntent",
      "piece",
      "style",
      "materials",
      "stones",
      "composition",
      "dimensions",
      "wearability",
      "manufacturingConstraints",
      "referenceObservations",
      "unknowns",
      "avoid",
      "generationNotes",
      "reviewRequirements",
      "productBoundaries",
    ]) ||
    value.contractVersion !== INSTANT_PREVIEW_AGENT_CORE_VERSION ||
    value.purpose !== "internal_first_preview_input"
  ) {
    fail("invalid_input");
  }

  const customerIntent = value.customerIntent;
  const piece = value.piece;
  const style = value.style;
  const materials = value.materials;
  const stones = value.stones;
  const composition = value.composition;
  const dimensions = value.dimensions;
  const wearability = value.wearability;
  const referenceObservations = value.referenceObservations;
  const generationNotes = value.generationNotes;
  const productBoundaries = value.productBoundaries;

  if (
    !exactKeys(customerIntent, ["designIntent", "designDescription"]) ||
    typeof customerIntent.designIntent !== "string" ||
    !isNullableString(customerIntent.designDescription) ||
    !exactKeys(piece, [
      "canonicalType",
      "category",
      "subtype",
      "boundedOtherJewelryType",
    ]) ||
    !["ring", "pendant_necklace", "earrings", "bracelet_bangle", "other_custom"].includes(
      String(piece.canonicalType),
    ) ||
    ![
      "ring",
      "pendant_necklace",
      "earrings",
      "bracelet_bangle",
      "animal_sculpture_concept",
      "other_jewelry",
    ].includes(String(piece.category)) ||
    !isNullableString(piece.subtype) ||
    !isNullableString(piece.boundedOtherJewelryType) ||
    !exactKeys(style, ["directions", "colorDirection"]) ||
    !isNullableString(style.colorDirection) ||
    !exactKeys(materials, ["directions"]) ||
    !exactKeys(stones, ["items", "centerStoneDirection", "arrangement"]) ||
    !Array.isArray(stones.items) ||
    stones.items.length > INSTANT_PREVIEW_AGENT_LIMITS.maximumStones ||
    !isNullableString(stones.centerStoneDirection) ||
    !isNullableString(stones.arrangement) ||
    !exactKeys(composition, ["direction", "motif", "requestedViews"]) ||
    !isNullableString(composition.direction) ||
    !isNullableString(composition.motif) ||
    !exactKeys(dimensions, ["relationships"]) ||
    !exactKeys(wearability, ["requirements"]) ||
    !exactKeys(referenceObservations, [
      "observations",
      "inspirationOnly",
      "doNotCopyExactly",
    ]) ||
    referenceObservations.inspirationOnly !== true ||
    referenceObservations.doNotCopyExactly !== true ||
    !exactKeys(generationNotes, [
      "structuredTransformationRequired",
      "rawCustomerProseIsFinalImageGenerationInstruction",
      "designSpecRequiredBeforeSketchInstruction",
      "handSketchInstructionRequiredBeforeGeneration",
    ]) ||
    generationNotes.structuredTransformationRequired !== true ||
    generationNotes.rawCustomerProseIsFinalImageGenerationInstruction !== false ||
    generationNotes.designSpecRequiredBeforeSketchInstruction !== true ||
    generationNotes.handSketchInstructionRequiredBeforeGeneration !== true ||
    !exactKeys(productBoundaries, [
      "internalFirstPreviewInputOnly",
      "cad",
      "quotation",
      "pricing",
      "paymentConfirmation",
      "order",
      "productionApproval",
      "manufacturabilityGuarantee",
    ]) ||
    productBoundaries.internalFirstPreviewInputOnly !== true ||
    [
      productBoundaries.cad,
      productBoundaries.quotation,
      productBoundaries.pricing,
      productBoundaries.paymentConfirmation,
      productBoundaries.order,
      productBoundaries.productionApproval,
      productBoundaries.manufacturabilityGuarantee,
    ].some((boundary) => boundary !== false)
  ) {
    fail("invalid_input");
  }

  const clonedStones: InstantPreviewAgentStone[] = stones.items.map((item) => {
    const quantity = isPlainRecord(item) ? item.quantity : undefined;
    if (
      !exactKeys(item, [
        "role",
        "type",
        "color",
        "shape",
        "setting",
        "orientation",
        "tableOrientation",
        "sizeRelationship",
        "relationshipToOtherStones",
        "quantity",
      ]) ||
      !isNullableString(item.role) ||
      !isNullableString(item.type) ||
      !isNullableString(item.color) ||
      !isNullableString(item.shape) ||
      !isNullableString(item.setting) ||
      !isNullableString(item.orientation) ||
      !isNullableString(item.tableOrientation) ||
      !isNullableString(item.sizeRelationship) ||
      !isNullableString(item.relationshipToOtherStones) ||
      !(
        quantity === null ||
        (typeof quantity === "number" &&
          Number.isInteger(quantity) &&
          quantity >= 1 &&
          quantity <= 100)
      )
    ) {
      fail("invalid_input");
    }

    return {
      role: cloneNullableSafeString(item.role),
      type: cloneNullableSafeString(item.type),
      color: cloneNullableSafeString(item.color),
      shape: cloneNullableSafeString(item.shape),
      setting: cloneNullableSafeString(item.setting),
      orientation: cloneNullableSafeString(item.orientation),
      tableOrientation: cloneNullableSafeString(item.tableOrientation),
      sizeRelationship: cloneNullableSafeString(item.sizeRelationship),
      relationshipToOtherStones: cloneNullableSafeString(
        item.relationshipToOtherStones,
      ),
      quantity: quantity as number | null,
    };
  });

  const cloned: InstantPreviewAgentStructuredInput = {
    contractVersion: INSTANT_PREVIEW_AGENT_CORE_VERSION,
    purpose: "internal_first_preview_input",
    customerIntent: {
      designIntent: normalizeString(
        customerIntent.designIntent,
        INSTANT_PREVIEW_AGENT_LIMITS.maximumDescriptionLength,
      ),
      designDescription:
        customerIntent.designDescription === null
          ? null
          : normalizeString(
              customerIntent.designDescription,
              INSTANT_PREVIEW_AGENT_LIMITS.maximumDescriptionLength,
            ),
    },
    piece: {
      canonicalType:
        piece.canonicalType as InstantPreviewAgentCanonicalPieceType,
      category: piece.category as InstantPreviewAgentPieceCategory,
      subtype: cloneNullableSafeString(piece.subtype),
      boundedOtherJewelryType: cloneNullableSafeString(
        piece.boundedOtherJewelryType,
      ),
    },
    style: {
      directions: cloneStringArray(style.directions, 12),
      colorDirection: cloneNullableSafeString(style.colorDirection),
    },
    materials: {
      directions: cloneStringArray(
        materials.directions,
        INSTANT_PREVIEW_AGENT_LIMITS.maximumMaterialDirections,
      ),
    },
    stones: {
      items: clonedStones,
      centerStoneDirection: cloneNullableSafeString(
        stones.centerStoneDirection,
      ),
      arrangement: cloneNullableSafeString(stones.arrangement),
    },
    composition: {
      direction: cloneNullableSafeString(composition.direction),
      motif: cloneNullableSafeString(composition.motif),
      requestedViews: cloneStringArray(
        composition.requestedViews,
        INSTANT_PREVIEW_AGENT_LIMITS.maximumRequestedViews,
      ),
    },
    dimensions: {
      relationships: cloneStringArray(dimensions.relationships, 12),
    },
    wearability: {
      requirements: cloneStringArray(wearability.requirements, 12),
    },
    manufacturingConstraints: cloneStringArray(
      value.manufacturingConstraints,
      INSTANT_PREVIEW_AGENT_LIMITS.maximumManufacturingConstraints,
    ),
    referenceObservations: {
      observations: cloneStringArray(
        referenceObservations.observations,
        INSTANT_PREVIEW_AGENT_LIMITS.maximumReferenceObservations,
      ),
      inspirationOnly: true,
      doNotCopyExactly: true,
    },
    unknowns: cloneStringArray(
      value.unknowns,
      INSTANT_PREVIEW_AGENT_LIMITS.maximumUnknowns,
    ),
    avoid: cloneStringArray(
      value.avoid,
      INSTANT_PREVIEW_AGENT_LIMITS.maximumAvoidRules,
    ),
    generationNotes: {
      structuredTransformationRequired: true,
      rawCustomerProseIsFinalImageGenerationInstruction: false,
      designSpecRequiredBeforeSketchInstruction: true,
      handSketchInstructionRequiredBeforeGeneration: true,
    },
    reviewRequirements: cloneStringArray(
      value.reviewRequirements,
      INSTANT_PREVIEW_AGENT_LIMITS.maximumStructuralReviewRequirements,
    ),
    productBoundaries: {
      internalFirstPreviewInputOnly: true,
      cad: false,
      quotation: false,
      pricing: false,
      paymentConfirmation: false,
      order: false,
      productionApproval: false,
      manufacturabilityGuarantee: false,
    },
  };

  if (
    JSON.stringify(cloned).length >
    INSTANT_PREVIEW_AGENT_LIMITS.maximumStructuredOutputCharacters
  ) {
    fail("oversized_input");
  }

  return cloned;
}

function sanitizeReviewInput(value: unknown): InstantPreviewAgentReviewInput {
  if (
    !isPlainRecord(value) ||
    !hasOnlyKeys(value, REVIEW_INPUT_KEYS) ||
    Object.keys(value).length !== REVIEW_INPUT_KEYS.size ||
    !isPlainRecord(value.metadata) ||
    !hasOnlyKeys(value.metadata, REVIEW_METADATA_KEYS) ||
    Object.keys(value.metadata).length !== REVIEW_METADATA_KEYS.size ||
    value.metadata.purpose !== "first_preview_automatic_review" ||
    typeof value.metadata.candidateSequence !== "number" ||
    !Number.isInteger(value.metadata.candidateSequence) ||
    value.metadata.candidateSequence < 1 ||
    value.metadata.candidateSequence > 100
  ) {
    fail("invalid_input");
  }

  return {
    structuredIntent: cloneStructuredIntentForReview(value.structuredIntent),
    designSpecRequirements: cloneStringArray(
      value.designSpecRequirements,
      INSTANT_PREVIEW_AGENT_LIMITS.maximumDesignSpecReviewRequirements,
    ),
    handSketchInstructionRequirements: cloneStringArray(
      value.handSketchInstructionRequirements,
      INSTANT_PREVIEW_AGENT_LIMITS.maximumHandSketchReviewRequirements,
    ),
    candidateObservations: cloneStringArray(
      value.candidateObservations,
      INSTANT_PREVIEW_AGENT_LIMITS.maximumCandidateObservations,
    ),
    structuralReviewRequirements: cloneStringArray(
      value.structuralReviewRequirements,
      INSTANT_PREVIEW_AGENT_LIMITS.maximumStructuralReviewRequirements,
    ),
    metadata: {
      purpose: "first_preview_automatic_review",
      candidateSequence: value.metadata.candidateSequence,
    },
  };
}

function isSafeRevisionInstruction(value: string): boolean {
  return (
    ALLOWED_REVISION_LANGUAGE.test(value) &&
    !UNSAFE_REVISION_PATTERNS.some((pattern) => pattern.test(value))
  );
}

function normalizeReviewerResult(
  value: unknown,
): InstantPreviewAgentAutomaticReviewResult {
  if (!isPlainRecord(value) || typeof value.outcome !== "string") {
    return failSafe("malformed_review");
  }

  const outcome = normalizeWhitespace(value.outcome).toUpperCase();
  if (outcome === "PASS") {
    const qualityValue = value.quality;
    if (
      !hasOnlyKeys(value, PASS_RESULT_KEYS) ||
      Object.keys(value).length > PASS_RESULT_KEYS.size
    ) {
      return failSafe("malformed_review");
    }

    if (qualityValue === undefined) {
      return { outcome: "PASS" };
    }
    if (typeof qualityValue !== "string") {
      return failSafe("malformed_review");
    }
    const quality = normalizeWhitespace(qualityValue).toLowerCase();
    return PASS_QUALITIES.has(quality)
      ? {
          outcome: "PASS",
          quality: quality as InstantPreviewAgentPassQuality,
        }
      : failSafe("malformed_review");
  }

  if (outcome === "REGENERATE") {
    if (
      !hasOnlyKeys(value, REGENERATE_RESULT_KEYS) ||
      Object.keys(value).length !== REGENERATE_RESULT_KEYS.size ||
      !Array.isArray(value.revisionInstructions) ||
      value.revisionInstructions.length < 1 ||
      value.revisionInstructions.length >
        INSTANT_PREVIEW_AGENT_LIMITS.maximumRevisionInstructions
    ) {
      return failSafe("malformed_review");
    }

    const normalized: string[] = [];
    let totalCharacters = 0;
    for (const instruction of value.revisionInstructions) {
      if (typeof instruction !== "string") {
        return failSafe("malformed_review");
      }
      const parsed = normalizeWhitespace(instruction);
      if (
        !parsed ||
        parsed.length >
          INSTANT_PREVIEW_AGENT_LIMITS.maximumRevisionInstructionLength
      ) {
        return failSafe("malformed_review");
      }
      if (!isSafeRevisionInstruction(parsed)) {
        return failSafe("unsafe_review");
      }
      totalCharacters += parsed.length;
      if (
        totalCharacters >
        INSTANT_PREVIEW_AGENT_LIMITS.maximumRevisionPayloadCharacters
      ) {
        return failSafe("malformed_review");
      }
      if (!normalized.includes(parsed)) {
        normalized.push(parsed);
      }
    }

    return {
      outcome: "REGENERATE",
      revisionInstructions: normalized,
    };
  }

  if (outcome === "FAIL_SAFE") {
    if (
      !hasOnlyKeys(value, FAIL_SAFE_RESULT_KEYS) ||
      Object.keys(value).length !== FAIL_SAFE_RESULT_KEYS.size ||
      typeof value.reason !== "string"
    ) {
      return failSafe("malformed_review");
    }
    const reason = normalizeWhitespace(value.reason).toLowerCase();
    return REVIEWER_FAIL_SAFE_REASONS.has(reason)
      ? {
          outcome: "FAIL_SAFE",
          reason: reason as InstantPreviewAgentFailSafeReason,
        }
      : failSafe("malformed_review");
  }

  return failSafe("malformed_review");
}

export async function reviewInstantPreviewCandidate(
  reviewer: InstantPreviewAgentReviewer,
  input: InstantPreviewAgentReviewInput,
): Promise<InstantPreviewAgentAutomaticReviewResult> {
  let sanitizedInput: InstantPreviewAgentReviewInput;

  try {
    sanitizedInput = sanitizeReviewInput(input);
  } catch (error) {
    if (error instanceof ParseFailure && error.category === "unsafe_input") {
      return failSafe("unsafe_review");
    }
    return failSafe(
      error instanceof ParseFailure ? "malformed_review" : "internal_failure",
    );
  }

  if (
    !reviewer ||
    typeof reviewer !== "object" ||
    typeof reviewer.reviewCandidate !== "function"
  ) {
    return failSafe("reviewer_unavailable");
  }

  try {
    const result = await reviewer.reviewCandidate(sanitizedInput);
    return normalizeReviewerResult(result);
  } catch {
    return failSafe("reviewer_unavailable");
  }
}
