import "server-only";

import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { types as nodeUtilTypes } from "node:util";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  FIRST_PREVIEW_CUSTOMER_ACCESS_SIGNING_SECRET_ENV,
} from "./ai-sketch/first-preview-customer-access-contract";
import {
  isValidFirstPreviewAssetUuid,
  isValidFirstPreviewPublicReference,
} from "./ai-sketch/first-preview-generated-assets-contract";
import {
  readCustomerCommercialQuotation,
  type SafeCommercialQuotation,
} from "./commercial-quotation";
import {
  getConfiguredPaymentProvider,
  resolveRegisteredPaymentProvider,
  type NormalizedPaymentProviderEvent,
  type PaymentProviderAdapter,
  type PaymentProviderCheckoutResult,
  type PaymentProviderStatus,
} from "./payment-provider";
import { createSupabaseAdminClientOrNull } from "./supabase";

export const COMMERCIAL_PAYMENT_VERSION = "commercial_payment_v1" as const;
export const COMMERCIAL_PAYMENT_STATES = ["pending", "paid", "failed"] as const;
export const COMMERCIAL_PAYMENT_REFERENCE_PREFIX = "NOVORA-P-" as const;
export const COMMERCIAL_PAYMENT_BINDING_MAX_TOKEN_BYTES = 1_536 as const;

const PAYMENT_REFERENCE_PATTERN = /^NOVORA-P-[A-F0-9]{24}$/;
const QUOTE_REFERENCE_PATTERN = /^NOVORA-Q-[A-F0-9]{24}$/;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;
const AMOUNT_PATTERN = /^(0|[1-9]\d*)\.(\d{2})$/;
const PROVIDER_KEY_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const PROVIDER_ID_MAX_LENGTH = 255;
const PROVIDER_EVENT_TYPE_MAX_LENGTH = 160;
const BINDING_VERSION = 1 as const;
const BINDING_ALGORITHM = "HS256" as const;
const BINDING_AUDIENCE = "novora:commercial-payment" as const;
const BINDING_PURPOSE = "exact-current-commercial-quotation" as const;
const BINDING_SIGNING_DOMAIN =
  "NOVORA\0commercial-payment-binding\0v1\0hmac-sha-256\0";
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;
const MINIMUM_SIGNING_SECRET_BYTES = 32;
const MAXIMUM_SIGNING_SECRET_RAW_CHARACTERS = 4_096;

export type CommercialPaymentStatus = (typeof COMMERCIAL_PAYMENT_STATES)[number];

export type CommercialPaymentAuthority = Readonly<{
  publicReference: string;
  outputId: string;
  quoteReference: string;
  currency: string;
  totalAmount: string;
  amountMinor: number;
}>;

export type CommercialPaymentRecord = Readonly<{
  id: string;
  paymentReference: string;
  quoteReference: string;
  paymentVersion: typeof COMMERCIAL_PAYMENT_VERSION;
  providerKey: string;
  providerCheckoutId: string | null;
  providerPaymentId: string | null;
  amountMinor: number;
  currency: string;
  status: CommercialPaymentStatus;
  checkoutUrl: string | null;
  checkoutExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  paidAt: string | null;
  failedAt: string | null;
}>;

export type SafeCustomerPaymentState = Readonly<{
  paymentReference: string;
  status: CommercialPaymentStatus;
  checkoutUrl: string | null;
  checkoutExpiresAt: string | null;
  paidAt: string | null;
}>;

export type CommercialPaymentBindingClaims = Readonly<{
  v: typeof BINDING_VERSION;
  alg: typeof BINDING_ALGORITHM;
  aud: typeof BINDING_AUDIENCE;
  purpose: typeof BINDING_PURPOSE;
  publicReference: string;
  outputId: string;
  quoteReference: string;
}>;

export type CommercialPaymentInitiationResult =
  | Readonly<{ ok: true; payment: SafeCustomerPaymentState }>
  | Readonly<{
      ok: false;
      reason: "invalid" | "denied" | "stale_quotation" | "unavailable";
    }>;

