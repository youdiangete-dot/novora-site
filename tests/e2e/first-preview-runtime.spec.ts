import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { runInNewContext } from "node:vm";

import {
  evaluateAutomaticFirstPreviewGates,
  FIRST_PREVIEW_PROVIDER_CONTRACT_VERSION,
  FIRST_PREVIEW_RUNTIME_DECISION_SCOPE,
  orchestrateFirstPreviewGeneration,
  type FirstPreviewRuntimeInput,
} from "../../lib/server/ai-sketch/first-preview-runtime";
import { createMockNovoraDesignSpec } from "../../lib/server/ai-sketch/design-spec";
import { createNovoraHandSketchInstructionFromDesignSpec } from "../../lib/server/ai-sketch/hand-sketch-instruction";
import { FakeFirstPreviewProvider } from "../fixtures/ai-sketch/fake-first-preview-provider";

const PUBLIC_REFERENCE = "NOVORA-CB-20260710-A68A";
const CONCEPT_BRIEF_ID = "123e4567-e89b-42d3-a456-426614174000";

function createValidRuntimeInput(
  overrides: Partial<FirstPreviewRuntimeInput> = {},
): FirstPreviewRuntimeInput {
  const designSpec = createMockNovoraDesignSpec({ publicReference: PUBLIC_REFERENCE });
  const handSketchInstruction = createNovoraHandSketchInstructionFromDesignSpec(designSpec);

  return {
    persistenceConfirmed: true,
    conceptBriefId: CONCEPT_BRIEF_ID,
    publicReference: PUBLIC_REFERENCE,
    designSpec,
    handSketchInstruction,
    accessControlEligible: true,
    falseSuccessDetected: false,
    ...overrides,
  };
}

async function runScenario(
  scenario: ConstructorParameters<typeof FakeFirstPreviewProvider>[0],
  input: FirstPreviewRuntimeInput = createValidRuntimeInput(),
  timeoutMs = 100,
) {
  const provider = new FakeFirstPreviewProvider(scenario);
  const result = await orchestrateFirstPreviewGeneration(input, {
    provider,
    timeoutMs,
  });

  return { provider, result };
}

