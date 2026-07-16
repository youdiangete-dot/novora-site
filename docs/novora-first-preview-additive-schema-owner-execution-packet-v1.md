# NOVORA First Preview Additive Schema Owner Execution Packet v1

Date prepared: 2026-07-15

Status: **BLOCKED AT HUMAN APPROVAL GATE - DO NOT EXECUTE**

## 1. Purpose and hard boundary

This packet prepares the owner-run database sequence for the additive First
Preview schema planned by Agent 70B-2. It reconciles that plan with the
completed Stage A existing-table ACL correction, the completed Stage B
`postgres` future-table default-privilege correction, and current repository
evidence.

This document does not authorize SQL. It does not contain a migration file and
does not duplicate the authoritative DDL. Section 7.1 adds three exact
metadata-only preflights and one exact aggregate-only operational preflight
that were not present in the frozen source.
No SQL, Supabase connection,
business-row inspection, Storage action, Provider action, environment change,
deployment, rollback, or application change was performed while preparing it.

The execution scope is limited to additive changes on these existing tables:

- `public.ai_sketch_jobs`
- `public.ai_sketch_outputs`
- `public.ai_sketch_reviews` only for the planned support index

The packet contains no table creation, `DELETE`, `TRUNCATE`, `UPDATE`
backfill, column drop, constraint drop, index drop, ownership change, grant,
revoke, default-privilege change, RLS or policy change, Storage change, probe
table, Provider request, or customer-visible behavior.

## 2. Frozen source identity

The only authoritative SQL source is:

- Path:
  `docs/novora-agent-70b2-first-preview-live-schema-review-and-additive-sql-plan-v1.md`
- PR #198 reviewed head:
  `f48300cbb4cacdcdb58dd234e19cf10ff5ce1858`
- PR #198 merge commit:
  `a704c4c7adcb6989458691c1d80e7d6250a60ddc`
- Git blob at the merge source:
  `714a30d16760dc98602dcbd8dc92d8785895811c`
- Raw Git-blob SHA-256 at the verified source identity (hash the exact blob
  bytes; do not hash a working-tree file whose line endings may be converted):
  `4763a425a9e22098a3dd43d3773c8352d83fd201b72d48dd116d7f9619cceecc`

The verified repository baseline for this packet is `origin/main` at
`57eab9a7320fe8cc5e309027e6c3af1d19de9d27`, the PR #199 merge commit.

The Stage A verification source is
`docs/novora-agent-70b3d-stage-a-acl-execution-verification.md` on that
baseline. The Stage B verification source is PR #200 at reviewed head
`c532cd4b45cbd5c0d024acd6a883af5f426e5762`, with exactly these two files:

- `docs/novora-agent-70b4b-stage-b-default-privilege-execution-verification.md`
- `docs/novora-current-project-state.md`

At packet preparation time PR #200 is Ready, open, clean, and unmerged.
Execution is blocked until PR #200 is separately approved for merge, merges
with that exact head unchanged, and the owner confirms the merged commit is on
current `main`.

If any commit, blob, path, candidate block, source hash, or prerequisite PR
identity differs, stop. Refresh and independently review the packet before any
SQL.

## 3. Reconciled database baseline

### 3.1 Completed Stage A

Stage A is complete and its immediate evidence passed. All six approved tables
remain owned by `postgres`, have RLS enabled, FORCE RLS false, and zero explicit
policies. `anon` and `authenticated` have no DML or structural privileges on
the six tables. `service_role` has `SELECT`, `INSERT`, and `UPDATE`, but no
`DELETE`, on the three AI tables. Existing routines and triggers were
preserved. Stage A rollback was not executed.

This resolves the Agent 70B-2 direct/effective existing-table ACL blocker for
the recorded matrix. It does not prove Data API route exploitability or create
customer access.

### 3.2 Completed Stage B

Stage B is complete and its immediate evidence passed. Future public tables
created by `postgres` now grant default table privileges only to `postgres`.
`anon`, `authenticated`, `service_role`, and `PUBLIC` have no
`postgres`/`public` future-table default row. Stage B preserved existing-table
ACLs, `postgres` function defaults, and `supabase_admin` table and function
defaults. Stage B rollback was not executed.

Stage B is orthogonal to the additive existing-table SQL in this packet. It
does not populate First Preview columns or authorize the candidate blocks.

### 3.3 Stages C, D, and E

Stages C and D were not executed and remain blocked on `supabase_admin`
execution authority and platform-compatibility review. Stage E was not
executed. Their non-execution does not authorize this packet.

