-- M3-3 candidate only.
-- NOT EXECUTED.
-- Requires separate Owner approval before live execution.
-- Derived from read-only live metadata captured 2026-08-10.
-- No customer rows were read.

BEGIN;

SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE ONLY public.ai_sketch_outputs
  ADD CONSTRAINT ai_sketch_outputs_source_lineage_target_key
  UNIQUE (id, job_id, concept_brief_id);

ALTER TABLE ONLY public.ai_sketch_jobs
  ADD CONSTRAINT ai_sketch_jobs_source_output_lineage_fkey
  FOREIGN KEY (source_output_id, parent_job_id, concept_brief_id)
  REFERENCES public.ai_sketch_outputs (id, job_id, concept_brief_id)
  MATCH SIMPLE
  ON UPDATE NO ACTION
  ON DELETE NO ACTION;

ALTER TABLE ONLY public.ai_sketch_jobs
  DROP CONSTRAINT ai_sketch_jobs_mvp_core_identity_check;

ALTER TABLE ONLY public.ai_sketch_jobs
  ADD CONSTRAINT ai_sketch_jobs_mvp_core_identity_check
    CHECK ((
      (status IS NOT DISTINCT FROM 'draft'
       AND num_nonnulls(
         generation_purpose, idempotency_key, attempt_number,
         lineage_identity, parent_job_id, parent_generation_purpose,
         parent_attempt_number, source_output_id, design_spec_version,
         design_spec_hash, hand_sketch_instruction_version,
         hand_sketch_instruction_hash
       ) = 0)
      OR
      (status IS DISTINCT FROM 'draft'
       AND generation_purpose IS NOT DISTINCT FROM 'first_preview'
       AND attempt_number IN (1, 2)
       AND idempotency_key ~ '^[0-9a-f]{64}$'
       AND lineage_identity IS NOT DISTINCT FROM 'first-preview:v1'
       AND design_spec_version IS NOT NULL
       AND btrim(design_spec_version) <> ''
       AND design_spec_hash ~ '^[0-9a-f]{64}$'
       AND hand_sketch_instruction_version IS NOT NULL
       AND btrim(hand_sketch_instruction_version) <> ''
       AND hand_sketch_instruction_hash ~ '^[0-9a-f]{64}$'
       AND (
         (attempt_number = 1
          AND parent_job_id IS NULL
          AND parent_generation_purpose IS NULL
          AND parent_attempt_number IS NULL
          AND source_output_id IS NULL)
         OR
         (attempt_number = 2
          AND parent_job_id IS NOT NULL
          AND parent_generation_purpose IS NOT DISTINCT FROM 'first_preview'
          AND parent_attempt_number IS NOT DISTINCT FROM 1)
       ))
    ) IS TRUE);

-- Metadata-only verification: recreated CHECK, new FK, and new UNIQUE target.
SELECT
  namespace.nspname AS table_schema,
  relation.relname AS table_name,
  constraint_object.conname AS constraint_name,
  constraint_object.contype AS constraint_type,
  constraint_object.convalidated AS is_validated,
  pg_catalog.pg_get_constraintdef(constraint_object.oid, true) AS definition
FROM pg_catalog.pg_constraint AS constraint_object
JOIN pg_catalog.pg_class AS relation
  ON relation.oid = constraint_object.conrelid
JOIN pg_catalog.pg_namespace AS namespace
  ON namespace.oid = relation.relnamespace
WHERE namespace.nspname = 'public'
  AND constraint_object.conname IN (
    'ai_sketch_jobs_mvp_core_identity_check',
    'ai_sketch_jobs_source_output_lineage_fkey',
    'ai_sketch_outputs_source_lineage_target_key'
  )
ORDER BY relation.relname, constraint_object.conname;

-- Metadata-only verification: relevant column types and nullability are unchanged.
SELECT
  table_schema,
  table_name,
  ordinal_position,
  column_name,
  data_type,
  udt_name,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'ai_sketch_jobs'
     AND column_name IN (
       'id',
       'concept_brief_id',
       'status',
       'generation_purpose',
       'attempt_number',
       'parent_job_id',
       'parent_generation_purpose',
       'parent_attempt_number',
       'source_output_id',
       'retry_eligible'
     ))
    OR
    (table_name = 'ai_sketch_outputs'
     AND column_name IN (
       'id',
       'job_id',
       'concept_brief_id'
     ))
  )
ORDER BY table_name, ordinal_position;

COMMIT;
