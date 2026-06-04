# NOVORA Auth, Whitelist, Credits, Payment, And Final Sketch SQL Packet

## A. Purpose And Boundary

This document is a review-only SQL packet for future NOVORA authentication,
whitelist testing, trial quotas, prepaid credits, provider-neutral payment
records, paid final sketch package orders, AI sketch ownership, and admin audit
events.

No SQL in this document has been executed. This is not a migration file. It
does not change Supabase, RLS, grants, policies, storage buckets, auth/login,
payments, app code, environment variables, secrets, Production, email, AI
generation, CAD, order, or customer data.

The goal is to give a future implementation agent or human reviewer a concrete
starting point. Before any SQL is run, NOVORA must separately approve the auth
model, confirm the live schema, convert approved parts into migration files or
manual Supabase SQL, review RLS/grants line by line, and define verification and
rollback steps.

This packet follows the planning direction in:

- `docs/novora-current-project-state.md`
- `docs/novora-auth-whitelist-credits-payment-schema-plan.md`
- `docs/novora-ai-sketch-whitelist-credits-payment-strategy.md`
- `docs/novora-ai-sketch-generation-mvp-implementation-plan.md`
- `docs/novora-supabase-sql-schema-draft.md`
- `docs/novora-production-security-runbook.md`

The product boundary remains unchanged: AI sketches are concept direction only.
They are not CAD, not quotes, not orders, not sourcing confirmation, not
production approval, and not final jewelry manufacturing instructions.

## B. Business Model Mapping

Whitelist testing maps to account, invite, and quota records:

- 10 fixed test users become rows in `whitelist_test_users`.
- The 3 free test days become `trial_start_at`, `trial_end_at`, and daily rows
  in `whitelist_trial_quotas`.
- 5 complete experiences per day becomes `complete_experience_limit` and
  `complete_experiences_used`.
- Each complete experience can be represented by future AI sketch job/output
  records plus quota counters for 2 advanced direction images and 1 to 2
  high-quality refinements.
- The estimated 5 useful visual results per complete experience should be used
  for cost analytics, not as a promise that every generation creates exactly 5
  customer-approved images.

Free test cost planning remains approximate and provider-dependent:

- One complete free experience is estimated at about USD 3.
- A tester who uses all 5 complete experiences per day for 3 days may cost about
  USD 45.
- 10 testers at that maximum may cost about USD 450.
- The recommended controlled whitelist budget cap remains about USD 500 to 700
  to allow limited retry, quality, and buffer risk.

Prepaid points map to credit accounts and an append-only ledger:

| Purchase | Points |
| ---: | ---: |
| USD 29 | 30 points |
| USD 59 | 66 points |
| USD 99 | 120 points |
| USD 199 | 260 points |

| Deduction event | Points |
| --- | ---: |
| 2 advanced direction images | 6 points |
| 1 high-quality refinement | 8 points |
| Single final image | 19 points |
| Proposal final package | 29 points |
| Commercial presentation package | 49 points |

Paid final sketch tiers map to package orders:

| Package type | Price | Intended role |
| --- | ---: | --- |
| `single_final_image` | USD 19 | Low-friction final image |
| `proposal_final_package` | USD 29 | Recommended main offer |
| `commercial_presentation_package` | USD 49 | Presentation or print-ready style package |

Payment records should stay provider-neutral. This packet intentionally does
not choose Stripe, PayPal, manual invoice, bank transfer, or another provider.
Provider identifiers are stored only as external references for reconciliation;
NOVORA should not store card numbers, CVV values, raw secrets, or secret-bearing
webhook payloads in these tables.

## C. Draft SQL Warning

The SQL below is draft text for review only.

```sql
-- Draft only. Do not execute until a later task explicitly approves SQL,
-- Supabase schema changes, RLS, grants, policies, storage, auth, payment,
-- app-code wiring, verification, and rollback.
```

## D. Common Draft Assumptions

- Supabase Postgres is the expected target.
- `gen_random_uuid()` is assumed available, but a future migration must confirm
  the live project supports it.
- Existing live tables listed in the project ledger include `concept_briefs`,
  `concept_brief_contacts`, `concept_brief_reference_assets`, `admin_notes`,
  and `concept_brief_notification_events`.
- Older docs mention future `ai_sketch_jobs`, `ai_sketch_outputs`, and
  `ai_sketch_reviews`, but the current ledger does not list them as confirmed
  live tables. Foreign keys to those future tables are shown as optional review
  notes and must be confirmed before execution.
- Statuses use `text` plus check constraints in this draft. A future team may
  choose Postgres enums only after workflow states stabilize.
- Timestamps use `timestamptz`.
- Customer, payment, generated-output, and audit data are private by default.
- Browser clients must never write credit balances, payment confirmations,
  ownership grants, admin audits, or generation cost records directly.
- `customer_auth_links`, `invite_codes`, `ai_sketch_customer_events`, and
  `ai_sketch_generation_limits` remain optional future tables from the Agent 31C
  plan. This packet keeps the first SQL draft focused on customer profiles,
  whitelist quotas, credit accounting, payments, package orders, ownership, and
  audit events until the auth provider, invite model, event stream, and flexible
  limit model are approved.

## E. Proposed Table Set

### 1. `customer_profiles`

Purpose: durable NOVORA customer account/profile record, separate from the
submitted Concept Brief contact snapshot. This table links future auth identity,
whitelist access, credit accounts, payments, final sketch packages, and sketch
ownership.

Key columns:

- `id`: internal customer profile UUID.
- `auth_user_id`: future Supabase Auth or equivalent user UUID.
- `email`: normalized customer login/contact email.
- `display_name`, `country_region`, `role_type`: customer context.
- `status`: account lifecycle and abuse/support holds.

Draft SQL:

