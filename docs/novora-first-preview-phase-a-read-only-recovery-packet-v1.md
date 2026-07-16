# NOVORA First Preview Phase A Read-Only Recovery Packet v1

Date: 2026-07-16

Status: **FROZEN FOR SEPARATE OWNER APPROVAL - NOT EXECUTED**

## 1. Purpose

Phase A stopped at step 25 (`B11`) after PostgreSQL reported SQLSTATE `42703`
for missing column `public.ai_sketch_outputs.is_current_customer_preview`.
Step 21 (`23.2-S01`) had previously produced editor-reported success while its
visible frozen statement included that column. This packet contains only the
minimum read-only metadata needed to establish the current database/session
context and live catalog state. It does not determine historical cause by
itself and does not authorize repair.

No query in this packet has been executed. Merging this document does not
authorize execution. A separate exact Owner approval is required.

## 2. Frozen source identities

- Approved Phase A `origin/main`: `24c37f54173cf6e9cd82de7bf30b058d166adea4`
- PR #203 reviewed head: `afc27974bed4f814da0a7888705315dfe228efab`
- Owner Execution Packet v1 Git blob:
  `d347663d740cc766eb07c9c93b9130d16fc9f51f`
- Owner Execution Packet v1 raw SHA-256:
  `4d36aaba11391eb1aa37a259027d8f50cc63723807755f3c0e1d3d2e832e3b04`
- Frozen Agent 70B-2 source Git blob:
  `714a30d16760dc98602dcbd8dc92d8785895811c`
- Frozen Agent 70B-2 source raw SHA-256:
  `4763a425a9e22098a3dd43d3773c8352d83fd201b72d48dd116d7f9619cceecc`
- Owner runbook Git blob: `1d7ee46755254e6c01ac125793ecbd9bf3451204`
- Owner runbook raw SHA-256:
  `935ec7f70f922431fc3bccafc8214df47c63d290d18c9117de5c93a888545764`
- STOPPED manifest filename: `novora-fp-phase-a-54-manifest-v1.json`
- STOPPED manifest SHA-256:
  `3551b06cc2ccfa75802177c05603cf9b8a1028637ab816977ab3e7d4bdbffe97`
- The corrected manifest records and supersedes preliminary manifest SHA-256
  `977c1d68b6bc15340db5f429edc673ec5d124a8fd296fda972edd157c5674371`.

## 3. Exact target and non-authorization boundary

If separately approved, the Owner would manually run this packet only against:

- Supabase project: `novora-production`
- Database: Primary Database (`postgres`)
- Schema: `public`
- Role: `postgres`
- SQL Editor row limit: at least `1000`

The packet does not authorize DDL, DML, data-row inspection, B11 retry,
`23.2-S01` retry, B12 or any later Phase A step, block 23.7, repair, replacement
SQL, manual `ADD COLUMN`, backfill, rollback, cleanup, ACL/default-privilege/RLS/
policy/Storage change, Provider action, application rollout, deployment, or
customer-visible behavior.

## 4. Canonical SHA-256 algorithm

For each complete statement: normalize CRLF/CR to LF; trim leading/trailing
statement whitespace; require and remove exactly one terminal semicolon; trim
the remaining body; append exactly one semicolon and one LF; hash those UTF-8
bytes without a BOM. Do not add a transaction wrapper or edit the statement.

## 5. Evidence contract and names

Capture Phase 0 as
`novora-fp-phase-a-recovery-00-context.png`. For each attempted query, select
exactly one of these mutually exclusive result artifacts:

| Query | Non-zero result | Zero-result alternative | SQL-error alternative |
| --- | --- | --- | --- |
| R01 | `novora-fp-phase-a-recovery-01-r01.csv` | `novora-fp-phase-a-recovery-01-r01-zero.png` | `novora-fp-phase-a-recovery-01-r01-error.png` |
| R02 | `novora-fp-phase-a-recovery-02-r02.csv` | `novora-fp-phase-a-recovery-02-r02-zero.png` | `novora-fp-phase-a-recovery-02-r02-error.png` |
| R03 | `novora-fp-phase-a-recovery-03-r03.csv` | `novora-fp-phase-a-recovery-03-r03-zero.png` | `novora-fp-phase-a-recovery-03-r03-error.png` |
| R04 | `novora-fp-phase-a-recovery-04-r04.csv` | `novora-fp-phase-a-recovery-04-r04-zero.png` | `novora-fp-phase-a-recovery-04-r04-error.png` |

