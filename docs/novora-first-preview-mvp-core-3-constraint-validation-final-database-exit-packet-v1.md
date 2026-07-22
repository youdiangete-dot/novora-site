# NOVORA First Preview MVP-CORE-3 Constraint Validation and Final Database Exit Packet v1

Date frozen: 2026-07-22

Status: **IMMUTABLE PACKET PREPARED — OWNER EXECUTION NOT AUTHORIZED**

## 1. Exact scope and source identities

This documentation-only packet is the final database human execution gate in
Critical Path Cutline v3. It validates only the seven limited-beta Core
constraints created by the completed `MVP-CORE-2` sequence and proves the final
database-exit conditions. It does not authorize Codex or any tool to connect to
Supabase or execute SQL. Owner execution requires a separate exact approval
bound to the reviewed and merged packet identity.

- preparation baseline: merged `origin/main`
  `02b94e06c1ff8f0f381ea2c09e1536785cdda644`;
- completed external `MVP-CORE-2` manifest:
  `novora-fp-mvp-core-2-37-manifest-v1.json`, `60664` bytes, SHA-256
  `46365ed82097203daec9496607d3c793a8f85d2dbc8614555b685c38a1054864`;
- Critical Path Cutline v3 Git blob:
  `a43313f1d936365fd97dc92ccd8803d18b711176`;
- frozen `MVP-CORE-2` source packet Git blob:
  `839bbd3f6f6e49b631b0faf163cbe7b27f734cd1`;
- frozen one-statement continuation contract Git blob:
  `a0f7d094fb823befbe518b6b9ab5c78cfae1c5ff`;
- accepted Stage A ACL reconciliation Git blob:
  `bdb75717a8bf6c0eb4b069ab2c4e8cb6ece4b808`;
- accepted Stage B default-privilege reconciliation Git blob:
  `ea64c8a1f1c832e46c91bc9789c9d0824cc52333`.

No prior packet or approval authorizes this sequence. The SQL below is frozen
inside this packet under new `CORE3-*` identities.

## 2. Target and Phase 0 visual gate

The Owner must manually use:

- Supabase project `novora-production`;
- branch/environment `main` / Production;
- Primary Database (`postgres`);
- target schema `public`;
- selected current role `postgres`;
- required current role and session role `postgres`;
- required `server_is_in_recovery = false`;
- SQL Editor row limit at least `1000`.

Before any SQL, establish a new uninterrupted quiet window with no writer,
migration, schema operation, application rollout, or other actor targeting
`public.ai_sketch_jobs`, `public.ai_sketch_outputs`, or
`public.ai_sketch_reviews`. Open a new blank editor and capture exactly one:

- PASS: `novora-fp-mvp-core-3-00-context.png`
- ERROR: `novora-fp-mvp-core-3-00-context-error.png`

The visual artifact proves only visible project, environment, database
selection, selected role, row limit, blank editor, and absence of a visible old
result, warning, or error. Session values are proved by `CORE3-P01`.

## 3. One-statement-at-a-time contract

For every executable step:

1. Codex releases exactly one frozen statement only after the immediately
   preceding evidence independently passes.
2. The Owner renews the quiet-window and unchanged-target-context attestations.
3. The Owner pastes only that statement into a blank editor and uses ordinary
   manual `Run` exactly once.
4. The Owner captures only the packet-defined PASS or ERROR artifact, executes
   no later SQL, and returns the evidence for independent reconciliation.
5. Only exact PASS may release the next statement.

Do not combine statements, add comments, edit whitespace, add a transaction
wrapper, use `IF NOT EXISTS` or `CONCURRENTLY`, refresh, reconnect, switch the
target, click Retry, rerun, repair, compensate, backfill, roll back, clean up,
substitute SQL, or capture replacement evidence after STOP.

## 4. Ordered execution table

Canonical SQL is the UTF-8 byte sequence inside the referenced SQL fence after
LF normalization, excluding the opening and closing fence and excluding a
trailing newline. The final byte lengths and SHA-256 values are frozen in this
table after independent review.

