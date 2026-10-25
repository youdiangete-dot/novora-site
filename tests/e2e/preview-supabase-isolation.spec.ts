import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const ORIGIN = "https://dibpksbbzjczpjusujwk.supabase.co";
const PRODUCTION_ORIGIN = "https://pzjypjddmrngdnrjbhsw.supabase.co";
const BRANCH = "integration/instant-first-preview-agent";
const ADMIN_KEY = "synthetic-offline-admin-key";
const SERVICE_KEY = "sb_secret_synthetic_offline_only";
const PRIVATE_DETAIL = "synthetic-private-backend-detail";
const requireTest = createRequire(__filename);

type Options = {
  env?: Record<string, string | undefined>;
  cookie?: "valid" | "invalid" | "missing" | "stale";
  status?: number;
  throws?: boolean;
  proof?: unknown;
};

// Execute the exact route and both real helpers with an isolated environment.
// The real SDK receives a mandatory offline fetch; no process env or live keys
// are read and no development server, database, or cloud service is started.
function harness(options: Options = {}) {
  const env = {
    VERCEL_ENV: "preview",
    VERCEL_GIT_COMMIT_REF: BRANCH,
    NEXT_PUBLIC_SUPABASE_URL: ORIGIN,
    NOVORA_ADMIN_ACCESS_KEY: ADMIN_KEY,
    SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
    ...options.env,
  };
  const requests: Request[] = [];
  let clientConstructions = 0;
  let cookieReads = 0;
  const offlineFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push(new Request(input, init));
    if (options.throws) throw new Error(PRIVATE_DETAIL);
    const status = options.status ?? 200;
    return new Response(status >= 400 ? PRIVATE_DETAIL : null, { status });
  };
  function load(relativePath: string, dependencies: Record<string, unknown> = {}) {
    const filename = path.resolve(process.cwd(), relativePath);
    const compiled = ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
      fileName: filename,
    });
    const module = { exports: {} as Record<string, unknown> };
    runInNewContext(compiled.outputText, {
      module, exports: module.exports, process: { env }, Buffer,
      Response, AbortSignal, URL,
      require(name: string) {
        if (name === "server-only") return {};
        if (Object.hasOwn(dependencies, name)) return dependencies[name];
        if (name === "crypto") return requireTest("node:crypto");
        throw new Error(`Unexpected offline dependency: ${name}`);
      },
    }, { filename });
    return module.exports;
  }
  const admin = load("lib/server/admin-access.ts") as {
    ADMIN_ACCESS_COOKIE_NAME: string;
    createAdminAccessCookieValue(key: string): string | null;
  };
  const cookieValue = admin.createAdminAccessCookieValue(ADMIN_KEY);
  const supabase = load("lib/server/supabase.ts", {
    "@supabase/supabase-js": {
      createClient(url: string, key: string, config: Parameters<typeof createClient>[2]) {
        clientConstructions += 1;
        // Only malformed SDK-result tests replace the query result. All other
        // tests exercise the real SDK and its actual authenticated HEAD request.
        if (Object.hasOwn(options, "proof")) {
          return { from: () => ({ select: () => ({ limit: () => ({ retry: () => ({
            abortSignal: async () => options.proof,
          }) }) }) }) };
        }
        return createClient(url, key, {
          ...config,
          global: { ...config?.global, fetch: offlineFetch },
        });
      },
    },
  });
  const route = load("app/api/admin/preview-supabase-isolation/route.ts", {
    "next/headers": {
      async cookies() {
        cookieReads += 1;
        return { get(name: string) {
          expect(name).toBe(admin.ADMIN_ACCESS_COOKIE_NAME);
          if (options.cookie === "missing") return undefined;
          return { value: options.cookie === "invalid" ? "invalid-cookie"
            : options.cookie === "stale" ? "0".repeat(64) : cookieValue };
        } };
      },
    },
    "../../../../lib/server/admin-access": admin,
    "../../../../lib/server/supabase": supabase,
  }) as { GET(): Promise<Response>; runtime: string; dynamic: string; revalidate: number; fetchCache: string };
  return { route, requests, get clientConstructions() { return clientConstructions; },
    get cookieReads() { return cookieReads; } };
}

async function assertResponse(response: Response, status: number, verified: boolean) {
  expect(response.status).toBe(status);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(response.headers.get("cdn-cache-control")).toBe("no-store");
  expect(response.headers.get("vercel-cdn-cache-control")).toBe("no-store");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  expect(response.headers.get("location")).toBeNull();
  const body = await response.text();
  expect(body).toBe(JSON.stringify({ isolatedBackendVerified: verified }));
  const emitted = body + JSON.stringify([...response.headers]);
  for (const privateValue of [ORIGIN, PRODUCTION_ORIGIN, SERVICE_KEY, ADMIN_KEY,
    PRIVATE_DETAIL, "concept_briefs", "service_role", "publicReference"]) {
    expect(emitted).not.toContain(privateValue);
  }
}