```sql
create table public.customer_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  email text not null,
  display_name text,
  company_name text,
  country_region text,
  role_type text not null default 'customer'
    check (role_type in ('customer', 'tester', 'designer', 'trade_customer')),
  status text not null default 'active'
    check (status in ('active', 'invited', 'disabled', 'abuse_hold', 'deleted')),
  privacy_region text,
  notes_for_support text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_profiles_email_nonblank check (length(trim(email)) > 3)
);

create unique index customer_profiles_email_lower_uidx
  on public.customer_profiles (lower(email));

create index customer_profiles_auth_user_id_idx
  on public.customer_profiles (auth_user_id);

create index customer_profiles_status_idx
  on public.customer_profiles (status);

comment on table public.customer_profiles is
  'Draft only. Future NOVORA customer profile for auth, whitelist, credits, payments, and sketch ownership. Not an order or production record.';

comment on column public.customer_profiles.auth_user_id is
  'Future auth.users.id or equivalent provider user id. Do not add this FK until the auth model is approved.';
```

Suggested constraints:

- Unique lowercased email.
- Optional unique `auth_user_id` after auth is chosen.
- Do not use this table as an admin authorization source by itself.

Important indexes:

- Lowercase email unique index for login/invite matching.
- `auth_user_id` index for authenticated session lookup.
- `status` index for support and abuse holds.

RLS and security notes:

- Anonymous users: no access.
- Authenticated customer: can read their own profile summary after auth is
  implemented; can update only narrow, non-financial profile fields through a
  server-reviewed route or tightly scoped policy.
- Service role: can create/update profiles during account linking, invite
  acceptance, support, and payment workflows.
- Future admin role: can read and update support-relevant fields through admin
  routes; admin actions should be audited.

Privacy considerations:

- Treat email, country, company, and support notes as private customer data.
- Avoid storing sensitive jewelry story details here; those belong to Concept
  Brief records with their own retention rules.

### 2. `whitelist_test_users`

Purpose: invite and eligibility record for the controlled 10-user AI sketch test.
This should gate free high-quality generation. It is not public sign-up and not
anonymous access.

Key columns:

- `customer_profile_id`: invited user.
- `email`: invite email, kept for matching and manual review.
- `status`: invite/trial lifecycle.
- `trial_start_at`, `trial_end_at`: 3-day test window.
- `complete_experience_limit_per_day`: default 5.
- `max_trial_days`: default 3.
- `project_budget_group`: lets the owner track one controlled test cohort.

Draft SQL:

```sql
create table public.whitelist_test_users (
  id uuid primary key default gen_random_uuid(),
  customer_profile_id uuid not null references public.customer_profiles(id) on delete cascade,
  email text not null,
  status text not null default 'invited'
    check (status in ('invited', 'active', 'paused', 'exhausted', 'expired', 'disabled')),
  trial_start_at timestamptz,
  trial_end_at timestamptz,
  complete_experience_limit_per_day integer not null default 5
    check (complete_experience_limit_per_day between 0 and 20),
  max_trial_days integer not null default 3
    check (max_trial_days between 0 and 14),
  project_budget_group text not null default 'agent_31_whitelist_test',
  invited_by text,
  activated_at timestamptz,
  disabled_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index whitelist_test_users_customer_profile_uidx
  on public.whitelist_test_users (customer_profile_id);

create unique index whitelist_test_users_email_lower_uidx
  on public.whitelist_test_users (lower(email));

create index whitelist_test_users_status_idx
  on public.whitelist_test_users (status);

create index whitelist_test_users_trial_window_idx
  on public.whitelist_test_users (trial_start_at, trial_end_at);

comment on table public.whitelist_test_users is
  'Draft only. Controlled invite-only AI sketch test eligibility. No public open free high-quality generation.';
```

Suggested constraints:

- Unique customer profile.
- Unique lowercased invite email for the early 10-user test.
- Trial window must be reviewed before enforcing a "3 days from first use" or
  "3 days from activation" model.

Important indexes:

- Email and profile lookup for invite acceptance.
- Trial window lookup for quota checks.
- Status index for admin review and abuse pauses.

RLS and security notes:

- Anonymous users: no access.
- Authenticated customer: may read their own whitelist status only after auth is
  implemented; should not update status or limits.
- Service role: performs whitelist checks and status transitions.
- Future admin role: can invite, pause, disable, and review usage; changes
  should create `admin_operation_audit_events`.

Privacy considerations:

- Whitelist status can reveal test participation and should not be public.
- Store invite codes only as hashes if invite codes are added later.

### 3. `whitelist_trial_quotas`

Purpose: daily quota counter for each whitelist tester. This table represents 5
complete experiences per day, plus image/refinement counters for cost analytics
and abuse control.

Key columns:

- `customer_profile_id` and `whitelist_test_user_id`.
- `quota_date` and `reset_timezone`.
- `complete_experience_limit` and `complete_experiences_used`.
- `advanced_direction_images_used` and `high_quality_refinements_used`.
- `status`: active, exhausted, locked, or adjusted.

Draft SQL:

```sql
create table public.whitelist_trial_quotas (
  id uuid primary key default gen_random_uuid(),
  whitelist_test_user_id uuid not null references public.whitelist_test_users(id) on delete cascade,
  customer_profile_id uuid not null references public.customer_profiles(id) on delete cascade,
  quota_date date not null,
  reset_timezone text not null default 'UTC',
  complete_experience_limit integer not null default 5
    check (complete_experience_limit between 0 and 20),
  complete_experiences_used integer not null default 0
    check (complete_experiences_used >= 0),
  advanced_direction_images_used integer not null default 0
    check (advanced_direction_images_used >= 0),
  high_quality_refinements_used integer not null default 0
    check (high_quality_refinements_used >= 0),
  useful_visual_results_estimate integer not null default 0
    check (useful_visual_results_estimate >= 0),
  status text not null default 'active'
    check (status in ('active', 'exhausted', 'locked', 'manual_adjusted')),
  last_consumed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index whitelist_trial_quotas_user_date_uidx
  on public.whitelist_trial_quotas (customer_profile_id, quota_date);

create index whitelist_trial_quotas_status_idx
  on public.whitelist_trial_quotas (status);

create index whitelist_trial_quotas_whitelist_user_idx
  on public.whitelist_trial_quotas (whitelist_test_user_id);

comment on table public.whitelist_trial_quotas is
  'Draft only. Daily controlled whitelist quota counters for free AI sketch test experiences.';
```

