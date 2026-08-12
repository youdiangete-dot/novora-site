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
  path.join(process.cwd(), "tests", "e2e", "commercial-quotation.spec.ts"),
);
const quotationModule = testRequire(
  "../../lib/server/commercial-quotation",
) as typeof import("../../lib/server/commercial-quotation");
const currencyModule = testRequire(
  "../../lib/server/commercial-currency",
) as typeof import("../../lib/server/commercial-currency");
internals._resolveFilename = original;

const BRIEF_ID = "123e4567-e89b-42d3-a456-426614174000";
const OUTPUT_ID = "223e4567-e89b-42d3-a456-426614174000";
const LATEST_CONFIRMATION_ID = "323e4567-e89b-42d3-a456-426614174000";
const OLDER_CONFIRMATION_ID = "423e4567-e89b-42d3-a456-426614174000";
const REFERENCE = "NOVORA-CB-20260811-M42Q";
const QUOTE_REFERENCE = "NOVORA-Q-0123456789ABCDEF01234567";

function quotationInput(overrides: Record<string, unknown> = {}) {
  return {
    conceptBriefId: BRIEF_ID,
    currency: "USD",
    lineItems: [
      { description: " Design   and labor ", amount: "450" },
      { description: "Lab diamond", amount: "900.5" },
    ],
    validUntil: "2026-09-30",
    note: " Based on the confirmed direction. ",
    ...overrides,
  };
}

function snapshot(overrides: Record<string, unknown> = {}) {
  const normalized = quotationModule.normalizeCommercialQuotationInput({
    currency: "USD",
    lineItems: [
      { description: "Design and labor", amount: "450.00" },
      { description: "Lab diamond", amount: "900.50" },
    ],
    validUntil: "2026-09-30",
    note: "Based on the confirmed direction.",
    ...overrides,
  });
  if (!normalized) throw new Error("Expected normalized quotation fixture.");
  return quotationModule.buildCommercialQuotationSnapshot(normalized);
}

function row(quotation = snapshot(), quoteReference = QUOTE_REFERENCE) {
  return {
    quote_reference: quoteReference,
    quotation_version: "commercial_quotation_v1",
    quotation_snapshot: quotation,
    quotation_sha256: quotationModule.hashCommercialQuotationSnapshot(quotation),
    issued_at: "2026-08-11T08:00:00.000Z",
  };
}

function dependencies(input: {
  latestConfirmationId?: string | null;
  latestRows?: Record<string, ReturnType<typeof row> | null>;
  exactRow?: ReturnType<typeof row> | null;
  insertResult?: ReturnType<typeof row> | "conflict" | null;
  outputId?: string | null;
} = {}) {
  const writes: Array<Record<string, unknown>> = [];
  const latestConfirmationId = Object.prototype.hasOwnProperty.call(input, "latestConfirmationId")
    ? input.latestConfirmationId
    : LATEST_CONFIRMATION_ID;
  const outputId = Object.prototype.hasOwnProperty.call(input, "outputId")
    ? input.outputId
    : OUTPUT_ID;
  return {
    writes,
    value: {
      createQuoteReference: () => QUOTE_REFERENCE,
      repository: {
        async resolveCurrentJourneyByConceptBriefId(conceptBriefId: string) {
          return outputId ? { conceptBriefId, outputId } : null;
        },
        async resolveCurrentJourneyByPublicReference(publicReference: string, requestedOutputId: string) {
          return publicReference === REFERENCE && requestedOutputId === outputId && outputId
            ? { conceptBriefId: BRIEF_ID, outputId }
            : null;
        },
        async findLatestSpecificationConfirmation(journey: { conceptBriefId: string; outputId: string }) {
          return latestConfirmationId
            ? {
                id: latestConfirmationId,
                conceptBriefId: journey.conceptBriefId,
                outputId: journey.outputId,
                specificationSha256: "a".repeat(64),
              }
            : null;
        },
        async findLatestQuotation(confirmationId: string) {
          return input.latestRows?.[confirmationId] ?? null;
        },
        async findExactQuotation() {
          return input.exactRow ?? null;
        },
        async insertQuotation(value: Record<string, unknown>) {
          writes.push(value);
          return input.insertResult ?? row(value.quotationSnapshot as ReturnType<typeof snapshot>);
        },
      },
    },
  };
}

test("Admin quote requires an existing exact M4-1 confirmation", async () => {
  const fixture = dependencies({ latestConfirmationId: null });
  await expect(
    quotationModule.issueCommercialQuotation(quotationInput(), fixture.value),
  ).resolves.toEqual({ ok: false, reason: "specification_unconfirmed" });
  expect(fixture.writes).toHaveLength(0);
});

test("Admin quote uses the latest applicable M4-1 confirmation resolved by the server", async () => {
  const fixture = dependencies();
  const result = await quotationModule.issueCommercialQuotation(quotationInput(), fixture.value);
  expect(result.ok).toBe(true);
  expect(fixture.writes[0].commercialSpecificationConfirmationId).toBe(LATEST_CONFIRMATION_ID);
});

