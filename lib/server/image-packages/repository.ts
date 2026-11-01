import "server-only";

import {
  isExpectedPurchase, isInstant, isUuid, isDispatchBinding,
  type ExpectedTestPurchase, type EntitlementResult, type GrantResult, type ImagePackageRepository,
  type PackageFailure, type UseResult,
} from "./contract";

/** Inject an already authorized server client. No default client/env lookup. */
export interface ImagePackageRpcClient {
  rpc(name: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }>;
}
export interface ImagePackageSelectQuery {
  eq(column: string, value: unknown): ImagePackageSelectQuery;
  is(column: string, value: null): ImagePackageSelectQuery;
  maybeSingle(): PromiseLike<{ data: unknown; error: unknown }>;
}
export interface ImagePackageSelectClient {
  from(table: string): { select(columns: string): ImagePackageSelectQuery };
}

const unavailable: PackageFailure = { ok: false, reason: "unavailable" };
const failureReasons = ["invalid", "denied", "conflict", "not_found", "expired", "exhausted", "unavailable"];

function failure(data: any): PackageFailure | null {
  return data?.ok === false && failureReasons.includes(data.reason)
    ? { ok: false, reason: data.reason } : null;
}

export function createImagePackageRepository(client: ImagePackageRpcClient,
  readClient?: ImagePackageSelectClient): ImagePackageRepository {
  async function rpc(name: string, args: Record<string, unknown>): Promise<any> {
    try {
      const result = await client.rpc(name, args);
      return result && !result.error && result.data && typeof result.data === "object" &&
        !Array.isArray(result.data) ? result.data : null;
    } catch { return null; }
  }
  function grantResult(data: any): GrantResult {
    if (failure(data)) return failure(data)!;
    return data?.ok === true && typeof data.duplicate === "boolean" && isUuid(data.purchaseId) &&
      isInstant(data.grantedAt) && isInstant(data.expiresAt) &&
      Date.parse(data.expiresAt) - Date.parse(data.grantedAt) === 7 * 86400000
      ? { ok: true, duplicate: data.duplicate, purchaseId: data.purchaseId,
          grantedAt: data.grantedAt, expiresAt: data.expiresAt } : unavailable;
  }
  function useResult(data: any): UseResult {
    if (failure(data)) return failure(data)!;
    return data?.ok === true && typeof data.duplicate === "boolean" && isUuid(data.operationId) &&
      ["reserved", "unknown", "settled", "released"].includes(data.state) &&
      Number.isSafeInteger(data.providerCostUsdMicros) && data.providerCostUsdMicros >= 0
      ? { ok: true, duplicate: data.duplicate, operationId: data.operationId,
          state: data.state, providerCostUsdMicros: data.providerCostUsdMicros } : unavailable;
  }
  return {
    async createPurchase(input) {
      const data = await rpc("novora_test_image_package_create", { p_purchase: input });
      return data?.ok === true ? { ok: true } : failure(data) ?? unavailable;
    },
    async findPurchase(purchaseId) {
      const data = await rpc("novora_test_image_package_find", { p_purchase_id: purchaseId });
      if (data?.ok === false && data.reason === "not_found") return null;
      const purchase = data?.purchase as ExpectedTestPurchase;
      return data?.ok === true && isExpectedPurchase(purchase) && purchase.purchaseId === purchaseId
        ? purchase : "unavailable";
    },
    async readEntitlement(purchaseId, subjectId): Promise<EntitlementResult> {
      const data = await rpc("novora_test_image_package_balance", {
        p_purchase_id: purchaseId, p_subject_id: subjectId,
      });
      if (failure(data)) return failure(data)!;
      if (data?.ok !== true || data.purchaseId !== purchaseId ||
        !["active", "expired"].includes(data.state) || !isInstant(data.grantedAt) ||
        !isInstant(data.expiresAt) || Date.parse(data.expiresAt) - Date.parse(data.grantedAt) !== 7 * 86400000 ||
        ![data.initialRemaining, data.revisionRemaining].every((value) => Number.isInteger(value) && value >= 0 && value <= 5) ||
        (data.state === "expired" && (data.initialRemaining !== 0 || data.revisionRemaining !== 0))) return unavailable;
      return { ok: true, purchaseId, state: data.state, grantedAt: data.grantedAt,
        expiresAt: data.expiresAt, initialRemaining: data.initialRemaining,
        revisionRemaining: data.revisionRemaining };
    },
    async grantVerifiedPayment(payment, manualVerifierId) {
      const result = grantResult(await rpc("novora_test_image_package_grant", {
        p_payment: payment, p_manual_verifier_id: manualVerifierId,
      }));
      return result.ok && result.purchaseId !== payment.purchaseId ? unavailable : result;
    },
    async reserve(input) {
      const result = useResult(await rpc("novora_test_image_package_reserve", { p_use: input }));
      return result.ok && result.operationId !== input.operationId ? unavailable : result;
    },
    async claimDispatch(input) {
      const data = await rpc("novora_test_image_package_claim_dispatch", { p_dispatch: input });
      return ["claimed", "already_claimed", "denied", "unknown"].includes(data?.claim) ? data.claim : "unknown";
    },
    async settleDispatch(input) {
      const result = useResult(await rpc("novora_test_image_package_settle_dispatch", { p_dispatch: input }));
      return result.ok && result.operationId !== input.operationId ? unavailable : result;
    },
    async isDefiniteFailure(input) {
      if (!isDispatchBinding(input)) return false;
      // Existing service-role SELECT only. A real Supabase client can supply
      // both ports; RPC-only test clients fail closed without a read port.
      const reads = readClient ?? (typeof (client as any)?.from === "function"
        ? client as unknown as ImagePackageSelectClient : null);
      if (!reads) return false;
      try {
        let query = reads.from("novora_test_image_package_uses").select(
          "reservation_id,operation_id,kind,brief_id,source_output_id,state,outcome," +
          "purchase:novora_test_image_package_purchases!inner(owner_scope,owner_identity)",
        ).eq("reservation_id", input.reservationId).eq("operation_id", input.operationId)
          .eq("kind", input.kind).eq("brief_id", input.briefId)
          .eq("purchase.owner_scope", input.owner.scope).eq("purchase.owner_identity", input.owner.identity);
        query = input.kind === "revision" ? query.eq("source_output_id", input.sourceOutputId)
          : query.is("source_output_id", null);
        const { data, error } = await query.maybeSingle();
        const row = data as any;
        return !error && !!row && !Array.isArray(row) &&
          row.reservation_id === input.reservationId && row.operation_id === input.operationId &&
          row.kind === input.kind && row.brief_id === input.briefId &&
          row.source_output_id === (input.sourceOutputId ?? null) &&
          row.purchase?.owner_scope === input.owner.scope && row.purchase?.owner_identity === input.owner.identity &&
          row.state === "released" && ["definite_failure", "no_compliant_delivery"].includes(row.outcome);
      } catch { return false; }
    },
    async finish(input) {
      const result = useResult(await rpc("novora_test_image_package_finish", { p_use: input }));
      return result.ok && result.operationId !== input.operationId ? unavailable : result;
    },
  };
}
