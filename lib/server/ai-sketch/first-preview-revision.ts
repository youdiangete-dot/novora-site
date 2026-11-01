import "server-only";
import { createHash } from "node:crypto";
import { parseRevisionDirectives, readRevisionDirectives, REVISION_DIRECTIVES, type RevisionDirective } from "../../first-preview-revision-directives";
import { FIRST_PREVIEW_COST_CONTRACT, FIRST_PREVIEW_PRICING_ASSUMPTION_VERSION } from "./first-preview-cost-contract";
import { type FirstPreviewPreparedGenerationInput, type FirstPreviewGenerationWork, type AutomaticFirstPreviewWorkerDependencies, runAutomaticFirstPreviewWorker } from "./first-preview-generation-lifecycle";
import type { FirstPreviewRepository } from "./first-preview-persistence-contract";
import { createFirstPreviewQueueMessage } from "./first-preview-queue";
import { hasPassedFirstPreviewAutomaticGateEvidence, validateFirstPreviewVisualPrivacyEvidence } from "./first-preview-visual-privacy-contract";

// Structural seam matching Agent B. No entitlement ledger is implemented here.
export type RevisionDispatchBinding = Readonly<{
  owner: Readonly<{ scope: string; identity: string }>;
  reservationId: string; operationId: string; kind: "revision";
  briefId: string; sourceOutputId: string;
}>;
type Claim = "claimed" | "already_claimed" | "denied" | "unknown";
type Outcome = "delivered" | "definite_failure" | "unknown";
type UseResult = Readonly<{ ok: boolean; duplicate?: boolean; state?: string; reason?: string }>;
export type RevisionSource = Readonly<{
  owner: RevisionDispatchBinding["owner"]; purchaseId: string; subjectId: string;
  conceptBriefId: string; publicReference: string; sourceOutputId: string;
  // Constructed from the persisted original Brief through the existing safe
  // structured-input builder, never accepted directly from a customer body.
  originalInput: FirstPreviewPreparedGenerationInput;
  requestedDirectives?: readonly RevisionDirective[];
  sourceRevisionDirectives?: readonly RevisionDirective[];
}>;
export type RevisionServiceDependencies = Readonly<{
  repository: FirstPreviewRepository;
  // Must verify the current invitation/session and exact owned Brief/source, or
  // the existing protected admin acting for that owner. Never echo body IDs.
  resolveSource(request: unknown): Promise<RevisionSource | null>;
  resolveDispatch(operationId: string): Promise<RevisionDispatchBinding | null>;
  // Read the exact immutable binding's durable released outcome. A failed job
  // alone (including an UNKNOWN dispatch) never authorizes a new operation.
  isDefiniteFailure?(binding: RevisionDispatchBinding): Promise<boolean>;
  entitlements: Readonly<{
    reserve(input: RevisionDispatchBinding & { purchaseId: string; subjectId: string }): Promise<UseResult>;
    claimDispatch(input: RevisionDispatchBinding): Promise<Claim>;
    settleDispatch(input: RevisionDispatchBinding & { outcome: Outcome; failurePhase?: "before_dispatch"; providerCostUsdMicros: number }): Promise<UseResult>;
  }>;
  // Required funded-project controls. A prepaid user slot is not proof of
  // remaining engineering/API spend. These callbacks must use trusted records.
  reserveCost(work: FirstPreviewGenerationWork, binding: RevisionDispatchBinding): Promise<"reserved" | "denied" | "unknown">;
  verifyCostReservation(work: FirstPreviewGenerationWork, binding: RevisionDispatchBinding): Promise<boolean>;
  claimCostReservation?(work: FirstPreviewGenerationWork, binding: RevisionDispatchBinding): Promise<boolean>;
  publish(work: FirstPreviewGenerationWork): Promise<void>;
  createWorkerDependencies(repository: FirstPreviewRepository): AutomaticFirstPreviewWorkerDependencies;
}>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const validOwner = (owner: RevisionDispatchBinding["owner"]) => owner && /^[a-f0-9]{64}$/.test(owner.scope) && /^[A-Za-z0-9_-]{1,64}$/.test(owner.identity);
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, item]) => [key, canonical(item)]));
  return value;
}
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");

