-- UNEXECUTED. Fresh connection after all six races committed in listed order.
\set ON_ERROR_STOP on
begin;
set local role service_role;
do $$
declare binding jsonb:=jsonb_build_object('owner',jsonb_build_object('scope',repeat('a',64),'identity','TEST-owner'),
  'operationId','40000000-0000-4000-8000-000000000001','reservationId','40000000-0000-4000-8000-000000000001',
  'kind','initial','briefId','30000000-0000-4000-8000-000000000001');
  result jsonb;
begin
  if (select count(*) from public.novora_test_image_package_uses where purchase_id='10000000-0000-4000-8000-000000000001')<>5
    or exists(select 1 from public.novora_test_image_package_uses where operation_id='40000000-0000-4000-8000-000000000006') then
    raise exception 'fifth-slot race violated capacity'; end if;
  if not exists(select 1 from public.novora_test_image_package_uses
    where operation_id='40000000-0000-4000-8000-000000000002' and state='released' and dispatch_claimed_at is null)
    or not exists(select 1 from public.novora_test_image_package_uses
      where operation_id='40000000-0000-4000-8000-000000000003' and state='reserved' and dispatch_claimed_at is not null) then
    raise exception 'release-vs-claim race violated winner semantics'; end if;
  if (select count(*) from public.novora_test_image_package_purchases where payment_reference='TEST-CONCURRENCY-SHARED')<>1 then
    raise exception 'payment reference granted more/less than once'; end if;
  if (select count(*) from public.novora_test_image_package_sandbox_operations
    where purchase_id='10000000-0000-4000-8000-000000000004' and kind='create')<>1 then
    raise exception 'duplicate/missing Sandbox operation'; end if;
  result:=public.novora_test_image_package_settle_dispatch(binding||'{"outcome":"unknown","providerCostUsdMicros":12345}');
  if result->>'state' is distinct from 'unknown' then raise exception 'UNKNOWN did not hold'; end if;
  if public.novora_test_image_package_claim_dispatch(binding)->>'claim' is distinct from 'unknown' then raise exception 'UNKNOWN re-claimed'; end if;
  result:=public.novora_test_image_package_settle_dispatch(binding||'{"outcome":"definite_failure","providerCostUsdMicros":12000}');
  if result->>'state' is distinct from 'released' or result->>'providerCostUsdMicros' is distinct from '12345' then
    raise exception 'release erased cost'; end if;
  if public.novora_test_image_package_claim_dispatch(binding)->>'claim' is distinct from 'already_claimed' then raise exception 'released claimed use reopened'; end if;
  result:=public.novora_test_image_package_sandbox_complete('10000000-0000-4000-8000-000000000004',
    binding->'owner','create',repeat('1',32),repeat('a',64),'{"state":"UNKNOWN","reason":"transport"}');
  if result->>'ok' is distinct from 'true' then raise exception 'journal UNKNOWN completion failed'; end if;
  result:=public.novora_test_image_package_sandbox_claim('10000000-0000-4000-8000-000000000004',
    binding->'owner','create',null,repeat('1',32),repeat('a',64));
  if result->>'claim' is distinct from 'completed' or result->'result'->>'state' is distinct from 'UNKNOWN' then
    raise exception 'journal UNKNOWN reacquired'; end if;
  raise notice 'TEST01_REAL_TWO_SESSION_RACE_PERSISTENCE_ASSERTIONS_PASS';
end $$;
commit;
