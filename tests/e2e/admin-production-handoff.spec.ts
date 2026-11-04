import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import Module, { createRequire } from "node:module";
import path from "node:path";
import ts from "typescript";
const internals = Module as unknown as { _resolveFilename: (...args: any[]) => string };
const original = internals._resolveFilename;
internals._resolveFilename = function (request, ...args) { return request === "server-only" ? path.join(process.cwd(), "node_modules/next/dist/compiled/server-only/empty.js") : original.call(this, request, ...args); };
const req = createRequire(path.join(process.cwd(), "tests/e2e/admin-production-handoff.spec.ts"));
const production = req("../../lib/server/admin-production-handoff") as typeof import("../../lib/server/admin-production-handoff");
internals._resolveFilename = original;
const React = req("react"), server = req("react-dom/server");
const ref = "NOVORA-O-" + "1".repeat(24), other = "NOVORA-O-" + "2".repeat(24);
const order = { orderReference: ref, quoteReference: "NOVORA-Q-" + "3".repeat(24), publicReference: "NOVORA-CB-20260811-M511", conceptBriefId: "123e4567-e89b-42d3-a456-426614174000", amount: "1.23", currency: "USD", recordedAt: "2026-11-04T01:00:00Z" };
const cadHandoff = { orderReference: ref, handoffReference: "TEST-CAD-1", recordedAt: "2026-11-04T02:00:00Z" };
const input = (code = "TEST-PRODUCTION-1", decision = "TEST-DECISION-1") => ({ handoffReference: code, decisionReference: decision, manualConfirmation: true });
const persisted = (code = "TEST-PRODUCTION-1", decision = "TEST-DECISION-1") => ({ order_reference: ref, handoff_reference: code, manual_decision_reference: decision, recorded_at: "2026-11-04T03:00:00Z" });
function fixture() {
  let row: unknown = null, inserts = 0, reads = 0;
  const d = { readCad: async () => ({ ok: true as const, order, handoff: cadHandoff }), repository: {
    read: async () => { reads++; return row; },
    insert: async (_ref: string, decision: string, code: string): Promise<"inserted" | "duplicate" | "unknown"> => { inserts++; if (row) return "duplicate"; row = persisted(code, decision); return "inserted"; },
  } };
  return { d, set: (value: unknown) => { row = value; }, count: () => ({ inserts, reads }) };
}
test("durable production handoff requires exact prior CAD and paid-order proof", async () => {
  const f = fixture(); expect(await production.recordProductionHandoff(ref, input(), f.d)).toBe("recorded");
  expect(await production.readProductionHandoff(ref, f.d)).toMatchObject({ ok: true, cadHandoff, handoff: { orderReference: ref, decisionReference: "TEST-DECISION-1", handoffReference: "TEST-PRODUCTION-1" } });
});
test("identical references are idempotent, changing either cannot overwrite", async () => {
  const f = fixture(); f.set(persisted());
  expect(await production.recordProductionHandoff(ref, input(), f.d)).toBe("already_recorded");
  expect(await production.recordProductionHandoff(ref, input("TEST-other"), f.d)).toBe("conflict");
  expect(await production.recordProductionHandoff(ref, input("TEST-PRODUCTION-1", "TEST-other-decision"), f.d)).toBe("conflict"); expect(f.count().inserts).toBe(0);
});
test("concurrent references leave one immutable winner", async () => {
  const f = fixture(); const results = await Promise.all(["TEST-A", "TEST-B"].map(code => production.recordProductionHandoff(ref, input(code), f.d)));
  expect(results.filter(r => r === "recorded")).toHaveLength(1); expect(results.filter(r => r === "conflict")).toHaveLength(1);
});
test("missing CAD, wrong order, wrong CAD binding or unverified paid order block production reads and writes", async () => {
  for (const value of [{ ok: false }, { ok: true, order, handoff: null }, { ok: true, order: { ...order, orderReference: other }, handoff: cadHandoff }, { ok: true, order, handoff: { ...cadHandoff, orderReference: other } }]) {
    const f = fixture(); f.d.readCad = async () => value as any;
    expect(await production.recordProductionHandoff(ref, input(), f.d)).toBe("unavailable"); expect(await production.readProductionHandoff(ref, f.d)).toEqual({ ok: false }); expect(f.count()).toEqual({ inserts: 0, reads: 0 });
  }
});
test("CAD record alone, missing manual confirmation or forged Owner DTO cannot authorize production", async () => {
  for (const value of [{ handoffReference: "TEST", decisionReference: "TEST" }, { ...input(), manualConfirmation: false }, { ...input(), manualConfirmation: "true" }, { ...input(), owner: true }]) {
    const f = fixture(); expect(await production.recordProductionHandoff(ref, value, f.d)).toBe("invalid"); expect(f.count()).toEqual({ inserts: 0, reads: 0 });
  }
});
test("invalid references are rejected before persistence", async () => {
  for (const value of [input(""), input(" TEST"), input("a".repeat(121)), input("TEST\n"), input("TEST", ""), input("TEST", "<script>"), null, []]) {
    const f = fixture(); expect(await production.recordProductionHandoff(ref, value, f.d)).toBe("invalid"); expect(f.count()).toEqual({ inserts: 0, reads: 0 });
  }
  expect(await production.recordProductionHandoff("forged", input(), fixture().d)).toBe("invalid");
});
test("lost write response reconciles without another insert", async () => {
  const f = fixture(); let attempts = 0; f.d.repository.insert = async () => { attempts++; f.set(persisted()); throw Error("TEST reset"); };
  expect(await production.recordProductionHandoff(ref, input(), f.d)).toBe("already_recorded"); expect(attempts).toBe(1); expect(f.count().reads).toBe(2);
});
test("UNKNOWN and missing readback cannot report success or retry", async () => {
  for (const outcome of ["unknown", "inserted", "duplicate"] as const) {
    const f = fixture(); let attempts = 0; f.d.repository.insert = async () => { attempts++; return outcome; };
    expect(await production.recordProductionHandoff(ref, input(), f.d)).toBe("unknown"); expect(attempts).toBe(1);
  }
});
test("readback failure preserves UNKNOWN without raw error exposure", async () => {
  const f = fixture(); let calls = 0; f.d.repository.read = async () => { if (++calls > 1) throw Error("TEST private backend details"); return null; };
  expect(await production.recordProductionHandoff(ref, input(), f.d)).toBe("unknown"); expect(f.count().inserts).toBe(1);
});
for (const [name, mutate] of Object.entries({ order: (r: any) => r.order_reference = other, date: (r: any) => r.recorded_at = "bad", decision: (r: any) => r.manual_decision_reference = "", handoff: (r: any) => r.handoff_reference = "<script>" })) {
  test(`invalid persisted ${name} blocks display and mutation`, async () => { const f = fixture(), row = persisted(); mutate(row); f.set(row); expect(await production.readProductionHandoff(ref, f.d)).toEqual({ ok: false }); expect(await production.recordProductionHandoff(ref, input(), f.d)).toBe("unavailable"); expect(f.count().inserts).toBe(0); });
}
test("repository persists only exact order and offline references, not client status/actor/time", async () => {
  const calls: unknown[] = []; const client = { from: (table: string) => ({ insert: async (payload: unknown) => { calls.push([table, payload]); return { error: { code: "23505", message: "TEST private" } }; } }) };
  expect(await production.createProductionHandoffRepository(client as never).insert(ref, "TEST-DECISION-1", "TEST-PRODUCTION-1")).toBe("duplicate");
  expect(calls).toEqual([["commercial_production_handoffs", { order_reference: ref, manual_decision_reference: "TEST-DECISION-1", handoff_reference: "TEST-PRODUCTION-1" }]]);
});
function pageModule(cookie: string | undefined, result: unknown, outcome = "recorded") {
  let reads = 0, writes = 0, submitted: unknown; const mod = { exports: {} as any };
  const source = readFileSync("app/admin/orders/[orderReference]/production/page.tsx", "utf8") + "\nexports.testAction = saveProductionHandoff;";
  new Function("module", "exports", "require", ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText)(mod, mod.exports, (id: string) => {
    if (id === "next/link") return { __esModule: true, default: ({ href, children }: any) => React.createElement("a", { href }, children) };
    if (id === "next/headers") return { cookies: async () => ({ get: () => cookie ? { value: cookie } : undefined }) };
    if (id === "next/navigation") return { redirect: (url: string) => { throw Error("REDIRECT " + url); } };
    if (id.endsWith("/admin-access")) return { ADMIN_ACCESS_COOKIE_NAME: "TEST cookie", isValidAdminAccessCookie: (c: string) => c === "TEST valid" };
    if (id.endsWith("/admin-production-handoff")) return { readProductionHandoff: async () => { reads++; return result; }, recordProductionHandoff: async (_ref: string, values: unknown) => { writes++; submitted = values; return outcome; } };
    if (id.endsWith(".module.css")) return { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) };
    return req(id);
  });
  return { render: async (check?: string) => server.renderToStaticMarkup(await mod.exports.default({ params: Promise.resolve({ orderReference: ref }), searchParams: Promise.resolve({ check }) })), action: mod.exports.testAction, counts: () => ({ reads, writes }), submitted: () => submitted };
}
test("no-cookie or invalid-cookie callers cannot read or mutate production handoff", async () => {
  for (const cookie of [undefined, "TEST invalid"]) { const p = pageModule(cookie, {}); await expect(p.render()).rejects.toThrow("REDIRECT /admin/briefs"); await expect(p.action(new FormData())).rejects.toThrow("REDIRECT /admin/briefs"); expect(p.counts()).toEqual({ reads: 0, writes: 0 }); }
});
test("protected action uses exact form references and explicit checkbox, ignores submitted Owner/status", async () => {
  const p = pageModule("TEST valid", {}, "unknown"), body = new FormData();
  for (const [key, value] of Object.entries({ orderReference: ref, handoffReference: "TEST-PRODUCTION-1", decisionReference: "TEST-DECISION-1", manualConfirmation: "confirmed", owner: "true", status: "production_approved" })) body.set(key, value);
  await expect(p.action(body)).rejects.toThrow(`/admin/orders/${ref}/production?check=required`); expect(p.submitted()).toEqual(input()); expect(p.counts().writes).toBe(1);
  body.delete("manualConfirmation"); await expect(p.action(body)).rejects.toThrow("?check=required"); expect(p.submitted()).toEqual({ ...input(), manualConfirmation: false });
  body.set("orderReference", "forged"); await expect(p.action(body)).rejects.toThrow("REDIRECT /admin/orders"); expect(p.counts().writes).toBe(2);
});
test("unavailable and unconfirmed screens never invent production success", async () => {
  expect(await pageModule("TEST valid", { ok: false }).render()).toContain("Production handoff unavailable");
  const html = await pageModule("TEST valid", { ok: true, order, cadHandoff, handoff: null }).render("required");
  expect(html).not.toContain("Production handoff recorded"); expect(html).not.toContain("<form"); expect(html).toContain("Outcome remains unconfirmed");
});
test("persisted reference is read-only and explicitly does not assert approval or shipment", async () => {
  const html = await pageModule("TEST valid", { ok: true, order, cadHandoff, handoff: { decisionReference: "TEST-DECISION-1", handoffReference: "TEST-PRODUCTION-1", recordedAt: "2026-11-04T03:00:00Z" } }).render();
  expect(html).toContain("Production handoff recorded"); expect(html).not.toContain("<form"); expect(html).toContain("not CAD completion, production approval, manufacturing progress or shipment confirmation");
  expect(html).toContain("TEST-CAD-1"); expect(html).toContain("TEST-DECISION-1"); expect(html).toContain("TEST-PRODUCTION-1");
});
test("mobile form requires separate manual evidence and explicit confirmation", async ({ page }) => {
  const html = await pageModule("TEST valid", { ok: true, order, cadHandoff, handoff: null }).render();
  await page.route("**/*", route => route.abort()); await page.route("http://novora.test/", route => route.fulfill({ contentType: "text/html; charset=utf-8", body: `<html><head><meta charset="utf-8"></head><body>${html}</body></html>` }));
  await page.setViewportSize({ width: 375, height: 812 }); await page.goto("http://novora.test/");
  await page.getByLabel("Offline manual decision reference", { exact: true }).fill("TEST/DECISION-1"); await page.getByLabel("Offline production handoff reference", { exact: true }).fill("TEST/PRODUCTION-1");
  expect(await page.locator("form").evaluate((e: HTMLFormElement) => e.checkValidity())).toBe(false); await page.getByRole("checkbox").check();
  expect(await page.locator("form").evaluate((e: HTMLFormElement) => e.checkValidity())).toBe(true);
  await expect(page.getByRole("button", { name: "Record manual production handoff" })).toBeVisible(); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
