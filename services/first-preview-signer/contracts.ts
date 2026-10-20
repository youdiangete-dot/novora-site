import type {
  FirstPreviewPreparationSourceSnapshot,
  InitiationIntent,
  PreparedInitiationGeneration,
  SignedFirstPreviewPreparationEnvelope,
} from "../../lib/server/ai-sketch/first-preview-initiation-contract";

/** A lookup selector only. No caller-supplied ownership or generation authority. */
export type PreparationClaimSelector = Readonly<{ concept_brief_id: string }>;

export type FrozenAuthoritativePreparationClaim = Readonly<{
  intent: Readonly<InitiationIntent>;
  sourceSnapshot: FirstPreviewPreparationSourceSnapshot;
  prepared: PreparedInitiationGeneration;
  /** Database wall-clock sampled AFTER obtaining the required locks. */
  databaseNowMs: number;
}>;

/**
 * PRIVILEGED INTEGRATION CONTRACT. The local adapter uses committed operations;
 * a live dedicated connection and deployed RPC/ACLs remain external prerequisites.
 * Construct only inside the future independent signer runtime, bound to a
 * server-authenticated workload principal. Never inject from request JSON.
 *
 * withAuthorizedPreparation must:
 * - resolve the selector against the authoritative initiation outbox and Brief;
 * - authorize the authenticated principal for THAT claim/lease owner, preventing
 *   cross-claim requests; a UUID, worker assertion or service-role read is not auth;
 * - lock/recheck claimed/initiation, version, purpose, attempt, owner, fence and
 *   unexpired lease using fresh database wall-clock AFTER every blocking lock;
 * - fetch the exact private source projection used by the pinned SQL verifier;
 * - obtain prepared data ONLY from protected authoritative preparation selection,
 *   binding its reserved job UUID, pricing policy and source to this claim. The
 *   SQL creates the job only at proof consumption. Select/bind establish the
 *   protected preparation before signing; they never create an unsigned job;
 * - supply detached, immutable snapshots from committed select/bind RPCs;
 *   invoke the callback at most once. No database lock spans network calls;
 * - AFTER callback/key retrieval, call authorize_preparation_release with the
 *   internal preparation UUID/version. SQL rechecks source, authorization and
 *   lease. Release the EXACT callback result only after acknowledged COMMIT;
 *   failed/unknown commit, expiry, revocation or mismatch returns null/throws;
 * - never log/cache the callback result or private data, and never dispatch,
 *   publish, claim paid admission or implicitly apply a transition here.
 *
 * SQL must still reverify the proof and current source/lease at consumption.
 * This interface cannot enforce database isolation or alternate write guards.
 */
export interface AuthoritativePreparationDatabase {
  withAuthorizedPreparation(
    selector: PreparationClaimSelector,
    use: (claim: FrozenAuthoritativePreparationClaim) =>
      Promise<SignedFirstPreviewPreparationEnvelope | null>,
  ): Promise<SignedFirstPreviewPreparationEnvelope | null>;
}

/** Dedicated Signer connection only; no service_role or HTTP/public RPC wrapper.
 * Each operation resolves to the SQL JSON result ONLY after successful COMMIT.
 * A failed/unknown COMMIT must throw. No adapter, driver or credential is created.
 */
export interface CommittedPreparationOperations {
  selectPreparationClaim(input: { p_brief: string }): Promise<unknown>;
  bindPreparation(input: { p_preparation: string; p_prepared: PreparedInitiationGeneration }): Promise<unknown>;
  authorizePreparationRelease(input: {
    p_preparation: string; p_envelope: SignedFirstPreviewPreparationEnvelope;
  }): Promise<unknown>;
}

export type ProtectedPreparationKey = Readonly<{
  keyId: string;
  /** Fresh exclusively owned bytes; caller erases this copy on every exit. */
  keyBytes: Uint8Array;
}>;

/**
 * PROTECTED KEY INTEGRATION PREREQUISITE. No implementation, generated key,
 * environment fallback or caller-selected key ID is provided. Resolve the active
 * preparation-only key from the signer's protected store, with >=32 bytes and a
 * verifier-coordinated key ID/rotation/revocation policy. Never share secret
 * access with intake, workers, Queue, Redis or unrestricted service_role.
 * Return a fresh disposable copy; null/throw denies signing.
 */
export interface PreparationSecretProvider {
  loadActivePreparationKey(): Promise<ProtectedPreparationKey | null>;
}

export type PreparationSignerResult =
  | Readonly<{ ok: true; envelope: SignedFirstPreviewPreparationEnvelope }>
  | Readonly<{ ok: false; code: "invalid_request" | "signer_unavailable" | "claim_rejected" }>;

/**
 * PRIVATE trusted-runtime operation only. Success contains embedded intake data
 * in hex: never expose it to customers, HTTP/Queue payloads, telemetry or logs.
 * This is proof of preparation, never admission, dispatch or customer readiness.
 */
export interface FirstPreviewPreparationSigner {
  signAuthoritativePreparation(request: unknown): Promise<PreparationSignerResult>;
}
