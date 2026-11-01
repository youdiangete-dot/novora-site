import "server-only";

import { createHash } from "node:crypto";
import { commercialAmountToMinorUnits } from "../commercial-currency";

export const PAYPAL_SANDBOX_ORIGIN = "https://api-m.sandbox.paypal.com" as const;
export const PAYPAL_SANDBOX_PROVIDER = "paypal_sandbox" as const;

/** Load only from trusted server purchase storage, never from a browser body. */
export type SandboxPurchase = Readonly<{
  purchaseId: string;
  amountMinor: number;
  currency: "USD";
  merchantId: string;
}>;

export type VerifiedSandboxCapture = Readonly<{
  providerKey: typeof PAYPAL_SANDBOX_PROVIDER;
  purchaseId: string;
  providerOrderId: string;
  providerCaptureId: string;
  amountMinor: number;
  currency: "USD";
  merchantId: string;
  capturedAt: string;
}>;

export type SandboxPaymentResult =
  | Readonly<{ state: "PAID"; capture: VerifiedSandboxCapture }>
  | Readonly<{
      state: "CREATED" | "APPROVED" | "PENDING" | "CANCELLED" | "DENIED" | "REVERSED";
      providerOrderId: string;
    }>
  | Readonly<{
      state: "UNKNOWN";
      reason: "transport" | "invalid_response" | "binding_mismatch" | "held" | "unavailable";
      providerOrderId?: string;
    }>
  | Readonly<{ state: "REJECTED"; reason: "invalid_input" }>;

export type SandboxOperation = Readonly<{ requestId: string; fingerprint: string }>;
/**
 * Integration MUST implement durable atomic claim and immutable completion.
 * A claimed operation is never reclaimed, even after process restart/timeout.
 * Same requestId + different fingerprint must return held. No TTL/retry reset.
 * Only create results are replayed; capture always reads current PayPal state.
 */
export interface SandboxOperationStore {
  claim(operation: SandboxOperation): Promise<
    "acquired" | "held" | Readonly<{ completed: SandboxPaymentResult }>
  >;
  complete(operation: SandboxOperation, result: SandboxPaymentResult): Promise<boolean>;
}

export type SandboxHttpRequest = Readonly<{
  url: string;
  method: "GET" | "POST";
  headers: Readonly<Record<string, string>>;
  body?: string;
  redirect: "error";
  signal: AbortSignal;
}>;

export type SandboxDependencies = Readonly<{
  endpoint: string;
  /** Injected only. This module neither constructs OAuth nor reads environment. */
  credentials: Readonly<{ getAccessToken(): Promise<string> }>;
  /** Must honor redirect:error and signal. No default fetch or live transport. */
  http(request: SandboxHttpRequest): Promise<Readonly<{
    status: number;
    url: string;
    body: string;
  }>>;
  operations: SandboxOperationStore;
  timeoutMs?: number;
}>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const PROVIDER_ID = /^[A-Z0-9]{1,64}$/;
const MERCHANT_ID = /^[A-Z0-9]{13}$/;
const unknown = (reason: Extract<SandboxPaymentResult, { state: "UNKNOWN" }>["reason"], providerOrderId?: string): SandboxPaymentResult =>
  providerOrderId ? { state: "UNKNOWN", reason, providerOrderId } : { state: "UNKNOWN", reason };
const rejected = (): SandboxPaymentResult => ({ state: "REJECTED", reason: "invalid_input" });

function snapshotPurchase(purchase: SandboxPurchase): SandboxPurchase | null {
  if (!purchase) return null;
  const snapshot = {
    purchaseId: purchase.purchaseId, amountMinor: purchase.amountMinor,
    currency: purchase.currency, merchantId: purchase.merchantId,
  };
  return typeof snapshot.purchaseId === "string" && UUID.test(snapshot.purchaseId) &&
    Number.isSafeInteger(snapshot.amountMinor) && snapshot.amountMinor > 0 &&
    snapshot.currency === "USD" && typeof snapshot.merchantId === "string" && MERCHANT_ID.test(snapshot.merchantId)
    ? Object.freeze(snapshot) : null;
}

