import "server-only";

import { createSupabaseAdminClientOrNull } from "./supabase";

const EVENT = "NOVORA_M2_ISOLATION_ATTESTATION_V1";
const ISOLATED_ORIGIN = "https://dibpksbbzjczpjusujwk.supabase.co";
const PREVIEW_BRANCH = "integration/instant-first-preview-agent";
const PROJECT_ID = "prj_H9Di3TIvXiZJHO06WwoaW8RqFfVg";

// A process-local promise also covers concurrent registration and separate
// bundles loading this helper in the same server instance. Never reset/retry it.
const instance = globalThis as typeof globalThis & {
  __novoraM2IsolationAttestationV1?: Promise<void>;
};

async function attest(): Promise<void> {
  let isolatedBackendVerified = false;
  try {
    // Use the same dynamic lookup/normalization as the existing admin helper.
    const urlName = "NEXT_PUBLIC_SUPABASE_URL";
    if (process.env[urlName]?.trim() === ISOLATED_ORIGIN) {
      const supabase = createSupabaseAdminClientOrNull();
      if (supabase) {
        // public is the existing client's default schema. HEAD returns no rows;
        // omit count, disable SDK retries, and bound native fetch with an abort.
        const proof = await supabase
          .from("concept_briefs")
          .select("id", { head: true })
          .limit(0)
          .retry(false)
          .abortSignal(AbortSignal.timeout(5_000));
        isolatedBackendVerified = proof.status === 200 && proof.error === null &&
          proof.data === null && proof.count === null;
      }
    }
  } catch {
    // Never log backend errors, exceptions, environment values or credentials.
  }

  try {
    console.info(JSON.stringify({ event: EVENT, isolatedBackendVerified }));
  } catch {
    // Logging failure cannot fail server startup or trigger another probe.
  }
}

export function attestPreviewIsolationOnce(): Promise<void> {
  if (
    process.env.NEXT_RUNTIME !== "nodejs" ||
    process.env.NODE_ENV !== "production" ||
    process.env.VERCEL !== "1" ||
    process.env.VERCEL_ENV !== "preview" ||
    process.env.VERCEL_GIT_COMMIT_REF !== PREVIEW_BRANCH ||
    process.env.VERCEL_PROJECT_ID !== PROJECT_ID ||
    process.env.NEXT_PHASE === "phase-production-build"
  ) return Promise.resolve();

  // Assign before executing any asynchronous work, including client creation.
  return instance.__novoraM2IsolationAttestationV1 ??=
    Promise.resolve().then(attest);
}
