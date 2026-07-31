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

async function seedConfirmedSubmittedBrief(
  page: Page,
  publicReference = 'NOVORA-CB-20260601-LINK',
) {
  await page.goto('/');
  await page.evaluate((reference) => {
    window.localStorage.setItem(
      'novora_submitted_concept_brief',
      JSON.stringify({
        submittedAt: '2026-06-01T08:00:00.000Z',
        customerName: 'Mina Chen',
        customerEmail: 'mina@example.com',
        apiSubmission: {
          persisted: true,
          publicReference: reference,
          conceptBriefId: '77777777-7777-4777-8777-777777777777',
        },
      }),
    );
  }, publicReference);
}

type SubmittedReceiptCase =
  | 'array-record'
  | 'class-instance-record'
  | 'custom-prototype-api-submission'
  | 'date-record'
  | 'getter-api-submission'
  | 'getter-concept-brief-id'
  | 'getter-persisted'
  | 'getter-public-reference'
  | 'incomplete-own-receipt'
  | 'inherited-concept-brief-id'
  | 'inherited-persisted'
  | 'inherited-public-reference'
  | 'malformed-json'
  | 'non-enumerable-api-submission'
  | 'non-enumerable-concept-brief-id'
  | 'non-enumerable-persisted'
  | 'non-enumerable-public-reference'
  | 'null-prototype-api-submission'
  | 'null-prototype-record'
  | 'object-prototype-api-submission'
  | 'persisted-false'
  | 'primitive-record'
  | 'public-reference-alone'
  | 'setter-api-submission'
  | 'setter-backed-authoritative-fields'
  | 'throwing-descriptor-inspection'
  | 'throwing-prototype-inspection';

