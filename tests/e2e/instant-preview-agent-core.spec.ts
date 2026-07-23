import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import Module, { createRequire } from "node:module";
import path from "node:path";

import type {
  InstantPreviewAgentStructuredInput,
  StructureConceptBriefForInstantPreviewResult,
} from "../../lib/server/ai-sketch/instant-preview-agent-core";

const moduleInternals = Module as unknown as {
  _resolveFilename(
    request: string,
    parent: unknown,
    isMain: boolean,
    options?: unknown,
  ): string;
};
const originalResolveFilename = moduleInternals._resolveFilename;
const serverOnlyTestShim = path.join(
  process.cwd(),
  "node_modules",
  "next",
  "dist",
  "compiled",
  "server-only",
  "empty.js",
);
moduleInternals._resolveFilename = function resolveTestModule(
  request,
  parent,
  isMain,
  options,
) {
  return request === "server-only"
    ? serverOnlyTestShim
    : originalResolveFilename.call(this, request, parent, isMain, options);
};

const testRequire = createRequire(
  path.join(process.cwd(), "tests", "e2e", "instant-preview-agent-core.spec.ts"),
);
const {
  INSTANT_PREVIEW_AGENT_LIMITS,
  structureConceptBriefForInstantPreview,
} = testRequire(
  "../../lib/server/ai-sketch/instant-preview-agent-core",
) as typeof import("../../lib/server/ai-sketch/instant-preview-agent-core");
moduleInternals._resolveFilename = originalResolveFilename;

type StructuringResult =
  StructureConceptBriefForInstantPreviewResult;

function validBrief(overrides: Record<string, unknown> = {}) {
  return {
    pieceType: "ring",
    designIntent: "A balanced heirloom ring with a pear center stone.",
    designDescription: "Keep the silhouette refined and suitable for daily wear.",
    styleDirection: ["warm heirloom", "clean sculptural"],
    materialDirection: ["warm yellow gold", "polished edge"],
    stones: [
      {
        role: "center",
        type: "lab-grown diamond",
        shape: "pear",
        orientation: "point toward fingertip",
        tableOrientation: "face-up",
        setting: "five prongs",
      },
    ],
    centerStoneDirection: "Pear point remains aligned toward the fingertip.",
    stoneArrangement: "Center stone with two smaller shoulder accents.",
    dimensions: ["ring size to confirm", "center stone larger than accents"],
    composition: "Low, balanced center with tapered shoulders.",
    motif: "subtle leaf shoulders",
    colorDirection: "warm gold with clear stones",
    wearabilityRequirements: ["daily wear", "avoid a snag-prone profile"],
    manufacturingConstraints: ["prongs must remain structurally explainable"],
    referenceObservations: ["soft shoulder taper and open negative space"],
    unknowns: ["exact ring size", "exact stone dimensions"],
    avoid: ["No hidden halo", "no hidden halo", "Avoid an extra shank"],
    requestedViews: ["front view", "side profile", "setting detail"],
    ...overrides,
  };
}

function expectSuccess(
  result: StructuringResult,
): InstantPreviewAgentStructuredInput {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error("Expected a successful structured result.");
  }
  return result.value;
}

function expectFailure(
  result: StructuringResult,
  category: string,
) {
  expect(result).toEqual({
    ok: false,
    error: { category },
  });
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
  }
  return value;
}

const validPieceCases = [
  ["ring", {}, "ring", "ring"],
  ["pendant or necklace", { pieceType: "Necklace", dimensions: ["pendant scale to confirm"] }, "pendant_necklace", "pendant_necklace"],
  ["earrings", { pieceType: "EARRINGS", dimensions: ["drop length to confirm"] }, "earrings", "earrings"],
  ["bracelet or bangle", { pieceType: "Bangle", dimensions: ["wrist fit to confirm"] }, "bracelet_bangle", "bracelet_bangle"],
  ["animal or sculpture concept", { pieceType: "Animal or Sculpture Concept", dimensions: ["small wearable scale"] }, "other_custom", "animal_sculpture_concept"],
  ["bounded other jewelry", { pieceType: "Other", otherJewelryType: "Articulated brooch", dimensions: ["wearable lapel scale"] }, "other_custom", "other_jewelry"],
] as const;

