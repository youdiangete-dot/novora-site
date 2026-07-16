# NOVORA First Preview Phase A R01 Transport Retry Packet v1

Date: 2026-07-16

Status: **FROZEN FOR SEPARATE OWNER APPROVAL - NOT EXECUTED**

## 1. Decision and scope

The separately approved Phase A Resume Packet v1 stopped at step 01 (`R01`)
after the Supabase SQL Editor displayed
`Error: Failed to fetch (api.supabase.com)`. This is observed client/API
transport or result-fetch evidence. It is not a PostgreSQL SQLSTATE or proven
database rejection. The evidence does not prove whether R01 reached or executed
on the database server.

This packet freezes the minimum safe retry decision: one fresh Phase 0 visual
context capture followed by one manual execution of the exact frozen
SELECT-only R01 statement. It does not authorize execution. Merging this packet
does not authorize execution. The stopped Resume approval is exhausted and
must not be reused. A separate exact Owner approval tied to the merged packet
identity is required.

This packet does not authorize clicking the SQL Editor's generic `Retry`
button. If separately approved, the Owner must start from a fresh blank SQL
Editor, verify the complete R01 bytes and canonical hash, and use the ordinary
manual `Run` action exactly once.

## 2. Immutable incident and source identities

- Incident-reconciliation `origin/main`:
  `ad08a10b1377b26d13436d77d43ba4c164c36dda`
- Approved Resume Packet v1 `origin/main`:
  `52c26f818c89716ade4f1818d266cc2dd1fedb3e`
- Resume Packet PR #209 reviewed head:
  `8294e54dac83caef688d51bd127621b160d27d07`
- Resume Packet path:
  `docs/novora-first-preview-phase-a-resume-packet-v1.md`
- Resume Packet Git blob:
  `98e6b4a70fba66e317b57fd6f6bfc1bb3274bc85`
- Resume Packet raw-file SHA-256:
  `ad00c50a387c7f801585faca5e368f8b406322e70d73bbee2bb56f06e939dd64`
- Resume approval-record PR #210 reviewed head:
  `71716cc9f21593cba001f117bf93e25552f0abd5`
- Resume approval-record merge commit:
  `ad08a10b1377b26d13436d77d43ba4c164c36dda`
- Frozen R01 source path:
  `docs/novora-first-preview-phase-a-read-only-recovery-packet-v1.md`
- Frozen R01 source Git blob:
  `e853e2992f4d556a1d41b089006bdd288aa2d7bc`
- Frozen R01 source heading:
  `R01 - session context and same-name relation identity`
- R01 canonical SHA-256:
  `ebae5e128fdb57e3e6426ddd9a7dd6419d47a907c2d1a4c2229199e2d27db6f8`
- STOPPED Resume manifest filename:
  `novora-fp-phase-a-resume-69-manifest-v1.json`
- STOPPED Resume manifest SHA-256:
  `32bca453a5ee079b1d25e2bad4859bc4f2dcb7c35a4b3bc42b2bc257ee7961ee`

The selected Phase 0 artifact SHA-256 is
`5ca652dbed968c4295cbf9d5629d96db3fc2e644fbfa974e3b2aaad93e5b56fd`.
The selected R01 error artifact recomputes to
`c9879625400e37ba981fe82966ab04d98d942073735b431e7914f06b4f75ea5c`.
The Owner-reported R01 error hash was
`f27086133314e86c7bd5393511471aba96dbf8245bc0a73cb5923d10e9f674ae`;
it does not match the selected file, and no file in the evidence folder has
that reported hash. The selected screenshot visibly contains the reported
transport failure. The reason for the hash discrepancy is not proven.

## 3. Exact target and fresh quiet window

If separately approved, the Owner may manually run this packet only against:

- Supabase project: `novora-production`
- Branch/environment context: `main` / Production
- Database: Primary Database (`postgres`)
- Schema: `public`
- Current role and session role: `postgres`
- SQL Editor row limit: at least `1000`

