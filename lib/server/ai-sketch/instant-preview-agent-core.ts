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
const MAXIMUM_SECURITY_DECODE_PASSES = 2;
const MAXIMUM_SECURITY_VARIANTS = 12;
const MAXIMUM_SECURITY_SCAN_CHARACTERS = 4_000;
const SECURITY_CONFUSABLES: Readonly<Record<string, string>> = {
  "\u04bb": "h",
  "\u043d": "h",
  "\u0442": "t",
  "\u03c4": "t",
  "\u0440": "p",
  "\u03c1": "p",
  "\u0455": "s",
  "\u0456": "i",
  "\u217c": "l",
  "\u03bf": "o",
  "\u043e": "o",
  "\u0430": "a",
  "\u0435": "e",
  "\u0441": "c",
};
const TECHNICAL_SENSITIVE_VALUE_PATTERNS = [
  /https?:\/\//i,
  /file:\/\//i,
  /\b[A-Z]:[\\/]/i,
  /(?:^|[\s"'(])\\\\[^\\\s]+\\[^\\\s]+/i,
  /(?:^|[\s"'(])(?:\.\.[\\/]|\/(?:[A-Za-z0-9._-]+[\\/])+[A-Za-z0-9._-]*)/i,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /(?:\+?\d[\d\s().-]{7,}\d)/,
  /\bNOVORA-CB-[A-Z0-9-]+\b/i,
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i,
  /\bsk-[A-Za-z0-9_-]{12,}\b/i,
  /\bbearer(?:\s+|%20)[A-Za-z0-9._~+/-]{8,}\b/i,
  /\b(api[ _-]?key|password|credential|secret|cookie|capability proof)\b/i,
  /\b(api[ _-]?key|token|password|secret)\s*[:=]\s*[A-Za-z0-9._~+/-]{6,}\b/i,
  /\b(process\.env|environment variable|\$env:|OPENAI_API_KEY|SUPABASE_[A-Z_]+|API_KEY)\b/i,
  /(?:\$\{[A-Z][A-Z0-9_]{2,}\}|%[A-Z][A-Z0-9_]{2,}%)/,
  /\b(storage bucket|storage object|storage path|object path|signed url|private url|private path)\b/i,
  /\b(customer name|email address|phone number|whatsapp|contact note|admin note|reviewer note)\b/i,
  /\b(SELECT\s+.+\s+FROM|INSERT\s+INTO|UPDATE\s+.+\s+SET|DELETE\s+FROM|DROP\s+TABLE|ALTER\s+TABLE|CREATE\s+TABLE|SQL statement|database schema|database table|database column|postgres|supabase)\b/i,
  /\b(shell command|powershell|cmd\.exe|bash|invoke-webrequest|curl|wget)\b/i,
  /\b(execute (?:a |the )?(?:tool|code|command|script)|run (?:a |the )?(?:tool|command|script)|tool execution|code execution)\b/i,
  /\b(npm|pnpm|yarn|pip)\s+(?:install|add)\b/i,
  /\b(package installation|install (?:a |the )?package)\b/i,
] as const;
const STRUCTURED_SENSITIVE_VALUE_PATTERNS = [
  ...TECHNICAL_SENSITIVE_VALUE_PATTERNS,
  /\b(make|send|take|collect|process|confirm)\b.{0,40}\bpayment\b/i,
  /\b(place|create|confirm|accept|submit)\b.{0,40}\border\b/i,
  /\b(ship|shipping|delivery address)\b/i,
  /\bCAD\b.{0,40}\b(complete|ready|finished|approved)\b/i,
  /\b(complete|ready|finished|approved)\b.{0,40}\bCAD\b/i,
  /\bproduction\b.{0,40}\b(approved|ready|confirmed)\b/i,
  /\b(approved|ready|confirmed)\b.{0,40}\bproduction\b/i,
  /\b(guaranteed?|guarantee)\b.{0,40}\b(manufacturability|manufacturable|manufacturing)\b/i,
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

function snapshotOwnDataRecord(value: unknown): Record<string, unknown> {
  if (!isPlainRecord(value)) {
    fail("invalid_input");
  }

  const snapshot: Record<string, unknown> = Object.create(null);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") {
      fail("invalid_input");
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      !descriptor ||
      descriptor.enumerable !== true ||
      !Object.prototype.hasOwnProperty.call(descriptor, "value")
    ) {
      fail("invalid_input");
    }
    if (!Object.is(Reflect.get(value, key, value), descriptor.value)) {
      fail("invalid_input");
    }
    snapshot[key] = descriptor.value;
  }
  return snapshot;
}

function snapshotOrdinaryArray(
  value: unknown,
  maximumCount: number,
): unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    fail("invalid_input");
  }

  const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
  if (
    !lengthDescriptor ||
    !Object.prototype.hasOwnProperty.call(lengthDescriptor, "value") ||
    typeof lengthDescriptor.value !== "number" ||
    !Number.isSafeInteger(lengthDescriptor.value) ||
    lengthDescriptor.value < 0
  ) {
    fail("invalid_input");
  }
  const length = lengthDescriptor.value;
  if (!Object.is(Reflect.get(value, "length", value), length)) {
    fail("invalid_input");
  }
  if (length > maximumCount) {
    fail("oversized_input");
  }

  const ownKeys = Reflect.ownKeys(value);
  if (
    ownKeys.some((key) => typeof key !== "string") ||
    ownKeys.length !== length + 1 ||
    !ownKeys.includes("length")
  ) {
    fail("invalid_input");
  }

  const snapshot: unknown[] = [];
  for (let index = 0; index < length; index += 1) {
    const key = String(index);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      !descriptor ||
      descriptor.enumerable !== true ||
      !Object.prototype.hasOwnProperty.call(descriptor, "value")
    ) {
      fail("invalid_input");
    }
    if (!Object.is(Reflect.get(value, key, value), descriptor.value)) {
      fail("invalid_input");
    }
    snapshot.push(descriptor.value);
  }

  return snapshot;
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
    const items = snapshotOrdinaryArray(
      value,
      INSTANT_PREVIEW_AGENT_LIMITS.maximumInputNodes,
    );
    for (const item of items) {
      inspectInputGraph(item, depth + 1, inspection);
    }
    return;
  }

  const snapshot = snapshotOwnDataRecord(value);
  for (const childValue of Object.values(snapshot)) {
    inspectInputGraph(childValue, depth + 1, inspection);
  }
}

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function foldSecurityConfusables(value: string): string {
  return [...value]
    .map((character) => SECURITY_CONFUSABLES[character] ?? character)
    .join("");
}

