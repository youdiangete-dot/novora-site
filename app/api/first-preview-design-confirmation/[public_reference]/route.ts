import { NextResponse } from "next/server";

import { persistFirstPreviewCustomerDesignConfirmation } from "../../../../lib/server/ai-sketch/first-preview-customer-design-confirmation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ public_reference: string }> };

export async function POST(request: Request, context: RouteContext) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Please provide a valid confirmation request." },
      { status: 400 },
    );
  }

  const { public_reference: publicReference } = await context.params;
  const result = await persistFirstPreviewCustomerDesignConfirmation(
    publicReference,
    body,
  );
  if (result.ok === false) {
    if (result.reason === "invalid") {
      return NextResponse.json(
        { ok: false, message: "This confirmation request is invalid." },
        { status: 400 },
      );
    }
    if (result.reason === "denied") {
      return NextResponse.json(
        {
          ok: false,
          message:
            "This First Preview cannot be confirmed from this access link.",
        },
        { status: 403 },
      );
    }
    return NextResponse.json(
      {
        ok: false,
        message:
          "The displayed First Preview is no longer available for confirmation.",
      },
      { status: 409 },
    );
  }

  const alreadyConfirmed = result.status === "already_confirmed";
  return NextResponse.json(
    {
      ok: true,
      alreadyConfirmed,
      message: alreadyConfirmed
        ? "This design direction was already confirmed."
        : "Design direction confirmed.",
    },
    { status: alreadyConfirmed ? 200 : 201 },
  );
}
