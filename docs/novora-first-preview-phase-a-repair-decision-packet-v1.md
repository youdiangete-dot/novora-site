# NOVORA First Preview Phase A Repair Decision Packet v1

Date: 2026-07-16

Status: **FROZEN FOR SEPARATE OWNER APPROVAL - NOT EXECUTED**

## 1. Decision

The completed read-only recovery proves that the current live catalog contains
all 35 frozen `23.1-S01` job-column additions and none of the 17 frozen
`23.2-S01` output-column additions. It does not prove the historical cause.

Direct resume at B11 is unsafe. Reapplying `23.1-S01` is unsafe and
unnecessary. The minimum repair prerequisite is exactly one schema mutation:
the original frozen, atomic `23.2-S01` statement. This packet surrounds that
single mutation with fresh fail-closed metadata, empty-table, object-catalog,
and lock preflights plus immediate post-execution assertions.

This packet does not authorize execution. Merging it does not authorize
execution. A separate exact Owner approval tied to the merged packet identity
and every listed canonical statement hash is required.

Successful execution of this repair packet would not authorize B11, B12+,
blocks 23.3-23.6, V01-V05, block 23.7, or any application action. Phase A would
remain STOPPED pending separate reconciliation, a separately frozen resume
packet, independent review, and a separate approval.

## 2. Frozen evidence and source identities

- Recovery status: `COMPLETE`
- Phase A status: `STOPPED`
- Historical cause: `NOT PROVEN`
- External recovery manifest:
  `novora-fp-phase-a-recovery-05-manifest-v1.json`
- Recovery manifest SHA-256:
  `43916fa5dad233c15aad2865c602ccbe75fbe28380440bfd51077ac29f1cba5d`
- Approved recovery `origin/main`:
  `a7c466d40e6ba553f9686c814e43ec04aa76a1a7`
- Recovery packet PR #205 reviewed head:
  `a65e8cc0a9b64eadf4dd0e36eb7de48c02de29ba`
- Recovery packet Git blob:
  `e853e2992f4d556a1d41b089006bdd288aa2d7bc`
- Recovery approval record merge commit:
  `2673314e337328d2451a03bbe4be9c79b3e512b0`
- STOPPED incident Git blob:
  `f3695b2660f093e467e0b3d8f7811dbad9b22df1`
- Original STOPPED manifest SHA-256:
  `3551b06cc2ccfa75802177c05603cf9b8a1028637ab816977ab3e7d4bdbffe97`
- Frozen Agent 70B-2 source Git blob:
  `714a30d16760dc98602dcbd8dc92d8785895811c`
- Frozen Agent 70B-2 source raw SHA-256:
  `4763a425a9e22098a3dd43d3773c8352d83fd201b72d48dd116d7f9619cceecc`
- Frozen `23.1-S01` canonical SHA-256:
  `082b6880f1249f5091e3db60ab3ae2e144afda14487ed18f7f9d9775917dff32`
- Frozen `23.2-S01` canonical SHA-256:
  `4db11692e2e0147e23772f6649d6250786bf23fcaa2542d48d1d001f3e6561b4`

## 3. Exact target and global execution rules

If separately approved, the Owner would manually execute this packet only
against:

- Supabase project: `novora-production`
- Database: Primary Database (`postgres`)
- Schema: `public`
- Role: `postgres`
- SQL Editor row limit: at least `1000`

Run Phase 0 and then P01-P04, X01, and A01-A03 individually in exact order.
Do not edit a statement, add comments, combine statements, add a transaction
wrapper, or reuse a prior result. Verify the canonical SHA-256 before each
execution. Use a blank editor and capture exactly one selected evidence
artifact per attempted step.

The Owner must confirm a quiet window with no First Preview writer, migration,
schema operation, application rollout, or other actor targeting the three AI
tables. STOP before P01 if that cannot be confirmed.

STOP immediately on any project, database, schema, role, row-limit, source,
packet, statement-hash, filename, result, row-count, duplicate-count,
relation-OID, column, type, nullability, default, identity, generated-field,
constraint, index, object-OID, lock, warning, SQL error, truncation, or evidence
mismatch. Do not repair, retry, compensate, roll back, or continue after a STOP.

## 4. Canonical SHA-256 algorithm

For each complete statement: normalize CRLF/CR to LF; trim leading/trailing
statement whitespace; require and remove exactly one terminal semicolon; trim
the remaining body; append exactly one semicolon and one LF; hash those UTF-8
bytes without a BOM. Do not alter the statement.

## 5. Evidence filenames and selection rules

- Phase 0: `novora-fp-phase-a-repair-00-context.png`
- Repair manifest: `novora-fp-phase-a-repair-09-manifest-v1.json`

For each attempted SQL step, select exactly one mutually exclusive artifact:

