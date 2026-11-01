import "server-only";
import { createHash } from "node:crypto";
import { isOwner, type PackageOwner, type TestPaymentProvider } from "./contract";

// Fixed UUIDv5 namespace, not a key or a credential. RFC UUIDv5 uses SHA-1;
// these UUIDs are nonsecret row identities and never authenticate anyone.
const NAMESPACE = Buffer.from("d4ac13f3a24e5ff7a1453da2ed113fea", "hex");
function identityUuid(domain: string, values: readonly string[]): string {
  const digest = createHash("sha1").update(NAMESPACE)
    .update(JSON.stringify(["NOVORA/TEST-01/v1", domain, ...values])).digest().subarray(0, 16);
  digest[6] = (digest[6] & 15) | 80;
  digest[8] = (digest[8] & 63) | 128;
  const h = digest.toString("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
export function testPackageSubject(owner: PackageOwner): string {
  if (!isOwner(owner)) throw new Error("Invalid verified owner");
  return identityUuid("subject", [owner.scope, owner.identity]);
}
export function testPackagePurchase(owner: PackageOwner, provider: TestPaymentProvider): string {
  if (!isOwner(owner) || !["paypal_sandbox", "manual_test"].includes(provider)) throw new Error("Invalid verified owner");
  return identityUuid("purchase", [owner.scope, owner.identity, provider]);
}
