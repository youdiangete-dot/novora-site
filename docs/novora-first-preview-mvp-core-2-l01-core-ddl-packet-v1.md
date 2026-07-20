# NOVORA First Preview MVP-CORE-2 L01-Core Plus Core DDL Packet v1

Date: 2026-07-20

Status: **FROZEN - NOT APPROVED FOR EXECUTION**

This documentation-only packet implements Gate `MVP-CORE-2` from Critical
Path Cutline v3. It freezes one uninterrupted Owner-performed manual sequence:
one fresh Phase 0 context gate, one new `L01-CORE`, seventeen Core-only DDL
statements, an immediate unfiltered catalog assertion after every DDL, and one
final bounded Core result gate. Preparing, reviewing, merging, or citing this
packet authorizes no Supabase connection or SQL execution.

## 1. Immutable source and completed-evidence identities

- Creation base / merged `origin/main`:
  `ea44f66dca5dea5f804823d6608f1fcc09324103`.
- Critical Path Cutline v3:
  `docs/novora-first-preview-mvp-critical-path-cutline-v3.md`, Git blob
  `a43313f1d936365fd97dc92ccd8803d18b711176`.
- Frozen Agent 70B-2 schema source:
  `docs/novora-agent-70b2-first-preview-live-schema-review-and-additive-sql-plan-v1.md`,
  Git blob `714a30d16760dc98602dcbd8dc92d8785895811c`.
- Frozen Recovery source:
  `docs/novora-first-preview-phase-a-read-only-recovery-packet-v1.md`, Git blob
  `e853e2992f4d556a1d41b089006bdd288aa2d7bc`.
- Original MVP-CORE-1 packet:
  `docs/novora-first-preview-mvp-core-1-select-only-preflight-packet-v1.md`,
  Git blob `eb3cac28bdf5b52b9a2ebcf5a0f6b2d440c66163`.
- MVP-CORE-1 Phase-0 retry/continuation packet:
  `docs/novora-first-preview-mvp-core-1-phase-0-context-retry-continuation-packet-v1.md`,
  Git blob `cc2c5f3e3917aed7946aa22939b8cb5c8c022f3f`.
- Completed MVP-CORE-1 supplement:
  `novora-fp-mvp-core-1-phase0-retry-continuation-09-manifest-v1.json`,
  `14358` bytes, SHA-256
  `706bd6597700e5e5844f87fcd1ad1b8d10a3d7cdb9c88474f561d4bd16325b9f`.
- Project-state source at creation: Git blob
  `af97cbc5a4b795f82d672110a557016d4f82fadb`.

The packet PR number, final reviewed head, packet Git blob, and post-merge
`origin/main` identity are supplied only after exact-head independent review
and merge. A later execution approval must bind those final identities and all
statement identities in this packet.

## 2. Derivation boundary and exact Core scope

This packet is newly derived only from the merged Cutline v3 Core requirements,
the accepted positive column/baseline catalogs, and the accepted MVP-CORE-1
predicates and object set. It does not reuse or treat as authoritative the
former Batch 03 packet, mapping, approval, old L01, old L01 evidence, any
candidate SQL block, block 23.7, superseded accelerated-batch sequencing, or
any prior execution approval.

The exact limited-beta Core object set contains seven constraints and ten
indexes:

1. `ai_sketch_jobs_status_check`;
2. `ai_sketch_jobs_mvp_core_identity_check`;
3. `ai_sketch_jobs_parent_lineage_fkey`;
4. `ai_sketch_outputs_readiness_status_check`;
5. `ai_sketch_outputs_mvp_core_ready_current_check`;
6. `ai_sketch_outputs_job_brief_fkey`;
7. `ai_sketch_reviews_output_brief_fkey`;
8. `ai_sketch_jobs_id_brief_uidx`;
9. `ai_sketch_jobs_parent_lineage_target_uidx`;
10. `ai_sketch_outputs_id_brief_uidx`;
11. `ai_sketch_jobs_idempotency_key_uidx`;
12. `ai_sketch_jobs_attempt_identity_uidx`;
13. `ai_sketch_jobs_one_active_purpose_uidx`;
14. `ai_sketch_outputs_one_per_job_uidx`;
15. `ai_sketch_outputs_one_current_customer_preview_uidx`;
16. `ai_sketch_jobs_parent_job_id_idx`; and
17. `ai_sketch_reviews_ai_sketch_output_id_idx`.

Every DDL creates exactly one Core object, and every DDL is followed immediately
by its own unfiltered catalog assertion. Every constraint is added `NOT VALID`;
validation belongs only to separately reviewed and separately approved
`MVP-CORE-3`.

`POST_MVP_HARDENING` is excluded: feedback attempts 2-3, extended parent or
source-output lineage, Provider-request/profile enforcement, pricing/cost,
extended lifecycle/timing/failure/retry enforcement, full revocation
chronology, audit expansion, performance-only indexes, and unrelated access,
Storage, application, or business behavior.

## 3. Required Owner context and uninterrupted sequence

A future separate exact approval may authorize only one Owner-performed manual
sequence against:

- Supabase project `novora-production`;
- branch/environment `main` / Production;
- Primary Database (`postgres`);
- target schema `public`;
- selected role `postgres`;
- required current role and session role `postgres`;
- required `server_is_in_recovery = false`; and
- SQL Editor row limit at least `1000`.

The Owner must establish and attest one uninterrupted quiet window from the
fresh Phase 0 capture through `CORE2-FINAL`. No First Preview writer,
migration, schema operation, application rollout, or other actor may target
`ai_sketch_jobs`, `ai_sketch_outputs`, or `ai_sketch_reviews` during that
window.

Phase 0 must visibly prove `novora-production`, `main` / Production, Primary
Database, selected role `postgres`, row limit `1000` or greater, and a fresh
blank editor with no old SQL, old result, warning, error, customer content,
secret, or environment-variable value. It does not prove current schema,
session role, recovery state, backend-session continuity, or quiet-window
truth. `L01-CORE` proves the database/session/catalog facts; the quiet window
and no-target-control-change statements remain Owner attestations.

Phase 0 evidence is exactly:

- PASS: `novora-fp-mvp-core-2-00-context.png`
- ERROR: `novora-fp-mvp-core-2-00-context-error.png`

Every SQL item must be pasted into a freshly cleared blank editor and executed
individually, exactly once, using ordinary manual `Run`. Do not add comments,
combine statements, add a transaction wrapper, edit identifiers, substitute
SQL, click Retry, or use automation.

### Mandatory L01-Core adjacency

`L01-CORE` is Step 01. After its result and evidence pass every gate, the Owner
must clear the editor in place and immediately paste and run Step 02 / D01.
Between L01 PASS and D01 execution there may be no reconciliation, manifest,
PR, approval gate, browser refresh, Supabase reconnection, SQL Editor context
switch, unrelated action, or intentional delay.

## 4. Canonicalization

For every statement, canonical bytes are exactly the content inside its `sql`
fence: UTF-8 without BOM; LF-only line endings; first byte is the first SQL
character; the semicolon is the final SQL character followed by exactly one LF;
no leading or extra trailing blank line.

Before execution, independently extract every fence and verify its byte length
and SHA-256 against the final sequence table. Result CSVs do not prove submitted
SQL bytes. Unless separate complete submitted-byte evidence exists, the later
manifest must set `actual_canonical_sql_sha256` and
`canonical_hash_equality` to null.

## 5. Exact ordered executable sequence

The final byte lengths and SHA-256 identities are frozen in section 6 after the
SQL fences.

### Step 01 - L01-CORE

Type: SELECT-only temporal/context/baseline preflight.

PASS evidence: `novora-fp-mvp-core-2-01-l01-core.csv`

ERROR evidence: `novora-fp-mvp-core-2-01-l01-core-error.png`