| Step | PASS artifact | Zero-result artifact | Error/warning artifact |
| --- | --- | --- | --- |
| P01 | `novora-fp-phase-a-repair-01-p01.csv` | `novora-fp-phase-a-repair-01-p01-zero.png` | `novora-fp-phase-a-repair-01-p01-error.png` |
| P02 | `novora-fp-phase-a-repair-02-p02.csv` | `novora-fp-phase-a-repair-02-p02-zero.png` | `novora-fp-phase-a-repair-02-p02-error.png` |
| P03 | `novora-fp-phase-a-repair-03-p03.csv` | `novora-fp-phase-a-repair-03-p03-zero.png` | `novora-fp-phase-a-repair-03-p03-error.png` |
| P04 | `novora-fp-phase-a-repair-04-p04.csv` | `novora-fp-phase-a-repair-04-p04-zero.png` | `novora-fp-phase-a-repair-04-p04-error.png` |
| X01 | `novora-fp-phase-a-repair-05-x01.png` | n/a | `novora-fp-phase-a-repair-05-x01-error.png` |
| A01 | `novora-fp-phase-a-repair-06-a01.csv` | `novora-fp-phase-a-repair-06-a01-zero.png` | `novora-fp-phase-a-repair-06-a01-error.png` |
| A02 | `novora-fp-phase-a-repair-07-a02.csv` | `novora-fp-phase-a-repair-07-a02-zero.png` | `novora-fp-phase-a-repair-07-a02-error.png` |
| A03 | `novora-fp-phase-a-repair-08-a03.csv` | `novora-fp-phase-a-repair-08-a03-zero.png` | `novora-fp-phase-a-repair-08-a03-error.png` |

Mark every later step `not_run` after any STOP. Never create placeholder
artifacts.

Non-zero SELECT results must be complete CSV exports with headers. A zero/error
screenshot must visibly include the complete frozen statement, result or exact
SQLSTATE/error, and target context without unrelated content. The X01 success
screenshot must visibly include the complete frozen statement, target context,
and editor success. Hash each artifact in place without modification.

The final sanitized repair manifest must record immutable packet/source/
recovery identities, target context, exactly one selected artifact per attempted
step, filename/format/bytes/SHA-256, row/duplicate counts, exact sanitized result
values, PASS/FINDING/ERROR/`not_run` outcome, last successful and failed step,
repair status COMPLETE or STOPPED, and Phase A status STOPPED.

For every SQL step it must include these four separate fields:

- `expected_canonical_sql_sha256` with the frozen packet hash;
- nullable `actual_canonical_sql_sha256`;
- nullable `canonical_hash_equality`; and
- `canonical_hash_verification_basis` describing the exact evidence basis.

When a selected artifact, including a successful CSV export, does not prove the
complete submitted statement bytes, both `actual_canonical_sql_sha256` and
`canonical_hash_equality` must be `null`; never infer either value from the
expected hash. A complete statement screenshot may support an explicitly
recorded visual reconstruction, with its reconstructed actual hash and equality
result, but an incomplete or ambiguous screenshot is a STOP.

The manifest must state that no unapproved action occurred and contain no
customer data, customer row IDs, brief references, prompts, notes, stored
object-path values, URLs, images, secrets, tokens, keys, environment values, or
Provider data.

## 6. Phase 0 - visual context and quiet-window confirmation

Capture the exact project, Production/main context, Primary Database, role
`postgres`, row limit at least `1000`, and a blank editor. Record the Owner's
quiet-window confirmation separately in the sanitized manifest. Do not include
unrelated SQL/history, customer content, secrets, or environment values. STOP
before P01 on any mismatch.

## 7. P01 - execution context and exact relation identity

Canonical SHA-256: `97cf7ea0096f9174a221c3721adda70f2e71770feba64cc8fb3cb8d9445f17cc`

```sql
WITH execution_context AS (
  SELECT
    current_database() AS database_name,
    current_schema() AS current_schema_name,
    current_user AS current_role,
    session_user AS session_role,
    pg_catalog.pg_is_in_recovery() AS server_is_in_recovery
),
relation_inventory AS (
  SELECT
    namespace.nspname AS schema_name,
    relation.relname AS table_name,
    relation.oid::text AS relation_oid,
    pg_catalog.pg_get_userbyid(relation.relowner) AS table_owner,
    relation.relkind,
    relation.relpersistence
  FROM pg_catalog.pg_class relation
  JOIN pg_catalog.pg_namespace namespace
    ON namespace.oid = relation.relnamespace
  WHERE relation.relname = 'ai_sketch_outputs'
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
  count(relations.relation_oid) AS same_name_relation_count,
  count(*) FILTER (
    WHERE relations.schema_name = 'public'
      AND relations.table_name = 'ai_sketch_outputs'
      AND relations.relation_oid = '17619'
      AND relations.table_owner = 'postgres'
      AND relations.relkind = 'r'
      AND relations.relpersistence = 'p'
  ) AS exact_approved_relation_count,
  count(*) FILTER (
    WHERE relations.relation_oid IS NOT NULL
      AND relations.schema_name <> 'public'
  ) AS nonapproved_schema_relation_count,
  COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'schema_name', relations.schema_name,
        'table_name', relations.table_name,
        'relation_oid', relations.relation_oid,
        'table_owner', relations.table_owner,
        'relkind', relations.relkind,
        'relpersistence', relations.relpersistence
      ) ORDER BY relations.schema_name, relations.table_name
    ) FILTER (WHERE relations.relation_oid IS NOT NULL),
    '[]'::jsonb
  ) AS relation_inventory
FROM execution_context context
LEFT JOIN relation_inventory relations ON TRUE
GROUP BY
  context.database_name,
  context.current_schema_name,
  context.current_role,
  context.session_role,
  context.server_is_in_recovery;
```

