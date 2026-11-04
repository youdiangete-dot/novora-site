-- LOCAL CANDIDATE ONLY. Not executed. Requires a separate exact live SQL approval.
-- Requires M4-3/M4-4 and the M5-2 CAD handoff candidate. Does not authorize or send production work.
BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';
CREATE TABLE public.commercial_production_handoffs (
  order_reference text PRIMARY KEY REFERENCES public.commercial_cad_handoffs(order_reference),
  manual_decision_reference text NOT NULL CHECK (
    manual_decision_reference ~ '^[A-Za-z0-9][A-Za-z0-9 ._/-]{0,119}$' AND manual_decision_reference = btrim(manual_decision_reference)
  ),
  handoff_reference text NOT NULL CHECK (
    handoff_reference ~ '^[A-Za-z0-9][A-Za-z0-9 ._/-]{0,119}$' AND handoff_reference = btrim(handoff_reference)
  ),
  recorded_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);
ALTER TABLE public.commercial_production_handoffs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.commercial_production_handoffs FROM public, anon, authenticated, service_role;
GRANT SELECT, INSERT ON TABLE public.commercial_production_handoffs TO service_role;
CREATE FUNCTION public.guard_commercial_production_handoff() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN RAISE EXCEPTION 'Production handoff records are append-only'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.commercial_cad_handoffs c
    JOIN public.commercial_orders o ON o.order_reference = c.order_reference
    JOIN public.commercial_payments p ON p.payment_reference = o.commercial_payment_reference
    WHERE c.order_reference = NEW.order_reference AND p.status = 'paid' AND p.paid_at IS NOT NULL
      AND p.commercial_quotation_reference = o.commercial_quotation_reference
      AND p.amount_minor = o.amount_minor AND p.currency = o.currency
  ) THEN RAISE EXCEPTION 'An exact CAD handoff and paid bound order are required'; END IF;
  NEW.recorded_at := timezone('utc', now());
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_commercial_production_handoff() FROM public, anon, authenticated, service_role;
CREATE TRIGGER commercial_production_handoff_guard BEFORE INSERT OR UPDATE OR DELETE
ON public.commercial_production_handoffs FOR EACH ROW EXECUTE FUNCTION public.guard_commercial_production_handoff();
COMMIT;