```sql
WITH expected_relations (table_name, relation_oid) AS (
  VALUES
    ('ai_sketch_jobs', 17602::oid),
    ('ai_sketch_outputs', 17619::oid),
    ('ai_sketch_reviews', 17641::oid)
),
target_relations AS (
  SELECT
    relation.oid AS relation_oid,
    relation.relname AS table_name,
    relation.relowner,
    relation.relkind,
    relation.relpersistence
  FROM pg_catalog.pg_class relation
  JOIN pg_catalog.pg_namespace namespace ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname IN ('ai_sketch_jobs', 'ai_sketch_outputs', 'ai_sketch_reviews')
    AND relation.relkind IN ('r', 'p')
),
expected_baseline (
  table_name, object_type, object_oid, object_name, constraint_type,
  exact_definition, is_validated, is_deferrable, is_initially_deferred,
  is_unique, is_valid, is_ready, is_live
) AS (
  VALUES
    ('ai_sketch_jobs', 'constraint', 17614::oid, 'ai_sketch_jobs_concept_brief_id_fkey', 'f', 'FOREIGN KEY (concept_brief_id) REFERENCES concept_briefs(id) ON DELETE CASCADE', true, false, false, NULL::boolean, NULL::boolean, NULL::boolean, NULL::boolean),
    ('ai_sketch_jobs', 'constraint', 17613::oid, 'ai_sketch_jobs_pkey', 'p', 'PRIMARY KEY (id)', true, false, false, NULL::boolean, NULL::boolean, NULL::boolean, NULL::boolean),
    ('ai_sketch_jobs', 'index', 17681::oid, 'ai_sketch_jobs_concept_brief_id_idx', NULL::text, 'CREATE INDEX ai_sketch_jobs_concept_brief_id_idx ON public.ai_sketch_jobs USING btree (concept_brief_id)', NULL::boolean, NULL::boolean, NULL::boolean, false, true, true, true),
    ('ai_sketch_jobs', 'index', 17612::oid, 'ai_sketch_jobs_pkey', NULL::text, 'CREATE UNIQUE INDEX ai_sketch_jobs_pkey ON public.ai_sketch_jobs USING btree (id)', NULL::boolean, NULL::boolean, NULL::boolean, true, true, true, true),
    ('ai_sketch_outputs', 'constraint', 17636::oid, 'ai_sketch_outputs_concept_brief_id_fkey', 'f', 'FOREIGN KEY (concept_brief_id) REFERENCES concept_briefs(id) ON DELETE CASCADE', true, false, false, NULL::boolean, NULL::boolean, NULL::boolean, NULL::boolean),
    ('ai_sketch_outputs', 'constraint', 17631::oid, 'ai_sketch_outputs_job_id_fkey', 'f', 'FOREIGN KEY (job_id) REFERENCES ai_sketch_jobs(id) ON DELETE CASCADE', true, false, false, NULL::boolean, NULL::boolean, NULL::boolean, NULL::boolean),
    ('ai_sketch_outputs', 'constraint', 17630::oid, 'ai_sketch_outputs_pkey', 'p', 'PRIMARY KEY (id)', true, false, false, NULL::boolean, NULL::boolean, NULL::boolean, NULL::boolean),
    ('ai_sketch_outputs', 'index', 17682::oid, 'ai_sketch_outputs_concept_brief_id_idx', NULL::text, 'CREATE INDEX ai_sketch_outputs_concept_brief_id_idx ON public.ai_sketch_outputs USING btree (concept_brief_id)', NULL::boolean, NULL::boolean, NULL::boolean, false, true, true, true),
    ('ai_sketch_outputs', 'index', 17629::oid, 'ai_sketch_outputs_pkey', NULL::text, 'CREATE UNIQUE INDEX ai_sketch_outputs_pkey ON public.ai_sketch_outputs USING btree (id)', NULL::boolean, NULL::boolean, NULL::boolean, true, true, true, true),
    ('ai_sketch_reviews', 'constraint', 17651::oid, 'ai_sketch_reviews_ai_sketch_output_id_fkey', 'f', 'FOREIGN KEY (ai_sketch_output_id) REFERENCES ai_sketch_outputs(id) ON DELETE CASCADE', true, false, false, NULL::boolean, NULL::boolean, NULL::boolean, NULL::boolean),
    ('ai_sketch_reviews', 'constraint', 17656::oid, 'ai_sketch_reviews_concept_brief_id_fkey', 'f', 'FOREIGN KEY (concept_brief_id) REFERENCES concept_briefs(id) ON DELETE CASCADE', true, false, false, NULL::boolean, NULL::boolean, NULL::boolean, NULL::boolean),
    ('ai_sketch_reviews', 'constraint', 18099::oid, 'ai_sketch_reviews_concept_brief_id_key', 'u', 'UNIQUE (concept_brief_id)', true, false, false, NULL::boolean, NULL::boolean, NULL::boolean, NULL::boolean),
    ('ai_sketch_reviews', 'constraint', 17650::oid, 'ai_sketch_reviews_pkey', 'p', 'PRIMARY KEY (id)', true, false, false, NULL::boolean, NULL::boolean, NULL::boolean, NULL::boolean),
    ('ai_sketch_reviews', 'constraint', 18073::oid, 'ai_sketch_reviews_review_status_check', 'c', 'CHECK (review_status = ANY (ARRAY[''internal_draft_not_generated''::text, ''draft_generated_internal_only''::text, ''needs_revision''::text, ''approved_for_customer''::text]))', true, false, false, NULL::boolean, NULL::boolean, NULL::boolean, NULL::boolean),
    ('ai_sketch_reviews', 'index', 18098::oid, 'ai_sketch_reviews_concept_brief_id_key', NULL::text, 'CREATE UNIQUE INDEX ai_sketch_reviews_concept_brief_id_key ON public.ai_sketch_reviews USING btree (concept_brief_id)', NULL::boolean, NULL::boolean, NULL::boolean, true, true, true, true),
    ('ai_sketch_reviews', 'index', 17649::oid, 'ai_sketch_reviews_pkey', NULL::text, 'CREATE UNIQUE INDEX ai_sketch_reviews_pkey ON public.ai_sketch_reviews USING btree (id)', NULL::boolean, NULL::boolean, NULL::boolean, true, true, true, true)
),
actual_objects AS (
  SELECT
    target.table_name,
    'constraint'::text AS object_type,
    constraint_object.oid AS object_oid,
    constraint_object.conname AS object_name,
    constraint_object.contype::text AS constraint_type,
    pg_catalog.pg_get_constraintdef(constraint_object.oid, true) AS exact_definition,
    constraint_object.convalidated AS is_validated,
    constraint_object.condeferrable AS is_deferrable,
    constraint_object.condeferred AS is_initially_deferred,
    NULL::boolean AS is_unique,
    NULL::boolean AS is_valid,
    NULL::boolean AS is_ready,
    NULL::boolean AS is_live
  FROM target_relations target
  JOIN pg_catalog.pg_constraint constraint_object ON constraint_object.conrelid = target.relation_oid
  UNION ALL
  SELECT
    target.table_name,
    'index'::text,
    index_relation.oid,
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
  FROM target_relations target
  JOIN pg_catalog.pg_index index_metadata ON index_metadata.indrelid = target.relation_oid
  JOIN pg_catalog.pg_class index_relation ON index_relation.oid = index_metadata.indexrelid
),
proposed_objects (table_name, object_type, object_name) AS (
  VALUES
    ('ai_sketch_jobs', 'constraint', 'ai_sketch_jobs_status_check'),
    ('ai_sketch_jobs', 'constraint', 'ai_sketch_jobs_mvp_core_identity_check'),
    ('ai_sketch_jobs', 'constraint', 'ai_sketch_jobs_parent_lineage_fkey'),
    ('ai_sketch_outputs', 'constraint', 'ai_sketch_outputs_readiness_status_check'),
    ('ai_sketch_outputs', 'constraint', 'ai_sketch_outputs_mvp_core_ready_current_check'),
    ('ai_sketch_outputs', 'constraint', 'ai_sketch_outputs_job_brief_fkey'),
    ('ai_sketch_reviews', 'constraint', 'ai_sketch_reviews_output_brief_fkey'),
    ('ai_sketch_jobs', 'index', 'ai_sketch_jobs_id_brief_uidx'),
    ('ai_sketch_jobs', 'index', 'ai_sketch_jobs_parent_lineage_target_uidx'),
    ('ai_sketch_outputs', 'index', 'ai_sketch_outputs_id_brief_uidx'),
    ('ai_sketch_jobs', 'index', 'ai_sketch_jobs_idempotency_key_uidx'),
    ('ai_sketch_jobs', 'index', 'ai_sketch_jobs_attempt_identity_uidx'),
    ('ai_sketch_jobs', 'index', 'ai_sketch_jobs_one_active_purpose_uidx'),
    ('ai_sketch_outputs', 'index', 'ai_sketch_outputs_one_per_job_uidx'),
    ('ai_sketch_outputs', 'index', 'ai_sketch_outputs_one_current_customer_preview_uidx'),
    ('ai_sketch_jobs', 'index', 'ai_sketch_jobs_parent_job_id_idx'),
    ('ai_sketch_reviews', 'index', 'ai_sketch_reviews_ai_sketch_output_id_idx')
),
baseline_matches AS (
  SELECT count(*) AS match_count
  FROM expected_baseline expected
  JOIN actual_objects actual
    ON actual.table_name = expected.table_name
   AND actual.object_type = expected.object_type
   AND actual.object_oid = expected.object_oid
   AND actual.object_name = expected.object_name
   AND actual.constraint_type IS NOT DISTINCT FROM expected.constraint_type
   AND actual.exact_definition IS NOT DISTINCT FROM expected.exact_definition
   AND actual.is_validated IS NOT DISTINCT FROM expected.is_validated
   AND actual.is_deferrable IS NOT DISTINCT FROM expected.is_deferrable
   AND actual.is_initially_deferred IS NOT DISTINCT FROM expected.is_initially_deferred
   AND actual.is_unique IS NOT DISTINCT FROM expected.is_unique
   AND actual.is_valid IS NOT DISTINCT FROM expected.is_valid
   AND actual.is_ready IS NOT DISTINCT FROM expected.is_ready
   AND actual.is_live IS NOT DISTINCT FROM expected.is_live
),
target_locks AS (
  SELECT count(*) AS other_backend_target_lock_count
  FROM pg_catalog.pg_locks lock_object
  WHERE lock_object.locktype = 'relation'
    AND lock_object.database IS NOT DISTINCT FROM (
      SELECT database_object.oid
      FROM pg_catalog.pg_database database_object
      WHERE database_object.datname = current_database()
    )
    AND lock_object.relation IN (SELECT relation_oid FROM target_relations)
    AND lock_object.pid IS DISTINCT FROM pg_catalog.pg_backend_pid()
)
SELECT
  current_database() AS database_name,
  current_schema() AS current_schema_name,
  current_user AS current_role,
  session_user AS session_role,
  pg_catalog.pg_is_in_recovery() AS server_is_in_recovery,
  (SELECT count(*) FROM target_relations) AS approved_relation_count,
  (SELECT count(*)
   FROM expected_relations expected
   LEFT JOIN target_relations actual
     ON actual.table_name = expected.table_name
    AND actual.relation_oid = expected.relation_oid
   WHERE actual.relation_oid IS NULL
      OR actual.relowner IS DISTINCT FROM (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = 'postgres')
      OR actual.relkind IS DISTINCT FROM 'r'::"char"
      OR actual.relpersistence IS DISTINCT FROM 'p'::"char") AS relation_identity_mismatch_count,
  (SELECT count(*)
   FROM pg_catalog.pg_class relation
   JOIN pg_catalog.pg_namespace namespace ON namespace.oid = relation.relnamespace
   WHERE relation.relname IN ('ai_sketch_jobs', 'ai_sketch_outputs', 'ai_sketch_reviews')
     AND namespace.nspname <> 'public') AS same_name_nonapproved_schema_relation_count,
  (SELECT count(*) FROM public.ai_sketch_jobs) AS total_job_count,
  (SELECT count(*) FROM public.ai_sketch_outputs) AS total_output_count,
  (SELECT count(*) FROM public.ai_sketch_reviews) AS total_review_count,
  (SELECT count(*) FROM expected_baseline) AS expected_baseline_object_count,
  (SELECT count(*) FROM actual_objects) AS actual_target_object_count,
  (SELECT match_count FROM baseline_matches) AS exact_baseline_match_count,
  (SELECT count(*)
   FROM actual_objects actual
   JOIN proposed_objects proposed
     ON proposed.table_name = actual.table_name
    AND proposed.object_type = actual.object_type
    AND proposed.object_name = actual.object_name) AS proposed_core_object_count,
  (SELECT other_backend_target_lock_count FROM target_locks) AS other_backend_target_lock_count;
```

PASS requires exactly one complete row with these 16 headers in SELECT order
and exact values: `postgres`, `public`, `postgres`, `postgres`, `false`, `3`,
`0`, `0`, `0`, `0`, `0`, `16`, `16`, `16`, `0`, `0`. Any other value is an
immediate STOP. This proves the exact session context, relation identities,
empty three-table Core baseline, exact accepted 16-object baseline, complete
absence of all 17 Core objects, and no relation lock on the three targets held
or awaited by another backend in the current database. It does not prove the
future absence of a new actor; the uninterrupted quiet-window attestation
remains mandatory.

### Step 02 - CORE2-D01-JOB-STATUS-CHECK

Type: DDL. Adds exactly one Job status CHECK constraint `NOT VALID`.

PASS evidence: `novora-fp-mvp-core-2-02-d01-job-status-check.png`

ERROR evidence: `novora-fp-mvp-core-2-02-d01-job-status-check-error.png`

```sql
ALTER TABLE ONLY public.ai_sketch_jobs
  ADD CONSTRAINT ai_sketch_jobs_status_check
    CHECK ((status IS NOT NULL AND status IN ('draft', 'queued', 'processing', 'succeeded', 'failed', 'timed_out', 'cancelled')) IS TRUE) NOT VALID;
```

PASS requires the SQL Editor to report success with no warning and no returned
row. Do not continue without the exact PASS screenshot and immediate A01.

### Step 03 - CORE2-A01-JOB-STATUS-CHECK

Type: SELECT-only immediate unfiltered catalog assertion.

PASS evidence: `novora-fp-mvp-core-2-03-a01-job-status-check.csv`

ERROR evidence: `novora-fp-mvp-core-2-03-a01-job-status-check-error.png`

```sql
WITH target_relations AS (
  SELECT relation.oid AS relation_oid, relation.relname AS table_name
  FROM pg_catalog.pg_class relation
  JOIN pg_catalog.pg_namespace namespace ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname IN ('ai_sketch_jobs', 'ai_sketch_outputs', 'ai_sketch_reviews')
    AND relation.relkind IN ('r', 'p')
)
SELECT
  targets.table_name,
  targets.relation_oid::text AS relation_oid,
  'constraint'::text AS object_type,
  constraint_object.oid::text AS object_oid,
  constraint_object.conname AS object_name,
  constraint_object.contype::text AS constraint_type,
  pg_catalog.pg_get_constraintdef(constraint_object.oid, true) AS exact_definition,
  constraint_object.convalidated AS is_validated,
  constraint_object.condeferrable AS is_deferrable,
  constraint_object.condeferred AS is_initially_deferred,
  NULL::boolean AS is_unique,
  NULL::boolean AS is_valid,
  NULL::boolean AS is_ready,
  NULL::boolean AS is_live
FROM target_relations targets
JOIN pg_catalog.pg_constraint constraint_object ON constraint_object.conrelid = targets.relation_oid
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
JOIN pg_catalog.pg_index index_metadata ON index_metadata.indrelid = targets.relation_oid
JOIN pg_catalog.pg_class index_relation ON index_relation.oid = index_metadata.indexrelid
ORDER BY table_name, object_type, object_name;
```

A01 PASS requires exactly 17 complete rows and the 14 exact headers in SELECT
order: the unchanged 16-row accepted baseline plus
`ai_sketch_jobs_status_check`, type `c`, unvalidated, not deferrable, not
initially deferred, with exact definition semantically identical to D01. Its
new object OID must be non-null and stable in every later assertion.

### Step 04 - CORE2-D02-JOB-IDENTITY-CHECK

Type: DDL. Adds exactly one Job Core identity CHECK constraint `NOT VALID`.

PASS evidence: `novora-fp-mvp-core-2-04-d02-job-identity-check.png`

ERROR evidence: `novora-fp-mvp-core-2-04-d02-job-identity-check-error.png`

```sql
ALTER TABLE ONLY public.ai_sketch_jobs
  ADD CONSTRAINT ai_sketch_jobs_mvp_core_identity_check
    CHECK ((
      (status IS NOT DISTINCT FROM 'draft'
       AND num_nonnulls(
         generation_purpose, idempotency_key, attempt_number,
         lineage_identity, parent_job_id, parent_generation_purpose,
         parent_attempt_number, source_output_id, design_spec_version,
         design_spec_hash, hand_sketch_instruction_version,
         hand_sketch_instruction_hash
       ) = 0)
      OR
      (status IS DISTINCT FROM 'draft'
       AND generation_purpose IS NOT DISTINCT FROM 'first_preview'
       AND attempt_number IN (1, 2)
       AND idempotency_key ~ '^[0-9a-f]{64}$'
       AND lineage_identity IS NOT DISTINCT FROM 'first-preview:v1'
       AND design_spec_version IS NOT NULL
       AND btrim(design_spec_version) <> ''
       AND design_spec_hash ~ '^[0-9a-f]{64}$'
       AND hand_sketch_instruction_version IS NOT NULL
       AND btrim(hand_sketch_instruction_version) <> ''
       AND hand_sketch_instruction_hash ~ '^[0-9a-f]{64}$'
       AND (
         (attempt_number = 1
          AND parent_job_id IS NULL
          AND parent_generation_purpose IS NULL
          AND parent_attempt_number IS NULL
          AND source_output_id IS NULL)
         OR
         (attempt_number = 2
          AND parent_job_id IS NOT NULL
          AND parent_generation_purpose IS NOT DISTINCT FROM 'first_preview'
          AND parent_attempt_number IS NOT DISTINCT FROM 1
          AND source_output_id IS NULL)
       ))
    ) IS TRUE) NOT VALID;
```

PASS requires success with no warning and no returned row. The predicate is
NULL-total because the complete branch expression is wrapped in `IS TRUE`.
It permits only exact legacy `draft` posture or complete non-draft
`first_preview` attempt-1 root / attempt-2 bounded retry identity. Do not
continue without the exact PASS screenshot and immediate A02.

