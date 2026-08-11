-- NOVORA M4-3 provider-neutral commercial payment foundation candidate.
-- CANDIDATE ONLY. DO NOT EXECUTE WITHOUT A SEPARATE OWNER-APPROVED SQL GATE.

BEGIN;

SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

CREATE TABLE public.commercial_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_reference text NOT NULL UNIQUE,
  commercial_quotation_reference text NOT NULL
    REFERENCES public.commercial_quotations (quote_reference),
  payment_version text NOT NULL DEFAULT 'commercial_payment_v1',
  provider_key text NOT NULL,
  provider_checkout_id text,
  provider_payment_id text,
  amount_minor bigint NOT NULL,
  currency text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  checkout_url text,
  checkout_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  paid_at timestamptz,
  failed_at timestamptz,
  CONSTRAINT commercial_payments_version_check
    CHECK (payment_version = 'commercial_payment_v1'),
  CONSTRAINT commercial_payments_reference_check
    CHECK (payment_reference ~ '^NOVORA-P-[A-F0-9]{24}$'),
  CONSTRAINT commercial_payments_provider_key_check
    CHECK (provider_key ~ '^[a-z0-9][a-z0-9_-]{0,63}$'),
  CONSTRAINT commercial_payments_currency_check
    CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT commercial_payments_amount_minor_check
    CHECK (amount_minor >= 0 AND amount_minor <= 9007199254740991),
  CONSTRAINT commercial_payments_status_check
    CHECK (status IN ('pending', 'paid', 'failed')),
  CONSTRAINT commercial_payments_paid_timestamp_check
    CHECK (status <> 'paid' OR paid_at IS NOT NULL),
  CONSTRAINT commercial_payments_failed_timestamp_check
    CHECK (status <> 'failed' OR failed_at IS NOT NULL)
);

CREATE UNIQUE INDEX commercial_payments_provider_checkout_identity_unique
  ON public.commercial_payments (provider_key, provider_checkout_id)
  WHERE provider_checkout_id IS NOT NULL;

CREATE UNIQUE INDEX commercial_payments_provider_payment_identity_unique
  ON public.commercial_payments (provider_key, provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;

CREATE UNIQUE INDEX commercial_payments_one_pending_per_quote_provider
  ON public.commercial_payments (
    commercial_quotation_reference,
    provider_key
  )
  WHERE status = 'pending';

CREATE TABLE public.commercial_payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commercial_payment_id uuid NOT NULL
    REFERENCES public.commercial_payments (id),
  provider_key text NOT NULL,
  provider_event_id text NOT NULL,
  provider_event_type text NOT NULL,
  normalized_status text NOT NULL,
  payload_sha256 text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT commercial_payment_events_provider_event_unique
    UNIQUE (provider_key, provider_event_id),
  CONSTRAINT commercial_payment_events_provider_key_check
    CHECK (provider_key ~ '^[a-z0-9][a-z0-9_-]{0,63}$'),
  CONSTRAINT commercial_payment_events_status_check
    CHECK (normalized_status IN ('pending', 'paid', 'failed')),
  CONSTRAINT commercial_payment_events_payload_sha256_check
    CHECK (payload_sha256 ~ '^[0-9a-f]{64}$')
);

ALTER TABLE public.commercial_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_payment_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.commercial_payments
  FROM public, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.commercial_payment_events
  FROM public, anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON TABLE public.commercial_payments
  TO service_role;
GRANT SELECT, INSERT ON TABLE public.commercial_payment_events
  TO service_role;