for (const [label, overrides, canonicalType, category] of validPieceCases) {
  test(`structures a valid ${label} brief`, () => {
    const value = expectSuccess(
      structureConceptBriefForInstantPreview(validBrief(overrides)),
    );
    expect(value.piece).toMatchObject({ canonicalType, category });
  });
}

test("returns deterministic output for semantically equivalent input", () => {
  const first = structureConceptBriefForInstantPreview(
    validBrief({ pieceType: " RING ", avoid: ["B", "a", "b"] }),
  );
  const second = structureConceptBriefForInstantPreview(
    validBrief({ pieceType: "ring", avoid: ["a", "B"] }),
  );
  expect(first).toEqual(second);
});

test("does not mutate a deeply frozen source input", () => {
  const input = deepFreeze(validBrief());
  expect(() => structureConceptBriefForInstantPreview(input)).not.toThrow();
  expect(structureConceptBriefForInstantPreview(input).ok).toBe(true);
});

test("normalizes empty optional fields safely", () => {
  const value = expectSuccess(
    structureConceptBriefForInstantPreview(
      validBrief({
        designDescription: "  ",
        colorDirection: "n/a",
        motif: null,
        styleDirection: [" ", "clean"],
      }),
    ),
  );
  expect(value.customerIntent.designDescription).toBeNull();
  expect(value.style.colorDirection).toBeNull();
  expect(value.composition.motif).toBeNull();
  expect(value.style.directions).toEqual(["clean"]);
});

test("preserves meaningful customer-defined order", () => {
  const input = validBrief({
    stones: [
      { role: "center", shape: "pear" },
      { role: "left accent", shape: "marquise" },
      { role: "right accent", shape: "round" },
    ],
    requestedViews: ["front", "side", "detail"],
  });
  const value = expectSuccess(structureConceptBriefForInstantPreview(input));
  expect(value.stones.items.map((stone) => stone.role)).toEqual([
    "center",
    "left accent",
    "right accent",
  ]);
  expect(value.composition.requestedViews).toEqual(["front", "side", "detail"]);
});

test("normalizes unordered duplicate avoid rules deterministically", () => {
  const value = expectSuccess(
    structureConceptBriefForInstantPreview(
      validBrief({ avoid: ["zebra texture", "Extra shank", "extra shank", "busy halo"] }),
    ),
  );
  expect(value.avoid).toEqual(["busy halo", "Extra shank", "zebra texture"]);
});

test("always includes explicit product boundaries", () => {
  const value = expectSuccess(structureConceptBriefForInstantPreview(validBrief()));
  expect(value.productBoundaries).toEqual({
    internalFirstPreviewInputOnly: true,
    cad: false,
    quotation: false,
    pricing: false,
    paymentConfirmation: false,
    order: false,
    productionApproval: false,
    manufacturabilityGuarantee: false,
  });
});

test("fails closed for an unsupported piece type", () => {
  expectFailure(
    structureConceptBriefForInstantPreview(validBrief({ pieceType: "watch" })),
    "unsupported_piece",
  );
});

test("fails closed when design intent is missing", () => {
  expectFailure(
    structureConceptBriefForInstantPreview(validBrief({ designIntent: undefined })),
    "invalid_input",
  );
});

test("fails closed when design intent is empty", () => {
  expectFailure(
    structureConceptBriefForInstantPreview(validBrief({ designIntent: "   " })),
    "invalid_input",
  );
});

test("fails closed for an oversized description", () => {
  expectFailure(
    structureConceptBriefForInstantPreview(
      validBrief({
        designIntent: "a".repeat(INSTANT_PREVIEW_AGENT_LIMITS.maximumDescriptionLength),
        designDescription: "b".repeat(1_100),
      }),
    ),
    "oversized_input",
  );
});

test("fails closed for an oversized individual string field", () => {
  expectFailure(
    structureConceptBriefForInstantPreview(
      validBrief({
        styleDirection: [
          "x".repeat(INSTANT_PREVIEW_AGENT_LIMITS.maximumIndividualStringLength + 1),
        ],
      }),
    ),
    "oversized_input",
  );
});

test("fails closed for too many stones", () => {
  expectFailure(
    structureConceptBriefForInstantPreview(
      validBrief({
        stones: Array.from(
          { length: INSTANT_PREVIEW_AGENT_LIMITS.maximumStones + 1 },
          () => ({ type: "accent stone" }),
        ),
      }),
    ),
    "oversized_input",
  );
});

