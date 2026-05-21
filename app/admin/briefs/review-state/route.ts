import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  ADMIN_ACCESS_COOKIE_NAME,
  isValidAdminAccessCookie,
} from "../../../../lib/server/admin-access";
import {
  isAdminReviewStatusSlug,
  saveAdminReviewState,
} from "../../../../lib/server/admin-review-state";

type AdminReviewStateRequestBody = {
  conceptBriefId?: unknown;
  reviewStatus?: unknown;
  internalNotes?: unknown;
};

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const cookieStore = await cookies();

  if (!isValidAdminAccessCookie(cookieStore.get(ADMIN_ACCESS_COOKIE_NAME)?.value)) {
    return NextResponse.json(
      {
        ok: false,
        message: "Admin access is required before review state can be saved.",
      },
      { status: 401 },
    );
  }

  let body: AdminReviewStateRequestBody;

  try {
    body = (await request.json()) as AdminReviewStateRequestBody;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "Admin review state could not be saved.",
      },
      { status: 400 },
    );
  }

  const conceptBriefId = typeof body.conceptBriefId === "string" ? body.conceptBriefId.trim() : "";
  const reviewStatus = body.reviewStatus;
  const internalNotes = typeof body.internalNotes === "string" ? body.internalNotes : "";

  if (!conceptBriefId || !isAdminReviewStatusSlug(reviewStatus)) {
    return NextResponse.json(
      {
        ok: false,
        message: "Admin review state could not be saved.",
      },
      { status: 400 },
    );
  }

  const result = await saveAdminReviewState(conceptBriefId, reviewStatus, internalNotes);

  if (result.ok === false) {
    return NextResponse.json(
      {
        ok: false,
        message: result.message,
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    ok: true,
    state: result.state,
  });
}