function safelyDecodePercentSequences(value: string): string {
  return value.replace(/(?:%[0-9a-f]{2})+/gi, (encoded) => {
    try {
      return decodeURIComponent(encoded);
    } catch {
      return encoded;
    }
  });
}

function createSecurityScanVariants(value: string): string[] {
  const variants = new Set<string>();
  const addSecurityForms = (candidate: string) => {
    if (
      candidate.length > MAXIMUM_SECURITY_SCAN_CHARACTERS ||
      variants.size >= MAXIMUM_SECURITY_VARIANTS
    ) {
      return;
    }
    const normalized = candidate.normalize("NFKC");
    const folded = foldSecurityConfusables(normalized);
    variants.add(candidate);
    variants.add(normalized);
    variants.add(folded);
    variants.add(
      folded.replace(/[\s\\._\-\u200b\u200c\u200d\u2060]+/g, ""),
    );
  };

  let decoded = value;
  addSecurityForms(decoded);
  for (
    let pass = 0;
    pass < MAXIMUM_SECURITY_DECODE_PASSES &&
    variants.size < MAXIMUM_SECURITY_VARIANTS;
    pass += 1
  ) {
    const next = safelyDecodePercentSequences(decoded);
    if (
      next === decoded ||
      next.length > MAXIMUM_SECURITY_SCAN_CHARACTERS
    ) {
      break;
    }
    decoded = next;
    addSecurityForms(decoded);
  }

  return [...variants].slice(0, MAXIMUM_SECURITY_VARIANTS);
}

function containsSensitiveValue(
  value: string,
  patterns: readonly RegExp[],
): boolean {
  return createSecurityScanVariants(value).some((variant) =>
    patterns.some((pattern) => pattern.test(variant)),
  );
}

