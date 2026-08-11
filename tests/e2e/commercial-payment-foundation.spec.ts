import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import Module, { createRequire } from "node:module";
import path from "node:path";

const internals = Module as unknown as {
  _resolveFilename(request: string, parent: unknown, isMain: boolean, options?: unknown): string;
};
const shim = path.join(process.cwd(), "node_modules", "next", "dist", "compiled", "server-only", "empty.js");
const original = internals._resolveFilename;
internals._resolveFilename = function (request, parent, isMain, options) {
  return request === "server-only" ? shim : original.call(this, request, parent, isMain, options);
};
const testRequire = createRequire(
  path.join(process.cwd(), "tests", "e2e", "commercial-payment-foundation.spec.ts"),
);
const paymentModule = testRequire(
  "../../lib/server/commercial-payment",
) as typeof import("../../lib/server/commercial-payment");
const providerModule = testRequire(
  "../../lib/server/payment-provider",
) as typeof import("../../lib/server/payment-provider");
internals._resolveFilename = original;

const PUBLIC_REFERENCE = "NOVORA-CB-20260811-M43P";
const OUTPUT_ID = "223e4567-e89b-42d3-a456-426614174000";
const PAYMENT_ID = "323e4567-e89b-42d3-a456-426614174000";
const QUOTE_REFERENCE = "NOVORA-Q-0123456789ABCDEF01234567";
const STALE_QUOTE_REFERENCE = "NOVORA-Q-AAAAAAAAAAAAAAAAAAAAAAAA";
const PAYMENT_REFERENCE = "NOVORA-P-0123456789ABCDEF01234567";
const SIGNING_SECRET = "m4-3-focused-test-signing-secret-000000000000";
const NOW = "2026-08-11T09:00:00.000Z";
const URLS = {
  successUrl: `https://novora.example/design/preview/${PUBLIC_REFERENCE}?payment=returned`,
  cancelUrl: `https://novora.example/design/preview/${PUBLIC_REFERENCE}?payment=cancelled`,
};

function quotation(quoteReference = QUOTE_REFERENCE) {
  return {
    quoteReference,
    issuedAt: NOW,
    quotation: {
      quotationVersion: "commercial_quotation_v1" as const,
      currency: "JPY",
      lineItems: [{ description: "Confirmed design quotation", amount: "1234.50" }],
      totalAmount: "1234.50",
      validUntil: null,
      note: null,
    },
  };
}

function paymentRecord(
  status: "pending" | "paid" | "failed" = "pending",
  checkoutUrl: string | null = null,
) {
  return {
    id: PAYMENT_ID,
    paymentReference: PAYMENT_REFERENCE,
    quoteReference: QUOTE_REFERENCE,
    paymentVersion: "commercial_payment_v1" as const,
    providerKey: "fake",
    providerCheckoutId: checkoutUrl ? "checkout_123" : null,
    providerPaymentId: status === "paid" ? "payment_123" : null,
    amountMinor: 123450,
    currency: "JPY",
    status,
    checkoutUrl,
    checkoutExpiresAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    paidAt: status === "paid" ? NOW : null,
    failedAt: status === "failed" ? NOW : null,
  };
}

