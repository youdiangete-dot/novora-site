-- NOVORA M4-4 durable commercial order record candidate only.
-- CANDIDATE ONLY. NOT EXECUTED.
-- Requires a separate Owner-approved live SQL Gate before execution.
-- Requires the M4-3 public.commercial_payments foundation to exist first.

BEGIN;

SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

CREATE TABLE public.commercial_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_reference text NOT NULL UNIQUE DEFAULT (
    'NOVORA-O-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 24))
  ),
  order_version text NOT NULL DEFAULT 'commercial_order_v1',
  commercial_payment_reference text NOT NULL UNIQUE
    REFERENCES public.commercial_payments (payment_reference),
  commercial_quotation_reference text NOT NULL UNIQUE
    REFERENCES public.commercial_quotations (quote_reference),
  amount_minor bigint NOT NULL,
  currency text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT commercial_orders_reference_check
    CHECK (order_reference ~ '^NOVORA-O-[A-F0-9]{24}$'),
  CONSTRAINT commercial_orders_version_check
    CHECK (order_version = 'commercial_order_v1'),
  CONSTRAINT commercial_orders_amount_minor_check
    CHECK (amount_minor >= 0 AND amount_minor <= 9007199254740991),
  CONSTRAINT commercial_orders_currency_check
    CHECK (currency ~ '^[A-Z]{3}$')
);

ALTER TABLE public.commercial_orders ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.commercial_orders
  FROM public, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.commercial_orders TO service_role;

CREATE OR REPLACE FUNCTION public.create_commercial_order_after_paid_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status <> 'paid' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'paid' THEN
      RETURN NEW;
    END IF;
  END IF;

  INSERT INTO public.commercial_orders (
    commercial_payment_reference,
    commercial_quotation_reference,
    amount_minor,
    currency
  ) VALUES (
    NEW.payment_reference,
    NEW.commercial_quotation_reference,
    NEW.amount_minor,
    NEW.currency
  );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.create_commercial_order_after_paid_payment()
  FROM public, anon, authenticated, service_role;

CREATE TRIGGER commercial_payments_create_order_after_paid
AFTER INSERT OR UPDATE OF status ON public.commercial_payments
FOR EACH ROW
EXECUTE FUNCTION public.create_commercial_order_after_paid_payment();

COMMIT;
