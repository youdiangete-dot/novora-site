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

`runtime.ts` now supplies these callbacks using A's existing verified invitation
and the existing admin cookie. They never parse a client subject, owner or paid
DTO. `identity.ts` maps the verified owner to a nonsecret subject partition, as
specified below. This does not create accounts or establish another auth system.

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

The local customer/admin routes and UI are implemented. Route plus cross-module
mock checks pass 21/21; mocked Chromium browser checks pass 4/4, including mobile
UNKNOWN holds and minimal Owner TEST evidence. Project TypeScript and diff checks
pass. These mocks are not actual Sandbox or deployed proof. B's separate actual
local database evidence is recorded in its evidence-only commit; this stream
executes no SQL or Docker and does not repeat B's unchanged suites. Real Sandbox
account eligibility, approved environment/credential setup and deployment remain
separate gates. Build remains the coordinator's final relevant check.

## Protected routes, identities and UI

- Customer page `/design/packages`; protected admin page
  `/admin/test-image-packages`, linked from existing brief surfaces.
- Customer API `/api/test-image-packages`: GET reads a provider's own balance;
  POST accepts exactly `{ action, provider }`, where action is create/capture/
  reconcile and provider is paypal_sandbox/manual_test. No client purchase,
  subject, owner, order, amount, role or paid assertion establishes authority.
- Admin API `/api/admin/test-image-packages`: POST accepts only purchaseId,
  synthetic TEST reference, amountMinor and currency. It requires both the
  existing validated admin cookie AND a verified invitation matching the exact
  server Owner scope/identity allowlist. Generic admin access alone cannot grant.
- Mutations require same Origin and bounded JSON; responses are no-store and
  vary on Authorization/Cookie. Existing public rate limiting bounds requests.
  Invitation bearers remain in page memory, never local/sessionStorage or URLs.

`identity.ts` uses RFC UUIDv5 (SHA-1, fixed namespace
`d4ac13f3-a24e-5ff7-a145-3da2ed113fea`) over UTF-8 canonical JSON arrays:

```text
["NOVORA/TEST-01/v1", "subject", verifiedScope, verifiedIdentity]
["NOVORA/TEST-01/v1", "purchase", verifiedScope, verifiedIdentity, provider]
```

The domain/namespace is not a credential. UUIDs are row identifiers only and
cannot authorize a request. The source scope/identity always comes from A's
server invitation verifier, and is rechecked against B's immutable purchase.
With explicit trial mode enabled, deployment SHA/ID and spending-authority changes
do not change the trial scope. Changing its namespace/target or invitation
identity changes the partition; bearer rotation retaining that identity/scope
does not. There is one stable TEST-01
purchase per owner/provider in this test scope, not a fresh purchase on refresh,
expiry or UNKNOWN. Scope changes must never be used as an uncertainty reset.
These test partitions are not registered user accounts or physical orders.

## Configuration prerequisites (server-only, no values configured here)

Default `NOVORA_TEST_IMAGE_PACKAGES_ENABLED` is off. To enable later requires
reviewed target schema/RPC permissions, the existing Supabase admin helper and
A's invitation receipt configuration. Manual confirmation also requires the
existing admin access gate plus `NOVORA_TEST_IMAGE_PACKAGES_OWNER_IDENTITY`,
`NOVORA_TEST_IMAGE_PACKAGES_OWNER_SCOPE` and
`NOVORA_TEST_IMAGE_PACKAGES_OWNER_VERIFIER_ID` bound to the real Owner invitation.

Sandbox remains off unless `NOVORA_PAYPAL_SANDBOX_ENABLED` is true and all of
`NOVORA_PAYPAL_SANDBOX_CLIENT_ID`, `NOVORA_PAYPAL_SANDBOX_CLIENT_SECRET` and
`NOVORA_PAYPAL_SANDBOX_MERCHANT_ID` are complete and valid. These are server-only;
none is NEXT_PUBLIC. `transport.ts` constructs no request until invoked, exchanges
credentials only at the fixed Sandbox OAuth endpoint, refuses redirects/live
URLs, does not retry or log raw data, and bounds token lifetime/response size.
UI approval links use only www.sandbox.paypal.com and server-issued order IDs.
No real credentials, OAuth/payment call, bank details, receipt upload or online
configuration were used to build or test this code.

Browser checks use `tests/tools/test01-package-browser.config.ts`: isolated
localhost port 3107, real package/PayPal/generation flags forced off, a synthetic
admin test key, mocked API responses, and external browser requests blocked.

## Final combined local checks

Owner deferred collection/payment on 2026-11-01 until the Taipei partner can
cooperate on Monday 2026-11-02. Preserve the implemented code and mock evidence;
package and Sandbox flags stay false/unconfigured in any candidate deployment.
Account setup, credentials, actual Sandbox checks and further payment feature
implementation are paused pending an explicit resumption. No payment gate is PASS.

Application source includes the fixed A revision HTTP/runtime/Queue wiring and
B's exact terminal-failure read. Combined Next.js 16.2.12 production Build and its
TypeScript pass with real package/PayPal/Queue/generation gates forced off.
The existing nested-lockfile and local Queue-region warnings remain non-blocking;
no unrelated configuration was changed to suppress them.

Focused package/route/seam checks pass 22/22, including stable trial identity
with missing/invalid/unfunded cost authority. The six selected combined checks
cover revision HTTP, Queue redelivery, uncertain funded claim, UNKNOWN new-op
denial, stable scope, and refresh/current-direction confirmation. The first run
passed five; the browser case lacked its synthetic feedback signing fixture and
therefore correctly did not render that control. Adding only the synthetic test
configuration made that single rerun pass. These six are one result set, not
seven independent passes. Earlier A/B and package-browser evidence is reused.

Runner output now uses separate ignored out directories so future runs do not
clear test-results. The earlier synthetic mobile screenshot was inadvertently
cleaned by the runner default and is regenerated from the same fixed mock case;
it is a new visual artifact, not claimed to preserve the original image bytes.
No screenshots, generated Next files or test result artifacts are staged.

The split, non-authorizing setup request is
`docs/novora-test01-g4-isolated-setup-draft.md`. The combined local checks do not
prove online schema/role bindings, real PostgREST terminal reads, real Sandbox
eligibility/payment, image delivery, or deployed G2 acceptance.

Reusable integration rule: a verified capture is a payment fact, not a client
confirmation or an entitlement grant. Return customer-confirmed state only after
the existing unique, durable grant succeeds; UNKNOWN retains all prior holds.
