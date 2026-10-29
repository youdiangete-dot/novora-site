import { expect, test } from "@playwright/test";
import { createHash } from "node:crypto";
import Module, { createRequire } from "node:module";
import path from "node:path";
import type { BetaAdmissionLedger, BetaDispatch, BetaReservation } from "../../lib/server/ai-sketch/beta-admission";
import type { AutomaticFirstPreviewWorkerDependencies } from "../../lib/server/ai-sketch/first-preview-generation-lifecycle";
import { createSyntheticFirstPreviewPng } from "../fixtures/ai-sketch/fake-first-preview-storage-client";
import {
  FIRST_PREVIEW_VISUAL_PRIVACY_INSPECTOR_VERSION,
  FIRST_PREVIEW_VISUAL_PRIVACY_MODEL,
  FIRST_PREVIEW_VISUAL_PRIVACY_POLICY_VERSION,
} from "../../lib/server/ai-sketch/first-preview-visual-privacy-contract";

const internals = Module as unknown as { _resolveFilename: (...args: any[]) => string };
const original = internals._resolveFilename;
const requireTest = createRequire(path.join(process.cwd(), "tests/e2e/beta-admission.spec.ts"));
internals._resolveFilename = function (name, ...args) {
  return name === "server-only"
    ? requireTest.resolve("next/dist/compiled/server-only/empty.js")
    : original.call(this, name, ...args);
};
const modules = (() => {
  try {
    return {
      beta: requireTest("../../lib/server/ai-sketch/beta-admission") as typeof import("../../lib/server/ai-sketch/beta-admission"),
      route: requireTest("../../app/api/concept-briefs/handler") as typeof import("../../app/api/concept-briefs/handler"),
      queue: requireTest("../../lib/server/ai-sketch/first-preview-queue") as typeof import("../../lib/server/ai-sketch/first-preview-queue"),
      lifecycle: requireTest("../../lib/server/ai-sketch/first-preview-generation-lifecycle") as typeof import("../../lib/server/ai-sketch/first-preview-generation-lifecycle"),
      memory: requireTest("../../lib/server/ai-sketch/in-memory-first-preview-repository") as typeof import("../../lib/server/ai-sketch/in-memory-first-preview-repository"),
    };
  } finally { internals._resolveFilename = original; }
})();

const digest = (value: string) => createHash("sha256").update(value).digest("hex");
// Deliberately predictable test-only credentials. No real credentials are generated.
const credential = (identity = 0) => String.fromCharCode(97 + identity).repeat(43);
const environment = (count = 2) => ({
  NOVORA_BETA_ADMISSION_ENABLED: "true",
  NOVORA_BETA_SPENDING_AUTHORITY_ID: "synthetic-authority",
  NOVORA_BETA_INVITATIONS_JSON: JSON.stringify(Array.from({ length: count }, (_, i) => ({
    identity: `tester_${i}`, credentialSha256: digest(credential(i)),
  }))),
});

// Fake atomic/durable service contract. Multiple app instances share this
// object; it contains no production fallback and performs no network calls.
class FakeLedger implements BetaAdmissionLedger {
  day = 1;
  verifiedSpending = true;
  remainingExperiences = 100;
  reservations = new Map<string, BetaReservation & { day: number; dispatched: boolean }>();
  async reserve(input: BetaReservation) {
    if (!this.verifiedSpending) return "denied" as const;
    const previous = this.reservations.get(input.requestKey);
    if (previous) return previous.identity === input.identity && previous.fingerprint === input.fingerprint
      ? "duplicate" as const : "denied" as const;
    const daily = [...this.reservations.values()].filter(r => r.identity === input.identity && r.day === this.day);
    if (daily.length >= 5 || this.remainingExperiences <= 0 ||
      [...this.reservations.values()].some(r => r.briefId === input.briefId)) return "denied" as const;
    this.remainingExperiences--;
    this.reservations.set(input.requestKey, { ...input, day: this.day, dispatched: false });
    return "reserved" as const;
  }
  async claimDispatch(input: BetaDispatch) {
    if (!this.verifiedSpending) return false;
    const record = [...this.reservations.values()].find(r => r.briefId === input.briefId);
    if (!record || record.fingerprint !== input.fingerprint || record.dispatched) return false;
    record.dispatched = true;
    return true;
  }
}

