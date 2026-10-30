\set ON_ERROR_STOP on
-- Synthetic role/grants are confined to this transaction and rolled back.
BEGIN;
CREATE ROLE m2_local_rls_probe NOLOGIN NOBYPASSRLS;
GRANT USAGE ON SCHEMA public TO m2_local_rls_probe;
GRANT SELECT ON public.m2_scoped_submission_receipts TO m2_local_rls_probe;
SET LOCAL ROLE m2_local_rls_probe;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.m2_scoped_submission_receipts) <> 0 THEN
    RAISE EXCEPTION 'RLS exposed receipt rows';
  END IF;
  RAISE NOTICE 'PASS rls_no_policy_hides_existing_rows';
END $$;
RESET ROLE;
REVOKE SELECT ON public.m2_scoped_submission_receipts FROM m2_local_rls_probe;
GRANT EXECUTE ON FUNCTION public.m2_read_scoped_receipt(text,text,text) TO m2_local_rls_probe;
SET LOCAL ROLE m2_local_rls_probe;
DO $$ BEGIN
  BEGIN
    PERFORM * FROM public.m2_read_scoped_receipt(repeat('a',64),'fixture',repeat('1',32));
    RAISE EXCEPTION 'expected insufficient_privilege from invoker RPC';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS invoker_rpc_requires_caller_table_select';
  END;
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$ BEGIN
  BEGIN
    PERFORM * FROM public.m2_read_scoped_receipt(repeat('a',64),'fixture',repeat('1',32));
    RAISE EXCEPTION 'expected insufficient_privilege for anon';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS anon_rpc_denied';
  END;
END $$;
RESET ROLE;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  BEGIN
    PERFORM * FROM public.m2_read_scoped_receipt(repeat('a',64),'fixture',repeat('1',32));
    RAISE EXCEPTION 'expected insufficient_privilege for authenticated';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS authenticated_rpc_denied';
  END;
END $$;
RESET ROLE;
ROLLBACK;
SELECT 1 / ((NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='m2_local_rls_probe'))::int) AS temporary_role_rolled_back;
SELECT 'ASSERT_RLS=5';