test("browser cannot choose specification-confirmation ID", async () => {
  const fixture = dependencies();
  await expect(
    quotationModule.issueCommercialQuotation(
      { ...quotationInput(), commercialSpecificationConfirmationId: OLDER_CONFIRMATION_ID },
      fixture.value,
    ),
  ).resolves.toEqual({ ok: false, reason: "invalid" });
});

test("browser cannot choose final total", async () => {
  await expect(
    quotationModule.issueCommercialQuotation(
      { ...quotationInput(), totalAmount: "0.01" },
      dependencies().value,
    ),
  ).resolves.toEqual({ ok: false, reason: "invalid" });
});

test("browser cannot choose quotation hash, reference, timestamp, status, or database ID", async () => {
  for (const forbidden of ["quotationSha256", "quoteReference", "issuedAt", "status", "id"]) {
    await expect(
      quotationModule.issueCommercialQuotation(
        { ...quotationInput(), [forbidden]: "browser controlled" },
        dependencies().value,
      ),
    ).resolves.toEqual({ ok: false, reason: "invalid" });
  }
});

test("server computes a fixed-decimal total from normalized line items", async () => {
  const fixture = dependencies();
  await quotationModule.issueCommercialQuotation(
    quotationInput({
      lineItems: [
        { description: "Decimal item A", amount: "0.10" },
        { description: "Decimal item B", amount: "0.20" },
      ],
    }),
    fixture.value,
  );
  expect(fixture.writes[0]).toMatchObject({
    quotationSnapshot: {
      lineItems: [
        { description: "Decimal item A", amount: "0.10" },
        { description: "Decimal item B", amount: "0.20" },
      ],
      totalAmount: "0.30",
    },
  });
  expect(
    (fixture.writes[0].quotationSnapshot as { totalAmount: string }).totalAmount,
  ).not.toBe("0.30000000000000004");
});

test("unknown request fields are rejected", async () => {
  await expect(
    quotationModule.issueCommercialQuotation(
      { ...quotationInput(), unexpected: true },
      dependencies().value,
    ),
  ).resolves.toEqual({ ok: false, reason: "invalid" });
});

test("new quotation issuance uses the shared supported-currency contract", async () => {
  const expectedExponents = {
    CNY: 2,
    EUR: 2,
    GBP: 2,
    JPY: 0,
    KWD: 3,
    TWD: 2,
    USD: 2,
  } as const;
  for (const [currency, exponent] of Object.entries(expectedExponents)) {
    expect(currencyModule.isSupportedCommercialCurrency(currency)).toBe(true);
    expect(currencyModule.getCommercialCurrencyMinorUnitExponent(currency)).toBe(exponent);
  }
  for (const currency of ["CAD", "AUD", "CHF", "ZZZ", "usd", "US", "USDD", "U$D"]) {
    const fixture = dependencies();
    await expect(
      quotationModule.issueCommercialQuotation(
        quotationInput({ currency }),
        fixture.value,
      ),
    ).resolves.toEqual({ ok: false, reason: "invalid" });
    expect(fixture.writes).toHaveLength(0);
  }
});

test("new supported quotations are payment-compatible before persistence", async () => {
  const cases = [
    { currency: "CNY", amount: "10.25", minor: 1025 },
    { currency: "EUR", amount: "10.25", minor: 1025 },
    { currency: "GBP", amount: "10.25", minor: 1025 },
    { currency: "JPY", amount: "1234.00", minor: 1234 },
    { currency: "KWD", amount: "1.23", minor: 1230 },
    { currency: "TWD", amount: "10.25", minor: 1025 },
    { currency: "USD", amount: "0.29", minor: 29 },
  ] as const;
  for (const value of cases) {
    const fixture = dependencies();
    const result = await quotationModule.issueCommercialQuotation(
      quotationInput({
        currency: value.currency,
        lineItems: [{ description: "Payment-compatible item", amount: value.amount }],
      }),
      fixture.value,
    );
    expect(result.ok).toBe(true);
    const issued = fixture.writes[0].quotationSnapshot as { totalAmount: string };
    expect(currencyModule.commercialAmountToMinorUnits(
      issued.totalAmount,
      value.currency,
    )).toBe(value.minor);
  }
});

test("JPY non-zero fractions are rejected before durable quotation issuance", async () => {
  for (const amount of ["1234.50", "0.01"]) {
    const fixture = dependencies();
    await expect(quotationModule.issueCommercialQuotation(
      quotationInput({
        currency: "JPY",
        lineItems: [{ description: "Fractional JPY", amount }],
      }),
      fixture.value,
    )).resolves.toEqual({ ok: false, reason: "invalid" });
    expect(fixture.writes).toHaveLength(0);
  }
});

test("invalid line-item counts are rejected", async () => {
  for (const lineItems of [[], Array.from({ length: 9 }, (_, index) => ({
    description: `Item ${index}`,
    amount: "1.00",
  }))]) {
    await expect(
      quotationModule.issueCommercialQuotation(
        quotationInput({ lineItems }),
        dependencies().value,
      ),
    ).resolves.toEqual({ ok: false, reason: "invalid" });
  }
});