function request(identity = 0, key = "synthetic-request-0000", email = "synthetic@example.invalid") {
  return new Request("https://example.invalid/api/concept-briefs", {
    method: "POST",
    headers: { authorization: `Bearer ${credential(identity)}`, "idempotency-key": key, "content-type": "application/json" },
    body: JSON.stringify({
      customerName: "Synthetic Tester", customerEmail: email,
      brief: { pieceType: "ring", designIntent: "A balanced pear-center heirloom ring.", designDescription: "A low sculptural silhouette for daily wear." },
    }),
  });
}
const BRIEF = "123e4567-e89b-42d3-a456-426614174000";
const REFERENCE = "NOVORA-CB-20260803-BETA";
const fingerprint = `${digest("design")}:${digest("instruction")}`;
let originalFetch: typeof fetch;
test.beforeEach(() => {
  originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("Network forbidden in Beta offline tests"); };
});
test.afterEach(() => { globalThis.fetch = originalFetch; });
function reserve(ledger: BetaAdmissionLedger, key: string, identity = 0, briefId = key) {
  return modules.beta.reserveBetaAdmission({ request: request(identity, key), briefId, fingerprint }, { environment: environment(), ledger });
}

function routeHarness(options: { ledger?: FakeLedger; mode?: string; publishThrows?: boolean; persist?: boolean } = {}) {
  const ledger = options.ledger ?? new FakeLedger();
  const messages: unknown[] = [];
  let persisted = 0;
  const post = modules.route.createConceptBriefPostHandler({
    checkRateLimit: async () => ({ allowed: true, mode: "disabled", reason: "synthetic" }),
    persistSubmission: async () => {
      persisted++;
      return options.persist === false
        ? { persisted: false, message: "Synthetic unavailable" }
        : { persisted: true, publicReference: REFERENCE, conceptBriefId: BRIEF };
    },
    sessionDependencies: {
      featureFlagValue: "true",
      signingSecret: "synthetic-beta-test-only-signing-secret-000000000000",
      clock: () => 1785715200,
      nonceSource: () => "synthetic_beta_nonce_abcdefghijklmnop",
    },
    triggerDependencies: {
      featureFlagValue: "true", queueExecutionCapabilityValue: "true",
      betaAdmissionDependencies: { environment: { ...environment(), NOVORA_BETA_ADMISSION_ENABLED: options.mode ?? "true" }, ledger },
      publisher: { async publish(value) {
        messages.push(value.message);
        if (options.publishThrows) throw new Error("synthetic uncertain publication");
      } },
    },
    logAutomaticPreviewDiagnostic: () => {},
  });
  return { ledger, messages, post, persisted: () => persisted };
}

test("disabled Beta preserves ordinary persisted receipt and legacy Queue message", async () => {
  const harness = routeHarness({ mode: "false" });
  const response = await harness.post(request());
  expect(response.status).toBe(201);
  expect(await response.json()).toMatchObject({ persisted: true, publicReference: REFERENCE, conceptBriefId: BRIEF });
  expect(response.cookies.get("__Host-novora_first_preview_access")?.value).toBeTruthy();
  expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  expect(harness.messages).toHaveLength(1);
  expect(harness.messages[0]).not.toHaveProperty("betaAdmission");
  expect(harness.ledger.reservations.size).toBe(0);
});

test("uninvited credentials and client identity claims cannot authorize Queue publication; Brief receipt survives", async () => {
  const harness = routeHarness();
  const forged = request(4);
  forged.headers.set("x-account-id", "tester_0");
  forged.headers.set("cookie", "novora_concept_brief=tester_0");
  const response = await harness.post(forged);
  expect(response.status).toBe(201);
  expect(await response.json()).toMatchObject({ persisted: true });
  expect(harness.persisted()).toBe(1);
  expect(harness.messages).toHaveLength(0);
  expect(harness.ledger.reservations.size).toBe(0);
});

