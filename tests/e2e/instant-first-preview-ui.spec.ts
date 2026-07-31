import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, type Page, test } from "@playwright/test";
import { NextRequest } from "next/server";

import {
  resolveCustomerPreview,
} from "../../app/design/preview/[public_reference]/page";
import { proxy } from "../../proxy";

const PUBLIC_REFERENCE = "NOVORA-CB-20260731-AB12";
const OTHER_PUBLIC_REFERENCE = "NOVORA-CB-20260731-ZZ99";
const OUTPUT_ID = "423e4567-e89b-42d3-a456-426614174000";
const TEST_TOKEN = "novora-first-preview-ui-focused-test-v1";
const PREVIEW_PATH = `/design/preview/${PUBLIC_REFERENCE}`;
const CUSTOMER_ASSET_PATH =
  `/api/first-preview-assets/${PUBLIC_REFERENCE}/current`;
const PROTECTED_ASSET_PATH =
  `/api/first-preview-assets/${PUBLIC_REFERENCE}/${OUTPUT_ID}`;
const CONCEPT_IMAGE_NAME =
  "Early AI hand-drawn jewelry concept sketch for the submitted NOVORA design direction";
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
  test("valid receipt creates the exact query-free Preview link", async ({
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
  ]) {
    test(`rejects encoded separator ${encodedSeparator}`, async ({
      request,
    }) => {
      const response = await request.get(
        `/design/preview/NOVORA-CB-20260731-${encodedSeparator}AB12`,
        { maxRedirects: 0 },
      );
      expect([200, 307, 308, 404]).toContain(response.status());
      const location = response.headers().location ?? "";
      expect(location).not.toContain("?state=");
      expect(location).not.toContain("http://example");
      if (response.status() === 200) {
        const body = await response.text();
        expect(body).toContain("First Preview unavailable");
        expect(body).not.toContain(CONCEPT_IMAGE_NAME);
        expect(body).not.toContain(OUTPUT_ID);
      }
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

  test("trailing slash canonical behavior is safe", async ({ page }) => {
    await page.goto(`${PREVIEW_PATH}/`);

    await expect(page).toHaveURL(PREVIEW_PATH);
    await expect(
      page.getByRole("heading", { name: "First Preview unavailable" }),
    ).toBeVisible();
    await expect(
      page.getByRole("img", { name: CONCEPT_IMAGE_NAME }),
    ).toHaveCount(0);
  });

  for (const repeatedSeparatorPath of [
    `/design/preview//${PUBLIC_REFERENCE}`,
    `/design//preview/${PUBLIC_REFERENCE}`,
    `${PREVIEW_PATH}//`,
  ]) {
    test(`double-separator behavior is safe for ${repeatedSeparatorPath}`, async ({
      request,
    }) => {
      const response = await request.get(repeatedSeparatorPath, {
        maxRedirects: 0,
      });
      expect([200, 307, 308, 404]).toContain(response.status());
      const location = response.headers().location ?? "";
      expect(location).not.toMatch(/^https?:\/\/(?!localhost:3000)/);
      expect(location).not.toContain("?state=");
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
