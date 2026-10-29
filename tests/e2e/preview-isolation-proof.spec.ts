import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
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
const FLAGS_EVENT = "NOVORA_M2_PRIVATE_RUNTIME_FLAGS_V1";
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
  const cost = load("lib/server/ai-sketch/first-preview-cost-contract.ts", {});
  const beta = load("lib/server/ai-sketch/beta-admission.ts", {
    "node:crypto": requireTest("node:crypto"), "./first-preview-cost-contract": cost,
  });
  const helper = load("lib/server/preview-isolation-proof.ts", { "@vercel/oidc": oidc, "./supabase": supabase, "./ai-sketch/beta-admission": beta });
  const route = load("app/api/admin/preview-isolation-proof/route.ts", {
    "../../../../lib/server/preview-isolation-proof": helper,
  }) as { GET(request: Request): Promise<Response>; runtime: string; dynamic: string };
  return { route, requests, logs, timeouts, controllers, env,
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

function proofEvents(state: ReturnType<typeof harness>, isolatedBackendVerified: boolean) {
  expect(state.logs).toEqual([
    JSON.stringify({ event: EVENT, isolatedBackendVerified }),
    JSON.stringify({ event: FLAGS_EVENT, betaAdmissionEnabled: false,
      agentEnabled: false, queueExecutionEnabled: false, isolatedBackendVerified }),
  ]);
  for (const value of [KEY, PRIVATE, ORIGIN, PROJECT, TEAM]) {
    expect(JSON.stringify(state.logs)).not.toContain(value);
  }
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
  ["custom target", { VERCEL_TARGET_ENV: "production" }], ["empty target", { VERCEL_TARGET_ENV: "" }], ["wrong branch", { VERCEL_GIT_COMMIT_REF: "main" }],
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
    proofEvents(state, true);
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
    proofEvents(state, false);
  });
}

for (const status of [401, 403, 500, 503, 204, 206]) {
  test(`database HTTP ${status} cannot prove isolation and has no retry`, async () => {
    const state = harness({ status });
    await responseContract(await state.route.GET(request(await token())), 503, false);
    expect(state.requests).toHaveLength(1);
    proofEvents(state, false);
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
  proofEvents(state, true);
});

for (const value of ["true", "false", undefined, "TRUE", " true ", PRIVATE]) {
  test(`private flags accept only literal true (${String(value)}) without HTTP exposure`, async () => {
    const state = harness({ env: {
      NOVORA_BETA_ADMISSION_ENABLED: value,
      NOVORA_INSTANT_PREVIEW_AGENT_ENABLED: value,
      NOVORA_FIRST_PREVIEW_QUEUE_EXECUTION_CONFIRMED: value,
      OPENAI_API_KEY: PRIVATE,
      NOVORA_BETA_INVITATIONS_JSON: PRIVATE,
    } });
    const credential = await token();
    const response = await state.route.GET(request(credential, { cookie: PRIVATE }));
    if (value === "true") {
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ isolatedBackendVerified: true, m2BindingDiagnostics: {
        deploymentIdValid: false, sourceShaValid: false, authorityValid: false, invitationValid: false, targetValid: true,
      } });
    } else {
      await responseContract(response, 200, true);
    }
    expect(state.logs).toEqual([
      JSON.stringify({ event: EVENT, isolatedBackendVerified: true }),
      JSON.stringify({ event: FLAGS_EVENT, betaAdmissionEnabled: value === "true",
        agentEnabled: value === "true", queueExecutionEnabled: value === "true",
        isolatedBackendVerified: true }),
    ]);
    for (const secret of [credential, KEY, PRIVATE, ORIGIN]) {
      expect(JSON.stringify(state.logs)).not.toContain(secret);
    }
    // The offline loader rejects every undeclared dependency; the only outbound
    // operation is the unchanged Supabase zero-row HEAD, never Queue or Provider.
    expect(state.requests).toHaveLength(1);
    expect(state.requests[0].method).toBe("HEAD");
    expect(state.requests[0].url).toBe(`${ORIGIN}/rest/v1/concept_briefs?select=id&limit=0`);
  });
}

test("each authorized request reads its own current process flags and emits one event", async () => {
  const flags: Record<string, string | undefined> = {
    NOVORA_BETA_ADMISSION_ENABLED: "true",
    NOVORA_INSTANT_PREVIEW_AGENT_ENABLED: "false",
    NOVORA_FIRST_PREVIEW_QUEUE_EXECUTION_CONFIRMED: undefined,
  };
  const state = harness({ env: flags });
  await responseContract(await state.route.GET(request(await token())), 200, true);
  Object.assign(state.env, { NOVORA_BETA_ADMISSION_ENABLED: "false",
    NOVORA_INSTANT_PREVIEW_AGENT_ENABLED: "true", NOVORA_FIRST_PREVIEW_QUEUE_EXECUTION_CONFIRMED: "true" });
  await responseContract(await state.route.GET(request(await token())), 200, true);
  const events = state.logs.map(line => JSON.parse(line)).filter(event => event.event === FLAGS_EVENT);
  expect(events).toEqual([
    { event: FLAGS_EVENT, betaAdmissionEnabled: true, agentEnabled: false,
      queueExecutionEnabled: false, isolatedBackendVerified: true },
    { event: FLAGS_EVENT, betaAdmissionEnabled: false, agentEnabled: true,
      queueExecutionEnabled: true, isolatedBackendVerified: true },
  ]);
  expect(state.logs).toHaveLength(4);
  expect(state.requests).toHaveLength(2);
});