| Step | Statement | SQL fence | Bytes | Canonical SHA-256 | PASS evidence | ERROR evidence |
|---:|---|---|---:|---|---|---|
| 01 | `CORE3-P01-CONTEXT` | 6.1 | `2148` | `184bf571d8b7e11ae8e21715ae8afa656114f2ae31c995b39c85e6efeaa37318` | `novora-fp-mvp-core-3-01-context.csv` | `novora-fp-mvp-core-3-01-context-error.png` |
| 02 | `CORE3-P02-CATALOG-PREFLIGHT` | 7.8 | `1753` | `2d022306c44dc2bb1c477919e9950e84fac5c5108c66992994193b3fe0dde288` | `novora-fp-mvp-core-3-02-catalog-preflight.csv` | `novora-fp-mvp-core-3-02-catalog-preflight-error.png` |
| 03 | `CORE3-P03-DATA-PREFLIGHT` | 6.3 | `6502` | `5603c211360061fd092cc7dd5c82cb579d9bb916cfb4b8c3e79c41e3dcf265fb` | `novora-fp-mvp-core-3-03-data-preflight.csv` | `novora-fp-mvp-core-3-03-data-preflight-error.png` |
| 04 | `CORE3-V01-JOB-STATUS` | 7.1 | `87` | `1257368211d67192c5d0737bc67a1201974c89658f22445363851fc99f9e908d` | `novora-fp-mvp-core-3-04-v01-job-status.png` | `novora-fp-mvp-core-3-04-v01-job-status-error.png` |
| 05 | `CORE3-A01-CATALOG` | 7.8 | `1753` | `2d022306c44dc2bb1c477919e9950e84fac5c5108c66992994193b3fe0dde288` | `novora-fp-mvp-core-3-05-a01-catalog.csv` | `novora-fp-mvp-core-3-05-a01-catalog-error.png` |
| 06 | `CORE3-V02-JOB-IDENTITY` | 7.2 | `98` | `b7d57cf933f3cc2fff11110ea7e461ffdf4f924820a6768c17cb843cee0ab863` | `novora-fp-mvp-core-3-06-v02-job-identity.png` | `novora-fp-mvp-core-3-06-v02-job-identity-error.png` |
| 07 | `CORE3-A02-CATALOG` | 7.8 | `1753` | `2d022306c44dc2bb1c477919e9950e84fac5c5108c66992994193b3fe0dde288` | `novora-fp-mvp-core-3-07-a02-catalog.csv` | `novora-fp-mvp-core-3-07-a02-catalog-error.png` |
| 08 | `CORE3-V03-OUTPUT-READINESS` | 7.3 | `103` | `46b6ad02595056e7e50d70ce7d9cbeb01ea154ee12e55af1de6274b48f509a58` | `novora-fp-mvp-core-3-08-v03-output-readiness.png` | `novora-fp-mvp-core-3-08-v03-output-readiness-error.png` |
| 09 | `CORE3-A03-CATALOG` | 7.8 | `1753` | `2d022306c44dc2bb1c477919e9950e84fac5c5108c66992994193b3fe0dde288` | `novora-fp-mvp-core-3-09-a03-catalog.csv` | `novora-fp-mvp-core-3-09-a03-catalog-error.png` |
| 10 | `CORE3-V04-OUTPUT-READY-CURRENT` | 7.4 | `109` | `5b6511a7c0d91fc4c031f4116526db901a024fce30af8f9672e4936316eb0c43` | `novora-fp-mvp-core-3-10-v04-output-ready-current.png` | `novora-fp-mvp-core-3-10-v04-output-ready-current-error.png` |
| 11 | `CORE3-A04-CATALOG` | 7.8 | `1753` | `2d022306c44dc2bb1c477919e9950e84fac5c5108c66992994193b3fe0dde288` | `novora-fp-mvp-core-3-11-a04-catalog.csv` | `novora-fp-mvp-core-3-11-a04-catalog-error.png` |
| 12 | `CORE3-V05-PARENT-LINEAGE-FK` | 7.5 | `94` | `cab7a32dac15878bd432790fcf51e3ab07c8c776be9b00481315b3f3d3ed1243` | `novora-fp-mvp-core-3-12-v05-parent-lineage-fk.png` | `novora-fp-mvp-core-3-12-v05-parent-lineage-fk-error.png` |
| 13 | `CORE3-A05-CATALOG` | 7.8 | `1753` | `2d022306c44dc2bb1c477919e9950e84fac5c5108c66992994193b3fe0dde288` | `novora-fp-mvp-core-3-13-a05-catalog.csv` | `novora-fp-mvp-core-3-13-a05-catalog-error.png` |
| 14 | `CORE3-V06-OUTPUT-JOB-BRIEF-FK` | 7.6 | `95` | `352d4ba9ddfd3715c6009f6fd663275ccde3b3d9c8dc6f47d0868488ac7df884` | `novora-fp-mvp-core-3-14-v06-output-job-brief-fk.png` | `novora-fp-mvp-core-3-14-v06-output-job-brief-fk-error.png` |
| 15 | `CORE3-A06-CATALOG` | 7.8 | `1753` | `2d022306c44dc2bb1c477919e9950e84fac5c5108c66992994193b3fe0dde288` | `novora-fp-mvp-core-3-15-a06-catalog.csv` | `novora-fp-mvp-core-3-15-a06-catalog-error.png` |
| 16 | `CORE3-V07-REVIEW-OUTPUT-BRIEF-FK` | 7.7 | `98` | `4d99c818519a9cf754167f83a74ddfbc1594c5916f85f79d4b86fec9f28fbc1f` | `novora-fp-mvp-core-3-16-v07-review-output-brief-fk.png` | `novora-fp-mvp-core-3-16-v07-review-output-brief-fk-error.png` |
| 17 | `CORE3-A07-CATALOG` | 7.8 | `1753` | `2d022306c44dc2bb1c477919e9950e84fac5c5108c66992994193b3fe0dde288` | `novora-fp-mvp-core-3-17-a07-catalog.csv` | `novora-fp-mvp-core-3-17-a07-catalog-error.png` |
| 18 | `CORE3-F01-EFFECTIVE-PRIVILEGES` | 8.1 | `1046` | `eb795bd4b2efab9a13b40980e8ed9292d8513fe75c1261c4d69b9dd56bdc3465` | `novora-fp-mvp-core-3-18-effective-privileges.csv` | `novora-fp-mvp-core-3-18-effective-privileges-error.png` |
| 19 | `CORE3-F02-DIRECT-ACL` | 8.2 | `738` | `ade579cff5759094a9a35be945fc060032cc15317308420ddbc734b59b6c3d02` | `novora-fp-mvp-core-3-19-direct-acl.csv` | `novora-fp-mvp-core-3-19-direct-acl-error.png` |
| 20 | `CORE3-F03-RLS-POLICY` | 8.3 | `531` | `e325aa23c9a49c6de33957db1a4734fb6b9a06df91a0ad13dfaec8b3fb434211` | `novora-fp-mvp-core-3-20-rls-policy.csv` | `novora-fp-mvp-core-3-20-rls-policy-error.png` |
| 21 | `CORE3-F04-POSTGRES-TABLE-DEFAULTS` | 8.4 | `1624` | `e180745ad978be065a8477c6667654398e5304ea9c4969b032606b1ba9256a42` | `novora-fp-mvp-core-3-21-postgres-table-defaults.csv` | `novora-fp-mvp-core-3-21-postgres-table-defaults-error.png` |
| 22 | `CORE3-F05-UNRELATED-DEFAULTS` | 8.5 | `2109` | `2a71a633e2435ec1891b4afd2d61a54040e00cc34467809513d6abf45ec1edb4` | `novora-fp-mvp-core-3-22-unrelated-defaults.csv` | `novora-fp-mvp-core-3-22-unrelated-defaults-error.png` |
| 23 | `CORE3-F06-ROUTINES` | 8.6 | `935` | `33a7bff092fe1c355a674bfb1a137ac22b0d483a68740d2bdc23d6bd5ac26f9f` | `novora-fp-mvp-core-3-23-routines.csv` | `novora-fp-mvp-core-3-23-routines-error.png` |
| 24 | `CORE3-F07-EVENT-TRIGGER` | 8.7 | `454` | `d0ecb6156f5d14c5f251714c611264c64c08955469ca3b1e7339a2d84f912739` | `novora-fp-mvp-core-3-24-event-trigger.csv` | `novora-fp-mvp-core-3-24-event-trigger-error.png` |
| 25 | `CORE3-F08-TABLE-TRIGGERS` | 8.8 | `1528` | `8647394e3df2cbc8a8ab95e8a4f7e004e8da1d14e5bed082d8b8995682954ba4` | `novora-fp-mvp-core-3-25-table-triggers.csv` | `novora-fp-mvp-core-3-25-table-triggers-error.png` |
| 26 | `CORE3-FINAL-DATABASE-EXIT` | 9.1 | `8162` | `0c7373c04cec036becb1676b4fed16f0dc6bd72a74a16b08ba78db32c48a3415` | `novora-fp-mvp-core-3-26-final-database-exit.csv` | `novora-fp-mvp-core-3-26-final-database-exit-error.png` |

