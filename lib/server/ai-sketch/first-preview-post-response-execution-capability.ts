import "server-only";

export const FIRST_PREVIEW_POST_RESPONSE_EXECUTION_CONFIRMED_ENV =
  "NOVORA_FIRST_PREVIEW_POST_RESPONSE_EXECUTION_CONFIRMED" as const;
export const FIRST_PREVIEW_POST_RESPONSE_EXECUTION_CONFIRMED_VALUE =
  "true" as const;

export function isFirstPreviewPostResponseExecutionConfirmed(
  value: unknown =
    process.env[FIRST_PREVIEW_POST_RESPONSE_EXECUTION_CONFIRMED_ENV],
): boolean {
  return value === FIRST_PREVIEW_POST_RESPONSE_EXECUTION_CONFIRMED_VALUE;
}
