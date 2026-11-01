import { expect, test, type Page } from "@playwright/test";
import { enDictionary } from "../../lib/i18n/dictionaries/en";
const credential = "a".repeat(43);
const reference = "NOVORA-CB-20261101-TR13";
const briefId = "123e4567-e89b-42d3-a456-426614174000";
const metadata = { ok: true, persisted: true, publicReference: reference, conceptBriefId: briefId };

async function seed(page: Page) {
  await page.addInitScript(() => sessionStorage.setItem("novora_concept_brief", JSON.stringify({
    pieceType: "ring", structure: "ring_simple_band", metalDirection: "18k_yellow_gold",
    summaryItems: [{ label: "Piece", value: "Ring" }],
  })));
  await page.route("**/api/concept-brief-admin-notification", route => route.fulfill({ json: { ok: true } }));
}
async function contact(page: Page) {
  await page.getByLabel(enDictionary.designBrief.db075, { exact: true }).fill("Synthetic Trial");
  await page.getByLabel(enDictionary.designBrief.db076, { exact: true }).fill("synthetic@example.invalid");
}
async function invitation(page: Page) {
  await page.getByLabel("Invitation code", { exact: true }).fill(credential);
  await page.getByRole("button", { name: "Use invitation", exact: true }).click();
  await expect(page.getByText("Invitation verified.", { exact: true })).toBeVisible();
}

test("invited browser survives lost ACK and refresh without resubmitting or storing its secret", async ({ page }) => {
  await seed(page);
  let submissions = 0, reads = 0, reauthentications = 0;
  let requestId = "";
  await page.route("**/api/invitation-access", route => route.fulfill({
    status: route.request().headers().authorization === `Bearer ${credential}` ? 200 : 401,
    json: route.request().headers().authorization ? { state: "verified", partition: "c".repeat(64) } : { state: "required" },
  }));
  await page.route("**/api/concept-briefs", async route => {
    submissions++;
    const headers = route.request().headers();
    expect(headers.authorization).toBe(`Bearer ${credential}`);
    requestId = headers["x-novora-client-request-id"];
    expect(requestId).toMatch(/^[a-f0-9]{32}$/);
    expect(headers["idempotency-key"]).toBe(requestId);
    await route.abort("connectionclosed");
  });
  await page.route("**/api/concept-briefs/receipt?id=*", async route => {
    reads++;
    expect(new URL(route.request().url()).searchParams.get("id")).toBe(requestId);
    await route.fulfill({ json: { status: "published", reason: "enqueued", publicReference: reference, conceptBriefId: briefId } });
  });
  await page.route("**/api/concept-briefs/receipt/access", async route => {
    reauthentications++;
    expect(route.request().postDataJSON()).toEqual({ clientRequestId: requestId });
    expect(route.request().headers().authorization).toBe(`Bearer ${credential}`);
    await route.fulfill({ json: metadata });
  });
  await page.goto("/design/brief");
  const submit = page.getByRole("button", { name: enDictionary.designBrief.db088, exact: true });
  await expect(submit).toBeDisabled();
  await invitation(page); await contact(page); await submit.click();
  await expect(page.locator('main p[role="alert"]')).toBeVisible();
  expect(submissions).toBe(1);
  const stored = await page.evaluate(() => Object.entries(sessionStorage).filter(([key]) => key.startsWith("novora_invited_submission_v1:")));
  expect(stored).toHaveLength(1);
  expect(JSON.stringify(stored)).not.toContain(credential);
  expect(JSON.stringify(stored)).not.toContain("synthetic@example.invalid");
  await page.reload();
  await expect(page.getByLabel("Invitation code", { exact: true })).toHaveValue("");
  await invitation(page); await contact(page); await submit.click();
  await expect(page).toHaveURL(/\/design\/submitted$/);
  expect(submissions).toBe(1); expect(reads).toBe(1); expect(reauthentications).toBe(1);
});

