import "server-only";

import { verifyVercelOidcToken } from "@vercel/oidc";
import { resolveBetaAdmissionBinding } from "./ai-sketch/beta-admission";
import { createSupabaseAdminClientOrNull } from "./supabase";

const PROJECT = "prj_H9Di3TIvXiZJHO06WwoaW8RqFfVg";
const TEAM = "team_9VhRPiCaRc62kna4XyNKvPZ7";
const BRANCH = "integration/instant-first-preview-agent";
const ORIGIN = "https://dibpksbbzjczpjusujwk.supabase.co";
const SUBJECT = "owner:novoradesign:project:project-dd34e:environment:development";
const NO_STORE = {
  "cache-control": "private, no-store",
  "cdn-cache-control": "no-store",
  "vercel-cdn-cache-control": "no-store",
  "x-content-type-options": "nosniff",
};

function isAllowedInstance(): boolean {
  return process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.NODE_ENV === "production" && process.env.VERCEL === "1" &&
    process.env.VERCEL_ENV === "preview" &&
    (!process.env.VERCEL_TARGET_ENV || process.env.VERCEL_TARGET_ENV === "preview") &&
    process.env.VERCEL_PROJECT_ID === PROJECT &&
    process.env.VERCEL_GIT_COMMIT_REF === BRANCH &&
    process.env.NEXT_PHASE !== "phase-production-build";
}

async function isAuthorized(request: Request): Promise<boolean> {
  // The caller sends its token to Trusted Sources for Deployment Protection,
  // AND as a Bearer token for this independent application-level check:
  // https://vercel.com/docs/oidc/api
  // Never read getVercelOidcToken(), x-vercel-oidc-token, env tokens or cookies:
  // those cannot establish the identity of this inbound caller.
  const authorization = request.headers.get("authorization");
  if (!authorization || authorization.length > 16_384) return false;
  const token = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/i
    .exec(authorization)?.[1];
  if (!token) return false;

  try {
    const { payload } = await verifyVercelOidcToken(token, {
      // Both documented Vercel issuer modes; never derive a JWKS URL from input.
      issuer: ["https://oidc.vercel.com", "https://oidc.vercel.com/novoradesign"],
      algorithms: ["RS256"], typ: "JWT", clockTolerance: 0,
      audience: "https://vercel.com/novoradesign", subject: SUBJECT,
      projectId: PROJECT, ownerId: TEAM, environment: "development",
      requiredClaims: ["exp", "iat", "nbf", "iss", "aud", "sub", "owner_id",
        "project_id", "environment"],
      // Development tokens have a documented 12h lifetime. Accept only the first
      // five minutes after issuance, with no clock-skew extension or refresh.
      maxTokenAge: 300,
    });
    const { exp, iat, nbf } = payload;
    return Number.isSafeInteger(exp) && Number.isSafeInteger(iat) &&
      Number.isSafeInteger(nbf) && exp > iat && exp - iat <= 43_200 &&
      nbf >= iat && nbf < exp;
  } catch {
    // Includes unavailable/unverifiable JWKS. Never disclose verifier details.
    return false;
  }
}

export async function getPreviewIsolationProof(request: Request): Promise<Response> {
  if (!isAllowedInstance()) return new Response(null, { status: 404, headers: NO_STORE });
  if (!(await isAuthorized(request))) {
    return new Response(null, { status: 401, headers: NO_STORE });
  }

  let isolatedBackendVerified = false;
  try {
    const urlName = "NEXT_PUBLIC_SUPABASE_URL";
    if (process.env[urlName]?.trim() === ORIGIN) {
      // Authorization MUST finish before constructing the existing admin client.
      const supabase = createSupabaseAdminClientOrNull();
      if (supabase) {
        const proof = await supabase.from("concept_briefs")
          .select("id", { head: true }).limit(0).retry(false)
          .abortSignal(AbortSignal.timeout(5_000));
        isolatedBackendVerified = proof.status === 200 && proof.error === null &&
          proof.data === null && proof.count === null;
      }
    }
  } catch {
    // No exception, credential, private origin, customer data or retry escapes.
  }

  try {
    // One fixed private event per authorized request. Vercel supplies native
    // deployment/request correlation; never copy raw request identifiers/headers.
    console.info(JSON.stringify({ event: "NOVORA_M2_PROTECTED_RUNTIME_PROOF_V1",
      isolatedBackendVerified }));
  } catch {
    // Never retry logging or the database operation.
  }
  try {
    // Private runtime evidence only; native logs bind this to the deployment
    // and request. Read literal flags from this process, never from the caller.
    console.info(JSON.stringify({ event: "NOVORA_M2_PRIVATE_RUNTIME_FLAGS_V1",
      betaAdmissionEnabled: process.env.NOVORA_BETA_ADMISSION_ENABLED === "true",
      agentEnabled: process.env.NOVORA_INSTANT_PREVIEW_AGENT_ENABLED === "true",
      queueExecutionEnabled: process.env.NOVORA_FIRST_PREVIEW_QUEUE_EXECUTION_CONFIRMED === "true",
      isolatedBackendVerified }));
  } catch {
    // A failed private log must not change the response or repeat any work.
  }
  const binding = isolatedBackendVerified ? resolveBetaAdmissionBinding(process.env) : null;
  const m2Binding = binding?.runtimeBinding ? {
    ledgerKey: binding.ledgerKey,
    authorityId: binding.authorityId,
    runtimeBinding: binding.runtimeBinding,
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
    sourceSha: process.env.VERCEL_GIT_COMMIT_SHA,
  } : null;
  return Response.json({ isolatedBackendVerified, ...(m2Binding ? { m2Binding } : {}) }, {
    status: isolatedBackendVerified ? 200 : 503, headers: NO_STORE,
  });
}
