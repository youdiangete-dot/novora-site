-- LOCAL CANDIDATE ONLY. Not executed. Separate exact live SQL approval required.
-- Requires M4 paid orders, M5-2 CAD and M5-3 production handoffs.
-- Records an administrator-supplied offline reference; sends no goods/messages and proves no customer receipt.
BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';
CREATE TABLE public.commercial_delivery_handoffs (
  order_reference text PRIMARY KEY REFERENCES public.commercial_production_handoffs(order_reference),
  delivery_reference text NOT NULL CHECK (delivery_reference ~ '^[A-Za-z0-9][A-Za-z0-9 ._/-]{0,119}$' AND delivery_reference = btrim(delivery_reference)),
  recorded_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);
ALTER TABLE public.commercial_delivery_handoffs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.commercial_delivery_handoffs FROM public, anon, authenticated, service_role;
GRANT SELECT, INSERT ON TABLE public.commercial_delivery_handoffs TO service_role;
CREATE FUNCTION public.guard_commercial_delivery_handoff() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN RAISE EXCEPTION 'Delivery handoff records are append-only'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.commercial_production_handoffs h
    JOIN public.commercial_cad_handoffs c ON c.order_reference = h.order_reference
    JOIN public.commercial_orders o ON o.order_reference = c.order_reference
    JOIN public.commercial_payments p ON p.payment_reference = o.commercial_payment_reference
    WHERE h.order_reference = NEW.order_reference AND p.status = 'paid' AND p.paid_at IS NOT NULL
      AND p.commercial_quotation_reference = o.commercial_quotation_reference AND p.amount_minor = o.amount_minor AND p.currency = o.currency
  ) THEN RAISE EXCEPTION 'An exact paid order and prior handoff chain are required'; END IF;
  NEW.recorded_at := timezone('utc', now());
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_commercial_delivery_handoff() FROM public, anon, authenticated, service_role;
CREATE TRIGGER commercial_delivery_handoff_guard BEFORE INSERT OR UPDATE OR DELETE
ON public.commercial_delivery_handoffs FOR EACH ROW EXECUTE FUNCTION public.guard_commercial_delivery_handoff();
COMMIT;
