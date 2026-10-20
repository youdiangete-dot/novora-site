import { expect, test } from "@playwright/test";
import { createSyntheticPaidAdmission } from "../fixtures/ai-sketch/synthetic-paid-admission";
import Module, { createRequire } from "node:module";
import path from "node:path";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { createHash, createHmac } from "node:crypto";

const moduleInternals = Module as unknown as {
  _resolveFilename(
    request: string,
    parent: unknown,
    isMain: boolean,
    options?: unknown,
  ): string;
};
const serverOnlyTestShim = createRequire(path.join(process.cwd(), "package.json"))
  .resolve("next/dist/compiled/server-only/empty.js");

function loadWithServerOnlyTestShim<T>(load: () => T): T {
  const originalResolveFilename = moduleInternals._resolveFilename;
  moduleInternals._resolveFilename = function resolveTestModule(
    request,
    parent,
    isMain,
    options,
  ) {
    return request === "server-only"
      ? serverOnlyTestShim
      : originalResolveFilename.call(this, request, parent, isMain, options);
  };
  try {
    return load();
  } finally {
    moduleInternals._resolveFilename = originalResolveFilename;
  }
}

const testRequire = createRequire(
  path.join(
    process.cwd(),
    "tests",
    "e2e",
    "automatic-first-preview-route-correction.spec.ts",
  ),
);
const modules = loadWithServerOnlyTestShim(() => ({
  route: testRequire(
    "../../app/api/concept-briefs/route",
  ) as typeof import("../../app/api/concept-briefs/route"),
  trigger: testRequire(
    "../../lib/server/ai-sketch/first-preview-automatic-trigger",
  ) as typeof import("../../lib/server/ai-sketch/first-preview-automatic-trigger"),
}));

type ConceptBriefPostDependencies = NonNullable<
  Parameters<typeof modules.route.createConceptBriefPostHandler>[0]
>;
type RateLimitResult = Awaited<
  ReturnType<NonNullable<ConceptBriefPostDependencies["checkRateLimit"]>>
>;

const PUBLIC_REFERENCE = "NOVORA-CB-20260803-G2R1";
const BRIEF_ID = "123e4567-e89b-42d3-a456-426614174000";
const SIGNING_SECRET =
  "goal2-route-test-only-signing-secret-00000000000000000000";

function validPayload() {
  return {
    customerName: "Synthetic Customer",
    customerEmail: "synthetic@example.invalid",
    brief: {
      pieceType: "ring",
      designIntent: "A balanced pear-center heirloom ring.",
      designDescription: "A low sculptural silhouette for daily wear.",
    },
  };
}

function request(payload: unknown = validPayload(), headers?: HeadersInit) {
  return new Request("http://localhost/api/concept-briefs", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(payload),
  });
}

function trustedRateLimitEvidence() {
  return {
    allowed: true,
    mode: "enforced",
    reason: "within_limit",
  } as const;
}

function allowRateLimit() {
  return Promise.resolve(trustedRateLimitEvidence());
}

function persistenceSuccess(
  publicReference = PUBLIC_REFERENCE,
  conceptBriefId = BRIEF_ID,
) {
  return Promise.resolve({
    persisted: true as const,
    publicReference,
    conceptBriefId,
  });
}

function sessionDependencies(featureFlagValue: unknown = "true") {
  return {
    featureFlagValue,
    signingSecret: SIGNING_SECRET,
    clock: () => 1_785_715_200,
    nonceSource: () => "goal2_route_nonce_abcdefghijklmnop",
  };
}

function expectedPersistedReceipt() {
  return modules.route.createPersistedConceptBriefResponse(
    {
      persisted: true,
      publicReference: PUBLIC_REFERENCE,
      conceptBriefId: BRIEF_ID,
    },
    sessionDependencies(),
  );
}

test.describe("P1A independent paid admission POST boundary", () => {
  for (const condition of ["missing state", "unavailable", "aggregate exhausted"] as const) {
    test(`public enforcement passes but ${condition} preserves receipt without enqueue`, async () => {
      const target = createSyntheticPaidAdmission();
      if (condition === "missing state") target.state.raw = "";
      if (condition === "unavailable") target.state.unavailable = true;
      if (condition === "aggregate exhausted") {
        for (const identity of ["b".repeat(64), "c".repeat(64)]) {
          await target.admission.reserve({ identity, fingerprint: "a".repeat(64) });
        }
      }
      let persistenceCalls = 0, publishCalls = 0;
      const diagnostics: unknown[] = [];
      const post = modules.route.createConceptBriefPostHandler({
        checkRateLimit: allowRateLimit,
        persistSubmission: () => { persistenceCalls++; return persistenceSuccess(); },
        sessionDependencies: sessionDependencies(),
        triggerDependencies: {
          featureFlagValue: "true", queueExecutionCapabilityValue: "true",
          paidAdmission: target.admission,
          publisher: { async publish() { publishCalls++; } },
        },
        logAutomaticPreviewDiagnostic: (value) => diagnostics.push(value),
      });
      const response = await post(request());
      const expected = expectedPersistedReceipt();
      expect(response.status).toBe(201);
      expect(await response.json()).toEqual(await expected.json());
      expect(response.headers.get("set-cookie")).toBe(expected.headers.get("set-cookie"));
      expect(persistenceCalls).toBe(1);
      expect(publishCalls).toBe(0);
      expect(diagnostics).toEqual([{
        publicReference: PUBLIC_REFERENCE, status: "not_enqueued",
        reason: "generation_admission_unverified",
      }]);
    });
  }
});

