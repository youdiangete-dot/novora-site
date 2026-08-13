-- Agent 79C local candidate only. Do not execute from this repository task.

BEGIN;

SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

create table public.first_preview_customer_feedback (
  id uuid primary key default gen_random_uuid(),
  concept_brief_id uuid not null references public.concept_briefs(id),
  ai_sketch_output_id uuid not null references public.ai_sketch_outputs(id),
  feedback_text text not null,
  created_at timestamptz not null default now(),
  constraint first_preview_customer_feedback_text_valid check (
    feedback_text = btrim(feedback_text)
    and char_length(feedback_text) between 1 and 2000
  ),
  constraint first_preview_customer_feedback_exact_output_unique
    unique (concept_brief_id, ai_sketch_output_id)
);

alter table public.first_preview_customer_feedback enable row level security;

revoke all on table public.first_preview_customer_feedback from public, anon, authenticated;
grant select, insert on table public.first_preview_customer_feedback to service_role;

create or replace function public.enforce_current_ready_first_preview_feedback()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.ai_sketch_outputs as output
    where output.id = new.ai_sketch_output_id
      and output.concept_brief_id = new.concept_brief_id
      and output.readiness_status = 'first_preview_ready'
      and output.is_current_customer_preview is true
      and output.readiness_revoked_at is null
  ) then
    raise exception using
      errcode = '23514',
      message = 'first preview feedback identity is not current and ready';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_current_ready_first_preview_feedback() from public, anon, authenticated;
grant execute on function public.enforce_current_ready_first_preview_feedback() to service_role;

create trigger first_preview_customer_feedback_current_ready_insert
before insert on public.first_preview_customer_feedback
for each row
execute function public.enforce_current_ready_first_preview_feedback();

COMMIT;
