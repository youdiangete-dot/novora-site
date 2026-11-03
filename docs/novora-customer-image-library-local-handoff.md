# Customer image library local candidate

Base: `23feabb9aa30dd62e01b6d559ed8d615abb2b375`. No live setup or release.

`/design/my-images` reuses the invitation verifier. Re-enter the existing own
invitation, then recover owned delivered images from durable scoped receipts;
the old tab/sessionStorage is not required. List responses contain only public
reference, output ID, generation time and current/history label. Every image and
download needs BOTH the current invitation and an existing signed 30-minute
brief-bound cookie. The browser obtains that cookie through an owned-reference
POST; no arbitrary subject UUID, public reference alone, or cookie alone grants
library access. The credential and PNG object URLs stay in page memory and are
cleared/revoked on identity change or unmount. No new account/auth framework.

Runtime requires `NOVORA_CUSTOMER_IMAGE_LIBRARY_ENABLED=true`, the existing
explicit stable trial receipt namespace/roster, private bucket and signing setup.
It does not create or renew generation authority or package rights. Generation
expiry is independent from image retention and from invitation/view access.
No image deletion or retention expiry is implemented or authorized here. Access
after the seven-day generation period needs an active invitation and a retained
deployment; this is not a promise of permanent service or backup.

Current assets retain their existing full current-lineage checks. A separate
history path admits only explicitly marked safe supersession and checks exact
owner/brief/output/job, persisted safety/privacy evidence, timestamps, deterministic
private object path, PNG hash/structure, private bucket and object metadata. It
reauthorizes after downloading before returning bytes. Unknown/revoked, failed or
privacy-unsafe outputs are denied. Historical display never makes an old output
current or grants a valid current feedback/confirmation/revision binding.

The new SQL candidate adds a nullable history state with NO backfill. The existing
atomic promotion RPC adds `superseded` to the validated old source in the same
transaction. A deferred trigger proves the successful successor. A later explicit
revocation/update of archived lifecycle fields marks it `withdrawn`; it cannot be
reactivated. Existing unclassified revoked outputs remain denied. No old rows are
rewritten or images removed. Independent local PostgreSQL role/trigger/race
validation has since passed (13 checks on PostgreSQL17.11; exact SQL hash
75fb36e7a7c69f77178538012f8778a15fe189d3c53745a3817254c4ea365157).
This used a compatible synthetic schema slice, not the deployed Supabase schema.
Online dependency/ACL/conflict checks and exact migration approval remain.
Never rerun the old G2 migration; apply only the separately reviewed new derivative.

Rollback: turn OFF the library feature, retain all columns/history/outputs and
ledgers, and use compatible product code. Do not drop populated history state or
roll back the promotion function in a way that silently reopens revoked assets.

Local integration includes B's six hash-verified spending-candidate files.
The header exposes `/design/my-images` only when the server library feature flag
is `true`, including on mobile. The new spending mode is selected inside the
existing beta-admission port: persisted initial brief -> reserve -> Queue ->
worker dispatch claim; revisions keep the existing owned source/entitlement
claim followed by the cost claim. No parallel generation path or quota store
was introduced. Both payment flags must remain absent/false in this mode.

The API/UI tests are local/injected; they are not online Supabase/Vercel proof.
No credentials, client PNG bytes, raw gate evidence, provider IDs or private paths
are returned in list JSON, logs or browser persistent storage.

Local checks: eight injected service/HTTP cases passed; one actual mobile-browser
case with injected API/PNG responses passed (375px, view, download, no credential
persistence, close/reopen/re-enter invitation). Targeted TypeScript with the
repository's non-strict policy and full Next production build passed. No unchanged
paid flow was repeated. The first local browser server overlapped the build and
did not become usable; only its verified process tree was stopped. The final
browser check ran after build completion in the supported local network context.
The test server exited when Playwright finished. Generated test-results are local
only and excluded from the source manifest. No dependency installation was needed.

P1 review correction: generation admission owns the 3+1 quota. Library listing
queries at most48 eligible output rows with an inner join to this exact owner's
scoped receipts. It never limits total receipts: a fourth rejected/no-output
submission cannot hide prior images. Each candidate and every individual session
or download rechecks the exact scope+identity+publicReference receipt separately
(limit2 to reject ambiguity). Output privacy, supersession and withdrawal rules
are unchanged; the SQL candidate is byte-identical. Added regression covers three
delivered receipts plus21 denied/no-output receipts, recovery/download of each
own image, and cross-user/unsafe/revoked denial. The prior mobile browser proof
is retained because the UI/HTTP contract did not change. Actual PostgREST nested
FK-join execution remains an isolated database validation dependency.

## Combined local validation and remaining activation dependencies

