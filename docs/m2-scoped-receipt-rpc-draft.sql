-- DRAFT ONLY: not a migration, not applied, and not validated against a live or local database.
-- Preconditions: verify exact existing concept_briefs/contact columns, service-role grants,
-- data retention and backup. Do not apply until independently reviewed and tested.
-- Rollback before traffic: drop these four functions and the new table; after traffic,
-- preserve mappings and reconcile in-flight submissions before any removal.
begin;
create table public.m2_scoped_submission_receipts (
  scope_sha256 text not null check (scope_sha256 ~ '^[0-9a-f]{64}$'),
  invitation_identity text not null check (invitation_identity ~ '^[A-Za-z0-9_-]{1,64}$'),
  client_request_id text not null check (client_request_id ~ '^[0-9a-f]{32}$'),
  payload_sha256 text not null check (payload_sha256 ~ '^[0-9a-f]{64}$'),
  concept_brief_id uuid not null references public.concept_briefs(id) on delete restrict,
  public_reference text not null check (public_reference ~ '^NOVORA-CB-[0-9]{8}-[A-Z0-9]{4}$'),
  stage text not null check (stage in ('accepted','admission_denied','publish_pending','published','UNKNOWN')),
  reason text check (reason in ('feature_disabled','queue_execution_disabled','eligibility_rejected','beta_admission_denied','queue_message_rejected','structured_input_rejected','UNKNOWN','enqueued')),
  created_at timestamptz not null default now(),
  primary key(scope_sha256,invitation_identity,client_request_id)
);
alter table public.m2_scoped_submission_receipts enable row level security;
revoke all on table public.m2_scoped_submission_receipts from public, anon, authenticated;
revoke all privileges on table public.m2_scoped_submission_receipts from service_role;
grant select,insert,update on table public.m2_scoped_submission_receipts to service_role;

-- The transaction-scoped advisory lock serializes even the initial absent-row case.
-- A SQL error rolls back brief, contact and receipt together. Identity/scope MUST be
-- derived by the server from verified invitation and isolated runtime, never body data.
create function public.m2_create_scoped_receipt(p_scope text,p_identity text,p_request text,p_digest text,p_brief jsonb,p_contact jsonb)
returns table(outcome text,brief_id uuid,reference text,stage text,reason text)
language plpgsql security invoker set search_path = '' as $$
declare prior public.m2_scoped_submission_receipts%rowtype; bid uuid; pref text;
begin
  if p_scope !~ '^[0-9a-f]{64}$' or p_identity !~ '^[A-Za-z0-9_-]{1,64}$' or p_request !~ '^[0-9a-f]{32}$' or p_digest !~ '^[0-9a-f]{64}$' or jsonb_typeof(p_brief) <> 'object' or jsonb_typeof(p_contact) <> 'object' then raise exception 'invalid arguments'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_scope || E'\n' || p_identity || E'\n' || p_request,0));
  select * into prior from public.m2_scoped_submission_receipts r where r.scope_sha256=p_scope and r.invitation_identity=p_identity and r.client_request_id=p_request;
  if found then
    if prior.payload_sha256 <> p_digest then return query select 'conflict'::text,null::uuid,null::text,null::text,null::text; return; end if;
    return query select 'existing'::text,prior.concept_brief_id,prior.public_reference,prior.stage,prior.reason; return;
  end if;
  pref:=p_brief->>'public_reference';
  insert into public.concept_briefs(public_reference,source,status,piece_type,branch,structure,sub_structure,design_objective,ai_sketch_instruction,brief_payload,summary_items,api_submission)
  values(pref,'api','new',p_brief->>'piece_type',p_brief->>'branch',p_brief->>'structure',p_brief->>'sub_structure',p_brief->>'design_objective',p_brief->>'ai_sketch_instruction',p_brief->'brief_payload',p_brief->'summary_items',p_brief->'api_submission') returning id into bid;
  insert into public.concept_brief_contacts(concept_brief_id,customer_name,customer_email,phone_whatsapp,country_region,contact_note)
  values(bid,p_contact->>'customer_name',p_contact->>'customer_email',p_contact->>'phone_whatsapp',p_contact->>'country_region',p_contact->>'contact_note');
  insert into public.m2_scoped_submission_receipts(scope_sha256,invitation_identity,client_request_id,payload_sha256,concept_brief_id,public_reference,stage)
  values(p_scope,p_identity,p_request,p_digest,bid,pref,'accepted');
  return query select 'created'::text,bid,pref,'accepted'::text,null::text;
end $$;

create function public.m2_read_scoped_receipt(p_scope text,p_identity text,p_request text)
returns table(brief_id uuid,reference text,stage text,reason text)
language sql security invoker set search_path = '' as $$
  select r.concept_brief_id,r.public_reference,r.stage,r.reason from public.m2_scoped_submission_receipts r
  where r.scope_sha256=p_scope and r.invitation_identity=p_identity and r.client_request_id=p_request
$$;
-- Claim only once. Failure or an uncertain claim response MUST NOT publish.
create function public.m2_claim_scoped_publish(p_scope text,p_identity text,p_request text)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  update public.m2_scoped_submission_receipts set stage='publish_pending' where scope_sha256=p_scope and invitation_identity=p_identity and client_request_id=p_request and stage='accepted';
  return found;
end $$;
-- Outcome is monotonic. publish_pending after a crash remains uncertain; no auto-retry.
create function public.m2_finish_scoped_publish(p_scope text,p_identity text,p_request text,p_stage text,p_reason text)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  if p_stage is null or p_reason is null or not (
    (p_stage='admission_denied' and p_reason='beta_admission_denied') or
    (p_stage='published' and p_reason='enqueued') or
    (p_stage='UNKNOWN' and p_reason in ('feature_disabled','queue_execution_disabled','eligibility_rejected','queue_message_rejected','structured_input_rejected','UNKNOWN'))
  ) then return false; end if;
  update public.m2_scoped_submission_receipts set stage=p_stage,reason=p_reason where scope_sha256=p_scope and invitation_identity=p_identity and client_request_id=p_request and stage='publish_pending';
  return found;
end $$;
revoke all on function public.m2_create_scoped_receipt(text,text,text,text,jsonb,jsonb) from public,anon,authenticated;
revoke all on function public.m2_read_scoped_receipt(text,text,text) from public,anon,authenticated;
revoke all on function public.m2_claim_scoped_publish(text,text,text) from public,anon,authenticated;
revoke all on function public.m2_finish_scoped_publish(text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.m2_create_scoped_receipt(text,text,text,text,jsonb,jsonb) to service_role;
grant execute on function public.m2_read_scoped_receipt(text,text,text) to service_role;
grant execute on function public.m2_claim_scoped_publish(text,text,text) to service_role;
grant execute on function public.m2_finish_scoped_publish(text,text,text,text,text) to service_role;
commit;
