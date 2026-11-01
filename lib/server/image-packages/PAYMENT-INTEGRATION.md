# Local TEST-01 B+C payment application seam

`payment-application.ts` joins the existing B repository/service and durable
Sandbox operation store to C's injected Sandbox-only adapter. It is callable
server code, with no route/UI, account provisioning, new authentication system,
provider registry entry, physical-jewelry quote/order dependency or environment
lookup. Construction performs no RPC, OAuth or HTTP operation.

## Authenticated entry points

Create the application with an already-authorized `ImagePackageRpcClient`,
explicit Sandbox configuration/credentials/HTTP, and two server authorities:

- `authenticateCustomer(request)` returns the existing protected customer's
  opaque subject UUID plus verified `{ scope, identity }`. The application
  compares all three to the persisted purchase before any payment operation.
- `authorizeOwnerAdmin(request)` must verify the existing protected admin and
  explicit Owner role, returning the stable verifier ID. A generic admin, body
  `owner: true`, amount or paid flag cannot substitute for this callback.

These callbacks remain the parent's route-integration responsibility. They must
not merely parse a client DTO. A's final invitation identity supplies scope and
identity; its trusted mapping to B's subject UUID is still required. This module
does not guess that mapping, create an account, hash an identity into an account,
or establish a new authentication contract.

Methods accept an untrusted `purchaseId` **lookup key only**. B must already have
created a stable TEST-01 purchase under trusted server ownership. No method here
creates a purchase or resets an uncertain one. Browser order/capture/status
parameters are never accepted as payment facts.

```ts
application.createCheckout(request, purchaseId);
application.captureCheckout(request, purchaseId);
application.reconcileCheckout(request, purchaseId);
application.confirmManualTest(ownerAdminRequest, purchaseId, {
  reference: "TEST-...", amountMinor: 100, currency: "USD",
});
```

The protected Owner admin may confirm a selected customer's manual-test purchase;
it authorizes before looking up the target. Customer Sandbox entry points require
the customer's exact subject and owner binding. Manual evidence is normalized by
B; server verifier and confirmation time replace body values.

## Payment and grant behavior

- `createCheckout` uses the immutable server price/merchant. With an existing
  durable PayPal order it reads that order instead of creating another. Without
  an order it uses B's permanent operation claim; an UNKNOWN create without an
  authoritative order remains held and requires manual provider reconciliation.
- `captureCheckout` gets the order ID solely from B's durable mapping. C reads
  before capture and posts at most once using the same permanent operation
  journal. `reconcileCheckout` never posts to PayPal. A successful read after an
  ambiguous capture can confirm payment without repeating capture.
- Only C's verified `PAID.capture` can reach B's payment grant. Before mapping,
  the application re-reads the exact purchase/order mapping and compares merchant,
  amount, currency and purchase identity. Capture ID is the unique payment
  reference. Subject/package/TEST fields come from the stored purchase; capture
  creation time never becomes the entitlement start.
- `state: "confirmed"` is returned only after B's atomic grant returns validated
  success. `state: "checkout"` means an order/pending state, **not paid or entitled**.
  UNKNOWN, malformed/mismatched payments, RPC uncertainty and unconfirmed orders
  never return confirmed. A lost grant ACK may be reconciled through B's unique
  grant without extending its original confirmation/expiry or granting twice.
- Payment reversal is reported as `payment_reversed`; no automatic refund,
  revocation or entitlement policy is introduced. Parent must retain this state
  rather than interpret a historical grant as a newly verified paid result.
- Payment and manual confirmation share B's 5 initial + 5 revision, seven-day
  policy. This module does not dispatch generation, alter the free invitation
  quota, or change B's dispatch accounting.

## Evidence and remaining gates

Run `node --test tests/tools/test01-payment-application.test.cjs`. This suite loads
the real B/C/application modules and injects only RPC, authentication and HTTP
fixtures. Fake atomic maps demonstrate seam behavior, **not actual database
concurrency, deployed authorization or real PayPal Sandbox acceptance**.

Focused strict TypeScript can be run from this worktree using the installed root
dependencies:

```powershell
node ..\..\node_modules\typescript\bin\tsc --ignoreConfig --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext --skipLibCheck --strict --noUncheckedSideEffectImports false --types node --typeRoots ..\..\node_modules\@types --lib ES2022,DOM lib/server/image-packages/payment-application.ts
```

Route/UI and protected admin wiring await A's accepted identity contract and
coordinator integration. B's candidate SQL, role checks and real two-session race
verification remain unexecuted here. Actual database schema/credentials/account
eligibility, OAuth/HTTP construction, real Sandbox testing and deployment remain
separately authorized gates. Unchanged B/C focused validation is reused; no broad
suite, Build, Docker, SQL, provider call or online setup is run by this seam task.

Reusable integration rule: a verified capture is a payment fact, not a client
confirmation or an entitlement grant. Return customer-confirmed state only after
the existing unique, durable grant succeeds; UNKNOWN retains all prior holds.
