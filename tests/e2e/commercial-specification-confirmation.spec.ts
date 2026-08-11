import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import Module, { createRequire } from "node:module";
import path from "node:path";

const internals = Module as unknown as {
  _resolveFilename(request: string, parent: unknown, isMain: boolean, options?: unknown): string;
};
const shim = path.join(process.cwd(), "node_modules", "next", "dist", "compiled", "server-only", "empty.js");
const original = internals._resolveFilename;
internals._resolveFilename = function (request, parent, isMain, options) {
  return request === "server-only" ? shim : original.call(this, request, parent, isMain, options);
};
const testRequire = createRequire(
  path.join(process.cwd(), "tests", "e2e", "commercial-specification-confirmation.spec.ts"),
);
const specificationModule = testRequire(
  "../../lib/server/commercial-specification-confirmation",
) as typeof import("../../lib/server/commercial-specification-confirmation");
internals._resolveFilename = original;

const BRIEF_ID = "123e4567-e89b-42d3-a456-426614174000";
const OUTPUT_ID = "423e4567-e89b-42d3-a456-426614174000";
const OTHER_OUTPUT_ID = "523e4567-e89b-42d3-a456-426614174000";
const REFERENCE = "NOVORA-CB-20260811-M411";
const SIGNING_SECRET = "m4-1-commercial-specification-test-secret-20260811";

function briefPayload(metalDirection = "yellow gold") {
  return {
    customerName: "excluded from snapshot",
    customerEmail: "excluded@example.com",
    brief: {
      pieceType: "ring",
      structure: "ring center stone",
      subStructure: "solitaire",
      stoneLogic: "center stone",
      focalStoneType: "lab grown diamond",
      focalStoneColor: "not_sure",
      focalStoneShape: "oval",
      focalStoneSize: "1 ct direction",
      sizeDirection: "US 6.5",
      metalDirection,
      finishDirection: "polished",
      bandWidthDirection: "2 mm direction",
      wearability: "Daily wear",
      mustInclude: "Low profile",
      mustAvoid: "Sharp edges",
    },
  };
}

function customerSpecification(
  overrides: Record<string, string> = {},
  payload: unknown = briefPayload(),
) {
  const prefill = specificationModule.commercialSpecificationPrefillFromBrief(payload);
  if (!prefill) throw new Error("Expected commercial specification prefill.");
  return { ...prefill, ...overrides };
}

function body(specification = customerSpecification()) {
  const binding = specificationModule.createCommercialSpecificationConfirmationBinding(
    {
      publicReference: REFERENCE,
      conceptBriefId: BRIEF_ID,
      outputId: OUTPUT_ID,
    },
    SIGNING_SECRET,
  );
  if (!binding) throw new Error("Expected binding fixture.");
  return { binding, specification };
}

function dependencies(input: {
  briefPayload?: unknown;
  m3Confirmed?: boolean;
  viewOutputId?: string;
  viewState?: "ready" | "pending" | "unavailable" | "denied";
  insert?: "inserted" | "already_confirmed" | "unavailable";
} = {}) {
  const writes: unknown[] = [];
  return {
    writes,
    value: {
      readCustomerView: async () => {
        const state = input.viewState ?? "ready";
        if (state === "ready") {
          return {
            state: "ready" as const,
            assetRequest: {
              publicReference: REFERENCE,
              outputId: input.viewOutputId ?? OUTPUT_ID,
            },
          };
        }
        if (state === "pending") {
          return { state: "pending" as const, pollAfterMs: 5_000 as const };
        }
        return { state };
      },
      repository: {
        async resolveExactCurrentAuthority() {
          return {
            conceptBriefId: BRIEF_ID,
            outputId: OUTPUT_ID,
            briefPayload: input.briefPayload ?? briefPayload(),
          };
        },
        async hasExactDesignDirectionConfirmation() {
          return input.m3Confirmed ?? true;
        },
        async insertExactConfirmation(value: unknown) {
          writes.push(value);
          return input.insert ?? "inserted";
        },
      },
      signingSecret: SIGNING_SECRET,
    },
  };
}

