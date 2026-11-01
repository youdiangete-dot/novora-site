import { expect, test } from "@playwright/test";
import { enDictionary } from "../../lib/i18n/dictionaries/en";

const reference = "NOVORA-CB-20261101-TR11";
const output = "423e4567-e89b-42d3-a456-426614174000";
const previewPath = `/design/preview/${reference}`;
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=", "base64");

test("trial ready surface retains private image, feedback and direction confirmation without jewelry commerce", async ({ page }) => {
  await page.setExtraHTTPHeaders({
    "x-novora-preview-ui-test-token": "novora-first-preview-ui-focused-test-v1",
    "x-novora-preview-ui-test-state": "ready",
    "x-novora-preview-ui-test-reference": reference,
    "x-novora-preview-ui-test-output": output,
  });
  await page.route(`**/api/first-preview-assets/${reference}/current`, route => route.fulfill({ contentType: "image/png", body: png }));
  await page.goto(previewPath);
  await expect(page.locator("main img")).toBeVisible();
  await expect(page.getByRole("button", { name: enDictionary.firstPreview.fp031, exact: true })).toBeVisible();
  await expect(page.getByLabel(enDictionary.feedback.fb008, { exact: true })).toBeVisible();
  await expect(page.locator("#commercial-specification-heading, #commercial-quotation-heading")).toHaveCount(0);
  await expect(page.locator('form[action*="payment"], a[href*="checkout"]')).toHaveCount(0);

  // Verify the retained forms send the exact rendered binding. These responses
  // are synthetic browser fixtures, not live persistence or generation evidence.
  let feedbackPosts = 0;
  let confirmationPosts = 0;
  await page.route(`**/api/first-preview-feedback/${reference}`, async route => {
    feedbackPosts++;
    const body = route.request().postDataJSON();
    expect(Object.keys(body).sort()).toEqual(["binding", "feedback"]);
    expect(body.feedback).toBe("Please lower the setting.");
    expect(typeof body.binding).toBe("string");
    await route.fulfill({ json: { ok: true } });
  });
  await page.route(`**/api/first-preview-design-confirmation/${reference}`, async route => {
    confirmationPosts++;
    const body = route.request().postDataJSON();
    expect(Object.keys(body)).toEqual(["binding"]);
    expect(typeof body.binding).toBe("string");
    await route.fulfill({ json: { ok: true } });
  });
  await page.getByLabel(enDictionary.feedback.fb008, { exact: true }).fill("Please lower the setting.");
  await page.getByRole("button", { name: enDictionary.feedback.fb011, exact: true }).click();
  await expect(page.getByText(enDictionary.feedback.fb003, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: enDictionary.firstPreview.fp031, exact: true }).click();
  await expect(page.getByText(enDictionary.firstPreview.fp024, { exact: true })).toBeVisible();
  expect(feedbackPosts).toBe(1);
  expect(confirmationPosts).toBe(1);
  await page.setViewportSize({ width: 375, height: 812 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

for (const state of ["pending", "denied"] as const) {
  test(`trial ${state} does not reveal an image or collaboration controls`, async ({ page }) => {
    await page.setExtraHTTPHeaders({
      "x-novora-preview-ui-test-token": "novora-first-preview-ui-focused-test-v1",
      "x-novora-preview-ui-test-state": state,
    });
    await page.goto(previewPath);
    await expect(page.locator("main img")).toHaveCount(0);
    await expect(page.locator("#first-preview-feedback, #first-preview-design-confirmation-heading")).toHaveCount(0);
    await expect(page.locator("#commercial-specification-heading, #commercial-quotation-heading")).toHaveCount(0);
  });
}
