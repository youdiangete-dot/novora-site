# NOVORA Current Project State

## 1. Purpose

This document is the durable NOVORA project state ledger and the first file to
read before each new agent, stage, or implementation slice.

It exists because ChatGPT memory can become full, incomplete, or unavailable across future work sessions. GitHub documentation on `main` should be treated as the source of truth over chat memory whenever there is a conflict.

When chat memory, older local notes, detached worktree state, or assumptions
from previous conversations conflict with this ledger and the current GitHub
`main` branch, this ledger and current `main` win.

## Current Locked Product Direction

### Current implemented Production state

- Production does not have a real AI image-generation API.
- `/design/preview/[public_reference]` remains mock-only.
- The submitted-page preview entry remains a demo/mock connection.
- No real generated customer preview is currently live.
- The target direction below is a locked product decision, not evidence of
  completed implementation or deployment.

### Locked target MVP direction

After a customer's Concept Brief is successfully persisted, NOVORA should
automatically begin generating the first AI hand-drawn concept sketch. Once the
first result is generated and passes the required automatic safety, privacy,
access-control, output-validity, and safe-failure gates, it becomes immediately
visible on the customer's securely accessed website preview page without
waiting for per-image human pre-approval.

The mandatory automatic gates include:

- Confirmed Concept Brief persistence and a valid `publicReference`.
- A secure customer access mechanism.
- Valid generation-job and generated-output lifecycle states.
- A valid generated image or output asset.
- No exposure of provider metadata, internal prompts, reviewer/admin notes,
  secrets, or private storage paths.
- Passed content-safety, privacy, and access-control checks.
- Safe timeout, failure, and invalid-output handling.
- No false-success customer-visible state.

These automatic gates are not comprehensive human pre-review. Human
intervention remains required after the first preview for structural logic,
gemstone orientation and stacking/composition, jewelry construction,
manufacturability, correction of infeasible or misleading details, style
correction, customer-feedback interpretation, redraw/regeneration, and formal
downstream communication and decisions.

`first_preview_ready` is only the first customer-visible concept-preview
lifecycle. It is not `approved_for_customer`, `approved_for_gallery`, CAD
approval, quotation approval, payment confirmation, order approval, or
production approval. `approved_for_customer` may remain relevant for later
formal, human-approved customer-safe materials or downstream communication, but
it is not a prerequisite for the first concept preview. `approved_for_gallery`
remains a separate consent and publication decision.

The first AI sketch remains an early concept preview only. It is not CAD, a
quotation, payment confirmation, order approval, production approval, or a
manufacturability guarantee. CAD, quotation, payment, order, and production
confirmation remain offline and human-controlled.

This post-Agent-60I direction supersedes former forward-looking rules that kept
the first AI concept sketch internal-only, required human approval before first
customer visibility, or limited customer delivery to email. Historical records
of those earlier rules remain preserved below as transition-era context and
must not be used as the current operating direction.

## 2. Current Production Baseline

- Domain: `novora.design` / `www.novora.design`
- Hosting: Vercel project `project-dd34e`
- Deployment baseline: the `main` branch deploys to Production
- Verified GitHub `main` baseline at the start of Agent 70B-2: Agent 70B-1 /
  PR #197 normal merge commit
  `e77d2e6267f78ecf1109198ae100149eb8e466e4`.
- GitHub `main` includes the Agent 68A provider-neutral, server-only first-preview
  runtime foundation, the Agent 69A First Preview Product Contract v1, and the
  Agent 69B reuse-first data-model and candidate SQL plan. It also includes the
  merged Agent 69C OpenAI GPT Image 2 provider, privacy, safety-evidence, cost,
  retry, and rate-limit decision. It also includes the merged Agent 70A
  server-only, dependency-injected OpenAI GPT Image 2 adapter foundation. Real
  provider client construction/configuration/calls, persistent preview
  lifecycle, private generated-asset delivery, secure customer access, and
  customer route wiring remain unimplemented.
- Supabase project: `novora-production`
- Resend sending domain: `notify.novora.design`
- Admin email notification sender: `NOVORA <briefs@notify.novora.design>`

Do not include API keys, service role keys, admin access keys, provider tokens, or raw environment variable values in this document or future project-state ledger updates.

## 3. Core Completed Product Flow

- `/design/concept` collects guided design intake for a concept direction.
- `/design/brief` persists real Concept Brief submissions to Supabase.
- `/design/submitted` shows customer confirmation after submission.
- Final reference upload on `/design/brief` saves uploaded files to Supabase Storage and stores reference metadata in Supabase.
- `/admin/briefs` is protected by an admin access key and shows Supabase-backed submissions.
- `/admin/briefs/[publicReference]` shows protected submission detail.
- The protected Open reference route can open uploaded reference images.

## 4. Current Supabase Data And Storage State

Current Supabase tables:

- `concept_briefs` exists and stores real Concept Brief rows.
- `concept_brief_contacts` exists and stores contact rows.
- `concept_brief_reference_assets` exists and stores uploaded reference metadata.
- `admin_notes` exists and persists admin review status and internal notes.
- `concept_brief_notification_events` exists as of the Agent 24B-2 SQL execution.

Current Supabase Storage buckets:

- `novora-reference-images`
- `novora-ai-sketches`

The `concept_brief_notification_events` table has RLS enabled, a unique delivery index for durable notification idempotency, no `anon` or `authenticated` grants, and service-role-only `SELECT`, `INSERT`, and `UPDATE` access.

## 5. Current Email Notification State

Agent 23A added admin notification plumbing.

Agent 23B verified the real Resend/Gmail email flow:

- no-image submission works
- one-image submission works
- the email includes the protected admin detail link
- image count is correct
- protected admin detail and Open reference work

Agent 24B-3 PR #62 was merged and adds the app-side durable idempotency guard:

- reserve before calling Resend
- normalize recipient email
- skip duplicates on Postgres `23505` unique violation
- mark notification events as `sent` or `failed`
- keep customer submission non-blocking

Agent 24D completed controlled Production idempotency verification after PR #62:

- one real test Concept Brief submission sent exactly one admin email
- repeating the admin notification route for the same `conceptBriefId` and `publicReference` did not send a second email
- the notification route returned the expected non-blocking duplicate/skipped result on repeat call
- Supabase contained one notification event row for the Concept Brief, notification type, and normalized recipient
- no new schema or SQL change was required during verification

PR #74 fixed an overly aggressive `/design/brief` client-side Concept Brief
submit timeout that could abort before a successful persisted response reached
the browser and thereby skip admin notification. Production smoke verification
after merge passed for test submission `NOVORA-CB-20260526-NWD8` (`Agent 26E-3D
Timeout Fix Smoke Test`): `/design/submitted` showed success, Gmail received the
admin notification email, and Supabase read-only verification found a
`concept_brief_notification_events` row with notification type
`admin_concept_brief_submitted`, status `sent`, and a Resend message id present.
This verification does not mean full public API abuse-control or rate-limit
provider enforcement is active.

PR #78 fixed Preview rate-limit enforcement and client-side 429 handling after
the rate-limit helper could increment Redis and then fail while interpreting the
Redis REST/EVAL response. Because the provider-error path failed open,
`/api/concept-briefs` could continue to Supabase persistence and return `201`
after the email counter exceeded the limit. The minimal patch made
`lib/server/public-api-rate-limit.ts` return and parse deterministic scalar
`count:ttl` output while keeping array compatibility, and updated
`app/design/brief/page.tsx` so intentional `429` responses keep the customer on
`/design/brief`, show a safe retry message, and do not fall through to local
submitted success. The focused Playwright regression
`keeps the customer on the brief page when the API returns rate limited`,
`npm.cmd run build`, `git diff --check`, and GitHub PR checks all passed before
merge.

Manual Preview verification after PR #78 merged passed on a Vercel Preview URL
under `project-dd34e-git-codex-preview-rate-limit-...vercel.app`, not
Production `novora.design`. Repeated synthetic submissions used
`preview-rate-limit-test@example.com`; the earlier Redis window had expired, the
email counter restarted, Upstash Data Browser first showed the email key value
`2` with active TTL, and additional same-email submissions succeeded until the
limit was reached. The over-limit submission `Preview Rate Limit Fix Test 12`
stayed on `/design/brief` instead of navigating to success, and the UI displayed
`Too many Concept Brief submission attempts.` followed by
`Please wait a few minutes before trying again.` Upstash then showed the email
key value `8` with about `14m 30s` TTL remaining. This confirms Preview calls
Upstash, the email counter exceeds the limit, intentional `429` handling is
user-safe, and the previous false-success behavior is fixed. Production
environment variables were not changed, Upstash settings were not changed,
Supabase/SQL/Resend/Cloudflare were not changed, and no real email was sent
during this verification.

PR #80 added the Production rate-limit enablement decision packet. PR #81 added
readiness notes that Production provider preflight must check both the Upstash
and alternate KV variable families, and that accepted Production browser
verification attempts can create real Supabase rows and admin notification
emails. Agent 26E-5C recorded the MVP-stage business decision to defer the
Upstash paid upgrade and Production Redis creation for now. Production remains
fail-open for rate-limit enforcement. Do not reuse
`novora-preview-rate-limit` for Production. Option C remains the
commercial-standard target before formal commercial launch, paid traffic,
larger social traffic, or increased real customer submissions: create a
Production-dedicated Upstash Redis resource that is separate from Preview and
does not share a Preview/Production keyspace. Revisit this before any
TikTok/Instagram formal traffic push, paid ads, increased real customer
submission volume, spam/fake/repeated submissions, admin notification noise, or
payment/order/account Production workflow. No payment method, Vercel
environment, Upstash/provider, deploy, or Production test action was performed
for this decision.

PR #84 tightened the customer-facing submission success gate. Received or
submitted confirmation now requires confirmed server persistence, a valid
customer-visible `publicReference`, and a valid Concept Brief UUID.
`persisted: false`, unconfirmed server responses, and legacy local-only records
must not imply that NOVORA received a brief. Intentional `429` responses still
keep the customer on `/design/brief` with safe retry messaging. No new
Production smoke verification was performed for that PR #84 ledger note.

PR #85 merged the repo-local customer submission integrity and Codex learning-loop
skills into `main`. Agent 28B then completed exactly one synthetic no-image
Production smoke submission after PR #84 and PR #85:

- Submission `NOVORA-CB-20260602-CLJR` returned `201`, `persisted: true`, a
  valid customer-visible public reference, and a valid Concept Brief UUID.
- The customer reached `/design/submitted`, which displayed `Concept brief
  received` only after the confirmed persisted response.
- The normal admin notification email was passively confirmed in Gmail for
  `NOVORA-CB-20260602-CLJR`; no resend or manual notification trigger was used.
- Protected `/admin/briefs` list visibility and
  `/admin/briefs/NOVORA-CB-20260602-CLJR` detail visibility were not confirmed
  in this run because the isolated verification browser reached the admin
  access-key gate and no admin key was touched or supplied. No review status or
  internal note was changed.

Agent 28B made no SQL, environment-variable, provider, secret, deployment,
payment, authentication, CAD, order, or AI-generation change. Production
rate-limit provider enforcement remains deferred unless separately approved.

Agent 28C completed controlled authenticated read-only Production admin
verification for the existing smoke brief `NOVORA-CB-20260602-CLJR`. The user
manually entered the admin access key in the browser UI only. The key was not
recorded, echoed, inferred, stored, exposed, committed, or included in docs.

- Protected `/admin/briefs` list visibility was confirmed. The row was labeled
  as a Supabase submission and showed customer `Agent 28B Production Smoke
  Test`, email `agent28b-production-smoke@example.com`, and piece type `Ring`.
- Protected `/admin/briefs/NOVORA-CB-20260602-CLJR` detail visibility was
  confirmed. The public reference matched and the Supabase-backed detail showed
  source `api`.
- The visible contact summary matched the Agent 28B synthetic smoke data:
  customer `Agent 28B Production Smoke Test`, email
  `agent28b-production-smoke@example.com`. A reference-image count was not
  reported as visible during this verification.
- The read-only admin notification status was visible as
  `admin_concept_brief_submitted` / `sent` to the configured admin inbox. The
  page stated that it does not retry, resend, or update notifications. No resend
  or manual notification trigger was used.
- No admin review status, internal note, customer data, app code, test, package,
  SQL, environment variable, provider, secret, deployment, payment,
  authentication, CAD, order, or AI-generation change was made. No new
  Production submission was performed. Production rate-limit provider
  enforcement remains deferred unless separately approved.

## 6. Recent Agent History

- Agent 22: reference image upload completed.
- Agent 22.5: clarified planning-only reference selection versus final upload UX.
- Agent 23A: admin notification code plumbing merged in PR #59.
- Agent 23B: Resend, Cloudflare, and Vercel environment setup verified end-to-end.
- Agent 24A: duplicate-email risk inspection completed.
- Agent 24B-1: PR #60 docs-only idempotency plan merged.
- Agent 24B-2: PR #61 docs-only SQL packet merged; manual Supabase SQL was executed and verified later.
- Agent 24B-3: PR #62 app idempotency guard merged.
- Agent 24D: controlled Production idempotency verification completed and recorded in this ledger.
- Agent 25A: admin notification status display completed and merged in PR #65.
- Agent 26H: production security and operations runbook added in
  `docs/novora-production-security-runbook.md`.
- Agent 26E-1: docs-only public API rate limit and bot protection architecture
  plan added in `docs/novora-public-api-rate-limit-bot-protection-plan.md`.
- Agent 26E-2: docs-only API abuse-control provider and environment decision
  packet added in
  `docs/novora-api-abuse-control-provider-env-decision.md`.
- Agent 26E-3E: docs-only ledger update recorded PR #74 Production smoke
  verification for `NOVORA-CB-20260526-NWD8`, including Gmail admin
  notification receipt and Supabase notification event status `sent`.
- Agent 26E-4D: docs-only ledger update recorded PR #78 merge and manual
  Preview verification for rate-limit enforcement and safe `429` handling.
- Agent 26E-5A: docs-only Production rate-limit enablement decision packet
  prepared in
  `docs/novora-production-rate-limit-enablement-decision.md`.
- Agent 26E-5C: docs-only MVP-stage decision recorded to defer Upstash paid
  upgrade and Production Redis creation, keep Production rate-limit fail-open
  for now, avoid reusing `novora-preview-rate-limit` for Production, and revisit
  Option C before formal commercial launch, paid traffic, larger social traffic,
  or increased real customer submissions.
- Agent 27C: PR #84 tightened customer submission success so only confirmed
  persisted briefs with a valid public reference and Concept Brief UUID show
  received/submitted confirmation, while safe `429` handling remains unchanged.
- Agent 28A: PR #85 merged the docs-only project-quality foundation with
  reusable customer submission integrity and Codex learning-loop skills.
- Agent 28B: completed one controlled synthetic no-image Production smoke
  submission for `NOVORA-CB-20260602-CLJR`; confirmed persisted customer receipt
  and passive admin email delivery, while protected admin list/detail visibility
  remained unconfirmed because no admin access key was touched or supplied.
- Agent 28C: completed controlled authenticated read-only Production admin
  verification for `NOVORA-CB-20260602-CLJR`; confirmed protected list/detail
  visibility and visible Supabase-backed detail without changing admin status,
  notes, customer data, or notification state.
- Agent 29A: added `docs/novora-mvp-launch-readiness-checklist.md`, a docs-only
  objective checklist for quiet owner-controlled MVP testing, broader-traffic
  blockers, explicit deferrals, risk review, owner decisions, and recommended
  next Agents. This does not approve launch or commercial readiness. Production
  rate-limit provider enforcement remains deferred.
- Agent 29B: added `docs/novora-public-launch-copy-boundary-audit.md`, a
  docs-only source-copy audit for public launch wording around mock-only AI
  sketch preview, CAD, pricing, manual follow-up, Concept Brief receipt,
  reference uploads, production, payment, and order tracking. No app copy was
  changed. This does not approve launch, commercial readiness, or any
  Production operation.
- Agent 29C: implemented the five P0 public-copy boundary fixes from the Agent
  29B audit across the homepage, carousel, global navigation, design-start
  entry, core Concept Brief flow, submitted-page preview action, and public
  future-workflow demo. The copy now frames the current online experience as
  guided Concept Brief intake, studio review, personal follow-up, illustrative
  previews, and separately discussed offline CAD and quotation review. This
  does not approve launch or commercial readiness, and it does not add AI
  generation, CAD automation, payment, customer accounts, order tracking,
  production workflows, or Production rate-limit provider enforcement.
  Agent 29C follow-up also reframed the public CAD page as a later manual studio
  process, replaced customer-facing `admin review` upload wording, softened the
  submitted-page next-step heading, and repaired the public header anchor. This
  follow-up still does not add AI, CAD, payment, account, order, tracking, or
  production behavior.
- Agent 29D: added `docs/novora-privacy-terms-data-handling-copy-plan.md`, a
  docs-only Privacy / Terms / Data Handling copy plan for owner/legal review
  before broader public traffic. It inventories current Concept Brief contact
  data, design preferences, final reference uploads, upload metadata, admin
  review state, notification event metadata, and browser storage; recommends
  planning-only Privacy/Terms sections, short future notice snippets, risk
  topics, owner decisions, and next Agents. This is not legal advice, does not
  create final legal text, does not publish Privacy or Terms pages, does not
  approve launch or commercial readiness, and does not claim payment, auth,
  CAD, order, or real AI-generation behavior exists.
- Agent 29E: added minimal customer-facing privacy/contact/upload notice copy in
  the existing Concept Brief flow. `/design/brief` now gives concise contact
  use, sensitive-note, final-reference upload, upload-rights, and submit
  acknowledgement guidance; `/design/submitted` now aligns the receipt note with
  studio review and contact follow-up. This does not create final Privacy or
  Terms pages, does not add legal compliance claims, and does not approve launch
  or commercial readiness.
- Agent 29F: added draft review-only pages at `/legal/privacy-draft` and
  `/legal/terms-draft` for owner/legal review. These pages are visibly labeled
  as draft, not final legal text, and not legal advice. No final Privacy or Terms
  pages were published, no footer/header legal links or legal acceptance
  checkboxes were added, and no legal compliance, launch approval, or commercial
  readiness is claimed. No Production, protected admin, SQL, Supabase, Vercel
  environment, provider, secret, email, deploy, backend, payment, auth, CAD,
  order, or AI-generation action occurred.
- Agent 29G: added `docs/novora-retention-admin-privacy-sop-plan.md`, a
  docs-only draft operating direction and manual SOP proposal for data
  retention planning, privacy requests, admin handling, reference image
  handling, internal notes, admin notification privacy, incident planning,
  future partner sharing, risks, and owner decisions. This is not legal advice,
  does not implement deletion/export/correction workflows, does not publish
  final Privacy or Terms pages, does not claim legal compliance, launch
  approval, or commercial readiness, and did not involve Production, protected
  admin access, SQL, Supabase, Vercel environment, provider, secret, email,
  deploy, app, test, package, backend, payment, auth, CAD, order,
  AI-generation, or real customer-data action.
- Agent 29H: added `docs/novora-owner-privacy-retention-decision-packet.md`, a
  docs-only owner decision packet that turns the Agent 29D, 29F, and 29G
  privacy/retention/legal planning into owner choices, recommended cautious MVP
  defaults, a fill-in decision form, launch implications, risk register, and
  future Agent sequence. This does not make owner decisions, does not implement
  retention/deletion/export/correction workflows, does not publish final Privacy
  or Terms pages, does not add footer/header legal links or checkbox behavior,
  does not claim legal compliance, launch approval, or commercial readiness, and
  did not involve Production, protected admin access, SQL, Supabase, Vercel
  environment, provider, secret, email, deploy, app, test, package, backend,
  payment, auth, CAD, order, AI-generation, or real customer-data action.
- Agent 29I: recorded owner-selected MVP privacy/retention defaults in
  `docs/novora-owner-privacy-retention-decision-packet.md`. The owner selected
  `privacy@novora.design` as the public privacy contact email and recorded that
  Cloudflare Email Routing is enabled and tested to `youdiangete@gmail.com` as
  receive-only MVP forwarding, not a website login, full mailbox login, or
  outgoing mail setup. Agent 29I also recorded the 180-day manual review window
  for unresponsive submitted briefs, original submitted email plus public
  reference as privacy request verification, reference image removal with manual
  review for CAD/quotation/production-stage cases, and future AI use limited to
  the customer's current project AI sketch/concept review when that feature
  exists or is approved, with no model training, public datasets, or general
  model improvement unless separately approved and disclosed. This does not
  publish final Privacy or Terms pages, does not claim legal compliance, does
  not implement backend retention/deletion/export/correction workflow, and did
  not involve Production, protected admin access, customer-data inspection, SQL,
  Supabase, Vercel environment, provider, secret, email, deploy, app, test,
  package, backend, payment, auth, CAD, order, or AI-generation changes.
- Agent 30A: added
  `docs/novora-partner-preview-quiet-mvp-testing-checklist.md`, a docs-only
  checklist for owner-controlled partner preview testing with trusted industry
  reviewers. It covers partner scope, synthetic-data tester rules, current
  public flow review, unavailable/manual capabilities, owner pre-test checks, a
  suggested testing script, a feedback template, invitation draft, test-data
  handling notes, launch-readiness implications, risks, and next Agents. This
  does not claim partner preview has happened, does not approve public launch or
  commercial readiness, does not publish final Privacy or Terms pages, and did
  not involve Production, protected admin access, customer-data inspection, SQL,
  Supabase, Vercel environment, provider, secret, email, deploy, app, test,
  package, backend, payment, auth, CAD, order, or AI-generation changes.
- Agent 31A: added
  `docs/novora-ai-sketch-generation-mvp-implementation-plan.md`, a docs-only
  implementation packet for the first real AI sketch generation MVP. The
  recommended direction is admin-triggered generation first, using persisted
  Concept Brief data and optional final reference images, storing output in
  private Supabase Storage, and showing `/design/sketch` real output only after
  approved customer-visible output exists. This was planning only. No real AI
  generation was implemented, and no API key, environment variable, provider,
  SQL, Supabase schema/RLS/grant/policy/storage, Production, protected admin,
  email, deploy, app, test, package, payment, auth, CAD, order, or customer-data
  action occurred.
- Agent 31B: added
  `docs/novora-ai-sketch-whitelist-credits-payment-strategy.md`, a docs-only
  owner strategy packet for AI sketch whitelist testing, staged customer
  direction/refinement flow, prepaid credits, manual-to-formal payment strategy,
  future account requirements, guardrails, risks, and owner decisions. Agent 31B
  also cross-referenced this strategy from the Agent 31A AI sketch generation
  implementation plan. This was planning only. No real AI generation or real
  payment happened, and no app code, test, package, authentication, payment,
  provider, API key, Vercel environment, SQL, Supabase schema/RLS/grant/policy
  or storage, Production, protected admin, customer submission, email, deploy,
  CAD, order, or customer-data action occurred.
- Agent 31C: added
  `docs/novora-auth-whitelist-credits-payment-schema-plan.md`, a docs-only
  schema and permission planning packet for future customer accounts, whitelist
  access, trial quotas, credit balances, credit ledger, payment records, paid
  final sketch packages, AI sketch ownership, customer selection/refinement
  events, RLS/security boundaries, admin operations, and future implementation
  sequencing. This was planning only. No SQL, auth, payment, app code, API
  provider, API key, Vercel environment, Supabase schema/RLS/grant/policy or
  storage, Production, protected admin, customer submission, email, deploy, CAD,
  order, AI-generation, or customer-data action occurred.
- Agent 31D: added
  `docs/novora-auth-whitelist-credits-payment-sql-packet.md`, a docs-only
  review packet with draft SQL text for future customer profiles, whitelist test
  users, trial quotas, credit accounts, credit ledger entries, provider-neutral
  payment records, paid final sketch package orders, AI sketch ownership
  records, admin audit events, RLS/grant planning, migration sequencing, and
  risk review. No SQL was executed. No Supabase, RLS, grants, policies, storage,
  auth/login, payment provider, app code, test, package, environment variable,
  secret, Production, deploy, email, AI generation, CAD/order, protected admin,
  real submission, or customer-data operation was performed. Recommended next
  step after review: approve or revise the SQL packet, then open a separate
  future task for auth-model selection and live-schema verification before any
  migration or implementation work.
- Agent 31D Review Pass: PR #102 is still draft and unmerged at the time of
  this review pass. The pass kept the work docs-only and tightened the SQL
  packet around free-test cost estimates, optional table assumptions, retry and
  failed-generation risk, and the future-only implementation boundary. No SQL
  was executed. No Supabase, RLS, grants, policies, storage, auth/login, payment
  provider, app code, test, package, environment variable, secret, Production,
  deploy, email, AI generation, CAD/order, protected admin, real submission, or
  customer-data operation was performed. Recommended next step remains review of
  PR #102, not implementation.
- Agent 33A: recorded the newer task context that PR #102 has since been merged
  and cleaned up, and that PR #103 has been merged and cleaned up. PR #103
  removed the homepage Hero "See how it works" secondary CTA, leaving only
  "Start your design"; the post-PR #103 Production smoke check passed:
  `https://novora.design` redirected to `https://www.novora.design/`, "Start
  your design" was visible and linked to `/design/start`, "See how it works"
  was absent, and no obvious desktop Hero layout issue was seen. Agent 33A added
  `docs/novora-ai-sketch-api-cost-gallery-plan.md`, a docs-only plan for future
  AI sketch API parameter locking, cost-control, pricing-change safety, points
  relationship, whitelist caps, admin-reviewed gallery approval, and the planned
  public gallery API shape. Agent 33A Review Pass verified PR #104 was still
  draft, open, and unmerged at the time of review. No OpenAI API was called. No
  real image generation happened. No SQL, Supabase, storage, RLS, auth/login,
  payment/provider logic, points deduction, app code, tests, package files,
  Vercel env, secrets, Production/admin access, submissions, email, deploy,
  CAD/order/production, or customer-data operation was performed. Recommended
  next step after review: choose a separate docs/mock-gallery/API-design slice
  without starting implementation from this entry alone.
- Agent 35A: recorded that PR #105 and PR #106 were merged. PR #105 merge
  commit `6602ccd8cf1fd6650ff6672c88ef58867d727415` made the curated mock
  sketch gallery UI live, post-merge cleanup completed, and the Production
  public-page smoke check passed. The homepage Hero still showed
  `Start your design` linking to `/design/start`, `See how it works` remained
  absent, and the curated gallery was visible after the Hero. Public/customer
  route checks for `/design/start`, `/design/concept`, `/design/brief`,
  `/design/submitted`, and `/design/sketch` did not expose internal AI sketch
  review workflow text. The gallery copy framed previews as mock/concept-only
  and separate from CAD, quotation, order, or production approval. `/admin` was
  not accessed, no forms were submitted, and no high-risk action was performed
  during that public smoke check. PR #106 merge commit
  `87e02d574ca30c98f6285261fa9f8bccf1e50e16` added the static, skeleton-only,
  admin-only AI Sketch Review Workflow module to the protected admin brief
  detail page. The module has default status `Internal draft not generated`,
  empty state `No internal sketch drafts yet.`, and admin status labels
  `Internal draft not generated`, `Draft generated - internal only`,
  `Needs revision`, and `Approved for customer`. Its internal-only guidance
  states that AI sketches are internal drafts until reviewed and approved, and
  that customers must only see sketches approved by the NOVORA design team. PR
  #106 did not implement OpenAI API calls, image generation or storage,
  Supabase persistence, or customer-facing sketch display. PR #106 cleanup was
  completed as far as safety rules allowed: `main` was clean, the remote branch
  was deleted, worktree registration was removed after targeted cleanup,
  filesystem residue remained at `2aaf`, and a prior local feature branch
  deletion attempt hit permission denied. Agent 35A then added
  `docs/novora-admin-ai-sketch-review-workflow-state-plan.md`, a docs-only plan
  for future persistence and state management of the admin workflow. PR #107
  merge commit `23515e45e6a37db75d8af71550bceb395d489387` has since been
  merged and cleaned up. The PR #107 plan records that unreviewed GPT/AI drafts
  must never be shown directly to customers, `approved_for_customer` does not
  equal `approved_for_gallery`, AI generation success alone must not approve a
  sketch, and customer visibility must be gated by human/admin approval plus
  delivery rules. No SQL, Supabase, RLS, storage, app code, API route, OpenAI
  API, image generation, customer-facing sketch display, auth, payment,
  environment, secret, Production/admin access, submission, email, deploy, CAD,
  order, production, or customer-data operation was performed for the docs-only
  PR #107 planning work.
