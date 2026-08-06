import { handleCallback } from "@vercel/queue";

import { consumeFirstPreviewQueueMessage } from "../../../../lib/server/ai-sketch/first-preview-queue";

export const POST = handleCallback(async (message) => {
  await consumeFirstPreviewQueueMessage(message);
});
