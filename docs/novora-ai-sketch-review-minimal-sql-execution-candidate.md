# NOVORA AI Sketch Review Minimal SQL Execution Candidate

## A. Purpose And Boundary

This is a SQL candidate and final preflight document only. It prepares a
conservative direction for a future minimal SQL execution step for internal
admin AI Sketch Review Workflow persistence.

No SQL was executed for this document. No Supabase connection was made. No
database, schema, RLS, grants, policies, storage, app code, API route, OpenAI
API, image generation, image upload/storage, customer-facing sketch display,
public gallery automation, auth, payment, points, environment variable, secret,
Production/admin page, submission, email, deploy, CAD, order, production, or
customer-data operation was performed.

Merging this document does not approve SQL execution. SQL execution still
requires a separate explicit user message that approves the concrete SQL,
target Supabase project, verification plan, and rollback posture.

## B. Existing-Schema Uncertainty Check

Repo review found three different schema contexts:

- `docs/novora-current-project-state.md` confirms live Supabase tables for
  Concept Briefs, contacts, reference assets, `admin_notes`, and
  `concept_brief_notification_events`. It does not list `ai_sketch_reviews` as
  a confirmed live table.
- Older schema/setup docs, including `docs/novora-supabase-schema-plan.md` and
  `docs/novora-supabase-sql-schema-draft.md`, include `ai_sketch_reviews` as
  planned or draft future schema.
- Newer AI sketch planning docs say `ai_sketch_jobs`, `ai_sketch_outputs`, and
  `ai_sketch_reviews` must be verified against live Supabase before execution.

Therefore, this packet must not blindly propose creating a duplicate
`ai_sketch_reviews` table. The exact live schema is unknown from repo docs
alone. Live Supabase schema must be verified before execution. This document
does not guess live schema and does not claim live schema was inspected.

## C. Minimal SQL Decision

Conservative recommendation:

- If `ai_sketch_reviews` already exists in `novora-production`, use a minimal
  ALTER / verify path rather than a duplicate `CREATE TABLE`.
- If `ai_sketch_reviews` does not exist, stop before execution and review
  whether the first execution should create a minimal table or whether it
  should wait for `ai_sketch_jobs` and `ai_sketch_outputs`.
- If table shape cannot be confirmed from live schema inspection, no-go for
  execution until exact columns, constraints, RLS, grants, and rollback steps
  are reviewed.

Scope remains limited to internal admin review persistence. This does not add
customer visibility, OpenAI generation, image storage, public gallery behavior,
payment/points, auth/login, or app route implementation.

## D. Candidate SQL - Requires Verification Before Execution

The block below is a conservative ALTER-only candidate. It is included as a
review target, not as an executable migration. It intentionally does not create
`ai_sketch_reviews`, because repo docs already contain older draft CREATE
planning and the live schema is not known.

If live inspection shows `ai_sketch_reviews` does not exist, do not run this
ALTER-only candidate. Prepare a separate reviewed CREATE path or defer SQL.

### Candidate SQL — DO NOT EXECUTE WITHOUT SEPARATE USER APPROVAL

```sql
-- Candidate SQL requires live schema verification before execution.
-- DO NOT EXECUTE unless the user separately approves SQL execution for
-- target Supabase project novora-production and live inspection confirms
-- public.ai_sketch_reviews exists with compatible identifiers.
--
-- This candidate intentionally does not create public.ai_sketch_reviews.
-- It is an ALTER / verify direction only.

begin;

alter table public.ai_sketch_reviews
  add column if not exists review_status text not null default 'internal_draft_not_generated',
  add column if not exists reviewer_label text,
  add column if not exists reviewer_admin_id uuid,
  add column if not exists review_note_internal text,
  add column if not exists revision_instruction text,
  add column if not exists approved_for_customer_at timestamptz,
  add column if not exists approved_by text,
  add column if not exists approval_revoked_at timestamptz,
  add column if not exists revoked_by text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.ai_sketch_reviews
  add constraint ai_sketch_reviews_review_status_allowed_chk
  check (
    review_status in (
      'internal_draft_not_generated',
      'draft_generated_internal_only',
      'needs_revision',
      'approved_for_customer'
    )
  )
  not valid;

alter table public.ai_sketch_reviews
  add constraint ai_sketch_reviews_approval_requires_human_chk
  check (
    review_status <> 'approved_for_customer'
    or (
      approved_for_customer_at is not null
      and coalesce(trim(approved_by), '') <> ''
    )
  )
  not valid;

create index if not exists ai_sketch_reviews_concept_brief_updated_idx
  on public.ai_sketch_reviews (concept_brief_id, updated_at desc);

create index if not exists ai_sketch_reviews_review_status_idx
  on public.ai_sketch_reviews (review_status);

alter table public.ai_sketch_reviews enable row level security;

revoke all on table public.ai_sketch_reviews from anon;
revoke all on table public.ai_sketch_reviews from authenticated;

-- No browser/client policy is included here.
-- Future admin access must go through a protected server route.
-- The current admin access-key model is not a database admin role.

commit;
```

