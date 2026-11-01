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
  Expected purchases now also require `owner: {scope, identity}` and
  `sandboxMerchantId` (13-character trusted Sandbox merchant ID for PayPal;
  `null` for manual). Owner/merchant/subject/provider/price are immutable on
  create replay. No real merchant/account setup was performed.
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
- Reserve the trusted generation-job UUID with purchaseId, subjectId and the
  complete binding below. Validate brief/source ownership against the existing
  protected journey before reserving; raw body IDs never establish ownership.
  The existing use row stores the binding and capacity. Reserve never permits
  dispatch; obtain the separate one-time claim from that same row. A
  crash/timeout after claiming holds it permanently, with no redispatch.
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

## Exact Agent A dispatch contract

```ts
type DispatchBinding = {
  owner: { scope: string; identity: string }; // authenticated existing context
  reservationId: string; operationId: string; // independent stable UUIDs
  kind: "initial" | "revision";
  briefId: string;
  sourceOutputId?: string; // required for revision; absent for initial
};
service.reserve({ purchaseId, subjectId, ...binding });
service.claimDispatch(binding): Promise<
  "claimed" | "already_claimed" | "denied" | "unknown"
>;
service.settleDispatch({ ...binding,
  outcome: "delivered" | "definite_failure" | "unknown",
  failurePhase?: "before_dispatch", // only with definite_failure; required for proven enqueue failure
  providerCostUsdMicros: number, // cumulative known per-operation cost
}): Promise<UseResult>;
```

Only `claimed` authorizes the first provider dispatch. Claim locks the purchase
and the existing use, checks every immutable field, then sets claimed_at once.
An UNKNOWN row returns `unknown`; an already claimed/settled/released row returns
`already_claimed`; a binding mismatch/expired or released unclaimed use returns `denied`.
Transport or malformed RPC returns `unknown`. No claimed/UNKNOWN operation can
be reclaimed after restart or timeout. Normal settlement requires a prior claim,
revalidates the exact binding, then calls the existing finish transaction.
Proven pre-dispatch failure uses definite_failure + failurePhase=before_dispatch:
under the same purchase/use locks it releases an unclaimed reservation without
faking claimed_at. Replay is idempotent, wrong bindings deny, and claim cannot
later dispatch the released row. If a worker claimed first, the stale pre-dispatch
release conflicts instead of restoring an in-flight slot. Direct finish still
denies unclaimed uses. The two race orderings are specified in the DB request.
`delivered` maps to `valid_delivery`; a definite no-compliant-delivery result maps
to `definite_failure`. Cost is retained even on a conflicting late result.
This module supports package-backed reservations only; it does not debit or
replace the free invitation ledger.

## Exact Agent C durable store contract

`createDurableSandboxOperationStore(client, { owner, purchaseId })` from
`lib/server/image-packages/sandbox-store.ts` structurally implements C's
`SandboxOperationStore` and adds `readPurchase()`. Use the returned trusted
purchase's amount/currency/merchant/order mapping, never browser values.
Its deterministic request IDs/fingerprints match C's v1 hashing protocol.

One create and one capture journal entry per purchase can be claimed; no TTL,
reclaim/reset/delete API exists. Claim transport errors return `held`.
Completion strips raw provider data and is immutable. Completing a verified
create result and binding its order ID commit in one SQL transaction. UNKNOWN
never supplies a new authoritative order mapping or triggers a POST. Capture
requires the existing server order ID. Completed capture results still go
through C's read reconciliation; this store grants no entitlement by itself.
The journal is payment-side-effect idempotency, not a second quota ledger.

## Evidence and limitations

- `node --test tests/tools/test01-image-packages.test.cjs`: 35/35 passed.
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
- `tests/tools/test01-image-packages-db-request.md` and the concurrency fixture
  specify the exact remaining disposable-DB request. No fixture was executed.
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
