# NOVORA First Preview MVP-CORE-1 Select-Only Preflight Packet v1

Status: **FROZEN FOR INDEPENDENT REVIEW - NOT APPROVED FOR EXECUTION**

This documentation-only packet implements Gate `MVP-CORE-1` from the merged
Critical Path Cutline v3. It contains only the minimum read-only metadata and
aggregate checks required to decide whether the current live baseline is
compatible with the limited-beta Core objects. Preparing, reviewing, merging,
or citing this packet does **not** authorize a Supabase connection or SQL
execution.

## 1. Immutable source identities

- Creation base / merged `origin/main` before this packet:
  `9deef181f187ea3a16210768da27c81be8b3139b`.
- Critical Path Cutline v3:
  `docs/novora-first-preview-mvp-critical-path-cutline-v3.md`, Git blob
  `a43313f1d936365fd97dc92ccd8803d18b711176`.
- Frozen Agent 70B-2 schema source:
  `docs/novora-agent-70b2-first-preview-live-schema-review-and-additive-sql-plan-v1.md`,
  Git blob `714a30d16760dc98602dcbd8dc92d8785895811c`.
- Frozen Recovery source containing the reused R01 and R04 statements:
  `docs/novora-first-preview-phase-a-read-only-recovery-packet-v1.md`, Git blob
  `e853e2992f4d556a1d41b089006bdd288aa2d7bc`.
- Completed Batch 02 manifest:
  `novora-fp-phase-a-resume-batch-02-b01-b17-20-manifest-v2.json`, `21342`
  bytes, SHA-256
  `08cce41ec14d7c91730ce2d3ad2a513c7a50079786327d525ee5cf750a69c7dc`.
- Accepted R02 positive-column catalog:
  `novora-fp-phase-a-resume-02-r02.csv`, `6020` bytes, SHA-256
  `01619c87bec0666a8965ffb6769e0683955178b039ada3611b5b3fe811ee15b6`.
- Accepted R04 baseline-object catalog:
  `novora-fp-phase-a-resume-03-r04.csv`, `3181` bytes, SHA-256
  `92142e7e71f210bed22cb31b852354f1d93d80d7ea36e36602f47941ee0b6c3f`.

The packet PR number, reviewed head, packet Git blob, and post-merge
`origin/main` identity are intentionally supplied only after exact-head
independent review and merge. Any execution approval must bind all four final
identities and every statement identity in section 5.

## 2. Scope and Core object set

This gate verifies only the database enforcement required for the first
limited-beta read/write path:

- valid Job status and complete non-draft `first_preview` identity;
- bounded attempt-1 root and attempt-2 retry lineage;
- deterministic idempotency, attempt identity, and one active Job per
  brief/purpose;
- one Output per Job and one current customer preview per Brief;
- Job/Output/Review/Brief ownership and composite linkage;
- valid Output readiness vocabulary;
- complete persisted-private-asset and automatic-gate evidence before
  `first_preview_ready`;
- bidirectional ready/current-marker consistency and revoked/current denial;
- only indexes used by the actual MVP paths.

The following exact proposed Core object names are frozen for absence checking
and for the dependent `MVP-CORE-2` design. This packet contains no DDL:

| # | Table | Kind | Proposed Core object |
| --- | --- | --- | --- |
| 1 | `ai_sketch_jobs` | constraint | `ai_sketch_jobs_status_check` |
| 2 | `ai_sketch_jobs` | constraint | `ai_sketch_jobs_mvp_core_identity_check` |
| 3 | `ai_sketch_jobs` | constraint | `ai_sketch_jobs_parent_lineage_fkey` |
| 4 | `ai_sketch_outputs` | constraint | `ai_sketch_outputs_readiness_status_check` |
| 5 | `ai_sketch_outputs` | constraint | `ai_sketch_outputs_mvp_core_ready_current_check` |
| 6 | `ai_sketch_outputs` | constraint | `ai_sketch_outputs_job_brief_fkey` |
| 7 | `ai_sketch_reviews` | constraint | `ai_sketch_reviews_output_brief_fkey` |
| 8 | `ai_sketch_jobs` | index | `ai_sketch_jobs_id_brief_uidx` |
| 9 | `ai_sketch_jobs` | index | `ai_sketch_jobs_parent_lineage_target_uidx` |
| 10 | `ai_sketch_outputs` | index | `ai_sketch_outputs_id_brief_uidx` |
| 11 | `ai_sketch_jobs` | index | `ai_sketch_jobs_idempotency_key_uidx` |
| 12 | `ai_sketch_jobs` | index | `ai_sketch_jobs_attempt_identity_uidx` |
| 13 | `ai_sketch_jobs` | index | `ai_sketch_jobs_one_active_purpose_uidx` |
| 14 | `ai_sketch_outputs` | index | `ai_sketch_outputs_one_per_job_uidx` |
| 15 | `ai_sketch_outputs` | index | `ai_sketch_outputs_one_current_customer_preview_uidx` |
| 16 | `ai_sketch_jobs` | index | `ai_sketch_jobs_parent_job_id_idx` |
| 17 | `ai_sketch_reviews` | index | `ai_sketch_reviews_ai_sketch_output_id_idx` |

`POST_MVP_HARDENING` is deliberately excluded: feedback-regeneration attempts
2-3; source-output and extended parent chains; provider-request uniqueness or
profile enforcement; pricing/cost enforcement; complete timing, terminal,
failure, retry, non-ready, and revocation chronology; and unused support
indexes. These deferred concerns cannot fail this Core gate.

## 3. Required manual execution context

