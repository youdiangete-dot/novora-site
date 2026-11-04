import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import Module, { createRequire } from "node:module";
import ts from "typescript";
const loader = Module as unknown as { _resolveFilename: (...args: any[]) => string }, original = loader._resolveFilename, req = createRequire(__filename);
loader._resolveFilename = function (name, ...args) { return name === "server-only" ? req.resolve("next/dist/compiled/server-only/empty.js") : original.call(this, name, ...args); };
const delivery = req("../../lib/server/admin-delivery-handoff") as typeof import("../../lib/server/admin-delivery-handoff");
loader._resolveFilename = original;
const React = req("react"), server = req("react-dom/server"), ref = "NOVORA-O-" + "1".repeat(24), other = "NOVORA-O-" + "2".repeat(24);
const order = { orderReference: ref, quoteReference: "NOVORA-Q-" + "3".repeat(24), publicReference: "NOVORA-CB-20261104-DL01", conceptBriefId: "123e4567-e89b-42d3-a456-426614174000", amount: "1.23", currency: "USD", recordedAt: "2026-11-04T01:00:00Z" };
const productionHandoff = { orderReference: ref, decisionReference: "TEST decision", handoffReference: "TEST production", recordedAt: "2026-11-04T03:00:00Z" };
const input = (code = "TEST delivery") => ({ deliveryReference: code, manualConfirmation: true });
const persisted = (code = "TEST delivery") => ({ order_reference: ref, delivery_reference: code, recorded_at: "2026-11-04T04:00:00Z" });
function fixture() {
  let value: unknown = null, reads = 0, writes = 0;
  const d = { readProduction: async () => ({ ok: true as const, order, cadHandoff: { orderReference: ref, handoffReference: "TEST CAD", recordedAt: "2026-11-04T02:00:00Z" }, handoff: productionHandoff }), repository: {
    read: async () => { reads++; return value; }, insert: async (_ref: string, code: string): Promise<"inserted" | "duplicate" | "unknown"> => { writes++; if (value) return "duplicate"; value = persisted(code); return "inserted"; },
  } };
  return { d, set: (v: unknown) => { value = v; }, counts: () => ({ reads, writes }) };
}
test("exact prior handoff chain allows one persisted reference, identical duplicate is idempotent", async () => {
  const f = fixture(); expect(await delivery.recordDeliveryHandoff(ref, input(), f.d)).toBe("recorded"); expect(await delivery.recordDeliveryHandoff(ref, input(), f.d)).toBe("already_recorded"); expect(await delivery.recordDeliveryHandoff(ref, input("TEST other"), f.d)).toBe("conflict"); expect(f.counts().writes).toBe(1);
});
test("missing production, unverified payment chain and wrong order cannot reach delivery records", async () => {
  for (const value of [{ ok: false }, { ok: true, order, handoff: null }, { ok: true, order: { ...order, orderReference: other }, handoff: productionHandoff }, { ok: true, order, handoff: { ...productionHandoff, orderReference: other } }]) { const f = fixture(); f.d.readProduction = async () => value as any; expect(await delivery.recordDeliveryHandoff(ref, input(), f.d)).toBe("unavailable"); expect(f.counts()).toEqual({ reads: 0, writes: 0 }); }
});
test("production record alone or forged Owner/status cannot substitute for explicit manual attestation", async () => {
  for (const value of [{ deliveryReference: "TEST" }, { ...input(), manualConfirmation: false }, { ...input(), owner: true }, { ...input(), status: "delivered" }]) { const f = fixture(); expect(await delivery.recordDeliveryHandoff(ref, value, f.d)).toBe("invalid"); expect(f.counts()).toEqual({ reads: 0, writes: 0 }); }
});
test("invalid references never query or mutate persistence", async () => {
  for (const value of [input(""), input(" TEST"), input("a".repeat(121)), input("TEST\n"), input("<script>"), null, []]) { const f = fixture(); expect(await delivery.recordDeliveryHandoff(ref, value, f.d)).toBe("invalid"); expect(f.counts()).toEqual({ reads: 0, writes: 0 }); }
});
test("concurrent different delivery references have one immutable winner", async () => {
  const f = fixture(), results = await Promise.all(["TEST A", "TEST B"].map(code => delivery.recordDeliveryHandoff(ref, input(code), f.d)));
  expect(results.filter(r => r === "recorded")).toHaveLength(1); expect(results.filter(r => r === "conflict")).toHaveLength(1);
});
test("lost write response reconciles only by readback", async () => {
  const f = fixture(); let calls = 0; f.d.repository.insert = async () => { calls++; f.set(persisted()); throw Error("TEST transport reset"); };
  expect(await delivery.recordDeliveryHandoff(ref, input(), f.d)).toBe("already_recorded"); expect(calls).toBe(1);
});
test("UNKNOWN or acknowledgement without persisted row never retries or reports success", async () => {
  for (const outcome of ["unknown", "duplicate", "inserted"] as const) { const f = fixture(); let calls = 0; f.d.repository.insert = async () => { calls++; return outcome; }; expect(await delivery.recordDeliveryHandoff(ref, input(), f.d)).toBe("unknown"); expect(calls).toBe(1); }
});
test("failed post-write read remains UNKNOWN", async () => {
  const f = fixture(); let count = 0; f.d.repository.read = async () => { if (++count > 1) throw Error("TEST private error"); return null; }; expect(await delivery.recordDeliveryHandoff(ref, input(), f.d)).toBe("unknown"); expect(f.counts().writes).toBe(1);
});
for (const [name, mutate] of Object.entries({ order: (r: any) => r.order_reference = other, date: (r: any) => r.recorded_at = "bad", reference: (r: any) => r.delivery_reference = "" })) test(`malformed persisted ${name} fails closed`, async () => { const f = fixture(), value = persisted(); mutate(value); f.set(value); expect(await delivery.readDeliveryHandoff(ref, f.d)).toEqual({ ok: false }); expect(await delivery.recordDeliveryHandoff(ref, input(), f.d)).toBe("unavailable"); expect(f.counts().writes).toBe(0); });
test("repository inserts only exact reference and order, not status, time, recipient or message", async () => {
  const calls: unknown[] = [], repo = delivery.createDeliveryHandoffRepository({ from: (table: string) => ({ insert: async (body: unknown) => { calls.push([table, body]); return { error: { code: "23505" } }; } }) } as never);
  expect(await repo.insert(ref, "TEST delivery")).toBe("duplicate"); expect(calls).toEqual([["commercial_delivery_handoffs", { order_reference: ref, delivery_reference: "TEST delivery" }]]);
});
function pageModule(cookie: string | undefined, result: unknown, outcome = "recorded") {
  let reads = 0, writes = 0, submitted: unknown; const mod = { exports: {} as any };
  const source = readFileSync("app/admin/orders/[orderReference]/delivery/page.tsx", "utf8") + "\nexports.testAction=saveDeliveryHandoff;";
  new Function("module", "exports", "require", ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText)(mod, mod.exports, (id: string) => {
    if (id === "next/link") return { __esModule: true, default: ({ href, children }: any) => React.createElement("a", { href }, children) };
    if (id === "next/headers") return { cookies: async () => ({ get: () => cookie ? { value: cookie } : undefined }) };
    if (id === "next/navigation") return { redirect: (url: string) => { throw Error("REDIRECT " + url); } };
    if (id.endsWith("/admin-access")) return { ADMIN_ACCESS_COOKIE_NAME: "TEST cookie", isValidAdminAccessCookie: (v: string) => v === "TEST valid" };
    if (id.endsWith("/admin-delivery-handoff")) return { readDeliveryHandoff: async () => { reads++; return result; }, recordDeliveryHandoff: async (_ref: string, values: unknown) => { writes++; submitted = values; return outcome; } };
    if (id.endsWith(".module.css")) return { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) };
    return req(id);
  });
  return { render: async (check?: string) => server.renderToStaticMarkup(await mod.exports.default({ params: Promise.resolve({ orderReference: ref }), searchParams: Promise.resolve({ check }) })), action: mod.exports.testAction, counts: () => ({ reads, writes }), submitted: () => submitted };
}
test("no valid admin session means no delivery read or write", async () => {
  for (const cookie of [undefined, "TEST invalid"]) { const p = pageModule(cookie, {}); await expect(p.render()).rejects.toThrow("REDIRECT /admin/briefs"); await expect(p.action(new FormData())).rejects.toThrow("REDIRECT /admin/briefs"); expect(p.counts()).toEqual({ reads: 0, writes: 0 }); }
});
test("protected action maps explicit checkbox only and UNKNOWN redirects to reconciliation", async () => {
  const p = pageModule("TEST valid", {}, "unknown"), form = new FormData(); form.set("orderReference", ref); form.set("deliveryReference", "TEST delivery"); form.set("manualConfirmation", "confirmed"); form.set("status", "delivered"); form.set("owner", "true");
  await expect(p.action(form)).rejects.toThrow(`/admin/orders/${ref}/delivery?check=required`); expect(p.submitted()).toEqual(input());
  form.delete("manualConfirmation"); await expect(p.action(form)).rejects.toThrow("?check=required"); expect(p.submitted()).toEqual({ ...input(), manualConfirmation: false });
});
test("page renders persisted reference only, with no false shipment or customer receipt claim", async () => {
  const html = await pageModule("TEST valid", { ok: true, order, productionHandoff, handoff: { deliveryReference: "TEST delivery", recordedAt: "2026-11-04T04:00:00Z" } }).render();
  expect(html).toContain("Offline delivery handoff recorded"); expect(html).not.toContain("<form"); expect(html).toContain("not carrier verification, shipment confirmation or proof of customer receipt");
  const pending = await pageModule("TEST valid", { ok: true, order, productionHandoff, handoff: null }).render("required"); expect(pending).not.toContain("Offline delivery handoff recorded"); expect(pending).not.toContain("<form"); expect(pending).toContain("Outcome remains unconfirmed");
});
test("mobile handoff form requires explicit manual check without sending goods or messages", async ({ page }) => {
  const html = await pageModule("TEST valid", { ok: true, order, productionHandoff, handoff: null }).render();
  await page.route("**/*", route => route.abort()); await page.route("http://novora.test/", route => route.fulfill({ contentType: "text/html; charset=utf-8", body: `<html><head><meta charset="utf-8"></head><body>${html}</body></html>` })); await page.setViewportSize({ width: 375, height: 812 }); await page.goto("http://novora.test/");
  await page.getByLabel("Offline delivery handoff reference", { exact: true }).fill("TEST/DELIVERY-1"); expect(await page.locator("form").evaluate((e: HTMLFormElement) => e.checkValidity())).toBe(false); await page.getByRole("checkbox").check(); expect(await page.locator("form").evaluate((e: HTMLFormElement) => e.checkValidity())).toBe(true); await expect(page.getByRole("button", { name: "Record offline delivery handoff" })).toBeVisible(); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