Suggested constraints:

- Unique `(customer_profile_id, quota_date)`.
- Counters cannot be negative.
- Use transactional updates or a database function later to prevent race
  conditions when consuming a quota.

Important indexes:

- `(customer_profile_id, quota_date)` for quota check.
- `status` for admin monitoring.

RLS and security notes:

- Anonymous users: no access.
- Authenticated customer: may read their own remaining quota summary through a
  server route or scoped policy.
- Customers must not directly increment counters.
- Service role should reserve quota atomically before generation starts.
- Future admin role can lock or manually adjust quotas with audit events.

Privacy considerations:

- Usage patterns are customer behavioral data.
- Quota records should not expose prompt, image, payment, or provider details.

### 4. `credit_accounts`

Purpose: current point account for formal prepaid operation. This table stores a
convenience balance, but the ledger should be the source of truth for financial
history.

Key columns:

- `customer_profile_id`: one account per customer profile.
- `balance_points`: current available points.
- `lifetime_purchased_points`, `lifetime_spent_points`, `lifetime_adjusted_points`.
- `status`: active, locked, suspended, closed.

Draft SQL:

```sql
create table public.credit_accounts (
  id uuid primary key default gen_random_uuid(),
  customer_profile_id uuid not null references public.customer_profiles(id) on delete cascade,
  balance_points integer not null default 0 check (balance_points >= 0),
  lifetime_purchased_points integer not null default 0 check (lifetime_purchased_points >= 0),
  lifetime_spent_points integer not null default 0 check (lifetime_spent_points >= 0),
  lifetime_adjusted_points integer not null default 0,
  status text not null default 'active'
    check (status in ('active', 'locked', 'suspended', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index credit_accounts_customer_profile_uidx
  on public.credit_accounts (customer_profile_id);

create index credit_accounts_status_idx
  on public.credit_accounts (status);

comment on table public.credit_accounts is
  'Draft only. Convenience point balance for future prepaid AI sketch credits. Ledger entries are the financial history.';
```

Suggested constraints:

- One credit account per customer.
- Current balance cannot be negative.
- Balance should be changed only in the same transaction that writes a ledger
  entry.

Important indexes:

- Unique customer profile index.
- Status index for locked or suspended accounts.

RLS and security notes:

- Anonymous users: no access.
- Authenticated customer: can read own balance summary.
- Customers cannot insert, update, or delete accounts directly.
- Service role handles grants, deductions, reversals, and reconciliation.
- Admin updates should go through reviewed support tools and audit rows.

Privacy considerations:

- Balance and purchase behavior are private customer account data.
- Do not expose other customers' balances or lifetime totals.

### 5. `credit_ledger_entries`

Purpose: append-only point accounting history. This is the primary record for
purchases, deductions, refunds, chargebacks, failed-generation reversals,
promotional grants, and manual admin adjustments.

Key columns:

- `credit_account_id` and `customer_profile_id`.
- `entry_type`: grant, deduction, reversal, refund, chargeback, adjustment.
- `delta_points`: positive or negative point movement.
- `balance_after_points`: balance after transaction.
- `idempotency_key`: prevents double grants/deductions for one event.
- Relationship columns to payment, generation, package order, and ownership.

Draft SQL:

```sql
create table public.credit_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  credit_account_id uuid not null references public.credit_accounts(id) on delete restrict,
  customer_profile_id uuid not null references public.customer_profiles(id) on delete restrict,
  entry_type text not null
    check (entry_type in (
      'purchase_grant',
      'generation_deduction',
      'final_package_deduction',
      'refund_reversal',
      'chargeback_reversal',
      'failed_generation_reversal',
      'promotional_grant',
      'manual_admin_adjustment'
    )),
  delta_points integer not null check (delta_points <> 0),
  balance_after_points integer not null check (balance_after_points >= 0),
  idempotency_key text not null,
  reason_code text not null,
  related_payment_record_id uuid,
  related_final_sketch_package_order_id uuid,
  related_ai_sketch_job_id uuid,
  related_ai_sketch_output_id uuid,
  admin_operation_audit_event_id uuid,
  customer_visible_note text,
  internal_note text,
  created_at timestamptz not null default now()
);

create unique index credit_ledger_entries_idempotency_uidx
  on public.credit_ledger_entries (idempotency_key);

create index credit_ledger_entries_account_created_idx
  on public.credit_ledger_entries (credit_account_id, created_at desc);

create index credit_ledger_entries_customer_created_idx
  on public.credit_ledger_entries (customer_profile_id, created_at desc);

create index credit_ledger_entries_type_idx
  on public.credit_ledger_entries (entry_type);

comment on table public.credit_ledger_entries is
  'Draft only. Append-only style point ledger for future prepaid credits, deductions, reversals, chargebacks, and admin adjustments.';
```

Suggested constraints:

- Unique idempotency key for each grant/deduction/reversal event.
- No zero-point entries.
- Ledger rows should normally not be edited after creation.
- Deferred foreign keys to future payment/order/sketch tables should be added
  only after those tables are confirmed.

Important indexes:

- Account and customer timeline indexes.
- Entry type index for reconciliation and support.
- Idempotency unique index to prevent double deduction.

