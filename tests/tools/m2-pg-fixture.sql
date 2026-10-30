\set ON_ERROR_STOP on
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create table public.concept_briefs (id uuid primary key default gen_random_uuid(), public_reference text not null, source text, status text, piece_type text, branch text, structure text, sub_structure text, design_objective text, ai_sketch_instruction text, brief_payload jsonb, summary_items jsonb, api_submission jsonb);
create table public.concept_brief_contacts (concept_brief_id uuid references public.concept_briefs(id), customer_name text check (customer_name <> 'REJECT'), customer_email text, phone_whatsapp text, country_region text, contact_note text);
grant usage on schema public to service_role;
grant select,insert on public.concept_briefs,public.concept_brief_contacts to service_role;
