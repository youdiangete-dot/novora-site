import "server-only";
import { Buffer } from "node:buffer";
import { types as nodeUtilTypes } from "node:util";

import {
  NOVORA_DESIGN_SPEC_VERSION,
  type NovoraDesignSpec,
  type NovoraDesignSpecMotifType,
  type NovoraDesignSpecSettingType,
  validateNovoraDesignSpec,
  ZODIAC_MOUSE_EYE_GEMSTONE_RULE,
} from "./design-spec";
import {
  createNovoraHandSketchInstructionFromDesignSpec,
  type NovoraHandSketchInstruction,
  validateNovoraHandSketchInstruction,
} from "./hand-sketch-instruction";
import {
  INSTANT_PREVIEW_AGENT_CORE_VERSION,
  type InstantPreviewAgentStructuredInput,
} from "./instant-preview-agent-core";

export const NOVORA_JEWELRY_DESIGN_SKILLS_VERSION =
  "novora_jewelry_design_skills_v1" as const;

export const NOVORA_JEWELRY_DESIGN_SKILLS_LIMITS = {
  maximumInputCharacters: 24_000,
  maximumInputBytes: 24_000,
  maximumOutputCharacters: 48_000,
  maximumStringLength: 2_000,
  maximumListLength: 16,
  maximumNegativeConstraints: 24,
  maximumAnnotations: 8,
} as const;

export const NOVORA_PII_FREE_DESIGN_REFERENCE =
  "INTERNAL-PII-FREE-STRUCTURED-BRIEF";

const BOUNDED_OTHER_JEWELRY_TYPES = new Set([
  "brooch",
  "articulated brooch",
  "pin",
  "charm",
  "anklet",
  "cufflink",
  "cufflinks",
  "tie clip",
  "tiara",
  "hairpin",
  "body jewelry",
]);

export type NovoraJewelryDesignSkillsFailureCategory =
  | "invalid_input"
  | "unsupported_input"
  | "oversized_input"
  | "unsafe_input"
  | "contradictory_input"
  | "internal_failure";

export type NovoraJewelryDesignSkillsOutput = {
  skills_version: typeof NOVORA_JEWELRY_DESIGN_SKILLS_VERSION;
  designSpec: NovoraDesignSpec;
  handSketchInstruction: NovoraHandSketchInstruction;
};

export type ExecuteNovoraJewelryDesignSkillsResult =
  | {
      ok: true;
      value: NovoraJewelryDesignSkillsOutput;
    }
  | {
      ok: false;
      error: {
        category: NovoraJewelryDesignSkillsFailureCategory;
      };
    };

class JewelryDesignSkillsFailure extends Error {
  constructor(readonly category: NovoraJewelryDesignSkillsFailureCategory) {
    super(category);
  }
}

const SENSITIVE_PATTERNS = [
  /https?:\/\//i,
  /file:\/\//i,
  /\b[A-Z]:[\\/]/i,
  /(?:^|[\s"'(])\\\\[^\\\s]+\\[^\\\s]+/i,
  /(?:^|[\s"'(])\/(?:etc|home|users?|var|tmp|private)\//i,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /(?:\+?\d[\d\s().-]{7,}\d)/,
  /\bNOVORA-CB-[A-Z0-9-]+\b/i,
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i,
  /\bsk-[A-Za-z0-9_-]{12,}\b/i,
  /\bbearer\s+[A-Za-z0-9._~+/-]{8,}\b/i,
  /\b(api[ _-]?key|password|credential|secret|access token|refresh token)\b/i,
  /\b(process\.env|environment variable|\$env:|OPENAI_API_KEY|SUPABASE_[A-Z_]+)\b/i,
  /\b(storage bucket|storage object|storage path|object path|signed url|private url|provider metadata|provider request)\b/i,
  /\b(customer name|email address|phone number|whatsapp|contact note|admin note|reviewer note)\b/i,
  /\b(SELECT\s+.{1,120}\s+FROM|INSERT\s+INTO|UPDATE\s+.{1,120}\s+SET|DELETE\s+FROM|DROP\s+TABLE|ALTER\s+TABLE|CREATE\s+TABLE)\b/i,
  /\b(shell command|powershell|cmd\.exe|bash|invoke-webrequest|curl|wget|npm\s+(?:install|i)|npx\s)\b/i,
] as const;

const TOP_LEVEL_KEYS = [
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
] as const;

const RECORD_KEYS = {
  customerIntent: ["designIntent", "designDescription"],
  piece: ["canonicalType", "category", "subtype", "boundedOtherJewelryType"],
  style: ["directions", "colorDirection"],
  materials: ["directions"],
  stones: ["items", "centerStoneDirection", "arrangement"],
  composition: ["direction", "motif", "requestedViews"],
  dimensions: ["relationships"],
  wearability: ["requirements"],
  referenceObservations: ["observations", "inspirationOnly", "doNotCopyExactly"],
  generationNotes: [
    "structuredTransformationRequired",
    "rawCustomerProseIsFinalImageGenerationInstruction",
    "designSpecRequiredBeforeSketchInstruction",
    "handSketchInstructionRequiredBeforeGeneration",
  ],
  productBoundaries: [
    "internalFirstPreviewInputOnly",
    "cad",
    "quotation",
    "pricing",
    "paymentConfirmation",
    "order",
    "productionApproval",
    "manufacturabilityGuarantee",
  ],
  stone: [
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
  ],
} as const;

function fail(category: NovoraJewelryDesignSkillsFailureCategory): never {
  throw new JewelryDesignSkillsFailure(category);
}

function failure(
  category: NovoraJewelryDesignSkillsFailureCategory,
): ExecuteNovoraJewelryDesignSkillsResult {
  return { ok: false, error: { category } };
}

function assertOrdinaryRecord(
  value: unknown,
  allowedKeys: readonly string[],
): Record<string, unknown> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    nodeUtilTypes.isProxy(value)
  ) {
    fail("invalid_input");
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail("invalid_input");
  }
  const allowed = new Set(allowedKeys);
  const ownKeys = Reflect.ownKeys(value);
  if (
    ownKeys.some((key) => typeof key !== "string" || !allowed.has(key))
  ) {
    fail("invalid_input");
  }
  const snapshot: Record<string, unknown> = {};
  for (const key of allowedKeys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      !descriptor ||
      descriptor.enumerable !== true ||
      !Object.prototype.hasOwnProperty.call(descriptor, "value")
    ) {
      fail("invalid_input");
    }
    snapshot[key] = descriptor.value;
  }
  return snapshot;
}

function snapshotArray(value: unknown, maximum: number): unknown[] {
  const isArray = Array.isArray(value);
  const isProxy = isArray && nodeUtilTypes.isProxy(value);
  if (
    !isArray ||
    isProxy ||
    Object.getPrototypeOf(value) !== Array.prototype ||
    value.length > maximum
  ) {
    fail(isArray && !isProxy && value.length > maximum ? "oversized_input" : "invalid_input");
  }
  const expectedKeys = new Set([
    ...Array.from({ length: value.length }, (_, index) => String(index)),
    "length",
  ]);
  if (
    Reflect.ownKeys(value).some(
      (key) => typeof key !== "string" || !expectedKeys.has(key),
    )
  ) {
    fail("invalid_input");
  }
  const snapshot: unknown[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (
      !descriptor ||
      descriptor.enumerable !== true ||
      !Object.prototype.hasOwnProperty.call(descriptor, "value")
    ) {
      fail("invalid_input");
    }
    snapshot.push(descriptor.value);
  }
  return snapshot;
}

function safeString(value: unknown, nullable = false): string | null {
  if (nullable && value === null) return null;
  if (typeof value !== "string") fail("invalid_input");
  if (value.length > NOVORA_JEWELRY_DESIGN_SKILLS_LIMITS.maximumStringLength) {
    fail("oversized_input");
  }
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!nullable && !normalized) fail("invalid_input");
  if (SENSITIVE_PATTERNS.some((pattern) => pattern.test(normalized))) {
    fail("unsafe_input");
  }
  return normalized || null;
}

