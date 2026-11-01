import "server-only";

import {
  TEST_01, isExpectedPurchase, isReference, isUuid, matchesPurchase,
  type ExpectedTestPurchase, type GrantResult, type ImagePackageRepository,
  type ManualTestEvidence, type PackageFailure, type VerifiedTestPayment,
} from "./contract";

const failure = (reason: PackageFailure["reason"]): PackageFailure => ({ ok: false, reason });

type Dependencies = Readonly<{
  repository: ImagePackageRepository;
  /** Must resolve purchase+subject from authenticated server context. No client IDs. */
  resolvePurchase: (request: unknown) => Promise<ExpectedTestPurchase | null>;
  /** C's adapter verifies the capture server-side against this exact purchase.
   * A browser return, approved order or webhook arrival is not payment proof. */
  verifyCapture: (request: unknown, expected: ExpectedTestPurchase) => Promise<VerifiedTestPayment | null>;
  /** Wire to existing protected admin plus explicit Owner identity/role.
   * Generic admin access alone must not imply Owner. Never pass a body boolean. */
  authorizeOwner: (request: unknown) => Promise<{ role: "owner"; verifierId: string } | null>;
  now?: () => Date;
}>;

/** Dependency injection constructs no client, reads no credentials and registers
 * no route. Parent must supply trusted auth and sandbox verification adapters. */
export function createTestImagePackageService(deps: Dependencies) {
  async function expectedFor(request: unknown): Promise<ExpectedTestPurchase | null | "unavailable"> {
    const binding = await deps.resolvePurchase(request);
    if (!binding || !isExpectedPurchase(binding)) return null;
    const stored = await deps.repository.findPurchase(binding.purchaseId);
    if (stored === "unavailable") return stored;
    if (!stored || !isExpectedPurchase(stored) ||
      binding.subjectId !== stored.subjectId || binding.provider !== stored.provider ||
      binding.packageCode !== stored.packageCode || binding.environment !== stored.environment ||
      binding.amountMinor !== stored.amountMinor || binding.currency !== stored.currency) return null;
    return stored;
  }

  async function grant(expected: ExpectedTestPurchase, payment: VerifiedTestPayment,
    verifierId: string | null): Promise<GrantResult> {
    if (!matchesPurchase(payment, expected)) return failure("invalid");
    const now = (deps.now ?? (() => new Date()))().getTime();
    // No future timestamp may extend expiry. Durable SQL repeats this gate.
    if (!Number.isFinite(now) || Date.parse(payment.confirmedAt) > now) return failure("invalid");
    // Persist only normalized evidence, even when a trusted verifier returns an
    // object with extra raw provider metadata at runtime.
    return deps.repository.grantVerifiedPayment({
      provider: payment.provider, paymentReference: payment.paymentReference,
      purchaseId: payment.purchaseId, subjectId: payment.subjectId,
      packageCode: payment.packageCode, amountMinor: payment.amountMinor,
      currency: payment.currency, environment: payment.environment,
      // Capture creation can precede successful verification (e.g. PENDING).
      // First trusted server confirmation starts validity; SQL pins it on replay.
      confirmedAt: new Date(now).toISOString(),
    }, verifierId);
  }

  return Object.freeze({
    async createPurchase(input: ExpectedTestPurchase) {
      if (!isExpectedPurchase(input)) return failure("invalid");
      try { return await deps.repository.createPurchase(input); }
      catch { return failure("unavailable"); }
    },
    async readEntitlement(request: unknown) {
      try {
        const expected = await expectedFor(request);
        if (expected === "unavailable") return failure("unavailable");
        if (!expected) return failure("denied");
        return await deps.repository.readEntitlement(expected.purchaseId, expected.subjectId);
      } catch { return failure("unavailable"); }
    },
    async confirmCapture(request: unknown): Promise<GrantResult> {
      try {
        const expected = await expectedFor(request);
        if (expected === "unavailable") return failure("unavailable");
        if (!expected || expected.provider !== "paypal_sandbox") return failure("denied");
        const verified = await deps.verifyCapture(request, expected);
        if (!verified || verified.provider !== "paypal_sandbox") return failure("invalid");
        return await grant(expected, verified, null);
      } catch { return failure("unavailable"); }
    },
    async confirmManualTest(request: unknown, evidence: ManualTestEvidence): Promise<GrantResult> {
      try {
        const owner = await deps.authorizeOwner(request);
        if (!owner || owner.role !== "owner" || !isReference(owner.verifierId)) return failure("denied");
        const expected = await expectedFor(request);
        if (expected === "unavailable") return failure("unavailable");
        if (!expected || expected.provider !== "manual_test") return failure("denied");
        if (!evidence || !isReference(evidence.reference) || !evidence.reference.startsWith("TEST-") ||
          evidence.amountMinor !== TEST_01.amountMinor || evidence.currency !== TEST_01.currency) {
          return failure("invalid");
        }
        // Timestamp and verifier come from server authority, never evidence/body.
        return await grant(expected, {
          ...expected, paymentReference: evidence.reference,
          confirmedAt: (deps.now ?? (() => new Date()))().toISOString(),
        }, owner.verifierId);
      } catch { return failure("unavailable"); }
    },
    async reserve(input: Parameters<ImagePackageRepository["reserve"]>[0]) {
      if (!input || !isUuid(input.purchaseId) || !isUuid(input.subjectId) ||
        !isUuid(input.operationId) || !["initial", "revision"].includes(input.kind)) return failure("invalid");
      try { return await deps.repository.reserve(input); }
      catch { return failure("unavailable"); }
    },
    async finish(input: Parameters<ImagePackageRepository["finish"]>[0]) {
      if (!input || !isUuid(input.purchaseId) || !isUuid(input.subjectId) || !isUuid(input.operationId) ||
        !["valid_delivery", "definite_failure", "no_compliant_delivery", "unknown"].includes(input.outcome) ||
        !Number.isSafeInteger(input.providerCostUsdMicros) || input.providerCostUsdMicros < 0) return failure("invalid");
      try { return await deps.repository.finish(input); }
      catch { return failure("unavailable"); }
    },
  });
}
