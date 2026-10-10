import "server-only";

import { createHash, randomUUID } from "node:crypto";

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
import {
  validateFirstPreviewVisualPrivacyEvidence,
  type FirstPreviewVisualPrivacyEvidence,
} from "./first-preview-visual-privacy-contract";

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
  "novora_first_preview_trusted_output_evidence_v2" as const;

export type FirstPreviewTrustedOutputSubject = Readonly<{
  conceptBriefId: string;
  jobId: string;
  outputId: string;
  contentSha256: string;
}>;

export type FirstPreviewTrustedOutputEvidence = Readonly<{
  evidenceVersion: typeof FIRST_PREVIEW_TRUSTED_OUTPUT_EVIDENCE_VERSION;
  subject: FirstPreviewTrustedOutputSubject;
  visualPrivacyEvidence: FirstPreviewVisualPrivacyEvidence;
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
  context: Readonly<{
    signal: AbortSignal;
    reserveVisualPrivacyInspection?: () => Promise<boolean>;
  }>,
) => Promise<unknown>;

export type AutomaticFirstPreviewWorkerDependencies = Readonly<{
  repository: FirstPreviewRepository;
  createProvider(): OpenAiFirstPreviewProviderBinding | null;
  createAssetStore(): FirstPreviewGeneratedAssetStore;
  evaluateTrustedOutput?: FirstPreviewTrustedOutputEvaluator;
  trustedOutputEvidenceTimeoutMs?: number;
  attemptTimeoutMs?: number;
  outputIdSource?: () => string;
}>;

