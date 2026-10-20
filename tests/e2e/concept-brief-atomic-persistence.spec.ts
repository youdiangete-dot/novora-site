import { expect, test } from "@playwright/test";
import Module, { createRequire } from "node:module";
import path from "node:path";
import type { PersistInitiationInput } from "../../lib/server/ai-sketch/first-preview-initiation-contract";

// Import the real persistence module with only its client factory/server-only
// marker replaced. No env reads, HTTP requests, database, or dev server needed.
const testRequire = createRequire(path.join(process.cwd(), "tests/e2e/concept-brief-atomic-persistence.spec.ts"));
const modulePath = testRequire.resolve("../../lib/server/concept-brief-persistence");
const internals = Module as unknown as {
  _load: (request: string, parent?: { filename?: string }, ...args: unknown[]) => unknown;
};
const originalLoad = internals._load;
let legacyClient: unknown = null;
let factoryCalls = 0;
let persistence: typeof import("../../lib/server/concept-brief-persistence");
let route: typeof import("../../app/api/concept-briefs/route");
// Each focused file must receive its own fake client factory even when the
// existing runner reuses a worker that already loaded the route.
delete testRequire.cache[modulePath];
delete testRequire.cache[testRequire.resolve("../../app/api/concept-briefs/route")];
try {
  internals._load = function (request, parent, ...args) {
    if (request === "server-only") return {};
    if (request === "./supabase" && parent?.filename === modulePath) {
      return { createSupabaseAdminClientOrNull: () => { factoryCalls++; return legacyClient; } };
    }
    return originalLoad.call(this, request, parent, ...args);
  };
  persistence = testRequire(modulePath);
  route = testRequire("../../app/api/concept-briefs/route");
} finally {
  internals._load = originalLoad;
}

const BRIEF_ID = "123e4567-e89b-42d3-a456-426614174000";
const OTHER_ID = "223e4567-e89b-42d3-a456-426614174000";
const REFERENCE = "NOVORA-CB-20261016-TEST";
const VERSION = "novora_first_preview_initiation_v1";
const PRIVATE_SENTINEL = "synthetic-private-data-must-stay-private";

function input(): PersistInitiationInput {
  return {
    p_concept_brief_id: BRIEF_ID,
    p_public_reference: REFERENCE,
    p_brief: {
      piece_type: "ring", branch: null, structure: "ring_center_stone", sub_structure: null,
      design_objective: null, ai_sketch_instruction: null,
      brief_payload: { pieceType: "ring" }, summary_items: null,
      api_submission: { submitted_at: "2026-10-16T00:00:00.000Z", public_reference: REFERENCE },
    },
    p_contact: {
      customer_name: "Synthetic Local Test", customer_email: "synthetic@example.invalid",
      phone_whatsapp: null, country_region: null, contact_note: PRIVATE_SENTINEL,
    },
    // Synthetic shape only. It does not prove real admission or customer access.
    p_admission_context: {
      version: VERSION, ip_key: `rl:v1:concept-briefs:ip:${"a".repeat(48)}`,
      email_key: `rl:v1:concept-briefs:email:${"b".repeat(48)}`,
      key_version: "synthetic-v1", rate_policy_version: "synthetic-v1",
      access_binding: { concept_brief_id: BRIEF_ID, public_reference: REFERENCE,
        proof_version: "synthetic-v1", binding_digest: "c".repeat(64) },
    },
  };
}

function receipt(overrides: Record<string, unknown> = {}) {
  return { ok: true, value: {
    persisted: true, concept_brief_id: BRIEF_ID, public_reference: REFERENCE,
    intent_version: VERSION, intent_state: "pending", intent_created: true, ...overrides,
  } };
}

function heldReceipt(overrides: Record<string, unknown> = {}) {
  return receipt({ intent_state: "operator_hold", ...overrides });
}