async function seedSubmittedReceiptCase(page: Page, receiptCase: SubmittedReceiptCase) {
  await page.addInitScript((caseName) => {
    const storageKey = 'novora_submitted_concept_brief';

    if (caseName === 'malformed-json') {
      window.localStorage.setItem(storageKey, '{"apiSubmission":');
      return;
    }

    const marker = `__NOVORA_SUBMITTED_RECEIPT_CASE__${caseName}`;
    const originalParse = JSON.parse;
    const restorers: Array<() => void> = [];

    const restoreMutations = () => {
      while (restorers.length > 0) {
        restorers.pop()?.();
      }
    };

    Object.defineProperty(window, '__novoraRestoreSubmittedReceiptTestMutations', {
      configurable: true,
      value: restoreMutations,
    });

    const validApiSubmission = () => ({
      persisted: true,
      publicReference: 'NOVORA-CB-20260601-HARD',
      conceptBriefId: '88888888-8888-4888-8888-888888888888',
    });
    const validRecord = () => ({
      submittedAt: '2026-06-01T08:00:00.000Z',
      customerName: 'Mina Chen',
      customerEmail: 'mina@example.com',
      apiSubmission: validApiSubmission(),
    });
    const replaceObjectPrototypeProperty = (property: string, value: unknown) => {
      const previousDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, property);

      Object.defineProperty(Object.prototype, property, {
        configurable: true,
        enumerable: false,
        value,
        writable: true,
      });
      restorers.push(() => {
        if (previousDescriptor) {
          Object.defineProperty(Object.prototype, property, previousDescriptor);
        } else {
          delete (Object.prototype as Record<string, unknown>)[property];
        }
      });
    };
    const defineAccessor = (object: object, property: string, getterValue?: unknown) => {
      Object.defineProperty(object, property, {
        configurable: true,
        enumerable: true,
        ...(getterValue === undefined ? { set: () => undefined } : { get: () => getterValue }),
      });
    };
    const defineNonEnumerable = (object: object, property: string, value: unknown) => {
      Object.defineProperty(object, property, {
        configurable: true,
        enumerable: false,
        value,
        writable: true,
      });
    };

    JSON.parse = ((text: string, reviver?: (this: unknown, key: string, value: unknown) => unknown) => {
      if (text !== marker) {
        return originalParse(text, reviver);
      }

      JSON.parse = originalParse;

      switch (caseName) {
        case 'null-prototype-record':
          return Object.assign(Object.create(null), validRecord());
        case 'null-prototype-api-submission': {
          const record = validRecord();
          record.apiSubmission = Object.assign(Object.create(null), validApiSubmission());
          return record;
        }
        case 'object-prototype-api-submission': {
          replaceObjectPrototypeProperty('apiSubmission', validApiSubmission());
          const record = validRecord();
          delete (record as Partial<typeof record>).apiSubmission;
          return record;
        }
        case 'custom-prototype-api-submission': {
          const record = validRecord();
          record.apiSubmission = Object.assign(Object.create({ receiptEvidence: true }), validApiSubmission());
          return record;
        }
        case 'getter-api-submission': {
          const record = validRecord();
          delete (record as Partial<typeof record>).apiSubmission;
          defineAccessor(record, 'apiSubmission', validApiSubmission());
          return record;
        }
        case 'setter-api-submission': {
          const record = validRecord();
          delete (record as Partial<typeof record>).apiSubmission;
          defineAccessor(record, 'apiSubmission');
          return record;
        }
        case 'non-enumerable-api-submission': {
          const record = validRecord();
          defineNonEnumerable(record, 'apiSubmission', validApiSubmission());
          return record;
        }
        case 'inherited-persisted': {
          replaceObjectPrototypeProperty('persisted', true);
          const record = validRecord();
          delete (record.apiSubmission as Partial<typeof record.apiSubmission>).persisted;
          return record;
        }
        case 'inherited-public-reference': {
          replaceObjectPrototypeProperty('publicReference', 'NOVORA-CB-20260601-HARD');
          const record = validRecord();
          delete (record.apiSubmission as Partial<typeof record.apiSubmission>).publicReference;
          return record;
        }
        case 'inherited-concept-brief-id': {
          replaceObjectPrototypeProperty('conceptBriefId', '88888888-8888-4888-8888-888888888888');
          const record = validRecord();
          delete (record.apiSubmission as Partial<typeof record.apiSubmission>).conceptBriefId;
          return record;
        }
        case 'getter-persisted': {
          const record = validRecord();
          delete (record.apiSubmission as Partial<typeof record.apiSubmission>).persisted;
          defineAccessor(record.apiSubmission, 'persisted', true);
          return record;
        }
        case 'getter-public-reference': {
          const record = validRecord();
          delete (record.apiSubmission as Partial<typeof record.apiSubmission>).publicReference;
          defineAccessor(record.apiSubmission, 'publicReference', 'NOVORA-CB-20260601-HARD');
          return record;
        }
        case 'getter-concept-brief-id': {
          const record = validRecord();
          delete (record.apiSubmission as Partial<typeof record.apiSubmission>).conceptBriefId;
          defineAccessor(record.apiSubmission, 'conceptBriefId', '88888888-8888-4888-8888-888888888888');
          return record;
        }
        case 'setter-backed-authoritative-fields': {
          const record = validRecord();
          for (const property of ['persisted', 'publicReference', 'conceptBriefId']) {
            delete (record.apiSubmission as Record<string, unknown>)[property];
            defineAccessor(record.apiSubmission, property);
          }
          return record;
        }
        case 'non-enumerable-persisted': {
          const record = validRecord();
          defineNonEnumerable(record.apiSubmission, 'persisted', true);
          return record;
        }
        case 'non-enumerable-public-reference': {
          const record = validRecord();
          defineNonEnumerable(record.apiSubmission, 'publicReference', 'NOVORA-CB-20260601-HARD');
          return record;
        }
        case 'non-enumerable-concept-brief-id': {
          const record = validRecord();
          defineNonEnumerable(record.apiSubmission, 'conceptBriefId', '88888888-8888-4888-8888-888888888888');
          return record;
        }
        case 'primitive-record':
          return 42;
        case 'array-record':
          return [validRecord()];
        case 'date-record':
          return new Date('2026-06-01T08:00:00.000Z');
        case 'class-instance-record': {
          class SubmittedRecord {
            apiSubmission = validApiSubmission();
            submittedAt = '2026-06-01T08:00:00.000Z';
          }

          return new SubmittedRecord();
        }
        case 'incomplete-own-receipt':
          return {
            ...validRecord(),
            apiSubmission: {
              persisted: true,
              publicReference: 'NOVORA-CB-20260601-HARD',
            },
          };
        case 'persisted-false':
          return {
            ...validRecord(),
            apiSubmission: {
              ...validApiSubmission(),
              persisted: false,
            },
          };
        case 'public-reference-alone':
          return {
            ...validRecord(),
            apiSubmission: {
              publicReference: 'NOVORA-CB-20260601-HARD',
            },
          };
        case 'throwing-prototype-inspection':
          return new Proxy(validRecord(), {
            getPrototypeOf() {
              throw new Error('prototype inspection denied');
            },
          });
        case 'throwing-descriptor-inspection':
          return new Proxy(validRecord(), {
            getOwnPropertyDescriptor(target, property) {
              if (property === 'apiSubmission') {
                throw new Error('descriptor inspection denied');
              }

              return Reflect.getOwnPropertyDescriptor(target, property);
            },
          });
      }
    }) as typeof JSON.parse;
    restorers.push(() => {
      JSON.parse = originalParse;
    });
    window.localStorage.setItem(storageKey, marker);
  }, receiptCase);
}