test("protected Node route proves an authenticated isolated HEAD with no rows or counts", async () => {
  const state = harness();
  expect(state.route.runtime).toBe("nodejs");
  expect(state.route.dynamic).toBe("force-dynamic");
  expect(state.route.revalidate).toBe(0);
  expect(state.route.fetchCache).toBe("force-no-store");
  await assertResponse(await state.route.GET(), 200, true);
  expect(state.clientConstructions).toBe(1);
  expect(state.requests).toHaveLength(1);
  const request = state.requests[0];
  const url = new URL(request.url);
  expect(url.origin).toBe(ORIGIN);
  expect(url.pathname).toBe("/rest/v1/concept_briefs");
  expect([...url.searchParams]).toEqual([["select", "id"], ["limit", "0"]]);
  expect(request.method).toBe("HEAD");
  expect(request.body).toBeNull();
  expect(request.headers.get("authorization")).toBe(`Bearer ${SERVICE_KEY}`);
  expect(request.headers.get("apikey")).toBe(SERVICE_KEY);
  expect(request.headers.get("prefer")).toBeNull();
});

const denied: Array<[string, Options, number]> = [
  ["Production", { env: { VERCEL_ENV: "production" } }, 404],
  ["development", { env: { VERCEL_ENV: "development" } }, 404],
  ["missing environment", { env: { VERCEL_ENV: undefined } }, 404],
  ["wrong Preview branch", { env: { VERCEL_GIT_COMMIT_REF: "codex/other" } }, 404],
  ["missing branch", { env: { VERCEL_GIT_COMMIT_REF: undefined } }, 404],
  ["missing admin cookie", { cookie: "missing" }, 401],
  ["invalid admin cookie", { cookie: "invalid" }, 401],
  ["stale admin cookie", { cookie: "stale" }, 401],
  ["missing admin configuration", { env: { NOVORA_ADMIN_ACCESS_KEY: undefined } }, 401],
  ["Production URL", { env: { NEXT_PUBLIC_SUPABASE_URL: PRODUCTION_ORIGIN } }, 503],
  ["malformed URL", { env: { NEXT_PUBLIC_SUPABASE_URL: "not-a-url" } }, 503],
  ["missing URL", { env: { NEXT_PUBLIC_SUPABASE_URL: undefined } }, 503],
  ["empty URL", { env: { NEXT_PUBLIC_SUPABASE_URL: " " } }, 503],
  ["URL suffix", { env: { NEXT_PUBLIC_SUPABASE_URL: `${ORIGIN}.attacker.test` } }, 503],
  ["URL path", { env: { NEXT_PUBLIC_SUPABASE_URL: `${ORIGIN}/` } }, 503],
  ["URL query", { env: { NEXT_PUBLIC_SUPABASE_URL: `${ORIGIN}?project=other` } }, 503],
  ["URL credentials", { env: { NEXT_PUBLIC_SUPABASE_URL: ORIGIN.replace("://", "://user@") } }, 503],
  ["insecure URL", { env: { NEXT_PUBLIC_SUPABASE_URL: ORIGIN.replace("https:", "http:") } }, 503],
  ["missing service role", { env: { SUPABASE_SERVICE_ROLE_KEY: undefined } }, 503],
  ["invalid service role", { env: { SUPABASE_SERVICE_ROLE_KEY: "anon-key" } }, 503],
];

for (const [name, options, status] of denied) {
  test(`${name} fails closed before any database call`, async () => {
    const state = harness(options);
    await assertResponse(await state.route.GET(), status, false);
    expect(state.requests).toHaveLength(0);
    expect(state.clientConstructions).toBe(0);
    if (status === 404) expect(state.cookieReads).toBe(0);
  });
}

for (const status of [401, 403, 500, 503, 204, 206]) {
  test(`backend status ${status} is not isolation proof and emits no backend detail`, async () => {
    const state = harness({ status });
    await assertResponse(await state.route.GET(), 503, false);
    expect(state.requests).toHaveLength(1);
  });
}

test("database transport failure remains opaque", async () => {
  const state = harness({ throws: true });
  await assertResponse(await state.route.GET(), 503, false);
  expect(state.requests).toHaveLength(1);
  expect(state.requests.every((request) => request.method === "HEAD")).toBe(true);
});

for (const [name, proof] of [
  ["absent result", undefined],
  ["incomplete result", { status: 200 }],
  ["unexpected records", { status: 200, error: null, data: [{ id: PRIVATE_DETAIL }], count: null }],
  ["unexpected count", { status: 200, error: null, data: null, count: 10 }],
  ["error on success status", { status: 200, error: { message: PRIVATE_DETAIL }, data: null, count: null }],
] as const) {
  test(`${name} cannot produce PASS or leak data`, async () => {
    const state = harness({ proof });
    await assertResponse(await state.route.GET(), 503, false);
  });
}
