-- M4-2 candidate only.
-- NOT EXECUTED. Separate Owner approval is required for live SQL execution.

BEGIN;

SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

CREATE TABLE public.commercial_quotations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  quote_reference text NOT NULL,
  commercial_specification_confirmation_id uuid NOT NULL,
  quotation_version text NOT NULL,
  quotation_snapshot jsonb NOT NULL,
  quotation_sha256 text NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT commercial_quotations_pkey
    PRIMARY KEY (id),
  CONSTRAINT commercial_quotations_quote_reference_key
    UNIQUE (quote_reference),
  CONSTRAINT commercial_quotations_specification_confirmation_fkey
    FOREIGN KEY (commercial_specification_confirmation_id)
    REFERENCES public.commercial_specification_confirmations (id)
    ON UPDATE NO ACTION
    ON DELETE NO ACTION,
  CONSTRAINT commercial_quotations_version_check
    CHECK (quotation_version = 'commercial_quotation_v1'),
  CONSTRAINT commercial_quotations_sha256_check
    CHECK (quotation_sha256 ~ '^[0-9a-f]{64}$'),
  CONSTRAINT commercial_quotations_snapshot_version_check
    CHECK (
      quotation_snapshot ->> 'quotationVersion' = 'commercial_quotation_v1'
    ),
  CONSTRAINT commercial_quotations_exact_quote_key
    UNIQUE (
      commercial_specification_confirmation_id,
      quotation_sha256
    )
);

ALTER TABLE public.commercial_quotations
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.commercial_quotations
  FROM public, anon, authenticated;

GRANT SELECT, INSERT ON TABLE public.commercial_quotations
  TO service_role;

CREATE FUNCTION public.enforce_current_commercial_quotation_basis()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.commercial_specification_confirmations AS basis
    JOIN public.ai_sketch_outputs AS output
      ON output.id = basis.ai_sketch_output_id
      AND output.concept_brief_id = basis.concept_brief_id
    WHERE basis.id = NEW.commercial_specification_confirmation_id
      AND output.readiness_status = 'first_preview_ready'
      AND output.is_current_customer_preview = true
      AND output.readiness_revoked_at IS NULL
      AND basis.id = (
        SELECT latest.id
        FROM public.commercial_specification_confirmations AS latest
        WHERE latest.concept_brief_id = basis.concept_brief_id
          AND latest.ai_sketch_output_id = basis.ai_sketch_output_id
        ORDER BY latest.confirmed_at DESC, latest.created_at DESC, latest.id DESC
        LIMIT 1
      )
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'commercial quotation requires the latest exact current specification confirmation';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_current_commercial_quotation_basis()
  FROM public, anon, authenticated;

CREATE TRIGGER commercial_quotations_require_current_latest_basis
BEFORE INSERT ON public.commercial_quotations
FOR EACH ROW
EXECUTE FUNCTION public.enforce_current_commercial_quotation_basis();

COMMIT;