// Moderation and the (up to 30-second) visual inspection run sequentially.
// The attempt timer starts before image generation, so it remains the earlier
// authoritative deadline while this evaluator retains a finite local timer.
const DEFAULT_TRUSTED_OUTPUT_EVIDENCE_TIMEOUT_MS = OPENAI_FIRST_PREVIEW_TIMEOUT_MS;
const MAX_TRUSTED_OUTPUT_EVIDENCE_TIMEOUT_MS = OPENAI_FIRST_PREVIEW_TIMEOUT_MS;

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
    !hasExactKeys(value, ["evidenceVersion", "results", "subject", "visualPrivacyEvidence"]) ||
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
  if (!validateFirstPreviewVisualPrivacyEvidence(value.visualPrivacyEvidence, expectedSubject)) {
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
  reserveInspection: () => Promise<boolean>,
  readVisualEvidence: (value: unknown) => void,
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
            {
              signal: evaluatorController.signal,
              reserveVisualPrivacyInspection: async () => {
                if (evaluatorController.signal.aborted) return false;
                const reserved = await reserveInspection();
                return reserved && !evaluatorController.signal.aborted;
              },
            },
          ),
        )
        .then(
          (value) => {
            if (!evaluatorController.signal.aborted) readVisualEvidence(value);
            return { kind: "value" as const, value };
          },
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
  let candidateOutput: FirstPreviewOutputRecord | null = null;
  let inspectionReserved = false;
  let visualEvidence: FirstPreviewVisualPrivacyEvidence | null = null;
  const provider: FirstPreviewProvider = {
    async generateFirstPreview(request, context) {
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
      // Preserve image-generation accounting separately from the incremental
      // visual-inspection reservation. No inspection is admitted over this cap.
      const imageCost = reconcileFirstPreviewActualCost({
        dispatched: true,
        usage: safeReadUsage(binding!),
      });
      if (firstPreviewActualCostExceedsReservation(imageCost.actualCostMicros)) {
        trustedEvidenceFailureCategory = "budget_blocked";
        return { outcome: "invalid_output" };
      }
      const requestId = safeReadProviderRequestId(binding!, adapterResult);
      if (!requestId || context.signal.aborted) {
        trustedEvidenceFailureCategory = "lifecycle_conflict";
        return { outcome: "invalid_output" };
      }
      const requestRecorded = await dependencies.repository.recordProviderRequest(
        work.jobId, { providerRequestId: requestId },
      );
      if (!requestRecorded.ok || context.signal.aborted) {
        trustedEvidenceFailureCategory = "lifecycle_conflict";
        return { outcome: "invalid_output" };
      }

      // A private, validated candidate must exist durably before the one-call
      // inspection claim. It remains not_ready throughout automatic evaluation.
      let stored: PersistFirstPreviewGeneratedAssetResult;
      try {
        stored = await dependencies.createAssetStore().persistValidatedPng({
          conceptBriefId: work.conceptBriefId,
          jobId: work.jobId,
          outputId,
          mimeType: "image/png",
          imageBytes,
        });
      } catch {
        trustedEvidenceFailureCategory = "storage_failure";
        return { outcome: "invalid_output" };
      }
      if (stored.ok === false) {
        trustedEvidenceFailureCategory = mapGeneratedAssetFailure(stored.code);
        return { outcome: "invalid_output" };
      }
      if (stored.value.asset.contentSha256 !== subject.contentSha256 || context.signal.aborted) {
        trustedEvidenceFailureCategory = "lifecycle_conflict";
        return { outcome: "invalid_output" };
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
      if (!output.ok || context.signal.aborted) {
        trustedEvidenceFailureCategory = "lifecycle_conflict";
        return { outcome: "invalid_output" };
      }
      candidateOutput = output.value;
      const evidenceResult = await readTrustedOutputEvidence(
        dependencies,
        subject,
        imageBytes,
        context.signal,
        async () => {
          if (context.signal.aborted) return false;
          const reserved = await dependencies.repository.reserveVisualPrivacyInspection(subject);
          inspectionReserved = reserved.ok;
          return reserved.ok && !context.signal.aborted;
        },
        (value) => {
          if (isRecord(value) && validateFirstPreviewVisualPrivacyEvidence(value.visualPrivacyEvidence, subject, false)) {
            visualEvidence = value.visualPrivacyEvidence;
          }
        },
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
    dispatched: runtime.providerInvoked,
    usage: safeReadUsage(binding),
  });
  const providerRequestId = safeReadProviderRequestId(binding, adapterResult);
  if (inspectionReserved && (!trustedEvidence || !runtime.gates.ready)) {
    const output = candidateOutput as FirstPreviewOutputRecord | null;
    if (output) {
      const subject = {
        conceptBriefId: work.conceptBriefId,
        jobId: work.jobId,
        outputId,
        contentSha256: output.contentSha256,
      };
      const recordedVisualEvidence = visualEvidence as FirstPreviewVisualPrivacyEvidence | null;
      // Preserve a real inspector verdict exactly. An absent verdict is an
      // operational interruption, not manufactured privacy evidence.
      if (recordedVisualEvidence?.result === "failed") {
        await dependencies.repository.recordVisualPrivacyInspectionFailure(subject, recordedVisualEvidence);
      } else {
        await dependencies.repository.recordVisualPrivacyOperationalFailure(
          subject,
          recordedVisualEvidence ? "gate_pipeline_failed" : "inspection_interrupted",
          recordedVisualEvidence ?? undefined,
        );
      }
    }
  }
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

  const output = candidateOutput as FirstPreviewOutputRecord | null;
  if (!output || !inspectionReserved || output.contentSha256 !== trustedEvidence.subject.contentSha256) {
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
      assetExists: output.assetPersisted === true,
      ownershipConsistent:
        output.id === trustedEvidence.subject.outputId &&
        output.jobId === trustedEvidence.subject.jobId &&
        output.conceptBriefId === trustedEvidence.subject.conceptBriefId &&
        output.contentSha256 === trustedEvidence.subject.contentSha256,
      privacyPassed: trustedEvidence.results.privacyPassed,
      visualPrivacyEvidence: trustedEvidence.visualPrivacyEvidence,
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
        await dependencies.repository.reconcileInterruptedInspection(work.jobId, work.conceptBriefId);
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
