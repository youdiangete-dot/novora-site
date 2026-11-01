import { test, expect, type Page } from "@playwright/test";
import { createHmac } from "node:crypto";
const token = "a".repeat(43), purchaseId = "123e4567-e89b-42d3-a456-426614174000";
const initial = { ok: true, state: "not_started", purchaseId: null, initialRemaining: 0,
  revisionRemaining: 0, expiresAt: null, hold: "none", paypalConfigured: true };
async function prepare(page: Page) {
  await page.route("**/*", route => {
    const url = new URL(route.request().url());
    return url.hostname === "127.0.0.1" ? route.fallback() : route.abort();
  });
  await page.route("**/api/invitation-access", route => route.fulfill({
    status: route.request().headers().authorization ? 200 : 401,
    json: route.request().headers().authorization ? { state: "verified", partition: "c".repeat(64) } : { state: "required" },
  }));
}
async function invite(page: Page) {
  await page.getByLabel("Invitation code", { exact: true }).fill(token);
  await page.getByRole("button", { name: "Use invitation", exact: true }).click();
  await expect(page.getByText("Invitation verified.", { exact: true })).toBeVisible();
}
test("customer TEST checkout, balance and duplicate verification use only server-confirmed state", async ({ page }) => {
  await prepare(page); let confirmations = 0;
  await page.route("**/api/test-image-packages**", async route => {
    expect(route.request().headers().authorization).toBe(`Bearer ${token}`);
    if (route.request().method() === "GET") return route.fulfill({ json: initial });
    const body = route.request().postDataJSON(); expect(Object.keys(body).sort()).toEqual(["action", "provider"]);
    if (body.action === "create") return route.fulfill({ json: { ok: true, state: "checkout", providerOrderId: "TESTORDER1",
      snapshot: { ...initial, state: "awaiting_confirmation", purchaseId } } });
    confirmations++;
    return route.fulfill({ json: { ok: true, state: "confirmed", confirmation: { duplicate: confirmations > 1 },
      snapshot: { ...initial, state: "active", purchaseId, initialRemaining: 5, revisionRemaining: 5, expiresAt: "2026-11-08T08:00:00.000Z" } } });
  });
  await page.goto("/design/packages");
  await expect(page.getByRole("button", { name: "Start Sandbox checkout" })).toBeDisabled();
  await invite(page);
  await page.getByRole("button", { name: "Start Sandbox checkout" }).click();
  await expect(page.getByRole("link", { name: "Open PayPal Sandbox approval" })).toHaveAttribute("href", /^https:\/\/www\.sandbox\.paypal\.com\//);
  await page.getByRole("button", { name: "Verify Sandbox payment" }).click();
  await expect(page.getByText("Test payment confirmed by the server. Package rights are available.", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Package balance")).toContainText("Initial images remaining: 5");
  await expect(page.getByLabel("Package balance")).toContainText("Revisions remaining: 5");
  await page.getByRole("button", { name: "Verify Sandbox payment" }).click();
  await expect(page.getByText("Already confirmed. No additional rights were granted.", { exact: true })).toBeVisible();
  const storage = await page.evaluate(() => JSON.stringify([Object.entries(localStorage), Object.entries(sessionStorage)]));
  expect(storage).not.toContain(token);
});
test("UNKNOWN holds disable replacement checkout and mobile form stays within viewport", async ({ page }) => {
  await prepare(page); await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/test-image-packages**", route => route.fulfill({ json: route.request().method() === "GET" ? initial
    : { ok: false, reason: "unknown", snapshot: { ...initial, state: "awaiting_confirmation", purchaseId, hold: "unknown" } } }));
  await page.goto("/design/packages"); await invite(page);
  await page.getByRole("button", { name: "Start Sandbox checkout" }).click();
  await expect(page.getByText("UNKNOWN reservation held. No duplicate payment or generation is authorized.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start Sandbox checkout" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Check payment status" })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/test01-package-mobile.png", fullPage: true });
});
test("unconfigured Sandbox is clearly unavailable without a payment mutation", async ({ page }) => {
  await prepare(page); let posts = 0;
  await page.route("**/api/test-image-packages**", route => {
    if (route.request().method() === "POST") posts++;
    return route.fulfill({ json: { ...initial, paypalConfigured: false } });
  });
  await page.goto("/design/packages"); await invite(page);
  await expect(page.getByText("PayPal Sandbox is not configured. No live payment is available.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start Sandbox checkout" })).toBeDisabled();
  expect(posts).toBe(0);
});
test("protected Owner form sends minimal TEST evidence and duplicate adds no rights", async ({ page, context }) => {
  await prepare(page);
  await context.addCookies([{ name: "novora_admin_access", value: createHmac("sha256", "TEST-only-browser-admin-key").update("novora-admin-briefs-access").digest("hex"),
    domain: "127.0.0.1", path: "/", httpOnly: true, sameSite: "Strict" }]);
  let posts = 0;
  await page.route("**/api/admin/test-image-packages", route => {
    expect(route.request().headers().authorization).toBe(`Bearer ${token}`);
    expect(route.request().postDataJSON()).toEqual({ purchaseId, reference: "TEST-MANUAL-BROWSER", amountMinor: 100, currency: "USD" });
    posts++;
    return route.fulfill({ json: { ok: true, state: "confirmed", confirmation: { duplicate: posts > 1, expiresAt: "2026-11-08T08:00:00.000Z" } } });
  });
  await page.goto("/admin/test-image-packages");
  await expect(page.getByRole("button", { name: "Confirm synthetic TEST payment" })).toBeDisabled();
  await invite(page);
  await page.getByLabel("Customer purchase reference").fill(purchaseId);
  await page.getByLabel("Synthetic TEST reference").fill("TEST-MANUAL-BROWSER");
  await page.getByRole("button", { name: "Confirm synthetic TEST payment" }).click();
  await expect(page.getByText("TEST confirmation recorded.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Confirm synthetic TEST payment" }).click();
  await expect(page.getByText("Already confirmed. No additional rights were granted; original expiry is unchanged.", { exact: true })).toBeVisible();
  expect(await page.locator('input[type="file"]').count()).toBe(0);
});