function operationFor(purchase: SandboxPurchase, kind: "create" | "capture", orderId = ""): SandboxOperation {
  const identity = `NOVORA/paypal-sandbox/v1/${purchase.purchaseId}/${kind}`;
  return {
    // Stable across restarts, distinct per API operation, below PayPal's 38-byte guidance.
    requestId: createHash("sha256").update(identity).digest("hex").slice(0, 32),
    fingerprint: createHash("sha256").update(JSON.stringify([
      identity, purchase.amountMinor, purchase.currency, purchase.merchantId, orderId,
    ])).digest("hex"),
  };
}

function usdValue(minor: number): string {
  const value = BigInt(minor);
  return `${value / BigInt(100)}.${String(value % BigInt(100)).padStart(2, "0")}`;
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

function matchesAmount(value: unknown, purchase: SandboxPurchase): boolean {
  const amount = record(value);
  return amount?.currency_code === purchase.currency &&
    commercialAmountToMinorUnits(amount.value, amount.currency_code) === purchase.amountMinor;
}

function captureTimestamp(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) return null;
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return null;
  const canonical = new Date(time).toISOString();
  return canonical === value.replace(/(?:\.(\d{1,3}))?Z$/, (_match, fraction = "") => `.${fraction.padEnd(3, "0")}Z`)
    ? canonical : null;
}

function inspectOrder(body: unknown, purchase: SandboxPurchase, expectedOrderId?: string): SandboxPaymentResult {
  const order = record(body);
  if (!order || typeof order.id !== "string" || !PROVIDER_ID.test(order.id)) {
    return unknown("invalid_response", expectedOrderId);
  }
  const id = order.id;
  if (expectedOrderId && id !== expectedOrderId) return unknown("binding_mismatch", expectedOrderId);
  const units = order.purchase_units;
  const unit = Array.isArray(units) && units.length === 1 ? record(units[0]) : null;
  if (order.intent !== "CAPTURE" || !unit || unit.custom_id !== purchase.purchaseId ||
    unit.reference_id !== purchase.purchaseId || !matchesAmount(unit.amount, purchase) ||
    record(unit.payee)?.merchant_id !== purchase.merchantId) {
    return unknown("binding_mismatch", expectedOrderId);
  }
  const payments = record(unit.payments);
  const captures = payments?.captures;
  if (captures !== undefined) {
    // TEST digital packages use exactly one full capture; split/extra captures fail closed.
    const capture = Array.isArray(captures) && captures.length === 1 ? record(captures[0]) : null;
    if (!capture || typeof capture.id !== "string" || !PROVIDER_ID.test(capture.id) ||
      !matchesAmount(capture.amount, purchase) ||
      (capture.custom_id !== undefined && capture.custom_id !== purchase.purchaseId)) {
      return unknown("binding_mismatch", id);
    }
    if (capture.status === "PENDING") return { state: "PENDING", providerOrderId: id };
    if (capture.status === "DECLINED" || capture.status === "FAILED") return { state: "DENIED", providerOrderId: id };
    if (capture.status === "REFUNDED" || capture.status === "PARTIALLY_REFUNDED") return { state: "REVERSED", providerOrderId: id };
    const capturedAt = captureTimestamp(capture.create_time);
    if (capture.status !== "COMPLETED" || order.status !== "COMPLETED" || capture.final_capture !== true ||
      !capturedAt) return unknown("invalid_response", id);
    return { state: "PAID", capture: {
      providerKey: PAYPAL_SANDBOX_PROVIDER,
      purchaseId: purchase.purchaseId,
      providerOrderId: id,
      providerCaptureId: capture.id,
      amountMinor: purchase.amountMinor,
      currency: purchase.currency,
      merchantId: purchase.merchantId,
      capturedAt,
    } };
  }
  if (order.status === "VOIDED") return { state: "CANCELLED", providerOrderId: id };
  if (order.status === "CREATED") return { state: "CREATED", providerOrderId: id };
  if (order.status === "APPROVED") return { state: "APPROVED", providerOrderId: id };
  if (order.status === "SAVED" || order.status === "PAYER_ACTION_REQUIRED") return { state: "PENDING", providerOrderId: id };
  // COMPLETED alone is not proof of a successful capture. No browser cancel proof.
  return unknown("invalid_response", id);
}

