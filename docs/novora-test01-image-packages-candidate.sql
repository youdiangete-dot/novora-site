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
  owner_scope text not null check (owner_scope ~ '^[a-f0-9]{64}$'),
  owner_identity text not null check (owner_identity ~ '^[A-Za-z0-9_-]{1,64}$'),
  provider text not null check (provider in ('paypal_sandbox', 'manual_test')),
  package_code text not null default 'TEST-01' check (package_code = 'TEST-01'),
  environment text not null default 'TEST' check (environment = 'TEST'),
  amount_minor integer not null default 100 check (amount_minor = 100),
  currency text not null default 'USD' check (currency = 'USD'),
  sandbox_merchant_id text,
  provider_order_id text unique check (provider_order_id ~ '^[A-Z0-9]{1,64}$'),
  check ((provider='paypal_sandbox' and sandbox_merchant_id is not null and sandbox_merchant_id ~ '^[A-Z0-9]{13}$')
    or (provider='manual_test' and sandbox_merchant_id is null and provider_order_id is null)),
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
  reservation_id uuid not null unique,
  purchase_id uuid not null references public.novora_test_image_package_purchases(purchase_id),
  kind text not null check (kind in ('initial', 'revision')),
  brief_id uuid not null,
  source_output_id uuid,
  dispatch_claimed_at timestamptz,
  check ((kind='initial' and source_output_id is null) or (kind='revision' and source_output_id is not null)),
  state text not null default 'reserved' check (state in ('reserved', 'unknown', 'settled', 'released')),
  outcome text check (outcome in ('valid_delivery', 'definite_failure', 'no_compliant_delivery', 'unknown')),
  provider_cost_usd_micros bigint not null default 0 check (provider_cost_usd_micros between 0 and 9007199254740991),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  check (state='reserved' or dispatch_claimed_at is not null),
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
  from public, anon, authenticated, service_role;
grant select, insert on public.novora_test_image_package_purchases, public.novora_test_image_package_uses
  to service_role;
-- Bindings are insert-only for the runtime role, including permissive defaults.
grant update(payment_reference,manual_verifier_id,granted_at,expires_at,provider_order_id)
  on public.novora_test_image_package_purchases to service_role;
grant update(state,outcome,provider_cost_usd_micros,updated_at,dispatch_claimed_at)
  on public.novora_test_image_package_uses to service_role;

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
  p.owner_scope := p_purchase->'owner'->>'scope'; p.owner_identity := p_purchase->'owner'->>'identity';
  p.sandbox_merchant_id := p_purchase->>'sandboxMerchantId';
  if p.owner_scope is null or p.owner_scope !~ '^[a-f0-9]{64}$' or p.owner_identity is null
    or p.owner_identity !~ '^[A-Za-z0-9_-]{1,64}$'
    or (p.provider='paypal_sandbox' and (p.sandbox_merchant_id is null or p.sandbox_merchant_id !~ '^[A-Z0-9]{13}$'))
    or (p.provider='manual_test' and p.sandbox_merchant_id is not null) then
    return jsonb_build_object('ok',false,'reason','invalid'); end if;
  insert into public.novora_test_image_package_purchases(purchase_id,subject_id,provider,owner_scope,owner_identity,sandbox_merchant_id)
    values(p.purchase_id,p.subject_id,p.provider,p.owner_scope,p.owner_identity,p.sandbox_merchant_id) on conflict(purchase_id) do nothing;
  select * into existing from public.novora_test_image_package_purchases where purchase_id=p.purchase_id for update;
  if existing.subject_id is distinct from p.subject_id or existing.provider is distinct from p.provider
    or existing.owner_scope is distinct from p.owner_scope or existing.owner_identity is distinct from p.owner_identity
    or existing.sandbox_merchant_id is distinct from p.sandbox_merchant_id then
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
    'environment',p.environment,'amountMinor',p.amount_minor,'currency',p.currency,
    'owner',jsonb_build_object('scope',p.owner_scope,'identity',p.owner_identity),'sandboxMerchantId',p.sandbox_merchant_id));
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
    or (p_use->>'reservationId') is null or (p_use->>'briefId') is null
    or (p_use->>'kind') is null or (p_use->>'kind') not in ('initial','revision') then
    return jsonb_build_object('ok',false,'reason','invalid'); end if;
  -- Serialize every balance mutation on this purchase, including releases.
  select * into p from public.novora_test_image_package_purchases
    where purchase_id=(p_use->>'purchaseId')::uuid for update;
  if not found or (p_use->>'subjectId') is distinct from p.subject_id::text
    or (p_use->'owner'->>'scope') is distinct from p.owner_scope
    or (p_use->'owner'->>'identity') is distinct from p.owner_identity then
    return jsonb_build_object('ok',false,'reason','denied'); end if;
  select * into u from public.novora_test_image_package_uses where operation_id=(p_use->>'operationId')::uuid;
  if found then
    if u.purchase_id<>p.purchase_id or u.kind<>p_use->>'kind'
      or u.reservation_id is distinct from (p_use->>'reservationId')::uuid
      or u.brief_id is distinct from (p_use->>'briefId')::uuid
      or u.source_output_id is distinct from (p_use->>'sourceOutputId')::uuid then
      return jsonb_build_object('ok',false,'reason','conflict'); end if;
    duplicate := true; -- reservation is never a dispatch permit; claim separately
  else
    if p.granted_at is null then return jsonb_build_object('ok',false,'reason','denied'); end if;
    if p.expires_at<=clock_timestamp() then return jsonb_build_object('ok',false,'reason','expired'); end if;
    if (select count(*) from public.novora_test_image_package_uses
      where purchase_id=p.purchase_id and kind=p_use->>'kind' and state<>'released')>=5 then
      return jsonb_build_object('ok',false,'reason','exhausted'); end if;
    if ((p_use->>'kind')='initial' and (p_use->>'sourceOutputId') is not null)
      or ((p_use->>'kind')='revision' and (p_use->>'sourceOutputId') is null) then
      return jsonb_build_object('ok',false,'reason','invalid'); end if;
    insert into public.novora_test_image_package_uses(operation_id,reservation_id,purchase_id,kind,brief_id,source_output_id)
      values((p_use->>'operationId')::uuid,(p_use->>'reservationId')::uuid,p.purchase_id,p_use->>'kind',
        (p_use->>'briefId')::uuid,(p_use->>'sourceOutputId')::uuid) returning * into u;
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
  if u.dispatch_claimed_at is null then return jsonb_build_object('ok',false,'reason','denied'); end if;
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