After Step 26 PASS or any earlier STOP, execute no more SQL pending independent
reconciliation and creation of external sanitized manifest
`novora-fp-mvp-core-3-27-manifest-v1.json`.

## 5. Universal STOP rules

STOP immediately and mark every later statement `not_run` on any project,
environment, database, schema, current-role, session-role, recovery-state,
row-limit, quiet-window, target-control, source identity, packet identity,
statement name/order, canonical byte/hash, relation/OID, object/OID, definition,
validation, deferrability, index uniqueness/validity/readiness/liveness, row,
header, duplicate, aggregate, ownership, privilege, default privilege, RLS,
policy, routine, trigger, lock, completeness, truncation, privacy, filename,
warning, SQL error, transport/fetch error, or export mismatch.

## 6. Preflight SQL

### 6.1 CORE3-P01-CONTEXT

```sql
WITH target_relations AS (
  SELECT
    relation.oid AS relation_oid,
    relation.relname AS table_name,
    pg_catalog.pg_get_userbyid(relation.relowner) AS table_owner,
    relation.relkind,
    relation.relpersistence,
    relation.relrowsecurity,
    relation.relforcerowsecurity
  FROM pg_catalog.pg_class relation
  JOIN pg_catalog.pg_namespace namespace ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname IN ('ai_sketch_jobs', 'ai_sketch_outputs', 'ai_sketch_reviews')
    AND relation.relkind IN ('r', 'p')
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
  target.table_name,
  target.relation_oid::text AS relation_oid,
  target.table_owner,
  target.relkind,
  target.relpersistence,
  target.relrowsecurity AS rls_enabled,
  target.relforcerowsecurity AS rls_forced,
  (SELECT count(*) FROM pg_catalog.pg_policy policy WHERE policy.polrelid = target.relation_oid) AS policy_count,
  (SELECT count(*) FROM target_relations) AS approved_relation_count,
  (SELECT count(*)
   FROM pg_catalog.pg_class relation
   JOIN pg_catalog.pg_namespace namespace ON namespace.oid = relation.relnamespace
   WHERE relation.relname IN ('ai_sketch_jobs', 'ai_sketch_outputs', 'ai_sketch_reviews')
     AND namespace.nspname <> 'public') AS same_name_nonapproved_schema_relation_count,
  (SELECT other_backend_target_lock_count FROM target_locks) AS other_backend_target_lock_count
FROM target_relations target
ORDER BY target.table_name;
```

PASS is exactly three rows: `postgres/public/postgres/postgres/false`; relation
OIDs `17602`, `17619`, `17641`; owner `postgres`; ordinary permanent tables;
RLS true; FORCE RLS false; zero policies; approved relation count three; zero
same-name non-approved-schema relations; zero other-backend target locks.

### 6.2 CORE3-P02-CATALOG-PREFLIGHT

Use the exact unfiltered catalog statement in section 7.8. PASS is exactly 33
rows and zero full-row or `(table_name, object_type, object_oid)` duplicates.
The accepted 16 baseline objects and 17 Core objects must retain the exact
relation/object OIDs and definitions recorded by the completed Core-2 manifest.
All seven Core constraints must be unvalidated, non-deferrable, and not
initially deferred; all ten Core indexes must have the required uniqueness and
be valid, ready, and live. Any additional or missing object is STOP.

### 6.3 CORE3-P03-DATA-PREFLIGHT