test.describe("Enforced rate-limit key provenance", () => {
  const RATE_SECRET = "synthetic-rate-provenance-secret-only";
  const RATE_TOKEN = "synthetic-rate-provenance-token-only";
  const IP = "192.0.2.44";
  const EMAIL = "synthetic@example.invalid";
  const ROUTE = "/api/concept-briefs";
  const POLICY = { limit: 30, windowSeconds: 600, keyPrefix: "rl:v1:concept-briefs" };
  const syntheticEnvironment = {
    UPSTASH_REDIS_REST_URL: "https://synthetic-limiter.invalid",
    UPSTASH_REDIS_REST_TOKEN: RATE_TOKEN,
    NOVORA_INTERNAL_SIGNING_SECRET: RATE_SECRET,
  };

  function isolatedLimiter(options: {
    env?: Record<string, string>;
    result?: unknown;
    failure?: "http" | "command" | "malformed" | "transport";
    beforeResponse?: (env: Record<string, string>) => void;
    transformSource?: (source: string) => string;
  } = {}) {
    // Execute the actual source with a synthetic process and transport. No real
    // process.env reads/writes, Redis requests, or production dependency changes.
    const ts = testRequire("typescript") as typeof import("typescript");
    const originalSource = readFileSync(testRequire.resolve("../../lib/server/public-api-rate-limit"), "utf8");
    const source = options.transformSource ? options.transformSource(originalSource) : originalSource;
    const compiled = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    });
    const exports = {};
    const env = { ...(options.env ?? syntheticEnvironment) };
    const commands: unknown[][] = [];
    const warnings: unknown[][] = [];
    runInNewContext(compiled.outputText, {
      exports, module: { exports }, process: { env }, Buffer,
      require: (name: string) => {
        if (name === "server-only") return {};
        if (name === "node:crypto") return testRequire(name);
        throw new Error(`Unexpected limiter import: ${name}`);
      },
      console: { warn: (...args: unknown[]) => warnings.push(args) },
      fetch: async (url: string, init: RequestInit) => {
        expect(url).toBe(syntheticEnvironment.UPSTASH_REDIS_REST_URL);
        const command = JSON.parse(String(init.body));
        commands.push(command);
        options.beforeResponse?.(env);
        if (options.failure === "transport") throw new Error(RATE_TOKEN);
        if (options.failure === "http") return new Response("", { status: 503 });
        const body = options.failure === "command" ? { error: RATE_TOKEN }
          : { result: options.failure === "malformed" ? "not-a-counter" : options.result ?? "1:600" };
        return new Response(JSON.stringify(body), { status: 200 });
      },
    }, { filename: "synthetic-public-api-rate-limit.cjs" });
    function loadRoute() {
      // The real route and limiter must share the same private receipt registry.
      // Keep the existing module-level dependencies; substitute only this isolated
      // limiter instance so no real environment or Redis transport is consulted.
      const routePath = testRequire.resolve("../../app/api/concept-briefs/route");
      const routeRequire = createRequire(routePath);
      const routeCode = ts.transpileModule(readFileSync(routePath, "utf8"), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
      });
      const routeExports = {};
      loadWithServerOnlyTestShim(() => runInNewContext(routeCode.outputText, {
        exports: routeExports, module: { exports: routeExports }, Headers,
        require: (name: string) => name === "../../../lib/server/public-api-rate-limit"
          ? exports : routeRequire(name),
      }, { filename: "synthetic-concept-brief-route.cjs" }));
      return routeExports as typeof import("../../app/api/concept-briefs/route");
    }
    return { limiter: exports as typeof import("../../lib/server/public-api-rate-limit"), commands, warnings, loadRoute };
  }


  test.describe("Atomic proof binding", () => {
    const proofContract = testRequire("../../lib/server/ai-sketch/first-preview-customer-access-contract") as
      typeof import("../../lib/server/ai-sketch/first-preview-customer-access-contract");
    const cookieIntegration = loadWithServerOnlyTestShim(() =>
      testRequire("../../lib/server/ai-sketch/instant-first-preview-feature-flag")) as
      typeof import("../../lib/server/ai-sketch/instant-first-preview-feature-flag");
    type AtomicInput = import("../../lib/server/ai-sketch/first-preview-initiation-contract").PersistInitiationInput;
    type AtomicDependencies = NonNullable<NonNullable<Parameters<
      typeof modules.route.createConceptBriefPostHandler>[0]>["atomicIntake"]>;
    const NOW = 1_785_715_200;
    const NONCE = "atomic_binding_nonce_abcdefghijklmnop";
    const OTHER_ID = "223e4567-e89b-42d3-a456-426614174000";
    const OTHER_REFERENCE = "NOVORA-CB-20260803-ELSE";
    const privateLogs: unknown[][] = [];
    const privacyChecks: { body: unknown; proof: string; digest?: string }[] = [];
    let savedFetch: typeof fetch;
    let savedInfo: typeof console.info;
    let savedWarn: typeof console.warn;
    let savedError: typeof console.error;
    let externalCalls = 0;

    test.beforeEach(() => {
      privateLogs.length = 0; privacyChecks.length = 0; externalCalls = 0;
      savedFetch = globalThis.fetch;
      savedInfo = console.info; savedWarn = console.warn; savedError = console.error;
      globalThis.fetch = async () => { externalCalls++; throw new Error("Live calls forbidden"); };
      console.info = console.warn = console.error = (...args: unknown[]) => { privateLogs.push(args); };
    });
    test.afterEach(() => {
      globalThis.fetch = savedFetch;
      console.info = savedInfo; console.warn = savedWarn; console.error = savedError;
      expect(externalCalls).toBe(0);
      for (const { body, proof, digest } of privacyChecks) {
        const publicData = JSON.stringify({ body, logs: privateLogs });
        for (const value of [proof, digest, SIGNING_SECRET, RATE_SECRET, RATE_TOKEN,
          "binding_digest", "proof_version", "admission_context", "atomicIntent",
          "intent_state", "intent_created", "rl:v1:concept-briefs:ip:"]) {
          if (value) expect(publicData).not.toContain(value);
        }
      }
    });

    function expectedProof(nonce = NONCE) {
      const proof = proofContract.createFirstPreviewCustomerAccessProof({
        briefId: BRIEF_ID, publicReference: PUBLIC_REFERENCE, nonce, issuedAt: NOW,
      }, SIGNING_SECRET);
      if (!proof) throw new Error("Synthetic proof setup failed");
      return proof;
    }
    function expectedDigest(proof: string) {
      return createHash("sha256")
        .update("NOVORA\0first-preview-customer-access-binding\0v1\0sha-256\0", "utf8")
        .update(proof, "utf8").digest("hex");
    }

    function atomicHarness(options: {
      outcome?: "error" | "throw" | "conflict";
      receipt?: Record<string, unknown>;
      evidence?: "missing" | "copied";
      session?: "disabled" | "missing secret" | "invalid nonce";
      noClient?: boolean;
      defaultIdentity?: boolean;
      beforeReturn?: (state: { now: number; signingSecret: string }) => void;
    } = {}) {
      const target = isolatedLimiter();
      const actualRoute = target.loadRoute();
      const calls: { name: string; args: AtomicInput }[] = [];
      const events: string[] = [];
      let nonceCalls = 0, issuerCalls = 0, legacyCalls = 0, triggerCalls = 0, publishCalls = 0;
      const state = { now: NOW, signingSecret: SIGNING_SECRET };
      const session = {
        featureFlagValue: options.session === "disabled" ? "false" : "true",
        get signingSecret() { return options.session === "missing secret" ? null : state.signingSecret; },
        clock: () => state.now,
        nonceSource: () => {
          events.push("prepare"); nonceCalls++;
          return options.session === "invalid nonce" ? "invalid" : NONCE;
        },
        issueSession: () => { issuerCalls++; throw new Error("Atomic path must not mint after commit"); },
      };
      const rpcClient = {
        async rpc(name: string, args: AtomicInput) {
          events.push("rpc");
          expect(issuerCalls).toBe(0);
          expect(nonceCalls).toBe(options.session === "disabled" ||
            options.session === "missing secret" ? 0 : 1);
          calls.push({ name, args: JSON.parse(JSON.stringify(args)) });
          options.beforeReturn?.(state);
          if (options.outcome === "throw") throw new Error(SIGNING_SECRET);
          if (options.outcome === "error") return { data: null, error: { message: SIGNING_SECRET } };
          if (options.outcome === "conflict") return {
            data: { ok: false, code: "identity_conflict" }, error: null,
          };
          events.push("commit");
          return { data: { ok: true, value: {
            persisted: true, concept_brief_id: args.p_concept_brief_id,
            public_reference: args.p_public_reference,
            intent_version: "novora_first_preview_initiation_v1",
            intent_state: args.p_admission_context === null ? "operator_hold" : "pending",
            intent_created: true, ...options.receipt,
          } }, error: null };
        },
      } as unknown as AtomicDependencies["rpcClient"];
      const post = actualRoute.createConceptBriefPostHandler({
        atomicIntake: {
          rpcClient: options.noClient ? null : rpcClient,
          ...(options.defaultIdentity ? {} : {
            identitySource: () => ({ conceptBriefId: BRIEF_ID, publicReference: PUBLIC_REFERENCE }),
          }),
        },
        checkRateLimit: async input => {
          if (options.evidence === "missing") return trustedRateLimitEvidence();
          const result = await target.limiter.checkPublicApiRateLimit(input);
          return options.evidence === "copied" ? { ...result } : result;
        },
        sessionDependencies: session,
        persistSubmission: async () => { legacyCalls++; throw new Error("No legacy fallback"); },
        triggerAutomaticPreview: async () => { triggerCalls++; throw new Error("No direct generation"); },
        triggerDependencies: {
          featureFlagValue: "true", queueExecutionCapabilityValue: "true",
          publisher: { async publish() { publishCalls++; } },
        },
        logAutomaticPreviewDiagnostic: value => privateLogs.push([value]),
      });
      async function submit(payload: unknown = validPayload()) {
        const response = await post(request(payload, { "x-forwarded-for": IP }));
        events.push("response");
        const body = await response.json();
        const context = calls[0]?.args.p_admission_context as {
          access_binding?: { binding_digest: string };
        } | null | undefined;
        privacyChecks.push({ body, proof: expectedProof(), digest: context?.access_binding?.binding_digest });
        expect([legacyCalls, triggerCalls, publishCalls, issuerCalls]).toEqual([0, 0, 0, 0]);
        return { response, body };
      }
      return { submit, calls, events, target, state, counts: () => ({ nonceCalls, issuerCalls }) };
    }

    test("authenticates the preissued proof, binds exact bytes and delivers them only after commit", async () => {
      const h = atomicHarness();
      const { response, body } = await h.submit({
        ...validPayload(), conceptBriefId: OTHER_ID, publicReference: OTHER_REFERENCE,
        p_admission_context: { access_binding: { binding_digest: "f".repeat(64) } },
        atomicIntake: { rpcClient: "client-forged" }, generationAuthorized: true,
      });
      expect(response.status).toBe(201);
      expect(body).toMatchObject({ persisted: true, conceptBriefId: BRIEF_ID, publicReference: PUBLIC_REFERENCE });
      const proof = expectedProof();
      const claims = proofContract.verifyFirstPreviewCustomerAccessProof(proof, SIGNING_SECRET, NOW);
      expect(claims).toMatchObject({ v: 1, scope: "first_preview:read", briefId: BRIEF_ID,
        publicReference: PUBLIC_REFERENCE, nonce: NONCE, iat: NOW, exp: NOW + 1800 });
      expect(h.calls).toHaveLength(1);
      expect(h.calls[0].name).toBe("novora_persist_concept_brief_with_preview_intent");
      expect(Object.keys(h.calls[0].args).sort()).toEqual([
        "p_concept_brief_id", "p_public_reference", "p_brief", "p_contact", "p_admission_context",
      ].sort());
      const context = h.calls[0].args.p_admission_context as {
        access_binding: unknown; ip_key: string; email_key: string;
        key_version: string; rate_policy_version: string;
      };
      expect(expectedDigest(proof)).not.toBe(createHash("sha256").update(proof, "utf8").digest("hex"));
      expect(context.access_binding).toEqual({
        concept_brief_id: BRIEF_ID, public_reference: PUBLIC_REFERENCE,
        proof_version: "1", binding_digest: expectedDigest(proof),
      });
      expect(context.ip_key).toBe(h.target.commands[0][3]);
      expect(context.email_key).toBe(h.target.commands[1][3]);
      expect(context.key_version).toMatch(/^rl-hmac-v1:[a-f0-9]{64}$/);
      expect(context.rate_policy_version).toMatch(/^[a-f0-9]{64}$/);
      expect(JSON.stringify(context)).not.toContain(proof);
      expect(response.cookies.get(proofContract.FIRST_PREVIEW_CUSTOMER_ACCESS_COOKIE_NAME)?.value).toBe(proof);
      expect(response.headers.get("set-cookie")).toMatch(/HttpOnly/i);
      expect(response.headers.get("set-cookie")).toMatch(/Secure/i);
      expect(response.headers.get("set-cookie")).toMatch(/SameSite=strict/i);
      expect(response.headers.get("set-cookie")).toContain("Path=/");
      expect(response.headers.get("set-cookie")).not.toContain(expectedDigest(proof));
      expect(h.events).toEqual(["prepare", "rpc", "commit", "response"]);
      expect(h.counts()).toEqual({ nonceCalls: 1, issuerCalls: 0 });
    });

    test("default server identity ignores customer-selected identity", async () => {
      const h = atomicHarness({ defaultIdentity: true });
      const { response, body } = await h.submit({ ...validPayload(),
        conceptBriefId: OTHER_ID, publicReference: OTHER_REFERENCE });
      expect(response.status).toBe(201);
      const proof = response.cookies.get(proofContract.FIRST_PREVIEW_CUSTOMER_ACCESS_COOKIE_NAME)?.value;
      const claims = proofContract.verifyFirstPreviewCustomerAccessProof(proof!, SIGNING_SECRET, NOW);
      expect(claims?.briefId).toBe(h.calls[0].args.p_concept_brief_id);
      expect(claims?.publicReference).toBe(h.calls[0].args.p_public_reference);
      expect(claims?.briefId).not.toBe(OTHER_ID);
      expect(claims?.publicReference).not.toBe(OTHER_REFERENCE);
      expect(body).toHaveProperty("conceptBriefId", claims?.briefId);
    });

    for (const outcome of ["error", "throw", "conflict"] as const) {
      test(outcome + " never delivers a proof, retries or falls back", async () => {
        const h = atomicHarness({ outcome });
        const { response, body } = await h.submit();
        expect(response.status).toBe(202);
        expect(body).toHaveProperty("persisted", false);
        expect(response.headers.get("set-cookie")).toBeNull();
        expect(h.calls).toHaveLength(1);
        expect(h.counts().nonceCalls).toBe(1);
      });
    }
    for (const [name, receipt] of [
      ["Brief", { concept_brief_id: OTHER_ID }],
      ["reference", { public_reference: OTHER_REFERENCE }],
      ["version", { intent_version: "unknown" }],
    ] as const) {
      test(name + " receipt mismatch never delivers the proof", async () => {
        const h = atomicHarness({ receipt });
        const { response, body } = await h.submit();
        expect(response.status).toBe(202);
        expect(body).toHaveProperty("persisted", false);
        expect(response.headers.get("set-cookie")).toBeNull();
        expect(h.calls).toHaveLength(1);
      });
    }
    for (const intentState of ["pending", "queued", "completed"] as const) {
      test("idempotent " + intentState + " receipt delivers the original proof without another generation", async () => {
        const h = atomicHarness({ receipt: { intent_state: intentState, intent_created: false } });
        const { response } = await h.submit();
        expect(response.status).toBe(201);
        expect(response.cookies.get(proofContract.FIRST_PREVIEW_CUSTOMER_ACCESS_COOKIE_NAME)?.value)
          .toBe(expectedProof());
        expect(h.counts()).toEqual({ nonceCalls: 1, issuerCalls: 0 });
        expect(h.calls).toHaveLength(1);
      });
    }
    for (const evidence of ["missing", "copied"] as const) {
      test(evidence + " limiter authority preserves NULL-context hold and denies cookie delivery", async () => {
        const h = atomicHarness({ evidence });
        const { response, body } = await h.submit({ ...validPayload(),
          p_admission_context: { access_binding: { proof_version: "1", binding_digest: "f".repeat(64) } },
          generationAuthorized: true });
        expect(h.calls[0].args.p_admission_context).toBeNull();
        expect(response.status).toBe(201);
        expect(body).toHaveProperty("persisted", true);
        expect(response.headers.get("set-cookie")).toBeNull();
      });
    }
    test("NULL context cannot accept a forged pending receipt", async () => {
      const h = atomicHarness({ evidence: "missing", receipt: { intent_state: "pending" } });
      const { response } = await h.submit();
      expect(response.status).toBe(202);
      expect(response.headers.get("set-cookie")).toBeNull();
    });
    for (const session of ["disabled", "missing secret", "invalid nonce"] as const) {
      test(session + " cannot create bound pending context", async () => {
        const h = atomicHarness({ session });
        const { response, body } = await h.submit();
        expect(h.calls[0].args.p_admission_context).toBeNull();
        expect(body).toHaveProperty("persisted", true);
        expect(response.status).toBe(201);
        expect(response.headers.get("set-cookie")).toBeNull();
      });
    }
    test("database operator_hold preserves receipt and viewing proof without paid authority", async () => {
      const h = atomicHarness({ receipt: { intent_state: "operator_hold" } });
      const { response, body } = await h.submit();
      expect(response.status).toBe(201);
      expect(body).toHaveProperty("persisted", true);
      expect(response.cookies.get(proofContract.FIRST_PREVIEW_CUSTOMER_ACCESS_COOKIE_NAME)?.value)
        .toBe(expectedProof());
    });
    for (const change of ["expiry", "key rotation"] as const) {
      test(change + " after RPC preserves persisted truth but denies proof delivery", async () => {
        const h = atomicHarness({ beforeReturn: state => {
          if (change === "expiry") state.now = NOW + 1800;
          else state.signingSecret = SIGNING_SECRET + "-rotated";
        } });
        const { response, body } = await h.submit();
        expect(response.status).toBe(201);
        expect(body).toHaveProperty("persisted", true);
        expect(response.headers.get("set-cookie")).toBeNull();
        expect(h.counts()).toEqual({ nonceCalls: 1, issuerCalls: 0 });
      });
    }
    test("missing explicit RPC capability denies without legacy fallback", async () => {
      const h = atomicHarness({ noClient: true });
      const { response } = await h.submit();
      expect(response.status).toBe(202);
      expect(response.headers.get("set-cookie")).toBeNull();
      expect(h.calls).toHaveLength(0);
    });

    test("forged, substituted and mismatched proof/binding cannot pass actual cookie delivery", async () => {
      const identity = { conceptBriefId: BRIEF_ID, publicReference: PUBLIC_REFERENCE };
      const session = sessionDependencies();
      const prepared = cookieIntegration.prepareFirstPreviewCustomerProof(identity, session)!;
      expect(prepared).not.toBeNull();
      const parts = prepared.proof.split(".");
      const tampered = parts[0] + "." + (parts[1][0] === "A" ? "B" : "A") + parts[1].slice(1);
      const forged = proofContract.createFirstPreviewCustomerAccessProof({
        briefId: BRIEF_ID, publicReference: PUBLIC_REFERENCE, nonce: NONCE, issuedAt: NOW,
      }, SIGNING_SECRET + "-forged")!;
      const variants = [
        { ...prepared, proof: tampered },
        { ...prepared, proof: forged },
        { ...prepared, proof: expectedProof("substituted_nonce_abcdefghijklmnop") },
        ...[
          { concept_brief_id: OTHER_ID }, { public_reference: OTHER_REFERENCE },
          { proof_version: "2" }, { binding_digest: "f".repeat(64) },
          { binding_digest: "ABC" }, { binding_digest: prepared.binding.binding_digest.toUpperCase() },
        ].map(value => ({ ...prepared, binding: { ...prepared.binding, ...value } })),
      ];
      for (const bad of variants) {
        const response = modules.route.createPersistedConceptBriefResponse(
          { persisted: true, ...identity }, session, bad,
        );
        expect(response.status).toBe(201);
        expect(response.headers.get("set-cookie")).toBeNull();
        privacyChecks.push({ body: await response.json(), proof: bad.proof,
          digest: bad.binding.binding_digest });
      }
      for (const identity of [
        { conceptBriefId: OTHER_ID, publicReference: PUBLIC_REFERENCE },
        { conceptBriefId: BRIEF_ID, publicReference: OTHER_REFERENCE },
      ]) {
        const response = modules.route.createPersistedConceptBriefResponse(
          { persisted: true, ...identity }, session, prepared,
        );
        expect(response.headers.get("set-cookie")).toBeNull();
      }
    });

    test("cookie sink failure leaves committed success intact", async () => {
      const identity = { conceptBriefId: BRIEF_ID, publicReference: PUBLIC_REFERENCE };
      const session = sessionDependencies();
      const prepared = cookieIntegration.prepareFirstPreviewCustomerProof(identity, session)!;
      const response = { persisted: true, cookies: { set() { throw new Error(SIGNING_SECRET); } } };
      expect(cookieIntegration.attachPreparedFirstPreviewCustomerSessionCookie(
        response, { persisted: true, ...identity }, prepared, session,
      )).toBe(response);
      expect(response.persisted).toBe(true);
      expect(privateLogs).toEqual([]);
    });

    test("legacy route ignores atomic client fields and keeps its original session behavior", async () => {
      let nonceCalls = 0, persistCalls = 0, triggerCalls = 0;
      const session = { ...sessionDependencies(), nonceSource: () => { nonceCalls++; return NONCE; } };
      const post = modules.route.createConceptBriefPostHandler({
        checkRateLimit: allowRateLimit,
        persistSubmission: () => { persistCalls++; return persistenceSuccess(); },
        sessionDependencies: session,
        triggerAutomaticPreview: async () => {
          triggerCalls++; return { status: "not_enqueued", reason: "generation_admission_unverified" };
        },
        logAutomaticPreviewDiagnostic: () => {},
      });
      const response = await post(request({ ...validPayload(),
        atomicIntake: { rpcClient: true }, atomicIntent: { state: "pending" },
        conceptBriefId: OTHER_ID, p_admission_context: { access_binding: { binding_digest: "f".repeat(64) } },
      }));
      expect(response.status).toBe(201);
      expect(response.cookies.get(proofContract.FIRST_PREVIEW_CUSTOMER_ACCESS_COOKIE_NAME)?.value)
        .toBe(expectedProof());
      expect([persistCalls, triggerCalls, nonceCalls]).toEqual([1, 1, 1]);
      privacyChecks.push({ body: await response.json(), proof: expectedProof() });
    });
  });

  function limiterInput(subject: "ip" | "email") {
    return { routeName: ROUTE, request: request(validPayload(), {
      "x-forwarded-for": `${IP}, 192.0.2.45`, "x-novora-redis-key": "client-forged-key",
    }), policy: POLICY, normalizedEmail: subject === "email" ? EMAIL : undefined };
  }

  for (const subject of ["ip", "email"] as const) {
    test(`returns the exact ${subject} key sent by actual successful HMAC enforcement`, async () => {
      const target = isolatedLimiter();
      const result = await target.limiter.checkPublicApiRateLimit(limiterInput(subject));
      const expectedKey = `${POLICY.keyPrefix}:${subject}:${createHmac("sha256", RATE_SECRET)
        .update(`${ROUTE}:${subject}:${subject === "ip" ? IP : EMAIL}`).digest("hex").slice(0, 48)}`;
      expect(target.commands).toHaveLength(1);
      expect(target.commands[0][0]).toBe("EVAL");
      expect(target.commands[0].slice(2)).toEqual(["1", expectedKey, "600"]);
      expect(result.keyProvenance).toEqual({ redisKey: target.commands[0][3], subject, derivation: "hmac_sha256" });
      expect(result).toMatchObject({ allowed: true, mode: "enforced", reason: "within_limit",
        headers: { "X-RateLimit-Limit": "30", "X-RateLimit-Remaining": "29" } });
      expect(Object.keys(result).sort()).toEqual(["allowed", "mode", "reason", "headers", "keyProvenance"].sort());
      expect(JSON.stringify(result.keyProvenance)).not.toContain(IP);
      expect(JSON.stringify(result.keyProvenance)).not.toContain(EMAIL);
      expect(JSON.stringify(result)).not.toContain(RATE_SECRET);
      expect(JSON.stringify(result)).not.toContain(RATE_TOKEN);
      expect(target.warnings).toEqual([]);
    });

    test(`retains ${subject} denial and retry headers with factual key provenance, not permission`, async () => {
      const target = isolatedLimiter({ result: "31:600" });
      const result = await target.limiter.checkPublicApiRateLimit(limiterInput(subject));
      expect(result).toMatchObject({ allowed: false, mode: "enforced", reason: "rate_limit_exceeded",
        retryAfterSeconds: 600, headers: { "Retry-After": "600", "X-RateLimit-Remaining": "0" } });
      expect(result.keyProvenance).toEqual({ redisKey: target.commands[0][3], subject, derivation: "hmac_sha256" });
      expect(result).not.toHaveProperty("generationAuthorized");
      expect(result).not.toHaveProperty("admission_context");
    });
  }

  test("preserves the existing unsigned IP fallback and labels its actual derivation without inventing HMAC authority", async () => {
    const target = isolatedLimiter({ env: {
      UPSTASH_REDIS_REST_URL: syntheticEnvironment.UPSTASH_REDIS_REST_URL,
      UPSTASH_REDIS_REST_TOKEN: RATE_TOKEN,
    } });
    const result = await target.limiter.checkPublicApiRateLimit(limiterInput("ip"));
    const key = `${POLICY.keyPrefix}:ip:${createHash("sha256").update(`${ROUTE}:ip:${IP}`).digest("hex").slice(0, 48)}`;
    expect(result).toMatchObject({ allowed: true, mode: "enforced", reason: "within_limit" });
    expect(result.keyProvenance).toEqual({ redisKey: key, subject: "ip", derivation: "sha256" });
    expect(target.commands[0][3]).toBe(key);
    expect(Object.keys(result.keyProvenance!).sort()).toEqual(["redisKey", "subject", "derivation"].sort());
    expect(result).not.toHaveProperty("generationAuthorized");
  });

  test("keeps provenance bound to the submitted key across asynchronous synthetic configuration changes", async () => {
    const target = isolatedLimiter({ beforeResponse: env => { env.NOVORA_INTERNAL_SIGNING_SECRET = "changed-synthetic-secret"; } });
    const result = await target.limiter.checkPublicApiRateLimit(limiterInput("email"));
    expect(result.keyProvenance?.redisKey).toBe(target.commands[0][3]);
    expect(result.keyProvenance?.redisKey).toBe(`${POLICY.keyPrefix}:email:${createHmac("sha256", RATE_SECRET)
      .update(`${ROUTE}:email:${EMAIL}`).digest("hex").slice(0, 48)}`);
  });

  for (const condition of ["disabled", "incomplete provider", "missing email secret", "http", "command", "malformed", "transport"] as const) {
    test(`${condition} remains fail-open intake without successful-enforcement provenance or paid authority`, async () => {
      const disabled = condition === "disabled" || condition === "incomplete provider" || condition === "missing email secret";
      const env = condition === "disabled" ? {}
        : condition === "incomplete provider" ? { UPSTASH_REDIS_REST_URL: syntheticEnvironment.UPSTASH_REDIS_REST_URL }
        : condition === "missing email secret" ? {
          UPSTASH_REDIS_REST_URL: syntheticEnvironment.UPSTASH_REDIS_REST_URL,
          UPSTASH_REDIS_REST_TOKEN: RATE_TOKEN,
        } : syntheticEnvironment;
      const failure = condition === "http" || condition === "command" || condition === "malformed" || condition === "transport"
        ? condition : undefined;
      const target = isolatedLimiter({ env, failure });
      const result = await target.limiter.checkPublicApiRateLimit(limiterInput(condition === "missing email secret" ? "email" : "ip"));
      expect(result).toMatchObject({ allowed: true, mode: disabled ? "disabled" : "provider_error",
        reason: condition === "missing email secret" ? "email_signing_secret_missing" : disabled ? "provider_env_missing" : "provider_error" });
      expect(result).not.toHaveProperty("keyProvenance");
      expect(result).not.toHaveProperty("generationAuthorized");
      expect(result).not.toHaveProperty("admission_context");
      expect(target.commands).toHaveLength(disabled ? 0 : 1);
      for (const value of [IP, EMAIL, RATE_SECRET, RATE_TOKEN, String(target.commands[0]?.[3] ?? "client-forged-key")]) {
        expect(JSON.stringify({ result, warnings: target.warnings })).not.toContain(value);
      }
    });
  }

  for (const condition of ["within limit", "denied", "provider error", "disabled", "missing email secret"] as const) {
    test(`actual route preserves ${condition} intake and never exposes private provenance or bypasses paid admission`, async () => {
      const target = isolatedLimiter({
        env: condition === "disabled" ? {} : condition === "missing email secret" ? {
          UPSTASH_REDIS_REST_URL: syntheticEnvironment.UPSTASH_REDIS_REST_URL,
          UPSTASH_REDIS_REST_TOKEN: RATE_TOKEN,
        } : syntheticEnvironment,
        result: condition === "denied" ? "31:600" : "1:600",
        failure: condition === "provider error" ? "http" : undefined,
      });
      const paid = createSyntheticPaidAdmission();
      paid.state.raw = "";
      const evidence: RateLimitResult[] = [];
      const diagnostics: unknown[] = [];
      let persistenceCalls = 0, triggerCalls = 0, publishCalls = 0;
      const post = modules.route.createConceptBriefPostHandler({
        checkRateLimit: async input => {
          const result = await target.limiter.checkPublicApiRateLimit(input);
          evidence.push(result);
          return result;
        },
        persistSubmission: () => { persistenceCalls++; return persistenceSuccess(); },
        sessionDependencies: sessionDependencies(),
        triggerAutomaticPreview: async (input, dependencies) => {
          triggerCalls++;
          return modules.trigger.triggerAutomaticFirstPreviewAfterPersistence(input, dependencies);
        },
        triggerDependencies: {
          featureFlagValue: "true", queueExecutionCapabilityValue: "true", paidAdmission: paid.admission,
          publisher: { async publish() { publishCalls++; } },
        },
        logAutomaticPreviewDiagnostic: diagnostic => diagnostics.push(diagnostic),
      });
      const response = await post(request(validPayload(), { "x-forwarded-for": IP }));
      const body = await response.json();
      expect(response.status).toBe(condition === "denied" ? 429 : 201);
      expect(persistenceCalls).toBe(condition === "denied" ? 0 : 1);
      expect(publishCalls).toBe(0);
      expect(triggerCalls).toBe(condition === "within limit" ? 1 : 0);
      if (condition !== "denied") {
        const expected = expectedPersistedReceipt();
        expect(body).toEqual(await expected.json());
        expect(response.headers.get("set-cookie")).toBe(expected.headers.get("set-cookie"));
      } else {
        expect(body).toMatchObject({ persisted: false });
        expect(response.headers.get("retry-after")).toBe("600");
      }
      if (condition === "within limit") {
        expect(evidence.map(item => item.keyProvenance?.subject)).toEqual(["ip", "email"]);
        expect(diagnostics).toEqual([{ publicReference: PUBLIC_REFERENCE, status: "not_enqueued", reason: "generation_admission_unverified" }]);
      }
      const publicOutput = JSON.stringify({ body, headers: [...response.headers], diagnostics, warnings: target.warnings });
      for (const value of [IP, EMAIL, RATE_SECRET, RATE_TOKEN, ...target.commands.map(command => String(command[3]))]) {
        expect(publicOutput).not.toContain(value);
      }
      expect(body).not.toHaveProperty("keyProvenance");
      expect(body).not.toHaveProperty("generationAuthorized");
    });
  }
  test.describe("Rate policy version binding", () => {
    const IP_POLICY = { limit: 30, windowSeconds: 600, keyPrefix: "rl:v1:concept-briefs" };
    const EMAIL_POLICY = { limit: 5, windowSeconds: 3600, keyPrefix: "rl:v1:concept-briefs" };

    function version(target = isolatedLimiter(), routeName = ROUTE, ip = IP_POLICY, email = EMAIL_POLICY) {
      return target.limiter.derivePublicApiRatePolicyVersion(routeName, ip, email);
    }

    async function enforcedPair(target = isolatedLimiter()) {
      const req = request(validPayload(), { "x-forwarded-for": IP });
      const context = { routeName: ROUTE, request: req, ipPolicy: { ...IP_POLICY }, emailPolicy: { ...EMAIL_POLICY } };
      const ipResult = await target.limiter.checkPublicApiRateLimit({ routeName: ROUTE, request: req, policy: context.ipPolicy });
      const emailResult = await target.limiter.checkPublicApiRateLimit({ routeName: ROUTE, request: req, policy: context.emailPolicy, normalizedEmail: EMAIL });
      return { target, input: { ...context, ipResult, emailResult } };
    }

    test("uses stable canonical effective configuration rather than object order or an arbitrary version label", () => {
      const target = isolatedLimiter();
      const actual = version(target);
      expect(actual).toMatch(/^[a-f0-9]{64}$/);
      expect(target.limiter.derivePublicApiRatePolicyVersion(ROUTE,
        { keyPrefix: IP_POLICY.keyPrefix, windowSeconds: 600, limit: 30 },
        { windowSeconds: 3600, keyPrefix: EMAIL_POLICY.keyPrefix, limit: 5 })).toBe(actual);
      expect(version(target)).toBe(actual);
      expect(target.commands).toEqual([]);
    });

    for (const field of ["route", "ip limit", "ip window", "ip prefix", "email limit", "email window", "email prefix"]) {
      test(`changes identity when effective ${field} changes`, () => {
        const target = isolatedLimiter(), ip = { ...IP_POLICY }, email = { ...EMAIL_POLICY };
        if (field === "ip limit") ip.limit++;
        if (field === "ip window") ip.windowSeconds++;
        if (field === "ip prefix") ip.keyPrefix += ":changed";
        if (field === "email limit") email.limit++;
        if (field === "email window") email.windowSeconds++;
        if (field === "email prefix") email.keyPrefix += ":changed";
        expect(version(target, field === "route" ? "/api/changed" : ROUTE, ip, email)).not.toBe(version(target));
      });
    }

    for (const [name, from, to] of [
      ["Redis enforcement script", 'redis.call("INCR", KEYS[1])', 'redis.call("INCRBY", KEYS[1], 2)'],
      ["hash algorithm", 'algorithm: "sha256", hexLength: 48', 'algorithm: "sha512", hexLength: 48'],
      ["digest truncation", 'hexLength: 48', 'hexLength: 40'],
      ["key framing", 'separator: ":"', 'separator: "|"'],
      ["IP header precedence", '["x-forwarded-for", "x-vercel-forwarded-for"]', '["x-vercel-forwarded-for", "x-forwarded-for"]'],
      ["email normalization", 'trimEmail: true, lowercaseEmail: true', 'trimEmail: false, lowercaseEmail: true'],
      ["inclusive limit boundary", 'const ALLOW_AT_LIMIT = true;', 'const ALLOW_AT_LIMIT = false;'],
    ]) {
      test(`binds the version to actual ${name} implementation semantics`, () => {
        const changed = isolatedLimiter({ transformSource: source => {
          expect(source).toContain(from);
          return source.replace(from, to);
        } });
        expect(version(changed)).not.toBe(version());
      });
    }

    test("ignores harmless Redis-script whitespace and line comments", () => {
      const changed = isolatedLimiter({ transformSource: source => source.replace(
        'local current = redis.call("INCR", KEYS[1])',
        'local   current = redis.call( "INCR", KEYS[1] ) -- formatting only',
      ) });
      expect(version(changed)).toBe(version());
    });

    test("excludes signing-secret and transport-token values from policy identity", () => {
      const changed = isolatedLimiter({ env: { ...syntheticEnvironment,
        NOVORA_INTERNAL_SIGNING_SECRET: "different-synthetic-signing-material",
        UPSTASH_REDIS_REST_TOKEN: "different-synthetic-token",
      } });
      expect(version(changed)).toBe(version());
      expect(changed.commands).toEqual([]);
    });

    test("combines only genuine successful IP and email operations for the exact request and policies", async () => {
      const { target, input } = await enforcedPair();
      const evidence = target.limiter.readEnforcedPublicApiRatePolicy(input);
      expect(evidence).toEqual({ rate_policy_version: version(target),
        key_version: "rl-hmac-v1:" + createHmac("sha256", RATE_SECRET)
          .update("NOVORA:first-preview:limiter-key-version:v1", "utf8").digest("hex"),
        ip: input.ipResult.keyProvenance, email: input.emailResult.keyProvenance });
      expect(target.commands[0][3]).toBe(evidence!.ip.redisKey);
      expect(target.commands[1][3]).toBe(evidence!.email.redisKey);
      expect(target.commands[0][4]).toBe("600");
      expect(target.commands[1][4]).toBe("3600");
      expect(evidence!.ip.derivation).toBe("hmac_sha256");
      expect(evidence!.email.derivation).toBe("hmac_sha256");
      expect(Object.keys(evidence!).sort()).toEqual(["rate_policy_version", "key_version", "ip", "email"].sort());
    });

    for (const condition of ["status only", "copied result", "wrong request", "wrong route", "wrong IP policy", "wrong email policy", "swapped subjects", "missing result", "forged provenance"]) {
      test(`rejects ${condition} as combined positive evidence`, async () => {
        const { target, input } = await enforcedPair();
        const candidate = { ...input };
        if (condition === "status only") candidate.ipResult = { ...trustedRateLimitEvidence() };
        if (condition === "copied result") candidate.ipResult = { ...input.ipResult };
        if (condition === "wrong request") candidate.request = request(validPayload(), { "x-forwarded-for": IP });
        if (condition === "wrong route") candidate.routeName = "/api/elsewhere";
        if (condition === "wrong IP policy") candidate.ipPolicy = { ...IP_POLICY, windowSeconds: 601 };
        if (condition === "wrong email policy") candidate.emailPolicy = { ...EMAIL_POLICY, limit: 6 };
        if (condition === "swapped subjects") [candidate.ipResult, candidate.emailResult] = [input.emailResult, input.ipResult];
        if (condition === "missing result") candidate.emailResult = undefined;
        if (condition === "forged provenance") candidate.ipResult = {
          ...trustedRateLimitEvidence(), keyProvenance: input.ipResult.keyProvenance,
        };
        expect(target.limiter.readEnforcedPublicApiRatePolicy(candidate)).toBeNull();
      });
    }

    test("rejects a tampered genuine result and does not read provenance getters", async () => {
      const { target, input } = await enforcedPair();
      let getterReads = 0;
      Object.defineProperty(input.ipResult, "keyProvenance", { get() { getterReads++; return input.emailResult.keyProvenance; } });
      expect(target.limiter.readEnforcedPublicApiRatePolicy(input)).toBeNull();
      expect(getterReads).toBe(0);
    });

    test("withholds evidence if the policy changes while an operation is awaiting a response", async () => {
      const policy = { ...IP_POLICY };
      const target = isolatedLimiter({ beforeResponse: () => { policy.limit++; } });
      const req = request(validPayload(), { "x-forwarded-for": IP });
      const ipResult = await target.limiter.checkPublicApiRateLimit({ routeName: ROUTE, request: req, policy });
      const emailResult = await target.limiter.checkPublicApiRateLimit({ routeName: ROUTE, request: req, policy: EMAIL_POLICY, normalizedEmail: EMAIL });
      expect(ipResult.allowed).toBe(true);
      expect(target.limiter.readEnforcedPublicApiRatePolicy({ routeName: ROUTE, request: req, ipPolicy: policy, emailPolicy: EMAIL_POLICY, ipResult, emailResult })).toBeNull();
    });

    for (const result of ["0:600", "0.5:600", "1:-1", "1:0", "1:601", "1:600:extra", " 1:600", [1, 600]]) {
      test(`preserves legacy intake parsing but withholds positive evidence for unverified counter ${result}`, async () => {
        const { target, input } = await enforcedPair(isolatedLimiter({ result }));
        expect(input.ipResult.allowed).toBe(true);
        expect(input.emailResult.allowed).toBe(true);
        expect(target.limiter.readEnforcedPublicApiRatePolicy(input)).toBeNull();
      });
    }

    test("unsigned IP fallback cannot be combined with an independently genuine HMAC email result", async () => {
      let calls = 0;
      const target = isolatedLimiter({
        env: { UPSTASH_REDIS_REST_URL: syntheticEnvironment.UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN: RATE_TOKEN },
        beforeResponse: env => { if (++calls === 1) env.NOVORA_INTERNAL_SIGNING_SECRET = RATE_SECRET; },
      });
      const { input } = await enforcedPair(target);
      expect(input.ipResult.keyProvenance?.derivation).toBe("sha256");
      expect(input.emailResult.keyProvenance?.derivation).toBe("hmac_sha256");
      expect(target.limiter.readEnforcedPublicApiRatePolicy(input)).toBeNull();
    });


    test.describe("Limiter key version binding", () => {
      const ROTATED_SECRET = "synthetic-rotated-rate-signing-secret-only";
      function keyVersion(secret = RATE_SECRET) {
        return "rl-hmac-v1:" + createHmac("sha256", secret)
          .update("NOVORA:first-preview:limiter-key-version:v1", "utf8").digest("hex");
      }

      test("combines genuine same-secret evidence with the approved key version", async () => {
        const { target, input } = await enforcedPair();
        const evidence = target.limiter.readEnforcedPublicApiRatePolicy(input);
        expect(evidence?.key_version).toBe(keyVersion());
        expect(evidence?.rate_policy_version).toBe(version(target));
        expect(evidence?.key_version).toMatch(/^rl-hmac-v1:[a-f0-9]{64}$/);
        expect(input.ipResult).not.toHaveProperty("key_version");
        expect(input.emailResult).not.toHaveProperty("key_version");
        expect(evidence).not.toHaveProperty("generationAuthorized");
      });

      test("a changed signing secret changes key identity without changing policy identity", async () => {
        const original = await enforcedPair();
        const rotated = await enforcedPair(isolatedLimiter({ env: {
          ...syntheticEnvironment, NOVORA_INTERNAL_SIGNING_SECRET: ROTATED_SECRET,
        } }));
        const oldEvidence = original.target.limiter.readEnforcedPublicApiRatePolicy(original.input);
        const newEvidence = rotated.target.limiter.readEnforcedPublicApiRatePolicy(rotated.input);
        expect(oldEvidence?.key_version).toBe(keyVersion());
        expect(newEvidence?.key_version).toBe(keyVersion(ROTATED_SECRET));
        expect(newEvidence?.key_version).not.toBe(oldEvidence?.key_version);
        expect(newEvidence?.rate_policy_version).toBe(oldEvidence?.rate_policy_version);
      });

      test("key identity uses the exact Redis-key secret snapshot across each await", async () => {
        let restoreSnapshot = () => {};
        const target = isolatedLimiter({ beforeResponse: env => {
          restoreSnapshot = () => { env.NOVORA_INTERNAL_SIGNING_SECRET = RATE_SECRET; };
          env.NOVORA_INTERNAL_SIGNING_SECRET = ROTATED_SECRET;
        } });
        const req = request(validPayload(), { "x-forwarded-for": IP });
        const ipResult = await target.limiter.checkPublicApiRateLimit({
          routeName: ROUTE, request: req, policy: IP_POLICY,
        });
        restoreSnapshot();
        const emailResult = await target.limiter.checkPublicApiRateLimit({
          routeName: ROUTE, request: req, policy: EMAIL_POLICY, normalizedEmail: EMAIL,
        });
        // Producer snapshot binding is tested with the same key current at consumption.
        restoreSnapshot();
        const evidence = target.limiter.readEnforcedPublicApiRatePolicy({
          routeName: ROUTE, request: req, ipPolicy: IP_POLICY, emailPolicy: EMAIL_POLICY,
          ipResult, emailResult,
        });
        expect(evidence?.key_version).toBe(keyVersion());
        for (const [index, subject, value] of [[0, "ip", IP], [1, "email", EMAIL]] as const) {
          const expectedKey = POLICY.keyPrefix + ":" + subject + ":" +
            createHmac("sha256", RATE_SECRET).update(ROUTE + ":" + subject + ":" + value)
              .digest("hex").slice(0, 48);
          expect(target.commands[index][3]).toBe(expectedKey);
        }
      });

      test("rotation between genuine same-request operations withholds combined authority", async () => {
        const { target, input } = await enforcedPair(isolatedLimiter({
          beforeResponse: env => { env.NOVORA_INTERNAL_SIGNING_SECRET = ROTATED_SECRET; },
        }));
        expect(input.ipResult).toMatchObject(trustedRateLimitEvidence());
        expect(input.emailResult).toMatchObject(trustedRateLimitEvidence());
        expect(target.commands[0][3]).toBe(POLICY.keyPrefix + ":ip:" +
          createHmac("sha256", RATE_SECRET).update(ROUTE + ":ip:" + IP).digest("hex").slice(0, 48));
        expect(target.commands[1][3]).toBe(POLICY.keyPrefix + ":email:" +
          createHmac("sha256", ROTATED_SECRET).update(ROUTE + ":email:" + EMAIL).digest("hex").slice(0, 48));
        expect(target.limiter.readEnforcedPublicApiRatePolicy(input)).toBeNull();
      });

      test("a supplied matching version cannot turn copied or forged results into authority", async () => {
        const { target, input } = await enforcedPair();
        for (const ipResult of [
          { ...input.ipResult, key_version: keyVersion() },
          { ...trustedRateLimitEvidence(), keyProvenance: input.ipResult.keyProvenance, key_version: keyVersion() },
        ]) {
          expect(target.limiter.readEnforcedPublicApiRatePolicy({ ...input, ipResult })).toBeNull();
        }
      });

      for (const condition of ["disabled", "provider error", "unsigned", "blank secret"] as const) {
        test(condition + " preserves intake without positive key-version evidence", async () => {
          const env: Record<string, string> = condition === "disabled" ? {} : { ...syntheticEnvironment };
          if (condition === "unsigned") delete env.NOVORA_INTERNAL_SIGNING_SECRET;
          if (condition === "blank secret") env.NOVORA_INTERNAL_SIGNING_SECRET = "   ";
          const { target, input } = await enforcedPair(isolatedLimiter({
            env, failure: condition === "provider error" ? "http" : undefined,
          }));
          expect(input.ipResult.allowed).toBe(true);
          expect(input.emailResult.allowed).toBe(true);
          expect(target.limiter.readEnforcedPublicApiRatePolicy(input)).toBeNull();
          expect(input.ipResult).not.toHaveProperty("key_version");
          expect(input.emailResult).not.toHaveProperty("key_version");
        });
      }


      test.describe("Limiter current-key consumer recheck", () => {
        for (const condition of ["unchanged", "rotated", "missing", "blank", "unreadable"] as const) {
          test(condition + " current signing authority is checked after both operations", async () => {
            let currentEnvironment: Record<string, string> = {};
            const { target, input } = await enforcedPair(isolatedLimiter({
              beforeResponse: env => { currentEnvironment = env; },
            }));
            expect(target.limiter.readEnforcedPublicApiRatePolicy(input)?.key_version).toBe(keyVersion());
            if (condition === "rotated") currentEnvironment.NOVORA_INTERNAL_SIGNING_SECRET = ROTATED_SECRET;
            if (condition === "missing") delete currentEnvironment.NOVORA_INTERNAL_SIGNING_SECRET;
            if (condition === "blank") currentEnvironment.NOVORA_INTERNAL_SIGNING_SECRET = "   ";
            if (condition === "unreadable") Object.defineProperty(currentEnvironment,
              "NOVORA_INTERNAL_SIGNING_SECRET", { get() { throw new Error(ROTATED_SECRET); } });
            const evidence = target.limiter.readEnforcedPublicApiRatePolicy(input);
            if (condition === "unchanged") expect(evidence?.key_version).toBe(keyVersion());
            else expect(evidence).toBeNull();
            expect(input.ipResult).toMatchObject(trustedRateLimitEvidence());
            expect(input.emailResult).toMatchObject(trustedRateLimitEvidence());
            expect(target.commands).toHaveLength(2);
            expect(target.warnings).toEqual([]);
          });
        }

        test("caller-supplied current versions cannot replace stale private receipts", async () => {
          let currentEnvironment: Record<string, string> = {};
          const { target, input } = await enforcedPair(isolatedLimiter({
            beforeResponse: env => { currentEnvironment = env; },
          }));
          currentEnvironment.NOVORA_INTERNAL_SIGNING_SECRET = ROTATED_SECRET;
          const suppliedVersion = keyVersion(ROTATED_SECRET);
          Object.assign(input.ipResult, { key_version: suppliedVersion });
          Object.assign(input.emailResult, { key_version: suppliedVersion });
          for (const pair of [
            { ipResult: input.ipResult, emailResult: input.emailResult },
            { ipResult: { ...input.ipResult }, emailResult: { ...input.emailResult } },
            {
              ipResult: { ...trustedRateLimitEvidence(), key_version: suppliedVersion,
                keyProvenance: input.ipResult.keyProvenance },
              emailResult: { ...trustedRateLimitEvidence(), key_version: suppliedVersion,
                keyProvenance: input.emailResult.keyProvenance },
            },
          ]) {
            const candidate = { ...input, ...pair, key_version: suppliedVersion };
            expect(target.limiter.readEnforcedPublicApiRatePolicy(candidate)).toBeNull();
          }
          expect(target.commands).toHaveLength(2);
          expect(target.warnings).toEqual([]);
        });
      });

      for (const rotated of [false, true, "after operations", "missing current secret"] as const) {
        test("actual route keeps private key versions and default intake unchanged; rotated=" + rotated, async () => {
          let currentEnvironment: Record<string, string> = {};
          const target = isolatedLimiter({ beforeResponse: env => {
            currentEnvironment = env;
            if (rotated === true) env.NOVORA_INTERNAL_SIGNING_SECRET = ROTATED_SECRET;
          } });
          const actualRoute = target.loadRoute();
          const paid = createSyntheticPaidAdmission();
          paid.state.raw = "";
          const privateEvidence: (import("../../lib/server/public-api-rate-limit").EnforcedPublicApiRatePolicy | null)[] = [];
          const diagnostics: unknown[] = [];
          let persistenceCalls = 0, queueCalls = 0;
          const post = actualRoute.createConceptBriefPostHandler({
            checkRateLimit: async input => {
              const result = await target.limiter.checkPublicApiRateLimit(input);
              if (input.normalizedEmail) {
                // Both successful receipts already exist before changing this synthetic authority.
                if (rotated === "after operations") currentEnvironment.NOVORA_INTERNAL_SIGNING_SECRET = ROTATED_SECRET;
                if (rotated === "missing current secret") delete currentEnvironment.NOVORA_INTERNAL_SIGNING_SECRET;
              }
              return result;
            },
            persistSubmission: (_payload, evidence) => {
              persistenceCalls++;
              privateEvidence.push(evidence ?? null);
              return persistenceSuccess();
            },
            sessionDependencies: sessionDependencies(),
            triggerAutomaticPreview: modules.trigger.triggerAutomaticFirstPreviewAfterPersistence,
            triggerDependencies: {
              featureFlagValue: "true", queueExecutionCapabilityValue: "true",
              paidAdmission: paid.admission, publisher: { async publish() { queueCalls++; } },
            },
            logAutomaticPreviewDiagnostic: value => diagnostics.push(value),
          });
          const response = await post(request(validPayload(), {
            "x-forwarded-for": IP, "x-key-version": "client-forged-version",
          }));
          const body = await response.json(), expected = expectedPersistedReceipt();
          expect(response.status).toBe(201);
          expect(body).toEqual(await expected.json());
          expect(response.headers.get("set-cookie")).toBe(expected.headers.get("set-cookie"));
          expect(persistenceCalls).toBe(1);
          if (rotated) expect(privateEvidence).toEqual([null]);
          else expect(privateEvidence[0]?.key_version).toBe(keyVersion());
          expect(diagnostics).toEqual([{ publicReference: PUBLIC_REFERENCE,
            status: "not_enqueued", reason: "generation_admission_unverified" }]);
          expect(queueCalls).toBe(0);
          expect(paid.state.raw).toBe("");
          const publicOutput = JSON.stringify({ body, headers: [...response.headers],
            diagnostics, warnings: target.warnings });
          for (const value of [RATE_SECRET, ROTATED_SECRET, RATE_TOKEN, keyVersion(),
            keyVersion(ROTATED_SECRET), createHash("sha256").update(RATE_SECRET).digest("hex"),
            ...target.commands.map(command => String(command[3]))]) {
            expect(publicOutput).not.toContain(value);
          }
          expect(body).not.toHaveProperty("key_version");
        });
      }
    });

    for (const condition of ["enforced", "status only", "copied", "disabled", "provider error", "missing secret", "malformed", "held", "denied", "persistence failure"] as const) {
      test(`actual route preserves ${condition} behavior with private policy metadata and no paid effect`, async () => {
        const target = isolatedLimiter({
          env: condition === "disabled" ? {} : condition === "missing secret" ? {
            UPSTASH_REDIS_REST_URL: syntheticEnvironment.UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN: RATE_TOKEN,
          } : syntheticEnvironment,
          failure: condition === "provider error" ? "http" : condition === "malformed" ? "malformed" : undefined,
          result: condition === "denied" ? "31:600" : "1:600",
        });
        const actualRoute = target.loadRoute();
        const privateEvidence: (import("../../lib/server/public-api-rate-limit").EnforcedPublicApiRatePolicy | null)[] = [];
        const diagnostics: unknown[] = [];
        let triggerCalls = 0, queueCalls = 0;
        const post = actualRoute.createConceptBriefPostHandler({
          ...(condition === "status only" ? { checkRateLimit: async () => trustedRateLimitEvidence() }
            : condition === "copied" ? { checkRateLimit: async (input: Parameters<typeof target.limiter.checkPublicApiRateLimit>[0]) => ({ ...await target.limiter.checkPublicApiRateLimit(input) }) } : {}),
          persistSubmission: async (_payload, policyEvidence) => {
            privateEvidence.push(policyEvidence ?? null);
            return condition === "persistence failure" ? { persisted: false, message: "Synthetic persistence unavailable." }
              : { persisted: true, publicReference: PUBLIC_REFERENCE, conceptBriefId: BRIEF_ID,
                ...(condition === "held" ? { firstPreviewInitiation: "operator_hold" as const } : {}),
              };
          },
          sessionDependencies: sessionDependencies(),
          triggerAutomaticPreview: async () => {
            triggerCalls++;
            return { status: "not_enqueued", reason: "generation_admission_unverified" };
          },
          triggerDependencies: { publisher: { async publish() { queueCalls++; } } },
          logAutomaticPreviewDiagnostic: value => diagnostics.push(value),
        });
        const response = await post(request(validPayload(), { "x-forwarded-for": IP }));
        const body = await response.json();
        expect(response.status).toBe(condition === "denied" ? 429 : condition === "persistence failure" ? 202 : 201);
        if (condition === "enforced" || condition === "held" || condition === "persistence failure") {
          expect(privateEvidence[0]?.rate_policy_version).toBe(version(target));
          expect(privateEvidence[0]?.ip.redisKey).toBe(target.commands[0][3]);
          expect(privateEvidence[0]?.email.redisKey).toBe(target.commands[1][3]);
        } else if (condition === "denied") expect(privateEvidence).toEqual([]);
        else expect(privateEvidence).toEqual([null]);
        if (response.status === 201) {
          const expected = expectedPersistedReceipt();
          expect(body).toEqual(await expected.json());
          expect(response.headers.get("set-cookie")).toBe(expected.headers.get("set-cookie"));
        } else {
          expect(body).toMatchObject({ persisted: false });
          expect(response.headers.get("set-cookie")).toBeNull();
        }
        expect(triggerCalls).toBe(["enforced", "status only", "copied"].includes(condition) ? 1 : 0);
        expect(queueCalls).toBe(0);
        const publicOutput = JSON.stringify({ body, headers: [...response.headers], diagnostics, warnings: target.warnings });
        for (const value of [IP, EMAIL, RATE_SECRET, RATE_TOKEN, version(target)!, ...target.commands.map(command => String(command[3]))]) {
          expect(publicOutput).not.toContain(value);
        }
        expect(body).not.toHaveProperty("rate_policy_version");
        expect(body).not.toHaveProperty("admission_context");
      });
    }
  });
});