type RpcClient = NonNullable<Parameters<typeof persistence.persistConceptBriefSubmissionWithPreviewIntent>[1]>;
function rpcHarness(result: { data: unknown; error: unknown } | (() => Promise<unknown>)) {
  const calls: { name: string; args: unknown }[] = [];
  let splitCalls = 0;
  const client = {
    rpc: async (name: string, args: unknown) => {
      calls.push({ name, args });
      return typeof result === "function" ? result() : result;
    },
    from: () => { splitCalls++; throw new Error("Split writes are forbidden here"); },
  } as unknown as RpcClient;
  return { client, calls, splitCalls: () => splitCalls };
}

let logs: unknown[][];
let originalError: typeof console.error;
let originalFetch: typeof fetch;
let externalCalls = 0;
test.beforeEach(() => {
  legacyClient = null;
  factoryCalls = 0;
  logs = [];
  originalError = console.error;
  console.error = (...args) => { logs.push(args); };
  externalCalls = 0;
  originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { externalCalls++; throw new Error("Unexpected external request"); };
});
test.afterEach(() => { console.error = originalError; globalThis.fetch = originalFetch; });

test("sends exactly the candidate's five RPC inputs and projects only the bound committed receipt", async () => {
  const request = input();
  const harness = rpcHarness({ data: receipt({ private_context: PRIVATE_SENTINEL }), error: null });
  expect(await persistence.persistConceptBriefSubmissionWithPreviewIntent(request, harness.client)).toEqual({
    persisted: true, conceptBriefId: BRIEF_ID, publicReference: REFERENCE,
    atomicIntent: { state: "pending", created: true },
  });
  expect(harness.calls).toEqual([{
    name: "novora_persist_concept_brief_with_preview_intent", args: request,
  }]);
  expect(harness.splitCalls()).toBe(0);
  expect(factoryCalls).toBe(0);
  expect(logs).toEqual([]);
});

test("requires an explicitly supplied RPC client and does not create one from env", async () => {
  expect(await persistence.persistConceptBriefSubmissionWithPreviewIntent(input(), null)).toMatchObject({ persisted: false });
  expect(factoryCalls).toBe(0);
});

test("explicit NULL context persists only a held receipt without accepting response authority", async () => {
  const request = { ...input(), p_admission_context: null };
  const harness = rpcHarness({ data: heldReceipt(), error: null });
  expect(await persistence.persistConceptBriefSubmissionWithPreviewIntent(request, harness.client)).toEqual({
    persisted: true, conceptBriefId: BRIEF_ID, publicReference: REFERENCE, firstPreviewInitiation: "operator_hold",
    atomicIntent: { state: "operator_hold", created: true },
  });
  expect(harness.calls).toEqual([{
    name: "novora_persist_concept_brief_with_preview_intent", args: request,
  }]);
  expect(harness.splitCalls()).toBe(0);
  expect(factoryCalls).toBe(0);
  expect(externalCalls).toBe(0);
});

test("captures NULL context before awaiting so input mutation cannot upgrade a held receipt", async () => {
  const request = input();
  request.p_admission_context = null;
  const harness = rpcHarness(async () => {
    request.p_admission_context = input().p_admission_context;
    return { data: heldReceipt(), error: null };
  });
  expect(await persistence.persistConceptBriefSubmissionWithPreviewIntent(request, harness.client))
    .toMatchObject({ persisted: true, firstPreviewInitiation: "operator_hold" });
  expect(harness.calls[0].args).toHaveProperty("p_admission_context", null);
});

for (const [label, context] of [
  ["missing", undefined], ["client boolean", true], ["empty", {}],
  ["wrong Brief", { ...(input().p_admission_context as object), access_binding: {
    concept_brief_id: OTHER_ID, public_reference: REFERENCE, proof_version: "synthetic-v1", binding_digest: "c".repeat(64),
  } }],
  ["wrong reference", { ...(input().p_admission_context as object), access_binding: {
    concept_brief_id: BRIEF_ID, public_reference: "NOVORA-CB-20261016-ELSE", proof_version: "synthetic-v1", binding_digest: "c".repeat(64),
  } }],
] as const) {
  test(`stays inactive with ${label} admission context and never falls back`, async () => {
    const harness = rpcHarness({ data: receipt(), error: null });
    const result = await persistence.persistConceptBriefSubmissionWithPreviewIntent({ ...input(), p_admission_context: context }, harness.client);
    expect(result).toMatchObject({ persisted: false });
    expect(result).not.toHaveProperty("conceptBriefId");
    expect(result).not.toHaveProperty("publicReference");
    expect(harness.calls).toEqual([]);
    expect(harness.splitCalls()).toBe(0);
    expect(factoryCalls).toBe(0);
  });
}