test("at most ten unique invitation identities; malformed roster, weak credential and missing idempotency key fail closed", async () => {
  const ledger = new FakeLedger();
  for (const roster of [environment(11), { ...environment(), NOVORA_BETA_INVITATIONS_JSON: "invalid" }, {
    ...environment(), NOVORA_BETA_INVITATIONS_JSON: JSON.stringify([
      { identity: "same", credentialSha256: digest(credential()) },
      { identity: "same", credentialSha256: digest(credential(1)) },
    ]),
  }]) {
    expect(await modules.beta.reserveBetaAdmission({ request: request(), briefId: BRIEF, fingerprint }, { environment: roster, ledger })).toBe("denied");
  }
  const ten = environment(10);
  expect(await modules.beta.reserveBetaAdmission({ request: request(9), briefId: BRIEF, fingerprint }, { environment: ten, ledger })).toBe("reserved");
  for (const headers of [{ authorization: "Bearer tester_0" }, { "idempotency-key": "" }, { authorization: "" }]) {
    const bad = request();
    for (const [key, value] of Object.entries(headers)) bad.headers.set(key, value);
    expect(await modules.beta.reserveBetaAdmission({ request: bad, briefId: "other", fingerprint }, { environment: environment(), ledger })).toBe("denied");
  }
});

test("concurrent app instances share five daily reservations per identity with account isolation and UTC rollover", async () => {
  const ledger = new FakeLedger();
  const results = await Promise.all(Array.from({ length: 20 }, (_, i) => reserve(ledger, `synthetic-race-key-${i}`)));
  expect(results.filter(r => r === "reserved")).toHaveLength(5);
  expect(await reserve(ledger, "synthetic-second-account", 1)).toBe("reserved");
  ledger.day++;
  expect(await reserve(ledger, "synthetic-new-utc-day")).toBe("reserved");
  expect(ledger.reservations.size).toBe(7);
});

test("one global spending pool and idempotency cannot be double spent across identities", async () => {
  const ledger = new FakeLedger();
  ledger.remainingExperiences = 1;
  const race = await Promise.all([reserve(ledger, "synthetic-global-cap", 0, "brief-a"), reserve(ledger, "synthetic-global-cap", 1, "brief-b")]);
  expect(race.filter(value => value === "reserved")).toHaveLength(1);
  expect(ledger.remainingExperiences).toBe(0);
  const duplicateLedger = new FakeLedger();
  const duplicates = await Promise.all(Array.from({ length: 20 }, () => reserve(duplicateLedger, "synthetic-same-operation")));
  expect(duplicates.filter(value => value === "reserved")).toHaveLength(1);
  expect(duplicateLedger.reservations.size).toBe(1);
});

test("duplicate submission, changed email, midnight and uncertain publication cannot release or reset a reservation", async () => {
  const harness = routeHarness({ publishThrows: true });
  expect((await harness.post(request())).status).toBe(201);
  expect((await harness.post(request(0, "synthetic-request-0000", "changed@example.invalid"))).status).toBe(201);
  harness.ledger.day++;
  expect((await harness.post(request())).status).toBe(201);
  expect(harness.messages).toHaveLength(1);
  expect(harness.ledger.reservations.size).toBe(1);
  expect(harness.ledger.remainingExperiences).toBe(99);
});

test("unknown or exhausted spending, service exceptions and malformed feature switch deny paid admission", async () => {
  for (const type of ["unknown", "exhausted", "malformed"] as const) {
    const ledger = new FakeLedger();
    ledger.verifiedSpending = type !== "unknown";
    ledger.remainingExperiences = type === "exhausted" ? 0 : 100;
    const harness = routeHarness({ ledger, mode: type === "malformed" ? "TRUE" : "true" });
    expect((await harness.post(request())).status).toBe(201);
    expect(harness.messages).toHaveLength(0);
  }
  const unavailable: BetaAdmissionLedger = {
    async reserve() { throw new Error("synthetic offline"); },
    async claimDispatch() { throw new Error("synthetic offline"); },
  };
  expect(await reserve(unavailable, "synthetic-error-key")).toBe("denied");
  expect(await modules.beta.claimBetaDispatch({ briefId: BRIEF, fingerprint, betaAdmission: true }, { environment: environment(), ledger: unavailable })).toBe(false);
  expect(await modules.beta.reserveBetaAdmission({ request: request(), briefId: BRIEF, fingerprint }, { environment: environment() })).toBe("denied");
});