- Agent 36A: after PR #107 merged and cleaned up, updated
  `docs/novora-auth-whitelist-credits-payment-sql-packet.md` with a docs-only
  future SQL packet section for admin AI Sketch Review Workflow persistence,
  including proposed review statuses, planning-only table sketches, customer
  visibility gates, customer-preview versus public-gallery separation, audit
  event planning, migration sequencing, stop gates, and risk review. Agent 36A
  Review Pass kept PR #108 docs-only and tightened the SQL packet around the
  current admin status label, internal-draft/customer-display boundary, and
  review-only persistence wording. PR #108 has since been merged and cleaned up;
  the merge commit is `0b4cc8053279a4254bf0ee4a5e49767646acc8da`. Cleanup
  deleted the remote branch and local feature branch, removed the Agent 36A
  worktree registration, and left local Windows/Codex filesystem residue at
  `C:\Users\Administrator.DESKTOP-QI6183Q\.codex\worktrees\0663\novora-site`.
  PR #108 changed only `docs/novora-auth-whitelist-credits-payment-sql-packet.md`
  and `docs/novora-current-project-state.md`. No SQL was executed. No Supabase,
  RLS, storage, app code, API route, OpenAI API, image generation,
  customer-facing sketch display, auth, payment, environment, secret,
  Production/admin access, submission, email, deploy, CAD, order, production,
  or customer-data operation was performed. The planning boundary remains:
  NOVORA AI sketch output is a concept sketch only, not CAD, not a quote, not an
  order, and not production approval; AI sketches are internal drafts until
  reviewed and approved; customers must only see sketches approved by the NOVORA
  design team; unreviewed GPT/AI drafts must never be shown directly to
  customers; `approved_for_customer` does not equal `approved_for_gallery`; AI
  generation success alone must not approve a sketch; and customer visibility
  must be gated by human/admin approval plus separate delivery rules.
- Agent 38A: recorded that PR #109 was merged and cleanup was mostly completed:
  `main` was clean and the remote branch was deleted, while Agent 37A local
  worktree registration or local feature branch residue may still remain because
  `3c3d` was protected in cleanup instructions. Agent 38A added
  `docs/novora-ai-sketch-review-implementation-readiness.md`, a docs-only
  implementation readiness review for future admin AI Sketch Review Workflow
  persistence. The review states that the next step is review, not
  implementation, and that SQL may be considered only after final table, field,
  status, RLS, grants, rollback, and explicit approval gates are satisfied. No
  SQL was executed. No Supabase, RLS, grants, policies, storage, app code, API
  route, OpenAI API, image generation, image upload/storage, customer-facing
  sketch display, public gallery automation, auth, payment, points, environment
  variable, secret, Production/admin access, submission, email, deploy, CAD,
  order, production, or customer-data operation was performed. Agent 38A Review
  Pass verified PR #110 was open, draft, and unmerged, with only
  `docs/novora-ai-sketch-review-implementation-readiness.md` and
  `docs/novora-current-project-state.md` changed. The review pass kept the work
  docs-only, tightened the readiness sequence and the separation between
  customer preview, public gallery, and commercial package delivery, and left the
  next step as review, not implementation. No SQL, Supabase, RLS, grants,
  policies, storage, app code,
  API route, OpenAI API, image generation, image upload/storage,
  customer-facing sketch display, public gallery automation, auth, payment,
  points, environment variable, secret, Production/admin access, submission,
  email, deploy, CAD, order, production, or customer-data operation was
  performed during the review pass.
- Agent 39A: recorded that PR #110 has since been merged and cleaned up, then
  added
  `docs/novora-ai-sketch-review-minimal-sql-execution-approval-packet.md`, a
  docs-only approval packet for a future minimal SQL execution decision for
  internal admin AI Sketch Review Workflow persistence. The packet states that
  merging the document does not approve SQL execution and that a separate
  explicit user message is required before any concrete SQL execution step. No
  SQL was executed. No Supabase, RLS, grants, policies, storage, app code, API
  route, OpenAI API, image generation, image upload/storage, customer-facing
  sketch display, public gallery automation, auth, payment, points, environment
  variable, secret, Production/admin access, submission, email, deploy, CAD,
  order, production, or customer-data operation was performed. The next step is
  review of the approval packet, not SQL execution.
- Agent 39A Review Pass: PR #111 is still draft, open, and unmerged at the
  time of this review pass. The review kept the work docs-only and tightened the
  ledger to make PR #111's draft/unmerged status explicit. No SQL was executed.
  No Supabase, RLS, grants, policies, storage, app code, API route, OpenAI API,
  image generation, image upload/storage, customer-facing sketch display, public
  gallery automation, auth, payment, points, environment variable, secret,
  Production/admin access, submission, email, deploy, CAD, order, production, or
  customer-data operation was performed. The next step remains review of the
  approval packet, not SQL execution.
- Agent 40A: recorded that PR #111 has since been merged and cleaned up, then
  added
  `docs/novora-ai-sketch-review-minimal-sql-execution-candidate.md`, a
  docs-only Minimal SQL Execution Candidate / Final SQL Preflight packet for
  future internal admin AI Sketch Review Workflow persistence. The packet
  confirms that no SQL was executed, no Supabase connection was made, live
  schema was not inspected, and merging the document does not approve SQL
  execution. It recommends live schema verification first, then an ALTER /
  verify path if `ai_sketch_reviews` already exists rather than blindly creating
  a duplicate table. No SQL, Supabase, RLS, storage, app code, API route, OpenAI
  API, image generation, image upload/storage, customer-facing sketch display,
  public gallery automation, auth, payment, points, environment variable,
  secret, Production/admin access, submission, email, deploy, CAD, order,
  production, or customer-data operation was performed. The next step is review
  of the SQL candidate packet, not SQL execution.
- Agent 40A Review Pass: PR #112 is still draft, open, and unmerged at the
  time of this review pass. The review remained docs-only and tightened
  `docs/novora-ai-sketch-review-minimal-sql-execution-candidate.md` so the
  candidate SQL is clearly a review target only, not final SQL, not a migration
  file, not SQL approval, and not evidence of SQL execution. The packet now
  repeats the concept-only AI sketch boundary, the internal-draft/customer
  display boundary, the `approved_for_customer` versus `approved_for_gallery`
  separation, and the rule that generation success alone must not approve a
  sketch. No SQL was executed. No Supabase connection was made. No live
  Supabase schema was inspected. No Supabase, RLS, grants, policies, storage,
  app code, API route, OpenAI API, image generation, image upload/storage,
  customer-facing sketch display, public gallery automation, auth, payment,
  points, environment variable, secret, Production/admin access, submission,
  email, deploy, CAD, order, production, or customer-data operation was
  performed. The next step remains review of PR #112, not SQL execution.
- Agent 41A: recorded that PR #112 has since been merged and cleaned up, then
  added
  `docs/novora-ai-sketch-review-live-schema-verification.md`, a docs-only
  read-only live Supabase schema verification report for future admin AI Sketch
  Review Workflow persistence. Agent 41A attempted the approved local
  connection preflight, but live Supabase was not connected because this
  worktree had no existing safe Supabase/database environment variables, no
  local env file, no installed dependency tree, no `psql`, no Supabase CLI, and
  no available Node/Python Postgres metadata-query driver. The report therefore
  records live verification as blocked rather than inventing schema findings.
  No SQL changes were executed. No customer row data, private content, storage
  object paths, or row counts were inspected. No Supabase/RLS/storage/app/API/
  OpenAI/image generation/customer display/auth/payment/env/secrets/Production/
  admin/submission/email/deploy/CAD/order/customer-data operations were
  performed. The next step is review and completion of read-only live schema
  verification with an approved secure connection path, not SQL execution.
- Agent 41A follow-up: PR #113 remains draft, open, and unmerged. After the
  initial Codex tooling blocker, the user manually completed read-only metadata
  verification in the Supabase SQL Editor for target project
  `novora-production` and provided the results for documentation. The manual
  metadata showed `public.ai_sketch_jobs`, `public.ai_sketch_outputs`, and
  `public.ai_sketch_reviews` exist; RLS is enabled for all three with forced
  RLS false; no explicit policies were visible in the returned `pg_policies`
  metadata; and visible grant metadata did not show `anon` or `authenticated`
  DML grants for those tables. `public.ai_sketch_reviews` already exists with
  `review_status` default `'pending'::text`, visible foreign keys to
  `public.ai_sketch_outputs(id)` and `public.concept_briefs(id)`, and no
  visible `review_status` CHECK constraint in the returned metadata. Agent 40A
  candidate SQL must be revised into exact ALTER-only SQL before any execution;
  future SQL must not `CREATE TABLE ai_sketch_reviews`. Codex did not connect
  to Supabase, execute SQL, inspect live schema directly, inspect customer row
  data, or perform Supabase writes. No Supabase schema/RLS/storage/grants/
  policies, app/API, OpenAI/image generation, customer display, auth/payment,
  env/secrets, Production/admin, submission, email, deploy, CAD/order, or
  customer-data operation was performed. The next step is review/update, not
  SQL execution.
- Agent 42A: recorded that PR #113 has since been merged and cleanup was mostly
  completed: `main` was clean, the remote branch was deleted, worktree
  registration was removed, the local feature branch may remain because of
  Windows/Git ref lock permissions, and filesystem residue remains at `504b`.
  Agent 42A added
  `docs/novora-ai-sketch-review-revised-alter-only-sql-package.md`, a
  docs-only revised ALTER-only SQL package based on the user-provided manual
  SQL Editor metadata from PR #113. The package records that
  `public.ai_sketch_reviews` already exists and must not be recreated, that the
  next SQL direction is ALTER existing `public.ai_sketch_reviews` only, and
  that execution remains blocked pending review, current `review_status` row
  value confirmation, final exact SQL, and separate explicit user approval. No
  SQL was executed. Codex did not connect to Supabase. Codex did not inspect
  live schema. No customer row data was inspected. No Supabase/RLS/storage/app/
  API/OpenAI/image generation/customer display/auth/payment/env/secrets/
  Production/admin/submission/email/deploy/CAD/order/customer-data operation was
  performed. The next step is review of the revised package, not SQL execution.
- Agent 42A Review Pass: PR #114 has since been merged. The PR changed only
  `docs/novora-ai-sketch-review-revised-alter-only-sql-package.md` and
  `docs/novora-current-project-state.md`. The review pass kept the work
  docs-only and tightened boundary wording so the revised package is not
  mistaken for SQL approval, SQL execution, Codex Supabase connection, live
  schema inspection, implemented persistence, app/API routing, OpenAI/image
  generation, image storage, customer-facing sketch display, gallery, auth,
  payment, points, environment, Production/admin, submission, email, deploy,
  CAD, order, production, or customer-data work. Candidate SQL remains
  ALTER-only and blocked pending current `review_status` row-value review,
  final exact SQL, and separate explicit user approval. No SQL was executed.
  Codex did not connect to Supabase. Codex did not inspect live schema. No
  customer row data was inspected. No Supabase/RLS/storage/grants/policies/app/
  API/OpenAI/image generation/customer display/auth/payment/env/secrets/
  Production/admin/submission/email/deploy/CAD/order/customer-data operation was
  performed. The next step remains review of PR #114, not SQL execution.
- Agent 43A: added
  `docs/novora-ai-sketch-review-status-row-value-precheck.md`, a docs-only
  row-value metadata precheck packet for
  `public.ai_sketch_reviews.review_status`. The packet prepares a manual
  aggregate-only Supabase SQL Editor check for grouped status counts, total
  rows, legacy `pending` rows, and unexpected status rows before final
  ALTER-only SQL is prepared. It instructs that no IDs, notes, brief content,
  contact content, reference assets, storage paths, protected admin content, or
  customer data should be pasted back. No SQL was executed. Codex did not
  connect to Supabase, inspect live schema, query customer rows, inspect notes
  or IDs, change Supabase schema/RLS/storage/grants/policies, edit app code,
  deploy, merge, or perform any customer-data operation. Merging the packet does
  not approve SQL execution; final exact SQL and separate explicit user
  approval remain required.
- Agent 43A Review Pass: PR #115 is draft, open, and unmerged at the time of
  this review pass. The review pass kept the work docs-only and tightened the
  row-value precheck packet around aggregate-only SQL Editor queries,
  null/blank status counts, explicit interpretation cases, future approval
  wording, conservative go/no-go guidance, and risk review. No SQL was
  executed. Codex did not connect to Supabase, inspect live schema, query
  customer rows, inspect IDs or notes, change Supabase schema/RLS/storage/
  grants/policies, edit app/API code, call OpenAI, generate/upload/store
  images, implement persistence, implement customer-facing sketch display,
  implement public gallery automation, change auth/payment/points/env/secrets,
  access Production/admin pages, create submissions, send email, deploy, touch
  CAD/order/production behavior, or perform any customer-data operation. The
  next step is review, then user manual aggregate query results, not ALTER
  execution.
- Agent 44A: created
  `docs/novora-ai-sketch-review-final-alter-only-sql-empty-table.md`, a
  docs-only final ALTER-only SQL packet for the existing empty
  `public.ai_sketch_reviews` table. The packet is based on the
  user-provided PR #115 aggregate results: Query 1 returned no rows, Query 2
  reported `null_status_count = 0`, `blank_status_count = 0`, and
  `total_rows = 0`, and Query 3 returned no rows. The safe interpretation is
  that the table is empty and no row migration, `pending` status update, or
  cleanup is needed before the final ALTER-only SQL can be reviewed. No SQL was
  executed by Codex. Codex did not connect to Supabase, inspect live schema,
  inspect rows, inspect IDs, inspect `reviewer_note`, inspect
  `customer_safe_note`, or inspect customer data. No Supabase, RLS, storage,
  grants, policies, app code, API route, OpenAI, image generation,
  customer-facing sketch display, auth, payment, environment, secrets,
  Production/admin, submission, email, deploy, CAD, order, customer-data, or
  other high-risk action was performed. Agent 44A Review Pass tightened the
  packet to clarify that `updated_at` is added as a column only, with no
  trigger creation or automatic refresh behavior implemented. PR #116 has since
  been merged into `main` with merge commit
  `10e3770032d5bb32f0ef7d00e2e2c23a8ff140d4`.
- Agent 45A: added
  `docs/novora-ai-sketch-review-agent-44-sql-execution-result.md`, a docs-only
  historical execution record for the user-manual Agent 44 final ALTER-only SQL
  execution against existing `public.ai_sketch_reviews` in Supabase project
  `novora-production`. The corrected user approval wording recorded for this
  execution is: “批准执行 Agent 44 final ALTER-only SQL，目标 Supabase 项目
  novora-production，范围仅限 existing public.ai_sketch_reviews internal admin
  review persistence schema；确认刚刚重新运行 aggregate precheck 后 table
  仍为空；不包含 customer visibility / OpenAI / image storage / app route /
  public gallery / payment / points / RLS opening。” The user reported that
  execution succeeded with success / no rows returned. Post-execution
  verification confirmed the review workflow columns/defaults, the
  `ai_sketch_reviews_review_status_check` constraint, and final
  `public.ai_sketch_reviews` row count. The table remains `0` rows.
  `pending` is excluded from the final CHECK constraint. No insert test was
  run. No RLS, grants, storage, policy, customer visibility, OpenAI, image, app
  route, public gallery, payment, points, or auth changes were made. No SQL was
  executed by Codex. Codex did not connect to Supabase. Codex did not inspect
  live schema. Codex did not inspect customer rows, IDs, notes, or customer
  data. The next step is app compatibility planning, not more SQL execution.
- Agent 45A Review Pass: PR #117 is draft, open, and unmerged at the time of
  this review pass. The review kept the work docs-only and tightened the
  execution record and ledger around PR #116 merge status, no repeat SQL
  execution, `updated_at` trigger follow-up approval, and explicit RLS, grants,
  storage, and policy boundaries. No SQL was executed by Codex. Codex did not
  connect to Supabase. Codex did not inspect live schema, rows, IDs, notes, or
  customer data. No app/API/package/env, Supabase/RLS/storage/grants/policies,
  OpenAI/image generation, customer visibility, public gallery, payment,
  points, auth, email, deploy, PR-ready transition, merge, or other high-risk
  action was performed. The next step is Final PR Check, not more SQL
  execution.
- Agent 45B: created
  `docs/novora-admin-review-persistence-app-compatibility-plan.md`, a docs-only
  app compatibility planning packet after the Agent 44 SQL execution record and
  PR #117 merge. The packet records the now-applied
  `public.ai_sketch_reviews` schema baseline, local admin UI compatibility
  findings, required app implementation decisions, a phased Agent 45C-45G
  sequence, product/security boundaries, and risks. No SQL was executed by
  Codex. Codex did not connect to Supabase. Codex did not inspect live schema.
  Codex did not inspect rows, customer data, IDs, `reviewer_note`, or
  `customer_safe_note`. No app/API/package/env, Supabase/RLS/storage/grants/
  policies, OpenAI/image generation, customer display, public gallery, auth,
  payment, points, deploy, or other high-risk action was performed. Agent 45B
  Review Pass commit `a1ad4566fbdaa93e0783a152d68f44f2029ce4e7` kept PR #118
  planning-only and confirmed PR #118 is draft, open, and unmerged at the time
  of the review pass. The next step is Final PR Check / Ready decision, not SQL
  execution.
- Agent 45C: PR #119 on branch
  `codex/agent-45c-ai-sketch-review-status-constants-copy` created the smallest
  app-code preparation for AI sketch review status constants/types and admin
  copy alignment. Initial commit:
  `dded274d4f88ec1418ebfeea92ad2e6cabdc4266`. Review-pass commit:
  `97cd623fd9dd3e954776713f0cf428708d880e4d`. Shared app constants now use the
  final database CHECK values:
  `internal_draft_not_generated`, `draft_generated_internal_only`,
  `needs_revision`, and `approved_for_customer`; `pending` is not an allowed AI
  sketch review status. The existing protected admin Concept Brief detail AI
  Sketch Review Workflow skeleton now reads those labels/help strings from the
  shared constants and clarifies that Concept Brief admin review status remains
  separate from future AI sketch review persistence. No Supabase read path,
  Supabase write path, persistence, server action, API route, customer-facing AI
  sketch visibility, OpenAI/image generation, image storage, public gallery,
  payment, points, auth, deploy, or Production action was implemented. No SQL
  was executed by Codex. Codex did not connect to Supabase, inspect live schema,
  inspect rows, inspect customer data, inspect IDs, inspect `reviewer_note`, or
  inspect `customer_safe_note`. PR #119 should remain draft, open, and unmerged
  pending review. The next step is: Ready/Merge decision after Final PR Check,
  then Agent 45D decision, not SQL.
- Agent 45D: PR #120 on branch
  `codex/agent-45d-admin-ai-sketch-review-read-path` is draft, open, and
  unmerged at the time of this implementation/review pass. Initial commit:
  `492fc3ef93fc9cd3ecf7916580151aee67b329a2`. Review-pass commit:
  `d78cc3ac6244dadda0a32fad2cf9880ce8910131`. This implementation adds the
  smallest protected admin-only AI sketch review persistence read path for the
  protected Concept Brief detail page. The read path uses the shared Agent 45C
  status constants and normalizes persisted `review_status` values for admin
  display only. Missing Supabase admin client, no persisted review row, Supabase
  read error, and unexpected helper/client/query exception cases all fall back to
  `internal_draft_not_generated` with `hasPersistedReview: false` and nullable
  metadata fields set to `null`. Invalid or legacy values, including `pending`,
  are guarded and fall back to `internal_draft_not_generated`; `pending` remains
  invalid/excluded and must never be treated as approved. Concept Brief admin
  review state remains separate from AI sketch review persistence. No write path
  was implemented. No API route or server action was added. No SQL was executed
  by Codex. Codex did not connect to Supabase live, inspect live schema, inspect
  rows/customer data/IDs/notes, or select or inspect `reviewer_note` or
  `customer_safe_note`. No customer-facing AI sketch visibility, OpenAI/image/
  storage, public gallery, payment, points, auth, or deploy change was made. The
  next step is Ready/Merge decision after Final PR Check; after 45D is merged,
  the next implementation step should be an Agent 45E write-path decision, not
  SQL.
- Agent 45E: PR #121 on branch
  `codex/agent-45e-admin-ai-sketch-review-write-path-plan` adds
  `docs/novora-agent-45e-admin-ai-sketch-review-write-path-plan.md`, a docs-only
  future implementation plan for an admin-only AI sketch review write path after
  PR #120 merged into `main` at
  `5b19d57aa55958c14dd0923d51223fdb9f588fb7`. Initial commit:
  `ce3eccbbbc393f3647728e0a86504ba312366206`. Review-pass commit:
  `8b3644e076bef97ca021b6103014bb98c6b422d5`. The plan records the existing
  protected Concept Brief admin review write/auth pattern, the proposed future
  route/helper shape, strict allowed AI sketch review statuses,
  approval/revocation metadata policy, no-record upsert policy, read/write
  separation from Agent 45D, customer visibility and delivery boundaries, future
  tests, and stop conditions. Agent 45E remains docs-only planning. No write
  path was implemented. No API route or server action was added. No
  insert/update/delete/upsert behavior was implemented. No SQL was executed by
  Codex. Codex did not connect to Supabase live. No live schema was inspected.
  No rows/customer data/IDs/notes were inspected. No `reviewer_note` or
  `customer_safe_note` was inspected. No customer-facing AI sketch visibility
  was added. No email/customer delivery behavior was added. No OpenAI/image/
  storage/public gallery/payment/points/auth/deploy changes were made. PR #121
  should remain draft, open, and unmerged through review. The next step after
  this review pass should be Final PR Check / Ready decision. After PR #121 is
  reviewed, marked ready if appropriate, and merged, the next step should be an
  Agent 45E implementation decision, not SQL.
- Agent 45E implementation precheck planning: PR #122 on branch
  `codex/agent-45e-write-path-implementation-precheck-plan` has since been
  merged into `main` at
  `4de05a67e55a1cb255e6d2efc7269be97ca0d7af`. Initial commit
  `0fea5ba46313114c923b35debc09bd75925a617a` added the initial precheck
  packet. Review-pass commit
  `ae87c1fd8e197942e645942107709fe38aef068d` tightened the ledger to record
  PR #122 metadata explicitly. The PR adds
  `docs/novora-agent-45e-write-path-implementation-precheck-plan.md`, a
  docs-only precheck packet before any admin-only AI sketch review write-path
  implementation. The packet records that PR #121 has been merged into `main`
  at `0795d85bc5222b4eab7c6155ae9ca634b5f1cac5`, that Agent 45C status
  constants and Agent 45D protected admin-only read path are merged, and that
  actual write-path implementation is still not approved. It documents required
  preconditions, user-run read-only manual precheck SELECT queries,
  duplicate/unique-constraint decision rules, admin route/auth precheck,
  future writable field limits, customer boundary rules, and stop conditions.
  This PR is docs-only planning. No write path was implemented. No API route or
  server action was added. No insert/update/delete/upsert behavior was
  implemented. No SQL was executed by Codex. Codex did not connect to Supabase
  live. No live schema was inspected. No rows/customer data/IDs/notes were
  inspected. No `reviewer_note` or `customer_safe_note` was inspected. No
  customer-facing AI sketch visibility was added. No email/customer delivery
  behavior was added. No OpenAI/image/storage/public gallery/payment/points/
  auth/deploy changes were made.
- Agent 45E duplicate protection SQL planning: PR #123 on branch
  `codex/agent-45e-duplicate-protection-sql-plan` has since been merged into
  `main` at `42b5566401653f199a377c3b51183584b175d879`. Initial commit:
  `ef35c2471b2164fca1f94ce889343662cc13bf7f`. Review-pass commit:
  `9a3ec9aad3d2d552bb82e595da72731b2140e103`. Post-merge cleanup completed,
  and the remote branch was deleted. This PR started after PR #122 merged. It
  was docs-only and prepared only a manual SQL packet for duplicate protection
  on `public.ai_sketch_reviews(concept_brief_id)`. The user-run manual precheck
  reported `pending_mentioned_in_review_status_check = false`,
  `all_final_statuses_mentioned_in_check = true`,
  `invalid_or_legacy_status_rows = 0`, `total_rows = 0`, and no detected
  `concept_brief_id` index rows, so the table was empty and status constraints
  looked good, but duplicate protection was missing. Codex did not execute SQL.
  Codex did not connect to Supabase live. Codex did not inspect live schema.
  Codex did not query rows, customer data, IDs, or notes. No `reviewer_note` or
  `customer_safe_note` was inspected. No write path, API route, server action,
  insert, update, delete, or upsert behavior was implemented. No
  customer-facing AI sketch visibility, email/customer delivery, OpenAI, image,
  storage, public gallery, payment, points, auth, deploy, Supabase, RLS, grant,
  policy, or storage change was made.
- Agent 45F: the user manually executed the PR #123 candidate duplicate
  protection SQL in Supabase SQL Editor:
  `alter table public.ai_sketch_reviews add constraint ai_sketch_reviews_concept_brief_id_key unique (concept_brief_id);`
  Codex did not execute SQL, connect to Supabase live, inspect live schema,
  inspect rows, inspect customer data, inspect IDs, inspect `reviewer_note`, or
  inspect `customer_safe_note`. The user-reported post-SQL verification confirms
  constraint `ai_sketch_reviews_concept_brief_id_key` exists with constraint
  type `u` and definition `UNIQUE (concept_brief_id)`. The matching unique
  index exists with `is_unique = true` and an index definition including
  `concept_brief_id`. Aggregate checks reported
  `duplicate_concept_brief_id_groups = 0`, `duplicate_extra_rows = 0`,
  `total_rows = 0`, and `invalid_or_legacy_status_rows = 0`. Final
  `review_status` CHECK signals remained
  `pending_mentioned_in_review_status_check = false` and
  `all_final_statuses_mentioned_in_check = true`. Duplicate protection for
  `public.ai_sketch_reviews(concept_brief_id)` is now manually executed and
  verified. This unblocks discussion of a future write-path implementation path,
  but it does not automatically start implementation. Future implementation
  still requires separate approval, must preserve admin-only access, must
  validate final statuses only, must not touch `reviewer_note` or
  `customer_safe_note`, and must preserve customer-delivery boundaries:
  customer delivery remains email-only after human review, optimization, and
  approval; `approved_for_customer` does not mean `approved_for_gallery`; and
  customer pages must not display unreviewed AI sketches.
- Agent 45F duplicate protection verification record: PR #124 on branch
  `codex/agent-45f-record-duplicate-protection-verification` has since been
  merged into `main` at `37fa6eb98ee81b17add1fc6a2ba5cd49e5195528`. The PR was
  docs-only and recorded the user-manual duplicate protection execution and
  post-SQL verification for
  `ai_sketch_reviews_concept_brief_id_key UNIQUE (concept_brief_id)`. Post-merge
  cleanup completed and local `main` was clean before Agent 46A started. No SQL
  was executed by Codex. Codex did not connect to Supabase live, inspect live
  schema, inspect rows, inspect customer data, inspect IDs, inspect
  `reviewer_note`, or inspect `customer_safe_note`. No app/API/server action,
  write path, insert, update, delete, upsert, customer-facing AI sketch display,
  email, OpenAI, image generation, storage, public gallery, payment, auth, CAD,
  order, production, env, deploy, RLS, grant, policy, or storage change was
  made by that docs-only record.
