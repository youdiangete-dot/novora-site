# Actual A revision PostgreSQL verification and stage cleanup — 2026-11-01

This is the second part of the same Owner-approved local TEST MVP database
stage. B remained the only Docker execution owner and reused the SAME retained
container, never a second container. Unchanged B suites were not rerun.

## Exact A source and bytes

Reviewed the 13-file changed-file manifest of A commit
`92f3133b5978d520303c783d701a24cc91479542` (parent
`4643c320353a3fcf44c631fb4ec51cb7d03ad281`), its candidate diff and complete
five SQL/fixture files. A's checkout matched that commit and was clean when
copied. No A or C source file was edited by B.

All five local and container-copy SHA-256 values matched:

| File in A worktree | SHA-256 |
| --- | --- |
| `docs/novora-g2-revision-current-output-candidate.sql` | `c0f34cea54176f1e1f6070407c6ce54976c8398c15a7249d71e296b612c31a44` |
| `tests/tools/g2-revision-promotion-setup.sql` | `61cc7741db796d73e83bdd77426a0fe99c24d788ba4ea1972166a3e9808e2c7c` |
| `tests/tools/g2-revision-promotion-assert.sql` | `4a27e2c436338f758f90651e46b8211d91a88ba1041c65947fa17ace2e98d226` |
| `tests/tools/g2-revision-promotion-race-call.sql` | `9e83d2fa12457000a2aa4a81b091cdb76c5312c648fec66bac4357723e6dd408` |
| `tests/tools/g2-revision-promotion-race-assert.sql` | `081e48b16fe96c2fa6ce129cfbf64bb2bfd2618160a699a9e20ffe61b417e805` |

The candidate changed from A's older checkpoint hash; only the exact c0f34cea
bytes above were executed. No candidate/fixture defect or source fix occurred.

## Same isolated target and explicit prerequisites

- Container ID: `6d5abb196f95ebe51b0eaf290c890a8deaa1b40f688de87d88e2a547ba43da2d`.
- Name: `novora-test01-pg-660aec6e-b1`.
- Labels: `novora.test01.plan=660aec6e`, `novora.test01.owner=agent-b`.
- PostgreSQL: `17.11`, same existing image ID/RepoDigest recorded in B's results.
- Before restart verified `State.Running=false`, NetworkMode=none, no ports,
  bind mounts or data volumes; tmpfs-only data path unchanged.
- Restarted this exact ID through supported reviewed host commands. Readiness
  passed. Both old synthetic database names were absent, consistent with tmpfs
  data loss; no existing database was dropped or repaired.
- Created only A's specified empty `novora_g2_revision_test`. Applied A's exact
  setup fixture, which defines the non-sensitive M3 prerequisite column/constraint
  slice, then the candidate, then its assertion script with ON_ERROR_STOP=1.
- The fixture is not evidence of current online M3/Core schema parity. No schema
  was guessed, and no online Supabase/database/customer row was contacted.

## Actual single-session, roles and atomicity results

Setup and candidate applied successfully; the exact assertion script returned
`G2_REVISION_ASSERTIONS_PASS` with exit 0. It actually exercised:

- SECURITY INVOKER, empty fixed search_path, service-role-only execute posture.
- Actual anon/authenticated invocation denied with insufficient_privilege.
- Actual service_role promotion/rejection paths under fixture RLS policies.
  Read-only role metadata confirmed all three roles had `rolbypassrls=false`.
- Unsafe privacy=false, string-true instead of boolean, failed visual evidence,
  wrong content hash and unbound source rejected while preserving the old image.
- An injected output-write trigger failure AFTER source update rolled the
  transaction back: source remained current, candidate stayed non-current and
  review pointer remained on the source.
- Missing definite-failure marker on a failed-parent continuation rejected;
  the explicit marker allowed a later revision while preserving valid ancestry.
- Normal successful promotion and failed-parent continuation updated source,
  candidate and mutable review pointer atomically; duplicate promotion rejected.

The injected trigger exception and negative-case rejections were expected,
caught assertions, not candidate defects. There was no unexpected SQL failure.

## Actual two-session race

A's race-call fixture contains a one-second sleep and COMMIT. Rather than rely
on host-command timing, executed the SAME database guard/SET ROLE/BEGIN/
`DO ... g2_fixture.promote(5)` statements in two independent interactive psql
sessions, kept A's transaction open and committed manually after proving B's
lock wait. This transparent timing adjustment changed no A file, candidate
logic or fixture data. Only the sleep/automatic commit were replaced by explicit
coordinator control.

Observed `pg_stat_activity`:

```text
g2_revision_A  Client  ClientRead
g2_revision_B  Lock    transactionid
```

A committed successfully (exit 0). B then rejected with the EXPECTED
`ERROR: 22023: REVISION_PROMOTION_REJECTED` and exited 1; its connection closed
and aborted transaction rolled back. This losing-session exit is expected race
evidence, not an unhandled test failure or reason to alter the candidate.

A fresh connection ran A's exact race-assert file and returned
`G2_REVISION_RACE_PASS` (exit 0). Final read-only counts:

| Case | Current image count | Candidate current | Source current |
| --- | --- | --- | --- |
| 1 normal promotion | 1 | true | false |
| 2 privacy rejections | 1 | false | true |
| 3 hash/source rejections | 1 | false | true |
| 4 explicit failed-parent continuation | 1 | true | false |
| 5 concurrent promotion | 1 | true | false |

## Final cleanup of the one approved container

Both B and revision tests completed. After revalidating exact ID/name/labels,
stopped the container with timeout 10. An INDEPENDENT reviewed inspect showed
`running=false status=exited` with the expected name and labels. Revalidated
the stopped identity again, then `docker rm <exact ID>` succeeded, without
force, prune, `-v`, image removal or other-container/volume operations.

A separate exact-ID inspect returned the expected absence:

```text
Error response from daemon: No such container: 6d5abb196f95ebe51b0eaf290c890a8deaa1b40f688de87d88e2a547ba43da2d
```

The approved one-container stage is now closed; no retained/running test
container remains. No further Docker action is pending from B.

## Distinct later read adapter and remaining proof limits

After SQL completed and cleanup, B added the coordinator-requested read-only
`isDefiniteFailure(binding)` adapter using existing SELECT grants; no SQL hash,
schema, RPC or A/C source changed. Its focused query-builder/service tests are
local dependency-injected evidence. This PostgreSQL run does not prove the new
Supabase/PostgREST adapter over HTTP; that remains integrated verification.

Neither B nor A's local PASS establishes deployed/online schema compatibility,
HTTP Owner/customer authorization, real Sandbox payment, image generation,
private Storage delivery or commercial acceptance. No secrets, real external
Provider/payment/network call, online mutation or publication occurred.
