import "server-only";
import { createHash } from "node:crypto";
import { isInstant, isOwner, isUuid, type PackageOwner } from "./contract";
import type { ImagePackageRpcClient } from "./repository";

// Structural match for C's SandboxOperationStore; no shared registry/client.
export type StoredSandboxPurchase = Readonly<{
  purchaseId: string; amountMinor: 100; currency: "USD"; merchantId: string;
  providerOrderId: string | null;
}>;
type Operation = Readonly<{ requestId: string; fingerprint: string }>;
type Capture = Readonly<{
  providerKey: "paypal_sandbox"; purchaseId: string; providerOrderId: string;
  providerCaptureId: string; amountMinor: number; currency: "USD"; merchantId: string; capturedAt: string;
}>;
export type StoredSandboxResult =
  | Readonly<{ state: "PAID"; capture: Capture }>
  | Readonly<{ state: "CREATED" | "APPROVED" | "PENDING" | "CANCELLED" | "DENIED" | "REVERSED"; providerOrderId: string }>
  | Readonly<{ state: "UNKNOWN"; reason: "transport" | "invalid_response" | "binding_mismatch" | "held" | "unavailable"; providerOrderId?: string }>
  | Readonly<{ state: "REJECTED"; reason: "invalid_input" }>;
const providerId = (value: unknown): value is string => typeof value === "string" && /^[A-Z0-9]{1,64}$/.test(value);
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

export function sandboxOperationFor(purchase: StoredSandboxPurchase, kind: "create" | "capture"): Operation {
  const identity = `NOVORA/paypal-sandbox/v1/${purchase.purchaseId}/${kind}`;
  return { requestId: hash(identity).slice(0, 32), fingerprint: hash(JSON.stringify([
    identity, purchase.amountMinor, purchase.currency, purchase.merchantId,
    kind === "create" ? "" : purchase.providerOrderId,
  ])) };
}

function normalizedResult(value: any, purchase: StoredSandboxPurchase): StoredSandboxResult | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const orderMatches = (id: unknown) => providerId(id) &&
    (purchase.providerOrderId === null || id === purchase.providerOrderId);
  if (value.state === "PAID") {
    const c = value.capture;
    if (!c || c.providerKey !== "paypal_sandbox" || c.purchaseId !== purchase.purchaseId ||
      !orderMatches(c.providerOrderId) || !providerId(c.providerCaptureId) ||
      c.amountMinor !== 100 || c.currency !== "USD" || c.merchantId !== purchase.merchantId || !isInstant(c.capturedAt)) return null;
    return { state: "PAID", capture: {
      providerKey: c.providerKey, purchaseId: c.purchaseId, providerOrderId: c.providerOrderId,
      providerCaptureId: c.providerCaptureId, amountMinor: c.amountMinor, currency: c.currency,
      merchantId: c.merchantId, capturedAt: c.capturedAt,
    } };
  }
  if (["CREATED", "APPROVED", "PENDING", "CANCELLED", "DENIED", "REVERSED"].includes(value.state)) {
    return orderMatches(value.providerOrderId) ? { state: value.state, providerOrderId: value.providerOrderId } : null;
  }
  if (value.state === "UNKNOWN" && ["transport", "invalid_response", "binding_mismatch", "held", "unavailable"].includes(value.reason)) {
    if (value.providerOrderId !== undefined && !orderMatches(value.providerOrderId)) return null;
    return { state: "UNKNOWN", reason: value.reason,
      ...(value.providerOrderId === undefined ? {} : { providerOrderId: value.providerOrderId }) };
  }
  return value.state === "REJECTED" && value.reason === "invalid_input"
    ? { state: "REJECTED", reason: "invalid_input" } : null;
}

/** One store per trusted purchase+owner. It re-reads the durable order mapping
 * for every operation. Claim errors hold permanently; there is no expiry/reset.
 * Normalized completion and create-order binding commit atomically in SQL. */
export function createDurableSandboxOperationStore(client: ImagePackageRpcClient,
  binding: Readonly<{ owner: PackageOwner; purchaseId: string }>) {
  async function rpc(name: string, args: Record<string, unknown>): Promise<any> {
    try { const result = await client.rpc(name, args); return result?.error ? null : result?.data; }
    catch { return null; }
  }
  async function readPurchase(): Promise<StoredSandboxPurchase | null> {
    if (!binding || !isOwner(binding.owner) || !isUuid(binding.purchaseId)) return null;
    const result = await rpc("novora_test_image_package_sandbox_purchase", {
      p_purchase_id: binding.purchaseId, p_owner: binding.owner,
    });
    const p = result?.purchase;
    return result?.ok === true && p?.purchaseId === binding.purchaseId && p.amountMinor === 100 &&
      p.currency === "USD" && typeof p.merchantId === "string" && /^[A-Z0-9]{13}$/.test(p.merchantId) &&
      (p.providerOrderId === null || providerId(p.providerOrderId))
      ? { purchaseId: p.purchaseId, amountMinor: 100, currency: "USD", merchantId: p.merchantId,
          providerOrderId: p.providerOrderId } : null;
  }
  function operationKind(op: Operation, purchase: StoredSandboxPurchase): "create" | "capture" | null {
    for (const kind of ["create", "capture"] as const) {
      if (kind === "capture" && !purchase.providerOrderId) continue;
      const expected = sandboxOperationFor(purchase, kind);
      if (op?.requestId === expected.requestId && op.fingerprint === expected.fingerprint) return kind;
    }
    return null;
  }
  return Object.freeze({
    readPurchase,
    async claim(operation: Operation): Promise<"acquired" | "held" | { completed: StoredSandboxResult }> {
      const purchase = await readPurchase();
      const kind = purchase && operationKind(operation, purchase);
      if (!kind || !purchase) return "held";
      const result = await rpc("novora_test_image_package_sandbox_claim", {
        p_purchase_id: binding.purchaseId, p_owner: binding.owner, p_kind: kind,
        p_order_id: kind === "capture" ? purchase.providerOrderId : null,
        p_request_id: operation.requestId, p_fingerprint: operation.fingerprint,
      });
      if (result?.claim === "acquired") return "acquired";
      const completed = result?.claim === "completed" && normalizedResult(result.result, purchase);
      return completed ? { completed } : "held";
    },
    async complete(operation: Operation, value: StoredSandboxResult): Promise<boolean> {
      const purchase = await readPurchase();
      const kind = purchase && operationKind(operation, purchase);
      const result = purchase && normalizedResult(value, purchase);
      if (!kind || !result) return false;
      return (await rpc("novora_test_image_package_sandbox_complete", {
        p_purchase_id: binding.purchaseId, p_owner: binding.owner, p_kind: kind,
        p_request_id: operation.requestId, p_fingerprint: operation.fingerprint, p_result: result,
      }))?.ok === true;
    },
  });
}