CREATE OR REPLACE FUNCTION public.commercial_payments_preserve_authority()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.payment_reference IS DISTINCT FROM OLD.payment_reference
    OR NEW.commercial_quotation_reference IS DISTINCT FROM OLD.commercial_quotation_reference
    OR NEW.payment_version IS DISTINCT FROM OLD.payment_version
    OR NEW.provider_key IS DISTINCT FROM OLD.provider_key
    OR NEW.amount_minor IS DISTINCT FROM OLD.amount_minor
    OR NEW.currency IS DISTINCT FROM OLD.currency
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'commercial payment authority fields are immutable';
  END IF;

  IF OLD.status = 'paid' AND NEW.status <> 'paid' THEN
    RAISE EXCEPTION 'paid commercial payment is terminal';
  END IF;

  IF NEW.status = 'paid' THEN
    NEW.paid_at := COALESCE(OLD.paid_at, NEW.paid_at, timezone('utc', now()));
    NEW.failed_at := NULL;
  ELSIF NEW.status = 'failed' THEN
    NEW.failed_at := COALESCE(OLD.failed_at, NEW.failed_at, timezone('utc', now()));
  END IF;
  NEW.updated_at := timezone('utc', now());
  RETURN NEW;
END;
$$;

CREATE TRIGGER commercial_payments_preserve_authority_before_update
BEFORE UPDATE ON public.commercial_payments
FOR EACH ROW
EXECUTE FUNCTION public.commercial_payments_preserve_authority();

REVOKE ALL ON FUNCTION public.commercial_payments_preserve_authority()
  FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.apply_commercial_payment_event(
  p_provider_key text,
  p_payment_reference text,
  p_provider_event_id text,
  p_provider_event_type text,
  p_normalized_status text,
  p_provider_payment_id text,
  p_payload_sha256 text
)
RETURNS TABLE (payment_found boolean, duplicate boolean, payment jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_payment public.commercial_payments%ROWTYPE;
  v_inserted_count integer;
BEGIN
  IF p_provider_key !~ '^[a-z0-9][a-z0-9_-]{0,63}$'
    OR p_payment_reference !~ '^NOVORA-P-[A-F0-9]{24}$'
    OR p_provider_event_id IS NULL OR length(p_provider_event_id) NOT BETWEEN 1 AND 255
    OR p_provider_event_type IS NULL OR length(p_provider_event_type) NOT BETWEEN 1 AND 160
    OR p_normalized_status NOT IN ('pending', 'paid', 'failed')
    OR p_payload_sha256 !~ '^[0-9a-f]{64}$'
  THEN
    RAISE EXCEPTION 'invalid normalized commercial payment event';
  END IF;

  SELECT p.*
    INTO v_payment
    FROM public.commercial_payments AS p
   WHERE p.provider_key = p_provider_key
     AND p.payment_reference = p_payment_reference
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, false, NULL::jsonb;
    RETURN;
  END IF;

  INSERT INTO public.commercial_payment_events (
    commercial_payment_id,
    provider_key,
    provider_event_id,
    provider_event_type,
    normalized_status,
    payload_sha256
  ) VALUES (
    v_payment.id,
    p_provider_key,
    p_provider_event_id,
    p_provider_event_type,
    p_normalized_status,
    p_payload_sha256
  )
  ON CONFLICT (provider_key, provider_event_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
  IF v_inserted_count = 0 THEN
    RETURN QUERY SELECT true, true, to_jsonb(v_payment);
    RETURN;
  END IF;

  UPDATE public.commercial_payments AS p
     SET status = CASE
           WHEN p.status = 'paid' THEN 'paid'
           ELSE p_normalized_status
         END,
         provider_payment_id = COALESCE(p.provider_payment_id, p_provider_payment_id),
         paid_at = CASE
           WHEN p.status = 'paid' OR p_normalized_status = 'paid'
             THEN COALESCE(p.paid_at, timezone('utc', now()))
           ELSE p.paid_at
         END,
         failed_at = CASE
           WHEN p.status <> 'paid' AND p_normalized_status = 'failed'
             THEN COALESCE(p.failed_at, timezone('utc', now()))
           ELSE p.failed_at
         END
   WHERE p.id = v_payment.id
   RETURNING p.* INTO v_payment;

  RETURN QUERY SELECT true, false, to_jsonb(v_payment);
END;
$$;

REVOKE ALL ON FUNCTION public.apply_commercial_payment_event(
  text, text, text, text, text, text, text
) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_commercial_payment_event(
  text, text, text, text, text, text, text
) TO service_role;

COMMIT;
