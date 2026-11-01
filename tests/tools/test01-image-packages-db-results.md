# TEST-01 actual local PostgreSQL evidence — 2026-11-01

Owner explicitly approved the local TEST MVP DB verification stage at
2026-11-01 08:18:33 UTC. B was the single Docker execution owner. Every Docker
host command used the supported `exec_command` `require_escalated` review with
a scoped justification. No host review was refused in this approved run.

## Exact tested candidate and target

- Source commit: `7fe405a73a3ed793d432a6c1d0f2fa62f997c7c2`.
- Exact candidate file: `docs/novora-test01-image-packages-candidate.sql`.
- SHA-256, matched on Windows and again inside the container before execution:
  `660aec6edac9584506f480ac99c937d1a6e8539770001676407f7ee0f2f00376`.
- Existing image tag: `postgres:17-alpine`; no pull/install occurred.
- Actual image ID: `sha256:b0f9560a2de083e2cc7382e75f808c7381a32852a7ec49117deedb300e552b24`.
- Actual RepoDigest: `postgres@sha256:b0f9560a2de083e2cc7382e75f808c7381a32852a7ec49117deedb300e552b24`.
- Actual binary version: `postgres (PostgreSQL) 17.11`.
- New container: `novora-test01-pg-660aec6e-b1`.
- Exact created ID: `6d5abb196f95ebe51b0eaf290c890a8deaa1b40f688de87d88e2a547ba43da2d`.
- Before creation, exact-name inspect returned `No such container` (expected
  absence, not an execution failure). The subsequent run succeeded once.
- Inspected isolation: NetworkMode=`none`, PortBindings=`{}`, Binds=`null`,
  tmpfs `/var/lib/postgresql/data`=`rw,nosuid,nodev`, Mounts=`[]`.
- Verified labels: `novora.test01.owner=agent-b`, `novora.test01.plan=660aec6e`.

## Actual assertions

The reviewed bootstrap, candidate, single-session and concurrency fixtures
all executed with `ON_ERROR_STOP=1`; all commands exited 0. There was no SQL
or fixture failure, correction, rollback repair or candidate change in this run.

Single-session suite ran as actual `service_role` and returned both
`TEST01_SINGLE_SESSION_ASSERTIONS_PASS` and
`TEST01_SANDBOX_SINGLE_SESSION_ASSERTIONS_PASS`, then rolled back its rows.
It covered grant/replay/reference uniqueness, five initial plus five revision
slots, payment/subject mismatch, exact expiry, UNKNOWN hold, monotonic cost,
settled/released terminality, pre-dispatch release without fake claim,
wrong-owner/brief denial, repeated release, post-claim stale-release conflict,
NULL constraints, immutable Sandbox completion and atomic order binding.

Bootstrap deliberately set permissive PUBLIC/anon/authenticated/service_role
default table/function privileges before candidate creation. Actual-role tests
returned:

- `TEST01_PUBLIC_DEFAULT_ACL_ASSERTIONS_PASS`: no PUBLIC/default ACL leak,
  fixed search_path, SECURITY INVOKER.
- `TEST01_ANON_ACTUAL_ROLE_DENIALS_PASS: 26`: actual SELECT/INSERT/UPDATE/DELETE/
  TRUNCATE attempts against all three tables and execution of all eleven RPCs.
- `TEST01_AUTHENTICATED_ACTUAL_ROLE_DENIALS_PASS: 26`: same actual attempts.
- `TEST01_SERVICE_ROLE_BINDING_DENIALS_AND_RPC_READ_PASS`: ten binding-column
  UPDATE denials, successful scoped RPC; positive lifecycle DML/RPC permission
  was separately exercised by the complete single-session service-role suite.

Two independent psql sessions executed all six races. A held an uncommitted
result; B started before A committed. A separate `pg_stat_activity` observer
confirmed A=`Client/ClientRead` and B=`Lock/transactionid` in EVERY race.
After A committed, B completed with these observed results:

| Race | Session A | Session B |
| --- | --- | --- |
| Fifth initial slot | reserved, duplicate=false | exhausted |
| Same reservation dispatch | claimed | already_claimed |
| Same payment reference, distinct purchases | first grant | conflict |
| Same Sandbox create operation | acquired | held |
| Pre-dispatch release wins | released, duplicate=false | claim denied |
| Dispatch claim wins | claimed | pre-dispatch release conflict |

A fresh third connection ran `test01-image-packages-race-check.sql`, returned
`TEST01_REAL_TWO_SESSION_RACE_PERSISTENCE_ASSERTIONS_PASS`, and committed.
It confirmed persisted race winners, no sixth slot/duplicate payment/journal,
UNKNOWN not dispatching again, and known synthetic cost preserved on release.

Final read-only evidence before stopping:

- Five total use rows; three non-released initial uses; zero revision uses.
- Operation ending `000001`: released, previously claimed, synthetic cost 12345
  USD micros retained after a lower cost=12000 release report.
- Operation ending `000002`: released, never claimed, cost 0.
- Operation ending `000003`: reserved and claimed; stale pre-dispatch release
  did not restore this in-flight slot.
- Exactly one grant for `TEST-CONCURRENCY-SHARED`.
- Exactly one Sandbox create journal, completed as UNKNOWN, not acquired again.
- Both interactive psql sessions exited successfully with `\q`.

These cost/payment records are synthetic test values, not real expenditure,
money movement, actual Sandbox payment or customer entitlement issuance.

## Stop, retention and remaining cleanup

After B passed, the coordinator explicitly required keeping the SAME approved
container stopped for possible A revision tests, rather than removing it and
creating a second container. The exact ID/name/both labels were revalidated;
`docker stop --time 10 <exact ID>` succeeded (only a flag-deprecation warning).
A separate reviewed inspect independently confirmed:

```text
6d5abb196f95ebe51b0eaf290c890a8deaa1b40f688de87d88e2a547ba43da2d
/novora-test01-pg-660aec6e-b1
running=false status=exited
```

The stopped container is intentionally NOT removed yet, per that instruction.
Final removal of only this ID remains with the single Docker execution owner
after coordinator schedules A or cancels it. No other container, image or volume
was changed. Tmpfs data must not be assumed retained after stop; restarting this
same container for coordinated A tests requires reinitializing synthetic data.

Subsequent stage completion: the coordinator supplied A's exact 92f3133 fixture;
the SAME container was restarted, passed revision verification, then stopped,
independently verified not running, removed and independently confirmed absent.
The retention text above records the intermediate checkpoint, not a currently
retained container. Exact A hashes/results/final cleanup are in
`test01-revision-db-results.md`. No second container was created.

The earlier sandbox-only read failed with `permission denied while trying to
connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine`.
That action had not executed. The later exact Owner grant and per-command host
review supplied new authorization; the original `docker ps` read was not retried.

## Limits

This establishes B's actual isolated local PostgreSQL behavior only. It does not
establish online Supabase schema/RLS, HTTP/customer/Owner authentication,
deployed purchase binding, real PayPal Sandbox operation, paid image generation,
actual delivery or A's separate revision candidate. No provider/network payment,
customer data, credentials, online SQL, environment change or deployment occurred.
No app-code correction is needed from this DB run; source/hash remain unchanged.
