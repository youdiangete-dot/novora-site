import "server-only";
import { createHash } from "node:crypto";
import { FIRST_PREVIEW_QUEUE_TOPIC, createFirstPreviewQueueMessage } from "./first-preview-queue";
import type { FirstPreviewGenerationWork } from "./first-preview-generation-lifecycle";
import type { RevisionDispatchBinding } from "./first-preview-revision";
import { isValidFirstPreviewAssetUuid as uuid } from "./first-preview-generated-assets-contract";

export const REVISION_QUEUE_SCHEMA = "novora_source_bound_revision_v1" as const;
export type RevisionQueueEnvelope = Readonly<{ schemaVersion: typeof REVISION_QUEUE_SCHEMA; owner: RevisionDispatchBinding["owner"]; work: FirstPreviewGenerationWork }>;
export function validateRevisionQueueEnvelope(value: unknown): RevisionQueueEnvelope | null {
  try {
    const v = value as RevisionQueueEnvelope;
    if (!v || Object.keys(v).sort().join() !== "owner,schemaVersion,work" || v.schemaVersion !== REVISION_QUEUE_SCHEMA ||
      !v.owner || Object.keys(v.owner).sort().join() !== "identity,scope" || !/^[a-f0-9]{64}$/.test(v.owner.scope) ||
      !/^[A-Za-z0-9_-]{1,64}$/.test(v.owner.identity)) return null;
    const w = v.work;
    if (!w || Object.keys(w).sort().join() !== "attemptNumber,conceptBriefId,jobId,parentJobId,publicReference,sourceOutputId,structured" ||
      !uuid(w.jobId) || !uuid(w.parentJobId ?? "") || !uuid(w.sourceOutputId ?? "") ||
      !Number.isSafeInteger(w.attemptNumber) || w.attemptNumber < 2 || w.attemptNumber > 32767) return null;
    const validated = createFirstPreviewQueueMessage({ conceptBriefId: w.conceptBriefId, publicReference: w.publicReference, generationInput: w.structured });
    return validated.ok ? { schemaVersion: REVISION_QUEUE_SCHEMA, owner: { ...v.owner }, work: { ...w, structured: validated.value.generationInput } } : null;
  } catch { return null; }
}

// The existing protected Queue endpoint/topic is reused, but the explicit schema
// never falls through to initial-attempt reservation. No bearer is in the message.
export async function publishRevisionQueueEnvelope(value: RevisionQueueEnvelope, publish?: (topic: string, message: RevisionQueueEnvelope, key: string) => Promise<void>) {
  const safe = validateRevisionQueueEnvelope(value);
  if (!safe) throw new Error("REVISION_MESSAGE_REJECTED");
  const key = `revision:${createHash("sha256").update(JSON.stringify([safe.owner.scope, safe.owner.identity, safe.work.jobId, safe.work.sourceOutputId,
    safe.work.structured.designSpecSha256, safe.work.structured.handSketchInstructionSha256])).digest("hex")}`;
  if (publish) return publish(FIRST_PREVIEW_QUEUE_TOPIC, safe, key);
  // Deliberately let transport uncertainty reach prepare(); no repeat send.
  const { send } = await import("@vercel/queue");
  await send(FIRST_PREVIEW_QUEUE_TOPIC, safe, { idempotencyKey: key });
}

export async function consumeRevisionQueueEnvelope(value: unknown, createService: (envelope: RevisionQueueEnvelope) => Promise<{ execute(work: FirstPreviewGenerationWork): Promise<unknown> } | null>) {
  const safe = validateRevisionQueueEnvelope(value);
  if (!safe) return { status: "acknowledged", disposition: "invalid_message" } as const;
  try {
    const service = await createService(safe);
    if (!service) return { status: "acknowledged", disposition: "permanent_failure" } as const;
    const result = await service.execute(safe.work) as { status?: unknown } | null;
    // service/worker own the durable claim; Queue redelivery cannot re-dispatch.
    return { status: "acknowledged", disposition: result?.status === "delivered" ? "completed" : "terminal_failure" } as const;
  } catch { return { status: "acknowledged", disposition: "terminal_failure" } as const; }
}