for (const code of ["invalid_input", "identity_conflict", "repository_unavailable"]) {
  test(`preserves ${code} RPC failure without split writes, cleanup or retry`, async () => {
    const harness = rpcHarness({ data: { ok: false, code, details: PRIVATE_SENTINEL }, error: null });
    const result = await persistence.persistConceptBriefSubmissionWithPreviewIntent(input(), harness.client);
    expect(result).toMatchObject({ persisted: false });
    expect(harness.calls).toHaveLength(1);
    expect(harness.splitCalls()).toBe(0);
    expect(factoryCalls).toBe(0);
    expect(JSON.stringify({ result, logs })).not.toContain(PRIVATE_SENTINEL);
  });
}

for (const [label, data] of [
  ["null", null], ["array", [receipt()]], ["unwrapped", receipt().value],
  ["false ok", { ...receipt(), ok: false }], ["missing value", { ok: true }],
  ["false persisted", receipt({ persisted: false })], ["missing persisted", receipt({ persisted: undefined })],
  ["other Brief", receipt({ concept_brief_id: OTHER_ID })],
  ["other reference", receipt({ public_reference: "NOVORA-CB-20261016-ELSE" })],
  ["missing reference", receipt({ public_reference: undefined })],
  ["other version", receipt({ intent_version: "unrecognized" })],
  ["missing version", receipt({ intent_version: undefined })],
] as const) {
  test(`rejects ${label} receipt without false customer success or fallback`, async () => {
    const harness = rpcHarness({ data, error: null });
    const result = await persistence.persistConceptBriefSubmissionWithPreviewIntent(input(), harness.client);
    expect(result).toMatchObject({ persisted: false });
    expect(result).not.toHaveProperty("publicReference");
    expect(result).not.toHaveProperty("conceptBriefId");
    expect(harness.calls).toHaveLength(1);
    expect(harness.splitCalls()).toBe(0);
    expect(factoryCalls).toBe(0);
  });
}

test("handles unavailable RPC, transport error and thrown uncertainty without retry or legacy fallback", async () => {
  for (const response of [
    { data: null, error: { code: "PGRST202", message: PRIVATE_SENTINEL } },
    { data: receipt(), error: { code: "42501", details: PRIVATE_SENTINEL } },
    async () => { throw new Error(PRIVATE_SENTINEL); },
  ]) {
    const harness = rpcHarness(response);
    const result = await persistence.persistConceptBriefSubmissionWithPreviewIntent(input(), harness.client);
    expect(result).toMatchObject({ persisted: false });
    expect(harness.calls).toHaveLength(1);
    expect(harness.splitCalls()).toBe(0);
    expect(JSON.stringify({ result, logs })).not.toContain(PRIVATE_SENTINEL);
  }
  expect(factoryCalls).toBe(0);
});

test("captures the requested identity before an asynchronous result", async () => {
  const request = input();
  const harness = rpcHarness(async () => {
    request.p_concept_brief_id = OTHER_ID;
    return { data: receipt({ concept_brief_id: OTHER_ID }), error: null };
  });
  expect(await persistence.persistConceptBriefSubmissionWithPreviewIntent(request, harness.client)).toMatchObject({ persisted: false });
  expect(harness.calls).toHaveLength(1);
});

