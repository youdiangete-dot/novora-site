import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  expect,
  type APIRequestContext,
  type Page,
  test,
} from "@playwright/test";
import {
  getRewrittenUrl,
  isRewrite,
} from "next/experimental/testing/server";
import { NextRequest } from "next/server";

import {
  resolveCustomerPreview,
} from "../../app/design/preview/[public_reference]/page";
import { proxy } from "../../proxy";

const PUBLIC_REFERENCE = "NOVORA-CB-20260731-AB12";
const OTHER_PUBLIC_REFERENCE = "NOVORA-CB-20260731-ZZ99";
const IMPOSSIBLE_PUBLIC_REFERENCE = "NOVORA-CB-20260230-AB12";
const IMPOSSIBLE_PUBLIC_REFERENCES = [
  "NOVORA-CB-20260229-AB12",
  IMPOSSIBLE_PUBLIC_REFERENCE,
  "NOVORA-CB-20260431-AB12",
  "NOVORA-CB-20260001-AB12",
  "NOVORA-CB-20261301-AB12",
  "NOVORA-CB-20260100-AB12",
  "NOVORA-CB-00000101-AB12",
] as const;
const OUTPUT_ID = "423e4567-e89b-42d3-a456-426614174000";
const TEST_TOKEN = "novora-first-preview-ui-focused-test-v1";
const PREVIEW_PATH = `/design/preview/${PUBLIC_REFERENCE}`;
const CUSTOMER_ASSET_PATH =
  `/api/first-preview-assets/${PUBLIC_REFERENCE}/current`;
const PROTECTED_ASSET_PATH =
  `/api/first-preview-assets/${PUBLIC_REFERENCE}/${OUTPUT_ID}`;
const CONCEPT_IMAGE_NAME =
  "Early AI hand-drawn jewelry concept sketch for the submitted NOVORA design direction";
const READY_HEADING = "Your early concept direction is ready";
const PENDING_HEADING = "Your First Preview is being prepared";
const TRANSPARENT_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  "base64",
);

type TestState = "pending" | "ready" | "unavailable" | "denied";

function trustedHeaders(
  state: TestState,
  overrides: { publicReference?: string; outputId?: string } = {},
) {
  return {
    "x-novora-preview-ui-test-token": TEST_TOKEN,
    "x-novora-preview-ui-test-state": state,
    "x-novora-preview-ui-test-reference":
      overrides.publicReference ?? PUBLIC_REFERENCE,
    "x-novora-preview-ui-test-output":
      overrides.outputId ?? OUTPUT_ID,
  };
}