create function public.novora_test_image_package_claim_dispatch(p_dispatch jsonb)
returns jsonb language plpgsql security invoker set search_path = pg_catalog, public as $$
declare p public.novora_test_image_package_purchases; u public.novora_test_image_package_uses;
begin
  -- Lookup before the purchase lock is read-only. Re-read the use after taking
  -- the purchase lock, preserving the reserve/finish lock order.
  select * into u from public.novora_test_image_package_uses
    where reservation_id=(p_dispatch->>'reservationId')::uuid;
  if not found then return jsonb_build_object('claim','denied'); end if;
  select * into p from public.novora_test_image_package_purchases where purchase_id=u.purchase_id for update;
  select * into u from public.novora_test_image_package_uses where reservation_id=(p_dispatch->>'reservationId')::uuid for update;
  if (p_dispatch->'owner'->>'scope') is distinct from p.owner_scope
    or (p_dispatch->'owner'->>'identity') is distinct from p.owner_identity
    or (p_dispatch->>'operationId') is distinct from u.operation_id::text
    or (p_dispatch->>'kind') is distinct from u.kind
    or (p_dispatch->>'briefId') is distinct from u.brief_id::text
    or (p_dispatch->>'sourceOutputId') is distinct from u.source_output_id::text then
    return jsonb_build_object('claim','denied'); end if;
  if u.state='unknown' then return jsonb_build_object('claim','unknown'); end if;
  if u.dispatch_claimed_at is not null then return jsonb_build_object('claim','already_claimed'); end if;
  if u.state<>'reserved' or p.granted_at is null or p.expires_at<=clock_timestamp() then
    return jsonb_build_object('claim','denied'); end if;
  update public.novora_test_image_package_uses set dispatch_claimed_at=clock_timestamp()
    where operation_id=u.operation_id;
  return jsonb_build_object('claim','claimed');
exception when invalid_text_representation then return jsonb_build_object('claim','denied');
end $$;

