import { NextResponse } from "next/server";

import { initiateCommercialPayment } from "../../../../lib/server/commercial-payment";

export const dynamic = "force-dynamic";

type RouteContext = Readonly<{
  params: Promise<{ public_reference: string }>;
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
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return response({ ok: false, message: "The payment request is invalid." }, 400);
  }

  const { public_reference: publicReference } = await context.params;
  const previewUrl = new URL(
    `/design/preview/${encodeURIComponent(publicReference)}`,
    request.url,
  );
  const successUrl = new URL(previewUrl);
  successUrl.searchParams.set("payment", "returned");
  const cancelUrl = new URL(previewUrl);
  cancelUrl.searchParams.set("payment", "cancelled");

  const result = await initiateCommercialPayment(
    publicReference,
    body,
    { successUrl: successUrl.toString(), cancelUrl: cancelUrl.toString() },
  );
  if (result.ok === false) {
    const status = result.reason === "invalid"
      ? 400
      : result.reason === "denied"
        ? 403
        : result.reason === "stale_quotation"
          ? 409
          : 503;
    return response(
      {
        ok: false,
        reason: result.reason,
        message: result.reason === "stale_quotation"
          ? "The quotation changed. Please review the current quotation before continuing."
          : result.reason === "unavailable"
            ? "Secure payment is not available yet."
            : "The payment request could not be accepted.",
      },
      status,
    );
  }

  return response({ ok: true, payment: result.payment }, 200);
}
