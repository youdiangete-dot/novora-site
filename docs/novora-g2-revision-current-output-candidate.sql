-- LOCAL CANDIDATE ONLY. Not applied to Supabase.
-- Requires existing M3 source lineage/attempt constraints and reviewed target.
-- No image bytes, customer contact, prompt or credentials are stored here.
BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

-- The reviewed M3 FK couples the source to the immediately preceding job.
-- A definitively failed revision consumes a sequence number while the earlier
-- safe image remains current. Keep the Brief FK; validate ancestry in the RPC.
-- Live preflight must confirm these exact existing M3/Core objects first.
ALTER TABLE ONLY public.ai_sketch_jobs DROP CONSTRAINT ai_sketch_jobs_source_output_lineage_fkey;
ALTER TABLE ONLY public.ai_sketch_jobs ADD CONSTRAINT ai_sketch_jobs_source_output_lineage_fkey
  FOREIGN KEY (source_output_id, concept_brief_id)
  REFERENCES public.ai_sketch_outputs (id, concept_brief_id);

ALTER TABLE ONLY public.ai_sketch_jobs DROP CONSTRAINT ai_sketch_jobs_mvp_core_identity_check;
ALTER TABLE ONLY public.ai_sketch_jobs ADD CONSTRAINT ai_sketch_jobs_mvp_core_identity_check CHECK ((
  (status IS NOT DISTINCT FROM 'draft' AND num_nonnulls(generation_purpose,idempotency_key,attempt_number,
    lineage_identity,parent_job_id,parent_generation_purpose,parent_attempt_number,source_output_id,
    design_spec_version,design_spec_hash,hand_sketch_instruction_version,hand_sketch_instruction_hash)=0)
  OR (status IS DISTINCT FROM 'draft' AND generation_purpose IS NOT DISTINCT FROM 'first_preview'
    AND attempt_number BETWEEN 1 AND 32767 AND (attempt_number<=2 OR source_output_id IS NOT NULL)
    AND idempotency_key ~ '^[0-9a-f]{64}$'
    AND lineage_identity IS NOT DISTINCT FROM 'first-preview:v1'
    AND design_spec_version IS NOT NULL AND btrim(design_spec_version) <> '' AND design_spec_hash ~ '^[0-9a-f]{64}$'
    AND hand_sketch_instruction_version IS NOT NULL AND btrim(hand_sketch_instruction_version) <> ''
    AND hand_sketch_instruction_hash ~ '^[0-9a-f]{64}$'
    AND ((attempt_number=1 AND parent_job_id IS NULL AND parent_generation_purpose IS NULL
      AND parent_attempt_number IS NULL AND source_output_id IS NULL)
      OR (attempt_number>=2 AND parent_job_id IS NOT NULL AND parent_generation_purpose IS NOT DISTINCT FROM 'first_preview'
        AND parent_attempt_number IS NOT DISTINCT FROM attempt_number-1)))) IS TRUE);

