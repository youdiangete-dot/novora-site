\set ON_ERROR_STOP on
create temp table assert_extra (n int not null); insert into assert_extra values (0);
create function pg_temp.check_extra(v boolean, label text) returns void language plpgsql as $$ begin if v is distinct from true then raise exception 'ASSERT_FAIL %',label; end if; update assert_extra set n=n+1; raise notice 'PASS %',label; end $$;
select pg_temp.check_extra(not has_table_privilege('service_role','public.m2_scoped_submission_receipts','DELETE'),'service_no_delete');
select pg_temp.check_extra(has_table_privilege('service_role','public.m2_scoped_submission_receipts','SELECT') and has_table_privilege('service_role','public.m2_scoped_submission_receipts','INSERT') and has_table_privilege('service_role','public.m2_scoped_submission_receipts','UPDATE'),'service_table_minimum');
select pg_temp.check_extra(not exists (select 1 from pg_class c cross join lateral aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a where c.oid='public.m2_scoped_submission_receipts'::regclass and a.grantee=0),'public_no_table_grants');
select pg_temp.check_extra(not exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where n.nspname='public' and p.proname in ('m2_create_scoped_receipt','m2_read_scoped_receipt','m2_claim_scoped_publish','m2_finish_scoped_publish') and a.grantee=0),'public_no_rpc_grants');
create temp table before_read as select xmin::text as txid, stage, reason from public.m2_scoped_submission_receipts where invitation_identity='fixture';
select * from public.m2_read_scoped_receipt(repeat('a',64),'fixture',repeat('1',32));
select pg_temp.check_extra((select b.txid=r.xmin::text and b.stage=r.stage and b.reason=r.reason from before_read b cross join public.m2_scoped_submission_receipts r where r.invitation_identity='fixture'),'read_does_not_write');
select pg_temp.check_extra((select outcome='existing' and stage='UNKNOWN' from public.m2_create_scoped_receipt(repeat('a',64),'fixture',repeat('1',32),repeat('b',64),'{}','{}')),'unknown_duplicate_unchanged');
select pg_temp.check_extra(not public.m2_finish_scoped_publish(repeat('a',64),'fixture',repeat('1',32),'published','UNKNOWN'),'invalid_reason_denied');
select 'ASSERT_EXTRA='||n from assert_extra;
