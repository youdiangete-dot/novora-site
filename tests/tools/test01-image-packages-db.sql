-- NOT EXECUTED. For an authorized disposable synthetic PostgreSQL only.
-- First apply the candidate in that empty database with Supabase-style roles.
-- Never run against customer data. All assertions below roll back their rows.
begin;
set local statement_timeout = '10s';
create function pg_temp.check_test01(ok boolean, label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'TEST01_ASSERT: %', label; end if; end $$;

do $$
declare
  p uuid := '123e4567-e89b-42d3-a456-426614174000';
  other_p uuid := '323e4567-e89b-42d3-a456-426614174000';
  subject uuid := '223e4567-e89b-42d3-a456-426614174000';
  purchase jsonb; payment jsonb; use_input jsonb; result jsonb; original jsonb;
  op uuid; i integer; kind text; balance integer; cost bigint;
begin
  purchase := jsonb_build_object('purchaseId',p,'subjectId',subject,'provider','manual_test',
    'packageCode','TEST-01','environment','TEST','amountMinor',100,'currency','USD');
  perform pg_temp.check_test01((public.novora_test_image_package_create(purchase)->>'ok')::boolean,'create');
  perform pg_temp.check_test01((public.novora_test_image_package_create(purchase)->>'ok')::boolean,'create replay');
  perform pg_temp.check_test01(public.novora_test_image_package_create(purchase||'{"environment":"LIVE"}') ->>'reason'='invalid','live denied');
  perform pg_temp.check_test01(public.novora_test_image_package_create(purchase||jsonb_build_object('subjectId',other_p)) ->>'reason'='conflict','subject immutable');
  use_input := jsonb_build_object('purchaseId',p,'subjectId',subject,'kind','initial',
    'operationId','423e4567-e89b-42d3-a456-426614174000');
  perform pg_temp.check_test01(public.novora_test_image_package_reserve(use_input)->>'reason'='denied','unpaid cannot reserve');
  payment := purchase || jsonb_build_object('paymentReference','TEST-DB-1',
    'confirmedAt',to_char((clock_timestamp()-interval '1 minute') at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));
  perform pg_temp.check_test01(public.novora_test_image_package_grant(payment,null)->>'reason'='invalid','manual missing verifier denied');
  perform pg_temp.check_test01(public.novora_test_image_package_grant(payment||'{"amountMinor":99}','TEST-owner')->>'reason'='invalid','amount mismatch');
  perform pg_temp.check_test01(public.novora_test_image_package_grant(payment||'{"currency":"EUR"}','TEST-owner')->>'reason'='invalid','currency mismatch');
  perform pg_temp.check_test01(public.novora_test_image_package_grant(payment||'{"environment":"LIVE"}','TEST-owner')->>'reason'='invalid','environment mismatch');
  original := public.novora_test_image_package_grant(payment,'TEST-owner');
  perform pg_temp.check_test01((original->>'ok')::boolean and original->>'duplicate'='false','first grant');
  perform pg_temp.check_test01((original->>'expiresAt')::timestamptz-(original->>'grantedAt')::timestamptz=interval '168 hours','exact expiry');
  result := public.novora_test_image_package_grant(payment,'TEST-owner-2');
  perform pg_temp.check_test01(result->>'duplicate'='true' and result->>'expiresAt'=original->>'expiresAt','grant replay immutable expiry');
  perform pg_temp.check_test01(public.novora_test_image_package_grant(payment||'{"paymentReference":"TEST-CHANGED"}','TEST-owner')->>'reason'='conflict','second payment cannot grant');
  perform public.novora_test_image_package_create(purchase||jsonb_build_object('purchaseId',other_p));
  perform pg_temp.check_test01(public.novora_test_image_package_grant(payment||jsonb_build_object('purchaseId',other_p),'TEST-owner')->>'reason'='conflict','global reference reuse denied');

  foreach kind in array array['initial','revision'] loop
    for i in 1..5 loop
      op := ('50000000-0000-4000-8000-'||lpad((case kind when 'initial' then i else i+10 end)::text,12,'0'))::uuid;
      use_input := jsonb_build_object('purchaseId',p,'subjectId',subject,'kind',kind,'operationId',op);
      result := public.novora_test_image_package_reserve(use_input);
      perform pg_temp.check_test01(result->>'state'='reserved' and result->>'duplicate'='false','reserve '||kind||i);
      perform pg_temp.check_test01(public.novora_test_image_package_reserve(use_input)->>'duplicate'='true','reserve replay');
    end loop;
    use_input := use_input||jsonb_build_object('operationId',case kind when 'initial' then
      '60000000-0000-4000-8000-000000000001' else '60000000-0000-4000-8000-000000000002' end);
    perform pg_temp.check_test01(public.novora_test_image_package_reserve(use_input)->>'reason'='exhausted','sixth '||kind||' denied');
  end loop;
  use_input := jsonb_build_object('purchaseId',p,'subjectId',subject,
    'operationId','50000000-0000-4000-8000-000000000001','outcome','unknown','providerCostUsdMicros',12345);
  result := public.novora_test_image_package_finish(use_input);
  perform pg_temp.check_test01(result->>'state'='unknown','UNKNOWN holds');
  perform pg_temp.check_test01(public.novora_test_image_package_reserve(use_input||'{"kind":"initial"}')->>'state'='unknown','UNKNOWN replay cannot dispatch');
  result := public.novora_test_image_package_finish(use_input||'{"outcome":"definite_failure","providerCostUsdMicros":12000}');
  perform pg_temp.check_test01(result->>'state'='released' and result->>'providerCostUsdMicros'='12345','failure restores entitlement preserves cost');
  result := public.novora_test_image_package_finish(use_input||'{"outcome":"valid_delivery","providerCostUsdMicros":15000}');
  perform pg_temp.check_test01(result->>'reason'='conflict','released cannot become delivery');
  select provider_cost_usd_micros into cost from public.novora_test_image_package_uses
    where operation_id='50000000-0000-4000-8000-000000000001';
  perform pg_temp.check_test01(cost=15000,'late conflict preserves higher known cost');
  perform pg_temp.check_test01(public.novora_test_image_package_reserve(use_input||'{"kind":"initial"}')->>'state'='released','released operation never reopens');
  result := public.novora_test_image_package_reserve(jsonb_build_object('purchaseId',p,'subjectId',subject,
    'kind','initial','operationId','60000000-0000-4000-8000-000000000001'));
  perform pg_temp.check_test01(result->>'state'='reserved','restored slot usable by new operation');
  result := public.novora_test_image_package_finish(use_input||'{"operationId":"50000000-0000-4000-8000-000000000002","outcome":"valid_delivery"}');
  perform pg_temp.check_test01(result->>'state'='settled','valid delivered settles');
  result := public.novora_test_image_package_finish(use_input||'{"operationId":"50000000-0000-4000-8000-000000000002","outcome":"no_compliant_delivery"}');
  perform pg_temp.check_test01(result->>'reason'='conflict','settled cannot release');
  result := public.novora_test_image_package_finish(use_input||'{"operationId":"50000000-0000-4000-8000-000000000003","outcome":"no_compliant_delivery"}');
  perform pg_temp.check_test01(result->>'state'='released','noncompliant output releases');
  result := public.novora_test_image_package_finish(use_input||jsonb_build_object('subjectId',other_p));
  perform pg_temp.check_test01(result->>'reason'='denied','wrong subject denied');
  select count(*) into balance from public.novora_test_image_package_uses as counted_use
    where counted_use.purchase_id=p and counted_use.kind='revision' and counted_use.state<>'released';
  perform pg_temp.check_test01(balance=5,'initial releases do not change revision balance');
  result := public.novora_test_image_package_balance(p,subject);
  perform pg_temp.check_test01(result->>'initialRemaining'='1' and result->>'revisionRemaining'='0','separate balances');
  perform pg_temp.check_test01(public.novora_test_image_package_balance(p,other_p)->>'reason'='denied','balance wrong subject');
  begin
    update public.novora_test_image_package_purchases set granted_at=now()-interval '169 hours',
      expires_at=now()-interval '1 hour' where purchase_id=other_p;
    raise exception 'partial grant unexpectedly accepted';
  exception when check_violation then null; end;
  result := public.novora_test_image_package_grant(payment||jsonb_build_object('purchaseId',other_p,
    'paymentReference','TEST-EXPIRED','confirmedAt',to_char((clock_timestamp()-interval '169 hours')
    at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),'TEST-owner');
  perform pg_temp.check_test01((result->>'ok')::boolean,'old capture still recorded');
  result := public.novora_test_image_package_reserve(jsonb_build_object('purchaseId',other_p,'subjectId',subject,
    'kind','initial','operationId','70000000-0000-4000-8000-000000000001'));
  perform pg_temp.check_test01(result->>'reason'='expired','old payment does not extend expiry');
  result := public.novora_test_image_package_balance(other_p,subject);
  perform pg_temp.check_test01(result->>'state'='expired' and result->>'initialRemaining'='0'
    and result->>'revisionRemaining'='0','expired reports no usable slots');
  raise notice 'TEST01_SINGLE_SESSION_ASSERTIONS_PASS; concurrency/HTTP remain separate';
end $$;

-- Direct SQL constraints: NULL outcome cannot bypass CHECK through SQL UNKNOWN.
do $$ begin
  begin
    insert into public.novora_test_image_package_purchases(purchase_id,subject_id,provider)
      values('823e4567-e89b-42d3-a456-426614174000','223e4567-e89b-42d3-a456-426614174000','manual_test');
    insert into public.novora_test_image_package_uses(operation_id,purchase_id,kind,state,outcome)
      values('923e4567-e89b-42d3-a456-426614174000','823e4567-e89b-42d3-a456-426614174000','initial','settled',null);
    raise exception 'NULL outcome unexpectedly accepted';
  exception when check_violation then null; end;
end $$;
rollback;