test("Concept Brief values are prefill defaults, not final authority", () => {
  const prefill = specificationModule.commercialSpecificationPrefillFromBrief(
    briefPayload("yellow gold"),
  );
  expect(prefill).toMatchObject({
    pieceType: "ring",
    structure: "ring center stone",
    metalDirection: "yellow gold",
  });
  expect(JSON.stringify(prefill)).not.toContain("excluded@example.com");
});

test("persists the customer-corrected normalized specification and server-computed hash", async () => {
  const fixture = dependencies({ briefPayload: briefPayload("yellow gold") });
  const submitted = customerSpecification(
    { metalDirection: "  white   gold  ", productionConcernNote: "  Confirm after sizing  " },
    briefPayload("yellow gold"),
  );
  const result = await specificationModule.persistCommercialSpecificationConfirmation(
    REFERENCE,
    body(submitted),
    fixture.value,
  );
  expect(result).toEqual({ ok: true, status: "created" });
  expect(fixture.writes).toHaveLength(1);
  const normalized = specificationModule.normalizeCommercialSpecificationInput(submitted);
  expect(normalized).not.toBeNull();
  const expectedSnapshot = specificationModule.buildCommercialSpecificationSnapshot(normalized!);
  expect(fixture.writes[0]).toMatchObject({
    conceptBriefId: BRIEF_ID,
    outputId: OUTPUT_ID,
    specificationVersion: "commercial_specification_snapshot_v1",
    specificationSnapshot: expectedSnapshot,
    specificationSha256:
      specificationModule.hashCommercialSpecificationSnapshot(expectedSnapshot),
  });
  expect(fixture.writes[0]).toMatchObject({
    specificationSnapshot: { material: { metalDirection: "white gold" } },
  });
  expect(JSON.stringify(fixture.writes[0])).not.toContain("yellow gold");
});

test("strict input rejects unknown, nested, accessor, proxy, and overlong values", async () => {
  const invalidSpecifications: unknown[] = [
    { ...customerSpecification(), unexpected: "browser controlled" },
    { ...customerSpecification(), metalDirection: { value: "white gold" } },
    Object.defineProperty(customerSpecification(), "metalDirection", {
      enumerable: true,
      get: () => "white gold",
    }),
    new Proxy(customerSpecification(), {}),
    { ...customerSpecification(), metalDirection: "x".repeat(161) },
  ];
  for (const specification of invalidSpecifications) {
    const fixture = dependencies();
    await expect(
      specificationModule.persistCommercialSpecificationConfirmation(
        REFERENCE,
        body(specification as Record<string, string>),
        fixture.value,
      ),
    ).resolves.toEqual({ ok: false, reason: "invalid" });
    expect(fixture.writes).toHaveLength(0);
  }
});

test("browser cannot control binding IDs, hash, time, confirmation state, or database identity", async () => {
  for (const extra of [
    { conceptBriefId: OTHER_OUTPUT_ID },
    { outputId: OTHER_OUTPUT_ID },
    { specificationSha256: "a".repeat(64) },
    { confirmedAt: "2026-08-11T00:00:00.000Z" },
    { id: OTHER_OUTPUT_ID },
    { confirmationState: "confirmed" },
  ]) {
    const fixture = dependencies();
    await expect(
      specificationModule.persistCommercialSpecificationConfirmation(
        REFERENCE,
        { ...body(), ...extra },
        fixture.value,
      ),
    ).resolves.toEqual({ ok: false, reason: "invalid" });
    expect(fixture.writes).toHaveLength(0);
  }
});

test("rejects confirmation when the exact pair lacks durable M3-4 evidence", async () => {
  const fixture = dependencies({ m3Confirmed: false });
  await expect(
    specificationModule.persistCommercialSpecificationConfirmation(REFERENCE, body(), fixture.value),
  ).resolves.toEqual({ ok: false, reason: "design_unconfirmed" });
  expect(fixture.writes).toHaveLength(0);
});

