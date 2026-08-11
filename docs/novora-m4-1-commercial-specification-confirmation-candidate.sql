-- M4-1 candidate only.
-- NOT EXECUTED. Separate Owner approval is required for live SQL execution.

BEGIN;

SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

CREATE TABLE public.commercial_specification_confirmations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  concept_brief_id uuid NOT NULL,
  ai_sketch_output_id uuid NOT NULL,
  specification_version text NOT NULL,
  specification_snapshot jsonb NOT NULL,
  specification_sha256 text NOT NULL,
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT commercial_specification_confirmations_pkey
    PRIMARY KEY (id),
  CONSTRAINT commercial_specification_confirmations_brief_fkey
    FOREIGN KEY (concept_brief_id)
    REFERENCES public.concept_briefs (id)
    ON UPDATE NO ACTION
    ON DELETE NO ACTION,
  CONSTRAINT commercial_specification_confirmations_output_brief_fkey
    FOREIGN KEY (ai_sketch_output_id, concept_brief_id)
    REFERENCES public.ai_sketch_outputs (id, concept_brief_id)
    ON UPDATE NO ACTION
    ON DELETE NO ACTION,
  CONSTRAINT commercial_specification_confirmations_exact_state_key
    UNIQUE (concept_brief_id, ai_sketch_output_id, specification_sha256),
  CONSTRAINT commercial_specification_confirmations_version_check
    CHECK (
      specification_version = 'commercial_specification_snapshot_v1'
    ),
  CONSTRAINT commercial_specification_confirmations_sha256_check
    CHECK (specification_sha256 ~ '^[0-9a-f]{64}$'),
  CONSTRAINT commercial_specification_confirmations_snapshot_version_check
    CHECK (
      specification_snapshot ->> 'specificationVersion'
        = 'commercial_specification_snapshot_v1'
    )
);

ALTER TABLE public.commercial_specification_confirmations
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.commercial_specification_confirmations
  FROM public, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.commercial_specification_confirmations
  TO service_role;

-- Minimum prerequisite read needed by both the server and insert-time guard.
GRANT SELECT ON TABLE public.first_preview_design_direction_confirmations
  TO service_role;

CREATE FUNCTION public.enforce_prior_design_direction_confirmation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.first_preview_design_direction_confirmations AS confirmation
    WHERE confirmation.concept_brief_id = NEW.concept_brief_id
      AND confirmation.ai_sketch_output_id = NEW.ai_sketch_output_id
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'commercial specification requires prior exact design-direction confirmation';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_prior_design_direction_confirmation()
  FROM public, anon, authenticated;

CREATE TRIGGER commercial_specifications_require_design_confirmation
BEFORE INSERT ON public.commercial_specification_confirmations
FOR EACH ROW
EXECUTE FUNCTION public.enforce_prior_design_direction_confirmation();

-- Metadata-only verification. No customer rows or specification content.
SELECT
  table_schema,
  table_name,
  ordinal_position,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'commercial_specification_confirmations'
ORDER BY ordinal_position;

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
  AND relation.relname = 'commercial_specification_confirmations'
ORDER BY constraint_object.conname;

SELECT
  table_schema,
  table_name,
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN (
    'commercial_specification_confirmations',
    'first_preview_design_direction_confirmations'
  )
ORDER BY table_name, grantee, privilege_type;

COMMIT;
