import { NextResponse } from "next/server";

import { persistCommercialSpecificationConfirmation } from "../../../../lib/server/commercial-specification-confirmation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ public_reference: string }> };

export async function POST(request: Request, context: RouteContext) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Please provide a valid specification confirmation request." },
      { status: 400 },
    );
  }

  const { public_reference: publicReference } = await context.params;
  const result = await persistCommercialSpecificationConfirmation(
    publicReference,
    body,
  );
  if (result.ok === false) {
    if (result.reason === "invalid") {
      return NextResponse.json(
        { ok: false, message: "This specification confirmation request is invalid." },
        { status: 400 },
      );
    }
    if (result.reason === "denied") {
      return NextResponse.json(
        { ok: false, message: "These specifications cannot be confirmed from this access link." },
        { status: 403 },
      );
    }
    if (result.reason === "design_unconfirmed") {
      return NextResponse.json(
        { ok: false, message: "Confirm this exact design direction before confirming its specifications." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { ok: false, message: "These specifications are no longer available for confirmation." },
      { status: 409 },
    );
  }

  const alreadyConfirmed = result.status === "already_confirmed";
  return NextResponse.json(
    {
      ok: true,
      alreadyConfirmed,
      message: alreadyConfirmed
        ? "These specifications were already confirmed as the quotation basis."
        : "Specifications confirmed as the quotation basis.",
    },
    { status: alreadyConfirmed ? 200 : 201 },
  );
}
