/**
 * D3 synthetic, shared-state model ONLY. No Postgres/Redis/Lua/Queue/provider SDK.
 * Synchronous map mutations model atomic boundaries; they do not prove database
 * isolation, RLS, deferred constraints, external admission or exactly-once delivery.
 * Nothing is executed on import. Every clock/policy/failure is supplied by a test.
 */
import {
  INITIATION_VERSION, isRecord, isUuid, isPublicReference, isJson, isFence,
  isReplayPolicy, isInitiationState, isInitiationIntent, isPrivateAdmissionContext,
  isPreparedGeneration, isDispatchGrant,
  type FirstPreviewInitiationRepository, type InitiationIntent, type InitiationResult,
  type InitiationFailure, type DurableInitiationReceipt, type PersistInitiationInput,
  type ClaimInitiationsInput, type TransitionInitiationInput,
  type ProviderLifecycleInput,
} from "../../../lib/server/ai-sketch/first-preview-initiation-contract";

type SyntheticJob = {
  id: string; briefId: string; identityKey: string; state: "queued" | "processing" | "succeeded" | "failed";
  providerRequestRecorded: boolean;
  providerRequestId?: string;
};
export interface SyntheticInitiationState {
  // unknown permits future negative fixtures to inject malformed persisted rows.
  intents: Map<string, unknown>;
  intakes: Map<string, { input: PersistInitiationInput; receipt: DurableInitiationReceipt }>;
  jobs: Map<string, SyntheticJob>;
  readyOutputs: Map<string, { briefId: string; jobId: string; validated: boolean; current: boolean; contentSha256?: string }>;
  providerLifecycle: Map<string, Map<string, ProviderLifecycleInput>>;
}
export function createSyntheticInitiationState(): SyntheticInitiationState {
  return { intents: new Map(), intakes: new Map(), jobs: new Map(), readyOutputs: new Map(), providerLifecycle: new Map() };
}
export interface SyntheticInitiationControls {
  nowMs(): number;
  available(): boolean;
  failIntakeAt(): "brief" | "contact" | "intent" | null;
  // Optional SQL-proof boundary model for integration fixtures; no real key/DB.
  verifyPreparation?(input: TransitionInitiationInput, intent: InitiationIntent): boolean;
}
function clone<T>(value: T): T { return structuredClone(value); }
function failure<T>(code: InitiationFailure): InitiationResult<T> { return { ok: false, code }; }
function same(left: unknown, right: unknown): boolean {
  // JSONB-like key-order-insensitive equality for the synthetic JSON inputs only.
  if (left === right) return true;
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((v, i) => same(v, right[i]));
  }
  if (!isRecord(left) || !isRecord(right)) return false;
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length &&
    keys.every(key => Object.hasOwn(right, key) && same(left[key], right[key]));
}
function increment(value: string): string | null {
  const next = (BigInt(value) + BigInt(1)).toString();
  return isFence(next) ? next : null;
}
function isBoundJob(job: SyntheticJob | undefined, intent: InitiationIntent): job is SyntheticJob {
  return job !== undefined && intent.prepared !== null && job.id === intent.prepared.job_id &&
    job.briefId === intent.concept_brief_id && job.identityKey === intent.prepared.identity_key;
}
function validIntake(input: PersistInitiationInput): boolean {
  if (!isRecord(input) || !isUuid(input.p_concept_brief_id) ||
    !isPublicReference(input.p_public_reference) || !isRecord(input.p_brief) ||
    !isRecord(input.p_contact) || !isJson(input.p_brief) || !isJson(input.p_contact)) return false;
  const briefKeys = ["piece_type", "branch", "structure", "sub_structure",
    "design_objective", "ai_sketch_instruction", "brief_payload", "summary_items", "api_submission"];
  const contactKeys = ["customer_name", "customer_email", "phone_whatsapp", "country_region", "contact_note"];
  return Object.keys(input.p_brief).length === briefKeys.length &&
    briefKeys.every(key => Object.hasOwn(input.p_brief, key)) &&
    Object.keys(input.p_contact).length === contactKeys.length &&
    contactKeys.every(key => Object.hasOwn(input.p_contact, key)) &&
    isRecord(input.p_brief.brief_payload) && isRecord(input.p_brief.api_submission) &&
    [input.p_brief.piece_type, input.p_brief.branch, input.p_brief.structure, input.p_brief.sub_structure,
      input.p_brief.design_objective, input.p_brief.ai_sketch_instruction,
      input.p_contact.phone_whatsapp, input.p_contact.country_region, input.p_contact.contact_note]
      .every(value => value === null || typeof value === "string") &&
    typeof input.p_contact.customer_name === "string" && input.p_contact.customer_name.trim().length > 0 &&
    typeof input.p_contact.customer_email === "string" && input.p_contact.customer_email.trim().length > 0;
}