Expected: exactly one row; database/schema/current role/session role are
`postgres`/`public`/`postgres`/`postgres`; recovery is false; same-name count is
1; exact approved count is 1; nonapproved count is 0; inventory contains only
`public.ai_sketch_outputs`, relation OID 17619, owner `postgres`, relkind `r`,
and persistence `p`.

## 8. P02 - complete pre-repair output attribute assertion

Canonical SHA-256: `fe3836aef8be4018ef5c57e9df6501b2a96950c152c4f168779211a82814ef61`

```sql
WITH expected_baseline (
  expected_ordinal,
  column_name,
  formatted_type,
  is_not_null,
  has_default,
  identity_kind,
  generated_kind,
  column_default
) AS (
  VALUES
    (1, 'id', 'uuid', true, true, '', '', 'gen_random_uuid()'),
    (2, 'job_id', 'uuid', true, false, '', '', NULL::text),
    (3, 'concept_brief_id', 'uuid', true, false, '', '', NULL::text),
    (4, 'bucket_name', 'text', true, true, '', '', '''novora-ai-sketches''::text'),
    (5, 'object_path', 'text', false, false, '', '', NULL::text),
    (6, 'preview_status', 'text', true, true, '', '', '''pending_review''::text'),
    (7, 'metadata', 'jsonb', true, true, '', '', '''{}''::jsonb'),
    (8, 'created_at', 'timestamp with time zone', true, true, '', '', 'now()')
),
candidate_columns (column_name) AS (
  VALUES
    ('mime_type'),
    ('byte_size'),
    ('width_px'),
    ('height_px'),
    ('content_sha256'),
    ('asset_created_at'),
    ('asset_validation_status'),
    ('asset_validation_evidence'),
    ('asset_validated_at'),
    ('automatic_gate_status'),
    ('automatic_gate_evidence'),
    ('automatic_gate_policy_version'),
    ('automatic_gate_passed_at'),
    ('readiness_status'),
    ('first_preview_ready_at'),
    ('readiness_revoked_at'),
    ('is_current_customer_preview')
),
target_relation AS (
  SELECT relation.oid AS relation_oid
  FROM pg_catalog.pg_class relation
  JOIN pg_catalog.pg_namespace namespace
    ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname = 'ai_sketch_outputs'
    AND relation.relkind IN ('r', 'p')
),
actual_attributes AS (
  SELECT
    target.relation_oid::text AS relation_oid,
    attribute.attnum AS ordinal_position,
    attribute.attname AS column_name,
    attribute.attisdropped AS is_dropped,
    pg_catalog.format_type(attribute.atttypid, attribute.atttypmod)
      AS formatted_type,
    attribute.attnotnull AS is_not_null,
    attribute.atthasdef AS has_default,
    attribute.attidentity::text AS identity_kind,
    attribute.attgenerated::text AS generated_kind,
    CASE
      WHEN attribute_default.oid IS NULL THEN NULL
      ELSE pg_catalog.pg_get_expr(
        attribute_default.adbin,
        attribute_default.adrelid
      )
    END AS column_default
  FROM target_relation target
  JOIN pg_catalog.pg_attribute attribute
    ON attribute.attrelid = target.relation_oid
  LEFT JOIN pg_catalog.pg_attrdef attribute_default
    ON attribute_default.adrelid = attribute.attrelid
   AND attribute_default.adnum = attribute.attnum
  WHERE attribute.attnum > 0
)
SELECT
  (SELECT relation_oid::text FROM target_relation) AS relation_oid,
  (SELECT count(*) FROM actual_attributes) AS actual_positive_attribute_count,
  (SELECT count(*) FROM actual_attributes WHERE is_dropped IS FALSE)
    AS live_non_dropped_attribute_count,
  (SELECT count(*) FROM actual_attributes WHERE is_dropped IS TRUE)
    AS dropped_attribute_slot_count,
  (SELECT count(*)
   FROM expected_baseline expected
   WHERE NOT EXISTS (
     SELECT 1
     FROM actual_attributes actual
     WHERE actual.is_dropped IS FALSE
       AND actual.column_name = expected.column_name
   )) AS baseline_missing_count,
  (SELECT count(*)
   FROM expected_baseline expected
   JOIN actual_attributes actual
     ON actual.column_name = expected.column_name
    AND actual.is_dropped IS FALSE
   WHERE actual.ordinal_position IS DISTINCT FROM expected.expected_ordinal
      OR actual.formatted_type IS DISTINCT FROM expected.formatted_type
      OR actual.is_not_null IS DISTINCT FROM expected.is_not_null
      OR actual.has_default IS DISTINCT FROM expected.has_default
      OR actual.identity_kind IS DISTINCT FROM expected.identity_kind
      OR actual.generated_kind IS DISTINCT FROM expected.generated_kind
      OR actual.column_default IS DISTINCT FROM expected.column_default)
    AS baseline_definition_mismatch_count,
  (SELECT count(*)
   FROM actual_attributes actual
   JOIN candidate_columns candidate
     ON candidate.column_name = actual.column_name
   WHERE actual.is_dropped IS FALSE) AS candidate_present_count,
  (SELECT count(*)
   FROM actual_attributes actual
   WHERE actual.is_dropped IS FALSE
     AND NOT EXISTS (
       SELECT 1
       FROM expected_baseline expected
       WHERE expected.column_name = actual.column_name
     )) AS unexpected_live_column_count,
  COALESCE(
    (SELECT jsonb_agg(
       jsonb_build_object(
         'ordinal_position', ordinal_position,
         'column_name', column_name,
         'is_dropped', is_dropped,
         'formatted_type', formatted_type,
         'is_not_null', is_not_null,
         'has_default', has_default,
         'identity_kind', identity_kind,
         'generated_kind', generated_kind,
         'column_default', column_default
       ) ORDER BY ordinal_position
     ) FROM actual_attributes),
    '[]'::jsonb
  ) AS actual_attributes;
```

