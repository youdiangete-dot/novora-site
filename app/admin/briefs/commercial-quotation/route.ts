import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  ADMIN_ACCESS_COOKIE_NAME,
  isValidAdminAccessCookie,
} from "../../../../lib/server/admin-access";
import {
  issueCommercialQuotation,
  readAdminCommercialQuotation,
} from "../../../../lib/server/commercial-quotation";

export const dynamic = "force-dynamic";

function response(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      Vary: "Cookie",
    },
  });
}

async function hasAdminAccess() {
  const cookieStore = await cookies();
  return isValidAdminAccessCookie(
    cookieStore.get(ADMIN_ACCESS_COOKIE_NAME)?.value,
  );
}

function failureMessage(reason: string) {
  if (reason === "invalid") return "The quotation request is invalid.";
  if (reason === "journey_unavailable") {
    return "No exact current First Preview is available for this Concept Brief.";
  }
  if (reason === "specification_unconfirmed") {
    return "The customer must confirm the latest exact specification before a quotation can be issued.";
  }
  return "Quotation data is temporarily unavailable.";
}

export async function GET(request: Request) {
  if (!(await hasAdminAccess())) {
    return response({ ok: false, message: "Admin access is required." }, 401);
  }
  try {
    const url = new URL(request.url);
    const keys = [...url.searchParams.keys()];
    if (
      keys.length !== 1 ||
      keys[0] !== "conceptBriefId" ||
      url.searchParams.getAll("conceptBriefId").length !== 1
    ) {
      return response({ ok: false, message: "The quotation request is invalid." }, 400);
    }
    const result = await readAdminCommercialQuotation(
      url.searchParams.get("conceptBriefId"),
    );
    if (result.ok === false) {
      const status = result.reason === "invalid"
        ? 400
        : result.reason === "unavailable"
          ? 503
          : 409;
      return response(
        { ok: false, reason: result.reason, message: failureMessage(result.reason) },
        status,
      );
    }
    return response({ ok: true, quotation: result.quotation }, 200);
  } catch {
    return response({ ok: false, message: "Quotation data is temporarily unavailable." }, 503);
  }
}

export async function POST(request: Request) {
  if (!(await hasAdminAccess())) {
    return response({ ok: false, message: "Admin access is required." }, 401);
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return response({ ok: false, message: "The quotation request is invalid." }, 400);
  }
  const result = await issueCommercialQuotation(body);
  if (result.ok === false) {
    const status = result.reason === "invalid"
      ? 400
      : result.reason === "unavailable"
        ? 503
        : 409;
    return response(
      { ok: false, reason: result.reason, message: failureMessage(result.reason) },
      status,
    );
  }
  return response(
    {
      ok: true,
      alreadyIssued: result.status === "already_issued",
      quotation: result.quotation,
      message: result.status === "already_issued"
        ? "This exact quotation was already issued."
        : "Quotation issued against the latest confirmed specification.",
    },
    result.status === "already_issued" ? 200 : 201,
  );
}

function methodNotAllowed() {
  return response({ ok: false, message: "Method not allowed." }, 405);
}

export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