export class FakeFirstPreviewInitiationRepository implements FirstPreviewInitiationRepository {
  constructor(
    readonly shared: SyntheticInitiationState,
    private readonly controls: SyntheticInitiationControls,
  ) {}

  private read(id: string): InitiationResult<InitiationIntent> {
    const raw = this.shared.intents.get(id);
    return isInitiationIntent(raw) && raw.concept_brief_id === id
      ? { ok: true, value: clone(raw) } : failure("invalid_state");
  }
  private save(intent: InitiationIntent): InitiationResult<InitiationIntent> {
    if (!isInitiationIntent(intent)) return failure("invalid_state");
    this.shared.intents.set(intent.concept_brief_id, clone(intent));
    return { ok: true, value: clone(intent) };
  }

  // Synthetic acknowledgement model ONLY, not workload authentication or SQL
  // runtime evidence. Tests supply the independently trusted authority wrapper.
  async recordProviderLifecycle(input: ProviderLifecycleInput): Promise<InitiationResult<{ recorded: true; replayed: boolean }>> {
    if (!this.controls.available()) return failure("repository_unavailable");
    const read = this.read(input.p_concept_brief_id);
    if (read.ok === false) return read;
    const row = read.value;
    const job = this.shared.jobs.get(input.p_job_id);
    if (row.fence !== input.p_fence || !isBoundJob(job, row) || row.handoff_stage !== "generation") return failure("identity_conflict");
    const receipts = this.shared.providerLifecycle.get(row.concept_brief_id) ?? new Map<string, ProviderLifecycleInput>();
    const slot = input.p_action === "record_dispatch" ? "dispatch" : input.p_action === "register_provider" ? "registration" : "terminal";
    const prior = receipts.get(slot);
    if (prior) return same(prior, input)
      ? { ok: true, value: { recorded: true, replayed: true } } : failure("identity_conflict");
    if (receipts.has("terminal") || row.lease_owner !== input.p_owner || row.state !== input.p_expected_state ||
        row.lease_until === null || (Date.parse(row.lease_until) <= this.controls.nowMs() &&
          !(input.p_action === "provider_failure" && input.p_payload.phase === "paid_outcome_unknown"))) return failure("lease_conflict");
    if (input.p_action === "record_dispatch") {
      if (row.state !== "dispatched" || job.state !== "processing" ||
          Object.keys(input.p_payload).length !== 0 || job.providerRequestRecorded) return failure("invalid_state");
    } else if (input.p_action === "register_provider") {
      const id = input.p_payload.provider_request_id;
      if (row.state !== "dispatched" || !receipts.has("dispatch") || job.state !== "processing" ||
          typeof id !== "string" || id.trim() !== id || !id || id.length > 255 || job.providerRequestRecorded ||
          [...this.shared.jobs.values()].some(other => other.id !== job.id && other.providerRequestId === id)) return failure("identity_conflict");
      job.providerRequestId = id; job.providerRequestRecorded = true;
    } else if (input.p_action === "provider_result") {
      const output = this.shared.readyOutputs.get(input.p_payload.output_id);
      if (row.state !== "dispatched" || job.state !== "processing" || !receipts.has("registration") ||
          job.providerRequestId !== input.p_payload.provider_request_id || !output || !output.validated ||
          output.jobId !== job.id || output.briefId !== row.concept_brief_id ||
          output.contentSha256 !== input.p_payload.content_sha256 ||
          !Number.isSafeInteger(input.p_payload.actual_cost_micros) || input.p_payload.actual_cost_micros < 0) return failure("completion_unverified");
      job.state = "succeeded";
    } else {
      if (input.p_payload.provider_request_id !== (job.providerRequestId ?? null) ||
          (input.p_payload.phase === "pre_dispatch" ? row.state !== "claimed" || job.state !== "queued"
            : !["dispatch_armed", "dispatched"].some(state => state === row.state) || job.state !== "processing") ||
          input.p_payload.actual_cost_micros !== null) return failure("invalid_state");
      job.state = "failed";
      row.state = "operator_hold"; row.last_reason = input.p_payload.phase === "pre_dispatch" ? "recovery_blocked" : "paid_outcome_unknown";
      row.lease_owner = null; row.lease_until = null;
      const saved = this.save(row);
      if (saved.ok === false) return saved;
    }
    receipts.set(slot, clone(input));
    this.shared.providerLifecycle.set(row.concept_brief_id, receipts);
    this.shared.jobs.set(job.id, job);
    return { ok: true, value: { recorded: true, replayed: false } };
  }

