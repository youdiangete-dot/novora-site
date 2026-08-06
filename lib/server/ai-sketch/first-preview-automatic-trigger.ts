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
import { buildFirstPreviewStructuredGenerationInput } from "./first-preview-structured-input";

export type AutomaticFirstPreviewTriggerResult = Readonly<{
  status: "disabled" | "enqueued" | "not_enqueued";
}>;

export type AutomaticFirstPreviewTriggerDependencies = Readonly<{
  featureFlagValue?: unknown;
  queueExecutionCapabilityValue?: unknown;
  publisher?: FirstPreviewQueuePublisher;
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
    return { status: "disabled" };
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
    return { status: "disabled" };
  }

  if (
    input.persistenceConfirmed !== true ||
    input.customerAccessProofEstablished !== true ||
    !isValidFirstPreviewAssetUuid(input.conceptBriefId) ||
    !isValidFirstPreviewPublicReference(input.publicReference)
  ) {
    return { status: "not_enqueued" };
  }

  const structured = buildFirstPreviewStructuredGenerationInput({
    payload: input.payload,
    publicReference: input.publicReference,
  });
  if (!structured.ok) return { status: "not_enqueued" };

  const message = createFirstPreviewQueueMessage({
    conceptBriefId: input.conceptBriefId,
    publicReference: input.publicReference,
    generationInput: prepareFirstPreviewGenerationInput(structured.value),
  });
  if (!message.ok) return { status: "not_enqueued" };

  return publishFirstPreviewQueueMessage(
    message.value,
    dependencies.publisher ?? productionFirstPreviewQueuePublisher,
  );
}
