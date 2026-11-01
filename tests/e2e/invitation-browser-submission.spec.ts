import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import Module, { createRequire } from "node:module";
import path from "node:path";
import { submitInvitedConceptBrief } from "../../lib/client/invitation-submission";

const loader = Module as unknown as { _resolveFilename: (...args: any[]) => string };
const requireTest = createRequire(path.join(process.cwd(), "tests/e2e/invitation-browser-submission.spec.ts"));
const empty = requireTest.resolve("next/dist/compiled/server-only/empty.js");
const original = loader._resolveFilename;
loader._resolveFilename = function (name, ...args) { return name === "server-only" ? empty : original.call(this, name, ...args); };
const beta = requireTest("../../lib/server/ai-sketch/beta-admission") as typeof import("../../lib/server/ai-sketch/beta-admission");
const { createInvitationAccessGetHandler } = requireTest("../../app/api/invitation-access/handler") as typeof import("../../app/api/invitation-access/handler");
const { createReceiptAccessPostHandler } = requireTest("../../app/api/concept-briefs/receipt/access/handler") as typeof import("../../app/api/concept-briefs/receipt/access/handler");
const { verifyFirstPreviewCustomerAccessProof } = requireTest("../../lib/server/ai-sketch/first-preview-customer-access-contract") as typeof import("../../lib/server/ai-sketch/first-preview-customer-access-contract");
loader._resolveFilename = original;

const credential = "a".repeat(43);
const otherCredential = "b".repeat(43);
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const environment = {
  NOVORA_BETA_ADMISSION_ENABLED: "true",
  NOVORA_BETA_INVITATIONS_JSON: JSON.stringify([{ identity: "synthetic_a", credentialSha256: hash(credential) }, { identity: "synthetic_b", credentialSha256: hash(otherCredential) }]),
  NOVORA_BETA_SPENDING_AUTHORITY_ID: "synthetic_trial_authority",
  NOVORA_INVITATION_TRIAL_RECEIPTS_ENABLED: "true",
  NOVORA_INVITATION_TRIAL_RECEIPT_NAMESPACE: "synthetic_trial_namespace",
  VERCEL_PROJECT_ID: "prj_H9Di3TIvXiZJHO06WwoaW8RqFfVg",
  VERCEL_ENV: "preview", VERCEL_TARGET_ENV: "preview", NODE_ENV: "production",
};
const briefId = "123e4567-e89b-42d3-a456-426614174000";
const reference = "NOVORA-CB-20261101-TR12";
const requestId = "1".repeat(32);
const identity = { publicReference: reference, conceptBriefId: briefId };
const receipt = { briefId, reference, stage: "published" as const, reason: "enqueued" as const };
const payload = { customerEmail: "synthetic@example.invalid", brief: { pieceType: "ring", structure: "simple_band" } };
const access = { credential, partition: "c".repeat(64) };
class MemoryStorage {
  map = new Map<string, string>();
  getItem(key: string) { return this.map.get(key) ?? null; }
  setItem(key: string, value: string) { this.map.set(key, value); }
}
const request = (token = credential, body?: unknown, origin?: string) => new Request("https://trial.example/api/concept-briefs/receipt/access", {
  method: body === undefined ? "GET" : "POST",
  headers: { Authorization: `Bearer ${token}`, ...(origin ? { Origin: origin } : {}) },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});
const authenticate = (value: Request) => beta.authenticateScopedReceiptRequest(value, environment);

