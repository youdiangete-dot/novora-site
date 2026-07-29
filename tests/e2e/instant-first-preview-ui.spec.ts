import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

type CustomerView =
  | Readonly<{ state: 'pending'; pollAfterMs: 5000 }>
  | Readonly<{
      state: 'ready';
      assetRequest: Readonly<{
        publicReference: string;
        outputId: string;
      }>;
    }>
  | Readonly<{ state: 'unavailable' }>
  | Readonly<{ state: 'denied' }>;

type PreviewStateRenderer = (props: {
  publicReference: string;
  view: CustomerView;
}) => React.ReactElement;

type PreviewRouteConstraint = (
  view: CustomerView,
  publicReference: string,
) => CustomerView;

type PreviewHarness = {
  ConceptBoundary: () => React.ReactElement;
  PreviewStateContent: PreviewStateRenderer;
  constrainViewToRoute: PreviewRouteConstraint;
};

const PUBLIC_REFERENCE = 'NOVORA-CB-20260728-A72D';
const BRIEF_ID = '123e4567-e89b-42d3-a456-426614174000';
const OUTPUT_ID = '323e4567-e89b-42d3-a456-426614174000';
const SUBMITTED_BRIEF_STORAGE_KEY = 'novora_submitted_concept_brief';
const RECEIPT_ATTACK_MARKER = '__NOVORA_RECEIPT_ATTACK__';
const PREVIEW_PAGE_PATH = path.join(
  process.cwd(),
  'app',
  'design',
  'preview',
  '[public_reference]',
  'page.tsx',
);
const SUBMITTED_PAGE_PATH = path.join(
  process.cwd(),
  'app',
  'design',
  'submitted',
  'page.tsx',
);
const PREVIEW_CSS_PATH = path.join(
  process.cwd(),
  'app',
  'design',
  'preview',
  '[public_reference]',
  'preview.module.css',
);
const SHARED_BRIEF_CSS_PATH = path.join(
  process.cwd(),
  'app',
  'design',
  'brief',
  'brief.module.css',
);
const GLOBAL_CSS_PATH = path.join(process.cwd(), 'app', 'globals.css');

const testRequire = createRequire(
  path.join(process.cwd(), 'tests', 'e2e', 'instant-first-preview-ui.spec.ts'),
);

let previewHarness: PreviewHarness | null = null;

function loadPreviewHarness(): PreviewHarness {
  if (previewHarness) return previewHarness;

  const source = fs.readFileSync(PREVIEW_PAGE_PATH, 'utf8');
  const instrumentedSource = `${source}\nexport {
    ConceptBoundary as __ConceptBoundary,
    PreviewStateContent as __PreviewStateContent,
    constrainViewToRoute as __ConstrainViewToRoute,
  };\n`;
  const compiled = ts.transpileModule(instrumentedSource, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: PREVIEW_PAGE_PATH,
    reportDiagnostics: true,
  });
  expect(compiled.diagnostics ?? []).toEqual([]);

  const cssClasses = new Proxy<Record<string, string>>(
    {},
    {
      get(_target, property) {
        if (property === '__esModule') return false;
        return String(property);
      },
    },
  );
  const localRequire = (request: string) => {
    if (request.endsWith('.module.css')) return cssClasses;
    if (request === 'next/link') {
      return function TestLink({
        children,
        ...props
      }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
        return React.createElement('a', props, children);
      };
    }
    return testRequire(request);
  };
  const moduleRecord: { exports: Record<string, unknown> } = { exports: {} };
  const evaluateModule = new Function(
    'require',
    'module',
    'exports',
    `${compiled.outputText}\n//# sourceURL=${PREVIEW_PAGE_PATH.replaceAll('\\', '/')}`,
  );
  evaluateModule(localRequire, moduleRecord, moduleRecord.exports);

  const renderer = moduleRecord.exports.__PreviewStateContent;
  const boundary = moduleRecord.exports.__ConceptBoundary;
  const routeConstraint = moduleRecord.exports.__ConstrainViewToRoute;
  if (
    typeof renderer !== 'function' ||
    typeof boundary !== 'function' ||
    typeof routeConstraint !== 'function'
  ) {
    throw new Error('First Preview route-binding test harness was not found.');
  }
  previewHarness = {
    ConceptBoundary: boundary as PreviewHarness['ConceptBoundary'],
    PreviewStateContent: renderer as PreviewStateRenderer,
    constrainViewToRoute: routeConstraint as PreviewRouteConstraint,
  };
  return previewHarness;
}

