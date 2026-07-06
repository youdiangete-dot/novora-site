import { expect, test } from '@playwright/test';

const previewReference = 'NOVORA-CB-MOCK-001';

async function expectPreviewBoundary(page: import('@playwright/test').Page) {
  await expect(page.getByText('not CAD', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('not a quote', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('not order approval', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('not payment approval', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('not production approval', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('approved_for_customer')).toHaveCount(0);
  await expect(page.getByText('CAD approval')).toHaveCount(0);
  await expect(page.getByText('quote approval')).toHaveCount(0);
  await expect(page.getByText('order approval').filter({ hasText: /^Order approval$/i })).toHaveCount(0);
  await expect(page.getByText('payment approval').filter({ hasText: /^Payment approval$/i })).toHaveCount(0);
  await expect(page.getByText('production approval').filter({ hasText: /^Production approval$/i })).toHaveCount(0);
}

test.describe('/design/preview/[public_reference]', () => {
  test('loads the default processing mock state with concept preview boundaries', async ({ page }) => {
    await page.goto(`/design/preview/${previewReference}`);

    await expect(page.getByRole('heading', { name: 'Customer concept preview' })).toBeVisible();
    await expect(page.getByText(previewReference)).toBeVisible();
    await expect(page.getByText('Processing', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Your concept preview is being prepared' })).toBeVisible();
    await expect(page.getByText('This mock page does not read a database or generate an image.')).toBeVisible();
    await expectPreviewBoundary(page);
  });

  test('shows a mock sketch placeholder and disabled feedback entry point when first preview is ready', async ({
    page,
  }) => {
    await page.goto(`/design/preview/${previewReference}?state=first_preview_ready`);

    await expect(page.getByText('First preview ready', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Mock first concept preview' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Placeholder visual, no generated image' })).toBeVisible();
    await expect(page.getByText('Mock placeholder', { exact: true })).toBeVisible();
    await expect(page.getByText('NOVORA / concept preview sheet / mock only')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Mock feedback controls' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Structure issue' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Style mismatch' })).toBeDisabled();
    await expect(page.getByText('No feedback is submitted, stored, emailed, or sent to an API from this page.')).toBeVisible();
    await expectPreviewBoundary(page);
  });

  test('shows safe generation failure copy without provider blame or live generation claims', async ({ page }) => {
    await page.goto(`/design/preview/${previewReference}?state=generation_failed`);

    await expect(page.getByText('Temporarily unavailable', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'The preview is temporarily unavailable' })).toBeVisible();
    await expect(
      page.getByText('NOVORA can still continue the concept review path and may follow up manually'),
    ).toBeVisible();
    await expect(page.getByText('OpenAI', { exact: false })).toHaveCount(0);
    await expect(page.getByText('provider error', { exact: false })).toHaveCount(0);
    await expect(page.getByText('live image generation', { exact: false })).toHaveCount(0);
    await expect(page.getByText('production-ready', { exact: false })).toHaveCount(0);
    await expectPreviewBoundary(page);
  });

  test('supports Traditional Chinese mock copy through lang query params', async ({ page }) => {
    await page.goto(`/design/preview/${previewReference}?state=first_preview_ready&lang=zh-TW`);

    await expect(page.getByRole('heading', { name: '客戶概念預覽' })).toBeVisible();
    await expect(page.getByText('繁體中文預覽文案')).toBeVisible();
    await expect(page.getByText('第一張預覽已就緒', { exact: true })).toBeVisible();
    await expect(page.getByText('模擬佔位', { exact: true })).toBeVisible();
    await expect(page.getByText('不是 CAD', { exact: true })).toBeVisible();
    await expect(page.getByText('不是報價', { exact: true })).toBeVisible();
  });
});