export function buildRevisedPreparedInput(original: FirstPreviewPreparedGenerationInput, previous: readonly RevisionDirective[], requested: readonly RevisionDirective[], publicReference: string, conceptBriefId: string): FirstPreviewPreparedGenerationInput | null {
  if (!createFirstPreviewQueueMessage({ conceptBriefId, publicReference, generationInput: original }).ok || !readRevisionDirectives(requested) || (previous.length > 0 && !readRevisionDirectives(previous))) return null;
  const groups = [["lower_setting", "raise_setting"], ["narrower_band", "wider_band"], ["vertical_center_stone", "horizontal_center_stone"]];
  let codes = [...previous];
  for (const code of requested) {
    const group = groups.find(pair => pair.includes(code));
    codes = codes.filter(old => old !== code && (!group || !group.includes(old)));
    codes.push(code);
  }
  if (!readRevisionDirectives(codes) || (previous.length > 0 && JSON.stringify([...previous].sort()) === JSON.stringify([...codes].sort()))) return null;
  if (codes.some(code => code === "narrower_band" || code === "wider_band") && original.designSpec.piece_type !== "ring") return null;
  const value = JSON.parse(JSON.stringify(original)) as FirstPreviewPreparedGenerationInput;
  const instructions = codes.map(code => REVISION_DIRECTIVES[code]);
  value.designSpec.jewelry_structure.construction_consistency_notes.push(...instructions);
  value.handSketchInstruction.jewelry_rendering_instructions.construction_consistency.push(...instructions);
  const prepared = { ...value, designSpecSha256: hash(value.designSpec), handSketchInstructionSha256: hash(value.handSketchInstruction) };
  return createFirstPreviewQueueMessage({ conceptBriefId, publicReference, generationInput: prepared }).ok ? prepared : null;
}