function fixture(input: {
  providerConfigured?: boolean;
  currentPayment?: ReturnType<typeof paymentRecord> | null;
  resolvedQuoteReference?: string | null;
  webhookVerified?: boolean;
} = {}) {
  const writes: unknown[] = [];
  const providerCalls: Array<Record<string, unknown>> = [];
  const eventWrites: string[] = [];
  const seenEvents = new Set<string>();
  let current = input.currentPayment ?? null;
  let webhookStatus: "pending" | "paid" | "failed" = "pending";
  const provider: import("../../lib/server/payment-provider").PaymentProviderAdapter = {
    providerKey: "fake",
    async createCheckout(value) {
      providerCalls.push({ ...value });
      return {
        providerKey: "fake",
        providerCheckoutId: "checkout_123",
        checkoutUrl: "https://payments.example/checkout/123",
      };
    },
    async verifyWebhook() {
      return input.webhookVerified === false
        ? { verified: false as const, reason: "rejected" as const }
        : {
            verified: true as const,
            event: {
              providerEventId: "event_123",
              providerEventType: "payment.updated",
              paymentReference: PAYMENT_REFERENCE,
              status: webhookStatus,
              providerPaymentId: "payment_123",
            },
          };
    },
  };
  const repository: import("../../lib/server/commercial-payment").CommercialPaymentRepository = {
    async findCurrentForQuoteProvider() {
      return current;
    },
    async findCustomerStateForQuote() {
      return current;
    },
    async createPending(value) {
      writes.push({ ...value });
      current = paymentRecord("pending");
      return current;
    },
    async attachCheckout(value) {
      writes.push({ ...value });
      current = paymentRecord("pending", String(value.checkoutUrl));
      return current;
    },
    async markFailed() {
      current = paymentRecord("failed");
    },
    async applyProviderEvent(value) {
      const duplicate = seenEvents.has(value.event.providerEventId);
      if (!duplicate) {
        seenEvents.add(value.event.providerEventId);
        eventWrites.push(value.event.providerEventId);
        if (current?.status !== "paid") current = paymentRecord(value.event.status);
      }
      return { duplicate, payment: current ?? paymentRecord(value.event.status) };
    },
  };
  const dependencies = {
    repository,
    signingSecret: SIGNING_SECRET,
    provider: input.providerConfigured === false ? null : provider,
    async resolveCurrentQuotation() {
      return input.resolvedQuoteReference === null
        ? null
        : quotation(input.resolvedQuoteReference ?? QUOTE_REFERENCE);
    },
    createPaymentReference: () => PAYMENT_REFERENCE,
  };
  return {
    dependencies,
    eventWrites,
    provider,
    providerCalls,
    repository,
    setWebhookStatus(value: "pending" | "paid" | "failed") {
      webhookStatus = value;
    },
    writes,
  };
}

function binding(quoteReference = QUOTE_REFERENCE) {
  const value = paymentModule.createCommercialPaymentBinding(
    { publicReference: PUBLIC_REFERENCE, outputId: OUTPUT_ID, quoteReference },
    SIGNING_SECRET,
  );
  if (!value) throw new Error("Expected a payment binding fixture.");
  return value;
}

test("no real provider is registered by default", () => {
  expect(providerModule.listRegisteredPaymentProviderKeys()).toEqual([]);
  expect(providerModule.resolveRegisteredPaymentProvider("stripe")).toBeNull();
});

test("no configured provider causes safe unavailable behavior", async () => {
  const value = fixture({ providerConfigured: false });
  await expect(paymentModule.initiateCommercialPayment(
    PUBLIC_REFERENCE,
    { binding: binding() },
    URLS,
    value.dependencies,
  )).resolves.toEqual({ ok: false, reason: "unavailable" });
});

test("unconfigured provider causes no payment repository write", async () => {
  const value = fixture({ providerConfigured: false });
  await paymentModule.initiateCommercialPayment(
    PUBLIC_REFERENCE,
    { binding: binding() },
    URLS,
    value.dependencies,
  );
  expect(value.writes).toHaveLength(0);
  expect(value.providerCalls).toHaveLength(0);
});

for (const forbidden of ["quoteReference", "amount", "currency", "provider", "status"]) {
  test(`browser cannot control ${forbidden}`, async () => {
    const value = fixture();
    await expect(paymentModule.initiateCommercialPayment(
      PUBLIC_REFERENCE,
      { binding: binding(), [forbidden]: "browser-controlled" },
      URLS,
      value.dependencies,
    )).resolves.toEqual({ ok: false, reason: "invalid" });
    expect(value.writes).toHaveLength(0);
  });
}

test("exact current M4-2 quotation is server-resolved", async () => {
  const value = fixture();
  await paymentModule.initiateCommercialPayment(
    PUBLIC_REFERENCE,
    { binding: binding() },
    URLS,
    value.dependencies,
  );
  expect(value.providerCalls).toHaveLength(1);
});

