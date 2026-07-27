import { expect, test } from "@playwright/test";
import { createRequire } from "node:module";
import Module from "node:module";
import path from "node:path";

import type { InstantPreviewAgentStructuredInput } from "../../lib/server/ai-sketch/instant-preview-agent-core";

const moduleInternals = Module as unknown as {
  _resolveFilename(
    request: string,
    parent: unknown,
    isMain: boolean,
    options?: unknown,
  ): string;
};
const serverOnlyTestShim = path.join(
  process.cwd(),
  "node_modules",
  "next",
  "dist",
  "compiled",
  "server-only",
  "empty.js",
);
const originalResolveFilename = moduleInternals._resolveFilename;
const testRequire = createRequire(
  path.join(process.cwd(), "tests", "e2e", "jewelry-design-skills.spec.ts"),
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

const {
  executeNovoraJewelryDesignSkills,
  NOVORA_JEWELRY_DESIGN_SKILLS_LIMITS,
  NOVORA_PII_FREE_DESIGN_REFERENCE,
} = testRequire(
  "../../lib/server/ai-sketch/jewelry-design-skills",
) as typeof import("../../lib/server/ai-sketch/jewelry-design-skills");
const { structureConceptBriefForInstantPreview } = testRequire(
  "../../lib/server/ai-sketch/instant-preview-agent-core",
) as typeof import("../../lib/server/ai-sketch/instant-preview-agent-core");
const { validateNovoraDesignSpec } = testRequire(
  "../../lib/server/ai-sketch/design-spec",
) as typeof import("../../lib/server/ai-sketch/design-spec");
const { validateNovoraHandSketchInstruction } = testRequire(
  "../../lib/server/ai-sketch/hand-sketch-instruction",
) as typeof import("../../lib/server/ai-sketch/hand-sketch-instruction");

moduleInternals._resolveFilename = originalResolveFilename;

function validBrief(overrides: Record<string, unknown> = {}) {
  return {
    pieceType: "ring",
    designIntent: "A refined stacking ring with a pear center stone.",
    designDescription: "Keep the same balanced silhouette in every view.",
    styleDirection: ["warm heirloom", "clean sculptural"],
    materialDirection: ["warm gold direction; exact purity unknown"],
    stones: [
      {
        role: "center",
        type: "lab-grown diamond",
        shape: "pear",
        orientation: "vertical, point toward fingertip",
        tableOrientation: "face-up",
        setting: "five-prong setting",
        sizeRelationship: "larger than accents",
      },
      {
        role: "accent",
        type: "accent stone",
        shape: "round",
        tableOrientation: "face-up",
        sizeRelationship: "smaller than center",
      },
    ],
    centerStoneDirection: "Pear long axis remains vertical and face-up.",
    stoneArrangement: "Center stone with two smaller shoulder accents.",
    dimensions: ["ring size unknown", "exact gemstone dimensions unknown"],
    composition: "Balanced front-facing composition.",
    motif: "subtle leaf shoulders",
    colorDirection: "warm gold with clear stones",
    wearabilityRequirements: ["daily-wear profile", "avoid snag-prone edges"],
    manufacturingConstraints: ["setting construction requires later human review"],
    referenceObservations: ["soft shoulder taper and open negative space"],
    unknowns: ["exact ring size", "exact gemstone dimensions", "exact metal purity"],
    avoid: ["extra shank", "stone rotation", "stacking collision"],
    requestedViews: ["front view", "side profile", "setting detail"],
    ...overrides,
  };
}

function structured(overrides: Record<string, unknown> = {}): InstantPreviewAgentStructuredInput {
  const result = structureConceptBriefForInstantPreview(validBrief(overrides));
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("Expected Agent 72A structuring success.");
  return result.value;
}

function clone(
  input: InstantPreviewAgentStructuredInput,
): InstantPreviewAgentStructuredInput {
  return JSON.parse(JSON.stringify(input)) as InstantPreviewAgentStructuredInput;
}

function expectSuccess(input: unknown) {
  const result = executeNovoraJewelryDesignSkills(input);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("Expected jewelry-design skill success.");
  return result.value;
}

function expectFailure(
  input: unknown,
  category:
    | "invalid_input"
    | "unsupported_input"
    | "oversized_input"
    | "unsafe_input"
    | "contradictory_input"
    | "internal_failure",
) {
  const result = executeNovoraJewelryDesignSkills(input);
  expect(result).toEqual({ ok: false, error: { category } });
  return result;
}

test("produces deterministic valid shared-contract output", () => {
  const input = structured();
  const first = expectSuccess(input);
  const second = expectSuccess(input);
  expect(first).toEqual(second);
  expect(validateNovoraDesignSpec(first.designSpec)).toEqual({ ok: true, issues: [] });
  expect(validateNovoraHandSketchInstruction(first.handSketchInstruction)).toEqual({
    ok: true,
    issues: [],
  });
});

const supportedPieces = [
  ["ring", {}, "ring"],
  [
    "pendant",
    {
      pieceType: "pendant",
      designIntent: "A simple pendant with one oval stone.",
      dimensions: ["pendant scale unknown"],
      requestedViews: ["front view", "profile view"],
    },
    "pendant_necklace",
  ],
  [
    "bracelet",
    {
      pieceType: "bangle",
      designIntent: "An open bangle with balanced end motifs.",
      dimensions: ["wrist fit unknown"],
      requestedViews: ["front view", "detail view"],
    },
    "bracelet_bangle",
  ],
  [
    "earrings",
    {
      pieceType: "earrings",
      designIntent: "A matching pair of drop earrings.",
      dimensions: ["drop length unknown"],
      requestedViews: ["front view", "profile view"],
    },
    "earrings",
  ],
  [
    "other supported jewelry",
    {
      pieceType: "other",
      otherJewelryType: "articulated brooch",
      designIntent: "A wearable articulated floral brooch.",
      dimensions: ["wearable lapel scale"],
      requestedViews: ["front view", "back view"],
    },
    "other_custom",
  ],
] as const;

for (const [label, overrides, pieceType] of supportedPieces) {
  test(`normalizes a valid ${label} without changing piece type`, () => {
    const output = expectSuccess(structured(overrides));
    expect(output.designSpec.piece_type).toBe(pieceType);
    expect(output.handSketchInstruction.source_design_spec_summary.piece_type).toBe(
      pieceType,
    );
  });
}

test("preserves meaningful stone and requested-view order", () => {
  const output = expectSuccess(structured());
  expect(output.designSpec.stones.center_stone).toContain("pear");
  expect(output.designSpec.stones.side_stones).toContain("accent");
  expect(output.designSpec.jewelry_structure.view_requirements[0]).toContain(
    "main front",
  );
});

test("keeps center and accent table orientation consistent", () => {
  const output = expectSuccess(structured());
  expect(output.designSpec.stones.special_stone_rules.join(" ")).toContain(
    "face-up",
  );
  expect(
    output.handSketchInstruction.negative_constraints.join(" "),
  ).toContain("stone-table direction");
});

test("rejects a conflicting accent-stone table direction", () => {
  const input = clone(structured());
  input.stones.items[1].tableOrientation = "face-down";
  expectFailure(input, "contradictory_input");
});

test("keeps a directional center stone unchanged across views", () => {
  const output = expectSuccess(structured());
  const serialized = JSON.stringify(output);
  expect(serialized).toContain("long axis vertical");
  expect(serialized).toContain("never rotate it 90 degrees");
});

test("rejects a 90-degree stone rotation between requested views", () => {
  const input = clone(structured());
  input.composition.requestedViews = [
    "front view with vertical long axis",
    "profile detail with horizontal long axis",
  ];
  expectFailure(input, "contradictory_input");
});

test("uses a front-facing stacking elevation for a stacking relationship", () => {
  const input = structured({
    designIntent: "A main ring with an open stacking ring.",
    composition: "Open stacking ring wraps the center from left and right with clearance.",
    requestedViews: ["front view", "stacking relationship", "setting detail"],
  });
  const output = expectSuccess(input);
  const stackingView = output.handSketchInstruction.views.find(
    (view) => view.view_type === "optional_top_or_detail_view",
  );
  expect(stackingView).toMatchObject({ required: true });
  expect(stackingView?.instruction).toContain("Front-facing stacking elevation");
  expect(stackingView?.instruction).not.toMatch(/\bside view\b/i);
});

test("encodes open stacking left-right wrapping and reasonable clearance", () => {
  const output = expectSuccess(
    structured({
      designIntent: "An open stacking ring around the main ring.",
      composition: "Wrap from left and right with reasonable clearance.",
      requestedViews: ["front view", "stacking elevation"],
    }),
  );
  const notes = output.designSpec.jewelry_structure.construction_consistency_notes.join(
    " ",
  );
  expect(notes).toContain("left and right");
  expect(notes).toContain("reasonable clearance");
});

for (const invalidView of [
  "stacking side view",
  "stacking profile view",
  "stacking section view",
]) {
  test(`rejects ${invalidView} mislabeling`, () => {
    const input = clone(structured());
    input.composition.requestedViews = ["front view", invalidView];
    expectFailure(input, "contradictory_input");
  });
}

test("rejects an affirmative stacking collision requirement", () => {
  const input = clone(structured());
  input.composition.direction =
    "Show a stacking ring with collision against the center setting.";
  expectFailure(input, "contradictory_input");
});

test("preserves a specified prong count in full and detail views", () => {
  const output = expectSuccess(structured());
  expect(
    output.designSpec.jewelry_structure.construction_consistency_notes.join(" "),
  ).toContain("exactly 5 center-stone prongs");
  expect(output.handSketchInstruction.negative_constraints.join(" ")).toContain(
    "prong-count change",
  );
});

test("rejects contradictory prong counts", () => {
  const input = clone(structured());
  input.composition.requestedViews = [
    "front view with five-prong setting",
    "detail view with six-prong setting",
  ];
  expectFailure(input, "contradictory_input");
});

test("preserves a specified ring-shank count", () => {
  const input = clone(structured());
  input.customerIntent.designDescription = "Use a double ring shank.";
  const output = expectSuccess(input);
  expect(
    output.designSpec.jewelry_structure.construction_consistency_notes.join(" "),
  ).toContain("exactly 2 ring shanks");
});

test("rejects inconsistent ring-shank counts", () => {
  const input = clone(structured());
  input.customerIntent.designDescription = "Use a double ring shank.";
  input.composition.requestedViews = ["front view", "detail with single shank"];
  expectFailure(input, "contradictory_input");
});

test("keeps local and overall motif placement consistent", () => {
  const output = expectSuccess(structured());
  expect(output.designSpec.motifs.motif_types).toContain("floral");
  expect(output.handSketchInstruction.motif_instructions).toMatchObject({
    avoid_impossible_motif_construction: true,
    motif_must_not_conflict_with_setting_or_wearability: true,
  });
  expect(output.handSketchInstruction.views.at(-1)?.instruction).toContain(
    "add or remove parts",
  );
});

test("rejects ruby or red gemstone eyes for a zodiac mouse", () => {
  const input = structured({
    pieceType: "animal or sculpture concept",
    designIntent: "A zodiac mouse pendant with ruby eyes.",
    motif: "zodiac mouse with red gemstone eyes",
    stones: [
      {
        role: "eyes",
        type: "ruby",
        color: "red",
        shape: "round",
        setting: "bezel",
      },
    ],
    dimensions: ["small wearable pendant scale"],
  });
  expectFailure(input, "contradictory_input");
});

test("does not invent an alternative mouse-eye gemstone", () => {
  const output = expectSuccess(
    structured({
      pieceType: "animal or sculpture concept",
      designIntent: "A zodiac mouse pendant with eye stones unknown.",
      motif: "zodiac mouse",
      stones: [],
      dimensions: ["small wearable pendant scale"],
      unknowns: ["eye gemstone type"],
    }),
  );
  expect(output.designSpec.stones.center_stone).toBe("none specified");
  expect(output.designSpec.dimensions.unknown_or_to_confirm).toContain(
    "eye gemstone type",
  );
});

test("keeps unknown values unknown and avoids material or size invention", () => {
  const output = expectSuccess(structured());
  expect(output.designSpec.materials.metal_preference).toContain(
    "exact purity unknown",
  );
  expect(output.designSpec.dimensions.unknown_or_to_confirm).toEqual(
    expect.arrayContaining([
      "exact ring size",
      "exact gemstone dimensions",
      "exact metal purity",
    ]),
  );
  expect(JSON.stringify(output)).not.toMatch(/\b(14k|18k|950 platinum|1\.0 carat)\b/i);
});

test("does not invent a pendant chain specification", () => {
  const output = expectSuccess(
    structured({
      pieceType: "pendant",
      designIntent: "A small oval pendant.",
      dimensions: ["pendant scale unknown"],
      requestedViews: ["front view", "profile view"],
      unknowns: ["exact pendant scale"],
    }),
  );
  expect(output.designSpec.dimensions.unknown_or_to_confirm).toContain(
    "chain length and thickness",
  );
  expect(JSON.stringify(output)).not.toMatch(/\b(?:16|18|20)[- ]inch chain\b/i);
});

test("contains no price, sourcing, approval, or manufacturability invention", () => {
  const output = expectSuccess(structured());
  const serialized = JSON.stringify(output);
  expect(serialized).not.toMatch(/\$\d|supplier available|sourcing committed/i);
  expect(output.designSpec.safety_boundaries).toMatchObject({
    concept_preview_only: true,
    not_cad: true,
    not_quote: true,
    not_order_approval: true,
    not_payment_approval: true,
    not_production_approval: true,
  });
  expect(serialized).toContain("manufacturability guarantee");
});

test("uses only the PII-free internal reference sentinel", () => {
  const output = expectSuccess(structured());
  expect(output.designSpec.public_reference).toBe(
    NOVORA_PII_FREE_DESIGN_REFERENCE,
  );
  expect(output.handSketchInstruction.public_reference).toBe(
    NOVORA_PII_FREE_DESIGN_REFERENCE,
  );
  expect(JSON.stringify(output)).not.toContain("NOVORA-CB-");
});

for (const malformed of [null, undefined, 1, "brief", [], true]) {
  test(`fails closed for malformed input ${String(malformed)}`, () => {
    expectFailure(malformed, "invalid_input");
  });
}

test("rejects unsupported contract and piece values", () => {
  const contract = clone(structured()) as unknown as Record<string, unknown>;
  contract.contractVersion = "unsupported";
  expectFailure(contract, "unsupported_input");

  const piece = clone(structured()) as unknown as {
    piece: Record<string, unknown>;
  };
  piece.piece.canonicalType = "watch";
  expectFailure(piece, "unsupported_input");
});

test("rejects contradictory piece category", () => {
  const input = clone(structured());
  input.piece.category = "earrings";
  expectFailure(input, "contradictory_input");
});

test("enforces bounded strings, arrays, and output", () => {
  const long = clone(structured());
  long.customerIntent.designIntent = "x".repeat(
    NOVORA_JEWELRY_DESIGN_SKILLS_LIMITS.maximumStringLength + 1,
  );
  expectFailure(long, "oversized_input");

  const many = clone(structured());
  many.reviewRequirements = Array.from({ length: 17 }, (_, index) => `rule ${index}`);
  expectFailure(many, "oversized_input");

  const output = expectSuccess(structured());
  expect(JSON.stringify(output).length).toBeLessThanOrEqual(
    NOVORA_JEWELRY_DESIGN_SKILLS_LIMITS.maximumOutputCharacters,
  );
});

test("rejects inherited mandatory properties", () => {
  const input = clone(structured());
  const inherited = input.customerIntent.designIntent;
  delete (input.customerIntent as { designIntent?: string }).designIntent;
  Object.setPrototypeOf(input.customerIntent, { designIntent: inherited });
  expectFailure(input, "invalid_input");
});

test("rejects accessors and throwing getters without invoking them", () => {
  for (const throws of [false, true]) {
    const input = clone(structured());
    let calls = 0;
    Object.defineProperty(input.customerIntent, "designIntent", {
      configurable: true,
      enumerable: true,
      get() {
        calls += 1;
        if (throws) throw new Error("PRIVATE_GETTER_MARKER");
        return "Accessor value";
      },
    });
    const result = expectFailure(input, "invalid_input");
    expect(calls).toBe(0);
    expect(JSON.stringify(result)).not.toContain("PRIVATE_GETTER_MARKER");
  }
});

test("rejects Proxy-like hostile records and arrays without invoking traps", () => {
  let traps = 0;
  const recordInput = clone(structured());
  recordInput.customerIntent = new Proxy(recordInput.customerIntent, {
    ownKeys() {
      traps += 1;
      throw new Error("PRIVATE_PROXY_MARKER");
    },
  });
  const arrayInput = clone(structured());
  arrayInput.style.directions = new Proxy(arrayInput.style.directions, {
    get() {
      traps += 1;
      throw new Error("PRIVATE_PROXY_MARKER");
    },
  });
  for (const input of [recordInput, arrayInput]) {
    const result = expectFailure(input, "invalid_input");
    expect(JSON.stringify(result)).not.toContain("PRIVATE_PROXY_MARKER");
  }
  expect(traps).toBe(0);
});

test("rejects sparse and accessor-index arrays", () => {
  const sparse = clone(structured());
  sparse.style.directions = new Array(1);
  expectFailure(sparse, "invalid_input");

  const accessor = clone(structured());
  let calls = 0;
  const values: string[] = [];
  Object.defineProperty(values, "0", {
    enumerable: true,
    get() {
      calls += 1;
      return "private accessor";
    },
  });
  Object.defineProperty(values, "length", { value: 1 });
  accessor.style.directions = values;
  expectFailure(accessor, "invalid_input");
  expect(calls).toBe(0);
});

const sensitiveValues = [
  ["credential", "api key: abcdefghijklmnop"],
  ["token", "Bearer abcdefghijklmnopqrst"],
  ["local path", String.raw`C:\private\design.png`],
  ["customer identifier", "NOVORA-CB-20260727-PRIVATE"],
  ["contact", "private.person@example.com"],
  ["Storage metadata", "storage bucket private-output"],
  ["Provider metadata", "provider request req_private"],
  ["database instruction", "SELECT private_value FROM customer_table"],
  ["shell instruction", "powershell invoke-webrequest private"],
] as const;

for (const [label, marker] of sensitiveValues) {
  test(`rejects and does not disclose ${label}`, () => {
    const input = clone(structured());
    input.customerIntent.designDescription = marker;
    const first = expectFailure(input, "unsafe_input");
    const second = expectFailure(input, "unsafe_input");
    expect(first).toEqual(second);
    expect(JSON.stringify(first)).not.toContain(marker);
  });
}

test("does not mutate or retain source-object references", () => {
  const input = clone(structured());
  const original = JSON.stringify(input);
  const output = expectSuccess(input);
  expect(JSON.stringify(input)).toBe(original);
  expect(output).not.toBe(input);
  expect(output.designSpec.design_direction.style_keywords).not.toBe(
    input.style.directions,
  );
  input.style.directions[0] = "changed after execution";
  expect(output.designSpec.design_direction.style_keywords[0]).toBe(
    "warm heirloom",
  );
});

test("is server-only and has no Provider, network, database, or Storage dependency", () => {
  const output = expectSuccess(structured());
  expect(output.designSpec.internal_generation_notes.provider_boundary).toEqual({
    calls_gpt: false,
    calls_image_api: false,
    generates_image: false,
    reads_database: false,
  });
  expect(output.handSketchInstruction.internal_notes).toMatchObject({
    no_database_read: true,
    no_database_write: true,
    no_gpt_openai_or_image_api_call: true,
    no_image_generation: true,
    no_live_route_submission_or_customer_flow_integration: true,
  });
});
