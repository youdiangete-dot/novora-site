import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import Module, { createRequire } from "node:module";
import path from "node:path";
import ts from "typescript";
const internals = Module as unknown as { _resolveFilename: (...args: any[]) => string };
const original = internals._resolveFilename;
internals._resolveFilename = function (request, ...args) { return request === "server-only" ? path.join(process.cwd(), "node_modules/next/dist/compiled/server-only/empty.js") : original.call(this, request, ...args); };
const req = createRequire(path.join(process.cwd(), "tests/e2e/admin-cad-handoff.spec.ts"));
const cad = req("../../lib/server/admin-cad-handoff") as typeof import("../../lib/server/admin-cad-handoff");
const orders = req("../../lib/server/admin-commercial-orders") as typeof import("../../lib/server/admin-commercial-orders");
internals._resolveFilename = original;
const React = req("react"), server = req("react-dom/server");
const ref = "NOVORA-O-" + "1".repeat(24), other = "NOVORA-O-" + "2".repeat(24);
const order = { orderReference: ref, quoteReference: "NOVORA-Q-" + "3".repeat(24), publicReference: "NOVORA-CB-20260811-M511", conceptBriefId: "123e4567-e89b-42d3-a456-426614174000", amount: "1.23", currency: "USD", recordedAt: "2026-11-04T01:00:00Z" };
const persisted = (code = "TEST-CAD-1") => ({ order_reference: ref, handoff_reference: code, recorded_at: "2026-11-04T02:00:00Z" });
function fixture() {
  let row: unknown = null, inserts = 0, reads = 0;
  const d = { readOrder: async () => ({ ok: true as const, order }), repository: {
    read: async () => { reads++; return row; },
    insert: async (_ref: string, code: string): Promise<"inserted" | "duplicate" | "unknown"> => { inserts++; if (row) return "duplicate"; row = persisted(code); return "inserted"; },
  } };
  return { d, set: (value: unknown) => { row = value; }, count: () => ({ inserts, reads }) };
}
test("records only after durable readback and keeps identical resubmission idempotent", async () => {
  const f = fixture(); expect(await cad.recordCadHandoff(ref, "TEST-CAD-1", f.d)).toBe("recorded");
  expect(await cad.recordCadHandoff(ref, "TEST-CAD-1", f.d)).toBe("already_recorded");
  expect(await cad.recordCadHandoff(ref, "TEST-CAD-2", f.d)).toBe("conflict");
  expect(f.count().inserts).toBe(1);
});
test("concurrent different references have one immutable winner", async () => {
  const f = fixture(); const results = await Promise.all(["TEST-CAD-1", "TEST-CAD-2"].map(code => cad.recordCadHandoff(ref, code, f.d)));
  expect(results.filter(r => r === "recorded")).toHaveLength(1); expect(results.filter(r => r === "conflict")).toHaveLength(1);
  expect((await cad.readCadHandoff(ref, f.d))).toMatchObject({ ok: true, handoff: { handoffReference: "TEST-CAD-1" } });
});
test("lost write response is reconciled without a second insert", async () => {
  const f = fixture(); f.d.repository.insert = async () => { f.set(persisted()); throw Error("TEST reset"); };
  expect(await cad.recordCadHandoff(ref, "TEST-CAD-1", f.d)).toBe("already_recorded"); expect(f.count().reads).toBe(2);
});
test("UNKNOWN with no visible record does not retry or report success", async () => {
  const f = fixture(); let attempts = 0; f.d.repository.insert = async () => { attempts++; return "unknown"; };
  expect(await cad.recordCadHandoff(ref, "TEST-CAD-1", f.d)).toBe("unknown"); expect(attempts).toBe(1);
});
test("insert acknowledgement without readback is not success", async () => {
  const f = fixture(); f.d.repository.insert = async () => "inserted";
  expect(await cad.recordCadHandoff(ref, "TEST-CAD-1", f.d)).toBe("unknown");
});
test("failed post-write verification cannot produce a confirmed status", async () => {
  const f = fixture(); let calls = 0; f.d.repository.read = async () => { if (++calls > 1) throw Error("TEST backend details"); return null; };
  expect(await cad.recordCadHandoff(ref, "TEST-CAD-1", f.d)).toBe("unknown"); expect(f.count().inserts).toBe(1);
});
test("unpaid, missing or unverified order never reaches handoff write", async () => {
  for (const value of [{ ok: false, order: null }, { ok: true, order: null }]) {
    const f = fixture(); f.d.readOrder = async () => value as any;
    expect(await cad.recordCadHandoff(ref, "TEST-CAD-1", f.d)).toBe("unavailable"); expect(f.count()).toEqual({ inserts: 0, reads: 0 });
  }
});
test("invalid client values cause no persistence access", async () => {
  for (const [id, code] of [["bad", "TEST-CAD-1"], [ref, ""], [ref, " bad"], [ref, "bad\nref"], [ref, "a".repeat(121)], [ref, { actor: "Owner" }]]) {
    const f = fixture(); expect(await cad.recordCadHandoff(id as string, code, f.d)).toBe("invalid"); expect(f.count()).toEqual({ inserts: 0, reads: 0 });
  }
});
for (const [name, mutate] of Object.entries({ order: (r: any) => r.order_reference = other, date: (r: any) => r.recorded_at = "bad", reference: (r: any) => r.handoff_reference = "<script>" })) {
  test(`invalid persisted ${name} fails closed`, async () => { const f = fixture(), row = persisted(); mutate(row); f.set(row); expect(await cad.readCadHandoff(ref, f.d)).toEqual({ ok: false }); expect(await cad.recordCadHandoff(ref, "TEST-CAD-1", f.d)).toBe("unavailable"); expect(f.count().inserts).toBe(0); });
}
test("repository inserts only order/reference, maps errors without leaking raw data", async () => {
  const calls: unknown[] = [];
  const client = { from: (table: string) => ({ insert: async (payload: unknown) => { calls.push([table, payload]); return { error: { code: "23505", message: "TEST private error" } }; } }) };
  expect(await cad.createCadHandoffRepository(client as never).insert(ref, "TEST-CAD-1")).toBe("duplicate");
  expect(calls).toEqual([["commercial_cad_handoffs", { order_reference: ref, handoff_reference: "TEST-CAD-1" }]]);
});
test("exact order lookup rejects unrelated, multiple or unverified rows", async () => {
  for (const value of [null, [{ order_reference: other }], [{}, {}]]) expect(await orders.readAdminCommercialOrder(ref, { readRows: async () => value })).toEqual({ ok: false, order: null });
  expect(await orders.readAdminCommercialOrder(ref, { readRows: async () => [] })).toEqual({ ok: true, order: null });
});
function pageModule(cookie: string | undefined, result: unknown, outcome = "recorded") {
  let reads = 0, writes = 0; const mod = { exports: {} as any };
  const source = readFileSync("app/admin/orders/[orderReference]/cad/page.tsx", "utf8") + "\nexports.testAction = saveCadHandoff;";
  new Function("module", "exports", "require", ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText)(mod, mod.exports, (id: string) => {
    if (id === "next/link") return { __esModule: true, default: ({ href, children }: any) => React.createElement("a", { href }, children) };
    if (id === "next/headers") return { cookies: async () => ({ get: () => cookie ? { value: cookie } : undefined }) };
    if (id === "next/navigation") return { redirect: (url: string) => { throw Error("REDIRECT " + url); } };
    if (id.endsWith("/admin-access")) return { ADMIN_ACCESS_COOKIE_NAME: "TEST cookie", isValidAdminAccessCookie: (c: string) => c === "TEST valid" };
    if (id.endsWith("/admin-cad-handoff")) return { readCadHandoff: async () => { reads++; return result; }, recordCadHandoff: async () => { writes++; return outcome; } };
    if (id.endsWith(".module.css")) return { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) };
    return req(id);
  });
  return { render: async (check?: string) => server.renderToStaticMarkup(await mod.exports.default({ params: Promise.resolve({ orderReference: ref }), searchParams: Promise.resolve({ check }) })), action: mod.exports.testAction, counts: () => ({ reads, writes }) };
}
test("no-cookie or invalid-cookie access denies both reads and server-action writes", async () => {
  for (const cookie of [undefined, "TEST invalid"]) { const p = pageModule(cookie, {}); await expect(p.render()).rejects.toThrow("REDIRECT /admin/briefs"); await expect(p.action(new FormData())).rejects.toThrow("REDIRECT /admin/briefs"); expect(p.counts()).toEqual({ reads: 0, writes: 0 }); }
});
test("server action validates order and redirects UNKNOWN to reconciliation, never to success", async () => {
  const p = pageModule("TEST valid", {}, "unknown"), body = new FormData(); body.set("orderReference", ref); body.set("handoffReference", "TEST-CAD-1");
  await expect(p.action(body)).rejects.toThrow(`/admin/orders/${ref}/cad?check=required`); expect(p.counts().writes).toBe(1);
  const invalid = new FormData(); invalid.set("orderReference", "forged"); await expect(p.action(invalid)).rejects.toThrow("REDIRECT /admin/orders"); expect(p.counts().writes).toBe(1);
});
test("success comes from persisted record, query string cannot invent it", async () => {
  const empty = pageModule("TEST valid", { ok: true, order, handoff: null });
  const html = await empty.render("required"); expect(html).not.toContain("CAD handoff recorded"); expect(html).not.toContain("<form"); expect(html).toContain("Outcome remains unconfirmed");
  expect(html).not.toContain("Manual production handoff record");
  expect(await pageModule("TEST valid", { ok: false }).render()).toContain("CAD handoff unavailable");
  const confirmed = await pageModule("TEST valid", { ok: true, order, handoff: { handoffReference: "TEST-CAD-1", recordedAt: "2026-11-04T02:00:00Z" } }).render();
  expect(confirmed).toContain("CAD handoff recorded"); expect(confirmed).not.toContain("<form"); expect(confirmed).toContain("not CAD completion or production approval");
  expect(confirmed).toContain(`href="/admin/orders/${ref}/production"`);
});
test("mobile admin handoff form and confirmed record preserve bounded readable layout", async ({ page }) => {
  const empty = await pageModule("TEST valid", { ok: true, order, handoff: null }).render();
  await page.route("**/*", route => route.abort()); await page.route("http://novora.test/", route => route.fulfill({ contentType: "text/html; charset=utf-8", body: `<html><head><meta charset="utf-8"></head><body>${empty}</body></html>` }));
  await page.setViewportSize({ width: 375, height: 812 }); await page.goto("http://novora.test/");
  await expect(page.getByLabel("Offline CAD handoff reference")).toBeVisible(); await page.getByLabel("Offline CAD handoff reference").fill("TEST/CAD-1");
  expect(await page.getByLabel("Offline CAD handoff reference").evaluate((e: HTMLInputElement) => e.checkValidity())).toBe(true);
  await expect(page.getByRole("button", { name: "Record completed manual handoff" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