  async persist(input: PersistInitiationInput): Promise<InitiationResult<DurableInitiationReceipt>> {
    if (!this.controls.available()) return failure("repository_unavailable");
    if (!validIntake(input)) return failure("invalid_input");
    const existing = this.shared.intakes.get(input.p_concept_brief_id);
    const context = isPrivateAdmissionContext(input.p_admission_context,
      input.p_concept_brief_id, input.p_public_reference) ? clone(input.p_admission_context) : null;
    // Discard unverifiable context before cloning; it may not even be JSON data.
    const normalized = { ...clone({ ...input, p_admission_context: null }), p_admission_context: context };
    if (existing) {
      const row = this.read(input.p_concept_brief_id);
      if (row.ok === false || !same(existing.input, normalized)) return failure("identity_conflict");
      return { ok: true, value: clone(existing.receipt) };
    }
    if (this.shared.intents.has(input.p_concept_brief_id) ||
      [...this.shared.intakes.values()].some(item => item.receipt.public_reference === input.p_public_reference)) {
      return failure("identity_conflict");
    }
    // Any injected stage failure happens before both maps commit; no partial receipt.
    if (this.controls.failIntakeAt() !== null) return failure("repository_unavailable");
    const now = new Date(this.controls.nowMs()).toISOString();
    const intent: InitiationIntent = {
      version: INITIATION_VERSION, concept_brief_id: input.p_concept_brief_id,
      generation_purpose: "first_preview", attempt_number: 1,
      state: context === null ? "operator_hold" : "pending", handoff_stage: "initiation",
      handoff_epoch: "0", publication_fence: null, handoff_attempts: 0,
      next_attempt_at: now, lease_owner: null, lease_until: null, fence: "0",
      admission_context: context, prepared: null, dispatch_grant: null,
      last_reason: context === null ? "missing_context" : null, created_at: now, updated_at: now,
    };
    const receipt: DurableInitiationReceipt = {
      persisted: true, concept_brief_id: input.p_concept_brief_id,
      public_reference: input.p_public_reference, intent_version: INITIATION_VERSION,
    };
    const saved = this.save(intent);
    if (saved.ok === false) return saved;
    this.shared.intakes.set(input.p_concept_brief_id, { input: normalized, receipt: clone(receipt) });
    return { ok: true, value: receipt };
  }

