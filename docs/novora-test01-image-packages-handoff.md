# TEST-01 image-package integration handoff

This local implementation is a digital image-package TEST MVP artifact. It is
not a deployed purchase flow, actual PayPal Sandbox payment, actual entitlement
issuance, online schema proof or commercial jewelry-order implementation.

## Contract for Agent C / coordinator

Import `VerifiedTestPayment` and `ExpectedTestPurchase` from
`lib/server/image-packages/contract.ts`. The normalized verified capture is:

```ts
{
  provider: "paypal_sandbox",
  paymentReference: string, // immutable capture id, never order/event id
  purchaseId: string,      // exact stored opaque UUID
  subjectId: string,       // trusted authenticated server UUID, never email
  packageCode: "TEST-01",
  amountMinor: 100,
  currency: "USD",
  environment: "TEST",
  confirmedAt: string,     // trusted verification time, canonical ISO UTC milliseconds
}
```

`createTestImagePackageService` accepts `verifyCapture(request, expected)`.
Return this object only after server capture verification. Pending/approved,
browser-return status, client-submitted paid flags, unknown transport outcome,
incorrect merchant/order/capture/purchase binding, LIVE environment or amount
mismatch must return `null` (or throw, which becomes unavailable). The purchase
must already exist with trusted server subject/package/provider/price binding.
The B service rechecks it, and the grant RPC rechecks the stored row again
inside the same transaction as the one-time grant.

C's `VerifiedSandboxCapture` maps `providerKey` to `provider` and
`providerCaptureId` to `paymentReference`; retain `purchaseId`, amount/currency
and obtain subject/package/TEST environment from the stored server purchase.
Do not map `capturedAt` to the entitlement start: capture creation can precede
successful confirmation. Supply the trusted server verification timestamp;
B pins `confirmedAt` to its own server clock before the first atomic grant.
The original confirmation/expiry remain immutable when reconciliation repeats.

No shared physical quotation/payment/provider registry was edited. These
purchases have no jewelry quote, commercial order, CAD or production reference.

## Coordinator wiring still required

- Inject an already-authorized server RPC client into
  `createImagePackageRepository`; no default client or credential lookup exists.
- Resolve purchase and subject from the existing protected customer context;
  client IDs are not authority. Keep purchase creation server controlled.
- `service.readEntitlement(request)` resolves the same trusted binding and
  returns separate initial/revision remaining counts and active/expired state.
  Unpaid or wrong-subject reads are denied; expired packages show zero usable
  slots. Reservations, UNKNOWN and settled results occupy slots; releases do not.
- For manual confirmation, authenticate using the existing protected admin and
  explicitly resolve the Owner role and stable verifier ID. The module requires
  `authorizeOwner`; generic admin access does not prove Owner. There is no
  default authorizer or new auth implementation. The only manual evidence is a
  stable `TEST-...` reference, USD amount and currency. Verifier/time are server
  supplied, and replay preserves original verifier/grant/expiry.
- Use server trusted generation-job UUID as operationId. Reserve before any
  dispatch. Only `ok: true`, `duplicate: false`, `state: reserved` permits the
  first dispatch. Duplicate results are state lookups, including after expiry,
  and must never dispatch again. A crash/timeout holds the reservation.
- Call `finish` only from authoritative generation/delivery handling. A
  `valid_delivery` requires every privacy/safety/access/output gate and durable
  correct-customer delivery readiness. Customer body flags cannot settle usage.
- `unknown` holds the slot without a retry primitive. `definite_failure` and
  `no_compliant_delivery` release the slot; a new authorized operation needs a
  new job UUID. Settled/released operations never reopen. A late contradictory
  result returns conflict and still preserves a larger known provider cost.
- `providerCostUsdMicros` is the cumulative known total for this one operation,
  retained monotonically with `greatest`, never added again on replay. Releasing
  entitlement is not a provider refund and does not erase actual cost.
- Review schema/roles/subject binding and separately obtain exact online SQL
  permission before applying the SQL candidate. No real DB test has passed.

Free invitation quotas are unchanged. TEST-01 grants five initial slots and five
revision slots independently, expiring exactly 168 hours after confirmed payment;
purchase creation and confirmation replay never reset expiry. This does not
authorize ten provider calls, any payment credentials or real money movement.

## Evidence and limitations

- `node --test tests/tools/test01-image-packages.test.cjs`: 26/26 passed.
- `node ../../node_modules/typescript/bin/tsc --noEmit --incremental false --pretty false`: passed.
- `npm.cmd run build`: passed (Next.js 16.2.12). The nested worktree produces
  the existing multiple-lockfile workspace-root warning; no configuration was
  changed to suppress it. No provider dispatch or online database verification
  was performed by this check.
- Unit/contract tests exercise real service and RPC adapter with synthetic
  dependency injection. SQL-text checks are static checks only, not SQL proof.
- `tests/tools/test01-image-packages-db.sql` supplies unexecuted synthetic
  single-session assertions for grant/replay/capture uniqueness, 5+5 capacity,
  release/UNKNOWN/settlement, preserved cost, expiry and NULL constraints. It
  does not establish two-session concurrency or deployed authorization.
- Local `docker ps --format '{{.Names}} {{.Image}}'` failed with permission denied
  connecting to `npipe:////./pipe/dockerDesktopLinuxEngine`. No SQL ran, no
  container was inspected/started/modified, no escalation or retry was made.
- No browser route/UI was edited, so browser/HTTP payment/admin proof is pending
  coordinator integration; no paid generation or online verification was run.

## Session capsule inputs

Goal: bounded TEST-01 contract, durable RPC-backed entitlements and manual TEST
confirmation service. Base: `bc60c231dd045b539bd5e3c3e16d80f7c28b9f59`.
Branch: `codex/test01-image-package-entitlements-v1`.
Worktree: `C:/Projects/NOVORA/novora-site/out/test01-image-package-entitlements-v1`.
No memory wrapper exists in this checkout or the installed codex-memory skill;
the bounded existing local context pack was read, mutable base verified against
the canonical repository, and these capsule inputs are prepared without changing
canonical project state. Parent owns integration and further permission gates.

Reusable rule: entitlement restoration and provider-cost accounting are separate;
UNKNOWN and duplicate operation results never authorize redispatch. Recorded in
this module contract, SQL candidate and regression checks; no global rules edited.
