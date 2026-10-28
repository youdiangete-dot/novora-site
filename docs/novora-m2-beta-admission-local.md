# M2 Beta admission local candidate

Task: M2-BETA-ADMISSION-1. Base: `c1781f42c8a398e7376d4a50ba408005669774ac`.
This candidate is disabled by default. It does not authorize Beta launch,
Production changes, credential issuance, paid execution or a monetary amount.
PR287 remains OWNER_HOLD and is not a dependency of this implementation.

## Identity and public intake

The existing Concept Brief endpoint accepts an invitation credential through
the HTTPS `Authorization: Bearer` header. Server-only
`NOVORA_BETA_INVITATIONS_JSON` maps each independently provisioned, high-entropy
credential's SHA-256 digest to one stable opaque identity. At most ten unique
identities and credential digests are accepted. Missing/malformed rosters,
weakly formatted credentials and unrecognized credentials deny paid admission.
Credentials must be independently generated with at least 256 bits of entropy;
the code's length check cannot establish entropy. No real credentials are
generated, stored in source, placed in URLs, logged or issued by this candidate.
Rotation must preserve the identity; an email change cannot change that identity.
The roster's identities are explicit Owner authorizations, not client account IDs.

An `Idempotency-Key` header (16–128 letters, digits, underscores or hyphens)
identifies one submission operation and must be retained on retries. Beta
test tooling must send both headers on the existing submission request. This
candidate adds no login UI, invitation email system or general account system.
No invitation credential grants image access: the existing separately issued
Brief-bound customer cookie and all private asset authorization remain required.

Persistence, validation, public receipt, existing IP/email rate limiting and
customer-cookie issuance precede paid admission and retain their contracts.
Denied admission produces the ordinary persisted Brief receipt, never a claim
that an image was generated. Even an unauthorized visitor can submit a public
Brief. A retry may persist another public Brief; that is not permission to
publish another paid job. Receipt idempotency is not introduced here.

## Atomic quota and spending

`NOVORA_BETA_ADMISSION_ENABLED` is disabled when absent or exactly `false`;
exactly `true` enables the boundary. Other values deny admission and dispatch.
When disabled, unmarked baseline work uses its original path without Redis
admission calls. Marked Beta work cannot bypass admission after disablement.
Enabling Beta also blocks unmarked queued work from paid dispatch; drain or
otherwise account for existing work in the separately approved release plan.

