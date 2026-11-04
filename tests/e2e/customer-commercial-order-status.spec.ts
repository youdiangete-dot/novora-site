import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import Module, { createRequire } from "node:module";
import path from "node:path";
import ts from "typescript";
const loader = Module as unknown as { _resolveFilename: (...args: any[]) => string }, original = loader._resolveFilename;
const req = createRequire(__filename);
loader._resolveFilename = function (name, ...args) { return name === "server-only" ? req.resolve("next/dist/compiled/server-only/empty.js") : original.call(this, name, ...args); };
const status = req("../../lib/server/customer-commercial-order-status") as typeof import("../../lib/server/customer-commercial-order-status");
const quotes = req("../../lib/server/commercial-quotation") as typeof import("../../lib/server/commercial-quotation");
const { createCustomerOrderStatusHandler } = req("../../app/api/customer-commercial-order-status/handler") as typeof import("../../app/api/customer-commercial-order-status/handler");
loader._resolveFilename = original;
const ref = "NOVORA-CB-20261104-ST01", brief = "123e4567-e89b-42d3-a456-426614174000", output = "223e4567-e89b-42d3-a456-426614174000";
const owner = { identity: "TEST_A", scope: "a".repeat(64) }, receipt = { briefId: brief, publicReference: ref };
const reference = (kind: string, n: number) => `NOVORA-${kind}-${n.toString(16).toUpperCase().padStart(24, "0")}`;
function row(n = 1): any {
  const spec = `323e4567-e89b-42d3-a456-${String(n).padStart(12, "0")}`;
  const snapshot = quotes.buildCommercialQuotationSnapshot(quotes.normalizeCommercialQuotationInput({ currency: "USD", lineItems: [{ description: "TEST item", amount: "1.23" }], validUntil: null, note: null })!);
  return { order_reference: reference("O", n), order_version: "commercial_order_v1", commercial_payment_reference: reference("P", n), commercial_quotation_reference: reference("Q", n), amount_minor: 123, currency: "USD", created_at: "2026-11-04T01:00:00Z",
    payment: { payment_reference: reference("P", n), commercial_quotation_reference: reference("Q", n), payment_version: "commercial_payment_v1", status: "paid", amount_minor: 123, currency: "USD", paid_at: "2026-11-04T00:59:00Z", provider_payment_id: "TEST private provider ID" },
    quotation: { quote_reference: reference("Q", n), commercial_specification_confirmation_id: spec, quotation_version: "commercial_quotation_v1", quotation_snapshot: snapshot, quotation_sha256: quotes.hashCommercialQuotationSnapshot(snapshot), specification: { id: spec, concept_brief_id: brief, ai_sketch_output_id: output, brief: { id: brief, public_reference: ref, email: "test-private@example.invalid" }, output: { id: output, concept_brief_id: brief, is_current_customer_preview: false, private_path: "TEST private storage" } } },
    cad: { order_reference: reference("O", n), recorded_at: "2026-11-04T02:00:00Z", handoff_reference: "TEST private CAD", production: { order_reference: reference("O", n), recorded_at: "2026-11-04T03:00:00Z", manual_decision_reference: "TEST private manual decision" } }, internal_notes: "TEST private admin notes" };
}
const request = (who = "A", query = `publicReference=${ref}`, method = "GET", headers: Record<string, string> = {}) => new Request(`https://test.invalid/api/customer-commercial-order-status?${query}`, { method, headers: { ...(who ? { Authorization: `Bearer ${who}` } : {}), ...headers } });
function fixture(rows: unknown = [row()]) {
  let active = true, receiptReads = 0, orderReads = 0;
  const deps = { authenticate: (r: Request) => r.headers.get("authorization") === "Bearer A" ? owner : r.headers.get("authorization") === "Bearer B" ? { ...owner, identity: "TEST_B" } : null,
    active: () => active,
    repository: { ownedReceipt: async (who: typeof owner, r: string) => { receiptReads++; return who.identity === "TEST_A" && r === ref ? receipt : null; }, orders: async (id: string) => { orderReads++; expect(id).toBe(brief); return rows; } } };
  return { deps, service: status.createCustomerCommercialOrderStatus(deps), revoke: () => { active = false; }, counts: () => ({ receiptReads, orderReads }) };
}
test("owned historical paid order exposes only exact customer-safe record timestamps", async () => {
  const f = fixture(), result = await f.service.read(request(), ref);
  expect(result).toEqual({ state: "ready", publicReference: ref, hasMore: false, orders: [{ orderReference: reference("O", 1), recordedAt: "2026-11-04T01:00:00.000Z", cadHandoffRecordedAt: "2026-11-04T02:00:00.000Z", productionHandoffRecordedAt: "2026-11-04T03:00:00.000Z" }] });
  for (const forbidden of ["private", "provider", "manual_decision", "quotation", brief, output, "approval", "shipment"]) expect(JSON.stringify(result)).not.toContain(forbidden);
});
test("unauthenticated callers and revoked identities cannot query receipts or orders", async () => {
  for (const who of ["", "forged"]) { const f = fixture(); expect(await f.service.read(request(who), ref)).toBeNull(); expect(f.counts()).toEqual({ receiptReads: 0, orderReads: 0 }); }
  const f = fixture(); f.revoke(); expect(await f.service.read(request(), ref)).toBeNull(); expect(f.counts()).toEqual({ receiptReads: 0, orderReads: 0 });
});
test("other identity or unowned reference cannot trigger a commercial read", async () => {
  const f = fixture(); expect(await f.service.read(request("B"), ref)).toBeNull(); expect(await f.service.read(request(), "NOVORA-CB-20261104-ST02")).toBeNull(); expect(f.counts().orderReads).toBe(0);
});
test("owner revocation after either async read denies the response", async () => {
  for (const phase of ["receipt", "orders"]) { const f = fixture(); if (phase === "receipt") f.deps.repository.ownedReceipt = async () => { f.revoke(); return receipt; }; else f.deps.repository.orders = async () => { f.revoke(); return [row()]; }; expect(await f.service.read(request(), ref)).toBeNull(); }
});
test("mismatched receipt reference or brief UUID is rejected", async () => {
  for (const changed of [{ briefId: "bad", publicReference: ref }, { briefId: brief, publicReference: "NOVORA-CB-20261104-ST02" }]) { const f = fixture(); f.deps.repository.ownedReceipt = async () => changed; expect(await f.service.read(request(), ref)).toBeNull(); expect(f.counts().orderReads).toBe(0); }
});
test("verified empty, missing CAD and missing production are distinct factual records", async () => {
  expect(await fixture([]).service.read(request(), ref)).toMatchObject({ state: "ready", orders: [] });
  const noCad = row(); noCad.cad = null; expect(await fixture([noCad]).service.read(request(), ref)).toMatchObject({ orders: [{ cadHandoffRecordedAt: null, productionHandoffRecordedAt: null }] });
  const noProduction = row(); noProduction.cad.production = null; expect(await fixture([noProduction]).service.read(request(), ref)).toMatchObject({ orders: [{ productionHandoffRecordedAt: null }] });
});
for (const [name, mutate] of Object.entries({ unpaid: (r: any) => r.payment.status = "pending", amount: (r: any) => r.payment.amount_minor = 124, currency: (r: any) => r.payment.currency = "TWD", hash: (r: any) => r.quotation.quotation_sha256 = "0".repeat(64), ownerBrief: (r: any) => r.quotation.specification.concept_brief_id = output, receipt: (r: any) => r.quotation.specification.brief.public_reference = "NOVORA-CB-20261104-ST02", cadBinding: (r: any) => r.cad.order_reference = reference("O", 2), productionBinding: (r: any) => r.cad.production.order_reference = reference("O", 2), missingJoin: (r: any) => delete r.cad, malformedJoin: (r: any) => r.cad = [], chronology: (r: any) => r.cad.production.recorded_at = "2026-11-04T00:00:00Z" })) {
  test(`fails closed for ${name}`, async () => { const changed = row(); mutate(changed); expect(await fixture([changed]).service.read(request(), ref)).toBeNull(); });
}
test("database failure and duplicate/oversized rows never appear as empty or success", async () => {
  for (const rows of [null, {}, [row(), row()], Array.from({ length: 27 }, (_, i) => row(i + 1))]) expect(await fixture(rows).service.read(request(), ref)).toBeNull();
  const f = fixture(); f.deps.repository.orders = async () => { throw Error("TEST raw private error"); }; expect(await f.service.read(request(), ref)).toBeNull();
});
test("bounded list checks owner binding even on undisplayed extra row", async () => {
  const rows = Array.from({ length: 26 }, (_, i) => row(i + 1)); expect(await fixture(rows).service.read(request(), ref)).toMatchObject({ hasMore: true, orders: expect.any(Array) });
  rows[25].quotation.specification.brief.public_reference = "NOVORA-CB-20261104-ST02"; expect(await fixture(rows).service.read(request(), ref)).toBeNull();
});
test("repository constrains scoped receipt and root orders with inner joins, reads no internal handoff references", async () => {
  const calls: any[] = []; let table = ""; const q = { select: (s: string) => { calls.push(["select", s]); return q; }, eq: (...a: any[]) => { calls.push(["eq", ...a]); return q; }, order: (...a: any[]) => { calls.push(["order", ...a]); return q; }, limit: async (n: number) => { calls.push(["limit", n]); return { data: table === "m2_scoped_submission_receipts" ? [{ concept_brief_id: brief, public_reference: ref }] : [], error: null }; } };
  const repo = status.createCustomerOrderStatusRepository(() => ({ from: (t: string) => { table = t; calls.push(["from", t]); return q; } } as never));
  expect(await repo.ownedReceipt(owner, ref)).toEqual(receipt); await repo.orders(brief);
  for (const c of [["eq", "scope_sha256", owner.scope], ["eq", "invitation_identity", owner.identity], ["eq", "public_reference", ref], ["eq", "quotation.specification.concept_brief_id", brief], ["limit", 2], ["limit", 26]]) expect(calls).toContainEqual(c);
  const select = calls.filter(c => c[0] === "select")[1][1]; expect(select).toContain("commercial_orders_commercial_quotation_reference_fkey!inner"); expect(select).toContain("commercial_quotations_specification_confirmation_fkey!inner");
  for (const column of ["manual_decision_reference", "handoff_reference", "provider_payment_id", "email", "internal_notes"]) expect(select).not.toContain(column);
});
test("runtime is default OFF before credentials and real invitation auth remains server derived", async () => {
  let reads = 0; expect(status.getCustomerCommercialOrderStatus({ environment: {}, client: () => { reads++; return null; } })).toBeNull(); expect(reads).toBe(0);
  const code = "SYNTHETIC_" + "a".repeat(43), env = { NOVORA_CUSTOMER_ORDER_STATUS_ENABLED: "true", NOVORA_INVITATION_TRIAL_RECEIPTS_ENABLED: "true", NOVORA_INVITATION_TRIAL_RECEIPT_NAMESPACE: "TEST_ORDER_STATUS_NAMESPACE", NOVORA_BETA_ADMISSION_ENABLED: "true", NOVORA_BETA_INVITATIONS_JSON: JSON.stringify([{ identity: "TEST_A", credentialSha256: createHash("sha256").update(code).digest("hex") }]), VERCEL_PROJECT_ID: "prj_H9Di3TIvXiZJHO06WwoaW8RqFfVg", VERCEL_ENV: "preview" };
  const service = status.getCustomerCommercialOrderStatus({ environment: env, client: () => { reads++; return null; } })!;
  expect(await service.read(request("forged"), ref)).toBeNull(); expect(reads).toBe(0);
  expect(await service.read(request(code), ref)).toBeNull(); expect(reads).toBe(1);
});
test("HTTP GET ignores no ownership assertion, returns no-store, and has no mutation path", async () => {
  const f = fixture(), rate: any = async () => ({ allowed: true }), handler = createCustomerOrderStatusHandler(() => f.service, rate);
  const response = await handler(request()); expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("private, no-store"); expect(response.headers.get("vary")).toContain("Authorization");
  for (const r of [request("B"), request("", `publicReference=${ref}&owner=TEST_A`), request("A", `publicReference=${ref}&publicReference=${ref}`), request("A", `publicReference=${ref}`, "POST"), request("A", `publicReference=${ref}`, "GET", { Origin: "https://evil.invalid" }), request("A", `publicReference=${ref}`, "GET", { "sec-fetch-site": "cross-site" })]) { const denied = await handler(r); expect(denied.status).toBe(404); expect(await denied.json()).toEqual({ state: "unavailable" }); }
  expect((await createCustomerOrderStatusHandler(() => null, rate)(request())).status).toBe(404);
});
test("page is default OFF and does not render customer access UI when disabled", () => {
  const mod = { exports: {} as any }, source = readFileSync("app/account/orders/status/page.tsx", "utf8"); let mounted = false;
  const fakeReact = { jsx: (type: any, props: any) => { if (typeof type === "function") { mounted = true; return type(props); } return props; }, jsxs: (_type: any, props: any) => props };
  new Function("module", "exports", "require", "process", ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText)(mod, mod.exports, (id: string) => id === "react/jsx-runtime" ? fakeReact : { default: () => null }, { env: {} });
  expect(JSON.stringify(mod.exports.default())).toContain("Order records unavailable"); expect(mounted).toBe(false);
});