```sql
SELECT
  (SELECT count(*) FROM public.ai_sketch_jobs) AS total_job_count,
  (SELECT count(*) FROM public.ai_sketch_outputs) AS total_output_count,
  (SELECT count(*) FROM public.ai_sketch_reviews) AS total_review_count,
  (SELECT count(*) FROM public.ai_sketch_jobs job
   WHERE NOT ((job.status IS NOT NULL AND job.status = ANY (ARRAY['draft'::text, 'queued'::text, 'processing'::text, 'succeeded'::text, 'failed'::text, 'timed_out'::text, 'cancelled'::text])) IS TRUE)) AS invalid_job_status_count,
  (SELECT count(*) FROM public.ai_sketch_jobs job
   WHERE NOT ((NOT job.status IS DISTINCT FROM 'draft'::text
     AND num_nonnulls(job.generation_purpose, job.idempotency_key, job.attempt_number, job.lineage_identity, job.parent_job_id, job.parent_generation_purpose, job.parent_attempt_number, job.source_output_id, job.design_spec_version, job.design_spec_hash, job.hand_sketch_instruction_version, job.hand_sketch_instruction_hash) = 0
     OR job.status IS DISTINCT FROM 'draft'::text
     AND NOT job.generation_purpose IS DISTINCT FROM 'first_preview'::text
     AND job.attempt_number = ANY (ARRAY[1, 2])
     AND job.idempotency_key ~ '^[0-9a-f]{64}$'::text
     AND NOT job.lineage_identity IS DISTINCT FROM 'first-preview:v1'::text
     AND job.design_spec_version IS NOT NULL AND btrim(job.design_spec_version) <> ''::text
     AND job.design_spec_hash ~ '^[0-9a-f]{64}$'::text
     AND job.hand_sketch_instruction_version IS NOT NULL AND btrim(job.hand_sketch_instruction_version) <> ''::text
     AND job.hand_sketch_instruction_hash ~ '^[0-9a-f]{64}$'::text
     AND (job.attempt_number = 1 AND job.parent_job_id IS NULL AND job.parent_generation_purpose IS NULL AND job.parent_attempt_number IS NULL AND job.source_output_id IS NULL
       OR job.attempt_number = 2 AND job.parent_job_id IS NOT NULL AND NOT job.parent_generation_purpose IS DISTINCT FROM 'first_preview'::text AND NOT job.parent_attempt_number IS DISTINCT FROM 1 AND job.source_output_id IS NULL)) IS TRUE)) AS invalid_job_identity_count,
  (SELECT count(*) FROM public.ai_sketch_outputs output
   WHERE NOT ((output.readiness_status IS NULL OR output.readiness_status = ANY (ARRAY['not_ready'::text, 'first_preview_ready'::text, 'revoked'::text])) IS TRUE)) AS invalid_output_readiness_status_count,
  (SELECT count(*) FROM public.ai_sketch_outputs output
   WHERE NOT (((output.is_current_customer_preview IS NOT TRUE OR NOT output.readiness_status IS DISTINCT FROM 'first_preview_ready'::text)
     AND (output.readiness_status IS DISTINCT FROM 'first_preview_ready'::text OR output.is_current_customer_preview IS TRUE)
     AND (output.readiness_status IS DISTINCT FROM 'first_preview_ready'::text OR NOT output.asset_validation_status IS DISTINCT FROM 'passed'::text
       AND output.asset_validation_evidence IS NOT NULL AND NOT jsonb_typeof(output.asset_validation_evidence) IS DISTINCT FROM 'object'::text AND output.asset_validation_evidence <> '{}'::jsonb
       AND NOT output.automatic_gate_status IS DISTINCT FROM 'passed'::text
       AND output.automatic_gate_evidence IS NOT NULL AND NOT jsonb_typeof(output.automatic_gate_evidence) IS DISTINCT FROM 'object'::text AND output.automatic_gate_evidence <> '{}'::jsonb
       AND output.automatic_gate_policy_version IS NOT NULL AND btrim(output.automatic_gate_policy_version) <> ''::text
       AND output.asset_created_at IS NOT NULL AND output.asset_validated_at IS NOT NULL AND output.asset_validated_at >= output.asset_created_at
       AND output.automatic_gate_passed_at IS NOT NULL AND output.automatic_gate_passed_at >= output.asset_validated_at
       AND output.first_preview_ready_at IS NOT NULL AND output.first_preview_ready_at >= output.automatic_gate_passed_at
       AND output.readiness_revoked_at IS NULL
       AND NOT output.bucket_name IS DISTINCT FROM 'novora-ai-sketches'::text
       AND output.object_path IS NOT NULL AND btrim(output.object_path) <> ''::text
       AND NOT output.mime_type IS DISTINCT FROM 'image/png'::text
       AND output.byte_size >= 1 AND output.byte_size <= 16777216
       AND NOT output.width_px IS DISTINCT FROM 1024 AND NOT output.height_px IS DISTINCT FROM 1024
       AND output.content_sha256 ~ '^[0-9a-f]{64}$'::text)
     AND (output.readiness_status IS DISTINCT FROM 'revoked'::text OR output.is_current_customer_preview IS NOT TRUE)) IS TRUE)) AS invalid_ready_current_count,
  (SELECT count(*) FROM (SELECT idempotency_key FROM public.ai_sketch_jobs WHERE idempotency_key IS NOT NULL GROUP BY idempotency_key HAVING count(*) > 1) duplicate_rows) AS duplicate_idempotency_count,
  (SELECT count(*) FROM (SELECT concept_brief_id, attempt_number FROM public.ai_sketch_jobs WHERE attempt_number IS NOT NULL GROUP BY concept_brief_id, attempt_number HAVING count(*) > 1) duplicate_rows) AS duplicate_attempt_identity_count,
  (SELECT count(*) FROM (SELECT concept_brief_id, generation_purpose FROM public.ai_sketch_jobs WHERE status = ANY (ARRAY['queued'::text, 'processing'::text]) GROUP BY concept_brief_id, generation_purpose HAVING count(*) > 1) duplicate_rows) AS duplicate_active_purpose_count,
  (SELECT count(*) FROM (SELECT job_id FROM public.ai_sketch_outputs GROUP BY job_id HAVING count(*) > 1) duplicate_rows) AS duplicate_output_job_count,
  (SELECT count(*) FROM (SELECT concept_brief_id FROM public.ai_sketch_outputs WHERE is_current_customer_preview IS TRUE GROUP BY concept_brief_id HAVING count(*) > 1) duplicate_rows) AS duplicate_current_preview_count,
  (SELECT count(*) FROM public.ai_sketch_jobs child
   LEFT JOIN public.ai_sketch_jobs parent ON parent.id = child.parent_job_id AND parent.concept_brief_id = child.concept_brief_id AND parent.generation_purpose = child.parent_generation_purpose AND parent.attempt_number = child.parent_attempt_number
   WHERE child.parent_job_id IS NOT NULL AND child.concept_brief_id IS NOT NULL AND child.parent_generation_purpose IS NOT NULL AND child.parent_attempt_number IS NOT NULL AND parent.id IS NULL) AS parent_lineage_orphan_count,
  (SELECT count(*) FROM public.ai_sketch_outputs output
   LEFT JOIN public.ai_sketch_jobs job ON job.id = output.job_id AND job.concept_brief_id = output.concept_brief_id
   WHERE job.id IS NULL) AS output_job_brief_orphan_count,
  (SELECT count(*) FROM public.ai_sketch_reviews review
   LEFT JOIN public.ai_sketch_outputs output ON output.id = review.ai_sketch_output_id AND output.concept_brief_id = review.concept_brief_id
   WHERE output.id IS NULL) AS review_output_brief_orphan_count;
```

PASS is exactly one complete 15-column aggregate row. Every count is zero. No
row ID, Brief reference, prompt, note, path, URL, image, secret, environment
value, or Provider value may appear.

## 7. Validation and catalog assertion SQL

Every validation must return `Success. No rows returned`. Its following catalog
assertion must return exactly 33 complete rows. Validation state must advance by
exactly one named constraint and nothing else; all previously validated Core
constraints stay validated, later ones stay unvalidated, all seven remain
non-deferrable/not initially deferred, the ten Core indexes remain healthy, and
every baseline/Core OID and definition remains exact. A validated constraint's
catalog definition is the accepted Core-2 definition with only the terminal
`NOT VALID` removed.

### 7.1 CORE3-V01-JOB-STATUS

```sql
ALTER TABLE ONLY public.ai_sketch_jobs VALIDATE CONSTRAINT ai_sketch_jobs_status_check;
```

### 7.2 CORE3-V02-JOB-IDENTITY

```sql
ALTER TABLE ONLY public.ai_sketch_jobs VALIDATE CONSTRAINT ai_sketch_jobs_mvp_core_identity_check;
```

### 7.3 CORE3-V03-OUTPUT-READINESS

```sql
ALTER TABLE ONLY public.ai_sketch_outputs VALIDATE CONSTRAINT ai_sketch_outputs_readiness_status_check;
```

### 7.4 CORE3-V04-OUTPUT-READY-CURRENT

```sql
ALTER TABLE ONLY public.ai_sketch_outputs VALIDATE CONSTRAINT ai_sketch_outputs_mvp_core_ready_current_check;
```

### 7.5 CORE3-V05-PARENT-LINEAGE-FK