A future separate exact Owner approval must name this frozen packet and permit
only one manual sequence against:

- Supabase project: `novora-production`;
- branch/environment: `main` / Production;
- Primary Database: `postgres`;
- target schema: `public`;
- selected current role: `postgres`;
- required current role and session role: `postgres`;
- `server_is_in_recovery = false`;
- SQL Editor row limit: at least `1000`.

The Owner must establish and attest one uninterrupted quiet window, from the
Phase 0 capture through `CORE1-07`, with no First Preview writer, migration,
schema operation, application rollout, or other actor targeting
`ai_sketch_jobs`, `ai_sketch_outputs`, or `ai_sketch_reviews`.

Phase 0 proves only the visible project, `main` / Production, Primary Database,
selected role `postgres`, row limit, fresh blank editor, and absence of a
visible warning/error or old SQL/result. `CORE1-01` independently proves the
database, schema, current role, session role, recovery state, relation identity,
owner, and persistence. The screenshot does not prove quiet-window truth or
reuse of one backend session; those limits must be recorded.

Every statement must be pasted into a blank editor and run individually,
exactly once, in section 5 order, using ordinary manual `Run`. Do not add a
comment, combine statements, add a transaction wrapper, edit identifiers,
substitute SQL, use the generic Retry control, or automatically retry.

## 4. Canonicalization and local identity check

For every statement, the canonical bytes are exactly the content inside its
`sql` fence:

- UTF-8 without BOM;
- LF (`0A`) line endings only;
- first byte is the first SQL character;
- the final SQL character is the statement semicolon, followed by exactly one
  LF byte;
- no leading blank line and no additional trailing blank line.

Before any future manual run, independently extract the exact fence, verify its
canonical byte length and SHA-256 against section 5, and paste those exact
bytes. A result CSV does not prove the SQL submitted to the editor. Unless a
separate artifact proves the complete submitted bytes, the later evidence
manifest must record `actual_canonical_sql_sha256: null` and
`canonical_hash_equality: null`; it must not copy the expected hash by
inference.

## 5. Exact ordered SELECT-only sequence

### CORE1-01 - session context and same-name relation identity

Canonical byte length: `1483`

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

PASS requires exactly 3 complete rows and the 13 exact headers in SELECT order;
zero duplicate table identities; database/schema/current-role/session-role
`postgres`/`public`/`postgres`/`postgres`; recovery false; exactly the three
approved public regular relations, owner `postgres`, persistence `p`, with OIDs
Jobs `17602`, Outputs `17619`, Reviews `17641`; and no same-name relation in any
other non-system schema.

### CORE1-02 - exact Core column posture

Canonical byte length: `6229`

Canonical SHA-256: `d0db253855127c0293448f8f94389f55ed50be5b090b071f688011617f44790e`

