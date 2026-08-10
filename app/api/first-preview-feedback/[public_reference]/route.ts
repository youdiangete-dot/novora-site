import { NextResponse } from "next/server";

import { persistFirstPreviewCustomerFeedback } from "../../../../lib/server/ai-sketch/first-preview-customer-feedback";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ public_reference: string }> };

export async function POST(request: Request, context: RouteContext) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Please provide valid feedback." }, { status: 400 });
  }

  const { public_reference: publicReference } = await context.params;
  const result = await persistFirstPreviewCustomerFeedback(publicReference, body);
  if (result.ok === false) {
    if (result.reason === "invalid") {
      return NextResponse.json({ ok: false, message: "Please provide feedback between 1 and 2000 characters." }, { status: 400 });
    }
    if (result.reason === "duplicate") {
      return NextResponse.json({ ok: false, message: "Feedback has already been received for this First Preview." }, { status: 409 });
    }
    if (result.reason === "denied") {
      return NextResponse.json({ ok: false, message: "This First Preview cannot accept feedback from this access link." }, { status: 403 });
    }
    return NextResponse.json({ ok: false, message: "Feedback could not be saved for the current First Preview." }, { status: 409 });
  }
  return NextResponse.json({ ok: true, message: "Feedback received for this First Preview." }, { status: 201 });
}
