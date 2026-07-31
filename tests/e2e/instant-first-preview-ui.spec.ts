import { createRequire } from 'node:module';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { request as httpRequest } from 'node:http';
import { createServer } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';

import { expect, type Page, test } from '@playwright/test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const PUBLIC_REFERENCE = 'NOVORA-CB-20260729-A72D';
const OTHER_PUBLIC_REFERENCE = 'NOVORA-CB-20260729-B72D';
const OUTPUT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const DENIED_REFERENCE_SENTINEL = 'NOVORA-CB-DENIED';
const DENIED_ROUTE = `/design/preview/${DENIED_REFERENCE_SENTINEL}`;
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

type ProductionServer = {
  baseURL: string;
  port: number;
  process: ChildProcess;
  projectPath: string;
  output: () => string;
};

const CLEARED_TEST_ENVIRONMENT = [
  'DATABASE_URL',
  'DIRECT_URL',
  'KV_REST_API_TOKEN',
  'KV_REST_API_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NOVORA_ADMIN_NOTIFICATION_EMAIL',
  'NOVORA_EMAIL_FROM',
  'NOVORA_EMAIL_REPLY_TO',
  'NOVORA_FIRST_PREVIEW_ACCESS_SIGNING_SECRET',
  'NOVORA_FIRST_PREVIEW_ASSET_BUCKET',
  'NOVORA_FIRST_PREVIEW_SIGNING_SECRET',
  'NOVORA_INTERNAL_SIGNING_SECRET',
  'OPENAI_API_KEY',
  'OPENAI_ORGANIZATION',
  'OPENAI_PROJECT',
  'REDIS_URL',
  'RESEND_API_KEY',
  'STORAGE_ACCESS_KEY_ID',
  'STORAGE_SECRET_ACCESS_KEY',
  'SUPABASE_ANON_KEY',
  'SUPABASE_DATABASE_URL',
  'SUPABASE_JWT_SECRET',
  'SUPABASE_STORAGE_BUCKET_AI_SKETCHES',
  'SUPABASE_STORAGE_BUCKET_CAD_PREVIEWS',
  'SUPABASE_STORAGE_BUCKET_ORDER_ATTACHMENTS',
  'SUPABASE_STORAGE_BUCKET_REFERENCES',
  'UPSTASH_REDIS_REST_TOKEN',
  'UPSTASH_REDIS_REST_URL',
] as const;

function syntheticTestEnvironment() {
  const environment = { ...process.env };

  for (const variableName of CLEARED_TEST_ENVIRONMENT) {
    delete environment[variableName];
  }

  return {
    ...environment,
    CI: '1',
    NEXT_TELEMETRY_DISABLED: '1',
    NEXT_PUBLIC_SUPABASE_URL: 'not-a-valid-supabase-url',
    NOVORA_ADMIN_ACCESS_KEY: 'synthetic-local-admin-key-pr248-correction',
    NOVORA_EXPECT_MALFORMED_SUPABASE_URL_TEST: '1',
    SUPABASE_SERVICE_ROLE_KEY: 'synthetic-local-service-role-pr248-correction',
  };
}

function copyTrackedProject(sourceRoot: string, destinationRoot: string) {
  const trackedFiles = spawnSync('git', ['ls-files', '-z'], {
    cwd: sourceRoot,
    encoding: 'buffer',
  });

  if (trackedFiles.status !== 0) {
    throw new Error(`Unable to enumerate tracked Production test files: ${trackedFiles.stderr.toString('utf8')}`);
  }

  const relativePaths = trackedFiles.stdout
    .toString('utf8')
    .split('\0')
    .filter(Boolean);

  if (!relativePaths.includes('proxy.ts')) {
    relativePaths.push('proxy.ts');
  }

  for (const relativePath of relativePaths) {
    const sourcePath = path.join(sourceRoot, relativePath);
    const destinationPath = path.join(destinationRoot, relativePath);
    mkdirSync(path.dirname(destinationPath), { recursive: true });
    copyFileSync(sourcePath, destinationPath);
  }

  const sourceNodeModules = path.join(sourceRoot, 'node_modules');
  if (!existsSync(sourceNodeModules)) {
    throw new Error('Production route tests require the existing local node_modules installation.');
  }

  cpSync(
    sourceNodeModules,
    path.join(destinationRoot, 'node_modules'),
    { dereference: true, recursive: true },
  );
}

function removeProductionProject(projectPath: string) {
  const resolvedProjectPath = path.resolve(projectPath);
  const expectedPrefix = path.resolve(os.tmpdir(), 'novora-pr248-production-');
  const comparableProjectPath = process.platform === 'win32'
    ? resolvedProjectPath.toLowerCase()
    : resolvedProjectPath;
  const comparablePrefix = process.platform === 'win32'
    ? expectedPrefix.toLowerCase()
    : expectedPrefix;

  if (!comparableProjectPath.startsWith(comparablePrefix)) {
    throw new Error('Refusing to remove an unexpected Production test directory.');
  }

  rmSync(projectPath, { force: true, maxRetries: 5, recursive: true, retryDelay: 100 });
}