Candidate limitations:

- This block is not final SQL.
- Constraint names must be checked against live schema before execution.
- Existing rows, if any, must be inspected before adding or validating
  constraints.
- If an `updated_at` trigger helper already exists, final SQL should use the
  existing project pattern; this candidate only ensures a column exists.
- No audit event table is created here. A dedicated `ai_sketch_review_events`
  table or shared `admin_operation_audit_events` path should be reviewed
  separately after live schema inspection.

## E. Status Values

Use only these review statuses for the first persistence slice:

- `internal_draft_not_generated`
- `draft_generated_internal_only`
- `needs_revision`
- `approved_for_customer`

Required rules:

- Successful generation must not automatically approve a sketch.
- `needs_revision` blocks customer visibility.
- `approved_for_customer` requires human/admin action.
- `approved_for_customer` does not equal `approved_for_gallery`.
- A new generated output must start internal-only even if another output for
  the same Concept Brief was approved.

## F. RLS / Grants Candidate Posture

Documented posture only:

- `anon` must not access internal review records.
- Customers must not access internal review records.
- `service_role` remains server-only.
- A protected admin server route is required later.
- Browser/client code must not directly access internal review data.
- The current admin access-key model is not a database admin role.

The candidate SQL above includes only a draft deny-by-default posture for
`anon` and `authenticated`. It is not executable until final review. If future
RLS depends on customer auth, admin claims, or Supabase Auth roles, those
policies must wait until the future auth/admin model is approved.

## G. Pre-Execution Checklist

Before real SQL execution, require:

- Confirm target Supabase project is `novora-production`.
- Confirm current live schema.
- Confirm whether `ai_sketch_reviews` already exists.
- Confirm exact SQL after live schema inspection.
- Confirm backup/export or rollback posture.
- Confirm RLS, grants, and policies were reviewed line by line.
- Confirm no customer route will read this data.
- Confirm no OpenAI or image generation is included.
- Confirm no image storage or upload behavior is included.
- Confirm no app route implementation is included.
- Confirm no public gallery behavior is included.
- Receive explicit user approval for SQL execution.

## H. Exact User Approval Required

The next user approval must explicitly say something like:

> 批准执行 Agent 40A 最小 SQL，目标 Supabase 项目 novora-production，范围仅限 internal admin AI sketch review persistence schema，不包含 customer visibility / OpenAI / image storage / app route。

Approval must name the target project, scope, and exclusions. A request to
review, merge, or keep planning docs is not approval to execute SQL.

## I. Verification After Future SQL

After future approved SQL execution, verify:

- Table and columns exist.
- Constraints exist.
- RLS is enabled or expected posture is verified.
- `anon` access is blocked.
- Customer/public access is blocked.
- `service_role` path remains server-only.
- No customer-facing route changed.
- No gallery route changed.
- Existing brief submission flow is unaffected.
- Internal notes and revision instructions are not customer-visible.
- `approved_for_customer` still does not imply `approved_for_gallery`.
- The project ledger is updated with the actual execution result.

## J. Rollback Plan

Wrong project execution:

- Stop immediately.
- Do not add app integration.
- Record the target project, statements run, and observed state.
- Prepare a reviewed reverse plan for the wrong project before touching data.

Table or column creation issue:

- Stop at the first failure.
- Do not continue partial SQL.
- Inspect which columns or constraints exist.
- If no real review data exists, consider a reviewed cleanup or correction.
- If real data exists, prefer additive correction over destructive rewrite.

Wrong constraint:

- Disable app integration.
- Add a reviewed replacement constraint or drop only the faulty constraint after
  confirming its name and effect.
- Re-verify allowed status values.

Wrong RLS policy:

