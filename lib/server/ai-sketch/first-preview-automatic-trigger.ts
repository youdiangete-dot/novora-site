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
  createFirstPreviewRepository,
  type FirstPreviewRepository,
} from "./first-preview-persistence";

export type AutomaticFirstPreviewTriggerResult = Readonly<{
  status: "disabled" | "scheduled" | "not_scheduled";
}>;

export type AutomaticFirstPreviewTriggerDependencies = Readonly<{
  featureFlagValue?: unknown;
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
  if (
    input.persistenceConfirmed !== true ||
    input.customerAccessProofEstablished !== true
  ) {
    return { status: "not_scheduled" };
  }

  try {
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
    if (!reservation.ok) return { status: "not_scheduled" };

    const workerDependencies = (
      dependencies.createWorkerDependencies ??
      createProductionAutomaticFirstPreviewWorkerDependencies
    )(repository);
    const scheduled = scheduleFirstPreviewPostResponseTask(
      () =>
        runAutomaticFirstPreviewWorker(
          reservation.work,
          workerDependencies,
        ).then(() => undefined),
      dependencies.schedule,
    );
    if (!scheduled) {
      if (reservation.disposition === "created") {
        await repository.recordJobFailure(reservation.work.jobId, {
          category: "lifecycle_conflict",
          retryEligible: false,
          actualCostMicros: 0,
        });
      }
      return { status: "not_scheduled" };
    }

    return { status: "scheduled" };
  } catch {
    return { status: "not_scheduled" };
  }
}