Before the new Phase 0, establish a fresh quiet window with no First Preview
writer, migration, schema operation, application rollout, or other actor
targeting `ai_sketch_jobs`, `ai_sketch_outputs`, or `ai_sketch_reviews`. The
quiet window must remain active until the R01 evidence is captured. STOP before
Phase 0 if this cannot be confirmed.

The prior Phase 0 screenshot and prior R01 error screenshot must not be reused
as retry evidence.

## 4. Canonical SQL rule

For the complete R01 statement below: normalize CRLF/CR to LF; trim leading and
trailing statement whitespace; require and remove exactly one terminal
semicolon; trim the remaining body; append exactly one semicolon and one LF;
hash those UTF-8 bytes without a BOM. The required SHA-256 is
`ebae5e128fdb57e3e6426ddd9a7dd6419d47a907c2d1a4c2229199e2d27db6f8`.

Do not add comments, combine statements, add a transaction wrapper, change
whitespace or identifiers, substitute SQL, use the old editor contents, or
execute if the complete canonical hash does not match.

## 5. Step 00 - fresh Phase 0

Open a fresh blank SQL Editor and visibly verify the exact project,
branch/environment, Primary Database, role `postgres`, and row limit of at least
`1000`. The editor must be blank and must not display unrelated SQL/history,
customer content, secrets, or environment-variable values.

On PASS, capture exactly:

`novora-fp-phase-a-resume-r01-retry-00-context.png`

The screenshot must show `novora-production`, `main` / Production, Primary
Database, role `postgres`, row limit at least `1000`, and a blank editor. STOP
without running R01 on any mismatch, missing control, stale editor content,
warning, or incomplete evidence.

On a visible Phase 0 mismatch, missing control, stale editor content, warning,
or other failed visual gate, capture exactly:

`novora-fp-phase-a-resume-r01-retry-00-context-error.png`

Then record Phase 0 as ERROR/STOP, record R01 as `not_run`, create no R01
artifact or placeholder, create the sanitized supplement described below, and
STOP. Select exactly one mutually exclusive Phase 0 artifact: the PASS context
PNG or the ERROR context PNG.

## 6. Step 01 - exact frozen R01

Only after Phase 0 passes, paste the complete statement below into the fresh
blank editor, verify its canonical SHA-256, and execute it once with the normal
manual `Run` action. Do not click a generic `Retry` control.

```sql
WITH execution_context AS (
  SELECT
    current_database() AS database_name,
    current_schema() AS current_schema_name,
    current_user AS current_role,
    session_user AS session_role,
    pg_catalog.pg_is_in_recovery() AS server_is_in_recovery
),
target_relations AS (
  SELECT
    namespace.nspname AS schema_name,
    relation.relname AS table_name,
    relation.oid::text AS relation_oid,
    pg_catalog.format('%I.%I', namespace.nspname, relation.relname)
      AS qualified_relation,
    pg_catalog.pg_get_userbyid(relation.relowner) AS table_owner,
    relation.relkind,
    relation.relpersistence
  FROM pg_catalog.pg_class relation
  JOIN pg_catalog.pg_namespace namespace
    ON namespace.oid = relation.relnamespace
  WHERE relation.relname IN (
    'ai_sketch_jobs',
    'ai_sketch_outputs',
    'ai_sketch_reviews'
  )
    AND relation.relkind IN ('r', 'p')
    AND namespace.nspname NOT IN ('pg_catalog', 'information_schema')
    AND namespace.nspname !~ '^pg_toast'
)
SELECT
  context.database_name,
  context.current_schema_name,
  context.current_role,
  context.session_role,
  context.server_is_in_recovery,
  targets.schema_name,
  targets.table_name,
  targets.relation_oid,
  targets.qualified_relation,
  targets.table_owner,
  targets.relkind,
  targets.relpersistence,
  (targets.schema_name = 'public') AS is_approved_schema
FROM execution_context context
LEFT JOIN target_relations targets ON TRUE
ORDER BY targets.schema_name, targets.table_name;
```