Expected: exactly one row; relation OID 17619; actual/live counts 8; dropped,
missing, mismatch, candidate-present, and unexpected-live counts all 0; JSON
contains exactly the eight frozen original attributes and definitions.

## 9. P03 - exact empty-table aggregate

Canonical SHA-256: `8f1ebe8fce37d43575720a3c36ee6caa67b8fcf7cf59f38a71a443ca2e0edfd8`

```sql
SELECT count(*)::bigint AS ai_sketch_outputs_row_count
FROM public.ai_sketch_outputs;
```

Expected: exactly one row and count 0. This is the only approved business-table
inspection in this packet and returns no row values. STOP if non-zero.

## 10. P04 - exact pre-repair object catalog and lock assertion

Canonical SHA-256: `a2dc7a910de636525babd97545f7f1b3c9fc6c7dba023a6df04bcd8d862a135d`

```sql
WITH expected_objects (
  object_type,
  object_oid,
  object_name,
  constraint_type,
  exact_definition,
  is_validated,
  is_deferrable,
  is_initially_deferred,
  is_unique,
  is_valid,
  is_ready,
  is_live
) AS (
  VALUES
    ('constraint', '17636', 'ai_sketch_outputs_concept_brief_id_fkey', 'f', 'FOREIGN KEY (concept_brief_id) REFERENCES concept_briefs(id) ON DELETE CASCADE', true, false, false, NULL::boolean, NULL::boolean, NULL::boolean, NULL::boolean),
    ('constraint', '17631', 'ai_sketch_outputs_job_id_fkey', 'f', 'FOREIGN KEY (job_id) REFERENCES ai_sketch_jobs(id) ON DELETE CASCADE', true, false, false, NULL::boolean, NULL::boolean, NULL::boolean, NULL::boolean),
    ('constraint', '17630', 'ai_sketch_outputs_pkey', 'p', 'PRIMARY KEY (id)', true, false, false, NULL::boolean, NULL::boolean, NULL::boolean, NULL::boolean),
    ('index', '17682', 'ai_sketch_outputs_concept_brief_id_idx', NULL::text, 'CREATE INDEX ai_sketch_outputs_concept_brief_id_idx ON public.ai_sketch_outputs USING btree (concept_brief_id)', NULL::boolean, NULL::boolean, NULL::boolean, false, true, true, true),
    ('index', '17629', 'ai_sketch_outputs_pkey', NULL::text, 'CREATE UNIQUE INDEX ai_sketch_outputs_pkey ON public.ai_sketch_outputs USING btree (id)', NULL::boolean, NULL::boolean, NULL::boolean, true, true, true, true)
),
target_relation AS (
  SELECT relation.oid AS relation_oid
  FROM pg_catalog.pg_class relation
  JOIN pg_catalog.pg_namespace namespace
    ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname = 'ai_sketch_outputs'
    AND relation.oid::text = '17619'
    AND relation.relkind = 'r'
),
actual_objects AS (
  SELECT
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
  FROM target_relation target
  JOIN pg_catalog.pg_constraint constraint_object
    ON constraint_object.conrelid = target.relation_oid
  UNION ALL
  SELECT
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
  FROM target_relation target
  JOIN pg_catalog.pg_index index_metadata
    ON index_metadata.indrelid = target.relation_oid
  JOIN pg_catalog.pg_class index_relation
    ON index_relation.oid = index_metadata.indexrelid
),
target_locks AS (
  SELECT
    count(*) AS total_lock_count,
    count(*) FILTER (WHERE granted IS FALSE) AS waiting_lock_count
  FROM pg_catalog.pg_locks
  WHERE relation = (SELECT relation_oid FROM target_relation)
    AND database = (
      SELECT oid
      FROM pg_catalog.pg_database
      WHERE datname = current_database()
    )
    AND pid IS DISTINCT FROM pg_catalog.pg_backend_pid()
)
SELECT
  (SELECT relation_oid::text FROM target_relation) AS relation_oid,
  (SELECT count(*) FROM actual_objects) AS actual_object_count,
  (SELECT count(*)
   FROM expected_objects expected
   WHERE NOT EXISTS (
     SELECT 1 FROM actual_objects actual
     WHERE actual.object_type = expected.object_type
       AND actual.object_oid = expected.object_oid
       AND actual.object_name = expected.object_name
   )) AS missing_expected_object_count,
  (SELECT count(*)
   FROM actual_objects actual
   WHERE NOT EXISTS (
     SELECT 1 FROM expected_objects expected
     WHERE expected.object_type = actual.object_type
       AND expected.object_oid = actual.object_oid
       AND expected.object_name = actual.object_name
   )) AS unexpected_object_count,
  (SELECT count(*)
   FROM expected_objects expected
   JOIN actual_objects actual
     ON actual.object_type = expected.object_type
    AND actual.object_oid = expected.object_oid
    AND actual.object_name = expected.object_name
   WHERE actual.constraint_type IS DISTINCT FROM expected.constraint_type
      OR actual.exact_definition IS DISTINCT FROM expected.exact_definition
      OR actual.is_validated IS DISTINCT FROM expected.is_validated
      OR actual.is_deferrable IS DISTINCT FROM expected.is_deferrable
      OR actual.is_initially_deferred IS DISTINCT FROM expected.is_initially_deferred
      OR actual.is_unique IS DISTINCT FROM expected.is_unique
      OR actual.is_valid IS DISTINCT FROM expected.is_valid
      OR actual.is_ready IS DISTINCT FROM expected.is_ready
      OR actual.is_live IS DISTINCT FROM expected.is_live)
    AS object_definition_mismatch_count,
  (SELECT count(*)
   FROM actual_objects
   WHERE (object_type = 'constraint' AND is_validated IS NOT TRUE)
      OR (object_type = 'index'
          AND (is_valid IS NOT TRUE OR is_ready IS NOT TRUE OR is_live IS NOT TRUE)))
    AS invalid_unready_or_nonlive_object_count,
  locks.total_lock_count,
  locks.waiting_lock_count,
  COALESCE(
    (SELECT jsonb_agg(
       jsonb_build_object(
         'object_type', object_type,
         'object_oid', object_oid,
         'object_name', object_name,
         'constraint_type', constraint_type,
         'exact_definition', exact_definition,
         'is_validated', is_validated,
         'is_deferrable', is_deferrable,
         'is_initially_deferred', is_initially_deferred,
         'is_unique', is_unique,
         'is_valid', is_valid,
         'is_ready', is_ready,
         'is_live', is_live
       ) ORDER BY object_type, object_name
     ) FROM actual_objects),
    '[]'::jsonb
  ) AS actual_objects
FROM target_locks locks;
```

