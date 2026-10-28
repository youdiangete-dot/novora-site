import { handleCallback } from "@vercel/queue";

import { consumeFirstPreviewQueueMessage } from "../../../../lib/server/ai-sketch/first-preview-queue";

const callback = handleCallback(async (message) => {
  await consumeFirstPreviewQueueMessage(message);
});

export function POST(request: Request) {
  return callback(request);
}
