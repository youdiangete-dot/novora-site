-- LOCAL CANDIDATE ONLY. Not executed. Apply only after exact isolated approval.
-- No backfill, no image deletion, no changes to existing historical rows.
BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';
ALTER TABLE public.ai_sketch_outputs ADD COLUMN customer_history_state text
  CHECK (customer_history_state IN ('superseded','withdrawn'));
GRANT SELECT(customer_history_state), UPDATE(customer_history_state) ON public.ai_sketch_outputs TO service_role;
-- A later explicit revocation of an already archived source withdraws history,
-- including an UPDATE that repeats the same revoked values. No reactivation.
CREATE FUNCTION public.novora_withdraw_archived_output() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    IF NEW.customer_history_state IS NOT NULL THEN RAISE EXCEPTION 'HISTORY_INSERT_REJECTED' USING ERRCODE='23514'; END IF;
    RETURN NEW;
  END IF;
  IF OLD.customer_history_state='withdrawn' THEN NEW.customer_history_state='withdrawn';
  ELSIF OLD.customer_history_state='superseded' THEN NEW.customer_history_state='withdrawn'; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.novora_withdraw_archived_output() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER novora_history_insert BEFORE INSERT ON public.ai_sketch_outputs FOR EACH ROW EXECUTE FUNCTION public.novora_withdraw_archived_output();
CREATE TRIGGER novora_history_withdraw BEFORE UPDATE OF readiness_status,readiness_revoked_at,is_current_customer_preview,customer_history_state
ON public.ai_sketch_outputs FOR EACH ROW EXECUTE FUNCTION public.novora_withdraw_archived_output();
-- This is deferred because the existing atomic RPC updates source BEFORE target.
CREATE FUNCTION public.novora_verify_superseded_output() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
 IF NEW.customer_history_state='superseded' AND OLD.customer_history_state IS DISTINCT FROM 'superseded' THEN
  IF (OLD.readiness_status='first_preview_ready' AND OLD.is_current_customer_preview AND OLD.readiness_revoked_at IS NULL AND
      OLD.asset_validation_status='passed' AND OLD.automatic_gate_status='passed' AND
      NEW.readiness_status='revoked' AND NOT NEW.is_current_customer_preview AND
      NEW.readiness_revoked_at IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.ai_sketch_jobs j JOIN public.ai_sketch_outputs o ON o.job_id=j.id AND o.concept_brief_id=j.concept_brief_id
        WHERE j.source_output_id=NEW.id AND j.concept_brief_id=NEW.concept_brief_id AND j.status='succeeded'
          AND o.readiness_status='first_preview_ready' AND o.is_current_customer_preview AND o.readiness_revoked_at IS NULL
          AND o.asset_validation_status='passed' AND o.automatic_gate_status='passed'
          AND o.first_preview_ready_at=NEW.readiness_revoked_at)) IS NOT TRUE THEN
    RAISE EXCEPTION 'HISTORY_SUPERSESSION_REJECTED' USING ERRCODE='23514';
  END IF;
 END IF;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.novora_verify_superseded_output() FROM PUBLIC,anon,authenticated;
CREATE CONSTRAINT TRIGGER novora_history_supersession AFTER UPDATE ON public.ai_sketch_outputs
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.novora_verify_superseded_output();
CREATE OR REPLACE FUNCTION public.novora_promote_revision_output(
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
    is_current_customer_preview = false, readiness_revoked_at = p_passed_at, customer_history_state = 'superseded'
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

COMMIT;
