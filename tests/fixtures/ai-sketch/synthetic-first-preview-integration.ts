/** Offline vertical fixture. RPC/commit/ACL/Redis/Provider/Storage doubles are
 * synthetic only; none of this is deployed database or live E2E evidence. */
import { createHmac, timingSafeEqual } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { readFileSync } from "node:fs";
import {
  INITIATION_VERSION, isInitiationIntent, isPreparedGeneration,
  type InitiationIntent, type PersistInitiationInput, type PreparedInitiationGeneration,
  type SignedFirstPreviewPreparationEnvelope, type FirstPreviewWorkerAuthority,
  type FirstPreviewPreparationSourceSnapshot, type InitiationWakeup,
} from "../../../lib/server/ai-sketch/first-preview-initiation-contract";
import { createFirstPreviewPreparationSignerCandidate } from "../../../services/first-preview-signer/signer";
import { createAuthoritativePreparationDatabaseCandidate } from "../../../services/first-preview-signer/database";
import type { CommittedPreparationOperations } from "../../../services/first-preview-signer/contracts";
import {
  publishDormantFirstPreviewInitiation, FIRST_PREVIEW_TRUSTED_OUTPUT_EVIDENCE_VERSION,
  type DormantFirstPreviewWorkerDependencies,
} from "../../../lib/server/ai-sketch/first-preview-generation-lifecycle";
import { consumeDormantFirstPreviewInitiationWakeup } from "../../../lib/server/ai-sketch/first-preview-queue";
import { InMemoryFirstPreviewRepository } from "../../../lib/server/ai-sketch/in-memory-first-preview-repository";
import { FIRST_PREVIEW_COST_CONTRACT, FIRST_PREVIEW_PRICING_ASSUMPTION_VERSION } from "../../../lib/server/ai-sketch/first-preview-cost-contract";
import { buildFirstPreviewStructuredGenerationInput } from "../../../lib/server/ai-sketch/first-preview-structured-input";
import { persistConceptBriefSubmissionWithPreviewIntent } from "../../../lib/server/concept-brief-persistence";
import { prepareFirstPreviewCustomerProof, attachPreparedFirstPreviewCustomerSessionCookie } from "../../../lib/server/ai-sketch/instant-first-preview-feature-flag";
import { deriveFirstPreviewCustomerAccessBinding, matchesFirstPreviewCustomerAccessBinding } from "../../../lib/server/ai-sketch/first-preview-customer-access-contract";
import { createFirstPreviewCustomerAccessAuthorizerBinding } from "../../../lib/server/ai-sketch/supabase-first-preview-customer-access";
import { createSupabaseFirstPreviewGeneratedAssetStore } from "../../../lib/server/ai-sketch/supabase-first-preview-generated-assets";
import { readCurrentConceptBriefRateAuthority } from "../../../lib/server/public-api-rate-limit";
import { deriveFirstPreviewAdmissionContextDigest } from "../../../lib/server/ai-sketch/first-preview-paid-admission";
import type { FirstPreviewRepository, FirstPreviewOutputRecord, MarkFirstPreviewReadyInput } from "../../../lib/server/ai-sketch/first-preview-persistence-contract";
import { FakeFirstPreviewInitiationRepository, createSyntheticInitiationState } from "./fake-first-preview-initiation-repository";
import { createSyntheticPaidAdmission } from "./synthetic-paid-admission";
import { FakeFirstPreviewStorageClient, createSyntheticFirstPreviewPng } from "./fake-first-preview-storage-client";

export const BRIEF = "123e4567-e89b-42d3-a456-426614174000";
export const JOB = "223e4567-e89b-42d3-a456-426614174000";
export const OWNER = "323e4567-e89b-42d3-a456-426614174000";
export const OUTPUT = "423e4567-e89b-42d3-a456-426614174000";
export const PREPARATION = "523e4567-e89b-42d3-a456-426614174000";
export const REFERENCE = "NOVORA-CB-20261020-TEST";
const KEY_ID = "synthetic-preparation-v1";
const KEY = Buffer.alloc(32, 0x37); // Public, test-only material; never a real key.
const VIEW_SECRET = "synthetic-viewing-cookie-only-000000000000000000000";

