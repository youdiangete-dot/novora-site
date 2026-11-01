# Remaining TEST-01 local PostgreSQL proof request (not executed)

This is a concrete FUTURE Owner/host-approval request, not execution permission.
Scope: one new, empty synthetic PostgreSQL container, no online target/customer
data, image pull/install, existing-container/volume changes, Docker-setting or
context changes, privilege workaround, payment or Provider calls. No Docker/SQL
command below has run. Unit/SQL-text checks are not real DB proof.

Corrected B SQL candidate SHA-256 (computed locally from exact file bytes):
`660aec6edac9584506f480ac99c937d1a6e8539770001676407f7ee0f2f00376`.
Path: `docs/novora-test01-image-packages-candidate.sql`. A combined A+B packet
must separately name/hash A's SQL and re-review its complete command/file
manifest before execution; this plan does not authorize additional SQL.

Proposed container name: `novora-test01-pg-660aec6e-b1` (not created; name
availability unverified). Proposed existing official image tag:
`postgres:17-alpine`. Current local availability, image ID/digest and engine
access are UNVERIFIED. Historical availability is background only.

Original attempted command: `docker ps --format '{{.Names}} {{.Image}}'`.
Original result: `permission denied while trying to connect to the docker API
at npipe:////./pipe/dockerDesktopLinuxEngine`. That read is not retried here.

## Supported future host-command review

The available `exec_command` metadata supports `sandbox_permissions:
"require_escalated"` plus a per-command `justification`. It does not promise
approval or host access. After exact Owner approval, submit the following
Docker commands through that mechanism, without a broad `prefix_rule`, other
shell/admin/UAC/ACL change or Docker context. If any command is denied, STOP
that action and report the exact target/result; no bypass/retry. Example ONLY:

```js
await tools.exec_command({
  cmd: "docker image inspect postgres:17-alpine --format '{{.Id}} {{json .RepoDigests}} {{json .Config.Volumes}}'",
  workdir: "C:\\Projects\\NOVORA\\novora-site\\out\\test01-image-package-entitlements-v1",
  sandbox_permissions: "require_escalated",
  justification: "May I inspect only the existing local postgres:17-alpine image for the approved isolated TEST-01 database test, without pulling it?",
  max_output_tokens: 1000
});
```

## Exact proposed setup commands (not executed)

All PowerShell blocks run from this B worktree. Each Docker invocation needs
the supported host review above. First verify the candidate hash equals the
literal above, then perform the image-inspect command. If image absent, engine
unavailable/denied, or volume metadata is not exactly the expected PostgreSQL 17
data path `/var/lib/postgresql/data`, STOP without pull/install/run. Record
actual image ID/digests; the official tag is a proposal, not a verified ID.

```powershell
(Get-FileHash -Algorithm SHA256 docs/novora-test01-image-packages-candidate.sql).Hash
docker image inspect postgres:17-alpine --format '{{.Id}} {{json .RepoDigests}} {{json .Config.Volumes}}'
docker run --pull never --name novora-test01-pg-660aec6e-b1 --network none --tmpfs /var/lib/postgresql/data:rw,nosuid,nodev --label novora.test01.plan=660aec6e --label novora.test01.owner=agent-b --env POSTGRES_HOST_AUTH_METHOD=trust --detach postgres:17-alpine
```

`trust` is confined to this disconnected synthetic container. No host ports,
bind mounts, business mounts or persistent named/anonymous data volumes are
permitted. A name collision/run failure stops the plan without touching the
pre-existing named object. Capture the full returned NEW container ID as
`$taskContainerId`; never infer it from a name after a failed/uncertain run.
Substitute only that captured ID in all subsequent commands. Inspect its exact
ID/name/labels, NetworkMode=none, empty PortBindings/Binds, and tmpfs-only mounts:

```powershell
$taskContainerId = '<exact new ID returned by successful run>'
$taskInspection = docker inspect $taskContainerId | ConvertFrom-Json
$taskInspection | Select-Object Id,Name,@{n='Labels';e={$_.Config.Labels}},@{n='NetworkMode';e={$_.HostConfig.NetworkMode}},@{n='PortBindings';e={$_.HostConfig.PortBindings}},@{n='Binds';e={$_.HostConfig.Binds}},Mounts
docker exec --user postgres $taskContainerId pg_isready -U postgres -d postgres
docker exec --user postgres $taskContainerId postgres --version
```

Readiness checks may run at most five times, one second apart, only on this
captured new ID; any permission/transport denial stops immediately. If still
not ready, record failure and use only the bounded cleanup below. No repair,
restart, alternate image or new container. Record actual PostgreSQL version.

Copy this exact manifest; `docker cp` is a file copy, not a bind mount:

