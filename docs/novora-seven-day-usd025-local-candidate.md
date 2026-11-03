# USD0.25 seven-day reservation candidate (local, default OFF)

This is an engineering allocation with accepted invoice uncertainty, not a
verified Provider hard billing cap. No budget, authority, entitlement, credential,
database or deployment is created by this candidate.

## Exact separate policy

- Mode: `owner_expected_cost_seven_day_trial_025_v1`.
- Cost policy: `novora_seven_day_usd025_utf8_16000_v1`.
- Outer pricing assumption:
  `novora_image2_5_30_privacy_04_16_usd025_assumption_20261103_v1`.
- Ledger: `novora:beta-admission:test-period-025:v1:<runtimeBinding>`.
- Configuration keeps the seven-day 6 initial /2 revision total and3+1 per
  identity, plus exact `costPolicyVersion` and `pricingAssumptionVersion`.
  `limitMicros=2000000`; each slot permanently reserves250000 microUSD.
  An example engineering estimate/buffer is100000/150000 microUSD per operation;
  neither is a prediction of the final bill. Estimates plus buffer must fit0.25.
- Actual prior commitments remain M2 USD5.05 and global USD95.05. Eight new0.25
  slots would produce USD7.05 /USD97.05 under unchanged USD10 /USD200 caps.
  This arithmetic is not funding approval and does not revalue/refund old rows.

The complete selection is bound to deployment, source, namespace, both invitation
identities/hashes, config digest, pricing and cost policy. Old USD1 modes, Lua,
configuration format, pricing calculations and history obligations are untouched.
An old authority cannot be read as a0.25 authority. No old key migration, ledger
reset, automatic quota restoration or credit from unused historical reservations.
The operator must account for prior liabilities and prevent duplicate funding;
an environment value alone is not proof of independent historic accounting.

The separate Lua retains exact owner/source/kind validation, each identity's3+1
cap, total6+2, Redis-TIME start/expiry, permanent ledger, one outstanding operation
globally and one dispatch claim. UNKNOWN retains the slot and blocks new work.
All validation precedes one final SET. Recorded known usage beyond0.13 is retained
as UNKNOWN even if it is below the0.25 allocation. Values above the allocation
are retained for conservative accounting; no retry or refund follows.

## Actual request and cost boundaries

The model remains `gpt-image-2-2026-04-21`, medium quality,1024x1024, n=1, PNG,
moderation=auto, text-only `/v1/images/generations`. No reference image, edits,
streaming, partial image, extra output or automatic paid retry. The exact full
prompt includes all fixed policy/footer text and complete serialized allowed
instruction. In this mode, it must fit **16000 UTF8 bytes**; no truncation,
summarization or Unicode normalization. Initial producer checks before cost
reservation; revision checks before job/entitlement reservation; Queue worker
checks again before cost dispatch; real HTTP adapter checks before fetch.
The old32000-character boundary remains unchanged in legacy modes.

Internal image usage calculation remains5 microUSD/text input token and30/image
output token, with the existing pricing version preserved on job records/logs.
The0.10 image limit,0.20 per-Brief image lifetime budget,0.03 privacy reservation
and0.06 per-Brief privacy limit are unchanged. Resolver checks these constants
against the new policy. A paid response with untrusted/zero usage, text usage
above16000 tokens or image cost above0.10 fails before further paid inspection.
It remains UNKNOWN, with a trusted image cost retained when inspection did not
run. No fabricated combined actual cost when inspection cost is uncertain.

Privacy remains one protected `gpt-4.1-mini-2025-04-14` inspection for the validated
1024x1024 PNG, high detail, <=12KiB text request, max2048 completion tokens.
The existing pre-send estimate allows4096 image-input tokens and uses0.40/1M
input and1.60/1M output. This is an engineering image-token allowance, not a
vendor guarantee. Actual untrusted/over0.03 usage fails closed; no reinspection.
Known combined successful pipeline accounting is at most0.13, leaving0.12 of
the outer allocation as engineering risk margin. Unconfirmed invoices, changed
pricing and exceptional Provider behavior can exceed that margin.

