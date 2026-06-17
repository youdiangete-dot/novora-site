import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { isAiSketchReviewStatus } from "../../../../lib/ai-sketch-review-status";
import {
  ADMIN_ACCESS_COOKIE_NAME,
  isValidAdminAccessCookie,
} from "../../../../lib/server/admin-access";
import {
  type AdminAiSketchReviewWriteMode,
  createAdminAiSketchReview,
  updateAdminAiSketchReview,
} from "../../../../lib/server/admin-ai-sketch-review-write";

type AdminAiSketchReviewRequestBody = {
  mode?: unknown;
  conceptBriefId?: unknown;
  reviewStatus?: unknown;
};

const allowedBodyKeys = new Set(["mode", "conceptBriefId", "reviewStatus"]);

export const dynamic = "force-dynamic";

function isObjectBody(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyAllowedBodyKeys(body: Record<string, unknown>): boolean {
  return Object.keys(body).every((key) => allowedBodyKeys.has(key));
}

function isWriteMode(value: unknown): value is AdminAiSketchReviewWriteMode {
  return value === "create" || value === "update";
}

function getFailureStatus(reason: string): number {
  if (reason === "already-exists") {
    return 409;
  }

  if (reason === "missing-row") {
    return 404;
  }

  if (reason === "invalid-input") {
    return 400;
  }

  return 503;
}

export async function POST(request: Request) {
  const cookieStore = await cookies();

  if (!isValidAdminAccessCookie(cookieStore.get(ADMIN_ACCESS_COOKIE_NAME)?.value)) {
    return NextResponse.json(
      {
        ok: false,
        message: "Admin access is required before AI sketch review state can be saved.",
      },
      { status: 401 },
    );
  }

  let body: AdminAiSketchReviewRequestBody;

  try {
    const parsedBody = (await request.json()) as unknown;

    if (!isObjectBody(parsedBody) || !hasOnlyAllowedBodyKeys(parsedBody)) {
      return NextResponse.json(
        {
          ok: false,
          message: "AI sketch review state could not be saved.",
        },
        { status: 400 },
      );
    }

    body = parsedBody;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "AI sketch review state could not be saved.",
      },
      { status: 400 },
    );
  }

  const mode = body.mode;
  const conceptBriefId = typeof body.conceptBriefId === "string" ? body.conceptBriefId.trim() : "";
  const reviewStatus =
    typeof body.reviewStatus === "string" && isAiSketchReviewStatus(body.reviewStatus)
      ? body.reviewStatus
      : null;

  if (!isWriteMode(mode) || !conceptBriefId || !reviewStatus) {
    return NextResponse.json(
      {
        ok: false,
        message: "AI sketch review state could not be saved.",
      },
      { status: 400 },
    );
  }

  const result =
    mode === "create"
      ? await createAdminAiSketchReview(conceptBriefId, reviewStatus)
      : await updateAdminAiSketchReview(conceptBriefId, reviewStatus);

  if (result.ok === false) {
    return NextResponse.json(
      {
        ok: false,
        message: result.message,
      },
      { status: getFailureStatus(result.reason) },
    );
  }

  return NextResponse.json({
    ok: true,
    state: {
      hasPersistedReview: true,
      reviewStatus: result.reviewStatus,
    },
  });
}
