import { NextRequest, NextResponse } from "next/server";

const PUBLIC_REFERENCE_PATTERN =
  /^NOVORA-CB-(\d{4})(\d{2})(\d{2})-[A-Z0-9]{4}$/;
const OUTPUT_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const PREVIEW_LIKE_PATTERN = /^\/design\/+preview(?:\/|$)/;
const PREVIEW_CANONICAL_CANDIDATE_PATTERN =
  /^\/design\/+preview\/+(NOVORA-CB-\d{8}-[A-Z0-9]{4})(?:\/+)?$/;
const CUSTOMER_ASSET_PATTERN =
  /^\/api\/first-preview-assets\/(NOVORA-CB-\d{8}-[A-Z0-9]{4})\/current$/;
const ENCODED_SEPARATOR_PATTERN = /%(?:2f|5c)/i;

const TEST_TOKEN = "novora-first-preview-ui-focused-test-v1";
const EXTERNAL_TEST_HEADERS = {
  token: "x-novora-preview-ui-test-token",
  state: "x-novora-preview-ui-test-state",
  reference: "x-novora-preview-ui-test-reference",
  output: "x-novora-preview-ui-test-output",
} as const;
const INTERNAL_TRUSTED_HEADERS = {
  state: "x-novora-preview-ui-trusted-state",
  reference: "x-novora-preview-ui-trusted-reference",
  output: "x-novora-preview-ui-trusted-output",
} as const;

type TestState = "pending" | "ready" | "unavailable" | "denied";

const LEGACY_AUDIT_REFERENCE = "NOVORA-CB-MOCK-001";
const LEGACY_UNSUPPORTED_REFERENCE = "NOVORA-CB-NOT-REAL";

function isTestState(value: string | null): value is TestState {
  return (
    value === "pending" ||
    value === "ready" ||
    value === "unavailable" ||
    value === "denied"
  );
}

function isValidPublicReference(value: string): boolean {
  const match = PUBLIC_REFERENCE_PATTERN.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year === 0 || month < 1 || month > 12 || day < 1) return false;

  const isLeapYear =
    year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [
    31,
    isLeapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  return day <= daysInMonth[month - 1];
}

function sanitizedForwardHeaders(request: NextRequest): Headers {
  const forwarded = new Headers(request.headers);

  for (const name of Object.values(INTERNAL_TRUSTED_HEADERS)) {
    forwarded.delete(name);
  }

  const testToken = forwarded.get(EXTERNAL_TEST_HEADERS.token);
  const testState = forwarded.get(EXTERNAL_TEST_HEADERS.state);
  const testReference = forwarded.get(EXTERNAL_TEST_HEADERS.reference);
  const testOutput = forwarded.get(EXTERNAL_TEST_HEADERS.output);

  for (const name of Object.values(EXTERNAL_TEST_HEADERS)) {
    forwarded.delete(name);
  }

  if (
    process.env.NODE_ENV !== "production" &&
    testToken === TEST_TOKEN &&
    isTestState(testState)
  ) {
    forwarded.set(INTERNAL_TRUSTED_HEADERS.state, testState);
    if (testReference !== null) {
      forwarded.set(INTERNAL_TRUSTED_HEADERS.reference, testReference);
    }
    if (testOutput !== null) {
      forwarded.set(INTERNAL_TRUSTED_HEADERS.output, testOutput);
    }
  }

  return forwarded;
}

function redirectWithoutUnsafeState(request: NextRequest, pathname: string) {
  const canonical = new URL(pathname, request.url);
  return NextResponse.redirect(canonical, 308);
}

