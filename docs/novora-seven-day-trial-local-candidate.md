# Seven-day invitation spending candidate (local only)

Compatibility note2026-11-03: this document describes the unchanged USD1 profile,
not the selected lower-reserve release. The selected default-OFF025 candidate is
documented in `novora-seven-day-usd025-local-candidate.md`; it preserves prior
commitments, fits the existing caps and has separate actual local Redis proof.
The historical skipped cases and USD1 cap rejection below remain accurate for
this profile; they are not a claim that the selected025 profile is untested.

This slice owns spending admission only. It does not initialize a ledger, grant
entitlements, configure invitations, deploy, collect payment or change budget caps.
The previously reviewed sixty-minute mode and its Lua remain unchanged.

Select `NOVORA_INVITATION_TRIAL_SPENDING_MODE=owner_expected_cost_seven_day_trial_v1`
only with the exact reviewed server-side configuration and exactly two distinct
invitation identities. `startsAt`/`expiresAt` are Unix seconds, exactly seven days
apart. Quotas are fixed to 3 initial + 1 revision per identity and 6 initial + 2
revision in aggregate. `limitMicros` is 8,000,000; each operation still occupies
1,000,000 microUSD. Existing daily-five restriction is also retained.

The separate permanent ledger key pins project, source, deployment, roster,
receipt namespace, authority label and complete configuration. Server receipt
scope remains compatible. No request can create an empty funded ledger. Deploying
or rotating configuration does not transfer or refund any old allocation.

Atomic admission validates every persisted identity's counts, separate operation
kinds, one outstanding operation globally, and an owned delivered initial source
before admitting a revision. One dispatch claim permits at most one Provider
dispatch. UNKNOWN keeps both quota and spending occupied and blocks further
paid work; no automatic paid retry is introduced. Revocation or expiry denies
dispatch. Reservations remain permanent, including after definitive failure.

Both payment feature flags must be absent or explicitly `false`; any enabled or
invalid flag denies this mode. Repeated reading/downloading must be implemented
separately as authenticated read operations, without spending admission.

The confirmed prior obligations are M2 USD5.05 and global USD95.05. With eight
new USD1 slots the totals would be USD13.05 / USD103.05. **The current M2 USD10
cap rejects that real configuration.** This candidate intentionally does not
raise it or misrepresent smaller synthetic test commitments as real history.
Any cap adjustment and real authority initialization remain pending precise
Owner approval. Global USD200 remains unchanged. Reservation is not a Provider
billing ceiling; the historical final invoice is not verified.

Offline fixtures use explicitly synthetic smaller prior commitments to exercise
valid paths. Actual Redis concurrency needs a separately authorized disposable
target; mocks/TypeScript results do not establish Redis atomicity. Personal
history/download and distinct superseded-versus-safety-revoked output eligibility
remain a separate integration slice; no old asset access gate is weakened here.

Validation for this local candidate: 9 Node contract tests passed; 11 focused
Playwright runtime/regression tests passed; 2 Redis cases skipped because no
authorized disposable target is configured. The new actual-Redis fixture covers
all eight slots, individual quotas, cross-owner source denial, duplicate dispatch,
UNKNOWN, revocation, start/end boundaries and independent concurrent connections.
Those assertions have not run against Redis. Full `npm run build` passed.

The existing private sixty-minute session/provisioning tools intentionally do
not create this new authority. A reviewed, separately authorized period setup
is still needed before activation. This is not a deployable acceptance PASS.
No USD0.25 reservation change is included: the existing Provider prompt check
uses character length (32,000), not a final 16,000 UTF8-byte pre-send bound.
Lowering software reservation needs that exact request-boundary gate plus
versioned pricing/usage reconciliation; it must not be inferred from samples.