### Step 05 - CORE2-A02-JOB-IDENTITY-CHECK

Type: SELECT-only immediate unfiltered catalog assertion.

PASS evidence: `novora-fp-mvp-core-2-05-a02-job-identity-check.csv`

ERROR evidence: `novora-fp-mvp-core-2-05-a02-job-identity-check-error.png`

```sql
WITH target_relations AS (
  SELECT relation.oid AS relation_oid, relation.relname AS table_name
  FROM pg_catalog.pg_class relation
  JOIN pg_catalog.pg_namespace namespace ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname IN ('ai_sketch_jobs', 'ai_sketch_outputs', 'ai_sketch_reviews')
    AND relation.relkind IN ('r', 'p')
)
SELECT
  targets.table_name,
  targets.relation_oid::text AS relation_oid,
  'constraint'::text AS object_type,
  constraint_object.oid::text AS object_oid,
  constraint_object.conname AS object_name,
  constraint_object.contype::text AS constraint_type,
  pg_catalog.pg_get_constraintdef(constraint_object.oid, true) AS exact_definition,
  constraint_object.convalidated AS is_validated,
  constraint_object.condeferrable AS is_deferrable,
  constraint_object.condeferred AS is_initially_deferred,
  NULL::boolean AS is_unique,
  NULL::boolean AS is_valid,
  NULL::boolean AS is_ready,
  NULL::boolean AS is_live
FROM target_relations targets
JOIN pg_catalog.pg_constraint constraint_object ON constraint_object.conrelid = targets.relation_oid
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
JOIN pg_catalog.pg_index index_metadata ON index_metadata.indrelid = targets.relation_oid
JOIN pg_catalog.pg_class index_relation ON index_relation.oid = index_metadata.indexrelid
ORDER BY table_name, object_type, object_name;
```

A02 PASS requires exactly 18 complete rows: the unchanged accepted baseline,
the exact D01 constraint with stable OID, and
`ai_sketch_jobs_mvp_core_identity_check`, type `c`, unvalidated, not
deferrable, not initially deferred, with exact definition semantically
 identical to D02. Both new constraint OIDs must be non-null and distinct.

### Step 06 - CORE2-D03-OUTPUT-READINESS-CHECK

Type: DDL. Adds exactly one nullable-vocabulary Output readiness CHECK constraint `NOT VALID`.

PASS evidence: `novora-fp-mvp-core-2-06-d03-output-readiness-check.png`

ERROR evidence: `novora-fp-mvp-core-2-06-d03-output-readiness-check-error.png`

```sql
ALTER TABLE ONLY public.ai_sketch_outputs
  ADD CONSTRAINT ai_sketch_outputs_readiness_status_check
    CHECK ((readiness_status IS NULL OR readiness_status IN ('not_ready', 'first_preview_ready', 'revoked')) IS TRUE) NOT VALID;
```

PASS requires success with no warning and no returned row. Do not continue without the exact PASS screenshot and immediate A03.

### Step 07 - CORE2-A03-OUTPUT-READINESS-CHECK

Type: SELECT-only immediate unfiltered catalog assertion.

PASS evidence: `novora-fp-mvp-core-2-07-a03-output-readiness-check.csv`

ERROR evidence: `novora-fp-mvp-core-2-07-a03-output-readiness-check-error.png`

```sql
WITH target_relations AS (
  SELECT relation.oid AS relation_oid, relation.relname AS table_name
  FROM pg_catalog.pg_class relation
  JOIN pg_catalog.pg_namespace namespace ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname IN ('ai_sketch_jobs', 'ai_sketch_outputs', 'ai_sketch_reviews')
    AND relation.relkind IN ('r', 'p')
)
SELECT
  targets.table_name,
  targets.relation_oid::text AS relation_oid,
  'constraint'::text AS object_type,
  constraint_object.oid::text AS object_oid,
  constraint_object.conname AS object_name,
  constraint_object.contype::text AS constraint_type,
  pg_catalog.pg_get_constraintdef(constraint_object.oid, true) AS exact_definition,
  constraint_object.convalidated AS is_validated,
  constraint_object.condeferrable AS is_deferrable,
  constraint_object.condeferred AS is_initially_deferred,
  NULL::boolean AS is_unique,
  NULL::boolean AS is_valid,
  NULL::boolean AS is_ready,
  NULL::boolean AS is_live
FROM target_relations targets
JOIN pg_catalog.pg_constraint constraint_object ON constraint_object.conrelid = targets.relation_oid
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
JOIN pg_catalog.pg_index index_metadata ON index_metadata.indrelid = targets.relation_oid
JOIN pg_catalog.pg_class index_relation ON index_relation.oid = index_metadata.indexrelid
ORDER BY table_name, object_type, object_name;
```

A03 PASS requires exactly 19 complete rows and the 14 exact headers in SELECT order: the unchanged accepted 16-row baseline plus exactly the first 3 Core objects, with every earlier new OID stable and no additional object. The newly added `ai_sketch_outputs_readiness_status_check` must be type `c`, unvalidated, not deferrable, not initially deferred, with exact definition semantically identical to D03; its OID must be non-null, unique across the catalog, and stable in every later assertion.

### Step 08 - CORE2-D04-OUTPUT-READY-CURRENT-CHECK

Type: DDL. Adds exactly one NULL-total Output ready/current/evidence CHECK constraint `NOT VALID`.

PASS evidence: `novora-fp-mvp-core-2-08-d04-output-ready-current-check.png`

ERROR evidence: `novora-fp-mvp-core-2-08-d04-output-ready-current-check-error.png`

```sql
ALTER TABLE ONLY public.ai_sketch_outputs
  ADD CONSTRAINT ai_sketch_outputs_mvp_core_ready_current_check
    CHECK ((
      (is_current_customer_preview IS NOT TRUE
       OR readiness_status IS NOT DISTINCT FROM 'first_preview_ready')
      AND
      (readiness_status IS DISTINCT FROM 'first_preview_ready'
       OR is_current_customer_preview IS TRUE)
      AND
      (readiness_status IS DISTINCT FROM 'first_preview_ready'
       OR (
         asset_validation_status IS NOT DISTINCT FROM 'passed'
         AND asset_validation_evidence IS NOT NULL
         AND jsonb_typeof(asset_validation_evidence) IS NOT DISTINCT FROM 'object'
         AND asset_validation_evidence <> '{}'::jsonb
         AND automatic_gate_status IS NOT DISTINCT FROM 'passed'
         AND automatic_gate_evidence IS NOT NULL
         AND jsonb_typeof(automatic_gate_evidence) IS NOT DISTINCT FROM 'object'
         AND automatic_gate_evidence <> '{}'::jsonb
         AND automatic_gate_policy_version IS NOT NULL
         AND btrim(automatic_gate_policy_version) <> ''
         AND asset_created_at IS NOT NULL
         AND asset_validated_at IS NOT NULL
         AND asset_validated_at >= asset_created_at
         AND automatic_gate_passed_at IS NOT NULL
         AND automatic_gate_passed_at >= asset_validated_at
         AND first_preview_ready_at IS NOT NULL
         AND first_preview_ready_at >= automatic_gate_passed_at
         AND readiness_revoked_at IS NULL
         AND bucket_name IS NOT DISTINCT FROM 'novora-ai-sketches'
         AND object_path IS NOT NULL
         AND btrim(object_path) <> ''
         AND mime_type IS NOT DISTINCT FROM 'image/png'
         AND byte_size BETWEEN 1 AND 16777216
         AND width_px IS NOT DISTINCT FROM 1024
         AND height_px IS NOT DISTINCT FROM 1024
         AND content_sha256 ~ '^[0-9a-f]{64}$'
       ))
      AND
      (readiness_status IS DISTINCT FROM 'revoked'
       OR is_current_customer_preview IS NOT TRUE)
    ) IS TRUE) NOT VALID;
```

PASS requires success with no warning and no returned row. Do not continue without the exact PASS screenshot and immediate A04.

### Step 09 - CORE2-A04-OUTPUT-READY-CURRENT-CHECK

Type: SELECT-only immediate unfiltered catalog assertion.

PASS evidence: `novora-fp-mvp-core-2-09-a04-output-ready-current-check.csv`

ERROR evidence: `novora-fp-mvp-core-2-09-a04-output-ready-current-check-error.png`

```sql
WITH target_relations AS (
  SELECT relation.oid AS relation_oid, relation.relname AS table_name
  FROM pg_catalog.pg_class relation
  JOIN pg_catalog.pg_namespace namespace ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname IN ('ai_sketch_jobs', 'ai_sketch_outputs', 'ai_sketch_reviews')
    AND relation.relkind IN ('r', 'p')
)
SELECT
  targets.table_name,
  targets.relation_oid::text AS relation_oid,
  'constraint'::text AS object_type,
  constraint_object.oid::text AS object_oid,
  constraint_object.conname AS object_name,
  constraint_object.contype::text AS constraint_type,
  pg_catalog.pg_get_constraintdef(constraint_object.oid, true) AS exact_definition,
  constraint_object.convalidated AS is_validated,
  constraint_object.condeferrable AS is_deferrable,
  constraint_object.condeferred AS is_initially_deferred,
  NULL::boolean AS is_unique,
  NULL::boolean AS is_valid,
  NULL::boolean AS is_ready,
  NULL::boolean AS is_live
FROM target_relations targets
JOIN pg_catalog.pg_constraint constraint_object ON constraint_object.conrelid = targets.relation_oid
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
JOIN pg_catalog.pg_index index_metadata ON index_metadata.indrelid = targets.relation_oid
JOIN pg_catalog.pg_class index_relation ON index_relation.oid = index_metadata.indexrelid
ORDER BY table_name, object_type, object_name;
```

A04 PASS requires exactly 20 complete rows and the 14 exact headers in SELECT order: the unchanged accepted 16-row baseline plus exactly the first 4 Core objects, with every earlier new OID stable and no additional object. The newly added `ai_sketch_outputs_mvp_core_ready_current_check` must be type `c`, unvalidated, not deferrable, not initially deferred, with exact definition semantically identical to D04; its OID must be non-null, unique across the catalog, and stable in every later assertion.

### Step 10 - CORE2-D05-JOB-ID-BRIEF-UIDX

Type: DDL. Creates the exact unique Jobs `(id, concept_brief_id)` composite target.

PASS evidence: `novora-fp-mvp-core-2-10-d05-job-id-brief-uidx.png`

ERROR evidence: `novora-fp-mvp-core-2-10-d05-job-id-brief-uidx-error.png`

```sql
CREATE UNIQUE INDEX ai_sketch_jobs_id_brief_uidx
  ON public.ai_sketch_jobs USING btree (id, concept_brief_id);
```

PASS requires success with no warning and no returned row. Do not continue without the exact PASS screenshot and immediate A05.

### Step 11 - CORE2-A05-JOB-ID-BRIEF-UIDX

Type: SELECT-only immediate unfiltered catalog assertion.

PASS evidence: `novora-fp-mvp-core-2-11-a05-job-id-brief-uidx.csv`

ERROR evidence: `novora-fp-mvp-core-2-11-a05-job-id-brief-uidx-error.png`

```sql
WITH target_relations AS (
  SELECT relation.oid AS relation_oid, relation.relname AS table_name
  FROM pg_catalog.pg_class relation
  JOIN pg_catalog.pg_namespace namespace ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname IN ('ai_sketch_jobs', 'ai_sketch_outputs', 'ai_sketch_reviews')
    AND relation.relkind IN ('r', 'p')
)
SELECT
  targets.table_name,
  targets.relation_oid::text AS relation_oid,
  'constraint'::text AS object_type,
  constraint_object.oid::text AS object_oid,
  constraint_object.conname AS object_name,
  constraint_object.contype::text AS constraint_type,
  pg_catalog.pg_get_constraintdef(constraint_object.oid, true) AS exact_definition,
  constraint_object.convalidated AS is_validated,
  constraint_object.condeferrable AS is_deferrable,
  constraint_object.condeferred AS is_initially_deferred,
  NULL::boolean AS is_unique,
  NULL::boolean AS is_valid,
  NULL::boolean AS is_ready,
  NULL::boolean AS is_live
FROM target_relations targets
JOIN pg_catalog.pg_constraint constraint_object ON constraint_object.conrelid = targets.relation_oid
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
JOIN pg_catalog.pg_index index_metadata ON index_metadata.indrelid = targets.relation_oid
JOIN pg_catalog.pg_class index_relation ON index_relation.oid = index_metadata.indexrelid
ORDER BY table_name, object_type, object_name;
```

A05 PASS requires exactly 21 complete rows and the 14 exact headers in SELECT order: the unchanged accepted 16-row baseline plus exactly the first 5 Core objects, with every earlier new OID stable and no additional object. The newly added `ai_sketch_jobs_id_brief_uidx` must be unique, valid, ready, and live, with exact definition `CREATE UNIQUE INDEX ai_sketch_jobs_id_brief_uidx ON public.ai_sketch_jobs USING btree (id, concept_brief_id)`; its OID must be non-null, unique across the catalog, and stable in every later assertion.

### Step 12 - CORE2-D06-JOB-PARENT-TARGET-UIDX

Type: DDL. Creates the exact unique bounded-parent composite target.