- Agent 46A: added
  `docs/novora-agent-46a-ai-sketch-review-write-path-implementation-plan.md`, a
  docs-only implementation path plan for the future protected admin-only AI
  sketch review write path after duplicate protection was manually verified.
  The plan recommends an explicit create/update split for the future NOVORA MVP
  write path, not insert-only, update-only, or blind upsert. Future app-code
  work still requires separate user approval and should preserve admin-only
  access, final status validation, duplicate protection reliance on
  `UNIQUE (concept_brief_id)`, safe no-row and existing-row handling, safe
  duplicate/constraint error handling, and the rule that `reviewer_note` and
  `customer_safe_note` must not be read, written, displayed, or returned.
  Agent 46A is docs-only planning. No write path was implemented. No app code,
  API route, server action, insert, update, delete, upsert, SQL, Supabase live
  access, live schema inspection, customer rows/customer data/IDs/notes
  inspection, customer-facing AI sketch display, email, OpenAI call, image
  generation, storage, public gallery, payment, auth, CAD, order, production,
  env, deploy, RLS, grant, policy, migration, or storage change was made.
- Agent 47A: adds
  `docs/novora-agent-47a-website-plugin-optimization-planning.md`, a docs-only
  website plugin and website optimization strategy for NOVORA MVP. The planning
  packet prioritizes low-risk metadata, copy clarity, CTA, mobile,
  accessibility, image, and performance recommendations; defers analytics,
  monitoring, chat, booking, CRM, and email marketing until privacy and data
  handling are reviewed; and explicitly avoids payment, account, automatic AI
  generation, automatic delivery, uncontrolled tracking, broad env/secrets,
  customer-data forwarding, unreviewed AI sketch exposure, and upload/storage/
  security-changing plugins. Agent 47A is docs-only planning. No plugin was
  installed. No package, app code, API route, server action, AI sketch review
  write path, insert, update, delete, upsert, SQL, Supabase live access, live
  schema inspection, customer rows/customer data/IDs/notes inspection,
  `reviewer_note`, `customer_safe_note`, customer-facing AI sketch display,
  email, OpenAI call, image generation, third-party service connection, env,
  deploy, RLS, grant, policy, migration, or storage change was made.
- Agent 46B: implements the minimal protected admin-only AI sketch review
  write-path foundation for `public.ai_sketch_reviews` on branch
  `codex/agent-46b-admin-ai-sketch-review-write-path`. The app-code slice adds
  a protected `/admin/briefs/ai-sketch-review` route and a server-only helper
  with an explicit `create` / `update` split. It does not use blind upsert.
  The create path writes only `concept_brief_id` and `review_status`, relies on
  the manually verified `UNIQUE (concept_brief_id)` duplicate protection, and
  returns a safe already-exists error on unique conflict. The update path writes
  only `review_status`, does not create missing rows, and returns a safe
  missing-row error when no review row exists. The route uses the existing
  protected admin access cookie pattern, accepts only final AI sketch review
  statuses, and rejects `pending`, empty, null, legacy, or unknown statuses.
  `reviewer_note` and `customer_safe_note` remain excluded from payloads,
  responses, select lists, UI state, tests, and logging except as exclusion
  language. No SQL was executed by Codex. Codex did not connect to Supabase
  live, inspect live schema, inspect rows, inspect customer data, inspect IDs,
  inspect `reviewer_note`, or inspect `customer_safe_note`. No customer-facing
  AI sketch display, customer delivery, email, OpenAI/image generation, gallery
  approval, payment, auth, CAD, order, production, env, deploy, RLS, grant,
  policy, migration, storage, package, plugin, third-party service, or website
  optimization change was made. Future admin UI create/update controls remain a
  separate Agent 46C follow-up.
- Agent 46C: wires the existing protected admin Concept Brief detail AI Sketch
  Review Workflow UI to the Agent 46B admin-only write route on branch
  `codex/agent-46c-admin-ai-sketch-review-ui-save`. The admin UI reuses
  `POST /admin/briefs/ai-sketch-review`, sends only `mode`, `conceptBriefId`,
  and `reviewStatus`, and determines explicit `create` versus `update` mode
  from the protected admin read model's `hasPersistedReview` signal. It does
  not add a new write route or server action and does not use blind upsert. The
  status control is constrained to the four final AI sketch review statuses:
  `internal_draft_not_generated`, `draft_generated_internal_only`,
  `needs_revision`, and `approved_for_customer`; `pending` remains absent from
  the UI. `reviewer_note` and `customer_safe_note` remain excluded from UI
  controls, submitted payloads, route responses, and logging. No customer pages
  were modified, and no customer-facing AI sketch display, customer delivery,
  email, OpenAI/image generation, gallery approval, SQL, Supabase live access,
  live schema/row/customer-data inspection, env, deploy, RLS, storage, package,
  plugin, or third-party service action was performed.
- Agent 48A: adds
  `docs/novora-agent-48a-codex-skills-plugins-audit.md`, a docs-only audit and
  planning packet for safe NOVORA Codex skills and plugin strategy. The packet
  recommends allowing only low-risk local workflow skills first, especially
  skills that encode NOVORA PR lifecycle, review, final check, ready/merge,
  post-merge cleanup, AI sketch boundary, sensitive-field exclusion, docs
  ledger, and local-only validation rules. It defers or rejects plugins that
  can access Supabase live, execute SQL, inspect live schema/customer data/IDs/
  notes, inspect `reviewer_note` or `customer_safe_note`, modify env/secrets,
  deploy, send email, call OpenAI/image generation, change packages, connect
  third-party services, touch CRM/analytics/chat/booking/payment/account data,
  or use broad MCP access. Any actual plugin installation must be a separate
  explicitly approved task. Agent 48A is docs-only planning. No plugin was
  installed or enabled. No Codex app setting was changed. No MCP server was
  connected. No package, app code, API route, server action, SQL, Supabase live
  access, live schema inspection, customer rows/customer data/IDs/notes
  inspection, `reviewer_note`, `customer_safe_note`, customer-facing AI sketch
  display, email, OpenAI call, image generation, third-party service
  connection, website optimization implementation, env, deploy, RLS, grant,
  policy, migration, or storage change was made.
- Agent 47B: implements the first low-risk website optimization slice on branch
  `codex/agent-47b-low-risk-website-optimization`. The app-code changes are
  limited to public website metadata, homepage/header CTA clarity, carousel and
  header accessibility labels, homepage static image attributes, and small
  homepage/header mobile and focus-state CSS refinements. Changed website files
  are `app/layout.tsx`, `app/page.tsx`, `app/page.module.css`,
  `components/HomeCarousel.tsx`, `components/SiteHeader.tsx`, and
  `components/SiteHeader.module.css`, plus this ledger update. The CTA now
  names the actual MVP action as starting a Concept Brief while preserving the
  `/design/start` route target and the Concept Brief / studio review / paid CAD
  later boundary. The social preview metadata uses the existing local
  `/assets/novora_hero_main_visual.png` asset. No plugin was installed or
  enabled. No MCP server was connected. No Codex app setting was changed. No
  package or lockfile was changed. No analytics, tracking, monitoring, CRM,
  chat, booking, marketing, payment, account, or third-party service connection
  was added. No SQL was executed. Codex did not connect to Supabase live,
  inspect live schema, inspect rows, inspect customer data, inspect IDs, inspect
  `reviewer_note`, or inspect `customer_safe_note`. No environment variable,
  secret, Vercel, Resend, Cloudflare, deploy, RLS, grant, policy, migration, or
  storage change was made. No OpenAI call, image generation, customer-facing AI
  sketch display, email/customer delivery, gallery approval, CAD, order, or
  production behavior was added.
- Agent 49A: adds
  `docs/novora-agent-49a-mvp-remaining-workstream-plan.md` on branch
  `codex/agent-49a-mvp-remaining-workstream-planning`, a docs-only planning
  packet for remaining NOVORA MVP workstreams, priorities, rough timing,
  recommended next-Agent sequence, risk levels, future owner decision points,
  and hard stop boundaries. The plan summarizes the completed Concept Brief,
  Supabase/storage, admin review, notification, reference image, AI sketch
  review, duplicate protection, admin write path/save UI, website optimization,
  and Codex skills/plugins baseline. It recommends next planning stages for
  Design Spec JSON Schema v1, Hand Sketch Instruction Template v1,
  brief-to-design-spec mapping, admin review UI polish if needed, website
  visual/mobile QA, internal AI sketch draft pipeline planning, and deployment
  readiness. Review Pass tightened the planning doc to state the locked MVP AI
  sketch business boundaries explicitly. Agent 49A is docs-only planning. No
  app code, API route, server action, package, lockfile, SQL, Supabase live
  access, live schema inspection, customer rows/customer data/IDs/notes
  inspection, `reviewer_note`, `customer_safe_note`, environment variable,
  secret, deploy, OpenAI call, image generation, email/customer delivery,
  customer-facing AI sketch display, gallery approval, plugin installation,
  MCP enablement, Codex settings change, analytics/tracking, CRM, chat,
  booking, marketing, monitoring, payment, account, third-party service
  connection, RLS, grant, policy, migration, or storage change was made.
  Recommended next stage is Final PR Check, then Ready + Merge if Final PR
  Check passes.
- Agent 50A: adds
  `docs/novora-agent-50a-design-spec-json-schema-v1.md` on branch
  `codex/agent-50a-design-spec-json-schema-v1`, a docs-only schema planning
  packet for Design Spec JSON Schema v1. The packet defines the canonical
  internal structured design specification that should sit between a customer
  Concept Brief and any future Hand Sketch Instruction or internal AI sketch
  draft workflow. It records the intended chain as customer Concept Brief to
  Design Spec JSON to Hand Sketch Instruction to future internal AI sketch
  draft workflow, and reiterates that raw customer natural-language brief text
  must not become the final sketch-generation prompt. The schema planning doc
  covers top-level sections, suggested fields, practical enums, unknown and
  uncertainty handling, reference-image inspiration-only boundaries, internal
  review flags, customer-safe summaries, internal-only generation notes, human
  review gates, future validation, illustrative fake JSON examples, and the
  relationship to future Agent 50B and Agent 50C work. Agent 50A is docs-only
  planning. No app code, API route, server action, package, lockfile, SQL,
  Supabase live access, live schema inspection, customer rows/customer data/IDs/
  notes inspection, `reviewer_note`, `customer_safe_note`, environment
  variable, secret, deploy, OpenAI call, image generation, email/customer
  delivery, customer-facing AI sketch display, gallery approval, plugin
  installation, MCP enablement, Codex settings change, analytics/tracking, CRM,
  chat, booking, marketing, monitoring, payment, account, third-party service
  connection, RLS, grant, policy, migration, storage change, or real customer
  submission was made. Review Pass kept PR #132 docs-only and tightened the
  schema doc to explicitly preserve human final approval, no approval from AI
  generation success alone, email-only customer-facing sketch delivery after
  human review/optimization/approval, and no unreviewed AI sketch display on
  customer pages. Recommended next stage after Review Pass is Final PR Check.
- Agent 50B: adds
  `docs/novora-agent-50b-hand-sketch-instruction-template-v1.md` on branch
  `codex/agent-50b-hand-sketch-instruction-template-v1`, a docs-only template
  planning packet for Hand Sketch Instruction Template v1. The packet defines
  the canonical internal fixed-format instruction generated from Design Spec
  JSON before any future internal AI sketch draft workflow. It preserves the
  locked chain as customer Concept Brief to Design Spec JSON to Hand Sketch
  Instruction to future internal AI sketch draft workflow, and reiterates that
  raw customer natural-language brief text must not become the final
  sketch-generation prompt. The template planning doc covers deterministic
  section order, template metadata, customer-safe design summary, sketch
  objective, piece/style/material/stone/composition/wearability/manufacturing
  direction, reference-image inspiration-only rules, must-include and
  must-avoid items, explicit uncertainty preservation, view and linework
  requirements, annotation rules, internal review flags, human review
  requirements, forbidden outputs, two fake illustrative instruction examples,
  validation checklist, and hard stop boundaries. Agent 50B is docs-only
  planning. No app code, API route, server action, package, lockfile, SQL,
  Supabase live access, live schema inspection, customer rows/customer data/IDs/
  notes inspection, `reviewer_note`, `customer_safe_note`, environment
  variable, secret, deploy, OpenAI call, image generation, email/customer
  delivery, customer-facing AI sketch display, gallery approval, plugin
  installation, MCP enablement, Codex settings change, analytics/tracking, CRM,
  chat, booking, marketing, monitoring, payment, account, third-party service
  connection, RLS, grant, policy, migration, storage change, real customer
  submission, Agent 50C work, or Agent 53A work was made. Recommended next
  stage is Final PR Check, then Ready + Merge if Final PR Check passes.
- Agent 50C: adds
  `docs/novora-agent-50c-concept-brief-to-design-spec-transformation-plan.md`
  on branch `codex/agent-50c-concept-brief-to-design-spec-planning`, a
  docs-only transformation planning packet for how future NOVORA work should
  convert existing customer Concept Brief data into Agent 50A Design Spec JSON
  Schema v1 before Agent 50B Hand Sketch Instruction Template v1. The plan
  covers local-only source Concept Brief categories, target Design Spec
  sections, staged normalization and mapping, internal interpretation,
  unknowns, human follow-up, risk flags, reference-image inspiration-only
  handling, sensitive-field exclusion, future validation, fake illustrative
  examples, future implementation boundaries, and the relationship to future
  Agent 53A. Agent 50C is docs-only planning. No app code, API route, server
  action, package, lockfile, SQL, Supabase live access, live schema inspection,
  customer rows/customer data/IDs/notes inspection, `reviewer_note`,
  `customer_safe_note`, environment variable, secret, deploy, OpenAI call,
  image generation, email/customer delivery, customer-facing AI sketch display,
  gallery approval, plugin installation, MCP enablement, Codex settings change,
  analytics/tracking, CRM, chat, booking, marketing, monitoring, payment,
  account, third-party service connection, RLS, grant, policy, migration,
  storage change, real customer submission, or Agent 53A work was made.
  Review Pass tightened the plan to explicitly enumerate the four legal final
  AI sketch review statuses, keep `pending` illegal/excluded/not valid, keep
  `approved_for_customer` separate from gallery approval, and preserve that AI
  generation success alone must not approve a sketch. Recommended next stage is
  Final PR Check.
- Agent 53A: adds
  `docs/novora-agent-53a-internal-ai-sketch-draft-pipeline-plan.md` on branch
  `codex/agent-53a-internal-ai-sketch-draft-pipeline-planning`, a docs-only
  internal AI sketch draft pipeline planning packet for future NOVORA work
  after Agent 50A Design Spec JSON Schema v1, Agent 50B Hand Sketch Instruction
  Template v1, and Agent 50C Concept Brief to Design Spec transformation
  planning. The plan defines a future staged internal-only pipeline, including
  reviewed Design Spec JSON input, reviewed Hand Sketch Instruction input,
  human pre-generation review, separately approved internal generation job
  creation, separately approved output storage planning, admin-only draft
  review, revision/redraw planning, human final approval, and email-only
  customer delivery after separate planning. Agent 53A is docs-only planning.
  No app code, API route, server action, package, lockfile, SQL, Supabase live
  access, live schema inspection, customer rows/customer data/IDs/notes
  inspection, `reviewer_note`, `customer_safe_note`, environment variable,
  secret, deploy, OpenAI call, image generation, generated image,
  email/customer delivery, customer-facing AI sketch display, gallery approval,
  plugin installation, MCP enablement, Codex settings change, analytics/
  tracking, CRM, chat, booking, marketing, monitoring, payment, account,
  third-party service connection, RLS, grant, policy, migration, storage
  change, real customer submission, or implementation Agent work was made.
  Recommended next stage is Final PR Check, then Ready + Merge if Final PR
  Check passes.
- Agent 53B: adds
  `docs/novora-agent-53b-ai-sketch-pipeline-implementation-boundary-review.md`
  on branch
  `codex/agent-53b-ai-sketch-pipeline-implementation-boundary-review`, a
  docs-only implementation boundary review before any future code-level work
  on the internal AI sketch draft pipeline. Agent 53B defines what future work
  may treat as low-risk helper scope, what requires separate planning, what
  requires separate SQL/storage or env/secrets approval, what is deferred from
  the MVP, and what is forbidden for the MVP. It relates Agent 50A Design Spec
  JSON Schema v1, Agent 50B Hand Sketch Instruction Template v1, Agent 50C
  Concept Brief to Design Spec transformation planning, and Agent 53A internal
  AI sketch draft pipeline planning without replacing or implementing them.
  The boundary review preserves the locked chain from customer Concept Brief
  to Design Spec JSON to Hand Sketch Instruction to internal-only draft
  planning, preserves the four legal final AI sketch review statuses, keeps
  `pending` illegal, keeps `approved_for_customer` separate from gallery
  approval, and preserves human review before generation and before customer
  delivery. Agent 53B is docs-only. No app code, API route, server action,
  package file, lockfile, SQL, Supabase live access, live schema inspection,
  customer rows/customer data/IDs/notes inspection, `reviewer_note`,
  `customer_safe_note`, environment variable, secret, deploy, OpenAI call,
  image generation, generated image, email/customer delivery, customer-facing
  AI sketch display, gallery approval, plugin installation, MCP enablement,
  Codex settings change, analytics/tracking, CRM, chat, booking, marketing,
  monitoring, payment, account, third-party service connection, RLS, grant,
  policy, migration, storage change, real customer submission, or
  implementation Agent work was made. Recommended next stage is Final PR
  Check, then Ready + Merge if Final PR Check passes.
- Agent 53C: adds
  `docs/novora-agent-53c-pure-helper-fake-fixture-test-plan.md` on branch
  `codex/agent-53c-pure-helper-fake-fixture-test-plan`, a docs-only planning
  packet for the first safe future pure-helper and fake-fixture test layer
  after Agent 50A Design Spec JSON Schema v1, Agent 50B Hand Sketch
  Instruction Template v1, Agent 50C Concept Brief to Design Spec
  transformation planning, Agent 53A internal AI sketch draft pipeline
  planning, and Agent 53B implementation boundary review. Agent 53C defines
  future helper scope for fake Design Spec validation, legal internal-only AI
  sketch status guards, `pending` rejection, Hand Sketch Instruction section
  formatting, internal prompt policy previews without provider calls, fake
  metadata previews, customer-safe summaries from fake fixtures,
  unknown/follow-up detection, reference copy-risk flags, and CAD/quote/order/
  production implication risk flags. It also defines fake fixture principles,
  future test categories, suggested future helper module boundaries, safe
  input/output contracts, human review gate preservation, OpenAI/provider
  exclusion, Supabase/storage exclusion, customer-facing exclusion, error/risk
  fake test cases, a future code-agent readiness checklist, and a recommended
  future Agent sequence. Agent 53C is docs-only planning. No app code, API
  route, server action, package file, lockfile, helper code, test file, SQL,
  Supabase live access, live schema inspection, customer rows/customer data/
  IDs/notes inspection, `reviewer_note`, `customer_safe_note`, environment
  variable, secret, deploy, OpenAI call, image generation, generated image,
  email/customer delivery, customer-facing AI sketch display, gallery approval,
  plugin installation, MCP enablement, Codex settings change, analytics/
  tracking, CRM, chat, booking, marketing, monitoring, payment, account,
  third-party service connection, RLS, grant, policy, migration, storage
  change, real customer submission, or implementation Agent work was made.
  Recommended next stage is Final PR Check, then Ready + Merge if Final PR
  Check passes.
- Agent 53D: adds the first low-risk code-level pure helper implementation on
  branch `codex/agent-53d-pure-helper-fake-fixture-implementation` after Agent
  50A Design Spec JSON Schema v1, Agent 50B Hand Sketch Instruction Template
  v1, Agent 50C Concept Brief to Design Spec transformation planning, Agent
  53A internal AI sketch draft pipeline planning, Agent 53B implementation
  boundary review, and Agent 53C pure-helper/fake-fixture test planning. The
  implementation adds internal-only pure helpers under `lib/server/ai-sketch/`
  for legal AI sketch review status guards, fake Design Spec shape validation,
  Hand Sketch Instruction formatting from fake Design Spec-like objects,
  internal prompt policy preview objects that are not provider requests, and
  fake-data risk flagging. It also adds fake illustrative fixture data under
  `tests/fixtures/ai-sketch/`. Executable unit tests were deferred because the
  repository has no existing unit test runner or package script, and adding a
  runner, dependency, package script, or config change is outside Agent 53D
  scope. Agent 53D preserves the exact legal AI sketch review statuses:
  `internal_draft_not_generated`, `draft_generated_internal_only`,
  `needs_revision`, and `approved_for_customer`; keeps `pending` illegal;
  keeps `approved_for_customer` separate from gallery approval; and preserves
  that AI generation success alone is not approval. Agent 53D does not modify
  app code, API routes, server actions, package files, lockfiles, SQL,
  Supabase live data/schema/storage/RLS/grants/policies, environment variables,
  secrets, deploy configuration, OpenAI or image-generation integration,
  generated images, email/customer delivery, customer-facing AI sketch display,
  gallery approval, plugin/MCP/Codex settings, third-party service
  connections, analytics/tracking, CRM, chat, booking, marketing, monitoring,
  payment, account, CAD, order, production behavior, real customer
  submissions, or production data. Recommended next stage is Final PR Check,
  then Ready + Merge if Final PR Check passes.
- Agent 54A: adds
  `docs/novora-agent-54a-agent-assisted-design-concierge-workflow-plan.md` on
  branch `codex/agent-54a-agent-assisted-design-concierge-planning`, a
  docs-only planning packet for an agent-assisted design concierge workflow.
  The recommended MVP path remains internal agent assist, human review, human
  approval, and email-only customer delivery. Mode A is recommended first.
  Mode B and Mode C are future-only paths. No implementation was added, no
  provider was connected, no Computer Use was enabled, no plugin/MCP was
  enabled, no SQL was run, no deploy was performed, no email was sent, no
  generated images were created, no customer-facing preview was added, and no
  gallery approval was added. Existing AI sketch safety boundaries remain
  unchanged.
- Agent 53E: adds executable tests for the pure AI sketch helpers using the
  existing Playwright test setup only. The tests protect core Agent 53D safety
  boundaries, including the locked legal statuses, `pending` rejection,
  generation success not being approval, no gallery shortcut, internal-only
  prompt/formatting boundaries, Design Spec validation risks, and risk flags.
  No package, config, or lockfile change was made. No helper or fake fixture
  behavior was changed. No provider, SQL, Supabase, deploy, generated image,
  email sending, customer preview, gallery approval, Computer Use, plugin/MCP,
  or production mutation was performed.
- Agent 54B: adds
  `docs/novora-agent-54b-admin-concierge-ui-workflow-plan.md`, a docs-only
  planning packet for the future admin concierge UI workflow. It translates
  Agent 54A's agent-assisted design concierge strategy into future admin-side
  UI planning for Design Spec drafts, Hand Sketch Instruction drafts, risk
  flags, internal prompt preview, internal-only draft image area, human review
  controls, `needs_revision`, `approved_for_customer`, draft customer email
  preview, and gallery separation. Current MVP remains Mode A first: internal
  agent assist, human review, human approval, and email-only customer delivery.
  No UI implementation was added. No app, API, package, test, config, or
  lockfile files were changed. No provider, SQL, Supabase, deploy, generated
  image, email sending, customer preview, gallery approval, Computer Use,
  plugin/MCP, or production mutation was performed. Existing AI sketch safety
  boundaries remain unchanged.
- Agent 54C: adds
  `docs/novora-agent-54c-customer-email-delivery-control-plan.md`, a docs-only
  planning packet for customer email draft and delivery control after Agent 54A
  concierge workflow planning and Agent 54B admin concierge UI workflow
  planning. The recommended MVP path remains agent-assisted email drafting,
  human review, explicit delivery gate, human-controlled send, and email-only
  customer delivery. Planned areas include delivery gate, customer-safe email
  structure, disclaimers, approved asset rules, link/storage safety,
  clarification flow, approved concept delivery flow, revision/needs_revision
  flow, feedback loop, admin send-control, audit trail, idempotency, failure
  fallback, and future Mode B semi-automatic email boundary. No email
  implementation was added. No email was sent. No app, API, package, test,
  config, or lockfile files were changed. No provider, SQL, Supabase, deploy,
  generated image, customer preview, gallery approval, Computer Use,
  plugin/MCP, or production mutation was performed. Existing AI sketch safety
  boundaries remain unchanged.
- Agent 55A: adds
  `docs/novora-agent-55a-admin-readonly-design-spec-instruction-display-plan.md`,
  a docs-only planning packet for future admin read-only Design Spec and Hand
  Sketch Instruction display after Agent 54A concierge workflow planning, Agent
  54B admin concierge UI workflow planning, and Agent 54C customer email
  delivery control planning. Planned read-only display areas include Design
  Spec draft, Hand Sketch Instruction draft, validation summary, risk flags
  summary, internal-only indicators, human review gates, current review status,
  customer delivery readiness summary, gallery separation, data privacy
  controls, source/version display, and safe empty states. The first future
  implementation should remain read-only and must not edit, generate, approve,
  send, publish, or mutate status. No UI implementation was added. No app, API,
  package, test, config, or lockfile files were changed. No SQL, Supabase,
  env/secrets/deploy, Vercel, provider integration, generated image, email
  sending, customer preview, gallery approval, Computer Use, plugin/MCP, or
  production mutation was performed. Existing AI sketch safety boundaries
  remain unchanged.
- Agent 55B: adds a low-risk protected admin-only read-only display for
  internal Design Spec and Hand Sketch Instruction planning artifacts on the
  existing admin brief detail page. The display may show safe summaries or
  empty states for Design Spec, Hand Sketch Instruction, validation, risk
  flags, human review gates, review status, customer delivery readiness,
  gallery separation, and not-CAD/quote/order/production warnings. It does not
  edit, generate, approve, send, publish, mutate status, access a provider,
  send email, run SQL, change Supabase schema, expose customer preview, or
  create gallery approval. Existing AI sketch, human-review, and email-only
  delivery boundaries remain unchanged.
- Agent 55C: adds
  `docs/novora-agent-55c-design-artifact-source-of-truth-persistence-boundary-plan.md`,
  a docs-only plan for future Design Spec and Hand Sketch Instruction
  source-of-truth and persistence boundaries after Agent 55B's protected
  admin-only read-only display with safe empty states. The plan covers future
  artifact definitions, source of truth, creation lifecycle, human review and
  edit lifecycle, versioning, validation result persistence, risk flags,
  private data exclusion, Concept Brief linkage, 55B read-only display
  consumption, future admin edit workflow, future generation workflow, customer
  email delivery linkage, gallery separation, audit and idempotency, empty and
  stale states, failure states, and future schema/API planning boundaries.
  Agent 55C does not implement schema, SQL, API, admin UI, persistence,
  generation, email, customer preview, gallery approval, status mutation,
  approval mutation, or production data mutation. Existing AI sketch,
  human-review, read-only display, and email-only delivery boundaries remain
  unchanged.
- Agent 55D: adds
  `docs/novora-agent-55d-design-artifact-schema-sql-planning-packet.md`, a
  docs-only future Design Spec / Hand Sketch Instruction artifact schema and
  SQL planning packet after Agent 55C's source-of-truth and persistence
  boundary planning. It compares single-table and multi-table approaches and
  recommends a cautious future schema direction with conceptual artifact,
  validation result, risk flag, audit/event, lifecycle status,
  versioning/staleness, Concept Brief linkage, private data exclusion,
  idempotency, duplicate protection, RLS/access, admin write-path, 55B
  read-only display consumption, future generation, customer email delivery,
  gallery separation, migration safety, and implementation sequence planning.
  It may include future candidate SQL text labeled do-not-run, not-executed,
  and requiring separate approval. Agent 55D does not execute SQL, create
  migrations, access Supabase, implement schema, implement app/API/UI, persist
  artifacts, generate images, send email, expose customer preview, create
  gallery approval, mutate status or approval, or mutate production data.
  Existing AI sketch, human-review, read-only display, source-of-truth, and
  email-only delivery boundaries remain unchanged.
