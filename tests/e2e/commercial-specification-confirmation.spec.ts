import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import Module, { createRequire } from "node:module";
import path from "node:path";
import ts from "typescript";

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
const quotationModule = testRequire("../../lib/server/commercial-quotation") as typeof import("../../lib/server/commercial-quotation");
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
  saved?: Record<string, string> | null | "unavailable";
} = {}) {
  const writes: unknown[] = [];
  let latest: import("../../lib/server/commercial-specification-confirmation").CommercialSpecificationInput | null | "unavailable" = input.saved ?? null;
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
        async readLatestExactConfirmation(
          _conceptBriefId: string,
          _outputId: string,
        ): Promise<import("../../lib/server/commercial-specification-confirmation").CommercialSpecificationInput | null | "unavailable"> {
          return latest;
        },
        async insertExactConfirmation(value: Parameters<import("../../lib/server/commercial-specification-confirmation").CommercialSpecificationConfirmationRepository["insertExactConfirmation"]>[0]) {
          writes.push(value);
          if (!input.insert || input.insert === "inserted") {
            const s = value.specificationSnapshot;
            latest = specificationModule.normalizeCommercialSpecificationInput({ ...s.piece, ...s.material, ...s.gemstones, ...s.sizeAndWear, ...s.constraints });
          }
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
  const fixture = dependencies({ insert: "already_confirmed", saved: customerSpecification({ metalDirection: "white gold" }) });
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
  const copy = testRequire("../../lib/i18n/dictionaries/customer-ui-copy").customerUICopy.commercialSpecification;
  expect(copy.cs004.toLowerCase()).toContain("specifications for quotation");
  expect(copy.cs009.toLowerCase()).toContain("i confirm these specifications as the basis for novora to prepare a quotation");
  expect(copy.cs007.toLowerCase()).toContain("does not accept a quotation");
  expect(source).toContain("copy.cs007");
  for (const boundary of ["payment", "order", "cad", "production"]) {
    expect(copy.cs007.toLowerCase()).toContain(boundary);
  }
  expect(source).toContain("binding: confirmationbinding");
  expect(source).toContain("specification,");
});

function savedRepository(row: Record<string, unknown> | null, error: unknown = null) {
  const calls: unknown[][] = [];
  const query = {
    select: (...args: unknown[]) => { calls.push(["select", ...args]); return query; },
    eq: (...args: unknown[]) => { calls.push(["eq", ...args]); return query; },
    order: (...args: unknown[]) => { calls.push(["order", ...args]); return query; },
    limit: async (...args: unknown[]) => { calls.push(["limit", ...args]); return { data: row ? [row] : [], error }; },
  };
  const repository = specificationModule.createSupabaseCommercialSpecificationConfirmationRepository({
    from(table: string) { calls.push(["from", table]); return query; },
  } as never);
  return { repository, calls };
}

function savedRow(input = customerSpecification({ metalDirection: "18k_white_gold", sizeDirection: "US 7" })) {
  const normalized = specificationModule.normalizeCommercialSpecificationInput(input)!;
  const snapshot = specificationModule.buildCommercialSpecificationSnapshot(normalized);
  return { concept_brief_id: BRIEF_ID, ai_sketch_output_id: OUTPUT_ID,
    specification_version: specificationModule.COMMERCIAL_SPECIFICATION_SNAPSHOT_VERSION,
    specification_snapshot: snapshot, specification_sha256: specificationModule.hashCommercialSpecificationSnapshot(snapshot) };
}

test("reload restores the latest exact confirmed snapshot instead of the old Brief, without display rewriting", async () => {
  const stored = savedRepository(savedRow());
  const fixture = dependencies();
  fixture.value.repository.readLatestExactConfirmation = stored.repository.readLatestExactConfirmation;
  const prepared = await specificationModule.prepareCommercialSpecificationConfirmation(REFERENCE, OUTPUT_ID, fixture.value);
  expect(prepared?.confirmed).toBe(true);
  expect(prepared?.items.find(x => x.key === "metalDirection")?.value).toBe("18k_white_gold");
  expect(prepared?.items.find(x => x.key === "sizeDirection")?.value).toBe("US 7");
  expect(stored.calls).toContainEqual(["eq", "concept_brief_id", BRIEF_ID]);
  expect(stored.calls).toContainEqual(["eq", "ai_sketch_output_id", OUTPUT_ID]);
  const exactLatestOrder = [
    ["order", "confirmed_at", { ascending: false }], ["order", "created_at", { ascending: false }], ["order", "id", { ascending: false }],
  ];
  expect(stored.calls.filter(x => x[0] === "order")).toEqual([...exactLatestOrder, ...exactLatestOrder]);
  expect(stored.calls.filter(x => x[0] === "limit")).toEqual([["limit", 1], ["limit", 1]]);
  expect(fixture.writes).toHaveLength(0);
});