test("trial receipt identity is server verified, explicit and partitioned by target/namespace", () => {
  const a = authenticate(request());
  expect(a?.identity).toBe("synthetic_a");
  expect(authenticate(request(otherCredential))?.identity).toBe("synthetic_b");
  expect(authenticate(request("wrong"))).toBeNull();
  for (const override of [
    { NOVORA_INVITATION_TRIAL_RECEIPTS_ENABLED: undefined },
    { NOVORA_BETA_INVITATIONS_JSON: "[]" },
    { VERCEL_PROJECT_ID: "unrelated" },
    { VERCEL_ENV: "production" },
    { NOVORA_INVITATION_TRIAL_RECEIPT_NAMESPACE: "short" },
  ]) expect(beta.authenticateScopedReceiptRequest(request(), { ...environment, ...override })).toBeNull();
  expect(beta.authenticateScopedReceiptRequest(request(), { ...environment, NOVORA_INVITATION_TRIAL_RECEIPT_NAMESPACE: "different_trial_namespace" })?.scope).not.toBe(a?.scope);
  expect(beta.authenticateScopedReceiptRequest(request(), { ...environment, VERCEL_ENV: "production", VERCEL_TARGET_ENV: "production" })?.scope).not.toBe(a?.scope);
  expect(beta.authenticateScopedReceiptRequest(request(), { ...environment, NOVORA_BETA_SPENDING_AUTHORITY_ID: "replacement_budget_authority" })?.scope).toBe(a?.scope);
  const m2Environment = { ...environment,
    NOVORA_BETA_INVITATIONS_JSON: JSON.stringify([{ identity: "synthetic_a", credentialSha256: hash(credential) }]),
    VERCEL: "1", VERCEL_GIT_COMMIT_SHA: "a".repeat(40),
    VERCEL_GIT_COMMIT_REF: "integration/instant-first-preview-agent",
    VERCEL_DEPLOYMENT_ID: "dpl_syntheticDeployment123456", NEXT_RUNTIME: "nodejs",
    NOVORA_INSTANT_PREVIEW_AGENT_ENABLED: "true", NOVORA_FIRST_PREVIEW_QUEUE_EXECUTION_CONFIRMED: "true",
  };
  const originalM2 = beta.authenticateM2ReceiptRequest(request(), m2Environment);
  expect(originalM2).not.toBeNull();
  const stable = beta.authenticateScopedReceiptRequest(request(), m2Environment);
  expect(stable).toEqual(a);
  expect(stable).not.toEqual(originalM2);
  expect(beta.authenticateScopedReceiptRequest(request(), { ...m2Environment, VERCEL_DEPLOYMENT_ID: "dpl_otherSyntheticDeployment123", VERCEL_GIT_COMMIT_SHA: "b".repeat(40) })).toEqual(stable);
  expect(beta.isScopedReceiptOwnerActive(stable!, m2Environment)).toBe(true);
  expect(beta.isScopedReceiptOwnerActive(originalM2!, m2Environment)).toBe(false);
  expect(beta.authenticateScopedReceiptRequest(request(), { ...m2Environment, NOVORA_INVITATION_TRIAL_RECEIPTS_ENABLED: "false" })).toEqual(originalM2);
  expect(beta.authenticateScopedReceiptRequest(request(), { ...m2Environment, NOVORA_INVITATION_TRIAL_RECEIPTS_ENABLED: "invalid" })).toBeNull();
});

test("invitation status reveals no bearer, identity, digest or scope and legacy remains disabled", async () => {
  const handler = createInvitationAccessGetHandler({ environment, rateLimit: async () => ({ allowed: true, mode: "disabled", reason: "synthetic" }) });
  const valid = await handler(request());
  const result = await valid.json();
  expect(result).toEqual({ state: "verified", partition: expect.stringMatching(/^[a-f0-9]{64}$/) });
  for (const hidden of [credential, hash(credential), "synthetic_a", authenticate(request())!.scope]) expect(JSON.stringify(result)).not.toContain(hidden);
  expect(valid.headers.get("cache-control")).toBe("no-store");
  expect((await handler(request("wrong"))).status).toBe(401);
  expect(await (await createInvitationAccessGetHandler({ environment: {} })(request())).json()).toEqual({ state: "disabled" });
});

test("owned receipt reauthentication issues only the existing bounded private image session", async () => {
  const signingSecret = "synthetic-owned-receipt-session-signing-key";
  const handler = createReceiptAccessPostHandler({ authenticate,
    read: async (scope, id) => scope.identity === "synthetic_a" && id === requestId ? receipt : null,
    session: { featureFlagValue: "true", signingSecret, clock: () => 2_000_000_000, nonceSource: () => "synthetic_nonce_123456789" },
  });
  const response = await handler(request(credential, { clientRequestId: requestId }, "https://trial.example"));
  expect(response.status).toBe(200);
  const cookie = response.cookies.get("__Host-novora_first_preview_access")!;
  const cookieHeader = response.headers.get("set-cookie")!;
  expect(cookieHeader).toMatch(/HttpOnly/i); expect(cookieHeader).toMatch(/Secure/i); expect(cookieHeader).toMatch(/SameSite=strict/i);
  expect(cookieHeader).toContain("Max-Age=1800");
  const proof = verifyFirstPreviewCustomerAccessProof(cookie.value, signingSecret, 2_000_000_001);
  expect(proof).toMatchObject({ briefId, publicReference: reference });
  expect(await response.json()).toEqual({ ok: true, persisted: true, ...identity, receiptStage: "published" });
  expect((await handler(request(otherCredential, { clientRequestId: requestId }))).status).toBe(404);
  expect((await handler(request(credential, { clientRequestId: requestId }, "https://foreign.example"))).status).toBe(404);
  expect((await handler(request(credential, { clientRequestId: requestId, briefId }))).status).toBe(404);
});