/** Interpret ONLY the pinned SQL source's message framing statements, not JS's
 * builder. No SQL runs. This checks source-contract consistency, not PG runtime. */
export function postgresPreparationBytes(envelope: SignedFirstPreviewPreparationEnvelope): Buffer {
  const sql = readFileSync("docs/novora-pr287-durable-initiation-candidate.sql", "utf8");
  const block = sql.slice(sql.indexOf("message_bytes := public.novora_fp_hmac_frame"),
    sql.indexOf("IF novora_fp_authority.hmac_matches"));
  const values = [...block.matchAll(/novora_fp_hmac_frame\((?:evidence->>'([^']+)'|'([^']+)')\)/g)]
    .map(match => match[1] ? envelope[match[1] as keyof typeof envelope] : match[2]);
  const tail = block.match(/FOREACH k IN ARRAY ARRAY\[([^\]]+)\]/);
  if (values.length !== 6 || !tail) throw new Error("SQL framing contract changed");
  values.push(...[...tail[1].matchAll(/'([^']+)'/g)].map(match => envelope[match[1] as keyof typeof envelope]));
  return Buffer.concat(values.map(value => {
    if (typeof value !== "string") throw new Error("Missing SQL frame field");
    const utf8 = Buffer.from(value, "utf8");
    return Buffer.concat([Buffer.from(String(utf8.byteLength) + ":", "ascii"), utf8]);
  }));
}

