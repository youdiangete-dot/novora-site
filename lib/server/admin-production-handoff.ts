import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClientOrNull } from "./supabase";
import { readCadHandoff } from "./admin-cad-handoff";

export type ProductionHandoff = Readonly<{
  orderReference: string; decisionReference: string; handoffReference: string; recordedAt: string;
}>;
type Repository = {
  read: (orderReference: string) => Promise<unknown>;
  insert: (orderReference: string, decisionReference: string, handoffReference: string) => Promise<"inserted" | "duplicate" | "unknown">;
};
type Dependencies = { readCad: typeof readCadHandoff; repository: Repository };
const ORDER = /^NOVORA-O-[A-F0-9]{24}$/;
const REFERENCE = /^[A-Za-z0-9][A-Za-z0-9 ._/-]{0,119}$/;
const validReference = (value: unknown): value is string => typeof value === "string" && value === value.trim() && REFERENCE.test(value);

export function createProductionHandoffRepository(client: SupabaseClient): Repository {
  return {
    async read(orderReference) {
      const { data, error } = await client.from("commercial_production_handoffs")
        .select("order_reference,manual_decision_reference,handoff_reference,recorded_at")
        .eq("order_reference", orderReference).maybeSingle();
      if (error) throw new Error("Production handoff unavailable");
      return data;
    },
    async insert(orderReference, decisionReference, handoffReference) {
      try {
        const { error } = await client.from("commercial_production_handoffs").insert({
          order_reference: orderReference, manual_decision_reference: decisionReference, handoff_reference: handoffReference,
        });
        return error ? error.code === "23505" ? "duplicate" : "unknown" : "inserted";
      } catch { return "unknown"; }
    },
  };
}
function dependenciesOrNull(dependencies?: Dependencies): Dependencies | null {
  if (dependencies) return dependencies;
  const client = createSupabaseAdminClientOrNull();
  return client ? { readCad: readCadHandoff, repository: createProductionHandoffRepository(client) } : null;
}
function normalize(value: unknown, orderReference: string): ProductionHandoff | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (row.order_reference !== orderReference || !validReference(row.manual_decision_reference) || !validReference(row.handoff_reference) ||
      typeof row.recorded_at !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(row.recorded_at) || !Number.isFinite(Date.parse(row.recorded_at))) return null;
  return { orderReference, decisionReference: row.manual_decision_reference, handoffReference: row.handoff_reference, recordedAt: new Date(row.recorded_at).toISOString() };
}
// The caller must enforce the existing admin session. A CAD routing record is not production authorization.
export async function readProductionHandoff(orderReference: string, dependencies?: Dependencies) {
  try {
    if (!ORDER.test(orderReference)) return { ok: false as const };
    const d = dependenciesOrNull(dependencies);
    if (!d) return { ok: false as const };
    const cad = await d.readCad(orderReference);
    if (cad.ok === false || !cad.handoff || cad.order.orderReference !== orderReference || cad.handoff.orderReference !== orderReference) return { ok: false as const };
    const value = await d.repository.read(orderReference);
    const handoff = value === null ? null : normalize(value, orderReference);
    if (value !== null && !handoff) return { ok: false as const };
    return { ok: true as const, order: cad.order, cadHandoff: cad.handoff, handoff };
  } catch { return { ok: false as const }; }
}
export async function recordProductionHandoff(orderReference: string, input: unknown, dependencies?: Dependencies): Promise<
  "recorded" | "already_recorded" | "conflict" | "invalid" | "unavailable" | "unknown"
> {
  if (!ORDER.test(orderReference) || !input || typeof input !== "object" || Array.isArray(input)) return "invalid";
  const values = input as Record<string, unknown>;
  if (Object.keys(values).some(key => !["decisionReference", "handoffReference", "manualConfirmation"].includes(key)) ||
      values.manualConfirmation !== true || !validReference(values.decisionReference) || !validReference(values.handoffReference)) return "invalid";
  const { decisionReference, handoffReference } = values;
  const matches = (row: ProductionHandoff) => row.decisionReference === decisionReference && row.handoffReference === handoffReference;
  try {
    const d = dependenciesOrNull(dependencies);
    if (!d) return "unavailable";
    const before = await readProductionHandoff(orderReference, d);
    if (before.ok === false) return "unavailable";
    if (before.handoff) return matches(before.handoff) ? "already_recorded" : "conflict";
    let outcome: "inserted" | "duplicate" | "unknown";
    try { outcome = await d.repository.insert(orderReference, decisionReference, handoffReference); } catch { outcome = "unknown"; }
    // One attempt only. A lost write response is reconciled by reading the exact order, never resending.
    const after = await readProductionHandoff(orderReference, d);
    if (after.ok === false || !after.handoff) return "unknown";
    if (!matches(after.handoff)) return "conflict";
    return outcome === "inserted" ? "recorded" : "already_recorded";
  } catch { return "unknown"; }
}