PASS requires exactly three complete, untruncated rows with no warning or
error:

- Every row repeats database `postgres`, current schema `public`, current role
  `postgres`, session role `postgres`, and
  `server_is_in_recovery = false`.
- Exactly one row exists for each of `public.ai_sketch_jobs`,
  `public.ai_sketch_outputs`, and `public.ai_sketch_reviews`.
- The relation OIDs are respectively `17602`, `17619`, and `17641`.
- Every relation is owned by `postgres`, has `relkind = r`,
  `relpersistence = p`, and `is_approved_schema = true`.
- Duplicate relation identities are zero.
- Same-name relations in nonapproved schemas are zero.

On PASS, export the complete result with headers as exactly:

`novora-fp-phase-a-resume-r01-retry-01-r01.csv`

If the editor shows any transport/fetch failure, warning, SQL error, unexpected
zero-row result, incomplete/truncated result, context mismatch, relation/OID
mismatch, duplicate identity, nonapproved-schema identity, export failure, or
other expected-result mismatch, capture exactly:

`novora-fp-phase-a-resume-r01-retry-01-r01-error.png`

Select exactly one mutually exclusive R01 artifact: the PASS CSV or the ERROR
PNG. Then STOP. Do not retry again.

## 7. Evidence supplement

After the attempt, create the sanitized external supplement:

`novora-fp-phase-a-resume-r01-retry-02-manifest-v1.json`

It must record the approved merged-main, reviewed-head, packet-blob, packet raw
SHA-256, source-blob, R01 canonical-hash, and prior STOPPED Resume-manifest
identities; fresh quiet-window confirmation; exactly one selected Phase 0
artifact when Phase 0 was attempted; and exactly one selected R01 artifact only
when R01 was attempted. On a Phase 0 STOP, it must record Phase 0 ERROR/STOP,
R01 `not_run`, and no R01 artifact or placeholder. For each selected artifact,
record actual file bytes and SHA-256 values; expected canonical R01 hash;
nullable actual canonical hash and equality with an exact proof basis; row and
duplicate counts where applicable; exact PASS, ERROR, or `not_run`; and all
exclusions. It must contain no customer data, row IDs, brief references,
prompts, notes, object paths, URLs, images, secrets, tokens, keys,
environment-variable values, or Provider data.

## 8. Universal STOP and post-attempt gate

STOP immediately on any project, environment, database, schema, role,
session-role, recovery-state, row-limit, quiet-window, source-blob,
packet-blob, heading, canonical-hash, relation identity/OID, row-count,
duplicate-count, ownership, persistence, completeness, truncation, filename,
warning, SQL error, transport/fetch error, export error, or evidence mismatch.
Do not click `Retry`, rerun R01, change SQL, repair, compensate, roll back,
clean up, or continue.

Whether R01 passes or fails, R02 and every later Resume statement remain
prohibited until the new evidence is independently reconciled and a separate
exact continuation decision is made. A successful R01 retry does not itself
authorize R02.

## 9. Explicit exclusions

This packet does not authorize:

- Codex, MCP, CLI, script, or other automated Supabase connection or SQL
  execution;
- clicking the prior SQL Editor `Retry` button;
- more than one fresh manual R01 attempt;
- R02 or any later Resume statement;
- `23.1-S01` or `23.2-S01` retry;
- candidate DDL, block 23.7, constraint validation, replacement or ad hoc SQL;
- DML, repair, compensation, backfill, data edits, DELETE, rollback, or cleanup;
- ACL, default-privilege, RLS, policy, trigger, function, or Storage changes;
- customer/business-row inspection;
- Provider/generated-asset actions, environment changes, deployment,
  application rollout, email, payment, or customer-visible behavior; or
- branch, worktree, or evidence deletion.

Phase A Resume and Phase A remain **STOPPED** until separately reconciled
evidence proves otherwise.