  async claim(input: ClaimInitiationsInput): Promise<InitiationResult<InitiationIntent[]>> {
    if (!this.controls.available()) return failure("repository_unavailable");
    if (!isRecord(input) || !isReplayPolicy(input.p_policy)) return failure("policy_unconfigured");
    if (!isUuid(input.p_owner) || !["publish", "execute"].some(mode => mode === input.p_mode) ||
      !(input.p_concept_brief_id === null || isUuid(input.p_concept_brief_id)) ||
      (input.p_mode === "execute" && (!isUuid(input.p_concept_brief_id) ||
        !isFence(input.p_publication_fence) || !isFence(input.p_handoff_epoch) ||
        !["initiation", "generation"].some(stage => stage === input.p_handoff_stage)))) return failure("invalid_input");
    const now = this.controls.nowMs();
    const selected: InitiationIntent[] = [];
    const updates: InitiationIntent[] = [];
    for (const id of [...this.shared.intents.keys()].sort()) {
      if (input.p_concept_brief_id !== null && id !== input.p_concept_brief_id) continue;
      const read = this.read(id);
      if (read.ok === false) return read; // Reject malformed durable state, never coerce it.
      const row = read.value;
      const eligible = input.p_mode === "publish"
        ? ["pending", "waiting_admission", "publishing", "queued", "claimed"].some(state => state === row.state) &&
          Date.parse(row.next_attempt_at) <= now && (row.lease_until === null || Date.parse(row.lease_until) <= now)
        : ["publishing", "queued"].some(state => state === row.state) &&
          row.publication_fence === input.p_publication_fence && row.handoff_epoch === input.p_handoff_epoch &&
          row.handoff_stage === input.p_handoff_stage;
      if (!eligible) continue;
      if (row.admission_context === null ||
        (input.p_mode === "publish" && row.handoff_attempts >= input.p_policy.max_handoff_attempts) ||
        now - Date.parse(row.created_at) >= input.p_policy.max_wait_ms) {
        row.state = "operator_hold";
        row.last_reason = row.admission_context === null ? "missing_context" : "delivery_exhausted";
        row.lease_owner = null; row.lease_until = null;
      } else {
        const fence = increment(row.fence);
        if (fence === null) return failure("lease_conflict");
        row.fence = fence; row.lease_owner = input.p_owner;
        row.lease_until = new Date(now + input.p_policy.lease_ms).toISOString();
        row.state = input.p_mode === "publish" ? "publishing" : "claimed";
        if (input.p_mode === "publish") {
          row.handoff_attempts += 1;
          row.publication_fence ??= row.fence;
        }
        row.last_reason = null;
        selected.push(row);
      }
      row.updated_at = new Date(now).toISOString();
      if (!isInitiationIntent(row)) return failure("invalid_state");
      updates.push(row);
      if (updates.length >= input.p_policy.batch_size) break;
    }
    updates.forEach(row => this.shared.intents.set(row.concept_brief_id, clone(row)));
    return { ok: true, value: clone(selected) };
  }