function stringList(
  value: unknown,
  maximum: number = NOVORA_JEWELRY_DESIGN_SKILLS_LIMITS.maximumListLength,
): string[] {
  return snapshotArray(value, maximum).map((item) => safeString(item) as string);
}

function nullableString(value: unknown): string | null {
  return safeString(value, true);
}

function snapshotStone(value: unknown): InstantPreviewAgentStructuredInput["stones"]["items"][number] {
  const source = assertOrdinaryRecord(value, RECORD_KEYS.stone);
  const quantity = source.quantity;
  if (
    quantity !== null &&
    (typeof quantity !== "number" ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 100)
  ) {
    fail("invalid_input");
  }
  return {
    role: nullableString(source.role),
    type: nullableString(source.type),
    color: nullableString(source.color),
    shape: nullableString(source.shape),
    setting: nullableString(source.setting),
    orientation: nullableString(source.orientation),
    tableOrientation: nullableString(source.tableOrientation),
    sizeRelationship: nullableString(source.sizeRelationship),
    relationshipToOtherStones: nullableString(source.relationshipToOtherStones),
    quantity: quantity as number | null,
  };
}

function snapshotStructuredInput(value: unknown): InstantPreviewAgentStructuredInput {
  const source = assertOrdinaryRecord(value, TOP_LEVEL_KEYS);
  const customerIntent = assertOrdinaryRecord(source.customerIntent, RECORD_KEYS.customerIntent);
  const piece = assertOrdinaryRecord(source.piece, RECORD_KEYS.piece);
  const style = assertOrdinaryRecord(source.style, RECORD_KEYS.style);
  const materials = assertOrdinaryRecord(source.materials, RECORD_KEYS.materials);
  const stones = assertOrdinaryRecord(source.stones, RECORD_KEYS.stones);
  const composition = assertOrdinaryRecord(source.composition, RECORD_KEYS.composition);
  const dimensions = assertOrdinaryRecord(source.dimensions, RECORD_KEYS.dimensions);
  const wearability = assertOrdinaryRecord(source.wearability, RECORD_KEYS.wearability);
  const references = assertOrdinaryRecord(
    source.referenceObservations,
    RECORD_KEYS.referenceObservations,
  );
  const generationNotes = assertOrdinaryRecord(
    source.generationNotes,
    RECORD_KEYS.generationNotes,
  );
  const productBoundaries = assertOrdinaryRecord(
    source.productBoundaries,
    RECORD_KEYS.productBoundaries,
  );

  const canonicalTypes = new Set([
    "ring",
    "pendant_necklace",
    "earrings",
    "bracelet_bangle",
    "other_custom",
  ]);
  const categories = new Set([
    "ring",
    "pendant_necklace",
    "earrings",
    "bracelet_bangle",
    "animal_sculpture_concept",
    "other_jewelry",
  ]);
  if (
    source.contractVersion !== INSTANT_PREVIEW_AGENT_CORE_VERSION ||
    source.purpose !== "internal_first_preview_input" ||
    typeof piece.canonicalType !== "string" ||
    !canonicalTypes.has(piece.canonicalType) ||
    typeof piece.category !== "string" ||
    !categories.has(piece.category)
  ) {
    fail("unsupported_input");
  }
  const expectedCategory =
    piece.canonicalType === "other_custom"
      ? new Set(["animal_sculpture_concept", "other_jewelry"])
      : new Set([piece.canonicalType]);
  if (!expectedCategory.has(piece.category as string)) {
    fail("contradictory_input");
  }
  const boundedOtherJewelryType = nullableString(piece.boundedOtherJewelryType);
  if (piece.canonicalType === "other_custom") {
    if (
      piece.category === "animal_sculpture_concept" &&
      boundedOtherJewelryType !== null
    ) {
      fail("contradictory_input");
    }
    if (
      piece.category === "other_jewelry" &&
      (boundedOtherJewelryType === null ||
        !BOUNDED_OTHER_JEWELRY_TYPES.has(
          boundedOtherJewelryType.toLowerCase(),
        ))
    ) {
      fail("unsupported_input");
    }
  } else if (boundedOtherJewelryType !== null) {
    fail("contradictory_input");
  }
  if (
    references.inspirationOnly !== true ||
    references.doNotCopyExactly !== true ||
    generationNotes.structuredTransformationRequired !== true ||
    generationNotes.rawCustomerProseIsFinalImageGenerationInstruction !== false ||
    generationNotes.designSpecRequiredBeforeSketchInstruction !== true ||
    generationNotes.handSketchInstructionRequiredBeforeGeneration !== true ||
    productBoundaries.internalFirstPreviewInputOnly !== true ||
    [
      "cad",
      "quotation",
      "pricing",
      "paymentConfirmation",
      "order",
      "productionApproval",
      "manufacturabilityGuarantee",
    ].some((key) => productBoundaries[key] !== false)
  ) {
    fail("unsafe_input");
  }

  const snapshot: InstantPreviewAgentStructuredInput = {
    contractVersion: INSTANT_PREVIEW_AGENT_CORE_VERSION,
    purpose: "internal_first_preview_input",
    customerIntent: {
      designIntent: safeString(customerIntent.designIntent) as string,
      designDescription: nullableString(customerIntent.designDescription),
    },
    piece: {
      canonicalType: piece.canonicalType as InstantPreviewAgentStructuredInput["piece"]["canonicalType"],
      category: piece.category as InstantPreviewAgentStructuredInput["piece"]["category"],
      subtype: nullableString(piece.subtype),
      boundedOtherJewelryType,
    },
    style: {
      directions: stringList(style.directions),
      colorDirection: nullableString(style.colorDirection),
    },
    materials: { directions: stringList(materials.directions, 8) },
    stones: {
      items: snapshotArray(stones.items, 12).map(snapshotStone),
      centerStoneDirection: nullableString(stones.centerStoneDirection),
      arrangement: nullableString(stones.arrangement),
    },
    composition: {
      direction: nullableString(composition.direction),
      motif: nullableString(composition.motif),
      requestedViews: stringList(composition.requestedViews, 8),
    },
    dimensions: { relationships: stringList(dimensions.relationships, 12) },
    wearability: { requirements: stringList(wearability.requirements, 12) },
    manufacturingConstraints: stringList(source.manufacturingConstraints, 12),
    referenceObservations: {
      observations: stringList(references.observations, 8),
      inspirationOnly: true,
      doNotCopyExactly: true,
    },
    unknowns: stringList(source.unknowns, 12),
    avoid: stringList(source.avoid, 12),
    generationNotes: {
      structuredTransformationRequired: true,
      rawCustomerProseIsFinalImageGenerationInstruction: false,
      designSpecRequiredBeforeSketchInstruction: true,
      handSketchInstructionRequiredBeforeGeneration: true,
    },
    reviewRequirements: stringList(source.reviewRequirements, 16),
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
    Buffer.byteLength(JSON.stringify(snapshot), "utf8") >
    NOVORA_JEWELRY_DESIGN_SKILLS_LIMITS.maximumInputBytes
  ) {
    fail("oversized_input");
  }
  return snapshot;
}

