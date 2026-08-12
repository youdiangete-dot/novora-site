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
const currencyModule = testRequire(
  "../../lib/server/commercial-currency",
) as typeof import("../../lib/server/commercial-currency");
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
const QUOTATION_AMOUNT = "1234.50";
const QUOTATION_AMOUNT_MINOR = 123450;
const QUOTATION_CURRENCY = "USD";
const URLS = {
  successUrl: `https://novora.example/design/preview/${PUBLIC_REFERENCE}?payment=returned`,
  cancelUrl: `https://novora.example/design/preview/${PUBLIC_REFERENCE}?payment=cancelled`,
};

function quotation(
  quoteReference = QUOTE_REFERENCE,
  overrides: Readonly<{
    currency?: string;
    totalAmount?: string;
    validUntil?: string | null;
  }> = {},
) {
  const totalAmount = overrides.totalAmount ?? QUOTATION_AMOUNT;
  return {
    quoteReference,
    issuedAt: NOW,
    quotation: {
      quotationVersion: "commercial_quotation_v1" as const,
      currency: overrides.currency ?? QUOTATION_CURRENCY,
      lineItems: [{ description: "Confirmed design quotation", amount: totalAmount }],
      totalAmount,
      validUntil: overrides.validUntil ?? null,
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
    amountMinor: QUOTATION_AMOUNT_MINOR,
    currency: QUOTATION_CURRENCY,
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
  resolvedQuotation?: ReturnType<typeof quotation> | null;
  webhookVerified?: boolean;
  checkoutOutcomes?: readonly ("success" | "throw")[];
  omitSettledAmount?: boolean;
  omitSettledCurrency?: boolean;
  settledAmountMinor?: number;
  settledCurrency?: string;
  now?: () => Date;
} = {}) {
  const writes: unknown[] = [];
  const providerCalls: Array<Record<string, unknown>> = [];
  const eventWrites: string[] = [];
  const failedPaymentReferences: string[] = [];
  const createdPaymentReferences: string[] = [];
  const seenEvents = new Set<string>();
  let current = input.currentPayment ?? null;
  let webhookStatus: "pending" | "paid" | "failed" = "pending";
  const provider: import("../../lib/server/payment-provider").PaymentProviderAdapter = {
    providerKey: "fake",
    async createCheckout(value) {
      providerCalls.push({ ...value });
      const outcome = input.checkoutOutcomes?.[providerCalls.length - 1] ?? "success";
      if (outcome === "throw") throw new Error("ambiguous provider transport failure");
      return {
        providerKey: "fake",
        providerCheckoutId: "checkout_123",
        checkoutUrl: "https://payments.example/checkout/123",
      };
    },
    async verifyWebhook() {
      if (input.webhookVerified === false) {
        return { verified: false as const, reason: "rejected" as const };
      }
      const event: Record<string, unknown> = {
        providerEventId: "event_123",
        providerEventType: "payment.updated",
        paymentReference: PAYMENT_REFERENCE,
        status: webhookStatus,
        providerPaymentId: "payment_123",
      };
      if (webhookStatus === "paid") {
        if (!input.omitSettledAmount) {
          event.settledAmountMinor = input.settledAmountMinor ?? QUOTATION_AMOUNT_MINOR;
        }
        if (!input.omitSettledCurrency) {
          event.settledCurrency = input.settledCurrency ?? QUOTATION_CURRENCY;
        }
      }
      return {
        verified: true as const,
        event: event as unknown as import("../../lib/server/payment-provider").NormalizedPaymentProviderEvent,
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
      createdPaymentReferences.push(value.paymentReference);
      current = paymentRecord("pending");
      return current;
    },
    async attachCheckout(value) {
      writes.push({ ...value });
      current = paymentRecord("pending", String(value.checkoutUrl));
      return current;
    },
    async markFailed(paymentReference) {
      failedPaymentReferences.push(paymentReference);
      current = paymentRecord("failed");
    },
    async applyProviderEvent(value) {
      if (
        value.event.status === "paid" &&
        (
          value.event.settledAmountMinor !== QUOTATION_AMOUNT_MINOR ||
          value.event.settledCurrency !== QUOTATION_CURRENCY
        )
      ) return "unavailable";
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
      if (Object.prototype.hasOwnProperty.call(input, "resolvedQuotation")) {
        return input.resolvedQuotation ?? null;
      }
      return input.resolvedQuoteReference === null
        ? null
        : quotation(input.resolvedQuoteReference ?? QUOTE_REFERENCE);
    },
    createPaymentReference: () => PAYMENT_REFERENCE,
    now: input.now,
  };
  return {
    createdPaymentReferences,
    dependencies,
    eventWrites,
    failedPaymentReferences,
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

for (const forbidden of [
  "quoteReference",
  "amount",
  "currency",
  "provider",
  "status",
  "settledAmountMinor",
  "settledCurrency",
]) {
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
  expect(value.providerCalls[0]).toMatchObject({
    amountMinor: QUOTATION_AMOUNT_MINOR,
    currency: QUOTATION_CURRENCY,
  });
  expect(paymentModule.commercialAmountToMinorUnits("90071992547409.91", "USD"))
    .toBe(9007199254740991);
  expect(paymentModule.commercialAmountToMinorUnits("90071992547409.92", "USD"))
    .toBeNull();
});

test("currency minor-unit exponents are exact and bounded", () => {
  for (const [amount, currency, expected] of [
    ["1234.50", "USD", 123450],
    ["1234.00", "JPY", 1234],
    ["1234.50", "JPY", null],
    ["1.234", "KWD", 1234],
    ["1.23", "KWD", 1230],
    ["0.29", "USD", 29],
    ["1.2345", "KWD", null],
    ["1.00", "ZZZ", null],
  ] as const) {
    expect(paymentModule.commercialAmountToMinorUnits(amount, currency)).toBe(expected);
    expect(paymentModule.commercialAmountToMinorUnits(amount, currency)).toBe(
      currencyModule.commercialAmountToMinorUnits(amount, currency),
    );
  }
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
    amountMinor: QUOTATION_AMOUNT_MINOR,
    currency: QUOTATION_CURRENCY,
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

test("ambiguous checkout failure preserves and reuses the durable payment identity", async () => {
  const value = fixture({ checkoutOutcomes: ["throw", "success"] });
  await expect(paymentModule.initiateCommercialPayment(
    PUBLIC_REFERENCE,
    { binding: binding() },
    URLS,
    value.dependencies,
  )).resolves.toEqual({ ok: false, reason: "unavailable" });
  expect(value.failedPaymentReferences).toHaveLength(0);
  expect(value.createdPaymentReferences).toEqual([PAYMENT_REFERENCE]);

  await expect(paymentModule.initiateCommercialPayment(
    PUBLIC_REFERENCE,
    { binding: binding() },
    URLS,
    value.dependencies,
  )).resolves.toMatchObject({ ok: true, payment: { paymentReference: PAYMENT_REFERENCE } });
  expect(value.createdPaymentReferences).toEqual([PAYMENT_REFERENCE]);
  expect(value.providerCalls).toHaveLength(2);
  expect(value.providerCalls[0]).toMatchObject({
    paymentReference: PAYMENT_REFERENCE,
    idempotencyKey: PAYMENT_REFERENCE,
  });
  expect(value.providerCalls[1]).toMatchObject({
    paymentReference: PAYMENT_REFERENCE,
    idempotencyKey: PAYMENT_REFERENCE,
  });
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

test("paid requires exact Provider-verified settled amount and currency", async () => {
  const exact = fixture({ currentPayment: paymentRecord("pending") });
  exact.setWebhookStatus("paid");
  await expect(paymentModule.handleCommercialPaymentWebhook(
    "fake",
    new TextEncoder().encode("exact settlement"),
    new Headers(),
    { repository: exact.repository, resolveProvider: () => exact.provider },
  )).resolves.toMatchObject({ ok: true, status: "paid" });
  expect(exact.eventWrites).toEqual(["event_123"]);

  for (const invalid of [
    fixture({ currentPayment: paymentRecord("pending"), settledAmountMinor: 123449 }),
    fixture({ currentPayment: paymentRecord("pending"), settledCurrency: "EUR" }),
    fixture({ currentPayment: paymentRecord("pending"), omitSettledAmount: true }),
    fixture({ currentPayment: paymentRecord("pending"), omitSettledCurrency: true }),
  ]) {
    invalid.setWebhookStatus("paid");
    const result = await paymentModule.handleCommercialPaymentWebhook(
      "fake",
      new TextEncoder().encode("invalid settlement"),
      new Headers(),
      { repository: invalid.repository, resolveProvider: () => invalid.provider },
    );
    expect(result.ok).toBe(false);
    expect(invalid.eventWrites).toHaveLength(0);
    await expect(invalid.repository.findCustomerStateForQuote(QUOTE_REFERENCE))
      .resolves.toMatchObject({ status: "pending" });
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

test("expired quotation is unavailable during payment preparation", async () => {
  const expired = quotation(QUOTE_REFERENCE, { validUntil: "2026-08-10" });
  const value = fixture({
    resolvedQuotation: expired,
    now: () => new Date("2026-08-11T00:00:00.000Z"),
  });
  await expect(paymentModule.prepareCommercialPayment(
    PUBLIC_REFERENCE,
    OUTPUT_ID,
    expired,
    value.dependencies,
  )).resolves.toBeNull();
});

test("quotation expiry is rechecked immediately before checkout creation", async () => {
  const expiresToday = quotation(QUOTE_REFERENCE, { validUntil: "2026-08-11" });
  const times = [
    new Date("2026-08-11T23:59:59.000Z"),
    new Date("2026-08-12T00:00:00.000Z"),
  ];
  const value = fixture({
    resolvedQuotation: expiresToday,
    now: () => times.shift() ?? new Date("2026-08-12T00:00:00.000Z"),
  });
  await expect(paymentModule.initiateCommercialPayment(
    PUBLIC_REFERENCE,
    { binding: binding() },
    URLS,
    value.dependencies,
  )).resolves.toEqual({ ok: false, reason: "stale_quotation" });
  expect(value.providerCalls).toHaveLength(0);
});

test("quotation remains payable through its validUntil UTC calendar date", async () => {
  const expiresToday = quotation(QUOTE_REFERENCE, { validUntil: "2026-08-11" });
  const value = fixture({
    resolvedQuotation: expiresToday,
    now: () => new Date("2026-08-11T23:59:59.999Z"),
  });
  await expect(paymentModule.initiateCommercialPayment(
    PUBLIC_REFERENCE,
    { binding: binding() },
    URLS,
    value.dependencies,
  )).resolves.toMatchObject({ ok: true, payment: { status: "pending" } });
  expect(value.providerCalls).toHaveLength(1);
});

test("candidate SQL contains provider-neutral tables, RLS, grants, immutable authority, and atomic application", () => {
  const sql = readFileSync(
    path.join(process.cwd(), "docs", "novora-m4-3-commercial-payment-foundation-candidate.sql"),
    "utf8",
  ).replace(/\r\n/g, "\n");
  expect(sql.match(/CREATE TABLE/gi)).toHaveLength(2);
  expect(sql).toContain("CREATE TABLE public.commercial_payments");
  expect(sql).toContain("CREATE TABLE public.commercial_payment_events");
  expect(sql.match(/ENABLE ROW LEVEL SECURITY/g)).toHaveLength(2);
  expect(sql).toContain("FROM public, anon, authenticated");
  expect(sql).toContain(
    "REVOKE ALL PRIVILEGES ON TABLE public.commercial_payments\n  FROM service_role;",
  );
  expect(sql).toContain("GRANT SELECT ON TABLE public.commercial_payments");
  expect(sql).not.toMatch(
    /GRANT\s+(?:ALL(?:\s+PRIVILEGES)?|[^;]*\b(?:INSERT|UPDATE|DELETE)\b)[^;]*ON TABLE public\.commercial_payments/i,
  );
  expect(
    sql.match(/GRANT\s+[^;]*ON TABLE public\.commercial_payments[^;]*;/gi),
  ).toHaveLength(1);
  expect(sql).toContain("GRANT SELECT ON TABLE public.commercial_payment_events");
  expect(sql).not.toMatch(/GRANT\s+[^;]*INSERT[^;]*commercial_payment_events/i);
  expect(sql).toContain("commercial payment authority fields are immutable");
  expect(sql).toContain("paid commercial payment is terminal");
  const createPendingRpc = sql.match(
    /CREATE OR REPLACE FUNCTION public\.create_commercial_payment_pending\([\s\S]*?\n\$\$;/,
  )?.[0];
  const attachCheckoutRpc = sql.match(
    /CREATE OR REPLACE FUNCTION public\.attach_commercial_payment_checkout\([\s\S]*?\n\$\$;/,
  )?.[0];
  const markFailedRpc = sql.match(
    /CREATE OR REPLACE FUNCTION public\.mark_commercial_payment_failed\([\s\S]*?\n\$\$;/,
  )?.[0];
  expect(createPendingRpc).toContain("SECURITY DEFINER");
  expect(createPendingRpc).toContain("'pending'");
  expect(createPendingRpc).not.toMatch(/p_status|paid_at|failed_at|'paid'/);
  expect(attachCheckoutRpc).toContain("SECURITY DEFINER");
  expect(attachCheckoutRpc).toContain("p.status = 'pending'");
  expect(attachCheckoutRpc).not.toMatch(/\bSET\s+status\s*=|'paid'/i);
  expect(markFailedRpc).toContain("SECURITY DEFINER");
  expect(markFailedRpc).toContain("SET status = 'failed'");
  expect(markFailedRpc).toContain("p.status = 'pending'");
  expect(markFailedRpc).not.toContain("'paid'");
  for (const signature of [
    "public.create_commercial_payment_pending(\n  text, text, text, bigint, text\n)",
    "public.attach_commercial_payment_checkout(\n  text, text, text, text, text, timestamptz\n)",
    "public.mark_commercial_payment_failed(text)",
    "public.apply_commercial_payment_event(\n  text, text, text, text, text, text, bigint, text, text\n)",
  ]) {
    const whitespaceTolerantSignature = signature
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\s+/g, "\\s+");
    expect(sql).toMatch(new RegExp(
      `REVOKE\\s+ALL\\s+ON\\s+FUNCTION\\s+${whitespaceTolerantSignature}` +
        "\\s+FROM\\s+public\\s*,\\s*anon\\s*,\\s*authenticated\\s*;",
      "i",
    ));
    expect(sql).toMatch(new RegExp(
      `GRANT\\s+EXECUTE\\s+ON\\s+FUNCTION\\s+${whitespaceTolerantSignature}` +
        "\\s+TO\\s+service_role\\s*;",
      "i",
    ));
  }
  expect(sql).toContain("public.apply_commercial_payment_event");
  expect(sql).toContain("settled_amount_minor bigint");
  expect(sql).toContain("settled_currency text");
  expect(sql).toContain("p_settled_amount_minor IS DISTINCT FROM v_payment.amount_minor");
  expect(sql).toContain("p_settled_currency IS DISTINCT FROM v_payment.currency");
  expect(sql).toContain("settled commercial payment authority mismatch");
  expect(sql).toMatch(/p_normalized_status = 'paid'[\s\S]*p_settled_amount_minor IS NULL/);
  expect(sql).toMatch(/p_normalized_status = 'paid'[\s\S]*p_settled_currency IS NULL/);
  expect(sql).not.toMatch(/GRANT\s+(UPDATE|DELETE)\s+ON TABLE public\.commercial_payment_events/i);

  const paymentSource = readFileSync(
    path.join(process.cwd(), "lib", "server", "commercial-payment.ts"),
    "utf8",
  );
  expect(paymentSource).not.toMatch(
    /\.from\("commercial_payments"\)\s*\.(?:insert|update)\(/,
  );
  expect(paymentSource).toContain('.rpc("create_commercial_payment_pending"');
  expect(paymentSource).toContain('.rpc("attach_commercial_payment_checkout"');
  expect(paymentSource).toContain('.rpc("mark_commercial_payment_failed"');
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
