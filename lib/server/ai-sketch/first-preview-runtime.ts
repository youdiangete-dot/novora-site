// Server-only runtime foundation. Keep this module out of Client Components;
// its injected provider boundary is intended for server orchestration only.

import {
  type NovoraDesignSpec,
  validateNovoraDesignSpec,
} from "./design-spec";
import {
  type NovoraHandSketchInstruction,
  validateNovoraHandSketchInstruction,
} from "./hand-sketch-instruction";

export const FIRST_PREVIEW_PROVIDER_CONTRACT_VERSION =
  "novora_first_preview_provider_v1" as const;

export const FIRST_PREVIEW_RUNTIME_DECISION_SCOPE =
  "internal_runtime_decision_not_persistence_status" as const;

export type FirstPreviewProviderRequest = {
  contractVersion: typeof FIRST_PREVIEW_PROVIDER_CONTRACT_VERSION;
  purpose: "first_preview";
  imageCount: 1;
  designSpec: Pick<
    NovoraDesignSpec,
    | "spec_version"
    | "language"
    | "piece_type"
    | "customer_intent_summary"
    | "design_direction"
    | "jewelry_structure"
    | "materials"
    | "stones"
    | "motifs"
    | "dimensions"
    | "production_feasibility_notes"
    | "sketch_requirements"
  >;
  handSketchInstruction: Pick<
    NovoraHandSketchInstruction,
    | "instruction_version"
    | "design_spec_version"
    | "language"
    | "sheet_style"
    | "brand_placement"
    | "views"
    | "jewelry_rendering_instructions"
    | "stone_and_setting_instructions"
    | "motif_instructions"
    | "annotation_instructions"
    | "dimension_and_scale_notes"
    | "composition_instructions"
    | "disclaimer_instructions"
    | "negative_constraints"
  >;
};

export type FirstPreviewProviderImage = {
  assetId: string;
  contentSafetyPassed: boolean;
  privacyPassed: boolean;
  outputValidityPassed: boolean;
};

export type FirstPreviewProviderResponse =
  | {
      outcome: "completed";
      images: [FirstPreviewProviderImage];
    }
  | {
      outcome:
        | "provider_failure"
        | "timeout"
        | "aborted"
        | "invalid_output"
        | "rejected_unsafe";
    };

export interface FirstPreviewProvider {
  generateFirstPreview(
    request: FirstPreviewProviderRequest,
    context: { signal: AbortSignal },
  ): Promise<FirstPreviewProviderResponse>;
}

export type FirstPreviewGenerationStatus = FirstPreviewProviderResponse["outcome"];

export type FirstPreviewFailureCategory =
  | "invalid_structured_input"
  | "precondition_failed"
  | "provider_failure"
  | "timeout"
  | "aborted"
  | "invalid_output"
  | "unsafe_output"
  | "provider_metadata_exposure"
  | "internal_prompt_exposure"
  | "reviewer_or_admin_note_exposure"
  | "private_storage_path_exposure"
  | "secret_exposure";

export type FirstPreviewGenerationResult = {
  status: FirstPreviewGenerationStatus;
  imageCount: number;
  assetId: string | null;
  checks: {
    contentSafetyPassed: boolean | null;
    privacyPassed: boolean | null;
    outputValidityPassed: boolean | null;
    providerMetadataExposed: boolean;
    internalPromptExposed: boolean;
    reviewerOrAdminNotesExposed: boolean;
    privateStoragePathExposed: boolean;
    secretExposed: boolean;
  };
  failureCategory: FirstPreviewFailureCategory | null;
};

export type AutomaticFirstPreviewGateCode =
  | "concept_brief_persisted"
  | "valid_concept_brief_id"
  | "valid_public_reference"
  | "valid_design_spec"
  | "valid_hand_sketch_instruction"
  | "structured_inputs_consistent"
  | "generation_completed"
  | "single_image_result"
  | "valid_asset_reference"
  | "content_safety_passed"
  | "privacy_passed"
  | "access_control_eligible"
  | "output_validity_passed"
  | "provider_metadata_absent"
  | "internal_prompt_absent"
  | "reviewer_admin_notes_absent"
  | "private_storage_path_absent"
  | "secrets_absent"
  | "no_false_success";

