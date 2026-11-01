-- UNEXECUTED. Load with \i in each open psql session; do not use psql -f,
-- which disconnects and rolls back. Coordinator explicitly COMMITs each side.
\set ON_ERROR_STOP on
select :'race'='capacity' as capacity, :'race'='dispatch' as dispatch,
  :'race'='payment' as payment, :'race'='sandbox' as sandbox,
  :'race'='release_first' as release_first, :'race'='claim_first' as claim_first,
  :'worker'='A' as worker_a \gset
begin;
select set_config('application_name','test01_'||:'race'||'_'||:'worker',true);
set local role service_role;
\if :capacity
select public.novora_test_image_package_reserve(jsonb_build_object(
  'purchaseId','10000000-0000-4000-8000-000000000001','subjectId','20000000-0000-4000-8000-000000000001',
  'owner',jsonb_build_object('scope',repeat('a',64),'identity','TEST-owner'),
  'operationId',case when :'worker'='A' then '40000000-0000-4000-8000-000000000005' else '40000000-0000-4000-8000-000000000006' end,
  'reservationId',case when :'worker'='A' then '40000000-0000-4000-8000-000000000005' else '40000000-0000-4000-8000-000000000006' end,
  'kind','initial','briefId','30000000-0000-4000-8000-000000000001'));
\elif :dispatch
select public.novora_test_image_package_claim_dispatch(jsonb_build_object(
  'owner',jsonb_build_object('scope',repeat('a',64),'identity','TEST-owner'),
  'operationId','40000000-0000-4000-8000-000000000001','reservationId','40000000-0000-4000-8000-000000000001',
  'kind','initial','briefId','30000000-0000-4000-8000-000000000001'));
\elif :payment
select public.novora_test_image_package_grant(jsonb_build_object(
  'purchaseId',case when :'worker'='A' then '10000000-0000-4000-8000-000000000002' else '10000000-0000-4000-8000-000000000003' end,
  'subjectId','20000000-0000-4000-8000-000000000001','provider','manual_test','packageCode','TEST-01',
  'environment','TEST','amountMinor',100,'currency','USD','paymentReference','TEST-CONCURRENCY-SHARED',
  'confirmedAt',to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),'TEST-owner');
\elif :sandbox
select public.novora_test_image_package_sandbox_claim('10000000-0000-4000-8000-000000000004',
  jsonb_build_object('scope',repeat('a',64),'identity','TEST-owner'),'create',null,repeat('1',32),repeat('a',64));
\elif :release_first
\if :worker_a
select public.novora_test_image_package_settle_dispatch(jsonb_build_object(
  'owner',jsonb_build_object('scope',repeat('a',64),'identity','TEST-owner'),
  'operationId','40000000-0000-4000-8000-000000000002','reservationId','40000000-0000-4000-8000-000000000002',
  'kind','initial','briefId','30000000-0000-4000-8000-000000000001',
  'outcome','definite_failure','failurePhase','before_dispatch','providerCostUsdMicros',0));
\else
select public.novora_test_image_package_claim_dispatch(jsonb_build_object(
  'owner',jsonb_build_object('scope',repeat('a',64),'identity','TEST-owner'),
  'operationId','40000000-0000-4000-8000-000000000002','reservationId','40000000-0000-4000-8000-000000000002',
  'kind','initial','briefId','30000000-0000-4000-8000-000000000001'));
\endif
\elif :claim_first
\if :worker_a
select public.novora_test_image_package_claim_dispatch(jsonb_build_object(
  'owner',jsonb_build_object('scope',repeat('a',64),'identity','TEST-owner'),
  'operationId','40000000-0000-4000-8000-000000000003','reservationId','40000000-0000-4000-8000-000000000003',
  'kind','initial','briefId','30000000-0000-4000-8000-000000000001'));
\else
select public.novora_test_image_package_settle_dispatch(jsonb_build_object(
  'owner',jsonb_build_object('scope',repeat('a',64),'identity','TEST-owner'),
  'operationId','40000000-0000-4000-8000-000000000003','reservationId','40000000-0000-4000-8000-000000000003',
  'kind','initial','briefId','30000000-0000-4000-8000-000000000001',
  'outcome','definite_failure','failurePhase','before_dispatch','providerCostUsdMicros',0));
\endif
\else
\echo INVALID_RACE_STOP
rollback;
\quit 1
\endif
-- Intentionally leave the transaction open; coordinator observes B blocked,
-- then sends COMMIT to A and finally COMMIT to B.
