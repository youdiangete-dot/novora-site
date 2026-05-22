# NOVORA Admin Notification Idempotency Plan

## 1. Scope

This is a documentation-only implementation plan for durable admin notification idempotency.

It does not execute SQL, modify Supabase, modify Vercel environment variables, send email, change production data, or implement app code. The draft SQL below is text for review only and must be converted into a reviewed migration or manually approved Supabase SQL in a later task.

This plan covers only admin notification idempotency for Concept Brief submissions. It does not add customer accounts or login, payments, CAD/order workflows, production workflows, AI sketch generation, customer confirmation emails, or email marketing.

## 2. Current Duplicate-Email Risk

`/api/concept-brief-admin-notification` currently validates `conceptBriefId` and `publicReference`, builds the admin detail URL, then calls `sendAdminConceptBriefNotification`. The server helper verifies the brief in Supabase, loads contact/reference metadata, and calls Resend. There is no durable row that records "this admin notification has already been reserved or sent" before the provider call.

That means the current route is best-effort but not idempotent. Duplicate admin emails can happen when:

- A browser repeats the notification route call after a successful Concept Brief submission.
- A customer double-submits or refreshes during a timing-sensitive submission path.
- Network retries or client-side retry behavior repeat the notification request.
- Future server retry jobs, queues, cron tasks, or automation call the same route more than once.
- An admin or developer manually repeats route calls for the same `conceptBriefId` and recipient.

The customer submission flow should remain resilient: admin email delivery is useful for operations, but failure to send or record a notification must not erase or block a saved Concept Brief.

## 3. Recommended Durable Table

Add a Supabase/Postgres table named `concept_brief_notification_events`.

The table should record one logical notification event per Concept Brief, notification type, and recipient email. The first server call reserves the event row. Later calls that hit the unique constraint should skip sending instead of calling Resend again.

Recommended initial `notification_type`:

- `admin_concept_brief_submitted`

Recommended initial `status` values:

- `reserved`
- `sent`
- `failed`

Keep these as `text` for the MVP unless the migration owner wants check constraints. A future implementation can tighten status validation once retry behavior and admin observability are clearer.

## 4. Draft SQL

Draft only. Do not run directly in production.

```sql
create table public.concept_brief_notification_events (
  id uuid primary key default gen_random_uuid(),
  concept_brief_id uuid not null references public.concept_briefs(id) on delete cascade,
  notification_type text not null,
  recipient_email text not null,
  status text not null,
  resend_message_id text,
  error_message text,
  reserved_at timestamptz,
  sent_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index concept_brief_notification_events_unique_delivery
  on public.concept_brief_notification_events (
    concept_brief_id,
    notification_type,
    recipient_email
  );

create index concept_brief_notification_events_concept_brief_id_idx
  on public.concept_brief_notification_events (concept_brief_id);

create index concept_brief_notification_events_status_idx
  on public.concept_brief_notification_events (status);

comment on table public.concept_brief_notification_events is
  'Tracks durable server-side idempotency for NOVORA Concept Brief notification delivery. This is not a customer email marketing table.';

comment on column public.concept_brief_notification_events.notification_type is
  'Logical notification category, for example admin_concept_brief_submitted.';

comment on column public.concept_brief_notification_events.recipient_email is
  'Server-only destination email used for idempotency. Do not expose this table to browser clients.';
```

Optional status check constraint for a later hardening pass:

```sql
alter table public.concept_brief_notification_events
  add constraint concept_brief_notification_events_status_check
  check (status in ('reserved', 'sent', 'failed'));
```

Optional timestamp trigger, if the project standardizes an `updated_at` function:

```sql
create trigger set_concept_brief_notification_events_updated_at
  before update on public.concept_brief_notification_events
  for each row
  execute function public.set_updated_at();
```

If no shared `set_updated_at()` function exists, skip the trigger in the first migration and let server code update `updated_at = now()` explicitly.

## 5. RLS and Grant Strategy

Enable RLS and avoid browser/client access.

Draft only:

```sql
alter table public.concept_brief_notification_events enable row level security;

revoke all on public.concept_brief_notification_events from anon;
revoke all on public.concept_brief_notification_events from authenticated;

grant select, insert, update on public.concept_brief_notification_events to service_role;
```

No permissive RLS policy should be added for `anon` or `authenticated`.

Supabase service role operations bypass RLS, so the application should access this table only through server-only helpers using `createSupabaseAdminClientOrNull()`. Do not expose this table to the frontend because it contains operational delivery metadata, internal recipient routing, provider IDs, and error details. Even if recipient email is an internal inbox, exposing it creates unnecessary information leakage and can reveal admin workflow timing.

If future admin authentication is implemented, admin-readable views can be designed separately with reviewed policies and carefully redacted fields. That is outside this idempotency plan.

## 6. Proposed Server Flow

The later app implementation should reserve before sending:

1. Verify the Concept Brief exists by `conceptBriefId` and `publicReference` using the service-role Supabase client.
2. Load email configuration server-side. Do not expose or log API keys or raw environment values.
3. Normalize the notification identity:
   - `concept_brief_id = brief.id`
   - `notification_type = 'admin_concept_brief_submitted'`
   - `recipient_email = NOVORA_ADMIN_NOTIFICATION_EMAIL`
   - normalize `recipient_email` with trim plus lower-case before inserting into `concept_brief_notification_events`
   - use that same normalized `recipient_email` value for the unique delivery identity
4. Insert a reservation row into `concept_brief_notification_events` with:
   - `status = 'reserved'`
   - `reserved_at = now()`
   - `created_at = now()`
   - `updated_at = now()`
