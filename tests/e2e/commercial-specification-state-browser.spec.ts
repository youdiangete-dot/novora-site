import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { getDictionary } from "../../lib/i18n/dictionaries";
const customerUICopy = getDictionary("en");

// Mount the real client component with installed React, on intercepted HTML.
// No production route is added/unhidden, and no dev server or network is used.
const root = process.cwd();
test.beforeEach(async ({ page }) => { await page.route("**/*", route => route.abort()); });
const modules: Record<string, string> = {};
for (const [id, file] of Object.entries({
  react: "react/cjs/react.development.js",
  "react/jsx-runtime": "react/cjs/react-jsx-runtime.development.js",
  "react-dom": "react-dom/cjs/react-dom.development.js",
  "react-dom/client": "react-dom/cjs/react-dom-client.development.js",
  scheduler: "scheduler/cjs/scheduler.development.js",
})) modules[id] = readFileSync(path.join(root, "node_modules", file), "utf8");
modules.component = ts.transpileModule(readFileSync(path.join(root, "app/design/preview/[public_reference]/CommercialSpecificationConfirmation.tsx"), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;
const bundle = `(() => {
 const sources=${JSON.stringify(modules)},cache={};
 function load(id){if(id==='./preview.module.css')return {};if(id==='../../../../lib/i18n/client')return {useI18n:()=>({locale:'en',dictionary:{commercialSpecification:${JSON.stringify(customerUICopy.commercialSpecification)}}})};
  if(id==='next/navigation')return {useRouter:()=>({refresh:()=>{window.commercialRefreshes=(window.commercialRefreshes||0)+1;}})};
  if(cache[id])return cache[id].exports;if(!Object.hasOwn(sources,id))throw Error('Unexpected test dependency '+id);
  const m={exports:{}};cache[id]=m;new Function('module','exports','require','process',sources[id])(m,m.exports,load,{env:{NODE_ENV:'development'}});return m.exports;}
 const React=load('react'),client=load('react-dom/client'),Component=load('component').default;
 const app=client.createRoot(document.getElementById('root'));
 window.renderSpecification=props=>{const {testQuotation,...value}=props;app.render(React.createElement(Component,{...value,quotation:testQuotation?React.createElement('p',{'data-testid':'test-quotation'},testQuotation):null}));};
})();`;
const reference = "NOVORA-CB-20260811-M411";
function props(confirmed = false, metal = "yellow gold", binding = "synthetic-owned-binding") {
  return { confirmed, confirmationBinding: binding, publicReference: reference, items: [
    { key: "pieceType", label: "Piece type", value: "ring", maxLength: 160, multiline: false, required: true },
    { key: "structure", label: "Structure", value: "solitaire", maxLength: 160, multiline: false, required: true },
    { key: "metalDirection", label: "Metal", value: metal, maxLength: 160, multiline: false, required: false },
  ] };
}
async function mount(page: Page, value = props()) {
  await page.route("http://novora.test/", route => route.fulfill({ contentType: "text/html", body: "<html><body><div id='root'></div></body></html>" }));
  await page.goto("http://novora.test/");
  await page.addScriptTag({ content: bundle });
  await page.evaluate(value => (window as any).renderSpecification(value), value);
  await expect(page.locator("form")).toBeVisible();
}
const submit = (page: Page) => page.getByRole("button", { name: customerUICopy.commercialSpecification.cs009 });
const metal = (page: Page) => page.locator('[name="metalDirection"]');
async function deliverPendingResponse(page: Page, release: () => void) {
  const delivered = page.waitForResponse("**/api/commercial-specification-confirmation/**");
  release();
  await (await delivered).finished();
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

test("editing after confirmation removes success and allows the exact changed state to be confirmed", async ({ page }) => {
  const posted: any[] = [];
  await page.route("**/api/commercial-specification-confirmation/**", route => {
    posted.push(route.request().postDataJSON());
    return route.fulfill({ status: 201, json: { ok: true, alreadyConfirmed: false } });
  });
  await mount(page);
  await submit(page).click();
  await expect(page.getByRole("status")).toHaveText(customerUICopy.commercialSpecification.cs002);
  await metal(page).fill("white gold");
  await expect(page.getByRole("status")).toHaveCount(0);
  await expect(submit(page)).toBeVisible();
  await submit(page).click();
  await expect(page.getByRole("status")).toBeVisible();
  expect(posted.map(x => x.specification.metalDirection)).toEqual(["yellow gold", "white gold"]);
});

test("page reload restores server-provided confirmation, not browser draft storage", async ({ page }) => {
  await mount(page, props(true, "18k_white_gold"));
  await expect(metal(page)).toHaveValue("18k_white_gold");
  await expect(page.getByRole("status")).toBeVisible();
  await metal(page).fill("unconfirmed local edit");
  await expect(page.getByRole("status")).toHaveCount(0);
  await mount(page, props(true, "18k_white_gold"));
  await expect(metal(page)).toHaveValue("18k_white_gold");
  await expect(page.getByRole("status")).toBeVisible();
  expect(await page.evaluate(() => JSON.stringify([Object.entries(localStorage), Object.entries(sessionStorage)]))).toBe("[[],[]]");
});

test("pending writes lock fields; a late response cannot confirm a replacement output", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/commercial-specification-confirmation/**", async route => {
    await gate;
    await route.fulfill({ status: 201, json: { ok: true } });
  });
  await mount(page);
  await submit(page).click();
  await expect(metal(page)).toBeDisabled();
  await page.evaluate(value => (window as any).renderSpecification(value), props(false, "platinum", "synthetic-new-output-binding"));
  await expect(metal(page)).toHaveValue("platinum");
  await deliverPendingResponse(page, release);
  await expect(submit(page)).toBeEnabled();
  await expect(page.getByRole("status")).toHaveCount(0);
});

test("HTTP success without server confirmation cannot display confirmed status", async ({ page }) => {
  await page.route("**/api/commercial-specification-confirmation/**", route => route.fulfill({ json: { ok: false, message: "Synthetic denied confirmation" } }));
  await mount(page);
  await submit(page).click();
  await expect(page.getByRole("alert")).toHaveText("Synthetic denied confirmation");
  await expect(page.getByRole("status")).toHaveCount(0);
});

test("editing hides the persisted quote until fresh server props follow successful confirmation", async ({ page }) => {
  await page.route("**/api/commercial-specification-confirmation/**", route => route.fulfill({ status: 201, json: { ok: true } }));
  await mount(page, { ...props(true), testQuotation: "TEST persisted quote A", refreshOnConfirmed: true } as any);
  await expect(page.getByTestId("test-quotation")).toHaveText("TEST persisted quote A");
  await metal(page).fill("platinum"); await expect(page.getByTestId("test-quotation")).toHaveCount(0);
  await submit(page).click(); await expect(page.getByRole("status")).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as any).commercialRefreshes)).toBe(1);
  await expect(page.getByTestId("test-quotation")).toHaveCount(0);
  await page.evaluate(value => (window as any).renderSpecification(value), { ...props(true, "platinum"), testQuotation: "TEST new basis quote B", refreshOnConfirmed: true });
  await expect(page.getByTestId("test-quotation")).toHaveText("TEST new basis quote B");
});

test("A -> B -> A conflict shows actual B fields without success; matching B can then be confirmed", async ({ page }) => {
  const latest = [...props(true, "platinum").items,
    { key: "sizeDirection", label: "Size", value: "US 7", maxLength: 160, multiline: false, required: false }];
  const posted: any[] = [];
  await page.route("**/api/commercial-specification-confirmation/**", route => {
    posted.push(route.request().postDataJSON());
    return posted.length === 3
      ? route.fulfill({ status: 409, json: { ok: false, reason: "conflict", currentItems: latest } })
      : route.fulfill({ status: posted.length === 4 ? 200 : 201, json: { ok: true, alreadyConfirmed: posted.length === 4 } });
  });
  await mount(page);
  await submit(page).click();
  await expect(page.getByRole("status")).toBeVisible();
  await metal(page).fill("platinum");
  await submit(page).click();
  await expect(page.getByRole("status")).toBeVisible();
  await metal(page).fill("yellow gold");
  await submit(page).click();
  await expect(page.getByRole("alert")).toHaveText(customerUICopy.commercialSpecification.cs010);
  await expect(page.getByRole("status")).toHaveCount(0);
  await expect(metal(page)).toHaveValue("platinum");
  await expect(page.locator('[name="sizeDirection"]')).toHaveValue("US 7");
  await submit(page).click();
  await expect(page.getByRole("status")).toBeVisible();
  expect(posted.map(x => x.specification.metalDirection)).toEqual(["yellow gold", "platinum", "yellow gold", "platinum"]);
  expect(posted[3].specification.sizeDirection).toBe("US 7");
});

test("a late conflict cannot replace the fields of a newly bound output", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/commercial-specification-confirmation/**", async route => {
    await gate;
    await route.fulfill({ status: 409, json: { ok: false, reason: "conflict", currentItems: props(true, "old output white gold").items } });
  });
  await mount(page);
  const sent = page.waitForRequest("**/api/commercial-specification-confirmation/**");
  await submit(page).click();
  await sent;
  await page.evaluate(value => (window as any).renderSpecification(value), props(false, "new output platinum", "synthetic-replacement-binding"));
  await expect(metal(page)).toHaveValue("new output platinum");
  await deliverPendingResponse(page, release);
  await expect(submit(page)).toBeEnabled();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByRole("status")).toHaveCount(0);
  await expect(metal(page)).toHaveValue("new output platinum");
});

test("malformed conflict state is not presented as the latest confirmed values", async ({ page }) => {
  await page.route("**/api/commercial-specification-confirmation/**", route => route.fulfill({ status: 409, json: { ok: false, reason: "conflict", currentItems: [{ key: "customerEmail", value: "foreign@example.com" }] } }));
  await mount(page);
  await submit(page).click();
  await expect(page.getByRole("alert")).toHaveText(customerUICopy.commercialSpecification.cs001);
  await expect(page.getByRole("status")).toHaveCount(0);
  await expect(metal(page)).toHaveValue("yellow gold");
  await expect(page.getByText("foreign@example.com")).toHaveCount(0);
});
