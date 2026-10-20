/**
 * D3 candidate protocol only. No caller, SDK, configuration or network integration.
 * These private values belong in a server-only repository, never a customer response.
 * Shape validation is not verification of signatures, Redis grants or admission.
 */
import { deriveFirstPreviewIdempotencyKey } from "./first-preview-persistence-contract";
import { createHash } from "node:crypto";
import { MOCK_NOVORA_DESIGN_SPEC, validateNovoraDesignSpec } from "./design-spec";
import { MOCK_NOVORA_HAND_SKETCH_INSTRUCTION, validateNovoraHandSketchInstruction } from "./hand-sketch-instruction";
import type { FirstPreviewPreparedGenerationInput } from "./first-preview-generation-lifecycle";
import { buildFirstPreviewStructuredGenerationInput } from "./first-preview-structured-input";

export const INITIATION_VERSION = "novora_first_preview_initiation_v1" as const;
export const INITIATION_STATES = [
  "pending", "waiting_admission", "publishing", "queued", "claimed",
  "dispatch_armed", "dispatched", "completed", "operator_hold", "cancelled",
] as const;
export type InitiationState = (typeof INITIATION_STATES)[number];
export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type JsonObject = { [key: string]: Json };
export type InitiationFailure =
  | "invalid_input" | "invalid_state" | "identity_conflict" | "lease_conflict"
  | "policy_unconfigured" | "repository_unavailable" | "admission_unavailable"
  | "missing_context" | "recovery_blocked" | "paid_outcome_unknown"
  | "delivery_exhausted" | "completion_unverified";
export type InitiationResult<T> =
  | Readonly<{ ok: true; value: T }>
  | Readonly<{ ok: false; code: InitiationFailure }>;

export interface PrivateAdmissionContext {
  version: typeof INITIATION_VERSION;
  ip_key: string;
  email_key: string;
  key_version: string;
  rate_policy_version: string;
  access_binding: {
    concept_brief_id: string;
    public_reference: string;
    proof_version: string;
    binding_digest: string;
  };
}
// No raw IP, raw email, cookie, credential or client eligibility flag here.
export interface ReplayPolicy {
  lease_ms: number;
  backoff_ms: number;
  batch_size: number;
  max_handoff_attempts: number;
  max_wait_ms: number;
}
// Required configuration, with NO default values or implicit spending authority.
export interface PreparedInitiationGeneration {
  job_id: string;
  identity_key: string;
  generation_input: FirstPreviewPreparedGenerationInput;
  design_spec_version: string;
  design_spec_sha256: string;
  hand_sketch_instruction_version: string;
  hand_sketch_instruction_sha256: string;
  estimated_cost_micros: number;
  cost_currency: "USD";
  pricing_assumption_version: string;
}
export interface PrivateDispatchGrant {
  version: typeof INITIATION_VERSION;
  concept_brief_id: string;
  job_id: string;
  identity_key: string;
  fence: string;
  nonce: string;
  deadline_ms: number;
  admission_context_digest: string;
}
/**
 * Only a future trusted backend may construct this AFTER an authoritative Redis
 * read/protocol result. SQL cannot authenticate an external-service assertion.
 * A matching expired grant AND unclaimed reservation are necessary for recovery;
 * lease expiry alone, a cached permit, and a Queue acknowledgement are insufficient.
 */
