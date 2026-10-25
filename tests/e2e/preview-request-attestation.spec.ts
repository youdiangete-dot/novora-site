import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { createContext, runInContext } from "node:vm";
import ts from "typescript";

const EVENT = "NOVORA_M2_REQUEST_ATTESTATION_V1";
const ORIGIN = "https://dibpksbbzjczpjusujwk.supabase.co";
const BRANCH = "integration/instant-first-preview-agent";
const PROJECT = "prj_H9Di3TIvXiZJHO06WwoaW8RqFfVg";
const KEY = "sb_secret_synthetic_offline_only";
const ADMIN = "synthetic-offline-admin-key";
const PRIVATE = "synthetic-private-backend-detail";
const requireTest = createRequire(__filename);

type Completed = Readonly<{ completed: true; isolatedBackendVerified: boolean }>;
type Helper = {
  attestPreviewIsolationOnce(): Promise<void>;
  readCompletedPreviewIsolationAttestation(): Completed | undefined;
  logRequestPreviewIsolationAttestationOnce(): void;
};
type Options = {
  env?: Record<string, string | undefined>;
  status?: number;
  deferred?: boolean;
  cookie?: "valid" | "invalid" | "missing" | "stale";
  loggerThrows?: boolean;
  startupLoggerThrows?: boolean;
};

// Execute the exact startup, route, admin and Supabase helper sources in one
// isolated server realm. Independently evaluated bundles share only globalThis.
// The installed SDK receives mandatory offline fetch; no real env or live IO.
function harness(options: Options = {}) {
  const env = {
    NEXT_RUNTIME: "nodejs", NODE_ENV: "production", VERCEL: "1",
    VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: BRANCH,
    VERCEL_PROJECT_ID: PROJECT, NEXT_PUBLIC_SUPABASE_URL: ORIGIN,
    SUPABASE_SERVICE_ROLE_KEY: KEY, NOVORA_ADMIN_ACCESS_KEY: ADMIN,
    ...options.env,
  };
  const envReads: string[] = [];
  const requests: Request[] = [];
  const logs: string[] = [];
  const timeouts: number[] = [];
  let clients = 0;
  let release: () => void = () => {};
  const context = createContext({
    process: { env: new Proxy(env, { get(target, name: string) {
      envReads.push(name);
      return target[name];
    } }) }, Buffer, URL, Response,
    AbortSignal: { timeout(ms: number) {
      timeouts.push(ms);
      return new AbortController().signal;
    } },
    console: { info(line: string) {
      logs.push(line);
      const event = JSON.parse(line).event;
      if ((options.loggerThrows && event === EVENT) ||
        (options.startupLoggerThrows && event !== EVENT)) throw new Error(PRIVATE);
    } },
  });
  const offlineFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push(new Request(input, init));
    if (options.deferred) await new Promise<void>((resolve) => { release = resolve; });
    const status = options.status ?? 200;
    return new Response(status >= 400 ? PRIVATE : null, { status });
  };
  function load(relative: string, dependencies: Record<string, unknown> = {}) {
    const filename = path.resolve(process.cwd(), relative);
    const compiled = ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
      fileName: filename,
    });
    const module = { exports: {} as Record<string, unknown> };
    const evaluate = runInContext(`(function(module, exports, require) {${compiled.outputText}\n})`, context, { filename });
    evaluate(module, module.exports, (name: string) => {
      if (name === "server-only") return {};
      if (name === "crypto") return requireTest("node:crypto");
      if (Object.hasOwn(dependencies, name)) return dependencies[name];
      throw new Error(`Unexpected offline dependency: ${name}`);
    });
    return module.exports;
  }
  const supabase = load("lib/server/supabase.ts", {
    "@supabase/supabase-js": { createClient(url: string, key: string, config: Parameters<typeof createClient>[2]) {
      clients += 1;
      return createClient(url, key, { ...config, global: { ...config?.global, fetch: offlineFetch } });
    } },
  });
  const admin = load("lib/server/admin-access.ts") as {
    ADMIN_ACCESS_COOKIE_NAME: string;
    createAdminAccessCookieValue(key: string): string | null;
  };
  const cookieValue = admin.createAdminAccessCookieValue(ADMIN);
  const loadHelper = () => load("lib/server/preview-isolation-attestation.ts", { "./supabase": supabase }) as Helper;
  const helper = loadHelper();
  const instrumentation = load("instrumentation.ts", {
    "./lib/server/preview-isolation-attestation": helper,
  }) as { register(): Promise<void> };
  const loadRoute = () => load("app/api/admin/preview-supabase-isolation/route.ts", {
    "../../../../lib/server/preview-isolation-attestation": loadHelper(),
    "../../../../lib/server/supabase": supabase,
    "../../../../lib/server/admin-access": admin,
    "next/headers": { async cookies() {
      return { get(name: string) {
        expect(name).toBe(admin.ADMIN_ACCESS_COOKIE_NAME);
        if (!options.cookie || options.cookie === "missing") return undefined;
        return { value: options.cookie === "valid" ? cookieValue
          : options.cookie === "stale" ? "0".repeat(64) : "invalid-cookie" };
      } };
    } },
  }) as { GET(): Promise<Response> };
  return { helper, instrumentation, route: loadRoute(), loadHelper, loadRoute,
    env, envReads, requests, logs, timeouts, release: () => release(),
    get clients() { return clients; },
    requestLogs: () => logs.map((line) => JSON.parse(line)).filter((entry) => entry.event === EVENT),
  };
}

