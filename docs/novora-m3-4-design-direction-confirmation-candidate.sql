-- M3-4 candidate only.
-- NOT EXECUTED.
-- Separate Owner approval is required before any live execution.
-- No live database operation occurred in this task.

BEGIN;

SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

CREATE TABLE public.first_preview_design_direction_confirmations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  concept_brief_id uuid NOT NULL,
  ai_sketch_output_id uuid NOT NULL,
  confirmation_version text NOT NULL,
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fp_design_direction_confirmations_pkey
    PRIMARY KEY (id),
  CONSTRAINT fp_design_direction_confirmations_brief_fkey
    FOREIGN KEY (concept_brief_id)
    REFERENCES public.concept_briefs (id)
    ON UPDATE NO ACTION
    ON DELETE NO ACTION,
  CONSTRAINT fp_design_direction_confirmations_output_brief_fkey
    FOREIGN KEY (ai_sketch_output_id, concept_brief_id)
    REFERENCES public.ai_sketch_outputs (id, concept_brief_id)
    ON UPDATE NO ACTION
    ON DELETE NO ACTION,
  CONSTRAINT fp_design_direction_confirmations_pair_key
    UNIQUE (concept_brief_id, ai_sketch_output_id),
  CONSTRAINT fp_design_direction_confirmations_version_check
    CHECK (
      confirmation_version = 'customer_design_direction_confirmation_v1'
    )
);

ALTER TABLE public.first_preview_design_direction_confirmations
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.first_preview_design_direction_confirmations
  FROM public, anon, authenticated;
GRANT INSERT ON TABLE public.first_preview_design_direction_confirmations
  TO service_role;

CREATE FUNCTION public.enforce_current_ready_design_direction_confirmation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.ai_sketch_outputs AS output
    WHERE output.id = NEW.ai_sketch_output_id
      AND output.concept_brief_id = NEW.concept_brief_id
      AND output.readiness_status = 'first_preview_ready'
      AND output.is_current_customer_preview IS TRUE
      AND output.readiness_revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'design direction confirmation output is not current and ready';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION
  public.enforce_current_ready_design_direction_confirmation()
  FROM public, anon, authenticated;

CREATE TRIGGER fp_design_direction_confirmations_current_ready_insert
BEFORE INSERT ON public.first_preview_design_direction_confirmations
FOR EACH ROW
EXECUTE FUNCTION
  public.enforce_current_ready_design_direction_confirmation();

-- Metadata-only verification: exact columns, order, types, defaults, and nullability.
SELECT
  table_schema,
  table_name,
  ordinal_position,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'first_preview_design_direction_confirmations'
ORDER BY ordinal_position;

-- Metadata-only verification: primary key, foreign keys, uniqueness, and version check.
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
  AND relation.relname = 'first_preview_design_direction_confirmations'
ORDER BY constraint_object.conname;

-- Metadata-only verification: RLS is enabled and no forced RLS behavior was added.
SELECT
  namespace.nspname AS table_schema,
  relation.relname AS table_name,
  relation.relrowsecurity AS rls_enabled,
  relation.relforcerowsecurity AS rls_forced
FROM pg_catalog.pg_class AS relation
JOIN pg_catalog.pg_namespace AS namespace
  ON namespace.oid = relation.relnamespace
WHERE namespace.nspname = 'public'
  AND relation.relname = 'first_preview_design_direction_confirmations';

-- Metadata-only verification: only the intended service_role table grants remain.
SELECT
  table_schema,
  table_name,
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'first_preview_design_direction_confirmations'
ORDER BY grantee, privilege_type;

-- Metadata-only verification: insert-time guard identity and definition.
SELECT
  namespace.nspname AS table_schema,
  relation.relname AS table_name,
  trigger_object.tgname AS trigger_name,
  pg_catalog.pg_get_triggerdef(trigger_object.oid, true) AS definition
FROM pg_catalog.pg_trigger AS trigger_object
JOIN pg_catalog.pg_class AS relation
  ON relation.oid = trigger_object.tgrelid
JOIN pg_catalog.pg_namespace AS namespace
  ON namespace.oid = relation.relnamespace
WHERE namespace.nspname = 'public'
  AND relation.relname = 'first_preview_design_direction_confirmations'
  AND trigger_object.tgisinternal IS FALSE
ORDER BY trigger_object.tgname;

COMMIT;