test("fails closed for too many reference observations", () => {
  expectFailure(
    structureConceptBriefForInstantPreview(
      validBrief({
        referenceObservations: Array.from(
          { length: INSTANT_PREVIEW_AGENT_LIMITS.maximumReferenceObservations + 1 },
          (_, index) => `observation ${index}`,
        ),
      }),
    ),
    "oversized_input",
  );
});

test("fails closed for too many avoid rules", () => {
  expectFailure(
    structureConceptBriefForInstantPreview(
      validBrief({
        avoid: Array.from(
          { length: INSTANT_PREVIEW_AGENT_LIMITS.maximumAvoidRules + 1 },
          (_, index) => `avoid ${index}`,
        ),
      }),
    ),
    "oversized_input",
  );
});

test("fails closed for too many unknowns", () => {
  expectFailure(
    structureConceptBriefForInstantPreview(
      validBrief({
        unknowns: Array.from(
          { length: INSTANT_PREVIEW_AGENT_LIMITS.maximumUnknowns + 1 },
          (_, index) => `unknown ${index}`,
        ),
      }),
    ),
    "oversized_input",
  );
});

test("fails closed for excessive nesting or malformed nested values", () => {
  const deep = { next: { next: { next: { next: { next: "too deep" } } } } };
  expectFailure(
    structureConceptBriefForInstantPreview(validBrief({ ignored: deep })),
    "oversized_input",
  );
  expectFailure(
    structureConceptBriefForInstantPreview(validBrief({ stones: ["not an object"] })),
    "invalid_input",
  );
});

test("fails closed for safely detectable contradictory structure", () => {
  expectFailure(
    structureConceptBriefForInstantPreview(
      validBrief({ pieceType: "ring and necklace" }),
    ),
    "contradictory_input",
  );
  expectFailure(
    structureConceptBriefForInstantPreview(
      validBrief({ pieceType: "earrings", dimensions: ["ring size 7"] }),
    ),
    "contradictory_input",
  );
});

test("failure results do not echo rejected input", () => {
  const marker = "NEVER_ECHO_THIS_REJECTED_VALUE";
  const result = structureConceptBriefForInstantPreview(
    validBrief({ pieceType: "watch", designDescription: marker }),
  );
  expect(JSON.stringify(result)).not.toContain(marker);
});

const excludedTopLevelFields = [
  ["customer name", "customerName", "Synthetic Person"],
  ["email", "email", "synthetic@example.invalid"],
  ["phone", "phone", "+1 202 555 0199"],
  ["WhatsApp", "whatsapp", "+44 7700 900000"],
  ["country and contact note", "contact", { country: "Example", contactNote: "private" }],
  ["publicReference", "publicReference", "NOVORA-CB-20260723-TEST"],
  ["Concept Brief UUID", "conceptBriefId", "123e4567-e89b-42d3-a456-426614174000"],
  ["Job and Output UUIDs", "jobAndOutput", { jobId: "123e4567-e89b-42d3-a456-426614174001", outputId: "123e4567-e89b-42d3-a456-426614174002" }],
  ["IP, cookie, and capability proof", "requestIdentity", { ip: "192.0.2.1", cookie: "private", capabilityProof: "private" }],
  ["admin and reviewer notes", "internalNotes", { adminNote: "private", reviewerNote: "private" }],
  ["Storage bucket and object path", "storage", { bucket: "private-bucket", objectPath: "private/object.png" }],
  ["private and signed URLs", "privateAccess", { privateUrl: "https://private.invalid", signedUrl: "https://signed.invalid" }],
  ["credentials and secrets", "credentials", { apiKey: "secret-value", password: "private" }],
] as const;

for (const [label, key, excludedValue] of excludedTopLevelFields) {
  test(`excludes ${label}`, () => {
    const value = expectSuccess(
      structureConceptBriefForInstantPreview(validBrief({ [key]: excludedValue })),
    );
    const serialized = JSON.stringify(value);
    expect(serialized).not.toContain(key);
    expect(serialized).not.toContain(
      typeof excludedValue === "string" ? excludedValue : JSON.stringify(excludedValue),
    );
  });
}