```sql
ALTER TABLE ONLY public.ai_sketch_jobs VALIDATE CONSTRAINT ai_sketch_jobs_parent_lineage_fkey;
```

### 7.6 CORE3-V06-OUTPUT-JOB-BRIEF-FK

```sql
ALTER TABLE ONLY public.ai_sketch_outputs VALIDATE CONSTRAINT ai_sketch_outputs_job_brief_fkey;
```

### 7.7 CORE3-V07-REVIEW-OUTPUT-BRIEF-FK

```sql
ALTER TABLE ONLY public.ai_sketch_reviews VALIDATE CONSTRAINT ai_sketch_reviews_output_brief_fkey;
```

### 7.8 CORE3-CATALOG-ASSERTION

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

## 8. Preservation SQL

### 8.1 CORE3-F01-EFFECTIVE-PRIVILEGES

```sql
WITH roles(role_name) AS (
  VALUES ('anon'), ('authenticated'), ('service_role'), ('postgres')
),
tables(table_name) AS (
  VALUES ('admin_notes'), ('ai_sketch_jobs'), ('ai_sketch_outputs'), ('ai_sketch_reviews'), ('concept_brief_reference_assets'), ('concept_briefs')
)
SELECT
  role_name,
  table_name,
  has_table_privilege(role_name, 'public.' || table_name, 'SELECT') AS can_select,
  has_table_privilege(role_name, 'public.' || table_name, 'INSERT') AS can_insert,
  has_table_privilege(role_name, 'public.' || table_name, 'UPDATE') AS can_update,
  has_table_privilege(role_name, 'public.' || table_name, 'DELETE') AS can_delete,
  has_table_privilege(role_name, 'public.' || table_name, 'TRUNCATE') AS can_truncate,
  has_table_privilege(role_name, 'public.' || table_name, 'MAINTAIN') AS can_maintain,
  has_table_privilege(role_name, 'public.' || table_name, 'REFERENCES') AS can_reference,
  has_table_privilege(role_name, 'public.' || table_name, 'TRIGGER') AS can_trigger
FROM roles
CROSS JOIN tables
ORDER BY role_name, table_name;
```

PASS is the exact accepted 24-row Stage A matrix and deterministic content
previously hashed `b1deb77651d7d3cb2ddeb7e4cc2f6856ee8607d1fc8d828c6c2c78611b2a15de`.

### 8.2 CORE3-F02-DIRECT-ACL

```sql
SELECT
  n.nspname AS table_schema,
  c.relname AS table_name,
  pg_catalog.pg_get_userbyid(c.relowner) AS table_owner,
  CASE WHEN acl.grantee = 0 THEN 'PUBLIC' ELSE pg_catalog.pg_get_userbyid(acl.grantee) END AS grantee,
  pg_catalog.pg_get_userbyid(acl.grantor) AS grantor,
  acl.privilege_type,
  acl.is_grantable
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(c.relacl, pg_catalog.acldefault('r', c.relowner))) acl
WHERE n.nspname = 'public'
  AND c.relname IN ('admin_notes', 'ai_sketch_jobs', 'ai_sketch_outputs', 'ai_sketch_reviews', 'concept_brief_reference_assets', 'concept_briefs')
ORDER BY c.relname, grantee, acl.privilege_type, grantor;
```

PASS is exactly 64 rows: 48 `postgres` owner rows and 16 `service_role`
rows, no `anon`, `authenticated`, or `PUBLIC`, no grant option, and exact
accepted content previously hashed
`afc823b93dbd3ed458fcbf4107a6a40b81f66d05b0a07d3921c02b712462b5b8`.

### 8.3 CORE3-F03-RLS-POLICY

```sql
SELECT
  c.relname AS table_name,
  pg_catalog.pg_get_userbyid(c.relowner) AS table_owner,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced,
  (SELECT count(*) FROM pg_catalog.pg_policy p WHERE p.polrelid = c.oid) AS policy_count
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('admin_notes', 'ai_sketch_jobs', 'ai_sketch_outputs', 'ai_sketch_reviews', 'concept_brief_reference_assets', 'concept_briefs')
ORDER BY c.relname;
```

PASS is exactly six rows, owner `postgres`, RLS true, FORCE RLS false, policy
count zero, and accepted deterministic content previously hashed
`95c13f60fce3d8eb34f052196dce6b4cef27f2070b9ea0bbcda703b866d039e2`.

### 8.4 CORE3-F04-POSTGRES-TABLE-DEFAULTS

```sql
WITH target AS (
  SELECT owner_role.oid AS owner_oid, owner_role.rolname AS default_owner, namespace_row.oid AS schema_oid, namespace_row.nspname AS schema_scope
  FROM pg_roles AS owner_role CROSS JOIN pg_namespace AS namespace_row
  WHERE owner_role.rolname = 'postgres' AND namespace_row.nspname = 'public'
),
effective_acl AS (
  SELECT target.default_owner, target.schema_scope,
    (COALESCE((SELECT default_row.defaclacl FROM pg_default_acl AS default_row WHERE default_row.defaclrole = target.owner_oid AND default_row.defaclnamespace = 0 AND default_row.defaclobjtype = 'r'), acldefault('r', target.owner_oid))
     || COALESCE((SELECT default_row.defaclacl FROM pg_default_acl AS default_row WHERE default_row.defaclrole = target.owner_oid AND default_row.defaclnamespace = target.schema_oid AND default_row.defaclobjtype = 'r'), ARRAY[]::aclitem[])) AS acl_items
  FROM target
),
expanded AS (
  SELECT effective_acl.default_owner, effective_acl.schema_scope, exploded.grantee, exploded.grantor, exploded.privilege_type, exploded.is_grantable
  FROM effective_acl CROSS JOIN LATERAL aclexplode(effective_acl.acl_items) AS exploded
)
SELECT
  expanded.default_owner,
  expanded.schema_scope,
  'table'::text AS object_type,
  CASE WHEN expanded.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(expanded.grantee) END AS grantee,
  pg_get_userbyid(expanded.grantor) AS grantor,
  expanded.privilege_type,
  bool_or(expanded.is_grantable) AS is_grantable
FROM expanded
GROUP BY expanded.default_owner, expanded.schema_scope, expanded.grantee, expanded.grantor, expanded.privilege_type
ORDER BY grantee, privilege_type;
```

PASS is exactly eight `postgres` owner rows for all eight table privileges,
grantor `postgres`, no grant option, no other grantee, and accepted deterministic
content previously hashed
`80d45a37ff4ed3e69a1d922acdde8066e54918a616bf3670b9c56815cd93c14d`.