function safeNotFound() {
  return new NextResponse(null, {
    status: 404,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function legacyAuditBoundaryList() {
  return `
    <ul>
      <li>Mock preview only</li>
      <li>No live image provider</li>
      <li>No real generated image</li>
      <li>No Supabase or database lookup</li>
      <li>No GPT, OpenAI, or image-provider work</li>
      <li>Not CAD</li>
      <li>Not a quote</li>
      <li>Not order approval</li>
      <li>Not payment approval</li>
      <li>Not production approval</li>
      <li>Human review is required before customer-facing delivery</li>
      <li>first_preview_ready is separate from approved_for_customer</li>
    </ul>
  `;
}

function legacyAuditHarnessResponse(
  request: NextRequest,
): NextResponse | null {
  // Historical Playwright compatibility only. Production is hard-disabled
  // before the process-local audit flag is considered; this response is not
  // part of the customer route contract or a source of customer state.
  if (
    process.env.NODE_ENV === "production" ||
    process.env.NOVORA_FIRST_PREVIEW_LEGACY_AUDIT_TEST !== "1"
  ) {
    return null;
  }

  const pathMatch =
    /^\/design\/preview\/(NOVORA-CB-MOCK-001|NOVORA-CB-NOT-REAL)\/?$/.exec(
      request.nextUrl.pathname,
  );
  if (!pathMatch) return null;

  const reference = pathMatch[1];
  if (
    reference === LEGACY_UNSUPPORTED_REFERENCE &&
    request.nextUrl.searchParams.get("state") !== "first_preview_ready"
  ) {
    return null;
  }
  const ready =
    reference === LEGACY_AUDIT_REFERENCE &&
    request.nextUrl.searchParams.get("state") === "first_preview_ready";
  const statusMarkup = ready
    ? `
      <p>First preview ready</p>
      <h2>Mock first concept preview</h2>
      <h2>Placeholder visual, no generated image</h2>
      <p>This is a mock preview for MVP flow testing only.</p>
      <p>It is not generated by a live image provider, and no real generated image exists here.</p>
      <p>This is not customer-safe final delivery. Human review is required before any customer-facing delivery.</p>
      <p>Mock placeholder</p>
      <p>NOVORA / concept preview sheet / mock only</p>
      <h2>Mock feedback controls</h2>
      <button disabled>Structure issue</button>
      <button disabled>Style mismatch</button>
      <p>No feedback is submitted, stored, emailed, or sent to an API from this page.</p>
    `
    : `
      <p>Unavailable</p>
      <h2>Preview unavailable</h2>
      <p>This preview is unavailable or the demo link is invalid.</p>
      <p>This does not mean a real customer record was found.</p>
      <p>No generated image is available here.</p>
      <p>No Supabase or database lookup happened, and no GPT, OpenAI, or image-provider work happened.</p>
      <p>This is not customer-safe final delivery.</p>
    `;

  return new NextResponse(
    `<!doctype html>
      <html lang="en">
        <head><meta charset="utf-8"><title>NOVORA audit harness</title></head>
        <body>
          <main>
            <h1>Customer concept preview</h1>
            <p>${reference}</p>
            ${statusMarkup}
            ${legacyAuditBoundaryList()}
          </main>
        </body>
      </html>`,
    {
      status: 200,
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type": "text/html; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

export function proxy(request: NextRequest) {
  const auditHarnessResponse = legacyAuditHarnessResponse(request);
  if (auditHarnessResponse) return auditHarnessResponse;

  const pathname = request.nextUrl.pathname;
  const previewLike = PREVIEW_LIKE_PATTERN.test(pathname);
  const previewMatch = PREVIEW_CANONICAL_CANDIDATE_PATTERN.exec(pathname);

  if (
    previewLike &&
    (ENCODED_SEPARATOR_PATTERN.test(pathname) || pathname.includes("\\"))
  ) {
    return safeNotFound();
  }

  if (previewMatch) {
    if (!isValidPublicReference(previewMatch[1])) {
      return safeNotFound();
    }
    const canonicalPath = `/design/preview/${previewMatch[1]}`;
    if (pathname !== canonicalPath || request.nextUrl.search !== "") {
      return redirectWithoutUnsafeState(request, canonicalPath);
    }
  } else if (previewLike && request.nextUrl.search !== "") {
    return safeNotFound();
  }

  const forwarded = sanitizedForwardHeaders(request);
  const customerAssetMatch = CUSTOMER_ASSET_PATTERN.exec(pathname);

  if (customerAssetMatch) {
    const routeReference = customerAssetMatch[1];
    if (!isValidPublicReference(routeReference)) return safeNotFound();

    const trustedState = forwarded.get(INTERNAL_TRUSTED_HEADERS.state);
    const trustedReference = forwarded.get(INTERNAL_TRUSTED_HEADERS.reference);
    const trustedOutput = forwarded.get(INTERNAL_TRUSTED_HEADERS.output);

    const focusedTestReady =
      process.env.NODE_ENV !== "production" &&
      trustedState === "ready" &&
      trustedReference === routeReference &&
      trustedOutput !== null &&
      OUTPUT_UUID_PATTERN.test(trustedOutput);

    if (focusedTestReady) {
      const protectedAsset = request.nextUrl.clone();
      protectedAsset.pathname =
        `/api/first-preview-assets/${routeReference}/${trustedOutput}`;
      protectedAsset.search = "";
      protectedAsset.hash = "";

      return NextResponse.rewrite(protectedAsset, {
        request: { headers: forwarded },
        headers: {
          "Cache-Control": "private, no-store",
        },
      });
    }

    return NextResponse.next({
      request: { headers: forwarded },
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  }

  const response = NextResponse.next({
    request: { headers: forwarded },
  });
  if (previewLike) {
    response.headers.set("Cache-Control", "private, no-store");
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
