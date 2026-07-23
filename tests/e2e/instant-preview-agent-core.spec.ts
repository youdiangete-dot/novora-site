import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import Module, { createRequire } from "node:module";
import path from "node:path";

import type {
  InstantPreviewAgentReviewInput,
  InstantPreviewAgentReviewer,
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
  reviewInstantPreviewCandidate,
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

function validReviewInput(): InstantPreviewAgentReviewInput {
  const structuredIntent = expectSuccess(
    structureConceptBriefForInstantPreview(validBrief()),
  );

  return {
    structuredIntent,
    designSpecRequirements: [
      "Preserve the ring piece type and the pear center-stone direction.",
    ],
    handSketchInstructionRequirements: [
      "Use a clear front view, side profile, and setting detail.",
    ],
    candidateObservations: [
      "The center stone appears rotated between the front and detail views.",
    ],
    structuralReviewRequirements: [...structuredIntent.reviewRequirements],
    metadata: {
      purpose: "first_preview_automatic_review",
      candidateSequence: 1,
    },
  };
}

class FakeInstantPreviewAgentReviewer implements InstantPreviewAgentReviewer {
  callCount = 0;
  lastInput: InstantPreviewAgentReviewInput | null = null;

  constructor(
    private readonly response:
      | unknown
      | ((input: InstantPreviewAgentReviewInput) => unknown | Promise<unknown>),
  ) {}

  async reviewCandidate(input: InstantPreviewAgentReviewInput): Promise<unknown> {
    this.callCount += 1;
    this.lastInput = input;
    return typeof this.response === "function"
      ? this.response(input)
      : this.response;
  }
}

async function reviewWith(response: ConstructorParameters<typeof FakeInstantPreviewAgentReviewer>[0]) {
  const reviewer = new FakeInstantPreviewAgentReviewer(response);
  const input = validReviewInput();
  const result = await reviewInstantPreviewCandidate(reviewer, input);
  return { reviewer, input, result };
}

function expectSafeReviewFailure(
  result: Awaited<ReturnType<typeof reviewInstantPreviewCandidate>>,
  reason?: string,
) {
  expect(result.outcome).toBe("FAIL_SAFE");
  if (result.outcome === "FAIL_SAFE" && reason) {
    expect(result.reason).toBe(reason);
  }
}

test("accepts a valid PASS review", async () => {
  const { reviewer, input, result } = await reviewWith({
    outcome: "PASS",
    quality: "STRONG",
  });
  expect(result).toEqual({ outcome: "PASS", quality: "strong" });
  expect(reviewer.callCount).toBe(1);
  expect(reviewer.lastInput).not.toBe(input);
  expect(reviewer.lastInput?.structuredIntent).not.toBe(input.structuredIntent);
});

test("accepts a valid bounded REGENERATE review", async () => {
  const { result } = await reviewWith({
    outcome: "REGENERATE",
    revisionInstructions: [
      "Align the pear center-stone table orientation across front and detail views.",
      "Correct prong placement so the ring shank remains structurally explainable.",
    ],
  });
  expect(result).toEqual({
    outcome: "REGENERATE",
    revisionInstructions: [
      "Align the pear center-stone table orientation across front and detail views.",
      "Correct prong placement so the ring shank remains structurally explainable.",
    ],
  });
});

test("accepts a valid bounded FAIL_SAFE review", async () => {
  const { result } = await reviewWith({
    outcome: "FAIL_SAFE",
    reason: "candidate_invalid",
  });
  expect(result).toEqual({
    outcome: "FAIL_SAFE",
    reason: "candidate_invalid",
  });
});

test("converts a thrown reviewer exception to FAIL_SAFE", async () => {
  const { result } = await reviewWith(() => {
    throw new Error("private reviewer diagnostic");
  });
  expect(result).toEqual({
    outcome: "FAIL_SAFE",
    reason: "reviewer_unavailable",
  });
});

test("converts a primitive reviewer result to FAIL_SAFE", async () => {
  const { result } = await reviewWith("PASS");
  expectSafeReviewFailure(result, "malformed_review");
});

test("converts an array reviewer result to FAIL_SAFE", async () => {
  const { result } = await reviewWith([{ outcome: "PASS" }]);
  expectSafeReviewFailure(result, "malformed_review");
});

test("converts a missing outcome to FAIL_SAFE", async () => {
  const { result } = await reviewWith({ quality: "strong" });
  expectSafeReviewFailure(result, "malformed_review");
});

test("converts an unsupported outcome to FAIL_SAFE", async () => {
  const { result } = await reviewWith({ outcome: "APPROVE" });
  expectSafeReviewFailure(result, "malformed_review");
});

test("rejects extra unsafe reviewer fields under the exact schema", async () => {
  const { result } = await reviewWith({
    outcome: "PASS",
    rawProviderResponse: { private: true },
  });
  expectSafeReviewFailure(result, "malformed_review");
  expect(JSON.stringify(result)).not.toContain("rawProviderResponse");
});

test("rejects an oversized revision instruction", async () => {
  const { result } = await reviewWith({
    outcome: "REGENERATE",
    revisionInstructions: [
      `Correct the ring stone orientation ${"x".repeat(
        INSTANT_PREVIEW_AGENT_LIMITS.maximumRevisionInstructionLength,
      )}`,
    ],
  });
  expectSafeReviewFailure(result, "malformed_review");
});

test("rejects too many revision instructions", async () => {
  const { result } = await reviewWith({
    outcome: "REGENERATE",
    revisionInstructions: Array.from(
      {
        length:
          INSTANT_PREVIEW_AGENT_LIMITS.maximumRevisionInstructions + 1,
      },
      (_, index) => `Correct stone orientation in detail view ${index}.`,
    ),
  });
  expectSafeReviewFailure(result, "malformed_review");
});

test("rejects a URL-containing revision instruction", async () => {
  const { result } = await reviewWith({
    outcome: "REGENERATE",
    revisionInstructions: [
      "Correct stone orientation using https://private.invalid/reference.",
    ],
  });
  expectSafeReviewFailure(result, "unsafe_review");
});

test("rejects a credential-like revision instruction", async () => {
  const { result } = await reviewWith({
    outcome: "REGENERATE",
    revisionInstructions: [
      "Correct prong placement using API key private-value.",
    ],
  });
  expectSafeReviewFailure(result, "unsafe_review");
});

test("rejects a SQL revision instruction", async () => {
  const { result } = await reviewWith({
    outcome: "REGENERATE",
    revisionInstructions: [
      "Correct stone table orientation, then SELECT * FROM private_records.",
    ],
  });
  expectSafeReviewFailure(result, "unsafe_review");
});

test("rejects shell or PowerShell revision instructions", async () => {
  const shell = await reviewWith({
    outcome: "REGENERATE",
    revisionInstructions: ["Run a shell command to correct stone orientation."],
  });
  const powershell = await reviewWith({
    outcome: "REGENERATE",
    revisionInstructions: ["Use PowerShell to correct ring composition."],
  });
  expectSafeReviewFailure(shell.result, "unsafe_review");
  expectSafeReviewFailure(powershell.result, "unsafe_review");
});

test("rejects a tool-execution revision instruction", async () => {
  const { result } = await reviewWith({
    outcome: "REGENERATE",
    revisionInstructions: ["Execute a tool to correct stone orientation."],
  });
  expectSafeReviewFailure(result, "unsafe_review");
});

test("rejects a file-path revision instruction", async () => {
  const { result } = await reviewWith({
    outcome: "REGENERATE",
    revisionInstructions: [
      "Read C:\\private\\design.png to correct ring composition.",
    ],
  });
  expectSafeReviewFailure(result, "unsafe_review");
});

test("rejects payment or order revision instructions", async () => {
  const payment = await reviewWith({
    outcome: "REGENERATE",
    revisionInstructions: ["Correct the stone setting after payment."],
  });
  const order = await reviewWith({
    outcome: "REGENERATE",
    revisionInstructions: ["Correct the ring composition for the order."],
  });
  expectSafeReviewFailure(payment.result, "unsafe_review");
  expectSafeReviewFailure(order.result, "unsafe_review");
});

test("rejects a CAD-complete claim", async () => {
  const { result } = await reviewWith({
    outcome: "REGENERATE",
    revisionInstructions: [
      "Mark CAD complete after correcting the ring shank.",
    ],
  });
  expectSafeReviewFailure(result, "unsafe_review");
});

test("rejects a production-approved claim", async () => {
  const { result } = await reviewWith({
    outcome: "REGENERATE",
    revisionInstructions: [
      "Mark production approved after correcting the ring.",
    ],
  });
  expectSafeReviewFailure(result, "unsafe_review");
});

test("rejects a guaranteed-manufacturability claim", async () => {
  const { result } = await reviewWith({
    outcome: "REGENERATE",
    revisionInstructions: [
      "Guarantee manufacturability after correcting the ring structure.",
    ],
  });
  expectSafeReviewFailure(result, "unsafe_review");
});

test("rejects a customer-contact revision instruction", async () => {
  const { result } = await reviewWith({
    outcome: "REGENERATE",
    revisionInstructions: [
      "Email address customer@example.invalid after correcting the ring.",
    ],
  });
  expectSafeReviewFailure(result, "unsafe_review");

  const reviewer = new FakeInstantPreviewAgentReviewer({ outcome: "PASS" });
  const unsafeInput = validReviewInput();
  unsafeInput.candidateObservations = [
    "Correct ring structure for customer@example.invalid.",
  ];
  const unsafeInputResult = await reviewInstantPreviewCandidate(
    reviewer,
    unsafeInput,
  );
  expectSafeReviewFailure(unsafeInputResult, "unsafe_review");
  expect(reviewer.callCount).toBe(0);
});

test("rejects UUID, publicReference, and private-path instructions", async () => {
  const unsafeInstructions = [
    "Correct ring structure for 123e4567-e89b-42d3-a456-426614174000.",
    "Correct ring structure for NOVORA-CB-20260723-TEST.",
    "Correct ring structure using private path private/output/design.png.",
  ];
  for (const instruction of unsafeInstructions) {
    const { result } = await reviewWith({
      outcome: "REGENERATE",
      revisionInstructions: [instruction],
    });
    expectSafeReviewFailure(result, "unsafe_review");
  }
});

test("never exposes a raw reviewer exception message", async () => {
  const marker = "RAW_REVIEWER_EXCEPTION_MUST_NOT_ESCAPE";
  const { result } = await reviewWith(() => {
    throw new Error(marker);
  });
  expect(JSON.stringify(result)).not.toContain(marker);
});

test("never exposes raw malformed reviewer content", async () => {
  const marker = "RAW_MALFORMED_REVIEW_MUST_NOT_ESCAPE";
  const { result } = await reviewWith({
    outcome: "REGENERATE",
    revisionInstructions: [marker],
    rawDiagnostic: marker,
  });
  expectSafeReviewFailure(result);
  expect(JSON.stringify(result)).not.toContain(marker);
});