### 8.5 CORE3-F05-UNRELATED-DEFAULTS

```sql
WITH requested_defaults(default_owner, object_type, object_type_code) AS (
  VALUES ('postgres', 'function', 'f'::"char"), ('supabase_admin', 'table', 'r'::"char"), ('supabase_admin', 'function', 'f'::"char")
),
targets AS (
  SELECT requested_defaults.default_owner, requested_defaults.object_type, requested_defaults.object_type_code, owner_role.oid AS owner_oid, namespace_row.oid AS schema_oid, namespace_row.nspname AS schema_scope
  FROM requested_defaults JOIN pg_roles AS owner_role ON owner_role.rolname = requested_defaults.default_owner
  CROSS JOIN pg_namespace AS namespace_row WHERE namespace_row.nspname = 'public'
),
effective_acls AS (
  SELECT targets.default_owner, targets.schema_scope, targets.object_type,
    (COALESCE((SELECT default_row.defaclacl FROM pg_default_acl AS default_row WHERE default_row.defaclrole = targets.owner_oid AND default_row.defaclnamespace = 0 AND default_row.defaclobjtype = targets.object_type_code), acldefault(targets.object_type_code, targets.owner_oid))
     || COALESCE((SELECT default_row.defaclacl FROM pg_default_acl AS default_row WHERE default_row.defaclrole = targets.owner_oid AND default_row.defaclnamespace = targets.schema_oid AND default_row.defaclobjtype = targets.object_type_code), ARRAY[]::aclitem[])) AS acl_items
  FROM targets
),
expanded AS (
  SELECT effective_acls.default_owner, effective_acls.schema_scope, effective_acls.object_type, exploded.grantee, exploded.grantor, exploded.privilege_type, exploded.is_grantable
  FROM effective_acls CROSS JOIN LATERAL aclexplode(effective_acls.acl_items) AS exploded
)
SELECT
  expanded.default_owner,
  expanded.schema_scope,
  expanded.object_type,
  CASE WHEN expanded.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(expanded.grantee) END AS grantee,
  pg_get_userbyid(expanded.grantor) AS grantor,
  expanded.privilege_type,
  bool_or(expanded.is_grantable) AS is_grantable
FROM expanded
GROUP BY expanded.default_owner, expanded.schema_scope, expanded.object_type, expanded.grantee, expanded.grantor, expanded.privilege_type
ORDER BY default_owner, object_type, grantee, privilege_type;
```

PASS is exactly 48 accepted rows: `postgres` function 2,
`supabase_admin` table 40, `supabase_admin` function 6, no grant option, and
deterministic content previously hashed
`342cc991084f54f3a02e63129923a55fc1183fe3ba5c4cb2f79113d1cb7e51ac`.

### 8.6 CORE3-F06-ROUTINES

```sql
SELECT
  n.nspname AS routine_schema,
  p.proname AS routine_name,
  pg_catalog.pg_get_function_identity_arguments(p.oid) AS identity_arguments,
  pg_catalog.pg_get_userbyid(p.proowner) AS routine_owner,
  p.prosecdef AS security_definer,
  p.proconfig AS routine_config,
  has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_can_execute,
  has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_role_can_execute,
  has_function_privilege('authenticator', p.oid, 'EXECUTE') AS authenticator_can_execute,
  has_function_privilege('postgres', p.oid, 'EXECUTE') AS postgres_can_execute,
  pg_catalog.pg_get_functiondef(p.oid) AS exact_definition
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname IN ('rls_auto_enable', 'set_updated_at')
ORDER BY p.proname;
```

PASS is the exact accepted two-row definitions, owners, security modes,
configuration, and EXECUTE posture previously hashed
`a19b99537dae388b360cebb44f8378c8a9a2ed0d2377a258ad4cd37506a6e039`.

### 8.7 CORE3-F07-EVENT-TRIGGER

```sql
SELECT
  e.evtname AS event_trigger_name,
  e.evtevent AS event_name,
  e.evtenabled AS enabled_code,
  e.evttags AS command_tags,
  n.nspname AS routine_schema,
  p.proname AS routine_name,
  pg_catalog.pg_get_userbyid(p.proowner) AS routine_owner,
  p.prosecdef AS security_definer
FROM pg_catalog.pg_event_trigger e
JOIN pg_catalog.pg_proc p ON p.oid = e.evtfoid
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE e.evtname = 'ensure_rls';
```

PASS is the exact single enabled `ensure_rls` row previously hashed
`6a5c4c9f6f86c6f6c0221dbc1ffc4214b55d498f8f62d0d945cb3010e2590d99`.

### 8.8 CORE3-F08-TABLE-TRIGGERS

```sql
SELECT
  table_ns.nspname AS table_schema,
  table_rel.relname AS table_name,
  trig.tgname AS trigger_name,
  CASE
    WHEN (trig.tgtype & 64) = 64 THEN 'instead_of'
    WHEN (trig.tgtype & 2) = 2 THEN 'before'
    ELSE 'after'
  END AS timing,
  (trig.tgtype & 1) = 1 AS row_level,
  (trig.tgtype & 4) = 4 AS fires_on_row_add,
  (trig.tgtype & 16) = 16 AS fires_on_row_change,
  (trig.tgtype & 8) = 8 AS fires_on_row_remove,
  (trig.tgtype & 32) = 32 AS fires_on_statement_clear,
  CASE trig.tgenabled
    WHEN 'O' THEN 'origin_and_local'
    WHEN 'D' THEN 'disabled'
    WHEN 'R' THEN 'replica'
    WHEN 'A' THEN 'always'
    ELSE trig.tgenabled::text
  END AS enabled_state,
  function_ns.nspname AS function_schema,
  proc.proname AS function_name,
  pg_catalog.pg_get_function_identity_arguments(proc.oid) AS function_arguments,
  proc.prosecdef AS function_runs_with_owner_privilege,
  pg_catalog.pg_get_triggerdef(trig.oid, true) AS exact_definition
FROM pg_catalog.pg_trigger trig
JOIN pg_catalog.pg_class table_rel ON table_rel.oid = trig.tgrelid
JOIN pg_catalog.pg_namespace table_ns ON table_ns.oid = table_rel.relnamespace
JOIN pg_catalog.pg_proc proc ON proc.oid = trig.tgfoid
JOIN pg_catalog.pg_namespace function_ns ON function_ns.oid = proc.pronamespace
WHERE table_ns.nspname = 'public'
  AND table_rel.relname IN ('ai_sketch_jobs', 'ai_sketch_outputs', 'ai_sketch_reviews', 'concept_briefs', 'concept_brief_reference_assets', 'admin_notes')
  AND NOT trig.tgisinternal
ORDER BY table_rel.relname, trig.tgname;
```

