import { handleCallback } from "@vercel/queue";

import { consumeFirstPreviewQueueMessage } from "../../../../lib/server/ai-sketch/first-preview-queue";
import { consumeRevisionQueueEnvelope, REVISION_QUEUE_SCHEMA } from "../../../../lib/server/ai-sketch/first-preview-revision-queue";
import { createProductionRevisionQueueService } from "../../../../lib/server/ai-sketch/first-preview-revision-runtime";

const callback = handleCallback(async (message) => {
  if (message && typeof message === "object" && "schemaVersion" in message && message.schemaVersion === REVISION_QUEUE_SCHEMA) {
    await consumeRevisionQueueEnvelope(message, createProductionRevisionQueueService);
    return;
  }
  await consumeFirstPreviewQueueMessage(message);
});

export function POST(request: Request) {
  return callback(request);
}