RLS and security notes:

- Anonymous users: no access.
- Authenticated customer: may read a redacted own ledger view, not raw internal
  notes or provider details.
- Customers cannot write ledger entries.
- Service role must create ledger rows inside the same transaction as balance
  updates.
- Admin adjustments require an audit event and reason.

Privacy considerations:

- Financial/accounting history may require longer retention than generated
  image outputs.
- Internal notes may contain support context and should not be customer-visible.

### 6. `payment_records`

Purpose: provider-neutral payment history for manual payment, checkout, webhook,
refund, dispute, and chargeback reconciliation. This table does not store card
data and does not choose a provider.

Key columns:

- `provider`: manual, stripe, paypal, or future provider placeholder.
- `provider_reference`: external checkout/payment identifier.
- `status`: pending, succeeded, failed, refunded, disputed, chargeback, canceled.
- `amount_cents`, `currency`.
- `point_package_type` and `points_to_grant`.
- `manual_confirmation_by`, `confirmed_at`.

Draft SQL:

```sql
create table public.payment_records (
  id uuid primary key default gen_random_uuid(),
  customer_profile_id uuid not null references public.customer_profiles(id) on delete restrict,
  provider text not null default 'manual'
    check (provider in ('manual', 'stripe', 'paypal', 'other')),
  provider_reference text,
  provider_event_reference text,
  status text not null default 'pending'
    check (status in (
      'pending',
      'succeeded',
      'failed',
      'canceled',
      'refunded',
      'partially_refunded',
      'disputed',
      'chargeback'
    )),
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'USD',
  point_package_type text
    check (point_package_type in ('points_30', 'points_66', 'points_120', 'points_260')),
  points_to_grant integer check (points_to_grant is null or points_to_grant >= 0),
  final_package_type text
    check (final_package_type in ('single_final_image', 'proposal_final_package', 'commercial_presentation_package')),
  related_credit_ledger_entry_id uuid,
  manual_confirmation_by text,
  confirmed_at timestamptz,
  failed_reason text,
  refunded_at timestamptz,
  disputed_at timestamptz,
  reconciliation_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index payment_records_customer_created_idx
  on public.payment_records (customer_profile_id, created_at desc);

create index payment_records_status_idx
  on public.payment_records (status);

create index payment_records_provider_reference_idx
  on public.payment_records (provider, provider_reference);

comment on table public.payment_records is
  'Draft only. Provider-neutral payment record for future manual or automated payment reconciliation. Does not store card data.';
```

Suggested constraints:

- Provider reference should become unique per provider when provider behavior is
  known; manual payments may need looser duplicate handling.
- Payment status transitions should be validated server-side.
- Successful payments should grant points through `credit_ledger_entries`, not
  by directly editing balances alone.

Important indexes:

- Customer payment history timeline.
- Status for pending/reconciliation queues.
- Provider/reference lookup for webhook idempotency and support.

RLS and security notes:

- Anonymous users: no access.
- Authenticated customer: can read own redacted payment history after auth is
  implemented.
- Customers cannot confirm, refund, or dispute payments directly.
- Service role processes webhooks or manual confirmation.
- Future admin role can reconcile and add notes; changes should be audited.

Privacy considerations:

- Do not store card data, CVV, raw payment secrets, secret-bearing webhook
  payloads, or full provider dashboard exports.
- Payment data may require retention for accounting, support, refunds, and
  chargebacks.

### 7. `final_sketch_package_orders`

Purpose: entitlement and fulfillment state for paid final sketch packages. A
final sketch package is still an AI concept/art direction output, not CAD, not a
quote, not an order, and not production approval.

Key columns:

- `package_type`: `single_final_image`, `proposal_final_package`,
  `commercial_presentation_package`.
- `price_cents`: 1900, 2900, or 4900 by current planning defaults.
- `points_cost`: 19, 29, or 49 where paid by credits.
- `status`: pending, paid, generating, delivered, refunded, canceled, disputed.
- Links to customer, concept brief, payment, credit ledger, future sketch output.

Draft SQL:

```sql
create table public.final_sketch_package_orders (
  id uuid primary key default gen_random_uuid(),
  customer_profile_id uuid not null references public.customer_profiles(id) on delete restrict,
  concept_brief_id uuid references public.concept_briefs(id) on delete set null,
  package_type text not null
    check (package_type in ('single_final_image', 'proposal_final_package', 'commercial_presentation_package')),
  price_cents integer not null check (price_cents in (1900, 2900, 4900)),
  currency text not null default 'USD',
  points_cost integer not null check (points_cost in (19, 29, 49)),
  payment_record_id uuid,
  credit_ledger_entry_id uuid,
  status text not null default 'pending'
    check (status in (
      'pending',
      'paid',
      'queued',
      'generating',
      'needs_admin_review',
      'delivered',
      'refunded',
      'canceled',
      'disputed'
    )),
  selected_ai_sketch_output_id uuid,
  delivered_ai_sketch_output_id uuid,
  ownership_record_id uuid,
  customer_visible boolean not null default false,
  usage_rights_note text,
  boundary_acknowledged_at timestamptz,
  fulfilled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index final_sketch_package_orders_customer_created_idx
  on public.final_sketch_package_orders (customer_profile_id, created_at desc);

create index final_sketch_package_orders_concept_brief_idx
  on public.final_sketch_package_orders (concept_brief_id);

create index final_sketch_package_orders_status_idx
  on public.final_sketch_package_orders (status);

comment on table public.final_sketch_package_orders is
  'Draft only. Paid final AI concept sketch package entitlement. Not CAD, quote, order, sourcing, or production approval.';
```

Suggested constraints:

- Package type should drive expected price and points, but future SQL may use a
  separate package catalog table if prices change often.