PASS is the exact unfiltered two-row accepted trigger inventory: enabled
before-update row triggers `set_ai_sketch_jobs_updated_at` and
`set_concept_briefs_updated_at`, both invoking the invoker-security
`public.set_updated_at()` function with the accepted exact definitions. There
must be no additional non-internal trigger on any of the six approved tables.
The accepted deterministic inventory was previously hashed
`9a543349165874c89e3043cd0c97ac23e42740f7f2f4f87f96813ebe37588307`.

## 9. Final database-exit SQL

### 9.1 CORE3-FINAL-DATABASE-EXIT

```sql
WITH expected_relations(table_name, relation_oid) AS (
  VALUES ('ai_sketch_jobs', 17602::oid), ('ai_sketch_outputs', 17619::oid), ('ai_sketch_reviews', 17641::oid)
),
target_relations AS (
  SELECT relation.oid AS relation_oid, relation.relname AS table_name, relation.relowner, relation.relkind, relation.relpersistence, relation.relrowsecurity, relation.relforcerowsecurity
  FROM pg_catalog.pg_class relation JOIN pg_catalog.pg_namespace namespace ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public' AND relation.relname IN ('ai_sketch_jobs', 'ai_sketch_outputs', 'ai_sketch_reviews') AND relation.relkind IN ('r', 'p')
),
core_constraints(table_name, object_name, object_oid) AS (
  VALUES
    ('ai_sketch_jobs', 'ai_sketch_jobs_status_check', 25460::oid),
    ('ai_sketch_jobs', 'ai_sketch_jobs_mvp_core_identity_check', 25461::oid),
    ('ai_sketch_outputs', 'ai_sketch_outputs_readiness_status_check', 25462::oid),
    ('ai_sketch_outputs', 'ai_sketch_outputs_mvp_core_ready_current_check', 25463::oid),
    ('ai_sketch_jobs', 'ai_sketch_jobs_parent_lineage_fkey', 25474::oid),
    ('ai_sketch_outputs', 'ai_sketch_outputs_job_brief_fkey', 25479::oid),
    ('ai_sketch_reviews', 'ai_sketch_reviews_output_brief_fkey', 25484::oid)
),
core_indexes(table_name, object_name, object_oid, expected_unique) AS (
  VALUES
    ('ai_sketch_jobs', 'ai_sketch_jobs_id_brief_uidx', 25464::oid, true),
    ('ai_sketch_jobs', 'ai_sketch_jobs_parent_lineage_target_uidx', 25465::oid, true),
    ('ai_sketch_outputs', 'ai_sketch_outputs_id_brief_uidx', 25466::oid, true),
    ('ai_sketch_jobs', 'ai_sketch_jobs_idempotency_key_uidx', 25467::oid, true),
    ('ai_sketch_jobs', 'ai_sketch_jobs_attempt_identity_uidx', 25468::oid, true),
    ('ai_sketch_jobs', 'ai_sketch_jobs_one_active_purpose_uidx', 25469::oid, true),
    ('ai_sketch_outputs', 'ai_sketch_outputs_one_per_job_uidx', 25470::oid, true),
    ('ai_sketch_outputs', 'ai_sketch_outputs_one_current_customer_preview_uidx', 25471::oid, true),
    ('ai_sketch_jobs', 'ai_sketch_jobs_parent_job_id_idx', 25472::oid, false),
    ('ai_sketch_reviews', 'ai_sketch_reviews_ai_sketch_output_id_idx', 25473::oid, false)
),
actual_objects AS (
  SELECT target.table_name, 'constraint'::text AS object_type, constraint_object.oid AS object_oid, constraint_object.conname AS object_name
  FROM target_relations target JOIN pg_catalog.pg_constraint constraint_object ON constraint_object.conrelid = target.relation_oid
  UNION ALL
  SELECT target.table_name, 'index'::text, index_relation.oid, index_relation.relname
  FROM target_relations target JOIN pg_catalog.pg_index index_metadata ON index_metadata.indrelid = target.relation_oid
  JOIN pg_catalog.pg_class index_relation ON index_relation.oid = index_metadata.indexrelid
),
roles(role_name) AS (VALUES ('anon'), ('authenticated'), ('service_role'), ('postgres')),
tables(table_name) AS (VALUES ('admin_notes'), ('ai_sketch_jobs'), ('ai_sketch_outputs'), ('ai_sketch_reviews'), ('concept_brief_reference_assets'), ('concept_briefs')),
privileges(privilege_name) AS (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'), ('MAINTAIN'), ('REFERENCES'), ('TRIGGER')),
expected_privileges AS (
  SELECT roles.role_name, tables.table_name, privileges.privilege_name,
    CASE WHEN roles.role_name = 'postgres' THEN true
      WHEN roles.role_name IN ('anon', 'authenticated') THEN false
      WHEN privileges.privilege_name IN ('TRUNCATE', 'MAINTAIN', 'REFERENCES', 'TRIGGER') THEN false
      WHEN tables.table_name IN ('ai_sketch_jobs', 'ai_sketch_outputs', 'ai_sketch_reviews') AND privileges.privilege_name IN ('SELECT', 'INSERT', 'UPDATE') THEN true
      WHEN tables.table_name IN ('admin_notes', 'concept_brief_reference_assets') AND privileges.privilege_name IN ('SELECT', 'INSERT') THEN true
      WHEN tables.table_name = 'concept_briefs' AND privileges.privilege_name IN ('SELECT', 'INSERT', 'DELETE') THEN true
      ELSE false END AS expected_value
  FROM roles CROSS JOIN tables CROSS JOIN privileges
)
SELECT
  current_database() AS database_name,
  current_schema() AS current_schema_name,
  current_user AS current_role,
  session_user AS session_role,
  pg_catalog.pg_is_in_recovery() AS server_is_in_recovery,
  (SELECT count(*) FROM target_relations) AS actual_relation_count,
  (SELECT count(*) FROM expected_relations expected LEFT JOIN target_relations actual ON actual.table_name = expected.table_name AND actual.relation_oid = expected.relation_oid WHERE actual.relation_oid IS NULL OR actual.relowner IS DISTINCT FROM (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = 'postgres') OR actual.relkind IS DISTINCT FROM 'r'::"char" OR actual.relpersistence IS DISTINCT FROM 'p'::"char" OR actual.relrowsecurity IS NOT TRUE OR actual.relforcerowsecurity IS NOT FALSE) AS relation_posture_mismatch_count,
  (SELECT count(*) FROM actual_objects) AS actual_target_object_count,
  (SELECT count(*) FROM core_constraints expected JOIN target_relations target ON target.table_name = expected.table_name JOIN pg_catalog.pg_constraint actual ON actual.conrelid = target.relation_oid AND actual.conname = expected.object_name AND actual.oid = expected.object_oid WHERE actual.convalidated IS TRUE AND actual.condeferrable IS FALSE AND actual.condeferred IS FALSE) AS validated_core_constraint_count,
  (SELECT count(*) FROM core_indexes expected JOIN target_relations target ON target.table_name = expected.table_name JOIN pg_catalog.pg_class index_relation ON index_relation.relnamespace = (SELECT oid FROM pg_catalog.pg_namespace WHERE nspname = 'public') AND index_relation.relname = expected.object_name AND index_relation.oid = expected.object_oid JOIN pg_catalog.pg_index actual ON actual.indexrelid = index_relation.oid AND actual.indrelid = target.relation_oid WHERE actual.indisunique IS NOT DISTINCT FROM expected.expected_unique AND actual.indisvalid IS TRUE AND actual.indisready IS TRUE AND actual.indislive IS TRUE) AS healthy_core_index_count,
  (SELECT count(*) FROM public.ai_sketch_jobs) AS total_job_count,
  (SELECT count(*) FROM public.ai_sketch_outputs) AS total_output_count,
  (SELECT count(*) FROM public.ai_sketch_reviews) AS total_review_count,
  (SELECT count(*) FROM expected_privileges expected WHERE has_table_privilege(expected.role_name, 'public.' || expected.table_name, expected.privilege_name) IS DISTINCT FROM expected.expected_value) AS privilege_mismatch_count,
  (SELECT count(*) FROM pg_catalog.pg_class relation JOIN pg_catalog.pg_namespace namespace ON namespace.oid = relation.relnamespace WHERE namespace.nspname = 'public' AND relation.relname IN ('admin_notes', 'ai_sketch_jobs', 'ai_sketch_outputs', 'ai_sketch_reviews', 'concept_brief_reference_assets', 'concept_briefs') AND (pg_catalog.pg_get_userbyid(relation.relowner) <> 'postgres' OR relation.relrowsecurity IS NOT TRUE OR relation.relforcerowsecurity IS NOT FALSE OR EXISTS (SELECT 1 FROM pg_catalog.pg_policy policy WHERE policy.polrelid = relation.oid))) AS rls_policy_mismatch_count,
  (SELECT count(*) FROM pg_catalog.pg_proc routine JOIN pg_catalog.pg_namespace namespace ON namespace.oid = routine.pronamespace WHERE namespace.nspname = 'public' AND routine.proname IN ('rls_auto_enable', 'set_updated_at')) AS preserved_routine_count,
  (SELECT count(*) FROM pg_catalog.pg_event_trigger event_trigger WHERE event_trigger.evtname = 'ensure_rls') AS preserved_event_trigger_count,
  (SELECT count(*) FROM pg_catalog.pg_trigger trigger_row JOIN pg_catalog.pg_class target ON target.oid = trigger_row.tgrelid JOIN pg_catalog.pg_namespace namespace ON namespace.oid = target.relnamespace WHERE NOT trigger_row.tgisinternal AND namespace.nspname = 'public' AND target.relname IN ('admin_notes', 'ai_sketch_jobs', 'ai_sketch_outputs', 'ai_sketch_reviews', 'concept_brief_reference_assets', 'concept_briefs')) AS preserved_table_trigger_count,
  (SELECT count(*) FROM pg_catalog.pg_locks lock_object WHERE lock_object.locktype = 'relation' AND lock_object.relation IN (SELECT relation_oid FROM target_relations) AND lock_object.pid IS DISTINCT FROM pg_catalog.pg_backend_pid()) AS other_backend_target_lock_count;
```

