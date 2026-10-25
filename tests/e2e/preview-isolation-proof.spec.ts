import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { createContext, runInContext } from "node:vm";
import ts from "typescript";

const requireTest = createRequire(__filename);
const oidcDirectory = path.dirname(requireTest.resolve("@vercel/oidc"));
const jose: typeof import("jose") = createRequire(requireTest.resolve("@vercel/oidc"))("jose");
const PROJECT = "prj_H9Di3TIvXiZJHO06WwoaW8RqFfVg";
const TEAM = "team_9VhRPiCaRc62kna4XyNKvPZ7";
const BRANCH = "integration/instant-first-preview-agent";
const ORIGIN = "https://dibpksbbzjczpjusujwk.supabase.co";
const KEY = "sb_secret_synthetic_offline_only";
const PRIVATE = "synthetic-private-error";
const EVENT = "NOVORA_M2_PROTECTED_RUNTIME_PROOF_V1";
let signing: Awaited<ReturnType<typeof jose.generateKeyPair>>;
let other: Awaited<ReturnType<typeof jose.generateKeyPair>>;
let publicJwk: Awaited<ReturnType<typeof jose.exportJWK>>;

test.beforeAll(async () => {
  signing = await jose.generateKeyPair("RS256");
  other = await jose.generateKeyPair("RS256");
  publicJwk = { ...await jose.exportJWK(signing.publicKey), kid: "offline-fixture", alg: "RS256" };
});

async function token(changes: Record<string, unknown> = {}, wrongKey = false) {
  const now = Math.floor(Date.now() / 1000);
  const claims: Record<string, unknown> = {
    iss: "https://oidc.vercel.com/novoradesign", aud: "https://vercel.com/novoradesign",
    sub: "owner:novoradesign:project:project-dd34e:environment:development",
    owner_id: TEAM, project_id: PROJECT, environment: "development",
    iat: now, nbf: now, exp: now + 43_200, ...changes,
  };
  return new jose.SignJWT(claims).setProtectedHeader({ alg: "RS256", typ: "JWT", kid: "offline-fixture" })
    .sign(wrongKey ? other.privateKey : signing.privateKey);
}

type Options = {
  env?: Record<string, string | undefined>;
  status?: number;
  transport?: "throw" | "timeout";
  proof?: unknown;
  jwksFailure?: boolean;
  loggerThrows?: boolean;
};

