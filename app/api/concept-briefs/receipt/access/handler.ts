import { NextResponse } from "next/server";
import { authenticateScopedReceiptRequest } from "../../../../../lib/server/ai-sketch/beta-admission";
import { isClientRequestId, readScopedReceipt } from "../../../../../lib/server/ai-sketch/m2-scoped-receipt";
import { attachFirstPreviewCustomerSessionCookie, type FirstPreviewSessionRouteDependencies } from "../../../../../lib/server/ai-sketch/instant-first-preview-feature-flag";
import { FIRST_PREVIEW_CUSTOMER_ACCESS_COOKIE_NAME } from "../../../../../lib/server/ai-sketch/first-preview-customer-access-contract";

// Explicit reauthentication, not the diagnostic GET and not submission replay.
// Current invitation authority + exact durable owned receipt are required before
// using the existing bounded customer-session issuer. No Queue/Provider write.
export function createReceiptAccessPostHandler(dependencies: Readonly<{
  authenticate?: typeof authenticateScopedReceiptRequest;
  read?: typeof readScopedReceipt;
  session?: FirstPreviewSessionRouteDependencies;
}> = {}) {
  return async function POST(request: Request) {
    const unavailable = () => NextResponse.json({ status: "unavailable" }, { status: 404, headers: { "Cache-Control": "no-store" } });
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) return unavailable();
    const scope = (dependencies.authenticate ?? authenticateScopedReceiptRequest)(request);
    if (!scope) return unavailable();
    let body: unknown;
    if (Number(request.headers.get("content-length")) > 1024) return unavailable();
    try {
      const raw = await request.text();
      if (raw.length > 1024) return unavailable();
      body = JSON.parse(raw);
    } catch { return unavailable(); }
    if (!body || typeof body !== "object" || Array.isArray(body) ||
      Object.keys(body).join(",") !== "clientRequestId" ||
      !isClientRequestId((body as Record<string, unknown>).clientRequestId)) return unavailable();
    const receipt = await (dependencies.read ?? readScopedReceipt)(scope, (body as { clientRequestId: string }).clientRequestId);
    if (!receipt) return unavailable();
    const response = attachFirstPreviewCustomerSessionCookie(NextResponse.json({
      ok: true, persisted: true, conceptBriefId: receipt.briefId,
      publicReference: receipt.reference, receiptStage: receipt.stage,
    }, { headers: { "Cache-Control": "no-store" } }), {
      persisted: true, conceptBriefId: receipt.briefId, publicReference: receipt.reference,
    }, dependencies.session);
    return response.cookies.get(FIRST_PREVIEW_CUSTOMER_ACCESS_COOKIE_NAME)?.value ? response : unavailable();
  };
}
