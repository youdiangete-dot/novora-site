import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

import { expect, type Page, test } from '@playwright/test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const PUBLIC_REFERENCE = 'NOVORA-CB-20260729-A72D';
const OTHER_PUBLIC_REFERENCE = 'NOVORA-CB-20260729-B72D';
const OUTPUT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const SUBMITTED_STORAGE_KEY = 'novora_submitted_concept_brief';
const PREVIEW_PAGE_PATH = path.join(
  process.cwd(),
  'app',
  'design',
  'preview',
  '[public_reference]',
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
const BRIEF_CSS_PATH = path.join(process.cwd(), 'app', 'design', 'brief', 'brief.module.css');
const GLOBAL_CSS_PATH = path.join(process.cwd(), 'app', 'globals.css');

type SyntheticTrustedCustomerView =
  | { state: 'pending'; pollAfterMs: 5000 }
  | {
      state: 'ready';
      assetRequest: {
        publicReference: string;
        outputId: string;
      };
    }
  | { state: 'unavailable' }
  | { state: 'denied' };

type PreviewPageModule = {
  default: (
    props: {
      params: Promise<{ public_reference: string }>;
      searchParams?: Promise<Record<string, string | string[] | undefined>>;
    },
    trustedCustomerView?: SyntheticTrustedCustomerView,
  ) => Promise<React.ReactElement>;
};

function createCssModule() {
  const classes = new Proxy<Record<string, string>>(
    {},
    {
      get: (_target, property) => String(property),
    },
  );

  return { __esModule: true, default: classes };
}

function loadActualPreviewPageModule(): PreviewPageModule {
  const source = readFileSync(PREVIEW_PAGE_PATH, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: PREVIEW_PAGE_PATH,
  }).outputText;
  const module = { exports: {} as PreviewPageModule };
  const nodeRequire = createRequire(
    path.join(process.cwd(), 'tests', 'e2e', 'instant-first-preview-ui.spec.ts'),
  );
  const testRequire = (specifier: string) => {
    if (specifier === 'next/link') {
      const TestLink = ({
        children,
        href,
        ...props
      }: React.PropsWithChildren<{ href: string; [key: string]: unknown }>) =>
        React.createElement('a', { ...props, href }, children);

      return { __esModule: true, default: TestLink };
    }

    if (specifier.endsWith('.module.css')) {
      return createCssModule();
    }

    return nodeRequire(specifier);
  };
  const executeModule = new vm.Script(`(function (require, module, exports) { ${transpiled}\n})`, {
    filename: PREVIEW_PAGE_PATH,
  }).runInThisContext() as (
    require: (specifier: string) => unknown,
    module: { exports: PreviewPageModule },
    exports: PreviewPageModule,
  ) => void;

  executeModule(testRequire, module, module.exports);
  return module.exports;
}

async function renderActualPreviewPage(
  publicReference: string,
  trustedCustomerView: SyntheticTrustedCustomerView,
  searchParams: Record<string, string | string[] | undefined> = {},
) {
  const PreviewPage = loadActualPreviewPageModule().default;
  const element = await PreviewPage({
    params: Promise.resolve({ public_reference: publicReference }),
    searchParams: Promise.resolve(searchParams),
  }, trustedCustomerView);

  return renderToStaticMarkup(element);
}

async function seedConfirmedReceipt(page: Page) {
  await page.addInitScript(
    ({ publicReference, storageKey }) => {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          submittedAt: '2026-07-29T08:00:00.000Z',
          customerName: 'Mina Chen',
          customerEmail: 'mina@example.com',
          apiSubmission: {
            persisted: true,
            publicReference,
            conceptBriefId: '77777777-7777-4777-8777-777777777777',
          },
        }),
      );
    },
    { publicReference: PUBLIC_REFERENCE, storageKey: SUBMITTED_STORAGE_KEY },
  );
}