- A package should not become `delivered` until payment/credit entitlement,
  ownership link, output storage, and customer-visible approval are confirmed.
- Refunds or chargebacks should create ledger/payment status changes and may
  change access state depending on owner policy.

Important indexes:

- Customer timeline.
- Concept Brief lookup.
- Status queues for fulfillment and admin review.

RLS and security notes:

- Anonymous users: no access.
- Authenticated customer: can read own order/package status and delivered
  customer-visible assets.
- Customers cannot mark packages paid, delivered, refunded, or approved.
- Service role controls entitlement and status transitions.
- Future admin role can fulfill/support packages with audit events.

Privacy considerations:

- Package orders reveal purchase intent and usage context.
- Usage-rights copy must be reviewed before launch; it should not imply CAD,
  quote, production, or jewelry ownership transfer beyond the approved sketch
  package terms.

### 8. `ai_sketch_ownership_records`

Purpose: explicit ownership/access record for future generated outputs. This
connects user identity, Concept Brief, generation job/output, credit ledger,
payment/final package order, and customer visibility.

Key columns:

- `customer_profile_id`, `concept_brief_id`.
- Future `ai_sketch_job_id` and `ai_sketch_output_id`.
- `source_type`: whitelist trial, paid credits, final package, admin grant.
- `access_state`: private internal, customer preview, paid final delivered,
  revoked, archived.
- `usage_rights_scope`: preview, personal concept review, proposal package, or
  commercial presentation package.

Draft SQL:

```sql
create table public.ai_sketch_ownership_records (
  id uuid primary key default gen_random_uuid(),
  customer_profile_id uuid not null references public.customer_profiles(id) on delete restrict,
  concept_brief_id uuid references public.concept_briefs(id) on delete set null,
  ai_sketch_job_id uuid,
  ai_sketch_output_id uuid,
  final_sketch_package_order_id uuid,
  credit_ledger_entry_id uuid,
  payment_record_id uuid,
  source_type text not null
    check (source_type in ('whitelist_trial', 'paid_credits', 'paid_final_package', 'manual_admin_grant')),
  access_state text not null default 'internal_only'
    check (access_state in (
      'internal_only',
      'customer_preview',
      'paid_final_delivered',
      'revoked',
      'archived'
    )),
  usage_rights_scope text not null default 'concept_review'
    check (usage_rights_scope in (
      'concept_review',
      'personal_final_image',
      'proposal_final_package',
      'commercial_presentation_package'
    )),
  customer_visible boolean not null default false,
  rights_note text,
  granted_by text,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  revocation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ai_sketch_ownership_customer_created_idx
  on public.ai_sketch_ownership_records (customer_profile_id, created_at desc);

create index ai_sketch_ownership_concept_brief_idx
  on public.ai_sketch_ownership_records (concept_brief_id);

create index ai_sketch_ownership_output_idx
  on public.ai_sketch_ownership_records (ai_sketch_output_id);

create index ai_sketch_ownership_access_state_idx
  on public.ai_sketch_ownership_records (access_state);

comment on table public.ai_sketch_ownership_records is
  'Draft only. Future generated AI sketch access and usage-rights record. AI sketches remain concept direction, not CAD or production approval.';
```

Suggested constraints:

- Add foreign keys to `ai_sketch_jobs` and `ai_sketch_outputs` only after those
  tables are verified.
- `customer_visible = true` should require an approved access state in app logic
  or a later database constraint.
- Revocation should not delete financial history.

Important indexes:

- Customer gallery/history lookup.
- Concept Brief lookup.
- Output lookup for protected image access.
- Access state for visibility and revocation checks.

RLS and security notes:

- Anonymous users: no access.
- Authenticated customer: can read own customer-visible or paid ownership
  records only.
- Customers cannot grant, revoke, or change usage rights.
- Service role and future admin role manage ownership after payment, credit
  deduction, whitelist trial generation, manual review, refund, or chargeback.

Privacy considerations:

- Generated outputs may include customer references, design intent, personal
  story, or business-sensitive proposal material.
- Access should be server-mediated or signed URL based, not public bucket URLs.

### 9. `admin_operation_audit_events`

Purpose: durable audit trail for sensitive admin or service-role actions:
whitelist changes, quota overrides, credit adjustments, payment confirmations,
refund handling, package fulfillment, ownership grants/revocations, abuse holds,
and support corrections.

Key columns:

- `actor_kind`: service_role, admin, system, support.
- `actor_identifier`: future admin user id or service identifier.
- `operation_type`: constrained action name.
- `target_table`, `target_id`.
- `customer_profile_id`: optional affected customer.
- `reason_code`, `internal_note`.
- `metadata`: sanitized JSON, never secrets.

Draft SQL:

```sql
create table public.admin_operation_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_kind text not null
    check (actor_kind in ('service_role', 'admin', 'system', 'support')),
  actor_identifier text,
  operation_type text not null,
  target_table text not null,
  target_id uuid,
  customer_profile_id uuid references public.customer_profiles(id) on delete set null,
  reason_code text not null,
  internal_note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index admin_operation_audit_events_created_idx
  on public.admin_operation_audit_events (created_at desc);

create index admin_operation_audit_events_customer_idx
  on public.admin_operation_audit_events (customer_profile_id, created_at desc);

create index admin_operation_audit_events_target_idx
  on public.admin_operation_audit_events (target_table, target_id);

create index admin_operation_audit_events_operation_type_idx
  on public.admin_operation_audit_events (operation_type);

comment on table public.admin_operation_audit_events is
  'Draft only. Sensitive admin/service audit trail for whitelist, quota, credit, payment, package, ownership, and abuse-control changes.';
```

Suggested constraints:

- A future migration can constrain `operation_type` after admin workflows are
  stable.
