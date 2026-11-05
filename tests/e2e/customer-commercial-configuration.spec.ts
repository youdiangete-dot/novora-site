import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import Module, { createRequire } from "node:module";
import path from "node:path";
import ts from "typescript";
import { getDictionary } from "../../lib/i18n/dictionaries";
const req = createRequire(__filename);
const internals = Module as unknown as { _resolveFilename: (...args: any[]) => string }, original = internals._resolveFilename;
internals._resolveFilename = function (name, ...args) { return name === "server-only" ? req.resolve("next/dist/compiled/server-only/empty.js") : original.call(this, name, ...args); };
const entry = req("../../lib/server/customer-commercial-configuration") as typeof import("../../lib/server/customer-commercial-configuration");
const spec = req("../../lib/server/commercial-specification-confirmation") as typeof import("../../lib/server/commercial-specification-confirmation");
const quote = req("../../lib/server/commercial-quotation") as typeof import("../../lib/server/commercial-quotation");
internals._resolveFilename = original;
const ref = "NOVORA-CB-20261105-CF01", output = "123e4567-e89b-42d3-a456-426614174000";
const env = { NOVORA_COMMERCIAL_CONFIGURATION_ENABLED: "true", NOVORA_INVITATION_TRIAL_RECEIPTS_ENABLED: "false" };
const input = { pieceType: "ring", structure: "solitaire", metalDirection: "18k-ky", sizeDirection: "US 6.5" };
function prepared(confirmed = true, values = input) {
  return { binding: "synthetic-owned-binding", confirmed, items: spec.commercialSpecificationDisplayItems(values).map(item => ({ ...item, value: values[item.key as keyof typeof input] ?? "" })) };
}
const quotation = { quoteReference: "NOVORA-Q-" + "A".repeat(24), issuedAt: "2026-11-05T00:00:00.000Z", quotation: quote.buildCommercialQuotationSnapshot(quote.normalizeCommercialQuotationInput({ currency: "USD", lineItems: [{ description: "TEST quotation", amount: "1.23" }], validUntil: null, note: null })!) };
function dependencies() {
  let preparedCalls = 0, quoteCalls = 0, expectedHash: string | undefined;
  return { value: { environment: env, prepareSpecification: async () => { preparedCalls++; return prepared(); }, readQuotation: async (_reference: unknown, _output: unknown, _deps?: unknown, expected?: string) => { quoteCalls++; expectedHash = expected; return quotation; } }, counts: () => ({ preparedCalls, quoteCalls, expectedHash }) };
}
test("default OFF and invitation trials never read commercial data or credentials", async () => {
  for (const environment of [{}, { ...env, NOVORA_COMMERCIAL_CONFIGURATION_ENABLED: "false" }, { NOVORA_COMMERCIAL_CONFIGURATION_ENABLED: "true" }, { ...env, NOVORA_INVITATION_TRIAL_RECEIPTS_ENABLED: "true" }, { ...env, NOVORA_INVITATION_TRIAL_RECEIPTS_ENABLED: "invalid" }]) {
    const d = dependencies(); expect(await entry.prepareCustomerCommercialConfiguration(ref, output, { ...d.value, environment })).toBeNull(); expect(d.counts().preparedCalls).toBe(0); expect(d.counts().quoteCalls).toBe(0);
  }
});
test("invalid route identity is denied before preparation", async () => {
  for (const [r, o] of [["invalid", output], [ref, "forged"]]) { const d = dependencies(); expect(await entry.prepareCustomerCommercialConfiguration(r, o, d.value)).toBeNull(); expect(d.counts().preparedCalls).toBe(0); }
});
test("a denied real specification authorization never falls through to quote reads", async () => {
  const d = dependencies(); d.value.prepareSpecification = async () => null as any;
  expect(await entry.prepareCustomerCommercialConfiguration(ref, output, d.value)).toBeNull(); expect(d.counts().quoteCalls).toBe(0);
});
test("unconfirmed specifications show only their form, never a quote", async () => {
  const d = dependencies(); d.value.prepareSpecification = async () => prepared(false);
  expect(await entry.prepareCustomerCommercialConfiguration(ref, output, d.value)).toEqual({ specification: prepared(false), quotation: null }); expect(d.counts().quoteCalls).toBe(0);
});
test("confirmed server fields pin the quote read to their canonical specification hash", async () => {
  const d = dependencies(); expect(await entry.prepareCustomerCommercialConfiguration(ref, output, d.value)).toEqual({ specification: prepared(), quotation });
  expect(d.counts()).toEqual({ preparedCalls: 2, quoteCalls: 1, expectedHash: spec.hashCommercialSpecificationSnapshot(spec.buildCommercialSpecificationSnapshot(input)) });
});
test("a specification, output binding or confirmation change during loading hides the whole section", async () => {
  for (const changed of [prepared(true, { ...input, sizeDirection: "US 7" }), { ...prepared(), binding: "new-output-binding" }, prepared(false)]) {
    const d = dependencies(); let calls = 0; d.value.prepareSpecification = async () => ++calls === 1 ? prepared() : changed;
    expect(await entry.prepareCustomerCommercialConfiguration(ref, output, d.value)).toBeNull();
  }
});
test("failed or invalid readback never becomes successful commercial configuration", async () => {
  const d = dependencies(); d.value.readQuotation = async () => { throw Error("TEST private failure"); };
  expect(await entry.prepareCustomerCommercialConfiguration(ref, output, d.value)).toBeNull();
  d.value.prepareSpecification = async () => ({ ...prepared(), items: [] });
  expect(await entry.prepareCustomerCommercialConfiguration(ref, output, d.value)).toBeNull();
});

