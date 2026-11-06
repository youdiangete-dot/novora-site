# Two-person shared-budget pilot — local candidate

Owner's November6 decision replaces the current pilot's fixed3+1 allowance with
free use of the existing sketch tools by two independently authenticated testers
for seven days, sharing an initial USD20 software budget. It does not authorize
automatic recharge, paid calls now, account fallback, public registration,
payments, invitation delivery or deployment. Future formal invitations with
daily3+1 limits are a separate proposed policy.

Set `NOVORA_INVITATION_TRIAL_SPENDING_MODE` to
`owner_shared_budget_seven_day_trial_v1` only at a separately approved activation.
It is off by default. The server requires the existing exact Preview project,
integration branch, source/deployment identity, two-entry hashed invitation
roster, stable receipt namespace, Queue capability, and both payment flags OFF.
`NOVORA_INVITATION_TRIAL_SPENDING_CONFIG` must match the exact new contract in
`tools/invitation-shared-budget-contract.cjs`. No client field selects this mode.

One permanently retained USD0.25 allocation is required before each initial or
revision operation. There are no per-person, per-day, per-Brief revision or
image-kind package counts. The USD20 aggregate therefore admits at most80
operations across both people in any mix. Retaining the full allocation after
settlement is conservative: trusted normalized usage may be much lower. It is
not a promise to consume USD20 on the vendor bill. No reservation is released
or historical liability erased to make further requests fit. An exhausted
budget denies new generation; existing authorized history/download access does
not require spending authority. Increasing the budget later requires an explicit
funding decision and a binding-preserving plan; never replace an occupied key
with an empty ledger.

The atomic Lua checks the complete authority, permanent TTL, Redis time,
immutable owner/request/Brief/fingerprint/kind/source, cumulative reservation,
and all previous outcomes. A pending/UNKNOWN operation stops both testers from
new dispatch. Unique operation claims, durable job CAS, Queue replay handling
and no automatic Provider retry are preserved. A revision requires that the same
owner's initial source was delivered and the persisted current-output lineage
and feedback binding still agree. The new server-selected mode skips package
purchase/entitlement requirements; it neither records a payment nor grants a
TEST package. Existing paid and legacy trial behavior remains separate.

Provider profile stays text-only GPT-image-2-2026-04-21, medium1024x1024, n1;
complete prompt<=16000 UTF8 bytes; one GPT-4.1-mini privacy check and moderation.
The existing internal USD0.10 image/USD0.03 privacy controls stay active.
Unexpected or untrusted usage is UNKNOWN and stops further work. USD0.25 and
USD20 are engineering allocations, not proven maxima of Provider billing.
The old USD5.05 M2/USD95.05 overall commitments remain; the new pilot's USD20
projects overallUSD115.05/200. The old modes' USD10 M2 cap is unchanged; the
Owner's new pilot allocation is separately bound and does not reset it.

OpenAI's current official spend-limit documentation provides monthly org/project
hard limits, returning429 when tracked spend reaches the limit. Enforcement can
lag and permit some overshoot. A monthly limit is not this pilot's lifetime
budget. Eligible Pro subscription API credits can cover Images API when claimed
in the API organization that owns the project's key. They expire with the
applicable billing cycle. Neither current ownership, balance/expiry, key/project
match nor enabled hard limits has been verified in this task. No secret was read.

Sources checked November6:

- https://developers.openai.com/api/docs/guides/spend-limits
- https://developers.openai.com/api/docs/guides/chatgpt-api-credits

The Windows browser tool stopped because it could not reliably establish the
current URL. No alternate UI or credential route was used. The minimum next
account step is to open the Owner's existing API organization's Billing/credit
and project Limits pages for read-only inspection, without showing API keys.
Confirm organization, remaining credits, expiration and monthly hard-limit state
before proposing an exact deployment-only credential connection. The current
client uses only its server-side OPENAI_API_KEY; source code does not prove
which account issued it. Existing credentials must not be assumed to belong to
the Owner or Taipei partner. No automatic multi-account fallback is implemented.

Local checks and exact hashes belong in the private task evidence. A local PASS
does not prove current account funds, deployed Redis/DB configuration, reachable
tester entry or full NOVORA commercial Production acceptance. Existing private
025 hosts remain pinned to old source/config and are not executable deployment
tools for this candidate. Exact release source, protected access/delivery,
November10 start time/timezone and approved account connection remain pending.
