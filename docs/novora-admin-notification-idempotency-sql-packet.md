# NOVORA Admin Notification Idempotency SQL Packet

## Review Status

This is a manual SQL packet for human review only.

Do not execute this SQL until Agent 24B-2 is reviewed and a later task explicitly approves Supabase schema, RLS, and grant work. This document does not change Supabase, does not create a migration, does not change Vercel environment variables, does not change app code, and does not send email.

The goal is durable idempotency for NOVORA admin Concept Brief notification emails. The new table supports a reserve-before-send flow and prevents duplicate admin emails for the same `concept_brief_id`, `notification_type`, and normalized `recipient_email`.

## Main SQL Packet

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
  'Internal NOVORA admin Concept Brief notification idempotency events. This is not customer email marketing, customer confirmation email, CAD, payment, order, or production workflow data.';

comment on column public.concept_brief_notification_events.concept_brief_id is
  'Concept Brief whose admin notification delivery is being reserved, sent, or marked failed.';

comment on column public.concept_brief_notification_events.notification_type is
  'Logical notification category, for example admin_concept_brief_submitted.';

comment on column public.concept_brief_notification_events.recipient_email is
  'Normalized internal destination email used in the unique delivery identity. Later app code should trim and lower-case before insert.';

comment on column public.concept_brief_notification_events.status is
  'Delivery state for the idempotency record, expected initially as reserved, sent, or failed.';

comment on column public.concept_brief_notification_events.resend_message_id is
  'Optional Resend provider message id recorded after a successful provider response.';

alter table public.concept_brief_notification_events enable row level security;

revoke all on public.concept_brief_notification_events from anon;
revoke all on public.concept_brief_notification_events from authenticated;

grant select, insert, update on public.concept_brief_notification_events to service_role;
```

No `anon` or `authenticated` RLS policies should be created for this table. App access should happen only through server-only service-role helpers.

## Optional Status Check Constraint

This constraint is optional for the first execution. It tightens allowed status values, but can be deferred if the team wants the MVP to keep status evolution flexible.

```sql
alter table public.concept_brief_notification_events
  add constraint concept_brief_notification_events_status_check
  check (status in ('reserved', 'sent', 'failed'));
```

## Optional Updated At Trigger

Only include this if the target Supabase project already has a compatible `public.set_updated_at()` function. No such function is defined in the current repository docs or server code. If the function does not already exist, skip this trigger and have Agent 24B-3 update `updated_at = now()` explicitly in app code.

```sql
create trigger set_concept_brief_notification_events_updated_at
  before update on public.concept_brief_notification_events
  for each row
  execute function public.set_updated_at();
```

## Supabase Checks Before Running

Before any human executes the main packet in Supabase, verify:

- `public.concept_briefs` exists in the target project.
- `public.concept_briefs.id` is a UUID primary key or otherwise compatible with the foreign key.
- `gen_random_uuid()` is available in the target project.
- There is no existing table named `public.concept_brief_notification_events`.
- There is no existing index named `concept_brief_notification_events_unique_delivery`.
- The project grants and RLS posture allow service-role server helpers to use this table while preventing browser/client access.
- The app will normalize `recipient_email` with trim plus lower-case before inserting rows.
- No `anon` or `authenticated` RLS policy is added for this table.
- If using the optional trigger, `public.set_updated_at()` already exists and is compatible.

## Rollback SQL Draft

Use only if the packet was executed and needs to be rolled back after review. Dropping the table removes notification idempotency history.

```sql
drop table if exists public.concept_brief_notification_events cascade;
```

If the optional trigger was added and the table must be preserved, remove only the trigger:

```sql
drop trigger if exists set_concept_brief_notification_events_updated_at
  on public.concept_brief_notification_events;
```

If the optional status check was added and needs to be removed while preserving the table:

```sql
alter table public.concept_brief_notification_events
  drop constraint if exists concept_brief_notification_events_status_check;
```

## Risk Assessment

Migration risk: the foreign key depends on the live `public.concept_briefs(id)` type and table name matching the packet. Human review should confirm the live schema before running.

RLS/grant risk: accidentally adding broad policies or grants could expose internal notification metadata. The intended posture is RLS enabled, no `anon` or `authenticated` access, and service-role-only server access.

Duplicate-prevention risk: the unique index prevents duplicate rows only if Agent 24B-3 uses the same normalized `recipient_email` for every reservation. If the app sends before reserving, duplicates remain possible.

Stale reservation risk: if the reservation succeeds but the server crashes or times out before Resend is called or before the row is marked `sent` or `failed`, a `reserved` row may exist without an email being sent. For the MVP, this is acceptable because duplicate prevention is prioritized over automatic retry, and the admin brief list remains the source of truth for submitted briefs.

Rollback risk: dropping the table removes any notification event history. If app code has already been deployed, roll back app code before dropping the table or disable the code path that queries it.

## Later Agent 24B-3 App Files

Agent 24B-3 is expected to change app/server code, not this SQL packet. Likely files:

- `lib/server/admin-email-notifications.ts`
- possibly a new focused server-only helper under `lib/server/` for notification event reservation/update logic
- `app/api/concept-brief-admin-notification/route.ts` only if the route response shape needs a small idempotency-aware adjustment
- focused tests under `tests/e2e/design-concept-validation.spec.ts` or another existing test surface if the later implementation can test duplicate route calls without sending real emails

Agent 24B-3 must keep the customer flow non-blocking when admin notification delivery fails.

## Confirmation

No SQL was executed while preparing this packet.
