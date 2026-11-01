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
    'packageCode','TEST-01','environment','TEST','amountMinor',100,'currency','USD',
    'owner',jsonb_build_object('scope',repeat('a',64),'identity','TEST-owner'),'sandboxMerchantId',null);
  perform pg_temp.check_test01((public.novora_test_image_package_create(purchase)->>'ok')::boolean,'create');
  perform pg_temp.check_test01((public.novora_test_image_package_create(purchase)->>'ok')::boolean,'create replay');
  perform pg_temp.check_test01(public.novora_test_image_package_create(purchase||'{"environment":"LIVE"}') ->>'reason'='invalid','live denied');
  perform pg_temp.check_test01(public.novora_test_image_package_create(purchase||jsonb_build_object('subjectId',other_p)) ->>'reason'='conflict','subject immutable');
  use_input := jsonb_build_object('purchaseId',p,'subjectId',subject,'kind','initial',
    'operationId','423e4567-e89b-42d3-a456-426614174000',
    'reservationId','423e4567-e89b-42d3-a456-426614174000','owner',purchase->'owner','briefId',other_p);
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

  -- Proven enqueue failure before dispatch restores the reserved slot without
  -- manufacturing a claim; direct unbound finish remains denied.
  result:=public.novora_test_image_package_reserve(use_input);
  perform pg_temp.check_test01(result->>'state'='reserved','pre-dispatch reserve');
  result:=public.novora_test_image_package_finish(use_input||'{"outcome":"definite_failure","providerCostUsdMicros":0}');
  perform pg_temp.check_test01(result->>'reason'='denied','unbound finish still denies pre-dispatch release');
  result:=public.novora_test_image_package_settle_dispatch(use_input||jsonb_build_object('briefId',p,
    'outcome','definite_failure','failurePhase','before_dispatch','providerCostUsdMicros',0));
  perform pg_temp.check_test01(result->>'reason'='denied','wrong brief cannot release before claim');
  result:=public.novora_test_image_package_settle_dispatch(use_input||jsonb_build_object(
    'owner',jsonb_build_object('scope',repeat('b',64),'identity','TEST-owner'),
    'outcome','definite_failure','failurePhase','before_dispatch','providerCostUsdMicros',0));
  perform pg_temp.check_test01(result->>'reason'='denied','wrong owner cannot release before claim');
  result:=public.novora_test_image_package_settle_dispatch(use_input||
    '{"outcome":"definite_failure","failurePhase":"before_dispatch","providerCostUsdMicros":0}');
  perform pg_temp.check_test01(result->>'state'='released' and result->>'duplicate'='false','pre-dispatch failure restores slot');
  perform pg_temp.check_test01((select dispatch_claimed_at is null from public.novora_test_image_package_uses
    where operation_id='423e4567-e89b-42d3-a456-426614174000'),'release did not fake claim');
  result:=public.novora_test_image_package_settle_dispatch(use_input||
    '{"outcome":"definite_failure","failurePhase":"before_dispatch","providerCostUsdMicros":0}');
  perform pg_temp.check_test01(result->>'state'='released' and result->>'duplicate'='true','pre-dispatch release idempotent');
  perform pg_temp.check_test01(public.novora_test_image_package_claim_dispatch(use_input)->>'claim'='denied','released unclaimed use never dispatches');

  foreach kind in array array['initial','revision'] loop
    for i in 1..5 loop
      op := ('50000000-0000-4000-8000-'||lpad((case kind when 'initial' then i else i+10 end)::text,12,'0'))::uuid;
      use_input := jsonb_build_object('purchaseId',p,'subjectId',subject,'kind',kind,'operationId',op,
        'reservationId',op,'owner',purchase->'owner','briefId',other_p,
        'sourceOutputId',case when kind='revision' then subject else null end);
      result := public.novora_test_image_package_reserve(use_input);
      perform pg_temp.check_test01(result->>'state'='reserved' and result->>'duplicate'='false','reserve '||kind||i);
      perform pg_temp.check_test01(public.novora_test_image_package_reserve(use_input)->>'duplicate'='true','reserve replay');
      perform pg_temp.check_test01(public.novora_test_image_package_claim_dispatch(use_input)->>'claim'='claimed','dispatch claimed');
      perform pg_temp.check_test01(public.novora_test_image_package_claim_dispatch(use_input)->>'claim'='already_claimed','dispatch cannot reclaim');
      perform pg_temp.check_test01(public.novora_test_image_package_settle_dispatch(use_input||
        '{"outcome":"definite_failure","failurePhase":"before_dispatch","providerCostUsdMicros":0}')->>'reason'='conflict','claim winner rejects stale pre-dispatch release');
      perform pg_temp.check_test01(public.novora_test_image_package_claim_dispatch(use_input||jsonb_build_object('briefId',p))->>'claim'='denied','brief immutable');
    end loop;
    use_input := use_input||jsonb_build_object('operationId',case kind when 'initial' then
      '60000000-0000-4000-8000-000000000001' else '60000000-0000-4000-8000-000000000002' end);
    perform pg_temp.check_test01(public.novora_test_image_package_reserve(use_input)->>'reason'='exhausted','sixth '||kind||' denied');
  end loop;
  use_input := jsonb_build_object('purchaseId',p,'subjectId',subject,
    'operationId','50000000-0000-4000-8000-000000000001','outcome','unknown','providerCostUsdMicros',12345,
    'reservationId','50000000-0000-4000-8000-000000000001','owner',purchase->'owner','briefId',other_p,'kind','initial');
  result := public.novora_test_image_package_settle_dispatch(use_input);
  perform pg_temp.check_test01(result->>'state'='unknown','UNKNOWN holds');
  perform pg_temp.check_test01(public.novora_test_image_package_claim_dispatch(use_input)->>'claim'='unknown','UNKNOWN never reclaims');
  perform pg_temp.check_test01(public.novora_test_image_package_reserve(use_input||'{"kind":"initial"}')->>'state'='unknown','UNKNOWN replay cannot dispatch');
  result := public.novora_test_image_package_settle_dispatch(use_input||'{"outcome":"definite_failure","providerCostUsdMicros":12000}');
  perform pg_temp.check_test01(result->>'state'='released' and result->>'providerCostUsdMicros'='12345','failure restores entitlement preserves cost');
  result := public.novora_test_image_package_settle_dispatch(use_input||'{"outcome":"delivered","providerCostUsdMicros":15000}');
  perform pg_temp.check_test01(result->>'reason'='conflict','released cannot become delivery');
  select provider_cost_usd_micros into cost from public.novora_test_image_package_uses
    where operation_id='50000000-0000-4000-8000-000000000001';
  perform pg_temp.check_test01(cost=15000,'late conflict preserves higher known cost');
  perform pg_temp.check_test01(public.novora_test_image_package_reserve(use_input||'{"kind":"initial"}')->>'state'='released','released operation never reopens');
  result := public.novora_test_image_package_reserve(jsonb_build_object('purchaseId',p,'subjectId',subject,
    'kind','initial','operationId','60000000-0000-4000-8000-000000000001',
    'reservationId','60000000-0000-4000-8000-000000000001','owner',purchase->'owner','briefId',other_p));
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
    'kind','initial','operationId','70000000-0000-4000-8000-000000000001',
    'reservationId','70000000-0000-4000-8000-000000000001','owner',purchase->'owner','briefId',other_p));
  perform pg_temp.check_test01(result->>'reason'='expired','old payment does not extend expiry');
  result := public.novora_test_image_package_balance(other_p,subject);
  perform pg_temp.check_test01(result->>'state'='expired' and result->>'initialRemaining'='0'
    and result->>'revisionRemaining'='0','expired reports no usable slots');
  raise notice 'TEST01_SINGLE_SESSION_ASSERTIONS_PASS; concurrency/HTTP remain separate';