A non-zero result must be exported as CSV with its header. A legitimate zero
result must use the designated `-zero.png` screenshot and visibly include the
complete frozen statement, zero-row result, target context, and no unrelated
content. An SQL error must use the designated `-error.png` screenshot and
visibly include the complete frozen statement, exact SQLSTATE/error, target
context, and no unrelated content. STOP on any error. STOP on zero rows where
the query's expected evidence requires one or more rows. Mark all later queries
`not_run`; do not create placeholder result artifacts for them.

Create the sanitized recovery manifest as
`novora-fp-phase-a-recovery-05-manifest-v1.json`. It must record:

- the immutable packet, frozen source, incident document, STOPPED manifest,
  reviewed PR head, and merged `origin/main` identities;
- the approved target context and the Phase 0 artifact filename, format, byte
  size, and SHA-256;
- exactly one selected result artifact for each attempted query, including its
  filename, format, byte size, SHA-256, result row count, duplicate-row count,
  and exact sanitized result values;
- each query's expected canonical SQL SHA-256, actual canonical SQL SHA-256,
  equality result, and verification basis. Use `null`, never an inferred hash,
  when the selected artifact does not prove the submitted statement bytes;
- the exact outcome `PASS`, `FINDING`, or `ERROR` for each attempted query and
  `not_run` for each later query, plus the last successful query and failed
  query when applicable;
- recovery status `COMPLETE` or `STOPPED`, while retaining Phase A status
  `STOPPED` and recording B11/23.2/B12+/23.7, repair, rollback, and cleanup as
  not executed; and
- an explicit statement that no database mutation or other unapproved action
  occurred.

Evidence must remain external and sanitized. Do not return customer data, row
IDs, brief references, prompts, notes, object-path values, URLs, images,
secrets, tokens, keys, environment values, or Provider data. Hash every
selected artifact in place; do not rename, normalize, modify, or copy raw
evidence into the repository.

## 6. Phase 0 - visual context only

Capture the exact target project, Primary Database (`postgres`), role `postgres`,
and row limit at least `1000`. STOP before R01 on any mismatch. Do not include
unrelated SQL, query history, customer content, secrets, or environment values.

## 7. R01 - session context and same-name relation identity

Canonical SHA-256: `ebae5e128fdb57e3e6426ddd9a7dd6419d47a907c2d1a4c2229199e2d27db6f8`

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

Expected evidence:

- Every row repeats database `postgres`, current schema `public`, current role
  `postgres`, session role `postgres`, and `server_is_in_recovery = false`.
- Exactly one regular or partitioned relation exists for each of
  `public.ai_sketch_jobs`, `public.ai_sketch_outputs`, and
  `public.ai_sketch_reviews`; each has a non-null relation OID and owner
  `postgres`.
- Any same-name relation in another non-system schema is recorded as an
  unresolved finding, not silently ignored.

STOP immediately on project/UI mismatch, database/schema/role mismatch, missing
approved public relation, SQL error/warning, truncated output, or incomplete
evidence. Only a new exact Owner approval covering Phase 0 and R01-R04 may
permit this read-only diagnostic sequence to continue through R04. Same-name
relations in other schemas remain explicit findings; no result authorizes
repair or Phase A resumption.

## 8. R02 - complete public target attribute catalog, including dropped slots

Canonical SHA-256: `9d71ada08b5eb39137545921f3b7034c3ebe3bc37475e53809ab73c3983a158f`

```sql
WITH target_relations AS (
  SELECT
    relation.oid AS relation_oid,
    namespace.nspname AS schema_name,
    relation.relname AS table_name
  FROM pg_catalog.pg_class relation
  JOIN pg_catalog.pg_namespace namespace
    ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname IN ('ai_sketch_jobs', 'ai_sketch_outputs')
    AND relation.relkind IN ('r', 'p')
)
SELECT
  targets.schema_name,
  targets.table_name,
  targets.relation_oid::text AS relation_oid,
  attribute.attnum AS ordinal_position,
  attribute.attname AS column_name,
  attribute.attisdropped AS is_dropped,
  pg_catalog.format_type(attribute.atttypid, attribute.atttypmod)
    AS formatted_type,
  attribute.attnotnull AS is_not_null,
  attribute.atthasdef AS has_default,
  attribute.attidentity AS identity_kind,
  attribute.attgenerated AS generated_kind,
  CASE
    WHEN attribute_default.oid IS NULL THEN NULL
    ELSE pg_catalog.pg_get_expr(
      attribute_default.adbin,
      attribute_default.adrelid
    )
  END AS column_default
FROM target_relations targets
JOIN pg_catalog.pg_attribute attribute
  ON attribute.attrelid = targets.relation_oid
LEFT JOIN pg_catalog.pg_attrdef attribute_default
  ON attribute_default.adrelid = attribute.attrelid
 AND attribute_default.adnum = attribute.attnum
WHERE attribute.attnum > 0
ORDER BY targets.table_name, attribute.attnum;
```