async function expectNoPreviewAuthority(page: Page) {
  await expect(page.getByRole('heading', { name: 'First Preview is unavailable' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your First Preview is being prepared' })).toHaveCount(0);
  await expect(page.getByText('First Preview ready', { exact: true })).toHaveCount(0);
  await expect(page.locator('img')).toHaveCount(0);
}

function actualPreviewCss() {
  return [GLOBAL_CSS_PATH, BRIEF_CSS_PATH, PREVIEW_CSS_PATH]
    .map((filePath) => readFileSync(filePath, 'utf8'))
    .join('\n');
}

async function mountSyntheticMarkup(page: Page, markup: string, baseURL: string) {
  await page.setContent(`<!doctype html>
    <html>
      <head>
        <base href="${baseURL}/" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>${actualPreviewCss()}</style>
      </head>
      <body>${markup}</body>
    </html>`);
}

test.describe('Agent 72D hardened customer First Preview UI', () => {
  test('valid hardened receipt creates the exact reference-only Preview status link and automatic-gate copy', async ({
    page,
  }) => {
    await seedConfirmedReceipt(page);
    await page.goto('/design/submitted');

    const previewLink = page.getByRole('link', { name: `View First Preview status for ${PUBLIC_REFERENCE}` });

    await expect(previewLink).toBeVisible();
    await expect(previewLink).toHaveAttribute('href', `/design/preview/${PUBLIC_REFERENCE}`);
    await expect(previewLink).not.toHaveAttribute('href', /[?&=]/);
    await expect(
      page.getByText('First Preview generation begins automatically after NOVORA confirms receipt', { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByText('automatic safety, privacy, customer-isolation, asset-validity, and lifecycle gates pass', {
        exact: false,
      }),
    ).toBeVisible();
    await expect(
      page.getByText('Failed, unsafe, ambiguous, complex, low-confidence, or correction cases', { exact: false }),
    ).toBeVisible();
  });

  test('malformed and unconfirmed receipts expose no Preview link or protected asset request', async ({ page }) => {
    let protectedAssetRequests = 0;

    await page.route('**/api/first-preview-assets/**', async (route) => {
      protectedAssetRequests += 1;
      await route.abort();
    });
    await page.addInitScript((storageKey) => {
      window.localStorage.setItem(storageKey, '{"apiSubmission":');
    }, SUBMITTED_STORAGE_KEY);
    await page.goto('/design/submitted');

    await expect(page.getByRole('heading', { name: 'Server receipt not confirmed' })).toBeVisible();
    await expect(page.locator('a[href^="/design/preview/"]')).toHaveCount(0);
    expect(protectedAssetRequests).toBe(0);

    await page.evaluate((storageKey) => {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          apiSubmission: {
            persisted: false,
            publicReference: 'NOVORA-CB-20260729-A72D',
            conceptBriefId: '77777777-7777-4777-8777-777777777777',
          },
        }),
      );
    }, SUBMITTED_STORAGE_KEY);
    await page.reload();

    await expect(page.getByRole('heading', { name: 'Server receipt not confirmed' })).toBeVisible();
    await expect(page.locator('a[href^="/design/preview/"]')).toHaveCount(0);
    expect(protectedAssetRequests).toBe(0);
  });

  test('publicReference, query state, localStorage, sessionStorage, and browser outputId cannot create pending or ready', async ({
    page,
  }) => {
    let protectedAssetRequests = 0;

    await page.route('**/api/first-preview-assets/**', async (route) => {
      protectedAssetRequests += 1;
      await route.abort();
    });
    await page.addInitScript(
      ({ outputId, publicReference }) => {
        const browserState = JSON.stringify({
          state: 'ready',
          first_preview_ready: true,
          publicReference,
          outputId,
        });
        window.localStorage.setItem('novora_first_preview_state', browserState);
        window.localStorage.setItem(publicReference, browserState);
        window.sessionStorage.setItem('novora_first_preview_state', browserState);
        window.sessionStorage.setItem(publicReference, browserState);
      },
      { outputId: OUTPUT_ID, publicReference: PUBLIC_REFERENCE },
    );

    await page.goto(
      `/design/preview/${PUBLIC_REFERENCE}?state=first_preview_ready&publicReference=${PUBLIC_REFERENCE}&outputId=${OUTPUT_ID}`,
    );

    await expectNoPreviewAuthority(page);
    expect(protectedAssetRequests).toBe(0);
  });

  test('malformed route values all bind to the same generic denied presentation without an asset', async () => {
    const malformedReferences = [
      'novora-cb-20260729-a72d',
      'NOVORA-XX-20260729-A72D',
      'NOVORA-CB-20260729-A72D%2FEXTRA',
      'NOVORA-CB-20260729-A72D%',
      'NOVORA-CB-20260729-Ａ72D',
      'NOVORA-CB-20260729-A72D\r\n',
      ' NOVORA-CB-20260729-A72D',
      `NOVORA-CB-20260729-${'A'.repeat(80)}`,
      'NOVORA-CB-20260729-A72\u0000',
    ];

    for (const malformedReference of malformedReferences) {
      const markup = await renderActualPreviewPage(malformedReference, {
        state: 'ready',
        assetRequest: {
          publicReference: malformedReference,
          outputId: OUTPUT_ID,
        },
      });

      expect(markup).toContain('We cannot display this First Preview');
      expect(markup).not.toContain('<img');
      expect(markup).not.toContain(malformedReference);
      expect(markup).not.toContain('First Preview is unavailable');
    }
  });

  test('Next.js route decoding still denies encoded slash, whitespace, Unicode-confusable, and percent input', async ({
    page,
  }) => {
    let protectedAssetRequests = 0;
    const malformedPaths = [
      '/design/preview/novora-cb-20260729-a72d',
      '/design/preview/NOVORA-XX-20260729-A72D',
      '/design/preview/NOVORA-CB-20260729-A72D%2FEXTRA',
      '/design/preview/NOVORA-CB-20260729-%EF%BC%A172D',
      '/design/preview/%20NOVORA-CB-20260729-A72D',
      '/design/preview/NOVORA-CB-20260729-A72D%2500',
    ];

    await page.route('**/api/first-preview-assets/**', async (route) => {
      protectedAssetRequests += 1;
      await route.abort();
    });

    for (const malformedPath of malformedPaths) {
      await page.goto(malformedPath);
      await expect(page.getByRole('heading', { name: 'We cannot display this First Preview' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'First Preview is unavailable' })).toHaveCount(0);
      await expect(page.locator('img')).toHaveCount(0);
    }

    expect(protectedAssetRequests).toBe(0);
  });

  test('a valid route fails closed to a non-enumerating unavailable state without the Production adapter', async ({
    page,
  }) => {
    await page.goto(`/design/preview/${PUBLIC_REFERENCE}`);

    await expectNoPreviewAuthority(page);
    await expect(page.getByText('does not confirm whether a preview or customer record exists', { exact: false })).toBeVisible();
    await expect(page.getByText(/Job ID|Output ID|attempt|provider|bucket|storage path/i)).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Return to submitted receipt' })).toBeVisible();
  });

  test('synthetic trusted pending traverses the page route binding and renders safe preparation wording without an image', async () => {
    const markup = await renderActualPreviewPage(
      PUBLIC_REFERENCE,
      { state: 'pending', pollAfterMs: 5000 },
      {
        state: 'first_preview_ready',
        outputId: OUTPUT_ID,
      },
    );

    expect(markup).toContain('Your First Preview is being prepared');
    expect(markup).toContain('Preparing safely');
    expect(markup).toContain('automatic safety, privacy, customer-isolation, asset-validity, and lifecycle gates pass');
    expect(markup).toContain(`href="/design/preview/${PUBLIC_REFERENCE}"`);
    expect(markup).toContain(`aria-label="Refresh First Preview status for ${PUBLIC_REFERENCE}"`);
    expect(markup).not.toContain('<img');
    expect(markup).toContain('no estimated completion percentage or guaranteed completion time');
    expect(markup).not.toMatch(/\b\d+%|Job ID|attempt number|Provider status/i);
  });

  test('synthetic trusted ready rejects route mismatch and invalid Output UUID through the page binding', async () => {
    const mismatched = await renderActualPreviewPage(PUBLIC_REFERENCE, {
      state: 'ready',
      assetRequest: {
        publicReference: OTHER_PUBLIC_REFERENCE,
        outputId: OUTPUT_ID,
      },
    });
    const invalidOutput = await renderActualPreviewPage(PUBLIC_REFERENCE, {
      state: 'ready',
      assetRequest: {
        publicReference: PUBLIC_REFERENCE,
        outputId: 'not-a-valid-output-uuid',
      },
    });

    for (const markup of [mismatched, invalidOutput]) {
      expect(markup).toContain('We cannot display this First Preview');
      expect(markup).not.toContain('<img');
      expect(markup).not.toContain('/api/first-preview-assets/');
    }
  });

  test('synthetic trusted ready uses only the protected asset route and keeps outputId out of customer text', async ({
    baseURL,
    page,
  }) => {
    const markup = await renderActualPreviewPage(PUBLIC_REFERENCE, {
      state: 'ready',
      assetRequest: {
        publicReference: PUBLIC_REFERENCE,
        outputId: OUTPUT_ID,
      },
    });

    expect(markup).toContain(
      `/api/first-preview-assets/${PUBLIC_REFERENCE}/${OUTPUT_ID}`,
    );
    expect(markup).toContain(`alt="AI hand-drawn concept sketch for ${PUBLIC_REFERENCE}"`);
    expect(markup).not.toMatch(/https?:\/\/[^"]*(supabase|storage|provider)/i);
    expect(markup).not.toMatch(/signedUrl|bucket|objectPath|reviewer|prompt/i);

    await mountSyntheticMarkup(page, markup, baseURL || 'http://localhost:3000');
    await expect(page.getByRole('heading', { name: 'Your first concept direction is ready to view' })).toBeVisible();
    await expect(page.getByRole('img', { name: `AI hand-drawn concept sketch for ${PUBLIC_REFERENCE}` })).toBeVisible();
    await expect(page.locator('body')).not.toContainText(OUTPUT_ID);
    await expect(page.getByRole('link', { name: 'Return to submitted receipt' })).toBeVisible();
    await expect(page.getByText('not CAD, a quotation, payment confirmation, an order', { exact: false })).toBeVisible();
  });

  test('protected asset 404 keeps real committed CSS bounded at desktop, mobile, and narrow mobile widths', async ({
    baseURL,
    page,
  }) => {
    const markup = await renderActualPreviewPage(PUBLIC_REFERENCE, {
      state: 'ready',
      assetRequest: {
        publicReference: PUBLIC_REFERENCE,
        outputId: OUTPUT_ID,
      },
    });
    let protectedAssetRequests = 0;

    await page.route('**/api/first-preview-assets/**', async (route) => {
      protectedAssetRequests += 1;
      await route.fulfill({
        body: 'not found',
        contentType: 'text/plain',
        status: 404,
      });
    });

    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 390, height: 844 },
      { width: 320, height: 740 },
    ]) {
      await page.setViewportSize(viewport);
      await mountSyntheticMarkup(page, markup, baseURL || 'http://localhost:3000');
      await expect(page.getByRole('img', { name: `AI hand-drawn concept sketch for ${PUBLIC_REFERENCE}` })).toBeVisible();

      const layout = await page.evaluate(() => {
        const frame = document.querySelector('figure');
        const image = document.querySelector('img');
        const frameRect = frame?.getBoundingClientRect();
        const imageRect = image?.getBoundingClientRect();

        return {
          bodyText: document.body.innerText,
          frameInsideViewport:
            Boolean(frameRect) &&
            frameRect!.left >= 0 &&
            frameRect!.right <= window.innerWidth + 1 &&
            frameRect!.width <= window.innerWidth,
          imageInsideFrame:
            Boolean(frameRect && imageRect) &&
            imageRect!.left >= frameRect!.left &&
            imageRect!.right <= frameRect!.right + 1,
          noHorizontalOverflow: document.documentElement.scrollWidth <= window.innerWidth,
        };
      });

      expect(layout.noHorizontalOverflow).toBe(true);
      expect(layout.frameInsideViewport).toBe(true);
      expect(layout.imageInsideFrame).toBe(true);
      expect(layout.bodyText).not.toContain(OUTPUT_ID);
      expect(layout.bodyText).not.toMatch(/Supabase|Storage|Provider URL|private asset/i);
      await expect(page.getByRole('heading', { name: 'An AI hand-drawn concept sketch, not a production decision' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Return to submitted receipt' })).toBeVisible();
    }

    expect(protectedAssetRequests).toBe(3);
  });

  test('denied is generic and accessibility names, focus, headings, and image alt remain usable', async ({
    baseURL,
    page,
  }) => {
    const deniedMarkup = await renderActualPreviewPage('NOVORA-CB-NOT-REAL', { state: 'denied' });

    await mountSyntheticMarkup(page, deniedMarkup, baseURL || 'http://localhost:3000');
    await expect(page.getByRole('heading', { level: 1, name: 'Customer First Preview' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'We cannot display this First Preview' })).toBeVisible();
    await expect(page.locator('body')).not.toContainText('NOVORA-CB-NOT-REAL');
    await expect(page.getByText(/missing proof|invalid proof|expired proof|wrong customer|nonexistent/i)).toHaveCount(0);

    const returnLink = page.getByRole('link', { name: 'Return to submitted receipt' });
    await returnLink.focus();
    await expect(returnLink).toBeFocused();
    const outlineStyle = await returnLink.evaluate((link) => getComputedStyle(link).outlineStyle);
    expect(outlineStyle).not.toBe('none');
  });

  test('customer-visible sources contain the locked automatic-visibility rule and no superseded delivery rule', () => {
    const customerSources = [
      readFileSync(path.join(process.cwd(), 'app', 'design', 'submitted', 'page.tsx'), 'utf8'),
      readFileSync(PREVIEW_PAGE_PATH, 'utf8'),
    ].join('\n');

    expect(customerSources).toContain('generation begins automatically');
    expect(customerSources).toContain('becomes visible');
    expect(customerSources).toContain('automatic safety, privacy');
    expect(customerSources).toContain('may require human handling');
    expect(customerSources).toContain('AI hand-drawn concept sketch');
    expect(customerSources).toContain('not CAD');
    expect(customerSources).toContain('manufacturability guarantee');
    expect(customerSources).not.toMatch(
      /internal-only delivery|email-only delivery|per-image human pre-approval|human review is required before customer-facing delivery|approved_for_customer|demo mock preview|mock-ready/i,
    );
  });
});
