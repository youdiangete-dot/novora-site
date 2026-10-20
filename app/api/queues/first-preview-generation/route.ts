import { handleCallback } from "@vercel/queue";

import { consumeFirstPreviewQueueMessage } from "../../../../lib/server/ai-sketch/first-preview-queue";

class QueueEnvironmentDeniedError extends Error {}

function isProductionQueueRuntime(): boolean {
  const { VERCEL_ENV, VERCEL_TARGET_ENV, NODE_ENV } = process.env;
  return (
    VERCEL_ENV === "production" &&
    NODE_ENV === "production" &&
    // VERCEL_ENV is the existing discriminator. Reject a contradictory target
    // when supplied, without requiring this newer signal on older deployments.
    (VERCEL_TARGET_ENV === undefined || VERCEL_TARGET_ENV === "production")
  );
}

export const POST = handleCallback(
  async (message) => {
    // Check at invocation time, before the consumer can construct a repository.
    // There is no approved Preview execution contract for this callback.
    if (!isProductionQueueRuntime()) {
      throw new QueueEnvironmentDeniedError("Queue execution is not authorized.");
    }
    await consumeFirstPreviewQueueMessage(message);
  },
  {
    retry(error) {
      if (error instanceof QueueEnvironmentDeniedError) {
        // Defer without acknowledging or extending retention. One hour is the
        // SDK's maximum visibility interval; existing TTL/retry budgets remain.
        return { afterSeconds: 3_600 };
      }
      // Preserve the SDK's existing default for Production processing failures.
      return undefined;
    },
  },
);