```sql
WITH expected_columns (
  table_name, expected_relation_oid, ordinal_position, column_name,
  formatted_type, is_not_null, has_default, column_default
) AS (
  VALUES
    ('ai_sketch_jobs', '17602', 1, 'id', 'uuid', true, true, 'gen_random_uuid()'),
    ('ai_sketch_jobs', '17602', 2, 'concept_brief_id', 'uuid', true, false, NULL),
    ('ai_sketch_jobs', '17602', 3, 'status', 'text', true, true, '''draft''::text'),
    ('ai_sketch_jobs', '17602', 10, 'generation_purpose', 'text', false, false, NULL),
    ('ai_sketch_jobs', '17602', 11, 'idempotency_key', 'text', false, false, NULL),
    ('ai_sketch_jobs', '17602', 12, 'attempt_number', 'smallint', false, false, NULL),
    ('ai_sketch_jobs', '17602', 13, 'lineage_identity', 'text', false, false, NULL),
    ('ai_sketch_jobs', '17602', 14, 'parent_job_id', 'uuid', false, false, NULL),
    ('ai_sketch_jobs', '17602', 15, 'parent_generation_purpose', 'text', false, false, NULL),
    ('ai_sketch_jobs', '17602', 16, 'parent_attempt_number', 'smallint', false, false, NULL),
    ('ai_sketch_jobs', '17602', 17, 'source_output_id', 'uuid', false, false, NULL),
    ('ai_sketch_jobs', '17602', 18, 'design_spec_version', 'text', false, false, NULL),
    ('ai_sketch_jobs', '17602', 19, 'design_spec_hash', 'text', false, false, NULL),
    ('ai_sketch_jobs', '17602', 20, 'hand_sketch_instruction_version', 'text', false, false, NULL),
    ('ai_sketch_jobs', '17602', 21, 'hand_sketch_instruction_hash', 'text', false, false, NULL),
    ('ai_sketch_outputs', '17619', 1, 'id', 'uuid', true, true, 'gen_random_uuid()'),
    ('ai_sketch_outputs', '17619', 2, 'job_id', 'uuid', true, false, NULL),
    ('ai_sketch_outputs', '17619', 3, 'concept_brief_id', 'uuid', true, false, NULL),
    ('ai_sketch_outputs', '17619', 4, 'bucket_name', 'text', true, true, '''novora-ai-sketches''::text'),
    ('ai_sketch_outputs', '17619', 5, 'object_path', 'text', false, false, NULL),
    ('ai_sketch_outputs', '17619', 9, 'mime_type', 'text', false, false, NULL),
    ('ai_sketch_outputs', '17619', 10, 'byte_size', 'bigint', false, false, NULL),
    ('ai_sketch_outputs', '17619', 11, 'width_px', 'integer', false, false, NULL),
    ('ai_sketch_outputs', '17619', 12, 'height_px', 'integer', false, false, NULL),
    ('ai_sketch_outputs', '17619', 13, 'content_sha256', 'text', false, false, NULL),
    ('ai_sketch_outputs', '17619', 14, 'asset_created_at', 'timestamp with time zone', false, false, NULL),
    ('ai_sketch_outputs', '17619', 15, 'asset_validation_status', 'text', false, false, NULL),
    ('ai_sketch_outputs', '17619', 16, 'asset_validation_evidence', 'jsonb', false, false, NULL),
    ('ai_sketch_outputs', '17619', 17, 'asset_validated_at', 'timestamp with time zone', false, false, NULL),
    ('ai_sketch_outputs', '17619', 18, 'automatic_gate_status', 'text', false, false, NULL),
    ('ai_sketch_outputs', '17619', 19, 'automatic_gate_evidence', 'jsonb', false, false, NULL),
    ('ai_sketch_outputs', '17619', 20, 'automatic_gate_policy_version', 'text', false, false, NULL),
    ('ai_sketch_outputs', '17619', 21, 'automatic_gate_passed_at', 'timestamp with time zone', false, false, NULL),
    ('ai_sketch_outputs', '17619', 22, 'readiness_status', 'text', false, false, NULL),
    ('ai_sketch_outputs', '17619', 23, 'first_preview_ready_at', 'timestamp with time zone', false, false, NULL),
    ('ai_sketch_outputs', '17619', 24, 'readiness_revoked_at', 'timestamp with time zone', false, false, NULL),
    ('ai_sketch_outputs', '17619', 25, 'is_current_customer_preview', 'boolean', true, true, 'false')
),
actual_columns AS (
  SELECT
    relation.relname AS table_name,
    relation.oid::text AS relation_oid,
    attribute.attnum::integer AS ordinal_position,
    attribute.attname AS column_name,
    attribute.attisdropped AS is_dropped,
    pg_catalog.format_type(attribute.atttypid, attribute.atttypmod) AS formatted_type,
    attribute.attnotnull AS is_not_null,
    attribute.atthasdef AS has_default,
    attribute.attidentity AS identity_kind,
    attribute.attgenerated AS generated_kind,
    pg_catalog.pg_get_expr(default_object.adbin, default_object.adrelid) AS column_default
  FROM pg_catalog.pg_class relation
  JOIN pg_catalog.pg_namespace namespace ON namespace.oid = relation.relnamespace
  JOIN pg_catalog.pg_attribute attribute ON attribute.attrelid = relation.oid
  LEFT JOIN pg_catalog.pg_attrdef default_object
    ON default_object.adrelid = relation.oid
   AND default_object.adnum = attribute.attnum
  WHERE namespace.nspname = 'public'
    AND relation.relname IN ('ai_sketch_jobs', 'ai_sketch_outputs')
    AND relation.relkind IN ('r', 'p')
    AND attribute.attnum > 0
)
SELECT
  expected.table_name,
  expected.expected_relation_oid,
  expected.ordinal_position AS expected_ordinal_position,
  expected.column_name,
  expected.formatted_type AS expected_formatted_type,
  expected.is_not_null AS expected_is_not_null,
  expected.has_default AS expected_has_default,
  expected.column_default AS expected_column_default,
  actual.relation_oid AS actual_relation_oid,
  actual.ordinal_position AS actual_ordinal_position,
  actual.is_dropped,
  actual.formatted_type AS actual_formatted_type,
  actual.is_not_null AS actual_is_not_null,
  actual.has_default AS actual_has_default,
  actual.identity_kind,
  actual.generated_kind,
  actual.column_default AS actual_column_default,
  (
    actual.relation_oid IS NOT DISTINCT FROM expected.expected_relation_oid
    AND actual.ordinal_position IS NOT DISTINCT FROM expected.ordinal_position
    AND actual.is_dropped IS NOT DISTINCT FROM false
    AND actual.formatted_type IS NOT DISTINCT FROM expected.formatted_type
    AND actual.is_not_null IS NOT DISTINCT FROM expected.is_not_null
    AND actual.has_default IS NOT DISTINCT FROM expected.has_default
    AND actual.identity_kind IS NOT DISTINCT FROM ''
    AND actual.generated_kind IS NOT DISTINCT FROM ''
    AND actual.column_default IS NOT DISTINCT FROM expected.column_default
  ) AS matches_core_definition
FROM expected_columns expected
LEFT JOIN actual_columns actual
  ON actual.table_name = expected.table_name
 AND actual.column_name = expected.column_name
ORDER BY expected.table_name, expected.ordinal_position;
```

PASS requires exactly 37 complete rows and the 18 exact headers in SELECT
order; unique `(table_name, expected_ordinal_position)` and
`(table_name, column_name)` identities; every `matches_core_definition = true`;
the frozen Jobs/Outputs OIDs; exact ordinals, types, nullability, defaults,
empty identity/generated markers, and zero dropped/missing Core columns.

### CORE1-03 - Job Core predicates, duplicates, and bounded parent compatibility

Canonical byte length: `4069`

Canonical SHA-256: `85bb4f80f4f001db8b124202a2fe4f501fab7108b37db1586109e66ff10b5909`