Expected evidence:

- A complete, untruncated positive-attribute catalog for both approved public
  tables, including any `is_dropped = true` slots and all identity/generated/
  default metadata.
- The output is diagnostic: candidate columns may be present, absent, partial,
  or represented only by dropped slots. Record the exact state without repair.
- If 23.1 and 23.2 both persist exactly with no later drift, the live,
  non-dropped totals would be 44 job columns and 25 output columns. That is a
  comparison expectation, not permission to force the catalog into that state.

STOP on SQL error/warning, missing target table output, truncation, duplicate
ordinal rows for one table, or incomplete evidence. Candidate presence or
absence is a diagnostic result and does not itself stop R03.

## 9. R03 - locate every 23.2 candidate output column across non-system schemas

Canonical SHA-256: `6e74dede3b24d6324123a2290cb90450bc79c49d126e360d71ab4e5d11f48559`

```sql
WITH expected_columns (
  expected_ordinal,
  column_name,
  expected_formatted_type,
  expected_is_not_null,
  expected_default
) AS (
  VALUES
    (1, 'mime_type', 'text', false, NULL::text),
    (2, 'byte_size', 'bigint', false, NULL::text),
    (3, 'width_px', 'integer', false, NULL::text),
    (4, 'height_px', 'integer', false, NULL::text),
    (5, 'content_sha256', 'text', false, NULL::text),
    (6, 'asset_created_at', 'timestamp with time zone', false, NULL::text),
    (7, 'asset_validation_status', 'text', false, NULL::text),
    (8, 'asset_validation_evidence', 'jsonb', false, NULL::text),
    (9, 'asset_validated_at', 'timestamp with time zone', false, NULL::text),
    (10, 'automatic_gate_status', 'text', false, NULL::text),
    (11, 'automatic_gate_evidence', 'jsonb', false, NULL::text),
    (12, 'automatic_gate_policy_version', 'text', false, NULL::text),
    (13, 'automatic_gate_passed_at', 'timestamp with time zone', false, NULL::text),
    (14, 'readiness_status', 'text', false, NULL::text),
    (15, 'first_preview_ready_at', 'timestamp with time zone', false, NULL::text),
    (16, 'readiness_revoked_at', 'timestamp with time zone', false, NULL::text),
    (17, 'is_current_customer_preview', 'boolean', true, 'false')
),
observed_columns AS (
  SELECT
    namespace.nspname AS schema_name,
    relation.relname AS table_name,
    relation.oid::text AS relation_oid,
    attribute.attname AS column_name,
    pg_catalog.format_type(attribute.atttypid, attribute.atttypmod)
      AS formatted_type,
    attribute.attnotnull AS is_not_null,
    CASE
      WHEN attribute_default.oid IS NULL THEN NULL
      ELSE pg_catalog.pg_get_expr(
        attribute_default.adbin,
        attribute_default.adrelid
      )
    END AS column_default
  FROM pg_catalog.pg_class relation
  JOIN pg_catalog.pg_namespace namespace
    ON namespace.oid = relation.relnamespace
  JOIN pg_catalog.pg_attribute attribute
    ON attribute.attrelid = relation.oid
  LEFT JOIN pg_catalog.pg_attrdef attribute_default
    ON attribute_default.adrelid = attribute.attrelid
   AND attribute_default.adnum = attribute.attnum
  WHERE relation.relname = 'ai_sketch_outputs'
    AND relation.relkind IN ('r', 'p')
    AND namespace.nspname NOT IN ('pg_catalog', 'information_schema')
    AND namespace.nspname !~ '^pg_toast'
    AND attribute.attnum > 0
    AND attribute.attisdropped IS FALSE
)
SELECT
  expected.expected_ordinal,
  expected.column_name,
  expected.expected_formatted_type,
  expected.expected_is_not_null,
  expected.expected_default,
  observed.schema_name AS observed_schema,
  observed.table_name AS observed_table,
  observed.relation_oid AS observed_relation_oid,
  observed.formatted_type AS observed_formatted_type,
  observed.is_not_null AS observed_is_not_null,
  observed.column_default AS observed_default,
  (
    observed.schema_name = 'public'
    AND observed.table_name = 'ai_sketch_outputs'
    AND observed.formatted_type = expected.expected_formatted_type
    AND observed.is_not_null = expected.expected_is_not_null
    AND observed.column_default IS NOT DISTINCT FROM expected.expected_default
  ) AS matches_approved_public_definition
FROM expected_columns expected
LEFT JOIN observed_columns observed
  ON observed.column_name = expected.column_name
ORDER BY expected.expected_ordinal, observed.schema_name;
```