PASS is exactly one complete row:

- `postgres`, `public`, `postgres`, `postgres`, `false`;
- actual relation count `3`; relation posture mismatches `0`;
- actual target object count `33`;
- validated Core constraint count `7`;
- healthy Core index count `10`;
- total Jobs, Outputs, and Reviews each `0`;
- privilege and RLS/policy mismatch counts `0`;
- preserved routine, event-trigger, and table-trigger counts `2`, `1`, `2`;
- other-backend target lock count `0`.

The complete sequence evidence, not this summary row alone, proves exact object
definitions, zero data violations, direct ACLs, default privileges, and exact
routine/trigger definitions.

## 10. Database exit decision

Only independent reconciliation of Phase 0 plus all 26 statement artifacts may
record:

- `MVP-CORE-3 = PASS`;
- `FIRST_PREVIEW_MVP_DATABASE_CORE = COMPLETE`;
- `POST_MVP_DATABASE_HARDENING = DEFERRED_NOT_EXECUTED`.

Until that reconciliation is merged, database Core remains incomplete and
application integration must not begin. After it is merged PASS, no additional
planning-only database loop may block the separately scoped application work.

## 11. Explicit exclusions

This packet does not authorize any SQL until separately approved. Even after
approval it authorizes only the exact Phase 0 plus 26-statement sequence above.
It excludes:

- block 23.7 or any validation beyond the seven named Core constraints;
- any constraint/index create, drop, rename, recreate, or definition change;
- DML, data edits, DELETE, backfill, repair, compensation, retry, rerun,
  rollback, cleanup, replacement SQL, ad hoc query, transaction wrapper,
  `IF NOT EXISTS`, or `CONCURRENTLY`;
- deferred feedback attempt 2-3 lineage, extended parent/source chains,
  Provider-request or cost/pricing enforcement, full revocation chronology,
  unused support indexes, or any other `POST_MVP_HARDENING`;
- ACL, grant, revoke, ownership, default-privilege, RLS, policy, routine,
  function, trigger, Data API, or Storage change;
- customer/business-row inspection beyond the exact aggregate queries;
- Provider/generated-asset action, credentials, environment configuration,
  deployment, application rollout, email, payment, or customer-visible action;
- any Codex, MCP, CLI, script, automation, or tool connection to Supabase or
  SQL execution;
- branch, worktree, evidence, artifact, or other deletion.

Raw evidence remains external and must never be copied into Git.
