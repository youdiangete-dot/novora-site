# M2 scoped receipt: local PostgreSQL evidence

Tested on 2026-10-30 against the SQL draft in parent commit
`74b60f9a2440f44c4f3223134f30406b471a20de` (SHA-256
`ce8e55a28cbefe42c5f3709062928b35bf026db9b56a43feea8f830bab966495`).
The project schema and roles in `m2-pg-fixture.sql` are synthetic assumptions,
not a copy or proof of current Supabase schema. No cloud database was contacted.

- Local `postgres:17-alpine`, image ID and RepoDigest
  `sha256:b0f9560a2de083e2cc7382e75f808c7381a32852a7ec49117deedb300e552b24`.
- Actual `server_version`: `17.11`; this does not establish the online version.
- 39 assertions: 25 in `m2-pg-assert.sql`, seven in
  `m2-pg-concurrency.sh`, seven in `m2-pg-extra.sql`; all passed.
- Two independent psql sessions returned `created` and `existing`; assertions
  verified one Brief, contact, and receipt. Same ID with a changed digest
  returned conflict. Both contact and receipt constraint failures rolled back.
- RLS, PUBLIC/anon/authenticated denial, service-role privileges, invoker mode,
  fixed search path, absence of dynamic SQL, scoped reads, read-only behavior,
  single claim and monotonic UNKNOWN were checked against this local fixture.
  The trusted service role can supply scope; HTTP authenticates the invitation.
  SQL role checks do not establish actual Supabase or HTTP authorization.
- Prior HTTP/sender tests were mocks; no Queue, image, Provider or online
  Supabase verification was performed in this database stage.
- Container `1cfd52092cfcb21c61abd92a6371014982bdc2cd600214610b678360e58e7ae8`
  was stopped and inspected: `exited`, `running=false`, network `none`, no port
  bindings. Its isolated synthetic volume/container remain for review.

## Reproduction outline

Only after appropriate local authorization, start a uniquely named disposable
`postgres:17-alpine` container using `--pull never --network none`, without host
ports or business mounts, with `POSTGRES_HOST_AUTH_METHOD=trust` (safe here only
because it is a disconnected synthetic container). Copy the four files below
and the exact SQL draft into that new container. Run, with `psql -v
ON_ERROR_STOP=1`, fixture then draft then `m2-pg-assert.sql`; run `sh
m2-pg-concurrency.sh`; then run `m2-pg-extra.sql`. Any command failure stops the
run. Finally stop and inspect that exact new container; do not remove unrelated
containers, images, or volumes. The shell script creates its result files only
inside the disposable container. Do not run it against a populated database.

Files: `m2-pg-fixture.sql`, `m2-pg-assert.sql`, `m2-pg-concurrency.sh`,
`m2-pg-extra.sql`, and `docs/m2-scoped-receipt-rpc-draft.sql`.

Before any separately authorized migration: verify the live schema and types,
role ownership/grants and RLS assumptions, deployed version, backups, retention,
and the handling of in-flight submissions. Before rollback after traffic, retain
and reconcile receipt mappings and in-flight outcomes. This evidence does not
authorize or validate an online migration.
