import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const PREVIEW_ROUTE_PREFIX = '/design/preview/';
const DENIED_REFERENCE_SENTINEL = 'NOVORA-CB-DENIED';
const DENIED_ROUTE = `${PREVIEW_ROUTE_PREFIX}${DENIED_REFERENCE_SENTINEL}`;
const VALID_PUBLIC_REFERENCE_PATTERN = /^NOVORA-CB-\d{8}-[A-Z0-9]{4}$/;
const MALFORMED_PERCENT_PATTERN = /%(?![0-9A-Fa-f]{2})/;

function deniedRewrite(request: NextRequest) {
  const deniedUrl = request.nextUrl.clone();
  deniedUrl.pathname = DENIED_ROUTE;
  deniedUrl.search = '';

  return NextResponse.rewrite(deniedUrl);
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname === DENIED_ROUTE) {
    return request.nextUrl.search ? deniedRewrite(request) : NextResponse.next();
  }

  const rawSegment = pathname.startsWith(PREVIEW_ROUTE_PREFIX)
    ? pathname.slice(PREVIEW_ROUTE_PREFIX.length)
    : '';
  const hasAdditionalSegment = rawSegment.includes('/');
  const hasMalformedPercentEncoding = MALFORMED_PERCENT_PATTERN.test(rawSegment);
  const hasEncodedInput = rawSegment.includes('%');
  const isExactValidRoute =
    !hasAdditionalSegment &&
    !hasMalformedPercentEncoding &&
    !hasEncodedInput &&
    VALID_PUBLIC_REFERENCE_PATTERN.test(rawSegment);

  return isExactValidRoute ? NextResponse.next() : deniedRewrite(request);
}

export const config = {
  matcher: '/design/preview/:path*',
};