test("only an authorized isolated Preview exposes the derived opaque M2 binding", async () => {
  const identity = "synthetic_private_invitation";
  const credentialHash = "b".repeat(64);
  const authority = "synthetic_private_authority";
  const sourceSha = "a".repeat(40);
  const deploymentId = "dpl_synthetic0123456789";
  const env = {
    VERCEL_GIT_COMMIT_SHA: sourceSha, VERCEL_DEPLOYMENT_ID: deploymentId,
    NOVORA_BETA_ADMISSION_ENABLED: "true", NOVORA_INSTANT_PREVIEW_AGENT_ENABLED: "true",
    NOVORA_FIRST_PREVIEW_QUEUE_EXECUTION_CONFIRMED: "true", NOVORA_BETA_SPENDING_AUTHORITY_ID: authority,
    NOVORA_BETA_INVITATIONS_JSON: JSON.stringify([{ identity, credentialSha256: credentialHash }]),
  };
  const expected = createHash("sha256").update([
    "novora_m2_e2e_preview_v1", PROJECT, BRANCH, sourceSha, deploymentId, authority, identity, credentialHash,
  ].join("\n")).digest("hex");
  const state = harness({ env });
  const response = await state.route.GET(request(await token()));
  expect(response.status).toBe(200);
  const body = await response.text();
  expect(JSON.parse(body)).toEqual({ isolatedBackendVerified: true, m2Binding: {
    ledgerKey: `novora:beta-admission:m2-e2e:v1:${expected}`,
    authorityId: `m2e2e_${expected.slice(0, 56)}`,
    runtimeBinding: expected, deploymentId, sourceSha,
  } });
  for (const secret of [identity, credentialHash, authority, KEY, ORIGIN]) {
    expect(body).not.toContain(secret);
    expect(JSON.stringify(state.logs)).not.toContain(secret);
  }
  expect(state.requests).toHaveLength(1);

  const unauthorized = harness({ env });
  await responseContract(await unauthorized.route.GET(request()), 401);
  noDatabase(unauthorized);
  const production = harness({ env: { ...env, VERCEL_ENV: "production" } });
  await responseContract(await production.route.GET(request(await token())), 404);
  noDatabase(production);
  for (const patch of [{ NOVORA_FIRST_PREVIEW_QUEUE_EXECUTION_CONFIRMED: "false" }]) {
    const invalid = harness({ env: { ...env, ...patch } });
    await responseContract(await invalid.route.GET(request(await token())), 200, true);
  }
  const failedBackend = harness({ env, status: 503 });
  await responseContract(await failedBackend.route.GET(request(await token())), 503, false);
});

test("authorized isolated proof reports only fixed binding prerequisite booleans", async () => {
  const env = {
    VERCEL_GIT_COMMIT_SHA: "a".repeat(40), VERCEL_DEPLOYMENT_ID: "dpl_synthetic0123456789",
    NOVORA_BETA_ADMISSION_ENABLED: "true", NOVORA_INSTANT_PREVIEW_AGENT_ENABLED: "true",
    NOVORA_FIRST_PREVIEW_QUEUE_EXECUTION_CONFIRMED: "true", NOVORA_BETA_SPENDING_AUTHORITY_ID: "synthetic_private_authority",
    NOVORA_BETA_INVITATIONS_JSON: JSON.stringify([{ identity: "synthetic_private_invitation", credentialSha256: "b".repeat(64) }]),
  };
  const checks = [
    ["deploymentIdValid", { VERCEL_DEPLOYMENT_ID: "invalid" }],
    ["sourceShaValid", { VERCEL_GIT_COMMIT_SHA: "invalid" }],
    ["authorityValid", { NOVORA_BETA_SPENDING_AUTHORITY_ID: "" }],
    ["invitationValid", { NOVORA_BETA_INVITATIONS_JSON: "invalid" }],
  ] as const;
  for (const [failed, patch] of checks) {
    const state = harness({ env: { ...env, ...patch } });
    const response = await state.route.GET(request(await token()));
    expect(response.status).toBe(200);
    const body = await response.text();
    const expected = { deploymentIdValid: true, sourceShaValid: true, authorityValid: true, invitationValid: true, targetValid: true, [failed]: false };
    expect(JSON.parse(body)).toEqual({ isolatedBackendVerified: true, m2BindingDiagnostics: expected });
    for (const value of [env.NOVORA_BETA_SPENDING_AUTHORITY_ID, env.NOVORA_BETA_INVITATIONS_JSON, "synthetic_private_invitation", "b".repeat(64), KEY, ORIGIN]) {
      expect(body).not.toContain(value);
    }
  }
  const unauthorized = harness({ env: { ...env, VERCEL_DEPLOYMENT_ID: "invalid" } });
  await responseContract(await unauthorized.route.GET(request()), 401);
  noDatabase(unauthorized);
  const nonPreview = harness({ env: { ...env, VERCEL_TARGET_ENV: "" } });
  await responseContract(await nonPreview.route.GET(request(await token())), 404);
  noDatabase(nonPreview);
});
