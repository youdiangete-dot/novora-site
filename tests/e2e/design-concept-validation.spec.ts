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
  test('submits a valid concept brief and opens the submitted confirmation page', async ({ page }) => {
    await openConcept(page, 'bracelet_bangle');
    await chooseButton(page, 'Bangle');
    await chooseButton(page, 'Metal-only bangle');
    await goToStoneLogic(page);
    await goToBriefResult(page);

    await expect(page.getByText('Reference images').first()).toBeVisible();
    await page.getByRole('button', { name: 'Submit concept brief' }).click();

    await expect(page).toHaveURL(/\/design\/submitted$/);
    await expect(page.getByRole('heading', { name: 'Concept brief received' })).toBeVisible();
    await expect(page.getByText(/NOVORA-CB-\d{8}-[A-Z0-9]{4}/)).toBeVisible();
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
      pieceType: 'bracelet_bangle',
      structure: 'bracelet_bangle',
      subStructure: 'bangle_metal_only',
      stoneLogic: 'none',
      referenceImageCount: 0,
      referenceImageNames: [],
    });
    expect(submittedBrief.conceptBriefId).toMatch(/^NOVORA-CB-\d{8}-[A-Z0-9]{4}$/);
    expect(submittedBrief.submittedAt).toEqual(expect.any(String));
  });
});

test.describe('/admin/briefs mock review UI', () => {
  test('loads the mock admin list and opens a submitted localStorage brief detail', async ({ page }) => {
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
        }),
      );
    });

    await page.goto('/admin/briefs');

    await expect(page.getByRole('heading', { name: 'NOVORA Brief Review' })).toBeVisible();
    await expect(page.getByText('Mock admin view. Not connected to a real database.')).toBeVisible();
    await expect(page.getByText('Front-end-only mock review dashboard for submitted concept briefs.')).toBeVisible();
    await expect(page.getByText('No real customer data is stored on a server.')).toBeVisible();
    await expect(page.getByText('Database and protected admin login will be added later.')).toBeVisible();
    await expect(page.getByText('NOVORA-CB-20260512-TEST')).toBeVisible();
    await expect(page.getByText('NOVORA-CB-MOCK-0001')).toBeVisible();

    await page.getByLabel('Status').selectOption('Need more info');
    await expect(page.getByText('NOVORA-CB-MOCK-0002')).toBeVisible();
    await expect(page.getByText('NOVORA-CB-20260512-TEST')).toHaveCount(0);

    await page.getByLabel('Status').selectOption('All');
    await page.getByLabel('Search by Concept Brief ID').fill('20260512-TEST');
    await expect(page.getByText('NOVORA-CB-20260512-TEST')).toBeVisible();
    await expect(page.getByText('NOVORA-CB-MOCK-0001')).toHaveCount(0);

    await page
      .locator('tr')
      .filter({ hasText: 'NOVORA-CB-20260512-TEST' })
      .getByRole('link', { name: 'View brief' })
      .click();

    await expect(page).toHaveURL(/\/admin\/briefs\/NOVORA-CB-20260512-TEST$/);
    await expect(page.getByText('Concept Brief ID')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'NOVORA-CB-20260512-TEST' })).toBeVisible();
    await expect(page.getByText('This is front-end-only.').first()).toBeVisible();
    await expect(page.getByText('No real customer data is stored on a server.').first()).toBeVisible();
    await expect(page.getByText('No real upload files are available here.').first()).toBeVisible();
    await expect(page.getByText('This is not a CAD-ready production order.').first()).toBeVisible();
    await expect(page.getByText('Final CAD, pricing, sourcing, and production feasibility are confirmed later.').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Brief overview' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Design direction' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Reference images metadata' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'AI sketch instruction' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Internal review' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Boundary notes' })).toBeVisible();
    await expect(page.getByLabel('Status')).toContainText('New');

    await page.getByLabel('Status').selectOption('Reviewing');
    await page.getByLabel('Internal notes').fill('Check stone scale before any CAD discussion.');

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