- Disable any dependent app path.
- Remove or replace faulty policies.
- Verify `anon` and customer denial before any route reads the table.

Accidental customer visibility:

- Disable customer route/display path immediately.
- Revoke visibility.
- Confirm no customer or gallery route exposes data.
- Record incident scope and owner decision.

Partial SQL execution:

- Stop, document completed statements, and avoid retrying blindly.
- Prepare a targeted continuation or rollback after inspection.

Later app route integration issue:

- Keep records private.
- Disable or withhold the route.
- Do not imply approval or customer delivery from persisted status alone.

## K. Risk Review

| Risk | Consequence | Affected scope | Why risk exists | Likelihood / severity | Mitigation | Approval implication |
| --- | --- | --- | --- | --- | --- | --- |
| Executing SQL in the wrong Supabase project | Schema changes land in the wrong environment. | Supabase operations, future app wiring, ledger. | Manual project selection can be confused. | Medium / critical. | Approval must name `novora-production`; verify dashboard target before execution. | Approval must explicitly name the target project. |
| Duplicate table or incompatible schema | Conflicting `ai_sketch_reviews` table or broken app assumptions. | Database schema, future admin persistence. | Older docs contain draft CREATE text but live schema is unverified. | Medium / high. | Inspect live schema first; use ALTER/verify if table exists. | Approval must follow live inspection, not planning docs alone. |
| RLS exposing internal review records | Internal notes or statuses become readable by public/customer roles. | Privacy, Supabase, customer trust. | RLS/grants are subtle and separate from table shape. | Medium / critical. | Deny anon/customer by default; verify access after execution. | Approval must include RLS/grant review. |
| Customers accessing internal notes | Private reviewer notes or revision instructions leak. | Customer routes, support, privacy. | Notes sit near status fields and could be returned by careless DTOs. | Medium / critical. | No customer route reads this table; redact later server DTOs. | Approval excludes customer display. |
| Unreviewed AI draft becoming customer-visible | Customer sees unsafe, poor-quality, private, or misleading output. | Customer preview, brand trust, privacy. | Generation and review status can be conflated. | Medium / critical. | Default internal-only; require human `approved_for_customer` plus later delivery gates. | Approval must not include delivery routes. |
| `approved_for_customer` confused with `approved_for_gallery` | Private customer work is publicly published. | Gallery, privacy, legal/support risk. | Both are approval concepts but have different audiences. | Medium / critical. | Keep gallery approval and consent separate. | Approval must explicitly exclude gallery automation. |
| Successful generation treated as approval | Provider success bypasses human review. | AI jobs, admin workflow, customer visibility. | Job success can look like readiness. | Medium / critical. | Keep generation status separate from review status. | Approval is review persistence only, not generation logic. |
| Wrong Concept Brief association | A review or approval links to the wrong customer brief. | Admin review, future customer delivery, privacy. | Future output/job rows can be mislinked. | Medium / critical. | Verify `concept_brief_id` and output relationship before writes. | Approval should freeze association fields after inspection. |
| Rollback incomplete | Bad schema, policy, or partial state remains active. | Supabase operations, future app integration. | Schema changes persist after the task ends. | Medium / high. | Prepare rollback before execution; stop before app integration. | Approval must include rollback posture. |
| Future app route bypassing RLS assumptions | Server code with service role exposes private records. | App routes, customer privacy, admin workflow. | Service role can bypass RLS if misused. | Medium / critical. | Keep service-role server-only; require separate route review and tests. | Approval does not include route implementation. |
| User misunderstanding candidate SQL as executed SQL | Reviewer assumes Supabase changed after merge. | Project operations, approval process. | The document contains SQL text. | Low / high. | Repeat that no SQL was executed and separate approval is required. | Merging this doc is not SQL approval. |

## L. Go / No-Go Recommendation

Agent 40A may produce a candidate SQL direction, but execution is no-go until
live schema verification and a separate explicit user approval message are
completed.

Go only after:

- `novora-production` target is confirmed.
- Live schema is inspected.
- `ai_sketch_reviews` existence and exact columns are known.
- Final SQL is adjusted to the live schema.
- RLS, grants, constraints, verification, and rollback are reviewed.
- The user explicitly approves SQL execution.

No-go if live schema is unknown, if the task includes customer visibility,
OpenAI/image generation/storage, app routes, gallery automation, auth/payment,
or if `approved_for_customer` is treated as gallery, CAD, quote, order, or
production approval.