test.describe("server-only first-preview runtime foundation", () => {
  test("passes every automatic gate for one valid structured image result", async () => {
    const { provider, result } = await runScenario("success");

    expect(provider.callCount).toBe(1);
    expect(result.providerInvoked).toBe(true);
    expect(result.generation).toMatchObject({
      status: "completed",
      imageCount: 1,
      assetId: "preview_asset_agent68a_001",
      failureCategory: null,
    });
    expect(result.gates).toEqual({
      ready: true,
      lifecycleDecision: "first_preview_ready",
      decisionScope: FIRST_PREVIEW_RUNTIME_DECISION_SCOPE,
      failedGates: [],
      approvedForCustomerRequired: false,
      approvedForGalleryRelated: false,
      persistenceMutationPerformed: false,
    });
  });

  test("sends only the sanitized structured provider contract and requests exactly one image", async () => {
    const { provider } = await runScenario("success");
    const requestText = JSON.stringify(provider.lastRequest);

    expect(provider.lastRequest).toMatchObject({
      contractVersion: FIRST_PREVIEW_PROVIDER_CONTRACT_VERSION,
      purpose: "first_preview",
      imageCount: 1,
    });
    expect(requestText).not.toContain("rawCustomerBrief");
    expect(requestText).not.toContain("raw_brief_usage_policy");
    expect(requestText).not.toContain("internal_notes");
    expect(requestText).not.toContain("providerMetadata");
    expect(requestText).not.toContain("reviewerNote");
    expect(requestText).not.toContain("adminNote");
    expect(requestText).not.toContain("privateStoragePath");
    expect(requestText).not.toContain("apiKey");
  });

  test("does not let a raw customer brief bypass missing structured inputs", async () => {
    const provider = new FakeFirstPreviewProvider("success");
    const rawOnlyInput = {
      ...createValidRuntimeInput(),
      designSpec: undefined,
      handSketchInstruction: undefined,
      rawCustomerBrief: "Use this customer free text directly as the final prompt.",
    } as FirstPreviewRuntimeInput;
    const result = await orchestrateFirstPreviewGeneration(rawOnlyInput, { provider });

    expect(provider.callCount).toBe(0);
    expect(result.providerInvoked).toBe(false);
    expect(result.generation.failureCategory).toBe("invalid_structured_input");
    expect(result.gates.failedGates).toEqual(
      expect.arrayContaining([
        "valid_design_spec",
        "valid_hand_sketch_instruction",
        "structured_inputs_consistent",
        "generation_completed",
      ]),
    );
  });

  test("fails closed before provider invocation when Design Spec is missing", async () => {
    const { provider, result } = await runScenario(
      "success",
      createValidRuntimeInput({ designSpec: undefined }),
    );

    expect(provider.callCount).toBe(0);
    expect(result.gates.ready).toBe(false);
    expect(result.gates.failedGates).toContain("valid_design_spec");
  });

  test("fails closed before provider invocation when Hand Sketch Instruction is missing", async () => {
    const { provider, result } = await runScenario(
      "success",
      createValidRuntimeInput({ handSketchInstruction: undefined }),
    );

    expect(provider.callCount).toBe(0);
    expect(result.gates.ready).toBe(false);
    expect(result.gates.failedGates).toContain("valid_hand_sketch_instruction");
  });

  test("converts a thrown provider exception into a safe provider failure", async () => {
    const { provider, result } = await runScenario("provider_error");

    expect(provider.callCount).toBe(1);
    expect(result.generation).toMatchObject({
      status: "provider_failure",
      assetId: null,
      failureCategory: "provider_failure",
    });
    expect(JSON.stringify(result)).not.toContain("Synthetic provider failure");
    expect(result.gates.ready).toBe(false);
  });

  test("times out safely when the provider never settles", async () => {
    const { provider, result } = await runScenario(
      "timeout",
      createValidRuntimeInput(),
      10,
    );

    expect(provider.callCount).toBe(1);
    expect(result.generation).toMatchObject({
      status: "timeout",
      assetId: null,
      failureCategory: "timeout",
    });
    expect(result.gates.ready).toBe(false);
  });

  test("returns safe failure for a malformed provider result", async () => {
    const { result } = await runScenario("malformed_result");

    expect(result.generation).toMatchObject({
      status: "invalid_output",
      assetId: null,
      failureCategory: "invalid_output",
    });
    expect(result.gates.failedGates).toContain("generation_completed");
  });

  test("returns safe failure when the output asset is missing", async () => {
    const { result } = await runScenario("missing_asset");

    expect(result.generation.status).toBe("invalid_output");
    expect(result.generation.assetId).toBeNull();
    expect(result.gates.failedGates).toContain("valid_asset_reference");
  });

  test("rejects unsafe content without retaining a ready asset", async () => {
    const { result } = await runScenario("unsafe_result");

    expect(result.generation).toMatchObject({
      status: "rejected_unsafe",
      assetId: null,
      failureCategory: "unsafe_output",
    });
    expect(result.generation.checks.contentSafetyPassed).toBe(false);
    expect(result.gates.failedGates).toContain("content_safety_passed");
  });

  test("fails closed for privacy or access-control failure", async () => {
    const privacyFailure = await runScenario("privacy_failure");
    const accessFailure = await runScenario(
      "success",
      createValidRuntimeInput({ accessControlEligible: false }),
    );

    expect(privacyFailure.result.gates.failedGates).toContain("privacy_passed");
    expect(accessFailure.result.gates.failedGates).toContain("access_control_eligible");
    expect(privacyFailure.result.gates.ready).toBe(false);
    expect(accessFailure.result.gates.ready).toBe(false);
  });

  test("blocks provider metadata leakage attempts", async () => {
    const { result } = await runScenario("metadata_leak");

    expect(result.generation).toMatchObject({
      status: "invalid_output",
      assetId: null,
      failureCategory: "provider_metadata_exposure",
    });
    expect(result.generation.checks.providerMetadataExposed).toBe(true);
    expect(result.gates.failedGates).toContain("provider_metadata_absent");
  });

  test("blocks internal prompt and reviewer-note leakage attempts", async () => {
    const promptLeak = await runScenario("internal_prompt_leak");
    const reviewerLeak = await runScenario("reviewer_note_leak");

    expect(promptLeak.result.generation.failureCategory).toBe("internal_prompt_exposure");
    expect(promptLeak.result.gates.failedGates).toContain("internal_prompt_absent");
    expect(reviewerLeak.result.generation.failureCategory).toBe(
      "reviewer_or_admin_note_exposure",
    );
    expect(reviewerLeak.result.gates.failedGates).toContain(
      "reviewer_admin_notes_absent",
    );
  });

  test("does not require approved_for_customer for first-preview readiness", async () => {
    const { result } = await runScenario("success");
    const input = createValidRuntimeInput();
    const decisionWithoutApproval = evaluateAutomaticFirstPreviewGates({
      ...input,
      generation: result.generation,
      approvedForCustomer: false,
    } as Parameters<typeof evaluateAutomaticFirstPreviewGates>[0]);

    expect(decisionWithoutApproval.ready).toBe(true);
    expect(decisionWithoutApproval.approvedForCustomerRequired).toBe(false);
    expect("approvedForCustomer" in input).toBe(false);
  });

  test("keeps gallery approval unrelated to the first-preview gate decision", async () => {
    const successful = await runScenario("success");
    const decisionWithUnrelatedGalleryField = evaluateAutomaticFirstPreviewGates({
      ...createValidRuntimeInput(),
      generation: successful.result.generation,
      approvedForGallery: false,
    } as Parameters<typeof evaluateAutomaticFirstPreviewGates>[0]);

    expect(decisionWithUnrelatedGalleryField.ready).toBe(true);
    expect(decisionWithUnrelatedGalleryField.approvedForGalleryRelated).toBe(false);
  });

  test("fake provider performs no network request", async () => {
    const { provider, result } = await runScenario("success");

    expect(result.gates.ready).toBe(true);
    expect(provider.networkRequestCount).toBe(0);
  });

  test("rejects more than one image for the single-image MVP contract", async () => {
    const { provider, result } = await runScenario("multiple_images");

    expect(provider.lastRequest?.imageCount).toBe(1);
    expect(result.generation.status).toBe("invalid_output");
    expect(result.generation.imageCount).toBe(0);
    expect(result.gates.failedGates).toContain("single_image_result");
  });

  test("treats missing or unknown gate evidence as failure", async () => {
    const successful = await runScenario("success");
    const decision = evaluateAutomaticFirstPreviewGates({
      ...createValidRuntimeInput(),
      generation: successful.result.generation,
      persistenceConfirmed: "unknown",
      falseSuccessDetected: undefined,
    });

    expect(decision.ready).toBe(false);
    expect(decision.failedGates).toEqual(
      expect.arrayContaining(["concept_brief_persisted", "no_false_success"]),
    );
  });

  test("prevents a detected false-success state before provider invocation", async () => {
    const provider = new FakeFirstPreviewProvider("success");
    const result = await orchestrateFirstPreviewGeneration(
      createValidRuntimeInput({ falseSuccessDetected: true }),
      { provider },
    );

    expect(provider.callCount).toBe(0);
    expect(result.providerInvoked).toBe(false);
    expect(result.gates.ready).toBe(false);
    expect(result.gates.failedGates).toContain("no_false_success");
  });

  test("handles caller cancellation without invoking an already-aborted request", async () => {
    const controller = new AbortController();
    const provider = new FakeFirstPreviewProvider("success");
    controller.abort();
    const result = await orchestrateFirstPreviewGeneration(createValidRuntimeInput(), {
      provider,
      signal: controller.signal,
    });

    expect(provider.callCount).toBe(0);
    expect(result.providerInvoked).toBe(false);
    expect(result.generation.status).toBe("aborted");
    expect(result.gates.ready).toBe(false);
  });
});

