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
No spending amount is supplied or authorized by this task. The ledger schema is:

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
maximum. If a reliable full ceiling cannot be established for this existing
Provider path, Beta paid generation must remain disabled and the task is
blocked for release. A boolean in a record is not independent proof of approval,
pricing or durability; those facts require the separate release evidence.

## Offline evidence and remaining release gates

Focused tests use synthetic credentials, fake shared atomic ledger, fake
spending and Queue/Provider interfaces, and mocked REST responses. They prove
local routing and service contracts only. They do not prove Redis Lua runtime
behavior, actual durability, current pricing, spending authorization, real
invitation delivery or real customer image generation. Existing safety,
customer-access and output-validity contracts are preserved, never bypassed.

Before release: review the exact candidate; validate the real atomic ledger
implementation in a separately authorized isolated runtime; obtain the exact
Owner spending approval and verified cost ceiling; verify durable service
configuration; provision credentials/authority only with separate approval;
complete the required Build and deployment/controlled acceptance gates. None of
those gates is executed by this local candidate. Local evidence is not M2
Production acceptance or commercial website completion.