export interface PrivatePreclaimRecoveryEvidence {
  source: "authoritative_redis";
  grant: PrivateDispatchGrant;
  reservation_status: "reserved";
  redis_now_ms: number;
}
export interface InitiationIntent {
  version: typeof INITIATION_VERSION;
  concept_brief_id: string;
  generation_purpose: "first_preview";
  attempt_number: 1;
  state: InitiationState;
  handoff_stage: "initiation" | "generation";
  handoff_epoch: string;
  publication_fence: string | null;
  handoff_attempts: number;
  next_attempt_at: string;
  lease_owner: string | null;
  lease_until: string | null;
  fence: string;
  admission_context: PrivateAdmissionContext | null;
  prepared: PreparedInitiationGeneration | null;
  dispatch_grant: PrivateDispatchGrant | null;
  last_reason: InitiationFailure | null;
  created_at: string;
  updated_at: string;
}
export interface PersistInitiationInput {
  p_concept_brief_id: string;
  p_public_reference: string;
  p_brief: {
    piece_type: string | null; branch: string | null; structure: string | null;
    sub_structure: string | null; design_objective: string | null;
    ai_sketch_instruction: string | null; brief_payload: JsonObject;
    summary_items: Json; api_submission: JsonObject;
  };
  p_contact: {
    customer_name: string; customer_email: string; phone_whatsapp: string | null;
    country_region: string | null; contact_note: string | null;
  };
  p_admission_context: unknown;
}
export interface DurableInitiationReceipt {
  persisted: true;
  concept_brief_id: string;
  public_reference: string;
  intent_version: typeof INITIATION_VERSION;
}
/** Private, freshly read database projection; never a client submission/assertion.
 * Contact rows are excluded. Embedded intake payloads can still contain PII: do
 * not log, publish, or put this snapshot/envelope in a customer/Queue response.
 */
export type FirstPreviewPreparationSourceSnapshot = PersistInitiationInput["p_brief"] & {
  concept_brief_id: string;
  public_reference: string;
  source: "api";
};
export const PREPARATION_HMAC_VERSION = "novora_first_preview_preparation_hmac_v1" as const;
export const PREPARATION_JSON_MAX_BYTES = 1_048_576 as const;
export interface UnsignedFirstPreviewPreparationEnvelope {
  version: typeof PREPARATION_HMAC_VERSION;
  key_id: string;
  initiation_version: typeof INITIATION_VERSION;
  concept_brief_id: string;
  public_reference: string;
  job_id: string;
  identity_key: string;
  owner: string;
  fence: string;
  source_snapshot_utf8_hex: string;
  prepared_utf8_hex: string;
}
export interface SignedFirstPreviewPreparationEnvelope extends UnsignedFirstPreviewPreparationEnvelope {
  mac_sha256: string;
}
/**
 * F5-I1 SOURCE CANDIDATE: constructs signing material, never a key or a signature.
 * The future isolated signer MUST obtain the source and ownership from the
 * authoritative database, invoke this builder, and authenticate only its result.
 * It must not expose a generic signing oracle or share its key with intake,
 * workers, Queue, Redis, or unrestricted service-role callers.
 *
 * Exact HMAC-SHA256 message: concatenate UTF-8 length-prefixed fields below in
 * order. frame(s) = ASCII(decimal UTF-8 byte length, no leading zero) || ':' ||
 * UTF8(s). No BOM, delimiters between frames, newline, normalization or JSONB
 * reserialization. The two JSON texts use the EXISTING JavaScript serializer;
 * their lowercase hex transports are themselves framed/authenticated strings.
 * The prepared text includes all generation input, hashes, versions and pricing.
 * SQL decodes these authenticated texts and compares JSONB values, never derives
 * a competing canonical JSON/hash. A signature is not a paid-admission permit.
 *
 * Still required: isolated deployed signer, protected verification-only database
 * key access, least-privilege RPCs and guards on every alternate write path.
 * This helper is unconnected; it does not close F5 P1 or enable production.
 */