This packet creates no table, so it does not depend on changing
`supabase_admin` future-table defaults. It also makes no claim about Data API
reachability or secure customer access. Those boundaries remain separate and
must be completed before customer rollout.

### 3.4 Remaining live-evidence gaps

The merged Agent 70B-2 Q01-Q11 metadata evidence remains the structural
baseline. Current business-row lifecycle values were not supplied. Therefore
all row-dependent candidate checks, unique indexes, foreign-key validation,
and status interpretation remain fail-closed until the approved aggregate-only
preflights return acceptable results.

The `ai_sketch_reviews.ai_sketch_output_id NOT NULL` versus current create
helper incompatibility remains an application blocker. This packet does not
change that column, foreign key, review status model, or helper.

## 4. Approval gates

Three separate approvals are required and must not be conflated:

1. **PR #200 merge approval.** This packet does not authorize that merge.
2. **Schema Phase A execution approval.** This covers the exact metadata and
   aggregate preflights, candidate blocks 23.1 through 23.6, and immediate
   V01-V05 evidence collection described below.
3. **Post-writer constraint validation approval.** Candidate block 23.7
   remains a later, separate gate after Phase A evidence is reconciled, the new
   writer is implemented and independently reviewed, a separately approved
   controlled population step occurs, and fresh B06/B13/B14/B16/B19 evidence
   passes.

Approval of this document, its PR, or PR #200 is not SQL approval. Approval of
Phase A is not approval of block 23.7, rollback, cleanup, application rollout,
Storage, Provider, environment, deployment, or customer-data inspection beyond
the explicitly bounded aggregate queries.

## 5. Owner execution prerequisites

Before opening the SQL Editor, all of these must be true:

- PR #200 is merged unchanged and current `main` contains its verified head.
- This packet has passed independent read-only review and is merged unchanged.
- The owner has supplied the exact Phase A approval in section 11.
- Target project is visibly `novora-production`.
- Target database is visibly Primary Database (`postgres`).
- Execution role is visibly `postgres`.
- The SQL Editor row limit is at least 1,000.
- The frozen Agent 70B-2 path, commit, blob, and candidate block identities
  match section 2.
- No unreviewed schema change has landed on the three affected tables.
- No Provider, preview writer, or customer First Preview rollout is active.
- A quiet operational window is available for `ALTER TABLE` and index locks.
- Evidence storage is outside the repository and will contain no secrets,
  customer values, IDs, notes, paths, prompts, images, or environment values.

Any mismatch is a stop, not a reason to improvise SQL.

## 6. Phase 0 - visual safety context, no SQL

Capture one sanitized screenshot that visibly shows the project, database,
execution role, SQL Editor, and row limit. It must not show keys, environment
values, customer data, prompts, images, or unrelated SQL.

Stop if the project, database, or role differs from section 5.

## 7. Phase 1 - approved pre-change reads

After explicit Phase A approval, run only the exact SELECT blocks in this
order:

1. Supplemental C01-C03 from section 7.1 of this packet.
2. M01-M06 from the frozen Agent 70B-2 source.
3. B01-B07 from the frozen Agent 70B-2 source.
4. B15 from the frozen Agent 70B-2 source.
5. B17 from the frozen Agent 70B-2 source.
6. C04 from section 7.1 as the final query immediately before 23.1-S01.

### 7.1 Current-catalog no-drift and operational preflights

C01 proves the two affected table-column catalogs still match the verified
17-column Q02 baseline before additive DDL. The result must contain exactly the
same nine `ai_sketch_jobs` and eight `ai_sketch_outputs` rows, definitions,
nullability values, and defaults as the frozen source. Every candidate column
and every unexpected column must be absent.

```sql
SELECT
  table_name,
  ordinal_position,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('ai_sketch_jobs', 'ai_sketch_outputs')
ORDER BY table_name, ordinal_position;
```

C02 proves the current index catalog for all three affected tables still
matches the frozen Q05 baseline. Every candidate index name from V03 and every
equivalent candidate definition must be absent. Any missing baseline index,
new name, equivalent definition, invalid index, or definition drift is a stop.