create function public.novora_test_image_package_settle_dispatch(p_dispatch jsonb)
returns jsonb language plpgsql security invoker set search_path = pg_catalog, public as $$
declare p public.novora_test_image_package_purchases; u public.novora_test_image_package_uses; claim jsonb;
begin
  -- claim_dispatch's validation is reused, but settlement NEVER acquires a
  -- missing claim: check claimed_at first, then validate the immutable binding.
  select * into u from public.novora_test_image_package_uses where reservation_id=(p_dispatch->>'reservationId')::uuid;
  if not found or u.dispatch_claimed_at is null then return jsonb_build_object('ok',false,'reason','denied'); end if;
  claim := public.novora_test_image_package_claim_dispatch(p_dispatch);
  if claim->>'claim' not in ('already_claimed','unknown') then return jsonb_build_object('ok',false,'reason','denied'); end if;
  if (p_dispatch->>'outcome') is null or (p_dispatch->>'outcome') not in ('delivered','definite_failure','unknown') then
    return jsonb_build_object('ok',false,'reason','invalid'); end if;
  select * into p from public.novora_test_image_package_purchases where purchase_id=u.purchase_id;
  return public.novora_test_image_package_finish(jsonb_build_object('purchaseId',p.purchase_id,
    'subjectId',p.subject_id,'operationId',u.operation_id,'providerCostUsdMicros',p_dispatch->'providerCostUsdMicros',
    'outcome',case p_dispatch->>'outcome' when 'delivered' then 'valid_delivery' else p_dispatch->>'outcome' end));
exception when invalid_text_representation then return jsonb_build_object('ok',false,'reason','invalid');
end $$;

-- Payment side-effect journal required by C. This is not an entitlement ledger:
-- no quota is debited here. One immutable create/capture claim per purchase.
create table public.novora_test_image_package_sandbox_operations (
  request_id text primary key check (request_id ~ '^[a-f0-9]{32}$'),
  purchase_id uuid not null references public.novora_test_image_package_purchases(purchase_id),
  kind text not null check (kind in ('create','capture')),
  fingerprint text not null check (fingerprint ~ '^[a-f0-9]{64}$'),
  provider_order_id text check (provider_order_id ~ '^[A-Z0-9]{1,64}$'),
  result jsonb,
  claimed_at timestamptz not null default clock_timestamp(),
  completed_at timestamptz,
  unique(purchase_id,kind),
  check ((kind='create' and provider_order_id is null) or (kind='capture' and provider_order_id is not null)),
  check ((result is null and completed_at is null) or
    (result is not null and jsonb_typeof(result)='object' and completed_at is not null))
);
alter table public.novora_test_image_package_sandbox_operations enable row level security;
revoke all on public.novora_test_image_package_sandbox_operations from public,anon,authenticated,service_role;
grant select,insert on public.novora_test_image_package_sandbox_operations to service_role;
grant update(result,completed_at) on public.novora_test_image_package_sandbox_operations to service_role;

create function public.novora_test_image_package_sandbox_purchase(p_purchase_id uuid,p_owner jsonb)
returns jsonb language plpgsql security invoker set search_path = pg_catalog, public as $$
declare p public.novora_test_image_package_purchases;
begin
  select * into p from public.novora_test_image_package_purchases where purchase_id=p_purchase_id
    and provider='paypal_sandbox' and owner_scope=p_owner->>'scope' and owner_identity=p_owner->>'identity';
  if not found then return jsonb_build_object('ok',false); end if;
  return jsonb_build_object('ok',true,'purchase',jsonb_build_object('purchaseId',p.purchase_id,
    'amountMinor',p.amount_minor,'currency',p.currency,'merchantId',p.sandbox_merchant_id,'providerOrderId',p.provider_order_id));
end $$;

create function public.novora_test_image_package_sandbox_claim(p_purchase_id uuid,p_owner jsonb,p_kind text,
  p_order_id text,p_request_id text,p_fingerprint text)
returns jsonb language plpgsql security invoker set search_path = pg_catalog, public as $$
declare p public.novora_test_image_package_purchases; op public.novora_test_image_package_sandbox_operations;
begin
  select * into p from public.novora_test_image_package_purchases where purchase_id=p_purchase_id for update;
  if not found or p.provider<>'paypal_sandbox' or (p_owner->>'scope') is distinct from p.owner_scope
    or (p_owner->>'identity') is distinct from p.owner_identity or p_kind is null or p_kind not in ('create','capture')
    or p_request_id is null or p_request_id !~ '^[a-f0-9]{32}$'
    or p_fingerprint is null or p_fingerprint !~ '^[a-f0-9]{64}$'
    or (p_kind='create' and p_order_id is not null)
    or (p_kind='capture' and (p_order_id is null or p_order_id is distinct from p.provider_order_id)) then
    return jsonb_build_object('claim','held'); end if;
  select * into op from public.novora_test_image_package_sandbox_operations where purchase_id=p_purchase_id and kind=p_kind;
  if found then
    if op.request_id<>p_request_id or op.fingerprint<>p_fingerprint or op.provider_order_id is distinct from p_order_id
      or op.result is null then return jsonb_build_object('claim','held'); end if;
    return jsonb_build_object('claim','completed','result',op.result);
  end if;
  insert into public.novora_test_image_package_sandbox_operations(request_id,purchase_id,kind,fingerprint,provider_order_id)
    values(p_request_id,p_purchase_id,p_kind,p_fingerprint,p_order_id);
  return jsonb_build_object('claim','acquired');