The adapter reuses the existing Upstash/KV REST configuration family. It has no
in-memory production fallback. One Redis EVAL operation validates spending,
counts identity reservations for the Redis server's UTC epoch day, and records
one permanent idempotent reservation. One JSON SET is the only write after
validation. Redis scripting provides atomic execution; persistence, eviction,
recovery and exclusive credential access require separate service verification.
See [Redis scripting documentation](https://redis.io/docs/latest/develop/programmability/eval-intro/).

The fixed key is `novora:beta-admission:v1`. There is no automatic initialization,
refund, TTL, reset or rollover deletion. Missing, corrupt, expiring, oversized,
exhausted or unverifiable ledger/authority state denies execution. A maximum of
10,000 permanent reservations bounds this Beta candidate; reaching it denies
further admissions. No cleanup is implemented or authorized.

At most five reservations per stable identity per UTC day can proceed. All
failures and uncertain results consume the reservation. This is deliberately
conservative: the entitlement is **at most** five complete experiences, not a
guarantee of five successful images plus free failed attempts. Requests cannot
borrow another identity's quota. Global spend is shared across every identity
and day. A duplicate request key never publishes again, even after midnight or
an ambiguous Queue/network result. Different payloads or Briefs cannot create
another reservation under the same key. Operators must not erase or restore an
older ledger, change identity IDs to reset limits, or issue a fresh authority
to evade previously reserved spend.

Before the existing Provider dispatch marker and Provider call, the worker
claims the exact admitted Brief and structured-input fingerprint once. Queue
redelivery cannot claim it twice. A failed/uncertain dispatch remains consumed;
there is no automated paid retry or reservation release. The normal lifecycle
and per-Brief attempt/cost contracts remain in effect. This candidate enables
one original First Preview generation per reservation and does not introduce
two-direction output or follow-up optimization.

## Separately approved authority required

`NOVORA_BETA_SPENDING_AUTHORITY_ID` must identify a separately approved authority
already provisioned in the durable ledger. The application never creates it.
The original verified-cost authority schema remains:

```text
version: 1
authority:
  id: exact server-configured approval identity
  ownerApproved: true only following explicit approval
  durabilityVerified: true only after persistence/eviction/recovery verification
  costCeilingVerified: true only after verifying the FULL experience ceiling
  currency: USD
  pricingVersion: exact FIRST_PREVIEW_PRICING_ASSUMPTION_VERSION
  limitMicros: Owner-approved positive safe integer aggregate monetary limit
  experienceCeilingMicros: separately verified positive safe integer upper bound
  expiresAt: approved future expiry as UTC Unix seconds
reservations: object indexed by server-hashed identity and idempotency key
```

Each reservation holds identity, requestKey, briefId, structured fingerprint,
UTC epoch day, reservedMicros and dispatched. The aggregate total is derived
from every permanent reservation, including failures and uncertain outcomes.
An experience ceiling must cover image generation and every required external
cost in that experience, not merely a nominal image estimate. It must be at
least the existing per-Brief lifetime reservation contract. The existing
pricing-version string/estimates alone do not verify any current price or hard
maximum. Without either verified cost coverage or the explicit single-image
risk authority below, Beta paid generation must remain disabled. A boolean in a
record is not independent proof of approval, pricing or durability; those facts
require separate release evidence.

For the Owner-approved bounded-risk M2 stage, the single-image risk mode below
may be used with a documented conservative full-experience estimate and
justified budget reservation rather than an unavailable guaranteed invoice
cap. This is not verified-cost mode and must not set `costCeilingVerified=true`.
Reconcile trusted usage before another paid call; uncertainty stops later paid
calls. Existing aggregate budgets and all other safety gates remain in force.

## Owner-accepted one-image cost-risk authority

The Owner's M2 one-image pilot decision accepts that one fixed Images API
request might actually cost more than USD 1. This is an expected-cost
authorization, **not** a proven Provider billing cap. The alternative mode does
not enable itself, provision a ledger, grant durability evidence, issue an
invitation, change a feature flag, or dispatch an image.

Use the existing permanent Redis key and common version, exact authority ID,
Owner approval, independently evidenced durability, USD currency, exact pricing
version and future Redis-server-time expiry requirements. The authority must
contain exactly these fields (placeholders are not an executable funded record):

```text
id: exact server-configured, separately approved authority identity
ownerApproved: true only following explicit Owner approval
durabilityVerified: true only after independent real-store durability evidence
currency: USD
pricingVersion: exact FIRST_PREVIEW_PRICING_ASSUMPTION_VERSION
expiresAt: explicit approved future UTC Unix seconds
costAuthorityMode: owner_expected_cost_single_attempt_v1
ownerCostRiskAccepted: true only for the explicit one-image risk approval
costCeilingVerified: false
limitMicros: 1000000
attemptReservationMicros: 1000000
expectedCostMicros: positive safe integer strictly below 1000000
invitedIdentity: the only identity in the server invitation roster
maximumExperiences: 1
maximumImages: 1
maximumPaidAttempts: 1
automaticPaidRetries: false
```

Do not include `experienceCeilingMicros` or unknown/conflicting fields in this
mode. The allocation is named `attemptReservationMicros` to avoid representing
expected spend as verified cost coverage. Never set `costCeilingVerified=true`
for this risk authorization. Do not copy a durability flag from disposable
fixtures into a live spending authority. Existing authorities without a mode
retain the original verified-cost behavior; pilot-only fields are rejected in
that mode, and unknown modes fail closed.

Exactly one server invitation identity must match `invitedIdentity` on both
admission and dispatch. Lua reserves the entire USD 1 accounting allocation on
the first admission and rejects every second reservation, including replay of
the same request. The permanent record pins the pilot authority ID, expiry,
expected-cost estimate and identity; editing those fields, substituting another
authority or downgrading the consumed record to verified mode denies dispatch.
Old verified reservations cannot be adopted as pilot reservations. Deleting,
resetting or restoring an earlier ledger to repeat an authority is prohibited;
arbitrary administrator replacement of the entire ledger is outside the
application's trust boundary and is not technically prevented by a JSON flag.

The existing Brief/fingerprint binding, atomic single-EVAL/single-SET updates,
one-time `dispatched` claim and database dispatch marker remain mandatory. The
unchanged Provider builder fixes `n: 1`; one admitted experience therefore
permits at most one one-image paid request. An uncertain/failed attempt remains
consumed. There is no automatic paid retry, refund or second image permission.
Queue redelivery cannot reacquire the dispatch claim. Existing customer access,
privacy, moderation, image validity, Storage and readiness checks are unchanged.

## Offline evidence and remaining release gates

`tests/e2e/beta-pilot-risk-authority.spec.ts` exercises the actual Lua against
an already available disposable local Redis instance. It requires
`NOVORA_BETA_LOCAL_REDIS_TEST_PORT` and an existing `redis-cli` executable
(optionally selected with `NOVORA_BETA_LOCAL_REDIS_CLI`). It only connects to
`127.0.0.1`, uses retained unique `novora:local-pilot-risk:*` synthetic fixture
keys, never touches the application authority key, and does not start/install
infrastructure. Missing runtime prerequisites block the single focused test;
there is no fake-ledger fallback or automatic retry. Its fixture durability
booleans are synthetic inputs, never evidence about a live authority.

Focused tests use synthetic credentials, fake shared atomic ledger, fake
spending and Queue/Provider interfaces, and mocked REST responses. They prove
local routing and service contracts only. They do not prove Redis Lua runtime
behavior, actual durability, current pricing, spending authorization, real
invitation delivery or real customer image generation. Existing safety,
customer-access and output-validity contracts are preserved, never bypassed.

Before release: review the exact candidate; validate the real atomic ledger
implementation in a separately authorized isolated runtime; obtain the exact
Owner spending approval and either verified cost coverage or explicit one-image
cost-risk acceptance; verify durable service
configuration; provision credentials/authority only with separate approval;
complete the required Build and deployment/controlled acceptance gates. None of
those gates is executed by this local candidate. Local evidence is not M2
Production acceptance or commercial website completion.