```sql
SELECT
  table_rel.relname AS table_name,
  index_rel.relname AS index_name,
  idx.indisunique AS is_unique,
  idx.indisvalid AS is_valid,
  idx.indisready AS is_ready,
  idx.indislive AS is_live,
  pg_catalog.pg_get_indexdef(index_rel.oid) AS exact_definition
FROM pg_catalog.pg_index idx
JOIN pg_catalog.pg_class table_rel ON table_rel.oid = idx.indrelid
JOIN pg_catalog.pg_namespace ns ON ns.oid = table_rel.relnamespace
JOIN pg_catalog.pg_class index_rel ON index_rel.oid = idx.indexrelid
WHERE ns.nspname = 'public'
  AND table_rel.relname IN (
    'ai_sketch_jobs', 'ai_sketch_outputs', 'ai_sketch_reviews'
  )
ORDER BY table_rel.relname, index_rel.relname;
```

C03 is the packet's only supplemental aggregate business-table read. It
returns exact row counts only, never row values or identities, and is included
in the separate Phase A human approval. Each table must be no larger than 64
MiB (`67108864` bytes) and have no more than 10,000 exact rows. These
conservative packet limits apply only to this execution plan. Any larger result
requires a new operational lock/index plan and independent review; it is not
permission to raise the limit during execution.

```sql
WITH relation_sizes AS (
  SELECT
    c.relname AS table_name,
    pg_catalog.pg_total_relation_size(c.oid) AS total_relation_bytes
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace ns ON ns.oid = c.relnamespace
  WHERE ns.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relname IN (
      'ai_sketch_jobs', 'ai_sketch_outputs', 'ai_sketch_reviews'
    )
), exact_counts AS (
  SELECT 'ai_sketch_jobs'::text AS table_name, count(*) AS exact_row_count
  FROM public.ai_sketch_jobs
  UNION ALL
  SELECT 'ai_sketch_outputs'::text, count(*)
  FROM public.ai_sketch_outputs
  UNION ALL
  SELECT 'ai_sketch_reviews'::text, count(*)
  FROM public.ai_sketch_reviews
)
SELECT
  relation_sizes.table_name,
  relation_sizes.total_relation_bytes,
  exact_counts.exact_row_count
FROM relation_sizes
JOIN exact_counts USING (table_name)
ORDER BY relation_sizes.table_name;
```

C04 is the quiet-window gate. It returns one row per affected table. Every
`total_lock_count` and `waiting_lock_count` must be zero immediately before
candidate 23.1. A nonzero count stops the window; do not wait while holding an
open DDL transaction, terminate another session, or proceed around the lock.

```sql
WITH targets AS (
  SELECT c.oid, c.relname AS table_name
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace ns ON ns.oid = c.relnamespace
  WHERE ns.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relname IN (
      'ai_sketch_jobs', 'ai_sketch_outputs', 'ai_sketch_reviews'
    )
)
SELECT
  targets.table_name,
  count(locks.locktype) AS total_lock_count,
  count(locks.locktype) FILTER (WHERE locks.granted IS FALSE)
    AS waiting_lock_count
FROM targets
LEFT JOIN pg_catalog.pg_locks locks
  ON locks.locktype = 'relation'
 AND locks.relation = targets.oid
GROUP BY targets.table_name
ORDER BY targets.table_name;
```

Required interpretation:

- M01: exactly six approved tables, all owned by `postgres`.
- M02-M03: no role-attribute or membership drift that broadens the reviewed
  access posture.
- M04: the effective DML matrix exactly matches completed Stage A.
- M05: `anon`, `authenticated`, and `service_role` have no effective
  `TRUNCATE` on the six approved tables.
- M06: ownership, RLS, FORCE RLS, policy count, schema usage, and role posture
  match the reviewed Stage A evidence.
- B01: every job status is one of `draft`, `queued`, `processing`,
  `succeeded`, `failed`, `timed_out`, or `cancelled`; only `draft` may be the
  staged legacy state.
- B02 and B17: every `preview_status` value is understood, and
  `pending_review` is not reinterpreted as automatic readiness.
- B03 is informational only and never proves asset existence or readiness.
- B04 and B15: no job has more than one output.
- B05 is reconciled with the bounded attempt model.
- B06: every orphan and cross-brief count is zero.
- B07: `invalid_review_status_count = 0`.

Stop on missing output, truncation, catalog drift, a C03 threshold breach, a
nonzero C04 lock count, an unknown value, any required nonzero count, access
drift, ambiguous semantics, or query error. Do not run any candidate DDL.

## 8. Phase 2 - nullable columns and intermediate gates

Before submitting any DDL, follow the mandatory canonical-hash and
per-statement evidence procedure in section 9. Compute the actual canonical
hash for 23.1-S01, prove `actual = expected`, then submit that statement alone.
After its success artifact is preserved, repeat the same procedure for
23.2-S01. Do not modify, combine, reorder, regenerate, or add a transaction
wrapper to those statements.

