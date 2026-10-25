import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createContext, runInContext } from "node:vm";
import ts from "typescript";

const ORIGIN = "https://dibpksbbzjczpjusujwk.supabase.co";
const BRANCH = "integration/instant-first-preview-agent";
const PROJECT = "prj_H9Di3TIvXiZJHO06WwoaW8RqFfVg";
const KEY = "sb_secret_synthetic_offline_only";
const PRIVATE_DETAIL = "synthetic-private-backend-detail";
const EVENT = "NOVORA_M2_ISOLATION_ATTESTATION_V1";

type Options = {
  env?: Record<string, string | undefined>;
  status?: number;
  transport?: "throw" | "timeout";
  proof?: unknown;
  clientThrows?: boolean;
  loggerThrows?: boolean;
};

// Exact instrumentation, helper and existing admin-client source, using the
// installed SDK with mandatory mock fetch. No actual process env or live IO.
function harness(options: Options = {}) {
  const env = {
    NEXT_RUNTIME: "nodejs", NODE_ENV: "production", VERCEL: "1",
    VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: BRANCH,
    VERCEL_PROJECT_ID: PROJECT, NEXT_PUBLIC_SUPABASE_URL: ORIGIN,
    SUPABASE_SERVICE_ROLE_KEY: KEY, ...options.env,
  };
  const requests: Request[] = [];
  const logs: unknown[][] = [];
  const timeouts: number[] = [];
  const controllers: AbortController[] = [];
  let helperImports = 0;
  let clientConstructions = 0;
  const log = (...args: unknown[]) => {
    logs.push(args);
    if (options.loggerThrows) throw new Error(PRIVATE_DETAIL);
  };
  const context = createContext({
    process: { env }, Buffer, URL,
    AbortSignal: { timeout(ms: number) {
      timeouts.push(ms);
      const controller = new AbortController();
      controllers.push(controller);
      return controller.signal;
    } },
    console: { info: log, log, warn: log, error: log },
  });
  const offlineFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    requests.push(request);
    if (options.transport === "throw") throw new Error(PRIVATE_DETAIL);
    if (options.transport === "timeout") {
      return new Promise<Response>((_, reject) => {
        request.signal.addEventListener("abort", () => reject(request.signal.reason), { once: true });
      });
    }
    const status = options.status ?? 200;
    return new Response(status >= 400 ? PRIVATE_DETAIL : null, { status });
  };
  function load(relative: string, dependencies: Record<string, unknown>) {
    const filename = path.resolve(process.cwd(), relative);
    const compiled = ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
      fileName: filename,
    });
    const module = { exports: {} as Record<string, unknown> };
    const evaluate = runInContext(`(function(module, exports, require) {${compiled.outputText}\n})`, context, { filename });
    evaluate(module, module.exports, (name: string) => {
      if (name === "server-only") return {};
      if (Object.hasOwn(dependencies, name)) return dependencies[name];
      throw new Error(`Unexpected offline dependency: ${name}`);
    });
    return module.exports;
  }
  const supabase = load("lib/server/supabase.ts", {
    "@supabase/supabase-js": { createClient(url: string, key: string, config: Parameters<typeof createClient>[2]) {
      clientConstructions += 1;
      if (options.clientThrows) throw new Error(PRIVATE_DETAIL);
      if (Object.hasOwn(options, "proof")) {
        return { from: () => ({ select: () => ({ limit: () => ({ retry: () => ({
          abortSignal: async () => options.proof,
        }) }) }) }) };
      }
      return createClient(url, key, {
        ...config, global: { ...config?.global, fetch: offlineFetch },
      });
    } },
  });
  function loadHelper() {
    helperImports += 1;
    return load("lib/server/preview-isolation-attestation.ts", { "./supabase": supabase }) as {
      attestPreviewIsolationOnce(): Promise<void>;
    };
  }
  const helper = loadHelper();
  const instrumentation = load("instrumentation.ts", {
    "./lib/server/preview-isolation-attestation": helper,
  }) as { register(): Promise<void> };
  return { env, requests, logs, timeouts, controllers, helper, instrumentation, loadHelper,
    get clientConstructions() { return clientConstructions; },
    get helperImports() { return helperImports; } };
}

function assertLog(state: ReturnType<typeof harness>, verified: boolean) {
  expect(state.logs).toEqual([[JSON.stringify({ event: EVENT, isolatedBackendVerified: verified })]]);
  const emitted = JSON.stringify(state.logs);
  for (const value of [KEY, PRIVATE_DETAIL, ORIGIN, PROJECT, BRANCH,
    "concept_briefs", "publicReference", "service_role", "stack"]) {
    expect(emitted).not.toContain(value);
  }
}

test("exact Preview instrumentation makes one authenticated HEAD without rows, counts or mutations", async () => {
  const state = harness();
  await state.instrumentation.register();
  assertLog(state, true);
  expect(state.clientConstructions).toBe(1);
  expect(state.requests).toHaveLength(1);
  expect(state.timeouts).toEqual([5_000]);
  const request = state.requests[0];
  const url = new URL(request.url);
  expect(url.origin).toBe(ORIGIN);
  expect(url.pathname).toBe("/rest/v1/concept_briefs");
  expect([...url.searchParams]).toEqual([["select", "id"], ["limit", "0"]]);
  expect(request.method).toBe("HEAD");
  expect(request.body).toBeNull();
  expect(request.headers.get("authorization")).toBe(`Bearer ${KEY}`);
  expect(request.headers.get("apikey")).toBe(KEY);
  expect(request.headers.get("prefer")).toBeNull();
});