- Agent 55E: adds
  `docs/novora-agent-55e-artifact-sql-execution-safety-migration-staging-plan.md`,
  a docs-only SQL execution safety review and migration staging plan for future
  Design Spec / Hand Sketch Instruction artifact schema work after Agent 55D's
  docs-only artifact schema / SQL planning packet. It plans SQL packet freeze
  rules, human approval gates, environment and Supabase project confirmation,
  read-only pre-execution verification, additive migration staging,
  no-destructive-change policy, manual execution readiness, candidate
  execution order, post-execution verification, rollback/stop/escalation,
  duplicate and idempotency verification, RLS/access verification, private data
  exclusion verification, 55B read-only display compatibility, future admin
  write-path boundary, future generation linkage, customer email boundary,
  gallery separation, CAD/quote/order/production separation, operational
  logging expectations, failure modes, and future implementation sequence.
  Agent 55E does not execute SQL, create migrations, access Supabase,
  implement schema, implement app/API/UI, persist artifacts, generate images,
  send email, expose customer preview, create gallery approval, mutate status
  or approval, or mutate production data. Existing AI sketch, human-review,
  read-only display, source-of-truth, schema-planning, and email-only delivery
  boundaries remain unchanged.
- Agent 55F: adds
  `docs/novora-agent-55f-final-sql-packet-manual-verification-checklist.md`,
  a docs-only final SQL packet review and manual verification checklist plan
  for future Design Spec / Hand Sketch Instruction artifact schema work after
  Agent 55D schema / SQL planning and Agent 55E execution safety / migration
  staging planning. It plans final packet identity review, frozen SQL packet
  review, SQL label and authorization checks, explicit human approval wording,
  Supabase project and environment confirmation, secrets and access handling,
  read-only preflight verification, no-destructive-change checks, additive
  migration readiness, manual execution-day checks, stop conditions,
  post-execution verification, evidence capture, rollback and escalation,
  duplicate and idempotency checks, RLS and access checks, private data
  exclusion, 55B display compatibility, future admin write-path readiness,
  future generation linkage, customer email delivery, gallery separation,
  CAD/quote/order/production separation, future implementation sequence, and
  hard stops. Agent 55F does not execute SQL, create migrations, access
  Supabase, use Supabase CLI, implement schema, implement app/API/UI, persist
  artifacts, generate images, send email, expose customer preview, create
  gallery approval, mutate status or approval, mutate rows, or mutate
  production data. Existing AI sketch, human-review, read-only display,
  source-of-truth, schema-planning, SQL-safety, and email-only delivery
  boundaries remain unchanged.
- Agent 55G: adds
  `docs/novora-agent-55g-user-run-sql-execution-decision-packet.md`, a
  docs-only user-run SQL execution decision packet plan for future Design Spec
  / Hand Sketch Instruction artifact schema work after Agent 55D schema / SQL
  planning, Agent 55E execution safety / migration staging, and Agent 55F final
  SQL packet review / manual verification checklist. It defines decision
  options to not execute now, revise the packet before execution, prepare future
  user-run execution, or proceed later to a separately approved
  execution-support step. It recommends the conservative default: no SQL
  execution now unless the human explicitly approves a separate future execution
  path. It plans required frozen packet identity, explicit human approval
  wording, Supabase project/environment confirmation, secrets/access boundary,
  user-run execution boundary, read-only preflight, execution-day stop
  conditions, post-execution verification, evidence capture,
  rollback/escalation, no-destructive-change requirement, duplicate/idempotency,
  RLS/access, private data exclusion, 55B display compatibility, customer
  email/gallery/CAD/quote/order/production separation, and future Agent
  sequencing. Agent 55G does not execute SQL, create migrations, access
  Supabase, use Supabase CLI, implement schema, implement app/API/UI, persist
  artifacts, generate images, send email, expose customer preview, create
  gallery approval, mutate status or approval, mutate rows, mutate production
  data, or start live execution support. Existing AI sketch, human-review,
  read-only display, source-of-truth, schema-planning, SQL-safety,
  final-checklist, and email-only delivery boundaries remain unchanged.
- Agent 56A: adds
  `docs/novora-agent-56a-mvp-remaining-work-map-and-next-step-sequencing.md`,
  a docs-only NOVORA MVP remaining-work map and next-step sequence after Agent
  55G. It recognizes Agent 55G is complete, that the Agent 55G merge does not
  authorize SQL execution, and that the default decision remains Option A - do
  not execute SQL now. It maps remaining work into can-continue-now,
  human/product-decision gated, SQL-approval gated, post-SQL blocked, and
  future/post-MVP categories. It recommends Agent 56B - docs-only final MVP
  scope lock and launch-readiness definition - as the immediate next step, and
  states Agent 55H is not the default next step and should only start if the
  user explicitly chooses the Agent 55G SQL execution preparation path. It
  preserves all existing AI sketch, human-review, read-only display,
  source-of-truth, SQL-safety, decision-packet, email-only delivery, no-gallery,
  no-customer-preview, and CAD/quote/order/production separation boundaries.
  Agent 56A does not execute SQL, access Supabase, use Supabase CLI, create
  migrations, implement schema, implement app/API/UI, persist artifacts,
  generate images, send email, expose customer preview, create gallery
  approval, mutate status or approval, mutate rows, mutate production data,
  start live execution support, or start Agent 55H/56B.
- Agent 56B: adds
  `docs/novora-agent-56b-final-mvp-scope-lock-and-launch-readiness-definition.md`,
  a docs-only final MVP scope lock and launch-readiness definition following
  Agent 56A's remaining-work map and sequencing. It defines current non-SQL MVP
  completion around public brief intake, reference image capture, protected
  admin review, admin notes/status, admin notification baseline, human-review
  policy, customer-safe email SOP, no-preview/no-gallery boundary, offline
  CAD/quote/production handoff, privacy boundary, and launch-readiness
  checklist. It clarifies the current MVP does not require SQL artifact schema
  execution, persisted Design Spec / Hand Sketch Instruction artifacts, real
  image generation, automatic customer delivery, customer web preview, gallery
  workflow, CAD/quote/order/production automation, or Agent 55H. It preserves
  that the Agent 55G merge does not authorize SQL execution and the default
  remains Option A - do not execute SQL now. It recommends Agent 56C as the next
  safe docs-only step for admin human-review SOP and customer-safe email SOP.
  It preserves all existing internal-only AI sketch, human-review, email-only
  delivery, no-gallery, no-customer-preview, SQL-safety, decision-packet,
  source-of-truth, read-only display, and CAD/quote/order/production separation
  boundaries. Agent 56B does not execute SQL, access Supabase, use Supabase
  CLI, create migrations, implement schema, implement app/API/UI, persist
  artifacts, generate images, send email, expose customer preview, create
  gallery approval, mutate status or approval, mutate rows, mutate production
  data, start live execution support, or start Agent 55H/56C.
- Agent 56C: adds
  `docs/novora-agent-56c-admin-human-review-sop-and-customer-safe-email-sop.md`,
  a docs-only admin human-review SOP and customer-safe email SOP following
  Agent 56B's final MVP scope lock and launch-readiness definition. It defines
  manual operating procedures for protected admin intake review,
  customer/contact review, reference image review, design intent review,
  internal AI sketch/internal draft review, human review checklist, jewelry
  feasibility review, customer-safe material, email-only customer delivery,
  revision/rejection/approval handling, gallery consent separation, CAD/quote/
  order/production offline handoff, privacy handling, incident escalation, and
  manual fallback. It clarifies customer-safe delivery requires human approval
  and email-only delivery, and that raw Design Spec, raw Hand Sketch
  Instruction, raw prompt, provider metadata, reviewer notes, admin notes,
  rejected drafts, unreviewed drafts, internal-only drafts, private storage
  paths, signed admin links, secrets, and internal risk comments must not be
  sent to customers. It preserves legal AI sketch review statuses
  `internal_draft_not_generated`, `draft_generated_internal_only`,
  `needs_revision`, and `approved_for_customer`; keeps `pending` illegal; keeps
  `approved_for_customer` separate from `approved_for_gallery`; and preserves
  that generation success is not approval. It preserves that the Agent 55G
  merge does not authorize SQL execution and default remains Option A - do not
  execute SQL now. It recommends Agent 56D as the next safe docs-only step for
  website/public copy polish and expectation-setting plan. It preserves all
  existing internal-only AI sketch, human-review, email-only delivery,
  no-gallery, no-customer-preview, SQL-safety, decision-packet,
  source-of-truth, read-only display, and CAD/quote/order/production separation
  boundaries. Agent 56C does not execute SQL, access Supabase, use Supabase
  CLI, create migrations, implement schema, implement app/API/UI, persist
  artifacts, generate images, send email, expose customer preview, create
  gallery approval, mutate status or approval, mutate rows, mutate production
  data, start live execution support, or start Agent 55H/56D.
- Agent 56D: adds
  `docs/novora-agent-56d-website-public-copy-polish-and-expectation-setting-plan.md`,
  a docs-only website/public copy polish and expectation-setting plan following
  Agent 56C's admin human-review SOP and customer-safe email SOP. It defines
  public-facing copy rules for the homepage, CTA, design start, concept, brief,
  reference upload, submitted page, sketch/preview route boundary, gallery, AI
  concept sketch wording, human review wording, email-only delivery wording,
  CAD/quote/order/production boundary wording, timeline wording, pricing and
  material wording, lab diamond/gemstone wording, customer-safe disclaimers,
  and copy QA. It clarifies the current MVP public position: the customer
  submits a design brief, the team reviews internally, customer-safe concept
  direction is delivered by email after human review, and CAD, quotation, order,
  and production are separate offline next steps. Public copy must not promise
  instant AI sketch, automatic customer preview, CAD, quote, order confirmation,
  production approval, final manufacturability, guaranteed material or stone
  availability, gallery publication, or production-ready files. The
  owner-approved public timeline expectation is a first human-reviewed
  customer-safe concept draft or first concept response target within 24 hours
  after a sufficiently complete brief is submitted; customer revision loops are
  separate and not counted inside that first-draft target; production target is
  15-30 days after CAD, materials, stones, quotation, and order details are
  separately confirmed; and logistics target is 5-10 days, subject to
  destination, carrier, customs, and local delivery conditions. It preserves
  that website quick AI preview is future product only, `approved_for_customer`
  is not `approved_for_gallery`, generation success is not approval, and the
  Agent 55G merge does not authorize SQL execution because the default remains
  Option A - do not execute SQL now. It recommends optional Agent 56E only if
  the owner wants safe static public copy implementation, while preserving all
  existing internal-only AI sketch, human-review, email-only delivery,
  no-gallery, no-customer-preview, SQL-safety, decision-packet,
  source-of-truth, read-only display, and CAD/quote/order/production separation
  boundaries. Agent 56D does not execute SQL, access Supabase, use Supabase
  CLI, create migrations, implement schema, implement app/API/UI, persist
  artifacts, generate images, send email, expose customer preview, create
  gallery approval, mutate status or approval, mutate rows, mutate production
  data, start live execution support, or start Agent 55H/56E.
- Agent 56F: adds
  `docs/novora-agent-56f-qa-release-readiness-checklist.md`, a docs-only QA /
  release readiness checklist for the current non-SQL MVP following Agent 56B's
  scope lock, Agent 56C's admin human-review and customer-safe email SOP, and
  Agent 56D's public copy boundary plan. Its required 32-section structure
  covers scope, source-of-truth hierarchy, current MVP launch candidate
  definition, blocked actions, pre-QA repository readiness, public route
  inventory, homepage/start/concept/brief/submitted/sketch/gallery QA, public
  copy and timeline wording, contact and customer identity, admin access and
  brief review, human-review SOP, customer-safe email delivery, AI/internal
  draft safety, CAD/quote/order/production separation, privacy, security,
  abuse-control, manual fallback, soft-launch go/no-go criteria, next Agent
  sequence, and final recommendation. It clarifies that evidence may be
  gathered later only by a separately approved QA, smoke-test, or
  release-readiness execution task, and that the checklist itself does not
  approve launch, public
  promotion, Production verification, protected admin access, customer-data
  review, SQL execution, Supabase changes, Vercel changes, provider
  configuration, email sending, deploys, app code changes, or test execution.
  It preserves the current non-SQL MVP boundary, Agent 55G Option A default,
  fail-open Production rate-limit posture for quiet MVP only, internal-only
  AI/draft boundary, human-review and email-only delivery boundary,
  no-gallery/no-customer-preview boundary, and CAD/quote/order/production
  separation. Agent 56F does not execute SQL, access Supabase, use Supabase
  CLI, create migrations, implement schema, implement app/API/UI, persist
  artifacts, generate images, send email, expose customer preview, create
  gallery approval, mutate status or approval, mutate rows, mutate production
  data, start live execution support, or start Agent 55H/56E/56G.
- Agent 60I: records the owner decision to pivot the MVP toward instant
  customer-facing AI concept sketch preview as the intended product and
  conversion path after Concept Brief submission. Limited beta direction is
  invite-only, 5-10 users, with English and Traditional Chinese target language
  options. Human intervention focus shifts toward structure logic, jewelry
  construction, production feasibility, and correction after the initial AI
  preview. CAD, quote, payment, order approval, and production approval remain
  offline and not approved through the website. This is docs-only; no app
  implementation, image generation, provider connection, route change,
  Supabase change, email change, protected admin access, Production data
  access, test change, asset change, merge, or cleanup occurred. No manual
  deployment, Production deployment, Vercel configuration change, environment
  variable change, or Production system action occurred. An automatic Vercel
  Preview deployment may be triggered by the normal PR integration and is not a
  manual or Production deployment.
- Agent 61A: adds
  `docs/novora-instant-customer-sketch-preview-implementation-plan.md`, a
  docs-only implementation plan for the owner-approved instant customer-facing
  AI concept sketch preview path. The planned flow is customer Concept Brief ->
  structured Design Spec -> Hand Sketch Instruction -> first AI hand-drawn
  concept sketch preview -> customer feedback -> human correction or
  regeneration. The AI sketch remains an early concept preview only, not CAD,
  not a quote, not payment confirmation, not order approval, and not production
  approval. Agent 61A does not implement image generation, connect OpenAI or
  any image API, change app code, routes, UI, tests, packages, Supabase, SQL,
  Vercel config, environment variables, email behavior, protected admin pages,
  Production data, assets, or deployment behavior.
- Agent 61B: adds
  `docs/novora-customer-sketch-preview-route-ui-state-plan.md`, a docs-only
  route and UI state plan for the future instant first AI concept sketch
  preview path. The plan covers candidate customer preview routing, processing
  states, first-preview-ready state, failure and fallback states, feedback
  entry points, required disclaimers, bilingual copy needs, accessibility and
  UX considerations, privacy and security boundaries, human correction handoff,
  admin and operations implications, analytics planning, future agent
  sequencing, open decisions, and stop conditions. The AI sketch remains a
  concept preview only, not CAD, quote, payment, order, or production approval.
  Agent 61B does not implement app routes, UI, OpenAI or image API integration,
  image generation, Supabase, SQL, Vercel config, environment variables, email,
  protected admin access, Production data access, tests, assets, deployment, or
  runtime behavior.
- Agent 61C: adds
  `docs/novora-instant-sketch-preview-data-status-sql-plan.md`, a docs-only
  data/status model and SQL packet planning document for future instant
  customer sketch preview and feedback records. The planning covers preview
  lifecycle states, feedback records, generation jobs, generated outputs,
  storage boundaries, public reference / token handling, idempotency, duplicate
  protection, RLS and server-only boundaries, error/retry/delay states, and
  customer-visible versus internal-only field separation. The AI sketch remains
  a concept preview only, not CAD, not a quote, not payment confirmation, not
  order approval, and not production approval. Agent 61C does not execute SQL,
  create migrations, change Supabase, connect OpenAI or any image API, change
  Vercel config or environment variables, implement routes or UI, deploy, or
  access Production data.
- Agent 61D: adds
  `docs/novora-first-preview-design-spec-hand-sketch-instruction-alignment.md`,
  a docs-only alignment plan for future first-preview generation artifacts. The
  planning covers raw brief -> normalized intent -> Design Spec JSON -> Hand
  Sketch Instruction -> first-preview prompt package, and records the owner
  requirement that first sketches should include subtle NOVORA branding/logo
  treatment and a broadly unified NOVORA sketch style. The AI sketch remains a
  concept preview only, not CAD, quote, payment, order, or production approval.
  Agent 61D does not execute prompts, generate images, connect OpenAI or any
  image API, change Supabase or SQL, change Vercel config or environment
  variables, implement routes or UI, create or modify assets, deploy, access
  protected admin pages, or access Production data.
- Agent 61E: adds
  `docs/novora-preview-lifecycle-feedback-sql-packet-draft.md`, a docs-only SQL
  packet draft plan for future preview lifecycle and customer feedback records.
  The planning covers a preview lifecycle table, feedback table, status
  constraints, `ai_sketch_jobs` / `ai_sketch_outputs` integration,
  `ai_sketch_reviews` boundary, duplicate protection, public reference/token
  strategy, RLS/storage policy direction, verification queries, rollback, and
  migration ordering. `first_preview_ready` remains separate from
  `approved_for_customer`, and the AI sketch remains a concept preview only,
  not CAD, quote, payment, order, or production approval. Agent 61E does not
  execute SQL, create migrations, mutate Supabase, implement app routes or UI,
  call OpenAI or image APIs, change Vercel config or environment variables,
  create or change assets, deploy, access protected admin pages, or access
  Production data.
- Agent 61F: adds a mock-only customer preview route skeleton at
  `/design/preview/[public_reference]` for future first AI hand-sketch concept
  preview states. The route displays safe local mock states without database
  reads, Supabase calls, SQL, OpenAI/image API calls, or live image generation.
  It includes NOVORA concept preview branding, a unified CSS-only sketch-sheet
  placeholder style, concept-preview disclaimers, and a disabled/mock feedback
  entry point for future human correction or regeneration. `first_preview_ready`
  remains separate from `approved_for_customer`, and the AI sketch remains a
  concept preview only, not CAD, quote, payment, order, or production approval.
  Agent 61F does not execute SQL, create migrations, mutate Supabase, change
  Vercel config or environment variables, call OpenAI or image APIs, generate
  images, create or modify assets/logo files, send email, deploy, access
  protected admin pages, or access Production data.
- Agent 61F-QA: fixes the existing CAD-page e2e strict locator failure caused by
  duplicate `Start a Concept Brief` links from the shared header and CAD page
  body. This is QA/test-stability only; it does not change business flow,
  customer-submission behavior, Supabase, SQL, OpenAI/image API, image
  generation, assets/logo work, Vercel/env, deploy, protected admin access, or
  Production data. The Agent 61F mock preview route remains mock-only.
- Agent 61G: adds a pure local Design Spec JSON helper and fake fixture
  foundation for future first-preview planning. Raw customer natural language
  remains prohibited as a direct final image-generation prompt; Design Spec
  must precede Hand Sketch Instruction and any future image generation. The
  fixture is mock-only, contains no real customer data, includes NOVORA
  sketch-style and branding-watermark requirements, preserves the zodiac mouse
  eye gemstone rule, and keeps `first_preview_ready` separate from
  `approved_for_customer`. The AI sketch remains a concept preview only, not
  CAD, quote, payment, order, or production approval. Agent 61G does not call
  GPT/OpenAI or image APIs, generate images, read or mutate Supabase, execute
  SQL, create migrations, change Vercel/env, send email, access protected
  admin pages or Production data, create or modify assets/logo files, or wire
  the helper into live routes, submissions, API routes, server actions, or
  customer flows.
- Agent 61H: adds a pure local Hand Sketch Instruction helper and fake fixture
  foundation that converts or aligns with the Agent 61G Design Spec fixture.
  Raw customer natural language remains prohibited as a direct final
  image-generation prompt; Design Spec precedes Hand Sketch Instruction, and
  Hand Sketch Instruction precedes any future provider-specific image prompt.
  The fixture is mock-only, contains no real customer data, includes NOVORA
  sketch-sheet style and text-only watermark requirements, preserves the zodiac
  mouse eye gemstone rule, and keeps `first_preview_ready` separate from
  `approved_for_customer`. The AI sketch remains a concept preview only, not
  CAD, quote, payment, order, or production approval. Agent 61H revision 1
  explicitly adds the human-review-required safety boundary for customer-safe
  delivery and production decisions. Agent 61H does not call GPT/OpenAI or
  image APIs, generate images, read or mutate Supabase, execute SQL, create
  migrations, change Vercel/env, send email, access protected admin pages or
  Production data, create or modify assets/logo files, or wire the helper into
  live routes, submissions, API routes, server actions, or customer flows.
- Agent 61I: adds a pure local Preview Generation Mock Bridge connecting the
  Agent 61G Design Spec fixture and Agent 61H Hand Sketch Instruction fixture
  to a fake preview generation result. The mock result is provider-free,
  contains no real generated image, no real image URL, and no provider output
  id. `first_preview_ready` remains separate from `approved_for_customer`, and
  human review remains required for customer-safe delivery and production
  decisions. The AI sketch remains a concept preview only, not CAD, quote,
  payment, order, or production approval. Agent 61I does not call GPT/OpenAI
  or image APIs, generate images, read or write Supabase, execute SQL, create
  migrations, change Vercel/env, send email, access protected admin pages or
  Production data, create or modify assets/logo files, or wire the helper into
  live routes, submissions, API routes, server actions, or customer flows.
- Agent 61J: integrates the Agent 61I Preview Generation Mock Bridge into the
  existing `/design/preview/[public_reference]` mock route. The
  `first_preview_ready` route content can now render mock bridge preview data
  while keeping lifecycle states mock-only. No real image URL, provider output,
  base64 image data, or generated image is introduced. No live route submission
  integration, Supabase/SQL/migration, GPT/OpenAI/image API, image generation,
  Vercel/env/email, Production data, protected admin, asset, logo, CAD, quote,
  payment, order, or production approval work occurred. `first_preview_ready`
  remains separate from `approved_for_customer`, human review remains required
  for customer-safe delivery and production decisions, and the AI sketch
  remains concept preview only.
- Agent 61K: adds a mock-only preview entry/link to `/design/submitted` so the
  submitted page can point to the existing `/design/preview/[public_reference]`
  mock route for a first-preview demonstration. The link targets the fixed local
  mock reference `NOVORA-CB-MOCK-001` with `state=first_preview_ready`; it does
  not connect real submissions, read or write Supabase, execute SQL, create a
  migration, call GPT/OpenAI or image APIs, generate images, introduce a real
  image URL, provider output id, or base64 image data, or perform
  Vercel/env/email/Production data/protected admin work. `first_preview_ready`
  remains separate from `approved_for_customer`, human review remains required
  for customer-safe delivery and production decisions, and the AI sketch remains
  concept preview only, not CAD, quote, payment, order, or production approval.
- Agent 61M: records completion of the mock preview flow milestone after PR
  #175, `Agent 61K: Add submitted page mock preview link`, merged at
  `e3b75528526c985580bc4d1e22aff6717ad981d7`. Agent 61K added the mock-only
  `/design/submitted` link labeled `View mock concept preview` targeting exactly
  `/design/preview/NOVORA-CB-MOCK-001?state=first_preview_ready`, then completed
  post-merge cleanup by deleting local and remote branch
  `codex/agent-61k-submitted-preview-link-mock-entry` with final branch `main`
  clean. Agent 61L read-only QA passed and confirmed the mock flow from
  `/design/submitted` to
  `/design/preview/NOVORA-CB-MOCK-001?state=first_preview_ready`; safety
  boundaries remained intact: `first_preview_ready` stays separate from
  `approved_for_customer`, the preview is mock/demo/planning only, human review
  remains required before customer-safe delivery or production decisions, and no
  CAD, quote, order approval, payment approval, or production approval behavior
  was added. Agent 61L also confirmed no live integration was introduced: no
  Supabase read/write, server action/API/database write, GPT/OpenAI/image API
  call, real image generation, real image URL/provider output/base64 image
  data, or asset/logo work. Validation recorded `git diff --check`,
  `npm.cmd run build`, a focused Playwright runnable test ok, and the full
  focused spec with 30 runnable tests ok and 2 admin-env tests skipped; Windows
  Playwright teardown timed out after runnable tests had already reported ok.
  Known local route-type churn in `next-env.d.ts` between
  `.next/types/routes.d.ts` and `.next/dev/types/routes.d.ts` was restored, and
  final Agent 61L status was `main` clean with no remaining changed files.
- Agent 62A: adds
  `docs/novora-preview-mock-flow-hardening-plan.md`, a docs-only hardening plan
  for the next mock preview flow phase. It records current Agent 61K/61L/61M
  baseline behavior, non-negotiable safety boundaries, open hardening
  questions, recommended follow-up Agents, risks, acceptance criteria, and
  out-of-scope items. Agent 62A does not implement route logic, app behavior,
  tests, API behavior, Supabase, SQL, provider integration, image generation,
  deployment, environment changes, assets, logo work, or any next Agent.
- Agent 62B: implements consolidated preview mock flow hardening. The only
  successful mock preview route remains
  `/design/preview/NOVORA-CB-MOCK-001?state=first_preview_ready`; missing or
  unsupported `state`, `approved_for_customer`, and unsupported
  `public_reference` values render a safe unavailable state instead. The
  submitted-page mock link copy is hardened as demo/navigation testing only
  and stays disconnected from the customer's submitted brief. Focused e2e
  coverage was added for the valid mock route, unavailable route cases, and the
  submitted-page demo link target. No Supabase, SQL, OpenAI/image API, real
  generation, deploy, env, Production, protected admin data, payment, CAD,
  quote, order, or production approval change is introduced.
- Agent 63A-F1: Agent 63A smoke QA found stale preview-route e2e expectations
  after Agent 62B. This follow-up aligned
  `tests/e2e/design-preview-route.spec.ts` with the hardened Agent 62B preview
  boundaries. No app behavior changed. No Supabase, SQL, OpenAI/image API, real
  generation, deploy, env, Production, protected admin data, payment, CAD,
  quote, order, or production approval changes occurred. `next-env.d.ts` and
  `test-results/` remain QA artifacts and must not be committed.
- Agent 63B: created
  `docs/novora-agent-63b-mvp-launch-readiness-checklist.md`, a docs-only final
  MVP launch readiness checklist. It records controlled soft-launch readiness,
  manual launch checks, and explicit no-go conditions. Agent 63B does not
  deploy, modify app behavior, touch Supabase/SQL/env/Production/protected
  data, call OpenAI/image APIs, send emails, or add payment, CAD, quote, order,
  or production approval behavior. Its human-first/email-only AI visibility
  rules are transition-era wording superseded by the post-Agent-60I instant
  first-preview direction; its other readiness history remains useful.
- Agent 64A: created
  `docs/novora-agent-64a-production-owner-run-verification-plan.md`, a
  docs-only owner-run Production verification and controlled soft-launch
  execution plan. It does not deploy, mutate Production, read/write Supabase,
  execute SQL, expose secrets, send emails, call OpenAI/image APIs, generate
  images, or add payment, CAD, quote, order, or production approval behavior.
  It defines owner-run checks, go/no-go criteria, and a rollback/stop
  procedure.
- Agent 65A: created
  `docs/novora-agent-65a-owner-run-production-verification-tracker.md`, a
  docs-only owner-run Production verification execution tracker and test-data
  checklist. It does not deploy, mutate Production, access Supabase, execute
  SQL, inspect environment values or secrets, send emails, call OpenAI/image
  APIs, generate images, or add payment, CAD, quote, order, or production
  approval behavior. It provides owner-fillable templates for test data,
  evidence, checks, blockers, rollback/stop logging, and the go/no-go decision.
  Its former human-first/email-only AI visibility checks are transition-era
  wording superseded by the post-Agent-60I direction; its Production and
  operational verification history remains useful.