end $$;

-- Direct SQL constraints: NULL outcome cannot bypass CHECK through SQL UNKNOWN.
do $$ begin
  begin
    insert into public.novora_test_image_package_purchases(purchase_id,subject_id,provider,owner_scope,owner_identity)
      values('823e4567-e89b-42d3-a456-426614174000','223e4567-e89b-42d3-a456-426614174000','manual_test',repeat('a',64),'TEST-owner');
    insert into public.novora_test_image_package_uses(operation_id,reservation_id,purchase_id,brief_id,kind,state,outcome,dispatch_claimed_at)
      values('923e4567-e89b-42d3-a456-426614174000','923e4567-e89b-42d3-a456-426614174000',
        '823e4567-e89b-42d3-a456-426614174000','823e4567-e89b-42d3-a456-426614174000','initial','settled',null,clock_timestamp());
    raise exception 'NULL outcome unexpectedly accepted';
  exception when check_violation then null; end;
end $$;

do $$
declare p uuid := 'a23e4567-e89b-42d3-a456-426614174000'; owner jsonb := jsonb_build_object('scope',repeat('a',64),'identity','TEST-owner');
  result jsonb;
begin
  perform public.novora_test_image_package_create(jsonb_build_object('purchaseId',p,
    'subjectId','223e4567-e89b-42d3-a456-426614174000','provider','paypal_sandbox','owner',owner,
    'sandboxMerchantId','TESTMERCHANT1','packageCode','TEST-01','environment','TEST','amountMinor',100,'currency','USD'));
  result := public.novora_test_image_package_sandbox_claim(p,owner,'create',null,repeat('1',32),repeat('a',64));
  perform pg_temp.check_test01(result->>'claim'='acquired','sandbox first claim');
  result := public.novora_test_image_package_sandbox_claim(p,owner,'create',null,repeat('1',32),repeat('a',64));
  perform pg_temp.check_test01(result->>'claim'='held','sandbox second claim holds');
  result := public.novora_test_image_package_sandbox_claim(p,owner,'create',null,repeat('2',32),repeat('b',64));
  perform pg_temp.check_test01(result->>'claim'='held','sandbox new request cannot re-claim purchase');
  result := public.novora_test_image_package_sandbox_complete(p,owner,'create',repeat('1',32),repeat('a',64),
    '{"state":"CREATED","providerOrderId":"TESTDBORDER1"}'::jsonb);
  perform pg_temp.check_test01((result->>'ok')::boolean,'sandbox completion');
  result := public.novora_test_image_package_sandbox_purchase(p,owner);
  perform pg_temp.check_test01(result->'purchase'->>'providerOrderId'='TESTDBORDER1','order mapping commits with completion');
  result := public.novora_test_image_package_sandbox_complete(p,owner,'create',repeat('1',32),repeat('a',64),
    '{"state":"CREATED","providerOrderId":"TESTDBORDER2"}'::jsonb);
  perform pg_temp.check_test01(result->>'ok'='false','sandbox completion immutable');
  result := public.novora_test_image_package_sandbox_claim(p,owner,'capture','WRONGORDER1',repeat('3',32),repeat('c',64));
  perform pg_temp.check_test01(result->>'claim'='held','capture wrong order held');
  result := public.novora_test_image_package_sandbox_claim(p,owner,'capture','TESTDBORDER1',repeat('3',32),repeat('c',64));
  perform pg_temp.check_test01(result->>'claim'='acquired','capture first claim');
  result := public.novora_test_image_package_sandbox_complete(p,owner,'capture',repeat('3',32),repeat('c',64),
    '{"state":"UNKNOWN","reason":"transport"}'::jsonb);
  perform pg_temp.check_test01((result->>'ok')::boolean,'capture UNKNOWN completes journal');
  result := public.novora_test_image_package_sandbox_claim(p,owner,'capture','TESTDBORDER1',repeat('3',32),repeat('c',64));
  perform pg_temp.check_test01(result->>'claim'='completed' and result->'result'->>'state'='UNKNOWN','UNKNOWN never reacquires');
  raise notice 'TEST01_SANDBOX_SINGLE_SESSION_ASSERTIONS_PASS';
end $$;
rollback;