export function prepareFirstPreviewHmacEnvelopeCandidate(input: {
  sourceSnapshot: unknown;
  prepared: unknown;
  owner: string;
  fence: string;
  keyId: string;
}): { envelope: UnsignedFirstPreviewPreparationEnvelope; authenticatedBytes: Uint8Array } | null {
  try {
    if (!isUuid(input.owner) || !isFence(input.fence) || input.fence === "0" ||
      typeof input.keyId !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(input.keyId) ||
      !isJson(input.sourceSnapshot) || !isJson(input.prepared) ||
      !isPersistableJson(input.sourceSnapshot) || !isPersistableJson(input.prepared)) return null;
    // Snapshot once before validation/derivation; caller mutation cannot replace
    // the validated objects between identity checks and byte construction.
    const sourceText = canonicalContentJson(input.sourceSnapshot);
    const preparedText = canonicalContentJson(input.prepared);
    const source: unknown = JSON.parse(sourceText);
    const prepared: unknown = JSON.parse(preparedText);
    if (!isRecord(source) || !exactKeys(source, ["concept_brief_id", "public_reference", "source",
      "piece_type", "branch", "structure", "sub_structure", "design_objective", "ai_sketch_instruction",
      "brief_payload", "summary_items", "api_submission"]) || source.source !== "api" ||
      !isUuid(source.concept_brief_id) || !isPublicReference(source.public_reference) ||
      !isRecord(source.brief_payload) || !isRecord(source.api_submission) ||
      !["piece_type", "branch", "structure", "sub_structure", "design_objective", "ai_sketch_instruction"]
        .every(key => source[key] === null || typeof source[key] === "string") ||
      !isPreparedGeneration(prepared, source.concept_brief_id, source.public_reference)) return null;
    const structured = buildFirstPreviewStructuredGenerationInput({
      payload: source.brief_payload, publicReference: source.public_reference,
    });
    if (!structured.ok || canonicalContentJson(prepared.generation_input) !== canonicalContentJson({
      designSpec: structured.value.designSpec,
      designSpecSha256: structured.value.designSpecSha256,
      handSketchInstruction: structured.value.handSketchInstruction,
      handSketchInstructionSha256: structured.value.handSketchInstructionSha256,
    })) return null;
    const sourceBytes = Buffer.from(sourceText, "utf8");
    const preparedBytes = Buffer.from(preparedText, "utf8");
    if (sourceBytes.length > PREPARATION_JSON_MAX_BYTES || preparedBytes.length > PREPARATION_JSON_MAX_BYTES) return null;
    const envelope: UnsignedFirstPreviewPreparationEnvelope = {
      version: PREPARATION_HMAC_VERSION, key_id: input.keyId, initiation_version: INITIATION_VERSION,
      concept_brief_id: source.concept_brief_id, public_reference: source.public_reference,
      job_id: prepared.job_id, identity_key: prepared.identity_key, owner: input.owner, fence: input.fence,
      source_snapshot_utf8_hex: sourceBytes.toString("hex"), prepared_utf8_hex: preparedBytes.toString("hex"),
    };
    const fields = [envelope.version, envelope.key_id, envelope.initiation_version, "prepare", "claimed", "initiation",
      envelope.concept_brief_id, envelope.public_reference, envelope.job_id, envelope.identity_key,
      envelope.owner, envelope.fence, envelope.source_snapshot_utf8_hex, envelope.prepared_utf8_hex];
    return { envelope, authenticatedBytes: Buffer.concat(fields.map(field => {
      const bytes = Buffer.from(field, "utf8");
      return Buffer.concat([Buffer.from(`${bytes.length}:`, "ascii"), bytes]);
    })) };
  } catch {
    return null;
  }
}
function isPersistableJson(value: Json): boolean {
  if (typeof value === "string") return isPersistableStructuredString(value);
  if (Array.isArray(value)) return value.every(isPersistableJson);
  if (value !== null && typeof value === "object") return Object.entries(value)
    .every(([key, item]) => isPersistableStructuredString(key) && isPersistableJson(item));
  return true;
}
// Receipt has no generation-authorized flag. Public projection is a later caller gate.
export interface ClaimInitiationsInput {
  p_owner: string;
  p_policy: ReplayPolicy;
  p_mode: "publish" | "execute";
  p_concept_brief_id: string | null;
  p_publication_fence: string | null;
  p_handoff_epoch: string | null;
  p_handoff_stage: "initiation" | "generation" | null;
}
export interface TransitionInitiationInput {
  p_concept_brief_id: string;
  p_owner: string;
  p_fence: string;
  p_expected_state: InitiationState;
  p_action: "prepare" | "publication_confirmed" | "publication_uncertain"
    | "publish_generation" | "wait_admission" | "arm" | "mark_dispatched"
    | "complete" | "hold" | "recover_preclaim" | "cancel";
  p_policy: ReplayPolicy;
  p_payload: {
    prepared?: PreparedInitiationGeneration;
    // Mandatory for SQL 'prepare'; optional here for other transition actions.
    // No current caller/fixture is upgraded into an authenticated production path.
    preparation_envelope?: SignedFirstPreviewPreparationEnvelope;
    grant?: PrivateDispatchGrant;
    recovery?: PrivatePreclaimRecoveryEvidence;
    reason?: InitiationFailure;
    output_id?: string;
  };
}
export interface FirstPreviewInitiationRepository {
  persist(input: PersistInitiationInput): Promise<InitiationResult<DurableInitiationReceipt>>;
  claim(input: ClaimInitiationsInput): Promise<InitiationResult<InitiationIntent[]>>;
  transition(input: TransitionInitiationInput): Promise<InitiationResult<InitiationIntent>>;
}
// Exact private SQL arguments/receipt. This interface grants no database access.
export type ProviderLifecycleInput = {
  p_concept_brief_id: string;
  p_job_id: string;
  p_owner: string;
  p_fence: string;
  p_expected_state: InitiationState;
} & (
  | { p_action: "record_dispatch"; p_payload: Record<string, never> }
  | { p_action: "register_provider"; p_payload: { provider_request_id: string } }
  | { p_action: "provider_result"; p_payload: {
      provider_request_id: string; output_id: string;
      content_sha256: string; actual_cost_micros: number;
    } }
  | { p_action: "provider_failure"; p_payload: {
      phase: "pre_dispatch" | "provider_failed" | "paid_outcome_unknown";
      provider_request_id: string | null;
      category: import("./first-preview-persistence-contract").FirstPreviewFailureCategory;
      actual_cost_micros: number | null;
    } }
);
export interface FirstPreviewWorkerAuthority {
  // Supplied only by an independently authenticated, protected workload binding.
  // No production factory/adapter exists here; request JSON is never this object.
  owner: string;
  policy: ReplayPolicy;
  claim: FirstPreviewInitiationRepository["claim"];
  transition: FirstPreviewInitiationRepository["transition"];
  recordProviderLifecycle(input: ProviderLifecycleInput): Promise<InitiationResult<{
    recorded: true; replayed: boolean;
  }>>;
}
// Future Queue handoffs carry ONLY these identifiers. No customer payload or HMAC keys.
export interface InitiationWakeup {
  version: typeof INITIATION_VERSION;
  concept_brief_id: string;
  publication_fence: string;
  handoff_epoch: string;
  stage: "initiation" | "generation";
}
export function isInitiationWakeup(value: unknown): value is InitiationWakeup {
  return isRecord(value) && exactKeys(value,
    ["version", "concept_brief_id", "publication_fence", "handoff_epoch", "stage"]) &&
    value.version === INITIATION_VERSION && isUuid(value.concept_brief_id) &&
    isFence(value.publication_fence) && isFence(value.handoff_epoch) &&
    (value.stage === "initiation" || value.stage === "generation");
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value);
}
export function isIdentifier(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value === value.trim();
}
export function isPublicReference(value: unknown): value is string {
  return typeof value === "string" && /^NOVORA-CB-\d{8}-[A-Z0-9]{4}$/.test(value);
}
export function isSha256(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
}
export function isFence(value: unknown): value is string {
  return typeof value === "string" && /^(0|[1-9][0-9]*)$/.test(value) &&
    value.length <= 19 && BigInt(value) <= BigInt("9223372036854775807");
}
export function isInitiationState(value: unknown): value is InitiationState {
  return typeof value === "string" && INITIATION_STATES.some(state => state === value);
}
function isTimestamp(value: unknown): value is string {
  return typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
    Number.isFinite(Date.parse(value));
}
export function isReplayPolicy(value: unknown): value is ReplayPolicy {
  return isRecord(value) && exactKeys(value,
    ["lease_ms", "backoff_ms", "batch_size", "max_handoff_attempts", "max_wait_ms"]) &&
    ["lease_ms", "backoff_ms", "batch_size", "max_handoff_attempts", "max_wait_ms"]
      .every(key => typeof value[key] === "number" &&
        Number.isSafeInteger(value[key]) && value[key] > 0);
}
export function isJson(value: unknown, seen = new Set<object>()): value is Json {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "object" || seen.has(value)) return false;
  seen.add(value);
  const valid = (Array.isArray(value) || Object.getPrototypeOf(value) === Object.prototype) &&
    Object.values(value).every(item => isJson(item, seen));
  seen.delete(value);
  return valid;
}
function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
}
export function isPrivateAdmissionContext(
  value: unknown, briefId: string, reference?: string,
): value is PrivateAdmissionContext {
  if (!isRecord(value) || !exactKeys(value,
    ["version", "ip_key", "email_key", "key_version", "rate_policy_version", "access_binding"])) return false;
  const binding = value.access_binding;
  return value.version === INITIATION_VERSION &&
    typeof value.ip_key === "string" && /^rl:v1:concept-briefs:ip:[a-f0-9]{48}$/.test(value.ip_key) &&
    typeof value.email_key === "string" && /^rl:v1:concept-briefs:email:[a-f0-9]{48}$/.test(value.email_key) &&
    isIdentifier(value.key_version) && isIdentifier(value.rate_policy_version) &&
    isRecord(binding) && exactKeys(binding,
      ["concept_brief_id", "public_reference", "proof_version", "binding_digest"]) &&
    isUuid(binding.concept_brief_id) && binding.concept_brief_id === briefId &&
    isPublicReference(binding.public_reference) &&
    (reference === undefined || binding.public_reference === reference) &&
    isIdentifier(binding.proof_version) && isSha256(binding.binding_digest);
}
export function isPreparedGeneration(
  value: unknown, briefId: string, publicReference: string,
): value is PreparedInitiationGeneration {
  if (!isRecord(value) || !exactKeys(value, ["job_id", "identity_key", "generation_input",
    "design_spec_version", "design_spec_sha256", "hand_sketch_instruction_version",
    "hand_sketch_instruction_sha256", "estimated_cost_micros", "cost_currency",
    "pricing_assumption_version"]) || !isUuid(value.job_id) || !isSha256(value.identity_key) ||
    !isRecord(value.generation_input) || !isJson(value.generation_input) ||
    !isIdentifier(value.design_spec_version) || !isSha256(value.design_spec_sha256) ||
    !isIdentifier(value.hand_sketch_instruction_version) || !isSha256(value.hand_sketch_instruction_sha256) ||
    typeof value.estimated_cost_micros !== "number" || !Number.isSafeInteger(value.estimated_cost_micros) ||
    value.estimated_cost_micros < 0 || value.cost_currency !== "USD" ||
    !isIdentifier(value.pricing_assumption_version) || !isUuid(briefId) ||
    !isPublicReference(publicReference)) return false;
  const input = value.generation_input;
  if (!exactKeys(input, ["designSpec", "designSpecSha256", "handSketchInstruction", "handSketchInstructionSha256"]) ||
    !hasDeclaredStructuredShape(input.designSpec, MOCK_NOVORA_DESIGN_SPEC) ||
    !hasDeclaredStructuredShape(input.handSketchInstruction, MOCK_NOVORA_HAND_SKETCH_INSTRUCTION) ||
    !validateNovoraDesignSpec(input.designSpec).ok || !validateNovoraHandSketchInstruction(input.handSketchInstruction).ok ||
    !isRecord(input.designSpec) || !isRecord(input.handSketchInstruction) ||
    !isRecord(input.handSketchInstruction.source_design_spec_summary) ||
    input.designSpec.public_reference !== publicReference || input.handSketchInstruction.public_reference !== publicReference ||
    input.designSpec.spec_version !== value.design_spec_version ||
    input.handSketchInstruction.instruction_version !== value.hand_sketch_instruction_version ||
    input.handSketchInstruction.design_spec_version !== input.designSpec.spec_version ||
    input.designSpec.language !== input.handSketchInstruction.language ||
    input.designSpec.piece_type !== input.handSketchInstruction.source_design_spec_summary.piece_type ||
    input.designSpecSha256 !== value.design_spec_sha256 ||
    input.handSketchInstructionSha256 !== value.hand_sketch_instruction_sha256 ||
    canonicalContentSha256(input.designSpec) !== value.design_spec_sha256 ||
    canonicalContentSha256(input.handSketchInstruction) !== value.hand_sketch_instruction_sha256) return false;
  return value.identity_key === deriveFirstPreviewIdempotencyKey({
    jobId: value.job_id, conceptBriefId: briefId, attemptNumber: 1,
    parentJobId: null, sourceOutputId: null,
    designSpecVersion: value.design_spec_version, designSpecSha256: value.design_spec_sha256,
    handSketchInstructionVersion: value.hand_sketch_instruction_version,
    handSketchInstructionSha256: value.hand_sketch_instruction_sha256,
    estimatedCostMicros: value.estimated_cost_micros, costCurrency: value.cost_currency,
    pricingAssumptionVersion: value.pricing_assumption_version,
  });
}
/** Same serializer as first-preview-queue.ts / first-preview-structured-input.ts.
 * Declared structured types contain ASCII member names and no numeric leaves.
 * Empty lists are string[] in those authoritative types, not arbitrary JSON[];
 * malformed primitive list elements must not expand the serializer's domain.
 */