test("rejects a wrong output and a stale or revoked customer view", async () => {
  const wrong = dependencies({ viewOutputId: OTHER_OUTPUT_ID });
  await expect(
    specificationModule.persistCommercialSpecificationConfirmation(REFERENCE, body(), wrong.value),
  ).resolves.toEqual({ ok: false, reason: "unavailable" });
  const stale = dependencies({ viewState: "unavailable" });
  await expect(
    specificationModule.persistCommercialSpecificationConfirmation(REFERENCE, body(), stale.value),
  ).resolves.toEqual({ ok: false, reason: "unavailable" });
});

test("same normalized customer-confirmed state is idempotent", async () => {
  const fixture = dependencies({ insert: "already_confirmed" });
  await expect(
    specificationModule.persistCommercialSpecificationConfirmation(
      REFERENCE,
      body(customerSpecification({ metalDirection: " white   gold " })),
      fixture.value,
    ),
  ).resolves.toEqual({ ok: true, status: "already_confirmed" });
});

test("changed normalized customer-confirmed state receives a distinct hash and preserves history", () => {
  const firstInput = specificationModule.normalizeCommercialSpecificationInput(
    customerSpecification({ metalDirection: "white gold" }),
  );
  const sameInput = specificationModule.normalizeCommercialSpecificationInput(
    customerSpecification({ metalDirection: "  white   gold " }),
  );
  const changedInput = specificationModule.normalizeCommercialSpecificationInput(
    customerSpecification({ metalDirection: "platinum" }),
  );
  const first = specificationModule.buildCommercialSpecificationSnapshot(firstInput!);
  const same = specificationModule.buildCommercialSpecificationSnapshot(sameInput!);
  const changed = specificationModule.buildCommercialSpecificationSnapshot(changedInput!);
  expect(specificationModule.hashCommercialSpecificationSnapshot(first)).toBe(
    specificationModule.hashCommercialSpecificationSnapshot(same),
  );
  expect(specificationModule.hashCommercialSpecificationSnapshot(first)).not.toBe(
    specificationModule.hashCommercialSpecificationSnapshot(changed),
  );
  const sql = readFileSync(
    path.join(process.cwd(), "docs", "novora-m4-1-commercial-specification-confirmation-candidate.sql"),
    "utf8",
  );
  expect(sql).toContain("UNIQUE (concept_brief_id, ai_sketch_output_id, specification_sha256)");
  expect(sql).not.toContain("UNIQUE (concept_brief_id, ai_sketch_output_id),");
});

test("candidate requires exact M3-4 pair and grants only the minimum access", () => {
  const sql = readFileSync(
    path.join(process.cwd(), "docs", "novora-m4-1-commercial-specification-confirmation-candidate.sql"),
    "utf8",
  );
  expect(sql).toContain("first_preview_design_direction_confirmations");
  expect(sql).toContain("confirmation.concept_brief_id = NEW.concept_brief_id");
  expect(sql).toContain("confirmation.ai_sketch_output_id = NEW.ai_sketch_output_id");
  expect(sql).toContain("GRANT SELECT, INSERT");
  expect(sql).not.toMatch(/GRANT\s+(UPDATE|DELETE)/i);
});

test("customer copy keeps quotation, payment, order, CAD, and production separate", () => {
  const source = readFileSync(
    path.join(
      process.cwd(),
      "app", "design", "preview", "[public_reference]",
      "CommercialSpecificationConfirmation.tsx",
    ),
    "utf8",
  ).toLowerCase();
  expect(source).toContain("specifications for quotation");
  expect(source).toContain("i confirm these specifications as the basis for novora to prepare a quotation");
  expect(source).toContain("does not accept a quotation");
  for (const boundary of ["payment", "order", "cad", "production"]) {
    expect(source).toContain(boundary);
  }
  expect(source).toContain("binding: confirmationbinding");
  expect(source).toContain("specification,");
});