export type CommercialPaymentWebhookResult =
  | Readonly<{
      ok: true;
      duplicate: boolean;
      status: CommercialPaymentStatus;
    }>
  | Readonly<{
      ok: false;
      reason: "unknown_provider" | "invalid" | "rejected" | "unavailable";
    }>;

export type CommercialPaymentPreparation = Readonly<{
  binding: string;
  providerConfigured: boolean;
  payment: SafeCustomerPaymentState | null;
}>;

export interface CommercialPaymentRepository {
  findCurrentForQuoteProvider(
    quoteReference: string,
    providerKey: string,
  ): Promise<CommercialPaymentRecord | null | "unavailable">;
  findCustomerStateForQuote(
    quoteReference: string,
  ): Promise<CommercialPaymentRecord | null | "unavailable">;
  createPending(input: Readonly<{
    paymentReference: string;
    quoteReference: string;
    providerKey: string;
    amountMinor: number;
    currency: string;
  }>): Promise<CommercialPaymentRecord | "conflict" | null>;
  attachCheckout(input: Readonly<{
    paymentReference: string;
    providerKey: string;
    providerCheckoutId: string;
    providerPaymentId: string | null;
    checkoutUrl: string;
    checkoutExpiresAt: string | null;
  }>): Promise<CommercialPaymentRecord | null>;
  markFailed(paymentReference: string): Promise<void>;
  applyProviderEvent(input: Readonly<{
    providerKey: string;
    event: NormalizedPaymentProviderEvent;
    payloadSha256: string;
  }>): Promise<
    | Readonly<{
        duplicate: boolean;
        payment: CommercialPaymentRecord;
      }>
    | "not_found"
    | "unavailable"
  >;
}

type PaymentDependencies = Readonly<{
  repository: CommercialPaymentRepository;
  signingSecret: string;
  provider: PaymentProviderAdapter | null;
  resolveCurrentQuotation: (
    publicReference: string,
    outputId: string,
  ) => Promise<SafeCommercialQuotation | null>;
  createPaymentReference?: () => string;
}>;

type WebhookDependencies = Readonly<{
  repository: CommercialPaymentRepository;
  resolveProvider: (providerKey: string) => PaymentProviderAdapter | null;
}>;

const PAYMENT_ROW_KEYS = [
  "id",
  "payment_reference",
  "commercial_quotation_reference",
  "payment_version",
  "provider_key",
  "provider_checkout_id",
  "provider_payment_id",
  "amount_minor",
  "currency",
  "status",
  "checkout_url",
  "checkout_expires_at",
  "created_at",
  "updated_at",
  "paid_at",
  "failed_at",
] as const;

const PAYMENT_SELECT = PAYMENT_ROW_KEYS.join(", ");

function snapshotOwnDataRecord(
  value: unknown,
  allowedKeys: readonly string[],
): Record<string, unknown> | null {
  try {
    if (
      value === null ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      nodeUtilTypes.isProxy(value)
    ) return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const keys = Reflect.ownKeys(value);
    if (keys.some((key) => typeof key !== "string" || !allowedKeys.includes(key))) {
      return null;
    }
    const snapshot: Record<string, unknown> = Object.create(null);
    for (const key of keys) {
      if (typeof key !== "string") return null;
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (
        !descriptor ||
        descriptor.enumerable !== true ||
        !Object.prototype.hasOwnProperty.call(descriptor, "value") ||
        Object.prototype.hasOwnProperty.call(descriptor, "get") ||
        Object.prototype.hasOwnProperty.call(descriptor, "set")
      ) return null;
      snapshot[key] = descriptor.value;
    }
    return snapshot;
  } catch {
    return null;
  }
}

function hasExactKeys(record: Record<string, unknown>, expected: readonly string[]) {
  const keys = Object.keys(record).sort();
  const sortedExpected = [...expected].sort();
  return keys.length === sortedExpected.length &&
    keys.every((key, index) => key === sortedExpected[index]);
}