```powershell
docker cp tests/tools/test01-pg-bootstrap.sql "${taskContainerId}:/tmp/bootstrap.sql"
docker cp docs/novora-test01-image-packages-candidate.sql "${taskContainerId}:/tmp/candidate.sql"
docker cp tests/tools/test01-image-packages-db.sql "${taskContainerId}:/tmp/single.sql"
docker cp tests/tools/test01-image-packages-concurrency-fixture.sql "${taskContainerId}:/tmp/concurrency.sql"
docker cp tests/tools/test01-image-packages-roles.sql "${taskContainerId}:/tmp/roles.sql"
docker cp tests/tools/test01-image-packages-race.sql "${taskContainerId}:/tmp/race.sql"
docker cp tests/tools/test01-image-packages-race-check.sql "${taskContainerId}:/tmp/race-check.sql"
docker exec --user postgres $taskContainerId sha256sum /tmp/candidate.sql
docker exec --user postgres $taskContainerId psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres -f /tmp/bootstrap.sql
docker exec --user postgres $taskContainerId psql -X -v ON_ERROR_STOP=1 -U postgres -d novora_test01 -f /tmp/candidate.sql
docker exec --user postgres $taskContainerId psql -X -v ON_ERROR_STOP=1 -U postgres -d novora_test01 -c "SET ROLE service_role" -f /tmp/single.sql
docker exec --user postgres $taskContainerId psql -X -v ON_ERROR_STOP=1 -U postgres -d novora_test01 -c "SET ROLE service_role" -f /tmp/concurrency.sql
docker exec --user postgres $taskContainerId psql -X -v ON_ERROR_STOP=1 -U postgres -d novora_test01 -f /tmp/roles.sql
```

Stop on any nonzero exit/hash mismatch/missing PASS notice. Bootstrap creates
roles/database only in the NEW cluster and deliberately grants permissive
PUBLIC/anon/authenticated/service_role table/function defaults before candidate
creation. Roles script then executes real SELECT/INSERT/UPDATE/DELETE/TRUNCATE
attempts and all eleven RPCs as anon/authenticated (26 expected denials each),
checks PUBLIC ACL removal, SECURITY INVOKER/fixed search_path, and ten actual
service_role binding UPDATE denials plus a successful scoped RPC. Running the
single-session suite as service_role establishes positive lifecycle DML/RPC
permissions rather than merely reading GRANT text. Single-session rows roll back.

## Exact two-session commands and expected outcomes

Start two independent reviewed `exec_command` sessions with `tty: true`, each:

```powershell
docker exec -i --user postgres $taskContainerId psql -X -v ON_ERROR_STOP=1 -U postgres -d novora_test01
```

For each race in order `capacity`, `dispatch`, `payment`, `sandbox`,
`release_first`, `claim_first`, send via `write_stdin` to session A:

```text
\set race capacity
\set worker A
\i /tmp/race.sql
```

After A returns its SELECT result (transaction deliberately open), send the
same with worker B to session B. Replace `capacity` with each exact case name
for later rounds. While B waits, prove a real database lock wait using one
read-only observer command against the same NEW ID:

```powershell
docker exec --user postgres $taskContainerId psql -X -U postgres -d novora_test01 -c "select application_name,wait_event_type,wait_event from pg_stat_activity where application_name like 'test01_%' order by application_name"
```

Then send `COMMIT;` to A; collect B's SELECT result and send `COMMIT;` to B.
Do not sleep inside SQL or let psql disconnect/auto-rollback between claim and
commit. Exact expected pairs (A/B): reserved/exhausted; claimed/already_claimed;
first grant/conflict; acquired/held; released/denied; claimed/conflict.
The final two prove both release-vs-claim orderings: a confirmed pre-dispatch
failure requires `failurePhase=before_dispatch`; no fake claim and no stale
release of an already claimed job. Run a fresh-connection persistence check:

```powershell
docker exec --user postgres $taskContainerId psql -X -v ON_ERROR_STOP=1 -U postgres -d novora_test01 -f /tmp/race-check.sql
```

The check asserts exact row counts, no sixth slot, both race winners,
single payment/journal identities, UNKNOWN hold and no redispatch, released
entitlement with retained cumulative cost. It invokes no external side effect.
Exit both interactive psql sessions with `\q` before cleanup.

## Exact bounded cleanup

Only after inspecting the captured successful-run ID again and verifying it
still has name `/novora-test01-pg-660aec6e-b1` and both exact plan/owner labels:

```powershell
docker inspect $taskContainerId --format '{{.Id}} {{.Name}} {{json .Config.Labels}} {{.State.Running}}'
docker stop --time 10 $taskContainerId
docker inspect $taskContainerId --format '{{.Id}} {{.State.Running}} {{.State.Status}}'
docker rm $taskContainerId
```

Verify `State.Running=false` before removal. No force, `-v`, prune, image
removal, shared DB deletion, existing container or volume operation. Tmpfs is
ephemeral. If stop/removal is denied or uncertain, report the exact known ID
and state; do not escalate beyond the reviewed mechanism or touch another
object. On success record removal output plus before/after known outcome.

## Assertion detail / acceptance limits

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
