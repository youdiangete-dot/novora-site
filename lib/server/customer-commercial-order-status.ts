import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClientOrNull } from "./supabase";
import { readAdminCommercialOrders } from "./admin-commercial-orders";
import { authenticateScopedReceiptRequest, isScopedReceiptOwnerActive } from "./ai-sketch/beta-admission";
import { isValidFirstPreviewAssetUuid, isValidFirstPreviewPublicReference } from "./ai-sketch/first-preview-generated-assets-contract";

type Owner = Readonly<{ scope: string; identity: string }>;
type Receipt = Readonly<{ briefId: string; publicReference: string }>;
export type CustomerOrderRecord = Readonly<{
  orderReference: string; recordedAt: string; cadHandoffRecordedAt: string | null; productionHandoffRecordedAt: string | null;
}>;
type Repository = {
  ownedReceipt(owner: Owner, publicReference: string): Promise<Receipt | null>;
  orders(briefId: string): Promise<unknown>;
};
// Inner joins make the owner-bound Brief filter constrain root order rows.
// Optional handoffs remain left joins so absence is distinct from query failure.
const SELECT = `order_reference,order_version,commercial_payment_reference,commercial_quotation_reference,amount_minor,currency,created_at,
payment:commercial_payments!commercial_orders_commercial_payment_reference_fkey(payment_reference,commercial_quotation_reference,payment_version,status,amount_minor,currency,paid_at),
quotation:commercial_quotations!commercial_orders_commercial_quotation_reference_fkey!inner(quote_reference,commercial_specification_confirmation_id,quotation_version,quotation_snapshot,quotation_sha256,
specification:commercial_specification_confirmations!commercial_quotations_specification_confirmation_fkey!inner(id,concept_brief_id,ai_sketch_output_id,
brief:concept_briefs!commercial_specification_confirmations_brief_fkey(id,public_reference),
output:ai_sketch_outputs!commercial_specification_confirmations_output_brief_fkey(id,concept_brief_id))),
cad:commercial_cad_handoffs!commercial_cad_handoffs_order_reference_fkey(order_reference,recorded_at,
production:commercial_production_handoffs!commercial_production_handoffs_order_reference_fkey(order_reference,recorded_at))`;

export function createCustomerOrderStatusRepository(client: () => SupabaseClient): Repository {
  return {
    async ownedReceipt(owner, publicReference) {
      const { data, error } = await client().from("m2_scoped_submission_receipts").select("concept_brief_id,public_reference")
        .eq("scope_sha256", owner.scope).eq("invitation_identity", owner.identity).eq("public_reference", publicReference).limit(2);
      if (error || data?.length !== 1) return null;
      return { briefId: data[0].concept_brief_id, publicReference: data[0].public_reference };
    },
    async orders(briefId) {
      const { data, error } = await client().from("commercial_orders").select(SELECT)
        .eq("quotation.specification.concept_brief_id", briefId)
        .order("created_at", { ascending: false }).order("id", { ascending: false }).limit(26);
      if (error) throw new Error("Order records unavailable");
      return data;
    },
  };
}
const object = (v: unknown): Record<string, any> | null => v !== null && typeof v === "object" && !Array.isArray(v) ? v as Record<string, any> : null;
function at(value: unknown): string | null {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;
}
function safeStatus(value: unknown, receipt: Receipt): CustomerOrderRecord | null {
  const row = object(value), spec = object(object(row?.quotation)?.specification), brief = object(spec?.brief);
  if (!row || spec?.concept_brief_id !== receipt.briefId || brief?.id !== receipt.briefId || brief?.public_reference !== receipt.publicReference) return null;
  const recordedAt = at(row.created_at);
  if (!recordedAt) return null;
  if (row.cad === null) return { orderReference: row.order_reference, recordedAt, cadHandoffRecordedAt: null, productionHandoffRecordedAt: null };
  const cad = object(row.cad), cadAt = at(cad?.recorded_at);
  if (!cad || cad.order_reference !== row.order_reference || !cadAt || cadAt < recordedAt) return null;
  if (cad.production === null) return { orderReference: row.order_reference, recordedAt, cadHandoffRecordedAt: cadAt, productionHandoffRecordedAt: null };
  const production = object(cad.production), productionAt = at(production?.recorded_at);
  if (!production || production.order_reference !== row.order_reference || !productionAt || productionAt < cadAt) return null;
  return { orderReference: row.order_reference, recordedAt, cadHandoffRecordedAt: cadAt, productionHandoffRecordedAt: productionAt };
}

export function createCustomerCommercialOrderStatus(deps: {
  authenticate(request: Request): Owner | null; active(owner: Owner): boolean; repository: Repository;
}) {
  return { async read(request: Request, publicReference: string) {
    try {
      if (!isValidFirstPreviewPublicReference(publicReference)) return null;
      const owner = deps.authenticate(request);
      if (!owner || !deps.active(owner)) return null;
      const receipt = await deps.repository.ownedReceipt(owner, publicReference);
      if (!receipt || !isValidFirstPreviewAssetUuid(receipt.briefId) || receipt.publicReference !== publicReference || !deps.active(owner)) return null;
      const rows = await deps.repository.orders(receipt.briefId);
      // Reuse the paid amount/currency, canonical quotation hash and full FK-chain validator.
      const verified = await readAdminCommercialOrders({ readRows: async () => rows });
      if (verified.ok === false || !Array.isArray(rows)) return null;
      const statuses = rows.map(row => safeStatus(row, receipt));
      if (statuses.some(row => row === null) || !deps.active(owner)) return null;
      return { state: "ready" as const, publicReference, orders: (statuses as CustomerOrderRecord[]).slice(0, 25), hasMore: verified.hasMore };
    } catch { return null; }
  } };
}

export function getCustomerCommercialOrderStatus(deps: {
  environment?: Readonly<Record<string, string | undefined>>; client?: () => SupabaseClient | null;
  authenticate?: typeof authenticateScopedReceiptRequest; active?: typeof isScopedReceiptOwnerActive;
} = {}) {
  const env = deps.environment ?? process.env;
  if (env.NOVORA_CUSTOMER_ORDER_STATUS_ENABLED !== "true" || env.NOVORA_INVITATION_TRIAL_RECEIPTS_ENABLED !== "true") return null;
  // Lazy client creation: no credential lookup or database call before invitation authentication.
  let client: SupabaseClient | null = null;
  const repository = createCustomerOrderStatusRepository(() => {
    client ??= (deps.client ?? createSupabaseAdminClientOrNull)();
    if (!client) throw new Error("Unavailable");
    return client;
  });
  return createCustomerCommercialOrderStatus({
    authenticate: request => (deps.authenticate ?? authenticateScopedReceiptRequest)(request, env),
    active: owner => (deps.active ?? isScopedReceiptOwnerActive)(owner, env), repository,
  });
}