function isUsableSigningSecret(value: unknown): value is string {
  return typeof value === "string" &&
    value.length <= MAXIMUM_SIGNING_SECRET_RAW_CHARACTERS &&
    value.length === value.trim().length &&
    Buffer.byteLength(value, "utf8") >= MINIMUM_SIGNING_SECRET_BYTES;
}

function isValidProviderText(value: unknown, maxLength = PROVIDER_ID_MAX_LENGTH): value is string {
  return typeof value === "string" &&
    value.length >= 1 &&
    value.length <= maxLength &&
    !/[\u0000-\u001F\u007F]/u.test(value);
}

function isValidIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isValidOptionalTimestamp(value: unknown): value is string | null {
  return value === null || isValidIsoTimestamp(value);
}

function isSafeCheckoutUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2_048) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function safePaymentFromRow(value: unknown): CommercialPaymentRecord | null {
  if (value === null) return null;
  const row = snapshotOwnDataRecord(value, PAYMENT_ROW_KEYS);
  if (!row || !hasExactKeys(row, PAYMENT_ROW_KEYS)) return null;
  const amountMinor = typeof row.amount_minor === "number"
    ? row.amount_minor
    : typeof row.amount_minor === "string" && /^\d+$/.test(row.amount_minor)
      ? Number(row.amount_minor)
      : Number.NaN;
  if (
    typeof row.id !== "string" || !isValidFirstPreviewAssetUuid(row.id) ||
    typeof row.payment_reference !== "string" ||
      !PAYMENT_REFERENCE_PATTERN.test(row.payment_reference) ||
    typeof row.commercial_quotation_reference !== "string" ||
      !QUOTE_REFERENCE_PATTERN.test(row.commercial_quotation_reference) ||
    row.payment_version !== COMMERCIAL_PAYMENT_VERSION ||
    typeof row.provider_key !== "string" ||
      !PROVIDER_KEY_PATTERN.test(row.provider_key) ||
    !Number.isSafeInteger(amountMinor) || amountMinor < 0 ||
    typeof row.currency !== "string" || !CURRENCY_PATTERN.test(row.currency) ||
    !COMMERCIAL_PAYMENT_STATES.includes(row.status as CommercialPaymentStatus) ||
    !isValidIsoTimestamp(row.created_at) ||
    !isValidIsoTimestamp(row.updated_at) ||
    !isValidOptionalTimestamp(row.checkout_expires_at) ||
    !isValidOptionalTimestamp(row.paid_at) ||
    !isValidOptionalTimestamp(row.failed_at) ||
    (row.provider_checkout_id !== null && !isValidProviderText(row.provider_checkout_id)) ||
    (row.provider_payment_id !== null && !isValidProviderText(row.provider_payment_id)) ||
    (row.checkout_url !== null && !isSafeCheckoutUrl(row.checkout_url))
  ) return null;
  return {
    id: row.id,
    paymentReference: row.payment_reference,
    quoteReference: row.commercial_quotation_reference,
    paymentVersion: COMMERCIAL_PAYMENT_VERSION,
    providerKey: row.provider_key,
    providerCheckoutId: row.provider_checkout_id as string | null,
    providerPaymentId: row.provider_payment_id as string | null,
    amountMinor,
    currency: row.currency,
    status: row.status as CommercialPaymentStatus,
    checkoutUrl: row.checkout_url as string | null,
    checkoutExpiresAt: row.checkout_expires_at as string | null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    paidAt: row.paid_at as string | null,
    failedAt: row.failed_at as string | null,
  };
}

function safeCustomerPayment(payment: CommercialPaymentRecord): SafeCustomerPaymentState {
  return {
    paymentReference: payment.paymentReference,
    status: payment.status,
    checkoutUrl: payment.status === "pending" ? payment.checkoutUrl : null,
    checkoutExpiresAt: payment.status === "pending" ? payment.checkoutExpiresAt : null,
    paidAt: payment.status === "paid" ? payment.paidAt : null,
  };
}

