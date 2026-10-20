/**
 * PR287-F5-P1-I1 LOCAL SOURCE CANDIDATE ONLY. No endpoint or running service.
 * Placing this code here does not isolate a process, credential or deployment.
 * Extract/package the pinned contract and its transitive server-only structured
 * input dependencies into a separately reviewed Node runtime before deployment;
 * their current Next.js `server-only` resolution is not standalone runtime proof.
 */
import { createHmac } from "node:crypto";
import {
  isInitiationIntent,
  isRecord,
  isUuid,
  prepareFirstPreviewHmacEnvelopeCandidate,
} from "../../lib/server/ai-sketch/first-preview-initiation-contract";
import type { SignedFirstPreviewPreparationEnvelope } from
  "../../lib/server/ai-sketch/first-preview-initiation-contract";
import type {
  AuthoritativePreparationDatabase,
  FirstPreviewPreparationSigner,
  FrozenAuthoritativePreparationClaim,
  PreparationClaimSelector,
  PreparationSecretProvider,
  PreparationSignerResult,
  ProtectedPreparationKey,
} from "./contracts";

function readSelector(request: unknown): PreparationClaimSelector | null {
  if (!isRecord(request) || Object.getPrototypeOf(request) !== Object.prototype ||
    Reflect.ownKeys(request).length !== 1) return null;
  const field = Object.getOwnPropertyDescriptor(request, "concept_brief_id");
  // Reject accessors and extra fields, including symbols/nonenumerable payloads.
  if (!field || !("value" in field) || !isUuid(field.value)) return null;
  return Object.freeze({ concept_brief_id: field.value });
}

function isEligibleClaim(
  claim: FrozenAuthoritativePreparationClaim,
  selector: PreparationClaimSelector,
): boolean {
  if (!isRecord(claim) || !isInitiationIntent(claim.intent)) return false;
  const intent = claim.intent;
  return intent.concept_brief_id === selector.concept_brief_id &&
    intent.state === "claimed" && intent.handoff_stage === "initiation" &&
    intent.fence !== "0" && isUuid(intent.lease_owner) &&
    intent.lease_until !== null && intent.admission_context !== null &&
    // Already accepted preparation must use its original proof, not be re-signed
    // under a rotated key or replacement selection. Recovery is a separate gate.
    intent.prepared === null && intent.dispatch_grant === null &&
    typeof claim.databaseNowMs === "number" &&
    Number.isSafeInteger(claim.databaseNowMs) && claim.databaseNowMs > 0 &&
    Date.parse(intent.lease_until) > claim.databaseNowMs;
}

/**
 * Dependencies are privileged runtime wiring, NEVER caller-supplied adapters.
 * Missing dependencies produce an inert signer; there is no default connection,
 * key, local fixture, cached claim, generic sign(bytes) or permissive fallback.
 */
export function createFirstPreviewPreparationSignerCandidate(dependencies: Readonly<{
  database: AuthoritativePreparationDatabase | null;
  secrets: PreparationSecretProvider | null;
}>): FirstPreviewPreparationSigner {
  // Capture once so mutable wiring cannot swap authority during a request.
  const database = dependencies?.database;
  const secrets = dependencies?.secrets;
  return Object.freeze({
    async signAuthoritativePreparation(request: unknown): Promise<PreparationSignerResult> {
      try {
        const selector = readSelector(request);
        if (!selector) return { ok: false, code: "invalid_request" };
        if (!database || !secrets ||
          typeof database.withAuthorizedPreparation !== "function" ||
          typeof secrets.loadActivePreparationKey !== "function") {
          return { ok: false, code: "signer_unavailable" };
        }
        let minted: SignedFirstPreviewPreparationEnvelope | null = null;
        let invocations = 0;
        const released = await database.withAuthorizedPreparation(selector, async claim => {
          invocations += 1;
          if (invocations !== 1 || !isEligibleClaim(claim, selector)) return null;
          let key: ProtectedPreparationKey | null = null;
          let localKey: Buffer | null = null;
          try {
            key = await secrets.loadActivePreparationKey();
            if (!key || !(key.keyBytes instanceof Uint8Array) || key.keyBytes.length < 32 ||
              typeof key.keyId !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(key.keyId)) return null;
            // Snapshot is immutable across this await. The separate committed
            // release RPC rechecks current DB authorization/source/lease afterward.
            if (!isEligibleClaim(claim, selector) || !isUuid(claim.intent.lease_owner) ||
              claim.intent.admission_context === null) return null;
            const material = prepareFirstPreviewHmacEnvelopeCandidate({
              sourceSnapshot: claim.sourceSnapshot,
              prepared: claim.prepared,
              owner: claim.intent.lease_owner,
              fence: claim.intent.fence,
              keyId: key.keyId,
            });
            if (!material) return null;
            const envelope = material.envelope;
            // Match the canonical, validated snapshots to the trusted claim and
            // its private customer/Brief binding. No caller assertions are used.
            if (envelope.concept_brief_id !== selector.concept_brief_id ||
              envelope.concept_brief_id !== claim.intent.concept_brief_id ||
              envelope.public_reference !== claim.intent.admission_context.access_binding.public_reference ||
              envelope.owner !== claim.intent.lease_owner || envelope.fence !== claim.intent.fence ||
              envelope.job_id !== claim.prepared.job_id ||
              envelope.identity_key !== claim.prepared.identity_key) return null;
            localKey = Buffer.from(key.keyBytes);
            // The pinned builder owns every byte, including the fixed
            // prepare/claimed/initiation action/state/stage and both JSON texts.
            const mac = createHmac("sha256", localKey)
              .update(material.authenticatedBytes).digest("hex");
            minted = Object.freeze({ ...envelope, mac_sha256: mac });
            return minted;
          } finally {
            // Best-effort erasure of owned copies, not a Node/OpenSSL zeroization
            // guarantee. No secret or underlying exception is returned/logged.
            localKey?.fill(0);
            if (key?.keyBytes instanceof Uint8Array) key.keyBytes.fill(0);
          }
        });
        // A denied/rolled-back scope must not leak a proof made inside it. The
        // trusted adapter must return the exact callback value after final checks.
        if (invocations !== 1 || minted === null || released !== minted) {
          return { ok: false, code: "claim_rejected" };
        }
        return { ok: true, envelope: minted };
      } catch {
        // Includes unavailable DB/key store, malformed data and crypto errors.
        // Fixed non-sensitive result, no retries, exception details or fallback.
        return { ok: false, code: "signer_unavailable" };
      }
    },
  });
}