Focused library/service/HTTP checks: nine passed, including a valid stable
invitation recovering/downloading its own images while the expired spending
adapter denies generation. That expiry response is injected, not real Lua proof.
Four cross-module cases passed using the actual persisted-brief trigger, Queue
consumer and revision service with injected repository/HTTP/Provider fixtures:
day-three reservation, one initial dispatch despite Queue redelivery, actual
historical commitments denying admission, and immutable revision source plus
entitlement-before-cost claim with UNKNOWN blocking replacement. Network access
outside the injected HTTP port is forbidden by these fixtures. This is not an
actual eight-operation or real Redis test. Five new-mode runtime cases and six
legacy runtime cases passed; one new-mode and one legacy Redis case skipped
without an authorized disposable Redis target. Four new pure Node contract
cases passed. The mobile browser case passed again with navigation enabled.

The changed production module closure passes a targeted strict TypeScript check.
Two minimal null-narrowing corrections capture guarded asynchronous binding
values and recheck optional extended-lineage rows. No legacy Lua or safety gate
is changed. Expanding strict compilation through generation/revision test imports
still finds 13 baseline errors in `first-preview-generation-lifecycle.ts`
(missing return at263 and callback-narrowing errors at971/1007/1040-1058) and
`supabase-first-preview-customer-access.ts` (unknown/string at447). The repository
uses `strict:false`; do not describe this as full-repository strict PASS.

Current release preparation (2026-11-03): the selected candidate is the separate
USD0.25 profile described in `novora-seven-day-usd025-local-candidate.md`.
The following USD1 arithmetic remains a compatibility constraint, not the
selected trial's reservation or a request to raise a cap.

Activation dependencies:

- Actual prior commitments USD5.05/95.05 plus eight USD1 reservations require
  USD13.05/103.05. The existing M2 USD10 cap still denies that configuration.
  USD1 remains unchanged. The separate025 profile reserves USD2 for eight slots,
  producing USD7.05/97.05 under the unchanged USD10/200 caps. Neither profile
  implies funding approval, a refund, or a historical reset.
- The period ledger is never initialized by application requests. A reviewed
  durable provisioning/revocation/retention operator for this exact new mode is
  still required; the old60-minute tools are not a seven-day provisioner.
- Revisions still require a real persisted TEST entitlement. The existing
  `/api/test-image-packages` creation and protected Owner manual-confirmation
  service are OFF with `NOVORA_TEST_IMAGE_PACKAGES_ENABLED=false`, which this
  spending mode requires. New tester fixtures therefore cannot be provisioned
  through those HTTP routes in the running trial. No substitute grant path or
  weakened flag was added. A separately reviewed, explicitly synthetic setup
  mechanism and exact authorization are needed before release; no collection.
  A separate offline native-management SQL plan now reuses the existing RPCs
  for exactly two TEST fixtures; it is not a website endpoint, Owner-cookie
  substitute, execution grant or part of the public runtime release.
- The history SQL is not applied online. Its exact candidate passed13 local
  PostgreSQL checks, including ACLs, trigger rollback and promotion/revocation
  races. The025 Lua and contract passed124 actual local Redis assertions,
  including all eight slots, per-identity limits, independent concurrent
  reserve/dispatch connections, UNKNOWN/anomalous cost retention and expiry.
  The two isolated containers were removed with independent absence checks.
  Deployed Supabase compatibility and the nested PostgREST FK query remain
  unverified. No current test entry, real authority or tester grant was created.

Post-trial viewing works in the local authenticated application contract without
spending authority, while the invitation roster, namespace, signer, private
assets and serving deployment remain available. Removing the invitation denies
new and existing library access. There is no invitation TTL or automatic asset
deletion. Deployment lifetime and customer invitation handoff remain release
operations; no existing G4 runtime authority or budget is reused.

All candidate files remain uncommitted. No credentials, live DB/Redis/Provider,
payment, staging, publication or deployment actions were taken. Existing
Preview20 acceptance and historical ledgers remain unchanged.

A separately versioned, default-OFF USD0.25 candidate now exists; see
`novora-seven-day-usd025-local-candidate.md`. It does not change history code/SQL
or the USD1 policy above. Its eight new slots would fit the existing caps using
actual prior commitments, but no funding/activation is implied. It retains the
internal USD0.10 image limit and all remaining infrastructure/setup blockers.

Evidence recorded2026-11-03: local Redis result SHA256
699af732dfd0818619094676e2b69a7872e582a104448a56c8c7b01776adcbc7;
local PostgreSQL result SHA256
ca395e4b29d2b2f0f9e4a773ab4c325ef63c1ee667aa098c62dfec4af6a20124.
These supersede the earlier statements that the selected025 Lua and history
SQL were unexecuted locally. Earlier skipped Playwright Redis cases remain
skips in their original run; the later isolated evidence is separate proof.
