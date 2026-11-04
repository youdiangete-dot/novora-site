import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClientOrNull } from "./supabase";
import { readProductionHandoff } from "./admin-production-handoff";

export type DeliveryHandoff = Readonly<{ orderReference: string; deliveryReference: string; recordedAt: string }>;
type Repository = {
  read(orderReference: string): Promise<unknown>;
  insert(orderReference: string, deliveryReference: string): Promise<"inserted" | "duplicate" | "unknown">;
};
type Dependencies = { readProduction: typeof readProductionHandoff; repository: Repository };
const ORDER = /^NOVORA-O-[A-F0-9]{24}$/;
const REFERENCE = /^[A-Za-z0-9][A-Za-z0-9 ._/-]{0,119}$/;
export function createDeliveryHandoffRepository(client: SupabaseClient): Repository {
  return {
    async read(orderReference) {
      const { data, error } = await client.from("commercial_delivery_handoffs").select("order_reference,delivery_reference,recorded_at").eq("order_reference", orderReference).maybeSingle();
      if (error) throw new Error("Delivery handoff unavailable");
      return data;
    },
    async insert(orderReference, deliveryReference) {
      try {
        const { error } = await client.from("commercial_delivery_handoffs").insert({ order_reference: orderReference, delivery_reference: deliveryReference });
        return error ? error.code === "23505" ? "duplicate" : "unknown" : "inserted";
      } catch { return "unknown"; }
    },
  };
}
function dependenciesOrNull(dependencies?: Dependencies): Dependencies | null {
  if (dependencies) return dependencies;
  const client = createSupabaseAdminClientOrNull();
  return client ? { readProduction: readProductionHandoff, repository: createDeliveryHandoffRepository(client) } : null;
}
function normalize(value: unknown, orderReference: string): DeliveryHandoff | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (row.order_reference !== orderReference || typeof row.delivery_reference !== "string" ||
      row.delivery_reference !== row.delivery_reference.trim() || !REFERENCE.test(row.delivery_reference) ||
      typeof row.recorded_at !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(row.recorded_at) || !Number.isFinite(Date.parse(row.recorded_at))) return null;
  return { orderReference, deliveryReference: row.delivery_reference, recordedAt: new Date(row.recorded_at).toISOString() };
}
// Existing protected admin authorization is required at the caller. No carrier or customer action is sent.
export async function readDeliveryHandoff(orderReference: string, dependencies?: Dependencies) {
  try {
    if (!ORDER.test(orderReference)) return { ok: false as const };
    const d = dependenciesOrNull(dependencies);
    if (!d) return { ok: false as const };
    const production = await d.readProduction(orderReference);
    if (production.ok === false || !production.handoff || production.order.orderReference !== orderReference || production.handoff.orderReference !== orderReference) return { ok: false as const };
    const value = await d.repository.read(orderReference), handoff = value === null ? null : normalize(value, orderReference);
    if (value !== null && !handoff) return { ok: false as const };
    return { ok: true as const, order: production.order, productionHandoff: production.handoff, handoff };
  } catch { return { ok: false as const }; }
}
export async function recordDeliveryHandoff(orderReference: string, input: unknown, dependencies?: Dependencies): Promise<
  "recorded" | "already_recorded" | "conflict" | "invalid" | "unavailable" | "unknown"
> {
  if (!ORDER.test(orderReference) || !input || typeof input !== "object" || Array.isArray(input)) return "invalid";
  const values = input as Record<string, unknown>;
  if (Object.keys(values).some(key => !["deliveryReference", "manualConfirmation"].includes(key)) || values.manualConfirmation !== true ||
      typeof values.deliveryReference !== "string" || values.deliveryReference !== values.deliveryReference.trim() || !REFERENCE.test(values.deliveryReference)) return "invalid";
  const reference = values.deliveryReference;
  try {
    const d = dependenciesOrNull(dependencies);
    if (!d) return "unavailable";
    const before = await readDeliveryHandoff(orderReference, d);
    if (before.ok === false) return "unavailable";
    if (before.handoff) return before.handoff.deliveryReference === reference ? "already_recorded" : "conflict";
    let outcome: "inserted" | "duplicate" | "unknown";
    try { outcome = await d.repository.insert(orderReference, reference); } catch { outcome = "unknown"; }
    // One write attempt only. Reconcile an uncertain response through exact persisted readback.
    const after = await readDeliveryHandoff(orderReference, d);
    if (after.ok === false || !after.handoff) return "unknown";
    if (after.handoff.deliveryReference !== reference) return "conflict";
    return outcome === "inserted" ? "recorded" : "already_recorded";
  } catch { return "unknown"; }
}