CREATE FUNCTION public.novora_promote_revision_output(
  p_brief_id uuid, p_job_id uuid, p_output_id uuid, p_source_output_id uuid,
  p_content_sha256 text, p_policy_version text, p_gate_evidence jsonb,
  p_passed_at timestamptz
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $function$
DECLARE
  source public.ai_sketch_outputs%ROWTYPE;
  candidate public.ai_sketch_outputs%ROWTYPE;
  job public.ai_sketch_jobs%ROWTYPE;
  parent public.ai_sketch_jobs%ROWTYPE;
  source_job public.ai_sketch_jobs%ROWTYPE;
  review public.ai_sketch_reviews%ROWTYPE;
BEGIN
  IF jsonb_typeof(p_gate_evidence) IS DISTINCT FROM 'object' OR
    jsonb_typeof(p_gate_evidence->'visualPrivacyEvidence') IS DISTINCT FROM 'object' OR
    jsonb_typeof(p_gate_evidence #> '{visualPrivacyEvidence,subject}') IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'REVISION_PROMOTION_REJECTED' USING ERRCODE = '22023';
  END IF;
  -- Serialize promotions for this one Brief before locking the participating
  -- rows. Updating the source and candidate in separate HTTP calls is forbidden.
  PERFORM id FROM public.concept_briefs WHERE id = p_brief_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'REVISION_PROMOTION_REJECTED' USING ERRCODE = '22023'; END IF;
  SELECT * INTO job FROM public.ai_sketch_jobs WHERE id = p_job_id AND concept_brief_id = p_brief_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'REVISION_PROMOTION_REJECTED' USING ERRCODE = '22023'; END IF;
  SELECT * INTO source FROM public.ai_sketch_outputs WHERE id = p_source_output_id AND concept_brief_id = p_brief_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'REVISION_PROMOTION_REJECTED' USING ERRCODE = '22023'; END IF;
  SELECT * INTO candidate FROM public.ai_sketch_outputs WHERE id = p_output_id AND concept_brief_id = p_brief_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'REVISION_PROMOTION_REJECTED' USING ERRCODE = '22023'; END IF;
  SELECT * INTO parent FROM public.ai_sketch_jobs WHERE id = job.parent_job_id AND concept_brief_id = p_brief_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'REVISION_PROMOTION_REJECTED' USING ERRCODE = '22023'; END IF;
  SELECT * INTO source_job FROM public.ai_sketch_jobs WHERE id = source.job_id AND concept_brief_id = p_brief_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'REVISION_PROMOTION_REJECTED' USING ERRCODE = '22023'; END IF;
  SELECT * INTO review FROM public.ai_sketch_reviews WHERE concept_brief_id = p_brief_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'REVISION_PROMOTION_REJECTED' USING ERRCODE = '22023'; END IF;

  IF (p_output_id <> p_source_output_id AND
      job.source_output_id = source.id AND source_job.status = 'succeeded' AND
      source_job.attempt_number <= parent.attempt_number AND
      ((parent.status = 'succeeded' AND job.parent_job_id = source.job_id) OR
        (parent.status IN ('failed','cancelled','timed_out') AND parent.source_output_id=source.id AND
          job.prompt_payload->>'revisionParentOutcome'='definite_failure' AND
          coalesce(parent.failed_at,parent.cancelled_at,parent.timed_out_at) <= job.created_at)) AND
      job.attempt_number = parent.attempt_number + 1 AND
      job.status = 'succeeded' AND job.generation_purpose = 'first_preview' AND
      job.lineage_identity = 'first-preview:v1' AND candidate.job_id = job.id AND
      candidate.content_sha256 = p_content_sha256 AND
      candidate.mime_type = 'image/png' AND candidate.width_px = 1024 AND candidate.height_px = 1024 AND
      candidate.byte_size BETWEEN 1 AND 16777216 AND
      p_content_sha256 ~ '^[a-f0-9]{64}$' AND
      candidate.readiness_status = 'not_ready' AND NOT candidate.is_current_customer_preview AND
      candidate.readiness_revoked_at IS NULL AND candidate.first_preview_ready_at IS NULL AND
      candidate.asset_validation_status = 'passed' AND candidate.asset_validated_at IS NOT NULL AND
      candidate.automatic_gate_status = 'pending' AND candidate.automatic_gate_evidence IS NULL AND
      candidate.automatic_gate_passed_at IS NULL AND
      p_policy_version = 'novora_first_preview_automatic_gates_v2' AND
      candidate.automatic_gate_policy_version = p_policy_version AND
      source.readiness_status = 'first_preview_ready' AND source.is_current_customer_preview AND
      source.readiness_revoked_at IS NULL AND source.automatic_gate_status = 'passed' AND
      source.automatic_gate_policy_version = p_policy_version AND
      source.first_preview_ready_at <= job.created_at AND source_job.completed_at <= job.created_at AND
      review.ai_sketch_output_id = source.id AND review.review_status = 'needs_revision' AND
      length(btrim(review.revision_instruction)) BETWEEN 1 AND 2000 AND
      job.started_at <= job.completed_at AND candidate.asset_validated_at <= job.completed_at AND
      job.completed_at <= p_passed_at AND p_passed_at <= job.deadline_at AND
      p_passed_at <= pg_catalog.clock_timestamp() AND
      pg_catalog.clock_timestamp() <= job.deadline_at AND
      (SELECT count(*) FROM public.ai_sketch_outputs WHERE concept_brief_id = p_brief_id AND is_current_customer_preview) = 1 AND
      jsonb_typeof(p_gate_evidence) = 'object' AND
      p_gate_evidence->>'result' = 'passed' AND
      (SELECT count(*) FROM pg_catalog.jsonb_object_keys(p_gate_evidence)) = 8 AND
      (SELECT count(*) FROM pg_catalog.jsonb_object_keys(p_gate_evidence->'visualPrivacyEvidence')) = 7 AND
      (SELECT count(*) FROM pg_catalog.jsonb_object_keys(p_gate_evidence #> '{visualPrivacyEvidence,subject}')) = 4 AND
      p_gate_evidence->'outputValid' = 'true'::jsonb AND p_gate_evidence->'assetExists' = 'true'::jsonb AND
      p_gate_evidence->'ownershipConsistent' = 'true'::jsonb AND p_gate_evidence->'privacyPassed' = 'true'::jsonb AND
      p_gate_evidence->'customerAccessEligible' = 'true'::jsonb AND p_gate_evidence->'lifecycleEligible' = 'true'::jsonb AND
      p_gate_evidence #>> '{visualPrivacyEvidence,result}' = 'passed' AND
      p_gate_evidence #> '{visualPrivacyEvidence,usageTrusted}' = 'true'::jsonb AND
      p_gate_evidence #>> '{visualPrivacyEvidence,inspectorVersion}' = 'novora_openai_visual_privacy_inspector_v1' AND
      p_gate_evidence #>> '{visualPrivacyEvidence,policyVersion}' = 'novora_first_preview_visual_privacy_v1' AND
      p_gate_evidence #>> '{visualPrivacyEvidence,model}' = 'gpt-4.1-mini-2025-04-14' AND
      jsonb_typeof(p_gate_evidence #> '{visualPrivacyEvidence,actualCostMicros}') = 'number' AND
      (p_gate_evidence #>> '{visualPrivacyEvidence,actualCostMicros}') ~ '^(0|[1-9][0-9]{0,8})$' AND
      (p_gate_evidence #>> '{visualPrivacyEvidence,actualCostMicros}')::numeric BETWEEN 0 AND 30000 AND
      p_gate_evidence #>> '{visualPrivacyEvidence,subject,conceptBriefId}' = p_brief_id::text AND
      p_gate_evidence #>> '{visualPrivacyEvidence,subject,jobId}' = p_job_id::text AND
      p_gate_evidence #>> '{visualPrivacyEvidence,subject,outputId}' = p_output_id::text AND
      p_gate_evidence #>> '{visualPrivacyEvidence,subject,contentSha256}' = p_content_sha256
     ) IS NOT TRUE THEN
    RAISE EXCEPTION 'REVISION_PROMOTION_REJECTED' USING ERRCODE = '22023';
  END IF;

  UPDATE public.ai_sketch_outputs SET readiness_status = 'revoked',
    is_current_customer_preview = false, readiness_revoked_at = p_passed_at
    WHERE id = source.id;
  UPDATE public.ai_sketch_outputs SET readiness_status = 'first_preview_ready',
    is_current_customer_preview = true, first_preview_ready_at = p_passed_at,
    automatic_gate_status = 'passed', automatic_gate_evidence = p_gate_evidence,
    automatic_gate_policy_version = p_policy_version, automatic_gate_passed_at = p_passed_at
    WHERE id = candidate.id RETURNING * INTO candidate;
  -- This is the existing mutable current-review pointer, not human approval.
  -- Customer feedback remains bound to its original output in its own table.
  UPDATE public.ai_sketch_reviews SET ai_sketch_output_id = candidate.id,
    review_status = 'draft_generated_internal_only', revision_instruction = NULL,
    approved_for_customer_at = NULL, approved_by = NULL,
    approval_revoked_at = NULL, revoked_by = NULL, updated_at = p_passed_at
    WHERE concept_brief_id = p_brief_id AND ai_sketch_output_id = source.id;
  IF NOT FOUND THEN RAISE EXCEPTION 'REVISION_PROMOTION_REJECTED' USING ERRCODE = '22023'; END IF;
  -- Match the existing server repository projection, never return future/raw
  -- columns accidentally added to the table.
  RETURN pg_catalog.jsonb_build_object(
    'id', candidate.id, 'job_id', candidate.job_id, 'concept_brief_id', candidate.concept_brief_id,
    'bucket_name', candidate.bucket_name, 'object_path', candidate.object_path,
    'mime_type', candidate.mime_type, 'byte_size', candidate.byte_size,
    'width_px', candidate.width_px, 'height_px', candidate.height_px,
    'content_sha256', candidate.content_sha256, 'asset_created_at', candidate.asset_created_at,
    'asset_validation_status', candidate.asset_validation_status, 'asset_validated_at', candidate.asset_validated_at,
    'readiness_status', candidate.readiness_status, 'first_preview_ready_at', candidate.first_preview_ready_at,
    'readiness_revoked_at', candidate.readiness_revoked_at, 'is_current_customer_preview', candidate.is_current_customer_preview,
    'automatic_gate_status', candidate.automatic_gate_status, 'automatic_gate_evidence', candidate.automatic_gate_evidence,
    'automatic_gate_policy_version', candidate.automatic_gate_policy_version,
    'automatic_gate_passed_at', candidate.automatic_gate_passed_at, 'created_at', candidate.created_at
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.novora_promote_revision_output(uuid,uuid,uuid,uuid,text,text,jsonb,timestamptz) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.novora_promote_revision_output(uuid,uuid,uuid,uuid,text,text,jsonb,timestamptz) TO service_role;
COMMIT;

-- Rollback BEFORE accepting revision traffic only: remove this exact function.
-- After traffic, preserve outputs/reviews and use a compatible code rollback;
-- never delete accepted images or rewrite old direction confirmations.
