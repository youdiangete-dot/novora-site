import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  ADMIN_ACCESS_COOKIE_NAME,
  isValidAdminAccessCookie,
} from "../../../../../lib/server/admin-access";
import { createAdminReferenceAssetSignedUrl } from "../../../../../lib/server/concept-brief-reference-assets";

type AdminReferenceAssetRouteProps = {
  params: Promise<{
    assetId: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: AdminReferenceAssetRouteProps) {
  const cookieStore = await cookies();

  if (!isValidAdminAccessCookie(cookieStore.get(ADMIN_ACCESS_COOKIE_NAME)?.value)) {
    return NextResponse.json(
      {
        ok: false,
        message: "Admin access is required before reference assets can be opened.",
      },
      { status: 401 },
    );
  }

  const { assetId } = await params;
  const result = await createAdminReferenceAssetSignedUrl(assetId.trim());

  if (result.ok === false) {
    return NextResponse.json(
      {
        ok: false,
        message: result.message,
      },
      { status: result.status },
    );
  }

  return NextResponse.redirect(result.signedUrl, 302);
}