function hasReusablePendingCheckout(payment: CommercialPaymentRecord): boolean {
  return payment.status === "pending" &&
    payment.checkoutUrl !== null &&
    (payment.checkoutExpiresAt === null ||
      Date.parse(payment.checkoutExpiresAt) > Date.now());
}

export function commercialAmountToMinorUnits(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const match = AMOUNT_PATTERN.exec(value);
  if (!match) return null;
  const whole = Number(match[1]);
  const fraction = Number(match[2]);
  if (!Number.isSafeInteger(whole) || !Number.isSafeInteger(fraction)) return null;
  const wholeMinor = whole * 100;
  if (!Number.isSafeInteger(wholeMinor)) return null;
  const amountMinor = wholeMinor + fraction;
  return Number.isSafeInteger(amountMinor) ? amountMinor : null;
}

export function generateCommercialPaymentReference() {
  return `${COMMERCIAL_PAYMENT_REFERENCE_PREFIX}${randomBytes(12).toString("hex").toUpperCase()}`;
}

function quotationAuthority(
  publicReference: string,
  outputId: string,
  quotation: SafeCommercialQuotation,
): CommercialPaymentAuthority | null {
  const amountMinor = commercialAmountToMinorUnits(quotation.quotation.totalAmount);
  return QUOTE_REFERENCE_PATTERN.test(quotation.quoteReference) &&
    CURRENCY_PATTERN.test(quotation.quotation.currency) &&
    amountMinor !== null
    ? {
        publicReference,
        outputId,
        quoteReference: quotation.quoteReference,
        currency: quotation.quotation.currency,
        totalAmount: quotation.quotation.totalAmount,
        amountMinor,
      }
    : null;
}

function decodeCanonicalBase64Url(value: string): Buffer | null {
  if (!value || !BASE64URL_PATTERN.test(value)) return null;
  try {
    const decoded = Buffer.from(value, "base64url");
    return decoded.length > 0 && decoded.toString("base64url") === value
      ? decoded
      : null;
  } catch {
    return null;
  }
}

function signBinding(encodedPayload: string, signingSecret: string) {
  return createHmac("sha256", signingSecret)
    .update(`${BINDING_SIGNING_DOMAIN}${encodedPayload}`, "utf8")
    .digest();
}

export function createCommercialPaymentBinding(
  input: Readonly<{
    publicReference: string;
    outputId: string;
    quoteReference: string;
  }>,
  signingSecret: string,
): string | null {
  const record = snapshotOwnDataRecord(input, [
    "publicReference",
    "outputId",
    "quoteReference",
  ]);
  if (
    !record ||
    !hasExactKeys(record, ["publicReference", "outputId", "quoteReference"]) ||
    typeof record.publicReference !== "string" ||
      !isValidFirstPreviewPublicReference(record.publicReference) ||
    typeof record.outputId !== "string" ||
      !isValidFirstPreviewAssetUuid(record.outputId) ||
    typeof record.quoteReference !== "string" ||
      !QUOTE_REFERENCE_PATTERN.test(record.quoteReference) ||
    !isUsableSigningSecret(signingSecret)
  ) return null;
  const claims: CommercialPaymentBindingClaims = {
    v: BINDING_VERSION,
    alg: BINDING_ALGORITHM,
    aud: BINDING_AUDIENCE,
    purpose: BINDING_PURPOSE,
    publicReference: record.publicReference,
    outputId: record.outputId,
    quoteReference: record.quoteReference,
  };
  const encodedPayload = Buffer.from(JSON.stringify(claims), "utf8").toString("base64url");
  const token = `${encodedPayload}.${signBinding(encodedPayload, signingSecret).toString("base64url")}`;
  return Buffer.byteLength(token, "utf8") <= COMMERCIAL_PAYMENT_BINDING_MAX_TOKEN_BYTES
    ? token
    : null;
}