export function createSourceBoundRevisionService(deps: RevisionServiceDependencies) {
  const reject = (status: "denied" | "unavailable" | "unknown") => ({ status } as const);
  return Object.freeze({
    async prepare(request: unknown, operationId: string) {
      try {
        if (!UUID.test(operationId)) return reject("denied");
        const source = await deps.resolveSource(request);
        if (!source || !validOwner(source.owner) || !UUID.test(source.subjectId) || !UUID.test(source.purchaseId) ||
          !UUID.test(source.conceptBriefId) || !UUID.test(source.sourceOutputId)) return reject("denied");
        const existing = await deps.repository.findJobById(operationId);
        if (existing) {
          const expected = source.requestedDirectives ? buildRevisedPreparedInput(source.originalInput,
            source.sourceRevisionDirectives ?? [], source.requestedDirectives, source.publicReference, source.conceptBriefId) : null;
          if (source.requestedDirectives && (!expected || existing.designSpecSha256 !== expected.designSpecSha256 ||
            existing.handSketchInstructionSha256 !== expected.handSketchInstructionSha256)) return reject("denied");
          return existing.conceptBriefId === source.conceptBriefId && existing.sourceOutputId === source.sourceOutputId
            ? { status: "existing" as const, operationId: existing.id } : reject("denied");
        }
        const [current, review] = await Promise.all([
          deps.repository.findCustomerReadyOutput(source.conceptBriefId), deps.repository.findReviewByConceptBriefId(source.conceptBriefId),
        ]);
        if (!current || current.id !== source.sourceOutputId || current.readinessStatus !== "first_preview_ready" || !current.isCurrentCustomerPreview ||
          !review || review.outputId !== current.id || review.reviewStatus !== "needs_revision") return reject("denied");
        const requested = source.requestedDirectives ? readRevisionDirectives(source.requestedDirectives) : parseRevisionDirectives(review.revisionInstruction);
        const sourceJob = await deps.repository.findJobById(current.jobId);
        if (!requested || !sourceJob || sourceJob.status !== "succeeded" || (sourceJob.sourceOutputId && !sourceJob.revisionDirectives) ||
          !hasPassedFirstPreviewAutomaticGateEvidence(current.automaticGateEvidence, { conceptBriefId: current.conceptBriefId, jobId: current.jobId, outputId: current.id, contentSha256: current.contentSha256 })) return reject("denied");
        const parent = deps.repository.findLatestJobForBrief
          ? await deps.repository.findLatestJobForBrief(source.conceptBriefId) : sourceJob;
        if (!parent) return reject("unavailable");
        let continuation = false;
        if (parent.id !== sourceJob.id) {
          const prior = await deps.resolveDispatch(parent.id);
          if (!["failed", "cancelled", "timed_out"].includes(parent.status) || parent.sourceOutputId !== current.id ||
            !prior || prior.operationId !== parent.id || prior.reservationId !== parent.id || prior.kind !== "revision" ||
            prior.briefId !== source.conceptBriefId || prior.sourceOutputId !== current.id ||
            prior.owner.scope !== source.owner.scope || prior.owner.identity !== source.owner.identity ||
            await deps.isDefiniteFailure?.(prior) !== true) return reject("denied");
          continuation = true;
        }
        const previous = sourceJob.revisionDirectives ?? [];
        const prepared = buildRevisedPreparedInput(source.originalInput, previous, requested, source.publicReference, source.conceptBriefId);
        if (!prepared) return reject("denied");
        const merged = Object.keys(REVISION_DIRECTIVES).filter(code => prepared.designSpec.jewelry_structure.construction_consistency_notes.includes(REVISION_DIRECTIVES[code as RevisionDirective])) as RevisionDirective[];
        const reserved = await deps.repository.reserveJob({ jobId: operationId, conceptBriefId: source.conceptBriefId,
          parentJobId: parent.id, sourceOutputId: current.id, attemptNumber: parent.attemptNumber + 1,
          revisionDirectives: merged, ...(continuation ? { revisionParentOutcome: "definite_failure" as const } : {}), designSpecVersion: prepared.designSpec.spec_version, designSpecSha256: prepared.designSpecSha256,
          handSketchInstructionVersion: prepared.handSketchInstruction.instruction_version, handSketchInstructionSha256: prepared.handSketchInstructionSha256,
          estimatedCostMicros: FIRST_PREVIEW_COST_CONTRACT.estimatedCostMicros, costCurrency: "USD", pricingAssumptionVersion: FIRST_PREVIEW_PRICING_ASSUMPTION_VERSION });
        if (!reserved.ok) return reject("unavailable");
        if (reserved.value.disposition === "existing") return { status: "existing" as const, operationId: reserved.value.job.id };
        const binding: RevisionDispatchBinding = { owner: source.owner, reservationId: operationId, operationId, kind: "revision", briefId: source.conceptBriefId, sourceOutputId: current.id };
        const entitlement = await deps.entitlements.reserve({ ...binding, purchaseId: source.purchaseId, subjectId: source.subjectId });
        if (!entitlement.ok || entitlement.duplicate || entitlement.state !== "reserved") {
          const denied = !entitlement.ok && entitlement.reason !== "unavailable" && entitlement.reason !== undefined;
          if (denied) await deps.repository.recordJobFailure(operationId, { category: "budget_blocked", retryEligible: false, actualCostMicros: 0 });
          return reject(denied ? "denied" : "unknown");
        }
        const work: FirstPreviewGenerationWork = { jobId: operationId, conceptBriefId: source.conceptBriefId, publicReference: source.publicReference,
          attemptNumber: parent.attemptNumber + 1, parentJobId: parent.id, sourceOutputId: current.id, structured: prepared };
        const cost = await deps.reserveCost(work, binding);
        if (cost !== "reserved") {
          if (cost === "denied") {
            await deps.repository.recordJobFailure(operationId, { category: "budget_blocked", retryEligible: false, actualCostMicros: 0 });
            await deps.entitlements.settleDispatch({ ...binding, outcome: "definite_failure", failurePhase: "before_dispatch", providerCostUsdMicros: 0 });
          }
          return reject(cost === "denied" ? "denied" : "unknown");
        }
        // Exactly one publish. A thrown/uncertain response never republishes.
        try { await deps.publish(work); } catch { return reject("unknown"); }
        return { status: "accepted" as const, operationId };
      } catch { return reject("unknown"); }
    },

    async read(request: unknown, operationId: string) {
      try {
        if (!UUID.test(operationId)) return reject("denied");
        const source = await deps.resolveSource(request);
        if (!source || !validOwner(source.owner)) return reject("denied");
        const job = await deps.repository.findJobById(operationId);
        if (!job || job.conceptBriefId !== source.conceptBriefId || job.sourceOutputId !== source.sourceOutputId) return reject("denied");
        const output = await deps.repository.findOutputByJobId?.(job.id, job.conceptBriefId);
        const passed = output && hasPassedFirstPreviewAutomaticGateEvidence(output.automaticGateEvidence, {
          conceptBriefId: output.conceptBriefId, jobId: output.jobId, outputId: output.id, contentSha256: output.contentSha256,
        });
        if (job.status === "succeeded" && output?.isCurrentCustomerPreview && output.readinessStatus === "first_preview_ready" && passed) {
          return { status: "ready" as const, operationId, outputId: output.id };
        }
        if (job.status === "queued" || job.status === "processing") return { status: "pending" as const, operationId };
        const binding = await deps.resolveDispatch(job.id);
        const released = binding && binding.owner.scope === source.owner.scope && binding.owner.identity === source.owner.identity &&
          binding.briefId === job.conceptBriefId && binding.sourceOutputId === job.sourceOutputId && await deps.isDefiniteFailure?.(binding) === true;
        return { status: released ? "failed" as const : "unknown" as const, operationId };
      } catch { return reject("unknown"); }
    },

    async execute(work: FirstPreviewGenerationWork) {
      try {
        if (!work.sourceOutputId || !UUID.test(work.jobId) || !createFirstPreviewQueueMessage({
          conceptBriefId: work.conceptBriefId, publicReference: work.publicReference, generationInput: work.structured,
        }).ok) return reject("denied");
        const binding = await deps.resolveDispatch(work.jobId);
        if (!binding || !validOwner(binding.owner) || binding.operationId !== work.jobId || binding.kind !== "revision" ||
          binding.briefId !== work.conceptBriefId || binding.sourceOutputId !== work.sourceOutputId) return reject("denied");
        const stored = await deps.repository.findJobById(work.jobId);
        if (!stored || stored.conceptBriefId !== work.conceptBriefId || stored.sourceOutputId !== work.sourceOutputId ||
          stored.parentJobId !== work.parentJobId || stored.attemptNumber !== work.attemptNumber ||
          stored.designSpecSha256 !== work.structured.designSpecSha256 || stored.handSketchInstructionSha256 !== work.structured.handSketchInstructionSha256) return reject("denied");
        let claim: Claim | undefined;
        let result;
        if (stored.status === "queued") result = await runAutomaticFirstPreviewWorker(work, {
          ...deps.createWorkerDependencies(deps.repository), repository: deps.repository,
          revisionAdmission: { verifyReservation: candidate => deps.verifyCostReservation(candidate, binding),
            claimDispatch: async () => {
              try {
                claim = await deps.entitlements.claimDispatch(binding);
                if (claim === "claimed" && deps.claimCostReservation && await deps.claimCostReservation(work, binding) !== true) claim = "unknown";
              } catch { claim = "unknown"; }
              return claim;
            } },
        });
        else if (stored.status === "processing") return reject("unknown");
        const job = await deps.repository.findJobById(work.jobId);
        const output = await deps.repository.findOutputByJobId?.(work.jobId, work.conceptBriefId);
        const visual = output?.automaticGateEvidence && typeof output.automaticGateEvidence === "object"
          ? (output.automaticGateEvidence as Record<string, unknown>).visualPrivacyEvidence : null;
        const subject = output ? { conceptBriefId: output.conceptBriefId, jobId: output.jobId, outputId: output.id, contentSha256: output.contentSha256 } : null;
        const trustedVisual = subject && validateFirstPreviewVisualPrivacyEvidence(visual, subject, false);
        const ready = Boolean(job?.status === "succeeded" && output?.readinessStatus === "first_preview_ready" && output.isCurrentCustomerPreview && trustedVisual &&
          hasPassedFirstPreviewAutomaticGateEvidence(output.automaticGateEvidence, subject!));
        const definite = job?.actualCostMicros === 0 || (trustedVisual && (visual as { result: string }).result === "failed");
        const unknownClaim = claim === "unknown" || claim === "already_claimed" || result?.status === "duplicate";
        const outcome: Outcome = unknownClaim ? "unknown" : ready ? "delivered" : definite ? "definite_failure" : "unknown";
        const knownCost = trustedVisual ? (job?.actualCostMicros ?? 0) + (visual as { actualCostMicros: number }).actualCostMicros : 0;
        const beforeDispatch = outcome === "definite_failure" && (claim === undefined || claim === "denied") && job?.actualCostMicros === 0;
        const settled = await deps.entitlements.settleDispatch({ ...binding, outcome, ...(beforeDispatch ? { failurePhase: "before_dispatch" as const } : {}), providerCostUsdMicros: knownCost });
        const expectedState = outcome === "delivered" ? "settled" : outcome === "definite_failure" ? "released" : "unknown";
        return settled.ok && settled.state === expectedState ? { status: outcome, operationId: work.jobId, knownProviderCostUsdMicros: trustedVisual || job?.actualCostMicros === 0 ? knownCost : null }
          : { status: "unknown" as const, operationId: work.jobId };
      } catch { return reject("unknown"); }
    },
  });
}
