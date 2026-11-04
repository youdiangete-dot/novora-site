import { NextResponse } from "next/server";
import { getCustomerCommercialOrderStatus } from "../../../lib/server/customer-commercial-order-status";
import { checkPublicApiRateLimit } from "../../../lib/server/public-api-rate-limit";

export function createCustomerOrderStatusHandler(factory = getCustomerCommercialOrderStatus, rateLimit = checkPublicApiRateLimit) {
  const unavailable = () => NextResponse.json({ state: "unavailable" }, { status: 404, headers: { "Cache-Control": "private, no-store", Vary: "Authorization, Cookie" } });
  return async (request: Request) => {
    try {
      const url = new URL(request.url), keys = [...url.searchParams.keys()];
      if (request.method !== "GET" || keys.length !== 1 || keys[0] !== "publicReference" ||
          (request.headers.get("origin") && request.headers.get("origin") !== url.origin) || request.headers.get("sec-fetch-site") === "cross-site") return unavailable();
      const service = factory();
      if (!service || !(await rateLimit({ request, routeName: "/api/customer-commercial-order-status", policy: { limit: 30, windowSeconds: 600, keyPrefix: "rl:v1:customer-order-status" } })).allowed) return unavailable();
      const result = await service.read(request, url.searchParams.get("publicReference") ?? "");
      return result ? NextResponse.json(result, { headers: { "Cache-Control": "private, no-store", Vary: "Authorization, Cookie" } }) : unavailable();
    } catch { return unavailable(); }
  };
}
