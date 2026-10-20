import "server-only";

import {
  createFirstPreviewPaidAdmission,
  createPaidAdmissionSubject,
  type FirstPreviewPaidAdmission,
} from "./first-preview-paid-admission";

import { createHash, randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import {
  isDispatchGrant, isInitiationIntent, isInitiationWakeup, isReplayPolicy, isUuid,
  isPreparedGeneration, prepareFirstPreviewHmacEnvelopeCandidate,
  type FirstPreviewWorkerAuthority, type InitiationIntent, type InitiationWakeup,
  type PrivateDispatchGrant, type ProviderLifecycleInput,
} from "./first-preview-initiation-contract";
import type { FirstPreviewPreparationSigner } from "../../../services/first-preview-signer/contracts";

import { createFirstPreviewCustomerAccessAuthorizer } from "./first-preview-customer-access";
import {
  FIRST_PREVIEW_COST_CONTRACT,
  FIRST_PREVIEW_PRICING_ASSUMPTION_VERSION,
  evaluateFirstPreviewAttemptBudget,
  firstPreviewActualCostExceedsReservation,
  reconcileFirstPreviewActualCost,
} from "./first-preview-cost-contract";
import {
  createFirstPreviewGeneratedAssetStore,
  type FirstPreviewGeneratedAssetStore,
  type PersistFirstPreviewGeneratedAssetResult,
} from "./first-preview-generated-assets";
import {
  FIRST_PREVIEW_ASSET_BUCKET,
  FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION,
  type FirstPreviewFailureCategory,
  type FirstPreviewJobRecord,
  type FirstPreviewOutputRecord,
  type FirstPreviewRepository,
} from "./first-preview-persistence-contract";
import { createFirstPreviewRepository } from "./first-preview-persistence";
import {
  FIRST_PREVIEW_PROVIDER_CONTRACT_VERSION,
  orchestrateFirstPreviewGeneration,
  type FirstPreviewProvider,
} from "./first-preview-runtime";
import {
  buildFirstPreviewStructuredGenerationInput,
  type FirstPreviewStructuredGenerationInput,
} from "./first-preview-structured-input";
import {
  createOpenAiFirstPreviewProviderBinding,
  type OpenAiFirstPreviewProviderBinding,
} from "./openai-first-preview-client";
import {
  createOpenAiFirstPreviewTrustedOutputEvaluator,
} from "./openai-first-preview-trusted-output";
import {
  OPENAI_FIRST_PREVIEW_TIMEOUT_MS,
  type OpenAiFirstPreviewAdapterResult,
} from "./openai-first-preview-provider";

export type FirstPreviewPreparedGenerationInput = Readonly<
  Pick<
    FirstPreviewStructuredGenerationInput,
    | "designSpec"
    | "handSketchInstruction"
    | "designSpecSha256"
    | "handSketchInstructionSha256"
  >
>;

type AutomaticFirstPreviewAttemptNumber = 1 | 2;

export type FirstPreviewGenerationWork = Readonly<{
  jobId: string;
  conceptBriefId: string;
  publicReference: string;
  attemptNumber: AutomaticFirstPreviewAttemptNumber;
  parentJobId: string | null;
  structured: FirstPreviewPreparedGenerationInput;
}>;

export function prepareFirstPreviewGenerationInput(
  structured: FirstPreviewStructuredGenerationInput,
): FirstPreviewPreparedGenerationInput {
  return {
    designSpec: structured.designSpec,
    handSketchInstruction: structured.handSketchInstruction,
    designSpecSha256: structured.designSpecSha256,
    handSketchInstructionSha256: structured.handSketchInstructionSha256,
  };
}

export type ReserveAutomaticFirstPreviewResult =
  | Readonly<{
      ok: true;
      disposition: "created" | "existing";
      work: FirstPreviewGenerationWork;
    }>
  | Readonly<{
      ok: false;
      category:
        | "invalid_structured_input"
        | "precondition_failed"
        | "lifecycle_conflict"
        | "budget_blocked";
    }>;

export type AutomaticFirstPreviewWorkerResult = Readonly<{
  status: "ready" | "failed" | "duplicate";
  failureCategory?: FirstPreviewFailureCategory;
}>;

export const FIRST_PREVIEW_TRUSTED_OUTPUT_EVIDENCE_VERSION =
  "novora_first_preview_trusted_output_evidence_v1" as const;

export type FirstPreviewTrustedOutputSubject = Readonly<{
  conceptBriefId: string;
  jobId: string;
  outputId: string;
  contentSha256: string;
}>;

export type FirstPreviewTrustedOutputEvidence = Readonly<{
  evidenceVersion: typeof FIRST_PREVIEW_TRUSTED_OUTPUT_EVIDENCE_VERSION;
  subject: FirstPreviewTrustedOutputSubject;
  results: Readonly<{
    contentSafetyPassed: boolean;
    privacyPassed: boolean;
    outputValidityPassed: boolean;
  }>;
}>;

export type FirstPreviewTrustedOutputEvaluator = (
  input: Readonly<{
    subject: FirstPreviewTrustedOutputSubject;
    imageBytes: Uint8Array;
    mimeType: "image/png";
    widthPx: 1024;
    heightPx: 1024;
  }>,
  context: Readonly<{ signal: AbortSignal }>,
) => Promise<unknown>;

export type AutomaticFirstPreviewWorkerDependencies = Readonly<{
  repository: FirstPreviewRepository;
  paidAdmission?: FirstPreviewPaidAdmission;
  createProvider(): OpenAiFirstPreviewProviderBinding | null;
  createAssetStore(): FirstPreviewGeneratedAssetStore;
  evaluateTrustedOutput?: FirstPreviewTrustedOutputEvaluator;
  trustedOutputEvidenceTimeoutMs?: number;
  attemptTimeoutMs?: number;
  outputIdSource?: () => string;
}>;

export type DormantFirstPreviewWorkerDependencies = AutomaticFirstPreviewWorkerDependencies & {
  authority?: FirstPreviewWorkerAuthority;
  preparationSigner?: FirstPreviewPreparationSigner;
  // Trusted transport wiring only. Messages contain identifiers, never proofs,
  // source snapshots, customer data or signing keys. No production default.
  publishWakeup?: (wakeup: InitiationWakeup) => Promise<void>;
  freshAdmission?: {
    // Verify protected context/proof binding, current key/policy versions and
    // fresh public admission. The returned grant is not itself paid permission.
    prepare(intent: InitiationIntent): Promise<PrivateDispatchGrant | null>;
    // The trusted authority invokes commitCombined exactly once. The callback
    // runs the actual combined Redis commit, not an independent O1 dispatch.
    // Its positive result alone is not paid authority. No live factory exists.
    dispatch(intent: InitiationIntent, grant: PrivateDispatchGrant,
      commitCombined: () => Promise<boolean>): Promise<boolean>;
  };
};

type DormantInitiationHandoffResult = Readonly<{ status: "handed_off" | "failed" }>;
function samePinnedIntent(previous: InitiationIntent, next: InitiationIntent): boolean {
  return next.version === previous.version && next.concept_brief_id === previous.concept_brief_id &&
    next.fence === previous.fence && next.created_at === previous.created_at &&
    isDeepStrictEqual(next.admission_context, previous.admission_context) &&
    isDeepStrictEqual(next.prepared, previous.prepared) && next.dispatch_grant === null;
}
async function publishAndConfirmDormantIntent(
  intent: InitiationIntent, dependencies: DormantFirstPreviewWorkerDependencies,
): Promise<DormantInitiationHandoffResult> {
  const { authority, publishWakeup } = dependencies;
  if (!authority || !publishWakeup || intent.state !== "publishing" ||
      intent.lease_owner !== authority.owner || intent.publication_fence === null) return { status: "failed" };
  try {
    await publishWakeup({ version: intent.version, concept_brief_id: intent.concept_brief_id,
      publication_fence: intent.publication_fence, handoff_epoch: intent.handoff_epoch,
      stage: intent.handoff_stage });
  } catch {
    // Delivery may have succeeded. Retain the durable publication identity;
    // no second send, legacy fallback or spending release is attempted here.
    await authority.transition({ p_concept_brief_id: intent.concept_brief_id,
      p_owner: authority.owner, p_fence: intent.fence, p_expected_state: "publishing",
      p_action: "publication_uncertain", p_policy: authority.policy, p_payload: {} });
    return { status: "failed" };
  }
  const ack = await authority.transition({ p_concept_brief_id: intent.concept_brief_id,
    p_owner: authority.owner, p_fence: intent.fence, p_expected_state: "publishing",
    p_action: "publication_confirmed", p_policy: authority.policy, p_payload: {} });
  return ack.ok === true && isInitiationIntent(ack.value) && samePinnedIntent(intent, ack.value) &&
    ack.value.state === "queued" && ack.value.handoff_stage === intent.handoff_stage &&
    ack.value.handoff_epoch === intent.handoff_epoch && ack.value.publication_fence === intent.publication_fence &&
    ack.value.lease_owner === null && ack.value.lease_until === null
    ? { status: "handed_off" } : { status: "failed" };
}

/** Dormant Outbox publisher. Missing trusted workload/transport never enables it. */
export async function publishDormantFirstPreviewInitiation(
  conceptBriefId: string, dependencies?: DormantFirstPreviewWorkerDependencies,
): Promise<DormantInitiationHandoffResult> {
  try {
    const authority = dependencies?.authority;
    if (!isUuid(conceptBriefId) || !dependencies?.publishWakeup || !authority ||
        !isUuid(authority.owner) || !isReplayPolicy(authority.policy)) return { status: "failed" };
    const claimed = await authority.claim({ p_owner: authority.owner, p_policy: authority.policy,
      p_mode: "publish", p_concept_brief_id: conceptBriefId, p_publication_fence: null,
      p_handoff_epoch: null, p_handoff_stage: null });
    if (!claimed.ok || claimed.value.length !== 1) return { status: "failed" };
    const row = claimed.value[0];
    if (!isInitiationIntent(row) || row.concept_brief_id !== conceptBriefId ||
        row.state !== "publishing" || row.handoff_stage !== "initiation" || row.prepared !== null ||
        row.dispatch_grant !== null || !row.admission_context || row.fence === "0") return { status: "failed" };
    return await publishAndConfirmDormantIntent(structuredClone(row), dependencies);
  } catch { return { status: "failed" }; }
}

/** Preparation uses the independent Signer, then the definitive protected SQL
 * consumption transition. A valid HMAC/cookie alone never permits publication
 * or paid dispatch. Fresh public admission and O1 reservation precede handoff.
 */
export async function runDormantFirstPreviewPreparationWorker(
  wakeup: InitiationWakeup, dependencies?: DormantFirstPreviewWorkerDependencies,
): Promise<DormantInitiationHandoffResult> {
  try {
    const authority = dependencies?.authority;
    const signer = dependencies?.preparationSigner;
    if (!isInitiationWakeup(wakeup) || wakeup.stage !== "initiation" || !dependencies || !authority ||
        !signer || !dependencies.publishWakeup || !dependencies.freshAdmission || !dependencies.paidAdmission ||
        !isUuid(authority.owner) || !isReplayPolicy(authority.policy)) return { status: "failed" };
    const claimed = await authority.claim({ p_owner: authority.owner, p_policy: authority.policy,
      p_mode: "execute", p_concept_brief_id: wakeup.concept_brief_id,
      p_publication_fence: wakeup.publication_fence, p_handoff_epoch: wakeup.handoff_epoch,
      p_handoff_stage: "initiation" });
    if (!claimed.ok || claimed.value.length !== 1) return { status: "failed" };
    const row = claimed.value[0];
    if (!isInitiationIntent(row) || row.concept_brief_id !== wakeup.concept_brief_id ||
        row.state !== "claimed" || row.handoff_stage !== "initiation" || row.prepared !== null ||
        row.dispatch_grant !== null || !row.admission_context || row.lease_owner !== authority.owner ||
        row.publication_fence !== wakeup.publication_fence || row.handoff_epoch !== wakeup.handoff_epoch ||
        row.fence === "0") return { status: "failed" };
    const signed = await signer.signAuthoritativePreparation({ concept_brief_id: row.concept_brief_id });
    if (!signed.ok) return { status: "failed" };
    const proof = signed.envelope;
    const prepared: unknown = JSON.parse(Buffer.from(proof.prepared_utf8_hex, "hex").toString("utf8"));
    const source: unknown = JSON.parse(Buffer.from(proof.source_snapshot_utf8_hex, "hex").toString("utf8"));
    if (!isPreparedGeneration(prepared, row.concept_brief_id, row.admission_context.access_binding.public_reference)) {
      return { status: "failed" };
    }
    const material = prepareFirstPreviewHmacEnvelopeCandidate({ sourceSnapshot: source, prepared,
      owner: authority.owner, fence: row.fence, keyId: proof.key_id });
    const { mac_sha256: mac, ...unsigned } = proof;
    if (!material || !/^[a-f0-9]{64}$/.test(mac) || !isDeepStrictEqual(unsigned, material.envelope)) return { status: "failed" };
    const accepted = await authority.transition({ p_concept_brief_id: row.concept_brief_id,
      p_owner: authority.owner, p_fence: row.fence, p_expected_state: "claimed", p_action: "prepare",
      p_policy: authority.policy, p_payload: { prepared, preparation_envelope: proof } });
    const pinned = { ...row, prepared };
    if (!accepted.ok || !isInitiationIntent(accepted.value) || !samePinnedIntent(pinned, accepted.value) ||
        accepted.value.state !== "claimed" || accepted.value.handoff_stage !== "initiation" ||
        accepted.value.handoff_epoch !== row.handoff_epoch || accepted.value.publication_fence !== row.publication_fence ||
        accepted.value.lease_owner !== authority.owner) return { status: "failed" };
    const current = structuredClone(accepted.value);
    const grant = await dependencies.freshAdmission.prepare(structuredClone(current));
    const subject = createPaidAdmissionSubject({ conceptBriefId: row.concept_brief_id,
      publicReference: row.admission_context.access_binding.public_reference, attemptNumber: 1,
      parentJobId: null, structured: prepared.generation_input });
    if (!grant || !isDispatchGrant(grant, current) || !subject || subject.identity !== prepared.identity_key ||
        await dependencies.paidAdmission.reserve(subject) !== true) return { status: "failed" };
    const publishing = await authority.transition({ p_concept_brief_id: row.concept_brief_id,
      p_owner: authority.owner, p_fence: row.fence, p_expected_state: "claimed", p_action: "publish_generation",
      p_policy: authority.policy, p_payload: {} });
    if (!publishing.ok || !isInitiationIntent(publishing.value) || !samePinnedIntent(current, publishing.value) ||
        publishing.value.state !== "publishing" || publishing.value.handoff_stage !== "generation" ||
        publishing.value.handoff_epoch !== (BigInt(row.handoff_epoch) + BigInt(1)).toString() ||
        publishing.value.publication_fence !== row.fence || publishing.value.lease_owner !== authority.owner) {
      return { status: "failed" };
    }
    return await publishAndConfirmDormantIntent(publishing.value, dependencies);
  } catch { return { status: "failed" }; }
}

/** Dormant DI entry point. Never selected by a feature flag or production factory. */
export async function runDormantFirstPreviewInitiationWorker(
  wakeup: InitiationWakeup,
  dependencies?: DormantFirstPreviewWorkerDependencies,
): Promise<AutomaticFirstPreviewWorkerResult> {
  const denied = { status: "failed", failureCategory: "lifecycle_conflict" } as const;
  const authority = dependencies?.authority;
  const fresh = dependencies?.freshAdmission;
  const spending = dependencies?.paidAdmission;
  if (!isInitiationWakeup(wakeup) || wakeup.stage !== "generation" || !dependencies || !authority || !fresh || !spending ||
      typeof spending.dispatchCombined !== "function" ||
      !isUuid(authority.owner) || !isReplayPolicy(authority.policy)) return denied;
  const owner = authority.owner;
  const policy = structuredClone(authority.policy);
  const selector = structuredClone(wakeup);
  let intent: InitiationIntent | null = null;
  try {
    const claimed = await authority.claim({
      p_owner: owner, p_policy: policy, p_mode: "execute",
      p_concept_brief_id: selector.concept_brief_id,
      p_publication_fence: selector.publication_fence,
      p_handoff_epoch: selector.handoff_epoch, p_handoff_stage: "generation",
    });
    if (claimed.ok !== true || claimed.value.length !== 1) return denied;
    const row = claimed.value[0];
    if (!isInitiationIntent(row) || row.state !== "claimed" || row.handoff_stage !== "generation" ||
        row.concept_brief_id !== selector.concept_brief_id || row.version !== selector.version ||
        row.publication_fence !== selector.publication_fence || row.handoff_epoch !== selector.handoff_epoch ||
        selector.stage !== "generation" || row.lease_owner !== owner ||
        row.dispatch_grant !== null || !row.prepared || !row.admission_context) return denied;
    intent = structuredClone(row);
    const original = structuredClone(row);
    const prepared = original.prepared!;
    const work: FirstPreviewGenerationWork = {
      jobId: prepared.job_id, conceptBriefId: row.concept_brief_id,
      publicReference: row.admission_context.access_binding.public_reference,
      attemptNumber: 1, parentJobId: null, structured: structuredClone(prepared.generation_input),
    };
    const subject = createPaidAdmissionSubject(work);
    if (!subject || subject.identity !== prepared.identity_key) return denied;
    const grant = await fresh.prepare(structuredClone(intent));
    if (!grant || !isDispatchGrant(grant, intent) || await spending.reserve(subject) !== true) return denied;
    const frozenGrant = structuredClone(grant);
    let providerId: string | null = null;
    let usageKnown = false;
    let paidCommitted = false;
    let terminalRecorded = false;
    let storedOutput: FirstPreviewOutputRecord | null = null;
    const accounting: { settlement: { actualCostMicros: number; operationCompleted: boolean } | null } = { settlement: null };
    const repository = dependencies.repository;
    const reject = () => ({ ok: false, code: "repository_unavailable" } as const);
    const transition = async (action: "arm" | "mark_dispatched" | "complete", outputId?: string) => {
      const current = intent!;
      const result = await authority.transition({
        p_concept_brief_id: work.conceptBriefId, p_owner: owner,
        p_fence: original.fence, p_expected_state: current.state, p_action: action,
        p_policy: policy,
        p_payload: action === "complete" ? { output_id: outputId } : { grant: frozenGrant },
      });
      const expected = action === "arm" ? "dispatch_armed" : action === "mark_dispatched" ? "dispatched" : "completed";
      if (result.ok !== true || !isInitiationIntent(result.value) || result.value.state !== expected ||
          result.value.concept_brief_id !== original.concept_brief_id || result.value.fence !== original.fence ||
          result.value.handoff_epoch !== original.handoff_epoch || result.value.handoff_stage !== "generation" ||
          result.value.publication_fence !== original.publication_fence ||
          result.value.lease_owner !== (action === "complete" ? null : owner) ||
          !isDeepStrictEqual(result.value.prepared, original.prepared) ||
          !isDeepStrictEqual(result.value.admission_context, original.admission_context) ||
          !isDeepStrictEqual(result.value.dispatch_grant, frozenGrant)) return false;
      intent = structuredClone(result.value);
      return true;
    };
    const record = async (operation: Pick<ProviderLifecycleInput, "p_action" | "p_payload">) => {
      const result = await authority.recordProviderLifecycle({
        p_concept_brief_id: work.conceptBriefId, p_job_id: work.jobId,
        p_owner: owner, p_fence: original.fence, p_expected_state: intent!.state,
        ...operation,
      } as ProviderLifecycleInput);
      return result.ok === true && result.value?.recorded === true &&
        result.value.replayed === false && Object.keys(result.value).length === 2;
    };
    const readJob = async (status?: FirstPreviewJobRecord["status"]) => {
      const job = await repository.findJobById(work.jobId);
      return job && job.id === work.jobId && job.conceptBriefId === work.conceptBriefId &&
        job.generationPurpose === "first_preview" && job.attemptNumber === 1 &&
        job.parentJobId === null && job.sourceOutputId === null && job.lineageIdentity === "first-preview:v1" &&
        job.idempotencyKey === prepared.identity_key && job.providerName === "openai" &&
        job.providerRequestId === providerId && job.designSpecVersion === prepared.design_spec_version &&
        job.designSpecSha256 === prepared.design_spec_sha256 &&
        job.handSketchInstructionVersion === prepared.hand_sketch_instruction_version &&
        job.handSketchInstructionSha256 === prepared.hand_sketch_instruction_sha256 &&
        job.estimatedCostMicros === prepared.estimated_cost_micros && job.costCurrency === prepared.cost_currency &&
        job.pricingAssumptionVersion === prepared.pricing_assumption_version && (!status || job.status === status)
        ? { ok: true as const, value: job } : reject();
    };
    const overrides: Partial<FirstPreviewRepository> = {
      async reserveJob() { return reject(); },
      async startJob(id) {
        if (id !== work.jobId || !(await readJob("queued")).ok || !await transition("arm")) return reject();
        return readJob("processing");
      },
      async recordProviderDispatch(id) {
        // The protected accounting marker follows the combined Redis commit,
        // inside dispatch below, and must acknowledge before the Provider call.
        return id === work.jobId && intent!.state === "dispatch_armed" ? readJob("processing") : reject();
      },
      async recordProviderRequest(id, input) {
        if (id !== work.jobId || !await record({ p_action: "register_provider",
          p_payload: { provider_request_id: input.providerRequestId } })) return reject();
        providerId = input.providerRequestId;
        return readJob("processing");
      },
      async persistOutput(input) {
        if (input.jobId !== work.jobId || input.conceptBriefId !== work.conceptBriefId) return reject();
        const result = await repository.persistOutput(input);
        if (result.ok !== true || result.value.id !== input.outputId || result.value.jobId !== work.jobId ||
            result.value.conceptBriefId !== work.conceptBriefId || result.value.contentSha256 !== input.contentSha256) return reject();
        storedOutput = result.value;
        return result;
      },
      async recordJobSucceeded(id, input) {
        if (id !== work.jobId || !storedOutput || !providerId || !usageKnown ||
            !await record({ p_action: "provider_result", p_payload: {
              provider_request_id: providerId, output_id: storedOutput.id,
              content_sha256: storedOutput.contentSha256, actual_cost_micros: input.actualCostMicros,
            } })) return reject();
        terminalRecorded = true;
        return readJob("succeeded");
      },
      async recordJobFailure(id, input) {
        if (id !== work.jobId || terminalRecorded) return reject();
        if (!await record({ p_action: "provider_failure", p_payload: {
          phase: intent!.state === "claimed" ? "pre_dispatch" : "paid_outcome_unknown",
          provider_request_id: providerId, category: input.category, actual_cost_micros: null,
        } })) return reject();
        terminalRecorded = true;
        return readJob();
      },
      async markOutputReady(input) {
        if (!terminalRecorded || !storedOutput || input.outputId !== storedOutput.id ||
            input.jobId !== work.jobId || input.conceptBriefId !== work.conceptBriefId) return reject();
        const result = await repository.markOutputReady(input);
        if (result.ok !== true || result.value.id !== storedOutput.id || result.value.jobId !== work.jobId ||
            result.value.conceptBriefId !== work.conceptBriefId || result.value.readinessStatus !== "first_preview_ready" ||
            result.value.isCurrentCustomerPreview !== true || result.value.revokedAt !== null ||
            !await transition("complete", result.value.id)) return reject();
        return result;
      },
    };
    const protectedRepository = new Proxy(repository, {
      get(target, key) {
        const override = overrides[key as keyof FirstPreviewRepository];
        if (override) return override;
        const value = Reflect.get(target, key);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    const result = await runAutomaticFirstPreviewWorker(work, {
      ...dependencies, repository: protectedRepository,
      createProvider() {
        const binding = dependencies.createProvider();
        if (!binding) return null;
        let identityConflict = false;
        return { ...binding, adapter: {
          async generateFirstPreviewImage(request, context) {
            const response = await binding.adapter.generateFirstPreviewImage(request, context);
            const registered = binding.readProviderRequestId();
            if (response.ok && registered && registered !== response.providerRequestId) {
              identityConflict = true;
              throw new Error("provider_identity_conflict");
            }
            return response;
          },
        }, readProviderRequestId: () => identityConflict ? null : binding.readProviderRequestId(),
        readValidatedUsage() {
          const usage = binding.readValidatedUsage();
          usageKnown = usage !== null;
          return usage;
        } };
      },
      paidAdmission: {
        reserve: async candidate => isDeepStrictEqual(candidate, subject),
        async dispatch(candidate, jobId) {
          if (!isDeepStrictEqual(candidate, subject) || jobId !== work.jobId || paidCommitted) return false;
          let calls = 0;
          let o1 = false;
          let open = true;
          let admitted: boolean;
          try {
            admitted = await fresh.dispatch(structuredClone(intent!), structuredClone(frozenGrant), async () => {
              if (!open || ++calls !== 1) return false;
              o1 = await spending.dispatchCombined!(subject, work.jobId, {
                intent: structuredClone(intent!), owner, grant: structuredClone(frozenGrant),
              }) === true;
              return o1;
            });
          } finally { open = false; }
          // Even a trusted fresh-admission callback cannot omit independent O1.
          if (admitted !== true || calls !== 1 || !o1) return false;
          paidCommitted = true;
          return await transition("mark_dispatched") && await record({ p_action: "record_dispatch", p_payload: {} });
        },
        async settle(candidate, jobId, input) {
          if (!isDeepStrictEqual(candidate, subject) || jobId !== work.jobId) return false;
          accounting.settlement = input;
          // Preserve spending/concurrency protection until durable completion.
          return spending.settle(subject, jobId, { ...input, operationCompleted: false });
        },
      },
    });
    if (result.status === "ready" && accounting.settlement && intent?.state === "completed") {
      if (await spending.settle(subject, work.jobId, accounting.settlement) !== true) return denied;
      return result;
    }
    // No recovery, accounting release or retry. Hold even when an RPC outcome
    // or a post-Provider acknowledgement is unknown; never use legacy writes.
    if (!terminalRecorded) await authority.transition({
      p_concept_brief_id: work.conceptBriefId, p_owner: owner,
      p_fence: original.fence, p_expected_state: intent!.state, p_action: "hold",
      p_policy: policy, p_payload: {},
    });
    return result.status === "ready" ? denied : result;
  } catch {
    // Exceptions cannot trigger legacy execution or automatic paid recovery.
    if (intent) {
      try { await authority.transition({
        p_concept_brief_id: intent.concept_brief_id, p_owner: owner,
        p_fence: intent.fence, p_expected_state: intent.state, p_action: "hold",
        p_policy: policy, p_payload: {},
      }); } catch { /* Retain the fenced durable state for operator handling. */ }
    }
    return denied;
  }
}

const DEFAULT_TRUSTED_OUTPUT_EVIDENCE_TIMEOUT_MS = 10_000;
const MAX_TRUSTED_OUTPUT_EVIDENCE_TIMEOUT_MS = 30_000;

type TrustedOutputEvidenceFailureReason =
  | "unavailable"
  | "missing"
  | "malformed"
  | "mismatched"
  | "content_safety_failed"
  | "privacy_failed"
  | "output_validity_failed"
  | "exception"
  | "timeout"
  | "aborted";

type TrustedOutputEvidenceResult =
  | Readonly<{ ok: true; evidence: FirstPreviewTrustedOutputEvidence }>
  | Readonly<{ ok: false; reason: TrustedOutputEvidenceFailureReason }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  return (
    actual.length === expected.length &&
    expected.every((key, index) => actual[index] === key)
  );
}

function validateTrustedOutputEvidence(
  value: unknown,
  expectedSubject: FirstPreviewTrustedOutputSubject,
): TrustedOutputEvidenceResult {
  if (value === null || value === undefined) {
    return { ok: false, reason: "missing" };
  }
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["evidenceVersion", "results", "subject"]) ||
    value.evidenceVersion !== FIRST_PREVIEW_TRUSTED_OUTPUT_EVIDENCE_VERSION ||
    !isRecord(value.subject) ||
    !hasExactKeys(value.subject, [
      "conceptBriefId",
      "contentSha256",
      "jobId",
      "outputId",
    ]) ||
    !isRecord(value.results) ||
    !hasExactKeys(value.results, [
      "contentSafetyPassed",
      "outputValidityPassed",
      "privacyPassed",
    ]) ||
    typeof value.results.contentSafetyPassed !== "boolean" ||
    typeof value.results.privacyPassed !== "boolean" ||
    typeof value.results.outputValidityPassed !== "boolean"
  ) {
    return { ok: false, reason: "malformed" };
  }

  if (
    value.subject.conceptBriefId !== expectedSubject.conceptBriefId ||
    value.subject.jobId !== expectedSubject.jobId ||
    value.subject.outputId !== expectedSubject.outputId ||
    value.subject.contentSha256 !== expectedSubject.contentSha256
  ) {
    return { ok: false, reason: "mismatched" };
  }
  if (value.results.contentSafetyPassed !== true) {
    return { ok: false, reason: "content_safety_failed" };
  }
  if (value.results.privacyPassed !== true) {
    return { ok: false, reason: "privacy_failed" };
  }
  if (value.results.outputValidityPassed !== true) {
    return { ok: false, reason: "output_validity_failed" };
  }

  return {
    ok: true,
    evidence: value as FirstPreviewTrustedOutputEvidence,
  };
}

async function readTrustedOutputEvidence(
  dependencies: AutomaticFirstPreviewWorkerDependencies,
  subject: FirstPreviewTrustedOutputSubject,
  imageBytes: Uint8Array,
  attemptSignal: AbortSignal,
): Promise<TrustedOutputEvidenceResult> {
  if (!dependencies.evaluateTrustedOutput) {
    return { ok: false, reason: "unavailable" };
  }

  if (attemptSignal.aborted) {
    return { ok: false, reason: "aborted" };
  }

  const configuredTimeout = dependencies.trustedOutputEvidenceTimeoutMs;
  const timeoutMs =
    Number.isSafeInteger(configuredTimeout) &&
    configuredTimeout! > 0 &&
    configuredTimeout! <= MAX_TRUSTED_OUTPUT_EVIDENCE_TIMEOUT_MS
      ? configuredTimeout!
      : DEFAULT_TRUSTED_OUTPUT_EVIDENCE_TIMEOUT_MS;
  const evaluatorController = new AbortController();
  let interruptionReason: "timeout" | "aborted" | null = null;
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  let resolveInterruption:
    | ((value: Readonly<{ kind: "timeout" | "aborted" }>) => void)
    | null = null;
  const interruption = new Promise<Readonly<{ kind: "timeout" | "aborted" }>>(
    (resolve) => {
      resolveInterruption = resolve;
    },
  );
  const interrupt = (reason: "timeout" | "aborted") => {
    if (interruptionReason) return;
    interruptionReason = reason;
    resolveInterruption?.({ kind: reason });
    evaluatorController.abort();
  };
  const abortFromAttempt = () => interrupt("aborted");

  attemptSignal.addEventListener("abort", abortFromAttempt, { once: true });
  if (attemptSignal.aborted) abortFromAttempt();
  if (!interruptionReason) {
    timeoutHandle = setTimeout(() => interrupt("timeout"), timeoutMs);
  }

  try {
    const result = await Promise.race([
      Promise.resolve()
        .then(() =>
          dependencies.evaluateTrustedOutput!(
            {
              subject,
              imageBytes,
              mimeType: "image/png",
              widthPx: 1024,
              heightPx: 1024,
            },
            { signal: evaluatorController.signal },
          ),
        )
        .then(
          (value) => ({ kind: "value" as const, value }),
          () => ({ kind: "exception" as const }),
        ),
      interruption,
    ]);

    switch (result.kind) {
      case "timeout":
        return { ok: false, reason: "timeout" };
      case "aborted":
        return { ok: false, reason: "aborted" };
      case "exception":
        return { ok: false, reason: "exception" };
      case "value":
        return validateTrustedOutputEvidence(result.value, subject);
    }
  } catch {
    return { ok: false, reason: interruptionReason ?? "exception" };
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    attemptSignal.removeEventListener("abort", abortFromAttempt);
  }
}

function mapTrustedOutputEvidenceFailure(
  reason: TrustedOutputEvidenceFailureReason,
): FirstPreviewFailureCategory {
  if (reason === "privacy_failed") return "privacy_failure";
  if (reason === "aborted") return "cancelled";
  if (
    reason === "content_safety_failed" ||
    reason === "output_validity_failed"
  ) {
    return "unsafe_output";
  }
  return "lifecycle_conflict";
}

function lineageMatches(
  parent: FirstPreviewJobRecord,
  work: FirstPreviewGenerationWork,
): boolean {
  return (
    parent.conceptBriefId === work.conceptBriefId &&
    parent.attemptNumber === 1 &&
    parent.status === "failed" &&
    parent.retryEligible === true &&
    parent.designSpecVersion === work.structured.designSpec.spec_version &&
    parent.designSpecSha256 === work.structured.designSpecSha256 &&
    parent.handSketchInstructionVersion ===
      work.structured.handSketchInstruction.instruction_version &&
    parent.handSketchInstructionSha256 ===
      work.structured.handSketchInstructionSha256
  );
}

async function readAttemptBudget(
  repository: FirstPreviewRepository,
  work: FirstPreviewGenerationWork,
): Promise<boolean> {
  if (work.attemptNumber === 1) {
    return evaluateFirstPreviewAttemptBudget({
      attemptNumber: 1,
      parentActualCostMicros: null,
    }).allowed;
  }

  if (!work.parentJobId) return false;
  const parent = await repository.findJobById(work.parentJobId);
  if (!parent || !lineageMatches(parent, work)) return false;

  return evaluateFirstPreviewAttemptBudget({
    attemptNumber: 2,
    parentActualCostMicros: parent.actualCostMicros,
  }).allowed;
}

function isAttemptNumber(
  value: unknown,
): value is AutomaticFirstPreviewAttemptNumber {
  return value === 1 || value === 2;
}

export async function reserveAutomaticFirstPreviewAttempt(input: {
  payload: unknown;
  persistenceConfirmed: unknown;
  customerAccessEligible: unknown;
  conceptBriefId: string;
  publicReference: string;
  attemptNumber: unknown;
  parentJobId: string | null;
  repository: FirstPreviewRepository;
  jobIdSource?: () => string;
}): Promise<ReserveAutomaticFirstPreviewResult> {
  if (
    input.persistenceConfirmed !== true ||
    input.customerAccessEligible !== true ||
    !isAttemptNumber(input.attemptNumber) ||
    (input.attemptNumber === 1
      ? input.parentJobId !== null
      : input.parentJobId === null)
  ) {
    return { ok: false, category: "precondition_failed" };
  }

  const structured = buildFirstPreviewStructuredGenerationInput({
    payload: input.payload,
    publicReference: input.publicReference,
  });
  if (!structured.ok) {
    return { ok: false, category: "invalid_structured_input" };
  }

  return reserveAutomaticFirstPreviewPreparedAttempt({
    persistenceConfirmed: true,
    customerAccessEligible: true,
    conceptBriefId: input.conceptBriefId,
    publicReference: input.publicReference,
    attemptNumber: input.attemptNumber,
    parentJobId: input.parentJobId,
    structured: prepareFirstPreviewGenerationInput(structured.value),
    repository: input.repository,
    jobIdSource: input.jobIdSource,
  });
}

export async function reserveAutomaticFirstPreviewPreparedAttempt(input: {
  persistenceConfirmed: unknown;
  customerAccessEligible: unknown;
  conceptBriefId: string;
  publicReference: string;
  attemptNumber: unknown;
  parentJobId: string | null;
  structured: FirstPreviewPreparedGenerationInput;
  repository: FirstPreviewRepository;
  jobIdSource?: () => string;
}): Promise<ReserveAutomaticFirstPreviewResult> {
  if (
    input.persistenceConfirmed !== true ||
    input.customerAccessEligible !== true ||
    !isAttemptNumber(input.attemptNumber) ||
    (input.attemptNumber === 1
      ? input.parentJobId !== null
      : input.parentJobId === null)
  ) {
    return { ok: false, category: "precondition_failed" };
  }

  const work: FirstPreviewGenerationWork = {
    jobId: (input.jobIdSource ?? randomUUID)(),
    conceptBriefId: input.conceptBriefId,
    publicReference: input.publicReference,
    attemptNumber: input.attemptNumber,
    parentJobId: input.parentJobId,
    structured: input.structured,
  };

  if (!(await readAttemptBudget(input.repository, work))) {
    return { ok: false, category: "budget_blocked" };
  }

  const reservation = await input.repository.reserveJob({
    jobId: work.jobId,
    conceptBriefId: work.conceptBriefId,
    attemptNumber: work.attemptNumber,
    parentJobId: work.parentJobId,
    sourceOutputId: null,
    designSpecVersion: work.structured.designSpec.spec_version,
    designSpecSha256: work.structured.designSpecSha256,
    handSketchInstructionVersion:
      work.structured.handSketchInstruction.instruction_version,
    handSketchInstructionSha256:
      work.structured.handSketchInstructionSha256,
    estimatedCostMicros: FIRST_PREVIEW_COST_CONTRACT.estimatedCostMicros,
    costCurrency: FIRST_PREVIEW_COST_CONTRACT.currency,
    pricingAssumptionVersion: FIRST_PREVIEW_PRICING_ASSUMPTION_VERSION,
  });
  if (!reservation.ok) {
    return { ok: false, category: "lifecycle_conflict" };
  }

  if (reservation.value.job.status !== "queued") {
    return { ok: false, category: "lifecycle_conflict" };
  }

  return {
    ok: true,
    disposition: reservation.value.disposition,
    work: { ...work, jobId: reservation.value.job.id },
  };
}

async function recordFailure(
  repository: FirstPreviewRepository,
  jobId: string,
  category: FirstPreviewFailureCategory,
  retryEligible: boolean,
  actualCostMicros: number,
): Promise<AutomaticFirstPreviewWorkerResult> {
  await repository.recordJobFailure(jobId, {
    category,
    retryEligible,
    actualCostMicros,
  });
  return { status: "failed", failureCategory: category };
}

function mapGeneratedAssetFailure(
  code: string,
): FirstPreviewFailureCategory {
  if (code === "privacy_failure") return "privacy_failure";
  if (code === "access_denied") return "access_failure";
  return "storage_failure";
}

function mapRuntimeFailure(
  adapterResult: OpenAiFirstPreviewAdapterResult | null,
  runtimeCategory: string | null,
  trustedEvidenceFailureCategory: FirstPreviewFailureCategory | null,
): Readonly<{
  category: FirstPreviewFailureCategory;
  retryEligible: boolean;
}> {
  if (runtimeCategory === "timeout") {
    return { category: "timeout", retryEligible: false };
  }
  if (runtimeCategory === "aborted") {
    return { category: "cancelled", retryEligible: false };
  }
  if (trustedEvidenceFailureCategory) {
    return {
      category: trustedEvidenceFailureCategory,
      retryEligible: false,
    };
  }
  if (adapterResult && adapterResult.ok === false) {
    return {
      category: adapterResult.category,
      retryEligible: adapterResult.retryEligible,
    };
  }
  if (runtimeCategory === "invalid_structured_input") {
    return { category: "invalid_structured_input", retryEligible: false };
  }
  if (runtimeCategory === "precondition_failed") {
    return { category: "precondition_failed", retryEligible: false };
  }
  if (runtimeCategory === "unsafe_output") {
    return { category: "unsafe_output", retryEligible: false };
  }
  return { category: "unexpected_provider_error", retryEligible: false };
}

function safeReadUsage(binding: OpenAiFirstPreviewProviderBinding) {
  try {
    return binding.readValidatedUsage();
  } catch {
    return null;
  }
}

function safeReadProviderRequestId(
  binding: OpenAiFirstPreviewProviderBinding,
  adapterResult: OpenAiFirstPreviewAdapterResult | null,
): string | null {
  if (adapterResult?.ok && adapterResult.providerRequestId) {
    return adapterResult.providerRequestId;
  }
  try {
    return binding.readProviderRequestId();
  } catch {
    return null;
  }
}

async function runAutomaticFirstPreviewWorkerUnsafe(
  work: FirstPreviewGenerationWork,
  dependencies: AutomaticFirstPreviewWorkerDependencies,
): Promise<AutomaticFirstPreviewWorkerResult> {
  const started = await dependencies.repository.startJob(work.jobId);
  if (!started.ok) return { status: "duplicate" };

  if (!(await readAttemptBudget(dependencies.repository, work))) {
    return recordFailure(
      dependencies.repository,
      work.jobId,
      "budget_blocked",
      false,
      0,
    );
  }

  const paidAdmission = dependencies.paidAdmission ?? createFirstPreviewPaidAdmission();
  const admissionSubject = createPaidAdmissionSubject(work);
  if (!admissionSubject || admissionSubject.identity !== started.value.idempotencyKey ||
      await paidAdmission.reserve(admissionSubject) !== true) {
    return recordFailure(dependencies.repository, work.jobId, "budget_blocked", false, 0);
  }

  let binding: OpenAiFirstPreviewProviderBinding | null;
  try {
    binding = dependencies.createProvider();
  } catch {
    return recordFailure(
      dependencies.repository,
      work.jobId,
      "unexpected_provider_error",
      false,
      0,
    );
  }
  if (!binding) {
    return recordFailure(
      dependencies.repository,
      work.jobId,
      "configuration_missing",
      false,
      0,
    );
  }

  const dispatched = await dependencies.repository.recordProviderDispatch(
    work.jobId,
  );
  if (!dispatched.ok) return { status: "duplicate" };

  const outputId = (dependencies.outputIdSource ?? randomUUID)();
  let adapterResult: OpenAiFirstPreviewAdapterResult | null = null;
  let trustedEvidence: FirstPreviewTrustedOutputEvidence | null = null;
  let trustedEvidenceFailureCategory: FirstPreviewFailureCategory | null = null;
  let paidDispatched = false;
  let admissionDenied = false;
  const provider: FirstPreviewProvider = {
    async generateFirstPreview(request, context) {
      // Enqueue admission is not dispatch authorization. Claim the same shared
      // reservation again, once, immediately before the actual paid operation.
      if (context.signal.aborted ||
          await paidAdmission.dispatch(admissionSubject, work.jobId) !== true) {
        admissionDenied = true;
        return { outcome: "provider_failure" };
      }
      paidDispatched = true;
      adapterResult = await binding!.adapter.generateFirstPreviewImage(
        request,
        context,
      );
      if (adapterResult.ok === false) {
        if (adapterResult.category === "moderation_blocked") {
          return { outcome: "rejected_unsafe" };
        }
        if (adapterResult.category === "timeout") {
          return { outcome: "timeout" };
        }
        if (adapterResult.category === "cancelled") {
          return { outcome: "aborted" };
        }
        if (
          adapterResult.category === "invalid_provider_response" ||
          adapterResult.category === "invalid_base64" ||
          adapterResult.category === "invalid_image_format" ||
          adapterResult.category === "invalid_image_dimensions" ||
          adapterResult.category === "image_too_large"
        ) {
          return { outcome: "invalid_output" };
        }
        return { outcome: "provider_failure" };
      }

      const imageBytes = Buffer.from(adapterResult.imageBase64, "base64");
      const subject: FirstPreviewTrustedOutputSubject = {
        conceptBriefId: work.conceptBriefId,
        jobId: work.jobId,
        outputId,
        contentSha256: createHash("sha256").update(imageBytes).digest("hex"),
      };
      const evidenceResult = await readTrustedOutputEvidence(
        dependencies,
        subject,
        imageBytes,
        context.signal,
      );
      if (evidenceResult.ok === false) {
        trustedEvidenceFailureCategory = mapTrustedOutputEvidenceFailure(
          evidenceResult.reason,
        );
        return evidenceResult.reason === "content_safety_failed"
          ? { outcome: "rejected_unsafe" }
          : { outcome: "invalid_output" };
      }
      trustedEvidence = evidenceResult.evidence;

      const identity = createHash("sha256")
        .update(adapterResult.imageBase64, "utf8")
        .digest("base64url")
        .slice(0, 32);
      return {
        outcome: "completed",
        images: [
          {
            assetId: `preview_asset_${identity}`,
            contentSafetyPassed:
              evidenceResult.evidence.results.contentSafetyPassed,
            privacyPassed: evidenceResult.evidence.results.privacyPassed,
            outputValidityPassed:
              evidenceResult.evidence.results.outputValidityPassed,
          },
        ],
      };
    },
  };

  const runtime = await orchestrateFirstPreviewGeneration(
    {
      persistenceConfirmed: true,
      conceptBriefId: work.conceptBriefId,
      publicReference: work.publicReference,
      designSpec: work.structured.designSpec,
      handSketchInstruction: work.structured.handSketchInstruction,
      accessControlEligible: true,
      falseSuccessDetected: false,
    },
    {
      provider,
      timeoutMs:
        Number.isSafeInteger(dependencies.attemptTimeoutMs) &&
        dependencies.attemptTimeoutMs! > 0 &&
        dependencies.attemptTimeoutMs! <= OPENAI_FIRST_PREVIEW_TIMEOUT_MS
          ? dependencies.attemptTimeoutMs!
          : OPENAI_FIRST_PREVIEW_TIMEOUT_MS,
    },
  );

  const cost = reconcileFirstPreviewActualCost({
    dispatched: paidDispatched,
    usage: safeReadUsage(binding),
  });
  if (admissionDenied) {
    return recordFailure(dependencies.repository, work.jobId, "budget_blocked", false, 0);
  }
  if (paidDispatched && await paidAdmission.settle(admissionSubject, work.jobId, {
    actualCostMicros: cost.actualCostMicros,
    // Failures, interruptions and uncertain completion never free a slot.
    // Unknown usage on a completed response still retains the full reservation.
    operationCompleted: runtime.generation.status === "completed",
  }) !== true) {
    return recordFailure(dependencies.repository, work.jobId,
      "budget_blocked", false, cost.actualCostMicros);
  }
  const providerRequestId = safeReadProviderRequestId(binding, adapterResult);
  if (providerRequestId) {
    const recorded = await dependencies.repository.recordProviderRequest(
      work.jobId,
      { providerRequestId },
    );
    if (!recorded.ok) {
      return recordFailure(
        dependencies.repository,
        work.jobId,
        "lifecycle_conflict",
        false,
        cost.actualCostMicros,
      );
    }
  }

  if (firstPreviewActualCostExceedsReservation(cost.actualCostMicros)) {
    return recordFailure(
      dependencies.repository,
      work.jobId,
      "budget_blocked",
      false,
      cost.actualCostMicros,
    );
  }

  if (!adapterResult?.ok || runtime.generation.status !== "completed") {
    const failure = mapRuntimeFailure(
      adapterResult,
      runtime.generation.failureCategory,
      trustedEvidenceFailureCategory,
    );
    return recordFailure(
      dependencies.repository,
      work.jobId,
      failure.category,
      work.attemptNumber === 1 && failure.retryEligible,
      cost.actualCostMicros,
    );
  }

  if (!providerRequestId) {
    return recordFailure(
      dependencies.repository,
      work.jobId,
      "lifecycle_conflict",
      false,
      cost.actualCostMicros,
    );
  }

  if (!trustedEvidence) {
    return recordFailure(
      dependencies.repository,
      work.jobId,
      "lifecycle_conflict",
      false,
      cost.actualCostMicros,
    );
  }

  let assetStore: FirstPreviewGeneratedAssetStore;
  try {
    assetStore = dependencies.createAssetStore();
  } catch {
    return recordFailure(
      dependencies.repository,
      work.jobId,
      "storage_failure",
      false,
      cost.actualCostMicros,
    );
  }
  let stored: PersistFirstPreviewGeneratedAssetResult;
  try {
    stored = await assetStore.persistValidatedPng({
      conceptBriefId: work.conceptBriefId,
      jobId: work.jobId,
      outputId,
      mimeType: "image/png",
      imageBytes: Buffer.from(adapterResult.imageBase64, "base64"),
    });
  } catch {
    return recordFailure(
      dependencies.repository,
      work.jobId,
      "storage_failure",
      false,
      cost.actualCostMicros,
    );
  }
  if (stored.ok === false) {
    return recordFailure(
      dependencies.repository,
      work.jobId,
      mapGeneratedAssetFailure(stored.code),
      false,
      cost.actualCostMicros,
    );
  }
  if (
    stored.value.asset.contentSha256 !==
    trustedEvidence.subject.contentSha256
  ) {
    return recordFailure(
      dependencies.repository,
      work.jobId,
      "lifecycle_conflict",
      false,
      cost.actualCostMicros,
    );
  }

  const output = await dependencies.repository.persistOutput({
    outputId,
    jobId: work.jobId,
    conceptBriefId: work.conceptBriefId,
    assetId: stored.value.asset.assetId,
    assetPersisted: true,
    bucketName: FIRST_PREVIEW_ASSET_BUCKET,
    mimeType: stored.value.asset.mimeType,
    byteSize: stored.value.asset.byteSize,
    widthPx: stored.value.asset.widthPx,
    heightPx: stored.value.asset.heightPx,
    contentSha256: stored.value.asset.contentSha256,
    assetCreatedAt: stored.value.asset.assetCreatedAt,
    assetValidatedAt: stored.value.asset.assetValidatedAt,
  });
  if (!output.ok) {
    return recordFailure(
      dependencies.repository,
      work.jobId,
      "lifecycle_conflict",
      false,
      cost.actualCostMicros,
    );
  }

  const succeeded = await dependencies.repository.recordJobSucceeded(
    work.jobId,
    { actualCostMicros: cost.actualCostMicros },
  );
  if (!succeeded.ok) {
    return recordFailure(
      dependencies.repository,
      work.jobId,
      "lifecycle_conflict",
      false,
      cost.actualCostMicros,
    );
  }

  if (!runtime.gates.ready) {
    return { status: "failed", failureCategory: "lifecycle_conflict" };
  }

  const ready = await dependencies.repository.markOutputReady({
    outputId,
    jobId: work.jobId,
    conceptBriefId: work.conceptBriefId,
    gates: {
      outputValid: trustedEvidence.results.outputValidityPassed,
      assetExists: stored.value.asset.assetPersisted === true,
      ownershipConsistent:
        output.value.id === trustedEvidence.subject.outputId &&
        output.value.jobId === trustedEvidence.subject.jobId &&
        output.value.conceptBriefId === trustedEvidence.subject.conceptBriefId &&
        output.value.contentSha256 === trustedEvidence.subject.contentSha256,
      privacyPassed: trustedEvidence.results.privacyPassed,
      customerAccessEligible: true,
      lifecycleEligible:
        runtime.gates.ready &&
        trustedEvidence.results.contentSafetyPassed === true,
    },
    automaticGatePolicyVersion: FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION,
  });

  return ready.ok
    ? { status: "ready" }
    : { status: "failed", failureCategory: "lifecycle_conflict" };
}

export async function runAutomaticFirstPreviewWorker(
  work: FirstPreviewGenerationWork,
  dependencies: AutomaticFirstPreviewWorkerDependencies,
): Promise<AutomaticFirstPreviewWorkerResult> {
  try {
    return await runAutomaticFirstPreviewWorkerUnsafe(work, dependencies);
  } catch {
    try {
      const job = await dependencies.repository.findJobById(work.jobId);
      if (job?.status === "queued" || job?.status === "processing") {
        await dependencies.repository.recordJobFailure(work.jobId, {
          category: "unexpected_provider_error",
          retryEligible: false,
          actualCostMicros: job.actualCostMicros ?? 0,
        });
      }
    } catch {
      // Repository failure still leaves the customer state fail-closed.
    }
    return {
      status: "failed",
      failureCategory: "unexpected_provider_error",
    };
  }
}

export function createProductionAutomaticFirstPreviewWorkerDependencies(
  repository: FirstPreviewRepository = createFirstPreviewRepository(),
): AutomaticFirstPreviewWorkerDependencies {
  return {
    repository,
    createProvider: () => createOpenAiFirstPreviewProviderBinding(),
    createAssetStore: () =>
      createFirstPreviewGeneratedAssetStore({
        authorizer: createFirstPreviewCustomerAccessAuthorizer(),
      }),
    evaluateTrustedOutput: createOpenAiFirstPreviewTrustedOutputEvaluator(),
  };
}

export const FIRST_PREVIEW_EXECUTABLE_PROVIDER_CONTRACT = {
  contractVersion: FIRST_PREVIEW_PROVIDER_CONTRACT_VERSION,
  pricingAssumptionVersion: FIRST_PREVIEW_PRICING_ASSUMPTION_VERSION,
  provider: "OpenAI",
  processingTier: "standard",
  streaming: false,
  partialImages: 0,
  imageInput: false,
} as const;
