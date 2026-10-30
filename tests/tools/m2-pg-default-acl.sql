\set ON_ERROR_STOP on
-- Dedicated empty synthetic database only. Reproduce Supabase-style default table ACL.
alter default privileges for role postgres in schema public grant all on tables to service_role;
create table public.concept_briefs (id uuid primary key default gen_random_uuid(), public_reference text not null, source text not null, status text not null, piece_type text, branch text, structure text, sub_structure text, design_objective text, ai_sketch_instruction text, brief_payload jsonb not null, summary_items jsonb not null, api_submission jsonb not null);
create table public.concept_brief_contacts (concept_brief_id uuid not null references public.concept_briefs(id), customer_name text not null, customer_email text not null, phone_whatsapp text, country_region text, contact_note text);
grant usage on schema public to service_role;
grant select,insert on public.concept_briefs, public.concept_brief_contacts to service_role;
create temp table assert_count(n integer not null); insert into assert_count values(0);
create function pg_temp.check_acl(v boolean,label text) returns void language plpgsql as $$ begin if v is distinct from true then raise exception 'FAIL %',label; end if; update assert_count set n=n+1; raise notice 'PASS %',label; end $$;
begin;
create table public.m2_original_grant_probe(id int);
revoke all on table public.m2_original_grant_probe from public,anon,authenticated;
grant select,insert,update on table public.m2_original_grant_probe to service_role;
select pg_temp.check_acl(has_table_privilege('service_role','public.m2_original_grant_probe','DELETE'),'original_retains_delete');
select pg_temp.check_acl((select bool_and(has_table_privilege('service_role','public.m2_original_grant_probe',priv)) from unnest(array['TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) as priv),'original_retains_other_privileges');
commit;
-- Probe is synthetic and retained; no existing resource is touched.
\ir /tmp/m2-corrected-draft.sql
select pg_temp.check_acl((select bool_and(has_table_privilege('service_role','public.m2_scoped_submission_receipts',priv)) from unnest(array['SELECT','INSERT','UPDATE']) as priv),'corrected_keeps_select_insert_update');
select pg_temp.check_acl((select bool_and(not has_table_privilege('service_role','public.m2_scoped_submission_receipts',priv)) from unnest(array['DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) as priv),'corrected_denies_extra_privileges');
select pg_temp.check_acl((select bool_and(not has_table_privilege(r,'public.m2_scoped_submission_receipts',priv)) from unnest(array['anon','authenticated']) as r cross join unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) as priv),'anon_authenticated_denied');
select pg_temp.check_acl(not exists(select 1 from pg_class c cross join lateral aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a where c.oid='public.m2_scoped_submission_receipts'::regclass and a.grantee=0),'public_no_grants');
select 'ASSERT_COUNT='||n from assert_count;