const SUPPORTED_NEGATION_PATTERN =
  /\b(?:do\s+not|don't|avoid|without|never|must\s+not|should\s+not|cannot|can't|no|not)\b/i;

function boundedStatements(value: string): string[] {
  return value
    .replace(/[‘’]/g, "'")
    .trim()
    .replace(/\s+/g, " ")
    .split(
      /(?:[.!?;]+\s*|,?\s+\b(?:but|however)\b\s+|,?\s+\band\b\s+(?=(?:do\s+not|don't|avoid|without|never|must\s+not|should\s+not|cannot|can't|no|not)\b))/i,
    )
    .map((statement) => statement.trim())
    .filter(Boolean);
}

function positiveBoundedStatements(
  values: Array<string | null | undefined>,
): string[] {
  return values
    .flatMap((value) => (value ? boundedStatements(value) : []))
    .filter((statement) => !SUPPORTED_NEGATION_PATTERN.test(statement));
}

function negativeBoundedStatements(
  values: Array<string | null | undefined>,
): string[] {
  return values
    .flatMap((value) => (value ? boundedStatements(value) : []))
    .filter((statement) => SUPPORTED_NEGATION_PATTERN.test(statement));
}

function positiveValue(value: string | null | undefined): string | null {
  const statements = positiveBoundedStatements([value]);
  return statements.length > 0 ? statements.join("; ") : null;
}

function positiveValues(
  values: Array<string | null | undefined>,
): string[] {
  return positiveBoundedStatements(values);
}

function allDesignTextSources(
  input: InstantPreviewAgentStructuredInput,
): string[] {
  return [
    input.customerIntent.designIntent,
    input.customerIntent.designDescription,
    input.piece.subtype,
    input.piece.boundedOtherJewelryType,
    ...input.style.directions,
    input.style.colorDirection,
    ...input.materials.directions,
    input.stones.centerStoneDirection,
    input.stones.arrangement,
    ...input.stones.items.flatMap((stone) => [
      stone.role,
      stone.type,
      stone.color,
      stone.shape,
      stone.setting,
      stone.orientation,
      stone.tableOrientation,
      stone.sizeRelationship,
      stone.relationshipToOtherStones,
    ]),
    input.composition.direction,
    input.composition.motif,
    ...input.composition.requestedViews,
    ...input.dimensions.relationships,
    ...input.wearability.requirements,
    ...input.manufacturingConstraints,
    ...input.referenceObservations.observations,
  ].filter((value): value is string => value !== null);
}

function allPositiveDesignText(
  input: InstantPreviewAgentStructuredInput,
): string[] {
  return positiveBoundedStatements(allDesignTextSources(input));
}

function allNegativeDesignText(
  input: InstantPreviewAgentStructuredInput,
): string[] {
  return [
    ...negativeBoundedStatements(allDesignTextSources(input)),
    ...negativeBoundedStatements(input.reviewRequirements),
    ...input.avoid.flatMap(boundedStatements),
  ];
}

function orientationsFromStatements(
  values: string[],
): Set<"vertical" | "horizontal"> {
  const result = new Set<"vertical" | "horizontal">();
  for (const value of values) {
    if (/\b(vertical|portrait|north[- ]south|long axis (?:up|vertical)|point (?:up|down|toward fingertip|towards fingertip))\b/i.test(value)) {
      result.add("vertical");
    }
    if (/\b(horizontal|landscape|east[- ]west|long axis (?:sideways|horizontal)|rotated? 90)\b/i.test(value)) {
      result.add("horizontal");
    }
  }
  return result;
}

function orientations(values: string[]): Set<"vertical" | "horizontal"> {
  return orientationsFromStatements(positiveBoundedStatements(values));
}

function tableOrientationsFromStatements(
  values: string[],
): Set<"face_up" | "other"> {
  const result = new Set<"face_up" | "other">();
  for (const value of values) {
    if (/\b(face[- ]up|table[- ]up|table facing (?:up|viewer|outward))\b/i.test(value)) result.add("face_up");
    if (/\b(face[- ]down|table[- ]down|table facing inward)\b/i.test(value)) result.add("other");
  }
  return result;
}

function tableOrientations(values: string[]): Set<"face_up" | "other"> {
  return tableOrientationsFromStatements(positiveBoundedStatements(values));
}

type SupportedSettingFamily = "prong" | "bezel" | "pave" | "channel";
type SupportedProngStyle = "single" | "split" | "double" | "paired";
type EarringPairMode = "matching" | "intentionally_asymmetric" | null;

const NUMBER_WORDS: Record<string, number> = {
  single: 1,
  one: 1,
  pair: 2,
  double: 2,
  two: 2,
  triple: 3,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
};

const PRONG_COUNT_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
};

function settingFamiliesFromStatements(
  values: string[],
): Set<SupportedSettingFamily> {
  const result = new Set<SupportedSettingFamily>();
  for (const value of values) {
    if (/\bprongs?\b/i.test(value)) result.add("prong");
    if (/\bbezel\b/i.test(value)) result.add("bezel");
    if (/\bpav(?:e|é)\b/i.test(value)) result.add("pave");
    if (/\bchannel\b/i.test(value)) result.add("channel");
  }
  return result;
}

function settingFamilies(values: string[]): Set<SupportedSettingFamily> {
  return settingFamiliesFromStatements(positiveBoundedStatements(values));
}

function prongCountsFromStatements(values: string[]): Set<number> {
  const result = new Set<number>();
  for (const value of values) {
    for (const match of value.matchAll(
      /\b(one|two|three|four|five|six|[1-6])(?:[- ]+(?:single|split|double|paired))?[- ]+prongs?\b/gi,
    )) {
      result.add(
        PRONG_COUNT_WORDS[match[1].toLowerCase()] ?? Number(match[1]),
      );
    }
  }
  return result;
}

function prongCounts(values: string[]): Set<number> {
  return prongCountsFromStatements(positiveBoundedStatements(values));
}

function prongStylesFromStatements(
  values: string[],
): Set<SupportedProngStyle> {
  const result = new Set<SupportedProngStyle>();
  for (const value of values) {
    if (/\bsingle[- ]prongs?\b/i.test(value)) result.add("single");
    if (/\bsplit[- ]prongs?\b/i.test(value)) result.add("split");
    if (/\bdouble[- ]prongs?\b/i.test(value)) result.add("double");
    if (/\bpaired[- ]prongs?\b/i.test(value)) result.add("paired");
  }
  return result;
}

function prongStyles(values: string[]): Set<SupportedProngStyle> {
  return prongStylesFromStatements(positiveBoundedStatements(values));
}