- `metadata` must be sanitized and must not contain secrets, raw payment
  payloads, service-role keys, provider keys, admin keys, or unnecessary
  customer free text.
- Audit rows should be append-only.

Important indexes:

- Created-at timeline for incident review.
- Customer profile timeline for support.
- Target table/id lookup for change history.
- Operation type lookup for reconciliation.

RLS and security notes:

- Anonymous users: no access.
- Authenticated customers: no direct access by default. A later privacy export
  process may provide selected audit facts manually or through a reviewed route.
- Service role writes audit events.
- Future admin role may read audit events through protected admin tools.

Privacy considerations:

- Audit events are sensitive operational records.
- Internal notes should be concise, factual, and free of unnecessary customer
  personal data.

## F. Auth Model Assumptions

This packet assumes future Supabase Auth or an equivalent identity provider, but
does not implement auth. The likely MVP direction remains invite-only,
email-based login for whitelist testers, with admin access kept separate until a
reviewed admin-role model exists.

Identity links should work as follows:

- `customer_profiles.auth_user_id` links a future authenticated user to one
  customer profile.
- `concept_briefs` may later receive a nullable `customer_profile_id` after a
  separate migration, or a linking table may be used if existing rows need
  careful backfill.
- Existing `concept_brief_contacts` remains the submitted contact snapshot and
  should not be treated as verified login identity by itself.
- Future `ai_sketch_jobs` and `ai_sketch_outputs` should link to both
  `concept_briefs` and `customer_profiles` when real generation is added.
- `ai_sketch_ownership_records` is the customer access source for generated
  outputs after review, payment, credit deduction, or whitelist entitlement.

Uncertainty to resolve before SQL execution:

- Whether Supabase Auth is the final auth provider.
- Whether `auth.users.id` can be referenced directly from public schema in this
  project.
- Whether existing Concept Brief rows should be backfilled to profiles by email,
  left unlinked, or linked only after customer verification.
- Whether future AI sketch tables already exist in Production by the time this
  packet is reviewed.
- Whether admin access remains key-based temporarily or moves to authenticated
  admin roles.

## G. Whitelist And Free Test Quota Logic

The free test should be represented as a controlled eligibility and quota
system:

1. In a future approved implementation, the owner creates exactly 10 approved
   `customer_profiles` and
   `whitelist_test_users` rows.
2. Each tester has a 3-day trial window.
3. Each tester receives 5 complete experiences per quota date.
4. Each complete experience may reserve budget for 2 advanced direction images.
5. Refinement is spent only on the customer-selected direction.
6. Quota is exhausted when the daily complete experience limit is reached, the
   trial window is over, the user is disabled, or the project budget cap is hit.

The database should support these states:

- `invited`: tester has not accepted or activated.
- `active`: tester can consume free quota.
- `paused`: temporarily blocked by owner/support.
- `exhausted`: daily or total cap reached.
- `expired`: 3-day window ended.
- `disabled`: abuse, support, or owner decision.

Free high-quality generation must not be anonymous or public. A future
generation route should require a verified customer profile, active whitelist
record, unexpired trial window, remaining daily quota, and no abuse hold before
starting generation.

Risk notes:

- A shared invite can exceed the 10-user budget if email matching is weak.
- Race conditions can double-consume quota if two requests start at the same
  time.
- Retries can push cost above the USD 500 to 700 recommended cap if retry policy
  is not explicit.
- Failed generations need a clear policy: restore quota automatically, restore
  only after admin review, or treat as spent if provider cost was incurred.

## H. Credits And Points Logic

Formal operations should use prepaid points before broad high-quality
generation opens.

Point packages:

- USD 29 grants 30 points.
- USD 59 grants 66 points.
- USD 99 grants 120 points.
- USD 199 grants 260 points.

Point deductions:

- 2 advanced direction images deduct 6 points.
- 1 high-quality refinement deducts 8 points.
- Single final image deducts 19 points.
- Proposal final package deducts 29 points.
- Commercial presentation package deducts 49 points.

Recommended accounting model:

- Treat `credit_ledger_entries` as the source of truth.
- Treat `credit_accounts.balance_points` as a cached current balance maintained
  transactionally.
- Use idempotency keys for every payment grant, generation deduction, final
  package deduction, refund, chargeback, and reversal.
- Deduct points only through server-side service-role code.
- Do not let browser clients write balances or ledger rows.
- Record failed-generation reversals explicitly if points were deducted before
  a provider/storage failure.

Risks to handle before implementation:

- Double deduction from repeated clicks, browser retries, webhook retries, or
  route timeouts.
- Refunds after points have already been spent.
- Chargebacks after final package delivery.
- Manual admin adjustments without a reason or audit event.
- Provider failure after deduction.
- Storage failure after provider success.
- Partial delivery where only one of several promised outputs succeeds.

## I. Payment Records Plan

`payment_records` should be provider-neutral so NOVORA can start with manual
payment confirmation and later move to Checkout/webhook automation without
rewriting financial history.

Recommended lifecycle:

- `pending`: payment initiated or invoice/link sent.
- `succeeded`: payment confirmed and eligible for credit grant or package
  entitlement.
- `failed`: provider or manual confirmation failed.
- `canceled`: customer or provider canceled before success.
- `refunded`: full refund.
- `partially_refunded`: partial refund.
- `disputed`: dispute opened.
- `chargeback`: chargeback confirmed or treated as lost.

Provider fields should be placeholders only:

- `provider = 'manual' | 'stripe' | 'paypal' | 'other'`
- `provider_reference`
- `provider_event_reference`

Do not store:

- Card numbers.
- CVV values.
- Payment method secrets.
- API keys.
- Raw provider exports.
- Secret-bearing webhook payloads.

Financial records need reconciliation. A future payment task should define
which payment status grants points, how webhooks are idempotent, what happens
when a provider event arrives out of order, and how manual owner confirmation is
audited.