async function restoreSubmittedReceiptTestMutations(page: Page) {
  await page.evaluate(() => {
    const testWindow = window as typeof window & {
      __novoraRestoreSubmittedReceiptTestMutations?: () => void;
    };

    testWindow.__novoraRestoreSubmittedReceiptTestMutations?.();
    delete testWindow.__novoraRestoreSubmittedReceiptTestMutations;
  });
}

async function expectRejectedSubmittedReceipt(page: Page, receiptCase: SubmittedReceiptCase) {
  let protectedAssetRequestCount = 0;

  await page.route('**/api/first-preview-assets/**', async (route) => {
    protectedAssetRequestCount += 1;
    await route.abort();
  });
  await seedSubmittedReceiptCase(page, receiptCase);

  try {
    await page.goto('/design/submitted');

    await expect(page.getByRole('heading', { name: 'Server receipt not confirmed' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Concept brief received' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Open your First Preview' })).toHaveCount(0);
    expect(protectedAssetRequestCount).toBe(0);
  } finally {
    await restoreSubmittedReceiptTestMutations(page);
  }
}

function delay(milliseconds: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

test.describe('/design/start conversion flow', () => {
  test('carries design start selections into the concept brief submission', async ({ page }) => {
    let receivedPayload: Record<string, unknown> | null = null;
    let conceptBriefRequestCount = 0;

    await page.route('/api/concept-briefs', async (route) => {
      conceptBriefRequestCount += 1;
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
    await expect(page.getByRole('heading', { name: 'Concept brief received' })).toBeVisible();
    await expect(
      page.getByText(
        'NOVORA received your Concept Brief for studio review and may follow up using the contact details you provided.',
      ),
    ).toBeVisible();
    const previewLink = page.getByRole('link', { name: 'Open your First Preview' });

    await expect(previewLink).toBeVisible();
    await expect(previewLink).toHaveAttribute(
      'href',
      '/design/preview/NOVORA-CB-20260601-STRT',
    );
    await expect(page.getByText('Customer First Preview')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Follow your automatic concept-preview progress' })).toBeVisible();
    await expect(
      page.getByText(
        'This secure, query-free link is tied only to your validated customer reference.',
        { exact: false },
      ),
    ).toBeVisible();
    await expect(
      page.getByText('Human handling is exception-only when the system cannot safely converge.', { exact: false }),
    ).toBeVisible();
    await expect(page.getByText('It is not CAD, a final quote, an order', { exact: false })).toBeVisible();
    await expect(page.getByText('generated image is ready', { exact: false })).toHaveCount(0);
    await expect(page.getByText('image API completed', { exact: false })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'View AI Sketch Preview' })).toHaveCount(0);
    await expect(page.locator('a[href="/design/sketch"]')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Your automatic First Preview workflow' })).toBeVisible();
    await expect(
      page.getByText(
        'NOVORA will use the submitted email or contact information for follow-up about this Concept Brief. This receipt is not final order, payment, CAD, quote, or production confirmation. No automated customer email is sent from this submission flow.',
      ),
    ).toBeVisible();
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
    expect(conceptBriefRequestCount).toBe(1);

    await Promise.all([
      page.waitForURL('**/design/preview/NOVORA-CB-20260601-STRT'),
      previewLink.click(),
    ]);

    await expect(page.getByRole('heading', { name: 'Customer First Preview' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'First Preview unavailable' })).toBeVisible();
    expect(conceptBriefRequestCount).toBe(1);
  });
});

test.describe('/design/preview customer boundaries', () => {
  test('normal canonical request fails closed to unavailable', async ({ page }) => {
    await page.goto('/design/preview/NOVORA-CB-20260731-AB12');

    await expect(page.getByRole('heading', { name: 'First Preview unavailable' })).toBeVisible();
    await expect(
      page.getByRole('img', {
        name: 'Early AI hand-drawn jewelry concept sketch for the submitted NOVORA design direction',
      }),
    ).toHaveCount(0);
    await expect(page.getByText('provider, database, storage', { exact: false })).toBeVisible();
  });

  test('query state cannot select ready and is removed from the canonical URL', async ({ page }) => {
    await page.goto('/design/preview/NOVORA-CB-20260731-AB12?state=ready&next=https://example.com');

    await expect(page).toHaveURL('/design/preview/NOVORA-CB-20260731-AB12');
    await expect(page.getByRole('heading', { name: 'First Preview unavailable' })).toBeVisible();
    await expect(
      page.getByRole('img', {
        name: 'Early AI hand-drawn jewelry concept sketch for the submitted NOVORA design direction',
      }),
    ).toHaveCount(0);
  });

  test('malformed reference fails closed without reflecting it as a customer reference', async ({ page }) => {
    await page.goto('/design/preview/NOVORA-CB-NOT-REAL');

    await expect(page.getByRole('heading', { name: 'First Preview unavailable' })).toBeVisible();
    await expect(page.getByText('Reference unavailable', { exact: true })).toBeVisible();
    await expect(page.getByText('NOVORA-CB-NOT-REAL', { exact: true })).toHaveCount(0);
  });

  test('submitted receipt Preview link copy is bounded and target remains exact', async ({ page }) => {
    await seedConfirmedSubmittedBrief(page);

    await page.goto('/design/submitted');

    const previewLink = page.getByRole('link', { name: 'Open your First Preview' });

    await expect(previewLink).toBeVisible();
    await expect(previewLink).toHaveAttribute(
      'href',
      '/design/preview/NOVORA-CB-20260601-LINK',
    );
    await expect(page.getByText('Customer First Preview')).toBeVisible();
    await expect(page.getByText('query-free link', { exact: false })).toBeVisible();
    await expect(page.getByText('not CAD, a final quote, an order', { exact: false })).toBeVisible();
  });
});

test.describe('/design/submitted receipt JSON authority', () => {
  test('accepts one valid normal JSON receipt without changing the confirmed page', async ({ page }) => {
    await seedConfirmedSubmittedBrief(page);

    await page.goto('/design/submitted');

    await expect(page.getByRole('heading', { name: 'Concept brief received' })).toBeVisible();
    await expect(page.getByText('NOVORA-CB-20260601-LINK')).toBeVisible();
    await expect(page.getByText('Jun 1, 2026', { exact: false })).toBeVisible();
    await expectTextsVisible(page, ['Mina Chen', 'mina@example.com']);
    await expect(page.getByRole('heading', { name: 'Important boundary' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open your First Preview' })).toHaveAttribute(
      'href',
      '/design/preview/NOVORA-CB-20260601-LINK',
    );
  });

  for (const publicReference of [
    'NOVORA-CB-20260228-AB12',
    'NOVORA-CB-20240229-AB12',
  ]) {
    test(`accepts a persisted receipt with real calendar date ${publicReference}`, async ({ page }) => {
      await seedConfirmedSubmittedBrief(page, publicReference);

      await page.goto('/design/submitted');

      await expect(page.getByRole('heading', { name: 'Concept brief received' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Open your First Preview' })).toHaveAttribute(
        'href',
        `/design/preview/${publicReference}`,
      );
    });
  }

  for (const publicReference of [
    'NOVORA-CB-20260229-AB12',
    'NOVORA-CB-20260230-AB12',
    'NOVORA-CB-20260431-AB12',
    'NOVORA-CB-20260001-AB12',
    'NOVORA-CB-20261301-AB12',
    'NOVORA-CB-20260100-AB12',
    'NOVORA-CB-00000101-AB12',
  ]) {
    test(`rejects a persisted receipt with impossible calendar date ${publicReference}`, async ({ page }) => {
      await seedConfirmedSubmittedBrief(page, publicReference);

      await page.goto('/design/submitted');

      await expect(page.getByRole('heading', { name: 'Server receipt not confirmed' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Open your First Preview' })).toHaveCount(0);
    });
  }

  for (const receiptCase of ['null-prototype-record', 'null-prototype-api-submission'] as const) {
    test(`accepts a valid ${receiptCase.replaceAll('-', ' ')}`, async ({ page }) => {
      await seedSubmittedReceiptCase(page, receiptCase);

      try {
        await page.goto('/design/submitted');

        await expect(page.getByRole('heading', { name: 'Concept brief received' })).toBeVisible();
        await expect(page.getByText('NOVORA-CB-20260601-HARD')).toBeVisible();
        await expect(page.getByRole('link', { name: 'Open your First Preview' })).toHaveAttribute(
          'href',
          '/design/preview/NOVORA-CB-20260601-HARD',
        );
      } finally {
        await restoreSubmittedReceiptTestMutations(page);
      }
    });
  }

  const rejectedReceiptCases: ReadonlyArray<{
    receiptCase: SubmittedReceiptCase;
    title: string;
  }> = [
    { receiptCase: 'object-prototype-api-submission', title: 'rejects Object.prototype apiSubmission' },
    { receiptCase: 'custom-prototype-api-submission', title: 'rejects custom-prototype apiSubmission' },
    { receiptCase: 'getter-api-submission', title: 'rejects getter apiSubmission' },
    { receiptCase: 'setter-api-submission', title: 'rejects setter-only apiSubmission' },
    { receiptCase: 'non-enumerable-api-submission', title: 'rejects non-enumerable apiSubmission' },
    { receiptCase: 'inherited-persisted', title: 'rejects inherited persisted' },
    { receiptCase: 'inherited-public-reference', title: 'rejects inherited publicReference' },
    { receiptCase: 'inherited-concept-brief-id', title: 'rejects inherited conceptBriefId' },
    { receiptCase: 'getter-persisted', title: 'rejects getter persisted' },
    { receiptCase: 'getter-public-reference', title: 'rejects getter publicReference' },
    { receiptCase: 'getter-concept-brief-id', title: 'rejects getter conceptBriefId' },
    { receiptCase: 'setter-backed-authoritative-fields', title: 'rejects setter-backed authoritative fields' },
    { receiptCase: 'non-enumerable-persisted', title: 'rejects non-enumerable persisted' },
    { receiptCase: 'non-enumerable-public-reference', title: 'rejects non-enumerable publicReference' },
    { receiptCase: 'non-enumerable-concept-brief-id', title: 'rejects non-enumerable conceptBriefId' },
    { receiptCase: 'primitive-record', title: 'rejects a primitive record' },
    { receiptCase: 'array-record', title: 'rejects an array record' },
    { receiptCase: 'date-record', title: 'rejects a Date record' },
    { receiptCase: 'class-instance-record', title: 'rejects a class-instance record' },
    { receiptCase: 'malformed-json', title: 'rejects malformed JSON' },
    { receiptCase: 'incomplete-own-receipt', title: 'rejects an incomplete own receipt' },
    { receiptCase: 'persisted-false', title: 'rejects persisted false' },
    { receiptCase: 'public-reference-alone', title: 'rejects publicReference alone' },
    { receiptCase: 'throwing-prototype-inspection', title: 'rejects throwing prototype inspection' },
    { receiptCase: 'throwing-descriptor-inspection', title: 'rejects throwing descriptor inspection' },
  ];

  for (const { receiptCase, title } of rejectedReceiptCases) {
    test(title, async ({ page }) => {
      await expectRejectedSubmittedReceipt(page, receiptCase);
    });
  }
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
    await expect(page.getByRole('main').getByRole('link', { name: 'Start a Concept Brief' })).toBeVisible();
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
          databaseId: '55555555-5555-4555-8555-555555555555',
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
    await expect(page.getByText('Mina Chen', { exact: true })).toBeVisible();
    await expect(page.getByText('mina@example.com', { exact: true })).toBeVisible();
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
    await page.route('/admin/briefs/ai-sketch-review', async (route) => {
      const payload = route.request().postDataJSON() as Record<string, unknown>;

      expect(payload).toEqual({
        mode: 'create',
        conceptBriefId: '55555555-5555-4555-8555-555555555555',
        reviewStatus: 'needs_revision',
      });
      expect(payload).not.toHaveProperty('reviewer_note');
      expect(payload).not.toHaveProperty('customer_safe_note');

      await route.fulfill({
        contentType: 'application/json',
        status: 200,
        body: JSON.stringify({
          ok: true,
          state: {
            hasPersistedReview: true,
            reviewStatus: 'needs_revision',
          },
        }),
      });
    });
    await expect(page.getByRole('heading', { name: 'Concept Brief summary' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Contact summary' })).toBeVisible();
    await expect(page.getByText('Mina Chen', { exact: true })).toBeVisible();
    await expect(page.getByText('mina@example.com', { exact: true })).toBeVisible();
    await expect(page.getByText('United States', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Reference images metadata' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'AI sketch instruction / concept direction' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'AI Sketch Review Workflow' })).toBeVisible();
    const aiSketchWorkflowSection = page.getByRole('region', { name: 'AI Sketch Review Workflow' });
    const planningArtifactsSection = page.getByRole('region', { name: 'Internal design planning artifacts' });

    await expect(aiSketchWorkflowSection).toContainText('Current review state');
    await expect(aiSketchWorkflowSection).toContainText('Internal draft not generated');
    await expect(aiSketchWorkflowSection).toContainText('No persisted AI sketch review yet');
    await expect(aiSketchWorkflowSection).toContainText('No internal sketch drafts yet.');
    await expect(aiSketchWorkflowSection).toContainText('Draft generated');
    await expect(aiSketchWorkflowSection).toContainText('Needs revision');
    await expect(aiSketchWorkflowSection).toContainText('Approved for customer');
    await expect(
      page.getByText(
        'AI sketches are internal drafts until reviewed and approved. Customers must only see sketches approved by the NOVORA design team.',
      ),
    ).toBeVisible();
    await expect(page.getByText('This does not generate, store, or deliver sketches yet.')).toBeVisible();
    await expect(planningArtifactsSection).toContainText('Admin only');
    await expect(planningArtifactsSection).toContainText('Read-only');
    await expect(planningArtifactsSection).toContainText('Human review required');
    await expect(planningArtifactsSection).toContainText('Design Spec draft is not available yet.');
    await expect(planningArtifactsSection).toContainText('Hand Sketch Instruction draft is not available yet.');
    await expect(planningArtifactsSection).toContainText('Validation has not been run.');
    await expect(planningArtifactsSection).toContainText('Risk flags are not available yet.');
    await expect(planningArtifactsSection).toContainText('approved_for_customer is not approved_for_gallery.');
    await expect(planningArtifactsSection).toContainText('needs_revision blocks customer delivery.');
    await expect(planningArtifactsSection).toContainText('Human-controlled send is still required for any future email delivery.');
    await expect(planningArtifactsSection).not.toContainText('Mina Chen');
    await expect(planningArtifactsSection).not.toContainText('mina@example.com');
    await expect(planningArtifactsSection.getByRole('button')).toHaveCount(0);
    await expect(planningArtifactsSection.getByRole('link')).toHaveCount(0);
    await expect(planningArtifactsSection.getByRole('textbox')).toHaveCount(0);
    await expect(planningArtifactsSection.getByRole('combobox')).toHaveCount(0);
    await expect(page.getByRole('combobox', { name: 'AI sketch review status' })).toContainText(
      'Internal draft not generated',
    );
    await expect(page.getByRole('combobox', { name: 'AI sketch review status' })).toContainText(
      'Draft generated',
    );
    await expect(page.getByRole('combobox', { name: 'AI sketch review status' })).toContainText('Needs revision');
    await expect(page.getByRole('combobox', { name: 'AI sketch review status' })).toContainText(
      'Approved for customer',
    );
    await expect(page.getByRole('combobox', { name: 'AI sketch review status' })).not.toContainText('pending');
    await expect(page.getByRole('textbox', { name: 'reviewer_note' })).toHaveCount(0);
    await expect(page.getByRole('textbox', { name: 'customer_safe_note' })).toHaveCount(0);
    await page.getByRole('combobox', { name: 'AI sketch review status' }).selectOption('needs_revision');
    await page.getByRole('button', { name: 'Save AI sketch status' }).click();
    await expect(page.getByText('AI sketch review status saved.')).toBeVisible();
    await expect(aiSketchWorkflowSection).toContainText('Saved internal review state');
    await expect(page.getByRole('heading', { name: 'Admin review status' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Admin notification status' })).toBeVisible();
    await expect(
      page.getByText('No admin notification event has been recorded for this Concept Brief.'),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'CAD readiness' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Stored submission data' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Internal notes / local review state' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Boundary notes' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Status', exact: true })).toContainText('New');

    await page.getByRole('combobox', { name: 'Status', exact: true }).selectOption('Reviewing');
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