- Agent 65B-F1: investigated and fixed/hardened the local
  `/api/concept-briefs` persistence failure path after owner-run Production
  verification reported a `202` fallback with a TypeError at the
  `concept_briefs` insert stage. The local code now rejects malformed Supabase
  project URLs before creating the admin client, catches and classifies thrown
  parent/contact persistence failures, keeps public fallback responses
  privacy-safe, and only returns persisted success after a valid
  `publicReference` and Concept Brief UUID are confirmed. A narrowly gated
  local Playwright API regression covers the malformed URL fallback without
  connecting to Supabase. Admin notification remains secondary after confirmed
  persistence. Agent 65B-F1 did not access Production, Supabase dashboard,
  protected admin/customer data, SQL, environment values, or secrets; did not
  deploy, send email, call OpenAI/image APIs, generate images, stage, commit,
  push, open a PR, or start another agent.
- Agent 65B-F2: owner-run Production retest after Agent 65B-F1 still returned
  `202` at the `concept_briefs_insert` stage with an `unknown_error`
  classification. Agent 65B-F2 inspected the current local insert payload,
  local schema references, admin read columns, and prior live-schema alignment
  history. The current insert payload was preserved because local history shows
  the app had previously aligned to live columns and later Production smoke
  tests persisted Concept Brief rows with those app-facing fields. Agent 65B-F2
  added safe local-only diagnostics for `concept_briefs` insert failures so the
  next owner-run Production test can classify PostgREST schema/column mismatch,
  not-null/check violations, permission/RLS issues, unique conflicts, invalid
  JSON/type issues, URL/config problems, and network/fetch failures without
  logging customer data or secrets. Public fallback responses remain
  privacy-safe, successful persistence still requires `201`, `persisted: true`,
  a valid `NOVORA-CB-...` public reference, and a valid Concept Brief UUID, and
  admin notification remains secondary after confirmed persistence. This was
  local code/test/docs work only: no Production access, Supabase dashboard,
  SQL, environment or secret inspection, deploy, email sending, OpenAI/image
  API call, image generation, staging, commit, push, PR, merge, or next-agent
  action occurred.
- Agent 65B-L1 (2026-07-09): records owner-run Production verification after
  PR #184 / Agent 65B-F2 merged at
  `d0bbeccd5582b9c9a1259385204cd4360ddef47a` and post-merge cleanup completed.
  Vercel showed the Production deployment from `main` commit `d0bbecc` as
  Ready. The first owner-run Production test after deployment still returned
  `202` from `/api/concept-briefs` with `ok: true`, `mode: supabase`, and
  `persisted: false`, and the page showed the server receipt warning. The new
  diagnostics safely classified the failure as `stage: concept_briefs_insert`,
  `messageClass: network_or_fetch_failure`, with safe hint `Check Supabase API
  reachability from the runtime.` The root cause was owner-side
  infrastructure/config state, not NOVORA app code: the `novora-production`
  Supabase project was paused on the Free plan, so the Supabase project API was
  not reachable. After the owner resumed the project, unauthenticated
  `/rest/v1/` reachability returned the expected `No API key found in request`
  response. The owner then reran one controlled Production test brief and final
  verification passed: `/design/submitted` success was reached, the admin
  notification email was received, the protected admin detail link opened, the
  Supabase-backed Concept Brief detail loaded, admin notification status showed
  `sent`, CAD / quote / payment / production boundary copy remained present,
  and AI sketch behavior remained internal-only with human-review and customer
  delivery boundaries intact. Final outcome: Production owner-run verification
  PASS with operational risk. Supabase Free projects may pause again, so
  soft-launch and Production operations should monitor this risk; before public
  soft launch or continued external testing, the owner should keep the Supabase
  project active, periodically verify project health, or plan an
  upgrade/alternative hosting strategy. Non-blocking follow-up: the protected
  admin detail showed Concept Brief and notification data correctly, but admin
  review status / internal notes displayed local-only fallback for that record;
  this did not block submission, admin email, or protected detail loading, and
  a future optional Agent may diagnose Supabase-backed admin review
  status/internal notes persistence separately. This ledger update is sanitized
  owner-run verification documentation only: Codex did not access Production,
  inspect customer data, access or write the Supabase dashboard, run SQL,
  inspect environment values or secrets, deploy, send email, call OpenAI/image
  APIs, generate images, stage, commit, push, create or update a PR, mark ready,
  merge, start a next Agent, or perform payment, CAD, quote, order, production
  approval, or customer-delivery action.

- Agent 65C-F1: fixes protected admin Concept Brief detail empty-state copy
  after the owner-run follow-up confirmed Concept Brief admin review
  status/internal notes persistence works after the first valid save. The
  protected detail now distinguishes a new Supabase-backed Concept Brief with no
  saved `admin_notes` review row yet from true Supabase admin review
  persistence/read unavailability. This is an empty-state/copy-only app change:
  first save behavior still creates an `admin_notes` row, successful save copy
  still reports `Saved to Supabase admin_notes.`, and existing persisted review
  state still displays as Supabase-backed. Agent 65C-F1 did not access
  Production, Supabase, SQL, environment values or secrets, deploy, send email,
  call OpenAI/image APIs, generate images, stage, commit, push, create a PR, or
  add CAD, quote, payment, order, production, gallery approval, or customer
  delivery behavior. AI sketch review remains separate and internal-only.

- Agent 66A: adds
  `docs/novora-agent-66a-mvp-soft-launch-readiness-snapshot.md`, a docs-only
  final MVP soft-launch readiness snapshot after successful owner-run
  Production verification and PR #186 empty-state copy verification. The
  snapshot records that the earlier Production submission failure was caused by
  the paused `novora-production` Supabase Free project, not NOVORA app code;
  after the owner resumed Supabase, controlled Production verification passed
  for submitted-page success, admin notification receipt, protected admin
  detail loading, Supabase-backed Concept Brief detail, sent notification
  status, and CAD / quote / payment / production boundary copy. It also records
  the ongoing Supabase pause risk, the verified PR #186 empty-state copy for a
  new Supabase-backed record with no saved `admin_notes` row yet, and the locked
  AI sketch / human review / email-only customer-delivery boundaries. Agent 66A
  recommends limited owner-controlled soft-launch / private testing only, not
  full public launch or broader public traffic, until Supabase health monitoring
  or an upgrade/alternative hosting plan is in place. Agent 66A changed docs
  only and made no code, SQL, environment, deploy, Supabase dashboard, email,
  OpenAI/image API, image generation, CAD, quote, payment, order, production,
  gallery, customer-delivery, staging, commit, push, PR, merge, or Production
  access change. Its internal-only, human-pre-approval, and email-only AI
  visibility rules are preserved as transition-era history and are superseded
  for future work by the post-Agent-60I instant first-preview direction.

- Agent 66B: adds
  `docs/novora-agent-66b-soft-launch-owner-operating-checklist.md`, a docs-only
  owner operating checklist for limited soft-launch / private testing after
  Agent 66A. The checklist records Supabase health monitoring, Vercel
  Production health checks, Concept Brief smoke-test pass criteria, admin
  notification and protected admin detail checks, admin review empty/saved-state
  checks, stop/recovery criteria for paused or unreachable Supabase, weekly
  owner review prompts, go/no-go decision notes, and soft-launch limits. It
  reinforces that NOVORA remains suitable only for owner-controlled private
  testing, not full public launch, paid traffic, automated customer-facing AI
  sketches, CAD/quote/payment/order/production automation, or unreviewed
  customer delivery. Agent 66B changed docs only and made no code, SQL,
  environment, deploy, Supabase dashboard access, email sending, OpenAI/image
  API, image generation, CAD, quote, payment, order, production, gallery,
  customer-delivery, staging, commit, push, PR, merge, or Production access
  change. Its former AI visibility and email-only delivery rules are
  transition-era wording superseded by the post-Agent-60I direction; its
  Supabase-health and operating checks remain historical evidence.

- Agent 66C: adds
  `docs/novora-agent-66c-private-tester-invitation-wording-pack.md`, a docs-only
  private tester invitation and intake wording pack for limited
  owner-controlled private testing only. The pack reinforces Concept Brief
  boundaries, AI internal-only / human-review / email-only delivery boundaries,
  and no CAD, quote, payment, order, production, gallery, or customer-delivery
  promises. Agent 66C changed docs only and made no code, SQL, environment,
  deploy, Supabase dashboard access, email sending, OpenAI/image API, image
  generation, CAD, quote, payment, order, production, gallery,
  customer-delivery, staging, commit, push, PR, merge, or Production access
  change. Its invitation language reflects the transition-era internal-only,
  human-first, email-only direction and must not be used for new testing under
  the locked instant first-preview direction.

- Agent 66D: adds
  `docs/novora-agent-66d-private-testing-feedback-triage-template.md`, a
  docs-only private testing feedback log and issue triage template for limited
  owner-controlled private testing only. The template records severity and type
  categories, pause criteria, Agent/PR decision rules, privacy sanitization, and
  NOVORA AI sketch / CAD / payment / customer-delivery boundaries. Agent 66D
  changed docs only and made no code, SQL, environment, deploy, Supabase
  dashboard access, email sending, OpenAI/image API, image generation, CAD,
  quote, payment, order, production, gallery, or customer-delivery changes.
  Its private-testing triage template preserves transition-era AI visibility
  wording and must not be used to run new testing under the superseded rules.

- Agent 66E branch status (not merged at the Agent 67A starting baseline): an
  Agent 66E branch was previously reported locally and remotely at HEAD
  `6cd23aa`. No GitHub PR was found at the Agent 67A starting baseline. Its
  reported private-testing template uses superseded first-sketch visibility
  wording, so it must not be merged as-is. Branch deletion, salvage, or
  rebuilding is a separate future task; Agent 67A did not inspect or adopt its
  unknown local files and does not alter that branch.

- Agent 68A / PR #192 merged at
  `5777498c2db6c52b1d97127206578760acea0d3f` and adds a provider-neutral,
  server-only first-preview runtime foundation. It reuses the existing Design
  Spec and Hand Sketch Instruction types and validators, defines a sanitized
  exactly-one-image provider
  contract, adds dependency-injected orchestration with safe exception,
  timeout, cancellation, malformed-output, unsafe-output, and leakage handling,
  and adds fail-closed automatic gate evaluation. Deterministic fake-provider
  tests cover valid output, provider error, timeout, malformed output, unsafe
  output, missing asset, metadata/internal-prompt/reviewer-note leakage,
  privacy/access failure, no-network behavior, and multiple-image rejection.
  `first_preview_ready` is a TypeScript-only internal runtime decision here; it
  is not a database column or live persistent status, does not require
  `approved_for_customer`, and remains unrelated to `approved_for_gallery`,
  CAD, quotation, payment, order, or production approval. Agent 68A does not
  implement a real provider, real image generation, SQL or persistent preview
  lifecycle, private Storage, customer authentication, customer submission or
  preview route wiring, deployment, or Production changes. Current customer
  preview behavior remains mock-only.

- Agent 69A / PR #193 merged at
  `a368505413b244aace0a8d3dc84df5af9175d1f6`. It adds
  `docs/novora-first-preview-product-contract-v1.md` and aligns the
  post-Agent-68A source of truth. The docs-only contract is now the governing
  First Preview source for product boundaries, lifecycle, trusted evidence
  producers, fail-closed automatic gates, `first_preview_ready` rules,
  secure-access boundaries, state separation, the post-preview human-review
  boundary, and idempotency/retry/cost requirements. It does not implement or
  change app code, tests, schema, SQL, Supabase, Storage, provider integration,
  API behavior, UI, environment configuration, deployment, Production, real
  generation, or customer data.

- Agent 69B / PR #194 merged at
  `184c84acda3caa8c47b81c859b511e3a061cee24` and adds
  `docs/novora-first-preview-data-model-sql-plan-v1.md`, a docs-only First
  Preview data-model inventory and candidate SQL planning packet governed by
  Product Contract v1. It inventories repository-recorded live metadata and
  current code-used fields, prefers reusing existing `ai_sketch_jobs`,
  `ai_sketch_outputs`, and `ai_sketch_reviews`, keeps automatic first-preview
  visibility separate from human `approved_for_customer` and gallery
  `approved_for_gallery`, maps trusted persisted evidence, and plans
  idempotency, retries, timeout, cost, private assets, and safe failure. Its SQL
  is candidate-only and blocked on a separate approved live-schema verification
  and exact-SQL step. Agent 69B does not execute SQL, connect to Supabase,
  change schema/RLS/grants/policies/Storage, inspect customer data, or implement
  provider, API, UI, access, deployment, or Production behavior.

- Agent 69C: adds
  `docs/novora-first-preview-provider-cost-privacy-decision-v1.md`, a docs-only
  provider decision packet. It selects OpenAI Image API with pinned
  `gpt-image-2-2026-04-21`, exactly one 1024-by-1024 medium-quality PNG,
  `moderation=auto`, no streaming, and no reference-image forwarding for the
  initial adapter. It defines a structured-data allowlist, provider-response
  normalization, independent trusted safety evidence, a 150-second attempt
  deadline, bounded retry/regeneration and late-result behavior, cost
  reservation and fail-closed budget rules, and separate submission,
  generation, feedback, and admin-recovery rate-limit boundaries. The observed
  provider price is dated planning evidence, not a permanent price promise.
  Agent 69C does not add a provider SDK or key, make an image request, access
  billing, execute SQL, connect to Supabase, inspect customer data, change
  schema/Storage/RLS/environment/application code, deploy, or change Production.

- Agent 70A / PR #196 merged with normal merge commit
  `68c0042d1fec70cf07b87d47e6d8ef6f3b74e074` and adds a server-only,
  dependency-injected OpenAI GPT Image 2 adapter
  foundation behind the existing provider-neutral First Preview request
  contract. It pins `gpt-image-2-2026-04-21`, maps one non-streaming
  1024-by-1024 medium-quality PNG request with `moderation=auto`, builds a
  deterministic prompt from a deep Hand Sketch Instruction field allowlist,
  validates exactly one canonical base64 PNG up to 16 MiB, normalizes safe
  provider failure categories, and uses deterministic fake-client tests that
  block external network access. Agent 70A does not construct a real OpenAI
  client, read or create an API key, log in to a provider, make a real request,
  generate an image, wire a route or customer flow, execute SQL, access
  Supabase or customer data, change Storage/RLS/environment configuration,
  activate customer preview visibility, deploy, or change Production.

- Agent 70B-1 / PR #197 merged with normal merge commit
  `e77d2e6267f78ecf1109198ae100149eb8e466e4` and adds
  `docs/novora-agent-70b1-first-preview-live-schema-preflight-v1.md`, a
  documentation-only, owner-run, SELECT-only metadata verification packet for
  `public.ai_sketch_jobs`, `public.ai_sketch_outputs`,
  `public.ai_sketch_reviews`, `public.concept_briefs`,
  `public.concept_brief_reference_assets`, and `public.admin_notes`. The packet
  separates repository facts, historical live evidence, current unknowns, and
  Agent 69B candidate fields; inventories tables, columns, constraints, foreign
  keys, indexes, triggers, RLS, policies, grants, candidate capability fields,
  and feedback-compatible relationships; and supplies sanitized owner result
  capture and fail-closed decision gates. Agent 70B-1 does not connect to
  Supabase, execute SQL, inspect business/customer rows, change schema/RLS/
  policies/grants/triggers/Storage, modify app/runtime/test code, access a
  provider or key, generate an image, wire a route, change an environment,
  deploy, or operate Production. Exact migration SQL remained blocked until all
  required owner-run sanitized metadata results were returned and reviewed.

- Agent 70B-2 reviews the complete owner-run Q01-Q11 metadata evidence dated
  2026-07-13 and adds
  `docs/novora-agent-70b2-first-preview-live-schema-review-and-additive-sql-plan-v1.md`.
  The validated row counts are Q01-Q11 = `6, 63, 9, 7, 14, 2, 0, 103, 5, 10,
  9`; Q01 is complete CSV metadata evidence, while Q07 is owner-attested
  screenshot evidence that visibly reports a successful complete zero-row
  policy result. The evidence verifies six ordinary public tables with RLS
  enabled and forced RLS false; the existing job -> output -> review relation
  chain; the four exact review statuses with `pending` excluded; review
  uniqueness by `concept_brief_id`; existing defaults, FKs, indexes, and update
  triggers; zero visible explicit policies; and missing dedicated idempotency,
  attempt, lineage, asset-integrity, automatic-readiness, cost, and
  current-preview invariants. Q08 direct grants do not resolve ownership,
  membership, BYPASSRLS, effective privileges, PostgREST behavior, or API
  exploitability, so the effective access posture remains unresolved. Agent
  70B-2 is documentation-only and prepares additive candidate SQL plus separate
  owner-run metadata and aggregate compatibility preflights. No SQL was
  executed, no Supabase connection was made by Codex, no business/customer rows
  were inspected, and migration execution remains blocked pending formal review
  and returned supplemental evidence. Private generated-asset Storage and
  access, real Provider credentials/client/calls, confirmed-persistence route
  wiring, automatic readiness implementation, customer First Preview UI,
  deployment, and Production behavior remain unimplemented.

  The first independent formal review of Draft PR #198 returned **FAIL —
  CORRECTION REQUIRED**. Its six blocking categories were: (1) NULL-safe
  readiness constraints and violation preflights; (2) ready/current separation;
  (3) purpose/attempt and complete pinned Provider-profile NULL safety; (4)
  enforceable same-brief lineage, source-output, and output/job consistency; (5)
  complete versioned deterministic idempotency; and (6) private-asset/readiness/
  revocation chronology. PR #198 remains Draft. The correction is
  documentation-only; no SQL was executed and no Supabase connection occurred.
  A second independent Re-Review must pass before the owner runs any supplemental
  preflight. The corrected packet contains 30 owner-run SELECT-only preflight
  blocks and 7 candidate-only SQL blocks; none was executed.

  The corrected lifecycle keeps readiness output-bound and current selection
  separate: a ready output may be non-current, while a current output must be
  ready and at most one may be current per Concept Brief. A later writer must
  switch current selection transactionally. `asset_created_at` is the
  authoritative private-persistence timestamp, followed in order by
  `asset_validated_at`, `automatic_gate_passed_at`, and
  `first_preview_ready_at`; revocation retains prior ready evidence, occurs
  later, and clears current selection. Composite unique/FK guards are planned
  for same-brief parent/source lineage and output/job consistency, with strictly
  increasing bounded attempts preventing cycles.

  Canonical idempotency uses namespace
  `novora:first-preview-idempotency:v1`: RFC 8785 canonical JSON containing the
  internal Concept Brief UUID, purpose, Design Spec version/hash, Hand Sketch
  Instruction version/hash, stable lineage identity, parent/source identity,
  and attempt; UTF-8 without BOM; SHA-256; lowercase hexadecimal output; and
  explicit JSON `null` only for non-applicable parent/source identities. Missing
  identity fails before reservation, Provider invocation, or output persistence.

  The second independent Re-Review of corrected Draft PR #198 also returned
  **FAIL — CORRECTION REQUIRED**. It confirmed ready/current separation,
  same-brief lineage, output/job consistency, cycle prevention, canonical
  idempotency, review-state separation, access-evidence limits, and Product
  boundaries, but found two remaining lifecycle defects. First, all-NULL job
  identity and Provider-profile fields were not bound to one exact staged
  status, and terminal timestamps were not bidirectionally bound to terminal
  statuses. Second, asset validation and automatic-gate passed evidence were
  not bidirectionally bound to their statuses and timestamps.

  The second correction defines only `status = 'draft'` as the staged job state;
  it carries no purpose, attempt, canonical identity, lineage, Provider profile,
  Provider request, started/deadline, terminal, failure/retry, or cost evidence.
  Every non-staged job requires complete canonical identity and the pinned
  Provider profile, while job timestamps and terminal evidence imply compatible
  statuses in both directions. Output planning now adds explicit
  `asset_validation_status` and bounded `asset_validation_evidence`, binds passed
  validation to complete persisted-asset and binary-integrity facts, and binds a
  passed automatic gate to prior validation, policy, evidence, and pass time in
  both directions. Ready/current separation remains unchanged.

  PR #198 remains Draft. No supplemental Owner-run query may run until a third
  independent Re-Review passes. This correction is documentation-only: no SQL
  was executed, no Owner-run query was executed, and no Supabase connection
  occurred. The packet still contains 30 Owner-run SELECT-only blocks and 7
  candidate-only blocks, 37 SQL blocks total.

  The third independent Re-Review returned **FAIL — CORRECTION REQUIRED** for
  two remaining documentation defects. First, the candidate reused
  `completed_at` for both succeeded and failed jobs, so a success timestamp did
  not imply `status = 'succeeded'` and B13 could return a false zero. Second,
  section 19 placed binary/image validation before private generated-asset
  persistence even though the normative chronology requires persistence first.

  The third correction adds nullable candidate column `failed_at timestamptz`
  and makes all terminal timestamps status-exclusive: `completed_at` belongs
  only to `succeeded`, `failed_at` only to `failed`, `cancelled_at` only to
  `cancelled`, and `timed_out_at` only to `timed_out`. Terminal timestamps are
  mutually exclusive, must follow `started_at` when it exists, and are forbidden
  on staged or nonterminal jobs. B13 comprehensively counts missing, mismatched,
  conflicting, out-of-order, staged, nonterminal, and terminal status/evidence
  contradictions. The lifecycle sequence is corrected to persist the private
  generated asset, record `asset_created_at`, and only then perform binary/image
  validation.

  The fourth independent Re-Review returned **FAIL — CORRECTION REQUIRED**. It
  confirmed both third-correction findings were resolved, including `failed_at`
  propagation and persistence-before-validation, but found one new blocking
  verification gap: V01 did not fully mirror B13 and the candidate lifecycle
  CHECKs. Specifically, V01 could return a false zero for timeout before
  deadline and for processing rows carrying failure/retry/reason evidence.

  The fourth correction makes V01 count exact status vocabulary,
  start/deadline pairing, terminal-before-start, timeout-before-deadline,
  terminal timestamp exclusivity, missing status-specific timestamps, reverse
  timestamp-to-status mismatches, staged evidence, nonterminal terminal/failure/
  retry evidence, and complete terminal status/evidence contradictions. It also
  adds an explicit candidate/B13/V01 predicate map and in-memory counterexample
  review with zero parity mismatches. No SQL or Owner-run query was executed and
  no Supabase connection occurred.

  The fifth independent Re-Review also returned **FAIL — CORRECTION REQUIRED**.
  It confirmed timeout-before-deadline and required status/timestamp/evidence
  checks passed, while identifying two remaining blockers. First, V01 still
  omitted Candidate/B13 Job invariants for staged/non-draft identity, purpose,
  attempt, lineage, pinned Provider profile, Provider request, hash, cost, and
  related evidence. Second, V01 built its metadata actual set by filtering live
  columns through expected names, so a genuinely unexpected name could produce
  a false-zero unexpected count.

  The fifth correction extends V01 to every applicable Candidate/B13 Job
  predicate, includes every named predicate in one overall invalid-Job-row
  aggregate, and records 34 Candidate/B13/V01 lifecycle parity cases with zero
  mismatches. It also
  represents the verified Q02 pre-candidate baseline for the two affected
  tables and independently derives candidate-added columns as current catalog
  columns minus that baseline before comparing expected and actual sets in both
  directions. Expected-name filtering is not used for actual-set discovery.
  Baseline absence or shape drift fails closed and requires a separately
  reviewed baseline refresh; 11 in-memory metadata cases produced zero
  comparison mismatches. No SQL or Owner-run query was executed, no
  Supabase connection occurred, and no customer data was inspected.

  PR #198 remains Draft. No supplemental Owner-run query may run until another
  independent Re-Review passes. This correction is documentation-only: no SQL
  was executed, no Owner-run query was executed, and no Supabase connection
  occurred. Counts remain 30 Owner-run blocks, 7 candidate-only blocks, and 37
  SQL blocks total.

- Agent 70B-3C / 70B-3D (2026-07-15): the Owner manually executed the approved
  Stage A existing-table ACL correction in `novora-production`, Primary
  Database, as `postgres`. Read-only reconciliation of the complete external
  evidence passed Phase 1 and Phase 3, including a zero-row privilege mismatch
  detector. `anon` and `authenticated` now have no DML or structural privileges
  on the six approved tables. `service_role` retains SELECT/INSERT on
  `admin_notes` and `concept_brief_reference_assets`, and SELECT/INSERT/DELETE
  on `concept_briefs`; it now has SELECT/INSERT/UPDATE, but no DELETE, on
  `ai_sketch_jobs`, `ai_sketch_outputs`, and `ai_sketch_reviews`. TRUNCATE,
  MAINTAIN, REFERENCES, and TRIGGER are absent for all three roles on all six
  tables. Ownership, RLS, FORCE RLS, policy counts, routines, and triggers were
  preserved. No rollback occurred. Stages B, C, D, and E were not executed.
  First Preview remains blocked by unexecuted schema work, missing jobs/outputs
  persistence code, and the review create-path/output-linkage incompatibility.
  The next recommended independent task is Stage B `postgres` future-table
  default-privilege execution planning and approval; this documentation record
  does not authorize Stage B or any SQL or Supabase action.

- Agent 70B-4A / 70B-4B (2026-07-15): the Owner manually executed Stage B in
  `novora-production` as `postgres`. Phase 1 and immediate Phase 3 evidence
  passed, and the corrected authoritative forbidden-default mismatch detector
  returned zero rows. Future public tables created by `postgres` now grant
  default table privileges only to `postgres`, which retains all eight owner
  privileges; `anon`, `authenticated`, `service_role`, and `PUBLIC` have no
  postgres/public future-table default row, and no grant option exists. The
  existing six-table Stage A privileges, `postgres` function defaults, and
  `supabase_admin` table/function defaults were preserved. Rollback was not
  executed. Stages C, D, and E were not executed. First Preview remains blocked
  by the remaining schema migration, jobs/outputs persistence code, review
  output-linkage, private asset access, automatic gates, and customer route/UI
  work. The next independent task is not automatically authorized.

- Agent 70B-5 / PR #201 (2026-07-16): PR #200 merged unchanged with normal
  merge commit `eabfa35990d27f8a18b3dc779dc536e7df9b13c9`. PR #201 then
  completed its documentation-only lifecycle at reviewed head
  `ea2c34f3a89ee6fd09623fcb7f4ce29da3a0cf01` and merged with normal merge
  commit `a3682ba33acfc716af7e7e50a99f156e390b0972`. It adds
  `docs/novora-first-preview-additive-schema-owner-execution-packet-v1.md`.
  The packet's Git-blob SHA-256 is
  `9df1c2d542b6554b10d6e34690b558b4ed1351e77b68ae46064f2826ca6468ed`.
  Its frozen Agent 70B-2 source blob is
  `714a30d16760dc98602dcbd8dc92d8785895811c`, whose raw-byte SHA-256 is
  `4763a425a9e22098a3dd43d3773c8352d83fd201b72d48dd116d7f9619cceecc`.
  Independent verification found all 18 canonical statement hashes for
  candidate blocks 23.1-23.6 matched, both PR checks passed, the only review
  finding was corrected, and zero unresolved review threads remained before
  merge. The packet is fail-closed and does not authorize SQL. Its initial
  Phase A excludes block 23.7, rollback, cleanup, Provider calls, application
  rollout, Storage, deployment, customer-visible behavior, and schema actions
  outside its exact separately approved sequence. Stage A and Stage B remain
  complete; neither rollback was executed. Stages C, D, and E remain
  unexecuted. No SQL or Supabase connection occurred while preparing,
  reviewing, correcting, merging, or recording the packet.

