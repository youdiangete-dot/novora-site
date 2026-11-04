import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClientOrNull } from "./supabase";
import { readAdminCommercialOrder } from "./admin-commercial-orders";

export type CadHandoff = Readonly<{ orderReference: string; handoffReference: string; recordedAt: string }>;
type Repository = {
  read: (orderReference: string) => Promise<unknown>;
  insert: (orderReference: string, handoffReference: string) => Promise<"inserted" | "duplicate" | "unknown">;
};
type Dependencies = { readOrder: typeof readAdminCommercialOrder; repository: Repository };
const ORDER = /^NOVORA-O-[A-F0-9]{24}$/;
const REFERENCE = /^[A-Za-z0-9][A-Za-z0-9 ._/-]{0,119}$/;

export function createCadHandoffRepository(client: SupabaseClient): Repository {
  return {
    async read(orderReference) {
      const { data, error } = await client.from("commercial_cad_handoffs")
        .select("order_reference,handoff_reference,recorded_at")
        .eq("order_reference", orderReference).maybeSingle();
      if (error) throw new Error("CAD handoff unavailable");
      return data;
    },
    async insert(orderReference, handoffReference) {
      try {
        const { error } = await client.from("commercial_cad_handoffs").insert({
          order_reference: orderReference, handoff_reference: handoffReference,
        });
        return error ? error.code === "23505" ? "duplicate" : "unknown" : "inserted";
      } catch { return "unknown"; }
    },
  };
}
function dependenciesOrNull(dependencies?: Dependencies): Dependencies | null {
  if (dependencies) return dependencies;
  const client = createSupabaseAdminClientOrNull();
  return client ? { readOrder: readAdminCommercialOrder, repository: createCadHandoffRepository(client) } : null;
}
function normalize(value: unknown, orderReference: string): CadHandoff | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (row.order_reference !== orderReference || typeof row.handoff_reference !== "string" ||
      !REFERENCE.test(row.handoff_reference) || row.handoff_reference !== row.handoff_reference.trim() ||
      typeof row.recorded_at !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(row.recorded_at) || !Number.isFinite(Date.parse(row.recorded_at))) return null;
  return { orderReference, handoffReference: row.handoff_reference, recordedAt: new Date(row.recorded_at).toISOString() };
}

// These server-only functions require the existing protected admin session at the caller.
export async function readCadHandoff(orderReference: string, dependencies?: Dependencies) {
  try {
    const d = dependenciesOrNull(dependencies);
    if (!ORDER.test(orderReference) || !d) return { ok: false as const };
    const order = await d.readOrder(orderReference);
    if (!order.ok || !order.order) return { ok: false as const };
    const value = await d.repository.read(orderReference);
    const handoff = value === null ? null : normalize(value, orderReference);
    if (value !== null && !handoff) return { ok: false as const };
    return { ok: true as const, order: order.order, handoff };
  } catch { return { ok: false as const }; }
}

export async function recordCadHandoff(orderReference: string, handoffReference: unknown, dependencies?: Dependencies): Promise<
  "recorded" | "already_recorded" | "conflict" | "invalid" | "unavailable" | "unknown"
> {
  if (!ORDER.test(orderReference) || typeof handoffReference !== "string" ||
      handoffReference !== handoffReference.trim() || !REFERENCE.test(handoffReference)) return "invalid";
  try {
    const d = dependenciesOrNull(dependencies);
    if (!d) return "unavailable";
    const before = await readCadHandoff(orderReference, d);
    if (before.ok === false) return "unavailable";
    if (before.handoff) return before.handoff.handoffReference === handoffReference ? "already_recorded" : "conflict";
    // Exactly one insertion attempt. On an uncertain response, only read back; never resend.
    let outcome: "inserted" | "duplicate" | "unknown";
    try { outcome = await d.repository.insert(orderReference, handoffReference); } catch { outcome = "unknown"; }
    const after = await readCadHandoff(orderReference, d);
    if (after.ok === false || !after.handoff) return "unknown";
    if (after.handoff.handoffReference !== handoffReference) return "conflict";
    return outcome === "inserted" ? "recorded" : "already_recorded";
  } catch { return "unknown"; }
}