Expected: exactly one row; relation OID 17619; object count 5; missing,
unexpected, definition-mismatch, invalid/unready/non-live, total-lock, and
waiting-lock counts all 0; JSON exactly matches the five frozen recovery R04
objects. P04 must run immediately before X01.

## 11. X01 - exact frozen 23.2 repair statement

Canonical SHA-256: `4db11692e2e0147e23772f6649d6250786bf23fcaa2542d48d1d001f3e6561b4`

```sql
ALTER TABLE public.ai_sketch_outputs
  ADD COLUMN mime_type text,
  ADD COLUMN byte_size bigint,
  ADD COLUMN width_px integer,
  ADD COLUMN height_px integer,
  ADD COLUMN content_sha256 text,
  ADD COLUMN asset_created_at timestamptz,
  ADD COLUMN asset_validation_status text,
  ADD COLUMN asset_validation_evidence jsonb,
  ADD COLUMN asset_validated_at timestamptz,
  ADD COLUMN automatic_gate_status text,
  ADD COLUMN automatic_gate_evidence jsonb,
  ADD COLUMN automatic_gate_policy_version text,
  ADD COLUMN automatic_gate_passed_at timestamptz,
  ADD COLUMN readiness_status text,
  ADD COLUMN first_preview_ready_at timestamptz,
  ADD COLUMN readiness_revoked_at timestamptz,
  ADD COLUMN is_current_customer_preview boolean NOT NULL DEFAULT false;
```

Expected: the one atomic statement succeeds once without warning or error. Row
and duplicate counts are n/a. Do not run X01 if any preflight differs. On any
X01 error/warning, capture the exact error artifact and STOP; do not retry,
replace, compensate, or roll back.

## 12. A01 - immediate exact post-repair attribute assertion

Canonical SHA-256: `0b5f78c75deb40de15700bffcb6866424d5ea5ffd8caccb5bb0b2976087d2cf0`