- Agent 70B-6 (2026-07-16): the final documentation-only Phase A freeze adds
  exact external evidence filenames `novora-fp-phase-a-00-context.png` through
  `novora-fp-phase-a-54-manifest-v1.json`, including deterministic zero-row and
  error alternatives for SELECT evidence. The current packet Git-blob SHA-256
  is `4d36aaba11391eb1aa37a259027d8f50cc63723807755f3c0e1d3d2e832e3b04`.
  The frozen Agent 70B-2 source identity, all 18 canonical candidate statement
  hashes, execution order, PASS/STOP rules, and Phase A exclusions remain
  unchanged. This filename freeze does not authorize or execute SQL, connect
  to Supabase, inspect business rows, or approve block 23.7, rollback, cleanup,
  Provider, Storage, deployment, application rollout, or customer-visible
  behavior.

- Agent 70B-7 (2026-07-16): the Owner explicitly approved manual Phase A
  execution against `novora-production`, Primary Database (`postgres`), schema
  `public`, as role `postgres`, at `origin/main`
  `24c37f54173cf6e9cd82de7bf30b058d166adea4`, PR #203 reviewed head
  `afc27974bed4f814da0a7888705315dfe228efab`, packet blob
  `d347663d740cc766eb07c9c93b9130d16fc9f51f` / raw-byte SHA-256
  `4d36aaba11391eb1aa37a259027d8f50cc63723807755f3c0e1d3d2e832e3b04`,
  and source blob `714a30d16760dc98602dcbd8dc92d8785895811c` /
  raw-byte SHA-256
  `4763a425a9e22098a3dd43d3773c8352d83fd201b72d48dd116d7f9619cceecc`.
  The approval is limited to Phase 0, C01-C04, M01-M06, B01-B19 in the
  packet's exact staged order, candidate blocks 23.1-23.6 with all 18 frozen
  canonical statement hashes, and V01-V05. The complete Owner-only manual run
  sheet is
  `docs/novora-first-preview-schema-phase-a-owner-manual-execution-sequence-v1.md`.
  Block 23.7, rollback, cleanup, data edits, DELETE, backfill,
  ACL/default-privilege/RLS/policy/Storage changes, Provider calls,
  application rollout, deployment, customer-data inspection beyond the
  approved aggregates, and customer-visible behavior remain unapproved. This
  record does not prove execution: Codex did not connect to Supabase, execute
  SQL, inspect customer/business rows, or perform any excluded action.

- Agent 70B-8 (2026-07-16): Owner-run Phase A stopped correctly at step 25
  (`B11`) with SQLSTATE `42703` because
  `public.ai_sketch_outputs.is_current_customer_preview` did not exist. Step 24
  (`B10`) is the exact last successful step; steps 26-53 were not run. Step 21
  (`23.2-S01`) had visibly shown the exact frozen statement, including that
  column, with editor-reported success, creating an unresolved evidence
  contradiction. The Phase 0/steps 1-25 external set contains exactly 26 raw
  artifacts; no raw evidence is in Git. Corrected sanitized manifest
  `novora-fp-phase-a-54-manifest-v1.json` has SHA-256
  `3551b06cc2ccfa75802177c05603cf9b8a1028637ab816977ab3e7d4bdbffe97`
  and records 23 accepted PASS steps plus step 21's editor-reported PASS with
  acceptance and catalog persistence unresolved, B11 ERROR, steps 26-53 `not_run`,
  block 23.7/rollback/cleanup/retry/repair NOT EXECUTED, exact sanitized CSV
  values, and the limits of reconstructing executed SQL from CSV exports. Its
  audit trail supersedes preliminary manifest SHA-256
  `977c1d68b6bc15340db5f429edc673ec5d124a8fd296fda972edd157c5674371`.
  Available evidence does not determine whether 23.2 failed to persist, ran in
  a different underlying context, was later changed, has incomplete/misleading
  success evidence, or reflects another cause. The frozen SELECT-only recovery
  packet is
  `docs/novora-first-preview-phase-a-read-only-recovery-packet-v1.md`; its four
  metadata statements have not been executed and require a new exact Owner
  approval. No Supabase connection, B11/23.2 retry, B12+, repair, rollback,
  cleanup, backfill, manual `ADD COLUMN`, Provider, Storage, deployment, or
  customer-visible action occurred during reconciliation.

- Agent 70B-9 (2026-07-16): the Owner separately approved manual execution of
  the frozen Phase A STOPPED read-only recovery packet against
  `novora-production`, Primary Database (`postgres`), schema `public`, as role
  `postgres`, with SQL Editor row limit at least `1000`. The immutable approval
  point is merged `origin/main`
  `a7c466d40e6ba553f9686c814e43ec04aa76a1a7`, PR #205 reviewed head
  `a65e8cc0a9b64eadf4dd0e36eb7de48c02de29ba`, recovery packet Git blob
  `e853e2992f4d556a1d41b089006bdd288aa2d7bc`, and STOPPED Phase A manifest
  SHA-256
  `3551b06cc2ccfa75802177c05603cf9b8a1028637ab816977ab3e7d4bdbffe97`.
  Approval is limited to Phase 0 visual context and the exact SELECT-only R01,
  R02, R03, and R04 statements, executed manually and individually in order;
  their canonical SHA-256 values are respectively
  `ebae5e128fdb57e3e6426ddd9a7dd6419d47a907c2d1a4c2229199e2d27db6f8`,
  `9d71ada08b5eb39137545921f3b7034c3ebe3bc37475e53809ab73c3983a158f`,
  `6e74dede3b24d6324123a2290cb90450bc79c49d126e360d71ab4e5d11f48559`,
  and `2526d2aea62509ceb89ffc95dfd9b383aa302b4c91f9b58d5a0bf95454403d09`.
  Execution remains one evidence-verified query at a time: Phase 0 and R01 are
  the current Owner step, and R02 instructions remain gated until their
  returned evidence passes independent reconciliation. Any project, database,
  schema, role, row-limit, SQL-hash, SQL error, warning, missing-table,
  truncated-result, duplicate-identity, or incomplete-evidence condition is an
  immediate STOP. Codex is not authorized to connect to Supabase or execute
  SQL. No B11/23.2 retry, B12+, DDL, DML, repair, manual `ADD COLUMN`,
  replacement SQL, backfill, block 23.7, rollback, cleanup,
  ACL/default-privilege/RLS/policy/Storage change, Provider action, application
  rollout, deployment, customer-data inspection, or customer-visible behavior
  is approved.

- Agent 70B-10 (2026-07-16): the Owner manually completed the approved
  SELECT-only Phase A STOPPED recovery sequence. All five raw artifacts were
  read and hashed in place and remain external. Sanitized recovery manifest
  `novora-fp-phase-a-recovery-05-manifest-v1.json` has SHA-256
  `43916fa5dad233c15aad2865c602ccbe75fbe28380440bfd51077ac29f1cba5d`.
  R01 passed with exactly the three approved public AI relations and coherent
  `postgres`/`public`/`postgres` context. R02 is a FINDING: relation OID 17602
  has all 44 live job attributes, including all 35 frozen `23.1-S01`
  additions, while relation OID 17619 has only its original 8 output
  attributes and no dropped slots. R03 is a FINDING: all 17 frozen
  `23.2-S01` attributes are absent across every non-system-schema same-name
  output relation. R04 passed with 16 complete catalog objects, every
  constraint validated and every index valid, ready, and live. Recovery status
  is COMPLETE; Phase A remains STOPPED; historical cause remains NOT PROVEN.
  The minimum repair prerequisite is the exact frozen atomic `23.2-S01`
  statement only; reapplying `23.1-S01` or directly resuming B11 is unsafe.
  The frozen repair decision packet is
  `docs/novora-first-preview-phase-a-repair-decision-packet-v1.md`. It contains
  P01 `97cf7ea0096f9174a221c3721adda70f2e71770feba64cc8fb3cb8d9445f17cc`,
  P02 `fe3836aef8be4018ef5c57e9df6501b2a96950c152c4f168779211a82814ef61`,
  P03/A02 `8f1ebe8fce37d43575720a3c36ee6caa67b8fcf7cf59f38a71a443ca2e0edfd8`,
  P04/A03 `a2dc7a910de636525babd97545f7f1b3c9fc6c7dba023a6df04bcd8d862a135d`,
  X01/frozen `23.2-S01`
  `4db11692e2e0147e23772f6649d6250786bf23fcaa2542d48d1d001f3e6561b4`,
  and A01 `0b5f78c75deb40de15700bffcb6866424d5ea5ffd8caccb5bb0b2976087d2cf0`.
  Nothing in this record authorizes execution, repair, retry, rollback, B11,
  B12+, Phase A resume, Provider, Storage, deployment, or application work.

- Agent 70B-11 (2026-07-16): the Owner separately approved manual execution of
  the frozen Phase A STOPPED Repair Packet v1 against `novora-production`,
  Primary Database (`postgres`), schema `public`, as role `postgres`, with SQL
  Editor row limit at least `1000`. The immutable approval point is merged
  `origin/main` `9064821e0f1a366494f42b19ca21b2d89301d971`, PR #207 reviewed
  head `3b7cb61afbf53f63a698279ba704632d50ff8131`, repair packet Git blob
  `98017d94ec4711ed673cde9c75a9e8f0947850dc`, repair packet raw-file
  SHA-256
  `8f63c74c5a11a8c90c44f6d8ed9be956d00e95c6a8595d4083bd0c5979a27acd`,
  and recovery manifest SHA-256
  `43916fa5dad233c15aad2865c602ccbe75fbe28380440bfd51077ac29f1cba5d`.
  Approval is limited to the frozen Phase 0 visual-context capture and the
  exact statements executed manually and individually in order: P01
  `97cf7ea0096f9174a221c3721adda70f2e71770feba64cc8fb3cb8d9445f17cc`,
  P02 `fe3836aef8be4018ef5c57e9df6501b2a96950c152c4f168779211a82814ef61`,
  P03
  `8f1ebe8fce37d43575720a3c36ee6caa67b8fcf7cf59f38a71a443ca2e0edfd8`,
  P04
  `a2dc7a910de636525babd97545f7f1b3c9fc6c7dba023a6df04bcd8d862a135d`,
  X01/exact frozen `23.2-S01`
  `4db11692e2e0147e23772f6649d6250786bf23fcaa2542d48d1d001f3e6561b4`,
  A01 `0b5f78c75deb40de15700bffcb6866424d5ea5ffd8caccb5bb0b2976087d2cf0`,
  A02 `8f1ebe8fce37d43575720a3c36ee6caa67b8fcf7cf59f38a71a443ca2e0edfd8`,
  and A03
  `a2dc7a910de636525babd97545f7f1b3c9fc6c7dba023a6df04bcd8d862a135d`.
  Execution remains one evidence-verified step at a time under the packet's
  quiet-window, evidence, and fail-closed rules. Phase 0 and P01 are the
  current Owner step; P02-P04, X01, and A01-A03 instructions remain gated
  until the returned Phase 0/P01 evidence passes reconciliation. Any
  packet-defined context, hash, result, identity, duplicate, row-limit,
  evidence, warning, error, lock, or completeness mismatch is an immediate
  STOP. Codex is not
  authorized to connect to Supabase or execute SQL. No B11, B12+, `23.1-S01`
  retry, block 23.7, backfill, replacement SQL, other DDL/DML, rollback,
  cleanup, ACL/default-privilege/RLS/policy/Storage change, Provider action,
  deployment, application rollout, customer-data inspection, or
  customer-visible behavior is approved. Even if the repair passes, Phase A
  remains STOPPED pending a separately reviewed and approved resume packet.

- Agent 70B-12 (2026-07-16): the Owner manually completed the exact approved
  Phase A STOPPED Repair Packet v1 under the confirmed quiet window. External
  sanitized manifest `novora-fp-phase-a-repair-09-manifest-v1.json` has
  SHA-256
  `cbffdbb90ada2f897fa7fe558add2e8a8f5a65bbf03e9ae780f7406832cf5575`.
  Independent read-only review obtained matching start/end hashes for all ten
  exact external originals and passed every screenshot, CSV, catalog,
  statement-identity, execution-order, ancestry, and sanitization check.
  Repair status is COMPLETE; Phase A remains STOPPED; historical cause remains
  NOT PROVEN. X01 visibly contained the complete frozen `23.2-S01` statement
  and editor success, while A01 separately proved durable persistence of all
  17 additions: `ai_sketch_outputs` now has exactly 25 live attributes, no
  dropped slots, and no missing, mismatched, or unexpected attribute. The
  output table remained empty, and its exact three validated constraints and
  two valid/ready/live indexes were preserved with zero external or waiting
  locks. The Owner-reported Phase 0 artifact hash did not match the selected
  file; repeated in-place hashing produced
  `01c551e5970f938a7f664424dfe53479af3af57cd15059aba5e089d4a88b06dd`.
  The screenshot itself passed the exact context gate, and the manifest
  transparently preserves the mismatch as a corrected reported-hash error.
  No raw evidence is in Git.

  The frozen resume decision starts at a new Phase 0 and fresh R01, not B11.
  `docs/novora-first-preview-phase-a-resume-packet-v1.md` freezes 68 manual,
  individually executed statements: fresh context/catalog/size/access/data
  preflights; a new database-scoped candidate-object and external-lock
  assertion; only the remaining candidate blocks 23.3-23.6 with a separately
  frozen unfiltered R04 catalog assertion immediately after every DDL; and
  V01-V05.
  Completed `23.1-S01` and `23.2-S01` are explicitly excluded. Block 23.7,
  retry, repair, replacement SQL, backfill, rollback, cleanup,
  ACL/default-privilege/RLS/policy/Storage changes, Provider, deployment,
  application rollout, customer-data inspection beyond exact aggregates, and
  customer-visible behavior remain excluded. The packet does not authorize
  execution and requires independent review plus a new exact Owner approval.

- Agent 70B-13 (2026-07-16): the Owner separately approved manual execution of
  the frozen Phase A Resume Packet v1 against `novora-production`, `main` /
  Production, Primary Database (`postgres`), schema `public`, as current role
  and session role `postgres`, with SQL Editor row limit at least `1000` and a
  quiet window maintained from Phase 0 through V05. The immutable approval
  point is merged `origin/main`
  `52c26f818c89716ade4f1818d266cc2dd1fedb3e`, PR #209 reviewed head
  `8294e54dac83caef688d51bd127621b160d27d07`, resume packet Git blob
  `98e6b4a70fba66e317b57fd6f6bfc1bb3274bc85`, resume packet raw-file
  SHA-256
  `ad00c50a387c7f801585faca5e368f8b406322e70d73bbee2bb56f06e939dd64`,
  and completed repair manifest
  `novora-fp-phase-a-repair-09-manifest-v1.json` SHA-256
  `cbffdbb90ada2f897fa7fe558add2e8a8f5a65bbf03e9ae780f7406832cf5575`.

  Approval is limited to the new Phase 0 visual-context capture and the exact
  68 individually ordered executable statements frozen in the immutable
  packet. The Owner must execute each statement manually and individually,
  using only the packet's incorporated SQL blocks, headings, source blobs,
  canonical hashes, expected results, evidence filenames, immediate unfiltered
  R04 assertion ordering, and universal fail-closed rules. Phase 0 and R01 are
  the current Owner steps. R02 and every later instruction remain gated until
  the immediately preceding evidence passes independent reconciliation.

  The approval excludes `23.1-S01`/`23.2-S01` re-execution, stale direct B11
  resume, block 23.7, constraint validation, replacement or ad hoc SQL, retry,
  repair, compensation, backfill, data edits, DELETE, rollback, cleanup,
  ACL/default-privilege/RLS/policy/trigger/function/Storage changes,
  customer/business-row inspection beyond the exact approved aggregates,
  Provider/generated-asset actions, environment changes, deployment,
  application rollout, email, payment, customer-visible behavior, and any
  Codex/MCP/CLI/script/automated database execution. After V05, all SQL must
  stop pending independent evidence reconciliation. Phase A remains STOPPED
  until Owner-run resume evidence proves completion. This record does not
  prove execution, and Codex did not connect to Supabase or execute SQL.

- Agent 70B-14 (2026-07-16): the Owner began the separately approved Phase A
  Resume Packet v1 under the confirmed quiet window and stopped correctly at
  step 01 (`R01`) after the Supabase SQL Editor displayed
  `Error: Failed to fetch (api.supabase.com)`. The selected external Phase 0
  screenshot passes the visible `novora-production`, `main` / Production,
  Primary Database, role `postgres`, row-limit `1000`, blank-editor, and
  no-unrelated-content gates. The R01 artifact shows the same visible target
  controls, `0 rows`, the exact transport/fetch error, and no PostgreSQL
  SQLSTATE. This is recorded as an SQL Editor client/API transport or
  result-fetch failure, not a proven database rejection. The screenshot does
  not prove whether R01 reached or executed on the database server; its visible
  SQL is incomplete, so the actual canonical SQL hash and equality remain
  null. R01 is SELECT-only, and no database mutation was authorized or
  observed.

  External sanitized STOPPED Resume manifest
  `novora-fp-phase-a-resume-69-manifest-v1.json` has SHA-256
  `32bca453a5ee079b1d25e2bad4859bc4f2dcb7c35a4b3bc42b2bc257ee7961ee`.
  It records Phase 0 as the last successful Resume item, R01 as ERROR, steps
  02-68 `not_run`, Resume and Phase A `STOPPED`, and retry/rollback/cleanup/DDL/
  DML/block 23.7 NOT EXECUTED. The selected Phase 0 artifact recomputes to
  `5ca652dbed968c4295cbf9d5629d96db3fc2e644fbfa974e3b2aaad93e5b56fd`.
  The selected R01 error artifact recomputes to
  `c9879625400e37ba981fe82966ab04d98d942073735b431e7914f06b4f75ea5c`,
  not the Owner-reported
  `f27086133314e86c7bd5393511471aba96dbf8245bc0a73cb5923d10e9f674ae`;
  no file in the evidence folder has the reported hash. The screenshot visibly
  contains the reported error, but the cause of the hash difference is not
  proven. No raw evidence is in Git.

  The minimum immutable retry decision is frozen in
  `docs/novora-first-preview-phase-a-r01-transport-retry-packet-v1.md`.
  It permits no execution without a new exact Owner approval and freezes only
  a fresh Phase 0 plus one manual execution of the exact SELECT-only R01
  statement with canonical SHA-256
  `ebae5e128fdb57e3e6426ddd9a7dd6419d47a907c2d1a4c2229199e2d27db6f8`.
  It explicitly prohibits the prior generic `Retry` button, R02+, every other
  SQL statement or mutation, Provider/Storage/environment/deployment/
  application/customer-visible action, and branch/worktree/evidence deletion.
  Merging the packet does not authorize execution.

- Agent 70B-15 (2026-07-16): the Owner separately approved one fresh manual
  Phase A R01 transport retry against `novora-production`, `main` / Production,
  Primary Database (`postgres`), schema `public`, as current role and session
  role `postgres`, with SQL Editor row limit at least `1000`. The immutable
  approval point is merged `origin/main`
  `390ac596258bba8e8cbe8ab2d4e2ec816c682e72`, PR #211 reviewed head
  `46338826a7f444503371240a8c157caff3bc9b1f`, retry packet Git blob
  `8cd978d6e58191dc34a3de6181e2a1fabd680c03` / blob-byte SHA-256
  `6b29664b04df1a48183748445b93b1b3451848a7b5d1fea6b472c1d40368d2c6`,
  frozen Resume Packet Git blob
  `98e6b4a70fba66e317b57fd6f6bfc1bb3274bc85`, frozen R01 source Git blob
  `e853e2992f4d556a1d41b089006bdd288aa2d7bc`, and STOPPED Resume manifest
  `novora-fp-phase-a-resume-69-manifest-v1.json` SHA-256
  `32bca453a5ee079b1d25e2bad4859bc4f2dcb7c35a4b3bc42b2bc257ee7961ee`.
  The prior selected Phase 0 and R01 transport-error artifacts remain fixed at
  SHA-256
  `5ca652dbed968c4295cbf9d5629d96db3fc2e644fbfa974e3b2aaad93e5b56fd`
  and `c9879625400e37ba981fe82966ab04d98d942073735b431e7914f06b4f75ea5c`;
  neither may be reused as retry evidence.

  Approval is limited to establishing a fresh quiet window, capturing fresh
  blank-editor Phase 0 evidence as
  `novora-fp-phase-a-resume-r01-retry-00-context.png`, and, only after Phase 0
  passes, executing exactly once with the ordinary manual `Run` action the
  frozen SELECT-only R01 statement with canonical SHA-256
  `ebae5e128fdb57e3e6426ddd9a7dd6419d47a907c2d1a4c2229199e2d27db6f8`.
  The mutually exclusive R01 evidence filenames are
  `novora-fp-phase-a-resume-r01-retry-01-r01.csv` on PASS and
  `novora-fp-phase-a-resume-r01-retry-01-r01-error.png` on ERROR. Any
  packet-defined context, quiet-window, identity, hash, result, completeness,
  warning, SQL, transport/fetch, export, filename, or expected-result mismatch
  is an immediate STOP. The generic editor `Retry` button, automatic retry,
  more than one R01 attempt, R02+, every other SQL statement or mutation,
  Provider/Storage/environment/deployment/application/customer-visible action,
  and branch/worktree/evidence deletion remain prohibited. Whether R01 passes
  or fails, all SQL stops for independent evidence reconciliation before any
  R02 decision. This record does not prove execution, and Codex did not connect
  to Supabase or execute SQL.

- Agent 70B-16 (2026-07-17): the Owner completed the separately approved R01
  Transport Retry Packet v1 under a newly Owner-attested quiet window. The
  quiet-window status was not independently database-verified. The fresh
  Phase 0 artifact
  `novora-fp-phase-a-resume-r01-retry-00-context.png` is `92070` bytes with
  SHA-256
  `4d6eca956ec2a838ee2f8eec3faa60afba2da81542a156d0fba200e74e9aef15`.
  It visibly shows `novora-production`, `main` / Production, Primary Database,
  role `postgres`, row limit `1000`, a blank editor, and an unexecuted result
  pane without stale SQL or sensitive content.

  The single fresh ordinary-Run R01 attempt passed and was exported as
  `novora-fp-phase-a-resume-r01-retry-01-r01.csv`, `529` bytes, SHA-256
  `d00b5c59d1d297040c851d589e488d59e39cdc06089da3cd4e5df45595d6e442`.
  It has the exact 13 headers and exactly three complete rows, with zero
  duplicate rows, zero duplicate relation identities, and zero same-name
  nonapproved-schema relations. Every row proves database `postgres`, current
  schema `public`, current and session role `postgres`, recovery false, owner
  `postgres`, relkind `r`, persistence `p`, and approved schema true. The exact
  relations remain `public.ai_sketch_jobs` OID `17602`,
  `public.ai_sketch_outputs` OID `17619`, and `public.ai_sketch_reviews` OID
  `17641`.

  The fresh CSV bytes match the earlier recovery R01 CSV. Identical sanitized
  catalog results may export identically, so byte identity alone neither proves
  nor disproves a fresh execution. The exact fresh filename, fresh Phase 0
  artifact, and Owner attestation are the evidence basis for freshness.

  The corrected sanitized retry supplement
  `novora-fp-phase-a-resume-r01-retry-02-manifest-v1.json` is `8572` bytes with
  SHA-256
  `ee8612c0ac60e96b190b994dcaab8df3a0c55bf44ecc9eeed308e4dd66555646`.
  It binds the retry packet Git blob and independently recomputed raw SHA-256
  `6b29664b04df1a48183748445b93b1b3451848a7b5d1fea6b472c1d40368d2c6`,
  approval-record identities, frozen Resume/R01 sources, prior STOPPED Resume
  manifest, exact artifacts, and expected R01 canonical SHA-256. Its actual
  submitted-SQL hash and hash equality correctly remain null because the CSV
  does not prove submitted SQL bytes. It records retry `COMPLETE`, fresh Phase
  0 and R01 `PASS`, but Phase A Resume and Phase A remain `STOPPED`; steps 02-68
  remain `not_run`, and no unapproved action occurred. A separate read-only
  re-audit recomputed matching start/end hashes for all three exact original
  artifacts and passed every evidence-contract and sanitization check with no
  remaining finding.

  The minimum next decision is frozen in
  `docs/novora-first-preview-phase-a-r02-continuation-packet-v1.md`. It permits
  no execution merely by merging. A separate exact Owner approval must bind the
  post-merge `origin/main`, reviewed PR head, packet Git blob, corrected retry
  supplement SHA-256, Resume Packet blob
  `98e6b4a70fba66e317b57fd6f6bfc1bb3274bc85`, R02 source blob
  `e853e2992f4d556a1d41b089006bdd288aa2d7bc`, and R02 canonical SHA-256
  `9d71ada08b5eb39137545921f3b7034c3ebe3bc37475e53809ab73c3983a158f`.
  If separately approved, it releases only a fresh visual context gate and one
  manual execution of SELECT-only R02. All SQL then stops for independent
  reconciliation; R03 and every later statement remain prohibited. The packet
  explicitly records that the visual gate and R02 do not freshly re-prove
  `current_schema`, `session_role`, or recovery state. Any future exact approval
  must accept its bounded reliance on the last successful R01 evidence and the
  Owner's no-visible-context-change attestation, or STOP for a separately
  reviewed context-preflight decision.

- Agent 70B-17 (2026-07-17): the Owner separately approved the frozen Phase A
  R02 Continuation Packet v1 for one manual SELECT-only R02 attempt against
  `novora-production`, `main` / Production, Primary Database (`postgres`),
  target schema `public`, selected current role `postgres`, and SQL Editor row
  limit at least `1000`. The immutable approval point is merged `origin/main`
  `2b545efc2e75135c534319bbefef09c4223def81`, PR #213 reviewed head
  `e2b2a6b3baedf4e1731720d71a990f86692d37c8`, continuation packet Git blob
  `e59bb48d28819d211cb31a0ed4d50755761d83b7`, corrected R01 retry supplement
  `novora-fp-phase-a-resume-r01-retry-02-manifest-v1.json` SHA-256
  `ee8612c0ac60e96b190b994dcaab8df3a0c55bf44ecc9eeed308e4dd66555646`,
  frozen Resume Packet Git blob
  `98e6b4a70fba66e317b57fd6f6bfc1bb3274bc85`, frozen R02 source Git blob
  `e853e2992f4d556a1d41b089006bdd288aa2d7bc`, exact source section `8` and
  heading
  `## 8. R02 - complete public target attribute catalog, including dropped slots`,
  canonical byte length `1399`, and R02 canonical SHA-256
  `9d71ada08b5eb39137545921f3b7034c3ebe3bc37475e53809ab73c3983a158f`.

  The Owner explicitly accepted the packet's bounded context-proof basis for
  this one SELECT-only attempt. The fresh visual gate independently re-proves
  only visible project, environment, Primary Database selection, selected
  current role, row limit, and blank editor. It does not freshly prove
  `current_schema = public`, `session_role = postgres`, or
  `server_is_in_recovery = false`; the approval accepts bounded reliance on the
  successful fresh R01 evidence and corrected retry supplement for those
  values. The Owner attests that no visible project, environment, database,
  role, or target control changed after the accepted R01 evidence and before
  R02, while acknowledging that this does not prove reuse of one database
  backend session. The fresh quiet window is likewise Owner-attested, not
  independently database-verified.

  Approval is limited to establishing that fresh quiet window, capturing
  exactly one new blank-editor visual artifact, and, only after the visual gate
  passes, manually executing the exact frozen R02 statement once with the
  ordinary `Run` action. The mutually exclusive visual filenames are
  `novora-fp-phase-a-resume-r02-continuation-00-context.png` on PASS and
  `novora-fp-phase-a-resume-r02-continuation-00-context-error.png` on ERROR.
  The mutually exclusive R02 filenames are
  `novora-fp-phase-a-resume-02-r02.csv` on PASS and
  `novora-fp-phase-a-resume-02-r02-error.png` on ERROR. The required later
  read-only reconciliation supplement filename is
  `novora-fp-phase-a-resume-r02-continuation-03-manifest-v1.json`; its creation
  does not authorize R03 or any further SQL.

  R02 PASS requires exactly 69 complete positive-attribute rows: 44 for
  `public.ai_sketch_jobs` OID `17602` and 25 for
  `public.ai_sketch_outputs` OID `17619`; unique table/ordinal identities; zero
  dropped slots; exact reviewed names, types, nullability, defaults, identity,
  and generated-field metadata; and no missing, duplicate, partial,
  additional, or unexpected positive attribute. Every packet-defined context,
  attestation, bounded-reliance, identity, blob, heading, canonical hash,
  canonical byte length, catalog, completeness,
  warning, SQL, transport/fetch, export, filename, or expected-result mismatch
  is an immediate STOP.

  This approval does not permit more than one R02 attempt, any Retry button or
  automatic retry, R01, R03+, any other Resume statement, `23.1-S01` or
  `23.2-S01`, candidate DDL, block 23.7, constraint validation, replacement or
  ad hoc SQL, DML, repair, compensation, backfill, data edits, DELETE,
  rollback, cleanup, ACL, default-privilege, RLS, policy, trigger, function, or
  Storage changes, customer or business-row
  inspection, Provider/generated-asset actions, environment changes,
  deployment, application rollout, email, payment, customer-visible behavior,
  Codex, MCP, CLI, script, or other automated Supabase connection or SQL
  execution, or branch/worktree/evidence deletion. Whether
  R02 passes or fails, all SQL stops for independent evidence reconciliation;
  R03 remains prohibited. This record does not prove execution, and Codex did
  not connect to Supabase or execute SQL.

