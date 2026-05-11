import { expect, type Locator, type Page, test } from '@playwright/test';

const wrongFocalFields = [
  'Focal stone / pearl / bead type',
  'Approximate focal size',
];

const multiStoneFields = [
  'Stone type / stone mix',
  'Color direction',
  'Shape / cut mix',
  'Stone size relationship',
  'Multi-stone layout direction',
];

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
  other_custom: 'Other / custom piece',
  pendant_necklace: 'Pendant / Necklace',
};

async function openConcept(page: Page, pieceType: string) {
  await page.goto(`/design/concept?pieceType=${pieceType}`);
  await expect(page.locator('strong').filter({ hasText: pieceTypeLabels[pieceType] })).toBeVisible();
}

async function chooseButton(page: Page, name: string) {
  await page.getByRole('button').filter({ hasText: name }).first().click();
}

async function goToStoneLogic(page: Page) {
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.locator('form').getByRole('heading', { name: 'Stone logic' })).toBeVisible();
}

async function goToMetalAndWearability(page: Page) {
  await page.getByRole('button').filter({ hasText: 'Metal & wearability' }).click();
  await expect(page.locator('form').getByRole('heading', { name: 'Metal, finish & wearability' })).toBeVisible();
}

async function goToBriefResult(page: Page) {
  await page.getByRole('button').filter({ hasText: 'Review brief' }).click();
  await expect(page.locator('form').getByRole('heading', { name: 'Review brief' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue to next concept step' }).click();
  await expect(page).toHaveURL(/\/design\/brief$/);
  await expect(page.getByRole('heading', { name: 'Your concept direction is ready' })).toBeVisible();
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

test.describe('/design/concept bracelet and necklace logic', () => {
  test('Bracelet / Bangle -> Bangle -> Metal-only bangle hides stone modules', async ({ page }) => {
    await openConcept(page, 'bracelet_bangle');
    await chooseButton(page, 'Bangle');
    await chooseButton(page, 'Metal-only bangle');
    await goToStoneLogic(page);

    const form = page.locator('form');
    await expect(form.getByText('No required stone module is needed for the selected direction.')).toBeVisible();
    await expectTextsAbsent(form, [...wrongFocalFields, ...multiStoneFields, ...repeatedStoneFields]);

    await goToBriefResult(page);
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

    await goToBriefResult(page);
    await expectTextsVisible(page, multiStoneFields);
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

    await goToBriefResult(page);
    await expectTextsVisible(page, repeatedStoneFields);
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
    await expect(form.getByText('This direction may require manual confirmation before CAD, sourcing, or production.')).toBeVisible();
    await expectTextsAbsent(form, [...wrongFocalFields, ...multiStoneFields, ...repeatedStoneFields]);

    await goToBriefResult(page);
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

    await goToBriefResult(page);
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

    await goToBriefResult(page);
    await expectTextsVisible(page, [...stationFields, ...chainFields]);
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

    await goToBriefResult(page);
    await expectTextsVisible(page, repeatedStoneFields);
  });

  test('Other / custom piece -> Brooch / pin shows manual review and direct reference upload', async ({ page }) => {
    await openConcept(page, 'other_custom');
    await chooseButton(page, 'Brooch / pin');
    await goToStoneLogic(page);

    const form = page.locator('form');
    await expect(form.getByRole('heading', { name: 'Custom visual review' })).toBeVisible();
    await expect(form.getByRole('heading', { name: 'Reference images' })).toBeVisible();
    await expect(form.locator('input[type="file"][accept="image/*"]')).toBeVisible();
    await expectTextsAbsent(form, [...wrongFocalFields, ...multiStoneFields, ...repeatedStoneFields]);

    await goToBriefResult(page);
    await expect(page.getByText('Reference images').first()).toBeVisible();
    await expect(page.getByText('Manual confirmation').first()).toBeVisible();
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