test.describe("Preview queue entry guard", () => {
  const testRequire = createRequire(path.join(process.cwd(), "package.json"));
  const ts = testRequire("typescript") as typeof import("typescript");
  const sdk = testRequire("@vercel/queue") as typeof import("@vercel/queue");
  const routePath = path.join(process.cwd(), "app/api/queues/first-preview-generation/route.ts");
  const routeCode = ts.transpileModule(readFileSync(routePath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const message = { marker: "offline-queue-entry-regression" };
  let savedFetch: typeof fetch;
  let savedConsoleError: typeof console.error;
  let queueRequests: Array<{ method: string; path: string; body: unknown }>;

  test.beforeEach(() => {
    queueRequests = [];
    savedFetch = globalThis.fetch;
    savedConsoleError = console.error;
    console.error = () => {};
    // Exercise the installed SDK's acknowledgement/reschedule behavior entirely
    // in memory. Never read deployment credentials or contact a queue service.
    globalThis.fetch = async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      if (url.origin !== "https://queue-entry-guard.invalid") {
        throw new Error("External transport forbidden in this offline test");
      }
      queueRequests.push({
        method: init?.method ?? "GET",
        path: url.pathname,
        body: init?.body ? JSON.parse(String(init.body)) : null,
      });
      return new Response(null, { status: 204 });
    };
  });

  test.afterEach(() => {
    globalThis.fetch = savedFetch;
    console.error = savedConsoleError;
  });

  function loadRoute(environment: Record<string, string | undefined>, failure?: Error) {
    const calls: unknown[] = [];
    const client = new sdk.QueueClient({
      region: "iad1",
      token: "synthetic-offline-token",
      deploymentId: "dpl_synthetic_offline",
      resolveBaseUrl: () => new URL("https://queue-entry-guard.invalid"),
      telemetry: { isEnabled: false },
    });
    const routeExports: { POST?: (request: Request) => Promise<Response> } = {};
    runInNewContext(routeCode, {
      exports: routeExports,
      process: { env: environment },
      require(name: string) {
        if (name === "@vercel/queue") {
          return { handleCallback: client.handleCallback.bind(client) };
        }
        if (name === "../../../../lib/server/ai-sketch/first-preview-queue") {
          return {
            async consumeFirstPreviewQueueMessage(value: unknown) {
              calls.push(value);
              if (failure) throw failure;
            },
          };
        }
        throw new Error("Unexpected route dependency");
      },
    }, { filename: routePath });
    if (!routeExports.POST) throw new Error("Queue route POST missing");
    return { post: routeExports.POST, calls };
  }

  function delivery(deliveryCount = 1): Request {
    return new Request("https://callback.invalid/api/queues/first-preview-generation", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "ce-type": "com.vercel.queue.v2beta",
        "ce-vqsqueuename": "novora-first-preview-generation-v1",
        "ce-vqsconsumergroup": "synthetic-consumer",
        "ce-vqsmessageid": "synthetic-message",
        "ce-vqsreceipthandle": "synthetic-receipt",
        "ce-vqsdeliverycount": String(deliveryCount),
        "ce-vqscreatedat": new Date().toISOString(),
        "ce-vqsexpiresat": new Date(Date.now() + 86_400_000).toISOString(),
      },
      body: JSON.stringify(message),
    });
  }

  function expectDeferred() {
    // A successful callback HTTP response is not a message acknowledgement:
    // the real SDK must PATCH visibility, never DELETE the message lease.
    expect(queueRequests).toEqual([{
      method: "PATCH",
      path: "/api/v3/topic/novora-first-preview-generation-v1/consumer/synthetic-consumer/lease/synthetic-receipt",
      body: { visibilityTimeoutSeconds: 3_600 },
    }]);
  }

  const deniedEnvironments: Array<[string, Record<string, string | undefined>]> = [
    ["Preview even with existing generation flags enabled", {
      VERCEL_ENV: "preview", VERCEL_TARGET_ENV: "preview", NODE_ENV: "production",
      NOVORA_INSTANT_PREVIEW_AGENT_ENABLED: "true",
      NOVORA_FIRST_PREVIEW_QUEUE_EXECUTION_CONFIRMED: "true",
    }],
    ["missing Vercel environment", { NODE_ENV: "production" }],
    ["empty Vercel environment", { VERCEL_ENV: "", NODE_ENV: "production" }],
    ["unexpected Vercel environment", { VERCEL_ENV: "Production", NODE_ENV: "production" }],
    ["development deployment", { VERCEL_ENV: "development", NODE_ENV: "production" }],
    ["contradictory Preview target", {
      VERCEL_ENV: "production", VERCEL_TARGET_ENV: "preview", NODE_ENV: "production",
    }],
    ["unexpected custom target", {
      VERCEL_ENV: "production", VERCEL_TARGET_ENV: "staging", NODE_ENV: "production",
    }],
    ["contradictory Node environment", { VERCEL_ENV: "production", NODE_ENV: "development" }],
    ["missing Node environment", { VERCEL_ENV: "production" }],
    ["empty target signal", {
      VERCEL_ENV: "production", VERCEL_TARGET_ENV: "", NODE_ENV: "production",
    }],
  ];

  for (const [name, environment] of deniedEnvironments) {
    test(`denies ${name} before any consumer, database or Provider logic`, async () => {
      const route = loadRoute(environment);
      const response = await route.post(delivery());
      expect(response.status).toBe(200);
      expect(route.calls).toEqual([]);
      expectDeferred();
    });
  }

  for (const target of [undefined, "production"]) {
    test(`preserves Production delegation and acknowledgement with target ${String(target)}`, async () => {
      const route = loadRoute({
        VERCEL_ENV: "production", NODE_ENV: "production", VERCEL_TARGET_ENV: target,
      });
      expect((await route.post(delivery())).status).toBe(200);
      expect(route.calls).toEqual([message]);
      expect(queueRequests.map(({ method }) => method)).toEqual(["DELETE"]);
    });
  }

  test("preserves default Production failure behavior without acknowledgement or custom deferral", async () => {
    const route = loadRoute({ VERCEL_ENV: "production", NODE_ENV: "production" },
      new Error("synthetic-business-failure"));
    expect((await route.post(delivery())).status).toBe(500);
    expect(route.calls).toEqual([message]);
    expect(queueRequests).toEqual([]);
  });

  test("repeated denial defers without acknowledging or changing retention", async () => {
    const route = loadRoute({ VERCEL_ENV: "preview", NODE_ENV: "production" });
    for (const deliveryCount of [1, 32, 1_000]) {
      queueRequests.length = 0;
      expect((await route.post(delivery(deliveryCount))).status).toBe(200);
      expectDeferred();
    }
    expect(route.calls).toEqual([]);
  });

  test("checks environment at invocation time rather than route import time", async () => {
    const environment = { VERCEL_ENV: "production", NODE_ENV: "production" };
    const route = loadRoute(environment);
    environment.VERCEL_ENV = "preview";
    expect((await route.post(delivery())).status).toBe(200);
    expect(route.calls).toEqual([]);
    expectDeferred();
  });
});

