import "server-only";

import {
  prepareFirstPreviewGenerationInput,
} from "./first-preview-generation-lifecycle";
import {
  createFirstPreviewQueueMessage,
  FIRST_PREVIEW_QUEUE_EXECUTION_CONFIRMED_ENV,
  isFirstPreviewQueueExecutionConfirmed,
  publishFirstPreviewQueueMessage,
  productionFirstPreviewQueuePublisher,
  type FirstPreviewQueuePublisher,
} from "./first-preview-queue";
import {
  isInstantFirstPreviewAgentEnabled,
  INSTANT_FIRST_PREVIEW_FEATURE_FLAG_ENV,
} from "./instant-first-preview-feature-flag";
import {
  isValidFirstPreviewAssetUuid,
  isValidFirstPreviewPublicReference,
} from "./first-preview-generated-assets-contract";
import {
  buildFirstPreviewStructuredGenerationInput,
  type FirstPreviewStructuredInputRejectStage,
  type JewelrySkillsDiagnosticErrorCategory,
} from "./first-preview-structured-input";

export type AutomaticFirstPreviewStructuredInputCategory =
  | "invalid_structured_input"
  | "unsafe_input"
  | "oversized_input"
  | "contradictory_input";

export type AutomaticFirstPreviewStructuredInputRejectStage =
  FirstPreviewStructuredInputRejectStage;

export type AutomaticFirstPreviewJewelrySkillsErrorCategory =
  JewelrySkillsDiagnosticErrorCategory;

export type AutomaticFirstPreviewTriggerResult =
  | Readonly<{
      status: "disabled";
      reason: "feature_disabled" | "queue_execution_disabled";
    }>
  | Readonly<{
      status: "not_enqueued";
      reason:
        | "eligibility_rejected"
        | "queue_message_rejected"
        | "queue_publish_failed";
    }>
  | Readonly<{
      status: "not_enqueued";
      reason: "structured_input_rejected";
      structuredInputCategory: AutomaticFirstPreviewStructuredInputCategory;
      structuredInputRejectStage: AutomaticFirstPreviewStructuredInputRejectStage;
      jewelrySkillsErrorCategory?: AutomaticFirstPreviewJewelrySkillsErrorCategory;
    }>
  | Readonly<{
      status: "enqueued";
      reason: "enqueued";
    }>;

export type AutomaticFirstPreviewTriggerDependencies = Readonly<{
  featureFlagValue?: unknown;
  queueExecutionCapabilityValue?: unknown;
  publisher?: FirstPreviewQueuePublisher;
  createQueueMessage?: typeof createFirstPreviewQueueMessage;
}>;

function hasOwn(value: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

export async function triggerAutomaticFirstPreviewAfterPersistence(
  input: {
    payload: unknown;
    persistenceConfirmed: unknown;
    customerAccessProofEstablished: unknown;
    conceptBriefId: string;
    publicReference: string;
  },
  dependencies: AutomaticFirstPreviewTriggerDependencies = {},
): Promise<AutomaticFirstPreviewTriggerResult> {
  const featureFlagValue = hasOwn(dependencies, "featureFlagValue")
    ? dependencies.featureFlagValue
    : process.env[INSTANT_FIRST_PREVIEW_FEATURE_FLAG_ENV];
  if (!isInstantFirstPreviewAgentEnabled(featureFlagValue)) {
    return { status: "disabled", reason: "feature_disabled" };
  }

  const queueExecutionCapabilityValue = hasOwn(
    dependencies,
    "queueExecutionCapabilityValue",
  )
    ? dependencies.queueExecutionCapabilityValue
    : process.env[FIRST_PREVIEW_QUEUE_EXECUTION_CONFIRMED_ENV];
  if (
    !isFirstPreviewQueueExecutionConfirmed(queueExecutionCapabilityValue)
  ) {
    return { status: "disabled", reason: "queue_execution_disabled" };
  }

  if (
    input.persistenceConfirmed !== true ||
    input.customerAccessProofEstablished !== true ||
    !isValidFirstPreviewAssetUuid(input.conceptBriefId) ||
    !isValidFirstPreviewPublicReference(input.publicReference)
  ) {
    return { status: "not_enqueued", reason: "eligibility_rejected" };
  }

  const structured = buildFirstPreviewStructuredGenerationInput({
    payload: input.payload,
    publicReference: input.publicReference,
  });
  if (structured.ok === false) {
    return {
      status: "not_enqueued",
      reason: "structured_input_rejected",
      structuredInputCategory: structured.category,
      structuredInputRejectStage: structured.structuredInputRejectStage,
      ...(structured.jewelrySkillsErrorCategory
        ? {
            jewelrySkillsErrorCategory:
              structured.jewelrySkillsErrorCategory,
          }
        : {}),
    };
  }

  const message = (
    dependencies.createQueueMessage ?? createFirstPreviewQueueMessage
  )({
    conceptBriefId: input.conceptBriefId,
    publicReference: input.publicReference,
    generationInput: prepareFirstPreviewGenerationInput(structured.value),
  });
  if (!message.ok) {
    return { status: "not_enqueued", reason: "queue_message_rejected" };
  }

  const publishResult = await publishFirstPreviewQueueMessage(
    message.value,
    dependencies.publisher ?? productionFirstPreviewQueuePublisher,
  );

  return publishResult.status === "enqueued"
    ? { status: "enqueued", reason: "enqueued" }
    : { status: "not_enqueued", reason: "queue_publish_failed" };
}
