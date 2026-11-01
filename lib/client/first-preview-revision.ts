import { readRevisionDirectives, type RevisionDirective } from "../first-preview-revision-directives";
import type { InvitationAccess } from "./invitation-submission";
type Request = Readonly<{ publicReference: string; sourceOutputId: string; provider: "manual_test" | "paypal_sandbox";
  directives: readonly RevisionDirective[]; binding: string }>;
type Pending = { operationId: string; sourceOutputId: string; provider: Request["provider"]; directives: RevisionDirective[]; state: "attempted" | "ready" | "failed" };
export type RevisionBrowserResult = Readonly<{ status: "pending" | "unknown" | "ready" | "failed" | "denied" | "storage_unavailable"; operationId?: string; outputId?: string }>;
const uuid = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value);

// Store only nonsecret correlation/closed directive codes. A saved attempt is
// read back even when the caller changes selections; no automatic POST replay.
export async function requestBrowserRevision(input: Request, access: InvitationAccess, dependencies: Readonly<{
  storage?: Pick<Storage, "getItem" | "setItem">; fetch?: typeof fetch; randomUUID?: () => string;
}> = {}): Promise<RevisionBrowserResult> {
  if (!/^[a-f0-9]{64}$/.test(access.partition) || !/^[A-Za-z0-9_-]{43,128}$/.test(access.credential) ||
    !/^NOVORA-CB-\d{8}-[A-Z0-9]{4}$/.test(input.publicReference) || !uuid(input.sourceOutputId) || !readRevisionDirectives(input.directives) ||
    !["manual_test", "paypal_sandbox"].includes(input.provider)) return { status: "denied" };
  let storage: Pick<Storage, "getItem" | "setItem">;
  const transport = dependencies.fetch ?? fetch;
  const key = `novora_revision_v1:${access.partition}:${input.publicReference}`;
  let pending: Pending, readOnly = false;
  try {
    storage = dependencies.storage ?? window.sessionStorage;
    const raw = storage.getItem(key), saved = raw ? JSON.parse(raw) : null;
    if (saved && (Object.keys(saved).sort().join() !== "directives,operationId,provider,sourceOutputId,state" ||
      !uuid(saved.operationId) || !uuid(saved.sourceOutputId) || !readRevisionDirectives(saved.directives) ||
      !["manual_test", "paypal_sandbox"].includes(saved.provider) || !["attempted", "ready", "failed"].includes(saved.state))) return { status: "storage_unavailable" };
    readOnly = Boolean(saved && (saved.state === "attempted" || (saved.state === "ready" && saved.sourceOutputId === input.sourceOutputId)));
    pending = readOnly ? saved : { operationId: (dependencies.randomUUID ?? (() => crypto.randomUUID()))(), sourceOutputId: input.sourceOutputId,
      provider: input.provider, directives: [...input.directives], state: "attempted" };
    if (!uuid(pending.operationId)) return { status: "storage_unavailable" };
    // Failure to save means no mutation leaves this browser.
    storage.setItem(key, JSON.stringify(pending));
  } catch { return { status: "storage_unavailable" }; }
  const url = `/api/first-preview-revisions/${encodeURIComponent(input.publicReference)}`;
  const headers = { Authorization: `Bearer ${access.credential}`, "Content-Type": "application/json" };
  try {
    if (!readOnly) {
      const submitted = await transport(url, { method: "POST", headers, cache: "no-store", signal: AbortSignal.timeout(15000),
        body: JSON.stringify({ operationId: pending.operationId, sourceOutputId: pending.sourceOutputId, provider: pending.provider, directives: pending.directives, binding: input.binding }) });
      const acknowledgement = await submitted.json();
      if (!submitted.ok || !["accepted", "existing", "unknown"].includes(acknowledgement.status) ||
        (acknowledgement.operationId !== undefined && acknowledgement.operationId !== pending.operationId)) return { status: "unknown", operationId: pending.operationId };
    }
    const query = new URLSearchParams({ operationId: pending.operationId, sourceOutputId: pending.sourceOutputId, provider: pending.provider });
    const response = await transport(`${url}?${query}`, { headers, cache: "no-store", signal: AbortSignal.timeout(15000) });
    const result = await response.json();
    if (!response.ok || result.operationId !== pending.operationId) return { status: "unknown", operationId: pending.operationId };
    if (result.status === "ready" && uuid(result.outputId)) {
      storage.setItem(key, JSON.stringify({ ...pending, state: "ready" }));
      return { status: "ready", operationId: pending.operationId, outputId: result.outputId };
    }
    if (result.status === "failed") {
      storage.setItem(key, JSON.stringify({ ...pending, state: "failed" }));
      return { status: "failed", operationId: pending.operationId };
    }
    return { status: result.status === "pending" ? "pending" : "unknown", operationId: pending.operationId };
  } catch { return { status: "unknown", operationId: pending.operationId }; }
}
