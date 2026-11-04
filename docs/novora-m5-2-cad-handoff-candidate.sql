-- LOCAL CANDIDATE ONLY. Not executed. A separate exact live SQL approval is required.
-- Requires the M4-3 payment and M4-4 order candidates. Does not send any handoff.
BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';
CREATE TABLE public.commercial_cad_handoffs (
  order_reference text PRIMARY KEY REFERENCES public.commercial_orders(order_reference),
  handoff_reference text NOT NULL CHECK (
    handoff_reference ~ '^[A-Za-z0-9][A-Za-z0-9 ._/-]{0,119}$'
    AND handoff_reference = btrim(handoff_reference)
  ),
  recorded_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);
ALTER TABLE public.commercial_cad_handoffs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.commercial_cad_handoffs FROM public, anon, authenticated, service_role;
GRANT SELECT, INSERT ON TABLE public.commercial_cad_handoffs TO service_role;

CREATE FUNCTION public.guard_commercial_cad_handoff() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION 'CAD handoff records are append-only';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.commercial_orders o
    JOIN public.commercial_payments p ON p.payment_reference = o.commercial_payment_reference
    WHERE o.order_reference = NEW.order_reference AND p.status = 'paid' AND p.paid_at IS NOT NULL
      AND p.commercial_quotation_reference = o.commercial_quotation_reference
      AND p.amount_minor = o.amount_minor AND p.currency = o.currency
  ) THEN
    RAISE EXCEPTION 'A paid bound order is required';
  END IF;
  -- The database, not a submitted timestamp, records the handoff time.
  NEW.recorded_at := timezone('utc', now());
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_commercial_cad_handoff() FROM public, anon, authenticated, service_role;
CREATE TRIGGER commercial_cad_handoff_guard BEFORE INSERT OR UPDATE OR DELETE
ON public.commercial_cad_handoffs FOR EACH ROW EXECUTE FUNCTION public.guard_commercial_cad_handoff();
COMMIT;
