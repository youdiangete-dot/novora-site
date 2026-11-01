import "server-only";

import {
  isExpectedPurchase, isOwner, isReference, isUuid,
  type ExpectedTestPurchase, type GrantResult, type ManualTestEvidence,
  type PackageFailure, type PackageOwner, type VerifiedTestPayment,
} from "./contract";
import { createImagePackageRepository, type ImagePackageRpcClient } from "./repository";
import { createTestImagePackageService } from "./service";
import { createDurableSandboxOperationStore } from "./sandbox-store";
import {
  createPayPalSandboxAdapter, type SandboxDependencies, type SandboxPaymentResult,
  type VerifiedSandboxCapture,
} from "../paypal-sandbox/adapter";

/** Returned by existing protected server authentication, never a request body. */
export type AuthenticatedPackageCustomer = Readonly<{
  subjectId: string;
  owner: PackageOwner;
}>;
export type AuthenticatedPackageOwnerAdmin = Readonly<{ role: "owner"; verifierId: string }>;

export type PackagePaymentApplicationDependencies = Readonly<{
  client: ImagePackageRpcClient;
  authenticateCustomer(request: Request): Promise<AuthenticatedPackageCustomer | null>;
  authorizeOwnerAdmin(request: Request): Promise<AuthenticatedPackageOwnerAdmin | null>;
  /** Trusted server configuration, compared to the immutable purchase merchant. */
  sandboxMerchantId: string;
  sandbox: Omit<SandboxDependencies, "operations">;
  now?: () => Date;
}>;

type Confirmation = Extract<GrantResult, { ok: true }>;
export type PackagePaymentApplicationResult =
  | PackageFailure
  | Readonly<{ ok: false; reason: "unknown" | "payment_cancelled" | "payment_denied" | "payment_reversed" }>
  | Readonly<{
      ok: true; state: "checkout"; providerOrderId: string;
      paymentState: "CREATED" | "APPROVED" | "PENDING";
    }>
  | Readonly<{ ok: true; state: "confirmed"; confirmation: Confirmation }>;

const failure = (reason: PackageFailure["reason"]): PackageFailure => ({ ok: false, reason });
const sameOwner = (left: PackageOwner, right: PackageOwner) =>
  left.scope === right.scope && left.identity === right.identity;

/**
 * Local server application seam only: no routes, default auth/client/HTTP,
 * environment reads, new purchase IDs or physical-jewelry payment dependencies.
 * B must have created the stable trusted TEST purchase before this is called.
 * In particular, UNKNOWN cannot cause this service to create a fresh purchase.
 */