```sql
WITH expected_columns (
  expected_ordinal,
  column_name,
  formatted_type,
  is_not_null,
  has_default,
  identity_kind,
  generated_kind,
  column_default
) AS (
  VALUES
    (1, 'id', 'uuid', true, true, '', '', 'gen_random_uuid()'),
    (2, 'job_id', 'uuid', true, false, '', '', NULL::text),
    (3, 'concept_brief_id', 'uuid', true, false, '', '', NULL::text),
    (4, 'bucket_name', 'text', true, true, '', '', '''novora-ai-sketches''::text'),
    (5, 'object_path', 'text', false, false, '', '', NULL::text),
    (6, 'preview_status', 'text', true, true, '', '', '''pending_review''::text'),
    (7, 'metadata', 'jsonb', true, true, '', '', '''{}''::jsonb'),
    (8, 'created_at', 'timestamp with time zone', true, true, '', '', 'now()'),
    (9, 'mime_type', 'text', false, false, '', '', NULL::text),
    (10, 'byte_size', 'bigint', false, false, '', '', NULL::text),
    (11, 'width_px', 'integer', false, false, '', '', NULL::text),
    (12, 'height_px', 'integer', false, false, '', '', NULL::text),
    (13, 'content_sha256', 'text', false, false, '', '', NULL::text),
    (14, 'asset_created_at', 'timestamp with time zone', false, false, '', '', NULL::text),
    (15, 'asset_validation_status', 'text', false, false, '', '', NULL::text),
    (16, 'asset_validation_evidence', 'jsonb', false, false, '', '', NULL::text),
    (17, 'asset_validated_at', 'timestamp with time zone', false, false, '', '', NULL::text),
    (18, 'automatic_gate_status', 'text', false, false, '', '', NULL::text),
    (19, 'automatic_gate_evidence', 'jsonb', false, false, '', '', NULL::text),
    (20, 'automatic_gate_policy_version', 'text', false, false, '', '', NULL::text),
    (21, 'automatic_gate_passed_at', 'timestamp with time zone', false, false, '', '', NULL::text),
    (22, 'readiness_status', 'text', false, false, '', '', NULL::text),
    (23, 'first_preview_ready_at', 'timestamp with time zone', false, false, '', '', NULL::text),
    (24, 'readiness_revoked_at', 'timestamp with time zone', false, false, '', '', NULL::text),
    (25, 'is_current_customer_preview', 'boolean', true, true, '', '', 'false')
),
candidate_columns (column_name) AS (
  VALUES
    ('mime_type'),
    ('byte_size'),
    ('width_px'),
    ('height_px'),
    ('content_sha256'),
    ('asset_created_at'),
    ('asset_validation_status'),
    ('asset_validation_evidence'),
    ('asset_validated_at'),
    ('automatic_gate_status'),
    ('automatic_gate_evidence'),
    ('automatic_gate_policy_version'),
    ('automatic_gate_passed_at'),
    ('readiness_status'),
    ('first_preview_ready_at'),
    ('readiness_revoked_at'),
    ('is_current_customer_preview')
),
target_relation AS (
  SELECT relation.oid AS relation_oid
  FROM pg_catalog.pg_class relation
  JOIN pg_catalog.pg_namespace namespace
    ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname = 'ai_sketch_outputs'
    AND relation.oid::text = '17619'
    AND relation.relkind = 'r'
),
actual_attributes AS (
  SELECT
    target.relation_oid::text AS relation_oid,
    attribute.attnum AS ordinal_position,
    attribute.attname AS column_name,
    attribute.attisdropped AS is_dropped,
    pg_catalog.format_type(attribute.atttypid, attribute.atttypmod)
      AS formatted_type,
    attribute.attnotnull AS is_not_null,
    attribute.atthasdef AS has_default,
    attribute.attidentity::text AS identity_kind,
    attribute.attgenerated::text AS generated_kind,
    CASE
      WHEN attribute_default.oid IS NULL THEN NULL
      ELSE pg_catalog.pg_get_expr(
        attribute_default.adbin,
        attribute_default.adrelid
      )
    END AS column_default
  FROM target_relation target
  JOIN pg_catalog.pg_attribute attribute
    ON attribute.attrelid = target.relation_oid
  LEFT JOIN pg_catalog.pg_attrdef attribute_default
    ON attribute_default.adrelid = attribute.attrelid
   AND attribute_default.adnum = attribute.attnum
  WHERE attribute.attnum > 0
)
SELECT
  (SELECT relation_oid::text FROM target_relation) AS relation_oid,
  (SELECT count(*) FROM actual_attributes) AS actual_positive_attribute_count,
  (SELECT count(*) FROM actual_attributes WHERE is_dropped IS FALSE)
    AS live_non_dropped_attribute_count,
  (SELECT count(*) FROM actual_attributes WHERE is_dropped IS TRUE)
    AS dropped_attribute_slot_count,
  (SELECT count(*)
   FROM expected_columns expected
   WHERE NOT EXISTS (
     SELECT 1 FROM actual_attributes actual
     WHERE actual.is_dropped IS FALSE
       AND actual.column_name = expected.column_name
   )) AS expected_missing_count,
  (SELECT count(*)
   FROM expected_columns expected
   JOIN actual_attributes actual
     ON actual.column_name = expected.column_name
    AND actual.is_dropped IS FALSE
   WHERE actual.ordinal_position IS DISTINCT FROM expected.expected_ordinal
      OR actual.formatted_type IS DISTINCT FROM expected.formatted_type
      OR actual.is_not_null IS DISTINCT FROM expected.is_not_null
      OR actual.has_default IS DISTINCT FROM expected.has_default
      OR actual.identity_kind IS DISTINCT FROM expected.identity_kind
      OR actual.generated_kind IS DISTINCT FROM expected.generated_kind
      OR actual.column_default IS DISTINCT FROM expected.column_default)
    AS definition_mismatch_count,
  (SELECT count(*)
   FROM actual_attributes actual
   JOIN candidate_columns candidate
     ON candidate.column_name = actual.column_name
   WHERE actual.is_dropped IS FALSE) AS candidate_present_count,
  (SELECT count(*)
   FROM actual_attributes actual
   WHERE actual.is_dropped IS FALSE
     AND NOT EXISTS (
       SELECT 1 FROM expected_columns expected
       WHERE expected.column_name = actual.column_name
     )) AS unexpected_live_column_count,
  COALESCE(
    (SELECT jsonb_agg(
       jsonb_build_object(
         'ordinal_position', ordinal_position,
         'column_name', column_name,
         'is_dropped', is_dropped,
         'formatted_type', formatted_type,
         'is_not_null', is_not_null,
         'has_default', has_default,
         'identity_kind', identity_kind,
         'generated_kind', generated_kind,
         'column_default', column_default
       ) ORDER BY ordinal_position
     ) FROM actual_attributes),
    '[]'::jsonb
  ) AS actual_attributes;
```

