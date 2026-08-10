import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { isAiSketchReviewStatus } from "../../../../lib/ai-sketch-review-status";
import {
  ADMIN_ACCESS_COOKIE_NAME,
  isValidAdminAccessCookie,
} from "../../../../lib/server/admin-access";
import { isValidFirstPreviewAssetUuid } from "../../../../lib/server/ai-sketch/first-preview-generated-assets-contract";
import {
  normalizeAdminAiSketchRevisionInstruction,
  updateAdminAiSketchReview,
} from "../../../../lib/server/admin-ai-sketch-review-write";

type AdminAiSketchReviewRequestBody = {
  conceptBriefId?: unknown;
  aiSketchOutputId?: unknown;
  reviewStatus?: unknown;
  revisionInstruction?: unknown;
};

const allowedBodyKeys = new Set([
  "conceptBriefId",
  "aiSketchOutputId",
  "reviewStatus",
  "revisionInstruction",
]);

export const dynamic = "force-dynamic";

function isObjectBody(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyAllowedBodyKeys(body: Record<string, unknown>): boolean {
  return Object.keys(body).every((key) => allowedBodyKeys.has(key));
}

function getFailureStatus(reason: string): number {
  if (reason === "output-mismatch" || reason === "linkage-conflict") {
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

  const conceptBriefId = typeof body.conceptBriefId === "string" ? body.conceptBriefId.trim() : "";
  const aiSketchOutputId =
    typeof body.aiSketchOutputId === "string" ? body.aiSketchOutputId.trim() : "";
  const reviewStatus =
    typeof body.reviewStatus === "string" && isAiSketchReviewStatus(body.reviewStatus)
      ? body.reviewStatus
      : null;
  const revisionInstruction = reviewStatus
    ? normalizeAdminAiSketchRevisionInstruction(reviewStatus, body.revisionInstruction)
    : undefined;

  if (
    !isValidFirstPreviewAssetUuid(conceptBriefId) ||
    !isValidFirstPreviewAssetUuid(aiSketchOutputId) ||
    !reviewStatus ||
    revisionInstruction === undefined
  ) {
    return NextResponse.json(
      {
        ok: false,
        message: "AI sketch review state could not be saved.",
      },
      { status: 400 },
    );
  }

  const result = await updateAdminAiSketchReview(
    conceptBriefId,
    aiSketchOutputId,
    reviewStatus,
    revisionInstruction,
  );

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
      aiSketchOutputId: result.aiSketchOutputId,
      revisionInstruction: result.revisionInstruction,
    },
  });
}