5. If the insert fails with the unique constraint for `(concept_brief_id, notification_type, recipient_email)`, skip sending and return a successful skipped result. This is the durable idempotency guard.
6. Only after reservation succeeds, build the Resend payload and call Resend.
7. If Resend succeeds, update the event row to:
   - `status = 'sent'`
   - `resend_message_id = <provider id when available>`
   - `sent_at = now()`
   - `updated_at = now()`
   - clear or leave `error_message` null
8. If Resend fails or throws, update the event row to:
   - `status = 'failed'`
   - `error_message = <short sanitized provider/server failure summary>`
   - `failed_at = now()`
   - `updated_at = now()`
9. Return a non-blocking response to the customer flow. A notification failure should not prevent the submitted confirmation page when the Concept Brief itself was already saved.

Important implementation note: do not use "send first, insert later." The durable reservation must happen before the provider call. Otherwise, races and retries can still send duplicates.

## 7. Failure and Retry Semantics

The first MVP implementation should decide whether a `failed` row blocks future automatic sends. The safest duplicate-prevention default is:

- Any existing row for `(concept_brief_id, notification_type, recipient_email)` means "do not send again automatically."

That prevents repeated route calls from sending multiple emails after a flaky provider call. Manual retry tooling can be added later with explicit admin intent, for example by creating a new `notification_type`, adding an `attempt_number`, or implementing a reviewed retry route that updates the same row under controlled conditions.

If the team wants automatic retry later, the schema may need an `attempt_count`, `next_retry_at`, or separate `notification_attempts` child table. That should be a separate design because automatic retry can reintroduce duplicate delivery risk.

If reservation succeeds but the server crashes or times out before the Resend call, or before marking the row `sent` or `failed`, a `reserved` row may exist without an email being sent. For the MVP, this is acceptable because duplicate prevention is prioritized over automatic retry. The admin brief list remains the source of truth for submitted briefs, and manual retry tooling can be designed later with explicit admin intent.

## 8. Race Condition Notes

The unique index is the core concurrency guard. If two route calls arrive at the same time, only one insert can win. The losing request should detect the unique conflict and skip sending.

Implementation should check the Supabase/Postgres unique violation code, expected to be `23505`, and avoid treating that specific conflict as an operational error. Other insert failures should be logged with sanitized metadata and should skip sending, because sending without a reservation defeats idempotency.

Do not implement a read-then-insert check as the only guard. A pre-read can be useful for diagnostics, but it is not enough under concurrent calls.

## 9. Risk Analysis

Migration/schema risk: The new table references `public.concept_briefs(id)`. The migration must confirm that `concept_briefs.id` is a UUID primary key and that `gen_random_uuid()` is available in the Supabase project. The table should be added without changing existing Concept Brief rows.

Grant/RLS risk: Overly broad grants or policies could expose internal notification metadata to browser clients. The table should have RLS enabled, no `anon` or `authenticated` grants, and service-role-only server access.

Duplicate prevention logic risk: If app code sends before reserving, catches unique conflicts incorrectly, or treats failed reservations as permission to send anyway, duplicates remain possible. The later code PR should include targeted tests around duplicate route calls.

Race condition risk: Concurrent route calls can occur from retry behavior or manual calls. The unique index must be relied on as the source of truth, not only application-level pre-checks.

Email failure behavior: A provider failure after reservation may leave a `failed` row. This prevents duplicate automatic sends but may require manual operational follow-up. The customer submission should still continue because the Concept Brief has already been persisted.

Rollback strategy: If the app code has not yet been deployed, the schema can be removed by dropping the table after review. If app code has been deployed, rollback should first revert the app code path to avoid querying a removed table, then optionally drop the table. Dropping the table removes notification audit history, so production rollback should prefer disabling the idempotency code path before destructive schema changes.

## 10. Later Implementation Sequence

PR 24B-2: SQL migration draft / manual Supabase SQL approval.

- Convert the approved table, unique index, RLS, grants, comments, and optional timestamp strategy into a migration or manually reviewed Supabase SQL packet.
- Do not run the SQL without explicit approval.
- Confirm no browser grants or policies are introduced.

PR 24B-3: App code idempotency implementation.

- Add a server-only reservation helper near `lib/server/admin-email-notifications.ts` or in a focused companion module.
- Insert the reservation row before calling Resend.
- Skip sending on unique conflict.
- Update the row to `sent` or `failed`.
- Keep notification failure non-blocking for customer submission.
- Add targeted tests for duplicate notification calls and provider failure behavior.

PR 24B-4: Production verification with controlled duplicate route calls.

- After schema and app code are deployed, submit or use one controlled Concept Brief test record.
- Call `/api/concept-brief-admin-notification` repeatedly with the same `conceptBriefId` and `publicReference`.
- Confirm only one admin email is sent.
- Confirm later calls return a skipped/non-blocking result.
- Confirm the table has one event row for that Concept Brief, notification type, and recipient.

## 11. Product Boundary

This plan supports NOVORA operations by preventing duplicate internal admin notifications for submitted Concept Briefs. It keeps the existing product boundary intact:

- A Concept Brief is a guided design intake and admin review artifact.
- The email is an admin notification only.
- The plan does not create customer login, payment, CAD approval, production order creation, AI sketch generation, customer confirmation email, or marketing automation.
- Any future retry UI or admin observability should continue to describe the work as Concept Brief review, not final pricing, sourcing, CAD, payment, or production approval.