Expected: exactly one row; relation OID 17619; actual/live counts 25; dropped,
missing, mismatch, and unexpected-live counts 0; candidate-present count 17;
JSON contains exactly the 25 frozen attributes and definitions. A01 must run
immediately after X01. Any mismatch is a STOP and does not authorize repair.

## 13. A02 - post-repair empty-table assertion

Canonical SHA-256: `8f1ebe8fce37d43575720a3c36ee6caa67b8fcf7cf59f38a71a443ca2e0edfd8`

```sql
SELECT count(*)::bigint AS ai_sketch_outputs_row_count
FROM public.ai_sketch_outputs;
```

Expected: exactly one row and count 0. This statement is intentionally
byte-identical to P03 and must produce a fresh post-X01 artifact.

## 14. A03 - post-repair object catalog and lock assertion

Canonical SHA-256: `a2dc7a910de636525babd97545f7f1b3c9fc6c7dba023a6df04bcd8d862a135d`

```sql
WITH expected_objects (
  object_type,
  object_oid,
  object_name,
  constraint_type,
  exact_definition,
  is_validated,
  is_deferrable,
  is_initially_deferred,
  is_unique,
  is_valid,
  is_ready,
  is_live
) AS (
  VALUES
    ('constraint', '17636', 'ai_sketch_outputs_concept_brief_id_fkey', 'f', 'FOREIGN KEY (concept_brief_id) REFERENCES concept_briefs(id) ON DELETE CASCADE', true, false, false, NULL::boolean, NULL::boolean, NULL::boolean, NULL::boolean),
    ('constraint', '17631', 'ai_sketch_outputs_job_id_fkey', 'f', 'FOREIGN KEY (job_id) REFERENCES ai_sketch_jobs(id) ON DELETE CASCADE', true, false, false, NULL::boolean, NULL::boolean, NULL::boolean, NULL::boolean),
    ('constraint', '17630', 'ai_sketch_outputs_pkey', 'p', 'PRIMARY KEY (id)', true, false, false, NULL::boolean, NULL::boolean, NULL::boolean, NULL::boolean),
    ('index', '17682', 'ai_sketch_outputs_concept_brief_id_idx', NULL::text, 'CREATE INDEX ai_sketch_outputs_concept_brief_id_idx ON public.ai_sketch_outputs USING btree (concept_brief_id)', NULL::boolean, NULL::boolean, NULL::boolean, false, true, true, true),
    ('index', '17629', 'ai_sketch_outputs_pkey', NULL::text, 'CREATE UNIQUE INDEX ai_sketch_outputs_pkey ON public.ai_sketch_outputs USING btree (id)', NULL::boolean, NULL::boolean, NULL::boolean, true, true, true, true)
),
target_relation AS (
  SELECT relation.oid AS relation_oid
  FROM pg_catalog.pg_class relation
  JOIN pg_catalog.pg_namespace namespace
    ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname = 'ai_sketch_outputs'
    AND relation.oid::text = '17619'
    AND relation.relkind = 'r'
),
actual_objects AS (
  SELECT
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
  FROM target_relation target
  JOIN pg_catalog.pg_constraint constraint_object
    ON constraint_object.conrelid = target.relation_oid
  UNION ALL
  SELECT
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
  FROM target_relation target
  JOIN pg_catalog.pg_index index_metadata
    ON index_metadata.indrelid = target.relation_oid
  JOIN pg_catalog.pg_class index_relation
    ON index_relation.oid = index_metadata.indexrelid
),
target_locks AS (
  SELECT
    count(*) AS total_lock_count,
    count(*) FILTER (WHERE granted IS FALSE) AS waiting_lock_count
  FROM pg_catalog.pg_locks
  WHERE relation = (SELECT relation_oid FROM target_relation)
    AND database = (
      SELECT oid
      FROM pg_catalog.pg_database
      WHERE datname = current_database()
    )
    AND pid IS DISTINCT FROM pg_catalog.pg_backend_pid()
)
SELECT
  (SELECT relation_oid::text FROM target_relation) AS relation_oid,
  (SELECT count(*) FROM actual_objects) AS actual_object_count,
  (SELECT count(*)
   FROM expected_objects expected
   WHERE NOT EXISTS (
     SELECT 1 FROM actual_objects actual
     WHERE actual.object_type = expected.object_type
       AND actual.object_oid = expected.object_oid
       AND actual.object_name = expected.object_name
   )) AS missing_expected_object_count,
  (SELECT count(*)
   FROM actual_objects actual
   WHERE NOT EXISTS (
     SELECT 1 FROM expected_objects expected
     WHERE expected.object_type = actual.object_type
       AND expected.object_oid = actual.object_oid
       AND expected.object_name = actual.object_name
   )) AS unexpected_object_count,
  (SELECT count(*)
   FROM expected_objects expected
   JOIN actual_objects actual
     ON actual.object_type = expected.object_type
    AND actual.object_oid = expected.object_oid
    AND actual.object_name = expected.object_name
   WHERE actual.constraint_type IS DISTINCT FROM expected.constraint_type
      OR actual.exact_definition IS DISTINCT FROM expected.exact_definition
      OR actual.is_validated IS DISTINCT FROM expected.is_validated
      OR actual.is_deferrable IS DISTINCT FROM expected.is_deferrable
      OR actual.is_initially_deferred IS DISTINCT FROM expected.is_initially_deferred
      OR actual.is_unique IS DISTINCT FROM expected.is_unique
      OR actual.is_valid IS DISTINCT FROM expected.is_valid
      OR actual.is_ready IS DISTINCT FROM expected.is_ready
      OR actual.is_live IS DISTINCT FROM expected.is_live)
    AS object_definition_mismatch_count,
  (SELECT count(*)
   FROM actual_objects
   WHERE (object_type = 'constraint' AND is_validated IS NOT TRUE)
      OR (object_type = 'index'
          AND (is_valid IS NOT TRUE OR is_ready IS NOT TRUE OR is_live IS NOT TRUE)))
    AS invalid_unready_or_nonlive_object_count,
  locks.total_lock_count,
  locks.waiting_lock_count,
  COALESCE(
    (SELECT jsonb_agg(
       jsonb_build_object(
         'object_type', object_type,
         'object_oid', object_oid,
         'object_name', object_name,
         'constraint_type', constraint_type,
         'exact_definition', exact_definition,
         'is_validated', is_validated,
         'is_deferrable', is_deferrable,
         'is_initially_deferred', is_initially_deferred,
         'is_unique', is_unique,
         'is_valid', is_valid,
         'is_ready', is_ready,
         'is_live', is_live
       ) ORDER BY object_type, object_name
     ) FROM actual_objects),
    '[]'::jsonb
  ) AS actual_objects
FROM target_locks locks;
```