test("only an absent confirmation permits original Brief prefill; failed or corrupt reads fail closed", async () => {
  const noSaved = dependencies();
  const prefill = await specificationModule.prepareCommercialSpecificationConfirmation(REFERENCE, OUTPUT_ID, noSaved.value);
  expect(prefill?.confirmed).toBe(false);
  expect(prefill?.items.find(x => x.key === "metalDirection")?.value).toBe("yellow gold");
  for (const patch of [
    { concept_brief_id: OTHER_OUTPUT_ID }, { ai_sketch_output_id: OTHER_OUTPUT_ID },
    { specification_sha256: "a".repeat(64) }, { specification_version: "wrong" },
    { specification_snapshot: { ...savedRow().specification_snapshot, customerEmail: "excluded@example.com" } },
  ]) {
    const stored = savedRepository({ ...savedRow(), ...patch }), fixture = dependencies();
    fixture.value.repository.readLatestExactConfirmation = stored.repository.readLatestExactConfirmation;
    expect(await specificationModule.prepareCommercialSpecificationConfirmation(REFERENCE, OUTPUT_ID, fixture.value)).toBeNull();
  }
  expect(await savedRepository(null, { message: "synthetic failure" }).repository.readLatestExactConfirmation(BRIEF_ID, OUTPUT_ID)).toBe("unavailable");
});

test("saved confirmation recovery still requires own current output and durable design confirmation, including final recheck", async () => {
  for (const input of [
    { viewState: "denied" as const }, { viewState: "unavailable" as const },
    { viewOutputId: OTHER_OUTPUT_ID }, { m3Confirmed: false },
  ]) {
    const fixture = dependencies({ ...input, saved: customerSpecification() });
    expect(await specificationModule.prepareCommercialSpecificationConfirmation(REFERENCE, OUTPUT_ID, fixture.value)).toBeNull();
    expect(fixture.writes).toHaveLength(0);
  }
  const revoked = dependencies({ saved: customerSpecification() });
  let views = 0;
  revoked.value.readCustomerView = async () => ++views === 1
    ? { state: "ready" as const, assetRequest: { publicReference: REFERENCE, outputId: OUTPUT_ID } }
    : { state: "unavailable" as const };
  expect(await specificationModule.prepareCommercialSpecificationConfirmation(REFERENCE, OUTPUT_ID, revoked.value)).toBeNull();
});