- Agent 70B-18 (2026-07-17): the Owner manually completed the separately
  approved R02 Continuation Packet v1 under the accepted bounded context-proof
  and a newly Owner-attested quiet window. The quiet-window status and
  no-visible-control-change statement were not independently database-verified.
  The fresh visual artifact
  `novora-fp-phase-a-resume-r02-continuation-00-context.png` is `91603` bytes
  with SHA-256
  `7e82b02dbe975a4a30be7cbe8a0e3293d002a5052ac6543547c5a3cd68eeb4a2`.
  It visibly proves only `novora-production`, `main` / Production, Primary
  Database, selected current role `postgres`, row limit `1000`, and a blank
  editor. It does not freshly prove `current_schema = public`,
  `session_role = postgres`, recovery false, reuse of one backend session, or
  the quiet window.

  The single Owner-attested ordinary-Run R02 attempt passed and was exported as
  `novora-fp-phase-a-resume-02-r02.csv`, `6020` bytes, SHA-256
  `01619c87bec0666a8965ffb6769e0683955178b039ada3611b5b3fe811ee15b6`.
  It has the exact 12 headers and 69 complete rows, with zero duplicate full
  rows, zero duplicate table/ordinal identities, and zero dropped slots. All 44
  `public.ai_sketch_jobs` rows use relation OID `17602` and exactly match the
  completed Recovery R02 baseline. All 25 `public.ai_sketch_outputs` rows use
  relation OID `17619` and exactly match completed Repair A01, including all 17
  frozen `23.2-S01` additions. No definition mismatch or unexpected live
  attribute was found.

  The sanitized external supplement
  `novora-fp-phase-a-resume-r02-continuation-03-manifest-v1.json` is `19731`
  bytes with SHA-256
  `fbb4a105aca1f7cd92eb034fc7d65eaaa84edb99b19283f0407dff60e98e26ce`.
  It binds the exact approval, packet, source, Resume Packet, R01 supplement,
  baselines, and two selected artifacts; records every exact sanitized
  attribute definition; preserves the bounded context-proof; and keeps actual
  submitted-SQL hash and hash equality null because the CSV does not prove the
  SQL Editor input bytes. It records R02 `PASS`, but Phase A Resume and Phase A
  remain `STOPPED`; Resume Steps 03-68 remain `not_run`, and no unapproved
  action occurred.

  The minimum next decision is frozen in
  `docs/novora-first-preview-phase-a-r03-continuation-packet-v1.md`, Git blob
  `82e0ae19ec240017efdf19cf52e4f98e99466ed5`. The authoritative Resume Packet's
  next item is **Step 03, label `R04`**. The packet explicitly distinguishes
  that item from the separate Recovery query labeled `R03`, which is not in the
  68-step Resume sequence and is not authorized. The only candidate next
  action, after separate exact Owner approval, is a fresh visual context gate
  followed by one manual SELECT-only execution of Resume Step 03 (`R04`) from
  source blob `e853e2992f4d556a1d41b089006bdd288aa2d7bc`, section `10`, canonical byte
  length `1800`, and canonical SHA-256
  `2526d2aea62509ceb89ffc95dfd9b383aa302b4c91f9b58d5a0bf95454403d09`.
  Merging the packet authorizes no SQL. Whether Step 03 passes or fails, all SQL
  stops for independent reconciliation; Steps 04-68 remain prohibited.

- Agent 70B-19 (2026-07-17): the Owner separately approved the frozen Phase A
  Resume Step 03 (`R04`) Continuation Packet v1 for one manual SELECT-only
  attempt against `novora-production`, `main` / Production, Primary Database
  (`postgres`), target schema `public`, selected current and session role
  `postgres`, and SQL Editor row limit at least `1000`. The immutable approval
  point is merged `origin/main`
  `4f0d07362c32a1a2917dc3df7a911aa737025a68`, PR #215 reviewed head
  `8719c3457b0809c69ec764a6cfc21743ae655fc9`, continuation packet Git blob
  `82e0ae19ec240017efdf19cf52e4f98e99466ed5`, completed R02 continuation
  supplement `novora-fp-phase-a-resume-r02-continuation-03-manifest-v1.json`
  SHA-256
  `fbb4a105aca1f7cd92eb034fc7d65eaaa84edb99b19283f0407dff60e98e26ce`,
  frozen Resume Packet Git blob
  `98e6b4a70fba66e317b57fd6f6bfc1bb3274bc85`, authoritative Recovery source
  Git blob `e853e2992f4d556a1d41b089006bdd288aa2d7bc`, sequence Step `03`, label `R04`,
  source section `10`, exact heading
  `## 10. R04 - unfiltered current constraint and index catalog`, canonical
  byte length `1800`, and canonical SHA-256
  `2526d2aea62509ceb89ffc95dfd9b383aa302b4c91f9b58d5a0bf95454403d09`.

  The Owner explicitly accepted the packet's bounded context-proof basis. The
  fresh visual gate independently proves only the visible project, environment,
  Primary Database selection, selected current role, row limit, and blank
  editor. It does not freshly prove `current_schema = public`,
  `session_role = postgres`, recovery false, the quiet window, or reuse of one
  database backend session. The approval accepts bounded reliance on the fresh
  R01 evidence for the three session values and Owner attestation for the quiet
  window and no-visible-control-change statement.

  Approval is limited to establishing that fresh quiet window, capturing
  exactly one context artifact as
  `novora-fp-phase-a-resume-step-03-r04-continuation-00-context.png` on PASS or
  `novora-fp-phase-a-resume-step-03-r04-continuation-00-context-error.png` on
  ERROR, and, only after context PASS, manually executing the exact frozen
  SELECT-only Resume Step 03 (`R04`) statement once with ordinary `Run`.
  Mutually exclusive result filenames are
  `novora-fp-phase-a-resume-03-r04.csv` on PASS and
  `novora-fp-phase-a-resume-03-r04-error.png` on ERROR. PASS requires the exact
  complete untruncated 16-row, 14-header packet-defined catalog with zero
  duplicate object identities and exact relation/object OIDs, names,
  definitions, validation, deferrability, uniqueness, validity, readiness,
  liveness, and table totals. Any packet-defined mismatch is an immediate STOP.

  Whether Step 03 passes or fails, all SQL stops for independent evidence
  reconciliation and the sanitized external supplement
  `novora-fp-phase-a-resume-step-03-r04-continuation-04-manifest-v1.json`.
  The separate Recovery statement labeled `R03`, retries, more than one Step 03
  attempt, Resume Steps 04-68, earlier Resume statements, candidate DDL, block
  23.7, constraint validation, replacement/ad hoc SQL, DML, repair, rollback,
  cleanup, access-control/Storage changes, customer/business-row inspection,
  Provider/application/deployment/customer actions, automated Supabase
  execution, and branch/worktree/evidence deletion remain prohibited. This
  record does not prove execution, and Codex did not connect to Supabase or
  execute SQL.

- Agent 70B-20 (2026-07-17): the corrected two-artifact audit and separate
  independent read-only review passed for Owner-run Resume Step 03 (`R04`). The
  authoritative external context artifact
  `novora-fp-phase-a-resume-step-03-r04-continuation-00-context.png` is `92026`
  bytes with SHA-256
  `a01ca9b42d390e829f54044e599d9514a307f201a32c7f270c4de567b63f4e69`.
  The earlier `124741`-byte / `ff45b8...` identity described a byte-distinct
  conversation-transport copy and is superseded; no artifact was replaced,
  rewritten, renamed, regenerated, or deleted. The authoritative PNG visibly
  proves only `novora-production`, `main` / Production, Primary Database,
  selected role `postgres`, row limit `1000`, and a fresh blank editor/result
  pane without a warning, error, or sensitive content. It does not freshly
  prove `current_schema`, session role, recovery state, backend-session reuse,
  or the quiet window. Those limits retain the accepted R01 reliance and Owner
  attestations.

  The exact result artifact `novora-fp-phase-a-resume-03-r04.csv` is `3181`
  bytes with SHA-256
  `92142e7e71f210bed22cb31b852354f1d93d80d7ea36e36602f47941ee0b6c3f`.
  It has the exact 14 headers, 16 complete rows, zero full-row duplicates, and
  zero duplicate object identities. Relation OIDs remain jobs `17602`, outputs
  `17619`, and reviews `17641`; table totals are 4, 5, and 7 objects. All exact
  object OIDs, names, definitions, constraint states, index uniqueness values,
  and index validity/readiness/liveness match the frozen packet and Recovery /
  Repair A03 baselines. The result is byte-identical to Recovery R04.

  The sanitized external supplement
  `novora-fp-phase-a-resume-step-03-r04-continuation-04-manifest-v1.json` is
  `19931` bytes with SHA-256
  `6de9b72dfdfb81253f33b6ccdb21246b6ce2e9443558ed282562835b5f023ca9`.
  It binds the exact Owner approval and immutable packet/source identities,
  selects exactly two PASS artifacts and zero error artifacts, records the
  exact sanitized 16-object catalog, and keeps
  `actual_canonical_sql_sha256` and `canonical_hash_equality` null because the
  CSV does not prove the SQL Editor input bytes. Matching reviewer start/end
  hashes independently confirmed the evidence set remained unchanged.

  Resume Step 03 (`R04`) is `PASS`, but Phase A Resume and Phase A remain
  `STOPPED`; Steps 04-68 remain `not_run`. No Retry, Step 04, automated
  Supabase connection/SQL, later SQL, application, Provider, Storage,
  deployment, customer action, cleanup, branch/worktree deletion, or evidence
  deletion occurred. The minimum next decision is frozen in
  `docs/novora-first-preview-phase-a-step-04-c03-continuation-packet-v1.md`.
  It covers only Resume Step 04 (`C03`) from MANUAL source blob
  `1d7ee46755254e6c01ac125793ecbd9bf3451204`, heading `03 - C03`, canonical
  byte length `874`, and SHA-256
  `b962dd936744916de446cbf28a1583769c863d309c2fed35098021f5f639ca9b`.
  Merging that documentation does not authorize Step 04.

- Agent 70B-21 (2026-07-17): the exact external two-artifact audit and a
  separate independent read-only review passed for Owner-run Resume Step 04
  (`C03`). The authoritative context artifact
  `novora-fp-phase-a-resume-step-04-c03-continuation-00-context.png` is `90845`
  bytes with SHA-256
  `42d055cce0124ed76526136e4c8b56def1ac0cc069e59157ed5b39526f209207`.
  It visibly proves only `novora-production`, `main` / Production, Primary
  Database, selected role `postgres`, row limit `1000`, and a fresh blank
  editor/result pane without stale SQL, a warning, error, or sensitive content.
  It does not freshly prove `current_schema`, session role, recovery state,
  backend-session reuse, or the quiet window. Those limits retain the accepted
  R01 reliance and Owner attestations.

  The exact result artifact `novora-fp-phase-a-resume-04-c03.csv` is `125`
  bytes with SHA-256
  `a5cb4bde4e073bad6f2bf6d55d9ebb560ed506a8ed1eb86dba40ac3e02b9186d`.
  It has the exact headers `table_name`, `total_relation_bytes`, and
  `exact_row_count`; three complete rows; zero full-row duplicates; and zero
  duplicate table identities. `ai_sketch_jobs`, `ai_sketch_outputs`, and
  `ai_sketch_reviews` each have total size `24576` bytes and exact row count
  `0`. These are sanitized aggregate results only and contain no business-row
  or customer identity or value.

  The sanitized external supplement
  `novora-fp-phase-a-resume-step-04-c03-continuation-05-manifest-v1.json` is
  `10620` bytes with SHA-256
  `040c0b5e7c1c303e0e00917c7f003f347b33835a41c56197711f910a2f230afd`.
  It binds the exact Owner approval and immutable packet/source identities,
  selects exactly two PASS artifacts and zero error artifacts, records the
  exact sanitized aggregate result, and keeps `actual_canonical_sql_sha256`
  and `canonical_hash_equality` null because the CSV does not prove the SQL
  Editor input bytes. Matching reviewer start/end hashes independently
  confirmed that the PNG, CSV, and supplement remained unchanged.

  Resume Step 04 (`C03`) is `PASS`, but Phase A Resume and Phase A remain
  `STOPPED`; Steps 05-68 remain `not_run`. No Retry, Step 05, automated
  Supabase connection/SQL, later SQL, application, Provider, Storage,
  environment, deployment, customer action, cleanup, branch/worktree deletion,
  or evidence deletion occurred. The minimum next decision is frozen in
  `docs/novora-first-preview-phase-a-step-05-m01-continuation-packet-v1.md`.
  It covers only Resume Step 05 (`M01`) from MANUAL source blob
  `1d7ee46755254e6c01ac125793ecbd9bf3451204`, heading `04 - M01`, canonical
  byte length `431`, and SHA-256
  `03ad56a7e1c7f965f7972f84595df18da8fb0a58fa5988906a2f842894d814d5`.
  Merging that documentation does not authorize Step 05.

- Agent 70B-22 (2026-07-17): the exact external two-artifact audit and a
  separate independent read-only review passed for Owner-run Resume Step 05
  (`M01`). The authoritative context artifact
  `novora-fp-phase-a-resume-step-05-m01-continuation-00-context.png` is `91657`
  bytes with SHA-256
  `ca74318d260a1b6edb4d6ff16854cbec70587b8033b1927cc57e95abdd0b348c`.
  It visibly proves only `novora-production`, `main` / Production, Primary
  Database, selected role `postgres`, row limit `1000`, and a fresh blank
  editor/result pane without stale SQL, a warning, error, or sensitive content.
  It does not freshly prove `current_schema`, session role, recovery state,
  backend-session reuse, or the quiet window. Those limits retain the accepted
  R01 reliance and Owner attestations.

  The exact result artifact `novora-fp-phase-a-resume-05-m01.csv` is `246`
  bytes with SHA-256
  `7fa29da59e354086f823335a2bdca24dff654700638867f5f3e19c8ba7f311eb`.
  It has the exact headers `table_schema`, `table_name`, and `table_owner`; six
  complete rows in the required order; zero full-row duplicates; and zero
  duplicate table identities. `admin_notes`, `ai_sketch_jobs`,
  `ai_sketch_outputs`, `ai_sketch_reviews`,
  `concept_brief_reference_assets`, and `concept_briefs` are each in schema
  `public` and owned by `postgres`. These are sanitized catalog results only
  and contain no business-row or customer identity or value.

  The sanitized external supplement
  `novora-fp-phase-a-resume-step-05-m01-continuation-06-manifest-v1.json` is
  `10687` bytes with SHA-256
  `86cedd25177a5e5a0797f8f290c615c20530fa0a23376243d539896b6d6ae68e`.
  It binds the exact Owner approval and immutable packet/source identities,
  selects exactly two PASS artifacts and zero error artifacts, records the
  exact sanitized six-row ownership result, and keeps
  `actual_canonical_sql_sha256` and `canonical_hash_equality` null because the
  CSV does not prove the SQL Editor input bytes. Matching reviewer start/end
  hashes independently confirmed that the PNG, CSV, and supplement remained
  unchanged.

  Resume Step 05 (`M01`) is `PASS`, but Phase A Resume and Phase A remain
  `STOPPED`; Steps 06-68 remain `not_run`. No Retry, Step 06, automated
  Supabase connection/SQL, later SQL, application, Provider, Storage,
  environment, deployment, customer action, cleanup, branch/worktree deletion,
  or evidence deletion occurred. The minimum next decision is frozen in
  `docs/novora-first-preview-phase-a-step-06-m02-continuation-packet-v1.md`.
  It covers only Resume Step 06 (`M02`) from MANUAL source blob
  `1d7ee46755254e6c01ac125793ecbd9bf3451204`, heading `05 - M02`, canonical
  byte length `188`, and SHA-256
  `70eebd62612586e6e76338a1e9c75268d01021f6e8e2ba20e37a44d15aa9a010`.
  Merging that documentation does not authorize Step 06.

- Agent 70B-23 (2026-07-17): the exact external two-artifact audit and a
  separate independent read-only review passed for Owner-run Resume Step 06
  (`M02`). The authoritative context artifact
  `novora-fp-phase-a-resume-step-06-m02-continuation-00-context.png` is `91167`
  bytes with SHA-256
  `a5e057d87c9193221d40e30855d52901e07eb630613db1afb8d9cb9f6a6f7d9a`.
  It visibly proves only `novora-production`, `main` / Production, Primary
  Database, selected role `postgres`, row limit `1000`, and a fresh blank SQL
  editor with a blank or non-stale result pane and no warning, error, or
  sensitive content. It does not freshly prove `current_schema`, session role,
  recovery state, backend-session reuse, or the quiet window. Those limits
  retain the accepted R01 reliance and Owner attestations.

  The exact result artifact `novora-fp-phase-a-resume-06-m02.csv` is `186`
  bytes with SHA-256
  `2bb7414ac2388bbf56c16ad329a3bdc094400b608d61609d937f8efb2dca2b40`.
  It has the exact headers `rolname`, `rolsuper`, `rolinherit`, `rolcanlogin`,
  and `rolbypassrls`; four complete rows in the required order; zero full-row
  duplicates; and zero duplicate role identities. The sanitized result is:

  - `anon,false,true,false,false`
  - `authenticated,false,true,false,false`
  - `postgres,false,true,true,true`
  - `service_role,false,true,false,true`

  These are approved catalog role attributes only and contain no application-
  user, auth-user, business-row, or customer identity or value.

  The sanitized external supplement
  `novora-fp-phase-a-resume-step-06-m02-continuation-07-manifest-v1.json` is
  `10867` bytes with SHA-256
  `3fbf130c64f0f2a1089adddb88aa8123bd40f3d40ba0e784f48493941eed35a1`.
  It binds the exact Owner approval and immutable packet/source identities,
  selects exactly two PASS artifacts and zero error artifacts, records the
  exact sanitized four-role result, and keeps `actual_canonical_sql_sha256` and
  `canonical_hash_equality` null because the CSV does not prove the SQL Editor
  input bytes. Matching reviewer start/end hashes independently confirmed that
  the PNG, CSV, and supplement remained unchanged.

  Resume Step 06 (`M02`) is `PASS`, but Phase A Resume and Phase A remain
  `STOPPED`; Steps 07-68 remain `not_run`. No Retry, Step 07, automated
  Supabase connection/SQL, application-user or auth-user inspection, customer
  or business-row inspection, application, Provider, Storage, environment,
  deployment, customer-visible action, cleanup, branch/worktree deletion, or
  evidence deletion occurred. The minimum next decision is frozen in
  `docs/novora-first-preview-phase-a-step-07-m03-continuation-packet-v1.md`.
  It covers only Resume Step 07 (`M03`) from MANUAL source blob
  `1d7ee46755254e6c01ac125793ecbd9bf3451204`, heading `06 - M03`, canonical
  byte length `581`, and SHA-256
  `fdc2eecd481f69deb262eb35390495ed90a383a7d208131909b2c9566b8dd74c`.
  Merging that documentation does not authorize Step 07.

- Agent 70B-24 (2026-07-17): the exact external two-artifact audit and a
  separate independent read-only review passed for Owner-run Resume Step 07
  (`M03`). The authoritative context artifact
  `novora-fp-phase-a-resume-step-07-m03-continuation-00-context.png` is `91121`
  bytes with SHA-256
  `ea6f2e7c262768afb529e3a08f62c6a4920cfd9e6f909475717cdebf8186d5a0`.
  It visibly proves only `novora-production`, `main` / Production, Primary
  Database, selected role `postgres`, row limit `1000`, and a fresh blank SQL
  editor with a blank or non-stale result pane and no warning, error, or
  sensitive content. It does not freshly prove `current_schema`, session role,
  recovery state, backend-session reuse, or the quiet window. Those limits
  retain the accepted R01 reliance and Owner attestations.

  The exact result artifact `novora-fp-phase-a-resume-07-m03.csv` is `601`
  bytes with SHA-256
  `9c128badda0467a599866f0c6f0d1e4ecacf2933b4b7233d0a4729dc8579e72a`.
  It has the exact headers `granted_role`, `member_role`, `grantor_role`, and
  `admin_option`; 12 complete rows in the required order; zero full-row
  duplicates; and zero duplicate membership tuples. The sanitized result is:

  - `anon,authenticator,supabase_admin,false`
  - `anon,postgres,supabase_admin,true`
  - `authenticated,authenticator,supabase_admin,false`
  - `authenticated,postgres,supabase_admin,true`
  - `authenticator,postgres,supabase_admin,true`
  - `pg_create_subscription,postgres,supabase_admin,true`
  - `pg_monitor,postgres,supabase_admin,true`
  - `pg_read_all_data,postgres,supabase_admin,true`
  - `pg_signal_backend,postgres,supabase_admin,true`
  - `service_role,authenticator,supabase_admin,false`
  - `service_role,postgres,supabase_admin,true`
  - `supabase_privileged_role,postgres,supabase_admin,false`

  These are approved catalog membership identities only and contain no
  application-user, auth-user, business-row, or customer identity or value.

  The sanitized external supplement
  `novora-fp-phase-a-resume-step-07-m03-continuation-08-manifest-v1.json` is
  `12025` bytes with SHA-256
  `b1b9161bc89704ee97eac7ba93aa6d403b21f2fc18bc7854514a5d0ab8a61381`.
  It binds the exact Owner approval and immutable packet/source identities,
  selects exactly two PASS artifacts and zero error artifacts, records the
  exact sanitized 12-row membership result, and keeps
  `actual_canonical_sql_sha256` and `canonical_hash_equality` null because the
  CSV does not prove the SQL Editor input bytes. Matching reviewer start/end
  hashes independently confirmed that the PNG, CSV, and supplement remained
  unchanged.

  Resume Step 07 (`M03`) is `PASS`, but Phase A Resume and Phase A remain
  `STOPPED`; Steps 08-68 remain `not_run`. No Retry, Step 08, automated
  Supabase connection/SQL, role/membership/grant/privilege change,
  application-user or auth-user inspection, customer or business-row
  inspection, application, Provider, Storage, environment, deployment,
  customer-visible action, cleanup, branch/worktree deletion, or evidence
  deletion occurred. The minimum next decision is frozen in
  `docs/novora-first-preview-phase-a-step-08-m04-continuation-packet-v1.md`.
  It covers only Resume Step 08 (`M04`) from MANUAL source blob
  `1d7ee46755254e6c01ac125793ecbd9bf3451204`, heading `07 - M04`, canonical
  byte length `842`, and SHA-256
  `88079b80be9b150a3313d152aaf4da5dc328c0448bfc3d2322757aeac7348191`.
  Merging that documentation does not authorize Step 08.

- Agent 70B-26 (2026-07-17): Phase A's remaining execution strategy is now
  frozen as the documentation-only Accelerated Batch Resume Plan v2. It
  preserves the independently reconciled PASS evidence for Resume Steps 01-07
  and maps every remaining Step 08-68 exactly once, in frozen order, across
  eight separately approved fail-closed batches. The planned batch counts are
  `3 + 9 + 11 + 4 + 10 + 10 + 8 + 6 = 61`, exactly covering the inclusive
  61-step range 08-68 with no omission or duplication.

  Batch 01 covers only SELECT-only Steps 08/M04, 09/M05, and 10/M06. It retains
  MANUAL source blob `1d7ee46755254e6c01ac125793ecbd9bf3451204`,
  headings `07 - M04`, `08 - M05`, and `09 - M06`, canonical byte lengths
  `842`, `531`, and `1037`, and SHA-256 values
  `88079b80be9b150a3313d152aaf4da5dc328c0448bfc3d2322757aeac7348191`,
  `6716fd72b1392be20d03404839c9becf656dc438a60822e4dbcb5bd0e4761109`,
  and `a7282515ace0354f60a24ae403603c6333312e48f929a8695caab7c255ba73c7`.
  A single separately approved Batch 01 quiet window and visual context gate may
  support those three individually executed statements only while every
  packet-defined context and fail-closed gate remains satisfied. One combined
  external manifest, independent evidence review, ledger update, and docs-only
  PR follow batch completion or STOP; there is no reconciliation cycle between
  M04, M05, and M06.

  The earlier single-step Step-08/M04 Packet v1 at Git blob
  `8798f99fb50ed57e951a92ddd4f53704e6e178fa` remains immutable historical
  documentation and was never approved or executed. It is superseded for
  future execution only after the accelerated plan and Batch 01 packet are
  independently reviewed, merged, and separately approved. Merging either new
  document authorizes no SQL. Steps 08-68 remain `not_run`; Phase A Resume and
  Phase A remain `STOPPED`.

- Agent 70B-27 (2026-07-17): Phase A Resume Batch 01 completed with one
  combined evidence reconciliation and a separate independent read-only review
  PASS. The selected external evidence remained stable at review start and end:
  context PNG `90845` bytes / SHA-256
  `acfcb59cab07d6646483eafbdb6a6c10498b05e355feec569378ee13a02b67d3`,
  M04 CSV `1017` bytes /
  `68bbca02efc314e3c76a7e94bb45201e5c03ab9cdf250a93dce1fd0dd0fec4ff`,
  M05 CSV `678` bytes /
  `9f25d826a1e318a6e4a43e0472291c7036f8ed03600a5cdbc275631d4ee2b99d`,
  and M06 CSV `1230` bytes /
  `22950f5f1f71c833594d66142a88d58481035d312681f551cda2c55ee6bb6b5d`.

  The visual context independently proves only `novora-production`, `main` /
  Production, Primary Database, selected role `postgres`, row limit `1000`, and
  a fresh blank editor/result pane with no visible warning, error, or sensitive
  content. It does not freshly prove current schema, session role, recovery
  state, backend-session reuse, or quiet-window truth; the accepted bounded
  reliance and Owner attestations remain explicit.

  M04 has the exact six headers and 18 ordered effective-DML rows; M05 has the
  exact three headers and 18 ordered all-false TRUNCATE rows; and M06 has the
  exact eight headers and 18 ordered role/schema/ownership/RLS/policy rows.
  Every file has zero full-row and `(role_name, table_name)` duplicates, no
  missing/additional/malformed/truncated value, and no protected data. The
  selected CSVs prove returned results but not SQL Editor input bytes, so every
  `actual_canonical_sql_sha256` and `canonical_hash_equality` remains null.

  The external combined manifest
  `novora-fp-phase-a-resume-batch-01-m04-m06-11-manifest-v2.json` is `23043`
  bytes with SHA-256
  `f04d60c5f1e86def72a9a5b6cef56788fd1668a9dc7475a81678cffeab88feef`.
  It selects exactly one context plus three PASS CSVs and zero error artifacts;
  records Steps 08/M04, 09/M05, and 10/M06 PASS; identifies M06 as the last
  successful item; records no Retry and no error; and preserves Steps 11-68 as
  `not_run`, Phase A Resume `STOPPED`, and Phase A `STOPPED`.

  The next combined decision is frozen only in
  `docs/novora-first-preview-phase-a-batch-02-b01-b17-continuation-packet-v2.md`.
  It covers the exact ordered SELECT-only sequence 11/B01, 12/B02, 13/B03,
  14/B04, 15/B05, 16/B06, 17/B07, 18/B15, and 19/B17. Merging the packet does
  not authorize SQL, Step 11 has not been executed, and Step 20 remains outside
  Batch 02.

