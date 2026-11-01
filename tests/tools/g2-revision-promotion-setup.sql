\set ON_ERROR_STOP on
-- B runs only in the retained synthetic container, dedicated empty database.
-- No network, business rows, mounted secrets, or Supabase connection.
DO $$ BEGIN
  IF current_database() <> 'novora_g2_revision_test' THEN RAISE EXCEPTION 'SYNTHETIC_DATABASE_REQUIRED'; END IF;
END $$;
CREATE SCHEMA g2_fixture;
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
END $$;
-- Compatible non-sensitive column slice, not a claim of live Supabase parity.
CREATE TABLE public.concept_briefs(id uuid PRIMARY KEY);
CREATE TABLE public.ai_sketch_jobs(
 id uuid PRIMARY KEY, concept_brief_id uuid NOT NULL REFERENCES public.concept_briefs,
 status text NOT NULL, generation_purpose text, attempt_number integer, lineage_identity text,
 parent_job_id uuid REFERENCES public.ai_sketch_jobs, parent_generation_purpose text, parent_attempt_number integer,
 source_output_id uuid, prompt_payload jsonb NOT NULL DEFAULT '{}', idempotency_key text,
 design_spec_version text, design_spec_hash text, hand_sketch_instruction_version text, hand_sketch_instruction_hash text,
 created_at timestamptz NOT NULL, started_at timestamptz, completed_at timestamptz,
 failed_at timestamptz, cancelled_at timestamptz, timed_out_at timestamptz, deadline_at timestamptz,
 UNIQUE(concept_brief_id,attempt_number),
 CONSTRAINT ai_sketch_jobs_mvp_core_identity_check CHECK(attempt_number IN(1,2))
);
CREATE TABLE public.ai_sketch_outputs(
 id uuid PRIMARY KEY, job_id uuid NOT NULL REFERENCES public.ai_sketch_jobs,
 concept_brief_id uuid NOT NULL REFERENCES public.concept_briefs,
 bucket_name text, object_path text, mime_type text, byte_size bigint, width_px integer, height_px integer,
 content_sha256 text, asset_created_at timestamptz, asset_validation_status text, asset_validated_at timestamptz,
 readiness_status text NOT NULL, first_preview_ready_at timestamptz, readiness_revoked_at timestamptz,
 is_current_customer_preview boolean NOT NULL, automatic_gate_status text, automatic_gate_evidence jsonb,
 automatic_gate_policy_version text, automatic_gate_passed_at timestamptz, created_at timestamptz,
 UNIQUE(id,concept_brief_id), UNIQUE(id,job_id,concept_brief_id)
);
CREATE UNIQUE INDEX g2_one_current ON public.ai_sketch_outputs(concept_brief_id) WHERE is_current_customer_preview;
ALTER TABLE public.ai_sketch_jobs ADD CONSTRAINT ai_sketch_jobs_source_output_lineage_fkey
 FOREIGN KEY(source_output_id,parent_job_id,concept_brief_id) REFERENCES public.ai_sketch_outputs(id,job_id,concept_brief_id);
CREATE TABLE public.ai_sketch_reviews(
 concept_brief_id uuid PRIMARY KEY REFERENCES public.concept_briefs, ai_sketch_output_id uuid REFERENCES public.ai_sketch_outputs,
 review_status text, revision_instruction text, approved_for_customer_at timestamptz, approved_by text,
 approval_revoked_at timestamptz, revoked_by text, updated_at timestamptz
);
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC,anon,authenticated,service_role;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT,UPDATE ON public.concept_briefs,public.ai_sketch_jobs,public.ai_sketch_outputs,public.ai_sketch_reviews TO service_role;
-- Explicit synthetic role policies; real Supabase service_role bypass differs.
ALTER TABLE public.concept_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_sketch_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_sketch_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_sketch_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY g2_service ON public.concept_briefs TO service_role USING(true) WITH CHECK(true);
CREATE POLICY g2_service ON public.ai_sketch_jobs TO service_role USING(true) WITH CHECK(true);
CREATE POLICY g2_service ON public.ai_sketch_outputs TO service_role USING(true) WITH CHECK(true);
CREATE POLICY g2_service ON public.ai_sketch_reviews TO service_role USING(true) WITH CHECK(true);
CREATE FUNCTION g2_fixture.id(n integer,label text) RETURNS uuid LANGUAGE sql IMMUTABLE AS $$ SELECT md5('synthetic-g2:'||n||':'||label)::uuid $$;
CREATE FUNCTION g2_fixture.gates(b uuid,j uuid,o uuid) RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
 SELECT jsonb_build_object('result','passed','outputValid',true,'assetExists',true,'ownershipConsistent',true,
 'privacyPassed',true,'customerAccessEligible',true,'lifecycleEligible',true,'visualPrivacyEvidence',jsonb_build_object(
 'result','passed','usageTrusted',true,'inspectorVersion','novora_openai_visual_privacy_inspector_v1',
 'policyVersion','novora_first_preview_visual_privacy_v1','model','gpt-4.1-mini-2025-04-14','actualCostMicros',953,
 'subject',jsonb_build_object('conceptBriefId',b,'jobId',j,'outputId',o,'contentSha256',repeat('a',64))))