export function createTestPackagePaymentApplication(deps: PackagePaymentApplicationDependencies) {
  const repository = createImagePackageRepository(deps.client);

  async function storedPurchase(purchaseId: unknown): Promise<ExpectedTestPurchase | PackageFailure> {
    if (!isUuid(purchaseId)) return failure("invalid");
    const purchase = await repository.findPurchase(purchaseId);
    if (purchase === "unavailable") return failure("unavailable");
    if (!purchase || !isExpectedPurchase(purchase) || purchase.purchaseId !== purchaseId) return failure("denied");
    // Snapshot trusted records before asynchronous verification/reconciliation.
    return Object.freeze({ ...purchase, owner: Object.freeze({ ...purchase.owner }) });
  }

  async function customerPurchase(request: Request, purchaseId: unknown): Promise<ExpectedTestPurchase | PackageFailure> {
    const authenticated = await deps.authenticateCustomer(request);
    if (!authenticated || !isUuid(authenticated.subjectId) || !isOwner(authenticated.owner)) return failure("denied");
    const customer = { subjectId: authenticated.subjectId, owner: { ...authenticated.owner } };
    const purchase = await storedPurchase(purchaseId);
    if ("ok" in purchase) return purchase;
    return purchase.subjectId === customer.subjectId && sameOwner(purchase.owner, customer.owner)
      ? purchase : failure("denied");
  }

  function packageService(expected: ExpectedTestPurchase, verify: (
    expected: ExpectedTestPurchase,
  ) => Promise<VerifiedTestPayment | null>, admin: AuthenticatedPackageOwnerAdmin | null = null) {
    return createTestImagePackageService({
      repository,
      resolvePurchase: async () => expected,
      verifyCapture: async (_request, current) => verify(current),
      authorizeOwner: async () => admin,
      now: deps.now,
    });
  }

  async function applyCapture(request: Request, purchase: ExpectedTestPurchase,
    capture: VerifiedSandboxCapture): Promise<PackagePaymentApplicationResult> {
    const service = packageService(purchase, async current => {
      const mapped = await createDurableSandboxOperationStore(deps.client, {
        owner: current.owner, purchaseId: current.purchaseId,
      }).readPurchase();
      if (!mapped || capture.providerKey !== "paypal_sandbox" ||
        capture.purchaseId !== current.purchaseId || capture.providerOrderId !== mapped.providerOrderId ||
        capture.amountMinor !== current.amountMinor || capture.currency !== current.currency ||
        capture.merchantId !== mapped.merchantId || capture.merchantId !== current.sandboxMerchantId ||
        capture.merchantId !== deps.sandboxMerchantId) return null;
      return {
        provider: "paypal_sandbox", paymentReference: capture.providerCaptureId,
        purchaseId: current.purchaseId, subjectId: current.subjectId,
        packageCode: current.packageCode, environment: current.environment,
        amountMinor: current.amountMinor, currency: current.currency,
        // Capture creation is not the confirmation clock. B re-pins and stores
        // this first trusted confirmation atomically, preserving it on replay.
        confirmedAt: (deps.now ?? (() => new Date()))().toISOString(),
      };
    });
    const confirmation = await service.confirmCapture(request);
    return confirmation.ok === true ? { ok: true, state: "confirmed", confirmation } : confirmation;
  }

  async function paymentResult(request: Request, purchase: ExpectedTestPurchase,
    result: SandboxPaymentResult): Promise<PackagePaymentApplicationResult> {
    if (result.state === "PAID") return applyCapture(request, purchase, result.capture);
    if (result.state === "UNKNOWN") return { ok: false, reason: "unknown" };
    if (result.state === "REJECTED") return failure("invalid");
    if (result.state === "CANCELLED") return { ok: false, reason: "payment_cancelled" };
    if (result.state === "DENIED") return { ok: false, reason: "payment_denied" };
    if (result.state === "REVERSED") return { ok: false, reason: "payment_reversed" };
    return { ok: true, state: "checkout", providerOrderId: result.providerOrderId, paymentState: result.state };
  }

  async function sandboxOperation(request: Request, purchaseId: unknown,
    action: "create" | "capture" | "reconcile"): Promise<PackagePaymentApplicationResult> {
    try {
      const purchase = await customerPurchase(request, purchaseId);
      if ("ok" in purchase) return purchase;
      if (purchase.provider !== "paypal_sandbox" ||
        purchase.sandboxMerchantId !== deps.sandboxMerchantId) return failure("denied");
      const operations = createDurableSandboxOperationStore(deps.client, {
        owner: purchase.owner, purchaseId: purchase.purchaseId,
      });
      const stored = await operations.readPurchase();
      if (!stored || stored.merchantId !== purchase.sandboxMerchantId ||
        stored.amountMinor !== purchase.amountMinor || stored.currency !== purchase.currency) return failure("unavailable");
      const adapter = createPayPalSandboxAdapter({ ...deps.sandbox, operations });
      let result: SandboxPaymentResult;
      if (action === "create" && !stored.providerOrderId) result = await adapter.create(stored);
      else {
        // Known orders are never replaced, including pending and ambiguous ones.
        // Capture/read uses only the durable mapping, never a return/body order ID.
        if (!stored.providerOrderId) return { ok: false, reason: "unknown" };
        result = action === "capture" ? await adapter.capture(stored, stored.providerOrderId)
          : await adapter.reconcile(stored, stored.providerOrderId);
      }
      return await paymentResult(request, purchase, result);
    } catch { return failure("unavailable"); }
  }

  return Object.freeze({
    createCheckout: (request: Request, purchaseId: unknown) => sandboxOperation(request, purchaseId, "create"),
    captureCheckout: (request: Request, purchaseId: unknown) => sandboxOperation(request, purchaseId, "capture"),
    reconcileCheckout: (request: Request, purchaseId: unknown) => sandboxOperation(request, purchaseId, "reconcile"),
    async confirmManualTest(request: Request, purchaseId: unknown,
      evidence: ManualTestEvidence): Promise<PackagePaymentApplicationResult> {
      try {
        // The protected Owner admin may confirm a selected customer's purchase;
        // its target is looked up after authorization, not supplied as a paid DTO.
        const authorized = await deps.authorizeOwnerAdmin(request);
        if (!authorized || authorized.role !== "owner" || !isReference(authorized.verifierId)) return failure("denied");
        const admin = Object.freeze({ role: "owner" as const, verifierId: authorized.verifierId });
        const purchase = await storedPurchase(purchaseId);
        if ("ok" in purchase) return purchase;
        if (purchase.provider !== "manual_test") return failure("denied");
        const confirmation = await packageService(purchase, async () => null, admin)
          .confirmManualTest(request, evidence);
        return confirmation.ok === true ? { ok: true, state: "confirmed", confirmation } : confirmation;
      } catch { return failure("unavailable"); }
    },
  });
}
