import { NextResponse } from "next/server";
import { authenticateScopedReceiptRequest, betaAdmissionMode } from "../../../lib/server/ai-sketch/beta-admission";
import { checkPublicApiRateLimit } from "../../../lib/server/public-api-rate-limit";

export function createInvitationAccessGetHandler(dependencies: Readonly<{
  environment?: Readonly<Record<string, string | undefined>>;
  authenticate?: typeof authenticateScopedReceiptRequest;
  rateLimit?: typeof checkPublicApiRateLimit;
}> = {}) {
  return async function GET(request: Request) {
    const headers = { "Cache-Control": "no-store", Vary: "Authorization" };
    const mode = betaAdmissionMode(dependencies.environment);
    if (mode === "disabled") return NextResponse.json({ state: "disabled" }, { headers });
    if (mode !== "enabled") return NextResponse.json({ state: "unavailable" }, { status: 503, headers });
    const limit = await (dependencies.rateLimit ?? checkPublicApiRateLimit)({
      request, routeName: "/api/invitation-access",
      policy: { limit: 20, windowSeconds: 600, keyPrefix: "rl:v1:invitation-access" },
    });
    if (!limit.allowed) return NextResponse.json({ state: "unavailable" }, { status: 429, headers });
    const scope = (dependencies.authenticate ?? authenticateScopedReceiptRequest)(request, dependencies.environment);
    // The opaque partition prevents one browser user's draft/recovery key from
    // being reused after switching invitation or deployment scope. No raw scope
    // or invitation digest is returned.
    if (!scope) return NextResponse.json({ state: "required" }, { status: 401, headers });
    const { createHash } = await import("node:crypto");
    const partition = createHash("sha256").update(`${scope.scope}\n${scope.identity}`).digest("hex");
    return NextResponse.json({ state: "verified", partition }, { headers });
  };
}