function harness(options: Options = {}) {
  const env = {
    NEXT_RUNTIME: "nodejs", NODE_ENV: "production", VERCEL: "1", VERCEL_ENV: "preview",
    VERCEL_GIT_COMMIT_REF: BRANCH, VERCEL_PROJECT_ID: PROJECT,
    NEXT_PUBLIC_SUPABASE_URL: ORIGIN, SUPABASE_SERVICE_ROLE_KEY: KEY, ...options.env,
  };
  const requests: Request[] = [];
  const logs: string[] = [];
  const timeouts: number[] = [];
  const controllers: AbortController[] = [];
  let clients = 0;
  let verifications = 0;
  const context = createContext({
    process: { env }, Buffer, URL, Response,
    AbortSignal: { timeout(ms: number) {
      timeouts.push(ms);
      const controller = new AbortController();
      controllers.push(controller);
      return controller.signal;
    } },
    console: { info(line: string) {
      logs.push(line);
      if (options.loggerThrows) throw new Error(PRIVATE);
    } },
  });
  function evaluate(source: string, filename: string, dependencies: Record<string, unknown>) {
    const module = { exports: {} as Record<string, unknown> };
    const fn = runInContext(`(function(module, exports, require) {${source}\n})`, context, { filename });
    fn(module, module.exports, (name: string) => {
      if (name === "server-only") return {};
      if (Object.hasOwn(dependencies, name)) return dependencies[name];
      throw new Error(`Unexpected offline dependency: ${name}`);
    });
    return module.exports;
  }
  function load(relative: string, dependencies: Record<string, unknown>) {
    const filename = path.resolve(process.cwd(), relative);
    const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: filename,
    });
    return evaluate(outputText, filename, dependencies);
  }
  // Execute the installed official verifier unchanged. Only its remote key
  // resolver is replaced by controlled local public keys: real jwtVerify,
  // signatures and claim checks run; no network or real OIDC credentials exist.
  const verifierPath = path.join(oidcDirectory, "verify-vercel-oidc-token.js");
  const oidc = evaluate(readFileSync(verifierPath, "utf8"), verifierPath, {
    jose: { ...jose, createRemoteJWKSet(url: URL) {
      expect(url.href).toBe("https://oidc.vercel.com/.well-known/jwks");
      const resolve = jose.createLocalJWKSet({ keys: [publicJwk] });
      return (...args: Parameters<typeof resolve>) => {
        verifications += 1;
        if (options.jwksFailure) throw new Error(PRIVATE);
        return resolve(...args);
      };
    } },
  });
  const supabase = load("lib/server/supabase.ts", {
    "@supabase/supabase-js": { createClient(url: string, key: string, config: Parameters<typeof createClient>[2]) {
      clients += 1;
      if (Object.hasOwn(options, "proof")) {
        return { from: () => ({ select: () => ({ limit: () => ({ retry: () => ({
          abortSignal: async () => options.proof,
        }) }) }) }) };
      }
      return createClient(url, key, { ...config, global: { ...config?.global,
        fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
          const request = new Request(input, init);
          requests.push(request);
          if (options.transport === "throw") throw new Error(PRIVATE);
          if (options.transport === "timeout") return new Promise<Response>((_, reject) => {
            request.signal.addEventListener("abort", () => reject(new Error(PRIVATE)), { once: true });
          });
          const status = options.status ?? 200;
          return new Response(status >= 400 ? PRIVATE : null, { status });
        },
      } });
    } },
  });
  const helper = load("lib/server/preview-isolation-proof.ts", { "@vercel/oidc": oidc, "./supabase": supabase });
  const route = load("app/api/admin/preview-isolation-proof/route.ts", {
    "../../../../lib/server/preview-isolation-proof": helper,
  }) as { GET(request: Request): Promise<Response>; runtime: string; dynamic: string };
  return { route, requests, logs, timeouts, controllers,
    get clients() { return clients; }, get verifications() { return verifications; } };
}

function request(value?: string, extra: Record<string, string> = {}) {
  return new Request("https://offline.invalid/api/admin/preview-isolation-proof", {
    headers: { ...(value ? { authorization: `Bearer ${value}` } : {}), ...extra },
  });
}

async function responseContract(response: Response, status: number, verified?: boolean) {
  expect(response.status).toBe(status);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(response.headers.get("cdn-cache-control")).toBe("no-store");
  expect(response.headers.get("vercel-cdn-cache-control")).toBe("no-store");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  const body = await response.text();
  expect(body).toBe(verified === undefined ? "" : JSON.stringify({ isolatedBackendVerified: verified }));
  for (const value of [KEY, PRIVATE, ORIGIN, PROJECT, TEAM, "concept_briefs", "stack", "eyJ"]) {
    expect(body).not.toContain(value);
  }
}

function noDatabase(state: ReturnType<typeof harness>) {
  expect(state.clients).toBe(0);
  expect(state.requests).toEqual([]);
  expect(state.logs).toEqual([]);
  expect(state.timeouts).toEqual([]);
}