export function verifyCommercialPaymentBinding(
  token: unknown,
  signingSecret: unknown,
): CommercialPaymentBindingClaims | null {
  if (
    typeof token !== "string" ||
    Buffer.byteLength(token, "utf8") > COMMERCIAL_PAYMENT_BINDING_MAX_TOKEN_BYTES ||
    !isUsableSigningSecret(signingSecret)
  ) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const payload = decodeCanonicalBase64Url(parts[0]);
  const signature = decodeCanonicalBase64Url(parts[1]);
  if (!payload || !signature || signature.length !== 32) return null;
  const expected = signBinding(parts[0], signingSecret);
  if (!timingSafeEqual(signature, expected)) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload.toString("utf8"));
  } catch {
    return null;
  }
  const claims = snapshotOwnDataRecord(parsed, [
    "v",
    "alg",
    "aud",
    "purpose",
    "publicReference",
    "outputId",
    "quoteReference",
  ]);
  if (
    !claims ||
    !hasExactKeys(claims, [
      "v",
      "alg",
      "aud",
      "purpose",
      "publicReference",
      "outputId",
      "quoteReference",
    ]) ||
    claims.v !== BINDING_VERSION ||
    claims.alg !== BINDING_ALGORITHM ||
    claims.aud !== BINDING_AUDIENCE ||
    claims.purpose !== BINDING_PURPOSE ||
    typeof claims.publicReference !== "string" ||
      !isValidFirstPreviewPublicReference(claims.publicReference) ||
    typeof claims.outputId !== "string" ||
      !isValidFirstPreviewAssetUuid(claims.outputId) ||
    typeof claims.quoteReference !== "string" ||
      !QUOTE_REFERENCE_PATTERN.test(claims.quoteReference)
  ) return null;
  const canonical = Buffer.from(JSON.stringify({
    v: claims.v,
    alg: claims.alg,
    aud: claims.aud,
    purpose: claims.purpose,
    publicReference: claims.publicReference,
    outputId: claims.outputId,
    quoteReference: claims.quoteReference,
  }), "utf8").toString("base64url");
  return canonical === parts[0]
    ? claims as CommercialPaymentBindingClaims
    : null;
}

export function normalizeCommercialPaymentBody(
  body: unknown,
): Readonly<{ binding: string }> | null {
  const record = snapshotOwnDataRecord(body, ["binding"]);
  return record &&
    hasExactKeys(record, ["binding"]) &&
    typeof record.binding === "string" &&
    record.binding.length > 0 &&
    Buffer.byteLength(record.binding, "utf8") <= COMMERCIAL_PAYMENT_BINDING_MAX_TOKEN_BYTES
    ? { binding: record.binding }
    : null;
}

