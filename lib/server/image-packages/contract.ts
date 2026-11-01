import "server-only";

/** TEST-01 is a synthetic image package, never a jewelry quotation/order. */
export const TEST_01 = Object.freeze({
  packageCode: "TEST-01" as const,
  environment: "TEST" as const,
  amountMinor: 100 as const,
  currency: "USD" as const,
  initialOutputs: 5 as const,
  revisions: 5 as const,
  validitySeconds: 7 * 24 * 60 * 60,
});

export type TestPaymentProvider = "paypal_sandbox" | "manual_test";
export type ImageUseKind = "initial" | "revision";
export type ImageUseState = "reserved" | "unknown" | "settled" | "released";
export type ImageUseOutcome =
  | "valid_delivery"
  | "definite_failure"
  | "no_compliant_delivery"
  | "unknown";
export type PackageOwner = Readonly<{ scope: string; identity: string }>;
export type DispatchBinding = Readonly<{
  owner: PackageOwner;
  reservationId: string;
  operationId: string;
  kind: ImageUseKind;
  briefId: string;
  sourceOutputId?: string;
}>;
export type DispatchClaim = "claimed" | "already_claimed" | "denied" | "unknown";
export type DispatchSettlement = DispatchBinding & Readonly<{
  outcome: "delivered" | "definite_failure" | "unknown";
  providerCostUsdMicros: number;
}>;

export type ExpectedTestPurchase = Readonly<{
  purchaseId: string;
  subjectId: string;
  owner: PackageOwner;
  sandboxMerchantId: string | null;
  provider: TestPaymentProvider;
  packageCode: "TEST-01";
  environment: "TEST";
  amountMinor: 100;
  currency: "USD";
}>;

/** Returned only by a trusted server verifier, never read from a request body.
 * paymentReference is the immutable CAPTURE id (not webhook/event/order id).
 * subjectId is an opaque server-resolved UUID, not an email or browser claim.
 */
export type VerifiedTestPayment = Readonly<{
  provider: TestPaymentProvider;
  paymentReference: string;
  purchaseId: string;
  subjectId: string;
  packageCode: "TEST-01";
  amountMinor: number;
  currency: string;
  environment: "TEST";
  /** Trusted verification instant, not provider capture.create_time. The service
   * pins the first confirmation to its own server clock before the atomic grant. */
  confirmedAt: string;
}>;

export type ManualTestEvidence = Readonly<{
  reference: string; // Explicit TEST- prefix; no documents, notes or raw payment data.
  amountMinor: number;
  currency: string;
}>;

export type PackageFailure = Readonly<{
  ok: false;
  reason: "invalid" | "denied" | "conflict" | "not_found" | "expired" |
    "exhausted" | "unavailable";
}>;
export type GrantResult = PackageFailure | Readonly<{
  ok: true;
  duplicate: boolean;
  purchaseId: string;
  grantedAt: string;
  expiresAt: string;
}>;
export type UseResult = PackageFailure | Readonly<{
  ok: true;
  duplicate: boolean;
  operationId: string;
  state: ImageUseState;
  providerCostUsdMicros: number;
}>;
export type EntitlementResult = PackageFailure | Readonly<{
  ok: true;
  purchaseId: string;
  state: "active" | "expired";
  grantedAt: string;
  expiresAt: string;
  initialRemaining: number;
  revisionRemaining: number;
}>;

export interface ImagePackageRepository {
  createPurchase(input: ExpectedTestPurchase): Promise<PackageFailure | { ok: true }>;
  findPurchase(purchaseId: string): Promise<ExpectedTestPurchase | null | "unavailable">;
  readEntitlement(purchaseId: string, subjectId: string): Promise<EntitlementResult>;
  claimDispatch(input: DispatchBinding): Promise<DispatchClaim>;
  settleDispatch(input: DispatchSettlement): Promise<UseResult>;
  /** Must lock the purchase, recheck ALL expected fields and grant once in ONE
   * transaction. A read followed by a separate insert/update is insufficient. */
  grantVerifiedPayment(
    payment: VerifiedTestPayment,
    manualVerifierId: string | null,
  ): Promise<GrantResult>;
  reserve(input: DispatchBinding & Readonly<{
    purchaseId: string;
    subjectId: string;
    operationId: string;
    kind: ImageUseKind;
  }>): Promise<UseResult>;
  finish(input: Readonly<{
    purchaseId: string;
    subjectId: string;
    operationId: string;
    outcome: ImageUseOutcome;
    /** Cumulative per-operation known cost, monotonic; never additive on replay. */
    providerCostUsdMicros: number;
  }>): Promise<UseResult>;
}

export const isUuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value);

export const isReference = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(value);
export const isOwner = (value: PackageOwner): boolean => !!value &&
  typeof value.scope === "string" && /^[a-f0-9]{64}$/.test(value.scope) &&
  typeof value.identity === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(value.identity);
export const isDispatchBinding = (value: DispatchBinding): boolean => !!value &&
  isOwner(value.owner) && isUuid(value.reservationId) && isUuid(value.operationId) && isUuid(value.briefId) &&
  ((value.kind === "initial" && value.sourceOutputId === undefined) ||
    (value.kind === "revision" && isUuid(value.sourceOutputId)));

export const isInstant = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
  Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;

export function isExpectedPurchase(value: ExpectedTestPurchase): boolean {
  return !!value && isUuid(value.purchaseId) && isUuid(value.subjectId) &&
    isOwner(value.owner) && (value.provider === "manual_test" ? value.sandboxMerchantId === null :
      typeof value.sandboxMerchantId === "string" && /^[A-Z0-9]{13}$/.test(value.sandboxMerchantId)) &&
    ["paypal_sandbox", "manual_test"].includes(value.provider) &&
    value.packageCode === TEST_01.packageCode && value.environment === "TEST" &&
    value.amountMinor === TEST_01.amountMinor && value.currency === TEST_01.currency;
}

export function matchesPurchase(payment: VerifiedTestPayment, expected: ExpectedTestPurchase): boolean {
  return !!payment && isExpectedPurchase(expected) &&
    payment.purchaseId === expected.purchaseId && payment.subjectId === expected.subjectId &&
    payment.provider === expected.provider && payment.packageCode === expected.packageCode &&
    payment.environment === expected.environment && payment.amountMinor === expected.amountMinor &&
    payment.currency === expected.currency && isReference(payment.paymentReference) &&
    isInstant(payment.confirmedAt);
}