PASS evidence: `novora-fp-mvp-core-2-12-d06-job-parent-target-uidx.png`

ERROR evidence: `novora-fp-mvp-core-2-12-d06-job-parent-target-uidx-error.png`

```sql
CREATE UNIQUE INDEX ai_sketch_jobs_parent_lineage_target_uidx
  ON public.ai_sketch_jobs USING btree (
    id, concept_brief_id, generation_purpose, attempt_number
  );
```

PASS requires success with no warning and no returned row. Do not continue without the exact PASS screenshot and immediate A06.

### Step 13 - CORE2-A06-JOB-PARENT-TARGET-UIDX

Type: SELECT-only immediate unfiltered catalog assertion.

PASS evidence: `novora-fp-mvp-core-2-13-a06-job-parent-target-uidx.csv`

ERROR evidence: `novora-fp-mvp-core-2-13-a06-job-parent-target-uidx-error.png`

```sql
WITH target_relations AS (
  SELECT relation.oid AS relation_oid, relation.relname AS table_name
  FROM pg_catalog.pg_class relation
  JOIN pg_catalog.pg_namespace namespace ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname IN ('ai_sketch_jobs', 'ai_sketch_outputs', 'ai_sketch_reviews')
    AND relation.relkind IN ('r', 'p')
)
SELECT
  targets.table_name,
  targets.relation_oid::text AS relation_oid,
  'constraint'::text AS object_type,
  constraint_object.oid::text AS object_oid,
  constraint_object.conname AS object_name,
  constraint_object.contype::text AS constraint_type,
  pg_catalog.pg_get_constraintdef(constraint_object.oid, true) AS exact_definition,
  constraint_object.convalidated AS is_validated,
  constraint_object.condeferrable AS is_deferrable,
  constraint_object.condeferred AS is_initially_deferred,
  NULL::boolean AS is_unique,
  NULL::boolean AS is_valid,
  NULL::boolean AS is_ready,
  NULL::boolean AS is_live
FROM target_relations targets
JOIN pg_catalog.pg_constraint constraint_object ON constraint_object.conrelid = targets.relation_oid
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
JOIN pg_catalog.pg_index index_metadata ON index_metadata.indrelid = targets.relation_oid
JOIN pg_catalog.pg_class index_relation ON index_relation.oid = index_metadata.indexrelid
ORDER BY table_name, object_type, object_name;
```

A06 PASS requires exactly 22 complete rows and the 14 exact headers in SELECT order: the unchanged accepted 16-row baseline plus exactly the first 6 Core objects, with every earlier new OID stable and no additional object. The newly added `ai_sketch_jobs_parent_lineage_target_uidx` must be unique, valid, ready, and live, with key order `(id, concept_brief_id, generation_purpose, attempt_number)` and no predicate; its OID must be non-null, unique across the catalog, and stable in every later assertion.

### Step 14 - CORE2-D07-OUTPUT-ID-BRIEF-UIDX

Type: DDL. Creates the exact unique Outputs `(id, concept_brief_id)` composite target.

PASS evidence: `novora-fp-mvp-core-2-14-d07-output-id-brief-uidx.png`

ERROR evidence: `novora-fp-mvp-core-2-14-d07-output-id-brief-uidx-error.png`

```sql
CREATE UNIQUE INDEX ai_sketch_outputs_id_brief_uidx
  ON public.ai_sketch_outputs USING btree (id, concept_brief_id);
```

PASS requires success with no warning and no returned row. Do not continue without the exact PASS screenshot and immediate A07.

### Step 15 - CORE2-A07-OUTPUT-ID-BRIEF-UIDX

Type: SELECT-only immediate unfiltered catalog assertion.

PASS evidence: `novora-fp-mvp-core-2-15-a07-output-id-brief-uidx.csv`

ERROR evidence: `novora-fp-mvp-core-2-15-a07-output-id-brief-uidx-error.png`

```sql
WITH target_relations AS (
  SELECT relation.oid AS relation_oid, relation.relname AS table_name
  FROM pg_catalog.pg_class relation
  JOIN pg_catalog.pg_namespace namespace ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname IN ('ai_sketch_jobs', 'ai_sketch_outputs', 'ai_sketch_reviews')
    AND relation.relkind IN ('r', 'p')
)
SELECT
  targets.table_name,
  targets.relation_oid::text AS relation_oid,
  'constraint'::text AS object_type,
  constraint_object.oid::text AS object_oid,
  constraint_object.conname AS object_name,
  constraint_object.contype::text AS constraint_type,
  pg_catalog.pg_get_constraintdef(constraint_object.oid, true) AS exact_definition,
  constraint_object.convalidated AS is_validated,
  constraint_object.condeferrable AS is_deferrable,
  constraint_object.condeferred AS is_initially_deferred,
  NULL::boolean AS is_unique,
  NULL::boolean AS is_valid,
  NULL::boolean AS is_ready,
  NULL::boolean AS is_live
FROM target_relations targets
JOIN pg_catalog.pg_constraint constraint_object ON constraint_object.conrelid = targets.relation_oid
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
JOIN pg_catalog.pg_index index_metadata ON index_metadata.indrelid = targets.relation_oid
JOIN pg_catalog.pg_class index_relation ON index_relation.oid = index_metadata.indexrelid
ORDER BY table_name, object_type, object_name;
```

A07 PASS requires exactly 23 complete rows and the 14 exact headers in SELECT order: the unchanged accepted 16-row baseline plus exactly the first 7 Core objects, with every earlier new OID stable and no additional object. The newly added `ai_sketch_outputs_id_brief_uidx` must be unique, valid, ready, and live, with exact definition `CREATE UNIQUE INDEX ai_sketch_outputs_id_brief_uidx ON public.ai_sketch_outputs USING btree (id, concept_brief_id)`; its OID must be non-null, unique across the catalog, and stable in every later assertion.

### Step 16 - CORE2-D08-JOB-IDEMPOTENCY-UIDX

Type: DDL. Creates deterministic non-null idempotency uniqueness.

PASS evidence: `novora-fp-mvp-core-2-16-d08-job-idempotency-uidx.png`

ERROR evidence: `novora-fp-mvp-core-2-16-d08-job-idempotency-uidx-error.png`

```sql
CREATE UNIQUE INDEX ai_sketch_jobs_idempotency_key_uidx
  ON public.ai_sketch_jobs USING btree (idempotency_key)
  WHERE idempotency_key IS NOT NULL;
```

PASS requires success with no warning and no returned row. Do not continue without the exact PASS screenshot and immediate A08.

### Step 17 - CORE2-A08-JOB-IDEMPOTENCY-UIDX

Type: SELECT-only immediate unfiltered catalog assertion.

PASS evidence: `novora-fp-mvp-core-2-17-a08-job-idempotency-uidx.csv`

ERROR evidence: `novora-fp-mvp-core-2-17-a08-job-idempotency-uidx-error.png`

```sql
WITH target_relations AS (
  SELECT relation.oid AS relation_oid, relation.relname AS table_name
  FROM pg_catalog.pg_class relation
  JOIN pg_catalog.pg_namespace namespace ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname IN ('ai_sketch_jobs', 'ai_sketch_outputs', 'ai_sketch_reviews')
    AND relation.relkind IN ('r', 'p')
)
SELECT
  targets.table_name,
  targets.relation_oid::text AS relation_oid,
  'constraint'::text AS object_type,
  constraint_object.oid::text AS object_oid,
  constraint_object.conname AS object_name,
  constraint_object.contype::text AS constraint_type,
  pg_catalog.pg_get_constraintdef(constraint_object.oid, true) AS exact_definition,
  constraint_object.convalidated AS is_validated,
  constraint_object.condeferrable AS is_deferrable,
  constraint_object.condeferred AS is_initially_deferred,
  NULL::boolean AS is_unique,
  NULL::boolean AS is_valid,
  NULL::boolean AS is_ready,
  NULL::boolean AS is_live
FROM target_relations targets
JOIN pg_catalog.pg_constraint constraint_object ON constraint_object.conrelid = targets.relation_oid
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
JOIN pg_catalog.pg_index index_metadata ON index_metadata.indrelid = targets.relation_oid
JOIN pg_catalog.pg_class index_relation ON index_relation.oid = index_metadata.indexrelid
ORDER BY table_name, object_type, object_name;
```

A08 PASS requires exactly 24 complete rows and the 14 exact headers in SELECT order: the unchanged accepted 16-row baseline plus exactly the first 8 Core objects, with every earlier new OID stable and no additional object. The newly added `ai_sketch_jobs_idempotency_key_uidx` must be unique, valid, ready, and live, on `idempotency_key` with the exact non-null predicate; its OID must be non-null, unique across the catalog, and stable in every later assertion.

### Step 18 - CORE2-D09-JOB-ATTEMPT-UIDX

Type: DDL. Creates the Cutline-frozen Core attempt identity uniqueness.

PASS evidence: `novora-fp-mvp-core-2-18-d09-job-attempt-uidx.png`

ERROR evidence: `novora-fp-mvp-core-2-18-d09-job-attempt-uidx-error.png`

```sql
CREATE UNIQUE INDEX ai_sketch_jobs_attempt_identity_uidx
  ON public.ai_sketch_jobs USING btree (concept_brief_id, attempt_number)
  WHERE attempt_number IS NOT NULL;
```

PASS requires success with no warning and no returned row. Do not continue without the exact PASS screenshot and immediate A09.

### Step 19 - CORE2-A09-JOB-ATTEMPT-UIDX

Type: SELECT-only immediate unfiltered catalog assertion.

PASS evidence: `novora-fp-mvp-core-2-19-a09-job-attempt-uidx.csv`

ERROR evidence: `novora-fp-mvp-core-2-19-a09-job-attempt-uidx-error.png`

```sql
WITH target_relations AS (
  SELECT relation.oid AS relation_oid, relation.relname AS table_name
  FROM pg_catalog.pg_class relation
  JOIN pg_catalog.pg_namespace namespace ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname IN ('ai_sketch_jobs', 'ai_sketch_outputs', 'ai_sketch_reviews')
    AND relation.relkind IN ('r', 'p')
)
SELECT
  targets.table_name,
  targets.relation_oid::text AS relation_oid,
  'constraint'::text AS object_type,
  constraint_object.oid::text AS object_oid,
  constraint_object.conname AS object_name,
  constraint_object.contype::text AS constraint_type,
  pg_catalog.pg_get_constraintdef(constraint_object.oid, true) AS exact_definition,
  constraint_object.convalidated AS is_validated,
  constraint_object.condeferrable AS is_deferrable,
  constraint_object.condeferred AS is_initially_deferred,
  NULL::boolean AS is_unique,
  NULL::boolean AS is_valid,
  NULL::boolean AS is_ready,
  NULL::boolean AS is_live
FROM target_relations targets
JOIN pg_catalog.pg_constraint constraint_object ON constraint_object.conrelid = targets.relation_oid
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
JOIN pg_catalog.pg_index index_metadata ON index_metadata.indrelid = targets.relation_oid
JOIN pg_catalog.pg_class index_relation ON index_relation.oid = index_metadata.indexrelid
ORDER BY table_name, object_type, object_name;
```

A09 PASS requires exactly 25 complete rows and the 14 exact headers in SELECT order: the unchanged accepted 16-row baseline plus exactly the first 9 Core objects, with every earlier new OID stable and no additional object. The newly added `ai_sketch_jobs_attempt_identity_uidx` must be unique, valid, ready, and live, on `(concept_brief_id, attempt_number)` with the exact non-null-attempt predicate and no `generation_purpose` key; its OID must be non-null, unique across the catalog, and stable in every later assertion.

### Step 20 - CORE2-D10-JOB-ACTIVE-UIDX

Type: DDL. Creates at-most-one active First Preview Job per brief/purpose.

PASS evidence: `novora-fp-mvp-core-2-20-d10-job-active-uidx.png`

ERROR evidence: `novora-fp-mvp-core-2-20-d10-job-active-uidx-error.png`

```sql
CREATE UNIQUE INDEX ai_sketch_jobs_one_active_purpose_uidx
  ON public.ai_sketch_jobs USING btree (concept_brief_id, generation_purpose)
  WHERE status IN ('queued', 'processing');
```

PASS requires success with no warning and no returned row. Do not continue without the exact PASS screenshot and immediate A10.

### Step 21 - CORE2-A10-JOB-ACTIVE-UIDX

Type: SELECT-only immediate unfiltered catalog assertion.

PASS evidence: `novora-fp-mvp-core-2-21-a10-job-active-uidx.csv`

ERROR evidence: `novora-fp-mvp-core-2-21-a10-job-active-uidx-error.png`