test("amount and currency come from the server quotation", async () => {
  const value = fixture();
  await paymentModule.initiateCommercialPayment(
    PUBLIC_REFERENCE,
    { binding: binding() },
    URLS,
    value.dependencies,
  );
  expect(value.providerCalls[0]).toMatchObject({ amountMinor: 123450, currency: "JPY" });
  expect(paymentModule.commercialAmountToMinorUnits("90071992547409.91")).toBe(9007199254740991);
  expect(paymentModule.commercialAmountToMinorUnits("90071992547409.92")).toBeNull();
});

test("signed binding is tied to exact public reference, output, and quote", () => {
  expect(paymentModule.verifyCommercialPaymentBinding(binding(), SIGNING_SECRET)).toMatchObject({
    publicReference: PUBLIC_REFERENCE,
    outputId: OUTPUT_ID,
    quoteReference: QUOTE_REFERENCE,
  });
  expect(paymentModule.verifyCommercialPaymentBinding(`${binding()}x`, SIGNING_SECRET)).toBeNull();
});

test("stale quotation binding is rejected", async () => {
  const value = fixture({ resolvedQuoteReference: QUOTE_REFERENCE });
  await expect(paymentModule.initiateCommercialPayment(
    PUBLIC_REFERENCE,
    { binding: binding(STALE_QUOTE_REFERENCE) },
    URLS,
    value.dependencies,
  )).resolves.toEqual({ ok: false, reason: "stale_quotation" });
  expect(value.writes).toHaveLength(0);
});

test("fake provider receives exact server amount and currency", async () => {
  const value = fixture();
  await paymentModule.initiateCommercialPayment(PUBLIC_REFERENCE, { binding: binding() }, URLS, value.dependencies);
  expect(value.providerCalls[0]).toMatchObject({
    quoteReference: QUOTE_REFERENCE,
    amountMinor: 123450,
    currency: "JPY",
  });
});

test("provider idempotency key equals server payment reference", async () => {
  const value = fixture();
  await paymentModule.initiateCommercialPayment(PUBLIC_REFERENCE, { binding: binding() }, URLS, value.dependencies);
  expect(value.providerCalls[0]).toMatchObject({
    paymentReference: PAYMENT_REFERENCE,
    idempotencyKey: PAYMENT_REFERENCE,
  });
});

test("already-paid quote does not create a new checkout", async () => {
  const value = fixture({ currentPayment: paymentRecord("paid") });
  const result = await paymentModule.initiateCommercialPayment(
    PUBLIC_REFERENCE,
    { binding: binding() },
    URLS,
    value.dependencies,
  );
  expect(result).toMatchObject({ ok: true, payment: { status: "paid" } });
  expect(value.providerCalls).toHaveLength(0);
  expect(value.writes).toHaveLength(0);
});

test("reusable pending checkout does not create a duplicate provider call", async () => {
  const value = fixture({
    currentPayment: paymentRecord("pending", "https://payments.example/checkout/existing"),
  });
  const result = await paymentModule.initiateCommercialPayment(
    PUBLIC_REFERENCE,
    { binding: binding() },
    URLS,
    value.dependencies,
  );
  expect(result).toMatchObject({ ok: true, payment: { status: "pending" } });
  expect(value.providerCalls).toHaveLength(0);
});

test("invalid webhook verification causes zero mutations", async () => {
  const value = fixture({ webhookVerified: false });
  const result = await paymentModule.handleCommercialPaymentWebhook(
    "fake",
    new TextEncoder().encode("invalid"),
    new Headers(),
    { repository: value.repository, resolveProvider: () => value.provider },
  );
  expect(result).toEqual({ ok: false, reason: "rejected" });
  expect(value.eventWrites).toHaveLength(0);
});

test("verified webhook normalizes pending, paid, and failed", async () => {
  for (const status of ["pending", "paid", "failed"] as const) {
    const value = fixture();
    value.setWebhookStatus(status);
    const result = await paymentModule.handleCommercialPaymentWebhook(
      "fake",
      new TextEncoder().encode(status),
      new Headers(),
      { repository: value.repository, resolveProvider: () => value.provider },
    );
    expect(result).toMatchObject({ ok: true, status });
  }
});