function renderCustomerView(view: CustomerView, publicReference = PUBLIC_REFERENCE) {
  const { PreviewStateContent, constrainViewToRoute } = loadPreviewHarness();
  const routeBoundView = constrainViewToRoute(view, publicReference);
  return renderToStaticMarkup(
    React.createElement(PreviewStateContent, {
      publicReference,
      view: routeBoundView,
    }),
  );
}

function renderTrustedPreviewPage(view: CustomerView, publicReference = PUBLIC_REFERENCE) {
  const {
    ConceptBoundary,
    PreviewStateContent,
    constrainViewToRoute,
  } = loadPreviewHarness();
  const routeBoundView = constrainViewToRoute(view, publicReference);

  return renderToStaticMarkup(
    React.createElement(
      'main',
      { className: 'pageBackground' },
      React.createElement(
        'section',
        { className: 'shell previewShell' },
        React.createElement(
          'div',
          { className: 'layout' },
          React.createElement(
            'header',
            { className: 'hero' },
            React.createElement('p', { className: 'eyebrow' }, 'NOVORA First Preview'),
            React.createElement('h1', null, 'Your NOVORA First Preview'),
            React.createElement(
              'p',
              null,
              'The first AI hand-drawn concept sketch becomes visible only when the required automatic gates pass.',
            ),
          ),
          React.createElement(PreviewStateContent, {
            publicReference,
            view: routeBoundView,
          }),
          React.createElement(ConceptBoundary),
        ),
      ),
    ),
  );
}

async function seedSubmittedBrief(
  page: Page,
  apiSubmission: Record<string, unknown> | undefined,
  outerPublicReference = PUBLIC_REFERENCE,
) {
  await page.addInitScript(
    ({ storageKey, submission, publicReference }) => {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          conceptBriefId: 'local-browser-summary',
          publicReference,
          submittedAt: '2026-07-28T08:00:00.000Z',
          customerName: 'Synthetic Customer',
          customerEmail: 'synthetic@example.test',
          apiSubmission: submission,
        }),
      );
    },
    {
      storageKey: SUBMITTED_BRIEF_STORAGE_KEY,
      submission: apiSubmission,
      publicReference: outerPublicReference,
    },
  );
}

async function seedRawSubmittedRecord(page: Page, rawRecord: string) {
  await page.addInitScript(
    ({ storageKey, raw }) => {
      window.localStorage.setItem(storageKey, raw);
    },
    {
      storageKey: SUBMITTED_BRIEF_STORAGE_KEY,
      raw: rawRecord,
    },
  );
}

type ReceiptAttack =
  | 'api-on-object-prototype'
  | 'api-on-custom-prototype'
  | 'api-getter'
  | 'persisted-on-object-prototype'
  | 'public-reference-on-object-prototype'
  | 'concept-brief-id-on-object-prototype'
  | 'persisted-getter'
  | 'public-reference-getter'
  | 'concept-brief-id-getter'
  | 'throwing-proxy';