## J. Final Sketch Package Orders

Paid final sketch package orders should represent entitlement to a stronger AI
concept/art-direction output. They should not create CAD, quote, order,
production, sourcing, or manufacturing state.

Package types:

- `single_final_image`: USD 19 or 19 points.
- `proposal_final_package`: USD 29 or 29 points. This is the recommended main
  offer.
- `commercial_presentation_package`: USD 49 or 49 points.

Order fulfillment should require:

- Authenticated customer profile.
- Confirmed payment or successful point deduction.
- Linked Concept Brief or approved manually created context.
- Generated/stored output metadata.
- Ownership/access record.
- Customer-visible approval or delivery state.
- Boundary acknowledgement or customer-facing copy that clearly states the
  output is concept sketch/art direction only.

Ownership and usage rights:

- Rights language must be reviewed before public launch.
- "Commercial presentation" should not imply CAD, manufacturing, exclusive
  jewelry rights, trademark clearance, or production feasibility.
- Refund, chargeback, and revocation rules should be defined before automated
  payment.

## K. AI Sketch Ownership And Events

Future generated outputs should be linked across these records:

- `customer_profiles`: who owns or can access the result.
- `concept_briefs`: which submitted design intent the result belongs to.
- Future `ai_sketch_jobs`: which generation attempt created the output.
- Future `ai_sketch_outputs`: where output metadata and storage reference live.
- `credit_ledger_entries`: which points were deducted or reversed.
- `payment_records`: which payment funded an entitlement.
- `final_sketch_package_orders`: which paid package the output fulfills.
- `admin_operation_audit_events`: which admin/system action granted, revoked,
  delivered, or adjusted access.

Access-control considerations:

- Generated images should default to internal/private.
- Customer visibility should require ownership/access state plus approved output
  status.
- Storage should remain private with server-mediated access or short-lived
  signed URLs.
- Raw storage keys, provider response URLs, prompt text, internal notes, and
  unapproved outputs should not be public.

Privacy considerations:

- AI sketches may reflect customer-provided stories, symbols, reference images,
  business proposals, or confidential design intent.
- Customer materials should be used only for the customer's current project
  concept review unless separately approved and disclosed.
- Provider retention/training terms must be reviewed before sending real
  customer data to any image provider.

## L. RLS And Grants Plan

This is an intended policy shape only. Do not execute these statements until a
future task reviews exact auth claims, admin role model, grants, and policies.

Access separation:

- `anon`: no access to customer profiles, whitelist records, quotas, credits,
  ledger, payments, package orders, ownership records, or admin audits.
- `authenticated customer`: read own profile, own quota summary, own credit
  account summary, own redacted ledger/payment/package history, and own
  customer-visible ownership records.
- `service_role`: server-only privileged access for account linking, quota
  reservation, generation orchestration, payment confirmation, credit grants and
  deductions, final package fulfillment, ownership changes, and audit writes.
- `future admin role`: protected admin access for support and operations, with
  audit logging and careful redaction of provider/payment details.

Draft policy sketch:

```sql
-- Draft policy shape only. Do not execute.
alter table public.customer_profiles enable row level security;
alter table public.whitelist_test_users enable row level security;
alter table public.whitelist_trial_quotas enable row level security;
alter table public.credit_accounts enable row level security;
alter table public.credit_ledger_entries enable row level security;
alter table public.payment_records enable row level security;
alter table public.final_sketch_package_orders enable row level security;
alter table public.ai_sketch_ownership_records enable row level security;
alter table public.admin_operation_audit_events enable row level security;

-- Draft only. Exact auth.uid() mapping depends on the approved auth model.
-- create policy "customers can read own profile"
--   on public.customer_profiles
--   for select
--   using (auth_user_id = auth.uid());

-- create policy "customers can read own credit account"
--   on public.credit_accounts
--   for select
--   using (
--     customer_profile_id in (
--       select id from public.customer_profiles where auth_user_id = auth.uid()
--     )
--   );

-- No customer insert/update/delete policy should be added for credit balances,
-- ledger entries, payment confirmations, package fulfillment, ownership grants,
-- or admin audit events.
```

Grant posture to review:

- Revoke broad table privileges from `anon`.
- Avoid direct browser writes to financial or entitlement tables.
- Allow authenticated reads only through reviewed RLS or server routes.
- Keep service-role operations in server-only helpers.
- Decide future admin role claims before admin policies are written.

Manual review required before execution:

- Auth provider and claim shape.
- Whether `auth.uid()` maps directly to `customer_profiles.auth_user_id`.
- Admin role model.
- Exact `grant` and `revoke` statements.
- Storage policy relationship to generated outputs.
- Whether customer self-service updates are allowed.
- Redacted views for payment/ledger history.

## M. Migration Execution Order

Recommended future sequence:

1. Stop gate: approve auth direction and admin access model.
2. Confirm live schema on Supabase, including existing Concept Brief tables and
   whether future AI sketch job/output tables exist.
3. Convert approved table drafts into migration files or a manual SQL packet.
4. Create base account tables: `customer_profiles`,
   `admin_operation_audit_events`.
5. Add whitelist tables: `whitelist_test_users`,
   `whitelist_trial_quotas`.
6. Add credit tables: `credit_accounts`, `credit_ledger_entries`.
7. Add provider-neutral payment table: `payment_records`.
8. Add final package and ownership tables:
   `final_sketch_package_orders`, `ai_sketch_ownership_records`.
9. Add indexes and check constraints.
10. Stop gate: review RLS, grants, and policies before enabling customer-facing
    access.
11. Stop gate: implement app code wiring only in a separate approved task.
12. Stop gate: choose and configure payment provider only in a separate approved
    task.
13. Stop gate: configure AI provider and generation only in a separate approved
    task.
