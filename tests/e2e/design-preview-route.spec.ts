import { expect, test } from '@playwright/test';

const previewReference = 'NOVORA-CB-MOCK-001';

async function expectPreviewBoundary(page: import('@playwright/test').Page) {
  await expect(page.getByText('not CAD', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('not a quote', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('not order approval', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('not payment approval', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('not production approval', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('CAD approval')).toHaveCount(0);
  await expect(page.getByText('quote approval')).toHaveCount(0);
  await expect(page.getByText('order approval').filter({ hasText: /^Order approval$/i })).toHaveCount(0);
  await expect(page.getByText('payment approval').filter({ hasText: /^Payment approval$/i })).toHaveCount(0);
  await expect(page.getByText('production approval').filter({ hasText: /^Production approval$/i })).toHaveCount(0);
}

async function expectNoRealPreviewOutput(page: import('@playwright/test').Page) {
  await expect(page.locator('img')).toHaveCount(0);
  await expect(page.getByText('https://', { exact: false })).toHaveCount(0);
  await expect(page.getByText('Image API completed', { exact: false })).toHaveCount(0);
  await expect(page.getByText('generated image is ready', { exact: false })).toHaveCount(0);
  await expect(page.getByText('provider output exists', { exact: false })).toHaveCount(0);
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
    await expectNoRealPreviewOutput(page);
  });

  test('shows a mock sketch placeholder and disabled feedback entry point when first preview is ready', async ({
    page,
  }) => {
    await page.goto(`/design/preview/${previewReference}?state=first_preview_ready`);

    await expect(page.getByText('First preview ready', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Mock first concept preview' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Placeholder visual, no generated image' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Mock bridge result' })).toBeVisible();
    await expect(page.getByText('Mock bridge preview data')).toBeVisible();
    await expect(page.getByText('Route mock integration only')).toBeVisible();
    await expect(page.getByText('Route public_reference')).toBeVisible();
    await expect(page.getByText('Mock bridge public_reference')).toBeVisible();
    await expect(page.getByText('lifecycle_state')).toBeVisible();
    await expect(page.getByText('first_preview_ready').first()).toBeVisible();
    await expect(page.getByText('Mock NOVORA concept preview placeholder')).toBeVisible();
    await expect(page.getByText('No real generated image is available in this mock state.')).toBeVisible();
    await expect(page.getByText('Image URL')).toBeVisible();
    await expect(page.getByText('Provider output')).toBeVisible();
    await expect(page.getByText('Generated at')).toBeVisible();
    await expect(page.getByText('Not available in this local mock state')).toHaveCount(3);
    await expect(
      page.getByText('Design Spec precedes Hand Sketch Instruction; Hand Sketch Instruction precedes any future provider prompt.'),
    ).toBeVisible();
    await expect(
      page.getByText('Human review is required before customer-safe delivery or production decisions.'),
    ).toBeVisible();
    await expect(page.getByText('first_preview_ready is separate from approved_for_customer.')).toBeVisible();
    await expect(page.getByText('Concept preview only. Not CAD. Not a quote.')).toBeVisible();
    await expect(page.getByText('Mock placeholder', { exact: true })).toBeVisible();
    await expect(page.getByText('NOVORA / concept preview sheet / mock only')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Mock feedback controls' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Structure issue' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Style mismatch' })).toBeDisabled();
    await expect(page.getByText('No feedback is submitted, stored, emailed, or sent to an API from this page.')).toBeVisible();
    await expectPreviewBoundary(page);
    await expectNoRealPreviewOutput(page);
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
    await expectNoRealPreviewOutput(page);
  });

  test('keeps all non-ready lifecycle mock states renderable without bridge output', async ({ page }) => {
    const states = [
      ['processing', 'Your concept preview is being prepared'],
      ['generation_delayed', 'The preview is taking longer than expected'],
      ['generation_failed', 'The preview is temporarily unavailable'],
      ['preview_unavailable', 'This preview cannot be shown right now'],
      ['feedback_submitted', 'Feedback acknowledgement placeholder'],
      ['human_followup_needed', 'A human review step is needed'],
    ] as const;

    for (const [state, heading] of states) {
      await page.goto(`/design/preview/${previewReference}?state=${state}`);

      await expect(page.getByRole('heading', { name: 'Customer concept preview' })).toBeVisible();
      await expect(page.getByText(previewReference)).toBeVisible();
      await expect(page.getByRole('heading', { name: heading })).toBeVisible();
      await expect(page.getByText('Mock bridge preview data')).toHaveCount(0);
      await expectPreviewBoundary(page);
      await expectNoRealPreviewOutput(page);
    }
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