- Agent 70B-28 (2026-07-20): Phase A Resume Batch 02 completed with one
  combined evidence reconciliation and a separate independent read-only review
  PASS with no findings. The external combined manifest
  `novora-fp-phase-a-resume-batch-02-b01-b17-20-manifest-v2.json` is `21342`
  bytes with SHA-256
  `08cce41ec14d7c91730ce2d3ad2a513c7a50079786327d525ee5cf750a69c7dc`.
  The manifest and all ten selected artifacts remained byte-for-byte stable at
  independent review start and end, and no competing PASS, zero-row, or ERROR
  artifact was present.

  The selected context PNG is `91119` bytes / SHA-256
  `6abb93ade460db7a2933082ca3191d46bb5f139a64746529c3fa50c0fb58b09b`.
  It independently proves only the visible `novora-production`, `main` /
  Production, Primary Database, selected role `postgres`, row limit `1000`,
  fresh blank editor/result pane, and absence of a visible warning, error, or
  sensitive value. It does not freshly prove current schema, session role,
  recovery state, backend-session reuse, or quiet-window truth; the accepted
  bounded reliance and Owner attestations remain explicit.

  B01, B02, B04, B05, and B17 returned the packet-authorized empty-table PASS
  result. Their selected zero-row screenshots are respectively `98701` bytes /
  `613be6cdba13392621989fc604a4063f241fcfdd16f184317091f710b77bcc42`,
  `100364` bytes /
  `c22d737c00dc09a39c13ac86fa6e66598eb0e3beff1ff775cf345fbbe0d93486`,
  `102567` bytes /
  `22cdbb67c310b8ec751045e82484b0591a373dccb7cceca7a2c6727adb183179`,
  `103655` bytes /
  `5773b62419fc4850cccf594a5fd2455498eee8eee75e33032f201be60928a748`,
  and `106181` bytes /
  `bec30b9314ac559bdf6e0a3a619b9e621759167a4d8f2ad9d1da5c75eb0975dc`.
  Every screenshot visibly contains its complete frozen statement, unchanged
  target controls, successful zero-row result, and no warning or error.

  B03, B06, B07, and B15 returned one complete aggregate row each with all
  required counts exactly zero. Their CSVs are respectively `74` bytes /
  `8f6842912f6af481e0279c35b0e3f72fb7ec9daed092bd6c7130512b50f4991d`,
  `128` bytes /
  `cd30551086f7b2568b077d292fea061e9c487e34a8f2d5988a100b7cde8b9204`,
  `30` bytes /
  `07cc4236bb6989f62773fa94fb6b80e04652c650ef2803c238365761c89e3a57`,
  and `25` bytes /
  `17b9703126a3033c7036fa0ed6c8abdfce04de5e7bfa34eb9cda3ddaf63e0b79`.
  Exact headers, row counts, arithmetic and zero-count invariants, duplicate
  counts, completeness, and privacy checks passed. All nine frozen SQL blocks
  independently recomputed to their exact canonical byte lengths and hashes.
  Selected result evidence does not prove submitted SQL bytes, so every
  `actual_canonical_sql_sha256` and `canonical_hash_equality` remains null.

  Resume Steps 11/B01 through 19/B17 are PASS, B17 is the last successful
  item, Steps 20-68 remain `not_run`, no Retry or error occurred, and neither
  Step 20 nor any unapproved action was executed. Phase A Resume and Phase A
  remain `STOPPED`.

  A planning defect was identified before any future Batch 03 packet was
  frozen or released: Accelerated Batch Resume Plan v2 assigns Step 30/L01 to
  Batch 03 and Step 31/23.3-S01 to Batch 04 even though the frozen Resume Packet
  requires L01 to run immediately before 23.3-S01. The intervening Batch 03
  reconciliation, PR, separate approval gate, or other delay could invalidate
  the temporal preflight. The former future Batch 03-08 mapping must not be used
  for execution. The next documentation milestone is one independently
  reviewed Critical Path Cutline v3 that preserves completed evidence, repairs
  L01/DDL adjacency, separates MVP-core database work from post-beta hardening,
  and defines a finite database exit. This ledger entry authorizes no SQL.

- Agent 70B-29 (2026-07-20): Critical Path Cutline v3 supersedes only the
  unexecuted future Accelerated Batch Resume Plan v2 Batch 03-08 mapping. It
  preserves all completed evidence through Batch 02 and records the exact
  temporal defect: Plan v2 separated Step 30/L01 from its Step
  31/`23.3-S01` dependent DDL with a reconciliation, PR, and approval boundary,
  making the point-in-time lock/candidate-object preflight stale by design.

  The replacement path has exactly three remaining database human execution
  gates: `MVP-CORE-1` Core-only SELECT preflight; `MVP-CORE-2` L01-Core
  immediately followed by Core DDL and per-DDL catalog assertions under one
  uninterrupted quiet window; and `MVP-CORE-3` Core-only validation plus final
  database-exit verification. No reconciliation, manifest, PR, approval gate,
  refresh, reconnection, context switch, or long delay may occur between
  L01-Core PASS and the first dependent DDL.

  `MVP_CORE_REQUIRED` is limited to valid Job status and complete non-draft
  First Preview identity, including an attempt-1 root, one bounded attempt-2
  same-brief retry, parent consistency, and attempt uniqueness; idempotency and
  one-active-job uniqueness; one output per job; one current preview per brief;
  Job/Output/Review/Brief composite FK consistency; complete
  `first_preview_ready` evidence and bidirectional ready/current-marker
  consistency; and indexes used by real MVP reservation, retry, output,
  current-preview, and review-linkage paths. The old grouped
  `23.3-S01`, `23.4-S01`, cumulative assertions, and final object sets cannot be
  reused unchanged; new immutable Core-only statements and hashes are required.

  `POST_MVP_HARDENING` defers feedback-regeneration attempts 2-3, extended
  source-output lineage and recursive-cycle enforcement beyond the bounded Core
  retry, cost/pricing and Provider-request enforcement, full non-ready lifecycle
  and revocation chronology, Provider uniqueness outside the Core reservation
  key, and unused support indexes until after the first limited beta. Deferral
  never permits an output without complete private-asset validation and
  automatic gate evidence to become `first_preview_ready`.

  Database exit requires all three gates to pass, all Core CHECKs/FKs to be
  validated, all Core indexes healthy, every Core violation count zero,
  baseline access/RLS/object posture unchanged, stable independent evidence
  review, and durable ledger merge. At exit, record MVP database Core complete
  and post-MVP hardening deferred/not executed. No later planning-only loop may
  block real repository integration. This documentation authorizes no SQL.

## 7. Current Non-Goals And Boundaries

- No customer login system yet.
- No payment.
- No CAD approval workflow.
- No production order system.
- No customer confirmation email workflow.
- No real AI sketch generation API is implemented in Production yet. This is a
  current implementation gap, not a prohibition on the locked instant first
  customer-preview direction.
- No automatic retry tooling for failed or reserved admin notifications yet.
- A Concept Brief is not a final order, final pricing, CAD approval, or production confirmation.

## 8. Critical Product Constraints

- Do not add 10K Gold unless explicitly restored.
- Do not add 0.60mm+ machine-woven chain thickness unless explicitly restored.
- Keep chain options mainstream China-market procurable.
- Special or custom chain requirements should route to manual confirmation.
- Reference images selected on `/design/concept` are planning-only.
- Final real upload happens on `/design/brief`.
- Demand-side market direction remains North America first, with Europe, Japan,
  and Taiwan as secondary future markets. China should be treated as NOVORA's
  supply-chain, gemstone processing, jewelry manufacturing, production-cost,
  and factory-support base unless a future task explicitly approves separate
  demand-side China-market analysis.
- Traditional Chinese and Taiwan should be included as future localization and market direction.

## 9. Operating Rules For Future Codex Work

- Start each new implementation from latest `main`.
- Use one feature branch per scoped task.
- Avoid broad rewrites.
- Do not expose secrets.
- Do not request API keys in chat.
- Do not do SQL, schema, grant, Supabase, Vercel, Resend, Cloudflare, or environment-variable work without explicit approval for that specific task.
- For docs-only tasks, no build is required unless code changes.
- For app-code tasks, run `npm run build` and focused tests.
- Do not show customer-facing received or submitted confirmation unless server
  persistence, a valid `publicReference`, and a valid Concept Brief UUID are
  confirmed. Local fallback may preserve draft or summary state only.
- When a task reveals a reusable project rule, record it in the appropriate
  durable location: concise repository rules in `AGENTS.md`, detailed
  procedures in repo-local skills, verified state in this ledger, or regression
  behavior in tests.
- In permission dialogs, the user can click Continue or Allow; do not say "reply to Codex" inside permission dialogs.
- Read `docs/novora-codex-operating-mode.md` before changing workflow,
  branching, PR, deployment, permission, or agent-handoff rules.
- Do not run `git add .` without explicit approval for that exact command.
- Every proposed PostgreSQL `CHECK` involving nullable columns requires an
  explicit NULL truth-table review because TRUE and NULL both satisfy a CHECK.
  At minimum review all-null, controlling-status NULL, evidence NULL,
  ready/current, ready/non-current, current/not-ready, revoked-after-ready,
  revoked-without-ready, and out-of-order timestamp cases. Matching violation
  preflights must explicitly count NULL-invalid combinations; NULL-result
  acceptance is a blocking SQL-review defect.
- Every lifecycle truth table must test both `status -> required evidence` and
  `evidence/timestamp -> compatible status`. It must include the exact staged
  state with started/terminal evidence, terminal status with missing identity,
  terminal timestamps on nonterminal statuses, all-NULL and partial Provider
  profiles, validation timestamps without complete integrity evidence, gate
  pass timestamps with non-passed status, and all ready/current/revoked NULL
  combinations. A one-way implication is incomplete.
- Success, failure, cancellation, and timeout must use mutually exclusive,
  status-specific terminal timestamps. `completed_at`, `failed_at`,
  `cancelled_at`, and `timed_out_at` must each imply and be required by only
  their matching terminal status, and every populated terminal timestamp must
  satisfy the approved ordering rules.
- Every post-execution lifecycle verification query must mirror every
  corresponding preflight and candidate CHECK predicate. This includes
  status-specific required evidence, evidence-to-status reverse implications,
  start/deadline pairing, deadline-specific ordering, terminal timestamp
  exclusivity, nonterminal evidence contradictions, and NULL/partial-population
  cases. A reduced terminal-timestamp sample is a blocking false-zero risk.
- Post-execution verification must mirror every applicable Candidate and
  preflight predicate, not only lifecycle timestamps. Actual-set discovery must
  be independent of the expected set because expected-name filtering cannot
  prove the absence of unexpected names. Metadata subtraction must use a
  verified, table-qualified baseline and fail closed on missing, changed, or
  otherwise unresolved baseline schema until a separately reviewed refresh.
- An editor-reported DDL success is not durable schema evidence. Every manual
  candidate DDL statement must be followed immediately by a separately frozen
  and approved metadata assertion that proves exact target identity and every
  expected catalog change before any dependent statement runs.
- A Supabase SQL Editor `Failed to fetch` or API transport/result-fetch error is
  not a PostgreSQL SQLSTATE and does not prove database receipt or execution.
  Stop immediately, preserve the exact evidence, keep the actual submitted-SQL
  hash null unless complete bytes are independently proven, and require a new
  immutable retry packet plus separate exact approval; never authorize a
  generic editor `Retry` click.
- Every `pg_locks` audit that compares a relation OID must also constrain the
  current database OID because relation OIDs are database-local. Excluding the
  current backend must use `pid IS DISTINCT FROM pg_backend_pid()`, not `<>`,
  so NULL-PID prepared-transaction locks remain visible and fail closed.
- Evidence manifests must keep the actual canonical SQL hash and hash-equality
  result null whenever the selected artifact cannot prove the complete submitted
  statement bytes. Never copy the expected hash into an actual-hash field by
  inference; record the exact proof basis separately.
- When a supplied evidence size or hash conflicts with a fresh computation from
  the exact authorized external file, preserve both identities, treat the
  external file computation as authoritative, and document the discrepancy.
  Never replace or normalize the external artifact to make it match a transported
  copy or supplied identity.
- Before freezing an evidence manifest, validate its identity fields one by one
  against every requirement in the governing packet, including both Git blob
  and raw-file SHA-256 when the packet requires both. A valid JSON parse and
  artifact-hash match do not prove identity-contract completeness.
- An independent review of external evidence must obtain matching start and end
  hashes from the same reviewer context and exact original paths. A reviewer
  access/sandbox failure must fail closed for that reviewer but must not be
  reported as deletion or mutation unless the host-visible filesystem evidence
  independently proves that change.
- Stop before app code, SQL, Supabase, Vercel, Resend, Cloudflare, real email,
  secrets, retry/resend behavior, payment, auth, CAD, order, AI generation,
  force push, PR merge, or Production deploy unless that specific action is
  explicitly approved.

## 10. Recommended Next Step

As of 2026-07-17, Stage A existing-table ACL correction and Stage B `postgres`
future-public-table default-privilege correction are complete. Their immediate
post-execution evidence passed, and Stage B's corrected authoritative
forbidden-default mismatch detector returned zero rows. Neither Stage A nor
Stage B rollback was executed. Stages C, D, and E remain unexecuted.

Owner-run Phase A is now STOPPED at step 25 (`B11`) with SQLSTATE `42703` for
missing `public.ai_sketch_outputs.is_current_customer_preview`. Step 24 (`B10`)
is the last successful step. Steps 26-53, block 23.7, rollback, cleanup, retry,
and repair were not executed. The prior Phase A approval is exhausted by the
STOP and must not be reused.

The approved recovery and repair are COMPLETE. Current live evidence proves all
35 frozen `23.1-S01` job additions and all 17 frozen `23.2-S01` output
additions with exact definitions and no dropped slots. The repair preserved the
empty output table and its five existing healthy objects. Historical cause is
still not proven, and Phase A remains STOPPED.

The original Phase A Resume R01 attempt stopped on a transport/fetch failure;
the separately approved R01 retry and R02 continuation are now COMPLETE. Fresh
R01 and R02 evidence passed, and the completed R02 external supplement has
SHA-256
`fbb4a105aca1f7cd92eb034fc7d65eaaa84edb99b19283f0407dff60e98e26ce`.
R02 proves the complete expected 44-Job/25-Output positive-attribute catalog
with exact definitions and zero dropped slots. It correctly does not prove the
submitted SQL bytes; actual SQL hash and equality remain null. Phase A Resume
and Phase A remain STOPPED, and Resume Steps 03-68 remain `not_run`.

Resume Steps 03 (`R04`), 04 (`C03`), 05 (`M01`), 06 (`M02`), and 07 (`M03`)
are now COMPLETE with independently reconciled PASS evidence. For Step 07, the
authoritative context artifact is `91121` bytes / SHA-256
`ea6f2e7c262768afb529e3a08f62c6a4920cfd9e6f909475717cdebf8186d5a0`;
the 12-row result artifact is `601` bytes / SHA-256
`9c128badda0467a599866f0c6f0d1e4ecacf2933b4b7233d0a4729dc8579e72a`;
and the completed external supplement is `12025` bytes / SHA-256
`b1b9161bc89704ee97eac7ba93aa6d403b21f2fc18bc7854514a5d0ab8a61381`.
The result proves the exact frozen Stage A membership baseline with no
additional or unreviewed inherited privilege path. The bounded context
limitations remain unchanged, and actual submitted-SQL hash and equality
remain null.

Phase A Resume and Phase A remain STOPPED. Resume Steps 08/M04 through 19/B17
are independently reconciled PASS. The combined Batch 01 manifest is `23043`
bytes / SHA-256
`f04d60c5f1e86def72a9a5b6cef56788fd1668a9dc7475a81678cffeab88feef`.
The combined Batch 02 manifest is `21342` bytes / SHA-256
`08cce41ec14d7c91730ce2d3ad2a513c7a50079786327d525ee5cf750a69c7dc`.
Resume Steps 20-68 remain `not_run`.

Do not freeze, approve, or execute the former Batch 03 mapping. Accelerated
Batch Resume Plan v2 incorrectly separates Step 30/L01 from Step 31/23.3-S01
with a reconciliation, PR, and approval boundary even though the frozen Resume
Packet requires L01 immediately before 23.3-S01. Critical Path Cutline v3
supersedes only the unexecuted future Batch 03-08 mapping and is the
authoritative future database cutline. `MVP-CORE-1` has now passed independently
reconciled evidence. Exactly two database human execution gates remain:
uninterrupted `MVP-CORE-2` L01-Core plus Core DDL, followed by `MVP-CORE-3` Core
validation/final verification. The immediate next database documentation action
is preparation and independent review of one immutable `MVP-CORE-2` packet. No
`MVP-CORE-2` SQL is yet frozen or authorized. The former Batch 03 packet/mapping
or approval must not be reused, and this cutline authorizes no SQL.

In parallel after the cutline merge, a separate low-risk application slice may
add a server-only persistence/repository interface, an in-memory fake, and
focused tests while keeping Production fail-closed. It must not connect to
Supabase, call a real Provider, use credentials, inspect customer data, change
Storage or environment values, or deploy. Private generated-asset access,
secure customer preview access, automatic readiness gates, route/UI wiring,
and post-preview review linkage remain incomplete.

- Agent 70B-30 (2026-07-20): the fake-only First Preview persistence foundation
  now defines a server-only repository contract, a deterministic in-memory
  implementation, and an explicitly unavailable default Production binding.
  The Production facade has a mechanical `server-only` import. Reservation
  derives the exact `novora:first-preview-idempotency:v1` lowercase SHA-256 from
  the complete RFC 8785 canonical identity; an identical semantic replay with
  a fresh proposed Job UUID returns the original active or completed Job. The
  fake rejects a conflicting concurrent active Job, enforces the bounded
  attempt-1/attempt-2 parent shape, permits attempt 2 only after an explicitly
  eligible failed attempt 1, and denies retry after success, timeout,
  cancellation, or a non-retryable failure. It persists at most one
  asset-backed Output per Job as
  `not_ready`, verifies Job/Output/Brief linkage, and exposes an Output to its
  customer-ready reader only after Job success and every required automatic
  gate is true. Missing persistence, mismatched identity, failed gates, and
  unavailable Production persistence all fail closed without fabricating an
  Output or ready state. There is no delete method.

  Focused fake tests cover canonical identity/hash derivation, malformed
  identity denial, semantic idempotent replay, concurrent reservation denial,
  eligible one-time retry and ineligible retry denial, asset-backed Output
  persistence, idempotent Output persistence, ready/not-ready decisions,
  missing-asset and wrong-brief denial, safe terminal failure, and unavailable
  Production behavior. Existing
  provider-neutral First Preview runtime tests and the local Production build
  remain green. This foundation performs no Supabase, Storage, Provider,
  credential, environment, customer-row, deployment, or customer-visible
  action. A real Supabase repository, private generated-asset persistence,
  automatic gate evidence persistence/revocation, route/UI integration, and
  complete E2E remain future separately gated work.

- Agent 70B-31 (2026-07-20): Critical Path Cutline v3 Gate `MVP-CORE-1` now has
  one new immutable SELECT-only preflight packet prepared from merged main.
  The packet does not reuse the superseded Batch 03 mapping, approval, L01, or
  candidate SQL. It freezes one Phase 0 context capture and seven individually
  ordered manual SELECT statements: exact session/relation identity; exact
  Core column posture; Job Core identity/duplicate/bounded-parent aggregates;
  Output Core readiness/current/evidence/duplicate aggregates; exact
  Job/Output/Review/Brief composite compatibility; the complete accepted
  16-object baseline catalog; and absence of all 17 proposed Core objects.
  Every statement has an exact canonical byte length and SHA-256, deterministic
  PASS/ERROR filenames, result gates, universal STOP rules, and an external
  sanitized manifest contract.

  The packet keeps feedback/source-output lineage, Provider-request and
  pricing enforcement, extended lifecycle and revocation chronology, unused
  indexes, and all other `POST_MVP_HARDENING` outside the limited-beta Core
  gate. It authorizes no Supabase connection, SQL, DDL, DML, retry, repair,
  rollback, cleanup, Storage, Provider, environment, deployment, customer-row,
  or customer-visible action. `MVP-CORE-1`, Phase A Resume, and historical
  Phase A remain `NOT_EXECUTED`/`STOPPED`. After exact-head independent review
  and docs-only merge, the next boundary is a separate exact Owner approval for
  only the frozen Phase 0 and seven-statement manual SELECT sequence.

- Agent 70B-32 (2026-07-20): the first approved `MVP-CORE-1` Phase 0 context
  gate failed closed before SQL execution because the selected SQL Editor row
  limit was visibly `100`, below the required minimum `1000`. The authoritative
  evidence set contains exactly
  `novora-fp-mvp-core-1-00-context-error.png`, `95950` bytes / SHA-256
  `c8b9043605f71486bca81c9d6f7fae4942cf6d92463c94cc7d896cdddd87a952`.
  Phase 0 is `ERROR`; `CORE1-01` through `CORE1-07` are `not_run`; SQL
  executions are `0`; retry was not performed; and `MVP-CORE-1` is `STOPPED`.
  The later corrected `1000 rows` recapture occurred after STOP and remains
  outside the authoritative evidence set; it was not selected, inspected,
  hashed, copied, modified, or used.

  The external sanitized STOP manifest is
  `novora-fp-mvp-core-1-08-manifest-v1.json`, `7500` bytes / SHA-256
  `52aef1416726db16e3dd0db02fbe74335e57c87ef5b1f867cfa85ea9bed24729`.
  One minimal immutable Phase-0 retry/continuation packet now permits, only
  after separate exact approval, one new fresh Phase 0 context capture and,
  only after exact context PASS, continuation into the original packet's
  unchanged `CORE1-01` through `CORE1-07` sequence. It incorporates the seven
  SQL blocks only by reference to original packet Git blob
  `eb3cac28bdf5b52b9a2ebcf5a0f6b2d440c66163`; it does not reproduce, change,
  regenerate, substitute, broaden, or re-freeze their SQL, hashes, expected
  results, statement evidence filenames, STOP rules, or exclusions. No
  Supabase connection, SQL, DDL, DML, Retry, repair, rollback, cleanup,
  Storage, Provider, environment, deployment, application, customer-row, or
  customer-visible action was performed.

- Agent 70B-33 (2026-07-20): the separately approved `MVP-CORE-1` Phase-0
  retry/continuation sequence is independently reconciled `PASS`. The fresh
  Phase 0 visual gate and `CORE1-01` through `CORE1-07` all passed; the Owner
  performed exactly seven manual SELECT-only executions in frozen order, the
  last PASS was `CORE1-07`, and there was no failed item. No retry, rerun,
  repair, compensation, backfill, rollback, cleanup, SQL substitution, later
  SQL, DDL, DML, Storage, Provider, credential/environment, deployment,
  application-rollout, customer-row, or customer-visible action occurred.

  All seven selected CSV artifacts match their supplied byte sizes and SHA-256
  identities. Their exact headers, row counts, ordering, uniqueness, frozen
  relation/object identities, aggregate invariants, definitions, validation,
  readiness, and liveness passed independent review. The result proves the
  exact three-relation context; all 37 Core columns; zero Job, Output, linkage,
  or compatibility violations; the exact healthy 16-object baseline; and the
  absence of all 17 proposed Core objects. Because result CSVs do not prove the
  complete submitted statement bytes, every actual canonical SQL hash and
  hash-equality value remains null.

  The authoritative external fresh Phase 0 artifact is `96632` bytes / SHA-256
  `f831b3f8b91fb1d73f906db478e385113ee2341bbebfd2e107de5fbbf4c0da49`,
  not the supplied transported identity of `152666` bytes / SHA-256
  `044ef31ff1f85378d5888b2d3016526f7a272ff28d8be715799b85c1e7f52c7c`.
  The discrepancy is preserved; the actual external file was not replaced or
  normalized, and independent visual inspection still passed every frozen
  context control. The original STOP manifest and ERROR artifact remain
  unchanged. The excluded post-STOP corrected recapture was not selected,
  inspected, hashed, copied, or reused.

  The external sanitized retry supplement is
  `novora-fp-mvp-core-1-phase0-retry-continuation-09-manifest-v1.json`, `12389`
  bytes / SHA-256
  `abd04de2ebd134b4697140f7c4f263efae175e8fabd2db5f3b0685b142e49a22`.
  `MVP-CORE-1 = PASS`; Phase A Resume and historical Phase A remain `STOPPED`.
  `MVP-CORE-2` has not started and is not authorized. The next gate is separate
  Owner approval to prepare and independently review one immutable
  `MVP-CORE-2` packet; execution requires a later exact packet-bound approval.

### Historical pre-Stage-A context

The following text preserves the prior planning context. Its former "required
next sequence" is superseded by the dated recommendation above and does not
authorize any operation.

Agent 70B-1 / PR #197 is merged with normal merge commit
`e77d2e6267f78ecf1109198ae100149eb8e466e4`. The owner-run Q01-Q11 evidence is
complete, and Agent 70B-2 has prepared a documentation-only reuse-first review,
supplemental preflights, and additive candidate SQL. No migration has been
executed and effective access-control evidence remains incomplete. The first
independent Review, second independent Re-Review, third independent Re-Review,
fourth independent Re-Review, and fifth independent Re-Review all returned
**FAIL — CORRECTION REQUIRED**.
The third correction separated succeeded `completed_at` from failed `failed_at`
and corrected the asset sequence so private persistence precedes binary/image
validation. The fourth correction resolved timeout and status-evidence gaps.
The fifth correction addresses the two remaining false-zero paths by extending
V01 to every applicable Candidate/B13 Job invariant and deriving its actual
candidate-added metadata set independently through verified Q02 baseline
subtraction. Corrected Draft PR #198 now requires another independent Re-Review,
and the supplemental Owner-run preflights remain blocked until that Re-Review
passes.

Required next sequence:

1. Another independent read-only formal Re-Review of corrected Draft PR #198.
2. Only after that review passes, the owner manually executes the separately approved supplemental SELECT-only
   metadata and aggregate compatibility preflights.
3. A later documentation Agent reconciles supplemental results and regenerates
   blocked predicates or statements when necessary.
4. A separately approved SQL Agent performs only authorized additive SQL.
5. Owner-run post-execution metadata and aggregate verification.
6. A separate slice implements private generated-asset Storage and secure
   server-mediated or short-lived signed access.
7. A separate provider/environment slice constructs the real provider client,
   handles credentials, and enforces budget, limiter, and call authorization.
8. A separate implementation wires generation only after confirmed persistence.
9. Separate implementations add trusted automatic readiness gates, customer
   First Preview route/UI, and post-preview human review in that order.

Do not claim those later steps are implemented, and do not combine their
approval boundaries into one PR.

The obsolete Agent 66E branch and its dirty workspace remain a separate
disposition task. Agents 69A, 69B, and 69C use the isolated clean worktree and
do not reset, stash, check out over, delete, salvage, or merge Agent 66E files.

Do not describe the instant-preview direction as implemented until real
generation, secure preview access, automatic gates, and safe failure behavior
have been built and passed implementation QA. Do not run new limited-beta or
private-testing operations under the superseded internal-only,
human-pre-approval, email-only rules.