test("revoked invitation and missing receipt cannot issue an image session or read another identity", async () => {
  let reads = 0;
  const handler = createReceiptAccessPostHandler({ authenticate, read: async () => { reads++; return null; } });
  expect((await handler(request("wrong", { clientRequestId: requestId }))).status).toBe(404);
  expect(reads).toBe(0);
  const response = await handler(request(credential, { clientRequestId: requestId }));
  expect(response.status).toBe(404); expect(response.headers.get("set-cookie")).toBeNull();
});

test("first browser request stores only correlation before the single scoped submission", async () => {
  const storage = new MemoryStorage(); let posts = 0;
  const transport = (async (url, options) => {
    expect(url).toBe("/api/concept-briefs"); posts++;
    const saved = JSON.parse([...storage.map.values()][0]);
    expect(saved.phase).toBe("attempted"); expect(saved.id).toMatch(/^[a-f0-9]{32}$/);
    const headers = new Headers(options?.headers);
    expect(headers.get("x-novora-client-request-id")).toBe(saved.id);
    expect(headers.get("idempotency-key")).toBe(saved.id);
    expect(headers.get("authorization")).toBe(`Bearer ${credential}`);
    return Response.json({ ok: true, persisted: true, ...identity }, { status: 201 });
  }) as typeof fetch;
  expect(await submitInvitedConceptBrief(payload, access, { storage, fetch: transport })).toEqual({ state: "confirmed", ...identity });
  expect(posts).toBe(1);
  const serialized = JSON.stringify([...storage.map.values()]);
  for (const hidden of [credential, "synthetic@example.invalid", "customerEmail", reference, briefId]) expect(serialized).not.toContain(hidden);
});

test("lost ACK and refresh recover by GET and owned session reauthentication, never resubmit", async () => {
  const storage = new MemoryStorage(); const calls: string[] = [];
  const transport = (async (url, options) => {
    calls.push(`${options?.method ?? "GET"} ${String(url).split("?")[0]}`);
    if (url === "/api/concept-briefs") throw new TypeError("synthetic disconnect after persistence");
    if (String(url).includes("/receipt?id=")) return Response.json({ status: "published", reason: "enqueued", ...identity });
    return Response.json({ ok: true, persisted: true, ...identity });
  }) as typeof fetch;
  expect((await submitInvitedConceptBrief(payload, access, { storage, fetch: transport })).state).toBe("unknown");
  expect(await submitInvitedConceptBrief(payload, access, { storage, fetch: transport })).toEqual({ state: "confirmed", ...identity });
  expect(calls).toEqual(["POST /api/concept-briefs", "GET /api/concept-briefs/receipt", "POST /api/concept-briefs/receipt/access"]);
});

test("an existing server receipt needs successful owned-session recovery before browser confirmation", async () => {
  let submissions = 0, accessCalls = 0;
  const storage = new MemoryStorage();
  const transport = (async (url) => {
    if (url === "/api/concept-briefs") { submissions++; return Response.json({ ok: true, persisted: true, ...identity }); }
    accessCalls++;
    return Response.json({ status: "unavailable" }, { status: 404 });
  }) as typeof fetch;
  expect((await submitInvitedConceptBrief(payload, access, { storage, fetch: transport })).state).toBe("unknown");
  expect(submissions).toBe(1); expect(accessCalls).toBe(1);
});

test("UNKNOWN, non-JSON, missing receipt and changed uncertain payload never create a second submission", async () => {
  const storage = new MemoryStorage(); let posts = 0;
  const transport = (async (url) => {
    if (url === "/api/concept-briefs") { posts++; return new Response("not JSON", { status: 502 }); }
    return Response.json({ status: "unavailable" }, { status: 404 });
  }) as typeof fetch;
  expect((await submitInvitedConceptBrief(payload, access, { storage, fetch: transport })).state).toBe("unknown");
  expect((await submitInvitedConceptBrief(payload, access, { storage, fetch: transport })).state).toBe("unknown");
  expect((await submitInvitedConceptBrief({ ...payload, changed: true }, access, { storage, fetch: transport })).state).toBe("conflict");
  expect(posts).toBe(1);
});

test("unavailable browser storage prevents submission and malformed confirmation cannot pass", async () => {
  let calls = 0;
  const transport = (async () => { calls++; return Response.json({ ok: true, persisted: true, publicReference: "wrong", conceptBriefId: briefId }); }) as typeof fetch;
  const storage = { getItem: () => null, setItem: () => { throw new Error("synthetic storage unavailable"); } };
  expect((await submitInvitedConceptBrief(payload, access, { storage, fetch: transport })).state).toBe("storage_unavailable"); expect(calls).toBe(0);
  expect((await submitInvitedConceptBrief(payload, access, { storage: new MemoryStorage(), fetch: transport })).state).toBe("unknown");
});
