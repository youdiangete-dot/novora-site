import { createHmac } from 'node:crypto';

import { expect, type Locator, type Page, test } from '@playwright/test';

const wrongFocalFields = [
  'Focal stone / pearl / bead type',
  'Approximate focal size',
];

const centerStoneFields = [
  'Focal stone / pearl / bead type',
  'Color direction',
  'Shape / cut direction',
  'Approximate focal size',
];

const multiStoneFields = [
  'Stone type / stone mix',
  'Color direction',
  'Shape / cut mix',
  'Stone size relationship',
  'Multi-stone layout direction',
];

const multiStoneOnlyFields = multiStoneFields.filter((field) => field !== 'Color direction');

const repeatedStoneFields = [
  'Stone coverage',
  'Repetition feeling',
  'Repeated stone size',
  'Setting style',
  'Repeated-stone direction note',
];

const stationFields = [
  'Station type',
  'Station spacing direction',
  'Station stone / detail size',
  'Station setting / connection direction',
  'Station necklace note',
];

const chainFields = [
  'Chain style',
  'Chain thickness / wire profile',
  'Chain length',
  'Chain note',
];

const pieceTypeLabels: Record<string, string> = {
  bracelet_bangle: 'Bracelet / Bangle',
  earrings: 'Earrings',
  other_custom: 'Other / custom piece',
  pendant_necklace: 'Pendant / Necklace',
  ring: 'Ring',
};

async function openConcept(page: Page, pieceType: string) {
  await page.goto(`/design/concept?pieceType=${pieceType}`);
  await expect(page.locator('strong').filter({ hasText: pieceTypeLabels[pieceType] })).toBeVisible();
  await expectForbiddenOptionsAbsent(page);
}

async function chooseButton(page: Page, name: string) {
  await page.getByRole('button').filter({ hasText: name }).first().click();
  await expectForbiddenOptionsAbsent(page);
}

async function goToStoneLogic(page: Page) {
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.locator('form').getByRole('heading', { name: 'Stone logic' })).toBeVisible();
  await expectForbiddenOptionsAbsent(page);
}

async function goToMetalAndWearability(page: Page) {
  await page.getByRole('button').filter({ hasText: 'Metal & wearability' }).click();
  await expect(page.locator('form').getByRole('heading', { name: 'Metal, finish & wearability' })).toBeVisible();
  await expectForbiddenOptionsAbsent(page);
}

async function expectInternalAiSketchReviewWorkflowAbsent(page: Page) {
  await expect(page.getByRole('heading', { name: 'AI Sketch Review Workflow' })).toHaveCount(0);
  await expect(page.getByText('No internal sketch drafts yet.')).toHaveCount(0);
  await expect(page.getByText('Draft generated')).toHaveCount(0);
  await expect(page.getByText('Needs revision')).toHaveCount(0);
}

async function goToReviewBrief(page: Page) {
  await page.getByRole('button').filter({ hasText: 'Review brief' }).click();
  await expect(page.locator('form').getByRole('heading', { name: 'Review brief' })).toBeVisible();
  await expectForbiddenOptionsAbsent(page);
}

async function continueToBriefResult(page: Page) {
  await page.getByRole('button', { name: 'Continue to next concept step' }).click();
  await expect(page).toHaveURL(/\/design\/brief$/);
  await expect(page.getByRole('heading', { name: 'Your concept direction is ready' })).toBeVisible();
  await expectForbiddenOptionsAbsent(page);
}

async function goToBriefResult(page: Page) {
  await goToReviewBrief(page);
  await continueToBriefResult(page);
}

async function expectTextsVisible(scope: Page | Locator, texts: string[]) {
  for (const text of texts) {
    await expect(scope.getByText(text, { exact: true }).first()).toBeVisible();
  }
}

async function expectTextsAbsent(scope: Page | Locator, texts: string[]) {
  for (const text of texts) {
    await expect(scope.getByText(text, { exact: true })).toHaveCount(0);
  }
}

async function expectForbiddenOptionsAbsent(scope: Page | Locator) {
  await expect(scope.getByText('10K Gold', { exact: true })).toHaveCount(0);
  await expect(scope.getByText(/0\.60 mm\+/)).toHaveCount(0);
}

async function expectStep5Preserves(page: Page, fields: string[]) {
  await goToReviewBrief(page);
  const summary = page.getByLabel('Brief summary');
  await expectTextsVisible(summary, fields);
  await expectForbiddenOptionsAbsent(summary);
}

async function expectBriefPreserves(page: Page, fields: string[]) {
  await continueToBriefResult(page);
  await expectTextsVisible(page, fields);
  await expectForbiddenOptionsAbsent(page);
}

async function expectFlowPreserves(page: Page, fields: string[]) {
  await expectStep5Preserves(page, fields);
  await expectBriefPreserves(page, fields);
}

async function expectFlowPreservesAs(page: Page, step5Fields: string[], briefFields: string[]) {
  await expectStep5Preserves(page, step5Fields);
  await expectBriefPreserves(page, briefFields);
}

async function uploadReferenceImage(page: Page, name: string) {
  await page.locator('input[type="file"][accept="image/*"]').setInputFiles({
    name,
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
      'base64',
    ),
  });
  await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
}

async function openMetalOnlyBangleBrief(page: Page) {
  await openConcept(page, 'bracelet_bangle');
  await chooseButton(page, 'Bangle');
  await chooseButton(page, 'Metal-only bangle');
  await goToStoneLogic(page);
  await goToBriefResult(page);
}

async function fillValidContactFields(page: Page) {
  await page.getByLabel('Customer name').fill('Mina Chen');
  await page.getByLabel('Email address').fill('mina@example.com');
  await page.getByLabel('Phone or WhatsApp optional').fill('+1 555 0100');
  await page.getByLabel('Country / region optional').fill('United States');
  await page.getByLabel('Additional contact note optional').fill('Please follow up in the afternoon.');
}