14. Verify in a safe environment with synthetic data before any Production
    action.
15. Record executed changes in the project ledger only after they are approved,
    run, and verified.

Rollback planning before execution:

- Define whether tables can be dropped before app code depends on them.
- Define how to preserve financial and audit records after payment goes live.
- Do not drop payment, credit, ownership, or audit records casually after real
  customer activity begins.

## N. Risk Review

| Risk | Consequence | Affected scope | Why the risk exists | Likelihood / severity | Mitigation |
| --- | --- | --- | --- | --- | --- |
| Free quota cost overrun | Provider spend exceeds the USD 500 to 700 controlled test cap. | Whitelist trial, AI generation budget, owner operations. | 10 users can consume 15 complete experiences each, retries and failures can add cost. | Medium likelihood, high severity for MVP budget. | Fixed whitelist, 3-day window, 5/day cap, project budget cap, admin pause, no public free generation. |
| Anonymous generation abuse | Public users generate expensive outputs without identity or limits. | AI generation, storage, provider cost, privacy. | High-quality generation is valuable and costly if exposed without login. | High likelihood if public, high severity. | Require authenticated/invited profile, no anonymous high-quality generation, no public open free generation. |
| Double deduction | Customer loses points twice or NOVORA grants twice. | Credit ledger, balances, support, trust. | Browser retries, route timeouts, webhook retries, repeated clicks, race conditions. | Medium likelihood, high severity. | Ledger idempotency keys, transactional balance update, disable duplicate actions, reconciliation reports. |
| Failed generation after deduction | Points are spent but no usable output is delivered. | Credits, generation jobs, package fulfillment, customer support. | Provider calls, storage writes, moderation, or admin review can fail after a debit is reserved or posted. | Medium likelihood, high severity. | Define request-time versus success-time deduction, record `failed_generation_reversal` rows, and keep failed outputs private. |
| Retry and idempotency gaps | Retried requests create duplicate jobs, duplicate provider calls, duplicate ledger entries, or inconsistent quota counters. | Quotas, credit ledger, payment webhooks, AI generation, final package delivery. | Network retries, webhook retries, refreshes, and manual admin retries can repeat the same business action. | Medium likelihood, high severity. | Use idempotency keys for ledger/payment events, atomic quota reservation, one active generation per request, and explicit retry reason/audit rows. |
| Payment mismatch | Paid user does not receive credits or unpaid user receives entitlement. | Payment records, credit grants, final packages. | Manual confirmation errors, provider webhook ordering, duplicate provider events, partial failures. | Medium likelihood, high severity. | Provider-neutral records, idempotent webhook handling, manual reconciliation, status lifecycle, audit events. |
| Refund or chargeback handling gap | Customer keeps spent credits/final outputs after reversal or loses access unfairly. | Payments, credits, ownership, support. | Refund and chargeback rules are not yet defined. | Medium likelihood after payments, high severity. | Define policy before provider integration, use reversal ledger rows, audit ownership revocation, owner review. |
| Unauthorized access to customer images or outputs | Private references or generated sketches are exposed. | Storage, ownership, customer trust, privacy. | RLS/storage policy mistakes or public URLs can reveal assets. | Medium likelihood, high severity. | Private buckets, ownership records, server-mediated access, customer-visible approval gate, storage policy review. |
| RLS mistakes | Customers or anonymous users read or mutate private/financial records. | All auth, credits, payments, ownership tables. | RLS policies are subtle and depend on exact auth claims. | Medium likelihood, critical severity. | Review policies separately, start deny-by-default, test anon/auth/service/admin paths, avoid direct browser writes. |
| Admin misuse or accidental manual adjustment | Credits, whitelist status, payment confirmation, or ownership are changed incorrectly. | Credits, payments, whitelist, ownership, customer support. | Manual owner/admin operations are powerful and easy to misclick without audit. | Medium likelihood, medium to high severity. | Audit events, required reason codes, narrow admin UI, confirmation steps, reconciliation. |
| Privacy and data retention | Account, payment, and generated-output data outlive business need or conflict with privacy promises. | Customer profiles, briefs, payments, images, audit logs. | Accounts and payments increase obligations beyond simple Concept Brief intake. | Medium likelihood, high severity. | Final Privacy/Terms review, retention schedule, export/deletion process, minimize metadata. |
| Future migration complexity | Existing Concept Briefs cannot be cleanly linked to authenticated profiles. | Data model, customer history, app wiring. | Current submissions store contact snapshots but no verified auth identity. | Medium likelihood, medium severity. | Use nullable links, avoid destructive backfill, verify by email only after customer login, document legacy state. |
| Provider or payment secret leakage | Keys appear in browser, logs, docs, or PR text. | Security, provider accounts, customer data. | Future auth/payment/AI work introduces sensitive keys. | Low to medium likelihood, critical severity. | Server-only env, no secrets in docs, no raw provider payloads, rotate exposed keys, follow production runbook. |
| Concept sketch boundary confusion | Customers treat final sketch package as CAD, quote, or production approval. | Product trust, support, legal/commercial expectations. | Paid final images can feel high value and near-final. | Medium likelihood, high severity. | Repeat boundary copy in package records, UX, terms, and delivery: concept sketch only, paid CAD later. |

## O. Stop Gates Before Future Work

Do not proceed past these gates without a separate approved task:

- Auth decision.
- SQL execution.
- Supabase schema changes.
- RLS, grants, and policies.
- Storage policy changes.
- Provider/payment setup.
- App code wiring.
- AI generation provider setup or API key use.
- Production verification.
- Merge or deploy.

## P. Documentation-Only Validation For Agent 31D

Expected validation for this packet:

- `git diff --check`

Build and e2e tests are normally skipped because this packet changes
documentation only and does not affect app runtime behavior.
