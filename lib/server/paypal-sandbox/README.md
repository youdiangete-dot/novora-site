# Local Sandbox adapter (not activated)

`adapter.ts` implements injected Orders v2 create, capture and read reconciliation.
It has no default HTTP client, OAuth implementation, environment reads, route,
webhook handler, provider-registry entry, entitlement write or live fallback.
All tests use synthetic TEST data. Mock PASS is not actual Sandbox/deployed PASS.

## Parent integration seam

1. Resolve `SandboxPurchase` from the protected, persisted digital-package
   purchase: immutable UUID, server amount in minor units, USD and expected
   Sandbox seller merchant ID. TEST-01's USD 1 / 5 initial + 5 revision / seven-day
   terms belong to Agent B; this transport deliberately contains no package table.
   Do not supply a physical-jewelry quotation or browser-provided price/merchant.
2. Supply a **durable atomic** `SandboxOperationStore`. Unique `requestId` claims
   must survive concurrent callers, restarts, errors and timeouts; a different
   fingerprint is held, completion is immutable, claims never expire/reclaim.
   The in-memory implementation in tests is only a fake. Record a create result's
   order ID against the same purchase before presenting checkout to the customer.
3. Supply explicit Sandbox-only credentials and HTTP transport after separate
   setup authorization. Transport must honor `redirect: "error"` and abort signal,
   report the actual response URL, avoid logging request/response/token bodies,
   and not retry internally. The adapter bounds time, JSON response size and paths.
4. Persist the same purchase identity across returns, reloads and uncertain
   results. `capture` / `reconcile` require the order ID from that purchase's
   server-side mapping. A browser return/cancel query or unsigned webhook is
   never payment evidence. This adapter does not verify webhooks.
5. Only `PAID.capture` is a candidate payment fact. Apply Agent B's normalized
   confirmation through an atomic unique provider/capture-ID record linked to
   this exact purchase, so repeated reads cannot grant twice. The returned
   `capturedAt` is provider capture creation time; the entitlement's seven-day
   clock must use the separately persisted confirmed-payment policy/time.
   No entitlement is granted here. Read reconciliation can also reveal reversals.
6. `UNKNOWN` (including binding mismatch, invalid response, storage uncertainty,
   timeout and HTTP errors) keeps the payment reservation. No new create/capture
   POST, fresh purchase identity, fallback provider or entitlement debit is allowed
   to resolve it. A known order may be read via `reconcile`; an unknown create
   without a bound order ID needs manual provider reconciliation outside this task.
   `PENDING`, `CREATED`, `APPROVED`, `CANCELLED`, `DENIED`, and `REVERSED` never grant.

The existing `PaymentProviderAdapter` registry contract is intentionally not
implemented: it requires webhook verification and cannot represent UNKNOWN.
Registering this module there would incorrectly imply a completed checkout/
webhook flow. Parent integration should call the bounded primitives from the
digital-package flow, preserving its own access control and atomic accounting.

## Validation

From the worktree, using the installed parent repository dependencies:

```powershell
node --test tests/tools/paypal-sandbox.test.cjs
node ..\..\node_modules\typescript\bin\tsc --ignoreConfig --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext --skipLibCheck --strict --noUncheckedSideEffectImports false --types node --typeRoots ..\..\node_modules\@types --lib ES2022,DOM lib/server/paypal-sandbox/adapter.ts
```

Build and browser flow verification remain the coordinator's integration gate;
this task runs focused local mock and strict type checks only.

## Official API basis (checked 2026-11-01)

- [Orders v2 API reference](https://developer.paypal.com/api/orders/v2) and its
  linked [official schema](https://developer.paypal.com/api/orders/v2/schema.json):
  create/capture support PayPal-Request-Id; order COMPLETED alone is insufficient,
  capture status must be checked. Single full final capture only in this adapter.
- [Idempotency](https://developer.paypal.com/api/rest/reference/idempotency/):
  request identity differs per API operation; simultaneous repeats may fail and
  provider retention is bounded. This adapter's durable journal prevents reposts
  even after that retention, and deliberately implements no automatic retry.
- [API requests](https://developer.paypal.com/api/rest/requests/): Sandbox origin
  is `https://api-m.sandbox.paypal.com`; live origin is never accepted.
- [Sandbox accounts](https://developer.paypal.com/sandbox-testing/accounts):
  typical tests use a personal Sandbox buyer and Business Sandbox seller.
  This is not proof of Taiwan personal-account REST seller eligibility. Account
  eligibility, credentials, exact online schema permission and actual Sandbox
  acceptance remain Owner/setup dependencies; no onboarding was performed.