export function createSupabaseCommercialPaymentRepository(
  supabase: SupabaseClient,
): CommercialPaymentRepository {
  async function findCurrent(quoteReference: string, providerKey: string) {
    try {
      const { data, error } = await supabase
        .from("commercial_payments")
        .select(PAYMENT_SELECT)
        .eq("commercial_quotation_reference", quoteReference)
        .eq("provider_key", providerKey)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error || !Array.isArray(data)) return "unavailable" as const;
      const rows = data.map((row) => safePaymentFromRow(row));
      if (rows.some((row, index) => row === null && data[index] !== null)) {
        return "unavailable" as const;
      }
      return rows.find((row) => row?.status === "paid") ??
        rows.find((row) => row?.status === "pending") ??
        rows.find((row) => row?.status === "failed") ??
        null;
    } catch {
      return "unavailable" as const;
    }
  }

  return {
    findCurrentForQuoteProvider: findCurrent,
    async findCustomerStateForQuote(quoteReference) {
      try {
        const { data, error } = await supabase
          .from("commercial_payments")
          .select(PAYMENT_SELECT)
          .eq("commercial_quotation_reference", quoteReference)
          .order("created_at", { ascending: false })
          .limit(20);
        if (error || !Array.isArray(data)) return "unavailable";
        const rows = data.map((row) => safePaymentFromRow(row));
        if (rows.some((row, index) => row === null && data[index] !== null)) return "unavailable";
        return rows.find((row) => row?.status === "paid") ??
          rows.find((row) => row?.status === "pending") ??
          rows.find((row) => row?.status === "failed") ??
          null;
      } catch {
        return "unavailable";
      }
    },
    async createPending(input) {
      try {
        const { data, error } = await supabase
          .from("commercial_payments")
          .insert({
            payment_reference: input.paymentReference,
            commercial_quotation_reference: input.quoteReference,
            payment_version: COMMERCIAL_PAYMENT_VERSION,
            provider_key: input.providerKey,
            amount_minor: input.amountMinor,
            currency: input.currency,
            status: "pending",
          })
          .select(PAYMENT_SELECT)
          .maybeSingle();
        if (error) return error.code === "23505" ? "conflict" : null;
        return safePaymentFromRow(data);
      } catch (error) {
        return error && typeof error === "object" && "code" in error && error.code === "23505"
          ? "conflict"
          : null;
      }
    },
    async attachCheckout(input) {
      try {
        const { data, error } = await supabase
          .from("commercial_payments")
          .update({
            provider_checkout_id: input.providerCheckoutId,
            provider_payment_id: input.providerPaymentId,
            checkout_url: input.checkoutUrl,
            checkout_expires_at: input.checkoutExpiresAt,
            updated_at: new Date().toISOString(),
          })
          .eq("payment_reference", input.paymentReference)
          .eq("provider_key", input.providerKey)
          .eq("status", "pending")
          .select(PAYMENT_SELECT)
          .maybeSingle();
        return error ? null : safePaymentFromRow(data);
      } catch {
        return null;
      }
    },
    async markFailed(paymentReference) {
      try {
        const now = new Date().toISOString();
        await supabase
          .from("commercial_payments")
          .update({ status: "failed", failed_at: now, updated_at: now })
          .eq("payment_reference", paymentReference)
          .eq("status", "pending");
      } catch {
        // A provider error never becomes a paid state, even if this best-effort write fails.
      }
    },
    async applyProviderEvent(input) {
      try {
        const { data, error } = await supabase.rpc("apply_commercial_payment_event", {
          p_provider_key: input.providerKey,
          p_payment_reference: input.event.paymentReference,
          p_provider_event_id: input.event.providerEventId,
          p_provider_event_type: input.event.providerEventType,
          p_normalized_status: input.event.status,
          p_provider_payment_id: input.event.providerPaymentId ?? null,
          p_payload_sha256: input.payloadSha256,
        });
        if (error || !Array.isArray(data) || data.length !== 1) return "unavailable";
        const result = data[0] as Record<string, unknown>;
        if (result.payment_found === false) return "not_found";
        const payment = safePaymentFromRow(result.payment);
        return payment && typeof result.duplicate === "boolean"
          ? { duplicate: result.duplicate, payment }
          : "unavailable";
      } catch {
        return "unavailable";
      }
    },
  };
}

function defaultDependencies(): PaymentDependencies | null {
  const supabase = createSupabaseAdminClientOrNull();
  const signingSecret = process.env[FIRST_PREVIEW_CUSTOMER_ACCESS_SIGNING_SECRET_ENV] ?? "";
  if (!supabase || !isUsableSigningSecret(signingSecret)) return null;
  return {
    repository: createSupabaseCommercialPaymentRepository(supabase),
    signingSecret,
    provider: getConfiguredPaymentProvider(),
    resolveCurrentQuotation: (publicReference, outputId) =>
      readCustomerCommercialQuotation(publicReference, outputId),
  };
}

function validateCheckoutResult(
  result: PaymentProviderCheckoutResult,
  provider: PaymentProviderAdapter,
): PaymentProviderCheckoutResult | null {
  return result.providerKey === provider.providerKey &&
    isValidProviderText(result.providerCheckoutId) &&
    isSafeCheckoutUrl(result.checkoutUrl) &&
    (result.providerPaymentId === undefined || isValidProviderText(result.providerPaymentId)) &&
    (result.expiresAt === undefined || isValidIsoTimestamp(result.expiresAt))
    ? result
    : null;
}

