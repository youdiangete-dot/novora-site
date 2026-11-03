import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClientOrNull } from "../supabase";
// B/C-owned modules arrive through the serialized combined integration. A does
// not duplicate their identity scheme, ledger, or payment verification logic.
import { createImagePackageRepository } from "../image-packages/repository";
import { testPackagePurchase, testPackageSubject } from "../image-packages/identity";
import { authenticateScopedReceiptRequest, createRedisBetaAdmissionLedger, isScopedReceiptOwnerActive, revisionSpendingFingerprint, type BetaAdmissionLedger } from "./beta-admission";
import { createFirstPreviewRepository } from "./first-preview-persistence";
import { buildFirstPreviewStructuredGenerationInput } from "./first-preview-structured-input";
import { prepareFirstPreviewGenerationInput, createProductionAutomaticFirstPreviewWorkerDependencies, type FirstPreviewGenerationWork } from "./first-preview-generation-lifecycle";
import { createSourceBoundRevisionService, type RevisionDispatchBinding, type RevisionSource } from "./first-preview-revision";
import { verifyFirstPreviewCustomerFeedbackBinding } from "./first-preview-customer-feedback";
import { FIRST_PREVIEW_CUSTOMER_ACCESS_SIGNING_SECRET_ENV } from "./first-preview-customer-access-contract";
import { isFirstPreviewQueueExecutionConfirmed } from "./first-preview-queue";
import { publishRevisionQueueEnvelope, REVISION_QUEUE_SCHEMA, type RevisionQueueEnvelope } from "./first-preview-revision-queue";
import type { RevisionHttpContext } from "./first-preview-revision-http";
import { isValidFirstPreviewAssetUuid } from "./first-preview-generated-assets-contract";
import { isLowReservationPreviewInputAllowed } from "./openai-first-preview-provider";

type PackageRepository = ReturnType<typeof createImagePackageRepository> & {
  isDefiniteFailure?(binding: RevisionDispatchBinding): Promise<boolean>;
};
type RuntimeOptions = Readonly<{ db?: SupabaseClient | null; packages?: PackageRepository; ledger?: BetaAdmissionLedger | null }>;

function services(db: SupabaseClient, owner: RevisionDispatchBinding["owner"], source: RevisionSource | null, options: RuntimeOptions = {}) {
  const repository = createFirstPreviewRepository({ supabaseClient: db });
  const packages: PackageRepository = options.packages ?? createImagePackageRepository(db);
  const ledger = Object.hasOwn(options, "ledger") ? options.ledger : createRedisBetaAdmissionLedger();
  const bindingFor = (operationId: string, briefId: string, sourceOutputId: string): RevisionDispatchBinding => ({
    owner, operationId, reservationId: operationId, kind: "revision", briefId, sourceOutputId,
  });
  const fingerprint = revisionSpendingFingerprint;
  return createSourceBoundRevisionService({
    validatePreparedInput: prepared => isLowReservationPreviewInputAllowed(prepared, process.env),
    repository, resolveSource: async () => source,
    resolveDispatch: async operationId => {
      const job = await repository.findJobById(operationId);
      if (!job?.sourceOutputId) return null;
      // Queue fields cannot authorize a call: B's atomic claim/settlement checks
      // this ENTIRE binding before dispatch or any entitlement state change.
      return bindingFor(operationId, job.conceptBriefId, job.sourceOutputId);
    },
    isDefiniteFailure: async binding => {
      return typeof packages.isDefiniteFailure === "function" && await packages.isDefiniteFailure(binding) === true;
    },
    entitlements: packages,
    reserveCost: async (work, binding) => {
      if (!ledger || !isScopedReceiptOwnerActive(binding.owner) || !isFirstPreviewQueueExecutionConfirmed()) return "denied";
      // Existing atomic spending ledger, one slot per paid OPERATION. The slot's
      // historical API field is named briefId; actual Brief/source are immutable
      // in the fingerprint and the B binding. No ledger/authority is created here.
      const result = await ledger.reserve({ identity: binding.owner.identity, briefId: work.jobId,
        kind:"revision",sourceBriefId:work.conceptBriefId,
        requestKey: createHash("sha256").update(`${binding.owner.scope}\n${binding.owner.identity}\n${work.jobId}`).digest("hex"), fingerprint: fingerprint(work) });
      return result === "reserved" ? "reserved" : result === "denied" ? "denied" : "unknown";
    },
    verifyCostReservation: async (_work, binding) => Boolean(ledger && isScopedReceiptOwnerActive(binding.owner) && isFirstPreviewQueueExecutionConfirmed()),
    // B's full owner/binding claim happens first. Only then may the funded atomic
    // ledger claim run; both must confirm before any Provider request. Uncertain
    // or duplicate claims hold the operation and never authorize another call.
    claimCostReservation: async (work, binding) => Boolean(ledger && isScopedReceiptOwnerActive(binding.owner) &&
      isFirstPreviewQueueExecutionConfirmed() && await ledger.claimDispatch({ briefId: work.jobId, sourceBriefId:work.conceptBriefId, kind:"revision",fingerprint: fingerprint(work) })),
    publish: async work => publishRevisionQueueEnvelope({ schemaVersion: REVISION_QUEUE_SCHEMA, owner, work }),
    createWorkerDependencies: createProductionAutomaticFirstPreviewWorkerDependencies,
  });
}