test("disabled invitation mode preserves ordinary anonymous brief submission", async ({ page }) => {
  await seed(page);
  await page.route("**/api/invitation-access", route => route.fulfill({ json: { state: "disabled" } }));
  let submissions = 0;
  await page.route("**/api/concept-briefs", async route => {
    submissions++;
    expect(route.request().headers().authorization).toBeUndefined();
    expect(route.request().headers()["x-novora-client-request-id"]).toBeUndefined();
    await route.fulfill({ status: 201, json: metadata });
  });
  await page.goto("/design/brief");
  await expect(page.getByLabel("Invitation code", { exact: true })).toHaveCount(0);
  await contact(page);
  await page.getByRole("button", { name: enDictionary.designBrief.db088, exact: true }).click();
  await expect(page).toHaveURL(/\/design\/submitted$/);
  expect(submissions).toBe(1);
});

test("revision browser reads one existing operation after refresh and confirms only the refreshed current image", async ({ page }) => {
  const source = "423e4567-e89b-42d3-a456-426614174001", revised = "423e4567-e89b-42d3-a456-426614174002";
  const headers = (output: string) => ({ "x-novora-preview-ui-test-token": "novora-first-preview-ui-focused-test-v1",
    "x-novora-preview-ui-test-state": "ready", "x-novora-preview-ui-test-reference": reference, "x-novora-preview-ui-test-output": output });
  await page.setExtraHTTPHeaders(headers(source));
  await page.route("**/api/first-preview-assets/**", route => route.fulfill({ status: 404, body: "" }));
  await page.route("**/api/invitation-access", route => route.fulfill({ json: route.request().headers().authorization ? { state: "verified", partition: "c".repeat(64) } : { state: "required" } }));
  let posts = 0, reads = 0, operationId = "";
  await page.route(`**/api/first-preview-revisions/${reference}*`, async route => {
    expect(route.request().headers().authorization).toBe(`Bearer ${credential}`);
    if (route.request().method() === "POST") {
      posts++; const body = route.request().postDataJSON(); operationId = body.operationId;
      expect(body.sourceOutputId).toBe(source); expect(body.directives).toEqual(["lower_setting"]);
      await route.fulfill({ status: 202, json: { status: "accepted", operationId } });
    } else { reads++; await route.fulfill({ json: { status: reads === 1 ? "pending" : "ready", operationId, ...(reads === 1 ? {} : { outputId: revised }) } }); }
  });
  let confirmed = "";
  await page.route(`**/api/first-preview-design-confirmation/${reference}`, async route => {
    const binding = route.request().postDataJSON().binding;
    confirmed = JSON.parse(Buffer.from(binding.split(".")[0], "base64url").toString()).outputId;
    await route.fulfill({ status: 201, json: { ok: true } });
  });
  await page.goto(`/design/preview/${reference}`);
  await invitation(page);
  await page.getByLabel("lower setting", { exact: true }).check();
  await page.getByRole("button", { name: "Request revision", exact: true }).click();
  await expect(page.getByText("Revision received. Check again to read its existing status.", { exact: true })).toBeVisible();
  await page.reload(); await invitation(page);
  await page.getByLabel("lower setting", { exact: true }).check();
  await page.getByRole("button", { name: "Request revision", exact: true }).click();
  await expect(page.getByRole("button", { name: "View revised image and confirmation", exact: true })).toBeVisible();
  expect(posts).toBe(1); expect(reads).toBe(2);
  expect(await page.evaluate(() => JSON.stringify(Object.entries(sessionStorage)))).not.toContain(credential);
  await page.setExtraHTTPHeaders(headers(revised));
  await Promise.all([page.waitForEvent("framenavigated", frame => frame === page.mainFrame()),
    page.getByRole("button", { name: "View revised image and confirmation", exact: true }).click()]);
  await expect(page.getByText("An invitation is required for this test.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: enDictionary.firstPreview.fp031, exact: true }).click();
  await expect(page.getByText(enDictionary.firstPreview.fp024, { exact: true })).toBeVisible();
  expect(confirmed).toBe(revised);
});
