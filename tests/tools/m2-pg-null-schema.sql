\set ON_ERROR_STOP on
CREATE TABLE public.concept_briefs (id uuid primary key default gen_random_uuid(), public_reference text NOT NULL UNIQUE, source text NOT NULL, status text NOT NULL, piece_type text, branch text, structure text, sub_structure text, design_objective text, ai_sketch_instruction text, brief_payload jsonb NOT NULL, summary_items jsonb NOT NULL, api_submission jsonb NOT NULL);
CREATE TABLE public.concept_brief_contacts (id uuid primary key default gen_random_uuid(), concept_brief_id uuid NOT NULL UNIQUE REFERENCES public.concept_briefs(id) ON DELETE CASCADE, customer_name text NOT NULL, customer_email text NOT NULL, phone_whatsapp text, country_region text, contact_note text);
GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT,INSERT ON public.concept_briefs,public.concept_brief_contacts TO service_role;