exception when unique_violation then return jsonb_build_object('claim','held');
end $$;

create function public.novora_test_image_package_sandbox_complete(p_purchase_id uuid,p_owner jsonb,p_kind text,
  p_request_id text,p_fingerprint text,p_result jsonb)
returns jsonb language plpgsql security invoker set search_path = pg_catalog, public as $$
declare p public.novora_test_image_package_purchases; op public.novora_test_image_package_sandbox_operations; order_id text;
begin
  select * into p from public.novora_test_image_package_purchases where purchase_id=p_purchase_id for update;
  if not found or p.provider<>'paypal_sandbox' or (p_owner->>'scope') is distinct from p.owner_scope
    or (p_owner->>'identity') is distinct from p.owner_identity then return jsonb_build_object('ok',false); end if;
  select * into op from public.novora_test_image_package_sandbox_operations where purchase_id=p_purchase_id and kind=p_kind for update;
  if not found or op.request_id is distinct from p_request_id or op.fingerprint is distinct from p_fingerprint
    or p_result is null or jsonb_typeof(p_result)<>'object' or (p_result->>'state') is null
    or (p_result->>'state') not in ('PAID','CREATED','APPROVED','PENDING','CANCELLED','DENIED','REVERSED','UNKNOWN','REJECTED') then
    return jsonb_build_object('ok',false); end if;
  if op.result is not null then return jsonb_build_object('ok',op.result=p_result); end if;
  order_id := case when p_result->>'state'='PAID' then p_result->'capture'->>'providerOrderId'
    when p_result->>'state' in ('CREATED','APPROVED','PENDING','CANCELLED','DENIED','REVERSED') then p_result->>'providerOrderId' else null end;
  if p_result->>'state' not in ('UNKNOWN','REJECTED') then
    if order_id is null or order_id !~ '^[A-Z0-9]{1,64}$' or (p.provider_order_id is not null and p.provider_order_id<>order_id) then
      return jsonb_build_object('ok',false); end if;
    if p_result->>'state'='PAID' and ((p_result->'capture'->>'purchaseId') is distinct from p.purchase_id::text
      or (p_result->'capture'->>'providerKey') is distinct from 'paypal_sandbox'
      or (p_result->'capture'->>'amountMinor') is distinct from '100'
      or (p_result->'capture'->>'currency') is distinct from 'USD'
      or (p_result->'capture'->>'merchantId') is distinct from p.sandbox_merchant_id) then return jsonb_build_object('ok',false); end if;
    update public.novora_test_image_package_purchases set provider_order_id=order_id where purchase_id=p_purchase_id;
  end if;
  update public.novora_test_image_package_sandbox_operations set result=p_result,completed_at=clock_timestamp() where request_id=op.request_id;
  return jsonb_build_object('ok',true);
exception when unique_violation then return jsonb_build_object('ok',false);
end $$;

-- No public execute (including functions created under permissive defaults).
revoke all on function public.novora_test_image_package_create(jsonb), public.novora_test_image_package_find(uuid),
  public.novora_test_image_package_balance(uuid,uuid),
  public.novora_test_image_package_claim_dispatch(jsonb),public.novora_test_image_package_settle_dispatch(jsonb),
  public.novora_test_image_package_sandbox_purchase(uuid,jsonb),
  public.novora_test_image_package_sandbox_claim(uuid,jsonb,text,text,text,text),
  public.novora_test_image_package_sandbox_complete(uuid,jsonb,text,text,text,jsonb),
  public.novora_test_image_package_grant(jsonb,text), public.novora_test_image_package_reserve(jsonb),
  public.novora_test_image_package_finish(jsonb) from public, anon, authenticated;
grant execute on function public.novora_test_image_package_create(jsonb), public.novora_test_image_package_find(uuid),
  public.novora_test_image_package_balance(uuid,uuid),
  public.novora_test_image_package_claim_dispatch(jsonb),public.novora_test_image_package_settle_dispatch(jsonb),
  public.novora_test_image_package_sandbox_purchase(uuid,jsonb),
  public.novora_test_image_package_sandbox_claim(uuid,jsonb,text,text,text,text),
  public.novora_test_image_package_sandbox_complete(uuid,jsonb,text,text,text,jsonb),
  public.novora_test_image_package_grant(jsonb,text), public.novora_test_image_package_reserve(jsonb),
  public.novora_test_image_package_finish(jsonb) to service_role;
commit;