  async transition(input: TransitionInitiationInput): Promise<InitiationResult<InitiationIntent>> {
    if (!this.controls.available()) return failure("repository_unavailable");
    if (!isRecord(input) || !isReplayPolicy(input.p_policy)) return failure("policy_unconfigured");
    if (!isUuid(input.p_concept_brief_id) || !isUuid(input.p_owner) || !isFence(input.p_fence) ||
      !isInitiationState(input.p_expected_state) || !isRecord(input.p_payload)) return failure("invalid_input");
    const read = this.read(input.p_concept_brief_id);
    if (read.ok === false) return read;
    const row = read.value;
    const now = this.controls.nowMs();
    const frozen = ["dispatch_armed", "dispatched"].some(state => state === row.state) &&
      ["recover_preclaim", "mark_dispatched", "complete", "hold"].some(action => action === input.p_action);
    if (row.fence !== input.p_fence || row.lease_owner !== input.p_owner || row.state !== input.p_expected_state ||
      (!frozen && (row.lease_until === null || Date.parse(row.lease_until) <= now))) return failure("lease_conflict");
    let jobUpdate: { id: string; job: SyntheticJob } | null = null;
    if (input.p_action === "prepare" && row.state === "claimed" && row.handoff_stage === "initiation") {
      if (this.controls.verifyPreparation && !this.controls.verifyPreparation(input, row)) return failure("invalid_input");
      const prep = input.p_payload.prepared;
      if (row.admission_context === null || !isPreparedGeneration(prep, row.concept_brief_id,
        row.admission_context.access_binding.public_reference)) return failure("invalid_input");
      if (row.prepared !== null && !same(row.prepared, prep)) return failure("identity_conflict");
      const job = this.shared.jobs.get(prep.job_id);
      if ((job && (job.id !== prep.job_id || job.briefId !== row.concept_brief_id ||
        job.identityKey !== prep.identity_key || job.state !== "queued")) ||
        [...this.shared.jobs.entries()].some(([id, other]) => id !== prep.job_id &&
          (other.identityKey === prep.identity_key || other.briefId === row.concept_brief_id))) return failure("identity_conflict");
      row.prepared = clone(prep);
      jobUpdate = { id: prep.job_id, job: job ? clone(job) : {
        id: prep.job_id, briefId: row.concept_brief_id, identityKey: prep.identity_key,
        state: "queued", providerRequestRecorded: false,
      } };
    } else if (input.p_action === "publish_generation" && row.state === "claimed" &&
      row.handoff_stage === "initiation" && row.prepared !== null) {
      const epoch = increment(row.handoff_epoch);
      if (epoch === null) return failure("identity_conflict");
      row.state = "publishing"; row.handoff_stage = "generation";
      row.handoff_epoch = epoch; row.publication_fence = row.fence;
      // No admission is simulated or granted by this repository transition.
    } else if (input.p_action === "publication_confirmed" && row.state === "publishing") {
      row.state = "queued"; row.lease_owner = null; row.lease_until = null;
    } else if (input.p_action === "publication_uncertain" && row.state === "publishing") {
      row.lease_until = new Date(now).toISOString(); // Keep stable epoch/publication identity.
    } else if (input.p_action === "wait_admission" && row.state === "claimed") {
      row.state = "waiting_admission"; row.last_reason = "admission_unavailable";
      row.lease_owner = null; row.lease_until = null;
    } else if (input.p_action === "arm" && row.state === "claimed" &&
      row.handoff_stage === "generation" && row.prepared !== null) {
      const grant = input.p_payload.grant;
      if (!isDispatchGrant(grant, row)) return failure("invalid_input");
      const job = this.shared.jobs.get(row.prepared.job_id);
      if (!isBoundJob(job, row) || job.state !== "queued") return failure("identity_conflict");
      row.state = "dispatch_armed"; row.dispatch_grant = clone(grant);
      jobUpdate = { id: row.prepared.job_id, job: { ...job, state: "processing" } };
    } else if (input.p_action === "mark_dispatched" && row.state === "dispatch_armed" &&
      same(input.p_payload.grant, row.dispatch_grant)) {
      row.state = "dispatched";
    } else if (input.p_action === "recover_preclaim" && row.state === "dispatch_armed" &&
      row.lease_until !== null && Date.parse(row.lease_until) <= now) {
      const proof = input.p_payload.recovery;
      // Synthetic supplied evidence ONLY; never represents a real Redis read.
      const verified = isRecord(proof) && Object.keys(proof).length === 4 &&
        proof.source === "authoritative_redis" && proof.reservation_status === "reserved" &&
        same(proof.grant, row.dispatch_grant) && row.dispatch_grant !== null &&
        typeof proof.redis_now_ms === "number" && Number.isSafeInteger(proof.redis_now_ms) &&
        proof.redis_now_ms >= row.dispatch_grant.deadline_ms;
      const job = row.prepared === null ? undefined : this.shared.jobs.get(row.prepared.job_id);
      if (!verified || !isBoundJob(job, row) || job.state !== "processing" || job.providerRequestRecorded) {
        row.state = "operator_hold";
        row.last_reason = !verified ? "paid_outcome_unknown" : "recovery_blocked";
      } else {
        const fence = increment(row.fence);
        if (fence === null || row.prepared === null) return failure("recovery_blocked");
        row.fence = fence; row.state = "waiting_admission"; row.dispatch_grant = null;
        jobUpdate = { id: row.prepared.job_id, job: { ...job, state: "queued" } };
      }
      row.lease_owner = null; row.lease_until = null;
    } else if (input.p_action === "complete" && row.state === "dispatched" && row.prepared !== null) {
      const output = typeof input.p_payload.output_id === "string"
        ? this.shared.readyOutputs.get(input.p_payload.output_id) : undefined;
      const job = this.shared.jobs.get(row.prepared.job_id);
      if (!output || output.briefId !== row.concept_brief_id || output.jobId !== row.prepared.job_id ||
        !output.validated || !output.current || !isBoundJob(job, row) ||
        job.state !== "succeeded") return failure("completion_unverified");
      row.state = "completed"; row.lease_owner = null; row.lease_until = null;
    } else if (input.p_action === "hold") {
      row.state = "operator_hold";
      row.last_reason = row.dispatch_grant === null ? "recovery_blocked" : "paid_outcome_unknown";
      row.lease_owner = null; row.lease_until = null;
    } else if (input.p_action === "cancel" &&
      ["claimed", "publishing", "queued"].some(state => state === row.state) && row.dispatch_grant === null) {
      row.state = "cancelled"; row.lease_owner = null; row.lease_until = null;
    } else return failure("invalid_state");
    row.next_attempt_at = new Date(now + input.p_policy.backoff_ms).toISOString();
    row.updated_at = new Date(now).toISOString();
    if (!isInitiationIntent(row)) return failure("invalid_state");
    // Commit the synthetic job and intent together only after full validation.
    if (jobUpdate !== null) this.shared.jobs.set(jobUpdate.id, clone(jobUpdate.job));
    return this.save(row);
  }
}
