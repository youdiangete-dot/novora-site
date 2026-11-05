import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";
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
const beta = req("../../lib/server/ai-sketch/beta-admission") as typeof import("../../lib/server/ai-sketch/beta-admission");
const receiptAccess = req("../../app/api/concept-briefs/receipt/access/handler") as typeof import("../../app/api/concept-briefs/receipt/access/handler");
const customerView = req("../../lib/server/ai-sketch/first-preview-customer-view") as typeof import("../../lib/server/ai-sketch/first-preview-customer-view");
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
test("default OFF and ordinary invitation trials never read commercial data or credentials", async () => {
  for (const environment of [{}, { ...env, NOVORA_COMMERCIAL_CONFIGURATION_ENABLED: "false" }, { NOVORA_COMMERCIAL_CONFIGURATION_ENABLED: "true" }, { ...env, NOVORA_INVITATION_TRIAL_RECEIPTS_ENABLED: "true" }, { ...env, NOVORA_INVITATION_TRIAL_RECEIPTS_ENABLED: "invalid" }]) {
    const d = dependencies(); expect(await entry.prepareCustomerCommercialConfiguration(ref, output, { ...d.value, environment })).toBeNull(); expect(d.counts().preparedCalls).toBe(0); expect(d.counts().quoteCalls).toBe(0);
  }
});

const invitation = "a".repeat(43), otherInvitation = "b".repeat(43);
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const isolatedEnv = {
  NOVORA_COMMERCIAL_CONFIGURATION_ENABLED: "true",
  NOVORA_COMMERCIAL_CONFIGURATION_CONTEXT: "isolated_invitation_acceptance_v1",
  NOVORA_INVITATION_TRIAL_RECEIPTS_ENABLED: "true",
  NOVORA_INVITATION_TRIAL_RECEIPT_NAMESPACE: "synthetic_m4_commercial_acceptance",
  NOVORA_BETA_ADMISSION_ENABLED: "true", NOVORA_INSTANT_PREVIEW_AGENT_ENABLED: "true",
  NOVORA_FIRST_PREVIEW_QUEUE_EXECUTION_CONFIRMED: "false",
  NOVORA_INVITATION_TRIAL_SPENDING_MODE: "disabled",
  NOVORA_TEST_IMAGE_PACKAGES_ENABLED: "false", NOVORA_PAYPAL_SANDBOX_ENABLED: "false",
  NOVORA_BETA_INVITATIONS_JSON: JSON.stringify([
    { identity: "synthetic_m4_owner", credentialSha256: digest(invitation) },
    { identity: "synthetic_m4_other", credentialSha256: digest(otherInvitation) },
  ]),
  NEXT_PUBLIC_SUPABASE_URL: "https://dibpksbbzjczpjusujwk.supabase.co",
  NODE_ENV: "production", NEXT_RUNTIME: "nodejs", VERCEL: "1", VERCEL_ENV: "preview", VERCEL_TARGET_ENV: "preview",
  VERCEL_PROJECT_ID: "prj_H9Di3TIvXiZJHO06WwoaW8RqFfVg",
  VERCEL_GIT_COMMIT_REF: "integration/instant-first-preview-agent",
  VERCEL_GIT_COMMIT_SHA: "1".repeat(40), VERCEL_DEPLOYMENT_ID: "dpl_SyntheticCommercialAcceptance123",
};
const receiptRequest = (credential = invitation, requestId = "1".repeat(32), origin = "https://synthetic.example.invalid") => new Request("https://synthetic.example.invalid/api/concept-briefs/receipt/access", {
  method: "POST", headers: { Authorization: `Bearer ${credential}`, Origin: origin }, body: JSON.stringify({ clientRequestId: requestId }),
});

