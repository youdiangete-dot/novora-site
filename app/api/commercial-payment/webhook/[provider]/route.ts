import { NextResponse } from "next/server";

import { handleCommercialPaymentWebhook } from "../../../../../lib/server/commercial-payment";

export const dynamic = "force-dynamic";

type RouteContext = Readonly<{
  params: Promise<{ provider: string }>;
}>;

function response(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}

export async function POST(request: Request, context: RouteContext) {
  const { provider } = await context.params;
  let rawBody: Uint8Array;
  try {
    rawBody = new Uint8Array(await request.arrayBuffer());
  } catch {
    return response({ ok: false }, 400);
  }

  const result = await handleCommercialPaymentWebhook(
    provider,
    rawBody,
    request.headers,
  );
  if (result.ok === false) {
    const status = result.reason === "unknown_provider"
      ? 404
      : result.reason === "invalid" || result.reason === "rejected"
        ? 400
        : 503;
    return response({ ok: false }, status);
  }
  return response(
    { ok: true, duplicate: result.duplicate, status: result.status },
    200,
  );
}
