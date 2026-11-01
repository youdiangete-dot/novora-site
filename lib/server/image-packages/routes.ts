import "server-only";
import { NextResponse } from "next/server";
import { checkPublicApiRateLimit } from "../public-api-rate-limit";
import { getTestPackageHttpService } from "./runtime";
import type { PackageHttpService } from "./http-service";

type Dependencies = { service?: () => PackageHttpService | null; rateLimit?: typeof checkPublicApiRateLimit };
const provider = (value: unknown) => value === "paypal_sandbox" || value === "manual_test" ? value : null;
function response(value: any) {
  const status = value.ok ? 200 : value.reason === "denied" ? 404 : value.reason === "invalid" ? 400
    : value.reason === "unknown" ? 202 : value.reason === "conflict" ? 409 : 503;
  return NextResponse.json(value, { status, headers: { "Cache-Control": "no-store", Vary: "Authorization, Cookie" } });
}
async function body(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin ||
    !request.headers.get("content-type")?.startsWith("application/json") ||
    Number(request.headers.get("content-length")) > 2048) return null;
  try {
    const text = await request.text();
    if (Buffer.byteLength(text) > 2048) return null;
    const value = JSON.parse(text);
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch { return null; }
}
export function createTestPackageHandlers(dependencies: Dependencies = {}) {
  const service = dependencies.service ?? getTestPackageHttpService;
  async function available(request: Request) {
    const limit = await (dependencies.rateLimit ?? checkPublicApiRateLimit)({ request,
      routeName: "/api/test-image-packages", policy: { limit: 30, windowSeconds: 600, keyPrefix: "rl:v1:test-packages" } });
    return limit.allowed ? service() : null;
  }
  return {
    async GET(request: Request) {
      try {
        const selected = provider(new URL(request.url).searchParams.get("provider"));
        if (!selected) return response({ ok: false, reason: "invalid" });
        const active = await available(request);
        return response(active ? await active.customer(request, selected, "read") : { ok: false, reason: "unavailable" });
      } catch { return response({ ok: false, reason: "unavailable" }); }
    },
    async POST(request: Request) {
      try {
        const input = await body(request), selected = provider(input?.provider);
        if (!input || Object.keys(input).sort().join(",") !== "action,provider" || !selected ||
          !["create", "capture", "reconcile"].includes(input.action)) return response({ ok: false, reason: "invalid" });
        const active = await available(request);
        return response(active ? await active.customer(request, selected, input.action) : { ok: false, reason: "unavailable" });
      } catch { return response({ ok: false, reason: "unavailable" }); }
    },
    async manualPOST(request: Request) {
      try {
        const input = await body(request);
        if (!input || Object.keys(input).sort().join(",") !== "amountMinor,currency,purchaseId,reference") return response({ ok: false, reason: "invalid" });
        const active = await available(request);
        return response(active ? await active.manual(request, input.purchaseId, {
          reference: input.reference, amountMinor: input.amountMinor, currency: input.currency,
        }) : { ok: false, reason: "unavailable" });
      } catch { return response({ ok: false, reason: "unavailable" }); }
    },
  };
}