export async function prepareCommercialPayment(
  publicReference: unknown,
  outputId: unknown,
  expectedQuotation: SafeCommercialQuotation,
  dependencies?: PaymentDependencies,
): Promise<CommercialPaymentPreparation | null> {
  if (
    typeof publicReference !== "string" || !isValidFirstPreviewPublicReference(publicReference) ||
    typeof outputId !== "string" || !isValidFirstPreviewAssetUuid(outputId)
  ) return null;
  const active = dependencies ?? defaultDependencies();
  if (!active) return null;
  try {
    const current = await active.resolveCurrentQuotation(publicReference, outputId);
    if (!current || current.quoteReference !== expectedQuotation.quoteReference) return null;
    const authority = quotationAuthority(publicReference, outputId, current);
    if (!authority) return null;
    const binding = createCommercialPaymentBinding(authority, active.signingSecret);
    if (!binding) return null;
    const durable = await active.repository.findCustomerStateForQuote(authority.quoteReference);
    const payment = durable === "unavailable" || !durable
      ? null
      : safeCustomerPayment(durable);
    return active.provider || payment
      ? {
          binding,
          providerConfigured: Boolean(active.provider),
          payment,
        }
      : null;
  } catch {
    return null;
  }
}

export async function initiateCommercialPayment(
  routePublicReference: unknown,
  body: unknown,
  urls: Readonly<{ successUrl: string; cancelUrl: string }>,
  dependencies?: PaymentDependencies,
): Promise<CommercialPaymentInitiationResult> {
  if (
    typeof routePublicReference !== "string" ||
    !isValidFirstPreviewPublicReference(routePublicReference) ||
    !isSafeCheckoutUrl(urls.successUrl) ||
    !isSafeCheckoutUrl(urls.cancelUrl)
  ) return { ok: false, reason: "invalid" };
  const normalized = normalizeCommercialPaymentBody(body);
  if (!normalized) return { ok: false, reason: "invalid" };
  const active = dependencies ?? defaultDependencies();
  if (!active) return { ok: false, reason: "unavailable" };
  const claims = verifyCommercialPaymentBinding(normalized.binding, active.signingSecret);
  if (!claims) return { ok: false, reason: "invalid" };
  if (claims.publicReference !== routePublicReference) {
    return { ok: false, reason: "denied" };
  }

  try {
    const quotation = await active.resolveCurrentQuotation(
      claims.publicReference,
      claims.outputId,
    );
    if (!quotation || quotation.quoteReference !== claims.quoteReference) {
      return { ok: false, reason: "stale_quotation" };
    }
    const authority = quotationAuthority(claims.publicReference, claims.outputId, quotation);
    if (!authority) return { ok: false, reason: "unavailable" };
    const provider = active.provider;
    if (!provider || !PROVIDER_KEY_PATTERN.test(provider.providerKey)) {
      return { ok: false, reason: "unavailable" };
    }

    let payment = await active.repository.findCurrentForQuoteProvider(
      authority.quoteReference,
      provider.providerKey,
    );
    if (payment === "unavailable") return { ok: false, reason: "unavailable" };
    if (payment?.status === "paid") {
      return { ok: true, payment: safeCustomerPayment(payment) };
    }
    if (payment && hasReusablePendingCheckout(payment)) {
      return { ok: true, payment: safeCustomerPayment(payment) };
    }
    if (payment?.status === "pending" && payment.checkoutUrl) {
      await active.repository.markFailed(payment.paymentReference);
      payment = null;
    }
    if (payment === "unavailable" || payment?.status !== "pending") {
      const created = await active.repository.createPending({
        paymentReference: (active.createPaymentReference ?? generateCommercialPaymentReference)(),
        quoteReference: authority.quoteReference,
        providerKey: provider.providerKey,
        amountMinor: authority.amountMinor,
        currency: authority.currency,
      });
      if (created === "conflict") {
        payment = await active.repository.findCurrentForQuoteProvider(
          authority.quoteReference,
          provider.providerKey,
        );
        if (payment === "unavailable" || !payment) {
          return { ok: false, reason: "unavailable" };
        }
        if (payment.status === "paid" || hasReusablePendingCheckout(payment)) {
          return { ok: true, payment: safeCustomerPayment(payment) };
        }
      } else {
        payment = created;
      }
    }
    if (!payment || payment.status !== "pending") {
      return { ok: false, reason: "unavailable" };
    }

    try {
      const checkout = validateCheckoutResult(await provider.createCheckout({
        paymentReference: payment.paymentReference,
        quoteReference: authority.quoteReference,
        amountMinor: authority.amountMinor,
        currency: authority.currency,
        description: `NOVORA quotation ${authority.quoteReference}`,
        successUrl: urls.successUrl,
        cancelUrl: urls.cancelUrl,
        idempotencyKey: payment.paymentReference,
      }), provider);
      if (!checkout) {
        await active.repository.markFailed(payment.paymentReference);
        return { ok: false, reason: "unavailable" };
      }
      const attached = await active.repository.attachCheckout({
        paymentReference: payment.paymentReference,
        providerKey: provider.providerKey,
        providerCheckoutId: checkout.providerCheckoutId,
        providerPaymentId: checkout.providerPaymentId ?? null,
        checkoutUrl: checkout.checkoutUrl,
        checkoutExpiresAt: checkout.expiresAt ?? null,
      });
      return attached
        ? { ok: true, payment: safeCustomerPayment(attached) }
        : { ok: false, reason: "unavailable" };
    } catch {
      await active.repository.markFailed(payment.paymentReference);
      return { ok: false, reason: "unavailable" };
    }
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

function normalizeVerifiedProviderEvent(
  event: NormalizedPaymentProviderEvent,
): NormalizedPaymentProviderEvent | null {
  return isValidProviderText(event.providerEventId) &&
    isValidProviderText(event.providerEventType, PROVIDER_EVENT_TYPE_MAX_LENGTH) &&
    PAYMENT_REFERENCE_PATTERN.test(event.paymentReference) &&
    COMMERCIAL_PAYMENT_STATES.includes(event.status as PaymentProviderStatus) &&
    (event.providerPaymentId === undefined || isValidProviderText(event.providerPaymentId))
    ? event
    : null;
}

export async function handleCommercialPaymentWebhook(
  providerKey: unknown,
  rawBody: Uint8Array,
  headers: Headers,
  dependencies?: WebhookDependencies,
): Promise<CommercialPaymentWebhookResult> {
  if (
    typeof providerKey !== "string" ||
    !PROVIDER_KEY_PATTERN.test(providerKey) ||
    !(rawBody instanceof Uint8Array)
  ) return { ok: false, reason: "unknown_provider" };
  const supabase = dependencies ? null : createSupabaseAdminClientOrNull();
  const active = dependencies ?? (supabase
    ? {
        repository: createSupabaseCommercialPaymentRepository(supabase),
        resolveProvider: resolveRegisteredPaymentProvider,
      }
    : null);
  const provider = active?.resolveProvider(providerKey) ?? null;
  if (!active || !provider || provider.providerKey !== providerKey) {
    return { ok: false, reason: "unknown_provider" };
  }
  try {
    const verification = await provider.verifyWebhook(rawBody, headers);
    if (verification.verified === false) {
      return { ok: false, reason: verification.reason };
    }
    const event = normalizeVerifiedProviderEvent(verification.event);
    if (!event) return { ok: false, reason: "invalid" };
    const applied = await active.repository.applyProviderEvent({
      providerKey,
      event,
      payloadSha256: createHash("sha256").update(rawBody).digest("hex"),
    });
    return applied === "unavailable" || applied === "not_found"
      ? { ok: false, reason: "unavailable" }
      : {
          ok: true,
          duplicate: applied.duplicate,
          status: applied.payment.status,
        };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}