export async function createProductionRevisionHttpService(request: Request, context: RevisionHttpContext, options: RuntimeOptions = {}) {
  try {
    const owner = authenticateScopedReceiptRequest(request);
    const db = Object.hasOwn(options, "db") ? options.db : createSupabaseAdminClientOrNull();
    if (!owner || !db || !isFirstPreviewQueueExecutionConfirmed()) return null;
    const owned = await db.from("m2_scoped_submission_receipts").select("concept_brief_id,public_reference")
      .eq("scope_sha256", owner.scope).eq("invitation_identity", owner.identity).eq("public_reference", context.publicReference).limit(2);
    if (owned.error || !Array.isArray(owned.data) || owned.data.length !== 1 || owned.data[0].public_reference !== context.publicReference) return null;
    const receipt = { briefId: owned.data[0].concept_brief_id as string, reference: context.publicReference };
    if (!isValidFirstPreviewAssetUuid(receipt.briefId)) return null;
    const packages = options.packages ?? createImagePackageRepository(db);
    if (typeof (packages as PackageRepository).isDefiniteFailure !== "function") return null;
    const purchaseId = testPackagePurchase(owner, context.provider), subjectId = testPackageSubject(owner);
    const purchase = await packages.findPurchase(purchaseId);
    if (!purchase || purchase === "unavailable" || purchase.owner.scope !== owner.scope || purchase.owner.identity !== owner.identity ||
      purchase.subjectId !== subjectId || purchase.purchaseId !== purchaseId || purchase.provider !== context.provider) return null;
    const [briefResult, outputResult] = await Promise.all([
      db.from("concept_briefs").select("id,public_reference,brief_payload").eq("id", receipt.briefId).eq("public_reference", receipt.reference).maybeSingle(),
      db.from("ai_sketch_outputs").select("id,job_id,concept_brief_id").eq("id", context.sourceOutputId).eq("concept_brief_id", receipt.briefId).maybeSingle(),
    ]);
    const brief = briefResult.data, output = outputResult.data;
    if (briefResult.error || outputResult.error || !brief || !output || brief.id !== receipt.briefId || brief.public_reference !== receipt.reference ||
      output.id !== context.sourceOutputId || output.concept_brief_id !== receipt.briefId || !isValidFirstPreviewAssetUuid(output.job_id)) return null;
    const built = buildFirstPreviewStructuredGenerationInput({ payload: brief.brief_payload, publicReference: receipt.reference });
    if (!built.ok) return null;
    const repository = createFirstPreviewRepository({ supabaseClient: db });
    const sourceJob = await repository.findJobById(output.job_id);
    if (!sourceJob || sourceJob.status !== "succeeded" || sourceJob.conceptBriefId !== receipt.briefId) return null;
    if (context.directives) {
      const signed = verifyFirstPreviewCustomerFeedbackBinding(context.binding ?? "", process.env[FIRST_PREVIEW_CUSTOMER_ACCESS_SIGNING_SECRET_ENV] ?? "");
      if (!signed || signed.publicReference !== receipt.reference || signed.outputId !== output.id) return null;
      if (!(await repository.findJobById(context.operationId))) {
        const current = await repository.findCustomerReadyOutput(receipt.briefId);
        if (current?.id !== output.id || !(await repository.ensureReadyReviewLink(output.id, receipt.briefId)).ok) return null;
        // Server-owned source CAS; selections are closed design codes, never raw
        // feedback prose. This expresses the customer's request, not admin approval.
        const updated = await db.from("ai_sketch_reviews").update({ review_status: "needs_revision", revision_instruction: context.directives.join(","), updated_at: new Date().toISOString() })
          .eq("concept_brief_id", receipt.briefId).eq("ai_sketch_output_id", output.id).select("ai_sketch_output_id").maybeSingle();
        if (updated.error || updated.data?.ai_sketch_output_id !== output.id) return null;
      }
    }
    return services(db, owner, { owner, purchaseId, subjectId, conceptBriefId: receipt.briefId, publicReference: receipt.reference,
      sourceOutputId: output.id, originalInput: prepareFirstPreviewGenerationInput(built.value),
      ...(context.directives ? { requestedDirectives: context.directives, sourceRevisionDirectives: sourceJob.revisionDirectives ?? [] } : {}) }, { ...options, packages });
  } catch { return null; }
}

export async function createProductionRevisionQueueService(envelope: RevisionQueueEnvelope, options: RuntimeOptions = {}) {
  const db = Object.hasOwn(options, "db") ? options.db : createSupabaseAdminClientOrNull();
  return db && isScopedReceiptOwnerActive(envelope.owner) && isFirstPreviewQueueExecutionConfirmed()
    ? services(db, envelope.owner, null, options) : null;
}