```sql
WITH duplicate_idempotency AS (
  SELECT idempotency_key
  FROM public.ai_sketch_jobs
  WHERE idempotency_key IS NOT NULL
  GROUP BY idempotency_key
  HAVING count(*) > 1
),
duplicate_attempt_identity AS (
  SELECT concept_brief_id, attempt_number
  FROM public.ai_sketch_jobs
  WHERE attempt_number IS NOT NULL
  GROUP BY concept_brief_id, attempt_number
  HAVING count(*) > 1
),
duplicate_active_purpose AS (
  SELECT concept_brief_id, generation_purpose
  FROM public.ai_sketch_jobs
  WHERE generation_purpose IS NOT NULL
    AND status IN ('queued', 'processing')
  GROUP BY concept_brief_id, generation_purpose
  HAVING count(*) > 1
),
job_predicates AS (
  SELECT
    count(*) AS total_job_count,
    count(*) FILTER (
      WHERE child.status IS NULL OR child.status NOT IN (
        'draft', 'queued', 'processing', 'succeeded', 'failed', 'timed_out', 'cancelled'
      )
    ) AS invalid_job_status_count,
    count(*) FILTER (
      WHERE ((
        (child.status IS NOT DISTINCT FROM 'draft'
         AND num_nonnulls(
           child.generation_purpose, child.idempotency_key, child.attempt_number,
           child.lineage_identity, child.parent_job_id,
           child.parent_generation_purpose, child.parent_attempt_number,
           child.source_output_id, child.design_spec_version,
           child.design_spec_hash, child.hand_sketch_instruction_version,
           child.hand_sketch_instruction_hash
         ) = 0)
        OR
        (child.status IS DISTINCT FROM 'draft'
         AND child.generation_purpose IS NOT DISTINCT FROM 'first_preview'
         AND child.attempt_number IN (1, 2)
         AND child.idempotency_key ~ '^[0-9a-f]{64}$'
         AND child.lineage_identity IS NOT DISTINCT FROM 'first-preview:v1'
         AND child.design_spec_version IS NOT NULL
         AND btrim(child.design_spec_version) <> ''
         AND child.design_spec_hash ~ '^[0-9a-f]{64}$'
         AND child.hand_sketch_instruction_version IS NOT NULL
         AND btrim(child.hand_sketch_instruction_version) <> ''
         AND child.hand_sketch_instruction_hash ~ '^[0-9a-f]{64}$'
         AND (
           (child.attempt_number = 1
            AND child.parent_job_id IS NULL
            AND child.parent_generation_purpose IS NULL
            AND child.parent_attempt_number IS NULL
            AND child.source_output_id IS NULL)
           OR
           (child.attempt_number = 2
            AND child.parent_job_id IS NOT NULL
            AND child.parent_generation_purpose IS NOT DISTINCT FROM 'first_preview'
            AND child.parent_attempt_number IS NOT DISTINCT FROM 1
            AND child.source_output_id IS NULL)
         ))
      ) IS NOT TRUE)
    ) AS invalid_mvp_core_identity_count,
    count(*) FILTER (
      WHERE child.parent_job_id IS NOT NULL
        AND parent.id IS NULL
    ) AS missing_parent_count,
    count(*) FILTER (
      WHERE parent.id IS NOT NULL
        AND (
          parent.concept_brief_id IS DISTINCT FROM child.concept_brief_id
          OR parent.generation_purpose IS DISTINCT FROM 'first_preview'
          OR parent.attempt_number IS DISTINCT FROM 1
          OR child.generation_purpose IS DISTINCT FROM 'first_preview'
          OR child.attempt_number IS DISTINCT FROM 2
          OR child.parent_generation_purpose IS DISTINCT FROM parent.generation_purpose
          OR child.parent_attempt_number IS DISTINCT FROM parent.attempt_number
        )
    ) AS invalid_parent_target_count
  FROM public.ai_sketch_jobs child
  LEFT JOIN public.ai_sketch_jobs parent ON parent.id = child.parent_job_id
)
SELECT
  job_predicates.total_job_count,
  job_predicates.invalid_job_status_count,
  job_predicates.invalid_mvp_core_identity_count,
  (SELECT count(*) FROM duplicate_idempotency) AS duplicate_idempotency_key_count,
  (SELECT count(*) FROM duplicate_attempt_identity) AS duplicate_attempt_identity_count,
  (SELECT count(*) FROM duplicate_active_purpose) AS duplicate_active_purpose_count,
  job_predicates.missing_parent_count,
  job_predicates.invalid_parent_target_count
FROM job_predicates;
```

PASS requires exactly 1 complete row and the 8 exact headers in SELECT order;
all 8 values exactly `0`. This proves the empty-table baseline, valid Core-only
status/identity predicate, idempotency and attempt uniqueness, one-active rule,
and bounded same-brief attempt-2 parent compatibility without inspecting a Job
identity.

### CORE1-04 - Output Core readiness, evidence, and uniqueness predicates

Canonical byte length: `2732`

Canonical SHA-256: `b68c2e3c3359ecc9697a70f27f1a3412fc66994616eaf3e9f016852387225a72`