After both blocks succeed, run these exact aggregate blocks from the frozen
source:

1. B08-B14.
2. B16.
3. B18-B19.

Interpretation is granular:

- B08 records whether any future `NOT NULL` hardening would be blocked. This
  packet authorizes no `NOT NULL` hardening, so B08 is evidence only.
- B09-B12 must each return zero before their corresponding unique index can be
  created.
- Every B13 and B14 violation count must be zero.
- Every B16 lineage/source count must be zero, including the recursive cycle
  count.
- B18 must return zero and the exact active predicate must remain
  `status IN ('queued', 'processing')`.
- Every B19 count must be zero.

If any DDL statement errors, or any required gate fails, stop immediately.
Record the exact last successful block and exact error. Do not drop the newly
added columns, backfill rows, edit data, retry modified SQL, or execute a
rollback without separate approval.

## 9. Phase 3 - constraints, foreign keys, indexes, and verification

Only after every applicable Phase 2 gate passes, run these frozen candidate
blocks in exact order:

1. 23.3 - Job CHECK constraints, all `NOT VALID`.
2. 23.4 - Output CHECK constraints, all `NOT VALID`.
3. 23.5 - Composite targets and foreign keys.
4. 23.6 - Unique and support indexes.

Do not run candidate block 23.7.

Every semicolon-terminated statement must be submitted separately in source
order. Do not submit 23.5 or 23.6 as one multi-statement editor action. Compute
the canonical statement hash with this exact algorithm:

1. Start with the complete semicolon-terminated statement from the frozen
   source.
2. Normalize CRLF or CR line endings to LF.
3. Trim leading and trailing whitespace from the complete statement.
4. Require and remove exactly one terminal semicolon.
5. Trim leading and trailing whitespace from the remaining statement body.
6. Append exactly one semicolon and one LF.
7. Compute SHA-256 over those UTF-8 bytes without a BOM.

| Statement | Expected canonical SHA-256 |
|---|---|
| 23.1-S01 | `082b6880f1249f5091e3db60ab3ae2e144afda14487ed18f7f9d9775917dff32` |
| 23.2-S01 | `4db11692e2e0147e23772f6649d6250786bf23fcaa2542d48d1d001f3e6561b4` |
| 23.3-S01 | `10ecfe446e295fca518eba4efcb05bb74bc6098433662a3d5554f21129157e5c` |
| 23.4-S01 | `92582cd0195a5c8bb595ea79905c75a8425810eae32b30e4cdbc463798a95859` |
| 23.5-S01 | `74b7179a16b4cc4c3c615e2e2e16511dd994fb66fa442ff6131512093e5610ad` |
| 23.5-S02 | `f1b5c748320efe877cd772800d618f9ac6a132538b91e2acfdc72e04d8b62f4f` |
| 23.5-S03 | `be3f2628489d7eb33a2d07e9477c8d77e5f0fbd9c35c1f6ac5403605fb7760e3` |
| 23.5-S04 | `5aa97feb78a7632b23ee5bde98676ab4c5f757ae97de59bcb7ea69699ed6ac2d` |
| 23.5-S05 | `50fe3219c8841718f6b0a0f97a9ef3d8524526df72905fd22592928665458c00` |
| 23.6-S01 | `b37bcc6c0d8b6ba6bfa1a2fa55b472ba65065080eaced57cee960942bfc1e62a` |
| 23.6-S02 | `4f7bbaf2df1ec0a17e1cdedd8d612a8d2760b1bf1dbefe6eb81c80af495655c0` |
| 23.6-S03 | `26191b3b066c6077712d080f86b917c3030621e62e22c54edd8984c71bf743ff` |
| 23.6-S04 | `b0b9d7c289d86145c7dd7438a98ad4914d807e3a5bcc884dafa530555eee1cad` |
| 23.6-S05 | `114af88f24bc06527aa858fe6e9075982133a8fdc960e370bec91dc05a6506c6` |
| 23.6-S06 | `f77a3b96c0fabdfb6717f4ebd988ff22c0f91de557b1e6493e90560df1034e5b` |
| 23.6-S07 | `6ec796a3a9329ce0b06263923d1b0f578dc1197c88ed42ae44fcf187f6477ba6` |
| 23.6-S08 | `7a3b3b2a8c090e55c80e05f75d753e665c3ae1b50b5bcd125328ab7ca8a20d85` |
| 23.6-S09 | `82483af631469d290144b8a793c9c4a0179b522aa28526db75a5879f26950cd4` |

