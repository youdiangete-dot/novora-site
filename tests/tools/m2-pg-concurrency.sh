#!/bin/sh
set -eu
psql -X -q -A -t -v ON_ERROR_STOP=1 -U postgres -d postgres > /tmp/m2-first.out <<'SQL' &
BEGIN;
SET ROLE service_role;
SELECT outcome FROM public.m2_create_scoped_receipt(repeat('d',64),'concurrent',repeat('4',32),repeat('e',64),'{"public_reference":"NOVORA-CB-20261030-AB99"}'::jsonb,'{}'::jsonb);
SELECT pg_sleep(2);
COMMIT;
SQL
first=$!
sleep 1
psql -X -q -A -t -v ON_ERROR_STOP=1 -U postgres -d postgres > /tmp/m2-second.out <<'SQL'
SET ROLE service_role;
SELECT outcome FROM public.m2_create_scoped_receipt(repeat('d',64),'concurrent',repeat('4',32),repeat('e',64),'{"public_reference":"NOVORA-CB-20261030-CD99"}'::jsonb,'{}'::jsonb);
SQL
wait "$first"
test "$(sed '/^$/d' /tmp/m2-first.out)" = created
test "$(sed '/^$/d' /tmp/m2-second.out)" = existing
psql -X -q -v ON_ERROR_STOP=1 -U postgres -d postgres <<'SQL'
DO $$ BEGIN
  IF (SELECT count(*) FROM public.m2_scoped_submission_receipts WHERE invitation_identity='concurrent') <> 1 THEN RAISE EXCEPTION 'concurrent receipt count'; END IF;
  IF (SELECT count(*) FROM public.concept_briefs WHERE public_reference IN ('NOVORA-CB-20261030-AB99','NOVORA-CB-20261030-CD99')) <> 1 THEN RAISE EXCEPTION 'concurrent brief count'; END IF;
  IF (SELECT count(*) FROM public.concept_brief_contacts c JOIN public.m2_scoped_submission_receipts r ON r.concept_brief_id=c.concept_brief_id WHERE r.invitation_identity='concurrent') <> 1 THEN RAISE EXCEPTION 'concurrent contact count'; END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace CROSS JOIN (VALUES ('anon'),('authenticated')) x(role_name) WHERE n.nspname='public' AND p.proname IN ('m2_create_scoped_receipt','m2_read_scoped_receipt','m2_claim_scoped_publish','m2_finish_scoped_publish') AND has_function_privilege(x.role_name,p.oid,'EXECUTE')) THEN RAISE EXCEPTION 'rpc privilege'; END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('m2_create_scoped_receipt','m2_read_scoped_receipt','m2_claim_scoped_publish','m2_finish_scoped_publish') AND (p.prosecdef OR p.proconfig IS DISTINCT FROM ARRAY['search_path=""'] OR p.prosrc ~* '\mexecute\M')) THEN RAISE EXCEPTION 'function security'; END IF;
END $$;
SELECT 'PASS concurrency: created/existing, one brief/contact/receipt; PASS rpc privilege matrix; PASS invoker/search_path/no dynamic SQL';
SHOW server_version;
SQL
printf 'ASSERT_COUNT=7\n'
