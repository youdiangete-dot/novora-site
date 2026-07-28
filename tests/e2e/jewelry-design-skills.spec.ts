import { expect, test } from "@playwright/test";
import { Buffer } from "node:buffer";
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
const {
  isContradictoryZodiacMouseEyeRule,
  validateNovoraDesignSpec,
  ZODIAC_MOUSE_EYE_GEMSTONE_RULE,
} = testRequire(
  "../../lib/server/ai-sketch/design-spec",
) as typeof import("../../lib/server/ai-sketch/design-spec");
const { validateNovoraHandSketchInstruction } = testRequire(
  "../../lib/server/ai-sketch/hand-sketch-instruction",
) as typeof import("../../lib/server/ai-sketch/hand-sketch-instruction");
const { evaluateAutomaticFirstPreviewGates } = testRequire(
  "../../lib/server/ai-sketch/first-preview-runtime",
) as typeof import("../../lib/server/ai-sketch/first-preview-runtime");

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

function aggregateInputBytes(
  input: InstantPreviewAgentStructuredInput,
): number {
  return Buffer.byteLength(JSON.stringify(input), "utf8");
}

function inputAtAggregateByteSize(
  targetBytes: number,
): InstantPreviewAgentStructuredInput {
  const input = clone(structured());
  input.reviewRequirements = Array.from({ length: 16 }, () => "x");
  let remaining = targetBytes - aggregateInputBytes(input);
  if (remaining < 0) {
    throw new Error("Aggregate input fixture baseline exceeds target.");
  }
  for (let index = 0; index < input.reviewRequirements.length; index += 1) {
    const growth = Math.min(
      remaining,
      NOVORA_JEWELRY_DESIGN_SKILLS_LIMITS.maximumStringLength - 1,
    );
    input.reviewRequirements[index] += "x".repeat(growth);
    remaining -= growth;
  }
  if (remaining !== 0) {
    throw new Error("Aggregate input fixture lacks padding capacity.");
  }
  expect(aggregateInputBytes(input)).toBe(targetBytes);
  return input;
}

function boundedOtherStructured(): InstantPreviewAgentStructuredInput {
  return structured({
    pieceType: "other",
    otherJewelryType: "articulated brooch",
    designIntent: "A wearable articulated floral brooch.",
    dimensions: ["wearable lapel scale"],
    requestedViews: ["front view", "back view"],
  });
}

function earringsStructured(
  designIntent: string,
): InstantPreviewAgentStructuredInput {
  return structured({
    pieceType: "earrings",
    designIntent,
    dimensions: ["drop length unknown"],
    requestedViews: ["front view", "detail view"],
  });
}

function isolatedRingStructured(): InstantPreviewAgentStructuredInput {
  const input = clone(structured());
  input.customerIntent.designIntent = "A bounded ring concept.";
  input.customerIntent.designDescription = null;
  input.style.directions = [];
  input.style.colorDirection = null;
  input.materials.directions = [];
  input.stones.items = [
    {
      role: "center",
      type: null,
      color: null,
      shape: null,
      setting: null,
      orientation: null,
      tableOrientation: null,
      sizeRelationship: null,
      relationshipToOtherStones: null,
      quantity: null,
    },
  ];
  input.stones.centerStoneDirection = null;
  input.stones.arrangement = null;
  input.composition.direction = null;
  input.composition.motif = null;
  input.composition.requestedViews = ["front view"];
  input.dimensions.relationships = [];
  input.wearability.requirements = [];
  input.manufacturingConstraints = [];
  input.referenceObservations.observations = [];
  input.unknowns = [];
  input.avoid = [];
  input.reviewRequirements = [];
  return input;
}