```sql
WITH target_relations AS (
  SELECT relation.oid AS relation_oid, relation.relname AS table_name
  FROM pg_catalog.pg_class relation
  JOIN pg_catalog.pg_namespace namespace ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname IN ('ai_sketch_jobs', 'ai_sketch_outputs', 'ai_sketch_reviews')
    AND relation.relkind IN ('r', 'p')
)
SELECT
  targets.table_name,
  targets.relation_oid::text AS relation_oid,
  'constraint'::text AS object_type,
  constraint_object.oid::text AS object_oid,
  constraint_object.conname AS object_name,
  constraint_object.contype::text AS constraint_type,
  pg_catalog.pg_get_constraintdef(constraint_object.oid, true) AS exact_definition,
  constraint_object.convalidated AS is_validated,
  constraint_object.condeferrable AS is_deferrable,
  constraint_object.condeferred AS is_initially_deferred,
  NULL::boolean AS is_unique,
  NULL::boolean AS is_valid,
  NULL::boolean AS is_ready,
  NULL::boolean AS is_live
FROM target_relations targets
JOIN pg_catalog.pg_constraint constraint_object ON constraint_object.conrelid = targets.relation_oid
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
JOIN pg_catalog.pg_index index_metadata ON index_metadata.indrelid = targets.relation_oid
JOIN pg_catalog.pg_class index_relation ON index_relation.oid = index_metadata.indexrelid
ORDER BY table_name, object_type, object_name;
```

A10 PASS requires exactly 26 complete rows and the 14 exact headers in SELECT order: the unchanged accepted 16-row baseline plus exactly the first 10 Core objects, with every earlier new OID stable and no additional object. The newly added `ai_sketch_jobs_one_active_purpose_uidx` must be unique, valid, ready, and live, on `(concept_brief_id, generation_purpose)` with predicate restricted exactly to `queued` and `processing`; its OID must be non-null, unique across the catalog, and stable in every later assertion.

### Step 22 - CORE2-D11-OUTPUT-ONE-PER-JOB-UIDX

Type: DDL. Creates exactly-one-Output-per-Job uniqueness.

PASS evidence: `novora-fp-mvp-core-2-22-d11-output-one-per-job-uidx.png`

ERROR evidence: `novora-fp-mvp-core-2-22-d11-output-one-per-job-uidx-error.png`

```sql
CREATE UNIQUE INDEX ai_sketch_outputs_one_per_job_uidx
  ON public.ai_sketch_outputs USING btree (job_id);
```

PASS requires success with no warning and no returned row. Do not continue without the exact PASS screenshot and immediate A11.

### Step 23 - CORE2-A11-OUTPUT-ONE-PER-JOB-UIDX

Type: SELECT-only immediate unfiltered catalog assertion.

PASS evidence: `novora-fp-mvp-core-2-23-a11-output-one-per-job-uidx.csv`

ERROR evidence: `novora-fp-mvp-core-2-23-a11-output-one-per-job-uidx-error.png`

```sql
WITH target_relations AS (
  SELECT relation.oid AS relation_oid, relation.relname AS table_name
  FROM pg_catalog.pg_class relation
  JOIN pg_catalog.pg_namespace namespace ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname IN ('ai_sketch_jobs', 'ai_sketch_outputs', 'ai_sketch_reviews')
    AND relation.relkind IN ('r', 'p')
)
SELECT
  targets.table_name,
  targets.relation_oid::text AS relation_oid,
  'constraint'::text AS object_type,
  constraint_object.oid::text AS object_oid,
  constraint_object.conname AS object_name,
  constraint_object.contype::text AS constraint_type,
  pg_catalog.pg_get_constraintdef(constraint_object.oid, true) AS exact_definition,
  constraint_object.convalidated AS is_validated,
  constraint_object.condeferrable AS is_deferrable,
  constraint_object.condeferred AS is_initially_deferred,
  NULL::boolean AS is_unique,
  NULL::boolean AS is_valid,
  NULL::boolean AS is_ready,
  NULL::boolean AS is_live
FROM target_relations targets
JOIN pg_catalog.pg_constraint constraint_object ON constraint_object.conrelid = targets.relation_oid
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
JOIN pg_catalog.pg_index index_metadata ON index_metadata.indrelid = targets.relation_oid
JOIN pg_catalog.pg_class index_relation ON index_relation.oid = index_metadata.indexrelid
ORDER BY table_name, object_type, object_name;
```

A11 PASS requires exactly 27 complete rows and the 14 exact headers in SELECT order: the unchanged accepted 16-row baseline plus exactly the first 11 Core objects, with every earlier new OID stable and no additional object. The newly added `ai_sketch_outputs_one_per_job_uidx` must be unique, valid, ready, and live, on `job_id` with no predicate; its OID must be non-null, unique across the catalog, and stable in every later assertion.

### Step 24 - CORE2-D12-OUTPUT-CURRENT-PREVIEW-UIDX

Type: DDL. Creates exactly-one-current-preview-per-Brief uniqueness.

PASS evidence: `novora-fp-mvp-core-2-24-d12-output-current-preview-uidx.png`

ERROR evidence: `novora-fp-mvp-core-2-24-d12-output-current-preview-uidx-error.png`

```sql
CREATE UNIQUE INDEX ai_sketch_outputs_one_current_customer_preview_uidx
  ON public.ai_sketch_outputs USING btree (concept_brief_id)
  WHERE is_current_customer_preview IS TRUE;
```

PASS requires success with no warning and no returned row. Do not continue without the exact PASS screenshot and immediate A12.

### Step 25 - CORE2-A12-OUTPUT-CURRENT-PREVIEW-UIDX

Type: SELECT-only immediate unfiltered catalog assertion.

PASS evidence: `novora-fp-mvp-core-2-25-a12-output-current-preview-uidx.csv`

ERROR evidence: `novora-fp-mvp-core-2-25-a12-output-current-preview-uidx-error.png`

```sql
WITH target_relations AS (
  SELECT relation.oid AS relation_oid, relation.relname AS table_name
  FROM pg_catalog.pg_class relation
  JOIN pg_catalog.pg_namespace namespace ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname IN ('ai_sketch_jobs', 'ai_sketch_outputs', 'ai_sketch_reviews')
    AND relation.relkind IN ('r', 'p')
)
SELECT
  targets.table_name,
  targets.relation_oid::text AS relation_oid,
  'constraint'::text AS object_type,
  constraint_object.oid::text AS object_oid,
  constraint_object.conname AS object_name,
  constraint_object.contype::text AS constraint_type,
  pg_catalog.pg_get_constraintdef(constraint_object.oid, true) AS exact_definition,
  constraint_object.convalidated AS is_validated,
  constraint_object.condeferrable AS is_deferrable,
  constraint_object.condeferred AS is_initially_deferred,
  NULL::boolean AS is_unique,
  NULL::boolean AS is_valid,
  NULL::boolean AS is_ready,
  NULL::boolean AS is_live
FROM target_relations targets
JOIN pg_catalog.pg_constraint constraint_object ON constraint_object.conrelid = targets.relation_oid
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
JOIN pg_catalog.pg_index index_metadata ON index_metadata.indrelid = targets.relation_oid
JOIN pg_catalog.pg_class index_relation ON index_relation.oid = index_metadata.indexrelid
ORDER BY table_name, object_type, object_name;
```

A12 PASS requires exactly 28 complete rows and the 14 exact headers in SELECT order: the unchanged accepted 16-row baseline plus exactly the first 12 Core objects, with every earlier new OID stable and no additional object. The newly added `ai_sketch_outputs_one_current_customer_preview_uidx` must be unique, valid, ready, and live, on `concept_brief_id` with the exact current-true predicate; its OID must be non-null, unique across the catalog, and stable in every later assertion.

### Step 26 - CORE2-D13-JOB-PARENT-IDX

Type: DDL. Creates the bounded retry lookup and child-side FK support index.

PASS evidence: `novora-fp-mvp-core-2-26-d13-job-parent-idx.png`

ERROR evidence: `novora-fp-mvp-core-2-26-d13-job-parent-idx-error.png`

```sql
CREATE INDEX ai_sketch_jobs_parent_job_id_idx
  ON public.ai_sketch_jobs USING btree (parent_job_id);
```

PASS requires success with no warning and no returned row. Do not continue without the exact PASS screenshot and immediate A13.

### Step 27 - CORE2-A13-JOB-PARENT-IDX

Type: SELECT-only immediate unfiltered catalog assertion.

PASS evidence: `novora-fp-mvp-core-2-27-a13-job-parent-idx.csv`

ERROR evidence: `novora-fp-mvp-core-2-27-a13-job-parent-idx-error.png`

```sql
WITH target_relations AS (
  SELECT relation.oid AS relation_oid, relation.relname AS table_name
  FROM pg_catalog.pg_class relation
  JOIN pg_catalog.pg_namespace namespace ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname IN ('ai_sketch_jobs', 'ai_sketch_outputs', 'ai_sketch_reviews')
    AND relation.relkind IN ('r', 'p')
)
SELECT
  targets.table_name,
  targets.relation_oid::text AS relation_oid,
  'constraint'::text AS object_type,
  constraint_object.oid::text AS object_oid,
  constraint_object.conname AS object_name,
  constraint_object.contype::text AS constraint_type,
  pg_catalog.pg_get_constraintdef(constraint_object.oid, true) AS exact_definition,
  constraint_object.convalidated AS is_validated,
  constraint_object.condeferrable AS is_deferrable,
  constraint_object.condeferred AS is_initially_deferred,
  NULL::boolean AS is_unique,
  NULL::boolean AS is_valid,
  NULL::boolean AS is_ready,
  NULL::boolean AS is_live
FROM target_relations targets
JOIN pg_catalog.pg_constraint constraint_object ON constraint_object.conrelid = targets.relation_oid
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
JOIN pg_catalog.pg_index index_metadata ON index_metadata.indrelid = targets.relation_oid
JOIN pg_catalog.pg_class index_relation ON index_relation.oid = index_metadata.indexrelid
ORDER BY table_name, object_type, object_name;
```

A13 PASS requires exactly 29 complete rows and the 14 exact headers in SELECT order: the unchanged accepted 16-row baseline plus exactly the first 13 Core objects, with every earlier new OID stable and no additional object. The newly added `ai_sketch_jobs_parent_job_id_idx` must be non-unique, valid, ready, and live, on `parent_job_id` with no predicate; its OID must be non-null, unique across the catalog, and stable in every later assertion.

### Step 28 - CORE2-D14-REVIEW-OUTPUT-ID-IDX

Type: DDL. Creates the actual Review-to-Output lookup and child-side FK support index.

PASS evidence: `novora-fp-mvp-core-2-28-d14-review-output-id-idx.png`

ERROR evidence: `novora-fp-mvp-core-2-28-d14-review-output-id-idx-error.png`

```sql
CREATE INDEX ai_sketch_reviews_ai_sketch_output_id_idx
  ON public.ai_sketch_reviews USING btree (ai_sketch_output_id);
```

PASS requires success with no warning and no returned row. Do not continue without the exact PASS screenshot and immediate A14.

### Step 29 - CORE2-A14-REVIEW-OUTPUT-ID-IDX

Type: SELECT-only immediate unfiltered catalog assertion.

PASS evidence: `novora-fp-mvp-core-2-29-a14-review-output-id-idx.csv`

ERROR evidence: `novora-fp-mvp-core-2-29-a14-review-output-id-idx-error.png`

```sql
WITH target_relations AS (
  SELECT relation.oid AS relation_oid, relation.relname AS table_name
  FROM pg_catalog.pg_class relation
  JOIN pg_catalog.pg_namespace namespace ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname IN ('ai_sketch_jobs', 'ai_sketch_outputs', 'ai_sketch_reviews')
    AND relation.relkind IN ('r', 'p')
)
SELECT
  targets.table_name,
  targets.relation_oid::text AS relation_oid,
  'constraint'::text AS object_type,
  constraint_object.oid::text AS object_oid,
  constraint_object.conname AS object_name,
  constraint_object.contype::text AS constraint_type,
  pg_catalog.pg_get_constraintdef(constraint_object.oid, true) AS exact_definition,
  constraint_object.convalidated AS is_validated,
  constraint_object.condeferrable AS is_deferrable,
  constraint_object.condeferred AS is_initially_deferred,
  NULL::boolean AS is_unique,
  NULL::boolean AS is_valid,
  NULL::boolean AS is_ready,
  NULL::boolean AS is_live
FROM target_relations targets
JOIN pg_catalog.pg_constraint constraint_object ON constraint_object.conrelid = targets.relation_oid
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
JOIN pg_catalog.pg_index index_metadata ON index_metadata.indrelid = targets.relation_oid
JOIN pg_catalog.pg_class index_relation ON index_relation.oid = index_metadata.indexrelid
ORDER BY table_name, object_type, object_name;
```

A14 PASS requires exactly 30 complete rows and the 14 exact headers in SELECT order: the unchanged accepted 16-row baseline plus exactly the first 14 Core objects, with every earlier new OID stable and no additional object. The newly added `ai_sketch_reviews_ai_sketch_output_id_idx` must be non-unique, valid, ready, and live, on `ai_sketch_output_id` with no predicate; its OID must be non-null, unique across the catalog, and stable in every later assertion.

### Step 30 - CORE2-D15-JOB-PARENT-FK

Type: DDL. Adds the same-Brief exact-attempt-1 bounded parent FK `NOT VALID`.

PASS evidence: `novora-fp-mvp-core-2-30-d15-job-parent-fk.png`

ERROR evidence: `novora-fp-mvp-core-2-30-d15-job-parent-fk-error.png`

