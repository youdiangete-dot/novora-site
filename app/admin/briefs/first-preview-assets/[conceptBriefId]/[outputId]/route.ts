import { cookies } from "next/headers";

import {
  ADMIN_ACCESS_COOKIE_NAME,
  isValidAdminAccessCookie,
} from "../../../../../../lib/server/admin-access";
import { readAdminFirstPreviewAsset } from "../../../../../../lib/server/admin-first-preview";

type AdminFirstPreviewAssetRouteProps = {
  params: Promise<{
    conceptBriefId: string;
    outputId: string;
  }>;
};

export const dynamic = "force-dynamic";

function emptyResponse(status: 401 | 404 | 405): Response {
  return new Response(null, {
    status,
    headers: {
      "Content-Length": "0",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(
  request: Request,
  { params }: AdminFirstPreviewAssetRouteProps,
) {
  const cookieStore = await cookies();

  if (!isValidAdminAccessCookie(cookieStore.get(ADMIN_ACCESS_COOKIE_NAME)?.value)) {
    return emptyResponse(401);
  }

  try {
    const url = new URL(request.url);

    if (url.search) {
      return emptyResponse(404);
    }

    const { conceptBriefId, outputId } = await params;
    const result = await readAdminFirstPreviewAsset(conceptBriefId, outputId);

    if (!result.ok) {
      return emptyResponse(404);
    }

    return new Response(Buffer.from(result.body), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Length": String(result.contentLength),
        "Content-Disposition": 'inline; filename="novora-admin-first-preview.png"',
        "Cache-Control": result.cacheControl,
        "X-Content-Type-Options": "nosniff",
        "Cross-Origin-Resource-Policy": "same-origin",
        "Referrer-Policy": "no-referrer",
        Vary: "Cookie",
      },
    });
  } catch {
    return emptyResponse(404);
  }
}

export function HEAD() {
  return emptyResponse(405);
}

export const POST = HEAD;
export const PUT = HEAD;
export const PATCH = HEAD;
export const DELETE = HEAD;
export const OPTIONS = HEAD;
