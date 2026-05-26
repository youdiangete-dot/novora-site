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
- In permission dialogs, the user can click Continue or Allow; do not say "reply to Codex" inside permission dialogs.
- Read `docs/novora-codex-operating-mode.md` before changing workflow,
  branching, PR, deployment, permission, or agent-handoff rules.
- Do not run `git add .` without explicit approval for that exact command.
- Stop before app code, SQL, Supabase, Vercel, Resend, Cloudflare, real email,
  secrets, retry/resend behavior, payment, auth, CAD, order, AI generation,
  force push, PR merge, or Production deploy unless that specific action is
  explicitly approved.

## 10. Recommended Next Step

Production idempotency verification for PR #62 is complete as of Agent 24D.

Recommended next step: decide whether to add explicit admin retry/observability tooling for `reserved` or `failed` notification events. Keep this as a separate, reviewed feature because retry behavior can reintroduce duplicate-delivery risk.

Do not run new SQL unless a new schema change is explicitly approved.