function hasDeclaredStructuredShape(value: unknown, template: unknown): boolean {
  if (Array.isArray(template)) {
    return Array.isArray(value) && value.every(item => template.length === 0
      ? isPersistableStructuredString(item) : hasDeclaredStructuredShape(item, template[0]));
  }
  if (isRecord(template)) {
    return isRecord(value) && exactKeys(value, Object.keys(template)) &&
      Object.keys(template).every(key => hasDeclaredStructuredShape(value[key], template[key]));
  }
  if (typeof template === "string") return isPersistableStructuredString(value);
  if (typeof template === "boolean") return typeof value === "boolean";
  return false;
}
function isPersistableStructuredString(value: unknown): value is string {
  // JSONB cannot store NUL or unpaired UTF-16 surrogates. Reject before hashing,
  // rather than accepting a prepared value the transactional repository cannot store.
  if (typeof value !== "string" || value.includes("\u0000")) return false;
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(++i);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
    } else if (code >= 0xdc00 && code <= 0xdfff) return false;
  }
  return true;
}
function canonicalContentJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalContentJson).join(",")}]`;
  if (isRecord(value)) return `{${Object.keys(value).sort()
    .map(key => `${JSON.stringify(key)}:${canonicalContentJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
function canonicalContentSha256(value: unknown): string {
  return createHash("sha256").update(canonicalContentJson(value), "utf8").digest("hex");
}
export function isDispatchGrant(value: unknown, intent: InitiationIntent): value is PrivateDispatchGrant {
  return isRecord(value) && exactKeys(value, ["version", "concept_brief_id", "job_id",
    "identity_key", "fence", "nonce", "deadline_ms", "admission_context_digest"]) &&
    value.version === INITIATION_VERSION && value.concept_brief_id === intent.concept_brief_id &&
    intent.prepared !== null && value.job_id === intent.prepared.job_id &&
    value.identity_key === intent.prepared.identity_key && isFence(value.fence) &&
    value.fence === intent.fence && isUuid(value.nonce) &&
    typeof value.deadline_ms === "number" && Number.isSafeInteger(value.deadline_ms) &&
    value.deadline_ms > 0 && isSha256(value.admission_context_digest);
}
export function isInitiationIntent(value: unknown): value is InitiationIntent {
  if (!isRecord(value) || !isUuid(value.concept_brief_id) || value.version !== INITIATION_VERSION ||
    value.generation_purpose !== "first_preview" || value.attempt_number !== 1 ||
    !isInitiationState(value.state) || !isFence(value.fence) || !isFence(value.handoff_epoch) ||
    !(value.publication_fence === null || isFence(value.publication_fence)) ||
    (value.handoff_stage !== "initiation" && value.handoff_stage !== "generation") ||
    typeof value.handoff_attempts !== "number" || !Number.isSafeInteger(value.handoff_attempts) ||
    value.handoff_attempts < 0 ||
    ![value.next_attempt_at, value.created_at, value.updated_at].every(isTimestamp) ||
    !((value.lease_owner === null && value.lease_until === null) ||
      (isUuid(value.lease_owner) && isTimestamp(value.lease_until))) ||
    !(value.admission_context === null || isPrivateAdmissionContext(value.admission_context, value.concept_brief_id))) return false;
  if (value.prepared !== null && (!isPrivateAdmissionContext(value.admission_context, value.concept_brief_id) ||
    !isPreparedGeneration(value.prepared, value.concept_brief_id, value.admission_context.access_binding.public_reference))) return false;
  // Grant checks are performed explicitly after the intent's fields have been narrowed.
  if (value.handoff_stage === "generation" && value.prepared === null) return false;
  if (["claimed", "publishing", "queued"].some(state => state === value.state) &&
    value.publication_fence === null) return false;
  if (["dispatch_armed", "dispatched", "completed"].some(state => state === value.state) &&
    (value.prepared === null || value.admission_context === null || !isRecord(value.dispatch_grant))) return false;
  if (["claimed", "publishing", "dispatch_armed", "dispatched"].some(state => state === value.state) &&
    value.lease_owner === null) return false;
  const reasons: readonly InitiationFailure[] = ["invalid_input", "invalid_state", "identity_conflict",
    "lease_conflict", "policy_unconfigured", "repository_unavailable", "admission_unavailable",
    "missing_context", "recovery_blocked", "paid_outcome_unknown", "delivery_exhausted", "completion_unverified"];
  if (!(value.last_reason === null ||
    (typeof value.last_reason === "string" && reasons.some(reason => reason === value.last_reason)))) return false;
  if (value.dispatch_grant !== null) {
    const grant = value.dispatch_grant;
    if (!isRecord(grant) || !exactKeys(grant, ["version", "concept_brief_id", "job_id", "identity_key",
      "fence", "nonce", "deadline_ms", "admission_context_digest"]) ||
      grant.version !== INITIATION_VERSION || grant.concept_brief_id !== value.concept_brief_id ||
      value.prepared === null || !isRecord(value.prepared) || grant.job_id !== value.prepared.job_id ||
      grant.identity_key !== value.prepared.identity_key || grant.fence !== value.fence ||
      !isUuid(grant.nonce) || !isSha256(grant.admission_context_digest) ||
      typeof grant.deadline_ms !== "number" || !Number.isSafeInteger(grant.deadline_ms) || grant.deadline_ms <= 0) return false;
  }
  return true;
}

export function readDurableInitiationReceipt(value: unknown): DurableInitiationReceipt | null {
  if (!isRecord(value) || !exactKeys(value,
    ["persisted", "concept_brief_id", "public_reference", "intent_version"]) ||
    value.persisted !== true || !isUuid(value.concept_brief_id) ||
    !isPublicReference(value.public_reference) || value.intent_version !== INITIATION_VERSION) return null;
  return { persisted: true, concept_brief_id: value.concept_brief_id,
    public_reference: value.public_reference, intent_version: value.intent_version };
}