test.describe("Supabase access brake", () => {
  const testRequire = createRequire(path.join(process.cwd(), "package.json"));
  const ts = testRequire("typescript") as typeof import("typescript");
  const sourcePath = path.join(process.cwd(), "lib/server/supabase.ts");
  const code = ts.transpileModule(readFileSync(sourcePath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const productionUrl = "https://pzjypjddmrngdnrjbhsw.supabase.co";
  const isolatedUrl = "https://kiwoujhhhsnromxfwdxh.supabase.co";
  const preview = { VERCEL_ENV: "preview", NODE_ENV: "production" };
  const production = { VERCEL_ENV: "production", NODE_ENV: "production" };

  function loadClient(environment: Record<string, string | undefined>, url = isolatedUrl) {
    // Only synthetic VM configuration and a recording constructor are used.
    // The real SDK, process environment, HTTP and services are never accessed.
    const env: Record<string, string | undefined> = {
      NEXT_PUBLIC_SUPABASE_URL: url,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "synthetic-offline-anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "sb_secret_synthetic_offline_only",
      ...environment,
    };
    const calls: Array<{ url: string; key: string; options: unknown }> = [];
    const api = {} as typeof import("../../lib/server/supabase");
    runInNewContext(code, {
      exports: api, process: { env }, URL, Buffer,
      require(name: string) {
        if (name === "server-only") return {};
        if (name === "@supabase/supabase-js") {
          return { createClient(url: string, key: string, options: unknown) {
            const client = { url, key, options };
            calls.push(client);
            return client;
          } };
        }
        throw new Error("Unexpected client dependency in offline test");
      },
    }, { filename: sourcePath });
    return { api, calls, env };
  }

  function expectBlocked(client: ReturnType<typeof loadClient>) {
    expect(client.api.createSupabasePublicServerClientOrNull()).toBeNull();
    expect(client.api.createSupabaseAdminClientOrNull()).toBeNull();
    expect(client.api.getSupabaseServerReadiness()).toMatchObject({
      readyForPublicServerClient: false, readyForAdminClient: false,
    });
    expect(client.calls).toEqual([]);
  }

  for (const target of [undefined, "preview"]) {
    test(`blocks Production project in Preview with target ${String(target)}`, () => {
      expectBlocked(loadClient({ ...preview, VERCEL_TARGET_ENV: target }, productionUrl));
    });
  }

  const invalidTargets: Array<[string, string | undefined]> = [
    ["missing URL", undefined], ["empty URL", ""], ["malformed URL", "not-a-url"],
    ["missing project ID", "https://supabase.co"],
    ["malformed project ID", "https://short.supabase.co"],
    ["unverified project", "https://aaaaaaaaaaaaaaaaaaaa.supabase.co"],
    ["custom hostname", "https://database.example.invalid"],
    ["Production hostname suffix spoof", `${productionUrl}.example.invalid`],
    ["isolated hostname suffix spoof", `${isolatedUrl}.example.invalid`],
    ["insecure transport", isolatedUrl.replace("https:", "http:")],
    ["alternate port", `${isolatedUrl}:8443`],
    ["URL credentials", isolatedUrl.replace("https://", "https://synthetic@")],
    ["path override", `${isolatedUrl}/another-project`],
    ["query override", `${isolatedUrl}?target=production`],
    ["fragment", `${isolatedUrl}#production`],
  ];
  for (const [name, url] of invalidTargets) {
    test(`blocks ${name} before either SDK constructor`, () => {
      expectBlocked(loadClient({ ...preview, NEXT_PUBLIC_SUPABASE_URL: url }));
    });
  }

  const invalidEnvironments: Array<[string, Record<string, string | undefined>]> = [
    ["NODE_ENV alone", { NODE_ENV: "production" }],
    ["target alone", { VERCEL_TARGET_ENV: "preview", NODE_ENV: "production" }],
    ["empty identity", { VERCEL_ENV: "", NODE_ENV: "production" }],
    ["unknown identity", { VERCEL_ENV: "Production", NODE_ENV: "production" }],
    ["missing Node identity", { VERCEL_ENV: "preview" }],
    ["Preview with development Node", { VERCEL_ENV: "preview", NODE_ENV: "development" }],
    ["development with production Node", { VERCEL_ENV: "development", NODE_ENV: "production" }],
    ["Production with development Node", { VERCEL_ENV: "production", NODE_ENV: "development" }],
    ["Production with Preview target", { ...production, VERCEL_TARGET_ENV: "preview" }],
    ["Preview with Production target", { ...preview, VERCEL_TARGET_ENV: "production" }],
    ["empty target", { ...production, VERCEL_TARGET_ENV: "" }],
    ["unverified custom target", { ...preview, VERCEL_TARGET_ENV: "staging" }],
  ];
  for (const [name, environment] of invalidEnvironments) {
    test(`blocks ${name} even for the isolated project`, () => {
      expectBlocked(loadClient(environment));
    });
  }

  for (const environment of [
    preview, { ...preview, VERCEL_TARGET_ENV: "preview" },
    { VERCEL_ENV: "development", NODE_ENV: "development" },
    { VERCEL_ENV: "development", VERCEL_TARGET_ENV: "development", NODE_ENV: "development" },
  ]) {
    test(`allows only the isolated identity in ${JSON.stringify(environment)}`, () => {
      const client = loadClient(environment);
      expect(client.api.getSupabaseServerReadiness()).toMatchObject({
        readyForPublicServerClient: true, readyForAdminClient: true,
      });
      expect(client.calls).toEqual([]); // Readiness never constructs a client.
      expect(client.api.createSupabasePublicServerClientOrNull()).not.toBeNull();
      expect(client.api.createSupabaseAdminClientOrNull()).not.toBeNull();
      expect(client.calls.map(call => call.url)).toEqual([isolatedUrl, isolatedUrl]);
    });
  }

  for (const target of [undefined, "production"]) {
    test(`preserves Production constructors and options with target ${String(target)}`, () => {
      const client = loadClient({ ...production, VERCEL_TARGET_ENV: target }, productionUrl);
      client.api.createSupabasePublicServerClientOrNull();
      client.api.createSupabaseAdminClientOrNull();
      expect(client.calls).toEqual([
        { url: productionUrl, key: client.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          options: { auth: { persistSession: false, autoRefreshToken: false } } },
        { url: productionUrl, key: client.env.SUPABASE_SERVICE_ROLE_KEY,
          options: { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
            global: { headers: { Authorization: `Bearer ${client.env.SUPABASE_SERVICE_ROLE_KEY}`,
              apikey: client.env.SUPABASE_SERVICE_ROLE_KEY } } } },
      ]);
    });
  }

  test("preserves existing Production URL and key validation behavior", () => {
    const client = loadClient(production, "http://synthetic-database.invalid:8080");
    client.env.SUPABASE_SERVICE_ROLE_KEY = `synthetic.${Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url")}.offline`;
    expect(client.api.createSupabaseAdminClientOrNull()).not.toBeNull();
    client.env.SUPABASE_SERVICE_ROLE_KEY = "synthetic-invalid-role";
    expect(client.api.createSupabaseAdminClientOrNull()).toBeNull();
    client.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = undefined;
    expect(client.api.createSupabasePublicServerClientOrNull()).toBeNull();
    client.env.NEXT_PUBLIC_SUPABASE_URL = "not-a-url";
    expect(client.api.createSupabasePublicServerClientOrNull()).toBeNull();
    expect(client.calls).toHaveLength(1);
  });

  test("rechecks deployment and resource identity on every construction", () => {
    const client = loadClient(production, productionUrl);
    expect(client.api.createSupabaseAdminClientOrNull()).not.toBeNull();
    client.calls.length = 0;
    client.env.VERCEL_ENV = "preview";
    expectBlocked(client);
    client.env.NEXT_PUBLIC_SUPABASE_URL = isolatedUrl;
    expect(client.api.createSupabaseAdminClientOrNull()).not.toBeNull();
    client.calls.length = 0;
    client.env.VERCEL_ENV = undefined;
    expectBlocked(client);
  });
});