export function createSyntheticFirstPreviewIntegration() {
  const o1 = createSyntheticPaidAdmission();
  const events: string[] = [];
  const messages: InitiationWakeup[] = [];
  const shared = createSyntheticInitiationState();
  const clock = () => new Date(o1.state.now).toISOString();
  const controls = {
    failIntake: null as "brief" | "contact" | "intent" | null,
    signerAuthorized: true, noKey: false, revokeKey: false,
    releaseDenied: false, unknownCommit: false, releaseIdentityConflict: false,
    expireDuringKey: false, changeSourceDuringKey: false,
    tamperMac: false, rejectConsumption: false, freshDenied: false,
    skipCombined: false, unknownPaid: false, safetyDenied: false,
    failPublish: false, providerConflict: false, providerCalls: 0,
  };
  let selection: {
    preparation_id: string; selection_version: string; intent: InitiationIntent;
    source_snapshot: FirstPreviewPreparationSourceSnapshot;
    admission_context: InitiationIntent["admission_context"];
    reserved_job_id: string; preparation_policy: Record<string, unknown>;
    prepared: PreparedInitiationGeneration | null; database_now_ms: number;
  } | null = null;
  let released: SignedFirstPreviewPreparationEnvelope | null = null;
  let readiness: MarkFirstPreviewReadyInput | null = null;
  let persistedOutput: FirstPreviewOutputRecord | null = null;
  const keyCopies: Uint8Array[] = [];
  const source = (): FirstPreviewPreparationSourceSnapshot => ({
    ...structuredClone(shared.intakes.get(BRIEF)!.input.p_brief),
    concept_brief_id: BRIEF, public_reference: REFERENCE, source: "api",
  });
  const current = () => shared.intents.get(BRIEF) as InitiationIntent;
  const claimCurrent = () => {
    const row = current();
    return controls.signerAuthorized && isInitiationIntent(row) && row.state === "claimed" &&
      row.handoff_stage === "initiation" && row.prepared === null && row.lease_owner === OWNER &&
      row.lease_until !== null && Date.parse(row.lease_until) > o1.state.now;
  };
  function verifyProof(proof: SignedFirstPreviewPreparationEnvelope, prepared: unknown, row: InitiationIntent) {
    try {
      if (!selection || controls.revokeKey || proof.key_id !== KEY_ID ||
          proof.concept_brief_id !== BRIEF || proof.public_reference !== REFERENCE ||
          proof.job_id !== JOB || proof.identity_key !== selection.prepared?.identity_key ||
          proof.version !== "novora_first_preview_preparation_hmac_v1" || proof.initiation_version !== INITIATION_VERSION ||
          proof.owner !== row.lease_owner || proof.fence !== row.fence ||
          !/^[a-f0-9]{64}$/.test(proof.mac_sha256)) return false;
      const expected = createHmac("sha256", KEY).update(postgresPreparationBytes(proof)).digest();
      return timingSafeEqual(expected, Buffer.from(proof.mac_sha256, "hex")) &&
        isDeepStrictEqual(JSON.parse(Buffer.from(proof.source_snapshot_utf8_hex, "hex").toString("utf8")), source()) &&
        isDeepStrictEqual(JSON.parse(Buffer.from(proof.prepared_utf8_hex, "hex").toString("utf8")), prepared) &&
        isDeepStrictEqual(prepared, selection.prepared) && selection.intent.fence === row.fence &&
        selection.intent.lease_owner === row.lease_owner;
    } catch { return false; }
  }
  const fake = new FakeFirstPreviewInitiationRepository(shared, {
    nowMs: () => o1.state.now, available: () => true, failIntakeAt: () => controls.failIntake,
    verifyPreparation(input, row) {
      events.push("database-consume-proof");
      return !controls.rejectConsumption && released !== null &&
        isDeepStrictEqual(released, input.p_payload.preparation_envelope) &&
        verifyProof(released, input.p_payload.prepared, row);
    },
  });
  const operations: CommittedPreparationOperations = {
    async selectPreparationClaim({ p_brief }) {
      events.push("select-committed");
      if (p_brief !== BRIEF || !claimCurrent()) return { ok: false };
      const structured = buildFirstPreviewStructuredGenerationInput({ payload: source().brief_payload, publicReference: REFERENCE });
      if (!structured.ok) return { ok: false };
      selection ??= {
        preparation_id: PREPARATION, selection_version: "novora_fp_selection_v1",
        intent: structuredClone(current()), source_snapshot: source(), admission_context: current().admission_context,
        reserved_job_id: JOB, prepared: null, database_now_ms: o1.state.now,
        preparation_policy: {
          design_spec_version: structured.value.designSpec.spec_version,
          hand_sketch_instruction_version: structured.value.handSketchInstruction.instruction_version,
          estimated_cost_micros: FIRST_PREVIEW_COST_CONTRACT.estimatedCostMicros,
          cost_currency: "USD", pricing_assumption_version: FIRST_PREVIEW_PRICING_ASSUMPTION_VERSION,
          provider_profile: { provider_name: "openai", model_name: "gpt-image-2-2026-04-21",
            provider_endpoint: "/v1/images/generations", request_image_count: 1,
            request_streaming: false, request_partial_images: 0, request_size: "1024x1024",
            request_quality: "medium", output_format: "png", moderation_mode: "auto" },
        },
      };
      return { ok: true, value: structuredClone(selection) };
    },
    async bindPreparation({ p_preparation, p_prepared }) {
      events.push("bind-committed");
      if (!claimCurrent() || !selection || p_preparation !== selection.preparation_id ||
          p_prepared.job_id !== selection.reserved_job_id ||
          !isPreparedGeneration(p_prepared, BRIEF, REFERENCE) ||
          (selection.prepared !== null && !isDeepStrictEqual(selection.prepared, p_prepared))) return { ok: false };
      selection.prepared = structuredClone(p_prepared);
      return { ok: true, value: structuredClone(selection) };
    },
    async authorizePreparationRelease({ p_preparation, p_envelope }) {
      events.push("release-committed");
      if (!claimCurrent() || !selection || p_preparation !== selection.preparation_id ||
          controls.releaseDenied || !verifyProof(p_envelope, selection.prepared, current())) return { ok: false, authorized: false };
      released = structuredClone(p_envelope);
      if (controls.unknownCommit) throw new Error("synthetic COMMIT outcome unknown");
      return { ok: true, authorized: true, preparation_id: selection.preparation_id,
        selection_version: selection.selection_version, owner: OWNER,
        fence: controls.releaseIdentityConflict ? "999" : current().fence,
        lease_until: current().lease_until, database_now_ms: o1.state.now };
    },
  };
  const signer = createFirstPreviewPreparationSignerCandidate({
    database: createAuthoritativePreparationDatabaseCandidate(operations),
    secrets: { async loadActivePreparationKey() {
      events.push("signer-key");
      if (controls.expireDuringKey) o1.state.now += 60_001;
      if (controls.changeSourceDuringKey) shared.intakes.get(BRIEF)!.input.p_brief.design_objective = "changed";
      if (controls.noKey) return null;
      const keyBytes = Uint8Array.from(KEY);
      keyCopies.push(keyBytes);
      return { keyId: KEY_ID, keyBytes };
    } },
  });
  const repository = new InMemoryFirstPreviewRepository(clock);
  const authority: FirstPreviewWorkerAuthority = {
    owner: OWNER, policy: { lease_ms: 60_000, backoff_ms: 1, batch_size: 1, max_handoff_attempts: 3, max_wait_ms: 300_000 },
    claim: input => fake.claim(input),
    async transition(input) {
      events.push(input.p_action);
      const result = await fake.transition(input);
      if (!result.ok) return result;
      if (input.p_action === "prepare") {
        const p = result.value.prepared!;
        const reserved = await repository.reserveJob({ jobId: p.job_id, conceptBriefId: BRIEF,
          attemptNumber: 1, parentJobId: null, sourceOutputId: null,
          designSpecVersion: p.design_spec_version, designSpecSha256: p.design_spec_sha256,
          handSketchInstructionVersion: p.hand_sketch_instruction_version,
          handSketchInstructionSha256: p.hand_sketch_instruction_sha256,
          estimatedCostMicros: p.estimated_cost_micros, costCurrency: p.cost_currency,
          pricingAssumptionVersion: p.pricing_assumption_version });
        if (!reserved.ok) return { ok: false, code: "identity_conflict" };
      }
      if (input.p_action === "arm" && !(await repository.startJob(JOB)).ok) return { ok: false, code: "identity_conflict" };
      return result;
    },
    async recordProviderLifecycle(input) {
      events.push(input.p_action);
      if (input.p_action === "provider_result") {
        const output = persistedOutput?.id === input.p_payload.output_id ? persistedOutput : null;
        if (output) shared.readyOutputs.set(output.id, { briefId: output.conceptBriefId, jobId: output.jobId,
          validated: true, current: false, contentSha256: output.contentSha256 });
      }
      const result = await fake.recordProviderLifecycle(input);
      if (!result.ok || result.value.replayed) return result;
      const ack = input.p_action === "record_dispatch" ? await repository.recordProviderDispatch(JOB)
        : input.p_action === "register_provider" ? await repository.recordProviderRequest(JOB, { providerRequestId: input.p_payload.provider_request_id })
        : input.p_action === "provider_result" ? await repository.recordJobSucceeded(JOB, { actualCostMicros: input.p_payload.actual_cost_micros })
        : await repository.recordJobFailure(JOB, { category: input.p_payload.category, retryEligible: false, actualCostMicros: null });
      return ack.ok ? result : { ok: false, code: "identity_conflict" };
    },
  };
  const accessDatabase = {
    async findBriefCandidates() { return { data: shared.intakes.has(BRIEF) ? [{ id: BRIEF, public_reference: REFERENCE }] : [], error: null }; },
    async findJobCandidates() {
      const job = await repository.findJobById(JOB);
      return { data: job ? [{ id: job.id, concept_brief_id: job.conceptBriefId,
        generation_purpose: job.generationPurpose, status: job.status, completed_at: job.completedAt }] : [], error: null };
    },
    async findOutputCandidates() {
      const out = await repository.findCustomerReadyOutput(BRIEF);
      return { data: out ? [{ id: out.id, job_id: out.jobId, concept_brief_id: out.conceptBriefId,
        bucket_name: out.bucketName, object_path: out.assetId, mime_type: out.mimeType,
        byte_size: out.byteSize, width_px: out.widthPx, height_px: out.heightPx, content_sha256: out.contentSha256,
        asset_created_at: out.assetCreatedAt, asset_validation_status: "passed", asset_validated_at: out.assetValidatedAt,
        automatic_gate_status: readiness ? "passed" : "not_run",
        automatic_gate_evidence: readiness ? { result: "passed", ...readiness.gates } : null,
        automatic_gate_policy_version: readiness?.automaticGatePolicyVersion,
        automatic_gate_passed_at: out.readyAt, readiness_status: out.readinessStatus,
        first_preview_ready_at: out.readyAt, readiness_revoked_at: out.revokedAt,
        is_current_customer_preview: out.isCurrentCustomerPreview, created_at: out.createdAt }] : [], error: null };
    },
  };
  const authorizer = createFirstPreviewCustomerAccessAuthorizerBinding({ databaseClient: accessDatabase,
    signingSecret: VIEW_SECRET, clock: () => Math.floor(o1.state.now / 1000) });
  const storage = new FakeFirstPreviewStorageClient();
  storage.createdAt = clock();
  const store = createSupabaseFirstPreviewGeneratedAssetStore(storage, authorizer, { clock });
  const png = createSyntheticFirstPreviewPng();
  const dependencies: { -readonly [K in keyof DormantFirstPreviewWorkerDependencies]: DormantFirstPreviewWorkerDependencies[K] } = {
    repository: new Proxy(repository, { get(target, key) {
      if (key === "persistOutput") return async (input: Parameters<FirstPreviewRepository["persistOutput"]>[0]) => {
        const result = await target.persistOutput(input);
        if (result.ok) persistedOutput = result.value;
        return result;
      };
      if (key === "markOutputReady") return async (input: MarkFirstPreviewReadyInput) => {
        const result = await target.markOutputReady(input);
        if (result.ok) {
          readiness = structuredClone(input);
          const output = shared.readyOutputs.get(OUTPUT);
          if (output) output.current = true;
        }
        return result;
      };
      const value = Reflect.get(target, key);
      return typeof value === "function" ? value.bind(target) : value;
    } }) as FirstPreviewRepository,
    authority, preparationSigner: { async signAuthoritativePreparation(request) {
      const result = await signer.signAuthoritativePreparation(request);
      return result.ok && controls.tamperMac ? { ok: true, envelope: { ...result.envelope, mac_sha256: "0".repeat(64) } } : result;
    } },
    async publishWakeup(message) { events.push("queue-" + message.stage); messages.push(structuredClone(message));
      if (controls.failPublish) throw new Error("synthetic unknown delivery"); },
    paidAdmission: o1.admission, outputIdSource: () => OUTPUT,
    freshAdmission: {
      async prepare(intent) {
        events.push("fresh-" + intent.handoff_stage);
        const binding = deriveFirstPreviewCustomerAccessBinding(proof.proof, VIEW_SECRET,
          Math.floor(o1.state.now / 1000), BRIEF, REFERENCE);
        if (controls.freshDenied || !binding || !intent.admission_context ||
            !matchesFirstPreviewCustomerAccessBinding(binding, intent.admission_context.access_binding)) return null;
        return { version: INITIATION_VERSION, concept_brief_id: BRIEF, job_id: intent.prepared!.job_id,
          identity_key: intent.prepared!.identity_key, fence: intent.fence, nonce: OUTPUT,
          deadline_ms: o1.state.now + 10_000,
          admission_context_digest: deriveFirstPreviewAdmissionContextDigest(intent.admission_context) };
      },
      async dispatch(_intent, _grant, commitCombined) {
        events.push("fresh-dispatch");
        return controls.freshDenied ? false : controls.skipCombined ? true : commitCombined();
      },
    },
    createProvider: () => ({ adapter: { async generateFirstPreviewImage() {
      events.push("provider"); controls.providerCalls++;
      if (controls.unknownPaid) throw new Error("synthetic unknown paid outcome");
      return { ok: true, imageBase64: Buffer.from(png).toString("base64"), mimeType: "image/png",
        width: 1024, height: 1024, byteSize: png.byteLength, model: "gpt-image-2-2026-04-21",
        providerRequestId: "req_synthetic_vertical" };
    } }, readProviderRequestId: () => controls.unknownPaid ? null : controls.providerConflict ? "req_conflict" : "req_synthetic_vertical",
      readValidatedUsage: () => controls.unknownPaid ? null : { textInputTokens: 100, imageOutputTokens: 100 } }),
    createAssetStore: () => store,
    async evaluateTrustedOutput(input) { return { evidenceVersion: FIRST_PREVIEW_TRUSTED_OUTPUT_EVIDENCE_VERSION,
      subject: input.subject, results: { contentSafetyPassed: !controls.safetyDenied, privacyPassed: true, outputValidityPassed: true } }; },
  };
  const proofDependencies = { featureFlagValue: "true", signingSecret: VIEW_SECRET,
    clock: () => Math.floor(o1.state.now / 1000), nonceSource: () => "synthetic_vertical_nonce_0001" };
  const proof = prepareFirstPreviewCustomerProof({ conceptBriefId: BRIEF, publicReference: REFERENCE }, proofDependencies)!;
  const rate = readCurrentConceptBriefRateAuthority(o1.environment)!;
  const intake: PersistInitiationInput = {
    p_concept_brief_id: BRIEF, p_public_reference: REFERENCE,
    p_brief: { piece_type: "ring", branch: null, structure: null, sub_structure: null,
      design_objective: "Synthetic café 珠宝 💎", ai_sketch_instruction: null,
      brief_payload: { pieceType: "ring", designIntent: "A balanced heirloom ring.", designDescription: "A refined daily silhouette.",
        styleDirection: ["warm heirloom"], materialDirection: ["warm yellow gold"],
        stones: [{ role: "center", type: "lab-grown diamond", shape: "pear", orientation: "point toward fingertip", setting: "five prongs" }],
        centerStoneDirection: "Pear point toward fingertip.", stoneArrangement: "Two shoulder accents.", dimensions: ["ring size to confirm"],
        composition: "Low balanced center.", wearabilityRequirements: ["daily wear"], manufacturingConstraints: ["explainable prongs"],
        unknowns: ["exact ring size"], avoid: ["hidden halo"], requestedViews: ["front view"] },
      summary_items: [], api_submission: { public_reference: REFERENCE, submitted_at: clock() } },
    p_contact: { customer_name: "Synthetic Test", customer_email: "synthetic@example.invalid",
      phone_whatsapp: null, country_region: null, contact_note: null },
    p_admission_context: { version: INITIATION_VERSION, key_version: rate.key_version, rate_policy_version: rate.rate_policy_version,
      ip_key: "rl:v1:concept-briefs:ip:" + "a".repeat(48), email_key: "rl:v1:concept-briefs:email:" + "b".repeat(48),
      access_binding: proof.binding },
  };
  const context = intake.p_admission_context as InitiationIntent["admission_context"];
  o1.seedCounters(context!.ip_key, context!.email_key);
  const cookies: string[] = [];
  const rpc = { async rpc(name: string, input: PersistInitiationInput) {
    if (name !== "novora_persist_concept_brief_with_preview_intent") throw new Error("unexpected RPC");
    const result = await fake.persist(input);
    events.push("atomic-receipt");
    return { data: result.ok ? { ok: true, value: { ...result.value,
      intent_state: current().state, intent_created: true } } : result, error: null };
  } } as unknown as NonNullable<Parameters<typeof persistConceptBriefSubmissionWithPreviewIntent>[1]>;
  return { controls, events, messages, shared, fake, o1, repository, dependencies, operations, signer,
    proof, keyCopies, intake, cookies, storage, store, current, source,
    released: () => released,
    async persist() {
      const result = await persistConceptBriefSubmissionWithPreviewIntent(intake, rpc);
      if (result.persisted) attachPreparedFirstPreviewCustomerSessionCookie({ cookies: {
        set(_name: string, value: string) { events.push("cookie-after-commit"); cookies.push(value); },
      } }, result, proof, proofDependencies);
      return result;
    },
    publish: () => publishDormantFirstPreviewInitiation(BRIEF, dependencies),
    consume: (message: unknown) => consumeDormantFirstPreviewInitiationWakeup(message, dependencies),
    read: (accessProof = proof.proof) => store.readAuthorizedPng({ publicReference: REFERENCE, outputId: OUTPUT, accessProof }),
  };
}