export type AutomaticFirstPreviewGateInput = {
  persistenceConfirmed?: unknown;
  conceptBriefId?: unknown;
  publicReference?: unknown;
  designSpec?: unknown;
  handSketchInstruction?: unknown;
  generation?: unknown;
  accessControlEligible?: unknown;
  falseSuccessDetected?: unknown;
};

export type AutomaticFirstPreviewGateDecision = {
  ready: boolean;
  lifecycleDecision: "first_preview_ready" | "not_ready";
  decisionScope: typeof FIRST_PREVIEW_RUNTIME_DECISION_SCOPE;
  failedGates: AutomaticFirstPreviewGateCode[];
  approvedForCustomerRequired: false;
  approvedForGalleryRelated: false;
  persistenceMutationPerformed: false;
};

export type FirstPreviewRuntimeInput = Omit<
  AutomaticFirstPreviewGateInput,
  "generation"
>;

export type FirstPreviewRuntimeOptions = {
  provider: FirstPreviewProvider;
  timeoutMs?: number;
  signal?: AbortSignal;
};

export type FirstPreviewRuntimeResult = {
  providerInvoked: boolean;
  generation: FirstPreviewGenerationResult;
  gates: AutomaticFirstPreviewGateDecision;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PUBLIC_REFERENCE_PATTERN = /^NOVORA-CB-\d{8}-[A-Z0-9]{4}$/;
const ASSET_ID_PATTERN = /^preview_asset_[A-Za-z0-9_-]+$/;
const DEFAULT_TIMEOUT_MS = 30_000;

const COMPLETED_RESULT_KEYS = new Set(["outcome", "images"]);
const FAILURE_RESULT_KEYS = new Set(["outcome"]);
const IMAGE_RESULT_KEYS = new Set([
  "assetId",
  "contentSafetyPassed",
  "privacyPassed",
  "outputValidityPassed",
]);

type ExposureEvidence = FirstPreviewGenerationResult["checks"];
type ProviderInterruption = { kind: "timeout" } | { kind: "aborted" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowedKeys: Set<string>) {
  return Object.keys(value).every((key) => allowedKeys.has(key));
}

function isValidConceptBriefId(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function isValidPublicReference(value: unknown): value is string {
  return typeof value === "string" && PUBLIC_REFERENCE_PATTERN.test(value);
}

function isValidAssetId(value: unknown): value is string {
  return typeof value === "string" && ASSET_ID_PATTERN.test(value);
}

function createEmptyChecks(): ExposureEvidence {
  return {
    contentSafetyPassed: null,
    privacyPassed: null,
    outputValidityPassed: null,
    providerMetadataExposed: false,
    internalPromptExposed: false,
    reviewerOrAdminNotesExposed: false,
    privateStoragePathExposed: false,
    secretExposed: false,
  };
}

function createFailureResult(
  status: Exclude<FirstPreviewGenerationStatus, "completed">,
  failureCategory: FirstPreviewFailureCategory,
  checks: ExposureEvidence = createEmptyChecks(),
): FirstPreviewGenerationResult {
  return {
    status,
    imageCount: 0,
    assetId: null,
    checks,
    failureCategory,
  };
}

function collectExposureEvidence(value: unknown): ExposureEvidence {
  const evidence = createEmptyChecks();

  function walk(current: unknown) {
    if (Array.isArray(current)) {
      current.forEach(walk);
      return;
    }

    if (!isRecord(current)) {
      return;
    }

    Object.entries(current).forEach(([key, childValue]) => {
      const normalizedKey = key.replace(/[^a-z]/gi, "").toLowerCase();

      if (
        normalizedKey.includes("providermetadata") ||
        normalizedKey.includes("providerresponse") ||
        normalizedKey === "providername" ||
        normalizedKey === "providermodel" ||
        normalizedKey === "provideroutputid"
      ) {
        evidence.providerMetadataExposed = true;
      }

      if (normalizedKey.includes("prompt")) {
        evidence.internalPromptExposed = true;
      }

      if (normalizedKey.includes("reviewernote") || normalizedKey.includes("adminnote")) {
        evidence.reviewerOrAdminNotesExposed = true;
      }

      if (
        normalizedKey.includes("privatestoragepath") ||
        normalizedKey.includes("storageobjectpath")
      ) {
        evidence.privateStoragePathExposed = true;
      }

      if (
        normalizedKey.includes("apikey") ||
        normalizedKey.includes("secret") ||
        normalizedKey.includes("accesstoken")
      ) {
        evidence.secretExposed = true;
      }

      walk(childValue);
    });
  }

  walk(value);
  return evidence;
}

function exposureFailureCategory(
  checks: ExposureEvidence,
): FirstPreviewFailureCategory | null {
  if (checks.providerMetadataExposed) {
    return "provider_metadata_exposure";
  }
  if (checks.internalPromptExposed) {
    return "internal_prompt_exposure";
  }
  if (checks.reviewerOrAdminNotesExposed) {
    return "reviewer_or_admin_note_exposure";
  }
  if (checks.privateStoragePathExposed) {
    return "private_storage_path_exposure";
  }
  if (checks.secretExposed) {
    return "secret_exposure";
  }

  return null;
}

export function normalizeFirstPreviewProviderResponse(
  value: unknown,
): FirstPreviewGenerationResult {
  const checks = collectExposureEvidence(value);
  const exposureFailure = exposureFailureCategory(checks);

  if (exposureFailure) {
    return createFailureResult("invalid_output", exposureFailure, checks);
  }

  if (!isRecord(value) || typeof value.outcome !== "string") {
    return createFailureResult("invalid_output", "invalid_output", checks);
  }

  if (value.outcome !== "completed") {
    const supportedFailureOutcomes = [
      "provider_failure",
      "timeout",
      "aborted",
      "invalid_output",
      "rejected_unsafe",
    ] as const;

    if (
      !hasOnlyKeys(value, FAILURE_RESULT_KEYS) ||
      !(supportedFailureOutcomes as readonly string[]).includes(value.outcome)
    ) {
      return createFailureResult("invalid_output", "invalid_output", checks);
    }

    const status = value.outcome as (typeof supportedFailureOutcomes)[number];
    const failureCategory: FirstPreviewFailureCategory =
      status === "rejected_unsafe" ? "unsafe_output" : status;

    return createFailureResult(status, failureCategory, checks);
  }

  if (
    !hasOnlyKeys(value, COMPLETED_RESULT_KEYS) ||
    !Array.isArray(value.images) ||
    value.images.length !== 1 ||
    !isRecord(value.images[0]) ||
    !hasOnlyKeys(value.images[0], IMAGE_RESULT_KEYS)
  ) {
    return createFailureResult("invalid_output", "invalid_output", checks);
  }

  const image = value.images[0];
  const completedChecks: ExposureEvidence = {
    ...checks,
    contentSafetyPassed:
      typeof image.contentSafetyPassed === "boolean" ? image.contentSafetyPassed : null,
    privacyPassed: typeof image.privacyPassed === "boolean" ? image.privacyPassed : null,
    outputValidityPassed:
      typeof image.outputValidityPassed === "boolean" ? image.outputValidityPassed : null,
  };

  if (!isValidAssetId(image.assetId)) {
    return createFailureResult("invalid_output", "invalid_output", completedChecks);
  }

  if (completedChecks.contentSafetyPassed !== true) {
    return createFailureResult("rejected_unsafe", "unsafe_output", completedChecks);
  }

  if (
    completedChecks.privacyPassed !== true ||
    completedChecks.outputValidityPassed !== true
  ) {
    return createFailureResult("invalid_output", "invalid_output", completedChecks);
  }

  return {
    status: "completed",
    imageCount: 1,
    assetId: image.assetId,
    checks: completedChecks,
    failureCategory: null,
  };
}

function structuredInputsAreConsistent(
  designSpecValue: unknown,
  handSketchInstructionValue: unknown,
  publicReference: unknown,
): boolean {
  if (
    !validateNovoraDesignSpec(designSpecValue).ok ||
    !validateNovoraHandSketchInstruction(handSketchInstructionValue).ok
  ) {
    return false;
  }

  try {
    const designSpec = designSpecValue as NovoraDesignSpec;
    const handSketchInstruction = handSketchInstructionValue as NovoraHandSketchInstruction;

    return (
      designSpec.public_reference === publicReference &&
      handSketchInstruction.public_reference === publicReference &&
      handSketchInstruction.design_spec_version === designSpec.spec_version &&
      handSketchInstruction.language === designSpec.language &&
      handSketchInstruction.source_design_spec_summary.piece_type === designSpec.piece_type
    );
  } catch {
    return false;
  }
}

export function evaluateAutomaticFirstPreviewGates(
  input: AutomaticFirstPreviewGateInput,
): AutomaticFirstPreviewGateDecision {
  const generation = isRecord(input.generation)
    ? (input.generation as Partial<FirstPreviewGenerationResult>)
    : {};
  const checks = isRecord(generation.checks)
    ? (generation.checks as Partial<FirstPreviewGenerationResult["checks"]>)
    : {};
  const gateEvidence: Record<AutomaticFirstPreviewGateCode, boolean> = {
    concept_brief_persisted: input.persistenceConfirmed === true,
    valid_concept_brief_id: isValidConceptBriefId(input.conceptBriefId),
    valid_public_reference: isValidPublicReference(input.publicReference),
    valid_design_spec: validateNovoraDesignSpec(input.designSpec).ok,
    valid_hand_sketch_instruction: validateNovoraHandSketchInstruction(
      input.handSketchInstruction,
    ).ok,
    structured_inputs_consistent: structuredInputsAreConsistent(
      input.designSpec,
      input.handSketchInstruction,
      input.publicReference,
    ),
    generation_completed: generation.status === "completed",
    single_image_result: generation.imageCount === 1,
    valid_asset_reference: isValidAssetId(generation.assetId),
    content_safety_passed: checks.contentSafetyPassed === true,
    privacy_passed: checks.privacyPassed === true,
    access_control_eligible: input.accessControlEligible === true,
    output_validity_passed: checks.outputValidityPassed === true,
    provider_metadata_absent: checks.providerMetadataExposed === false,
    internal_prompt_absent: checks.internalPromptExposed === false,
    reviewer_admin_notes_absent: checks.reviewerOrAdminNotesExposed === false,
    private_storage_path_absent: checks.privateStoragePathExposed === false,
    secrets_absent: checks.secretExposed === false,
    no_false_success: input.falseSuccessDetected === false,
  };
  const failedGates = (Object.keys(gateEvidence) as AutomaticFirstPreviewGateCode[]).filter(
    (gate) => gateEvidence[gate] !== true,
  );
  const ready = failedGates.length === 0;

  return {
    ready,
    lifecycleDecision: ready ? "first_preview_ready" : "not_ready",
    decisionScope: FIRST_PREVIEW_RUNTIME_DECISION_SCOPE,
    failedGates,
    approvedForCustomerRequired: false,
    approvedForGalleryRelated: false,
    persistenceMutationPerformed: false,
  };
}

function createProviderRequest(
  designSpec: NovoraDesignSpec,
  handSketchInstruction: NovoraHandSketchInstruction,
): FirstPreviewProviderRequest {
  return {
    contractVersion: FIRST_PREVIEW_PROVIDER_CONTRACT_VERSION,
    purpose: "first_preview",
    imageCount: 1,
    designSpec: {
      spec_version: designSpec.spec_version,
      language: designSpec.language,
      piece_type: designSpec.piece_type,
      customer_intent_summary: designSpec.customer_intent_summary,
      design_direction: designSpec.design_direction,
      jewelry_structure: designSpec.jewelry_structure,
      materials: designSpec.materials,
      stones: designSpec.stones,
      motifs: designSpec.motifs,
      dimensions: designSpec.dimensions,
      production_feasibility_notes: designSpec.production_feasibility_notes,
      sketch_requirements: designSpec.sketch_requirements,
    },
    handSketchInstruction: {
      instruction_version: handSketchInstruction.instruction_version,
      design_spec_version: handSketchInstruction.design_spec_version,
      language: handSketchInstruction.language,
      sheet_style: handSketchInstruction.sheet_style,
      brand_placement: handSketchInstruction.brand_placement,
      views: handSketchInstruction.views,
      jewelry_rendering_instructions:
        handSketchInstruction.jewelry_rendering_instructions,
      stone_and_setting_instructions:
        handSketchInstruction.stone_and_setting_instructions,
      motif_instructions: handSketchInstruction.motif_instructions,
      annotation_instructions: handSketchInstruction.annotation_instructions,
      dimension_and_scale_notes: handSketchInstruction.dimension_and_scale_notes,
      composition_instructions: handSketchInstruction.composition_instructions,
      disclaimer_instructions: handSketchInstruction.disclaimer_instructions,
      negative_constraints: handSketchInstruction.negative_constraints,
    },
  };
}

function normalizeTimeoutMs(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : DEFAULT_TIMEOUT_MS;
}

async function invokeProviderOnce(
  provider: FirstPreviewProvider,
  request: FirstPreviewProviderRequest,
  timeoutMs: number,
  externalSignal?: AbortSignal,
): Promise<FirstPreviewGenerationResult> {
  const controller = new AbortController();
  let resolveInterruption:
    | ((value: ProviderInterruption) => void)
    | null = null;
  const interruption = new Promise<ProviderInterruption>((resolve) => {
    resolveInterruption = resolve;
  });
  const abortFromCaller = () => {
    controller.abort();
    resolveInterruption?.({ kind: "aborted" });
  };

  if (externalSignal?.aborted) {
    return createFailureResult("aborted", "aborted");
  }

  externalSignal?.addEventListener("abort", abortFromCaller, { once: true });
  const timeout = setTimeout(() => {
    controller.abort();
    resolveInterruption?.({ kind: "timeout" });
  }, timeoutMs);
  const providerCall = Promise.resolve()
    .then(() => provider.generateFirstPreview(request, { signal: controller.signal }))
    .then(
      (value) => ({ kind: "response" as const, value }),
      () => ({ kind: "thrown" as const }),
    );

  try {
    const result = await Promise.race([providerCall, interruption]);

    if (result.kind === "timeout") {
      return createFailureResult("timeout", "timeout");
    }
    if (result.kind === "aborted") {
      return createFailureResult("aborted", "aborted");
    }
    if (result.kind === "thrown") {
      return createFailureResult("provider_failure", "provider_failure");
    }

    return normalizeFirstPreviewProviderResponse(result.value);
  } finally {
    clearTimeout(timeout);
    externalSignal?.removeEventListener("abort", abortFromCaller);
  }
}

export async function orchestrateFirstPreviewGeneration(
  input: FirstPreviewRuntimeInput,
  options: FirstPreviewRuntimeOptions,
): Promise<FirstPreviewRuntimeResult> {
  const inputsAreValid = structuredInputsAreConsistent(
    input.designSpec,
    input.handSketchInstruction,
    input.publicReference,
  );

  if (!inputsAreValid) {
    const generation = createFailureResult(
      "invalid_output",
      "invalid_structured_input",
    );

    return {
      providerInvoked: false,
      generation,
      gates: evaluateAutomaticFirstPreviewGates({ ...input, generation }),
    };
  }

  const preconditionsPass =
    input.persistenceConfirmed === true &&
    isValidConceptBriefId(input.conceptBriefId) &&
    isValidPublicReference(input.publicReference) &&
    input.accessControlEligible === true &&
    input.falseSuccessDetected === false;

  if (!preconditionsPass) {
    const generation = createFailureResult(
      "invalid_output",
      "precondition_failed",
    );

    return {
      providerInvoked: false,
      generation,
      gates: evaluateAutomaticFirstPreviewGates({ ...input, generation }),
    };
  }

  let request: FirstPreviewProviderRequest;

  try {
    request = createProviderRequest(
      input.designSpec as NovoraDesignSpec,
      input.handSketchInstruction as NovoraHandSketchInstruction,
    );
  } catch {
    const generation = createFailureResult(
      "invalid_output",
      "invalid_structured_input",
    );

    return {
      providerInvoked: false,
      generation,
      gates: evaluateAutomaticFirstPreviewGates({ ...input, generation }),
    };
  }

  let providerInvoked = false;
  const trackedProvider: FirstPreviewProvider = {
    generateFirstPreview(request, context) {
      providerInvoked = true;
      return options.provider.generateFirstPreview(request, context);
    },
  };
  const generation = await invokeProviderOnce(
    trackedProvider,
    request,
    normalizeTimeoutMs(options.timeoutMs),
    options.signal,
  );

  return {
    providerInvoked,
    generation,
    gates: evaluateAutomaticFirstPreviewGates({ ...input, generation }),
  };
}