## Evidence and limitations

Official documentation checked2026-11-03:

- [GPT Image2 snapshot](https://developers.openai.com/api/docs/models/gpt-image-2)
  identifies the unchanged pinned model.
- [Official image guide](https://developers.openai.com/api/docs/guides/image-generation)
  estimates medium1024x1024 image output at USD0.053, with input costs additional.
- [Official matching token-rate note](https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst)
  states that its5/30 standard text-input/image-output rates match GPT Image2.
  This supports retaining the existing assumption; it does not change models.
- [GPT4.1-mini pricing](https://developers.openai.com/api/docs/models/gpt-4.1-mini)
  lists0.40/1.60 per million input/output tokens. Snapshot availability and final
  account invoices have not been queried.

Historical normalized operation usage0.062356 and0.062421 is observed evidence,
not an upper bound or bill. For ordinary similar prompts, roughly0.06-0.10 per
operation is a planning range only. At the conservative one-token-per-UTF8-byte
assumption, a full16K prompt alone could account for0.08 input, plus estimated
0.053 image output, exceeding the retained internal0.10 gate. Such cases can
consume a slot and fail safely after the request; the software does not promise
every16K input will succeed. There is no image-output max-token parameter in the
current fixed request. Exact vendor token counts/charges cannot be capped by the
response PNG dimensions or the software reserve.

The minimal compatible next adjustment, if long multilingual prompts must
succeed, is a separately reviewed/approved versioned internal image-attempt and
per-Brief lifetime-cost contract plus persistence/SQL compatibility verification.
This candidate does **not** silently raise the0.10 gate or alter legacy pricing.
It is practical for the already observed smaller examples; no new paid example
was run and reliability for worst-case prompts remains unproved.

Offline tests cover16000/16001 exact final bytes with ASCII, CJK, emoji and
combining marks; final HTTP shape and no oversized send; actual Queue preflight;
revision preflight/entitlement/cost order and UNKNOWN; anomalous known image
usage; config/metadata tampering; unchanged USD1 profile and Provider regressions.
Those injected fixtures did not execute Lua. Later actual isolated Redis8.10.1
validation passed124 assertions against this exact Lua and contract, including
eight slots, per-identity3+1, twelve independent reserve racers/one winner,
twelve dispatch racers/one claim, UNKNOWN/anomaly retention, expiry/revocation
and rejection of legacyUSD1 metadata. Source SHA256
8fe58c35c29055a9a0ebf3ddd0c5e5ac8464cb8440ef2601a40c3079c0cc2687;
contract SHA256
8be734ed0806885c217a70e6486e18cd787929fd0a9836cfe9a39ee10f3d8666;
result SHA256
699af732dfd0818619094676e2b69a7872e582a104448a56c8c7b01776adcbc7.
No online Redis, real spending authority, credentials or Provider was used.

The existing entitlement setup problem remains: payment flags are OFF, so no
running HTTP package creation/manual-confirmation route is available to seed new
testers. A separate private offline native-management SQL plan reuses the
existing create/grant RPCs for exactly two TEST fixtures; it adds no website
route or permission. Its actual connection role, exact real plan/hash,
supported Owner approval and one-shot execution/readback remain release steps.
The history migration passed13 actual local PostgreSQL17.11 checks, including
ACLs and races; exact SQL hash
75fb36e7a7c69f77178538012f8778a15fe189d3c53745a3817254c4ea365157,
result hash ca395e4b29d2b2f0f9e4a773ab4c325ef63c1ee667aa098c62dfec4af6a20124.
That compatible synthetic schema slice does not prove deployed Supabase schema
compatibility or the PostgREST FK-embedding query. Exact online migration,
protected test entry, invitation delivery and release authority still remain.
Previous Preview20 PASS is preserved; it is not proof of this new cost policy.

Local verification:10 new-profile/cross-module cases passed; the30 legacy
Provider-adapter,9 history and11 USD1/sixty-minute runtime cases passed in the
broader run and remain valid. Two actual-Redis cases were skipped without an
authorized disposable target. Three new Node policy cases and four existing
period cases passed. Those earlier skips are retained; the subsequent124
actual Redis assertions above supersede the local-execution gap for this profile.
The Redis and PostgreSQL test containers were stopped and independently
verified removed; no existing resources or historical ledgers were changed.
An initial fixture assertion referenced a nonexistent
dispatch timestamp; it was corrected to the real job cost/request-ID fields,
then that test and the final10-case set passed. Full production build passed.
The unchanged mobile-browser UI test remains PASS; no paid flow was repeated.

Strict checking of the new contract/admission/provider module closure passed.
Expanded generation/revision strict checking retains13 baseline errors: lifecycle
missing-return/callback-narrowing errors (now265,986,1022,1055-1073) and existing
customer-access unknown/string assignment at447. Repository build uses its
existing non-strict setting. No full-repository strict PASS is claimed.

Rollback selects the previous product/config with its original funded ledger,
after explicitly revoking the new authority; retain all new/old ledger history.
Never reinterpret low-reserve rows as old USD1 funded rights or leave two funded
deployments active. Image history code/SQL and read access have not changed.

## Publication and external tester access (preparation only)

`vercel.json` disables Git auto-deployment only for the exact new publication
branch `codex/customer-image-history-v1`, in addition to the unchanged existing
disabled branches. No wildcard, build command, Queue trigger or Production
branch setting changes. Publishing this branch and merging integration do not
authorize a deployment. Manual creation still needs its exact release grant.
[Official Git configuration](https://vercel.com/docs/project-configuration/git-configuration#gitdeploymentenabled).

Read-only project metadata checked2026-11-03 for the existing project-dd34e:
Vercel Authentication enabled (`all_except_custom_domains`); Password Protection
disabled; Trusted IPs disabled with zero addresses. The metadata did not expose
the current billing plan or account-wide share-link quota. No environment values,
credentials, access grants, sharing links or protection settings were changed.

The smallest plan-independent candidate is ONE revocable Shareable Link for the
exact approved commit deployment, with an explicitly approved expiry and no
project-wide protection disable. Each tester must still enter their distinct
application invitation; sharing the platform link never grants receipt/image
ownership. Treat the link as a bearer access capability: forwarding leaks access
to the site's protected surface, although application ownership checks remain.
Do not put it in source, public documentation, logs or a public issue. Verify it
in an ordinary browser without operator OIDC before declaring the entry usable.
[Official Shareable Links](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/sharable-links).

The feature has no additional Deployment Protection charge on any plan; Hobby
has one share-link allowance per account, whose availability is NOT established
by the project metadata. No paid upgrade or replacement of an existing link is
authorized. Normal hosting/storage/request and Provider charges remain separate.
[Official protection pricing](https://vercel.com/docs/deployment-protection/usage-and-pricing).
Two individually granted external collaborators are an alternative if the
existing plan supports them; Hobby allows only one. This does not require adding
testers to the team, but requires their confirmed identities and exact access
approval; do not send unsolicited platform invitation emails.
[Official deployment sharing](https://vercel.com/docs/deployments/sharing-deployments).

Proposed browser entry: open the privately delivered exact-deployment share link
first, then `/design/start` -> `/design/concept` -> `/design/brief` (own invitation)
-> persisted receipt -> current preview/feedback/revision/direction confirmation.
Return via `/design/my-images`, re-enter the same invitation, view/download old
safe versions. Use canonical unprefixed paths; no operator credential is handed
to testers. No live URL or successful external-tester access exists yet.

Generation expires after seven days by Redis TIME. Keep the same deployment,
namespace, roster, signer and storage for the separately agreed viewing period;
expiring a platform share link can stop viewing without deleting images. The
Owner must approve that period/link expiry and later revocation. Do not run the
old G4 executor unchanged: its60-minute timer deletes the deployment. Retain all
ledger history; neither seven-day expiry nor browser closure deletes images.