function statefulConfirmationDatabase() {
  const rows: Record<string, any>[] = [];
  let afterInsert: ((row: Record<string, any>) => Promise<void>) | undefined;
  const client = {
    from(table: string) {
      const filters: [string, unknown][] = [], orders: [string, boolean][] = [];
      const query = {
        select() { return query; },
        eq(key: string, value: unknown) { filters.push([key, value]); return query; },
        is(key: string, value: unknown) { filters.push([key, value]); return query; },
        order(key: string, options: { ascending: boolean }) { orders.push([key, options.ascending]); return query; },
        async limit(limit: number) {
          const tables: Record<string, Record<string, any>[]> = {
            concept_briefs: [{ id: BRIEF_ID, public_reference: REFERENCE, brief_payload: briefPayload() }],
            ai_sketch_outputs: [{ id: OUTPUT_ID, concept_brief_id: BRIEF_ID, readiness_status: "first_preview_ready", is_current_customer_preview: true, readiness_revoked_at: null }],
            first_preview_design_direction_confirmations: [{ id: OTHER_OUTPUT_ID, concept_brief_id: BRIEF_ID, ai_sketch_output_id: OUTPUT_ID }],
            commercial_specification_confirmations: rows,
          };
          if (!Object.hasOwn(tables, table)) throw new Error("Unexpected synthetic table.");
          const selected = tables[table].filter(row => filters.every(([key, value]) => row[key] === value));
          selected.sort((a, b) => {
            for (const [key, ascending] of orders) {
              const order = String(a[key]).localeCompare(String(b[key]));
              if (order) return ascending ? order : -order;
            }
            return 0;
          });
          return { data: structuredClone(selected.slice(0, limit)), error: null };
        },
        async insert(value: Record<string, unknown>) {
          expect(table).toBe("commercial_specification_confirmations");
          if (rows.some(row => row.concept_brief_id === value.concept_brief_id && row.ai_sketch_output_id === value.ai_sketch_output_id && row.specification_sha256 === value.specification_sha256)) {
            return { error: { code: "23505" } };
          }
          const ordinal = rows.length + 1, time = new Date(Date.parse("2026-11-04T01:00:00.000Z") + ordinal * 1000).toISOString();
          const row = { ...structuredClone(value), id: `623e4567-e89b-42d3-a456-${String(ordinal).padStart(12, "0")}`, confirmed_at: time, created_at: time };
          rows.push(row);
          await afterInsert?.(row);
          return { error: null };
        },
      };
      return query;
    },
  };
  const repository = specificationModule.createSupabaseCommercialSpecificationConfirmationRepository(client as never);
  const base = dependencies().value;
  return { rows, client, deps: { ...base, repository }, setAfterInsert(hook: typeof afterInsert) { afterInsert = hook; } };
}

test("A -> B -> A conflicts instead of falsely reconfirming history; restore and real quotation repository agree on B", async () => {
  const db = statefulConfirmationDatabase(), a = customerSpecification({ metalDirection: "yellow gold" }), b = customerSpecification({ metalDirection: "platinum" });
  expect(await specificationModule.persistCommercialSpecificationConfirmation(REFERENCE, body(a), db.deps)).toEqual({ ok: true, status: "created" });
  expect(await specificationModule.persistCommercialSpecificationConfirmation(REFERENCE, body(b), db.deps)).toEqual({ ok: true, status: "created" });
  const before = JSON.stringify(db.rows);
  const conflict = await specificationModule.persistCommercialSpecificationConfirmation(REFERENCE, body(a), db.deps);
  expect(conflict).toMatchObject({ ok: false, reason: "conflict" });
  if (conflict.ok === false && conflict.reason === "conflict") expect(conflict.currentItems.find(x => x.key === "metalDirection")?.value).toBe("platinum");
  expect(JSON.stringify(db.rows)).toBe(before);
  expect(db.rows).toHaveLength(2);
  const restored = await specificationModule.prepareCommercialSpecificationConfirmation(REFERENCE, OUTPUT_ID, db.deps);
  expect(restored?.items.find(x => x.key === "metalDirection")?.value).toBe("platinum");
  const basis = await quotationModule.createSupabaseCommercialQuotationRepository(db.client as never).findLatestSpecificationConfirmation({ conceptBriefId: BRIEF_ID, outputId: OUTPUT_ID });
  expect(basis).toMatchObject({ id: db.rows[1].id, specificationSha256: db.rows[1].specification_sha256 });
  expect(await specificationModule.persistCommercialSpecificationConfirmation(REFERENCE, body(b), db.deps)).toEqual({ ok: true, status: "already_confirmed" });
  expect(JSON.stringify(db.rows)).toBe(before);
});

test("a concurrent newer confirmation overtaking an inserted row returns conflict, not created success", async () => {
  const db = statefulConfirmationDatabase();
  let inserted!: () => void, release!: () => void;
  const insertedA = new Promise<void>(resolve => { inserted = resolve; }), gate = new Promise<void>(resolve => { release = resolve; });
  db.setAfterInsert(async row => { if (row.specification_snapshot.material.metalDirection === "yellow gold") { inserted(); await gate; } });
  const a = specificationModule.persistCommercialSpecificationConfirmation(REFERENCE, body(customerSpecification({ metalDirection: "yellow gold" })), db.deps);
  await insertedA;
  expect(await specificationModule.persistCommercialSpecificationConfirmation(REFERENCE, body(customerSpecification({ metalDirection: "platinum" })), db.deps)).toEqual({ ok: true, status: "created" });
  release();
  expect(await a).toMatchObject({ ok: false, reason: "conflict", currentItems: expect.arrayContaining([expect.objectContaining({ key: "metalDirection", value: "platinum" })]) });
  expect(db.rows).toHaveLength(2);
});

