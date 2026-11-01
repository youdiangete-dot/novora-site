-- UNEXECUTED. New isolated synthetic cluster only, after permissive defaults,
-- candidate schema and concurrency fixture. Never change existing cluster roles.
\set ON_ERROR_STOP on
begin;
do $$ begin
  if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    cross join lateral aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a
    where n.nspname='public' and c.relname like 'novora_test_image_package_%' and c.relkind='r' and a.grantee=0)
    or exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
      where n.nspname='public' and p.proname like 'novora_test_image_package_%' and a.grantee=0) then
    raise exception 'PUBLIC/default privilege leaked'; end if;
  if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname like 'novora_test_image_package_%'
      and (p.prosecdef or not coalesce(p.proconfig @> array['search_path=pg_catalog, public'],false))) then
    raise exception 'RPC invoker/search_path mismatch'; end if;
  raise notice 'TEST01_PUBLIC_DEFAULT_ACL_ASSERTIONS_PASS';
end $$;

-- Same statements execute under each actual low-privilege role. If even one
-- succeeds, the following exception aborts/rolls back rather than claiming PASS.
set local role anon;
do $$
declare rel regclass; stmt text; checked integer:=0;
begin
  for rel in select c.oid::regclass from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname like 'novora_test_image_package_%' and c.relkind='r' loop
    foreach stmt in array array[format('select count(*) from %s',rel),format('insert into %s default values',rel),
      format('update %s set purchase_id=purchase_id where false',rel),
      format('delete from %s where false',rel),format('truncate %s',rel)] loop
      begin execute stmt; raise exception 'anon table privilege unexpectedly allowed';
      exception when insufficient_privilege then checked:=checked+1; end;
    end loop;
  end loop;
  for stmt in select format('select %I.%I(%s)',n.nspname,p.proname,
    (select string_agg('NULL::'||format_type(arg,null),',' order by ord)
      from unnest(p.proargtypes::oid[]) with ordinality args(arg,ord)))
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname like 'novora_test_image_package_%' loop
    begin execute stmt; raise exception 'anon RPC unexpectedly allowed';
    exception when insufficient_privilege then checked:=checked+1; end;
  end loop;
  if checked<>26 then raise exception 'anon assertion count %, expected 26',checked; end if;
  raise notice 'TEST01_ANON_ACTUAL_ROLE_DENIALS_PASS: %',checked;
end $$;
reset role;
set local role authenticated;
do $$
declare rel regclass; stmt text; checked integer:=0;
begin
  for rel in select c.oid::regclass from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname like 'novora_test_image_package_%' and c.relkind='r' loop
    foreach stmt in array array[format('select count(*) from %s',rel),format('insert into %s default values',rel),
      format('update %s set purchase_id=purchase_id where false',rel),
      format('delete from %s where false',rel),format('truncate %s',rel)] loop
      begin execute stmt; raise exception 'authenticated table privilege unexpectedly allowed';
      exception when insufficient_privilege then checked:=checked+1; end;
    end loop;
  end loop;
  for stmt in select format('select %I.%I(%s)',n.nspname,p.proname,
    (select string_agg('NULL::'||format_type(arg,null),',' order by ord)
      from unnest(p.proargtypes::oid[]) with ordinality args(arg,ord)))
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname like 'novora_test_image_package_%' loop
    begin execute stmt; raise exception 'authenticated RPC unexpectedly allowed';
    exception when insufficient_privilege then checked:=checked+1; end;
  end loop;
  if checked<>26 then raise exception 'authenticated assertion count %, expected 26',checked; end if;
  raise notice 'TEST01_AUTHENTICATED_ACTUAL_ROLE_DENIALS_PASS: %',checked;
end $$;
reset role;
set local role service_role;
do $$
declare stmt text; checked integer:=0; result jsonb;
begin
  foreach stmt in array array[
    'update public.novora_test_image_package_purchases set owner_scope=owner_scope where false',
    'update public.novora_test_image_package_purchases set owner_identity=owner_identity where false',
    'update public.novora_test_image_package_purchases set subject_id=subject_id where false',
    'update public.novora_test_image_package_purchases set sandbox_merchant_id=sandbox_merchant_id where false',
    'update public.novora_test_image_package_uses set reservation_id=reservation_id where false',
    'update public.novora_test_image_package_uses set operation_id=operation_id where false',
    'update public.novora_test_image_package_uses set brief_id=brief_id where false',
    'update public.novora_test_image_package_uses set source_output_id=source_output_id where false',
    'update public.novora_test_image_package_uses set kind=kind where false',
    'update public.novora_test_image_package_sandbox_operations set fingerprint=fingerprint where false'] loop
    begin execute stmt; raise exception 'service_role binding update unexpectedly allowed';
    exception when insufficient_privilege then checked:=checked+1; end;
  end loop;
  result:=public.novora_test_image_package_find('10000000-0000-4000-8000-000000000001');
  if result->>'ok' is distinct from 'true' then raise exception 'service-role scoped RPC read failed'; end if;
  -- Positive lifecycle writes are exercised by running the full single-session
  -- suite as service_role before this script, not inferred from GRANT text.
  if checked<>10 then raise exception 'service-role assertion count mismatch'; end if;
  raise notice 'TEST01_SERVICE_ROLE_BINDING_DENIALS_AND_RPC_READ_PASS';
end $$;
reset role;
rollback;