Expected: exactly the P04 result from a fresh post-X01 execution: relation OID
17619, object count 5, every mismatch/health/lock count 0, and the exact five
objects unchanged. This statement is intentionally byte-identical to P04.

## 15. Exact order and mandatory STOP matrix

| Order | Step | Kind | Required PASS result | STOP consequence |
| ---: | --- | --- | --- | --- |
| 0 | Phase 0 | Visual only | Exact target, blank editor, quiet window | Do not run P01 |
| 1 | P01 | SELECT metadata | Exact context and relation identity | Mark P02-A03 `not_run` |
| 2 | P02 | SELECT metadata | Exact eight-column pre-repair catalog | Mark P03-A03 `not_run` |
| 3 | P03 | SELECT aggregate | Output row count 0 | Mark P04-A03 `not_run` |
| 4 | P04 | SELECT metadata | Exact objects and zero locks | Mark X01-A03 `not_run` |
| 5 | X01 | DDL | Exact atomic statement reports success | Mark A01-A03 `not_run`; no retry/rollback |
| 6 | A01 | SELECT metadata | Exact 25-column post-repair catalog | Mark A02-A03 `not_run`; no repair |
| 7 | A02 | SELECT aggregate | Output row count remains 0 | Mark A03 `not_run`; no repair |
| 8 | A03 | SELECT metadata | Exact objects unchanged and zero locks | Repair evidence may be reconciled; no resume |

Any result drift, including an already-present candidate column, is a STOP and
requires a newly reviewed packet. `IF NOT EXISTS` replacement SQL is forbidden.

## 16. Explicit exclusions

This packet excludes and does not authorize:

- Codex, MCP, CLI, or automated Supabase execution;
- `23.1-S01` re-execution;
- B11, B12+, blocks 23.3-23.7, V01-V05, or Phase A resume;
- any SQL other than exact P01-P04, X01, and A01-A03;
- transaction wrappers, replacement SQL, `IF NOT EXISTS`, manual individual
  `ADD COLUMN`, retry, repair-after-error, compensation, rollback, or cleanup;
- INSERT, UPDATE, DELETE, TRUNCATE, backfill, row-value inspection, or any
  business-table inspection beyond the exact aggregate P03 and A02 counts;
- constraint/index, ACL, default-privilege, RLS, policy, Storage, bucket,
  Provider, environment, deployment, application, customer-visible, email,
  payment, order, CAD, production, or customer-data action;
- branch, worktree, or evidence deletion.

## 17. Post-execution decision boundary

Even if A03 passes, Phase A remains STOPPED. Return only the sanitized selected
artifacts and repair manifest for independent reconciliation. Do not run B11 or
any later statement. A separate immutable resume packet, independent review,
and exact human approval are required before any continuation.