for (const [name, changes] of [
  ["wrong issuer", { iss: "https://attacker.invalid" }],
  ["other Vercel issuer", { iss: "https://oidc.vercel.com/other-team" }],
  ["wrong project", { project_id: "prj_other" }],
  ["wrong team", { owner_id: "team_other" }],
  ["wrong environment", { environment: "production" }],
  ["Preview caller", { environment: "preview" }],
  ["wrong audience", { aud: "https://attacker.invalid" }],
  ["wrong subject", { sub: "owner:other:project:other:environment:development" }],
  ["expired", { exp: 1 }],
  ["too old", { iat: Math.floor(Date.now() / 1000) - 301 }],
  ["future issuance", { iat: Math.floor(Date.now() / 1000) + 120 }],
  ["future nbf", { nbf: Math.floor(Date.now() / 1000) + 120 }],
  ["unbounded expiry", { exp: Math.floor(Date.now() / 1000) + 86_400 }],
] as Array<[string, Record<string, unknown>]>) {
  test(`${name}: signed fixture denied with zero client construction/queries`, async () => {
    const state = harness();
    await responseContract(await state.route.GET(request(await token(changes))), 401);
    noDatabase(state);
  });
}

for (const claim of ["exp", "iat", "nbf", "iss", "aud", "sub", "owner_id", "project_id", "environment"]) {
  test(`missing ${claim} fails closed`, async () => {
    const state = harness();
    await responseContract(await state.route.GET(request(await token({ [claim]: undefined }))), 401);
    noDatabase(state);
  });
}

test("missing token, forged protection header and workload identity never authorize", async () => {
  for (const headers of [{}, { "x-vercel-trusted-oidc-idp-token": "forged" },
    { "x-vercel-oidc-token": await token() }, { "x-vercel-trusted-oidc-idp-token": await token() },
    { cookie: "novora_admin_access=forged" }, { authorization: "Basic forged" }]) {
    const state = harness();
    await responseContract(await state.route.GET(request(undefined, headers)), 401);
    noDatabase(state);
  }
});

for (const value of ["arbitrary-forged-header", "a.b.c", "e30.e30.invalid", "a".repeat(17_000)]) {
  test(`malformed token (${value.length} bytes) is denied`, async () => {
    const state = harness();
    await responseContract(await state.route.GET(request(value)), 401);
    noDatabase(state);
  });
}

test("invalid RSA signature is actually checked", async () => {
  const state = harness();
  await responseContract(await state.route.GET(request(await token({}, true))), 401);
  expect(state.verifications).toBe(1);
  noDatabase(state);
});

test("unverifiable JWKS fails closed without a Supabase client", async () => {
  const state = harness({ jwksFailure: true });
  await responseContract(await state.route.GET(request(await token())), 401);
  noDatabase(state);
});

for (const [name, env] of [
  ["Production", { VERCEL_ENV: "production" }], ["missing env", { VERCEL_ENV: undefined }],
  ["custom target", { VERCEL_TARGET_ENV: "production" }], ["wrong branch", { VERCEL_GIT_COMMIT_REF: "main" }],
  ["missing branch", { VERCEL_GIT_COMMIT_REF: undefined }], ["wrong project", { VERCEL_PROJECT_ID: "prj_other" }],
  ["missing project", { VERCEL_PROJECT_ID: undefined }], ["Edge", { NEXT_RUNTIME: "edge" }],
  ["Build", { NEXT_PHASE: "phase-production-build" }], ["local", { VERCEL: undefined }],
  ["dev Node", { NODE_ENV: "development" }],
] as Array<[string, Options["env"]]>) {
  test(`${name} instance cannot operate`, async () => {
    const state = harness({ env });
    await responseContract(await state.route.GET(request(await token())), 404);
    expect(state.verifications).toBe(0);
    noDatabase(state);
  });
}

