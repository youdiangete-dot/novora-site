import { getPreviewIsolationProof } from "../../../../lib/server/preview-isolation-proof";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  return getPreviewIsolationProof(request);
}