function delay(milliseconds: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

test.describe('/design/start conversion flow', () => {
  test('carries design start selections into the concept brief submission', async ({ page }) => {
    let receivedPayload: Record<string, unknown> | null = null;

    await page.route('/api/concept-briefs', async (route) => {
      receivedPayload = (await route.request().postDataJSON()) as Record<string, unknown>;

      await route.fulfill({
        contentType: 'application/json',
        status: 201,
        body: JSON.stringify({
          ok: true,
          mode: 'local-test',
          persisted: true,
          message: 'Concept Brief accepted for local test review.',
          publicReference: 'NOVORA-CB-20260601-STRT',
          conceptBriefId: '55555555-5555-4555-8555-555555555555',
        }),
      });
    });

    await page.route('/api/concept-brief-admin-notification', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        status: 200,
        body: JSON.stringify({
          ok: true,
          notified: true,
          skipped: false,
          message: 'Admin notification accepted.',
        }),
      });
    });

    await page.goto('/design/start');
    await expect(page.getByText('Drag & drop images here / or click to browse')).toHaveCount(0);
    await expect(page.getByText('References can be added later on the final brief page.')).toBeVisible();
    await expect(page.getByText('NOVORA studio review and follow-up')).toBeVisible();
    await expect(page.getByText('Order center for production updates')).toHaveCount(0);

    await chooseButton(page, 'Partner');
    await chooseButton(page, 'Earrings');
    await chooseButton(page, 'Bold modern');
    await chooseButton(page, 'USD 2500+');
    await page.getByRole('link', { name: 'Continue to Concept' }).click();

    await expect(page).toHaveURL(/\/design\/concept\?.*pieceType=earrings/);
    await expect(page.locator('strong').filter({ hasText: 'Earrings' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Build the concept direction brief' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Build the AI sketch brief' })).toHaveCount(0);

    const conceptSummary = page.getByLabel('Brief summary');
    await expectTextsVisible(conceptSummary, ['Recipient', 'Partner', 'Start style preference', 'Bold modern', 'Budget planning range', 'USD 2500+']);

    await goToBriefResult(page);
    await expectTextsVisible(page, ['Recipient', 'Partner', 'Start style preference', 'Bold modern', 'Budget planning range', 'USD 2500+']);
    await expect(page.getByText('Continue to paid CAD process')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Concept direction first, paid CAD later' })).toBeVisible();
    await expect(page.getByText('Your next step is the AI hand-drawn concept sketch.')).toHaveCount(0);
    await expect(page.getByText('admin review')).toHaveCount(0);

    await fillValidContactFields(page);
    await page.getByRole('button', { name: 'Submit concept brief' }).click();

    await expect(page).toHaveURL(/\/design\/submitted$/);
    await expect(page.getByRole('heading', { name: 'Design start summary' })).toBeVisible();
    await expectTextsVisible(page, ['Partner', 'Bold modern', 'USD 2500+']);
    await expect(page.getByRole('link', { name: 'View Mock Sketch Preview' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'View AI Sketch Preview' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'What NOVORA reviews next' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'From concept brief to production review' })).toHaveCount(0);

    const submittedBrief = await page.evaluate(() => {
      const rawBrief = window.localStorage.getItem('novora_submitted_concept_brief');
      return rawBrief ? JSON.parse(rawBrief) : null;
    });

    expect(submittedBrief.startSelection).toMatchObject({
      pieceType: 'earrings',
      pieceTypeLabel: 'Earrings',
      recipient: 'partner',
      recipientLabel: 'Partner',
      style: 'bold-modern',
      styleLabel: 'Bold modern',
      budget: 'USD 2500+',
    });
    expect(receivedPayload?.startSelection).toMatchObject({
      recipient: 'partner',
      recipientLabel: 'Partner',
      style: 'bold-modern',
      styleLabel: 'Bold modern',
      budget: 'USD 2500+',
    });
    expect(receivedPayload?.aiSketchInstruction).toBe(
      'Concept review brief for NOVORA studio follow-up; not a generated sketch, CAD, quote, order, or production approval.',
    );
    expect(receivedPayload?.aiSketchInstruction).not.toContain('hand-drawn concept sketch brief');
    expect(receivedPayload?.summaryItems).toEqual(
      expect.arrayContaining([
        { label: 'Recipient', value: 'Partner' },
        { label: 'Start style preference', value: 'Bold modern' },
        { label: 'Budget planning range', value: 'USD 2500+' },
      ]),
    );
  });
});

