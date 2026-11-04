import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

// Existing repository pattern: actual React and components on intercepted HTML;
// no dev server, live API, credentials or external network.
const root = process.cwd(), modules: Record<string, string> = {};
for (const [id, file] of Object.entries({ react: "react/cjs/react.development.js", "react/jsx-runtime": "react/cjs/react-jsx-runtime.development.js", "react-dom": "react-dom/cjs/react-dom.development.js", "react-dom/client": "react-dom/cjs/react-dom-client.development.js", scheduler: "scheduler/cjs/scheduler.development.js" })) modules[id] = readFileSync(path.join(root, "node_modules", file), "utf8");
for (const [id, file] of Object.entries({ component: "app/account/orders/status/CustomerOrderStatus.tsx", invitation: "components/InvitationAccess.tsx" })) modules[id] = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
const bundle = `(()=>{const sources=${JSON.stringify(modules)},cache={};function load(id){if(id.endsWith('.module.css'))return {__esModule:true,default:{page:'page',list:'list'}};if(id.endsWith('/components/InvitationAccess'))id='invitation';if(cache[id])return cache[id].exports;if(!Object.hasOwn(sources,id))throw Error('Unexpected test dependency '+id);const m={exports:{}};cache[id]=m;new Function('module','exports','require','process',sources[id])(m,m.exports,load,{env:{NODE_ENV:'development'}});return m.exports;}const React=load('react'),client=load('react-dom/client');client.createRoot(document.getElementById('root')).render(React.createElement(load('component').default));})();`;
const ref = "NOVORA-CB-20261104-ST01", nextRef = "NOVORA-CB-20261104-ST02", order = "NOVORA-O-" + "1".repeat(24);
const credential = "SYNTHETIC_A_" + "a".repeat(43);
const response = { state: "ready", publicReference: ref, hasMore: false, orders: [{ orderReference: order, recordedAt: "2026-11-04T01:00:00.000Z", cadHandoffRecordedAt: "2026-11-04T02:00:00.000Z", productionHandoffRecordedAt: "2026-11-04T03:00:00.000Z", deliveryHandoffRecordedAt: "2026-11-04T04:00:00.000Z" }] };
async function mount(page: Page, result: unknown = response, code = 200) {
  await page.route("**/*", route => route.abort());
  await page.route("http://novora.test/", route => route.fulfill({ contentType: "text/html; charset=utf-8", body: `<html><head><meta charset="utf-8"><style>${readFileSync("app/design/my-images/page.module.css", "utf8")}</style></head><body><div id="root"></div></body></html>` }));
  await page.route("**/api/invitation-access", route => route.fulfill({ json: route.request().headers().authorization ? { state: "verified", partition: "a".repeat(64) } : { state: "required" } }));
  await page.route("**/api/customer-commercial-order-status?**", route => route.fulfill({ status: code, json: result }));
  await page.setViewportSize({ width: 375, height: 812 }); await page.goto("http://novora.test/"); await page.addScriptTag({ content: bundle });
  await expect(page.getByLabel("Invitation code")).toBeEnabled();
}
async function authenticate(page: Page) { await page.getByLabel("Invitation code").fill(credential); await page.getByRole("button", { name: "Use invitation" }).click(); await expect(page.getByText("Invitation verified.", { exact: true })).toBeVisible(); }
const read = (page: Page) => page.getByRole("button", { name: "Read my order records" });
test("mobile customer reads only factual handoff records and can recover after closing without storing credentials", async ({ page, context }) => {
  const calls: { method: string; auth?: string; cookie?: string; url: string }[] = [];
  page.on("request", r => { if (r.url().includes("customer-commercial-order-status")) calls.push({ method: r.method(), auth: r.headers().authorization, cookie: r.headers().cookie, url: r.url() }); });
  await mount(page); await expect(read(page)).toBeDisabled(); await authenticate(page); await page.getByLabel("Brief reference", { exact: true }).fill(ref); await read(page).click();
  await expect(page.getByRole("heading", { name: order })).toBeVisible(); await expect(page.getByText("Production handoff recorded:", { exact: false })).toBeVisible();
  await expect(page.getByText("not CAD completion, production approval", { exact: false })).toBeVisible();
  await expect(page.getByText("Offline delivery handoff recorded:", { exact: false })).toBeVisible();
  await expect(page.getByText("customer receipt confirmation", { exact: false })).toBeVisible();
  expect(calls).toHaveLength(1); expect(calls[0].method).toBe("GET"); expect(calls[0].auth).toBe(`Bearer ${credential}`); expect(calls[0].cookie).toBeUndefined(); expect(calls[0].url).not.toContain(credential);
  expect(await page.evaluate(() => JSON.stringify([Object.entries(localStorage), Object.entries(sessionStorage)]))).not.toContain("SYNTHETIC_"); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.close(); const reopened = await context.newPage(); await mount(reopened); await expect(read(reopened)).toBeDisabled(); await expect(reopened.getByRole("heading", { name: order })).toHaveCount(0);
  await authenticate(reopened); await reopened.getByLabel("Brief reference", { exact: true }).fill(ref); await read(reopened).click(); await expect(reopened.getByRole("heading", { name: order })).toBeVisible();
});
test("changing reference or invitation clears records and ignores a late old-owner response", async ({ page }) => {
  await mount(page); await authenticate(page); await page.getByLabel("Brief reference", { exact: true }).fill(ref); await read(page).click(); await expect(page.getByRole("heading", { name: order })).toBeVisible();
  await page.getByLabel("Brief reference", { exact: true }).fill(nextRef); await expect(page.getByRole("heading", { name: order })).toHaveCount(0);
  await page.evaluate(value => { const fetch = window.fetch; (window as any).restoreFetch = () => window.fetch = fetch; window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => String(input).includes("customer-commercial-order-status") ? new Promise<Response>(resolve => { (window as any).releaseStatus = () => resolve(new Response(JSON.stringify(value), { status: 200, headers: { "content-type": "application/json" } })); }) : fetch(input, init)) as typeof window.fetch; }, { ...response, publicReference: nextRef });
  await read(page).click(); await expect(page.getByRole("button", { name: "Reading..." })).toBeVisible();
  await page.getByLabel("Brief reference", { exact: true }).fill(ref); await page.getByLabel("Invitation code").fill("SYNTHETIC_B_" + "b".repeat(43));
  await page.evaluate(() => (window as any).releaseStatus()); await expect(page.getByRole("heading", { name: order })).toHaveCount(0); await expect(read(page)).toBeDisabled();
  await expect(page.getByText("Your verified order records are shown below.", { exact: true })).toHaveCount(0);
});
test("unavailable read is not empty success and is not automatically retried", async ({ page }) => {
  let calls = 0; await mount(page, { state: "unavailable" }, 404); page.on("request", r => { if (r.url().includes("customer-commercial-order-status")) calls++; });
  await authenticate(page); await page.getByLabel("Brief reference", { exact: true }).fill(ref); await read(page).click();
  await expect(page.getByText("Order records are unavailable.", { exact: false })).toBeVisible(); expect(calls).toBe(1); await expect(page.getByRole("heading", { name: order })).toHaveCount(0);
  await expect(page.getByText("No paid order record was found", { exact: false })).toHaveCount(0);
});