$$;
CREATE TABLE g2_fixture.cases(n integer PRIMARY KEY,b uuid,j uuid,o uuid,s uuid,passed_at timestamptz);
CREATE FUNCTION g2_fixture.seed(n integer,failed_parent boolean DEFAULT false) RETURNS void LANGUAGE plpgsql AS $$
DECLARE b uuid:=g2_fixture.id(n,'brief'); p uuid:=g2_fixture.id(n,'initial'); j uuid:=g2_fixture.id(n,'revision');
 s uuid:=g2_fixture.id(n,'source'); o uuid:=g2_fixture.id(n,'output'); f uuid:=g2_fixture.id(n,'failed'); t timestamptz:=clock_timestamp()-interval '5 minutes';
BEGIN
 INSERT INTO public.concept_briefs VALUES(b);
 INSERT INTO public.ai_sketch_jobs(id,concept_brief_id,status,generation_purpose,attempt_number,lineage_identity,
 idempotency_key,design_spec_version,design_spec_hash,hand_sketch_instruction_version,hand_sketch_instruction_hash,
 created_at,started_at,completed_at,deadline_at)
 VALUES(p,b,'succeeded','first_preview',1,'first-preview:v1',repeat('a',64),'v1',repeat('a',64),'v1',repeat('a',64),t,t,t+interval '5 seconds',t+interval '30 minutes');
 INSERT INTO public.ai_sketch_outputs VALUES(s,p,b,'novora-ai-sketches','synthetic/source.png','image/png',100,1024,1024,repeat('a',64),
 t,'passed',t+interval '4 seconds','first_preview_ready',t+interval '6 seconds',NULL,true,'passed',g2_fixture.gates(b,p,s),
 'novora_first_preview_automatic_gates_v2',t+interval '6 seconds',t);
 IF failed_parent THEN
 INSERT INTO public.ai_sketch_jobs(id,concept_brief_id,status,generation_purpose,attempt_number,lineage_identity,parent_job_id,parent_generation_purpose,parent_attempt_number,source_output_id,
 idempotency_key,design_spec_version,design_spec_hash,hand_sketch_instruction_version,hand_sketch_instruction_hash,created_at,failed_at)
 VALUES(f,b,'failed','first_preview',2,'first-preview:v1',p,'first_preview',1,s,repeat('b',64),'v1',repeat('b',64),'v1',repeat('b',64),t+interval '8 seconds',t+interval '10 seconds');
 END IF;
 INSERT INTO public.ai_sketch_jobs(id,concept_brief_id,status,generation_purpose,attempt_number,lineage_identity,parent_job_id,parent_generation_purpose,parent_attempt_number,source_output_id,prompt_payload,
 idempotency_key,design_spec_version,design_spec_hash,hand_sketch_instruction_version,hand_sketch_instruction_hash,created_at,started_at,completed_at,deadline_at)
 VALUES(j,b,'succeeded','first_preview',CASE WHEN failed_parent THEN 3 ELSE 2 END,'first-preview:v1',CASE WHEN failed_parent THEN f ELSE p END,'first_preview',CASE WHEN failed_parent THEN 2 ELSE 1 END,s,
 CASE WHEN failed_parent THEN '{"revisionParentOutcome":"definite_failure"}'::jsonb ELSE '{}'::jsonb END,
 repeat('c',64),'v1',repeat('c',64),'v1',repeat('c',64),t+interval '20 seconds',t+interval '21 seconds',t+interval '30 seconds',t+interval '30 minutes');
 INSERT INTO public.ai_sketch_outputs VALUES(o,j,b,'novora-ai-sketches','synthetic/revision.png','image/png',100,1024,1024,repeat('a',64),
 t+interval '25 seconds','passed',t+interval '26 seconds','not_ready',NULL,NULL,false,'pending',NULL,
 'novora_first_preview_automatic_gates_v2',NULL,t+interval '26 seconds');
 INSERT INTO public.ai_sketch_reviews(concept_brief_id,ai_sketch_output_id,review_status,revision_instruction,updated_at) VALUES(b,s,'needs_revision','lower_setting',t+interval '7 seconds');
 INSERT INTO g2_fixture.cases VALUES(n,b,j,o,s,t+interval '31 seconds');
END $$;
CREATE FUNCTION g2_fixture.promote(n integer,patch jsonb DEFAULT '{}') RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE c g2_fixture.cases%ROWTYPE;
BEGIN
 SELECT * INTO STRICT c FROM g2_fixture.cases WHERE cases.n=promote.n;
 RETURN public.novora_promote_revision_output(c.b,c.j,c.o,c.s,repeat('a',64),'novora_first_preview_automatic_gates_v2',g2_fixture.gates(c.b,c.j,c.o)||patch,c.passed_at);
END $$;
GRANT USAGE ON SCHEMA g2_fixture TO service_role;
GRANT SELECT ON g2_fixture.cases TO service_role;
GRANT EXECUTE ON FUNCTION g2_fixture.gates(uuid,uuid,uuid),g2_fixture.promote(integer,jsonb) TO service_role;
-- Apply the exact candidate AFTER setup, BEFORE seed/assert scripts.