for (const [name, env] of [
  ["Production", { VERCEL_ENV: "production" }],
  ["development environment", { VERCEL_ENV: "development" }],
  ["missing environment", { VERCEL_ENV: undefined }],
  ["wrong branch", { VERCEL_GIT_COMMIT_REF: "codex/other" }],
  ["missing branch", { VERCEL_GIT_COMMIT_REF: undefined }],
  ["Edge", { NEXT_RUNTIME: "edge" }],
  ["missing runtime", { NEXT_RUNTIME: undefined }],
  ["production Build phase", { NEXT_PHASE: "phase-production-build" }],
  ["local process", { VERCEL: undefined }],
  ["development Node process", { NODE_ENV: "development" }],
  ["wrong project", { VERCEL_PROJECT_ID: "prj_other" }],
  ["missing project", { VERCEL_PROJECT_ID: undefined }],
] as Array<[string, Options["env"]]>) {
  test(`${name} excludes both registration and direct helper calls`, async () => {
    const state = harness({ env });
    await state.instrumentation.register();
    await state.helper.attestPreviewIsolationOnce();
    expect(state.requests).toHaveLength(0);
    expect(state.logs).toHaveLength(0);
    expect(state.clientConstructions).toBe(0);
    expect(state.timeouts).toHaveLength(0);
  });
}

for (const [name, env] of [
  ["Production backend", { NEXT_PUBLIC_SUPABASE_URL: "https://pzjypjddmrngdnrjbhsw.supabase.co" }],
  ["missing URL", { NEXT_PUBLIC_SUPABASE_URL: undefined }],
  ["URL suffix", { NEXT_PUBLIC_SUPABASE_URL: `${ORIGIN}.attacker.test` }],
  ["URL path", { NEXT_PUBLIC_SUPABASE_URL: `${ORIGIN}/` }],
  ["URL query", { NEXT_PUBLIC_SUPABASE_URL: `${ORIGIN}?x=1` }],
  ["URL credentials", { NEXT_PUBLIC_SUPABASE_URL: ORIGIN.replace("://", "://user@") }],
  ["missing credential", { SUPABASE_SERVICE_ROLE_KEY: undefined }],
  ["invalid credential", { SUPABASE_SERVICE_ROLE_KEY: "anon-key" }],
] as Array<[string, Options["env"]]>) {
  test(`${name} logs only false without probing`, async () => {
    const state = harness({ env });
    await state.instrumentation.register();
    assertLog(state, false);
    expect(state.requests).toHaveLength(0);
    expect(state.clientConstructions).toBe(0);
  });
}

for (const status of [401, 403, 500, 503, 204, 206]) {
  test(`backend HTTP ${status} fails closed with no retry or backend detail`, async () => {
    const state = harness({ status });
    await state.instrumentation.register();
    await state.instrumentation.register();
    assertLog(state, false);
    expect(state.requests).toHaveLength(1);
    expect(state.requests[0].method).toBe("HEAD");
  });
}

for (const [name, proof] of [
  ["missing proof", undefined],
  ["incomplete proof", { status: 200 }],
  ["unexpected records", { status: 200, error: null, data: [{ id: PRIVATE_DETAIL }], count: null }],
  ["unexpected count", { status: 200, error: null, data: null, count: 10 }],
  ["error with HTTP 200", { status: 200, error: { message: PRIVATE_DETAIL }, data: null, count: null }],
] as const) {
  test(`${name} cannot become successful proof or enter logs`, async () => {
    const state = harness({ proof });
    await state.instrumentation.register();
    assertLog(state, false);
  });
}

test("transport timeout aborts the only HEAD, resolves startup and never retries", async () => {
  const state = harness({ transport: "timeout" });
  const registration = state.instrumentation.register();
  await expect.poll(() => state.requests.length).toBe(1);
  expect(state.timeouts).toEqual([5_000]);
  state.controllers[0].abort(new DOMException(PRIVATE_DETAIL, "TimeoutError"));
  await registration;
  await state.instrumentation.register();
  assertLog(state, false);
  expect(state.requests).toHaveLength(1);
  expect(state.requests[0].signal.aborted).toBe(true);
});

test("transport exception emits no stack or secret and is not retried", async () => {
  const state = harness({ transport: "throw" });
  await state.instrumentation.register();
  assertLog(state, false);
  expect(state.requests).toHaveLength(1);
});

test("client construction failure cannot reject server startup or leak details", async () => {
  const state = harness({ clientThrows: true });
  await state.instrumentation.register();
  assertLog(state, false);
  expect(state.requests).toHaveLength(0);
});

test("concurrent calls and separately loaded bundles share one instance probe and event", async () => {
  const state = harness();
  const otherBundle = state.loadHelper();
  expect(state.helperImports).toBe(2);
  await Promise.all([state.instrumentation.register(), state.instrumentation.register(),
    state.helper.attestPreviewIsolationOnce(), otherBundle.attestPreviewIsolationOnce()]);
  assertLog(state, true);
  expect(state.requests).toHaveLength(1);
  expect(state.clientConstructions).toBe(1);
  // A genuinely new server instance is allowed its own one bounded proof.
  const coldInstance = harness();
  await coldInstance.instrumentation.register();
  assertLog(coldInstance, true);
  expect(coldInstance.requests).toHaveLength(1);
});

test("logging failure neither rejects startup nor repeats the probe", async () => {
  const state = harness({ loggerThrows: true });
  await state.instrumentation.register();
  await state.instrumentation.register();
  assertLog(state, true);
  expect(state.requests).toHaveLength(1);
});

test("URL whitespace matches the existing server-client normalization", async () => {
  const state = harness({ env: { NEXT_PUBLIC_SUPABASE_URL: ` ${ORIGIN} ` } });
  await state.instrumentation.register();
  assertLog(state, true);
  expect(state.requests).toHaveLength(1);
});