test("does not pass through unknown top-level fields", () => {
  const value = expectSuccess(
    structureConceptBriefForInstantPreview(
      validBrief({ arbitraryPrivateRecord: "do not retain" }),
    ),
  );
  expect(value).not.toHaveProperty("arbitraryPrivateRecord");
  expect(JSON.stringify(value)).not.toContain("do not retain");
});

test("does not pass through unknown nested fields", () => {
  const value = expectSuccess(
    structureConceptBriefForInstantPreview(
      validBrief({
        stones: [
          {
            role: "center",
            shape: "oval",
            customerEmail: "nested@example.invalid",
            privatePath: "private/object.png",
          },
        ],
      }),
    ),
  );
  expect(value.stones.items[0]).not.toHaveProperty("customerEmail");
  expect(value.stones.items[0]).not.toHaveProperty("privatePath");
});

test("retains no original source object by reference", () => {
  const input = validBrief();
  const value = expectSuccess(structureConceptBriefForInstantPreview(input));
  expect(value).not.toBe(input);
  expect(value.stones.items).not.toBe(input.stones);
  expect(value.stones.items[0]).not.toBe((input.stones as unknown[])[0]);
  expect(value.style.directions).not.toBe(input.styleDirection);
});

test("structured output contains no Provider client or request metadata", () => {
  const value = expectSuccess(
    structureConceptBriefForInstantPreview(
      validBrief({ providerClient: "forbidden", providerRequestId: "forbidden" }),
    ),
  );
  expect(JSON.stringify(value)).not.toMatch(/provider(Client|Request|Metadata)/i);
});

test("structured output contains no Storage metadata", () => {
  const value = expectSuccess(
    structureConceptBriefForInstantPreview(
      validBrief({ storageBucket: "forbidden", storageObjectPath: "forbidden" }),
    ),
  );
  expect(JSON.stringify(value)).not.toMatch(/storage(Bucket|Object|Path|Metadata)/i);
});

test("structured output contains no database field names", () => {
  const value = expectSuccess(
    structureConceptBriefForInstantPreview(
      validBrief({ databaseTable: "concept_briefs", databaseColumn: "id" }),
    ),
  );
  expect(JSON.stringify(value)).not.toMatch(/database(Table|Column)|concept_briefs/i);
});

test("structured output makes no pricing claim", () => {
  const value = expectSuccess(structureConceptBriefForInstantPreview(validBrief()));
  expect(value.productBoundaries.pricing).toBe(false);
});

test("structured output makes no quotation claim", () => {
  const value = expectSuccess(structureConceptBriefForInstantPreview(validBrief()));
  expect(value.productBoundaries.quotation).toBe(false);
});

test("structured output makes no CAD claim", () => {
  const value = expectSuccess(structureConceptBriefForInstantPreview(validBrief()));
  expect(value.productBoundaries.cad).toBe(false);
});

test("structured output makes no order claim", () => {
  const value = expectSuccess(structureConceptBriefForInstantPreview(validBrief()));
  expect(value.productBoundaries.order).toBe(false);
});

test("structured output makes no production-approval claim", () => {
  const value = expectSuccess(structureConceptBriefForInstantPreview(validBrief()));
  expect(value.productBoundaries.productionApproval).toBe(false);
});

test("structured output makes no manufacturability guarantee", () => {
  const value = expectSuccess(structureConceptBriefForInstantPreview(validBrief()));
  expect(value.productBoundaries.manufacturabilityGuarantee).toBe(false);
});

test("module performs no environment read", () => {
  const source = readFileSync(
    path.join(
      process.cwd(),
      "lib",
      "server",
      "ai-sketch",
      "instant-preview-agent-core.ts",
    ),
    "utf8",
  );
  expect(source).not.toContain("process.env");
  expect(source).not.toContain("Deno.env");
});

test("module exposes no network or client construction surface", () => {
  const source = readFileSync(
    path.join(
      process.cwd(),
      "lib",
      "server",
      "ai-sketch",
      "instant-preview-agent-core.ts",
    ),
    "utf8",
  );
  expect(source).not.toMatch(/\bfetch\s*\(/);
  expect(source).not.toMatch(/\bnew\s+(OpenAI|Supabase|Storage|HttpClient)\b/);
  expect(source).not.toMatch(/createClient\s*\(/);
});