test("invalid decimal amounts are rejected", async () => {
  for (const amount of ["-1.00", "1.234", "1e3", "NaN", "01.00", 1.25]) {
    await expect(
      quotationModule.issueCommercialQuotation(
        quotationInput({ lineItems: [{ description: "Item", amount }] }),
        dependencies().value,
      ),
    ).resolves.toEqual({ ok: false, reason: "invalid" });
  }
});

test("same normalized quotation is idempotent", async () => {
  const fixture = dependencies({ exactRow: row() });
  const result = await quotationModule.issueCommercialQuotation(
    quotationInput({
      lineItems: [
        { description: "Design and labor", amount: "450.0" },
        { description: "Lab diamond", amount: "900.50" },
      ],
    }),
    fixture.value,
  );
  expect(result).toMatchObject({ ok: true, status: "already_issued" });
  expect(fixture.writes).toHaveLength(0);
});

test("changed quotation content creates a different hash and append-only history row", async () => {
  const fixture = dependencies();
  await quotationModule.issueCommercialQuotation(quotationInput(), fixture.value);
  await quotationModule.issueCommercialQuotation(
    quotationInput({ lineItems: [{ description: "Design and labor", amount: "500.00" }] }),
    fixture.value,
  );
  expect(fixture.writes).toHaveLength(2);
  expect(fixture.writes[0].quotationSha256).not.toBe(fixture.writes[1].quotationSha256);
  expect(fixture.writes.every((write) =>
    write.commercialSpecificationConfirmationId === LATEST_CONFIRMATION_ID,
  )).toBe(true);
});

test("customer sees a quote only for the latest exact M4-1 confirmation", async () => {
  const fixture = dependencies({
    latestRows: {
      [LATEST_CONFIRMATION_ID]: row(),
      [OLDER_CONFIRMATION_ID]: row(snapshot(), "NOVORA-Q-AAAAAAAAAAAAAAAAAAAAAAAA"),
    },
  });
  const result = await quotationModule.readCustomerCommercialQuotation(
    REFERENCE,
    OUTPUT_ID,
    fixture.value,
  );
  expect(result?.quoteReference).toBe(QUOTE_REFERENCE);
});

test("a newer M4-1 specification without a quote hides the older quotation", async () => {
  const fixture = dependencies({
    latestConfirmationId: LATEST_CONFIRMATION_ID,
    latestRows: {
      [LATEST_CONFIRMATION_ID]: null,
      [OLDER_CONFIRMATION_ID]: row(),
    },
  });
  await expect(
    quotationModule.readCustomerCommercialQuotation(REFERENCE, OUTPUT_ID, fixture.value),
  ).resolves.toBeNull();
});

test("historical quotation-v1 currency snapshots remain readable with their original hash", async () => {
  const historical = snapshot({ currency: "CAD" });
  const originalHash = quotationModule.hashCommercialQuotationSnapshot(historical);
  const fixture = dependencies({
    latestRows: {
      [LATEST_CONFIRMATION_ID]: row(historical),
    },
  });
  const result = await quotationModule.readCustomerCommercialQuotation(
    REFERENCE,
    OUTPUT_ID,
    fixture.value,
  );
  expect(result?.quotation.currency).toBe("CAD");
  expect(quotationModule.hashCommercialQuotationSnapshot(result!.quotation)).toBe(originalHash);
});

test("customer quotation copy preserves payment, order, CAD, and production boundaries", () => {
  const source = readFileSync(
    path.join(process.cwd(), "app", "design", "preview", "[public_reference]", "CommercialQuotation.tsx"),
    "utf8",
  );
  expect(source).toContain("does not make a payment");
  expect(source).toContain("place an order");
  expect(source).toContain("approve CAD");
  expect(source).toContain("approve production");
  expect(source).not.toMatch(/Accept quote|Pay now|checkout|payment link/i);
});

test("candidate SQL contains the required RLS, grants, FK, uniqueness, and append-only protections", () => {
  const sql = readFileSync(
    path.join(process.cwd(), "docs", "novora-m4-2-commercial-quotation-candidate.sql"),
    "utf8",
  );
  expect(sql.match(/CREATE TABLE/gi)).toHaveLength(1);
  expect(sql).toContain("CREATE TABLE public.commercial_quotations");
  expect(sql).toContain("REFERENCES public.commercial_specification_confirmations (id)");
  expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
  expect(sql).toContain("FROM public, anon, authenticated");
  expect(sql).toContain("GRANT SELECT, INSERT ON TABLE public.commercial_quotations");
  expect(sql).toContain("commercial_quotations_require_current_latest_basis");
  expect(sql).toContain("ORDER BY latest.confirmed_at DESC, latest.created_at DESC, latest.id DESC");
  expect(sql).toMatch(/UNIQUE[\s\S]*?\(\s*commercial_specification_confirmation_id,\s*quotation_sha256\s*\)/);
  expect(sql).not.toMatch(/GRANT\s+[^;]*(UPDATE|DELETE)/i);
});