async function showTrustedState(
  page: Page,
  state: TestState,
  overrides: { publicReference?: string; outputId?: string } = {},
) {
  await page.setExtraHTTPHeaders(trustedHeaders(state, overrides));
  if (state === "ready") {
    await page.route(`**${CUSTOMER_ASSET_PATH}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "image/png",
        body: TRANSPARENT_PNG,
      });
    });
  }
  await page.goto(PREVIEW_PATH);
}

function validReceipt(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    submittedAt: "2026-07-31T08:00:00.000Z",
    customerName: "Mina Chen",
    customerEmail: "mina@example.com",
    apiSubmission: {
      persisted: true,
      publicReference: PUBLIC_REFERENCE,
      conceptBriefId: "88888888-8888-4888-8888-888888888888",
    },
    ...overrides,
  };
}

async function seedStoredValue(page: Page, value: string) {
  await page.goto("/");
  await page.evaluate((stored) => {
    window.localStorage.setItem(
      "novora_submitted_concept_brief",
      stored,
    );
  }, value);
}

async function seedReceipt(page: Page, receipt: Record<string, unknown>) {
  await seedStoredValue(page, JSON.stringify(receipt));
}

type RedirectHop = Readonly<{
  status: number;
  requestUrl: URL;
  location: URL | null;
  headers: Record<string, string>;
  body: string;
}>;

async function followRedirectChain(
  request: APIRequestContext,
  initialPath: string,
  maximumHops = 6,
): Promise<RedirectHop[]> {
  const hops: RedirectHop[] = [];
  let nextUrl = new URL(initialPath, "http://localhost:3000");

  for (let index = 0; index < maximumHops; index += 1) {
    const response = await request.get(nextUrl.href, { maxRedirects: 0 });
    const headers = response.headers();
    const rawLocation = headers.location;
    const location =
      rawLocation === undefined ? null : new URL(rawLocation, nextUrl);
    hops.push({
      status: response.status(),
      requestUrl: nextUrl,
      location,
      headers,
      body: await response.text(),
    });

    if (
      location === null ||
      ![301, 302, 303, 307, 308].includes(response.status())
    ) {
      return hops;
    }
    nextUrl = location;
  }

  throw new Error(`redirect chain exceeded ${maximumHops} hops`);
}

function expectSafePreviewRedirectChain(hops: RedirectHop[]) {
  expect(hops.length).toBeGreaterThan(0);

  for (const hop of hops) {
    if (hop.location !== null) {
      expect(hop.location.origin).toBe("http://localhost:3000");
      expect(hop.location.pathname).not.toContain(OUTPUT_ID);
      expect(hop.location.pathname).not.toContain("/current");
    }
    const serialized = JSON.stringify({
      headers: hop.headers,
      body: hop.body,
    });
    expect(serialized).not.toContain(OUTPUT_ID);
    expect(serialized).not.toContain(PROTECTED_ASSET_PATH);
    expect(serialized).not.toContain(CUSTOMER_ASSET_PATH);
    expect(hop.body).not.toContain(READY_HEADING);
    expect(hop.body).not.toContain(PENDING_HEADING);
    expect(hop.body).not.toContain(CONCEPT_IMAGE_NAME);
  }

  const finalHop = hops.at(-1)!;
  expect(finalHop.location).toBeNull();
  expect([200, 400, 404]).toContain(finalHop.status);
  if (finalHop.status === 200) {
    expect(finalHop.body).toContain("First Preview unavailable");
  }
}

async function seedMutatedReceipt(
  page: Page,
  mutation: "inherited" | "accessor" | "non-enumerable",
) {
  await seedReceipt(
    page,
    validReceipt({ __novoraReceiptMutation: mutation }),
  );
  await page.addInitScript((selectedMutation) => {
    const originalParse = JSON.parse;
    JSON.parse = function patchedParse(
      text: string,
      reviver?: (this: unknown, key: string, value: unknown) => unknown,
    ) {
      const parsed = originalParse.call(JSON, text, reviver) as {
        __novoraReceiptMutation?: string;
        apiSubmission?: Record<string, unknown>;
      };
      if (
        parsed?.__novoraReceiptMutation !== selectedMutation ||
        !parsed.apiSubmission
      ) {
        return parsed;
      }

      if (selectedMutation === "inherited") {
        const persisted = parsed.apiSubmission.persisted;
        delete parsed.apiSubmission.persisted;
        Object.setPrototypeOf(parsed.apiSubmission, { persisted });
      } else if (selectedMutation === "accessor") {
        const publicReference = parsed.apiSubmission.publicReference;
        delete parsed.apiSubmission.publicReference;
        Object.defineProperty(parsed.apiSubmission, "publicReference", {
          enumerable: true,
          get: () => publicReference,
        });
      } else {
        const conceptBriefId = parsed.apiSubmission.conceptBriefId;
        delete parsed.apiSubmission.conceptBriefId;
        Object.defineProperty(parsed.apiSubmission, "conceptBriefId", {
          enumerable: false,
          value: conceptBriefId,
        });
      }

      return parsed;
    };
  }, mutation);
}

async function expectNoPreviewAuthority(page: Page) {
  let protectedRequestCount = 0;
  await page.route("**/api/first-preview-assets/**", async (route) => {
    protectedRequestCount += 1;
    await route.abort();
  });

  await page.goto("/design/submitted");
  await expect(
    page.getByRole("heading", { name: "Server receipt not confirmed" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open your First Preview" }),
  ).toHaveCount(0);
  expect(protectedRequestCount).toBe(0);
}

test.describe("submitted receipt authority for Customer First Preview", () => {
  test("valid receipt creates only an exact guarded query-free Preview status link", async ({
    page,
  }) => {
    await seedReceipt(page, validReceipt());
    await page.goto("/design/submitted");

    const previewLink = page.getByRole("link", {
      name: "Open your First Preview",
    });
    await expect(previewLink).toHaveAttribute("href", PREVIEW_PATH);
    const href = await previewLink.getAttribute("href");
    expect(href).not.toContain("?");
    expect(href).not.toContain("88888888");
    expect(href).not.toContain("@");

    await expect(
      page.getByText(
        "Current Production has not connected live AI generation",
        { exact: false },
      ),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Opening the query-free Preview page does not mean generation has started.",
        { exact: false },
      ),
    ).toBeVisible();
    await expect(
      page.getByText("guarded preview-status/demo entry", { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Human intervention during automatic First Preview preparation is exception-only",
        { exact: false },
      ),
    ).toBeVisible();
    await expect(
      page.getByText(
        "structural logic, gemstone orientation and composition",
        { exact: false },
      ),
    ).toBeVisible();
    await expect(
      page.getByText(
        "quotation, order, payment, and production decisions remain human-controlled",
        { exact: false },
      ),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Your confirmed Concept Brief automatically enters the First Preview workflow. You do not need to start generation yourself.",
        { exact: true },
      ),
    ).toHaveCount(0);
    await expect(
      page.getByText(
        "Human handling is exception-only when the system cannot safely converge.",
        { exact: true },
      ),
    ).toHaveCount(0);
  });

  test("invalid receipt creates no Preview link", async ({ page }) => {
    await seedReceipt(
      page,
      validReceipt({
        apiSubmission: {
          persisted: false,
          publicReference: PUBLIC_REFERENCE,
          conceptBriefId: "88888888-8888-4888-8888-888888888888",
        },
      }),
    );
    await expectNoPreviewAuthority(page);
  });

  test("inherited receipt fields are rejected", async ({ page }) => {
    await seedMutatedReceipt(page, "inherited");
    await expectNoPreviewAuthority(page);
  });

  test("accessor receipt fields are rejected", async ({ page }) => {
    await seedMutatedReceipt(page, "accessor");
    await expectNoPreviewAuthority(page);
  });

  test("non-enumerable receipt fields are rejected", async ({ page }) => {
    await seedMutatedReceipt(page, "non-enumerable");
    await expectNoPreviewAuthority(page);
  });

  test("malformed stored JSON is rejected", async ({ page }) => {
    await seedStoredValue(page, '{"apiSubmission":');
    await expectNoPreviewAuthority(page);
  });

  test("impossible calendar date cannot create a submitted Preview link", async ({
    page,
  }) => {
    await seedReceipt(
      page,
      validReceipt({
        apiSubmission: {
          persisted: true,
          publicReference: IMPOSSIBLE_PUBLIC_REFERENCE,
          conceptBriefId: "88888888-8888-4888-8888-888888888888",
        },
      }),
    );
    await expectNoPreviewAuthority(page);
  });
});

test.describe("four-state Customer First Preview presentation", () => {
  test("normal Preview request fails closed to unavailable", async ({
    page,
  }) => {
    await page.goto(PREVIEW_PATH);

    await expect(
      page.getByRole("heading", { name: "First Preview unavailable" }),
    ).toBeVisible();
    await expect(
      page.getByRole("img", { name: CONCEPT_IMAGE_NAME }),
    ).toHaveCount(0);
  });

  test("pending presentation explains automatic preparation", async ({
    page,
  }) => {
    await showTrustedState(page, "pending");

    await expect(
      page.getByRole("heading", {
        name: "Your First Preview is being prepared",
      }),
    ).toBeVisible();
    await expect(
      page.getByText("You do not need to trigger anything.", {
        exact: false,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("img", { name: CONCEPT_IMAGE_NAME }),
    ).toHaveCount(0);
  });

  test("ready presentation uses the trusted test seam", async ({ page }) => {
    await showTrustedState(page, "ready");

    await expect(
      page.getByRole("heading", {
        name: "Your early concept direction is ready",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("img", {
        name: CONCEPT_IMAGE_NAME,
      }),
    ).toHaveAttribute("src", CUSTOMER_ASSET_PATH);
  });

  test("unavailable presentation is customer-safe", async ({ page }) => {
    await showTrustedState(page, "unavailable");

    await expect(
      page.getByRole("heading", { name: "First Preview unavailable" }),
    ).toBeVisible();
    await expect(
      page.getByText("No provider, database, storage", { exact: false }),
    ).toBeVisible();
  });

  test("denied presentation reveals no authorization reason", async ({
    page,
  }) => {
    await showTrustedState(page, "denied");

    await expect(
      page.getByRole("heading", {
        name: "You cannot access this First Preview",
      }),
    ).toBeVisible();
    await expect(page.getByText(/job|output|email|proof|storage/i)).toHaveCount(
      0,
    );
  });

  test("ready reference mismatch fails closed", async ({ page }) => {
    await showTrustedState(page, "ready", {
      publicReference: OTHER_PUBLIC_REFERENCE,
    });

    await expect(
      page.getByRole("heading", { name: "First Preview unavailable" }),
    ).toBeVisible();
    await expect(
      page.getByRole("img", { name: CONCEPT_IMAGE_NAME }),
    ).toHaveCount(0);
  });

  test("invalid Output UUID fails closed", async ({ page }) => {
    await showTrustedState(page, "ready", { outputId: "not-a-uuid" });

    await expect(
      page.getByRole("heading", { name: "First Preview unavailable" }),
    ).toBeVisible();
    await expect(
      page.getByRole("img", { name: CONCEPT_IMAGE_NAME }),
    ).toHaveCount(0);
  });

  test("protected asset route is constructed only for valid ready state", () => {
    const readyRequest = new NextRequest(
      `http://localhost${CUSTOMER_ASSET_PATH}`,
      { headers: trustedHeaders("ready") },
    );
    const readyResponse = proxy(readyRequest);
    expect(readyResponse.headers.get("x-middleware-rewrite")).toBe(
      `http://localhost${PROTECTED_ASSET_PATH}`,
    );

    for (const state of ["pending", "unavailable", "denied"] as const) {
      const response = proxy(
        new NextRequest(`http://localhost${CUSTOMER_ASSET_PATH}`, {
          headers: trustedHeaders(state),
        }),
      );
      expect(response.status).toBe(404);
      expect(response.headers.get("x-middleware-rewrite")).toBeNull();
    }
  });

  test("Production semantically hard-disables hostile test and trusted headers", async () => {
    const mutableEnvironment = process.env as Record<
      string,
      string | undefined
    >;
    const originalNodeEnv = mutableEnvironment.NODE_ENV;
    const hostileHeaders = new Headers();
    hostileHeaders.append("X-Novora-Preview-Ui-Test-Token", TEST_TOKEN);
    hostileHeaders.append("x-novora-preview-ui-test-state", "ready");
    hostileHeaders.append(
      "X-NOVORA-PREVIEW-UI-TEST-REFERENCE",
      PUBLIC_REFERENCE,
    );
    hostileHeaders.append("x-novora-preview-ui-test-output", OUTPUT_ID);
    hostileHeaders.append("X-Novora-Preview-Ui-Trusted-State", "ready");
    hostileHeaders.append(
      "x-novora-preview-ui-trusted-reference",
      PUBLIC_REFERENCE,
    );
    hostileHeaders.append("X-NOVORA-PREVIEW-UI-TRUSTED-OUTPUT", OUTPUT_ID);
    hostileHeaders.append("x-novora-preview-ui-trusted-output", OUTPUT_ID);

    try {
      mutableEnvironment.NODE_ENV = "production";
      const response = proxy(
        new NextRequest(`http://localhost${CUSTOMER_ASSET_PATH}`, {
          headers: hostileHeaders,
        }),
      );
      const serializedHeaders = JSON.stringify(
        Object.fromEntries(response.headers.entries()),
      );

      expect(isRewrite(response)).toBe(false);
      expect(getRewrittenUrl(response)).toBeNull();
      expect(response.status).toBe(404);
      expect(response.headers.get("x-middleware-rewrite")).toBeNull();
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect(serializedHeaders).not.toContain(OUTPUT_ID);
      expect(serializedHeaders).not.toContain(
        "x-novora-preview-ui-trusted-state",
      );
      expect(serializedHeaders).not.toContain(
        "x-novora-preview-ui-trusted-output",
      );
      expect(await response.text()).not.toContain(OUTPUT_ID);
    } finally {
      if (originalNodeEnv === undefined) {
        delete mutableEnvironment.NODE_ENV;
      } else {
        mutableEnvironment.NODE_ENV = originalNodeEnv;
      }
    }
  });

  test("trusted ready response cannot be replayed by an untrusted request", () => {
    const trustedResponse = proxy(
      new NextRequest(`http://localhost${CUSTOMER_ASSET_PATH}`, {
        headers: trustedHeaders("ready"),
      }),
    );
    expect(isRewrite(trustedResponse)).toBe(true);
    expect(trustedResponse.headers.get("cache-control")).toBe(
      "private, no-store",
    );

    const untrustedResponse = proxy(
      new NextRequest(`http://localhost${CUSTOMER_ASSET_PATH}`),
    );
    expect(isRewrite(untrustedResponse)).toBe(false);
    expect(untrustedResponse.status).toBe(404);
    expect(untrustedResponse.headers.get("cache-control")).toBe(
      "private, no-store",
    );
    expect(JSON.stringify(
      Object.fromEntries(untrustedResponse.headers.entries()),
    )).not.toContain(OUTPUT_ID);
  });

  test("trusted ready page is private no-store and cannot replay after authority is removed", async ({
    page,
  }) => {
    await page.setExtraHTTPHeaders(trustedHeaders("ready"));
    await page.route(`**${CUSTOMER_ASSET_PATH}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "image/png",
        body: TRANSPARENT_PNG,
      });
    });

    const trustedResponse = await page.goto(PREVIEW_PATH);
    expect([
      "private, no-store",
      "no-cache, must-revalidate",
    ]).toContain(trustedResponse?.headers()["cache-control"]);
    await expect(
      page.getByRole("heading", { name: READY_HEADING }),
    ).toBeVisible();

    await page.setExtraHTTPHeaders({});
    const untrustedResponse = await page.reload();
    expect([
      "private, no-store",
      "no-cache, must-revalidate",
    ]).toContain(untrustedResponse?.headers()["cache-control"]);
    await expect(
      page.getByRole("heading", { name: "First Preview unavailable" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: READY_HEADING }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: PENDING_HEADING }),
    ).toHaveCount(0);
  });

  test("Output UUID is absent from visible HTML and customer URL", async ({
    page,
  }) => {
    await showTrustedState(page, "ready");

    expect(await page.content()).not.toContain(OUTPUT_ID);
    expect(page.url()).not.toContain(OUTPUT_ID);
    await expect(page.getByText(OUTPUT_ID, { exact: false })).toHaveCount(0);
  });

  test("external callers cannot inject internal trusted headers", async ({
    page,
  }) => {
    await page.setExtraHTTPHeaders({
      "x-novora-preview-ui-trusted-state": "ready",
      "x-novora-preview-ui-trusted-reference": PUBLIC_REFERENCE,
      "x-novora-preview-ui-trusted-output": OUTPUT_ID,
    });
    await page.goto(PREVIEW_PATH);

    await expect(
      page.getByRole("heading", { name: "First Preview unavailable" }),
    ).toBeVisible();
    await expect(
      page.getByRole("img", { name: CONCEPT_IMAGE_NAME }),
    ).toHaveCount(0);
  });
});

test.describe("public-reference and canonical-route safety", () => {
  test("query state cannot select ready", async ({ page }) => {
    await page.goto(`${PREVIEW_PATH}?state=ready`);

    await expect(page).toHaveURL(PREVIEW_PATH);
    await expect(
      page.getByRole("heading", { name: "First Preview unavailable" }),
    ).toBeVisible();
    await expect(
      page.getByRole("img", { name: CONCEPT_IMAGE_NAME }),
    ).toHaveCount(0);
  });

  test("impossible calendar date cannot produce ready or a protected asset request", async ({
    request,
  }) => {
    const previewResponse = await request.get(
      `/design/preview/${IMPOSSIBLE_PUBLIC_REFERENCE}?state=ready`,
      {
        headers: trustedHeaders("ready", {
          publicReference: IMPOSSIBLE_PUBLIC_REFERENCE,
        }),
        maxRedirects: 0,
      },
    );
    expect(previewResponse.status()).toBe(404);
    expect(previewResponse.headers().location).toBeUndefined();
    const previewBody = await previewResponse.text();
    expect(previewBody).not.toContain(CONCEPT_IMAGE_NAME);
    expect(previewBody).not.toContain(OUTPUT_ID);

    const assetResponse = proxy(
      new NextRequest(
        `http://localhost/api/first-preview-assets/${IMPOSSIBLE_PUBLIC_REFERENCE}/current`,
        {
          headers: trustedHeaders("ready", {
            publicReference: IMPOSSIBLE_PUBLIC_REFERENCE,
          }),
        },
      ),
    );
    expect(isRewrite(assetResponse)).toBe(false);
    expect(assetResponse.status).toBe(404);
    expect(assetResponse.headers.get("cache-control")).toBe(
      "private, no-store",
    );
    expect(getRewrittenUrl(assetResponse)).toBeNull();
  });

  for (const impossibleReference of IMPOSSIBLE_PUBLIC_REFERENCES) {
    test(`Proxy rejects impossible Preview and current-alias date ${impossibleReference}`, () => {
      const previewResponse = proxy(
        new NextRequest(
          `http://localhost/design/preview/${impossibleReference}`,
          {
            headers: trustedHeaders("ready", {
              publicReference: impossibleReference,
            }),
          },
        ),
      );
      expect(previewResponse.status).toBe(404);
      expect(isRewrite(previewResponse)).toBe(false);
      expect(getRewrittenUrl(previewResponse)).toBeNull();

      const assetResponse = proxy(
        new NextRequest(
          `http://localhost/api/first-preview-assets/${impossibleReference}/current`,
          {
            headers: trustedHeaders("ready", {
              publicReference: impossibleReference,
            }),
          },
        ),
      );
      expect(assetResponse.status).toBe(404);
      expect(isRewrite(assetResponse)).toBe(false);
      expect(getRewrittenUrl(assetResponse)).toBeNull();
      expect(assetResponse.headers.get("cache-control")).toBe(
        "private, no-store",
      );
    });
  }

  for (const malformedReference of [
    "novora-CB-20260731-AB12",
    "WRONG-CB-20260731-AB12",
    "NOVORA-CB-AB12",
    "NOVORA-CB-2026073-AB12",
    "NOVORA-CB-2026073X-AB12",
    "NOVORA-CB-20260731",
    "NOVORA-CB-20260731-AB1",
    "NOVORA-CB-20260731-AB123",
    "NOVORA-CB-20260731-ab12",
    "%20NOVORA-CB-20260731-AB12",
    "NOVORA-CB-20260731-AB12%20",
    "NOVORA-CB-20260731-AB%12",
  ]) {
    test(`rejects malformed public reference ${malformedReference}`, () => {
      expect(
        resolveCustomerPreview(malformedReference, {
          state: "ready",
          publicReference: malformedReference,
          outputId: OUTPUT_ID,
        }).state,
      ).toBe("unavailable");
    });
  }

  for (const encodedSeparator of [
    "%2F",
    "%2f",
    "%5C",
    "%5c",
    "%2F%5c",
    "%5C%2f",
  ]) {
    test(`encoded separator ${encodedSeparator} cannot authorize a reference`, async ({
      request,
    }) => {
      const hops = await followRedirectChain(
        request,
        `/design/preview/NOVORA-CB-20260731-${encodedSeparator}AB12?state=ready&next=https://example.com`,
      );
      expectSafePreviewRedirectChain(hops);
    });
  }

  for (const [label, unsafeReference] of [
    ["null character", "NOVORA-CB-20260731-A\u0000B12"],
    ["control character", "NOVORA-CB-20260731-A\u0007B12"],
    ["Greek confusable", "NΟVORA-CB-20260731-AB12"],
    ["full-width confusable", "ＮＯＶＯＲＡ-CB-２０２６０７３１-ＡＢ１２"],
  ] as const) {
    test(`rejects ${label} input`, () => {
      expect(
        resolveCustomerPreview(unsafeReference, {
          state: "ready",
          publicReference: unsafeReference,
          outputId: OUTPUT_ID,
        }).state,
      ).toBe("unavailable");
    });
  }

  test("rejects oversized public reference", () => {
    const oversized = `NOVORA-CB-20260731-${"A".repeat(10_000)}`;
    expect(
      resolveCustomerPreview(oversized, {
        state: "ready",
        publicReference: oversized,
        outputId: OUTPUT_ID,
      }).state,
    ).toBe("unavailable");
  });

  test("one trailing slash is same-origin and fails closed", async ({
    request,
  }) => {
    const hops = await followRedirectChain(
      request,
      `${PREVIEW_PATH}/?state=ready&proof=secret&next=https://example.com`,
    );
    expect(hops[0].status).toBe(308);
    expect(hops[0].location?.origin).toBe("http://localhost:3000");
    expectSafePreviewRedirectChain(hops);
    expect(hops.at(-1)?.requestUrl.href).toBe(
      `http://localhost:3000${PREVIEW_PATH}`,
    );
  });

  for (const trailingSlashes of ["//", "///"]) {
    test(`framework-owned ${trailingSlashes.length}-slash normalization remains same-origin and fails closed`, async ({
      request,
    }) => {
      const initialPath =
        `${PREVIEW_PATH}${trailingSlashes}` +
        "?state=ready&proof=secret&next=https://example.com";
      const hops = await followRedirectChain(request, initialPath);

      expect(hops[0].status).toBe(308);
      expect(hops[0].location?.origin).toBe("http://localhost:3000");
      // Next.js 16.2.12 normalizes repeated separators before Proxy. Its
      // framework-owned first 308 may preserve the hostile query; application
      // authorization never consumes that query, and the full chain fails closed.
      expectSafePreviewRedirectChain(hops);
    });
  }

  for (const repeatedSeparatorPath of [
    `/design/preview//${PUBLIC_REFERENCE}`,
    `/design//preview/${PUBLIC_REFERENCE}`,
  ]) {
    test(`framework-owned separator normalization fails closed for ${repeatedSeparatorPath}`, async ({
      request,
    }) => {
      const hops = await followRedirectChain(
        request,
        `${repeatedSeparatorPath}?state=ready&next=https://example.com`,
      );

      expect(hops[0].status).toBe(308);
      expect(hops[0].location?.origin).toBe("http://localhost:3000");
      expectSafePreviewRedirectChain(hops);
    });
  }

  test("canonical redirect removes all unsafe query state", async ({
    request,
  }) => {
    const response = await request.get(
      `${PREVIEW_PATH}?state=ready&proof=secret&next=https://example.com`,
      { maxRedirects: 0 },
    );
    expect([307, 308]).toContain(response.status());
    const location = response.headers().location;
    expect(new URL(location, "http://localhost:3000").href).toBe(
      `http://localhost:3000${PREVIEW_PATH}`,
    );
  });

  test("Preview redirects cannot become an open redirect", async ({
    request,
  }) => {
    const response = await request.get(
      `${PREVIEW_PATH}?next=https://example.com/steal`,
      { maxRedirects: 0 },
    );
    expect([307, 308]).toContain(response.status());
    const location = new URL(
      response.headers().location,
      "http://localhost:3000",
    );
    expect(location.origin).toBe("http://localhost:3000");
    expect(location.pathname).toBe(PREVIEW_PATH);
    expect(location.search).toBe("");
  });

  test("representative non-Preview routes keep canonical and trailing-slash behavior", async ({
    request,
  }) => {
    for (const route of ["/", "/design/start", "/design/submitted"]) {
      const canonical = await request.get(`${route}?keep=unrelated`, {
        maxRedirects: 0,
      });
      expect(canonical.status()).toBe(200);
      expect(canonical.headers().location).toBeUndefined();

      const trailingPath = route === "/" ? "/" : `${route}/`;
      const trailingHops = await followRedirectChain(
        request,
        `${trailingPath}?keep=unrelated`,
      );
      expect(trailingHops.at(-1)?.status).toBe(200);
      for (const hop of trailingHops) {
        expect(hop.location?.origin ?? "http://localhost:3000").toBe(
          "http://localhost:3000",
        );
      }
    }

    for (const apiPath of ["/api/concept-briefs", "/api/concept-briefs/"]) {
      const apiHops = await followRedirectChain(
        request,
        `${apiPath}?keep=unrelated`,
      );
      expect(apiHops.at(-1)?.status).toBe(405);
      for (const hop of apiHops) {
        expect(hop.location?.origin ?? "http://localhost:3000").toBe(
          "http://localhost:3000",
        );
      }
    }

    const home = await request.get("/");
    const scriptPath = (await home.text()).match(
      /src="([^"]*\/_next\/static\/[^"]+\.js[^"]*)"/,
    )?.[1];
    expect(scriptPath).toBeTruthy();
    const staticAsset = await request.get(scriptPath!);
    expect(staticAsset.status()).toBe(200);
  });
});