test("only explicit isolated non-generating context can coexist with stable trial receipts", async () => {
  const d = dependencies();
  expect(await entry.prepareCustomerCommercialConfiguration(ref, output, { ...d.value, environment: isolatedEnv })).not.toBeNull();
  expect(d.counts().quoteCalls).toBe(1);
  const { NOVORA_COMMERCIAL_CONFIGURATION_CONTEXT: _context, ...ordinaryTrial } = isolatedEnv;
  const baselineOwner = beta.authenticateScopedReceiptRequest(receiptRequest(), ordinaryTrial);
  expect(baselineOwner?.identity).toBe("synthetic_m4_owner");
  expect(beta.authenticateScopedReceiptRequest(receiptRequest(), isolatedEnv)).toEqual(baselineOwner);
  expect(beta.authenticateScopedReceiptRequest(receiptRequest(), { ...isolatedEnv, VERCEL_DEPLOYMENT_ID: "dpl_SyntheticReplacementAcceptance456", VERCEL_GIT_COMMIT_SHA: "2".repeat(40) })).toEqual(baselineOwner);
  const hidden = dependencies();
  expect(await entry.prepareCustomerCommercialConfiguration(ref, output, { ...hidden.value, environment: ordinaryTrial })).toBeNull();
  expect(hidden.counts().preparedCalls).toBe(0);
});

test("isolated context rejects incomplete, cross-environment and spending-capable configurations before reading data", async () => {
  const changes: Record<string, string | undefined>[] = [
    { NOVORA_COMMERCIAL_CONFIGURATION_ENABLED: undefined }, { NOVORA_COMMERCIAL_CONFIGURATION_ENABLED: "false" },
    { NOVORA_COMMERCIAL_CONFIGURATION_CONTEXT: "unknown" }, { NODE_ENV: "development" }, { NEXT_RUNTIME: "edge" }, { NEXT_PHASE: "phase-production-build" },
    { VERCEL: undefined }, { VERCEL_ENV: "production" }, { VERCEL_TARGET_ENV: "production" },
    { VERCEL_PROJECT_ID: "unrelated" }, { VERCEL_GIT_COMMIT_REF: "main" }, { VERCEL_GIT_COMMIT_SHA: "invalid" }, { VERCEL_DEPLOYMENT_ID: "invalid" },
    { NEXT_PUBLIC_SUPABASE_URL: "https://other.example.invalid" }, { NOVORA_INVITATION_TRIAL_RECEIPTS_ENABLED: "false" },
    { NOVORA_INVITATION_TRIAL_RECEIPT_NAMESPACE: "short" }, { NOVORA_BETA_ADMISSION_ENABLED: "false" }, { NOVORA_INSTANT_PREVIEW_AGENT_ENABLED: "false" },
    { NOVORA_FIRST_PREVIEW_QUEUE_EXECUTION_CONFIRMED: "true" }, { NOVORA_FIRST_PREVIEW_QUEUE_EXECUTION_CONFIRMED: undefined },
    { NOVORA_INVITATION_TRIAL_SPENDING_MODE: "owner_expected_cost_seven_day_trial_025_v1" }, { NOVORA_INVITATION_TRIAL_SPENDING_MODE: undefined },
    { NOVORA_TEST_IMAGE_PACKAGES_ENABLED: "true" }, { NOVORA_PAYPAL_SANDBOX_ENABLED: "true" },
  ];
  for (const change of changes) {
    const d = dependencies();
    expect(await entry.prepareCustomerCommercialConfiguration(ref, output, { ...d.value, environment: { ...isolatedEnv, ...change } }), JSON.stringify(change)).toBeNull();
    expect(d.counts().preparedCalls).toBe(0); expect(d.counts().quoteCalls).toBe(0);
  }
  const legacy = dependencies();
  expect(await entry.prepareCustomerCommercialConfiguration(ref, output, { ...legacy.value, environment: { ...env, NOVORA_COMMERCIAL_CONFIGURATION_CONTEXT: "unknown" } })).toBeNull();
});