for (const issuer of ["https://oidc.vercel.com", "https://oidc.vercel.com/novoradesign"]) {
  test(`verified ${issuer} caller makes exactly one authenticated zero-row HEAD`, async () => {
    const state = harness();
    const credential = await token({ iss: issuer });
    await responseContract(await state.route.GET(request(credential, {
      "x-vercel-trusted-oidc-idp-token": credential, "x-vercel-id": PRIVATE,
    })), 200, true);
    expect(state.route.runtime).toBe("nodejs");
    expect(state.route.dynamic).toBe("force-dynamic");
    expect(state.verifications).toBe(1);
    expect(state.clients).toBe(1);
    expect(state.requests).toHaveLength(1);
    expect(state.timeouts).toEqual([5_000]);
    const sent = state.requests[0];
    expect(sent.url).toBe(`${ORIGIN}/rest/v1/concept_briefs?select=id&limit=0`);
    expect(sent.method).toBe("HEAD");
    expect(sent.body).toBeNull();
    expect(sent.headers.get("authorization")).toBe(`Bearer ${KEY}`);
    expect(sent.headers.get("apikey")).toBe(KEY);
    expect(sent.headers.get("prefer")).toBeNull();
    expect(state.logs).toEqual([JSON.stringify({ event: EVENT, isolatedBackendVerified: true })]);
    expect(JSON.stringify(state.logs)).not.toContain(credential);
    expect(JSON.stringify(state.logs)).not.toContain(PRIVATE);
  });
}

for (const [name, env] of [
  ["missing credential", { SUPABASE_SERVICE_ROLE_KEY: undefined }],
  ["anon credential", { SUPABASE_SERVICE_ROLE_KEY: "not-an-admin-key" }],
  ["Production origin", { NEXT_PUBLIC_SUPABASE_URL: "https://pzjypjddmrngdnrjbhsw.supabase.co" }],
  ["origin prefix attack", { NEXT_PUBLIC_SUPABASE_URL: `${ORIGIN}.attacker.invalid` }],
  ["missing origin", { NEXT_PUBLIC_SUPABASE_URL: undefined }],
] as Array<[string, Options["env"]]>) {
  test(`${name}: verified caller gets only false, without database IO`, async () => {
    const state = harness({ env });
    await responseContract(await state.route.GET(request(await token())), 503, false);
    expect(state.clients).toBe(0);
    expect(state.requests).toEqual([]);
    expect(state.logs).toEqual([JSON.stringify({ event: EVENT, isolatedBackendVerified: false })]);
  });
}

for (const status of [401, 403, 500, 503, 204, 206]) {
  test(`database HTTP ${status} cannot prove isolation and has no retry`, async () => {
    const state = harness({ status });
    await responseContract(await state.route.GET(request(await token())), 503, false);
    expect(state.requests).toHaveLength(1);
    expect(state.logs).toEqual([JSON.stringify({ event: EVENT, isolatedBackendVerified: false })]);
  });
}

test("database transport failure has exactly one attempt", async () => {
  const state = harness({ transport: "throw" });
  await responseContract(await state.route.GET(request(await token())), 503, false);
  expect(state.requests).toHaveLength(1);
});

test("5000ms abort fails closed without retry", async () => {
  const state = harness({ transport: "timeout" });
  const result = state.route.GET(request(await token()));
  await expect.poll(() => state.requests.length).toBe(1);
  expect(state.timeouts).toEqual([5_000]);
  state.controllers[0].abort();
  await responseContract(await result, 503, false);
  expect(state.requests).toHaveLength(1);
});

for (const proof of [
  { status: 200, error: {}, data: null, count: null },
  { status: 200, error: null, data: [], count: null },
  { status: 200, error: null, data: null, count: 0 },
  { status: 200, error: null, data: null },
]) {
  test(`incomplete proof fails closed: ${JSON.stringify(proof)}`, async () => {
    const state = harness({ proof });
    await responseContract(await state.route.GET(request(await token())), 503, false);
  });
}

test("logger failure cannot repeat the query or expose details", async () => {
  const state = harness({ loggerThrows: true });
  await responseContract(await state.route.GET(request(await token())), 200, true);
  expect(state.requests).toHaveLength(1);
  expect(state.logs).toHaveLength(1);
});