function legacyHarness(options: { contactError?: boolean; malformedReceipt?: boolean } = {}) {
  const calls: { table: string; action: string; payload?: unknown }[] = [];
  let publicReference: string;
  legacyClient = {
    rpc: () => { throw new Error("Legacy intake must not call the candidate RPC"); },
    from: (table: string) => ({
      insert: (payload: Record<string, unknown>) => {
        calls.push({ table, action: "insert", payload });
        if (table === "concept_brief_contacts") {
          return Promise.resolve({ error: options.contactError ? { code: "23502" } : null });
        }
        publicReference = payload.public_reference as string;
        return { select: () => ({ single: async () => ({
          data: { id: BRIEF_ID, public_reference: options.malformedReceipt ? "invalid" : publicReference }, error: null,
        }) }) };
      },
      delete: () => ({ eq: async (_column: string, id: string) => {
        calls.push({ table, action: "delete", payload: id }); return { error: null };
      } }),
    }),
  };
  return { calls, reference: () => publicReference };
}

test("current intake still uses legacy writes and the same normalized contact/Brief mapping", async () => {
  const harness = legacyHarness();
  const payload = {
    contact: { customerName: " Synthetic Local Test ", customerEmail: " synthetic@example.invalid ",
      customerPhone: " synthetic phone ", customerCountry: " synthetic region ", contactNote: " synthetic note " },
    conceptBrief: { pieceType: "ring", structure: "ring_center_stone", emotionalStory: " synthetic direction " },
    summaryItems: [{ label: "Piece", value: "Ring" }],
  };
  expect(await persistence.persistConceptBriefSubmission(payload)).toEqual({
    persisted: true, conceptBriefId: BRIEF_ID, publicReference: harness.reference(),
  });
  expect(harness.reference()).toMatch(/^NOVORA-CB-\d{8}-[A-Z0-9]{4}$/);
  expect(harness.calls).toHaveLength(2);
  expect(harness.calls[0]).toMatchObject({ table: "concept_briefs", action: "insert", payload: {
    public_reference: harness.reference(), source: "api", status: "new", piece_type: "ring",
    structure: "ring_center_stone", design_objective: "synthetic direction", brief_payload: payload,
    summary_items: payload.summaryItems, api_submission: { payload, public_reference: harness.reference() },
  } });
  expect(harness.calls[1]).toEqual({ table: "concept_brief_contacts", action: "insert", payload: {
    concept_brief_id: BRIEF_ID, customer_name: "Synthetic Local Test", customer_email: "synthetic@example.invalid",
    phone_whatsapp: "synthetic phone", country_region: "synthetic region", contact_note: "synthetic note",
  } });
});

test("current intake preserves configuration failure and existing contact/receipt failure cleanup", async () => {
  expect(await persistence.persistConceptBriefSubmission({})).toEqual({
    persisted: false,
    message: "Concept Brief persistence is temporarily unavailable due to server configuration.",
  });
  for (const options of [{ contactError: true }, { malformedReceipt: true }]) {
    const harness = legacyHarness(options);
    expect(await persistence.persistConceptBriefSubmission({ customerName: "Synthetic", customerEmail: "synthetic@example.invalid", pieceType: "ring" }))
      .toMatchObject({ persisted: false });
    expect(harness.calls.at(-1)).toEqual({ table: "concept_briefs", action: "delete", payload: BRIEF_ID });
  }
});

function routePayload() {
  return { customerName: "Synthetic Local Test", customerEmail: "synthetic@example.invalid",
    conceptBrief: { pieceType: "ring", structure: "ring_center_stone" } };
}

function postRequest(payload: unknown = routePayload()) {
  return new Request("http://localhost/api/concept-briefs", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
  });
}

const enforcedLimiter = { allowed: true, mode: "enforced", reason: "within_limit" } as const;
function routeSession(enabled = true) {
  return { featureFlagValue: enabled ? "true" : "false",
    signingSecret: "synthetic-operator-hold-test-secret-000000000000000000",
    clock: () => 1_785_715_200, nonceSource: () => "synthetic_hold_nonce_abcdefghijklmnop" };
}