test("same durable owned receipt renews the real signed cookie and prepares the real commercial form without rebind or writes", async () => {
  const briefId = "223e4567-e89b-42d3-a456-426614174000", requestId = "1".repeat(32), now = 2_000_000_000;
  const signingSecret = "synthetic_m4_owned_receipt_signing_secret";
  const originalOwner = beta.authenticateScopedReceiptRequest(receiptRequest(), { ...isolatedEnv, NOVORA_COMMERCIAL_CONFIGURATION_CONTEXT: undefined })!;
  const stored = { ...originalOwner, requestId, briefId, reference: ref };
  let receiptReads = 0, writes = 0, quoteReads = 0;
  const handler = (environment = isolatedEnv) => receiptAccess.createReceiptAccessPostHandler({
    authenticate: request => beta.authenticateScopedReceiptRequest(request, environment),
    read: async (owner, id) => { receiptReads++; return owner.identity === stored.identity && owner.scope === stored.scope && id === stored.requestId
      ? { briefId: stored.briefId, reference: stored.reference, stage: "published", reason: "enqueued" } : null; },
    session: { featureFlagValue: "true", signingSecret, clock: () => now, nonceSource: () => "synthetic_nonce_m4_acceptance" },
  });
  const response = await handler()(receiptRequest());
  expect(response.status).toBe(200);
  const cookie = response.cookies.get("__Host-novora_first_preview_access")!;
  expect(cookie).toBeTruthy(); expect(response.headers.get("set-cookie")).toMatch(/HttpOnly/i);
  const prepare = (accessProof: string) => (reference: string, exactOutput: string) => spec.prepareCommercialSpecificationConfirmation(reference, exactOutput, {
    signingSecret,
    readCustomerView: request => customerView.readFirstPreviewCustomerView({ ...request, accessProof }, {
      clock: () => now + 1, signingSecret,
      stateSource: { readExactCustomerPreviewState: lookup => ({ state: "ready", conceptBriefId: lookup.conceptBriefId, publicReference: lookup.publicReference,
        outputId: output, authorizationEligible: true, isCurrentCustomerPreview: true, readinessRevokedAt: null, readinessStatus: "first_preview_ready" }) },
    }),
    repository: {
      resolveExactCurrentAuthority: async (reference, exactOutput) => reference === stored.reference && exactOutput === output
        ? { conceptBriefId: stored.briefId, outputId: output, briefPayload: { brief: input } } : null,
      hasExactDesignDirectionConfirmation: async () => true,
      readLatestExactConfirmation: async () => input,
      insertExactConfirmation: async () => { writes++; return "unavailable"; },
    },
  });
  const readQuotation = async () => { quoteReads++; return quotation; };
  expect(await entry.prepareCustomerCommercialConfiguration(ref, output, { environment: isolatedEnv, prepareSpecification: prepare(cookie.value), readQuotation })).toMatchObject({ specification: { confirmed: true }, quotation });
  expect(quoteReads).toBe(1);
  for (const accessProof of ["", cookie.value + "corrupt"]) {
    expect(await entry.prepareCustomerCommercialConfiguration(ref, output, { environment: isolatedEnv, prepareSpecification: prepare(accessProof), readQuotation })).toBeNull();
  }
  expect(quoteReads).toBe(1);
  for (const request of [receiptRequest(otherInvitation), receiptRequest("wrong"), receiptRequest(invitation, "2".repeat(32)), receiptRequest(invitation, requestId, "https://other.example.invalid")]) {
    const denied = await handler()(request); expect(denied.status).toBe(404); expect(denied.cookies.get("__Host-novora_first_preview_access")).toBeUndefined();
  }
  expect((await handler({ ...isolatedEnv, NOVORA_INVITATION_TRIAL_RECEIPT_NAMESPACE: "synthetic_other_receipt_namespace" })(receiptRequest())).status).toBe(404);
  expect((await handler({ ...isolatedEnv, NOVORA_BETA_INVITATIONS_JSON: "[]" })(receiptRequest())).status).toBe(404);
  expect(receiptReads).toBeGreaterThan(0); expect(writes).toBe(0);
  expect(stored).toEqual({ ...originalOwner, requestId, briefId, reference: ref });
});

test("the display context creates no spending authority and cannot reserve or dispatch work", async () => {
  const work = { briefId: "223e4567-e89b-42d3-a456-426614174000", fingerprint: "synthetic_fingerprint", request: receiptRequest() };
  expect(beta.resolveBetaAdmissionBinding(isolatedEnv)).toBeNull();
  expect(beta.createRedisBetaAdmissionLedger(isolatedEnv)).toBeNull();
  expect(await beta.reserveBetaAdmission(work, { environment: isolatedEnv })).toBe("denied");
  expect(await beta.claimBetaDispatch({ ...work, betaAdmission: true }, { environment: isolatedEnv })).toBe(false);
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
