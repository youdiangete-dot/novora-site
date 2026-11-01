import "server-only";
import { TEST_01, isExpectedPurchase, isOwner, isReference, type ExpectedTestPurchase,
  type PackageOwner, type TestPaymentProvider, type ManualTestEvidence } from "./contract";
import { createImagePackageRepository, type ImagePackageRpcClient } from "./repository";
import { createTestPackagePaymentApplication } from "./payment-application";
import { testPackagePurchase, testPackageSubject } from "./identity";
import { PAYPAL_SANDBOX_ORIGIN, type SandboxDependencies } from "../paypal-sandbox/adapter";

type Admin = { role: "owner"; verifierId: string };
export type PackageHttpDependencies = Readonly<{
  client: ImagePackageRpcClient;
  authenticate(request: Request): PackageOwner | null;
  authorizeOwner(request: Request): Promise<Admin | null>;
  sandboxMerchantId: string | null;
  sandbox: Omit<SandboxDependencies, "operations"> | null;
  readHold(purchaseId: string, confirmed: boolean): Promise<"none" | "unknown" | "pending">;
  now?: () => Date;
}>;
const denied = () => ({ ok: false as const, reason: "denied" });
export function createPackageHttpService(deps: PackageHttpDependencies) {
  const repository = createImagePackageRepository(deps.client);
  const application = createTestPackagePaymentApplication({
    client: deps.client, sandboxMerchantId: deps.sandboxMerchantId ?? "",
    authenticateCustomer: async request => {
      const owner = deps.authenticate(request);
      return owner && isOwner(owner) ? { subjectId: testPackageSubject(owner), owner } : null;
    },
    authorizeOwnerAdmin: deps.authorizeOwner, now: deps.now,
    sandbox: deps.sandbox ?? { endpoint: PAYPAL_SANDBOX_ORIGIN,
      credentials: { getAccessToken: async () => { throw new Error("Sandbox unavailable"); } },
      http: async () => { throw new Error("Sandbox unavailable"); } },
  });
  function expected(request: Request, provider: TestPaymentProvider): ExpectedTestPurchase | null {
    const owner = deps.authenticate(request);
    if (!owner || !isOwner(owner)) return null;
    return { purchaseId: testPackagePurchase(owner, provider), subjectId: testPackageSubject(owner),
      owner, provider, sandboxMerchantId: provider === "manual_test" ? null : deps.sandboxMerchantId,
      packageCode: "TEST-01", environment: "TEST", amountMinor: 100, currency: "USD" };
  }
  async function snapshot(p: ExpectedTestPurchase) {
    const stored = await repository.findPurchase(p.purchaseId);
    const common = { package: TEST_01, paypalConfigured: !!deps.sandbox && !!deps.sandboxMerchantId };
    if (stored === null) return { ok: true as const, ...common, state: "not_started", purchaseId: null,
      initialRemaining: 0, revisionRemaining: 0, expiresAt: null, hold: "none" };
    if (stored === "unavailable") return { ok: false as const, reason: "unavailable" };
    if (!isExpectedPurchase(stored) || stored.subjectId !== p.subjectId || stored.owner.scope !== p.owner.scope ||
      stored.owner.identity !== p.owner.identity || stored.provider !== p.provider) return denied();
    const balance = await repository.readEntitlement(p.purchaseId, p.subjectId);
    if (balance.ok === true) return { ...common, ...balance, hold: await deps.readHold(p.purchaseId, true) };
    if (balance.reason !== "denied") return balance;
    return { ok: true as const, ...common, state: "awaiting_confirmation", purchaseId: p.purchaseId,
      initialRemaining: 0, revisionRemaining: 0, expiresAt: null,
      hold: p.provider === "paypal_sandbox" ? await deps.readHold(p.purchaseId, false) : "none" };
  }
  return Object.freeze({
    async customer(request: Request, provider: TestPaymentProvider,
      action: "read" | "create" | "capture" | "reconcile") {
      try {
        const p = expected(request, provider);
        if (!p) return denied();
        if (action === "read") return snapshot(p);
        if (provider === "paypal_sandbox" && !deps.sandbox) return { ok: false as const, reason: "paypal_unconfigured" };
        if (!isExpectedPurchase(p)) return { ok: false as const, reason: "unavailable" };
        if (action === "create") {
          const created = await repository.createPurchase(p);
          if (!created.ok) return created;
          if (provider === "manual_test") return snapshot(p);
        } else if (provider !== "paypal_sandbox") return denied();
        const payment = action === "create" ? await application.createCheckout(request, p.purchaseId)
          : action === "capture" ? await application.captureCheckout(request, p.purchaseId)
          : await application.reconcileCheckout(request, p.purchaseId);
        // A pending/order browser result is never transformed into a grant.
        return { ...payment, snapshot: await snapshot(p) };
      } catch { return { ok: false as const, reason: "unavailable" }; }
    },
    async manual(request: Request, purchaseId: unknown, evidence: ManualTestEvidence) {
      // Application reauthorizes before target lookup and B pins verifier/time.
      const owner = await deps.authorizeOwner(request);
      if (!owner || owner.role !== "owner" || !isReference(owner.verifierId)) return denied();
      return application.confirmManualTest(request, purchaseId, evidence);
    },
  });
}
export type PackageHttpService = ReturnType<typeof createPackageHttpService>;
