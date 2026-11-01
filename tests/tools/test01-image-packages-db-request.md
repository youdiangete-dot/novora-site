# Remaining TEST-01 local PostgreSQL proof request (not executed)

Coordinator: use only a separately authorized, empty, disposable synthetic
PostgreSQL database with the already available supported tooling and
Supabase-style `anon`, `authenticated`, `service_role` roles. Do not use an
online target, customer database, new container/software, changed Docker
settings, other Docker context or privileged workaround. This worker's Docker
pipe read was permission denied and was not retried. If no permitted target
exists, keep DB proof pending; unit/SQL-text checks are not a substitute.

Apply the exact reviewed candidate with stop-on-error, then run
`test01-image-packages-db.sql` (its synthetic rows roll back). Record both PASS
notices and absence of errors. Then apply
`test01-image-packages-concurrency-fixture.sql` once in that disposable DB.
It creates only TEST identities/purchases and four reserved initial slots.
No Provider, payment transport, credentials or customer data is needed.

For each race below open **two independent database sessions**. In session A,
`BEGIN`, execute its SELECT and leave the transaction open. Start session B's
SELECT concurrently; confirm it waits where expected. COMMIT A, collect B's
result, then assert the stated persisted row counts. No sleep or real external
call is required. Use a unique empty database or reset via disposing only that
authorized test database, never delete shared/customer rows.

## 1. Fifth-slot race, two distinct operations

Both sessions call `novora_test_image_package_reserve` with this JSON. Session A
uses operationId/reservationId ending `000005`; B uses `000006`.

```sql
select public.novora_test_image_package_reserve(jsonb_build_object(
  'purchaseId','10000000-0000-4000-8000-000000000001',
  'subjectId','20000000-0000-4000-8000-000000000001',
  'owner',jsonb_build_object('scope',repeat('a',64),'identity','TEST-owner'),
  'operationId','40000000-0000-4000-8000-000000000005',
  'reservationId','40000000-0000-4000-8000-000000000005',
  'kind','initial','briefId','30000000-0000-4000-8000-000000000001'));
```

A returns reserved/duplicate=false; B returns exhausted after A commits. Exactly
five non-released initial rows persist; revision capacity stays five.

## 2. Same-reservation dispatch race and UNKNOWN restart

Both sessions use:

```sql
select public.novora_test_image_package_claim_dispatch(jsonb_build_object(
  'owner',jsonb_build_object('scope',repeat('a',64),'identity','TEST-owner'),
  'operationId','40000000-0000-4000-8000-000000000001',
  'reservationId','40000000-0000-4000-8000-000000000001',
  'kind','initial','briefId','30000000-0000-4000-8000-000000000001'));
```

Exactly one `claimed`, the other `already_claimed`; one immutable claimed_at.
In a fresh session, use the same JSON plus outcome=`unknown` and
providerCostUsdMicros=12345 with `novora_test_image_package_settle_dispatch`.
Fresh connections must now get `unknown` on claim; quota still occupies one
slot. Settle definite_failure with cost=12000: released, retained cost=12345.
Claim still returns already_claimed. Changing owner/scope/brief/kind/source or
operation on the same reservation must deny without modifying binding/cost.

## 3. One payment reference, two purchases

Both sessions call `novora_test_image_package_grant` using the manual expected
purchase fields, owner=`{scope: repeat('a',64), identity: 'TEST-owner'}`,
sandboxMerchantId=null, amountMinor=100, currency=USD, environment=TEST,
packageCode=TEST-01, subjectId=`20000000-0000-4000-8000-000000000001`,
paymentReference=`TEST-CONCURRENCY-SHARED`, canonical current UTC confirmedAt,
and verifier=`TEST-owner`. A's purchase ends `000002`; B's ends `000003`.
The first commits one grant; the second conflicts through the unique
(provider,payment_reference) constraint. Exactly one granted row references
that payment. Replaying it does not change original expiry/verifier.

## 4. Same Sandbox create claim, no external request

Both sessions use:

```sql
select public.novora_test_image_package_sandbox_claim(
  '10000000-0000-4000-8000-000000000004',
  jsonb_build_object('scope',repeat('a',64),'identity','TEST-owner'),
  'create',null,repeat('1',32),repeat('a',64));
```

Exactly one acquired, the other held; one journal row. A different request or
fingerprint for the same purchase/kind remains held. Complete UNKNOWN/transport,
then fresh-session claim returns completed UNKNOWN, never acquired. A separate
synthetic purchase can test CREATED completion: completion and immutable order
mapping must commit together or both roll back on a unique-order conflict.

## 5. Roles and proof limits

In disposable sessions, verify anon/authenticated cannot execute any package
RPC or read/write any of its three tables; verify all RPCs are SECURITY INVOKER
with fixed search_path and service-role-only privileges. Under service_role, binding-column
UPDATE (purchase owner/subject/merchant and use reservation/operation/brief/source/kind)
must fail while the invoker lifecycle RPCs succeed with their column grants.
Do not change existing containers, cluster settings or online roles. Record actual PostgreSQL version,
exact candidate hash, session outputs and post-race counts. These local results
would still not prove HTTP authentication, Owner authorization, deployed
binding, PayPal Sandbox acceptance or real Provider cost/delivery behavior.
