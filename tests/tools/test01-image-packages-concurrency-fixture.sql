-- UNEXECUTED. ONLY for a separately authorized empty disposable synthetic DB.
-- Requires candidate schema and Supabase-style roles. Retains synthetic rows
-- for two independent sessions; do not apply to online or customer databases.
begin;
do $$
declare owner jsonb := jsonb_build_object('scope',repeat('a',64),'identity','TEST-owner');
  purchase jsonb; i integer; op uuid;
begin
  purchase := jsonb_build_object('purchaseId','10000000-0000-4000-8000-000000000001',
    'subjectId','20000000-0000-4000-8000-000000000001','owner',owner,
    'provider','manual_test','sandboxMerchantId',null,'packageCode','TEST-01','environment','TEST','amountMinor',100,'currency','USD');
  perform public.novora_test_image_package_create(purchase);
  perform public.novora_test_image_package_grant(purchase||jsonb_build_object('paymentReference','TEST-CONCURRENCY-BASE',
    'confirmedAt',to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),'TEST-owner');
  for i in 1..4 loop
    op := ('40000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid;
    perform public.novora_test_image_package_reserve(jsonb_build_object('purchaseId',purchase->>'purchaseId',
      'subjectId',purchase->>'subjectId','owner',owner,'operationId',op,'reservationId',op,'kind','initial',
      'briefId','30000000-0000-4000-8000-000000000001'));
  end loop;
  perform public.novora_test_image_package_create(purchase||'{"purchaseId":"10000000-0000-4000-8000-000000000002"}');
  perform public.novora_test_image_package_create(purchase||'{"purchaseId":"10000000-0000-4000-8000-000000000003"}');
  perform public.novora_test_image_package_create(purchase||'{"purchaseId":"10000000-0000-4000-8000-000000000004","provider":"paypal_sandbox","sandboxMerchantId":"TESTMERCHANT1"}');
  if (select count(*) from public.novora_test_image_package_purchases
    where purchase_id in ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002',
      '10000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000004'))<>4
    or (select count(*) from public.novora_test_image_package_uses
      where purchase_id='10000000-0000-4000-8000-000000000001' and state='reserved')<>4
    or not exists(select 1 from public.novora_test_image_package_purchases
      where purchase_id='10000000-0000-4000-8000-000000000001' and granted_at is not null) then
    raise exception 'TEST01_CONCURRENCY_FIXTURE_INCOMPLETE'; end if;
end $$;
commit;