```sql
ALTER TABLE ONLY public.ai_sketch_jobs
  ADD CONSTRAINT ai_sketch_jobs_parent_lineage_fkey
  FOREIGN KEY (
    parent_job_id,
    concept_brief_id,
    parent_generation_purpose,
    parent_attempt_number
  )
  REFERENCES public.ai_sketch_jobs (
    id,
    concept_brief_id,
    generation_purpose,
    attempt_number
  )
  NOT VALID;
```

PASS requires success with no warning and no returned row. Do not continue without the exact PASS screenshot and immediate A15.

### Step 31 - CORE2-A15-JOB-PARENT-FK

Type: SELECT-only immediate unfiltered catalog assertion.

PASS evidence: `novora-fp-mvp-core-2-31-a15-job-parent-fk.csv`

ERROR evidence: `novora-fp-mvp-core-2-31-a15-job-parent-fk-error.png`

```sql
WITH target_relations AS (
  SELECT relation.oid AS relation_oid, relation.relname AS table_name
  FROM pg_catalog.pg_class relation
  JOIN pg_catalog.pg_namespace namespace ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname IN ('ai_sketch_jobs', 'ai_sketch_outputs', 'ai_sketch_reviews')
    AND relation.relkind IN ('r', 'p')
)
SELECT
  targets.table_name,
  targets.relation_oid::text AS relation_oid,
  'constraint'::text AS object_type,
  constraint_object.oid::text AS object_oid,
  constraint_object.conname AS object_name,
  constraint_object.contype::text AS constraint_type,
  pg_catalog.pg_get_constraintdef(constraint_object.oid, true) AS exact_definition,
  constraint_object.convalidated AS is_validated,
  constraint_object.condeferrable AS is_deferrable,
  constraint_object.condeferred AS is_initially_deferred,
  NULL::boolean AS is_unique,
  NULL::boolean AS is_valid,
  NULL::boolean AS is_ready,
  NULL::boolean AS is_live
FROM target_relations targets
JOIN pg_catalog.pg_constraint constraint_object ON constraint_object.conrelid = targets.relation_oid
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
JOIN pg_catalog.pg_index index_metadata ON index_metadata.indrelid = targets.relation_oid
JOIN pg_catalog.pg_class index_relation ON index_relation.oid = index_metadata.indexrelid
ORDER BY table_name, object_type, object_name;
```

A15 PASS requires exactly 31 complete rows and the 14 exact headers in SELECT order: the unchanged accepted 16-row baseline plus exactly the first 15 Core objects, with every earlier new OID stable and no additional object. The newly added `ai_sketch_jobs_parent_lineage_fkey` must be type `f`, unvalidated, not deferrable, not initially deferred, with child/target columns in frozen order, target relation OID `17602`, match type simple, no update/delete action, and exact definition semantically identical to D15; its OID must be non-null, unique across the catalog, and stable in every later assertion.

### Step 32 - CORE2-D16-OUTPUT-JOB-BRIEF-FK

Type: DDL. Adds the cross-Brief-safe Output-to-Job composite FK `NOT VALID`.

PASS evidence: `novora-fp-mvp-core-2-32-d16-output-job-brief-fk.png`

ERROR evidence: `novora-fp-mvp-core-2-32-d16-output-job-brief-fk-error.png`

```sql
ALTER TABLE ONLY public.ai_sketch_outputs
  ADD CONSTRAINT ai_sketch_outputs_job_brief_fkey
  FOREIGN KEY (job_id, concept_brief_id)
  REFERENCES public.ai_sketch_jobs (id, concept_brief_id)
  ON DELETE CASCADE
  NOT VALID;
```

PASS requires success with no warning and no returned row. Do not continue without the exact PASS screenshot and immediate A16.

### Step 33 - CORE2-A16-OUTPUT-JOB-BRIEF-FK

Type: SELECT-only immediate unfiltered catalog assertion.

PASS evidence: `novora-fp-mvp-core-2-33-a16-output-job-brief-fk.csv`

ERROR evidence: `novora-fp-mvp-core-2-33-a16-output-job-brief-fk-error.png`

```sql
WITH target_relations AS (
  SELECT relation.oid AS relation_oid, relation.relname AS table_name
  FROM pg_catalog.pg_class relation
  JOIN pg_catalog.pg_namespace namespace ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname IN ('ai_sketch_jobs', 'ai_sketch_outputs', 'ai_sketch_reviews')
    AND relation.relkind IN ('r', 'p')
)
SELECT
  targets.table_name,
  targets.relation_oid::text AS relation_oid,
  'constraint'::text AS object_type,
  constraint_object.oid::text AS object_oid,
  constraint_object.conname AS object_name,
  constraint_object.contype::text AS constraint_type,
  pg_catalog.pg_get_constraintdef(constraint_object.oid, true) AS exact_definition,
  constraint_object.convalidated AS is_validated,
  constraint_object.condeferrable AS is_deferrable,
  constraint_object.condeferred AS is_initially_deferred,
  NULL::boolean AS is_unique,
  NULL::boolean AS is_valid,
  NULL::boolean AS is_ready,
  NULL::boolean AS is_live
FROM target_relations targets
JOIN pg_catalog.pg_constraint constraint_object ON constraint_object.conrelid = targets.relation_oid
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
JOIN pg_catalog.pg_index index_metadata ON index_metadata.indrelid = targets.relation_oid
JOIN pg_catalog.pg_class index_relation ON index_relation.oid = index_metadata.indexrelid
ORDER BY table_name, object_type, object_name;
```

A16 PASS requires exactly 32 complete rows and the 14 exact headers in SELECT order: the unchanged accepted 16-row baseline plus exactly the first 16 Core objects, with every earlier new OID stable and no additional object. The newly added `ai_sketch_outputs_job_brief_fkey` must be type `f`, unvalidated, not deferrable, not initially deferred, with exact child/target order, target relation OID `17602`, delete action cascade, and exact definition semantically identical to D16; its OID must be non-null, unique across the catalog, and stable in every later assertion.

### Step 34 - CORE2-D17-REVIEW-OUTPUT-BRIEF-FK

Type: DDL. Adds the cross-Brief-safe Review-to-Output composite FK `NOT VALID`.

PASS evidence: `novora-fp-mvp-core-2-34-d17-review-output-brief-fk.png`

ERROR evidence: `novora-fp-mvp-core-2-34-d17-review-output-brief-fk-error.png`

```sql
ALTER TABLE ONLY public.ai_sketch_reviews
  ADD CONSTRAINT ai_sketch_reviews_output_brief_fkey
  FOREIGN KEY (ai_sketch_output_id, concept_brief_id)
  REFERENCES public.ai_sketch_outputs (id, concept_brief_id)
  ON DELETE CASCADE
  NOT VALID;
```

PASS requires success with no warning and no returned row. Do not continue without the exact PASS screenshot and immediate A17.

### Step 35 - CORE2-A17-REVIEW-OUTPUT-BRIEF-FK

Type: SELECT-only immediate unfiltered catalog assertion.

PASS evidence: `novora-fp-mvp-core-2-35-a17-review-output-brief-fk.csv`

ERROR evidence: `novora-fp-mvp-core-2-35-a17-review-output-brief-fk-error.png`

```sql
WITH target_relations AS (
  SELECT relation.oid AS relation_oid, relation.relname AS table_name
  FROM pg_catalog.pg_class relation
  JOIN pg_catalog.pg_namespace namespace ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname IN ('ai_sketch_jobs', 'ai_sketch_outputs', 'ai_sketch_reviews')
    AND relation.relkind IN ('r', 'p')
)
SELECT
  targets.table_name,
  targets.relation_oid::text AS relation_oid,
  'constraint'::text AS object_type,
  constraint_object.oid::text AS object_oid,
  constraint_object.conname AS object_name,
  constraint_object.contype::text AS constraint_type,
  pg_catalog.pg_get_constraintdef(constraint_object.oid, true) AS exact_definition,
  constraint_object.convalidated AS is_validated,
  constraint_object.condeferrable AS is_deferrable,
  constraint_object.condeferred AS is_initially_deferred,
  NULL::boolean AS is_unique,
  NULL::boolean AS is_valid,
  NULL::boolean AS is_ready,
  NULL::boolean AS is_live
FROM target_relations targets
JOIN pg_catalog.pg_constraint constraint_object ON constraint_object.conrelid = targets.relation_oid
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
JOIN pg_catalog.pg_index index_metadata ON index_metadata.indrelid = targets.relation_oid
JOIN pg_catalog.pg_class index_relation ON index_relation.oid = index_metadata.indexrelid
ORDER BY table_name, object_type, object_name;
```

A17 PASS requires exactly 33 complete rows and the 14 exact headers in SELECT order: the unchanged accepted 16-row baseline plus exactly the first 17 Core objects, with every earlier new OID stable and no additional object. The newly added `ai_sketch_reviews_output_brief_fkey` must be type `f`, unvalidated, not deferrable, not initially deferred, with exact child/target order, target relation OID `17619`, delete action cascade, and exact definition semantically identical to D17; its OID must be non-null, unique across the catalog, and stable in every later assertion.

### Step 36 - CORE2-FINAL

Type: SELECT-only final bounded Core DDL result gate.

PASS evidence: `novora-fp-mvp-core-2-36-final-core-result.csv`

ERROR evidence: `novora-fp-mvp-core-2-36-final-core-result-error.png`

