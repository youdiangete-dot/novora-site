import "server-only";
import { createHash } from "node:crypto";
import { generateConceptBriefPublicReferencePreview, type ConceptBriefSubmissionPayload } from "../concept-brief-validation";
import { createSupabaseAdminClientOrNull } from "../supabase";

type Scope = Readonly<{ identity: string; scope: string }>;
type Stage = "accepted" | "admission_denied" | "publish_pending" | "published" | "UNKNOWN";
type Reason = "feature_disabled" | "queue_execution_disabled" | "eligibility_rejected" | "beta_admission_denied" | "queue_message_rejected" | "structured_input_rejected" | "UNKNOWN" | "enqueued";
export type ScopedReceipt = Readonly<{ briefId: string; reference: string; stage: Stage; reason: Reason | null }>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REF = /^NOVORA-CB-\d{8}-[A-Z0-9]{4}$/;
const STAGES = new Set<Stage>(["accepted", "admission_denied", "publish_pending", "published", "UNKNOWN"]);
const REASONS = new Set<Reason>(["feature_disabled", "queue_execution_disabled", "eligibility_rejected", "beta_admission_denied", "queue_message_rejected", "structured_input_rejected", "UNKNOWN", "enqueued"]);
export const isClientRequestId = (id: unknown): id is string => typeof id === "string" && /^[a-f0-9]{32}$/.test(id);
function record(v: unknown): Record<string, unknown> { return v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {}; }
function text(v: unknown): string | null { return typeof v === "string" && v.trim() ? v.trim() : null; }
function canonical(v: unknown, depth = 0): unknown {
  if (depth > 32) throw new Error("invalid");
  if (v === null || typeof v === "string" || typeof v === "boolean" || (typeof v === "number" && Number.isFinite(v))) return v;
  if (Array.isArray(v)) return v.map(x => canonical(x, depth + 1));
  if (!v || typeof v !== "object" || Object.getPrototypeOf(v) !== Object.prototype) throw new Error("invalid");
  return Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical((v as Record<string, unknown>)[k], depth + 1)]));
}
export function submissionDigest(payload: unknown): string | null {
  try { const bytes = JSON.stringify(canonical(payload)); return Buffer.byteLength(bytes, "utf8") <= 262144 ? createHash("sha256").update(bytes).digest("hex") : null; } catch { return null; }
}
function rows(payload: ConceptBriefSubmissionPayload) {
  const brief = { ...record(payload.brief), ...record(payload.conceptBrief) }, contact = record(payload.contact);
  const get = (k: string) => text((payload as Record<string, unknown>)[k] ?? brief[k]);
  const getContact = (k: string) => text((payload as Record<string, unknown>)[k] ?? contact[k]);
  const reference = generateConceptBriefPublicReferencePreview();
  return { brief: { public_reference: reference, piece_type: get("pieceType"), branch: get("branch"), structure: get("structure"), sub_structure: get("subStructure"), design_objective: get("designObjective") ?? get("emotionalStory") ?? get("customSymbol"), ai_sketch_instruction: get("aiSketchInstruction"), brief_payload: payload, summary_items: payload.summaryItems ?? brief.summaryItems ?? null, api_submission: { submitted_at: new Date().toISOString(), public_reference: reference, payload } }, contact: { customer_name: getContact("customerName"), customer_email: getContact("customerEmail"), phone_whatsapp: text(payload.phoneOrWhatsApp) ?? getContact("customerPhone"), country_region: text(payload.countryOrRegion) ?? getContact("customerCountry"), contact_note: getContact("contactNote") } };
}
function parseReceipt(v: unknown): ScopedReceipt | null {
  const r = record(v), stage = r.stage;
  return typeof r.brief_id === "string" && UUID.test(r.brief_id) && typeof r.reference === "string" && REF.test(r.reference) && typeof stage === "string" && STAGES.has(stage as Stage) && (r.reason === null || (typeof r.reason === "string" && REASONS.has(r.reason as Reason))) ? { briefId: r.brief_id, reference: r.reference, stage: stage as Stage, reason: r.reason as Reason | null } : null;
}
function args(scope: Scope, requestId: string) { return { p_scope: scope.scope, p_identity: scope.identity, p_request: requestId }; }
export async function createScopedReceipt(scope: Scope, requestId: string, payload: ConceptBriefSubmissionPayload): Promise<{ outcome: "created" | "existing"; receipt: ScopedReceipt } | { outcome: "conflict" | "unavailable" }> {
  const digest = submissionDigest(payload), db = createSupabaseAdminClientOrNull();
  if (!digest || !db || !isClientRequestId(requestId)) return { outcome: "unavailable" };
  try { const data = rows(payload); const r = await db.rpc("m2_create_scoped_receipt", { ...args(scope, requestId), p_digest: digest, p_brief: data.brief, p_contact: data.contact });
    if (r.error || !Array.isArray(r.data) || r.data.length !== 1) return { outcome: "unavailable" };
    const item = record(r.data[0]); if (item.outcome === "conflict") return { outcome: "conflict" };
    const receipt = parseReceipt(item); if (!receipt || (item.outcome !== "created" && item.outcome !== "existing")) return { outcome: "unavailable" };
    return { outcome: item.outcome, receipt };
  } catch { return { outcome: "unavailable" }; }
}
export async function readScopedReceipt(scope: Scope, requestId: string): Promise<ScopedReceipt | null> {
  const db = createSupabaseAdminClientOrNull(); if (!db || !isClientRequestId(requestId)) return null;
  try { const r = await db.rpc("m2_read_scoped_receipt", args(scope, requestId)); return !r.error && Array.isArray(r.data) && r.data.length === 1 ? parseReceipt(r.data[0]) : null; } catch { return null; }
}
export async function claimScopedPublish(scope: Scope, requestId: string): Promise<boolean> {
  const db = createSupabaseAdminClientOrNull(); if (!db) return false;
  try { const r = await db.rpc("m2_claim_scoped_publish", args(scope, requestId)); return !r.error && r.data === true; } catch { return false; }
}
export async function finishScopedPublish(scope: Scope, requestId: string, stage: "admission_denied" | "published" | "UNKNOWN", reason: Reason): Promise<boolean> {
  const db = createSupabaseAdminClientOrNull(); if (!db) return false;
  try { const r = await db.rpc("m2_finish_scoped_publish", { ...args(scope, requestId), p_stage: stage, p_reason: reason }); return !r.error && r.data === true; } catch { return false; }
}
