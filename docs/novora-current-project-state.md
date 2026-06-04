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