```sql
WITH expected_core (
  sequence_number, table_name, object_type, object_name,
  constraint_type, expected_is_validated, expected_is_unique,
  expected_is_valid, expected_is_ready, expected_is_live
) AS (
  VALUES
    (1, 'ai_sketch_jobs', 'constraint', 'ai_sketch_jobs_status_check', 'c', false, NULL::boolean, NULL::boolean, NULL::boolean, NULL::boolean),
    (2, 'ai_sketch_jobs', 'constraint', 'ai_sketch_jobs_mvp_core_identity_check', 'c', false, NULL::boolean, NULL::boolean, NULL::boolean, NULL::boolean),
    (3, 'ai_sketch_outputs', 'constraint', 'ai_sketch_outputs_readiness_status_check', 'c', false, NULL::boolean, NULL::boolean, NULL::boolean, NULL::boolean),
    (4, 'ai_sketch_outputs', 'constraint', 'ai_sketch_outputs_mvp_core_ready_current_check', 'c', false, NULL::boolean, NULL::boolean, NULL::boolean, NULL::boolean),
    (5, 'ai_sketch_jobs', 'index', 'ai_sketch_jobs_id_brief_uidx', NULL::text, NULL::boolean, true, true, true, true),
    (6, 'ai_sketch_jobs', 'index', 'ai_sketch_jobs_parent_lineage_target_uidx', NULL::text, NULL::boolean, true, true, true, true),
    (7, 'ai_sketch_outputs', 'index', 'ai_sketch_outputs_id_brief_uidx', NULL::text, NULL::boolean, true, true, true, true),
    (8, 'ai_sketch_jobs', 'index', 'ai_sketch_jobs_idempotency_key_uidx', NULL::text, NULL::boolean, true, true, true, true),
    (9, 'ai_sketch_jobs', 'index', 'ai_sketch_jobs_attempt_identity_uidx', NULL::text, NULL::boolean, true, true, true, true),
    (10, 'ai_sketch_jobs', 'index', 'ai_sketch_jobs_one_active_purpose_uidx', NULL::text, NULL::boolean, true, true, true, true),
    (11, 'ai_sketch_outputs', 'index', 'ai_sketch_outputs_one_per_job_uidx', NULL::text, NULL::boolean, true, true, true, true),
    (12, 'ai_sketch_outputs', 'index', 'ai_sketch_outputs_one_current_customer_preview_uidx', NULL::text, NULL::boolean, true, true, true, true),
    (13, 'ai_sketch_jobs', 'index', 'ai_sketch_jobs_parent_job_id_idx', NULL::text, NULL::boolean, false, true, true, true),
    (14, 'ai_sketch_reviews', 'index', 'ai_sketch_reviews_ai_sketch_output_id_idx', NULL::text, NULL::boolean, false, true, true, true),
    (15, 'ai_sketch_jobs', 'constraint', 'ai_sketch_jobs_parent_lineage_fkey', 'f', false, NULL::boolean, NULL::boolean, NULL::boolean, NULL::boolean),
    (16, 'ai_sketch_outputs', 'constraint', 'ai_sketch_outputs_job_brief_fkey', 'f', false, NULL::boolean, NULL::boolean, NULL::boolean, NULL::boolean),
    (17, 'ai_sketch_reviews', 'constraint', 'ai_sketch_reviews_output_brief_fkey', 'f', false, NULL::boolean, NULL::boolean, NULL::boolean, NULL::boolean)
),
baseline_names (table_name, object_type, object_name) AS (
  VALUES
    ('ai_sketch_jobs', 'constraint', 'ai_sketch_jobs_concept_brief_id_fkey'),
    ('ai_sketch_jobs', 'constraint', 'ai_sketch_jobs_pkey'),
    ('ai_sketch_jobs', 'index', 'ai_sketch_jobs_concept_brief_id_idx'),
    ('ai_sketch_jobs', 'index', 'ai_sketch_jobs_pkey'),
    ('ai_sketch_outputs', 'constraint', 'ai_sketch_outputs_concept_brief_id_fkey'),
    ('ai_sketch_outputs', 'constraint', 'ai_sketch_outputs_job_id_fkey'),
    ('ai_sketch_outputs', 'constraint', 'ai_sketch_outputs_pkey'),
    ('ai_sketch_outputs', 'index', 'ai_sketch_outputs_concept_brief_id_idx'),
    ('ai_sketch_outputs', 'index', 'ai_sketch_outputs_pkey'),
    ('ai_sketch_reviews', 'constraint', 'ai_sketch_reviews_ai_sketch_output_id_fkey'),
    ('ai_sketch_reviews', 'constraint', 'ai_sketch_reviews_concept_brief_id_fkey'),
    ('ai_sketch_reviews', 'constraint', 'ai_sketch_reviews_concept_brief_id_key'),
    ('ai_sketch_reviews', 'constraint', 'ai_sketch_reviews_pkey'),
    ('ai_sketch_reviews', 'constraint', 'ai_sketch_reviews_review_status_check'),
    ('ai_sketch_reviews', 'index', 'ai_sketch_reviews_concept_brief_id_key'),
    ('ai_sketch_reviews', 'index', 'ai_sketch_reviews_pkey')
),
target_relations AS (
  SELECT relation.oid AS relation_oid, relation.relname AS table_name
  FROM pg_catalog.pg_class relation
  JOIN pg_catalog.pg_namespace namespace ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname IN ('ai_sketch_jobs', 'ai_sketch_outputs', 'ai_sketch_reviews')
    AND relation.relkind IN ('r', 'p')
),
actual_objects AS (
  SELECT
    target.table_name,
    target.relation_oid,
    'constraint'::text AS object_type,
    constraint_object.oid AS object_oid,
    constraint_object.conname AS object_name,
    constraint_object.contype::text AS constraint_type,
    pg_catalog.pg_get_constraintdef(constraint_object.oid, true) AS exact_definition,
    constraint_object.convalidated AS is_validated,
    constraint_object.condeferrable AS is_deferrable,
    constraint_object.condeferred AS is_initially_deferred,
    NULL::boolean AS is_unique,
    NULL::boolean AS is_valid,
    NULL::boolean AS is_ready,
    NULL::boolean AS is_live
  FROM target_relations target
  JOIN pg_catalog.pg_constraint constraint_object ON constraint_object.conrelid = target.relation_oid
  UNION ALL
  SELECT
    target.table_name,
    target.relation_oid,
    'index'::text,
    index_relation.oid,
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
  FROM target_relations target
  JOIN pg_catalog.pg_index index_metadata ON index_metadata.indrelid = target.relation_oid
  JOIN pg_catalog.pg_class index_relation ON index_relation.oid = index_metadata.indexrelid
),
allowed_names AS (
  SELECT table_name, object_type, object_name FROM baseline_names
  UNION ALL
  SELECT table_name, object_type, object_name FROM expected_core
),
summary AS (
  SELECT
    (SELECT count(*) FROM allowed_names) AS expected_target_object_count,
    (SELECT count(*) FROM actual_objects) AS actual_target_object_count,
    (SELECT count(*)
     FROM allowed_names expected
     LEFT JOIN actual_objects actual
       ON actual.table_name = expected.table_name
      AND actual.object_type = expected.object_type
      AND actual.object_name = expected.object_name
     WHERE actual.object_oid IS NULL) AS missing_allowed_object_count,
    (SELECT count(*)
     FROM actual_objects actual
     LEFT JOIN allowed_names expected
       ON expected.table_name = actual.table_name
      AND expected.object_type = actual.object_type
      AND expected.object_name = actual.object_name
     WHERE expected.object_name IS NULL) AS unexpected_object_count,
    (SELECT count(*)
     FROM (
       SELECT table_name, object_type, object_oid
       FROM actual_objects
       GROUP BY table_name, object_type, object_oid
       HAVING count(*) > 1
     ) duplicates) AS duplicate_object_identity_count
)
SELECT
  expected.sequence_number,
  expected.table_name,
  actual.relation_oid::text AS relation_oid,
  expected.object_type,
  expected.object_name,
  actual.object_oid::text AS object_oid,
  actual.constraint_type,
  actual.exact_definition,
  actual.is_validated,
  actual.is_deferrable,
  actual.is_initially_deferred,
  actual.is_unique,
  actual.is_valid,
  actual.is_ready,
  actual.is_live,
  summary.expected_target_object_count,
  summary.actual_target_object_count,
  summary.missing_allowed_object_count,
  summary.unexpected_object_count,
  summary.duplicate_object_identity_count,
  (
    actual.constraint_type IS NOT DISTINCT FROM expected.constraint_type
    AND actual.is_validated IS NOT DISTINCT FROM expected.expected_is_validated
    AND actual.is_unique IS NOT DISTINCT FROM expected.expected_is_unique
    AND actual.is_valid IS NOT DISTINCT FROM expected.expected_is_valid
    AND actual.is_ready IS NOT DISTINCT FROM expected.expected_is_ready
    AND actual.is_live IS NOT DISTINCT FROM expected.expected_is_live
    AND (expected.object_type <> 'constraint'
         OR (actual.is_deferrable IS FALSE AND actual.is_initially_deferred IS FALSE))
  ) AS expected_state_matches
FROM expected_core expected
LEFT JOIN actual_objects actual
  ON actual.table_name = expected.table_name
 AND actual.object_type = expected.object_type
 AND actual.object_name = expected.object_name
CROSS JOIN summary
ORDER BY expected.sequence_number;
```

`CORE2-FINAL` PASS requires exactly 17 complete rows and these 21 exact headers
in SELECT order. Sequence numbers 1-17 and Core identities must be complete and
unique. Relation OIDs must remain Jobs `17602`, Outputs `17619`, Reviews
`17641`. Every new object OID must be non-null, unique, and identical to its
immediate assertion. Every exact definition must remain semantically identical
to its frozen DDL. All seven constraints must be unvalidated, not deferrable,
and not initially deferred. All ten indexes must have exact key order and
predicate; required uniqueness must match; every index must be valid, ready,
and live. Every `expected_state_matches` must be `true`. Each row must repeat
summary values `33`, `33`, `0`, `0`, `0`. Any mismatch is an immediate STOP.

## 6. Frozen statement identity and evidence table

| Step | Statement | Type | Bytes | Canonical SHA-256 | PASS evidence | ERROR evidence |
| --- | --- | --- | ---: | --- | --- | --- |
| 01 | `L01-CORE` | SELECT-only | `10877` | `86807fc9283e435a2667a9c4cf4b508270746643694bc6c12deaa671173172b9` | `novora-fp-mvp-core-2-01-l01-core.csv` | `novora-fp-mvp-core-2-01-l01-core-error.png` |
| 02 | `CORE2-D01-JOB-STATUS-CHECK` | DDL | `233` | `73fb193b3cffea7aa396a4ea3c5aab7135731417de6f02deed295f0a11300f8b` | `novora-fp-mvp-core-2-02-d01-job-status-check.png` | `novora-fp-mvp-core-2-02-d01-job-status-check-error.png` |
| 03 | `CORE2-A01-JOB-STATUS-CHECK` | SELECT-only | `1754` | `a5587e84db0c69eac3e0389ac469e1a16e50684ce4f33393c0fd9181ddec7853` | `novora-fp-mvp-core-2-03-a01-job-status-check.csv` | `novora-fp-mvp-core-2-03-a01-job-status-check-error.png` |
| 04 | `CORE2-D02-JOB-IDENTITY-CHECK` | DDL | `1562` | `84b1e3c4b562b941d9f6e9f2e5196e8a9b5f0352f4b997c157fc2aeeb2d3e78a` | `novora-fp-mvp-core-2-04-d02-job-identity-check.png` | `novora-fp-mvp-core-2-04-d02-job-identity-check-error.png` |
| 05 | `CORE2-A02-JOB-IDENTITY-CHECK` | SELECT-only | `1754` | `a5587e84db0c69eac3e0389ac469e1a16e50684ce4f33393c0fd9181ddec7853` | `novora-fp-mvp-core-2-05-a02-job-identity-check.csv` | `novora-fp-mvp-core-2-05-a02-job-identity-check-error.png` |
| 06 | `CORE2-D03-OUTPUT-READINESS-CHECK` | DDL | `229` | `1c510ed44e5cd3d5ba676f27866b85248995c58942c54860f0251568b6c29737` | `novora-fp-mvp-core-2-06-d03-output-readiness-check.png` | `novora-fp-mvp-core-2-06-d03-output-readiness-check-error.png` |
| 07 | `CORE2-A03-OUTPUT-READINESS-CHECK` | SELECT-only | `1754` | `a5587e84db0c69eac3e0389ac469e1a16e50684ce4f33393c0fd9181ddec7853` | `novora-fp-mvp-core-2-07-a03-output-readiness-check.csv` | `novora-fp-mvp-core-2-07-a03-output-readiness-check-error.png` |
| 08 | `CORE2-D04-OUTPUT-READY-CURRENT-CHECK` | DDL | `1989` | `49ceb7f5320fb742670d4cbd5b2674b6f10cf3d41a77f937823ee2e7059c0c5e` | `novora-fp-mvp-core-2-08-d04-output-ready-current-check.png` | `novora-fp-mvp-core-2-08-d04-output-ready-current-check-error.png` |
| 09 | `CORE2-A04-OUTPUT-READY-CURRENT-CHECK` | SELECT-only | `1754` | `a5587e84db0c69eac3e0389ac469e1a16e50684ce4f33393c0fd9181ddec7853` | `novora-fp-mvp-core-2-09-a04-output-ready-current-check.csv` | `novora-fp-mvp-core-2-09-a04-output-ready-current-check-error.png` |
| 10 | `CORE2-D05-JOB-ID-BRIEF-UIDX` | DDL | `112` | `85d0889405a85e3651a59df2482e1db31bc8ebe952ab5d401a9bfc9e63f04633` | `novora-fp-mvp-core-2-10-d05-job-id-brief-uidx.png` | `novora-fp-mvp-core-2-10-d05-job-id-brief-uidx-error.png` |
| 11 | `CORE2-A05-JOB-ID-BRIEF-UIDX` | SELECT-only | `1754` | `a5587e84db0c69eac3e0389ac469e1a16e50684ce4f33393c0fd9181ddec7853` | `novora-fp-mvp-core-2-11-a05-job-id-brief-uidx.csv` | `novora-fp-mvp-core-2-11-a05-job-id-brief-uidx-error.png` |
| 12 | `CORE2-D06-JOB-PARENT-TARGET-UIDX` | DDL | `169` | `f1512d009eb5c5ccc0b58db35027f9c4d7e5fdbb0bd12a2f72c372f8e244e1c3` | `novora-fp-mvp-core-2-12-d06-job-parent-target-uidx.png` | `novora-fp-mvp-core-2-12-d06-job-parent-target-uidx-error.png` |
| 13 | `CORE2-A06-JOB-PARENT-TARGET-UIDX` | SELECT-only | `1754` | `a5587e84db0c69eac3e0389ac469e1a16e50684ce4f33393c0fd9181ddec7853` | `novora-fp-mvp-core-2-13-a06-job-parent-target-uidx.csv` | `novora-fp-mvp-core-2-13-a06-job-parent-target-uidx-error.png` |
| 14 | `CORE2-D07-OUTPUT-ID-BRIEF-UIDX` | DDL | `118` | `2437ef08ea0854f3f454cbe3bd5ac98db86bc5b78b4c81480c58b86d6f16b301` | `novora-fp-mvp-core-2-14-d07-output-id-brief-uidx.png` | `novora-fp-mvp-core-2-14-d07-output-id-brief-uidx-error.png` |
| 15 | `CORE2-A07-OUTPUT-ID-BRIEF-UIDX` | SELECT-only | `1754` | `a5587e84db0c69eac3e0389ac469e1a16e50684ce4f33393c0fd9181ddec7853` | `novora-fp-mvp-core-2-15-a07-output-id-brief-uidx.csv` | `novora-fp-mvp-core-2-15-a07-output-id-brief-uidx-error.png` |
| 16 | `CORE2-D08-JOB-IDEMPOTENCY-UIDX` | DDL | `150` | `74199a7bb66940a4ac2435ed2059bf5f74f6a91fc0e16497524c967a6f829cf9` | `novora-fp-mvp-core-2-16-d08-job-idempotency-uidx.png` | `novora-fp-mvp-core-2-16-d08-job-idempotency-uidx-error.png` |
| 17 | `CORE2-A08-JOB-IDEMPOTENCY-UIDX` | SELECT-only | `1754` | `a5587e84db0c69eac3e0389ac469e1a16e50684ce4f33393c0fd9181ddec7853` | `novora-fp-mvp-core-2-17-a08-job-idempotency-uidx.csv` | `novora-fp-mvp-core-2-17-a08-job-idempotency-uidx-error.png` |
| 18 | `CORE2-D09-JOB-ATTEMPT-UIDX` | DDL | `167` | `c3b6d15c91cc5324e9ee7271376d13832b662e3d074c43da9f872e97ef8dd861` | `novora-fp-mvp-core-2-18-d09-job-attempt-uidx.png` | `novora-fp-mvp-core-2-18-d09-job-attempt-uidx-error.png` |
| 19 | `CORE2-A09-JOB-ATTEMPT-UIDX` | SELECT-only | `1754` | `a5587e84db0c69eac3e0389ac469e1a16e50684ce4f33393c0fd9181ddec7853` | `novora-fp-mvp-core-2-19-a09-job-attempt-uidx.csv` | `novora-fp-mvp-core-2-19-a09-job-attempt-uidx-error.png` |
| 20 | `CORE2-D10-JOB-ACTIVE-UIDX` | DDL | `181` | `7e0ec2d8aff6e0bb21872f22ed8dbcdc1a62a59644fa45279a7e85a7e7554699` | `novora-fp-mvp-core-2-20-d10-job-active-uidx.png` | `novora-fp-mvp-core-2-20-d10-job-active-uidx-error.png` |
| 21 | `CORE2-A10-JOB-ACTIVE-UIDX` | SELECT-only | `1754` | `a5587e84db0c69eac3e0389ac469e1a16e50684ce4f33393c0fd9181ddec7853` | `novora-fp-mvp-core-2-21-a10-job-active-uidx.csv` | `novora-fp-mvp-core-2-21-a10-job-active-uidx-error.png` |
| 22 | `CORE2-D11-OUTPUT-ONE-PER-JOB-UIDX` | DDL | `107` | `d58391caecf9b1181bf0a7fc7a8ab89d4943830b15b0e62b132e4bb5e81e8e99` | `novora-fp-mvp-core-2-22-d11-output-one-per-job-uidx.png` | `novora-fp-mvp-core-2-22-d11-output-one-per-job-uidx-error.png` |
| 23 | `CORE2-A11-OUTPUT-ONE-PER-JOB-UIDX` | SELECT-only | `1754` | `a5587e84db0c69eac3e0389ac469e1a16e50684ce4f33393c0fd9181ddec7853` | `novora-fp-mvp-core-2-23-a11-output-one-per-job-uidx.csv` | `novora-fp-mvp-core-2-23-a11-output-one-per-job-uidx-error.png` |
| 24 | `CORE2-D12-OUTPUT-CURRENT-PREVIEW-UIDX` | DDL | `178` | `da43ae52c1db3e7ab114a93166ff288e603d9ca04983a74894fa830cbc7fe8bc` | `novora-fp-mvp-core-2-24-d12-output-current-preview-uidx.png` | `novora-fp-mvp-core-2-24-d12-output-current-preview-uidx-error.png` |
| 25 | `CORE2-A12-OUTPUT-CURRENT-PREVIEW-UIDX` | SELECT-only | `1754` | `a5587e84db0c69eac3e0389ac469e1a16e50684ce4f33393c0fd9181ddec7853` | `novora-fp-mvp-core-2-25-a12-output-current-preview-uidx.csv` | `novora-fp-mvp-core-2-25-a12-output-current-preview-uidx-error.png` |
| 26 | `CORE2-D13-JOB-PARENT-IDX` | DDL | `102` | `569876020e9827ff7615283b97615bb6c030dc0a7c4cf62d91cc9229d3ff9caf` | `novora-fp-mvp-core-2-26-d13-job-parent-idx.png` | `novora-fp-mvp-core-2-26-d13-job-parent-idx-error.png` |
| 27 | `CORE2-A13-JOB-PARENT-IDX` | SELECT-only | `1754` | `a5587e84db0c69eac3e0389ac469e1a16e50684ce4f33393c0fd9181ddec7853` | `novora-fp-mvp-core-2-27-a13-job-parent-idx.csv` | `novora-fp-mvp-core-2-27-a13-job-parent-idx-error.png` |
| 28 | `CORE2-D14-REVIEW-OUTPUT-ID-IDX` | DDL | `120` | `5395ea9ff64b8f5652ad3ed1fae81603290493aeae2f1c32b6049d95037450fb` | `novora-fp-mvp-core-2-28-d14-review-output-id-idx.png` | `novora-fp-mvp-core-2-28-d14-review-output-id-idx-error.png` |
| 29 | `CORE2-A14-REVIEW-OUTPUT-ID-IDX` | SELECT-only | `1754` | `a5587e84db0c69eac3e0389ac469e1a16e50684ce4f33393c0fd9181ddec7853` | `novora-fp-mvp-core-2-29-a14-review-output-id-idx.csv` | `novora-fp-mvp-core-2-29-a14-review-output-id-idx-error.png` |
| 30 | `CORE2-D15-JOB-PARENT-FK` | DDL | `336` | `03fe2f28ff89dcd747c1e82edcf91b565e05c8d2b589c582699348329e94706c` | `novora-fp-mvp-core-2-30-d15-job-parent-fk.png` | `novora-fp-mvp-core-2-30-d15-job-parent-fk-error.png` |
| 31 | `CORE2-A15-JOB-PARENT-FK` | SELECT-only | `1754` | `a5587e84db0c69eac3e0389ac469e1a16e50684ce4f33393c0fd9181ddec7853` | `novora-fp-mvp-core-2-31-a15-job-parent-fk.csv` | `novora-fp-mvp-core-2-31-a15-job-parent-fk-error.png` |
| 32 | `CORE2-D16-OUTPUT-JOB-BRIEF-FK` | DDL | `224` | `116e427a63cbd9b366e5320c436136835cc4cbb29dc4e0d1032bbd6a68e06474` | `novora-fp-mvp-core-2-32-d16-output-job-brief-fk.png` | `novora-fp-mvp-core-2-32-d16-output-job-brief-fk-error.png` |
| 33 | `CORE2-A16-OUTPUT-JOB-BRIEF-FK` | SELECT-only | `1754` | `a5587e84db0c69eac3e0389ac469e1a16e50684ce4f33393c0fd9181ddec7853` | `novora-fp-mvp-core-2-33-a16-output-job-brief-fk.csv` | `novora-fp-mvp-core-2-33-a16-output-job-brief-fk-error.png` |
| 34 | `CORE2-D17-REVIEW-OUTPUT-BRIEF-FK` | DDL | `243` | `165a031572cf6f7ab6a649eaa986aeaac6b716776dc408fbd94993598c0b8903` | `novora-fp-mvp-core-2-34-d17-review-output-brief-fk.png` | `novora-fp-mvp-core-2-34-d17-review-output-brief-fk-error.png` |
| 35 | `CORE2-A17-REVIEW-OUTPUT-BRIEF-FK` | SELECT-only | `1754` | `a5587e84db0c69eac3e0389ac469e1a16e50684ce4f33393c0fd9181ddec7853` | `novora-fp-mvp-core-2-35-a17-review-output-brief-fk.csv` | `novora-fp-mvp-core-2-35-a17-review-output-brief-fk-error.png` |
| 36 | `CORE2-FINAL` | SELECT-only | `8258` | `cae63df28233a3a0e6ebb54e63191abdd15f911d4714fa8ad7d80a5410efa625` | `novora-fp-mvp-core-2-36-final-core-result.csv` | `novora-fp-mvp-core-2-36-final-core-result-error.png` |