function atomicRouteHarness(
  rpcResult: Parameters<typeof rpcHarness>[0],
  options: { session?: boolean; limiterVerified?: boolean; contextMissing?: boolean; nonNullContext?: boolean } = {},
) {
  const harness = rpcHarness(rpcResult);
  const submitted = input();
  submitted.p_admission_context = options.contextMissing ? undefined
    : options.nonNullContext ? submitted.p_admission_context : null;
  submitted.p_brief.brief_payload = routePayload();
  let persistenceCalls = 0, triggerCalls = 0, queueCalls = 0;
  const post = route.createConceptBriefPostHandler({
    checkRateLimit: async () => options.limiterVerified === false
      ? { allowed: true, mode: "disabled", reason: "provider_env_missing" }
      : enforcedLimiter,
    // Existing trusted server-only seam; no client field selects this adapter.
    persistSubmission: () => {
      persistenceCalls++;
      return persistence.persistConceptBriefSubmissionWithPreviewIntent(submitted, harness.client);
    },
    sessionDependencies: routeSession(options.session !== false),
    triggerAutomaticPreview: async () => {
      triggerCalls++;
      throw new Error("Held or failed intake must not reach generation");
    },
    triggerDependencies: {
      featureFlagValue: "true", queueExecutionCapabilityValue: "true",
      publisher: { async publish() { queueCalls++; } },
    },
    logAutomaticPreviewDiagnostic: () => {},
  });
  return { ...harness, post, counts: () => ({ persistenceCalls, triggerCalls, queueCalls }) };
}

for (const session of [true, false]) {
  for (const limiterVerified of [true, false]) {
    test(`actual route accepts atomic operator_hold with session=${session}, limiter=${limiterVerified} without generation`, async () => {
      const harness = atomicRouteHarness({ data: heldReceipt(), error: null }, { session, limiterVerified });
      const response = await harness.post(postRequest({ ...routePayload(),
        firstPreviewInitiation: "pending", p_admission_context: input().p_admission_context,
        customerAccessProofEstablished: true, generationAuthorized: true,
      }));
      const body = await response.json();
      expect(response.status).toBe(201);
      const expected = route.createPersistedConceptBriefResponse({
        persisted: true, conceptBriefId: BRIEF_ID, publicReference: REFERENCE,
      }, routeSession(session));
      expect(body).toEqual(await expected.json());
      // An atomic receipt without retained pre-commit proof cannot mint a cookie.
      expect(response.headers.get("set-cookie")).toBeNull();
      expect(body).not.toHaveProperty("firstPreviewInitiation");
      expect(body).not.toHaveProperty("p_admission_context");
      expect(JSON.stringify(body)).not.toMatch(/pending|first_preview_ready/);
      expect(harness.calls).toHaveLength(1);
      expect(harness.calls[0].args).toHaveProperty("p_admission_context", null);
      expect(harness.counts()).toEqual({ persistenceCalls: 1, triggerCalls: 0, queueCalls: 0 });
      expect(harness.splitCalls()).toBe(0);
      expect(factoryCalls).toBe(0);
      expect(externalCalls).toBe(0);
    });
  }
}

for (const [label, result] of [
  ["SQL failure", { data: { ok: false, code: "identity_conflict" }, error: null }],
  ["unavailable RPC", { data: null, error: { code: "PGRST202", message: PRIVATE_SENTINEL } }],
  ["thrown transport", async () => { throw new Error(PRIVATE_SENTINEL); }],
  ["malformed receipt", { data: { ok: true }, error: null }],
  ["other Brief", { data: receipt({ concept_brief_id: OTHER_ID }), error: null }],
  ["other reference", { data: receipt({ public_reference: "NOVORA-CB-20261016-ELSE" }), error: null }],
  ["other intent version", { data: receipt({ intent_version: "unknown" }), error: null }],
] as const) {
  test(`actual route preserves not-persisted truth for ${label} without legacy fallback or cleanup`, async () => {
    const harness = atomicRouteHarness(result);
    const response = await harness.post(postRequest());
    const body = await response.json();
    expect(response.status).toBe(202);
    expect(body).toMatchObject({ persisted: false });
    expect(body).not.toHaveProperty("conceptBriefId");
    expect(body).not.toHaveProperty("publicReference");
    expect(body).not.toHaveProperty("firstPreviewInitiation");
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(harness.calls).toHaveLength(1);
    expect(harness.splitCalls()).toBe(0);
    expect(harness.counts()).toEqual({ persistenceCalls: 1, triggerCalls: 0, queueCalls: 0 });
    expect(factoryCalls).toBe(0);
    expect(externalCalls).toBe(0);
    expect(JSON.stringify({ body, logs })).not.toContain(PRIVATE_SENTINEL);
  });
}