function freeTextRuleArrays(output: ReturnType<typeof expectSuccess>): string[][] {
  return [
    output.designSpec.stones.special_stone_rules,
    output.handSketchInstruction.stone_and_setting_instructions
      .special_stone_rules,
    output.handSketchInstruction.negative_constraints,
    output.handSketchInstruction.human_review_checklist,
  ];
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

test("rejects a blank bounded other-jewelry value", () => {
  const input = clone(boundedOtherStructured());
  input.piece.boundedOtherJewelryType = null;
  expectFailure(input, "unsupported_input");
});

test("rejects an unknown bounded other-jewelry value", () => {
  const input = clone(boundedOtherStructured());
  input.piece.boundedOtherJewelryType = "watch";
  expectFailure(input, "unsupported_input");
});

test("rejects unrestricted prose containing an allowlisted other-jewelry word", () => {
  const input = clone(boundedOtherStructured());
  input.piece.boundedOtherJewelryType =
    "invent an unrestricted articulated brooch category";
  expectFailure(input, "unsupported_input");
});

test("rejects a malformed bounded other-jewelry value", () => {
  const malformed = clone(boundedOtherStructured());
  malformed.piece.boundedOtherJewelryType = "brooch<script>";
  expectFailure(malformed, "unsupported_input");
});

test("rejects an overlong bounded other-jewelry value", () => {
  const overlong = clone(boundedOtherStructured());
  overlong.piece.boundedOtherJewelryType = "x".repeat(
    NOVORA_JEWELRY_DESIGN_SKILLS_LIMITS.maximumStringLength + 1,
  );
  expectFailure(overlong, "oversized_input");
});

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

test("rejects whole-view and detail-view center table contradictions", () => {
  const input = clone(structured());
  input.composition.requestedViews = [
    "front view with the center-stone table face-up",
    "setting detail with the center-stone table face-down",
  ];
  expectFailure(input, "contradictory_input");
});

test("rejects accent-table contradictions isolated to an enlarged detail", () => {
  const input = clone(structured());
  input.composition.requestedViews = [
    "front view",
    "enlarged detail with accent-stone tables face-down",
  ];
  expectFailure(input, "contradictory_input");
});

test("rejects a face-down center stone in a front-facing stacking elevation", () => {
  const input = clone(
    structured({
      designIntent: "A main ring with an open stacking ring.",
      composition: "Open stacking ring wraps from left and right.",
      requestedViews: ["front view", "stacking elevation"],
    }),
  );
  input.stones.centerStoneDirection = "Keep the center stone face-down.";
  input.stones.items[0].tableOrientation = "face-down";
  input.stones.items[1].tableOrientation = "face-down";
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

test("separates an explicit four-prong count from double-prong style", () => {
  const input = isolatedRingStructured();
  input.stones.items[0].setting = "four double-prong setting";
  const output = expectSuccess(input);
  const notes =
    output.designSpec.jewelry_structure.construction_consistency_notes.join(" ");
  expect(notes).toContain("exactly 4 center-stone prongs");
  expect(notes).toContain("double-prong construction");
  expect(notes).not.toContain("exactly 2 center-stone prongs");
});

test("separates an explicit four-prong count from split-prong style", () => {
  const input = isolatedRingStructured();
  input.stones.items[0].setting = "four split-prong setting";
  const output = expectSuccess(input);
  const notes =
    output.designSpec.jewelry_structure.construction_consistency_notes.join(" ");
  expect(notes).toContain("exactly 4 center-stone prongs");
  expect(notes).toContain("split-prong construction");
});

test("preserves six as the count and paired as the prong style", () => {
  const input = isolatedRingStructured();
  input.stones.items[0].setting = "six paired prongs";
  const output = expectSuccess(input);
  const notes =
    output.designSpec.jewelry_structure.construction_consistency_notes.join(" ");
  expect(notes).toContain("exactly 6 center-stone prongs");
  expect(notes).toContain("paired-prong construction");
});

test("does not manufacture a numeric count from a prong style", () => {
  const input = isolatedRingStructured();
  input.stones.items[0].setting = "double-prong setting";
  const output = expectSuccess(input);
  const notes =
    output.designSpec.jewelry_structure.construction_consistency_notes.join(" ");
  expect(notes).toContain("double-prong construction");
  expect(notes).not.toContain("exactly 2 center-stone prongs");
});

test("fails closed for ambiguous prong count and style syntax", () => {
  const input = isolatedRingStructured();
  input.stones.items[0].setting = "four split double-prongs";
  expectFailure(input, "unsupported_input");
});

test("fails closed for an unsupported explicit prong count", () => {
  const input = isolatedRingStructured();
  input.stones.items[0].setting = "seven-prong setting";
  expectFailure(input, "unsupported_input");
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

test("rejects a split-to-double prong-style change between views", () => {
  const input = clone(structured());
  input.stones.items[0].setting = "five split-prong setting";
  input.composition.requestedViews = [
    "front view with split prongs",
    "detail view with double prongs",
  ];
  expectFailure(input, "contradictory_input");
});

test("preserves identical bounded prong positions across whole and detail views", () => {
  const input = clone(structured());
  input.stones.items[0].setting =
    "four-prong setting with top, bottom, left, and right prongs";
  input.composition.requestedViews = [
    "front view with four prongs at top, bottom, left, and right",
    "detail view with four prongs at top, bottom, left, and right",
  ];
  const output = expectSuccess(input);
  expect(
    output.designSpec.jewelry_structure.construction_consistency_notes.join(" "),
  ).toContain("bottom, left, right, top");
});

test("rejects changed bounded prong positions with a stable count", () => {
  const input = clone(structured());
  input.stones.items[0].setting =
    "four-prong setting with top, bottom, left, and right prongs";
  input.composition.requestedViews = [
    "front view with four prongs at top, bottom, left, and right",
    "detail view with four prongs at top, bottom, and tip",
  ];
  expectFailure(input, "contradictory_input");
});

test("rejects omitted structural prongs when an exact count is supplied", () => {
  const input = clone(structured());
  input.composition.requestedViews = [
    "front view with five prongs",
    "detail view without prongs",
  ];
  expectFailure(input, "contradictory_input");
});

test("rejects an invented structural prong when an exact count is supplied", () => {
  const input = clone(structured());
  input.composition.requestedViews = [
    "front view with five prongs",
    "detail view with an extra prong",
  ];
  expectFailure(input, "contradictory_input");
});

test("rejects a prong-to-bezel setting-family change", () => {
  const input = clone(structured());
  input.composition.requestedViews = [
    "front view with five-prong setting",
    "detail view with bezel setting",
  ];
  expectFailure(input, "contradictory_input");
});

test("keeps an exact positive bezel setting as positive evidence", () => {
  const input = isolatedRingStructured();
  input.stones.items[0].setting = "Use a bezel setting.";
  const output = expectSuccess(input);
  expect(output.designSpec.jewelry_structure.setting_planning).toContain(
    "bezel",
  );
  expect(
    output.designSpec.jewelry_structure.construction_consistency_notes.join(" "),
  ).toContain("Preserve the bezel setting family");
});

test("keeps a negated bezel setting out of positive setting evidence", () => {
  const input = isolatedRingStructured();
  input.stones.items[0].setting = "Do not use a bezel setting.";
  const output = expectSuccess(input);
  expect(output.designSpec.jewelry_structure.setting_planning).toEqual([
    "to_confirm",
  ]);
  expect(
    output.designSpec.jewelry_structure.construction_consistency_notes.join(" "),
  ).not.toContain("Preserve the bezel setting family");
  expect(output.handSketchInstruction.negative_constraints.join(" ")).toContain(
    "Do not use a bezel setting",
  );
});

test("rejects explicit positive and negative bezel evidence", () => {
  const input = isolatedRingStructured();
  input.stones.items[0].setting = "Use a bezel setting.";
  input.customerIntent.designDescription = "Do not use a bezel setting.";
  expectFailure(input, "contradictory_input");
});

for (const [label, statement] of [
  ["no", "No bezel setting."],
  ["not", "Not a bezel setting."],
  ["do not", "Do not use a bezel setting."],
  ["don't", "Don't use a bezel setting."],
  ["avoid", "Avoid a bezel setting."],
  ["without", "Without a bezel setting."],
  ["never", "Never use a bezel setting."],
  ["must not", "Must not use a bezel setting."],
  ["should not", "Should not use a bezel setting."],
  ["cannot", "Cannot use a bezel setting."],
  ["can't", "Can't use a bezel setting."],
] as const) {
  test(`recognizes ${label} as bounded setting negation`, () => {
    const input = isolatedRingStructured();
    input.stones.items[0].setting = statement;
    const output = expectSuccess(input);
    expect(output.designSpec.jewelry_structure.setting_planning).toEqual([
      "to_confirm",
    ]);
    expect(
      output.designSpec.jewelry_structure.construction_consistency_notes.join(
        " ",
      ),
    ).not.toContain("Preserve the bezel setting family");
    expect(
      output.handSketchInstruction.negative_constraints.join(" "),
    ).toContain(statement.slice(0, -1));
  });
}

test("fails safely for an unsupported setting instead of inventing one", () => {
  const input = clone(structured());
  input.stones.items[0].setting = "quantum floating matrix";
  expectFailure(input, "unsupported_input");
});

test("rejects a prong position incompatible with a vertical directional tip", () => {
  const input = clone(structured());
  input.stones.items[0].setting =
    "five-prong setting with a left-tip prong";
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

test("preserves exactly two shanks for one main and one combined companion ring", () => {
  const input = clone(structured());
  input.customerIntent.designDescription =
    "Use one main ring and one combined companion ring.";
  input.avoid = ["avoid a third ring shank"];
  const output = expectSuccess(input);
  expect(
    output.designSpec.jewelry_structure.construction_consistency_notes.join(" "),
  ).toContain("exactly 2 ring shanks");
  expect(
    output.handSketchInstruction.negative_constraints.join(" "),
  ).toContain("avoid a third ring shank");
});

test("rejects inconsistent ring-shank counts", () => {
  const input = clone(structured());
  input.customerIntent.designDescription = "Use a double ring shank.";
  input.composition.requestedViews = ["front view", "detail with single shank"];
  expectFailure(input, "contradictory_input");
});

test("keeps negative avoid text out of positive feature inference", () => {
  const input = clone(structured());
  input.avoid = [
    "avoid a halo",
    "no red gemstone eyes",
    "do not rotate the center stone",
    "avoid a third ring shank",
  ];
  const output = expectSuccess(input);
  expect(output.designSpec.motifs.motif_planning).not.toContain("halo");
  expect(output.designSpec.stones.center_stone).not.toMatch(/\bred\b/i);
  expect(
    output.designSpec.jewelry_structure.construction_consistency_notes.join(" "),
  ).not.toContain("exactly 3 ring shanks");
  expect(
    output.handSketchInstruction.negative_constraints.join(" "),
  ).toEqual(expect.stringContaining("avoid a halo"));
  expect(
    output.handSketchInstruction.negative_constraints.join(" "),
  ).toEqual(expect.stringContaining("no red gemstone eyes"));
  expect(
    output.handSketchInstruction.negative_constraints.join(" "),
  ).toEqual(expect.stringContaining("do not rotate the center stone"));
  expect(
    output.handSketchInstruction.negative_constraints.join(" "),
  ).toEqual(expect.stringContaining("avoid a third ring shank"));
});

test("does not infer halo from negated customer-intent text", () => {
  const input = isolatedRingStructured();
  input.customerIntent.designDescription = "Do not use a halo setting.";
  const output = expectSuccess(input);
  expect(output.designSpec.motifs.motif_planning).toEqual([]);
  expect(
    output.designSpec.jewelry_structure.construction_consistency_notes.join(" "),
  ).not.toContain("Preserve the halo setting family");
});

test("does not infer bezel from negated style-direction text", () => {
  const input = isolatedRingStructured();
  input.style.directions = ["Avoid a bezel setting."];
  const output = expectSuccess(input);
  expect(output.designSpec.jewelry_structure.setting_planning).toEqual([
    "to_confirm",
  ]);
  expect(
    output.designSpec.jewelry_structure.construction_consistency_notes.join(" "),
  ).not.toContain("Preserve the bezel setting family");
});

test("does not infer pavé from negated reference-observation text", () => {
  const input = isolatedRingStructured();
  input.referenceObservations.observations = ["Never use pavé."];
  const output = expectSuccess(input);
  expect(output.designSpec.jewelry_structure.setting_planning).toEqual([
    "to_confirm",
  ]);
  expect(
    output.designSpec.jewelry_structure.construction_consistency_notes.join(" "),
  ).not.toContain("Preserve the pave setting family");
});

test("does not infer rose gold from negated material-direction text", () => {
  const input = isolatedRingStructured();
  input.materials.directions = ["No rose gold."];
  const output = expectSuccess(input);
  expect(output.designSpec.materials.gold_color).toBe("unspecified");
});

test("does not infer center-stone rotation from a negated requested view", () => {
  const input = isolatedRingStructured();
  input.composition.requestedViews = [
    "front view",
    "Do not rotate the center stone 90 degrees.",
  ];
  const output = expectSuccess(input);
  expect(
    output.designSpec.jewelry_structure.construction_consistency_notes.join(" "),
  ).not.toContain("long axis horizontal");
});

test("does not infer a third ring shank from negated design text", () => {
  const input = isolatedRingStructured();
  input.customerIntent.designDescription = "Avoid a third ring shank.";
  const output = expectSuccess(input);
  expect(
    output.designSpec.jewelry_structure.construction_consistency_notes.join(" "),
  ).not.toContain("exactly 3 ring shanks");
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

test("rejects a motif moving from shoulders to a halo detail", () => {
  const input = clone(structured());
  input.composition.motif = "two leaf motifs on the shoulders";
  input.composition.requestedViews = [
    "whole front view with two leaf motifs on the shoulders",
    "detail view with two leaf motifs on the halo",
  ];
  expectFailure(input, "contradictory_input");
});

test("rejects a motif-count change between whole and detail views", () => {
  const input = clone(structured());
  input.composition.motif = "two leaf motifs on the shoulders";
  input.composition.requestedViews = [
    "whole front view with two leaf motifs",
    "detail view with three leaf motifs",
  ];
  expectFailure(input, "contradictory_input");
});

test("rejects omission of an explicitly required front-to-back motif continuation", () => {
  const input = clone(structured());
  input.composition.direction =
    "The leaf motif continues from the front to the back.";
  input.composition.requestedViews = [
    "front view",
    "back view without the motif",
  ];
  expectFailure(input, "contradictory_input");
});

test("rejects an explicit whole-versus-detail construction rewrite", () => {
  const input = clone(structured());
  input.composition.requestedViews = [
    "whole front view",
    "detail view removes a motif component",
  ];
  expectFailure(input, "contradictory_input");
});

test("rejects an unintentionally mismatched earring pair", () => {
  const input = clone(
    earringsStructured("A matching pair of drop earrings."),
  );
  input.composition.direction =
    "The left and right earrings are different by accident.";
  expectFailure(input, "contradictory_input");
});

test("preserves an explicitly intentional asymmetric earring pair", () => {
  const input = clone(
    earringsStructured(
      "An intentionally asymmetric pair of drop earrings.",
    ),
  );
  input.composition.motif =
    "Left earring has one leaf motif; right earring has two leaf motifs.";
  const output = expectSuccess(input);
  expect(
    output.designSpec.jewelry_structure.construction_consistency_notes.join(" "),
  ).toContain("intentional left-right asymmetry");
});

test("rejects simultaneous matching and intentionally asymmetric pair requirements", () => {
  const input = clone(
    earringsStructured(
      "A matching pair that is also intentionally asymmetric.",
    ),
  );
  expectFailure(input, "contradictory_input");
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

test("preserves an explicitly selected non-red zodiac-mouse eye gemstone", () => {
  const output = expectSuccess(
    structured({
      pieceType: "animal or sculpture concept",
      designIntent: "A zodiac mouse pendant with blue sapphire eyes.",
      motif: "zodiac mouse",
      stones: [
        {
          role: "eyes",
          type: "sapphire",
          color: "blue",
          shape: "round",
          setting: "bezel",
        },
      ],
      dimensions: ["small wearable pendant scale"],
    }),
  );
  expect(output.designSpec.stones.center_stone).toContain("sapphire");
  expect(output.designSpec.stones.center_stone).toContain("blue");
});

test("uses only the canonical zodiac-mouse eye rule in free-text rule arrays", () => {
  const input = clone(
    structured({
      pieceType: "animal or sculpture concept",
      designIntent: "A zodiac mouse pendant with eye stones unknown.",
      motif: "zodiac mouse",
      stones: [],
      dimensions: ["small wearable pendant scale"],
      unknowns: ["eye gemstone type"],
    }),
  );
  input.avoid = ["no red gemstone eyes"];
  const output = expectSuccess(input);
  for (const rules of freeTextRuleArrays(output)) {
    expect(rules).toContain(ZODIAC_MOUSE_EYE_GEMSTONE_RULE);
    expect(
      rules.filter(
        (rule) =>
          rule === ZODIAC_MOUSE_EYE_GEMSTONE_RULE ||
          isContradictoryZodiacMouseEyeRule(rule),
      ),
    ).toEqual([ZODIAC_MOUSE_EYE_GEMSTONE_RULE]);
    expect(rules.some(isContradictoryZodiacMouseEyeRule)).toBe(false);
  }
  expect(output.designSpec.stones.center_stone).toBe("none specified");
  expect(output.designSpec.stones.side_stones).toBe("none specified");
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

test("keeps gold color unknown when only a general palette is supplied", () => {
  const output = expectSuccess(structured());
  expect(output.designSpec.materials.gold_color).toBe("unspecified");
});

test("does not infer gold color from gemstone, motif, enamel, mood, or palette text", () => {
  const output = expectSuccess(
    structured({
      designIntent:
        "A rose-colored floral mood with pink enamel and blush gemstones.",
      materialDirection: ["platinum direction; exact purity unknown"],
      colorDirection: "rose gemstone palette with warm enamel",
      motif: "rose flower motif",
    }),
  );
  expect(output.designSpec.materials.gold_color).toBe("unspecified");
});

test("populates gold color from an explicit supported material source", () => {
  const output = expectSuccess(
    structured({
      materialDirection: ["rose gold direction; exact purity unknown"],
    }),
  );
  expect(output.designSpec.materials.gold_color).toBe("rose gold");
});

test("keeps negated rose gold out of positive metal-color evidence", () => {
  const input = isolatedRingStructured();
  input.materials.directions = ["Do not use rose gold."];
  const output = expectSuccess(input);
  expect(output.designSpec.materials.gold_color).toBe("unspecified");
  expect(output.designSpec.materials.metal_preference).toBe("unspecified");
  expect(output.handSketchInstruction.negative_constraints.join(" ")).toContain(
    "Do not use rose gold",
  );
});

test("keeps exact positive rose gold as a supported control", () => {
  const input = isolatedRingStructured();
  input.materials.directions = ["Use rose gold."];
  const output = expectSuccess(input);
  expect(output.designSpec.materials.gold_color).toBe("rose gold");
});

test("rejects explicit positive and negative rose-gold evidence", () => {
  const input = isolatedRingStructured();
  input.materials.directions = ["Use rose gold.", "Do not use rose gold."];
  expectFailure(input, "contradictory_input");
});

test("rejects contradictory explicit supported gold colors", () => {
  const input = clone(
    structured({
      materialDirection: ["yellow gold", "white gold"],
    }),
  );
  expectFailure(input, "contradictory_input");
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

test("remains compatible with automatically gated customer-visible First Preview", () => {
  const output = expectSuccess(structured());
  const serialized = JSON.stringify(output);
  expect(output.designSpec.safety_boundaries).toMatchObject({
    first_preview_ready: "first_preview_ready",
    approved_for_customer: "approved_for_customer",
    first_preview_ready_is_separate_from_approved_for_customer: true,
  });
  expect(
    output.handSketchInstruction.safety_boundaries,
  ).toMatchObject({
    first_preview_ready: "first_preview_ready",
    approved_for_customer: "approved_for_customer",
    first_preview_ready_is_separate_from_approved_for_customer: true,
  });
  expect(serialized).not.toMatch(
    /\binternal[- ]only\b|\bemail[- ]only\b|\bapproved_for_customer\b.{0,40}\b(?:required|prerequisite)\b|\b(?:human|manual) (?:pre-?)?approval\b.{0,50}\bfirst preview\b/i,
  );
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

test("does not reconstruct the sentinel from customer data", () => {
  const first = expectSuccess(structured());
  const secondInput = clone(structured());
  secondInput.customerIntent.designDescription =
    "A different PII-free sentimental design direction.";
  const second = expectSuccess(secondInput);
  expect(first.designSpec.public_reference).toBe(
    NOVORA_PII_FREE_DESIGN_REFERENCE,
  );
  expect(second.designSpec.public_reference).toBe(
    NOVORA_PII_FREE_DESIGN_REFERENCE,
  );
  expect(second.designSpec.public_reference).not.toContain("sentimental");
});

test("cannot use the internal sentinel as a real customer-access reference", () => {
  const output = expectSuccess(structured());
  const gates = evaluateAutomaticFirstPreviewGates({
    persistenceConfirmed: true,
    conceptBriefId: "123e4567-e89b-42d3-a456-426614174000",
    publicReference: NOVORA_PII_FREE_DESIGN_REFERENCE,
    designSpec: output.designSpec,
    handSketchInstruction: output.handSketchInstruction,
    generation: {
      status: "completed",
      imageCount: 1,
      assetId: "preview_asset_sentinel_test",
      checks: {
        contentSafetyPassed: true,
        privacyPassed: true,
        outputValidityPassed: true,
        providerMetadataExposed: false,
        internalPromptExposed: false,
        reviewerOrAdminNotesExposed: false,
        privateStoragePathExposed: false,
        secretExposed: false,
      },
      failureCategory: null,
    },
    accessControlEligible: true,
    falseSuccessDetected: false,
  });
  expect(gates.ready).toBe(false);
  expect(gates.lifecycleDecision).toBe("not_ready");
  expect(gates.failedGates).toContain("valid_public_reference");
  expect(gates.approvedForCustomerRequired).toBe(false);
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

test("accepts the exact maximum aggregate UTF-8 input budget", () => {
  const input = inputAtAggregateByteSize(
    NOVORA_JEWELRY_DESIGN_SKILLS_LIMITS.maximumInputBytes,
  );
  expectSuccess(input);
});

test("rejects one byte over the aggregate UTF-8 input budget", () => {
  const input = inputAtAggregateByteSize(
    NOVORA_JEWELRY_DESIGN_SKILLS_LIMITS.maximumInputBytes + 1,
  );
  const rejectedMarker = "REJECTED_AGGREGATE_MARKER";
  input.reviewRequirements[0] =
    rejectedMarker +
    input.reviewRequirements[0].slice(rejectedMarker.length);
  const rejected = expectFailure(input, "oversized_input");
  expect(JSON.stringify(rejected)).not.toContain(rejectedMarker);
});

test("prevents many individually valid fields from bypassing the aggregate budget", () => {
  const input = clone(structured());
  input.reviewRequirements = Array.from(
    { length: 16 },
    () => "x".repeat(NOVORA_JEWELRY_DESIGN_SKILLS_LIMITS.maximumStringLength),
  );
  expect(
    input.reviewRequirements.every(
      (value) =>
        value.length <=
        NOVORA_JEWELRY_DESIGN_SKILLS_LIMITS.maximumStringLength,
    ),
  ).toBe(true);
  expect(aggregateInputBytes(input)).toBeGreaterThan(
    NOVORA_JEWELRY_DESIGN_SKILLS_LIMITS.maximumInputBytes,
  );
  expectFailure(input, "oversized_input");
});

test("counts Unicode input by UTF-8 bytes at the aggregate boundary", () => {
  const input = inputAtAggregateByteSize(
    NOVORA_JEWELRY_DESIGN_SKILLS_LIMITS.maximumInputBytes,
  );
  const lastIndex = input.reviewRequirements.length - 1;
  input.reviewRequirements[lastIndex] =
    input.reviewRequirements[lastIndex].slice(0, -1) + "é";
  expect(aggregateInputBytes(input)).toBe(
    NOVORA_JEWELRY_DESIGN_SKILLS_LIMITS.maximumInputBytes + 1,
  );
  expectFailure(input, "oversized_input");
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
