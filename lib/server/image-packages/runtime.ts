import "server-only";
import { cookies } from "next/headers";
import { ADMIN_ACCESS_COOKIE_NAME, isValidAdminAccessCookie } from "../admin-access";
import { createSupabaseAdminClientOrNull } from "../supabase";
import { authenticateScopedReceiptRequest } from "../ai-sketch/beta-admission";
import { isReference } from "./contract";
import { createPackageHttpService } from "./http-service";
import { createSandboxTransport } from "../paypal-sandbox/transport";

/** Existing admin gate plus an explicit existing-invitation Owner allowlist.
 * No separate password/session/account system and no body-selected role. */
export async function authorizePackageOwner(request: Request, dependencies: {
  environment?: Readonly<Record<string, string | undefined>>;
  authenticate?: typeof authenticateScopedReceiptRequest;
  cookieValue?: () => Promise<string | undefined>;
  validateAdmin?: typeof isValidAdminAccessCookie;
} = {}) {
  const environment = dependencies.environment ?? process.env;
  const identity = environment.NOVORA_TEST_IMAGE_PACKAGES_OWNER_IDENTITY;
  const scope = environment.NOVORA_TEST_IMAGE_PACKAGES_OWNER_SCOPE;
  const verifierId = environment.NOVORA_TEST_IMAGE_PACKAGES_OWNER_VERIFIER_ID;
  if (!identity || !scope || !isReference(verifierId)) return null;
  const owner = (dependencies.authenticate ?? authenticateScopedReceiptRequest)(request, environment);
  if (!owner || owner.identity !== identity || owner.scope !== scope) return null;
  const cookieValue = dependencies.cookieValue ? await dependencies.cookieValue()
    : (await cookies()).get(ADMIN_ACCESS_COOKIE_NAME)?.value;
  return (dependencies.validateAdmin ?? isValidAdminAccessCookie)(cookieValue)
    ? { role: "owner" as const, verifierId } : null;
}

export function getTestPackageHttpService() {
  // Default off before client/credential lookup; no request is made at construction.
  if (process.env.NOVORA_TEST_IMAGE_PACKAGES_ENABLED !== "true") return null;
  const client = createSupabaseAdminClientOrNull();
  if (!client) return null;
  let sandbox = null;
  let merchantId: string | null = null;
  if (process.env.NOVORA_PAYPAL_SANDBOX_ENABLED === "true") {
    const id = process.env.NOVORA_PAYPAL_SANDBOX_CLIENT_ID;
    const secret = process.env.NOVORA_PAYPAL_SANDBOX_CLIENT_SECRET;
    const merchant = process.env.NOVORA_PAYPAL_SANDBOX_MERCHANT_ID;
    if (id && secret && merchant && /^[A-Z0-9]{13}$/.test(merchant)) {
      try { sandbox = createSandboxTransport(id, secret); merchantId = merchant; }
      catch { /* Unconfigured remains closed, with no credential output. */ }
    }
  }
  return createPackageHttpService({
    client, sandbox, sandboxMerchantId: merchantId,
    authenticate: authenticateScopedReceiptRequest, authorizeOwner: authorizePackageOwner,
    async readHold(purchaseId, confirmed) {
      if (confirmed) {
        const { data, error } = await client.from("novora_test_image_package_uses")
          .select("state").eq("purchase_id", purchaseId).in("state", ["reserved", "unknown"]).limit(11);
        if (error || !Array.isArray(data)) throw new Error("Unavailable");
        return data.some(row => row.state === "unknown") ? "unknown" : data.length ? "pending" : "none";
      }
      const { data, error } = await client.from("novora_test_image_package_sandbox_operations")
        .select("result,completed_at").eq("purchase_id", purchaseId).limit(3);
      if (error || !Array.isArray(data) || data.length > 2) throw new Error("Unavailable");
      if (data.some(row => !row.completed_at || !row.result || row.result.state === "UNKNOWN")) return "unknown";
      return data.length ? "pending" : "none";
    },
  });
}
