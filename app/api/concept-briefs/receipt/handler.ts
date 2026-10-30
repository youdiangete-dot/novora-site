import { NextResponse } from "next/server";
import { authenticateM2ReceiptRequest } from "../../../../lib/server/ai-sketch/beta-admission";
import { isClientRequestId, readScopedReceipt } from "../../../../lib/server/ai-sketch/m2-scoped-receipt";

// A nonsecret ID alone is never authority; this route issues no customer cookie.
export function createReceiptGetHandler(dependencies: Readonly<{ authenticate?: typeof authenticateM2ReceiptRequest; read?: typeof readScopedReceipt }> = {}) {
 return async function GET(request: Request) {
  const scope = (dependencies.authenticate ?? authenticateM2ReceiptRequest)(request);
  const id = new URL(request.url).searchParams.get("id");
  if (!scope || !isClientRequestId(id)) return NextResponse.json({ status: "unavailable" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  const receipt = await (dependencies.read ?? readScopedReceipt)(scope, id);
  if (!receipt) return NextResponse.json({ status: "unavailable" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ status: receipt.stage, reason: receipt.reason, publicReference: receipt.reference, conceptBriefId: receipt.briefId }, { headers: { "Cache-Control": "no-store" } });
 };
}