test("unconfirmed persistence and unsafe structured input never reserve quota or publish", async () => {
  const unsaved = routeHarness({ persist: false });
  expect((await unsaved.post(request())).status).toBe(202);
  expect(unsaved.ledger.reservations.size).toBe(0);
  expect(unsaved.messages).toHaveLength(0);
  const unsafe = routeHarness();
  const req = request();
  const body = await req.json();
  body.brief.designDescription = "PRIVATE_STAGE_EMAIL@example.invalid";
  const response = await unsafe.post(new Request(req.url, { method: "POST", headers: req.headers, body: JSON.stringify(body) }));
  expect(response.status).toBe(201);
  expect(unsafe.messages).toHaveLength(0);
  expect(unsafe.ledger.reservations.size).toBe(0);
});

for (const [privacyPassed, visualPrivacyPassed] of [[true, true], [false, true], [true, false]]) {
  test(`admitted Beta requires both privacy gates: metadata ${privacyPassed}, visual ${visualPrivacyPassed}`, async () => {
    const harness = routeHarness();
    await harness.post(request());
    const bytes = createSyntheticFirstPreviewPng();
    let tick = 0;
    const clock = () => `2026-08-06T00:00:${String(tick++).padStart(2, "0")}.000Z`;
    const repository = new modules.memory.InMemoryFirstPreviewRepository(clock);
    let calls = 0;
    let stores = 0;
    let inspections = 0;
    const dependencies: AutomaticFirstPreviewWorkerDependencies = {
      repository,
      betaAdmissionDependencies: { environment: environment(), ledger: harness.ledger },
      createProvider: () => ({
        adapter: { async generateFirstPreviewImage() {
          calls++;
          return { ok: true, imageBase64: Buffer.from(bytes).toString("base64"), mimeType: "image/png", width: 1024, height: 1024,
            byteSize: bytes.byteLength, model: "gpt-image-2-2026-04-21", providerRequestId: "synthetic-beta-request" };
        } },
        readValidatedUsage: () => ({ textInputTokens: 100, imageOutputTokens: 100 }),
        readProviderRequestId: () => "synthetic-beta-request",
      }),
      evaluateTrustedOutput: async (input, context) => {
        expect(await context.reserveVisualPrivacyInspection?.()).toBe(true);
        inspections++;
        return {
          evidenceVersion: modules.lifecycle.FIRST_PREVIEW_TRUSTED_OUTPUT_EVIDENCE_VERSION,
          subject: { ...input.subject },
          visualPrivacyEvidence: {
            subject: { ...input.subject },
            inspectorVersion: FIRST_PREVIEW_VISUAL_PRIVACY_INSPECTOR_VERSION,
            policyVersion: FIRST_PREVIEW_VISUAL_PRIVACY_POLICY_VERSION,
            model: FIRST_PREVIEW_VISUAL_PRIVACY_MODEL,
            result: visualPrivacyPassed ? "passed" : "failed",
            usageTrusted: true,
            actualCostMicros: 1_000,
          },
          results: { contentSafetyPassed: true, privacyPassed, outputValidityPassed: true },
        };
      },
      createAssetStore: () => ({
        kind: "supabase",
        async persistValidatedPng(input) {
          stores++;
          const assetTimestamp = clock();
          return { ok: true, value: { disposition: "created", asset: {
            assetId: `first-preview/${input.conceptBriefId}/${input.jobId}/${input.outputId}.png`,
            assetPersisted: true, bucketName: "novora-ai-sketches", mimeType: "image/png",
            byteSize: input.imageBytes.byteLength, widthPx: 1024, heightPx: 1024,
            contentSha256: createHash("sha256").update(input.imageBytes).digest("hex"),
            assetCreatedAt: assetTimestamp, assetValidatedAt: assetTimestamp,
          } } };
        },
        async readAuthorizedPng() { return { ok: false, code: "access_denied" }; },
      }),
    };
    const results = await Promise.all(Array.from({ length: 3 }, () => modules.queue.consumeFirstPreviewQueueMessage(harness.messages[0], {
      createRepository: () => repository, createWorkerDependencies: () => dependencies,
    })));
    expect(calls).toBe(1);
    expect(stores).toBe(1);
    expect(inspections).toBe(1);
    expect(harness.ledger.reservations.size).toBe(1);
    expect([...harness.ledger.reservations.values()][0].dispatched).toBe(true);
    expect(results.some(result => result.disposition === "completed")).toBe(privacyPassed && visualPrivacyPassed);
    expect(Boolean(await repository.findCustomerReadyOutput(BRIEF))).toBe(privacyPassed && visualPrivacyPassed);
  });
}