export function createPayPalSandboxAdapter(dependencies: SandboxDependencies) {
  if (dependencies.endpoint !== PAYPAL_SANDBOX_ORIGIN && dependencies.endpoint !== `${PAYPAL_SANDBOX_ORIGIN}/`) {
    throw new Error("PayPal Sandbox endpoint required");
  }
  const timeoutMs = dependencies.timeoutMs ?? 10_000;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30_000) {
    throw new Error("Invalid Sandbox timeout");
  }

  async function request(method: "GET" | "POST", path: string, body?: unknown, requestId?: string): Promise<unknown> {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    // Covers credential and transport hangs. Late responses cannot update our journal.
    try {
      return await Promise.race([
        (async () => {
          const token = await dependencies.credentials.getAccessToken();
          if (typeof token !== "string" || !/^[A-Za-z0-9._~+-]{1,4096}$/.test(token)) throw new Error("Unavailable");
          if (controller.signal.aborted) throw new Error("Unavailable");
          const url = `${PAYPAL_SANDBOX_ORIGIN}${path}`;
          const response = await dependencies.http({
            url, method, redirect: "error", signal: controller.signal,
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
              Prefer: "return=representation",
              ...(requestId ? { "PayPal-Request-Id": requestId } : {}),
            },
            ...(body === undefined ? {} : { body: JSON.stringify(body) }),
          });
          // Never follow response HATEOAS URLs or classify an HTTP error as a definite failure.
          if (response.url !== url || !Number.isInteger(response.status) ||
            response.status < 200 || response.status > 299 ||
            typeof response.body !== "string" || Buffer.byteLength(response.body, "utf8") > 131_072) {
            throw new Error("Unavailable");
          }
          return JSON.parse(response.body);
        })(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => { controller.abort(); reject(new Error("Unavailable")); }, timeoutMs);
        }),
      ]);
    } finally {
      clearTimeout(timer!);
    }
  }

  async function mutate(purchase: SandboxPurchase, kind: "create" | "capture", orderId?: string): Promise<SandboxPaymentResult> {
    const operation = operationFor(purchase, kind, orderId);
    try {
      const claim = await dependencies.operations.claim(operation);
      if (claim === "held") return unknown("held", orderId);
      if (claim !== "acquired") return claim.completed;
      let result: SandboxPaymentResult;
      try {
        const body = kind === "create" ? {
          intent: "CAPTURE",
          purchase_units: [{
            reference_id: purchase.purchaseId,
            custom_id: purchase.purchaseId,
            payee: { merchant_id: purchase.merchantId },
            amount: { currency_code: purchase.currency, value: usdValue(purchase.amountMinor) },
          }],
          payment_source: { paypal: { experience_context: { shipping_preference: "NO_SHIPPING" } } },
        } : {};
        result = inspectOrder(await request("POST", kind === "create"
          ? "/v2/checkout/orders" : `/v2/checkout/orders/${orderId}/capture`, body, operation.requestId), purchase, orderId);
      } catch {
        result = unknown("transport", orderId);
      }
      return await dependencies.operations.complete(operation, result) ? result : unknown("unavailable", orderId);
    } catch {
      return unknown("unavailable", orderId);
    }
  }

  async function reconcile(purchase: SandboxPurchase, orderId: string): Promise<SandboxPaymentResult> {
    const expected = snapshotPurchase(purchase);
    if (!expected || typeof orderId !== "string" || !PROVIDER_ID.test(orderId)) return rejected();
    // orderId must come from the server's purchase-to-order mapping, never a return URL.
    try {
      return inspectOrder(await request("GET", `/v2/checkout/orders/${orderId}`), expected, orderId);
    } catch {
      return unknown("transport", orderId);
    }
  }

  return Object.freeze({
    providerKey: PAYPAL_SANDBOX_PROVIDER,
    create: async (purchase: SandboxPurchase): Promise<SandboxPaymentResult> => {
      const expected = snapshotPurchase(purchase);
      if (!expected) return rejected();
      const result = await mutate(expected, "create");
      return result.state === "PAID" ? reconcile(expected, result.capture.providerOrderId) : result;
    },
    reconcile,
    capture: async (purchase: SandboxPurchase, orderId: string): Promise<SandboxPaymentResult> => {
      const expected = snapshotPurchase(purchase);
      if (!expected) return rejected();
      const current = await reconcile(expected, orderId);
      // Read before every attempt/replay. An UNKNOWN journal entry cannot authorize another POST.
      if (current.state !== "APPROVED") return current;
      const result = await mutate(expected, "capture", orderId);
      // A stored capture result may have become refunded/declined. Re-read rather than replay PAID.
      if (result.state === "PAID") return reconcile(expected, orderId);
      return result;
    },
  });
}