async function installReceiptAttack(page: Page, attack: ReceiptAttack) {
  await page.addInitScript(
    ({ attackName, briefId, marker, outputReference, storageKey }) => {
      const testWindow = window as Window & {
        __novoraReceiptAttackCleanup?: () => void;
      };
      const originalParse = JSON.parse;
      const restoreCallbacks: Array<() => void> = [];
      const restoreProperty = (
        target: object,
        property: PropertyKey,
        descriptor: PropertyDescriptor,
      ) => {
        const previous = Object.getOwnPropertyDescriptor(target, property);
        Object.defineProperty(target, property, descriptor);
        restoreCallbacks.push(() => {
          if (previous) {
            Object.defineProperty(target, property, previous);
          } else {
            Reflect.deleteProperty(target, property);
          }
        });
      };
      const validReceipt = () => ({
        persisted: true,
        publicReference: outputReference,
        conceptBriefId: briefId,
      });
      const summary = () => ({
        conceptBriefId: 'local-browser-summary',
        publicReference: 'NOVORA-CB-20260728-OUTR',
        submittedAt: '2026-07-28T08:00:00.000Z',
        customerName: 'Synthetic Customer',
        customerEmail: 'synthetic@example.test',
      });

      let attackedRecord: unknown;
      if (attackName === 'api-on-object-prototype') {
        restoreProperty(Object.prototype, 'apiSubmission', {
          configurable: true,
          enumerable: false,
          value: validReceipt(),
          writable: true,
        });
        attackedRecord = summary();
      } else if (attackName === 'api-on-custom-prototype') {
        attackedRecord = Object.assign(
          Object.create({ apiSubmission: validReceipt() }) as Record<string, unknown>,
          summary(),
        );
      } else if (attackName === 'api-getter') {
        attackedRecord = summary();
        Object.defineProperty(attackedRecord, 'apiSubmission', {
          configurable: true,
          enumerable: true,
          get: validReceipt,
        });
      } else if (
        attackName === 'persisted-on-object-prototype' ||
        attackName === 'public-reference-on-object-prototype' ||
        attackName === 'concept-brief-id-on-object-prototype'
      ) {
        const inheritedProperty =
          attackName === 'persisted-on-object-prototype'
            ? 'persisted'
            : attackName === 'public-reference-on-object-prototype'
              ? 'publicReference'
              : 'conceptBriefId';
        const inheritedValue =
          inheritedProperty === 'persisted'
            ? true
            : inheritedProperty === 'publicReference'
              ? outputReference
              : briefId;
        restoreProperty(Object.prototype, inheritedProperty, {
          configurable: true,
          enumerable: false,
          value: inheritedValue,
          writable: true,
        });
        const receipt: Record<string, unknown> = validReceipt();
        Reflect.deleteProperty(receipt, inheritedProperty);
        attackedRecord = { ...summary(), apiSubmission: receipt };
      } else if (
        attackName === 'persisted-getter' ||
        attackName === 'public-reference-getter' ||
        attackName === 'concept-brief-id-getter'
      ) {
        const accessorProperty =
          attackName === 'persisted-getter'
            ? 'persisted'
            : attackName === 'public-reference-getter'
              ? 'publicReference'
              : 'conceptBriefId';
        const accessorValue =
          accessorProperty === 'persisted'
            ? true
            : accessorProperty === 'publicReference'
              ? outputReference
              : briefId;
        const receipt: Record<string, unknown> = validReceipt();
        Reflect.deleteProperty(receipt, accessorProperty);
        Object.defineProperty(receipt, accessorProperty, {
          configurable: true,
          enumerable: true,
          get: () => accessorValue,
        });
        attackedRecord = { ...summary(), apiSubmission: receipt };
      } else {
        attackedRecord = new Proxy(
          { ...summary(), apiSubmission: validReceipt() },
          {
            getPrototypeOf() {
              throw new Error('synthetic getPrototypeOf failure');
            },
          },
        );
      }

      JSON.parse = ((text: string, reviver?: (this: unknown, key: string, value: unknown) => unknown) => {
        if (text === marker) {
          return attackedRecord;
        }
        return originalParse(text, reviver);
      }) as typeof JSON.parse;
      window.localStorage.setItem(storageKey, marker);
      testWindow.__novoraReceiptAttackCleanup = () => {
        JSON.parse = originalParse;
        for (const restore of restoreCallbacks.reverse()) {
          restore();
        }
        Reflect.deleteProperty(testWindow, '__novoraReceiptAttackCleanup');
      };
    },
    {
      attackName: attack,
      briefId: BRIEF_ID,
      marker: RECEIPT_ATTACK_MARKER,
      outputReference: PUBLIC_REFERENCE,
      storageKey: SUBMITTED_BRIEF_STORAGE_KEY,
    },
  );
}

async function cleanupReceiptAttack(page: Page) {
  await page.evaluate(() => {
    const testWindow = window as Window & {
      __novoraReceiptAttackCleanup?: () => void;
    };
    testWindow.__novoraReceiptAttackCleanup?.();
  });
}