test("actual route cannot convert omitted context or client assertions into generation authority", async () => {
  const harness = atomicRouteHarness({ data: receipt(), error: null }, { contextMissing: true });
  const response = await harness.post(postRequest({ ...routePayload(),
    firstPreviewInitiation: "pending", p_admission_context: input().p_admission_context,
    customerAccessProofEstablished: true, generationAuthorized: true,
  }));
  expect(response.status).toBe(202);
  expect(await response.json()).toMatchObject({ persisted: false });
  expect(harness.calls).toEqual([]);
  expect(harness.counts()).toEqual({ persistenceCalls: 1, triggerCalls: 0, queueCalls: 0 });
  expect(harness.splitCalls()).toBe(0);
  expect(factoryCalls).toBe(0);
  expect(externalCalls).toBe(0);
});

test("actual route retains enforced IP and email denials before atomic persistence", async () => {
  for (const deniedBoundary of ["ip", "email"]) {
    const harness = rpcHarness({ data: receipt(), error: null });
    let triggerCalls = 0;
    const post = route.createConceptBriefPostHandler({
      checkRateLimit: async ({ normalizedEmail }) => (normalizedEmail ? "email" : "ip") === deniedBoundary
        ? { allowed: false, mode: "enforced", reason: "rate_limit_exceeded" } : enforcedLimiter,
      persistSubmission: () => persistence.persistConceptBriefSubmissionWithPreviewIntent({ ...input(), p_admission_context: null }, harness.client),
      sessionDependencies: routeSession(),
      triggerAutomaticPreview: async () => { triggerCalls++; throw new Error("Denied intake must not generate"); },
    });
    const response = await post(postRequest());
    expect(response.status).toBe(429);
    expect(await response.json()).toMatchObject({ persisted: false });
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(harness.calls).toEqual([]);
    expect(harness.splitCalls()).toBe(0);
    expect(triggerCalls).toBe(0);
  }
  expect(externalCalls).toBe(0);
});

test("actual default route retains legacy persistence and ignores client-selected atomic or hold flags", async () => {
  const harness = legacyHarness();
  let triggerCalls = 0;
  const post = route.createConceptBriefPostHandler({
    checkRateLimit: async () => enforcedLimiter,
    sessionDependencies: routeSession(),
    triggerAutomaticPreview: async () => {
      triggerCalls++;
      return { status: "not_enqueued", reason: "generation_admission_unverified" };
    },
    logAutomaticPreviewDiagnostic: () => {},
  });
  const response = await post(postRequest({ ...routePayload(),
    firstPreviewInitiation: "operator_hold", atomic: true, p_admission_context: null,
  }));
  const expected = route.createPersistedConceptBriefResponse({
    persisted: true, conceptBriefId: BRIEF_ID, publicReference: harness.reference(),
  }, routeSession());
  expect(response.status).toBe(201);
  expect(await response.json()).toEqual(await expected.json());
  expect(response.headers.get("set-cookie")).toBe(expected.headers.get("set-cookie"));
  expect(harness.calls.map(call => [call.table, call.action])).toEqual([
    ["concept_briefs", "insert"], ["concept_brief_contacts", "insert"],
  ]);
  expect(factoryCalls).toBe(1);
  expect(triggerCalls).toBe(1);
  expect(externalCalls).toBe(0);
});