Before submitting each statement, compute the actual canonical hash and prove
`actual = expected` against the table. Capture a separate success or error
artifact for every statement. The actual canonical SQL hash and the evidence
artifact's file hash are different objects and both must be recorded. DDL row
counts and duplicate counts are `n/a`; do not describe a successful DDL
statement as a zero-row data result. On failure, record the exact last
successful statement, not merely the containing block.

Immediately after 23.6, run V01-V05 from the frozen source. V01 contains two
SELECT statements and both are required. Capture the first metadata result as
V01-A and the second Job-invariant result as V01-B. Separate artifacts are
required unless one export visibly and completely preserves both labeled
result sets. If the SQL Editor exposes only the final result, rerun each V01
SELECT separately without changing its text.

Required post-execution evidence:

- V01 metadata: verified baseline total `17`, expected added total `52`,
  actual candidate-added total `52`, and every drift, missing, unexpected,
  duplicate, type, nullability, default, and invalid-shape count zero.
- V01 Job invariants: every named count and `invalid_job_row_count` zero.
- V02: every expected candidate constraint exists with the exact reviewed
  definition and remains `NOT VALID`; existing constraints are separately
  identified rather than mistaken for candidate additions.
- V03: all 12 named indexes from the frozen query have the exact reviewed
  definitions and are valid, ready, and live.
- V04: every asset, validation, gate, readiness, current, revocation, and
  chronology violation count zero.
- V05: every duplicate-invariant count zero.

Any missing query, unexpected object, definition mismatch, invalid index,
prematurely validated constraint, nonzero count, incomplete export, or query
error is a fail-closed stop. Customer rollout and application persistence work
remain blocked.

## 10. Later post-writer constraint-validation gate

Candidate block 23.7 is explicitly excluded from Phase A approval. After the
complete Phase 0-3 evidence is returned, a separate read-only reviewer must
reconcile it against this packet and the frozen Agent 70B-2 source.

Successful Phase A evidence permits separately scoped, code-only application
compatibility work and fake-client persistence development. It does not permit
Production writer activation, a Provider request, customer visibility, or a
real business-row write.

Block 23.7 remains blocked until the new writer is implemented, independently
reviewed, and a separately approved controlled population step has occurred.
Immediately before validation, the owner must rerun fresh B06, B13, B14, B16,
and B19. Every applicable count must be zero. A new reviewed validation packet
must freeze every individual 23.7 statement and its canonical hash.

Only a new explicit human approval may then authorize block 23.7. After
validation, the owner must rerun V01-V05, with separate V01-A/V01-B evidence,
and V02 must show every candidate constraint validated with its exact reviewed
definition. Until that later evidence passes, Production writer activation and
customer rollout remain blocked.

## 11. Exact Phase A approval wording

The owner may authorize the first database phase only with an explicit message
equivalent to all of the following:

> APPROVE NOVORA FIRST PREVIEW SCHEMA PHASE A against `novora-production`,
> Primary Database (`postgres`), executed as `postgres`, using the merged and
> independently reviewed Owner Execution Packet v1 and the frozen Agent 70B-2
> source identified in section 2. Approval is limited to Phase 0, exact
> SELECT-only C01-C04, M01-M06, B01-B07, B15, B17, exact candidate blocks 23.1-23.6,
> required intermediate B08-B14, B16, B18-B19, and post-execution V01-V05.
> Block 23.7 constraint validation, rollback, cleanup, data edits, DELETE,
> backfill, ACL/default-privilege/RLS/policy/Storage changes, Provider calls,
> application rollout, deployment, and customer-visible behavior are not
> approved.

Any narrower, broader, ambiguous, or target-mismatched approval must be
clarified before execution.

## 12. Evidence return requirements

Return a sanitized manifest containing:

Use these exact evidence filenames outside the repository. A SELECT result uses
its listed `.csv` name when the SQL Editor can export the complete result,
including headers for a legitimate zero-row result. If a complete zero-row CSV
cannot be exported, use the same filename stem with the exact `-zero.png`
suffix instead. If a SELECT errors, use the same stem with the exact
`-error.png` suffix instead and stop. Each DDL `.png` captures that individual
statement's success or sanitized error result. The manifest must name exactly
one selected artifact for each attempted step and mark every later unattempted
filename `not_run`; do not create placeholder or fabricated evidence.