```sql
WITH duplicate_current_preview AS (
  SELECT concept_brief_id
  FROM public.ai_sketch_outputs
  WHERE is_current_customer_preview IS TRUE
  GROUP BY concept_brief_id
  HAVING count(*) > 1
),
duplicate_output_job AS (
  SELECT job_id
  FROM public.ai_sketch_outputs
  GROUP BY job_id
  HAVING count(*) > 1
)
SELECT
  count(*) AS total_output_count,
  count(*) FILTER (
    WHERE readiness_status IS NOT NULL
      AND readiness_status NOT IN ('not_ready', 'first_preview_ready', 'revoked')
  ) AS invalid_readiness_status_count,
  count(*) FILTER (
    WHERE is_current_customer_preview IS TRUE
      AND readiness_status IS DISTINCT FROM 'first_preview_ready'
  ) AS current_without_ready_count,
  count(*) FILTER (
    WHERE readiness_status IS NOT DISTINCT FROM 'first_preview_ready'
      AND is_current_customer_preview IS NOT TRUE
  ) AS ready_without_current_count,
  count(*) FILTER (
    WHERE readiness_status IS NOT DISTINCT FROM 'first_preview_ready'
      AND (
        asset_validation_status IS DISTINCT FROM 'passed'
        OR asset_validation_evidence IS NULL
        OR jsonb_typeof(asset_validation_evidence) IS DISTINCT FROM 'object'
        OR asset_validation_evidence = '{}'::jsonb
        OR automatic_gate_status IS DISTINCT FROM 'passed'
        OR automatic_gate_evidence IS NULL
        OR jsonb_typeof(automatic_gate_evidence) IS DISTINCT FROM 'object'
        OR automatic_gate_evidence = '{}'::jsonb
        OR automatic_gate_policy_version IS NULL
        OR btrim(automatic_gate_policy_version) = ''
        OR asset_created_at IS NULL
        OR asset_validated_at IS NULL
        OR asset_validated_at < asset_created_at
        OR automatic_gate_passed_at IS NULL
        OR automatic_gate_passed_at < asset_validated_at
        OR first_preview_ready_at IS NULL
        OR first_preview_ready_at < automatic_gate_passed_at
        OR readiness_revoked_at IS NOT NULL
        OR bucket_name IS DISTINCT FROM 'novora-ai-sketches'
        OR object_path IS NULL
        OR btrim(object_path) = ''
        OR mime_type IS DISTINCT FROM 'image/png'
        OR byte_size IS NULL
        OR byte_size NOT BETWEEN 1 AND 16777216
        OR width_px IS DISTINCT FROM 1024
        OR height_px IS DISTINCT FROM 1024
        OR content_sha256 IS NULL
        OR content_sha256 !~ '^[0-9a-f]{64}$'
      )
  ) AS invalid_first_preview_ready_evidence_count,
  count(*) FILTER (
    WHERE readiness_status IS NOT DISTINCT FROM 'revoked'
      AND is_current_customer_preview IS TRUE
  ) AS revoked_current_count,
  (SELECT count(*) FROM duplicate_current_preview) AS duplicate_current_preview_brief_count,
  (SELECT count(*) FROM duplicate_output_job) AS multi_output_job_count
FROM public.ai_sketch_outputs;
```

PASS requires exactly 1 complete row and the 8 exact headers in SELECT order;
all 8 values exactly `0`. It checks only Core vocabulary, ready evidence,
bidirectional ready/current consistency, revoked/current denial, and Core
uniqueness. It deliberately does not enforce general non-ready state or full
revocation chronology.

### CORE1-05 - composite targets and Job/Output/Review/Brief linkage

Canonical byte length: `4096`

Canonical SHA-256: `af43abfd46d197741a3239abe53c4fd0cfbf514250f2c7a7d161cdcc0911d548`

