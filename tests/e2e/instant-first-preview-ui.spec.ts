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

const PUBLIC_REFERENCE = 'NOVORA-CB-20260728-A72D';
const BRIEF_ID = '123e4567-e89b-42d3-a456-426614174000';
const OUTPUT_ID = '323e4567-e89b-42d3-a456-426614174000';
const SUBMITTED_BRIEF_STORAGE_KEY = 'novora_submitted_concept_brief';
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

const testRequire = createRequire(
  path.join(process.cwd(), 'tests', 'e2e', 'instant-first-preview-ui.spec.ts'),
);

let previewStateRenderer: PreviewStateRenderer | null = null;

function loadPreviewStateRenderer(): PreviewStateRenderer {
  if (previewStateRenderer) return previewStateRenderer;

  const source = fs.readFileSync(PREVIEW_PAGE_PATH, 'utf8');
  const instrumentedSource = `${source}\nexport { PreviewStateContent as __PreviewStateContent };\n`;
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
  if (typeof renderer !== 'function') {
    throw new Error('PreviewStateContent test renderer was not found.');
  }
  previewStateRenderer = renderer as PreviewStateRenderer;
  return previewStateRenderer;
}

function renderCustomerView(view: CustomerView, publicReference = PUBLIC_REFERENCE) {
  const PreviewStateContent = loadPreviewStateRenderer();
  return renderToStaticMarkup(
    React.createElement(PreviewStateContent, {
      publicReference,
      view,
    }),
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

test.describe('Agent 72D four-state customer presentation', () => {
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
        await expect(page.getByRole('main')).toBeVisible();
        const dimensions = await page.evaluate(() => ({
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
        }));
        expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
      }
    });
  }
});