```text
novora-fp-phase-a-00-context.png
novora-fp-phase-a-01-c01.csv
novora-fp-phase-a-02-c02.csv
novora-fp-phase-a-03-c03.csv
novora-fp-phase-a-04-m01.csv
novora-fp-phase-a-05-m02.csv
novora-fp-phase-a-06-m03.csv
novora-fp-phase-a-07-m04.csv
novora-fp-phase-a-08-m05.csv
novora-fp-phase-a-09-m06.csv
novora-fp-phase-a-10-b01.csv
novora-fp-phase-a-11-b02.csv
novora-fp-phase-a-12-b03.csv
novora-fp-phase-a-13-b04.csv
novora-fp-phase-a-14-b05.csv
novora-fp-phase-a-15-b06.csv
novora-fp-phase-a-16-b07.csv
novora-fp-phase-a-17-b15.csv
novora-fp-phase-a-18-b17.csv
novora-fp-phase-a-19-c04.csv
novora-fp-phase-a-20-23.1-s01.png
novora-fp-phase-a-21-23.2-s01.png
novora-fp-phase-a-22-b08.csv
novora-fp-phase-a-23-b09.csv
novora-fp-phase-a-24-b10.csv
novora-fp-phase-a-25-b11.csv
novora-fp-phase-a-26-b12.csv
novora-fp-phase-a-27-b13.csv
novora-fp-phase-a-28-b14.csv
novora-fp-phase-a-29-b16.csv
novora-fp-phase-a-30-b18.csv
novora-fp-phase-a-31-b19.csv
novora-fp-phase-a-32-23.3-s01.png
novora-fp-phase-a-33-23.4-s01.png
novora-fp-phase-a-34-23.5-s01.png
novora-fp-phase-a-35-23.5-s02.png
novora-fp-phase-a-36-23.5-s03.png
novora-fp-phase-a-37-23.5-s04.png
novora-fp-phase-a-38-23.5-s05.png
novora-fp-phase-a-39-23.6-s01.png
novora-fp-phase-a-40-23.6-s02.png
novora-fp-phase-a-41-23.6-s03.png
novora-fp-phase-a-42-23.6-s04.png
novora-fp-phase-a-43-23.6-s05.png
novora-fp-phase-a-44-23.6-s06.png
novora-fp-phase-a-45-23.6-s07.png
novora-fp-phase-a-46-23.6-s08.png
novora-fp-phase-a-47-23.6-s09.png
novora-fp-phase-a-48-v01-a.csv
novora-fp-phase-a-49-v01-b.csv
novora-fp-phase-a-50-v02.csv
novora-fp-phase-a-51-v03.csv
novora-fp-phase-a-52-v04.csv
novora-fp-phase-a-53-v05.csv
novora-fp-phase-a-54-manifest-v1.json
```

- Packet commit and frozen Agent 70B-2 source identities.
- Phase 0 screenshot filename and SHA-256.
- One filename, format, row count, duplicate count, and SHA-256 for every
  executed C, M, B, and V SELECT. V01-A and V01-B are separate result
  identities even when preserved in one verified export.
- One filename and SHA-256 for every individually executed DDL statement from
  the statement table in section 9, with the expected canonical statement
  hash, owner-computed actual canonical statement hash, explicit
  `actual = expected` result, exact outcome, and `n/a` for row and duplicate
  counts.
- Exact result values for every bounded metadata/status/aggregate output.
- Exact last successful SELECT or DDL statement.
- Any safe PostgreSQL error code and sanitized error category.
- Explicit statements for Phase A COMPLETE or STOPPED, block 23.7 NOT
  EXECUTED, rollback NOT EXECUTED, and no unapproved action taken.

Do not return row IDs, brief references, customer/contact values, prompts,
payloads, notes, object paths, URLs, images, keys, tokens, environment values,
or raw provider data. A zero-row result may be a complete readable screenshot;
do not fabricate a CSV.

## 13. Stop and recovery rules

- Stop on the first identity, evidence, semantic, count, definition, lock, or
  execution mismatch.
- Preserve the exact database state and evidence at the stop point.
- Do not retry with edited SQL.
- Do not drop, delete, backfill, repair, validate, roll back, or clean up
  without a new reviewed packet and explicit approval.
- Do not start the application compatibility phase from partial evidence.
- Prefer a separately reviewed roll-forward correction after root-cause
  reconciliation.

## 14. Current gate

**HUMAN GATE - SUPABASE SCHEMA EXECUTION APPROVAL REQUIRED**

Until the prerequisites and exact approval are supplied, no SQL in this packet
or its frozen source may be executed.
