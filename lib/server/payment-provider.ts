import "server-only";

export type PaymentProviderStatus = "pending" | "paid" | "failed";

export type PaymentProviderCheckoutInput = Readonly<{
  paymentReference: string;
  quoteReference: string;
  amountMinor: number;
  currency: string;
  description: string;
  successUrl: string;
  cancelUrl: string;
  idempotencyKey: string;
}>;

export type PaymentProviderCheckoutResult = Readonly<{
  providerKey: string;
  providerCheckoutId: string;
  checkoutUrl: string;
  providerPaymentId?: string;
  expiresAt?: string;
}>;

type NormalizedPaymentProviderEventBase = Readonly<{
  providerEventId: string;
  providerEventType: string;
  paymentReference: string;
  providerPaymentId?: string;
}>;

export type NormalizedPaymentProviderEvent =
  | (NormalizedPaymentProviderEventBase & Readonly<{
      status: "paid";
      settledAmountMinor: number;
      settledCurrency: string;
    }>)
  | (NormalizedPaymentProviderEventBase & Readonly<{
      status: "pending" | "failed";
      settledAmountMinor?: never;
      settledCurrency?: never;
    }>);

export type PaymentProviderWebhookVerification =
  | Readonly<{ verified: false; reason: "invalid" | "rejected" }>
  | Readonly<{ verified: true; event: NormalizedPaymentProviderEvent }>;

export interface PaymentProviderAdapter {
  readonly providerKey: string;
  createCheckout(
    input: PaymentProviderCheckoutInput,
  ): Promise<PaymentProviderCheckoutResult>;
  verifyWebhook(
    rawBody: Uint8Array,
    headers: Headers,
  ): Promise<PaymentProviderWebhookVerification>;
}

export const NOVORA_PAYMENT_PROVIDER_ENV = "NOVORA_PAYMENT_PROVIDER" as const;

const REGISTERED_PAYMENT_PROVIDERS: Readonly<
  Record<string, PaymentProviderAdapter>
> = Object.freeze({});

export function listRegisteredPaymentProviderKeys(): readonly string[] {
  return Object.keys(REGISTERED_PAYMENT_PROVIDERS);
}

export function resolveRegisteredPaymentProvider(
  providerKey: unknown,
): PaymentProviderAdapter | null {
  if (typeof providerKey !== "string" || !providerKey) return null;
  return REGISTERED_PAYMENT_PROVIDERS[providerKey] ?? null;
}

export function getConfiguredPaymentProvider(): PaymentProviderAdapter | null {
  const selector = process.env[NOVORA_PAYMENT_PROVIDER_ENV]?.trim();
  return selector ? resolveRegisteredPaymentProvider(selector) : null;
}