test("dispatch is bound to admitted Brief and input; duplicates, unmarked and disabled Beta work cannot dispatch", async () => {
  const ledger = new FakeLedger();
  await reserve(ledger, "synthetic-dispatch-key", 0, BRIEF);
  const deps = { environment: environment(), ledger };
  expect(await modules.beta.claimBetaDispatch({ briefId: "other", fingerprint, betaAdmission: true }, deps)).toBe(false);
  expect(await modules.beta.claimBetaDispatch({ briefId: BRIEF, fingerprint: "changed", betaAdmission: true }, deps)).toBe(false);
  expect(await modules.beta.claimBetaDispatch({ briefId: BRIEF, fingerprint }, deps)).toBe(false);
  const values = await Promise.all(Array.from({ length: 20 }, () => modules.beta.claimBetaDispatch({ briefId: BRIEF, fingerprint, betaAdmission: true }, deps)));
  expect(values.filter(Boolean)).toHaveLength(1);
  expect(await modules.beta.claimBetaDispatch({ briefId: BRIEF, fingerprint, betaAdmission: true }, { ...deps, environment: {} })).toBe(false);
  expect(await modules.beta.claimBetaDispatch({ briefId: BRIEF, fingerprint }, { ...deps, environment: {} })).toBe(true);
});

test("existing Queue consumer and worker execute an admitted experience once through the unchanged provider interface", async () => {
  const harness = routeHarness();
  await harness.post(request());
  expect(harness.messages).toHaveLength(1);
  expect(harness.messages[0]).toHaveProperty("betaAdmission", true);
  const repository = new modules.memory.InMemoryFirstPreviewRepository();
  let paidCalls = 0;
  const deps = {
    createRepository: () => repository,
    createWorkerDependencies: () => ({
      repository,
      betaAdmissionDependencies: { environment: environment(), ledger: harness.ledger },
      createProvider: () => ({
        adapter: { async generateFirstPreviewImage() { paidCalls++; return { ok: false as const, category: "provider_unavailable" as const, retryEligible: false }; } },
        readValidatedUsage: () => null,
        readProviderRequestId: () => null,
      }),
      createAssetStore: () => { throw new Error("must not write failed output"); },
    }),
  };
  const first = await modules.queue.consumeFirstPreviewQueueMessage(harness.messages[0], deps);
  expect(first.disposition).toBe("terminal_failure");
  await modules.queue.consumeFirstPreviewQueueMessage(harness.messages[0], deps);
  expect(paidCalls).toBe(1);
  expect(harness.ledger.reservations.size).toBe(1);
});

test("worker denies missing spending authority before Provider call and preserves fail-closed output lifecycle", async () => {
  const harness = routeHarness();
  await harness.post(request());
  harness.ledger.verifiedSpending = false;
  const repository = new modules.memory.InMemoryFirstPreviewRepository();
  let calls = 0;
  const result = await modules.queue.consumeFirstPreviewQueueMessage(harness.messages[0], {
    createRepository: () => repository,
    createWorkerDependencies: () => ({
      repository,
      betaAdmissionDependencies: { environment: environment(), ledger: harness.ledger },
      createProvider: () => ({
        adapter: { async generateFirstPreviewImage() { calls++; throw new Error("forbidden"); } },
        readValidatedUsage: () => null, readProviderRequestId: () => null,
      }),
      createAssetStore: () => { throw new Error("forbidden"); },
    }),
  });
  expect(result.disposition).toBe("terminal_failure");
  expect(calls).toBe(0);
  expect(repository.snapshot().outputs).toHaveLength(0);
});

