# NOVORA Current Project State

## 1. Purpose

This document is the durable NOVORA project state ledger and the first file to
read before each new agent, stage, or implementation slice.

It exists because ChatGPT memory can become full, incomplete, or unavailable across future work sessions. GitHub documentation on `main` should be treated as the source of truth over chat memory whenever there is a conflict.

When chat memory, older local notes, detached worktree state, or assumptions
from previous conversations conflict with this ledger and the current GitHub
`main` branch, this ledger and current `main` win.

## 2. Current Production Baseline

- Domain: `novora.design` / `www.novora.design`
- Hosting: Vercel project `project-dd34e`
- Deployment baseline: the `main` branch deploys to Production
- Current `main` HEAD / PR #121 merge commit:
  `0795d85bc5222b4eab7c6155ae9ca634b5f1cac5`
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
  `codex/agent-45e-write-path-implementation-precheck-plan` is draft, open,
  and unmerged at the time of this review pass. Initial commit
  `0fea5ba46313114c923b35debc09bd75925a617a` adds
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
  auth/deploy changes were made. This PR should remain draft, open, and
  unmerged through review. The next step after review should be Final PR Check
  / Ready decision, then a user-run manual precheck decision, not automatic
  implementation.

## 7. Current Non-Goals And Boundaries

- No customer login system yet.
- No payment.
- No CAD approval workflow.
- No production order system.
- No customer confirmation email workflow.
- No real AI sketch generation API.
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
- Stop before app code, SQL, Supabase, Vercel, Resend, Cloudflare, real email,
  secrets, retry/resend behavior, payment, auth, CAD, order, AI generation,
  force push, PR merge, or Production deploy unless that specific action is
  explicitly approved.

## 10. Recommended Next Step

Recommended next step: keep Production rate-limit enforcement fail-open during
the current MVP stage and review
`docs/novora-production-rate-limit-enablement-decision.md` before any
Production rate-limit environment/provider/deploy action. Option C remains the
commercial-standard target: use a Production-dedicated Upstash Redis resource
separate from Preview, with no shared Preview/Production keyspace. Do not reuse
`novora-preview-rate-limit` for Production. Revisit and execute Option C before
formal commercial launch, paid traffic, larger social traffic, increased real
customer submissions, spam/fake/repeated submissions, admin notification noise,
or payment/order/account Production workflows. PR #78 has passed manual Preview
verification for Upstash-backed rate-limit enforcement and safe `429` handling,
but Production environment configuration was not changed. Do not provision
Vercel KV/Upstash, Turnstile, signing secrets, Vercel env values, or implement
additional rate-limit/bot-protection code until a separate approved Agent/task.

Do not run SQL, change Supabase, change Vercel env, provision providers, create
secrets, or implement abuse-control code unless a separate reviewed Agent/task
explicitly approves that exact action.
