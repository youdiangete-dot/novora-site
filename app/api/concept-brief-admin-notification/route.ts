import { NextResponse } from "next/server";

import { sendAdminConceptBriefNotification } from "../../../lib/server/admin-email-notifications";

export const dynamic = "force-dynamic";

type AdminNotificationRequestBody = {
  conceptBriefId?: unknown;
  publicReference?: unknown;
};

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getRequestOrigin(request: Request): string {
  return new URL(request.url).origin;
}

export async function POST(request: Request) {
  let body: AdminNotificationRequestBody | null;

  try {
    body = (await request.json()) as AdminNotificationRequestBody;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        notified: false,
        skipped: true,
        message: "Admin notification request could not be processed.",
      },
      { status: 400 },
    );
  }

  const conceptBriefId = readString(body?.conceptBriefId);
  const publicReference = readString(body?.publicReference);

  if (!conceptBriefId || !publicReference) {
    return NextResponse.json(
      {
        ok: false,
        notified: false,
        skipped: true,
        message: "Admin notification request is missing concept brief identifiers.",
      },
      { status: 400 },
    );
  }

  const adminDetailUrl = new URL(
    `/admin/briefs/${encodeURIComponent(publicReference)}`,
    getRequestOrigin(request),
  ).toString();
  const result = await sendAdminConceptBriefNotification({
    conceptBriefId,
    publicReference,
    adminDetailUrl,
  });

  return NextResponse.json(
    {
      ok: true,
      notified: result.notified,
      skipped: result.skipped,
      message: result.notified
        ? "Admin notification accepted."
        : "Admin notification was not sent, but the concept brief submission can continue.",
    },
    { status: result.notified ? 200 : 202 },
  );
}