test.describe("Goal 2 actual Concept Brief POST Queue correction", () => {
  test("awaits one durable publish without constructing or running the worker", async () => {
    const checkedBoundaries: string[] = [];
    let persistenceCalls = 0;
    let triggerCalls = 0;
    let publishCalls = 0;
    let releasePublish: (() => void) | null = null;
    let signalPublishStarted: (() => void) | null = null;
    const publishStarted = new Promise<void>((resolve) => {
      signalPublishStarted = resolve;
    });
    const publishReleased = new Promise<void>((resolve) => {
      releasePublish = resolve;
    });

    const post = modules.route.createConceptBriefPostHandler({
      checkRateLimit: async ({ normalizedEmail }) => {
        checkedBoundaries.push(normalizedEmail ? "email" : "ip");
        return trustedRateLimitEvidence();
      },
      persistSubmission: () => {
        persistenceCalls += 1;
        return persistenceSuccess();
      },
      sessionDependencies: sessionDependencies(),
      triggerAutomaticPreview: async (input, dependencies) => {
        triggerCalls += 1;
        return modules.trigger.triggerAutomaticFirstPreviewAfterPersistence(input, dependencies);
      },
      triggerDependencies: {
          paidAdmission: createSyntheticPaidAdmission().admission,
        featureFlagValue: "true",
        queueExecutionCapabilityValue: "true",
        publisher: {
          async publish() {
            publishCalls += 1;
            signalPublishStarted?.();
            await publishReleased;
          },
        },
      },
    });

    const responsePromise = post(request());
    await publishStarted;
    expect(publishCalls).toBe(1);
    releasePublish?.();

    const response = await responsePromise;
    expect(response.status).toBe(201);
    expect(checkedBoundaries).toEqual(["ip", "email"]);
    expect(persistenceCalls).toBe(1);
    expect(triggerCalls).toBe(1);
    expect(publishCalls).toBe(1);
    expect(response.headers.get("set-cookie")).toBeTruthy();
    expect(response.headers.get("set-cookie")).toBe(
      expectedPersistedReceipt().headers.get("set-cookie"),
    );
    expect(await response.json()).toMatchObject({
      persisted: true,
      publicReference: PUBLIC_REFERENCE,
      conceptBriefId: BRIEF_ID,
    });
  });

  const insufficientEvidenceCases: ReadonlyArray<{
    name: string;
    evidence?: unknown;
    throws?: boolean;
  }> = [
    { name: "missing result", evidence: undefined },
    { name: "null result", evidence: null },
    { name: "primitive result", evidence: true },
    { name: "array result", evidence: Object.assign([], trustedRateLimitEvidence()) },
    { name: "missing allowed", evidence: { mode: "enforced", reason: "within_limit" } },
    { name: "truthy allowed", evidence: { ...trustedRateLimitEvidence(), allowed: "true" } },
    { name: "missing mode", evidence: { allowed: true, reason: "within_limit" } },
    { name: "non-string mode", evidence: { ...trustedRateLimitEvidence(), mode: true } },
    { name: "unknown mode", evidence: { ...trustedRateLimitEvidence(), mode: "unknown" } },
    { name: "padded mode", evidence: { ...trustedRateLimitEvidence(), mode: " enforced" } },
    { name: "uppercase mode", evidence: { ...trustedRateLimitEvidence(), mode: "ENFORCED" } },
    { name: "missing provider", evidence: { allowed: true, mode: "disabled", reason: "provider_env_missing" } },
    { name: "missing email signing secret", evidence: { allowed: true, mode: "disabled", reason: "email_signing_secret_missing" } },
    { name: "provider error", evidence: { allowed: true, mode: "provider_error", reason: "provider_error" } },
    { name: "missing reason", evidence: { allowed: true, mode: "enforced" } },
    { name: "non-string reason", evidence: { ...trustedRateLimitEvidence(), reason: true } },
    { name: "unknown reason", evidence: { ...trustedRateLimitEvidence(), reason: "unknown" } },
    { name: "padded reason", evidence: { ...trustedRateLimitEvidence(), reason: "within_limit " } },
    { name: "uppercase reason", evidence: { ...trustedRateLimitEvidence(), reason: "WITHIN_LIMIT" } },
    { name: "inconsistent denial", evidence: { ...trustedRateLimitEvidence(), allowed: false } },
    { name: "unenforced denial", evidence: { allowed: false, mode: "provider_error", reason: "provider_error" } },
    { name: "inconsistent permission", evidence: { ...trustedRateLimitEvidence(), reason: "rate_limit_exceeded" } },
    { name: "inherited fields", evidence: Object.create(trustedRateLimitEvidence()) },
    { name: "checker rejection", throws: true },
  ];

  for (const boundary of ["ip", "email"] as const) {
    for (const insufficient of insufficientEvidenceCases) {
      test(`preserves receipt and withholds generation for ${boundary} ${insufficient.name}`, async () => {
        const checkedBoundaries: string[] = [];
        const diagnostics: unknown[] = [];
        let persistenceCalls = 0;
        let triggerCalls = 0;
        let publishCalls = 0;
        const post = modules.route.createConceptBriefPostHandler({
          checkRateLimit: async ({ normalizedEmail }) => {
            const checkedBoundary = normalizedEmail ? "email" : "ip";
            checkedBoundaries.push(checkedBoundary);
            if (checkedBoundary !== boundary) {
              return trustedRateLimitEvidence();
            }
            if (insufficient.throws) {
              throw new Error(`Synthetic private limiter detail: ${SIGNING_SECRET}`);
            }
            return insufficient.evidence as RateLimitResult;
          },
          persistSubmission: (payload) => {
            persistenceCalls += 1;
            expect(payload).toEqual(validPayload());
            return persistenceSuccess();
          },
          sessionDependencies: sessionDependencies(),
          triggerAutomaticPreview: async (input, dependencies) => {
            triggerCalls += 1;
            return modules.trigger.triggerAutomaticFirstPreviewAfterPersistence(input, dependencies);
          },
          triggerDependencies: {
          paidAdmission: createSyntheticPaidAdmission().admission,
            featureFlagValue: "true",
            queueExecutionCapabilityValue: "true",
            publisher: { async publish() { publishCalls += 1; } },
          },
          logAutomaticPreviewDiagnostic: (diagnostic) => diagnostics.push(diagnostic),
        });

        const response = await post(request());
        const expected = expectedPersistedReceipt();
        expect(response.status).toBe(201);
        expect(await response.json()).toEqual(await expected.json());
        expect(response.headers.get("set-cookie")).toBeTruthy();
        expect(response.headers.get("set-cookie")).toBe(expected.headers.get("set-cookie"));
        expect(checkedBoundaries).toEqual(["ip", "email"]);
        expect(persistenceCalls).toBe(1);
        expect(triggerCalls).toBe(0);
        expect(publishCalls).toBe(0);
        expect(diagnostics).toEqual([{
          publicReference: PUBLIC_REFERENCE,
          status: "not_enqueued",
          reason: "rate_limit_enforcement_unverified",
        }]);
        expect(JSON.stringify(diagnostics)).not.toContain("synthetic@example.invalid");
        expect(JSON.stringify(diagnostics)).not.toContain(SIGNING_SECRET);
      });
    }

    test(`rejects ${boundary} accessor evidence without reading its getter`, async () => {
      let getterReads = 0;
      let persistenceCalls = 0;
      let triggerCalls = 0;
      let publishCalls = 0;
      const evidence = Object.defineProperty(
        { mode: "enforced", reason: "within_limit" },
        "allowed",
        { get() { getterReads += 1; return true; } },
      );
      const post = modules.route.createConceptBriefPostHandler({
        checkRateLimit: async ({ normalizedEmail }) =>
          (normalizedEmail ? "email" : "ip") === boundary
            ? evidence as RateLimitResult
            : trustedRateLimitEvidence(),
        persistSubmission: () => { persistenceCalls += 1; return persistenceSuccess(); },
        sessionDependencies: sessionDependencies(),
        triggerAutomaticPreview: async (input, dependencies) => {
          triggerCalls += 1;
          return modules.trigger.triggerAutomaticFirstPreviewAfterPersistence(input, dependencies);
        },
        triggerDependencies: {
          paidAdmission: createSyntheticPaidAdmission().admission,
          featureFlagValue: "true",
          queueExecutionCapabilityValue: "true",
          publisher: { async publish() { publishCalls += 1; } },
        },
        logAutomaticPreviewDiagnostic: () => {},
      });
      const response = await post(request());
      expect(response.status).toBe(201);
      expect(response.headers.get("set-cookie")).toBeTruthy();
      expect(persistenceCalls).toBe(1);
      expect(getterReads).toBe(0);
      expect(triggerCalls).toBe(0);
      expect(publishCalls).toBe(0);
    });

    for (const malformedHeaders of [false, true]) {
      test(`preserves ${boundary} 429 with ${malformedHeaders ? "malformed" : "valid"} optional headers`, async () => {
        let persistenceCalls = 0;
        let triggerCalls = 0;
        let publishCalls = 0;
        const headers: Record<string, string> = malformedHeaders
          ? { "invalid header name": "synthetic" }
          : { "Retry-After": "60", "X-RateLimit-Remaining": "0" };
        const post = modules.route.createConceptBriefPostHandler({
          checkRateLimit: async ({ normalizedEmail }) =>
            (normalizedEmail ? "email" : "ip") === boundary
              ? {
                  allowed: false,
                  mode: "enforced",
                  reason: "rate_limit_exceeded",
                  headers,
                }
              : trustedRateLimitEvidence(),
          persistSubmission: () => { persistenceCalls += 1; return persistenceSuccess(); },
          sessionDependencies: sessionDependencies(),
          triggerAutomaticPreview: async (input, dependencies) => {
            triggerCalls += 1;
            return modules.trigger.triggerAutomaticFirstPreviewAfterPersistence(input, dependencies);
          },
          triggerDependencies: {
          paidAdmission: createSyntheticPaidAdmission().admission,
            featureFlagValue: "true",
            queueExecutionCapabilityValue: "true",
            publisher: { async publish() { publishCalls += 1; } },
          },
        });
        const response = await post(request());
        expect(response.status).toBe(429);
        expect(await response.json()).toMatchObject({ ok: false, persisted: false });
        expect(response.headers.get("set-cookie")).toBeNull();
        expect(response.headers.get("retry-after")).toBe(malformedHeaders ? null : "60");
        expect(response.headers.get("x-ratelimit-remaining")).toBe(malformedHeaders ? null : "0");
        expect(persistenceCalls).toBe(0);
        expect(triggerCalls).toBe(0);
        expect(publishCalls).toBe(0);
      });
    }
  }

  test("withheld diagnostic failure cannot invalidate a persisted receipt", async () => {
    let persistenceCalls = 0;
    let triggerCalls = 0;
    let publishCalls = 0;
    const post = modules.route.createConceptBriefPostHandler({
      checkRateLimit: async ({ normalizedEmail }) => normalizedEmail
        ? trustedRateLimitEvidence()
        : { allowed: true, mode: "disabled", reason: "provider_env_missing" },
      persistSubmission: () => { persistenceCalls += 1; return persistenceSuccess(); },
      sessionDependencies: sessionDependencies(),
      triggerAutomaticPreview: async (input, dependencies) => {
        triggerCalls += 1;
        return modules.trigger.triggerAutomaticFirstPreviewAfterPersistence(input, dependencies);
      },
      triggerDependencies: {
          paidAdmission: createSyntheticPaidAdmission().admission,
        featureFlagValue: "true",
        queueExecutionCapabilityValue: "true",
        publisher: { async publish() { publishCalls += 1; } },
      },
      logAutomaticPreviewDiagnostic: () => { throw new Error("Synthetic diagnostic failure"); },
    });
    const response = await post(request());
    const expected = expectedPersistedReceipt();
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(await expected.json());
    expect(response.headers.get("set-cookie")).toBe(expected.headers.get("set-cookie"));
    expect(persistenceCalls).toBe(1);
    expect(triggerCalls).toBe(0);
    expect(publishCalls).toBe(0);
  });

  test("exports 300 seconds and requires exact independent dual gates", async () => {
    expect(modules.route.maxDuration).toBe(300);
    for (const queueExecutionCapabilityValue of [
      undefined,
      "",
      "TRUE",
      " true",
      "true ",
      1,
      true,
      {},
    ]) {
      let publishCalls = 0;
      const post = modules.route.createConceptBriefPostHandler({
        checkRateLimit: allowRateLimit,
        persistSubmission: () => persistenceSuccess(),
        sessionDependencies: sessionDependencies(),
        triggerDependencies: {
          paidAdmission: createSyntheticPaidAdmission().admission,
          featureFlagValue: "true",
          queueExecutionCapabilityValue,
          publisher: {
            async publish() {
              publishCalls += 1;
            },
          },
        },
      });
      expect((await post(request())).status).toBe(201);
      expect(publishCalls).toBe(0);
    }

    for (const featureFlagValue of [undefined, "TRUE", " true", "true ", true]) {
      let publishCalls = 0;
      const post = modules.route.createConceptBriefPostHandler({
        checkRateLimit: allowRateLimit,
        persistSubmission: () => persistenceSuccess(),
        sessionDependencies: sessionDependencies(featureFlagValue),
        triggerDependencies: {
          paidAdmission: createSyntheticPaidAdmission().admission,
          featureFlagValue,
          queueExecutionCapabilityValue: "true",
          publisher: {
            async publish() {
              publishCalls += 1;
            },
          },
        },
      });
      expect((await post(request())).status).toBe(201);
      expect(publishCalls).toBe(0);
    }
  });

  test("does not publish for 400, 429, 202, false persistence, or invalid identity", async () => {
    let publishCalls = 0;
    const triggerDependencies = {
      featureFlagValue: "true",
      queueExecutionCapabilityValue: "true",
      publisher: {
        async publish() {
          publishCalls += 1;
        },
      },
    };

    const invalid = modules.route.createConceptBriefPostHandler({
      checkRateLimit: allowRateLimit,
      persistSubmission: () => persistenceSuccess(),
      sessionDependencies: sessionDependencies(),
      triggerDependencies,
    });
    expect((await invalid(request({}))).status).toBe(400);

    const limited = modules.route.createConceptBriefPostHandler({
      checkRateLimit: () =>
        Promise.resolve({
          allowed: false,
          mode: "enforced" as const,
          reason: "rate_limit_exceeded",
        }),
      persistSubmission: () => persistenceSuccess(),
      sessionDependencies: sessionDependencies(),
      triggerDependencies,
    });
    expect((await limited(request())).status).toBe(429);

    const unavailable = modules.route.createConceptBriefPostHandler({
      checkRateLimit: allowRateLimit,
      persistSubmission: () =>
        Promise.resolve({
          persisted: false as const,
          message: "Synthetic persistence unavailable.",
        }),
      sessionDependencies: sessionDependencies(),
      triggerDependencies,
    });
    expect((await unavailable(request())).status).toBe(202);

    const invalidIdentity = modules.route.createConceptBriefPostHandler({
      checkRateLimit: allowRateLimit,
      persistSubmission: () => persistenceSuccess("invalid", "invalid"),
      sessionDependencies: sessionDependencies(),
      triggerDependencies,
    });
    expect((await invalidIdentity(request())).status).toBe(201);
    expect(publishCalls).toBe(0);
  });

  test("Queue failure preserves 201 and hostile headers cannot enable either gate", async () => {
    let publishCalls = 0;
    const failedPublish = modules.route.createConceptBriefPostHandler({
      checkRateLimit: allowRateLimit,
      persistSubmission: () => persistenceSuccess(),
      sessionDependencies: sessionDependencies(),
      triggerDependencies: {
          paidAdmission: createSyntheticPaidAdmission().admission,
        featureFlagValue: "true",
        queueExecutionCapabilityValue: "true",
        publisher: {
          async publish() {
            publishCalls += 1;
            throw new Error("synthetic Queue failure");
          },
        },
      },
    });
    const failedResponse = await failedPublish(request());
    expect(failedResponse.status).toBe(201);
    expect(publishCalls).toBe(1);
    expect(JSON.stringify(await failedResponse.json())).not.toContain("Queue");

    let hostilePublishes = 0;
    const hostile = modules.route.createConceptBriefPostHandler({
      checkRateLimit: allowRateLimit,
      persistSubmission: () => persistenceSuccess(),
      sessionDependencies: sessionDependencies(undefined),
      triggerDependencies: {
          paidAdmission: createSyntheticPaidAdmission().admission,
        featureFlagValue: undefined,
        queueExecutionCapabilityValue: undefined,
        publisher: {
          async publish() {
            hostilePublishes += 1;
          },
        },
      },
    });
    const hostileResponse = await hostile(
      request(validPayload(), {
        "x-novora-instant-preview-agent-enabled": "true",
        "x-novora-first-preview-queue-execution-confirmed": "true",
        "x-novora-first-preview-post-response-execution-confirmed": "true",
      }),
    );
    expect(hostileResponse.status).toBe(201);
    expect(hostilePublishes).toBe(0);
  });
});
