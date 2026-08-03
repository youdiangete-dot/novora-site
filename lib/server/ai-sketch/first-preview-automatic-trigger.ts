import "server-only";

import {
  scheduleFirstPreviewPostResponseTask,
  type FirstPreviewPostResponseScheduler,
} from "./first-preview-background-execution";
import {
  createProductionAutomaticFirstPreviewWorkerDependencies,
  reserveAutomaticFirstPreviewAttempt,
  runAutomaticFirstPreviewWorker,
  type AutomaticFirstPreviewWorkerDependencies,
} from "./first-preview-generation-lifecycle";
import {
  isInstantFirstPreviewAgentEnabled,
  INSTANT_FIRST_PREVIEW_FEATURE_FLAG_ENV,
} from "./instant-first-preview-feature-flag";
import {
  FIRST_PREVIEW_POST_RESPONSE_EXECUTION_CONFIRMED_ENV,
  isFirstPreviewPostResponseExecutionConfirmed,
} from "./first-preview-post-response-execution-capability";
import {
  isValidFirstPreviewAssetUuid,
  isValidFirstPreviewPublicReference,
} from "./first-preview-generated-assets-contract";
import {
  createFirstPreviewRepository,
  type FirstPreviewRepository,
} from "./first-preview-persistence";

export type AutomaticFirstPreviewTriggerResult = Readonly<{
  status: "disabled" | "scheduled" | "not_scheduled";
}>;

export type AutomaticFirstPreviewTriggerDependencies = Readonly<{
  featureFlagValue?: unknown;
  executionCapabilityValue?: unknown;
  createRepository?: () => FirstPreviewRepository;
  createWorkerDependencies?: (
    repository: FirstPreviewRepository,
  ) => AutomaticFirstPreviewWorkerDependencies;
  schedule?: FirstPreviewPostResponseScheduler;
  jobIdSource?: () => string;
}>;

function hasOwn(value: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

export function triggerAutomaticFirstPreviewAfterPersistence(
  input: {
    payload: unknown;
    persistenceConfirmed: unknown;
    customerAccessProofEstablished: unknown;
    conceptBriefId: string;
    publicReference: string;
  },
  dependencies: AutomaticFirstPreviewTriggerDependencies = {},
): AutomaticFirstPreviewTriggerResult {
  const featureFlagValue = hasOwn(dependencies, "featureFlagValue")
    ? dependencies.featureFlagValue
    : process.env[INSTANT_FIRST_PREVIEW_FEATURE_FLAG_ENV];
  if (!isInstantFirstPreviewAgentEnabled(featureFlagValue)) {
    return { status: "disabled" };
  }
  const executionCapabilityValue = hasOwn(
    dependencies,
    "executionCapabilityValue",
  )
    ? dependencies.executionCapabilityValue
    : process.env[FIRST_PREVIEW_POST_RESPONSE_EXECUTION_CONFIRMED_ENV];
  if (
    !isFirstPreviewPostResponseExecutionConfirmed(executionCapabilityValue)
  ) {
    return { status: "disabled" };
  }
  if (
    input.persistenceConfirmed !== true ||
    input.customerAccessProofEstablished !== true ||
    !isValidFirstPreviewAssetUuid(input.conceptBriefId) ||
    !isValidFirstPreviewPublicReference(input.publicReference)
  ) {
    return { status: "not_scheduled" };
  }

  const scheduled = scheduleFirstPreviewPostResponseTask(async () => {
    const repository = (dependencies.createRepository ??
      createFirstPreviewRepository)();
    const reservation = await reserveAutomaticFirstPreviewAttempt({
      payload: input.payload,
      persistenceConfirmed: true,
      customerAccessEligible: true,
      conceptBriefId: input.conceptBriefId,
      publicReference: input.publicReference,
      attemptNumber: 1,
      parentJobId: null,
      repository,
      jobIdSource: dependencies.jobIdSource,
    });
    if (!reservation.ok) return;

    const workerDependencies = (
      dependencies.createWorkerDependencies ??
      createProductionAutomaticFirstPreviewWorkerDependencies
    )(repository);
    await runAutomaticFirstPreviewWorker(
      reservation.work,
      workerDependencies,
    );
  }, dependencies.schedule);

  return scheduled ? { status: "scheduled" } : { status: "not_scheduled" };
}
