import "server-only";
import { NextResponse } from "next/server";
import { readRevisionDirectives, type RevisionDirective } from "../../first-preview-revision-directives";
import { isValidFirstPreviewAssetUuid as uuid, isValidFirstPreviewPublicReference as reference } from "./first-preview-generated-assets-contract";
import type { createSourceBoundRevisionService } from "./first-preview-revision";
import { checkPublicApiRateLimit } from "../public-api-rate-limit";

export type RevisionHttpContext = Readonly<{ publicReference: string; operationId: string; sourceOutputId: string;
  provider: "paypal_sandbox" | "manual_test"; directives?: readonly RevisionDirective[]; binding?: string }>;
export function createRevisionHttpHandlers(createService: (request: Request, context: RevisionHttpContext) => Promise<ReturnType<typeof createSourceBoundRevisionService> | null>, options: Readonly<{ rateLimit?: typeof checkPublicApiRateLimit }> = {}) {
  const response = (value: unknown, status = 200) => NextResponse.json(value, { status, headers: { "Cache-Control": "no-store", "Vary": "Authorization, Cookie" } });
  const denied = () => response({ status: "denied" }, 404);
  const context = (publicReference: string, b: Record<string, unknown>): RevisionHttpContext | null =>
    reference(publicReference) && typeof b.operationId === "string" && uuid(b.operationId) && typeof b.sourceOutputId === "string" && uuid(b.sourceOutputId) &&
    (b.provider === "manual_test" || b.provider === "paypal_sandbox")
      ? { publicReference, operationId: b.operationId, sourceOutputId: b.sourceOutputId, provider: b.provider } : null;
  return {
    async POST(request: Request, publicReference: string) {
      try {
        if (request.headers.get("origin") && request.headers.get("origin") !== new URL(request.url).origin) return denied();
        if (Number(request.headers.get("content-length")) > 8192) return denied();
        if (!(await (options.rateLimit ?? checkPublicApiRateLimit)({ request, routeName: "/api/first-preview-revisions", policy: { limit: 20, windowSeconds: 600, keyPrefix: "rl:v1:revision-post" } })).allowed) return denied();
        const raw = await request.text(); if (raw.length > 8192) return denied();
        const b = JSON.parse(raw);
        if (!b || Array.isArray(b) || Object.keys(b).sort().join() !== "binding,directives,operationId,provider,sourceOutputId") return denied();
        const c = context(publicReference, b), directives = readRevisionDirectives(b.directives);
        if (!c || !directives || typeof b.binding !== "string" || b.binding.length > 1024) return denied();
        const service = await createService(request, { ...c, directives, binding: b.binding });
        if (!service) return denied();
        const result = await service.prepare(request, c.operationId);
        return response(result, result.status === "accepted" ? 202 : result.status === "existing" ? 200 : result.status === "unknown" ? 202 : 409);
      } catch { return response({ status: "unknown" }, 202); }
    },
    async GET(request: Request, publicReference: string) {
      try {
        if (!(await (options.rateLimit ?? checkPublicApiRateLimit)({ request, routeName: "/api/first-preview-revisions", policy: { limit: 60, windowSeconds: 600, keyPrefix: "rl:v1:revision-get" } })).allowed) return denied();
        const params = new URL(request.url).searchParams;
        if ([...params.keys()].sort().join() !== "operationId,provider,sourceOutputId") return denied();
        const c = context(publicReference, Object.fromEntries(params)); if (!c) return denied();
        const service = await createService(request, c); if (!service) return denied();
        return response(await service.read(request, c.operationId));
      } catch { return response({ status: "unknown" }); }
    },
  };
}