function containsSensitiveDesignValue(value: string): boolean {
  return containsSensitiveValue(value, STRUCTURED_SENSITIVE_VALUE_PATTERNS);
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

  let values: unknown[];
  if (typeof value === "string") {
    values = [value];
  } else if (Array.isArray(value)) {
    values = snapshotOrdinaryArray(value, maximumCount);
  } else {
    fail("invalid_input");
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
  const items = snapshotOrdinaryArray(
    value,
    INSTANT_PREVIEW_AGENT_LIMITS.maximumStones,
  );

  return items.map((item) => {
    const stoneSource = snapshotOwnDataRecord(item);

    const quantityValue = stoneSource.quantity;
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
      role: normalizeOptionalString(stoneSource.role),
      type: normalizeOptionalString(stoneSource.type),
      color: normalizeOptionalString(stoneSource.color),
      shape: normalizeOptionalString(stoneSource.shape),
      setting: normalizeOptionalString(stoneSource.setting),
      orientation: normalizeOptionalString(stoneSource.orientation),
      tableOrientation: normalizeOptionalString(stoneSource.tableOrientation),
      sizeRelationship: normalizeOptionalString(stoneSource.sizeRelationship),
      relationshipToOtherStones: normalizeOptionalString(
        stoneSource.relationshipToOtherStones,
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
      value: createStructuredInput(snapshotOwnDataRecord(input)),
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
const REVISION_SENSITIVE_VALUE_PATTERNS = [
  ...TECHNICAL_SENSITIVE_VALUE_PATTERNS,
  /\b(payment|order|shipping|quotation|quote|pricing|price)\b/i,
  /\bCAD\b.*\b(complete|ready|finished|approved)\b/i,
  /\b(complete|ready|finished|approved)\b.*\bCAD\b/i,
  /\bproduction\b.*\b(approved|ready|confirmed)\b/i,
  /\b(approved|ready|confirmed)\b.*\bproduction\b/i,
  /\b(guaranteed?|guarantee)\b.*\b(manufacturability|manufacturable|manufacturing)\b/i,
  /\bcontact the customer\b/i,
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

function snapshotExactDataRecord(
  value: unknown,
  keys: readonly string[],
): Record<string, unknown> | null {
  try {
    const snapshot = snapshotOwnDataRecord(value);
    const actual = Object.keys(snapshot);
    if (
      actual.length !== keys.length ||
      !keys.every((key) => Object.prototype.hasOwnProperty.call(snapshot, key))
    ) {
      return null;
    }
    return snapshot;
  } catch {
    return null;
  }
}

function cloneStringArray(
  value: unknown,
  maximumCount: number,
): string[] {
  const items = snapshotOrdinaryArray(value, maximumCount);
  return items.map((item) => {
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
  const structured = snapshotExactDataRecord(value, [
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
  ]);
  if (
    !structured ||
    structured.contractVersion !== INSTANT_PREVIEW_AGENT_CORE_VERSION ||
    structured.purpose !== "internal_first_preview_input"
  ) {
    fail("invalid_input");
  }

  const customerIntent = snapshotExactDataRecord(structured.customerIntent, [
    "designIntent",
    "designDescription",
  ]);
  const piece = snapshotExactDataRecord(structured.piece, [
    "canonicalType",
    "category",
    "subtype",
    "boundedOtherJewelryType",
  ]);
  const style = snapshotExactDataRecord(structured.style, [
    "directions",
    "colorDirection",
  ]);
  const materials = snapshotExactDataRecord(structured.materials, [
    "directions",
  ]);
  const stones = snapshotExactDataRecord(structured.stones, [
    "items",
    "centerStoneDirection",
    "arrangement",
  ]);
  const composition = snapshotExactDataRecord(structured.composition, [
    "direction",
    "motif",
    "requestedViews",
  ]);
  const dimensions = snapshotExactDataRecord(structured.dimensions, [
    "relationships",
  ]);
  const wearability = snapshotExactDataRecord(structured.wearability, [
    "requirements",
  ]);
  const referenceObservations = snapshotExactDataRecord(
    structured.referenceObservations,
    ["observations", "inspirationOnly", "doNotCopyExactly"],
  );
  const generationNotes = snapshotExactDataRecord(structured.generationNotes, [
    "structuredTransformationRequired",
    "rawCustomerProseIsFinalImageGenerationInstruction",
    "designSpecRequiredBeforeSketchInstruction",
    "handSketchInstructionRequiredBeforeGeneration",
  ]);
  const productBoundaries = snapshotExactDataRecord(
    structured.productBoundaries,
    [
      "internalFirstPreviewInputOnly",
      "cad",
      "quotation",
      "pricing",
      "paymentConfirmation",
      "order",
      "productionApproval",
      "manufacturabilityGuarantee",
    ],
  );

  if (
    !customerIntent ||
    typeof customerIntent.designIntent !== "string" ||
    !isNullableString(customerIntent.designDescription) ||
    !piece ||
    typeof piece.canonicalType !== "string" ||
    !["ring", "pendant_necklace", "earrings", "bracelet_bangle", "other_custom"].includes(
      piece.canonicalType,
    ) ||
    typeof piece.category !== "string" ||
    ![
      "ring",
      "pendant_necklace",
      "earrings",
      "bracelet_bangle",
      "animal_sculpture_concept",
      "other_jewelry",
    ].includes(piece.category) ||
    !isNullableString(piece.subtype) ||
    !isNullableString(piece.boundedOtherJewelryType) ||
    !style ||
    !isNullableString(style.colorDirection) ||
    !materials ||
    !stones ||
    !isNullableString(stones.centerStoneDirection) ||
    !isNullableString(stones.arrangement) ||
    !composition ||
    !isNullableString(composition.direction) ||
    !isNullableString(composition.motif) ||
    !dimensions ||
    !wearability ||
    !referenceObservations ||
    referenceObservations.inspirationOnly !== true ||
    referenceObservations.doNotCopyExactly !== true ||
    !generationNotes ||
    generationNotes.structuredTransformationRequired !== true ||
    generationNotes.rawCustomerProseIsFinalImageGenerationInstruction !== false ||
    generationNotes.designSpecRequiredBeforeSketchInstruction !== true ||
    generationNotes.handSketchInstructionRequiredBeforeGeneration !== true ||
    !productBoundaries ||
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

  const stoneItems = snapshotOrdinaryArray(
    stones.items,
    INSTANT_PREVIEW_AGENT_LIMITS.maximumStones,
  );
  const clonedStones: InstantPreviewAgentStone[] = stoneItems.map((item) => {
    const stone = snapshotExactDataRecord(item, [
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
    ]);
    if (
      !stone ||
      !isNullableString(stone.role) ||
      !isNullableString(stone.type) ||
      !isNullableString(stone.color) ||
      !isNullableString(stone.shape) ||
      !isNullableString(stone.setting) ||
      !isNullableString(stone.orientation) ||
      !isNullableString(stone.tableOrientation) ||
      !isNullableString(stone.sizeRelationship) ||
      !isNullableString(stone.relationshipToOtherStones) ||
      !(
        stone.quantity === null ||
        (typeof stone.quantity === "number" &&
          Number.isInteger(stone.quantity) &&
          stone.quantity >= 1 &&
          stone.quantity <= 100)
      )
    ) {
      fail("invalid_input");
    }

    return {
      role: cloneNullableSafeString(stone.role),
      type: cloneNullableSafeString(stone.type),
      color: cloneNullableSafeString(stone.color),
      shape: cloneNullableSafeString(stone.shape),
      setting: cloneNullableSafeString(stone.setting),
      orientation: cloneNullableSafeString(stone.orientation),
      tableOrientation: cloneNullableSafeString(stone.tableOrientation),
      sizeRelationship: cloneNullableSafeString(stone.sizeRelationship),
      relationshipToOtherStones: cloneNullableSafeString(
        stone.relationshipToOtherStones,
      ),
      quantity: stone.quantity as number | null,
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
      structured.manufacturingConstraints,
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
      structured.unknowns,
      INSTANT_PREVIEW_AGENT_LIMITS.maximumUnknowns,
    ),
    avoid: cloneStringArray(
      structured.avoid,
      INSTANT_PREVIEW_AGENT_LIMITS.maximumAvoidRules,
    ),
    generationNotes: {
      structuredTransformationRequired: true,
      rawCustomerProseIsFinalImageGenerationInstruction: false,
      designSpecRequiredBeforeSketchInstruction: true,
      handSketchInstructionRequiredBeforeGeneration: true,
    },
    reviewRequirements: cloneStringArray(
      structured.reviewRequirements,
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
  const reviewInput = snapshotExactDataRecord(value, [...REVIEW_INPUT_KEYS]);
  const metadata = reviewInput
    ? snapshotExactDataRecord(reviewInput.metadata, [...REVIEW_METADATA_KEYS])
    : null;
  if (
    !reviewInput ||
    !metadata ||
    metadata.purpose !== "first_preview_automatic_review" ||
    typeof metadata.candidateSequence !== "number" ||
    !Number.isInteger(metadata.candidateSequence) ||
    metadata.candidateSequence < 1 ||
    metadata.candidateSequence > 100
  ) {
    fail("invalid_input");
  }

  return {
    structuredIntent: cloneStructuredIntentForReview(
      reviewInput.structuredIntent,
    ),
    designSpecRequirements: cloneStringArray(
      reviewInput.designSpecRequirements,
      INSTANT_PREVIEW_AGENT_LIMITS.maximumDesignSpecReviewRequirements,
    ),
    handSketchInstructionRequirements: cloneStringArray(
      reviewInput.handSketchInstructionRequirements,
      INSTANT_PREVIEW_AGENT_LIMITS.maximumHandSketchReviewRequirements,
    ),
    candidateObservations: cloneStringArray(
      reviewInput.candidateObservations,
      INSTANT_PREVIEW_AGENT_LIMITS.maximumCandidateObservations,
    ),
    structuralReviewRequirements: cloneStringArray(
      reviewInput.structuralReviewRequirements,
      INSTANT_PREVIEW_AGENT_LIMITS.maximumStructuralReviewRequirements,
    ),
    metadata: {
      purpose: "first_preview_automatic_review",
      candidateSequence: metadata.candidateSequence,
    },
  };
}

function isSafeRevisionInstruction(value: string): boolean {
  return (
    ALLOWED_REVISION_LANGUAGE.test(value) &&
    !containsSensitiveValue(value, REVISION_SENSITIVE_VALUE_PATTERNS)
  );
}

function normalizeReviewerResult(
  value: unknown,
): InstantPreviewAgentAutomaticReviewResult {
  try {
    const result = snapshotOwnDataRecord(value);
    const outcome = result.outcome;
    if (outcome === "PASS") {
      const actualKeys = Object.keys(result);
      if (
        actualKeys.length < 1 ||
        actualKeys.length > PASS_RESULT_KEYS.size ||
        !hasOnlyKeys(result, PASS_RESULT_KEYS)
      ) {
        return failSafe("malformed_review");
      }

      const qualityValue = result.quality;
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
        Object.keys(result).length !== REGENERATE_RESULT_KEYS.size ||
        !hasOnlyKeys(result, REGENERATE_RESULT_KEYS)
      ) {
        return failSafe("malformed_review");
      }

      let instructions: unknown[];
      try {
        instructions = snapshotOrdinaryArray(
          result.revisionInstructions,
          INSTANT_PREVIEW_AGENT_LIMITS.maximumRevisionInstructions,
        );
      } catch {
        return failSafe("malformed_review");
      }
      if (instructions.length < 1) {
        return failSafe("malformed_review");
      }

      const normalized: string[] = [];
      let totalCharacters = 0;
      for (const instruction of instructions) {
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
        totalCharacters += parsed.length;
        if (
          totalCharacters >
          INSTANT_PREVIEW_AGENT_LIMITS.maximumRevisionPayloadCharacters
        ) {
          return failSafe("malformed_review");
        }
        if (!isSafeRevisionInstruction(parsed)) {
          return failSafe("unsafe_review");
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
        Object.keys(result).length !== FAIL_SAFE_RESULT_KEYS.size ||
        !hasOnlyKeys(result, FAIL_SAFE_RESULT_KEYS) ||
        typeof result.reason !== "string"
      ) {
        return failSafe("malformed_review");
      }
      const reason = normalizeWhitespace(result.reason).toLowerCase();
      return REVIEWER_FAIL_SAFE_REASONS.has(reason)
        ? {
            outcome: "FAIL_SAFE",
            reason: reason as InstantPreviewAgentFailSafeReason,
          }
        : failSafe("malformed_review");
    }

    return failSafe("malformed_review");
  } catch {
    return failSafe("malformed_review");
  }
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

  let reviewCandidate: (
    input: InstantPreviewAgentReviewInput,
  ) => Promise<unknown> | unknown;
  try {
    if (
      !reviewer ||
      (typeof reviewer !== "object" && typeof reviewer !== "function")
    ) {
      return failSafe("reviewer_unavailable");
    }
    const descriptor = Object.getOwnPropertyDescriptor(
      reviewer,
      "reviewCandidate",
    );
    if (
      !descriptor ||
      descriptor.enumerable !== true ||
      !Object.prototype.hasOwnProperty.call(descriptor, "value") ||
      typeof descriptor.value !== "function"
    ) {
      return failSafe("reviewer_unavailable");
    }
    const retrieved = Reflect.get(reviewer, "reviewCandidate", reviewer);
    if (retrieved !== descriptor.value || typeof retrieved !== "function") {
      return failSafe("reviewer_unavailable");
    }
    reviewCandidate = retrieved as typeof reviewCandidate;
  } catch {
    return failSafe("reviewer_unavailable");
  }

  try {
    const result = await Reflect.apply(reviewCandidate, reviewer, [
      sanitizedInput,
    ]);
    return normalizeReviewerResult(result);
  } catch {
    return failSafe("reviewer_unavailable");
  }
}