Expected evidence:

- At least 17 rows, one for each expected 23.2 column. A missing column is
  represented by null observed fields; same-name columns in multiple schemas
  produce additional rows and must not be collapsed.
- If 23.2 persists exactly only on the approved table, there are exactly 17
  rows and every `matches_approved_public_definition` value is true.
- Any absent, partial, wrong-schema, wrong-type, wrong-nullability, or
  wrong-default result is recorded without repair.

STOP on any SQL error/warning, truncation, missing expected ordinal, duplicate
observed schema/column identity, or incomplete evidence. Candidate presence or
absence is diagnostic and does not itself stop R04.

## 10. R04 - unfiltered current constraint and index catalog

Canonical SHA-256: `2526d2aea62509ceb89ffc95dfd9b383aa302b4c91f9b58d5a0bf95454403d09`

```sql
WITH target_relations AS (
  SELECT
    relation.oid AS relation_oid,
    relation.relname AS table_name
  FROM pg_catalog.pg_class relation
  JOIN pg_catalog.pg_namespace namespace
    ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname IN (
      'ai_sketch_jobs',
      'ai_sketch_outputs',
      'ai_sketch_reviews'
    )
    AND relation.relkind IN ('r', 'p')
)
SELECT
  targets.table_name,
  targets.relation_oid::text AS relation_oid,
  'constraint'::text AS object_type,
  constraint_object.oid::text AS object_oid,
  constraint_object.conname AS object_name,
  constraint_object.contype::text AS constraint_type,
  pg_catalog.pg_get_constraintdef(constraint_object.oid, true)
    AS exact_definition,
  constraint_object.convalidated AS is_validated,
  constraint_object.condeferrable AS is_deferrable,
  constraint_object.condeferred AS is_initially_deferred,
  NULL::boolean AS is_unique,
  NULL::boolean AS is_valid,
  NULL::boolean AS is_ready,
  NULL::boolean AS is_live
FROM target_relations targets
JOIN pg_catalog.pg_constraint constraint_object
  ON constraint_object.conrelid = targets.relation_oid
UNION ALL
SELECT
  targets.table_name,
  targets.relation_oid::text,
  'index'::text,
  index_relation.oid::text,
  index_relation.relname,
  NULL::text,
  pg_catalog.pg_get_indexdef(index_relation.oid),
  NULL::boolean,
  NULL::boolean,
  NULL::boolean,
  index_metadata.indisunique,
  index_metadata.indisvalid,
  index_metadata.indisready,
  index_metadata.indislive
FROM target_relations targets
JOIN pg_catalog.pg_index index_metadata
  ON index_metadata.indrelid = targets.relation_oid
JOIN pg_catalog.pg_class index_relation
  ON index_relation.oid = index_metadata.indexrelid
ORDER BY table_name, object_type, object_name;
```

Expected evidence:

- A complete, unfiltered constraint and index catalog for all three approved AI
  tables. Do not filter to expected names.
- Every index is valid, ready, and live. Constraint validation and exact
  definitions are recorded without modification.
- Compare the actual set independently with the frozen pre-candidate catalog.
  Any missing, additional, changed, invalid, unready, or non-live object is an
  unresolved drift finding.

STOP after capturing R04 on any SQL error/warning, missing target-table catalog,
truncation, duplicate object identity, or incomplete evidence. Do not execute
any further SQL.

## 11. Interpretation limits

R01-R04 can establish current context and catalog state. They cannot, by
themselves, prove whether a missing column never persisted, was executed in a
different earlier context, was later dropped or otherwise changed, or was
represented by incomplete/misleading success evidence. Dropped attribute slots
may support a later-change hypothesis, but absence of a recognizable dropped
slot does not prove that 23.2 never ran. Historical cause remains unresolved
unless independently reliable historical evidence establishes it.

No result from this packet authorizes B11, 23.2, B12+, repair, retry, rollback,
or any mutation. After R04, return only the sanitized context/catalog evidence
and recovery manifest for independent reconciliation and a separately frozen
repair-or-resume decision.