test.describe("Atomic receipt state truth", () => {
  const states = (testRequire("../../lib/server/ai-sketch/first-preview-initiation-contract") as
    typeof import("../../lib/server/ai-sketch/first-preview-initiation-contract")).INITIATION_STATES;

  test.afterEach(() => {
    expect(externalCalls).toBe(0);
    expect(JSON.stringify(logs)).not.toContain(PRIVATE_SENTINEL);
  });

  async function acceptedRoute(data: unknown, nonNullContext: boolean, repeats = 1) {
    const harness = atomicRouteHarness({ data, error: null }, { nonNullContext });
    for (let attempt = 0; attempt < repeats; attempt++) {
      const response = await harness.post(postRequest());
      const body = await response.json();
      const expected = route.createPersistedConceptBriefResponse({
        persisted: true, conceptBriefId: BRIEF_ID, publicReference: REFERENCE,
      }, routeSession());
      expect(response.status).toBe(201);
      expect(body).toEqual(await expected.json());
      expect(response.headers.get("set-cookie")).toBeNull();
      for (const field of ["atomicIntent", "intent_state", "intent_created", "firstPreviewInitiation",
        "admission_context", "p_admission_context", "key_version", "binding_digest"]) {
        expect(body).not.toHaveProperty(field);
      }
      const publicOutput = JSON.stringify({ body, headers: [...response.headers], logs });
      for (const value of [PRIVATE_SENTINEL, "synthetic-v1", "rl:v1:concept-briefs:ip:",
        "rl:v1:concept-briefs:email:"]) expect(publicOutput).not.toContain(value);
    }
    expect(harness.counts()).toEqual({ persistenceCalls: repeats, triggerCalls: 0, queueCalls: 0 });
    expect(harness.calls).toHaveLength(repeats);
    expect(harness.splitCalls()).toBe(0);
    expect(factoryCalls).toBe(0);
    return harness;
  }

  for (const [label, state, created, nonNullContext] of [
    ["new accepted context", "pending", true, true],
    ["new NULL context", "operator_hold", true, false],
    ["database-downgraded non-null context", "operator_hold", true, true],
    ...states.map(state => ["existing " + state, state, false, true] as const),
    ["existing NULL held context", "operator_hold", false, false],
    ["existing NULL cancelled context", "cancelled", false, false],
  ] as const) {
    test(label + " retains actual state and uses only Durable Outbox initiation", async () => {
      const request = input();
      if (!nonNullContext) request.p_admission_context = null;
      const data = receipt({ intent_state: state, intent_created: created, private_context: PRIVATE_SENTINEL });
      const harness = rpcHarness({ data, error: null });
      const result = await persistence.persistConceptBriefSubmissionWithPreviewIntent(request, harness.client);
      expect(result).toEqual({
        persisted: true, conceptBriefId: BRIEF_ID, publicReference: REFERENCE,
        atomicIntent: { state, created },
        ...(state === "operator_hold" ? { firstPreviewInitiation: "operator_hold" } : {}),
      });
      expect(harness.calls).toEqual([{ name: "novora_persist_concept_brief_with_preview_intent", args: request }]);
      expect(harness.splitCalls()).toBe(0);
      expect(JSON.stringify(result)).not.toContain(PRIVATE_SENTINEL);
      await acceptedRoute(data, nonNullContext);
    });
  }

  test("repeated pending receipts stay persisted and never launch a second direct path", async () => {
    await acceptedRoute(receipt({ intent_state: "pending", intent_created: false }), true, 2);
  });

  for (const [label, overrides, nonNullContext] of [
    ["missing state", { intent_state: undefined }, true],
    ["unknown state", { intent_state: "invented" }, true],
    ["null state", { intent_state: null }, true],
    ["array state", { intent_state: ["pending"] }, true],
    ["missing creation evidence", { intent_created: undefined }, true],
    ["null creation evidence", { intent_created: null }, true],
    ["string creation evidence", { intent_created: "true" }, true],
    ["numeric creation evidence", { intent_created: 1 }, true],
    ["new advanced state", { intent_state: "completed", intent_created: true }, true],
    ["NULL pending", { intent_state: "pending" }, false],
    ["NULL advanced", { intent_state: "queued", intent_created: false }, false],
    ["other Brief", { concept_brief_id: OTHER_ID }, true],
    ["other reference", { public_reference: "NOVORA-CB-20261016-ELSE" }, true],
    ["other version", { intent_version: "unrecognized" }, true],
    ["unconfirmed persistence", { persisted: false }, true],
  ] as const) {
    test(label + " fails closed without a false receipt or fallback", async () => {
      const data = receipt(overrides);
      const request = input();
      if (!nonNullContext) request.p_admission_context = null;
      const harness = rpcHarness({ data, error: null });
      expect(await persistence.persistConceptBriefSubmissionWithPreviewIntent(request, harness.client))
        .toMatchObject({ persisted: false });
      expect(harness.calls).toHaveLength(1);
      expect(harness.splitCalls()).toBe(0);
      const actualRoute = atomicRouteHarness({ data, error: null }, { nonNullContext });
      const response = await actualRoute.post(postRequest());
      expect(response.status).toBe(202);
      expect(await response.json()).toMatchObject({ persisted: false });
      expect(response.headers.get("set-cookie")).toBeNull();
      expect(actualRoute.counts()).toEqual({ persistenceCalls: 1, triggerCalls: 0, queueCalls: 0 });
      expect(actualRoute.splitCalls()).toBe(0);
      expect(factoryCalls).toBe(0);
    });
  }

  for (const [label, result] of [
    ["RPC rejection", { data: { ok: false, code: "identity_conflict", details: PRIVATE_SENTINEL }, error: null }],
    ["RPC unavailable", { data: null, error: { code: "PGRST202", message: PRIVATE_SENTINEL } }],
    ["uncertain transport", async () => { throw new Error(PRIVATE_SENTINEL); }],
  ] as const) {
    test(label + " has no retry, split writes, credentials or generation", async () => {
      const harness = atomicRouteHarness(result, { nonNullContext: true });
      const response = await harness.post(postRequest());
      expect(response.status).toBe(202);
      expect(await response.json()).toMatchObject({ persisted: false });
      expect(response.headers.get("set-cookie")).toBeNull();
      expect(harness.calls).toHaveLength(1);
      expect(harness.splitCalls()).toBe(0);
      expect(harness.counts()).toEqual({ persistenceCalls: 1, triggerCalls: 0, queueCalls: 0 });
      expect(factoryCalls).toBe(0);
    });
  }

  test("default legacy intake ignores client atomic markers and retains its authorized trigger", async () => {
    const harness = legacyHarness();
    let triggerCalls = 0;
    const post = route.createConceptBriefPostHandler({
      checkRateLimit: async () => enforcedLimiter,
      sessionDependencies: routeSession(),
      triggerAutomaticPreview: async () => {
        triggerCalls++;
        return { status: "not_enqueued", reason: "generation_admission_unverified" };
      },
      logAutomaticPreviewDiagnostic: () => {},
    });
    const response = await post(postRequest({ ...routePayload(),
      atomicIntent: { state: "pending", created: false }, firstPreviewInitiation: "operator_hold",
      intent_state: "operator_hold", intent_created: false,
    }));
    const body = await response.json();
    const expected = route.createPersistedConceptBriefResponse({
      persisted: true, conceptBriefId: BRIEF_ID, publicReference: harness.reference(),
    }, routeSession());
    expect(response.status).toBe(201);
    expect(body).toEqual(await expected.json());
    expect(response.headers.get("set-cookie")).toBe(expected.headers.get("set-cookie"));
    expect(body).not.toHaveProperty("atomicIntent");
    expect(harness.calls.map(call => [call.table, call.action])).toEqual([
      ["concept_briefs", "insert"], ["concept_brief_contacts", "insert"],
    ]);
    expect(factoryCalls).toBe(1);
    expect(triggerCalls).toBe(1);
  });
});