test.describe('P0 public copy boundaries', () => {
  test('keeps internal AI sketch review workflow copy off customer-facing pages', async ({ page }) => {
    const customerRoutes = ['/', '/design/start', '/design/concept?pieceType=ring', '/design/submitted', '/design/sketch'];

    for (const route of customerRoutes) {
      await page.goto(route);
      await expectInternalAiSketchReviewWorkflowAbsent(page);
    }
  });

  test('frames the homepage as guided intake without live AI delivery or order tracking claims', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Illustrative concept preview')).toBeVisible();
    await expect(page.getByText('Guided Concept Brief', { exact: true })).toBeVisible();
    await expect(page.getByText('Rapid concept direction in minutes.')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Order Tracking' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Concept vs CAD' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Concept Sketch' })).toHaveCount(0);
    await expect(page.locator('#concept-vs-cad')).toHaveCount(1);
    await expect(page.getByRole('heading', { name: 'A Concept Brief starts the review, not production.' })).toBeVisible();
    await expect(
      page.getByText(
        'CAD, quotation, order decisions, and production are separate later manual steps; this section does not generate production CAD or start an online order.',
      ),
    ).toBeVisible();
  });

  test('labels the public order workflow demo as non-functional', async ({ page }) => {
    await page.goto('/account/orders/demo');

    await expect(page.getByText('Future Workflow Demo - Non-functional')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Preview a possible future order workflow' })).toBeVisible();
    await expect(
      page.getByText(
        'This illustration is not a live order center. NOVORA does not currently provide customer accounts, order tracking, or live production milestones.',
      ),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Track your custom jewelry order' })).toHaveCount(0);
  });

  test('frames the CAD page as a later manual studio process', async ({ page }) => {
    await page.goto('/design/pro-cad');

    await expect(page.getByRole('heading', { name: 'How NOVORA approaches paid CAD later' })).toBeVisible();
    await expect(page.getByText('The website does not automatically generate CAD files, start production, or open an online order workflow.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open order center demo' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Start a Concept Brief' })).toBeVisible();
  });
});

test.describe('draft legal review pages', () => {
  test('renders the draft privacy page with legal review boundaries', async ({ page }) => {
    await page.goto('/legal/privacy-draft');

    await expect(page.getByRole('heading', { name: 'Draft Privacy Policy' })).toBeVisible();
    await expect(page.getByText('Draft for owner/legal review').first()).toBeVisible();
    await expect(page.getByText('Not final legal text')).toBeVisible();
    await expect(page.getByText('Not legal advice')).toBeVisible();
    await expect(
      page.getByText('Do not rely on this as a published Privacy Policy / Terms until reviewed and approved.'),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'What NOVORA Collects' })).toBeVisible();
    await expect(page.getByText('Real AI generation is not currently implemented in the Concept Brief flow.')).toBeVisible();
  });

  test('renders the draft terms page with service-boundary language', async ({ page }) => {
    await page.goto('/legal/terms-draft');

    await expect(page.getByRole('heading', { name: 'Draft Terms / Service Boundary' })).toBeVisible();
    await expect(page.getByText('Draft for owner/legal review').first()).toBeVisible();
    await expect(page.getByText('Not final legal text')).toBeVisible();
    await expect(page.getByText('Not legal advice')).toBeVisible();
    await expect(
      page.getByText('Do not rely on this as a published Privacy Policy / Terms until reviewed and approved.'),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Concept Brief Is Not An Order' })).toBeVisible();
    await expect(page.getByText('A Concept Brief is not an order.')).toBeVisible();
    await expect(
      page.getByText(
        'It does not create a payment, binding quote, CAD approval, production start, order tracking, confirmed project acceptance, or final custom jewelry order.',
      ),
    ).toBeVisible();
  });
});

test.describe('/design/concept ring logic', () => {
  test('Ring -> Center-stone ring uses focal fields only', async ({ page }) => {
    await openConcept(page, 'ring');
    await chooseButton(page, 'Center-stone ring');
    await goToStoneLogic(page);

    const form = page.locator('form');
    await expectTextsVisible(form, centerStoneFields);
    await expectTextsAbsent(form, [...multiStoneOnlyFields, ...repeatedStoneFields]);

    await expectFlowPreserves(page, centerStoneFields);
    await expectTextsAbsent(page, multiStoneOnlyFields);
    await expectTextsAbsent(page, repeatedStoneFields);
  });

  test('Ring -> Multi-stone ring uses multi-stone fields only', async ({ page }) => {
    await openConcept(page, 'ring');
    await chooseButton(page, 'Multi-stone ring');
    await goToStoneLogic(page);

    const form = page.locator('form');
    await expectTextsVisible(form, multiStoneFields);
    await expectTextsAbsent(form, [...wrongFocalFields, ...repeatedStoneFields]);

    await expectFlowPreserves(page, multiStoneFields);
    await expectTextsAbsent(page, wrongFocalFields);
  });

  test('Ring -> Pave / fully set ring uses repeated-stone fields only', async ({ page }) => {
    await openConcept(page, 'ring');
    await chooseButton(page, 'Pave / fully set ring');
    await goToStoneLogic(page);

    const form = page.locator('form');
    await expectTextsVisible(form, repeatedStoneFields);
    await expectTextsAbsent(form, [...centerStoneFields, ...multiStoneFields]);

    await expectFlowPreserves(page, repeatedStoneFields);
    await expectTextsAbsent(page, centerStoneFields);
  });
});

test.describe('/design/concept bracelet and necklace logic', () => {
  test('Bracelet / Bangle -> Bangle -> Metal-only bangle hides stone modules', async ({ page }) => {
    await openConcept(page, 'bracelet_bangle');
    await chooseButton(page, 'Bangle');
    await chooseButton(page, 'Metal-only bangle');
    await goToStoneLogic(page);

    const form = page.locator('form');
    await expect(form.getByText('No required stone module is needed for the selected direction.')).toBeVisible();
    await expectTextsAbsent(form, [...wrongFocalFields, ...multiStoneFields, ...repeatedStoneFields]);

    await expectFlowPreservesAs(
      page,
      ['Stone logic', 'Reference images'],
      ['Stone logic', 'No required stones', 'Reference images'],
    );
    await expect(page.getByText('Stone logic').first()).toBeVisible();
    await expect(page.getByText('No required stones').first()).toBeVisible();
    await expectTextsAbsent(page, wrongFocalFields);
  });

  test('Bracelet / Bangle -> Bangle -> Multi-stone bangle uses multi-stone fields only', async ({ page }) => {
    await openConcept(page, 'bracelet_bangle');
    await chooseButton(page, 'Bangle');
    await chooseButton(page, 'Multi-stone bangle');
    await goToStoneLogic(page);

    const form = page.locator('form');
    await expectTextsVisible(form, multiStoneFields);
    await expectTextsAbsent(form, [...wrongFocalFields, ...repeatedStoneFields]);

    await expectFlowPreserves(page, multiStoneFields);
    await expectTextsAbsent(page, wrongFocalFields);
  });

  test('Bracelet / Bangle -> Bangle -> Pave / fully set bangle uses repeated-stone fields only', async ({ page }) => {
    await openConcept(page, 'bracelet_bangle');
    await chooseButton(page, 'Bangle');
    await chooseButton(page, 'Pave / fully set bangle');
    await goToStoneLogic(page);

    const form = page.locator('form');
    await expectTextsVisible(form, repeatedStoneFields);
    await expectTextsAbsent(form, [...wrongFocalFields, ...multiStoneFields]);

    await expectFlowPreserves(page, repeatedStoneFields);
    await expectTextsAbsent(page, wrongFocalFields);
  });

  test('Bracelet / Bangle -> Bangle -> Custom bangle direction uses manual review and direct references', async ({ page }) => {
    await openConcept(page, 'bracelet_bangle');
    await chooseButton(page, 'Bangle');
    await chooseButton(page, 'Custom bangle direction');
    await goToStoneLogic(page);

    const form = page.locator('form');
    await expect(form.getByRole('heading', { name: 'Custom visual review' })).toBeVisible();
    await expect(form.getByRole('heading', { name: 'Reference images' })).toBeVisible();
    await expect(form.locator('input[type="file"][accept="image/*"]')).toBeVisible();
    await expect(form.getByText('This direction may require manual confirmation before CAD, sourcing, or production.')).toBeVisible();
    await expectTextsAbsent(form, [...wrongFocalFields, ...multiStoneFields, ...repeatedStoneFields]);

    await expectFlowPreserves(page, ['Manual confirmation', 'Reference images']);
    await expect(page.getByText('Manual confirmation').first()).toBeVisible();
    await expect(page.getByText('Reference images').first()).toBeVisible();
  });

  test('Pendant / Necklace -> Necklace / chain only -> Machine-woven chain shows chain fields and no stone fields', async ({ page }) => {
    await openConcept(page, 'pendant_necklace');
    await chooseButton(page, 'Necklace / chain only');
    await chooseButton(page, 'Machine-woven chain');
    await goToStoneLogic(page);

    const form = page.locator('form');
    await expect(form.getByText('No required stone module is needed for the selected direction.')).toBeVisible();
    await expectTextsAbsent(form, [...wrongFocalFields, ...multiStoneFields, ...repeatedStoneFields, ...stationFields]);

    await goToMetalAndWearability(page);
    await expectTextsVisible(page.locator('form'), chainFields);

    await expectFlowPreservesAs(
      page,
      ['Stone logic', ...chainFields],
      ['Stone logic', 'No required stones', ...chainFields],
    );
    await expect(page.getByText('Stone logic').first()).toBeVisible();
    await expect(page.getByText('No required stones').first()).toBeVisible();
    await expectTextsVisible(page, chainFields);
    await expect(page.getByText('Chain direction', { exact: true })).toHaveCount(0);
  });

  test('Pendant / Necklace -> Necklace / chain only -> Station necklace shows station and chain fields', async ({ page }) => {
    await openConcept(page, 'pendant_necklace');
    await chooseButton(page, 'Necklace / chain only');
    await chooseButton(page, 'Station necklace');
    await goToStoneLogic(page);

    const form = page.locator('form');
    await expectTextsVisible(form, stationFields);
    await expectTextsAbsent(form, [...wrongFocalFields, ...multiStoneFields, ...repeatedStoneFields]);

    await goToMetalAndWearability(page);
    await expectTextsVisible(page.locator('form'), chainFields);

    await expectFlowPreserves(page, [...stationFields, ...chainFields]);
    await expect(page.getByText('Chain direction', { exact: true })).toHaveCount(0);
  });

  test('Pendant / Necklace -> Necklace / chain only -> Tennis necklace uses repeated-stone fields', async ({ page }) => {
    await openConcept(page, 'pendant_necklace');
    await chooseButton(page, 'Necklace / chain only');
    await chooseButton(page, 'Tennis necklace');
    await goToStoneLogic(page);

    const form = page.locator('form');
    await expectTextsVisible(form, repeatedStoneFields);
    await expectTextsAbsent(form, [...wrongFocalFields, ...multiStoneFields, ...stationFields]);

    await goToMetalAndWearability(page);
    await expectTextsVisible(page.locator('form'), chainFields);

    await expectFlowPreserves(page, repeatedStoneFields);
  });

  test('Other / custom piece -> Brooch / pin shows manual review and direct reference upload', async ({ page }) => {
    await openConcept(page, 'other_custom');
    await chooseButton(page, 'Brooch / pin');
    await goToStoneLogic(page);

    const form = page.locator('form');
    await expect(form.getByRole('heading', { name: 'Custom visual review' })).toBeVisible();
    await expect(form.getByRole('heading', { name: 'Reference images' })).toBeVisible();
    await expect(form.locator('input[type="file"][accept="image/*"]')).toBeVisible();
    await uploadReferenceImage(page, 'brooch-reference.png');
    await expectTextsAbsent(form, [...wrongFocalFields, ...multiStoneFields, ...repeatedStoneFields]);

    await expectFlowPreserves(page, [
      'Manual confirmation',
      'Reference images',
      '1 file(s) selected',
      'Reference image names',
      'brooch-reference.png',
    ]);
    await expect(page.getByText('Reference images').first()).toBeVisible();
    await expect(page.getByText('Manual confirmation').first()).toBeVisible();
  });
});

test.describe('/design/concept earring logic', () => {
  test('Earrings -> Stud earrings -> Pave stud uses repeated-stone fields only', async ({ page }) => {
    await openConcept(page, 'earrings');
    await chooseButton(page, 'Stud earrings');
    await chooseButton(page, 'Pave stud');
    await goToStoneLogic(page);

    const form = page.locator('form');
    await expectTextsVisible(form, repeatedStoneFields);
    await expectTextsAbsent(form, [...centerStoneFields, ...multiStoneFields]);

    await expectFlowPreserves(page, repeatedStoneFields);
    await expectTextsAbsent(page, centerStoneFields);
  });
});

test.describe('/design/brief submission', () => {
  test('requires customer name and email before submitting', async ({ page }) => {
    await openMetalOnlyBangleBrief(page);

    await page.getByRole('button', { name: 'Submit concept brief' }).click();

    await expect(page).toHaveURL(/\/design\/brief$/);
    await expect(page.getByText('Customer name is required.')).toBeVisible();
    await expect(page.getByText('Email address is required.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Concept brief received' })).toHaveCount(0);

    const submittedBrief = await page.evaluate(() => window.localStorage.getItem('novora_submitted_concept_brief'));

    expect(submittedBrief).toBeNull();
  });

  test('shows an inline error for an invalid email address', async ({ page }) => {
    await openMetalOnlyBangleBrief(page);

    await page.getByLabel('Customer name').fill('Mina Chen');
    await page.getByLabel('Email address').fill('mina-at-example');
    await page.getByRole('button', { name: 'Submit concept brief' }).click();

    await expect(page).toHaveURL(/\/design\/brief$/);
    await expect(page.getByText('Enter a valid email address.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Concept brief received' })).toHaveCount(0);
  });

  test('submits valid contact fields and opens the submitted confirmation page', async ({ page }) => {
    await page.route('/api/concept-briefs', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        status: 201,
        body: JSON.stringify({
          ok: true,
          mode: 'supabase',
          persisted: true,
          message: 'Concept Brief submitted for NOVORA review.',
          publicReference: 'NOVORA-CB-20260601-SUCC',
          conceptBriefId: '66666666-6666-4666-8666-666666666666',
        }),
      });
    });

    await page.route('/api/concept-brief-admin-notification', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        status: 200,
        body: JSON.stringify({
          ok: true,
          notified: true,
          skipped: false,
          message: 'Admin notification accepted.',
        }),
      });
    });

    await openMetalOnlyBangleBrief(page);

    await expect(page.getByText('Reference images').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Contact for concept review' })).toBeVisible();
    await expect(
      page.getByText(
        'NOVORA uses these contact details for studio review and manual follow-up about this Concept Brief. Submitting the brief is not an order, payment, quote, CAD approval, or production confirmation. Please avoid highly sensitive personal information in the optional note.',
      ),
    ).toBeVisible();
    await expect(
      page.getByText(
        'By submitting, you ask NOVORA to use this Concept Brief, your contact details, and any final uploaded reference images for studio review and follow-up.',
      ),
    ).toBeVisible();
    await fillValidContactFields(page);
    await page.getByRole('button', { name: 'Submit concept brief' }).click();

    await expect(page).toHaveURL(/\/design\/submitted$/);
    await expect(page.getByRole('heading', { name: 'Concept brief received' })).toBeVisible();
    await expect(
      page.getByText(
        'NOVORA received your Concept Brief for studio review and may follow up using the contact details you provided.',
      ),
    ).toBeVisible();
    await expect(page.getByText(/NOVORA-CB-\d{8}-[A-Z0-9]{4}/)).toBeVisible();
    await expect(page.getByText('Mina Chen')).toBeVisible();
    await expect(page.getByText('mina@example.com')).toBeVisible();
    await expect(
      page.getByText(
        'This is not a CAD-ready production order. Final CAD, pricing, sourcing, and production feasibility are confirmed later.',
      ),
    ).toBeVisible();

    const submittedBrief = await page.evaluate(() => {
      const rawBrief = window.localStorage.getItem('novora_submitted_concept_brief');
      return rawBrief ? JSON.parse(rawBrief) : null;
    });

    expect(submittedBrief).toMatchObject({
      customerName: 'Mina Chen',
      customerEmail: 'mina@example.com',
      customerPhone: '+1 555 0100',
      customerCountry: 'United States',
      contactNote: 'Please follow up in the afternoon.',
      pieceType: 'bracelet_bangle',
      structure: 'bracelet_bangle',
      subStructure: 'bangle_metal_only',
      stoneLogic: 'none',
      referenceImageCount: 0,
      referenceImageNames: [],
    });
    expect(submittedBrief.conceptBriefId).toBe('NOVORA-CB-20260601-SUCC');
    expect(submittedBrief.apiSubmission).toMatchObject({
      persisted: true,
      publicReference: 'NOVORA-CB-20260601-SUCC',
      conceptBriefId: '66666666-6666-4666-8666-666666666666',
    });
    expect(submittedBrief.submittedAt).toEqual(expect.any(String));
  });

  test('keeps the customer on the brief page when server receipt is not persisted', async ({ page }) => {
    await page.route('/api/concept-briefs', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        status: 202,
        body: JSON.stringify({
          ok: true,
          mode: 'supabase',
          persisted: false,
          message: 'Concept Brief persistence is temporarily unavailable.',
        }),
      });
    });

    await openMetalOnlyBangleBrief(page);
    await fillValidContactFields(page);
    await page.getByRole('button', { name: 'Submit concept brief' }).click();

    await expect(page).toHaveURL(/\/design\/brief$/);
    await expect(
      page.getByText(
        'We could not confirm server receipt. Your brief is still saved in this browser. Please try again in a moment or contact NOVORA.',
      ),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Submit concept brief' })).toBeEnabled();
    await expect(page.getByRole('heading', { name: 'Concept brief received' })).toHaveCount(0);
    await expect(page.getByLabel('Customer name')).toHaveValue('Mina Chen');
    await expect(page.getByLabel('Email address')).toHaveValue('mina@example.com');

    const browserState = await page.evaluate(() => ({
      draft: window.sessionStorage.getItem('novora_concept_brief'),
      submitted: window.localStorage.getItem('novora_submitted_concept_brief'),
    }));

    expect(browserState.draft).not.toBeNull();
    expect(browserState.submitted).toBeNull();
  });

  test('does not show a received confirmation for an unconfirmed legacy local record', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'novora_submitted_concept_brief',
        JSON.stringify({
          conceptBriefId: 'NOVORA-CB-20260601-LOCL',
          submittedAt: '2026-06-01T08:00:00.000Z',
          apiSubmission: {
            persisted: false,
          },
        }),
      );
    });

    await page.goto('/design/submitted');

    await expect(page.getByRole('heading', { name: 'Server receipt not confirmed' })).toBeVisible();
    await expect(
      page.getByText(
        'We could not confirm server receipt. Your brief is still saved in this browser. Please try again in a moment or contact NOVORA.',
      ),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Concept brief received' })).toHaveCount(0);
  });

  test('keeps the customer on the brief page when the API returns rate limited', async ({ page }) => {
    await page.route('/api/concept-briefs', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        status: 429,
        body: JSON.stringify({
          ok: false,
          mode: 'supabase',
          persisted: false,
          message: 'Too many Concept Brief submission attempts. Please wait a few minutes before trying again.',
          errors: ['Too many submission attempts. Please wait before trying again.'],
        }),
      });
    });

    await openMetalOnlyBangleBrief(page);
    await fillValidContactFields(page);
    await page.getByRole('button', { name: 'Submit concept brief' }).click();

    await expect(page).toHaveURL(/\/design\/brief$/);
    await expect(
      page.getByText('Too many Concept Brief submission attempts. Please wait a few minutes before trying again.'),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Submit concept brief' })).toBeEnabled();
    await expect(page.getByRole('heading', { name: 'Concept brief received' })).toHaveCount(0);

    const submittedBrief = await page.evaluate(() => window.localStorage.getItem('novora_submitted_concept_brief'));

    expect(submittedBrief).toBeNull();
  });

  test('uploads final reference images after a persisted concept brief is created', async ({ page }) => {
    const notifications: Array<Record<string, unknown>> = [];

    await page.route('/api/concept-briefs', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        status: 201,
        body: JSON.stringify({
          ok: true,
          mode: 'supabase',
          persisted: true,
          message: 'Concept Brief submitted for NOVORA review.',
          publicReference: 'NOVORA-CB-20260521-UPLD',
          conceptBriefId: '11111111-1111-4111-8111-111111111111',
        }),
      });
    });

    await page.route('/api/concept-brief-reference-assets', async (route) => {
      const request = route.request();
      const postData = request.postData() || '';

      expect(postData).toContain('NOVORA-CB-20260521-UPLD');
      expect(postData).toContain('brief-reference.png');

      await route.fulfill({
        contentType: 'application/json',
        status: 200,
        body: JSON.stringify({
          ok: true,
          message: 'Reference images were attached for concept review.',
          assets: [
            {
              id: '22222222-2222-4222-8222-222222222222',
              originalFilename: 'brief-reference.png',
            },
          ],
        }),
      });
    });

    await page.route('/api/concept-brief-admin-notification', async (route) => {
      notifications.push((await route.request().postDataJSON()) as Record<string, unknown>);

      await route.fulfill({
        contentType: 'application/json',
        status: 200,
        body: JSON.stringify({
          ok: true,
          notified: true,
          skipped: false,
          message: 'Admin notification accepted.',
        }),
      });
    });

    await openMetalOnlyBangleBrief(page);
    await expect(page.getByRole('heading', { name: 'Final reference upload optional' })).toBeVisible();
    await expect(
      page.getByText('Attach the final reference images you want saved with this Concept Brief for studio review.'),
    ).toBeVisible();
    await expect(page.getByText('Upload only files you have the right to share.')).toBeVisible();
    await page.locator('input[type="file"][accept="image/jpeg,image/png,image/webp"]').setInputFiles({
      name: 'brief-reference.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
        'base64',
      ),
    });
    await expect(page.getByText('brief-reference.png', { exact: false })).toBeVisible();
    await fillValidContactFields(page);
    await page.getByRole('button', { name: 'Submit concept brief' }).click();

    await expect(page).toHaveURL(/\/design\/submitted$/);
    await expect(page.getByRole('heading', { name: 'Reference images' })).toBeVisible();
    await expect(page.getByText('1 reference image(s) were attached for concept review.')).toBeVisible();

    const submittedBrief = await page.evaluate(() => {
      const rawBrief = window.localStorage.getItem('novora_submitted_concept_brief');
      return rawBrief ? JSON.parse(rawBrief) : null;
    });

    expect(submittedBrief).toMatchObject({
      conceptBriefId: 'NOVORA-CB-20260521-UPLD',
      publicReference: 'NOVORA-CB-20260521-UPLD',
      referenceImageCount: 1,
      referenceImageNames: ['brief-reference.png'],
      referenceUpload: {
        uploaded: true,
        uploadedCount: 1,
        fileNames: ['brief-reference.png'],
      },
    });
    expect(notifications).toEqual([
      {
        conceptBriefId: '11111111-1111-4111-8111-111111111111',
        publicReference: 'NOVORA-CB-20260521-UPLD',
      },
    ]);
  });

  test('continues to submitted confirmation when admin notification fails', async ({ page }) => {
    await page.route('/api/concept-briefs', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        status: 201,
        body: JSON.stringify({
          ok: true,
          mode: 'supabase',
          persisted: true,
          message: 'Concept Brief submitted for NOVORA review.',
          publicReference: 'NOVORA-CB-20260522-MAIL',
          conceptBriefId: '33333333-3333-4333-8333-333333333333',
        }),
      });
    });

    await page.route('/api/concept-brief-admin-notification', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        status: 503,
        body: JSON.stringify({
          ok: false,
          notified: false,
          skipped: false,
          message: 'Admin notification unavailable.',
        }),
      });
    });

    await openMetalOnlyBangleBrief(page);
    await fillValidContactFields(page);
    await page.getByRole('button', { name: 'Submit concept brief' }).click();

    await expect(page).toHaveURL(/\/design\/submitted$/);
    await expect(page.getByRole('heading', { name: 'Concept brief received' })).toBeVisible();
    await expect(page.getByText('NOVORA-CB-20260522-MAIL')).toBeVisible();

    const submittedBrief = await page.evaluate(() => {
      const rawBrief = window.localStorage.getItem('novora_submitted_concept_brief');
      return rawBrief ? JSON.parse(rawBrief) : null;
    });

    expect(submittedBrief).toMatchObject({
      conceptBriefId: 'NOVORA-CB-20260522-MAIL',
      publicReference: 'NOVORA-CB-20260522-MAIL',
      customerName: 'Mina Chen',
      customerEmail: 'mina@example.com',
    });
  });

  test('waits for delayed persisted concept brief response before notifying admin', async ({ page }) => {
    const notifications: Array<Record<string, unknown>> = [];

    await page.route('/api/concept-briefs', async (route) => {
      await delay(4000);
      await route.fulfill({
        contentType: 'application/json',
        status: 201,
        body: JSON.stringify({
          ok: true,
          mode: 'supabase',
          persisted: true,
          message: 'Concept Brief submitted for NOVORA review.',
          publicReference: 'NOVORA-CB-20260523-SLOW',
          conceptBriefId: '44444444-4444-4444-8444-444444444444',
        }),
      });
    });

    await page.route('/api/concept-brief-admin-notification', async (route) => {
      notifications.push((await route.request().postDataJSON()) as Record<string, unknown>);

      await route.fulfill({
        contentType: 'application/json',
        status: 200,
        body: JSON.stringify({
          ok: true,
          notified: true,
          skipped: false,
          message: 'Admin notification accepted.',
        }),
      });
    });

    await openMetalOnlyBangleBrief(page);
    await fillValidContactFields(page);
    await page.getByRole('button', { name: 'Submit concept brief' }).click();

    await expect(page).toHaveURL(/\/design\/submitted$/);
    await expect(page.getByRole('heading', { name: 'Concept brief received' })).toBeVisible();
    await expect(page.getByText('NOVORA-CB-20260523-SLOW')).toBeVisible();

    const submittedBrief = await page.evaluate(() => {
      const rawBrief = window.localStorage.getItem('novora_submitted_concept_brief');
      return rawBrief ? JSON.parse(rawBrief) : null;
    });

    expect(submittedBrief).toMatchObject({
      conceptBriefId: 'NOVORA-CB-20260523-SLOW',
      publicReference: 'NOVORA-CB-20260523-SLOW',
      apiSubmission: {
        persisted: true,
        conceptBriefId: '44444444-4444-4444-8444-444444444444',
        publicReference: 'NOVORA-CB-20260523-SLOW',
      },
    });
    expect(notifications).toEqual([
      {
        conceptBriefId: '44444444-4444-4444-8444-444444444444',
        publicReference: 'NOVORA-CB-20260523-SLOW',
      },
    ]);
  });
});