```sql
WITH required_type_pairs (
  left_table, left_column, right_table, right_column
) AS (
  VALUES
    ('ai_sketch_jobs', 'id', 'ai_sketch_outputs', 'job_id'),
    ('ai_sketch_jobs', 'concept_brief_id', 'ai_sketch_outputs', 'concept_brief_id'),
    ('ai_sketch_jobs', 'id', 'ai_sketch_jobs', 'parent_job_id'),
    ('ai_sketch_jobs', 'generation_purpose', 'ai_sketch_jobs', 'parent_generation_purpose'),
    ('ai_sketch_jobs', 'attempt_number', 'ai_sketch_jobs', 'parent_attempt_number'),
    ('ai_sketch_outputs', 'id', 'ai_sketch_reviews', 'ai_sketch_output_id'),
    ('ai_sketch_outputs', 'concept_brief_id', 'ai_sketch_reviews', 'concept_brief_id'),
    ('concept_briefs', 'id', 'ai_sketch_jobs', 'concept_brief_id'),
    ('concept_briefs', 'id', 'ai_sketch_outputs', 'concept_brief_id'),
    ('concept_briefs', 'id', 'ai_sketch_reviews', 'concept_brief_id')
),
column_catalog AS (
  SELECT
    relation.relname AS table_name,
    attribute.attname AS column_name,
    attribute.atttypid,
    attribute.atttypmod,
    attribute.attcollation
  FROM pg_catalog.pg_class relation
  JOIN pg_catalog.pg_namespace namespace ON namespace.oid = relation.relnamespace
  JOIN pg_catalog.pg_attribute attribute ON attribute.attrelid = relation.oid
  WHERE namespace.nspname = 'public'
    AND relation.relname IN (
      'concept_briefs', 'ai_sketch_jobs', 'ai_sketch_outputs', 'ai_sketch_reviews'
    )
    AND relation.relkind IN ('r', 'p')
    AND attribute.attnum > 0
    AND attribute.attisdropped IS FALSE
),
type_compatibility AS (
  SELECT count(*) FILTER (
    WHERE left_column.atttypid IS NULL
       OR right_column.atttypid IS NULL
       OR left_column.atttypid IS DISTINCT FROM right_column.atttypid
       OR left_column.atttypmod IS DISTINCT FROM right_column.atttypmod
       OR left_column.attcollation IS DISTINCT FROM right_column.attcollation
  ) AS incompatible_core_column_pair_count
  FROM required_type_pairs pair
  LEFT JOIN column_catalog left_column
    ON left_column.table_name = pair.left_table
   AND left_column.column_name = pair.left_column
  LEFT JOIN column_catalog right_column
    ON right_column.table_name = pair.right_table
   AND right_column.column_name = pair.right_column
)
SELECT
  (SELECT count(*) FROM (
    SELECT id, concept_brief_id
    FROM public.ai_sketch_jobs
    GROUP BY id, concept_brief_id
    HAVING count(*) > 1
  ) duplicates) AS duplicate_job_brief_target_count,
  (SELECT count(*) FROM (
    SELECT id, concept_brief_id, generation_purpose, attempt_number
    FROM public.ai_sketch_jobs
    GROUP BY id, concept_brief_id, generation_purpose, attempt_number
    HAVING count(*) > 1
  ) duplicates) AS duplicate_parent_lineage_target_count,
  (SELECT count(*) FROM (
    SELECT id, concept_brief_id
    FROM public.ai_sketch_outputs
    GROUP BY id, concept_brief_id
    HAVING count(*) > 1
  ) duplicates) AS duplicate_output_brief_target_count,
  (SELECT count(*)
   FROM public.ai_sketch_jobs job
   LEFT JOIN public.concept_briefs brief ON brief.id = job.concept_brief_id
   WHERE brief.id IS NULL) AS job_brief_orphan_count,
  (SELECT count(*)
   FROM public.ai_sketch_outputs output
   LEFT JOIN public.ai_sketch_jobs job
     ON job.id = output.job_id
    AND job.concept_brief_id = output.concept_brief_id
   WHERE job.id IS NULL) AS output_job_brief_mismatch_or_orphan_count,
  (SELECT count(*)
   FROM public.ai_sketch_outputs output
   LEFT JOIN public.concept_briefs brief ON brief.id = output.concept_brief_id
   WHERE brief.id IS NULL) AS output_brief_orphan_count,
  (SELECT count(*)
   FROM public.ai_sketch_reviews review
   LEFT JOIN public.ai_sketch_outputs output
     ON output.id = review.ai_sketch_output_id
    AND output.concept_brief_id = review.concept_brief_id
   WHERE output.id IS NULL) AS review_output_brief_mismatch_or_orphan_count,
  (SELECT count(*)
   FROM public.ai_sketch_reviews review
   LEFT JOIN public.concept_briefs brief ON brief.id = review.concept_brief_id
   WHERE brief.id IS NULL) AS review_brief_orphan_count,
  type_compatibility.incompatible_core_column_pair_count
FROM type_compatibility;
```

PASS requires exactly 1 complete row and the 9 exact headers in SELECT order;
all 9 values exactly `0`. No row ID or Brief identity is returned. The type
comparison must cover exactly the 10 frozen pairs with no missing catalog
member.

### CORE1-06 - unfiltered baseline constraint and index catalog

Canonical byte length: `1800`

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

PASS requires the complete untruncated 16-row, 14-header catalog to match the
accepted R04 artifact byte-for-semantic-value: the same table and relation
OIDs, object types/OIDs/names, exact definitions, constraint types and
validation/deferrability, index uniqueness, and every index valid, ready, and
live. Duplicate `(table_name, object_type, object_oid)` identities must be zero.
Any additional, missing, or changed object is drift and an immediate STOP.

The exact accepted baseline is:

| Table / relation OID | Kind / object OID | Object | Exact definition | Required state |
| --- | --- | --- | --- | --- |
| Jobs / `17602` | constraint / `17614` | `ai_sketch_jobs_concept_brief_id_fkey` | `FOREIGN KEY (concept_brief_id) REFERENCES concept_briefs(id) ON DELETE CASCADE` | type `f`; validated; not deferrable; not initially deferred |
| Jobs / `17602` | constraint / `17613` | `ai_sketch_jobs_pkey` | `PRIMARY KEY (id)` | type `p`; validated; not deferrable; not initially deferred |
| Jobs / `17602` | index / `17681` | `ai_sketch_jobs_concept_brief_id_idx` | `CREATE INDEX ai_sketch_jobs_concept_brief_id_idx ON public.ai_sketch_jobs USING btree (concept_brief_id)` | non-unique; valid; ready; live |
| Jobs / `17602` | index / `17612` | `ai_sketch_jobs_pkey` | `CREATE UNIQUE INDEX ai_sketch_jobs_pkey ON public.ai_sketch_jobs USING btree (id)` | unique; valid; ready; live |
| Outputs / `17619` | constraint / `17636` | `ai_sketch_outputs_concept_brief_id_fkey` | `FOREIGN KEY (concept_brief_id) REFERENCES concept_briefs(id) ON DELETE CASCADE` | type `f`; validated; not deferrable; not initially deferred |
| Outputs / `17619` | constraint / `17631` | `ai_sketch_outputs_job_id_fkey` | `FOREIGN KEY (job_id) REFERENCES ai_sketch_jobs(id) ON DELETE CASCADE` | type `f`; validated; not deferrable; not initially deferred |
| Outputs / `17619` | constraint / `17630` | `ai_sketch_outputs_pkey` | `PRIMARY KEY (id)` | type `p`; validated; not deferrable; not initially deferred |
| Outputs / `17619` | index / `17682` | `ai_sketch_outputs_concept_brief_id_idx` | `CREATE INDEX ai_sketch_outputs_concept_brief_id_idx ON public.ai_sketch_outputs USING btree (concept_brief_id)` | non-unique; valid; ready; live |
| Outputs / `17619` | index / `17629` | `ai_sketch_outputs_pkey` | `CREATE UNIQUE INDEX ai_sketch_outputs_pkey ON public.ai_sketch_outputs USING btree (id)` | unique; valid; ready; live |
| Reviews / `17641` | constraint / `17651` | `ai_sketch_reviews_ai_sketch_output_id_fkey` | `FOREIGN KEY (ai_sketch_output_id) REFERENCES ai_sketch_outputs(id) ON DELETE CASCADE` | type `f`; validated; not deferrable; not initially deferred |
| Reviews / `17641` | constraint / `17656` | `ai_sketch_reviews_concept_brief_id_fkey` | `FOREIGN KEY (concept_brief_id) REFERENCES concept_briefs(id) ON DELETE CASCADE` | type `f`; validated; not deferrable; not initially deferred |
| Reviews / `17641` | constraint / `18099` | `ai_sketch_reviews_concept_brief_id_key` | `UNIQUE (concept_brief_id)` | type `u`; validated; not deferrable; not initially deferred |
| Reviews / `17641` | constraint / `17650` | `ai_sketch_reviews_pkey` | `PRIMARY KEY (id)` | type `p`; validated; not deferrable; not initially deferred |
| Reviews / `17641` | constraint / `18073` | `ai_sketch_reviews_review_status_check` | `CHECK (review_status = ANY (ARRAY['internal_draft_not_generated'::text, 'draft_generated_internal_only'::text, 'needs_revision'::text, 'approved_for_customer'::text]))` | type `c`; validated; not deferrable; not initially deferred |
| Reviews / `17641` | index / `18098` | `ai_sketch_reviews_concept_brief_id_key` | `CREATE UNIQUE INDEX ai_sketch_reviews_concept_brief_id_key ON public.ai_sketch_reviews USING btree (concept_brief_id)` | unique; valid; ready; live |
| Reviews / `17641` | index / `17649` | `ai_sketch_reviews_pkey` | `CREATE UNIQUE INDEX ai_sketch_reviews_pkey ON public.ai_sketch_reviews USING btree (id)` | unique; valid; ready; live |