test("a newer state committed during the final access recheck cannot be hidden by an earlier readback", async () => {
  const db = statefulConfirmationDatabase(), readView = db.deps.readCustomerView;
  let views = 0, injected = false;
  db.deps.readCustomerView = async () => {
    views += 1;
    if (!injected && views === 3) {
      injected = true;
      expect(await specificationModule.persistCommercialSpecificationConfirmation(REFERENCE, body(customerSpecification({ metalDirection: "platinum" })), db.deps)).toEqual({ ok: true, status: "created" });
    }
    return readView();
  };
  expect(await specificationModule.persistCommercialSpecificationConfirmation(REFERENCE, body(), db.deps)).toMatchObject({
    ok: false, reason: "conflict", currentItems: expect.arrayContaining([expect.objectContaining({ key: "metalDirection", value: "platinum" })]),
  });
  expect(db.rows).toHaveLength(2);
});

test("unverified post-write readback or revoked access never returns success or exposes latest values", async () => {
  const failed = dependencies();
  failed.value.repository.readLatestExactConfirmation = async () => "unavailable";
  expect(await specificationModule.persistCommercialSpecificationConfirmation(REFERENCE, body(), failed.value)).toEqual({ ok: false, reason: "unavailable" });
  const revoked = dependencies();
  let views = 0;
  revoked.value.readCustomerView = async () => ++views < 3
    ? { state: "ready" as const, assetRequest: { publicReference: REFERENCE, outputId: OUTPUT_ID } }
    : { state: "denied" as const };
  expect(await specificationModule.persistCommercialSpecificationConfirmation(REFERENCE, body(), revoked.value)).toEqual({ ok: false, reason: "denied" });
});

test("preparation rejects a specification that changed during its view and authority checks", async () => {
  const db = dependencies({ saved: customerSpecification() }); let reads = 0;
  db.value.repository.readLatestExactConfirmation = async () => ++reads === 1 ? customerSpecification() : customerSpecification({ metalDirection: "platinum" });
  expect(await specificationModule.prepareCommercialSpecificationConfirmation(REFERENCE, OUTPUT_ID, db.value)).toBeNull();
});

test("actual POST route returns409 with owned display fields for a service conflict", async () => {
  const db = statefulConfirmationDatabase();
  await specificationModule.persistCommercialSpecificationConfirmation(REFERENCE, body(), db.deps);
  await specificationModule.persistCommercialSpecificationConfirmation(REFERENCE, body(customerSpecification({ metalDirection: "platinum" })), db.deps);
  const source = readFileSync(path.join(process.cwd(), "app/api/commercial-specification-confirmation/[public_reference]/route.ts"), "utf8");
  const module = { exports: {} as { POST?: (request: Request, context: unknown) => Promise<Response> } };
  new Function("module", "exports", "require", ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(module, module.exports, (id: string) => {
    if (id === "next/server") return testRequire("next/server");
    if (id.endsWith("/commercial-specification-confirmation")) return { persistCommercialSpecificationConfirmation: (reference: string, value: unknown) => specificationModule.persistCommercialSpecificationConfirmation(reference, value, db.deps) };
    throw new Error("Unexpected route dependency.");
  });
  const response = await module.exports.POST!(new Request("https://novora.test/api/commercial-specification-confirmation/" + REFERENCE, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body()) }), { params: Promise.resolve({ public_reference: REFERENCE }) });
  expect(response.status).toBe(409);
  const result = await response.json();
  expect(result).toMatchObject({ ok: false, reason: "conflict" });
  expect(result.currentItems).toContainEqual(expect.objectContaining({ key: "metalDirection", value: "platinum" }));
  for (const privateField of ["conceptBriefId", "specificationSha256", "confirmedAt", "excluded@example.com"]) expect(JSON.stringify(result)).not.toContain(privateField);
});