async function reserveLoopbackPort() {
  return new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('Unable to reserve a loopback port for the Production route tests.'));
        return;
      }

      server.close((error) => {
        if (error) reject(error);
        else resolve(address.port);
      });
    });
  });
}

async function waitForProductionServer(server: ProductionServer) {
  const deadline = Date.now() + 60_000;

  while (Date.now() < deadline) {
    if (server.process.exitCode !== null) {
      throw new Error(`Production server exited before readiness.\n${server.output()}`);
    }

    try {
      const response = await fetch(`${server.baseURL}/design/start`);
      if (response.status < 500) return;
    } catch {
      // The controlled server has not bound its loopback port yet.
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`Production server readiness timed out.\n${server.output()}`);
}

async function startProductionServer(): Promise<ProductionServer> {
  const sourceRoot = process.cwd();
  const projectPath = mkdtempSync(path.join(os.tmpdir(), 'novora-pr248-production-'));
  copyTrackedProject(sourceRoot, projectPath);

  const environment = syntheticTestEnvironment();
  const nextBin = path.join(projectPath, 'node_modules', 'next', 'dist', 'bin', 'next');
  const build = spawnSync(process.execPath, [nextBin, 'build'], {
    cwd: projectPath,
    encoding: 'utf8',
    env: environment,
    timeout: 180_000,
  });

  if (build.status !== 0) {
    removeProductionProject(projectPath);
    throw new Error(`Production build failed.\n${build.stdout}\n${build.stderr}`);
  }

  const port = await reserveLoopbackPort();
  const chunks: string[] = [];
  const serverProcess = spawn(
    process.execPath,
    [nextBin, 'start', '--hostname', '127.0.0.1', '--port', String(port)],
    {
      cwd: projectPath,
      env: environment,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  const recordOutput = (chunk: Buffer) => {
    chunks.push(chunk.toString('utf8'));
    if (chunks.join('').length > 64_000) chunks.shift();
  };
  serverProcess.stdout?.on('data', recordOutput);
  serverProcess.stderr?.on('data', recordOutput);

  const server: ProductionServer = {
    baseURL: `http://127.0.0.1:${port}`,
    output: () => chunks.join(''),
    port,
    process: serverProcess,
    projectPath,
  };

  try {
    await waitForProductionServer(server);
    return server;
  } catch (error) {
    serverProcess.kill();
    removeProductionProject(projectPath);
    throw error;
  }
}

async function stopProductionServer(server: ProductionServer | undefined) {
  if (!server) return;

  if (server.process.exitCode === null) {
    const exited = new Promise<void>((resolve) => server.process.once('exit', () => resolve()));
    server.process.kill();
    await Promise.race([
      exited,
      new Promise<void>((resolve) => setTimeout(resolve, 5_000)),
    ]);
    if (server.process.exitCode === null) {
      server.process.kill('SIGKILL');
      await exited;
    }
  }

  removeProductionProject(server.projectPath);
}

async function requestRawProductionPath(server: ProductionServer, rawPath: string) {
  return new Promise<{ body: string; status: number }>((resolve, reject) => {
    const request = httpRequest(
      {
        headers: {
          Accept: 'text/html',
          Connection: 'close',
          Host: `127.0.0.1:${server.port}`,
        },
        hostname: '127.0.0.1',
        method: 'GET',
        path: rawPath,
        port: server.port,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => {
          resolve({
            body: Buffer.concat(chunks).toString('utf8'),
            status: response.statusCode || 0,
          });
        });
      },
    );

    request.once('error', reject);
    request.end();
  });
}

async function expectProductionDenied(
  page: Page,
  server: ProductionServer,
  routePath: string,
) {
  const protectedAssetRequests: string[] = [];
  const observeRequest = (request: { url: () => string }) => {
    if (request.url().includes('/api/first-preview-assets/')) {
      protectedAssetRequests.push(request.url());
    }
  };
  page.on('request', observeRequest);

  try {
    const response = await page.goto(`${server.baseURL}${routePath}`);
    expect(response).not.toBeNull();
    expect(response!.status()).not.toBe(500);
    await expect(page.getByRole('heading', { name: 'We cannot display this First Preview' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'First Preview is unavailable' })).toHaveCount(0);
    await expect(page.getByText(/404|This page could not be found|Application error|internal server error/i)).toHaveCount(0);
    await expect(
      page.getByText(/stack|digest|URI malformed|decodeURIComponent|Supabase|Storage|Provider|signed URL|proof|Job ID|Output ID|customer identity/i),
    ).toHaveCount(0);
    await expect(page.locator('img')).toHaveCount(0);
    expect(protectedAssetRequests).toEqual([]);

    return {
      customerPresentation: await page.locator('section[role="status"]').innerText(),
      status: response!.status(),
      visibleURL: page.url(),
    };
  } finally {
    page.off('request', observeRequest);
  }
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

test.describe('Correction 01 real Production Preview routing boundary', () => {
  test.describe.configure({ mode: 'serial', timeout: 240_000 });

  let productionServer: ProductionServer | undefined;

  test.beforeAll(async () => {
    productionServer = await startProductionServer();
  });

  test.afterAll(async () => {
    await stopProductionServer(productionServer);
  });

  test('literal extra segment internally rewrites to the canonical generic denied presentation', async ({ page }) => {
    const canonicalDenied = await expectProductionDenied(page, productionServer!, DENIED_ROUTE);
    const extraSegment = await expectProductionDenied(
      page,
      productionServer!,
      `/design/preview/${PUBLIC_REFERENCE}/EXTRA?state=ready&outputId=${OUTPUT_ID}`,
    );

    expect(extraSegment.status).not.toBe(404);
    expect(extraSegment.customerPresentation).toBe(canonicalDenied.customerPresentation);
    expect(extraSegment.visibleURL).toBe(
      `${productionServer!.baseURL}/design/preview/${PUBLIC_REFERENCE}/EXTRA?state=ready&outputId=${OUTPUT_ID}`,
    );
  });

  test('raw malformed percent reaches Production unchanged and renders the same generic denied presentation', async ({
    page,
  }) => {
    const malformedPercentPath = `/design/preview/${PUBLIC_REFERENCE.slice(0, -1)}%ZZ`;
    const rawResponse = await requestRawProductionPath(productionServer!, malformedPercentPath);
    const customerVisibleHtml = rawResponse.body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');

    expect(rawResponse.status).not.toBe(500);
    expect(customerVisibleHtml).toContain('We cannot display this First Preview');
    expect(customerVisibleHtml).not.toMatch(
      /This page could not be found|Application error|internal server error|URI malformed|decodeURIComponent|digest|stack/i,
    );
    expect(customerVisibleHtml).not.toMatch(
      /\/api\/first-preview-assets\/|Supabase|Storage|Provider|signed URL|proof|Job ID|Output ID|customer identity/i,
    );

    const canonicalDenied = await expectProductionDenied(page, productionServer!, DENIED_ROUTE);
    const malformedPercent = await expectProductionDenied(page, productionServer!, malformedPercentPath);

    expect(malformedPercent.customerPresentation).toBe(canonicalDenied.customerPresentation);
    expect(malformedPercent.visibleURL).toBe(`${productionServer!.baseURL}${malformedPercentPath}`);
  });

  test('canonical sentinel does not loop while a valid exact route passes through to unavailable', async ({ page }) => {
    const canonicalDenied = await expectProductionDenied(
      page,
      productionServer!,
      `${DENIED_ROUTE}?state=ready&outputId=${OUTPUT_ID}`,
    );
    expect(canonicalDenied.status).not.toBe(500);

    const protectedAssetRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/first-preview-assets/')) {
        protectedAssetRequests.push(request.url());
      }
    });
    const response = await page.goto(`${productionServer!.baseURL}/design/preview/${PUBLIC_REFERENCE}`);

    expect(response).not.toBeNull();
    expect(response!.status()).not.toBe(500);
    await expect(page.getByRole('heading', { name: 'First Preview is unavailable' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'We cannot display this First Preview' })).toHaveCount(0);
    expect(protectedAssetRequests).toEqual([]);
  });

  test('existing malformed single segments and empty Preview forms stay denied while unrelated routes are unaffected', async ({
    page,
  }) => {
    const canonicalDenied = await expectProductionDenied(page, productionServer!, DENIED_ROUTE);

    for (const malformedPath of [
      '/design/preview',
      '/design/preview/novora-cb-20260729-a72d',
      '/design/preview/NOVORA-XX-20260729-A72D',
      '/design/preview/NOVORA-CB-20260729-A72D%2FEXTRA',
      '/design/preview/%20NOVORA-CB-20260729-A72D',
    ]) {
      const malformed = await expectProductionDenied(page, productionServer!, malformedPath);
      expect(malformed.customerPresentation).toBe(canonicalDenied.customerPresentation);
    }

    for (const unaffectedPath of ['/design/submitted', '/design/start']) {
      const response = await page.goto(`${productionServer!.baseURL}${unaffectedPath}`);
      expect(response).not.toBeNull();
      expect(response!.status()).not.toBe(500);
      await expect(page.getByRole('heading', { name: 'We cannot display this First Preview' })).toHaveCount(0);
    }
  });
});