### CORE1-07 - absence of every proposed Core object

Canonical byte length: `2886`

Canonical SHA-256: `1ea03ce488b655a709885fb9fbaf50f48ad6e700f3fad7aa0b290ab106b224ec`

```sql
WITH proposed_objects (sequence_number, table_name, object_type, object_name) AS (
  VALUES
    (1, 'ai_sketch_jobs', 'constraint', 'ai_sketch_jobs_status_check'),
    (2, 'ai_sketch_jobs', 'constraint', 'ai_sketch_jobs_mvp_core_identity_check'),
    (3, 'ai_sketch_jobs', 'constraint', 'ai_sketch_jobs_parent_lineage_fkey'),
    (4, 'ai_sketch_outputs', 'constraint', 'ai_sketch_outputs_readiness_status_check'),
    (5, 'ai_sketch_outputs', 'constraint', 'ai_sketch_outputs_mvp_core_ready_current_check'),
    (6, 'ai_sketch_outputs', 'constraint', 'ai_sketch_outputs_job_brief_fkey'),
    (7, 'ai_sketch_reviews', 'constraint', 'ai_sketch_reviews_output_brief_fkey'),
    (8, 'ai_sketch_jobs', 'index', 'ai_sketch_jobs_id_brief_uidx'),
    (9, 'ai_sketch_jobs', 'index', 'ai_sketch_jobs_parent_lineage_target_uidx'),
    (10, 'ai_sketch_outputs', 'index', 'ai_sketch_outputs_id_brief_uidx'),
    (11, 'ai_sketch_jobs', 'index', 'ai_sketch_jobs_idempotency_key_uidx'),
    (12, 'ai_sketch_jobs', 'index', 'ai_sketch_jobs_attempt_identity_uidx'),
    (13, 'ai_sketch_jobs', 'index', 'ai_sketch_jobs_one_active_purpose_uidx'),
    (14, 'ai_sketch_outputs', 'index', 'ai_sketch_outputs_one_per_job_uidx'),
    (15, 'ai_sketch_outputs', 'index', 'ai_sketch_outputs_one_current_customer_preview_uidx'),
    (16, 'ai_sketch_jobs', 'index', 'ai_sketch_jobs_parent_job_id_idx'),
    (17, 'ai_sketch_reviews', 'index', 'ai_sketch_reviews_ai_sketch_output_id_idx')
),
target_relations AS (
  SELECT relation.oid, relation.relname AS table_name
  FROM pg_catalog.pg_class relation
  JOIN pg_catalog.pg_namespace namespace ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname IN ('ai_sketch_jobs', 'ai_sketch_outputs', 'ai_sketch_reviews')
    AND relation.relkind IN ('r', 'p')
),
existing_objects AS (
  SELECT
    target.table_name,
    'constraint'::text AS object_type,
    constraint_object.conname AS object_name
  FROM target_relations target
  JOIN pg_catalog.pg_constraint constraint_object
    ON constraint_object.conrelid = target.oid
  UNION ALL
  SELECT
    target.table_name,
    'index'::text,
    index_relation.relname
  FROM target_relations target
  JOIN pg_catalog.pg_index index_object ON index_object.indrelid = target.oid
  JOIN pg_catalog.pg_class index_relation ON index_relation.oid = index_object.indexrelid
)
SELECT
  proposed.sequence_number,
  proposed.table_name,
  proposed.object_type,
  proposed.object_name,
  count(existing.object_name) AS present_count
FROM proposed_objects proposed
LEFT JOIN existing_objects existing
  ON existing.table_name = proposed.table_name
 AND existing.object_type = proposed.object_type
 AND existing.object_name = proposed.object_name
GROUP BY
  proposed.sequence_number,
  proposed.table_name,
  proposed.object_type,
  proposed.object_name
ORDER BY proposed.sequence_number;
```