// Render the actual page composition with bounded server seams; no Next server,
// real cookies/credentials/database or test-only customer authorization is added.
async function pageTree(configuration: unknown, state = "ready") {
  const source = readFileSync("app/design/preview/[public_reference]/page.tsx", "utf8"), mod = { exports: {} as any }; let reads = 0;
  const named = (name: string) => Object.defineProperty(() => null, "name", { value: name });
  const jsx = (type: any, props: any) => ({ type: typeof type === "function" ? type.name : type, props });
  const headers = new Map([["x-novora-preview-ui-trusted-state", state], ["x-novora-preview-ui-trusted-reference", ref], ["x-novora-preview-ui-trusted-output", output]]);
  const load = (id: string): any => {
    if (id === "react/jsx-runtime") return { jsx, jsxs: jsx };
    if (id === "next/link") return named("Link");
    if (id === "next/headers") return { headers: async () => headers };
    if (id.endsWith(".css")) return {};
    if (id === "./resolve-customer-preview") return req("../../app/design/preview/[public_reference]/resolve-customer-preview");
    if (id.endsWith("/customer-commercial-configuration")) return { prepareCustomerCommercialConfiguration: async (r: string, o: string) => { reads++; expect([r, o]).toEqual([ref, output]); return configuration; } };
    if (id.endsWith("/first-preview-customer-access-contract")) return { FIRST_PREVIEW_CUSTOMER_ACCESS_SIGNING_SECRET_ENV: "SYNTHETIC_ONLY" };
    if (id.endsWith("/first-preview-customer-feedback")) return { createFirstPreviewCustomerFeedbackBinding: () => "synthetic-feedback" };
    if (id.endsWith("/first-preview-customer-design-confirmation")) return { createFirstPreviewCustomerDesignConfirmationBinding: () => "synthetic-design" };
    if (id.endsWith("/i18n/request")) return { getRequestI18n: async () => ({ dictionary: getDictionary("en"), locale: "en" }) };
    if (id.endsWith("/i18n/routing")) return { localizePath: (_locale: string, p: string) => p };
    if (["./CommercialSpecificationConfirmation", "./CommercialQuotation", "./FirstPreviewDesignConfirmation", "./FirstPreviewFeedbackForm"].includes(id)) return named(id.slice(2));
    throw Error("Unexpected page dependency " + id);
  };
  new Function("module", "exports", "require", "process", ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText)(mod, mod.exports, load, { env: { NODE_ENV: "test" } });
  const tree = await mod.exports.default({ params: Promise.resolve({ public_reference: ref }) });
  const walk = (v: any): any[] => Array.isArray(v) ? v.flatMap(walk) : v && typeof v === "object" && v.props ? [v, ...walk(v.props.children), ...walk(v.props.quotation)] : [];
  return { nodes: walk(tree), reads };
}
test("actual ready page wires existing form state and quote slot, without a payment component", async () => {
  const r = await pageTree({ specification: prepared(), quotation });
  const form = r.nodes.find(n => n.type === "CommercialSpecificationConfirmation");
  expect(form.props).toMatchObject({ confirmed: true, confirmationBinding: "synthetic-owned-binding", publicReference: ref, refreshOnConfirmed: true });
  expect(form.props.quotation.type).toBe("CommercialQuotation"); expect(r.nodes.some(n => n.type === "CommercialPayment")).toBe(false);
});
test("ready UI test headers cannot unhide a rejected commercial configuration", async () => {
  const r = await pageTree(null); expect(r.reads).toBe(1); expect(r.nodes.some(n => n.type === "CommercialSpecificationConfirmation" || n.type === "CommercialQuotation")).toBe(false);
});
test("pending denied and unavailable pages never invoke the commercial loader", async () => {
  for (const state of ["pending", "denied", "unavailable"]) { const r = await pageTree({ specification: prepared(), quotation }, state); expect(r.reads).toBe(0); expect(r.nodes.some(n => n.type === "CommercialSpecificationConfirmation")).toBe(false); }
});