test.describe('/admin/briefs protected review UI', () => {
  test('requires admin access for AI sketch review state writes', async ({ page }) => {
    await page.goto('/');

    const responseStatus = await page.evaluate(async () => {
      const response = await fetch('/admin/briefs/ai-sketch-review', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: 'create',
          conceptBriefId: '55555555-5555-4555-8555-555555555555',
          reviewStatus: 'internal_draft_not_generated',
        }),
      });

      return response.status;
    });

    expect(responseStatus).toBe(401);
  });

  test('rejects invalid AI sketch review write payloads before persistence', async ({ baseURL, context, page }) => {
    const adminAccessKey = process.env.NOVORA_ADMIN_ACCESS_KEY;

    if (!adminAccessKey) {
      test.skip(true, 'NOVORA_ADMIN_ACCESS_KEY is required to verify protected AI sketch review API validation.');
      return;
    }

    const appUrl = new URL(baseURL || 'http://127.0.0.1:3000');
    const adminCookieValue = createHmac('sha256', adminAccessKey)
      .update('novora-admin-briefs-access')
      .digest('hex');

    await context.addCookies([
      {
        name: 'novora_admin_access',
        value: adminCookieValue,
        domain: appUrl.hostname,
        path: '/',
        expires: Math.floor(Date.now() / 1000) + 60 * 60,
        httpOnly: true,
        sameSite: 'Strict',
        secure: appUrl.protocol === 'https:',
      },
    ]);
    await page.goto('/');

    const responseStatuses = await page.evaluate(async () => {
      const payloads: Array<string | Record<string, unknown>> = [
        '{',
        {
          mode: 'create',
          conceptBriefId: '',
          reviewStatus: 'internal_draft_not_generated',
        },
        {
          mode: 'create',
          conceptBriefId: '55555555-5555-4555-8555-555555555555',
          reviewStatus: 'pending',
        },
        {
          mode: 'create',
          conceptBriefId: '55555555-5555-4555-8555-555555555555',
          reviewStatus: 'legacy_review_status',
        },
        {
          mode: 'replace',
          conceptBriefId: '55555555-5555-4555-8555-555555555555',
          reviewStatus: 'internal_draft_not_generated',
        },
        {
          mode: 'create',
          conceptBriefId: '55555555-5555-4555-8555-555555555555',
          reviewStatus: 'internal_draft_not_generated',
          customer_safe_note: 'must not be accepted',
        },
      ];

      return Promise.all(
        payloads.map(async (payload) => {
          const response = await fetch('/admin/briefs/ai-sketch-review', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
              'Content-Type': 'application/json',
            },
            body: typeof payload === 'string' ? payload : JSON.stringify(payload),
          });

          return response.status;
        }),
      );
    });

    expect(responseStatuses).toEqual([400, 400, 400, 400, 400, 400]);
  });

  test('uses legacy admin access cookie scope for admin-path review state saves', async ({ baseURL, context, page }) => {
    const adminAccessKey = process.env.NOVORA_ADMIN_ACCESS_KEY;

    if (!adminAccessKey) {
      test.skip(true, 'NOVORA_ADMIN_ACCESS_KEY is required to verify protected admin review state API access.');
      return;
    }

    const appUrl = new URL(baseURL || 'http://127.0.0.1:3000');
    const legacyCookieValue = createHmac('sha256', adminAccessKey)
      .update('novora-admin-briefs-access')
      .digest('hex');

    await context.addCookies([
      {
        name: 'novora_admin_access',
        value: legacyCookieValue,
        domain: appUrl.hostname,
        path: '/admin/briefs',
        expires: Math.floor(Date.now() / 1000) + 60 * 60,
        httpOnly: true,
        sameSite: 'Strict',
        secure: appUrl.protocol === 'https:',
      },
    ]);

    await page.goto('/admin/briefs');

    if (await page.getByRole('heading', { name: 'Admin review is not configured' }).isVisible()) {
      await expect(page.getByText('No customer data is shown while the admin access key is missing.')).toBeVisible();
      return;
    }

    await expect(page.getByText('Temporary protected admin surface')).toBeVisible();

    const responseStatus = await page.evaluate(async () => {
      const response = await fetch('/admin/briefs/review-state', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conceptBriefId: 'not-a-real-uuid',
          reviewStatus: 'unsupported-status',
          internalNotes: '',
        }),
      });

      return response.status;
    });

    expect(responseStatus).toBe(400);
  });

  test('keeps admin data protected and opens a submitted localStorage fallback detail after access', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'novora_submitted_concept_brief',
        JSON.stringify({
          conceptBriefId: 'NOVORA-CB-20260512-TEST',
          submittedAt: '2026-05-12T08:00:00.000Z',
          pieceType: 'ring',
          branch: '',
          structure: 'ring_center_stone',
          subStructure: '',
          stoneLogic: 'center_stone',
          referenceImageCount: 2,
          referenceImageNames: ['ring-front.png', 'ring-side.png'],
          referenceNotes: 'Seeded e2e localStorage brief.',
          aiSketchInstruction: 'Keep this as a sketch planning direction only.',
          customerName: 'Mina Chen',
          customerEmail: 'mina@example.com',
          customerCountry: 'United States',
        }),
      );
    });

    await page.goto('/admin/briefs');

    if (await page.getByRole('heading', { name: 'Admin review is not configured' }).isVisible()) {
      await expect(page.getByText('No customer data is shown while the admin access key is missing.')).toBeVisible();
      await expect(page.getByText('Mina Chen')).toHaveCount(0);
      return;
    }

    await expect(page.getByRole('heading', { name: 'NOVORA Brief Review' })).toBeVisible();
    await expect(page.getByText('Admin access required')).toBeVisible();
    await expect(page.getByText('This MVP gate checks a server-only access key before loading customer data.')).toBeVisible();
    await expect(page.getByText('Mina Chen')).toHaveCount(0);

    const adminAccessKey = process.env.NOVORA_ADMIN_ACCESS_KEY;

    if (!adminAccessKey) {
      test.skip(true, 'NOVORA_ADMIN_ACCESS_KEY is required to verify the protected admin review queue.');
      return;
    }

    await page.getByLabel('Admin access key').fill(adminAccessKey);
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(page.getByRole('heading', { name: 'NOVORA Brief Review' })).toBeVisible();
    await expect(page.getByText('Temporary protected admin surface')).toBeVisible();
    await expect(page.getByText('Access is gated by the server-only NOVORA_ADMIN_ACCESS_KEY value.')).toBeVisible();
    await expect(page.getByText('The service role key is never sent to browser code.')).toBeVisible();
    await expect(
      page.getByText('No CAD requests, quotes, production orders, emails, payments, or file storage are created here.'),
    ).toBeVisible();
    await expect(page.getByText('NOVORA-CB-20260512-TEST')).toBeVisible();
    await expect(page.getByText('Mina Chen')).toBeVisible();
    await expect(page.getByText('mina@example.com')).toBeVisible();
    await expect(page.getByText('Mina Chen / mina@example.com / United States')).toBeVisible();
    await expect(page.getByText('NOVORA-CB-MOCK-0001')).toBeVisible();

    await page.getByLabel('Status').selectOption('Need more info');
    await expect(page.getByText('NOVORA-CB-MOCK-0002')).toBeVisible();
    await expect(page.getByText('NOVORA-CB-20260512-TEST')).toHaveCount(0);

    await page.getByLabel('Status').selectOption('All');
    await page.getByLabel('Search by ID, name, or email').fill('20260512-TEST');
    await expect(page.getByText('NOVORA-CB-20260512-TEST')).toBeVisible();
    await expect(page.getByText('NOVORA-CB-MOCK-0001')).toHaveCount(0);

    await page
      .locator('tr')
      .filter({ hasText: 'NOVORA-CB-20260512-TEST' })
      .getByRole('link', { name: 'View brief' })
      .click();

    await expect(page).toHaveURL(/\/admin\/briefs\/NOVORA-CB-20260512-TEST$/);
    await expect(page.getByText('Concept Brief ID / public reference')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'NOVORA-CB-20260512-TEST' })).toBeVisible();
    await expect(page.getByText('Local fallback review detail')).toBeVisible();
    await expect(page.getByText('This page is shown only after the server validates the admin access cookie.')).toBeVisible();
    await expect(page.getByText('The service role key and admin access key are never sent to browser code.')).toBeVisible();
    await expect(
      page.getByText('No CAD requests, quotes, final pricing, production orders, emails, payments, or file storage are created here.').first(),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Concept Brief summary' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Contact summary' })).toBeVisible();
    await expect(page.getByText('Mina Chen', { exact: true })).toBeVisible();
    await expect(page.getByText('mina@example.com', { exact: true })).toBeVisible();
    await expect(page.getByText('United States', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Reference images metadata' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'AI sketch instruction / concept direction' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'AI Sketch Review Workflow' })).toBeVisible();
    await expect(page.getByText('Current review state')).toBeVisible();
    await expect(page.getByText('Internal draft not generated')).toBeVisible();
    await expect(page.getByText('No persisted AI sketch review yet')).toBeVisible();
    await expect(page.getByText('No internal sketch drafts yet.')).toBeVisible();
    await expect(page.getByText('Draft generated')).toBeVisible();
    await expect(page.getByText('Needs revision')).toBeVisible();
    await expect(page.getByText('Approved for customer')).toBeVisible();
    await expect(
      page.getByText(
        'AI sketches are internal drafts until reviewed and approved. Customers must only see sketches approved by the NOVORA design team.',
      ),
    ).toBeVisible();
    await expect(page.getByText('This does not generate, store, or deliver sketches yet.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Admin review status' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Admin notification status' })).toBeVisible();
    await expect(
      page.getByText('No admin notification event has been recorded for this Concept Brief.'),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'CAD readiness' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Stored submission data' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Internal notes / local review state' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Boundary notes' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Status' })).toContainText('New');

    await page.getByRole('combobox', { name: 'Status' }).selectOption('Reviewing');
    await page.getByRole('textbox', { name: 'Internal notes' }).fill('Check stone scale before any CAD discussion.');

    const adminReviewState = await page.evaluate(() => {
      const rawState = window.localStorage.getItem('novora_admin_brief_review_state');
      return rawState ? JSON.parse(rawState) : null;
    });

    expect(adminReviewState['NOVORA-CB-20260512-TEST']).toMatchObject({
      status: 'Reviewing',
      internalNotes: 'Check stone scale before any CAD discussion.',
    });
  });
});