test("Redis adapter sends one atomic script, never initializes authority, never retries an uncertain write", async () => {
  const commands: unknown[][] = [];
  const configured = { ...environment(), UPSTASH_REDIS_REST_URL: "https://synthetic.invalid", UPSTASH_REDIS_REST_TOKEN: "synthetic-test-only" };
  const ledger = modules.beta.createRedisBetaAdmissionLedger(configured, async (_url, options) => {
    commands.push(JSON.parse(options!.body as string));
    return new Response(JSON.stringify({ result: "reserved" }));
  });
  expect(ledger).not.toBeNull();
  await ledger!.reserve({ identity: "tester_0", requestKey: digest("key"), briefId: BRIEF, fingerprint });
  expect(commands).toHaveLength(1);
  expect(commands[0].slice(0, 4)).toEqual(["EVAL", modules.beta.BETA_ADMISSION_SCRIPT, "1", modules.beta.BETA_LEDGER_KEY]);
  expect(commands[0][5]).toBe("synthetic-authority");
  expect(modules.beta.createRedisBetaAdmissionLedger({ ...configured, NOVORA_BETA_SPENDING_AUTHORITY_ID: "" })).toBeNull();
  for (const response of [new Response("oops"), new Response('{"error":"unknown"}'), new Response('{"result":true}'), new Response("", { status: 503 })]) {
    const deniedLedger = modules.beta.createRedisBetaAdmissionLedger(configured, async () => response)!;
    expect(await reserve(deniedLedger, "synthetic-bad-redis")).toBe("denied");
  }
  let calls = 0;
  const uncertain = modules.beta.createRedisBetaAdmissionLedger(configured, async () => { calls++; throw new Error("uncertain"); })!;
  expect(await reserve(uncertain, "synthetic-uncertain-key")).toBe("denied");
  expect(calls).toBe(1);
});


function isolatedPreviewEnvironment(): Record<string, string> {
  return {
    ...environment(1), VERCEL: "1", VERCEL_ENV: "preview", NODE_ENV: "production",
    NEXT_RUNTIME: "nodejs", VERCEL_PROJECT_ID: "prj_H9Di3TIvXiZJHO06WwoaW8RqFfVg",
    VERCEL_GIT_COMMIT_REF: "integration/instant-first-preview-agent",
    VERCEL_GIT_COMMIT_SHA: "a".repeat(40), VERCEL_DEPLOYMENT_ID: "dpl_synthetic0123456789",
    NOVORA_INSTANT_PREVIEW_AGENT_ENABLED: "true", NOVORA_FIRST_PREVIEW_QUEUE_EXECUTION_CONFIRMED: "true",
    UPSTASH_REDIS_REST_URL: "https://synthetic.invalid", UPSTASH_REDIS_REST_TOKEN: "synthetic-test-only",
  };
}

test("isolated Preview binds one namespace to exact deployment, source, project and invitation without changing the old key", () => {
  const env = isolatedPreviewEnvironment();
  const bound = modules.beta.resolveBetaAdmissionBinding(env)!;
  expect(bound).not.toBeNull();
  expect(bound.ledgerKey).toMatch(/^novora:beta-admission:m2-e2e:v1:[a-f0-9]{64}$/);
  expect(bound.authorityId).toMatch(/^m2e2e_[a-f0-9]{56}$/);
  expect(bound.ledgerKey).not.toBe(modules.beta.BETA_LEDGER_KEY);
  expect(modules.beta.resolveBetaAdmissionBinding({ ...env })).toEqual(bound);
  for (const patch of [
    { VERCEL_DEPLOYMENT_ID: "dpl_another01234567890" }, { VERCEL_GIT_COMMIT_SHA: "b".repeat(40) },
    { NOVORA_BETA_SPENDING_AUTHORITY_ID: "another-authority" },
    { NOVORA_BETA_INVITATIONS_JSON: JSON.stringify([{ identity: "other", credentialSha256: digest(credential(1)) }]) },
  ]) {
    const other = modules.beta.resolveBetaAdmissionBinding({ ...env, ...patch })!;
    expect(other).not.toBeNull();
    expect(other.ledgerKey).not.toBe(bound.ledgerKey);
    expect(other.authorityId).not.toBe(bound.authorityId);
  }
  expect(modules.beta.resolveBetaAdmissionBinding(environment())).toEqual({
    ledgerKey: modules.beta.BETA_LEDGER_KEY, authorityId: "synthetic-authority", runtimeBinding: null,
  });
  expect(modules.beta.resolveBetaAdmissionBinding({ ...environment(), VERCEL: "1", VERCEL_ENV: "production" }))
    .toEqual({ ledgerKey: modules.beta.BETA_LEDGER_KEY, authorityId: "synthetic-authority", runtimeBinding: null });
});

