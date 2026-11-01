export type InvitationAccess = Readonly<{ credential: string; partition: string }>;
export type InvitationSubmissionResult =
  | Readonly<{ state: "confirmed"; publicReference: string; conceptBriefId: string }>
  | Readonly<{ state: "unknown" | "rejected" | "conflict" | "storage_unavailable" }>;
type Pending = { id: string; digest: string; phase: "prepared" | "attempted" | "confirmed" };
const ID = /^[a-f0-9]{32}$/;
const HASH = /^[a-f0-9]{64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REF = /^NOVORA-CB-\d{8}-[A-Z0-9]{4}$/;

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)]));
  return value;
}
function metadata(value: unknown): { publicReference: string; conceptBriefId: string } | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  return typeof data.publicReference === "string" && REF.test(data.publicReference) &&
    typeof data.conceptBriefId === "string" && UUID.test(data.conceptBriefId)
    ? { publicReference: data.publicReference, conceptBriefId: data.conceptBriefId } : null;
}

/** Only correlation/hash/state are stored. The bearer stays in caller memory.
 * An attempted request is recovered by GET, never by replaying its submission.
 */
export async function submitInvitedConceptBrief(payload: Record<string, unknown>, access: InvitationAccess, dependencies: Readonly<{
  storage?: Pick<Storage, "getItem" | "setItem">;
  fetch?: typeof fetch;
  crypto?: Pick<Crypto, "subtle" | "randomUUID">;
}> = {}): Promise<InvitationSubmissionResult> {
  if (!HASH.test(access.partition) || !/^[A-Za-z0-9_-]{43,128}$/.test(access.credential)) return { state: "rejected" };
  const transport = dependencies.fetch ?? fetch;
  const key = `novora_invited_submission_v1:${access.partition}`;
  const headers = { Authorization: `Bearer ${access.credential}` };
  let storage: Pick<Storage, "getItem" | "setItem">;
  let pending: Pending;
  try {
    storage = dependencies.storage ?? window.sessionStorage;
    const cryptography = dependencies.crypto ?? globalThis.crypto;
    const bytes = new TextEncoder().encode(JSON.stringify(canonical(payload)));
    if (bytes.length > 262144) return { state: "rejected" };
    const digest = Array.from(new Uint8Array(await cryptography.subtle.digest("SHA-256", bytes)), byte => byte.toString(16).padStart(2, "0")).join("");
    const raw = storage.getItem(key);
    const previous: Pending | null = raw ? JSON.parse(raw) : null;
    if (previous && (Object.keys(previous).sort().join(",") !== "digest,id,phase" || !ID.test(previous.id) || !HASH.test(previous.digest) || !["prepared", "attempted", "confirmed"].includes(previous.phase))) return { state: "storage_unavailable" };
    if (previous?.phase === "attempted" && previous.digest !== digest) return { state: "conflict" };
    pending = previous && previous.digest === digest ? previous : {
      id: cryptography.randomUUID().replace(/-/g, ""), digest, phase: "prepared",
    };
    if (!ID.test(pending.id)) return { state: "storage_unavailable" };
    storage.setItem(key, JSON.stringify(pending));
  } catch { return { state: "storage_unavailable" }; }

  try {
    if (pending.phase !== "prepared") {
      const response = await transport(`/api/concept-briefs/receipt?id=${pending.id}`, { headers, cache: "no-store", signal: AbortSignal.timeout(15000) });
      const receipt = await response.json();
      const identity = metadata(receipt);
      if (!response.ok || !identity || !["accepted", "admission_denied", "publish_pending", "published", "UNKNOWN"].includes(receipt.status)) return { state: "unknown" };
      // Recover the existing image session through explicit server-side owned
      // receipt reauthentication. This endpoint cannot enqueue or generate.
      const authorization = await transport("/api/concept-briefs/receipt/access", {
        method: "POST", headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ clientRequestId: pending.id }), signal: AbortSignal.timeout(15000),
      });
      const result = await authorization.json();
      const recovered = metadata(result);
      if (!authorization.ok || result.ok !== true || result.persisted !== true || !recovered ||
        recovered.publicReference !== identity.publicReference || recovered.conceptBriefId !== identity.conceptBriefId) return { state: "unknown" };
      storage.setItem(key, JSON.stringify({ ...pending, phase: "confirmed" }));
      return { state: "confirmed", ...identity };
    }
    // Synchronously persist attempted before the one mutation leaves the browser.
    // If storage fails there is no request, rather than a lost correlation ID.
    storage.setItem(key, JSON.stringify({ ...pending, phase: "attempted" }));
    const response = await transport("/api/concept-briefs", {
      method: "POST", headers: { ...headers, "Content-Type": "application/json",
        "x-novora-client-request-id": pending.id, "idempotency-key": pending.id },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(15000),
    });
    const result = await response.json();
    const identity = metadata(result);
    if ([200, 201].includes(response.status) && result.ok === true && result.persisted === true && identity) {
      if (response.status === 200) {
        const authorization = await transport("/api/concept-briefs/receipt/access", {
          method: "POST", headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ clientRequestId: pending.id }), signal: AbortSignal.timeout(15000),
        });
        const recovered = await authorization.json();
        const recoveredIdentity = metadata(recovered);
        if (!authorization.ok || recovered.ok !== true || recovered.persisted !== true || !recoveredIdentity ||
          recoveredIdentity.publicReference !== identity.publicReference || recoveredIdentity.conceptBriefId !== identity.conceptBriefId) return { state: "unknown" };
      }
      storage.setItem(key, JSON.stringify({ ...pending, phase: "confirmed" }));
      return { state: "confirmed", ...identity };
    }
    if ([400, 401, 403, 404, 429].includes(response.status) && result.persisted === false) {
      storage.setItem(key, JSON.stringify({ ...pending, phase: "prepared" }));
      return { state: "rejected" };
    }
    return { state: response.status === 409 ? "conflict" : "unknown" };
  } catch { return { state: "unknown" }; }
}
