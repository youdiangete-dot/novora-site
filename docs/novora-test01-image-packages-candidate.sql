-- CANDIDATE ONLY. Not approved for any online database. Synthetic TEST-01 only.
-- Requires a separately reviewed Supabase schema/role/subject-binding preflight.
-- subject_id is an opaque trusted server UUID; no auth/account schema assumed.
-- SECURITY INVOKER: service_role only, fixed search_path, no dynamic SQL.
begin;
set local lock_timeout = '2s';
set local statement_timeout = '30s';

create table public.novora_test_image_package_purchases (
  purchase_id uuid primary key,
  subject_id uuid not null,
  provider text not null check (provider in ('paypal_sandbox', 'manual_test')),
  package_code text not null default 'TEST-01' check (package_code = 'TEST-01'),
  environment text not null default 'TEST' check (environment = 'TEST'),
  amount_minor integer not null default 100 check (amount_minor = 100),
  currency text not null default 'USD' check (currency = 'USD'),
  created_at timestamptz not null default clock_timestamp(),
  payment_reference text check (payment_reference ~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$'),
  manual_verifier_id text check (manual_verifier_id ~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$'),
  granted_at timestamptz,
  expires_at timestamptz,
  unique (provider, payment_reference),
  check ((payment_reference is null and granted_at is null and expires_at is null and manual_verifier_id is null)
    or (payment_reference is not null and granted_at is not null and expires_at is not null
      and expires_at = granted_at + interval '168 hours'
      and ((provider = 'paypal_sandbox' and manual_verifier_id is null)
        or (provider = 'manual_test' and manual_verifier_id is not null and payment_reference like 'TEST-%'))))
);

create table public.novora_test_image_package_uses (
  operation_id uuid primary key, -- stable generation-job identity across retries/replays
  purchase_id uuid not null references public.novora_test_image_package_purchases(purchase_id),
  kind text not null check (kind in ('initial', 'revision')),
  state text not null default 'reserved' check (state in ('reserved', 'unknown', 'settled', 'released')),
  outcome text check (outcome in ('valid_delivery', 'definite_failure', 'no_compliant_delivery', 'unknown')),
  provider_cost_usd_micros bigint not null default 0 check (provider_cost_usd_micros between 0 and 9007199254740991),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  check ((state = 'reserved' and outcome is null)
    or (state = 'unknown' and outcome is not null and outcome = 'unknown')
    or (state = 'settled' and outcome is not null and outcome = 'valid_delivery')
    or (state = 'released' and outcome is not null and outcome in ('definite_failure', 'no_compliant_delivery')))
);
create index novora_test_image_package_use_balance
  on public.novora_test_image_package_uses(purchase_id, kind) where state <> 'released';

alter table public.novora_test_image_package_purchases enable row level security;
alter table public.novora_test_image_package_uses enable row level security;
revoke all on public.novora_test_image_package_purchases, public.novora_test_image_package_uses
  from public, anon, authenticated;
grant select, insert, update on public.novora_test_image_package_purchases, public.novora_test_image_package_uses
  to service_role;

create function public.novora_test_image_package_create(p_purchase jsonb)
returns jsonb language plpgsql security invoker set search_path = pg_catalog, public as $$
declare p public.novora_test_image_package_purchases; existing public.novora_test_image_package_purchases;
begin
  if p_purchase is null or jsonb_typeof(p_purchase) <> 'object'
    or (p_purchase->>'packageCode') is distinct from 'TEST-01'
    or (p_purchase->>'environment') is distinct from 'TEST'
    or (p_purchase->>'amountMinor') is distinct from '100'
    or (p_purchase->>'currency') is distinct from 'USD'
    or (p_purchase->>'provider') is null or (p_purchase->>'provider') not in ('paypal_sandbox','manual_test')
    or (p_purchase->>'purchaseId') is null or (p_purchase->>'subjectId') is null then
    return jsonb_build_object('ok',false,'reason','invalid');
  end if;
  p.purchase_id := (p_purchase->>'purchaseId')::uuid;
  p.subject_id := (p_purchase->>'subjectId')::uuid;
  p.provider := p_purchase->>'provider';
  insert into public.novora_test_image_package_purchases(purchase_id,subject_id,provider)
    values(p.purchase_id,p.subject_id,p.provider) on conflict(purchase_id) do nothing;
  select * into existing from public.novora_test_image_package_purchases where purchase_id=p.purchase_id for update;
  if existing.subject_id is distinct from p.subject_id or existing.provider is distinct from p.provider then
    return jsonb_build_object('ok',false,'reason','conflict');
  end if;
  return jsonb_build_object('ok',true);
exception when invalid_text_representation then
  return jsonb_build_object('ok',false,'reason','invalid');
end $$;

create function public.novora_test_image_package_find(p_purchase_id uuid)
returns jsonb language plpgsql security invoker set search_path = pg_catalog, public as $$
declare p public.novora_test_image_package_purchases;
begin
  select * into p from public.novora_test_image_package_purchases where purchase_id=p_purchase_id;
  if not found then return jsonb_build_object('ok',false,'reason','not_found'); end if;
  return jsonb_build_object('ok',true,'purchase',jsonb_build_object(
    'purchaseId',p.purchase_id,'subjectId',p.subject_id,'provider',p.provider,'packageCode',p.package_code,
    'environment',p.environment,'amountMinor',p.amount_minor,'currency',p.currency));
end $$;

create function public.novora_test_image_package_balance(p_purchase_id uuid, p_subject_id uuid)
returns jsonb language plpgsql security invoker set search_path = pg_catalog, public as $$
declare p public.novora_test_image_package_purchases; initial_used integer; revision_used integer; expired boolean;
begin
  select * into p from public.novora_test_image_package_purchases
    where purchase_id=p_purchase_id and subject_id=p_subject_id;
  if not found or p.granted_at is null then return jsonb_build_object('ok',false,'reason','denied'); end if;
  select count(*) filter(where kind='initial'), count(*) filter(where kind='revision')
    into initial_used,revision_used from public.novora_test_image_package_uses
    where purchase_id=p.purchase_id and state<>'released';
  expired := p.expires_at<=clock_timestamp();
  return jsonb_build_object('ok',true,'purchaseId',p.purchase_id,
    'state',case when expired then 'expired' else 'active' end,
    'grantedAt',to_char(p.granted_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'expiresAt',to_char(p.expires_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'initialRemaining',case when expired then 0 else 5-initial_used end,
    'revisionRemaining',case when expired then 0 else 5-revision_used end);
end $$;

create function public.novora_test_image_package_grant(p_payment jsonb, p_manual_verifier_id text)
returns jsonb language plpgsql security invoker set search_path = pg_catalog, public as $$
declare p public.novora_test_image_package_purchases; confirmed timestamptz; duplicate boolean := false;
begin
  if p_payment is null or jsonb_typeof(p_payment) <> 'object' then
    return jsonb_build_object('ok',false,'reason','invalid'); end if;
  select * into p from public.novora_test_image_package_purchases
    where purchase_id=(p_payment->>'purchaseId')::uuid for update;
  if not found then return jsonb_build_object('ok',false,'reason','not_found'); end if;
  if (p_payment->>'subjectId') is distinct from p.subject_id::text
    or (p_payment->>'provider') is distinct from p.provider
    or (p_payment->>'packageCode') is distinct from p.package_code
    or (p_payment->>'environment') is distinct from p.environment
    or (p_payment->>'amountMinor') is distinct from p.amount_minor::text
    or (p_payment->>'currency') is distinct from p.currency
    or (p_payment->>'paymentReference') is null
    or (p_payment->>'paymentReference') !~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$'
    or (p_payment->>'confirmedAt') is null
    or (p_payment->>'confirmedAt') !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$'
    or (p.provider='manual_test' and (p_manual_verifier_id is null
      or p_manual_verifier_id !~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$'
      or (p_payment->>'paymentReference') not like 'TEST-%'))
    or (p.provider='paypal_sandbox' and p_manual_verifier_id is not null) then
    return jsonb_build_object('ok',false,'reason','invalid');
  end if;
  confirmed := (p_payment->>'confirmedAt')::timestamptz;
  if confirmed > clock_timestamp() or not isfinite(confirmed) then
    return jsonb_build_object('ok',false,'reason','invalid'); end if;
  if p.payment_reference is not null then
    if p.payment_reference <> p_payment->>'paymentReference' then
      return jsonb_build_object('ok',false,'reason','conflict'); end if;
    duplicate := true; -- original time/verifier/expiry are immutable on replay
  else
    update public.novora_test_image_package_purchases set
      payment_reference=p_payment->>'paymentReference', manual_verifier_id=p_manual_verifier_id,
      granted_at=confirmed, expires_at=confirmed+interval '168 hours'
      where purchase_id=p.purchase_id returning * into p;
  end if;
  return jsonb_build_object('ok',true,'duplicate',duplicate,'purchaseId',p.purchase_id,
    'grantedAt',to_char(p.granted_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'expiresAt',to_char(p.expires_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));
exception when unique_violation then return jsonb_build_object('ok',false,'reason','conflict');
  when invalid_text_representation or datetime_field_overflow then return jsonb_build_object('ok',false,'reason','invalid');
end $$;

create function public.novora_test_image_package_reserve(p_use jsonb)
returns jsonb language plpgsql security invoker set search_path = pg_catalog, public as $$
declare p public.novora_test_image_package_purchases; u public.novora_test_image_package_uses; duplicate boolean := false;
begin
  if p_use is null or jsonb_typeof(p_use) <> 'object' or (p_use->>'operationId') is null
    or (p_use->>'kind') is null or (p_use->>'kind') not in ('initial','revision') then
    return jsonb_build_object('ok',false,'reason','invalid'); end if;
  -- Serialize every balance mutation on this purchase, including releases.
  select * into p from public.novora_test_image_package_purchases
    where purchase_id=(p_use->>'purchaseId')::uuid for update;
  if not found or (p_use->>'subjectId') is distinct from p.subject_id::text then
    return jsonb_build_object('ok',false,'reason','denied'); end if;
  select * into u from public.novora_test_image_package_uses where operation_id=(p_use->>'operationId')::uuid;
  if found then
    if u.purchase_id<>p.purchase_id or u.kind<>p_use->>'kind' then
      return jsonb_build_object('ok',false,'reason','conflict'); end if;
    duplicate := true; -- replay is a state lookup, NEVER another dispatch permit
  else
    if p.granted_at is null then return jsonb_build_object('ok',false,'reason','denied'); end if;
    if p.expires_at<=clock_timestamp() then return jsonb_build_object('ok',false,'reason','expired'); end if;
    if (select count(*) from public.novora_test_image_package_uses
      where purchase_id=p.purchase_id and kind=p_use->>'kind' and state<>'released')>=5 then
      return jsonb_build_object('ok',false,'reason','exhausted'); end if;
    insert into public.novora_test_image_package_uses(operation_id,purchase_id,kind)
      values((p_use->>'operationId')::uuid,p.purchase_id,p_use->>'kind') returning * into u;
  end if;
  return jsonb_build_object('ok',true,'duplicate',duplicate,'operationId',u.operation_id,
    'state',u.state,'providerCostUsdMicros',u.provider_cost_usd_micros);
exception when unique_violation then return jsonb_build_object('ok',false,'reason','conflict');
  when invalid_text_representation then return jsonb_build_object('ok',false,'reason','invalid');
end $$;

create function public.novora_test_image_package_finish(p_use jsonb)
returns jsonb language plpgsql security invoker set search_path = pg_catalog, public as $$
declare p public.novora_test_image_package_purchases; u public.novora_test_image_package_uses;
  next_state text; cost bigint; duplicate boolean;
begin
  if p_use is null or jsonb_typeof(p_use) <> 'object' or (p_use->>'outcome') is null
    or (p_use->>'outcome') not in ('valid_delivery','definite_failure','no_compliant_delivery','unknown')
    or (p_use->>'providerCostUsdMicros') is null
    or (p_use->>'providerCostUsdMicros') !~ '^\d+$' then
    return jsonb_build_object('ok',false,'reason','invalid'); end if;
  cost := (p_use->>'providerCostUsdMicros')::bigint;
  if cost>9007199254740991 then return jsonb_build_object('ok',false,'reason','invalid'); end if;
  select * into p from public.novora_test_image_package_purchases
    where purchase_id=(p_use->>'purchaseId')::uuid for update;
  if not found or (p_use->>'subjectId') is distinct from p.subject_id::text then
    return jsonb_build_object('ok',false,'reason','denied'); end if;
  select * into u from public.novora_test_image_package_uses
    where operation_id=(p_use->>'operationId')::uuid and purchase_id=p.purchase_id for update;
  if not found then return jsonb_build_object('ok',false,'reason','not_found'); end if;
  next_state := case p_use->>'outcome' when 'valid_delivery' then 'settled'
    when 'unknown' then 'unknown' else 'released' end;
  -- Record cumulative known cost even for a conflicting late outcome. A release
  -- restores entitlement only; it never refunds/erases real provider expenditure.
  update public.novora_test_image_package_uses set provider_cost_usd_micros=greatest(provider_cost_usd_micros,cost),
    updated_at=clock_timestamp() where operation_id=u.operation_id returning * into u;
  if u.state in ('settled','released') and u.outcome<>p_use->>'outcome' then
    return jsonb_build_object('ok',false,'reason','conflict'); end if;
  duplicate := u.state=next_state;
  update public.novora_test_image_package_uses set state=next_state,outcome=p_use->>'outcome',
    updated_at=clock_timestamp() where operation_id=u.operation_id returning * into u;
  return jsonb_build_object('ok',true,'duplicate',duplicate,'operationId',u.operation_id,
    'state',u.state,'providerCostUsdMicros',u.provider_cost_usd_micros);
exception when invalid_text_representation or numeric_value_out_of_range then
  return jsonb_build_object('ok',false,'reason','invalid');
end $$;

-- No public execute (including functions created under permissive defaults).
revoke all on function public.novora_test_image_package_create(jsonb), public.novora_test_image_package_find(uuid),
  public.novora_test_image_package_balance(uuid,uuid),
  public.novora_test_image_package_grant(jsonb,text), public.novora_test_image_package_reserve(jsonb),
  public.novora_test_image_package_finish(jsonb) from public, anon, authenticated;
grant execute on function public.novora_test_image_package_create(jsonb), public.novora_test_image_package_find(uuid),
  public.novora_test_image_package_balance(uuid,uuid),
  public.novora_test_image_package_grant(jsonb,text), public.novora_test_image_package_reserve(jsonb),
  public.novora_test_image_package_finish(jsonb) to service_role;
commit;
