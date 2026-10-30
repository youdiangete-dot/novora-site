# M2 scoped receipt: local PostgreSQL evidence

Tested on 2026-10-30 against the SQL draft in parent commit
`74b60f9a2440f44c4f3223134f30406b471a20de` (SHA-256
`ce8e55a28cbefe42c5f3709062928b35bf026db9b56a43feea8f830bab966495`).
The project schema and roles in `m2-pg-fixture.sql` are synthetic assumptions,
not a copy or proof of current Supabase schema. No cloud database was contacted.

- Local `postgres:17-alpine`, image ID and RepoDigest
  `sha256:b0f9560a2de083e2cc7382e75f808c7381a32852a7ec49117deedb300e552b24`.
- Actual `server_version`: `17.11`; this does not establish the online version.
- 44 assertions: 25 in `m2-pg-assert.sql`, seven in
  `m2-pg-concurrency.sh`, seven in `m2-pg-extra.sql`, and five in `m2-pg-rls.sql`; all passed.
- Two independent psql sessions returned `created` and `existing`; assertions
  verified one Brief, contact, and receipt. Same ID with a changed digest
  returned conflict. Both contact and receipt constraint failures rolled back.
- RLS, PUBLIC/anon/authenticated denial, service-role privileges, invoker mode,
  fixed search path, absence of dynamic SQL, scoped reads, read-only behavior,
  single claim and monotonic UNKNOWN were checked against this local fixture.
  The trusted service role can supply scope; HTTP authenticates the invitation.
  SQL role checks do not establish actual Supabase or HTTP authorization.
- Real role tests verified RLS hides existing rows without policies, invoker RPC fails without caller SELECT, and anon/authenticated RPC calls fail. Temporary grants and role were rolled back and role absence verified. One additional read-only role-check command initially failed from PowerShell quote expansion; its corrected assertion passed.
- Prior HTTP/sender tests were mocks; no Queue, image, Provider or online
  Supabase verification was performed in this database stage.
- Container `1cfd52092cfcb21c61abd92a6371014982bdc2cd600214610b678360e58e7ae8`
  was stopped and inspected: `exited`, `running=false`, network `none`, no port
  bindings. Its isolated synthetic volume/container remain for review.

## Reproduction outline

Only after appropriate local authorization, start a uniquely named disposable
`postgres:17-alpine` container using `--pull never --network none`, without host
ports or business mounts, with `POSTGRES_HOST_AUTH_METHOD=trust` (safe here only
because it is a disconnected synthetic container). Copy the five files below
and the exact SQL draft into that new container. Run, with `psql -v
ON_ERROR_STOP=1`, fixture then draft then `m2-pg-assert.sql`; run `sh
m2-pg-concurrency.sh` (ensure LF line endings when copying from Windows); then run `m2-pg-extra.sql` and `m2-pg-rls.sql`. Any command failure stops the
run. Finally stop and inspect that exact new container; do not remove unrelated
containers, images, or volumes. The shell script creates its result files only
inside the disposable container. Do not run it against a populated database.

Files: `m2-pg-fixture.sql`, `m2-pg-assert.sql`, `m2-pg-concurrency.sh`,
`m2-pg-extra.sql`, `m2-pg-rls.sql`, and `docs/m2-scoped-receipt-rpc-draft.sql`.

Before any separately authorized migration: verify the live schema and types,
role ownership/grants and RLS assumptions, deployed version, backups, retention,
and the handling of in-flight submissions. Before rollback after traffic, retain
and reconcile receipt mappings and in-flight outcomes. This evidence does not
authorize or validate an online migration.

## Coordinator-reported isolated migration and local ACL correction

The following cloud facts were reported by the coordinating task from its connector results; this local task did not query or independently verify cloud state. On project `dibpksbbzjczpjusujwk` (`novora-m2-beta-isolated`), the original draft with SHA-256 `ce8e55a28cbefe42c5f3709062928b35bf026db9b56a43feea8f830bab966495` was applied once successfully. The coordinator reported one new table, four invoker functions and no receipt rows, with RLS and the intended function grants. A subsequent independent ACL read found the default table privileges also gave `service_role` ALL; the original grant-only SQL had not removed those privileges.

The coordinator reports separately applying migration `m2_scoped_receipt_service_role_least_privilege`: `BEGIN; REVOKE ALL PRIVILEGES ON TABLE public.m2_scoped_submission_receipts FROM service_role; GRANT SELECT, INSERT, UPDATE ON TABLE public.m2_scoped_submission_receipts TO service_role; COMMIT;`. Its final independent read reported ACL `service_role=arw`, RLS enabled, zero receipt rows, and no DELETE, TRUNCATE, REFERENCES, TRIGGER or MAINTAIN. These are two distinct migrations; the historical original hash is unchanged as evidence. No cloud operation was performed by this local correction task.

The corrected local draft SHA-256 is `696e5d24ae07781f3738ff37e255a838354a173921411f4384b86920934e5eea`. A focused PostgreSQL 17.11 regression in `m2-pg-default-acl.sql` set synthetic default table privileges to ALL for `service_role` and passed six assertions. The original grant-only probe retained DELETE and other excess privileges; the corrected full draft retained SELECT/INSERT/UPDATE, excluded all five excess privileges, and denied PUBLIC/anon/authenticated table access. This local synthetic test does not establish live Supabase compatibility. The synthetic container was stopped with network none and no exposed ports; old synthetic data remain intact.

To reproduce only after appropriate local authorization: use a new empty synthetic database in a disconnected test container with existing synthetic roles `anon`, `authenticated` and `service_role`. Copy the corrected draft to `/tmp/m2-corrected-draft.sql`, copy `m2-pg-default-acl.sql` separately, and execute the latter using psql with `ON_ERROR_STOP=1`. Do not use any live or populated database. Stop and inspect the exact approved test container afterward.
