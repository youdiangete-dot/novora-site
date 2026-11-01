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
