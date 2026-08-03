import "server-only";

export const FIRST_PREVIEW_PRICING_ASSUMPTION_VERSION =
  "openai-gpt-image-2-2026-04-21-standard-1024x1024-medium-2026-08-03-v1" as const;

export const FIRST_PREVIEW_COST_CONTRACT = {
  estimatedCostMicros: 100_000,
  perAttemptReservationLimitMicros: 100_000,
  lifetimeBudgetPerConceptBriefMicros: 200_000,
  maximumAttempts: 2,
  currency: "USD",
  textInputTokenCostMicros: 5,
  imageOutputTokenCostMicros: 30,
} as const;

export type FirstPreviewValidatedUsage = Readonly<{
  textInputTokens: number;
  imageOutputTokens: number;
}>;

export type FirstPreviewCostReconciliation = Readonly<{
  actualCostMicros: number;
  usageTrusted: boolean;
}>;

function isNonnegativeSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

export function calculateFirstPreviewActualCostMicros(
  usage: FirstPreviewValidatedUsage,
): number | null {
  if (
    !isNonnegativeSafeInteger(usage.textInputTokens) ||
    !isNonnegativeSafeInteger(usage.imageOutputTokens)
  ) {
    return null;
  }

  const calculated = Math.ceil(
    usage.textInputTokens *
      FIRST_PREVIEW_COST_CONTRACT.textInputTokenCostMicros +
      usage.imageOutputTokens *
        FIRST_PREVIEW_COST_CONTRACT.imageOutputTokenCostMicros,
  );

  return Number.isSafeInteger(calculated) && calculated >= 0
    ? calculated
    : null;
}

export function reconcileFirstPreviewActualCost(input: {
  dispatched: boolean;
  usage: FirstPreviewValidatedUsage | null;
}): FirstPreviewCostReconciliation {
  if (!input.dispatched) {
    return { actualCostMicros: 0, usageTrusted: false };
  }

  const calculated = input.usage
    ? calculateFirstPreviewActualCostMicros(input.usage)
    : null;

  return calculated === null
    ? {
        actualCostMicros: FIRST_PREVIEW_COST_CONTRACT.estimatedCostMicros,
        usageTrusted: false,
      }
    : { actualCostMicros: calculated, usageTrusted: true };
}

export function evaluateFirstPreviewAttemptBudget(input: {
  attemptNumber: unknown;
  parentActualCostMicros: unknown;
}): Readonly<{
  allowed: boolean;
  reservedCostMicros: number;
  accountedLifetimeCostMicros: number | null;
}> {
  const reservedCostMicros =
    FIRST_PREVIEW_COST_CONTRACT.perAttemptReservationLimitMicros;

  if (input.attemptNumber === 1) {
    return {
      allowed: true,
      reservedCostMicros,
      accountedLifetimeCostMicros: reservedCostMicros,
    };
  }

  if (
    input.attemptNumber !== 2 ||
    !isNonnegativeSafeInteger(input.parentActualCostMicros)
  ) {
    return {
      allowed: false,
      reservedCostMicros,
      accountedLifetimeCostMicros: null,
    };
  }

  const lifetimeCost = input.parentActualCostMicros + reservedCostMicros;
  const allowed =
    Number.isSafeInteger(lifetimeCost) &&
    lifetimeCost <=
      FIRST_PREVIEW_COST_CONTRACT.lifetimeBudgetPerConceptBriefMicros;

  return {
    allowed,
    reservedCostMicros,
    accountedLifetimeCostMicros: Number.isSafeInteger(lifetimeCost)
      ? lifetimeCost
      : null,
  };
}

export function firstPreviewActualCostExceedsReservation(
  actualCostMicros: number,
): boolean {
  return (
    isNonnegativeSafeInteger(actualCostMicros) &&
    actualCostMicros >
      FIRST_PREVIEW_COST_CONTRACT.perAttemptReservationLimitMicros
  );
}