async function responseContract(response: Response, status = 401, verified = false) {
  expect(response.status).toBe(status);
  expect(await response.text()).toBe(JSON.stringify({ isolatedBackendVerified: verified }));
  expect(Object.fromEntries(response.headers)).toEqual({
    "cache-control": "private, no-store", "cdn-cache-control": "no-store",
    "content-type": "application/json", "vercel-cdn-cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
}

function logContract(state: ReturnType<typeof harness>, available: boolean, verified: boolean) {
  expect(state.requestLogs()).toEqual([{
    event: EVENT, attestationAvailable: available, isolatedBackendVerified: verified,
  }]);
  for (const value of [KEY, ADMIN, PRIVATE, ORIGIN, BRANCH, PROJECT,
    "concept_briefs", "service_role", "publicReference", "stack"]) {
    expect(JSON.stringify(state.logs)).not.toContain(value);
  }
}

for (const verified of [true, false]) {
  test(`completed cached ${verified} is immutable, shared and synchronously read without side effects`, async () => {
    const state = harness({ status: verified ? 200 : 401 });
    await state.instrumentation.register();
    const before = { requests: state.requests.length, clients: state.clients, logs: state.logs.length };
    state.envReads.length = 0;
    const completed = state.helper.readCompletedPreviewIsolationAttestation();
    expect(completed).toEqual({ completed: true, isolatedBackendVerified: verified });
    expect(Object.isFrozen(completed)).toBe(true);
    expect(Reflect.set(completed, "isolatedBackendVerified", !verified)).toBe(false);
    expect(state.loadHelper().readCompletedPreviewIsolationAttestation()).toBe(completed);
    expect(state.helper.readCompletedPreviewIsolationAttestation()).toBe(completed);
    expect(state.envReads).toEqual([]);
    expect({ requests: state.requests.length, clients: state.clients, logs: state.logs.length }).toEqual(before);
    await responseContract(await state.route.GET());
    logContract(state, true, verified);
    expect(state.requests).toHaveLength(1);
    expect(state.clients).toBe(1);
    expect(state.envReads).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(state.envReads).not.toContain("NEXT_PUBLIC_SUPABASE_URL");
  });
}

test("absent cached result stays unavailable, with zero probes, clients or Secret reads", async () => {
  const state = harness();
  state.envReads.length = 0;
  expect(state.helper.readCompletedPreviewIsolationAttestation()).toBeUndefined();
  expect(state.envReads).toEqual([]);
  await responseContract(await state.route.GET());
  logContract(state, false, false);
  expect(state.helper.readCompletedPreviewIsolationAttestation()).toBeUndefined();
  expect(state.requests).toEqual([]);
  expect(state.clients).toBe(0);
  expect(state.envReads).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  expect(state.envReads).not.toContain("NEXT_PUBLIC_SUPABASE_URL");
  // An independent instance cannot inherit another process's proof or budget.
  const cold = harness();
  await responseContract(await cold.route.GET());
  logContract(cold, false, false);
});

test("in-flight startup is unavailable; the 401 never waits, retries or consumes a second log", async () => {
  const state = harness({ deferred: true });
  const startup = state.instrumentation.register();
  await expect.poll(() => state.requests.length).toBe(1);
  await responseContract(await state.route.GET());
  logContract(state, false, false);
  state.release();
  await startup;
  expect(state.helper.readCompletedPreviewIsolationAttestation()?.isolatedBackendVerified).toBe(true);
  await responseContract(await state.loadRoute().GET());
  logContract(state, false, false);
  expect(state.requests).toHaveLength(1);
});

for (const cookie of ["missing", "invalid", "stale"] as const) {
  test(`${cookie} cookie preserves 401 and never adds a database request`, async () => {
    const state = harness({ cookie });
    await state.instrumentation.register();
    state.envReads.length = 0;
    await responseContract(await state.route.GET());
    logContract(state, true, true);
    expect(state.clients).toBe(1);
    expect(state.requests).toHaveLength(1);
    expect(state.envReads).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });
}

for (const status of [200, 401]) {
  test(`authenticated route keeps its own existing HEAD and HTTP ${status === 200 ? 200 : 503}`, async () => {
    const state = harness({ cookie: "valid", status });
    await state.instrumentation.register();
    await responseContract(await state.route.GET(), status === 200 ? 200 : 503, status === 200);
    expect(state.requestLogs()).toEqual([]);
    expect(state.clients).toBe(2);
    expect(state.requests).toHaveLength(2);
    expect(state.timeouts).toEqual([5_000, 5_000]);
    expect(state.requests.every((request) => request.method === "HEAD")).toBe(true);
  });
}

for (const [name, env, httpStatus] of [
  ["Production", { VERCEL_ENV: "production" }, 404],
  ["wrong Preview branch", { VERCEL_GIT_COMMIT_REF: "codex/other" }, 404],
  ["wrong project", { VERCEL_PROJECT_ID: "prj_other" }, 401],
  ["Edge runtime", { NEXT_RUNTIME: "edge" }, 401],
  ["Build phase", { NEXT_PHASE: "phase-production-build" }, 401],
  ["development Node", { NODE_ENV: "development" }, 401],
  ["non-Vercel", { VERCEL: undefined }, 401],
] as Array<[string, Options["env"], number]>) {
  test(`${name} excludes request logging even with a completed result in memory`, async () => {
    const state = harness();
    await state.instrumentation.register();
    Object.assign(state.env, env);
    await responseContract(await state.route.GET(), httpStatus);
    state.helper.logRequestPreviewIsolationAttestationOnce();
    expect(state.requestLogs()).toEqual([]);
    expect(state.clients).toBe(1);
    expect(state.requests).toHaveLength(1);
  });
}

test("concurrent 401s and independently loaded route bundles log once per instance", async () => {
  const state = harness();
  await state.instrumentation.register();
  const other = state.loadRoute();
  const responses = await Promise.all(Array.from({ length: 20 }, (_, i) =>
    (i % 2 ? other : state.route).GET()));
  for (const response of responses) await responseContract(response);
  logContract(state, true, true);
  expect(state.clients).toBe(1);
  expect(state.requests).toHaveLength(1);
});

test("request logger failure preserves every 401 and consumes its single attempt", async () => {
  const state = harness({ loggerThrows: true });
  await state.instrumentation.register();
  const responses = await Promise.all([state.route.GET(), state.loadRoute().GET()]);
  for (const response of responses) await responseContract(response);
  logContract(state, true, true);
  expect(state.clients).toBe(1);
  expect(state.requests).toHaveLength(1);
});

test("startup logger failure does not discard the completed proof or trigger a new probe", async () => {
  const state = harness({ startupLoggerThrows: true });
  await state.instrumentation.register();
  await responseContract(await state.route.GET());
  logContract(state, true, true);
  expect(state.clients).toBe(1);
  expect(state.requests).toHaveLength(1);
});