Every SQL fence must be extracted independently and match this table before
execution. Duplicate assertion hashes are expected because A01-A17 use the
same unfiltered catalog statement; their separate sequence positions and
evidence filenames remain mandatory.

## 7. Exact catalog progression and assertion contract

Every A01-A17 assertion is unfiltered across every constraint and index on all
three target tables. PASS requires the accepted 16-object baseline unchanged,
plus exactly the first N Core objects in section 2 after DDL N. No expected-name
filter is permitted to hide an additional object. Required result rows progress
from 17 at A01 through 33 at A17.

Baseline relation and object OIDs, definitions, validation, uniqueness,
readiness, and liveness must stay byte-for-semantic-value equal to the accepted
MVP-CORE-1 baseline. New object OIDs cannot be predicted before creation; each
must be non-null and unique when first observed and remain identical in every
later assertion and `CORE2-FINAL`.

For CHECK constraints, `exact_definition` must be PostgreSQL's normalized
rendering of the complete frozen predicate and must include `NOT VALID`; the
catalog state must be type `c`, unvalidated, not deferrable, and not initially
deferred. The complete Boolean of every nullable Core CHECK is wrapped in `IS
TRUE` where required so an invalid NULL result cannot satisfy the CHECK.

For FKs, child and target column order, referenced relation, match/action
semantics, `NOT VALID`, and non-deferrable/non-deferred posture must match the
DDL exactly. D15 depends on D06; D16 depends on D05; D17 depends on D07. The
required target indexes therefore precede their FKs.

For indexes, `pg_get_indexdef`, key order, predicate, uniqueness, validity,
readiness, and liveness must match exactly. `IF NOT EXISTS`, `CONCURRENTLY`, an
expression/key substitution, or an additional included column is forbidden.

## 8. Deterministic STOP and `not_run` behavior

STOP the whole sequence immediately on any:

- project, environment, database, schema, selected/current/session-role,
  recovery-state, row-limit, quiet-window, or visible-target-control mismatch;
- merged-main, reviewed-head, packet/source blob, heading, step, canonical byte
  length, canonical SHA-256, SQL text, or evidence filename mismatch;
- relation/table identity, OID, owner, persistence, baseline object, proposed
  object, name, kind, definition, validation, deferrability, key order,
  predicate, uniqueness, readiness, liveness, FK target/action, or dependency
  mismatch;
- lock, row-count, header, ordering, duplicate, aggregate, completeness,
  truncation, privacy, export, or evidence mismatch;
- warning, SQL error, client/API/transport/fetch error, export error, missing
  result, or incomplete evidence; or
- returned customer/business row or identity, customer content, secret, token,
  key, object path, URL, image, environment-variable value, or Provider data.

On ERROR at Phase 0, every SQL item is `not_run`. On ERROR at any SQL item, that
item is `ERROR`, the immediately preceding PASS remains the last PASS, and
every later item through Step 36 is `not_run`. Preserve the exact artifact and
run no more SQL. Do not click Retry, rerun, repair, compensate, backfill,
validate, roll back, clean up, substitute SQL, capture replacement evidence,
or continue. A new attempt requires a new independently reviewed immutable
retry/continuation packet and separate exact approval.

## 9. External sanitized manifest contract

After Step 36 PASS or any earlier STOP, run no more SQL. A later separately
scoped read-only reconciliation must rehash selected artifacts in place and
create only:

`novora-fp-mvp-core-2-37-manifest-v1.json`

The manifest must select exactly one artifact for every attempted item; record
every unattempted item as `not_run`; record exact byte sizes, SHA-256 values,
headers, row counts, duplicate counts, sanitized aggregates, PASS/ERROR, last
PASS, failed item, and actual Owner-performed manual SQL count; record the
quiet-window attestation and bounded Phase 0 proof; preserve all new OIDs and
their stability across assertions; and record every explicit exclusion
one-for-one as `not_executed` or `not_started`.

Unless complete submitted-byte evidence exists, every SQL item must record
`actual_canonical_sql_sha256: null` and `canonical_hash_equality: null`. The
manifest must contain no customer data, row IDs, Brief references, prompts,
notes, Storage object paths, URLs, images, secrets, tokens, keys, environment
values, Provider data, or raw evidence.

## 10. Explicit exclusions

Neither this packet nor its preparation, review, merge, or later execution
approval authorizes:

- Codex, MCP, CLI, script, or any other automation to connect to Supabase or
  execute SQL;
- Owner execution before a new exact approval bound to the final merged packet;
- more than one manual attempt, generic Retry, automatic retry, rerun, repair,
  compensation, backfill, data edit, DELETE, rollback, cleanup, replacement
  evidence, SQL substitution, transaction wrapper, `IF NOT EXISTS`, or
  `CONCURRENTLY`;
- any constraint validation, `MVP-CORE-3`, full block 23.7, or other DDL/DML;
- the former Batch 03 packet, mapping, approval, old L01, old L01 evidence,
  candidate SQL, superseded accelerated-batch sequence, or prior approval;
- feedback attempts 2-3, extended parent/source-output lineage, Provider
  request/profile enforcement, pricing/cost, extended lifecycle/timing/failure/
  retry enforcement, general non-ready enforcement, full revocation chronology,
  broader audit history, or unused/performance-only indexes;
- ACL, default-privilege, RLS, policy, trigger, function, routine, or Storage
  change;
- customer/business-row inspection beyond the exact frozen aggregates;
- Provider call, generated-asset action, credential/secret/environment change,
  deployment, application rollout, email, payment, or customer-visible action;
  or
- branch, worktree, evidence, artifact, file, prior manifest, or other deletion
  or cleanup.

## 11. Gate state and next boundary

Packet preparation status is `FROZEN`; execution status remains
`MVP-CORE-2 = NOT_EXECUTED`. `MVP-CORE-1 = PASS`; Phase A Resume and historical
Phase A remain `STOPPED`. Exactly two database human execution gates remain
until this packet executes; after successful MVP-CORE-2 evidence reconciliation
and durable merge, only `MVP-CORE-3` remains.

After exact-head independent review, all findings resolved, green required
checks, and the single documentation-only Packet PR merge, stop at:

`HUMAN GATE - MVP-CORE-2 EXECUTION APPROVAL REQUIRED`

Only a separate copy-ready Owner approval sentence containing final merged-main,
reviewed PR head, packet blob, all source/evidence identities, every statement
byte length/hash and PASS/ERROR filename, exact context, order, STOP rules, and
exclusions may release this one manual Owner sequence. No later gate or
application action is released.