function prongPositions(value: string): Set<string> {
  const positive = positiveBoundedStatements([value]).join("; ");
  if (!/\bprongs?\b/i.test(positive)) return new Set();
  const result = new Set<string>();
  for (const match of positive.matchAll(/\b(12|3|6|9)\s*o(?:'|’)?clock\b/gi)) {
    result.add(`${match[1]}_oclock`);
  }
  for (const token of ["top", "bottom", "left", "right", "tip"] as const) {
    if (
      new RegExp(
        `\\b${token}\\b.{0,60}\\bprongs?\\b|\\bprongs?\\b.{0,60}\\b${token}\\b`,
        "i",
      ).test(positive)
    ) {
      result.add(token);
    }
  }
  return result;
}

function setsEqual(left: Set<string>, right: Set<string>): boolean {
  return (
    left.size === right.size &&
    [...left].every((value) => right.has(value))
  );
}

function motifCounts(values: string[]): Set<number> {
  const result = new Set<number>();
  const motif =
    "(?:motifs?|leaves?|leaf|flowers?|mice|mouse|animals?|clouds?|waves?|gears?)";
  for (const value of positiveBoundedStatements(values)) {
    const patterns = [
      new RegExp(
        `\\b(single|one|pair|double|two|triple|three|four|five|six|1|2|3|4|5|6)\\b.{0,16}\\b${motif}\\b`,
        "gi",
      ),
      new RegExp(
        `\\b${motif}\\b.{0,16}\\b(single|one|pair|double|two|triple|three|four|five|six|1|2|3|4|5|6)\\b`,
        "gi",
      ),
    ];
    for (const pattern of patterns) {
      for (const match of value.matchAll(pattern)) {
        result.add(
          NUMBER_WORDS[match[1].toLowerCase()] ?? Number(match[1]),
        );
      }
    }
  }
  return result;
}

function motifLocations(values: string[]): Set<string> {
  const result = new Set<string>();
  const motif =
    "(?:motifs?|leaves?|leaf|flowers?|mice|mouse|animals?|clouds?|waves?|gears?)";
  const locations = [
    "shoulders?",
    "shanks?",
    "gallery",
    "bezel",
    "halo",
    "pendant body",
    "bail",
    "clasp",
    "earring drops?",
  ];
  for (const value of positiveBoundedStatements(values)) {
    for (const location of locations) {
      if (
        new RegExp(
          `\\b${motif}\\b.{0,28}\\b${location}\\b|\\b${location}\\b.{0,28}\\b${motif}\\b`,
          "i",
        ).test(value)
      ) {
        result.add(location.replace(/[?]/g, ""));
      }
    }
  }
  return result;
}

function explicitGoldColor(
  input: InstantPreviewAgentStructuredInput,
): string {
  const extractColors = (values: string[]) => {
    const colors = new Set<string>();
    for (const value of values) {
      for (const match of value.matchAll(
        /\b(yellow|white|rose)\s+gold\b/gi,
      )) {
        colors.add(`${match[1].toLowerCase()} gold`);
      }
    }
    return colors;
  };
  const colors = extractColors(
    positiveBoundedStatements(input.materials.directions),
  );
  const negativeColors = extractColors(allNegativeDesignText(input));
  if ([...colors].some((color) => negativeColors.has(color))) {
    fail("contradictory_input");
  }
  if (colors.size > 1) fail("contradictory_input");
  return colors.size === 1 ? [...colors][0] : "unspecified";
}

function preservedNegativeConstraint(
  input: InstantPreviewAgentStructuredInput,
  value: string,
): string {
  const mouseDesign = allPositiveDesignText(input).some((item) =>
    /\b(mouse|mice|rat)\b/i.test(item),
  );
  if (
    mouseDesign &&
    /\b(?:ruby|red(?: gemstone| stone)?)\b.{0,40}\b(?:eye|eyes)\b|\b(?:eye|eyes)\b.{0,40}\b(?:ruby|red(?: gemstone| stone)?)\b/i.test(
      value,
    )
  ) {
    return ZODIAC_MOUSE_EYE_GEMSTONE_RULE;
  }
  return `preserve negative constraint: ${value}`;
}

function shankCountsFromStatements(values: string[]): Set<number> {
  const shankCounts = new Set<number>();
  for (const value of values) {
    const match = value.match(/\b(single|double|triple|one|two|three|1|2|3)[- ](?:ring )?shanks?\b/i);
    if (match) {
      const words: Record<string, number> = {
        single: 1,
        one: 1,
        double: 2,
        two: 2,
        triple: 3,
        three: 3,
      };
      shankCounts.add(words[match[1].toLowerCase()] ?? Number(match[1]));
    }
    if (
      /\bone main ring\b.{0,80}\bone (?:combined )?companion ring\b|\bone (?:combined )?companion ring\b.{0,80}\bone main ring\b/i.test(
        value,
      )
    ) {
      shankCounts.add(2);
    }
  }
  return shankCounts;
}

function assertSupportedProngSyntax(values: string[]): void {
  for (const value of positiveBoundedStatements(values)) {
    if (!/\bprongs?\b/i.test(value)) continue;
    const exactCountMentions = [...value.matchAll(
      /\b(one|two|three|four|five|six|[1-6])(?:[- ]+(?:single|split|double|paired))?[- ]+prongs?\b/gi,
    )];
    const countCandidates = [...value.matchAll(
      /\b(one|two|three|four|five|six|\d+|zero|seven|eight|nine|ten|pair|triple|quadruple)\b(?=[^.!?;]{0,24}\bprongs?\b)/gi,
    )];
    const exactStyleMentions = [...value.matchAll(
      /\b(single|split|double|paired)[- ]+prongs?\b/gi,
    )];
    const styleCandidates = [...value.matchAll(
      /\b(single|split|double|paired)\b(?=[^.!?;]{0,24}\bprongs?\b)/gi,
    )];
    if (
      countCandidates.length !== exactCountMentions.length ||
      styleCandidates.length !== exactStyleMentions.length
    ) {
      fail("unsupported_input");
    }
  }
}

function assertStructuralConsistency(input: InstantPreviewAgentStructuredInput): {
  stacking: boolean;
  openStacking: boolean;
  longAxis: "vertical" | "horizontal" | null;
  tableDirection: "face_up" | "other" | null;
  prongCount: number | null;
  prongStyle: SupportedProngStyle | null;
  prongPositionSummary: string | null;
  settingFamily: SupportedSettingFamily | null;
  shankCount: number | null;
  motifLocation: string | null;
  motifCount: number | null;
  motifContinuesFrontToBack: boolean;
  earringPairMode: EarringPairMode;
} {
  const text = allPositiveDesignText(input);
  const negativeText = allNegativeDesignText(input);
  const centerStones = input.stones.items.filter((stone) =>
    /\b(center|centre|main)\b/i.test(positiveValue(stone.role) ?? ""),
  );
  if (centerStones.length > 1) fail("contradictory_input");
  const center = centerStones[0] ?? input.stones.items[0];
  const stoneViewText = input.composition.requestedViews.filter((value) =>
    !/\b(accent|side stone)\b/i.test(value) &&
    /\b(center|centre|stone|long axis|table|face[- ](?:up|down)|stack)\b/i.test(value),
  );
  const centerText = [
    input.stones.centerStoneDirection,
    center?.orientation,
    center?.tableOrientation,
    center?.shape,
    ...stoneViewText,
  ].filter((value): value is string => value !== null && value !== undefined);
  const longAxes = orientations(centerText);
  if (longAxes.size > 1) fail("contradictory_input");
  const negativeLongAxes = orientationsFromStatements(negativeText);
  if ([...longAxes].some((axis) => negativeLongAxes.has(axis))) {
    fail("contradictory_input");
  }
  const centerTables = tableOrientations([
    center?.tableOrientation,
    input.stones.centerStoneDirection,
    ...stoneViewText,
  ].filter((value): value is string => Boolean(value)));
  if (centerTables.size > 1) fail("contradictory_input");
  const negativeTables = tableOrientationsFromStatements(negativeText);
  if ([...centerTables].some((table) => negativeTables.has(table))) {
    fail("contradictory_input");
  }
  const accentViewText = input.composition.requestedViews.filter((value) =>
    /\b(accent|side stone)\b/i.test(value),
  );
  for (const accent of input.stones.items.filter((stone) => stone !== center)) {
    const accentTables = tableOrientations(
      [accent.tableOrientation, ...accentViewText].filter(
        (value): value is string => Boolean(value),
      ),
    );
    if (accentTables.size > 1) fail("contradictory_input");
    if (
      centerTables.size === 1 &&
      accentTables.size === 1 &&
      [...centerTables][0] !== [...accentTables][0]
    ) {
      fail("contradictory_input");
    }
  }

  const positiveCompositionText = positiveBoundedStatements([
    input.customerIntent.designIntent,
    input.customerIntent.designDescription,
    input.piece.subtype,
    input.composition.direction,
    ...input.composition.requestedViews,
  ]);
  const stacking = positiveCompositionText.some((value) =>
    /\b(stack|stacking|stacked)\b/i.test(value),
  );
  const openStacking = positiveCompositionText.some((value) =>
    /\bopen (?:stacking )?ring\b/i.test(value),
  );
  if (stacking && input.piece.canonicalType !== "ring") fail("contradictory_input");
  if (stacking && centerTables.has("other")) fail("contradictory_input");
  if (
    input.composition.requestedViews.some(
      (view) =>
        /\bstack/i.test(view) &&
        /\b(side|profile|section)\b/i.test(view),
    )
  ) {
    fail("contradictory_input");
  }
  if (
    text.some((value) =>
      /\b(?:allow|show|create|with)\b.{0,30}\b(?:collision|collide|overlap center|vertical misalignment|rotate(?:d)? 90)\b/i.test(
        value,
      ),
    )
  ) {
    fail("contradictory_input");
  }

  for (const stone of input.stones.items) {
    if (!stone.setting) continue;
    const positiveSettingStatements = positiveBoundedStatements([stone.setting]);
    const negativeSettingStatements = negativeBoundedStatements([stone.setting]);
    assertSupportedProngSyntax(positiveSettingStatements);
    const families = settingFamiliesFromStatements(positiveSettingStatements);
    const negativeFamilies =
      settingFamiliesFromStatements(negativeSettingStatements);
    if ([...families].some((family) => negativeFamilies.has(family))) {
      fail("contradictory_input");
    }
    if (families.size > 1) fail("contradictory_input");
    if (
      positiveSettingStatements.length > 0 &&
      families.size === 0 &&
      !positiveSettingStatements.every((statement) =>
        /\b(unknown|unspecified|to confirm|confirm later)\b/i.test(statement),
      )
    ) {
      fail("unsupported_input");
    }
  }
  const settingText = positiveBoundedStatements([
    center?.setting,
    input.stones.centerStoneDirection,
    input.customerIntent.designIntent,
    input.customerIntent.designDescription,
    input.composition.direction,
    ...input.composition.requestedViews,
  ]);
  const centerSettingFamilies = settingFamilies(settingText);
  const negativeSettingFamilies =
    settingFamiliesFromStatements(negativeText);
  if (
    [...centerSettingFamilies].some((family) =>
      negativeSettingFamilies.has(family),
    )
  ) {
    fail("contradictory_input");
  }
  if (centerSettingFamilies.size > 1) fail("contradictory_input");
  assertSupportedProngSyntax(settingText);
  const exactProngCounts = prongCounts(settingText);
  const negativeProngCounts = prongCountsFromStatements(negativeText);
  if ([...exactProngCounts].some((count) => negativeProngCounts.has(count))) {
    fail("contradictory_input");
  }
  if (exactProngCounts.size > 1) fail("contradictory_input");
  const exactProngStyles = prongStyles(settingText);
  const negativeProngStyles = prongStylesFromStatements(negativeText);
  if ([...exactProngStyles].some((style) => negativeProngStyles.has(style))) {
    fail("contradictory_input");
  }
  if (exactProngStyles.size > 1) fail("contradictory_input");
  if (
    exactProngCounts.size === 1 &&
    input.composition.requestedViews.some(
      (value) =>
        /\b(?:omit(?:s|ted)?|missing|remove(?:s|d)?|without|no|extra|invent(?:s|ed)?)\b.{0,24}\bprongs?\b|\bprongs?\b.{0,24}\b(?:omit(?:s|ted)?|missing|remove(?:s|d)?|extra|invent(?:s|ed)?)\b/i.test(
          value,
        ),
    )
  ) {
    fail("contradictory_input");
  }
  const describedProngPositions = settingText
    .map(prongPositions)
    .filter((positions) => positions.size > 0);
  if (
    describedProngPositions.some(
      (positions) => !setsEqual(positions, describedProngPositions[0]),
    )
  ) {
    fail("contradictory_input");
  }
  const longAxis = longAxes.size === 1 ? [...longAxes][0] : null;
  if (
    (longAxis === "vertical" &&
      settingText.some((value) =>
        /\b(?:left|right|east|west)[- ]tip\b.{0,20}\bprongs?\b|\bprongs?\b.{0,20}\b(?:left|right|east|west)[- ]tip\b/i.test(
          value,
        ),
      )) ||
    (longAxis === "horizontal" &&
      settingText.some((value) =>
        /\b(?:top|bottom|north|south)[- ]tip\b.{0,20}\bprongs?\b|\bprongs?\b.{0,20}\b(?:top|bottom|north|south)[- ]tip\b/i.test(
          value,
        ),
      ))
  ) {
    fail("contradictory_input");
  }

  const shankCounts = shankCountsFromStatements(text);
  const negativeShankCounts = shankCountsFromStatements(negativeText);
  if ([...shankCounts].some((count) => negativeShankCounts.has(count))) {
    fail("contradictory_input");
  }
  if (shankCounts.size > 1) fail("contradictory_input");

  const mouse = text.some((value) => /\b(mouse|mice|rat)\b/i.test(value));
  const redEye = text.some(
    (value) =>
      /\b(?:ruby|red(?: gemstone| stone)?)\b.{0,40}\b(?:eye|eyes)\b/i.test(value) ||
        /\b(?:eye|eyes)\b.{0,40}\b(?:ruby|red(?: gemstone| stone)?)\b/i.test(value),
  );
  if (mouse && redEye) fail("contradictory_input");

  const motifText = positiveBoundedStatements([
    input.composition.motif,
    input.composition.direction,
    input.customerIntent.designIntent,
    input.customerIntent.designDescription,
    ...input.composition.requestedViews,
  ]);
  const locations = motifLocations(motifText);
  const counts = motifCounts(motifText);
  const intentionallyAsymmetric =
    input.piece.canonicalType === "earrings" &&
    motifText.some((value) =>
      /\b(?:intentionally|deliberately) (?:asymmetric|mismatched)\b|\basymmetric pair\b/i.test(
        value,
      ),
    );
  const matchingPair =
    input.piece.canonicalType === "earrings" &&
    motifText.some((value) =>
      /\bmatching pair\b|\bidentical (?:left and right|pair)\b|\bsymmetrical pair\b/i.test(
        value,
      ),
    );
  const unintentionalMismatch =
    input.piece.canonicalType === "earrings" &&
    motifText.some(
      (value) =>
        !/\b(?:intentionally|deliberately) (?:asymmetric|mismatched)\b/i.test(
          value,
        ) &&
        (/\b(?:mismatched|different)\b.{0,30}\b(?:earrings?|pair|left and right)\b/i.test(
          value,
        ) ||
          /\b(?:earrings?|pair|left and right)\b.{0,30}\b(?:mismatched|different)\b/i.test(
            value,
          )),
    );
  if (matchingPair && intentionallyAsymmetric) fail("contradictory_input");
  if (unintentionalMismatch) fail("contradictory_input");
  if (
    !intentionallyAsymmetric &&
    (locations.size > 1 || counts.size > 1)
  ) {
    fail("contradictory_input");
  }
  const frontBackContinuation = motifText.some((value) =>
    /\b(?:continue|continues|continuing|wrap|wraps)\b.{0,30}\bfront\b.{0,20}\bback\b|\bfront[- /]and[- /]back continuation\b/i.test(
      value,
    ),
  );
  const frontOnlyOrMissingBack = [...motifText, ...negativeText].some((value) =>
    /\bfront[- ]only motif\b|\bmotif\b.{0,20}\bdoes not continue\b.{0,20}\bback\b|\bback\b.{0,20}\b(?:without|missing|omit(?:s|ted)?)\b.{0,20}\bmotif\b/i.test(
      value,
    ),
  );
  if (frontBackContinuation && frontOnlyOrMissingBack) {
    fail("contradictory_input");
  }
  if (
    motifText.some(
      (value) =>
        /\bdetail\b.{0,50}\b(?:change|different|move|relocat|add|remove|omit|invent)\w*\b.{0,35}\b(?:motif|setting|prong|stone|component)\b|\b(?:motif|setting|prong|stone|component)\b.{0,35}\b(?:change|different|move|relocat|add|remove|omit|invent)\w*\b.{0,50}\bdetail\b/i.test(
          value,
        ),
    )
  ) {
    fail("contradictory_input");
  }

  return {
    stacking,
    openStacking,
    longAxis,
    tableDirection: centerTables.size === 1 ? [...centerTables][0] : null,
    prongCount:
      exactProngCounts.size === 1 ? [...exactProngCounts][0] : null,
    prongStyle:
      exactProngStyles.size === 1 ? [...exactProngStyles][0] : null,
    prongPositionSummary:
      describedProngPositions.length > 0
        ? [...describedProngPositions[0]].sort().join(", ")
        : null,
    settingFamily:
      centerSettingFamilies.size === 1
        ? [...centerSettingFamilies][0]
        : null,
    shankCount: shankCounts.size === 1 ? [...shankCounts][0] : null,
    motifLocation: locations.size === 1 ? [...locations][0] : null,
    motifCount: counts.size === 1 ? [...counts][0] : null,
    motifContinuesFrontToBack: frontBackContinuation,
    earringPairMode:
      input.piece.canonicalType !== "earrings"
        ? null
        : intentionallyAsymmetric
          ? "intentionally_asymmetric"
          : "matching",
  };
}

function joinOrUnknown(values: Array<string | null>, unknown = "unspecified"): string {
  const present = values.filter((value): value is string => Boolean(value));
  return present.length > 0 ? present.join("; ") : unknown;
}

function motifTypes(input: InstantPreviewAgentStructuredInput): NovoraDesignSpecMotifType[] {
  const motif = positiveValue(input.composition.motif) ?? "";
  const result: NovoraDesignSpecMotifType[] = [];
  const add = (value: NovoraDesignSpecMotifType) => {
    if (!result.includes(value)) result.push(value);
  };
  if (/\b(animal|mouse|mice|rat|bird|snake|dragon)\b/i.test(motif)) add("animal");
  if (/\b(zodiac|mouse|mice|rat)\b/i.test(motif)) add("zodiac");
  if (/\bcloud\b/i.test(motif)) add("cloud");
  if (/\b(water|wave)\b/i.test(motif)) add("water");
  if (/\b(floral|flower|leaf|vine)\b/i.test(motif)) add("floral");
  if (/\b(mechanical|gear)\b/i.test(motif)) add("mechanical");
  if (/\b(gothic)\b/i.test(motif)) add("gothic");
  if (motif && result.length === 0) add("other");
  return result;
}

function boundedSettingTypes(
  input: InstantPreviewAgentStructuredInput,
): NovoraDesignSpecSettingType[] {
  const result: NovoraDesignSpecSettingType[] = [];
  for (const setting of input.stones.items
    .flatMap((stone) => positiveValues([stone.setting]))
    .filter((value): value is string => Boolean(value))) {
    const family = [...settingFamilies([setting])][0] ?? "to_confirm";
    if (!result.includes(family)) result.push(family);
  }
  return result.length > 0 ? result : ["to_confirm"];
}

function buildDesignSpec(
  input: InstantPreviewAgentStructuredInput,
  consistency: ReturnType<typeof assertStructuralConsistency>,
): NovoraDesignSpec {
  const center =
    input.stones.items.find((stone) =>
      /\b(center|centre|main)\b/i.test(positiveValue(stone.role) ?? ""),
    ) ??
    input.stones.items[0];
  const accents = input.stones.items.filter((stone) => stone !== center);
  const materialDirections = positiveValues(input.materials.directions);
  const dimensionRelationships = positiveValues(input.dimensions.relationships);
  const manufacturingConstraints = positiveValues(
    input.manufacturingConstraints,
  );
  const wearabilityRequirements = positiveValues(
    input.wearability.requirements,
  );
  const unknowns = [...input.unknowns];
  if (materialDirections.length === 0) unknowns.push("exact material and purity");
  if (dimensionRelationships.length === 0) unknowns.push("exact dimensions");
  if (
    input.stones.items.length > 0 &&
    !input.stones.items.some((stone) => positiveValue(stone.sizeRelationship))
  ) {
    unknowns.push("exact gemstone dimensions");
  }
  if (input.piece.canonicalType === "pendant_necklace" && !dimensionRelationships.some((value) => /\bchain\b/i.test(value))) {
    unknowns.push("chain length and thickness");
  }
  const uniqueUnknowns = [...new Set(unknowns)].slice(0, 16);
  const orientationNote = consistency.longAxis
    ? `Keep the directional center-stone long axis ${consistency.longAxis} in every view; never rotate it 90 degrees.`
    : "Keep the same center-stone 3D orientation in every view; do not reinterpret it between views.";
  const tableNote = consistency.tableDirection
    ? `Keep center and accent stone tables consistently ${consistency.tableDirection === "face_up" ? "face-up" : "in the specified direction"} across every view.`
    : "Keep center and accent stone table direction consistent across every view.";
  const shankNote = consistency.shankCount
    ? `Preserve exactly ${consistency.shankCount} ring shank${consistency.shankCount === 1 ? "" : "s"} in the full design and every detail.`
    : "Preserve the same ring-shank count in the full design and every detail.";
  const structureNotes = [
    orientationNote,
    tableNote,
    ...(input.piece.canonicalType === "ring" ? [shankNote] : []),
    ...(consistency.prongCount
      ? [`Preserve exactly ${consistency.prongCount} center-stone prongs in every view; no prong may pass through the stone.`]
      : ["Keep setting and prong logic consistent, supported, and clear of the stone body."]),
    ...(consistency.prongStyle
      ? [`Preserve the ${consistency.prongStyle}-prong construction in every whole and detail view.`]
      : []),
    ...(consistency.prongPositionSummary
      ? [`Preserve the bounded prong positions (${consistency.prongPositionSummary}) relative to the unchanged stone orientation.`]
      : []),
    ...(consistency.settingFamily
      ? [`Preserve the ${consistency.settingFamily} setting family in every view and detail.`]
      : []),
    consistency.motifLocation
      ? `Keep every motif at the ${consistency.motifLocation} in all whole and detail views.`
      : "Keep every motif in the same structural location across full and detail views.",
    ...(consistency.motifCount
      ? [`Preserve exactly ${consistency.motifCount} motif element${consistency.motifCount === 1 ? "" : "s"} in every applicable view.`]
      : []),
    ...(consistency.motifContinuesFrontToBack
      ? ["Preserve the explicitly required motif continuation from front to back without omission."]
      : []),
    ...(consistency.earringPairMode === "intentionally_asymmetric"
      ? ["Preserve the explicitly intentional left-right asymmetry while keeping the earring pair structurally coherent."]
      : consistency.earringPairMode === "matching"
        ? ["Keep left and right earrings consistent in motif, stone, setting, and structural component counts."]
        : []),
  ];
  if (consistency.stacking) {
    structureNotes.push(
      "Show the stacking relationship only as a front-facing stacking elevation, never as a side, profile, or section view.",
      consistency.tableDirection === "face_up"
        ? "Keep the center stone face-up, visible, aligned, and unchanged in orientation."
        : "Preserve the center-stone table direction without inferring an unknown orientation.",
      "Keep every stacking component present with reasonable clearance and no collision.",
    );
  }
  if (consistency.openStacking) {
    structureNotes.push(
      "The open stacking ring must wrap the center setting from the left and right with visible reasonable clearance.",
    );
  }

  return {
    spec_version: NOVORA_DESIGN_SPEC_VERSION,
    source: {
      source_type: "concept_brief",
      source_label: "Agent 72A PII-free structured Concept Brief",
      raw_brief_usage_policy:
        "Raw customer natural language must not be used directly as a final image-generation prompt. It must first be converted into structured Design Spec and Hand Sketch Instruction.",
      mock_only: false,
      contains_real_customer_data: false,
    },
    public_reference: NOVORA_PII_FREE_DESIGN_REFERENCE,
    language: "en",
    piece_type: input.piece.canonicalType,
    customer_intent_summary: joinOrUnknown([
      positiveValue(input.customerIntent.designIntent),
      positiveValue(input.customerIntent.designDescription),
    ]),
    design_direction: {
      style_keywords: positiveValues(input.style.directions),
      mood: joinOrUnknown([positiveValue(input.style.colorDirection)], "unspecified mood and color direction"),
      target_customer_note: "PII-free structured design intent only; no customer identity retained.",
      symmetry_preference: joinOrUnknown([positiveValue(input.composition.direction)], "unspecified symmetry"),
      unified_novora_sketch_style_note:
        "Use the NOVORA first-preview hand-sketch style with a warm light background, consistent line weight, and bounded annotations.",
    },
    jewelry_structure: {
      primary_form: joinOrUnknown([
        positiveValue(input.piece.subtype),
        positiveValue(input.piece.boundedOtherJewelryType),
        input.piece.canonicalType,
      ]),
      view_requirements: [
        "main front view preserving the complete design",
        ...(consistency.stacking
          ? ["front-facing stacking elevation"]
          : positiveValues(input.composition.requestedViews)),
        "enlarged structural detail preserving the same stone, setting, shank count, and motif location",
      ].slice(0, 8),
      setting_logic: joinOrUnknown(
        input.stones.items.flatMap((stone) => positiveValues([stone.setting])),
        "setting construction to confirm; do not invent production detail",
      ),
      setting_planning: boundedSettingTypes(input),
      construction_consistency_notes: structureNotes,
      structure_risk_flags: [
        ...manufacturingConstraints,
        ...wearabilityRequirements,
      ].slice(0, 16),
    },
    materials: {
      metal_preference: joinOrUnknown(materialDirections, "unspecified"),
      gold_color: explicitGoldColor(input),
      enamel: "unspecified",
      lab_diamond_or_lab_colored_stone_preference: "unspecified",
      unknown_or_to_confirm: uniqueUnknowns.filter((value) =>
        /\b(material|metal|purity|alloy|finish|enamel)\b/i.test(value),
      ),
    },
    stones: {
      center_stone: center
        ? joinOrUnknown([
            positiveValue(center.type),
            positiveValue(center.shape),
            positiveValue(center.color),
            positiveValue(center.orientation),
          ])
        : "none specified",
      side_stones: accents.length
        ? accents.map((stone) => joinOrUnknown([
            positiveValue(stone.role),
            positiveValue(stone.type),
            positiveValue(stone.shape),
            positiveValue(stone.color),
          ])).join("; ")
        : "none specified",
      repeated_stones: joinOrUnknown(
        input.stones.items
          .filter((stone) => (stone.quantity ?? 0) > 1)
          .map((stone) => `${stone.quantity} × ${joinOrUnknown([
            positiveValue(stone.type),
            positiveValue(stone.shape),
          ], "stone")}`),
        "none specified",
      ),
      stone_color_direction: joinOrUnknown([
        positiveValue(input.style.colorDirection),
        ...input.stones.items.map((stone) => positiveValue(stone.color)),
      ]),
      stone_shape: joinOrUnknown(
        input.stones.items.map((stone) => positiveValue(stone.shape)),
      ),
      stone_size_relationship: joinOrUnknown([
        positiveValue(input.stones.arrangement),
        ...input.stones.items.map((stone) =>
          positiveValue(stone.sizeRelationship),
        ),
        ...input.stones.items.map((stone) =>
          positiveValue(stone.relationshipToOtherStones),
        ),
      ]),
      special_stone_rules: [
        orientationNote,
        tableNote,
        ZODIAC_MOUSE_EYE_GEMSTONE_RULE,
      ],
    },
    motifs: {
      motif_types: motifTypes(input),
      motif_planning: positiveValues([input.composition.motif]),
      motif_placement: joinOrUnknown(
        [positiveValue(input.composition.direction)],
        "motif placement unspecified",
      ),
      motif_to_structure_relationship:
        "Keep the motif attached to the stated jewelry structure without blocking stones, settings, shanks, wearability, or required clearances.",
    },
    dimensions: {
      approximate_size: joinOrUnknown(dimensionRelationships, "unspecified"),
      ring_size_if_applicable:
        input.piece.canonicalType === "ring"
          ? joinOrUnknown(dimensionRelationships.filter((value) => /\bring size\b/i.test(value)), "unknown")
          : "not applicable",
      pendant_scale_if_applicable:
        input.piece.canonicalType === "pendant_necklace"
          ? joinOrUnknown(dimensionRelationships, "unknown")
          : "not applicable",
      unknown_or_to_confirm: uniqueUnknowns,
    },
    production_feasibility_notes: [
      "Concept preview only; jewelry construction and manufacturability require later human review.",
      "Do not claim production readiness, guaranteed manufacturability, or precise tolerances.",
      ...manufacturingConstraints,
    ].slice(0, 16),
    sketch_requirements: {
      unified_novora_sketch_sheet_style: "novora_first_preview_sketch_style_v1",
      text_only_novora_branding_watermark_placement: "subtle lower-right sheet footer",
      logo_must_not_be_part_of_jewelry_structure: true,
      warm_light_background: true,
      consistent_line_weight: true,
      clear_annotations: true,
      main_view_plus_optional_detail_views: true,
      concept_preview_disclaimer_placement: "visible footer outside the jewelry drawing",
      no_cad_quote_or_production_approval_framing: true,
    },
    safety_boundaries: {
      concept_preview_only: true,
      not_cad: true,
      not_quote: true,
      not_order_approval: true,
      not_payment_approval: true,
      not_production_approval: true,
      first_preview_ready: "first_preview_ready",
      approved_for_customer: "approved_for_customer",
      first_preview_ready_is_separate_from_approved_for_customer: true,
    },
    open_questions: uniqueUnknowns.map((value) => `Confirm: ${value}.`),
    internal_generation_notes: {
      prompt_readiness: "structured_generation_instruction",
      missing_information: uniqueUnknowns,
      human_review_focus: [
        "structural logic",
        "stone orientation and table direction",
        "setting and prong plausibility",
        "view consistency",
        "motif placement",
        "wearability and manufacturability",
      ],
      structure_craft_production_feasibility_checks: structureNotes,
      status_boundary_reminders: [
        "first_preview_ready is separate from approved_for_customer",
        "concept preview is not CAD, quotation, payment, order, production approval, or a manufacturability guarantee",
      ],
      provider_boundary: {
        calls_gpt: false,
        calls_image_api: false,
        generates_image: false,
        reads_database: false,
      },
    },
  };
}

function buildHandSketchInstruction(
  input: InstantPreviewAgentStructuredInput,
  designSpec: NovoraDesignSpec,
  consistency: ReturnType<typeof assertStructuralConsistency>,
): NovoraHandSketchInstruction {
  const instruction = createNovoraHandSketchInstructionFromDesignSpec(designSpec);
  instruction.views = [
    {
      view_type: "main_hero_view",
      required: true,
      instruction:
        "Main front view of the complete design; preserve stone orientation, table direction, setting, shank count, and motif placement.",
    },
    {
      view_type: "optional_side_profile_view",
      required: !consistency.stacking,
      instruction:
        "Side/profile view of the same design without rotating the directional stone or changing structural components.",
    },
    {
      view_type: "optional_top_or_detail_view",
      required: consistency.stacking,
      instruction: consistency.stacking
        ? consistency.tableDirection === "face_up"
          ? "Front-facing stacking elevation only; keep the center stone face-up and visible, preserve all shanks, and show clear left-right relationships."
          : "Front-facing stacking elevation only; preserve the unknown or explicitly supplied stone-table direction, preserve all shanks, and show clear left-right relationships."
        : "Optional top or structural detail view of the same design.",
    },
    {
      view_type: "stone_setting_detail_view_if_needed",
      required: designSpec.stones.center_stone !== "none specified",
      instruction:
        "Enlarged structural detail of the same stone and setting orientation; preserve prong count and keep prongs outside the stone body.",
    },
    {
      view_type: "view_consistency_required",
      required: true,
      instruction:
        "Every view must show the same design, component count, stone size relationship, orientation, setting, and motif location.",
    },
    {
      view_type: "no_contradictory_construction_between_views",
      required: true,
      instruction:
        "Do not hide collisions, add or remove parts, rotate the center stone, or reinterpret a stacking elevation as a side view.",
    },
  ];
  instruction.annotation_instructions.labels = [
    {
      label: "Concept preview",
      target: "sheet footer",
      instruction: "Concept preview only; not CAD or a production drawing.",
    },
    {
      label: "Orientation",
      target: "center and accent stones",
      instruction: "Mark the shared table direction and unchanged directional long axis.",
    },
    {
      label: "Structure",
      target: "setting, shanks, stacking components, and motif",
      instruction: "Mark relationships and unknown dimensions without inventing tolerances.",
    },
    ...(consistency.stacking
      ? [{
          label: "Stacking elevation",
          target: "left-right stacking relationship",
          instruction: "Mark reasonable clearance and no collision in the front-facing elevation.",
        }]
      : []),
  ].slice(0, NOVORA_JEWELRY_DESIGN_SKILLS_LIMITS.maximumAnnotations);
  instruction.composition_instructions.layout = consistency.stacking
    ? "main front view plus front-facing stacking elevation and enlarged structural detail"
    : "main front view plus consistent optional profile and enlarged structural detail";
  instruction.negative_constraints = [...new Set([
    "no 90-degree center-stone rotation between views",
    "no inconsistent center or accent stone-table direction",
    "no prong passing through a stone and no unexplained prong-count change",
    "no change between single, split, double, or paired-prong construction",
    "no extra or missing ring shank",
    ZODIAC_MOUSE_EYE_GEMSTONE_RULE,
    ...allNegativeDesignText(input).map((value) =>
      preservedNegativeConstraint(input, value),
    ),
    "no stacking collision, vertical misalignment, or hidden component",
    "no stacking relationship mislabeled as a side, profile, or section view",
    "no motif relocation or collision with stones, settings, shanks, or wearability",
    "no inconsistent local detail and overall design",
    ...(consistency.earringPairMode === "intentionally_asymmetric"
      ? ["no loss of the explicitly intentional earring-pair asymmetry"]
      : consistency.earringPairMode === "matching"
        ? ["no unintended left-right earring mismatch"]
        : []),
    "no unsupported metal purity, gemstone, dimension, chain, price, supplier, sourcing, or availability claim",
    "no CAD-like final-production, quotation, payment, order, approval, or guaranteed-manufacturability claim",
    "no customer identifier, contact detail, credential, Provider metadata, Storage identity, database identifier, reviewer note, or admin note",
    ...designSpec.jewelry_structure.construction_consistency_notes.map(
      (note) => `do not violate: ${note}`,
    ),
  ])].slice(0, NOVORA_JEWELRY_DESIGN_SKILLS_LIMITS.maximumNegativeConstraints);
  instruction.human_review_checklist = [
    "post-preview structural logic",
    "stone orientation, table direction, and composition",
    "setting and prong plausibility",
    "stacking clearance and component consistency",
    "motif placement and wearability",
    "manufacturability review without guarantee",
    ZODIAC_MOUSE_EYE_GEMSTONE_RULE,
  ];
  return instruction;
}

export function executeNovoraJewelryDesignSkills(
  input: unknown,
): ExecuteNovoraJewelryDesignSkillsResult {
  try {
    const structured = snapshotStructuredInput(input);
    const consistency = assertStructuralConsistency(structured);
    const designSpec = buildDesignSpec(structured, consistency);
    const handSketchInstruction = buildHandSketchInstruction(
      structured,
      designSpec,
      consistency,
    );
    if (
      !validateNovoraDesignSpec(designSpec).ok ||
      !validateNovoraHandSketchInstruction(handSketchInstruction).ok
    ) {
      fail("internal_failure");
    }
    const value: NovoraJewelryDesignSkillsOutput = {
      skills_version: NOVORA_JEWELRY_DESIGN_SKILLS_VERSION,
      designSpec,
      handSketchInstruction,
    };
    if (
      JSON.stringify(value).length >
      NOVORA_JEWELRY_DESIGN_SKILLS_LIMITS.maximumOutputCharacters
    ) {
      fail("oversized_input");
    }
    return { ok: true, value };
  } catch (error) {
    return failure(
      error instanceof JewelryDesignSkillsFailure
        ? error.category
        : "internal_failure",
    );
  }
}

export const createNovoraJewelryDesignOutputs =
  executeNovoraJewelryDesignSkills;