test("duplicate provider event is idempotent", async () => {
  const value = fixture();
  const dependencies = { repository: value.repository, resolveProvider: () => value.provider };
  const first = await paymentModule.handleCommercialPaymentWebhook(
    "fake", new TextEncoder().encode("same"), new Headers(), dependencies,
  );
  const second = await paymentModule.handleCommercialPaymentWebhook(
    "fake", new TextEncoder().encode("same"), new Headers(), dependencies,
  );
  expect(first).toMatchObject({ ok: true, duplicate: false });
  expect(second).toMatchObject({ ok: true, duplicate: true });
  expect(value.eventWrites).toHaveLength(1);
});

test("paid state cannot be downgraded", async () => {
  const value = fixture({ currentPayment: paymentRecord("paid") });
  value.setWebhookStatus("failed");
  const result = await paymentModule.handleCommercialPaymentWebhook(
    "fake",
    new TextEncoder().encode("later-failure"),
    new Headers(),
    { repository: value.repository, resolveProvider: () => value.provider },
  );
  expect(result).toMatchObject({ ok: true, status: "paid" });
});

test("webhook never creates an M4-4 order", () => {
  const source = readFileSync(path.join(process.cwd(), "lib", "server", "commercial-payment.ts"), "utf8");
  const webhookRoute = readFileSync(
    path.join(process.cwd(), "app", "api", "commercial-payment", "webhook", "[provider]", "route.ts"),
    "utf8",
  );
  expect(`${source}\n${webhookRoute}`).not.toMatch(/commercial_orders|createOrder|insertOrder/);
});

test("customer payment UI is absent while no real provider is configured", async () => {
  const value = fixture({ providerConfigured: false, currentPayment: null });
  await expect(paymentModule.prepareCommercialPayment(
    PUBLIC_REFERENCE,
    OUTPUT_ID,
    quotation(),
    value.dependencies,
  )).resolves.toBeNull();
  const source = readFileSync(
    path.join(process.cwd(), "app", "design", "preview", "[public_reference]", "CommercialPayment.tsx"),
    "utf8",
  );
  expect(source).not.toMatch(/Pay now|fake payment|test payment/i);
});

test("candidate SQL contains provider-neutral tables, RLS, grants, immutable authority, and atomic application", () => {
  const sql = readFileSync(
    path.join(process.cwd(), "docs", "novora-m4-3-commercial-payment-foundation-candidate.sql"),
    "utf8",
  );
  expect(sql.match(/CREATE TABLE/gi)).toHaveLength(2);
  expect(sql).toContain("CREATE TABLE public.commercial_payments");
  expect(sql).toContain("CREATE TABLE public.commercial_payment_events");
  expect(sql.match(/ENABLE ROW LEVEL SECURITY/g)).toHaveLength(2);
  expect(sql).toContain("FROM public, anon, authenticated");
  expect(sql).toContain("GRANT SELECT, INSERT, UPDATE ON TABLE public.commercial_payments");
  expect(sql).toContain("GRANT SELECT, INSERT ON TABLE public.commercial_payment_events");
  expect(sql).toContain("commercial payment authority fields are immutable");
  expect(sql).toContain("paid commercial payment is terminal");
  expect(sql).toContain("public.apply_commercial_payment_event");
  expect(sql).not.toMatch(/GRANT\s+(UPDATE|DELETE)\s+ON TABLE public\.commercial_payment_events/i);
});

test("no provider SDK, real provider, or payment key is introduced", () => {
  const packageJson = readFileSync(path.join(process.cwd(), "package.json"), "utf8");
  const providerSource = readFileSync(
    path.join(process.cwd(), "lib", "server", "payment-provider.ts"),
    "utf8",
  );
  expect(packageJson).not.toMatch(/stripe|paypal|adyen|komoju/i);
  expect(providerModule.listRegisteredPaymentProviderKeys()).toEqual([]);
  expect(providerSource).not.toMatch(/SECRET|API_KEY|PAYMENT_KEY/);
});
