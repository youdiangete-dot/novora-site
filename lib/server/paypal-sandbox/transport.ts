import "server-only";
import { PAYPAL_SANDBOX_ORIGIN, type SandboxDependencies } from "./adapter";

/** Constructed only after explicit server flags and complete Sandbox config.
 * No request at construction. No retry, redirect, live host or logging. */
export function createSandboxTransport(clientId: string, clientSecret: string,
  transport: typeof fetch = fetch): Omit<SandboxDependencies, "operations"> {
  if (!/^[A-Za-z0-9._-]{1,256}$/.test(clientId) || !clientSecret ||
    clientSecret.length > 4096 || /[\s\u0000-\u001f]/.test(clientSecret)) throw new Error("Sandbox unavailable");
  let cached: { token: string; until: number } | null = null;
  return {
    endpoint: PAYPAL_SANDBOX_ORIGIN,
    credentials: { async getAccessToken() {
      if (cached && cached.until > Date.now()) return cached.token;
      const url = `${PAYPAL_SANDBOX_ORIGIN}/v1/oauth2/token`;
      const response = await transport(url, {
        method: "POST", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(8000),
        headers: { Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded" },
        body: "grant_type=client_credentials",
      });
      if (!response.ok || response.url !== url) throw new Error("Sandbox unavailable");
      const raw = await response.text();
      if (Buffer.byteLength(raw) > 32768) throw new Error("Sandbox unavailable");
      const value = JSON.parse(raw);
      if (value.token_type !== "Bearer" || typeof value.access_token !== "string" ||
        !/^[A-Za-z0-9._~+-]{1,4096}$/.test(value.access_token) ||
        !Number.isSafeInteger(value.expires_in) || value.expires_in < 1 || value.expires_in > 86400) throw new Error("Sandbox unavailable");
      cached = { token: value.access_token, until: Date.now() + Math.max(0, value.expires_in - 60) * 1000 };
      return cached.token;
    } },
    async http(request) {
      // Adapter constructs these three bounded paths; independently enforce them.
      if (!/^https:\/\/api-m\.sandbox\.paypal\.com\/v2\/checkout\/orders(?:\/[A-Z0-9]{1,64}(?:\/capture)?)?$/.test(request.url)) throw new Error("Sandbox unavailable");
      const response = await transport(request.url, {
        method: request.method, headers: request.headers, body: request.body,
        signal: request.signal, redirect: "error", cache: "no-store",
      });
      return { status: response.status, url: response.url, body: await response.text() };
    },
  };
}