test.describe("responsive UI, accessibility, and product boundaries", () => {
  test("desktop presentation has no horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await showTrustedState(page, "ready");

    await expect(
      page.getByRole("heading", { name: "Customer First Preview" }),
    ).toBeVisible();
    const size = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(size.scroll).toBeLessThanOrEqual(size.client);
  });

  test("390px mobile presentation has no horizontal overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await showTrustedState(page, "pending");

    const size = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(size.scroll).toBeLessThanOrEqual(size.client);
    await expect(page.getByText(PUBLIC_REFERENCE, { exact: true })).toBeVisible();
  });

  test("320px narrow-mobile presentation has no horizontal overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await showTrustedState(page, "denied");

    const size = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(size.scroll).toBeLessThanOrEqual(size.client);
    await expect(
      page.getByRole("heading", {
        name: "You cannot access this First Preview",
      }),
    ).toBeVisible();
  });

  test("keyboard focus is visibly styled", async ({ page }) => {
    await page.goto(PREVIEW_PATH);
    const firstAction = page.getByRole("link", {
      name: "Back to submitted receipt",
    });
    await firstAction.focus();
    const focusStyle = await firstAction.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
      };
    });
    expect(focusStyle.outlineStyle).not.toBe("none");
    expect(Number.parseFloat(focusStyle.outlineWidth)).toBeGreaterThan(0);
  });

  test("customer copy preserves automatic workflow and non-CAD boundaries", async ({
    page,
  }) => {
    await showTrustedState(page, "pending");

    await expect(
      page.getByText("started preparing", { exact: false }),
    ).toBeVisible();
    await expect(
      page
        .getByText("required automatic gates", { exact: false })
        .first(),
    ).toBeVisible();
    await expect(
      page.getByText("It is not CAD, a final quote, an order", {
        exact: false,
      }),
    ).toBeVisible();
    await expect(
      page.getByText("paid CAD and formal production decisions", {
        exact: false,
      }),
    ).toBeVisible();
    await expect(
      page.getByText(/every customer-visible preview.*manual review/i),
    ).toHaveCount(0);
  });

  test("UI uses no Production adapter, live service, or direct Storage URL", async () => {
    const repositoryRoot = path.resolve(__dirname, "../..");
    const [pageSource, proxySource] = await Promise.all([
      readFile(
        path.join(
          repositoryRoot,
          "app/design/preview/[public_reference]/page.tsx",
        ),
        "utf8",
      ),
      readFile(path.join(repositoryRoot, "proxy.ts"), "utf8"),
    ]);
    const combined = `${pageSource}\n${proxySource}`;

    expect(combined).not.toContain("first-preview-customer-view");
    expect(combined).not.toMatch(/supabase\.co|storage\/v1|createSignedUrl/);
    expect(combined).not.toMatch(/SUPABASE_|OPENAI_API_KEY|SERVICE_ROLE/);
    expect(combined).not.toContain("cookies()");
    expect(pageSource).not.toContain("searchParams");
    expect(proxySource).toContain('process.env.NODE_ENV !== "production"');
  });
});