PASS requires exactly 17 complete rows and the 5 exact headers in SELECT order;
unique sequence numbers 1-17 and unique
`(table_name, object_type, object_name)` identities; exact values from section
2; and every `present_count = 0`.

## 6. Deterministic evidence contract

Select exactly one artifact for each attempted item:

| Item | PASS filename | ERROR filename |
| --- | --- | --- |
| Phase 0 | `novora-fp-mvp-core-1-00-context.png` | `novora-fp-mvp-core-1-00-context-error.png` |
| CORE1-01 | `novora-fp-mvp-core-1-01-context-relations.csv` | `novora-fp-mvp-core-1-01-context-relations-error.png` |
| CORE1-02 | `novora-fp-mvp-core-1-02-core-columns.csv` | `novora-fp-mvp-core-1-02-core-columns-error.png` |
| CORE1-03 | `novora-fp-mvp-core-1-03-job-core-preflight.csv` | `novora-fp-mvp-core-1-03-job-core-preflight-error.png` |
| CORE1-04 | `novora-fp-mvp-core-1-04-output-core-preflight.csv` | `novora-fp-mvp-core-1-04-output-core-preflight-error.png` |
| CORE1-05 | `novora-fp-mvp-core-1-05-linkage-core-preflight.csv` | `novora-fp-mvp-core-1-05-linkage-core-preflight-error.png` |
| CORE1-06 | `novora-fp-mvp-core-1-06-baseline-catalog.csv` | `novora-fp-mvp-core-1-06-baseline-catalog-error.png` |
| CORE1-07 | `novora-fp-mvp-core-1-07-core-object-absence.csv` | `novora-fp-mvp-core-1-07-core-object-absence-error.png` |

After PASS or STOP, run no more SQL. A later read-only reconciliation must
rehash the selected artifacts in place and create only the external sanitized
manifest `novora-fp-mvp-core-1-08-manifest-v1.json`. Raw screenshots and CSVs
must not be copied into Git. The manifest must record the final packet
identities, one selected artifact per attempted item, SHA-256 and byte size,
headers/row/duplicate counts and sanitized aggregate values, exact PASS/ERROR,
unattempted items as `not_run`, last PASS and failed item if any, bounded
context proof, quiet-window attestation, and every excluded action as not
executed. It must contain no customer data, row IDs, Brief references, prompts,
notes, object paths, URLs, images, secrets, tokens, keys, environment values,
or Provider data.

## 7. Universal immediate STOP conditions

STOP the whole sequence immediately, execute no later statement, and preserve
the exact evidence on any:

- project, environment, database, schema, selected/current/session role,
  recovery-state, row-limit, quiet-window, or visible-target-control mismatch;
- main, PR-head, packet/source blob, heading, sequence, canonical-byte-length,
  or canonical-hash mismatch;
- relation/table/OID/owner/persistence, column/ordinal/type/nullability/default,
  identity/generated-field, baseline-object/OID/definition/validation,
  readiness/liveness, or proposed-object mismatch;
- row-count, header, ordering, duplicate, aggregate-zero, completeness,
  truncation, or filename mismatch;
- warning, SQL error, client/API/transport/fetch error, export error, or
  incomplete evidence;
- any returned business row or identity, customer content, secret, or
  environment value.

Do not click Retry, rerun, repair, compensate, backfill, roll back, clean up,
or substitute a query after STOP. Any new attempt requires an independently
reviewed immutable retry/continuation packet and a separate exact approval.

## 8. Explicit exclusions

Neither this packet nor its preparation/review/merge authorizes:

- any Supabase connection or SQL execution by Codex, MCP, CLI, script, or other
  automation;
- execution by the Owner without a new exact approval bound to the final
  merged identities;
- any DDL, DML, data edit, row inspection, DELETE, backfill, repair,
  compensation, constraint validation, rollback, or cleanup;
- reuse of the former Batch 03 packet, mapping, approval, evidence, L01, or
  candidate SQL;
- `L01-CORE`, `MVP-CORE-2`, `MVP-CORE-3`, old `L01`, `23.1-S01`, `23.2-S01`,
  `23.3-S01` or later old candidate blocks, or block 23.7;
- ACL, default-privilege, RLS, policy, trigger, function, routine, Storage, or
  customer/business-row changes or inspection beyond these exact aggregates;
- Provider calls, generated assets, credentials, environment changes,
  deployment, application rollout, email, payment, or customer-visible action;
- branch, worktree, artifact, evidence, or other cleanup/deletion.

## 9. Gate result and next boundary

Preparation result is only `PACKET_FROZEN`; database result remains
`MVP-CORE-1 = NOT_EXECUTED`, Phase A Resume remains `STOPPED`, and historical
Phase A remains `STOPPED`.

After this exact packet passes independent review and merges, STOP at:

`HUMAN GATE - MVP-CORE-1 SELECT-ONLY EXECUTION APPROVAL REQUIRED`

Only a separate copy-ready approval sentence containing the final merged-main,
reviewed PR head, packet blob, all source/evidence identities, every canonical
statement byte length/hash, evidence filename, STOP condition, and exclusion
may release Phase 0 and `CORE1-01` through `CORE1-07`. No subsequent database
or application action is released by that approval.
