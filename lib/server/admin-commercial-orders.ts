import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClientOrNull } from "./supabase";
import { commercialAmountToMinorUnits, getCommercialCurrencyMinorUnitExponent } from "./commercial-currency";
import { buildCommercialQuotationSnapshot, hashCommercialQuotationSnapshot, normalizeCommercialQuotationInput } from "./commercial-quotation";
import { isValidFirstPreviewAssetUuid, isValidFirstPreviewPublicReference } from "./ai-sketch/first-preview-generated-assets-contract";

export type AdminCommercialOrder = Readonly<{
  orderReference: string; quoteReference: string; conceptBriefId: string;
  publicReference: string; currency: string; amount: string; recordedAt: string;
}>;
type Dependencies = { readRows: () => Promise<unknown> };
type Result = { ok: true; orders: AdminCommercialOrder[]; hasMore: boolean } | { ok: false; orders: []; hasMore: false };
const LIMIT = 25;
const SELECT = `order_reference,order_version,commercial_payment_reference,commercial_quotation_reference,amount_minor,currency,created_at,
payment:commercial_payments!commercial_orders_commercial_payment_reference_fkey(payment_reference,commercial_quotation_reference,payment_version,status,amount_minor,currency,paid_at),
quotation:commercial_quotations!commercial_orders_commercial_quotation_reference_fkey(quote_reference,commercial_specification_confirmation_id,quotation_version,quotation_snapshot,quotation_sha256,
specification:commercial_specification_confirmations!commercial_quotations_specification_confirmation_fkey(id,concept_brief_id,ai_sketch_output_id,
brief:concept_briefs!commercial_specification_confirmations_brief_fkey(id,public_reference),
output:ai_sketch_outputs!commercial_specification_confirmations_output_brief_fkey(id,concept_brief_id)))`;

export function createAdminCommercialOrderReader(supabase: SupabaseClient): Dependencies["readRows"] {
  return async () => {
    const { data, error } = await supabase.from("commercial_orders").select(SELECT)
      .order("created_at", { ascending: false }).order("id", { ascending: false }).limit(LIMIT + 1);
    if (error) throw new Error("Order data unavailable");
    return data;
  };
}
function record(value: unknown): Record<string, any> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : null;
}
function minor(value: unknown): number | null {
  if (typeof value === "string" && /^(0|[1-9]\d*)$/.test(value)) value = Number(value);
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}
function time(value: unknown): string | null {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;
}
function normalize(value: unknown): AdminCommercialOrder | null {
  const o = record(value), p = record(o?.payment), q = record(o?.quotation), s = record(q?.specification);
  const b = record(s?.brief), output = record(s?.output), snapshot = record(q?.quotation_snapshot);
  if (!o || !p || !q || !s || !b || !output || !snapshot ||
      typeof o.order_reference !== "string" || !/^NOVORA-O-[A-F0-9]{24}$/.test(o.order_reference) || o.order_version !== "commercial_order_v1" ||
      !/^NOVORA-P-[A-F0-9]{24}$/.test(o.commercial_payment_reference) ||
      !/^NOVORA-Q-[A-F0-9]{24}$/.test(o.commercial_quotation_reference) ||
      p.payment_reference !== o.commercial_payment_reference || p.commercial_quotation_reference !== o.commercial_quotation_reference ||
      p.payment_version !== "commercial_payment_v1" || p.status !== "paid" || !time(p.paid_at) ||
      q.quote_reference !== o.commercial_quotation_reference || q.quotation_version !== "commercial_quotation_v1" || snapshot.quotationVersion !== "commercial_quotation_v1" ||
      !isValidFirstPreviewAssetUuid(s.id) || q.commercial_specification_confirmation_id !== s.id || !isValidFirstPreviewAssetUuid(s.concept_brief_id) || !isValidFirstPreviewAssetUuid(s.ai_sketch_output_id) ||
      b.id !== s.concept_brief_id || output.id !== s.ai_sketch_output_id || output.concept_brief_id !== b.id ||
      !isValidFirstPreviewPublicReference(b.public_reference)) return null;
  const amount = minor(o.amount_minor), exponent = getCommercialCurrencyMinorUnitExponent(o.currency), at = time(o.created_at);
  const input = normalizeCommercialQuotationInput({ currency: snapshot.currency, lineItems: snapshot.lineItems, validUntil: snapshot.validUntil, note: snapshot.note });
  if (amount === null || exponent === null || !at || minor(p.amount_minor) !== amount || p.currency !== o.currency || !input) return null;
  const canonical = buildCommercialQuotationSnapshot(input);
  if (canonical.currency !== o.currency || canonical.totalAmount !== snapshot.totalAmount ||
      commercialAmountToMinorUnits(canonical.totalAmount, canonical.currency) !== amount ||
      hashCommercialQuotationSnapshot(canonical) !== q.quotation_sha256) return null;
  const digits = String(amount).padStart(exponent + 1, "0");
  return { orderReference: o.order_reference, quoteReference: q.quote_reference, conceptBriefId: b.id,
    publicReference: b.public_reference, currency: o.currency,
    amount: exponent ? digits.slice(0, -exponent) + "." + digits.slice(-exponent) : digits, recordedAt: at };
}

// Caller must enforce the existing admin session before invoking this server-only reader.
// Historical paid orders remain visible after a different preview becomes current.
export async function readAdminCommercialOrders(dependencies?: Dependencies): Promise<Result> {
  try {
    const client = dependencies ? null : createSupabaseAdminClientOrNull();
    if (!dependencies && !client) return { ok: false, orders: [], hasMore: false };
    const rows = await (dependencies?.readRows ?? createAdminCommercialOrderReader(client!))();
    if (!Array.isArray(rows) || rows.length > LIMIT + 1) return { ok: false, orders: [], hasMore: false };
    const orders = rows.map(normalize);
    if (orders.some(o => o === null) || new Set(orders.map(o => o!.orderReference)).size !== orders.length ||
        new Set(orders.map(o => o!.quoteReference)).size !== orders.length) return { ok: false, orders: [], hasMore: false };
    return { ok: true, orders: orders.slice(0, LIMIT) as AdminCommercialOrder[], hasMore: rows.length > LIMIT };
  } catch {
    return { ok: false, orders: [], hasMore: false };
  }
}
