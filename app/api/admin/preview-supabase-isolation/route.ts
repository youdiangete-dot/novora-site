import "server-only";

import { cookies } from "next/headers";

import {
  ADMIN_ACCESS_COOKIE_NAME,
  isValidAdminAccessCookie,
} from "../../../../lib/server/admin-access";
import { createSupabaseAdminClientOrNull } from "../../../../lib/server/supabase";
import { logRequestPreviewIsolationAttestationOnce } from "../../../../lib/server/preview-isolation-attestation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const ISOLATED_ORIGIN = "https://dibpksbbzjczpjusujwk.supabase.co";
const PREVIEW_BRANCH = "integration/instant-first-preview-agent";

function result(isolatedBackendVerified: boolean, status: number): Response {
  return Response.json(
    { isolatedBackendVerified },
    {
      status,
      headers: {
        "Cache-Control": "private, no-store",
        "CDN-Cache-Control": "no-store",
        "Vercel-CDN-Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

// Match the existing client's dynamic environment lookup and normalization.
function effectiveSupabaseUrl(name: string): string | undefined {
  return process.env[name]?.trim();
}

export async function GET(): Promise<Response> {
  if (
    process.env.VERCEL_ENV !== "preview" ||
    process.env.VERCEL_GIT_COMMIT_REF !== PREVIEW_BRANCH
  ) {
    return result(false, 404);
  }

  try {
    const cookieStore = await cookies();
    if (!isValidAdminAccessCookie(cookieStore.get(ADMIN_ACCESS_COOKIE_NAME)?.value)) {
      logRequestPreviewIsolationAttestationOnce();
      return result(false, 401);
    }

    // No client construction or database request before every access/isolation guard.
    if (effectiveSupabaseUrl("NEXT_PUBLIC_SUPABASE_URL") !== ISOLATED_ORIGIN) {
      return result(false, 503);
    }

    const supabase = createSupabaseAdminClientOrNull();
    if (!supabase) {
      return result(false, 503);
    }

    // HEAD with limit zero proves credential acceptance without retrieving records
    // or requesting counts. There is no caller-selected backend or table.
    const proof = await supabase
      .from("concept_briefs")
      .select("id", { head: true })
      .limit(0)
      .retry(false)
      .abortSignal(AbortSignal.timeout(5_000));

    if (
      proof.status !== 200 ||
      proof.error !== null ||
      proof.data !== null ||
      proof.count !== null
    ) {
      return result(false, 503);
    }

    return result(true, 200);
  } catch {
    return result(false, 503);
  }
}