async function expectRejectedSubmittedReceipt(
  page: Page,
  route = '/design/submitted',
) {
  let protectedAssetRequests = 0;
  await page.route('**/api/first-preview-assets/**', async (requestRoute) => {
    protectedAssetRequests += 1;
    await requestRoute.abort();
  });

  await page.goto(route);
  await expect(page.getByRole('heading', { name: 'Server receipt not confirmed' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Concept brief received' })).toHaveCount(0);
  await expect(page.locator('a[href^="/design/preview/"]')).toHaveCount(0);
  await expectNoReadyPresentation(page);
  expect(protectedAssetRequests).toBe(0);
}

async function expectNoReadyPresentation(page: Page) {
  await expect(page.getByRole('heading', { name: 'Your First Preview is ready' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Your First Preview is being prepared' })).toHaveCount(0);
  await expect(page.locator('img[src^="/api/first-preview-assets/"]')).toHaveCount(0);
}

test.describe('Agent 72D submitted-page receipt and preview-link integrity', () => {
  test('preserves confirmed persistence, publicReference, and Brief UUID receipt gating', async ({ page }) => {
    await seedSubmittedBrief(page, {
      persisted: false,
      publicReference: PUBLIC_REFERENCE,
      conceptBriefId: BRIEF_ID,
    });
    await page.goto('/design/submitted');

    await expect(page.getByRole('heading', { name: 'Server receipt not confirmed' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Concept brief received' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'View First Preview status' })).toHaveCount(0);
  });

  test('does not create a preview link from publicReference knowledge alone', async ({ page }) => {
    await seedSubmittedBrief(page, undefined);
    await page.goto('/design/submitted');

    await expect(page.getByRole('heading', { name: 'Server receipt not confirmed' })).toBeVisible();
    await expect(page.locator('a[href^="/design/preview/"]')).toHaveCount(0);
  });

  test('uses only the validated receipt publicReference in the customer preview link', async ({ page }) => {
    await seedSubmittedBrief(
      page,
      {
        persisted: true,
        publicReference: PUBLIC_REFERENCE,
        conceptBriefId: BRIEF_ID,
      },
      'NOVORA-CB-20260728-OUTR',
    );
    await page.goto('/design/submitted');

    const link = page.getByRole('link', { name: 'View First Preview status' });
    await expect(page.getByRole('heading', { name: 'Concept brief received' })).toBeVisible();
    await expect(link).toHaveAttribute('href', `/design/preview/${PUBLIC_REFERENCE}`);
    const href = await link.getAttribute('href');
    expect(href).toBe(`/design/preview/${PUBLIC_REFERENCE}`);
    expect(href).not.toContain('?');
    expect(href).not.toContain(BRIEF_ID);
    expect(href).not.toMatch(/proof|job|output|asset|storage/i);
  });
});

test.describe('Correction 01 adversarial submitted-receipt evidence', () => {
  const receiptAttacks: ReadonlyArray<readonly [string, ReceiptAttack]> = [
    ['rejects apiSubmission inherited from Object.prototype', 'api-on-object-prototype'],
    ['rejects apiSubmission inherited through another prototype', 'api-on-custom-prototype'],
    ['rejects apiSubmission exposed through a getter', 'api-getter'],
    ['rejects inherited persisted', 'persisted-on-object-prototype'],
    ['rejects inherited publicReference', 'public-reference-on-object-prototype'],
    ['rejects inherited conceptBriefId', 'concept-brief-id-on-object-prototype'],
    ['rejects accessor-backed persisted', 'persisted-getter'],
    ['rejects accessor-backed publicReference', 'public-reference-getter'],
    ['rejects accessor-backed conceptBriefId', 'concept-brief-id-getter'],
    ['fails closed when ordinary-object inspection throws', 'throwing-proxy'],
  ];

  for (const [name, attack] of receiptAttacks) {
    test(name, async ({ page }) => {
      await installReceiptAttack(page, attack);

      try {
        await expectRejectedSubmittedReceipt(page);
      } finally {
        await cleanupReceiptAttack(page);
      }
    });
  }

  const rawRejectedRecords: ReadonlyArray<readonly [string, string]> = [
    ['rejects a primitive submitted record', JSON.stringify('primitive-record')],
    [
      'rejects an array submitted record',
      JSON.stringify([
        {
          apiSubmission: {
            persisted: true,
            publicReference: PUBLIC_REFERENCE,
            conceptBriefId: BRIEF_ID,
          },
        },
      ]),
    ],
    ['rejects a null submitted record', 'null'],
    ['rejects malformed submitted JSON', '{"apiSubmission":'],
    [
      'rejects an incomplete own receipt',
      JSON.stringify({
        submittedAt: '2026-07-28T08:00:00.000Z',
        apiSubmission: {
          persisted: true,
          publicReference: PUBLIC_REFERENCE,
        },
      }),
    ],
    [
      'rejects persisted false',
      JSON.stringify({
        submittedAt: '2026-07-28T08:00:00.000Z',
        apiSubmission: {
          persisted: false,
          publicReference: PUBLIC_REFERENCE,
          conceptBriefId: BRIEF_ID,
        },
      }),
    ],
  ];

  for (const [name, rawRecord] of rawRejectedRecords) {
    test(name, async ({ page }) => {
      await seedRawSubmittedRecord(page, rawRecord);
      await expectRejectedSubmittedReceipt(page);
    });
  }

  test('rejects a valid publicReference without a confirmed receipt', async ({ page }) => {
    await seedSubmittedBrief(page, undefined);
    await expectRejectedSubmittedReceipt(page);
  });

  test('arbitrary query state cannot manufacture a receipt, pending state, or ready state', async ({ page }) => {
    await seedSubmittedBrief(page, undefined);
    await expectRejectedSubmittedReceipt(
      page,
      '/design/submitted?state=ready&proof=browser-proof',
    );
    await expect(page.getByText('browser-proof')).toHaveCount(0);
  });

  test('arbitrary browser outputId cannot manufacture a receipt, link, or asset request', async ({ page }) => {
    await seedSubmittedBrief(page, undefined);
    await page.addInitScript(() => {
      window.localStorage.setItem('outputId', 'browser-output-id');
      window.sessionStorage.setItem('outputId', 'browser-output-id');
    });
    await expectRejectedSubmittedReceipt(page);
    await expect(page.getByText('browser-output-id')).toHaveCount(0);
  });
});

test.describe('Agent 72D route-bound customer presentation', () => {
  test('pending renders safe waiting copy, accessible controls, and no protected image or internal IDs', async ({ page }) => {
    const markup = renderCustomerView({ state: 'pending', pollAfterMs: 5000 });
    await page.setContent(markup);

    await expect(page.getByRole('heading', { name: 'Your First Preview is being prepared' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Refresh status' })).toHaveAttribute(
      'href',
      `/design/preview/${PUBLIC_REFERENCE}`,
    );
    await expect(page.locator('img')).toHaveCount(0);
    await expect(page.getByText(/automatic safety, privacy, customer-isolation, asset-validity, and lifecycle/i)).toBeVisible();
    expect(await page.locator('body').innerText()).not.toMatch(/\bjob\b|\battempt\b|\boutput id\b|\d+%/i);
    expect(markup).not.toContain(BRIEF_ID);
    expect(markup).not.toContain(OUTPUT_ID);
  });

  test('ready renders only the protected generated-asset route and keeps outputId out of visible text', async ({ page }) => {
    const markup = renderCustomerView({
      state: 'ready',
      assetRequest: {
        publicReference: PUBLIC_REFERENCE,
        outputId: OUTPUT_ID,
      },
    });
    await page.setContent(markup);

    await expect(page.getByRole('heading', { name: 'Your First Preview is ready' })).toBeVisible();
    const image = page.getByRole('img', {
      name: 'AI hand-drawn concept sketch for your NOVORA First Preview',
    });
    await expect(image).toHaveAttribute(
      'src',
      `/api/first-preview-assets/${PUBLIC_REFERENCE}/${OUTPUT_ID}`,
    );
    const visibleText = await page.locator('body').innerText();
    expect(visibleText).not.toContain(OUTPUT_ID);
    expect(markup).not.toMatch(/supabase|storage\.googleapis|provider|prompt|https?:\/\/[^"']+/i);
    expect(markup).not.toMatch(/download|approve|payment action|place order|production action/i);
  });

  test('a mismatched ready publicReference is route-bound to denied with no image', async ({ page }) => {
    const markup = renderCustomerView({
      state: 'ready',
      assetRequest: {
        publicReference: 'NOVORA-CB-20260728-MISM',
        outputId: OUTPUT_ID,
      },
    });
    await page.setContent(markup);

    await expect(page.getByRole('heading', { name: 'This preview link is unavailable' })).toBeVisible();
    await expect(page.locator('img')).toHaveCount(0);
    await expectNoReadyPresentation(page);
  });

  test('a malformed ready Output UUID is route-bound to denied with no image', async ({ page }) => {
    const markup = renderCustomerView({
      state: 'ready',
      assetRequest: {
        publicReference: PUBLIC_REFERENCE,
        outputId: 'not-an-output-uuid',
      },
    });
    await page.setContent(markup);

    await expect(page.getByRole('heading', { name: 'This preview link is unavailable' })).toBeVisible();
    await expect(page.locator('img')).toHaveCount(0);
    await expectNoReadyPresentation(page);
  });

  test('unavailable renders a safe human-follow-up path without resource enumeration', async ({ page }) => {
    const markup = renderCustomerView({ state: 'unavailable' });
    await page.setContent(markup);

    await expect(page.getByRole('heading', { name: 'Your First Preview cannot be shown right now' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Return to Concept Brief' })).toHaveAttribute(
      'href',
      '/design/brief',
    );
    const visibleText = await page.locator('body').innerText();
    expect(visibleText).not.toMatch(/\bjob\b|\boutput\b|\basset\b|\bgate\b|database|provider|exception detail/i);
  });

  test('denied is generic and does not distinguish proof, customer, reference, or resource failures', async ({ page }) => {
    const markup = renderCustomerView({ state: 'denied' });
    await page.setContent(markup);

    await expect(page.getByRole('heading', { name: 'This preview link is unavailable' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to design start' })).toBeVisible();
    const visibleText = await page.locator('body').innerText();
    expect(visibleText).not.toMatch(/proof|expired|wrong customer|publicReference|malformed|nonexistent|brief id|output/i);
    await expect(page.getByRole('textbox')).toHaveCount(0);
  });

  test('a protected asset failure exposes neither a private URL nor an internal error', async ({ page }) => {
    let resolveRequest: () => void = () => undefined;
    const requestSeen = new Promise<void>((resolve) => {
      resolveRequest = resolve;
    });
    await page.route('**/api/first-preview-assets/**', async (route) => {
      resolveRequest();
      await route.fulfill({ status: 404, body: '' });
    });
    const markup = renderCustomerView({
      state: 'ready',
      assetRequest: {
        publicReference: PUBLIC_REFERENCE,
        outputId: OUTPUT_ID,
      },
    });
    await page.setContent(`<base href="http://localhost:3000">${markup}`);
    await requestSeen;

    await expect(page.getByRole('heading', { name: 'Your First Preview is ready' })).toBeVisible();
    expect(await page.locator('body').innerText()).not.toMatch(
      /private storage|signed url|provider error|database error|exception|stack trace/i,
    );
    await expect(page.getByRole('img')).toHaveAttribute(
      'src',
      `/api/first-preview-assets/${PUBLIC_REFERENCE}/${OUTPUT_ID}`,
    );
  });
});

test.describe('Agent 72D fail-closed browser inputs', () => {
  test('missing proof, route knowledge, query state, browser outputId, and browser storage never become ready', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('first_preview_state', 'ready');
      window.localStorage.setItem('outputId', 'browser-output-id');
      window.sessionStorage.setItem('first_preview_state', 'ready');
      window.sessionStorage.setItem('outputId', 'browser-output-id');
    });
    await page.goto(
      `/design/preview/${PUBLIC_REFERENCE}?state=ready&proof=browser-proof&outputId=browser-output-id`,
    );

    await expect(page.getByRole('heading', { name: 'Your First Preview cannot be shown right now' })).toBeVisible();
    await expectNoReadyPresentation(page);
    await expect(page.getByText(/browser-proof|browser-output-id/)).toHaveCount(0);
  });

  test('a malformed route reference fails closed and never requests a protected asset', async ({ page }) => {
    let protectedAssetRequests = 0;
    await page.route('**/api/first-preview-assets/**', async (route) => {
      protectedAssetRequests += 1;
      await route.abort();
    });
    await page.goto('/design/preview/not-a-customer-reference?state=ready');

    await expect(page.getByRole('heading', { name: 'This preview link is unavailable' })).toBeVisible();
    await expectNoReadyPresentation(page);
    expect(protectedAssetRequests).toBe(0);
    await expect(page.getByText('not-a-customer-reference')).toHaveCount(0);
  });
});

test.describe('Agent 72D wording, authority, accessibility, and layout contracts', () => {
  test('customer-visible copy states automatic visibility gates and the early-concept boundary', async ({ page }) => {
    await seedSubmittedBrief(page, {
      persisted: true,
      publicReference: PUBLIC_REFERENCE,
      conceptBriefId: BRIEF_ID,
    });
    await page.goto('/design/submitted');

    await expect(page.getByRole('heading', { name: 'Concept brief received' })).toBeVisible();
    const body = await page.getByRole('main').innerText();
    expect(body).toMatch(/generated automatically/i);
    expect(body).toMatch(/directly on this website/i);
    expect(body).toMatch(/safety, privacy, customer-isolation, asset-validity, and lifecycle gates/i);
    expect(body).toMatch(/failed, unsafe, ambiguous, complex, low-confidence, or correction cases/i);
    expect(body).toMatch(/early AI hand-drawn concept sketch/i);
    for (const requiredBoundary of [
      'not CAD',
      'not a quotation',
      'not payment confirmation',
      'not an order',
      'not production approval',
      'not a manufacturability guarantee',
    ]) {
      expect(body.toLowerCase()).toContain(requiredBoundary.toLowerCase());
    }
    expect(body).not.toMatch(
      /internal[- ]only|email[- ]only|approved_for_customer|human (?:pre-)?approval|human review before/i,
    );
  });

  test('the preview page has no client or browser authority source and uses only the frozen safe-view shape', () => {
    const previewSource = fs.readFileSync(PREVIEW_PAGE_PATH, 'utf8');
    const submittedSource = fs.readFileSync(SUBMITTED_PAGE_PATH, 'utf8');

    expect(previewSource).toContain(
      "typeof import('../../../../lib/server/ai-sketch/first-preview-customer-view').readFirstPreviewCustomerView",
    );
    expect(previewSource).toContain("return { state: 'unavailable' };");
    expect(previewSource).toContain('/api/first-preview-assets/');
    expect(previewSource).not.toMatch(
      /['"]use client['"]|searchParams|localStorage|sessionStorage|cookies\(|process\.env|signingSecret|stateSource|accessProof/i,
    );
    expect(submittedSource).not.toMatch(/NOVORA-CB-MOCK-001|\?state=first_preview_ready/);
  });

  test('valid routes provide accessible state headings and controls', async ({ page }) => {
    await page.goto(`/design/preview/${PUBLIC_REFERENCE}`);

    await expect(page.getByRole('heading', { level: 1, name: 'Your NOVORA First Preview' })).toBeVisible();
    await expect(
      page.getByRole('heading', { level: 2, name: 'Your First Preview cannot be shown right now' }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Return to Concept Brief' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to design start' })).toBeVisible();
  });

  test('real preview CSS keeps a route-bound ready layout safe when the protected image returns 404', async ({ page }) => {
    const globalCss = fs.readFileSync(GLOBAL_CSS_PATH, 'utf8');
    const sharedCss = fs.readFileSync(SHARED_BRIEF_CSS_PATH, 'utf8');
    const previewCss = fs.readFileSync(PREVIEW_CSS_PATH, 'utf8');
    const markup = renderTrustedPreviewPage({
      state: 'ready',
      assetRequest: {
        publicReference: PUBLIC_REFERENCE,
        outputId: OUTPUT_ID,
      },
    });
    let resolveProtectedRequest: ((url: string) => void) | undefined;
    const protectedAssetUrls: string[] = [];

    await page.route('**/api/first-preview-assets/**', async (route) => {
      const requestUrl = route.request().url();
      protectedAssetUrls.push(requestUrl);
      resolveProtectedRequest?.(requestUrl);
      resolveProtectedRequest = undefined;
      await route.fulfill({
        status: 404,
        contentType: 'text/plain',
        body: '',
      });
    });

    for (const viewport of [
      { name: 'desktop', width: 1440, height: 1000 },
      { name: 'mobile', width: 390, height: 844 },
      { name: 'narrow mobile', width: 320, height: 720 },
    ]) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const requestSeen = new Promise<string>((resolve) => {
        resolveProtectedRequest = resolve;
      });
      await page.setContent(`<!doctype html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <base href="http://localhost:3000" />
            <style>${globalCss}\n${sharedCss}\n${previewCss}</style>
          </head>
          <body>${markup}</body>
        </html>`);
      const protectedRequestUrl = await requestSeen;

      expect(new URL(protectedRequestUrl).pathname).toBe(
        `/api/first-preview-assets/${PUBLIC_REFERENCE}/${OUTPUT_ID}`,
      );
      await expect(page.getByRole('heading', { name: 'Your First Preview is ready' })).toBeVisible();
      await expect(
        page.getByRole('heading', { name: 'A First Preview is a starting point' }),
      ).toBeVisible();
      const navigation = page.getByRole('link', { name: 'Back to design start' }).first();
      await expect(navigation).toBeVisible();
      await expect(navigation).toHaveAttribute('href', '/design/start');
      await navigation.focus();
      await expect(navigation).toBeFocused();

      const dimensions = await page.evaluate(() => {
        const frame = document.querySelector<HTMLElement>('.imageFrame');
        const image = document.querySelector<HTMLImageElement>('.previewImage');
        if (!frame || !image) {
          throw new Error('Ready image layout was not rendered.');
        }
        const frameBox = frame.getBoundingClientRect();
        const imageBox = image.getBoundingClientRect();

        return {
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          frameLeft: frameBox.left,
          frameRight: frameBox.right,
          frameWidth: frameBox.width,
          imageLeft: imageBox.left,
          imageRight: imageBox.right,
          imageWidth: imageBox.width,
          imageComplete: image.complete,
          imageNaturalWidth: image.naturalWidth,
          visibleText: document.body.innerText,
          customerUrls: Array.from(
            document.body.querySelectorAll<HTMLElement>('[src], [srcset], [href]'),
          ).flatMap((element) =>
            ['src', 'srcset', 'href']
              .map((attribute) => element.getAttribute(attribute))
              .filter((value): value is string => value !== null),
          ),
        };
      });

      expect(dimensions.scrollWidth, `${viewport.name} horizontal overflow`).toBeLessThanOrEqual(
        dimensions.clientWidth,
      );
      expect(dimensions.frameLeft).toBeGreaterThanOrEqual(0);
      expect(dimensions.frameRight).toBeLessThanOrEqual(dimensions.clientWidth + 1);
      expect(dimensions.frameWidth).toBeLessThanOrEqual(dimensions.clientWidth);
      expect(dimensions.imageLeft).toBeGreaterThanOrEqual(dimensions.frameLeft);
      expect(dimensions.imageRight).toBeLessThanOrEqual(dimensions.frameRight + 1);
      expect(dimensions.imageWidth).toBeLessThanOrEqual(dimensions.frameWidth);
      expect(dimensions.imageComplete).toBe(true);
      expect(dimensions.imageNaturalWidth).toBe(0);
      expect(dimensions.visibleText).not.toContain(OUTPUT_ID);
      expect(dimensions.customerUrls).toHaveLength(3);
      expect(
        dimensions.customerUrls.filter(
          (url) =>
            url === `/api/first-preview-assets/${PUBLIC_REFERENCE}/${OUTPUT_ID}`,
        ),
      ).toHaveLength(2);
      expect(dimensions.customerUrls.filter((url) => url === '/design/start')).toHaveLength(1);
      expect(dimensions.customerUrls.join(' ')).not.toMatch(
        /supabase|storage|provider|signed|https?:\/\/(?!localhost)/i,
      );
    }

    expect(protectedAssetUrls).toHaveLength(3);
  });

  for (const viewport of [
    { name: 'mobile', width: 390, height: 844 },
    { name: 'desktop', width: 1440, height: 1000 },
  ]) {
    test(`${viewport.name} submitted and preview layouts do not overflow`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await seedSubmittedBrief(page, {
        persisted: true,
        publicReference: PUBLIC_REFERENCE,
        conceptBriefId: BRIEF_ID,
      });

      for (const route of ['/design/submitted', `/design/preview/${PUBLIC_REFERENCE}`]) {
        await page.goto(route);
        if (route === '/design/submitted') {
          await expect(page.getByRole('heading', { name: 'Concept brief received' })).toBeVisible();
        } else {
          await expect(
            page.getByRole('heading', { name: 'Your First Preview cannot be shown right now' }),
          ).toBeVisible();
        }
        const dimensions = await page.evaluate(() => ({
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
        }));
        expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
      }
    });
  }
});