test("missing, contradictory or untrusted Preview binding cannot fall back to the historical ledger", () => {
  const env = isolatedPreviewEnvironment();
  const bad: Array<Record<string, string | undefined>> = [
    { VERCEL: undefined }, { VERCEL: undefined, VERCEL_ENV: undefined, VERCEL_TARGET_ENV: undefined },
    { VERCEL_ENV: "production", VERCEL_TARGET_ENV: "preview" }, { VERCEL_ENV: "PREVIEW" }, { VERCEL_TARGET_ENV: "production" }, { VERCEL_TARGET_ENV: "" },
    { NODE_ENV: "development" }, { NEXT_RUNTIME: "edge" }, { NEXT_PHASE: "phase-production-build" },
    { VERCEL_PROJECT_ID: "wrong-project" }, { VERCEL_GIT_COMMIT_REF: "codex/unapproved" },
    { VERCEL_GIT_COMMIT_SHA: "" }, { VERCEL_GIT_COMMIT_SHA: "A".repeat(40) },
    { VERCEL_DEPLOYMENT_ID: "" }, { VERCEL_DEPLOYMENT_ID: "dpl_short" },
    { NOVORA_BETA_ADMISSION_ENABLED: "false" }, { NOVORA_INSTANT_PREVIEW_AGENT_ENABLED: "false" },
    { NOVORA_FIRST_PREVIEW_QUEUE_EXECUTION_CONFIRMED: "false" },
    { NOVORA_BETA_SPENDING_AUTHORITY_ID: "" }, { NOVORA_BETA_INVITATIONS_JSON: environment(2).NOVORA_BETA_INVITATIONS_JSON },
  ];
  for (const patch of bad) {
    expect(modules.beta.resolveBetaAdmissionBinding({ ...env, ...patch }), JSON.stringify(patch)).toBeNull();
    expect(modules.beta.createRedisBetaAdmissionLedger({ ...env, ...patch }), JSON.stringify(patch)).toBeNull();
  }
  expect(modules.beta.inspectBetaAdmissionBinding({ ...env, VERCEL_TARGET_ENV: "" }).diagnostics.targetValid).toBe(false);
});

test("Preview adapter atomically uses only the bound key and authority; uncertainty is denied without retry", async () => {
  const env = isolatedPreviewEnvironment();
  const binding = modules.beta.resolveBetaAdmissionBinding(env)!;
  const commands: unknown[][] = [];
  const ledger = modules.beta.createRedisBetaAdmissionLedger(env, async (_url, init) => {
    expect(init?.redirect).toBe("error");
    commands.push(JSON.parse(String(init?.body)));
    return new Response('{"result":"denied"}');
  })!;
  expect(await ledger.reserve({ identity: "tester_0", requestKey: digest("one"), briefId: BRIEF, fingerprint })).toBe("denied");
  expect(await ledger.claimDispatch({ briefId: BRIEF, fingerprint })).toBe(false);
  expect(commands).toHaveLength(2);
  for (const command of commands) {
    expect(command.slice(0, 4)).toEqual(["EVAL", modules.beta.M2_PREVIEW_ADMISSION_SCRIPT, "1", binding.ledgerKey]);
    expect(command[5]).toBe(binding.authorityId);
    expect(command[13]).toBe(binding.runtimeBinding);
    expect(command[3]).not.toBe(modules.beta.BETA_LEDGER_KEY);
  }
  // Preserve the previously accepted atomic consume/dispatch implementation.
  expect(modules.beta.M2_PREVIEW_ADMISSION_SCRIPT.endsWith(modules.beta.BETA_ADMISSION_SCRIPT)).toBe(true);
  let calls = 0;
  const uncertain = modules.beta.createRedisBetaAdmissionLedger(env, async () => { calls++; throw Error("synthetic uncertain send"); })!;
  expect(await modules.beta.reserveBetaAdmission({ request: request(), briefId: BRIEF, fingerprint }, { environment: env, ledger: uncertain })).toBe("denied");
  expect(calls).toBe(1);
});
