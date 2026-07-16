# NOVORA First Preview Schema Phase A - Owner Manual Execution Sequence v1

Date approved: 2026-07-16

Status: **APPROVED FOR OWNER MANUAL EXECUTION - NOT EXECUTED**

## 1. Purpose and non-automation boundary

This run sheet records the Owner's exact Phase A approval and presents the complete manual sequence. Codex must not connect to Supabase, control the SQL Editor, execute SQL, inspect customer/business rows beyond the approved aggregates, or treat this approval as evidence of execution.

The only authoritative SQL sources remain the frozen packet and Agent 70B-2 source identified below. This run sheet is a mechanically derived execution aid. Before every statement, the Owner must recompute its canonical SHA-256 and prove it equals the listed value. Any text or hash difference is a STOP; do not repair or improvise SQL.

## 2. Immutable identities

- Repository: `youdiangete-dot/novora-site`
- Approved `origin/main`: `24c37f54173cf6e9cd82de7bf30b058d166adea4`
- PR #203 reviewed head: `afc27974bed4f814da0a7888705315dfe228efab`
- Owner Execution Packet v1 path: `docs/novora-first-preview-additive-schema-owner-execution-packet-v1.md`
- Packet Git blob: `d347663d740cc766eb07c9c93b9130d16fc9f51f`
- Packet raw-byte SHA-256: `4d36aaba11391eb1aa37a259027d8f50cc63723807755f3c0e1d3d2e832e3b04`
- Frozen Agent 70B-2 source path: `docs/novora-agent-70b2-first-preview-live-schema-review-and-additive-sql-plan-v1.md`
- Source Git blob: `714a30d16760dc98602dcbd8dc92d8785895811c`
- Source raw-byte SHA-256: `4763a425a9e22098a3dd43d3773c8352d83fd201b72d48dd116d7f9619cceecc`
- Supabase project: `novora-production`
- Database: Primary Database (`postgres`)
- Schema: `public`
- Execution role: `postgres`
- Minimum SQL Editor row limit: `1000`

## 3. Recorded Owner approval

> APPROVE NOVORA FIRST PREVIEW SCHEMA PHASE A against novora-production, Primary Database (postgres), schema public, executed as postgres, using origin/main commit 24c37f54173cf6e9cd82de7bf30b058d166adea4, PR #203 reviewed head afc27974bed4f814da0a7888705315dfe228efab, Owner Execution Packet v1 blob d347663d740cc766eb07c9c93b9130d16fc9f51f with SHA-256 4d36aaba11391eb1aa37a259027d8f50cc63723807755f3c0e1d3d2e832e3b04, and frozen Agent 70B-2 source blob 714a30d16760dc98602dcbd8dc92d8785895811c with SHA-256 4763a425a9e22098a3dd43d3773c8352d83fd201b72d48dd116d7f9619cceecc.
>
> Approval is limited to Phase 0, exact SELECT-only C01-C04, M01-M06, B01-B07, B15, B17, exact candidate blocks 23.1-23.6 with the 18 listed canonical statement hashes, required intermediate B08-B14, B16, B18-B19, and post-execution V01-V05.
>
> Block 23.7 constraint validation, rollback, cleanup, data edits, DELETE, backfill, ACL/default-privilege/RLS/policy/Storage changes, Provider calls, application rollout, deployment, customer-data inspection beyond the approved aggregates, and customer-visible behavior are not approved.

## 4. Canonical SHA-256 algorithm

For every SQL statement: normalize CRLF/CR to LF; trim complete-statement leading/trailing whitespace; require and remove exactly one terminal semicolon; trim the remaining body; append exactly one semicolon and one LF; hash those UTF-8 bytes without a BOM. The SQL submitted to the Editor must be the complete statement shown below, unchanged and without a transaction wrapper.

## 5. Universal STOP conditions

Stop immediately on any project/database/schema/role/row-limit mismatch; packet/source/blob/hash drift; missing or truncated output; catalog/access/semantic drift; unexpected row or value; threshold breach; lock; hash mismatch; SQL error or warning; incomplete evidence; unreviewed live-schema change; or failure of a listed expected result. Preserve the exact state and evidence. Do not edit or retry SQL, terminate another session, drop/delete/backfill/repair/validate, run block 23.7, roll back, or clean up without a new reviewed packet and explicit approval.

## 6. Phase 0 - visual context only

Capture `novora-fp-phase-a-00-context.png`, visibly showing `novora-production`, Primary Database (`postgres`), role `postgres`, and row limit at least `1000`, with no key, environment value, customer data, prompt, image, unrelated SQL, or secret. STOP on any mismatch.

## 7. Exact SQL execution sequence

### 01 - C01

- Source: Owner Execution Packet v1 section 7.1
- Canonical SHA-256: `942029fb8aee8d593150e03b98333a62aaccb8511d1d6c8d44defbb8b812d9bf`
- Evidence: `novora-fp-phase-a-01-c01.csv`
- Expected result: Exactly 17 baseline column rows: nine for ai_sketch_jobs and eight for ai_sketch_outputs, with the frozen names, types, nullability, and defaults; every candidate and unexpected column is absent.
- STOP: any canonical-hash mismatch, SQL error or warning, missing/truncated result, or failure of the expected result above.

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

### 02 - C02

- Source: Owner Execution Packet v1 section 7.1
- Canonical SHA-256: `62ab1fa06db9ff9e9a727d110de9b3b78e30b158aadd1987f6e20dcc2e2f3ad2`
- Evidence: `novora-fp-phase-a-02-c02.csv`
- Expected result: The complete current index catalog for the three affected tables exactly matches the frozen Q05 baseline; every candidate name and equivalent candidate definition is absent, and every baseline index is valid, ready, and live as recorded.
- STOP: any canonical-hash mismatch, SQL error or warning, missing/truncated result, or failure of the expected result above.

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

### 03 - C03

- Source: Owner Execution Packet v1 section 7.1
- Canonical SHA-256: `b962dd936744916de446cbf28a1583769c863d309c2fed35098021f5f639ca9b`
- Evidence: `novora-fp-phase-a-03-c03.csv`
- Expected result: Exactly three table rows. Each total_relation_bytes value is at most 67108864 and each exact_row_count is at most 10000. No row values or identities are returned.
- STOP: any canonical-hash mismatch, SQL error or warning, missing/truncated result, or failure of the expected result above.

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

### 04 - M01

- Source: Frozen Agent 70B-2 source heading M01
- Canonical SHA-256: `03ad56a7e1c7f965f7972f84595df18da8fb0a58fa5988906a2f842894d814d5`
- Evidence: `novora-fp-phase-a-04-m01.csv`
- Expected result: Exactly the six approved public tables are returned and every owner is postgres.
- STOP: any canonical-hash mismatch, SQL error or warning, missing/truncated result, or failure of the expected result above.

```sql
SELECT
  n.nspname AS table_schema,
  c.relname AS table_name,
  pg_catalog.pg_get_userbyid(c.relowner) AS table_owner
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'ai_sketch_jobs', 'ai_sketch_outputs', 'ai_sketch_reviews',
    'concept_briefs', 'concept_brief_reference_assets', 'admin_notes'
  )
  AND c.relkind = 'r'
ORDER BY c.relname;
```

### 05 - M02

- Source: Frozen Agent 70B-2 source heading M02
- Canonical SHA-256: `70eebd62612586e6e76338a1e9c75268d01021f6e8e2ba20e37a44d15aa9a010`
- Evidence: `novora-fp-phase-a-05-m02.csv`
- Expected result: The reviewed role-attribute and BYPASSRLS posture is unchanged; no attribute drift broadens the Stage A access posture.
- STOP: any canonical-hash mismatch, SQL error or warning, missing/truncated result, or failure of the expected result above.

```sql
SELECT
  rolname,
  rolsuper,
  rolinherit,
  rolcanlogin,
  rolbypassrls
FROM pg_catalog.pg_roles
WHERE rolname IN ('anon', 'authenticated', 'service_role', 'postgres')
ORDER BY rolname;
```

### 06 - M03

- Source: Frozen Agent 70B-2 source heading M03
- Canonical SHA-256: `fdc2eecd481f69deb262eb35390495ed90a383a7d208131909b2c9566b8dd74c`
- Evidence: `novora-fp-phase-a-06-m03.csv`
- Expected result: Relevant role membership exactly matches the frozen Stage A evidence and creates no unreviewed inherited privilege path.
- STOP: any canonical-hash mismatch, SQL error or warning, missing/truncated result, or failure of the expected result above.

```sql
SELECT
  granted.rolname AS granted_role,
  member.rolname AS member_role,
  grantor.rolname AS grantor_role,
  membership.admin_option
FROM pg_catalog.pg_auth_members membership
JOIN pg_catalog.pg_roles granted ON granted.oid = membership.roleid
JOIN pg_catalog.pg_roles member ON member.oid = membership.member
JOIN pg_catalog.pg_roles grantor ON grantor.oid = membership.grantor
WHERE granted.rolname IN ('anon', 'authenticated', 'service_role', 'postgres')
   OR member.rolname IN ('anon', 'authenticated', 'service_role', 'postgres')
ORDER BY granted.rolname, member.rolname;
```

### 07 - M04

- Source: Frozen Agent 70B-2 source heading M04
- Canonical SHA-256: `88079b80be9b150a3313d152aaf4da5dc328c0448bfc3d2322757aeac7348191`
- Evidence: `novora-fp-phase-a-07-m04.csv`
- Expected result: The complete effective DML matrix exactly matches the completed Stage A privilege matrix.
- STOP: any canonical-hash mismatch, SQL error or warning, missing/truncated result, or failure of the expected result above.

```sql
WITH roles(role_name) AS (
  VALUES ('service_role'), ('anon'), ('authenticated')
), approved_tables(table_name) AS (
  VALUES
    ('ai_sketch_jobs'), ('ai_sketch_outputs'), ('ai_sketch_reviews'),
    ('concept_briefs'), ('concept_brief_reference_assets'), ('admin_notes')
)
SELECT
  roles.role_name,
  approved_tables.table_name,
  has_table_privilege(roles.role_name, 'public.' || approved_tables.table_name, 'SELECT') AS can_select,
  has_table_privilege(roles.role_name, 'public.' || approved_tables.table_name, 'INSERT') AS can_insert,
  has_table_privilege(roles.role_name, 'public.' || approved_tables.table_name, 'UPDATE') AS can_update,
  has_table_privilege(roles.role_name, 'public.' || approved_tables.table_name, 'DELETE') AS can_delete
FROM roles CROSS JOIN approved_tables
ORDER BY roles.role_name, approved_tables.table_name;
```

### 08 - M05

- Source: Frozen Agent 70B-2 source heading M05
- Canonical SHA-256: `6716fd72b1392be20d03404839c9becf656dc438a60822e4dbcb5bd0e4761109`
- Evidence: `novora-fp-phase-a-08-m05.csv`
- Expected result: anon, authenticated, and service_role have no effective TRUNCATE privilege on any of the six approved tables.
- STOP: any canonical-hash mismatch, SQL error or warning, missing/truncated result, or failure of the expected result above.

```sql
WITH roles(role_name) AS (
  VALUES ('service_role'), ('anon'), ('authenticated')
), approved_tables(table_name) AS (
  VALUES
    ('ai_sketch_jobs'), ('ai_sketch_outputs'), ('ai_sketch_reviews'),
    ('concept_briefs'), ('concept_brief_reference_assets'), ('admin_notes')
)
SELECT
  roles.role_name,
  approved_tables.table_name,
  has_table_privilege(roles.role_name, 'public.' || approved_tables.table_name, 'TRUNCATE') AS can_truncate
FROM roles CROSS JOIN approved_tables
ORDER BY roles.role_name, approved_tables.table_name;
```

### 09 - M06

- Source: Frozen Agent 70B-2 source heading M06
- Canonical SHA-256: `a7282515ace0354f60a24ae403603c6333312e48f929a8695caab7c255ba73c7`
- Evidence: `novora-fp-phase-a-09-m06.csv`
- Expected result: Ownership, RLS, FORCE RLS, policy count, schema usage, and role posture exactly match the reviewed Stage A evidence.
- STOP: any canonical-hash mismatch, SQL error or warning, missing/truncated result, or failure of the expected result above.

```sql
WITH roles AS (
  SELECT rolname, rolbypassrls
  FROM pg_catalog.pg_roles
  WHERE rolname IN ('service_role', 'anon', 'authenticated')
), tables AS (
  SELECT
    c.oid,
    c.relname AS table_name,
    pg_catalog.pg_get_userbyid(c.relowner) AS table_owner,
    c.relrowsecurity AS rls_enabled,
    c.relforcerowsecurity AS rls_forced,
    (SELECT count(*) FROM pg_catalog.pg_policy p WHERE p.polrelid = c.oid) AS policy_count
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN (
      'ai_sketch_jobs', 'ai_sketch_outputs', 'ai_sketch_reviews',
      'concept_briefs', 'concept_brief_reference_assets', 'admin_notes'
    )
)
SELECT
  roles.rolname AS role_name,
  roles.rolbypassrls,
  has_schema_privilege(roles.rolname, 'public', 'USAGE') AS has_public_schema_usage,
  tables.table_name,
  tables.table_owner,
  tables.rls_enabled,
  tables.rls_forced,
  tables.policy_count
FROM roles CROSS JOIN tables
ORDER BY roles.rolname, tables.table_name;
```

### 10 - B01

- Source: Frozen Agent 70B-2 source heading B01
- Canonical SHA-256: `9cf2f8365954544726d01f562d06115ec373768fa30d598d384954f2465eed4f`
- Evidence: `novora-fp-phase-a-10-b01.csv`
- Expected result: Every status is one of draft, queued, processing, succeeded, failed, timed_out, or cancelled; only draft may represent the staged legacy state.
- STOP: any canonical-hash mismatch, SQL error or warning, missing/truncated result, or failure of the expected result above.

```sql
SELECT status, count(*) AS row_count
FROM public.ai_sketch_jobs
GROUP BY status
ORDER BY status;
```

### 11 - B02

- Source: Frozen Agent 70B-2 source heading B02
- Canonical SHA-256: `4ac61e3c8d2c1b6a75fbbaf1ddfe5241778f654134705dcc1c332be66dfd75d6`
- Evidence: `novora-fp-phase-a-11-b02.csv`
- Expected result: Every preview_status value is understood and pending_review is not interpreted as automatic First Preview readiness.
- STOP: any canonical-hash mismatch, SQL error or warning, missing/truncated result, or failure of the expected result above.

```sql
SELECT preview_status, count(*) AS row_count
FROM public.ai_sketch_outputs
GROUP BY preview_status
ORDER BY preview_status;
```

### 12 - B03

- Source: Frozen Agent 70B-2 source heading B03
- Canonical SHA-256: `33218418b894c3479d3d3e20f0a7caa610a3863cecfb2b02770d4ad6bb1446f5`
- Evidence: `novora-fp-phase-a-12-b03.csv`
- Expected result: Capture the complete object-path presence aggregate. This result is informational only and must not be used as proof that an asset exists or is ready.
- STOP: any canonical-hash mismatch, SQL error or warning, missing/truncated result, or failure of the expected result above.

```sql
SELECT
  count(*) FILTER (WHERE object_path IS NULL) AS null_object_path_count,
  count(*) FILTER (WHERE object_path IS NOT NULL) AS nonnull_object_path_count,
  count(*) AS total_output_count
FROM public.ai_sketch_outputs;
```

### 13 - B04

- Source: Frozen Agent 70B-2 source heading B04
- Canonical SHA-256: `a1a8a358f6d2779947a5e13ce15c85181b88e0840825dce356698d9bb7b73e1c`
- Evidence: `novora-fp-phase-a-13-b04.csv`
- Expected result: The output-per-job distribution is complete and no job has more than one output.
- STOP: any canonical-hash mismatch, SQL error or warning, missing/truncated result, or failure of the expected result above.

```sql
WITH per_job AS (
  SELECT job_id, count(*) AS output_count
  FROM public.ai_sketch_outputs
  GROUP BY job_id
)
SELECT output_count, count(*) AS job_count
FROM per_job
GROUP BY output_count
ORDER BY output_count;
```

### 14 - B05

- Source: Frozen Agent 70B-2 source heading B05
- Canonical SHA-256: `2a456c2671be654cc4aee18bd03d8e0102e1d94ec0d5c8bd9348fd40f6a1feb3`
- Evidence: `novora-fp-phase-a-14-b05.csv`
- Expected result: The job-per-brief distribution is complete and remains compatible with the approved bounded attempt model.
- STOP: any canonical-hash mismatch, SQL error or warning, missing/truncated result, or failure of the expected result above.

```sql
WITH per_brief AS (
  SELECT concept_brief_id, count(*) AS job_count
  FROM public.ai_sketch_jobs
  GROUP BY concept_brief_id
)
SELECT job_count, count(*) AS concept_brief_count
FROM per_brief
GROUP BY job_count
ORDER BY job_count;
```

### 15 - B06

- Source: Frozen Agent 70B-2 source heading B06
- Canonical SHA-256: `56277764a42962df29d8dc151cf34da723d9454c6833490ef271cb8625841c88`
- Evidence: `novora-fp-phase-a-15-b06.csv`
- Expected result: Every orphan, cross-brief, and output/review/brief consistency violation count is zero.
- STOP: any canonical-hash mismatch, SQL error or warning, missing/truncated result, or failure of the expected result above.

```sql
SELECT
  (SELECT count(*)
   FROM public.ai_sketch_outputs o
   LEFT JOIN public.ai_sketch_jobs j ON j.id = o.job_id
   WHERE j.id IS NULL) AS output_missing_job_count,
  (SELECT count(*)
   FROM public.ai_sketch_outputs o
   JOIN public.ai_sketch_jobs j ON j.id = o.job_id
   WHERE o.concept_brief_id IS DISTINCT FROM j.concept_brief_id) AS output_job_brief_mismatch_count,
  (SELECT count(*)
   FROM public.ai_sketch_reviews r
   LEFT JOIN public.ai_sketch_outputs o ON o.id = r.ai_sketch_output_id
   WHERE o.id IS NULL) AS review_missing_output_count,
  (SELECT count(*)
   FROM public.ai_sketch_reviews r
   JOIN public.ai_sketch_outputs o ON o.id = r.ai_sketch_output_id
   WHERE r.concept_brief_id IS DISTINCT FROM o.concept_brief_id) AS review_output_brief_mismatch_count;
```

### 16 - B07

- Source: Frozen Agent 70B-2 source heading B07
- Canonical SHA-256: `0359f22286e7a294d6ac01d47bf140bf1da3297765c44c943fc37274f9f66ea7`
- Evidence: `novora-fp-phase-a-16-b07.csv`
- Expected result: invalid_review_status_count equals zero.
- STOP: any canonical-hash mismatch, SQL error or warning, missing/truncated result, or failure of the expected result above.

```sql
SELECT count(*) AS invalid_review_status_count
FROM public.ai_sketch_reviews
WHERE review_status IS NULL
   OR review_status NOT IN (
     'internal_draft_not_generated',
     'draft_generated_internal_only',
     'needs_revision',
     'approved_for_customer'
   );
```

### 17 - B15

- Source: Frozen Agent 70B-2 source heading B15
- Canonical SHA-256: `9c3e4473238a83b0ca10bceb699029eb89a52d7ef43df34ea6838343d3e44701`
- Evidence: `novora-fp-phase-a-17-b15.csv`
- Expected result: The one-output-per-job duplicate count is zero.
- STOP: any canonical-hash mismatch, SQL error or warning, missing/truncated result, or failure of the expected result above.

```sql
WITH duplicates AS (
  SELECT job_id
  FROM public.ai_sketch_outputs
  GROUP BY job_id
  HAVING count(*) > 1
)
SELECT count(*) AS multi_output_job_count
FROM duplicates;
```

### 18 - B17

- Source: Frozen Agent 70B-2 source heading B17
- Canonical SHA-256: `60227942aa9689ff9b8e5c90a6dcfc896d755419846eefbd31b47be92b7c3ce6`
- Evidence: `novora-fp-phase-a-18-b17.csv`
- Expected result: Every pending_review semantic is understood; pending_review remains distinct from automatic First Preview readiness.
- STOP: any canonical-hash mismatch, SQL error or warning, missing/truncated result, or failure of the expected result above.

```sql
SELECT
  preview_status,
  (object_path IS NOT NULL) AS has_object_path,
  count(*) AS row_count
FROM public.ai_sketch_outputs
GROUP BY preview_status, (object_path IS NOT NULL)
ORDER BY preview_status, has_object_path;
```

### 19 - C04

- Source: Owner Execution Packet v1 section 7.1
- Canonical SHA-256: `70b50a50beb0cd3a3fc1c17b4facc1658a1e3d7f211accdca12d722fa5eae3ce`
- Evidence: `novora-fp-phase-a-19-c04.csv`
- Expected result: Exactly one row for each affected table and every total_lock_count and waiting_lock_count is zero immediately before 23.1-S01.
- STOP: any canonical-hash mismatch, SQL error or warning, missing/truncated result, or failure of the expected result above.

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

### 20 - 23.1-S01

- Source: Frozen Agent 70B-2 source heading 23.1
- Canonical SHA-256: `082b6880f1249f5091e3db60ab3ae2e144afda14487ed18f7f9d9775917dff32`
- Evidence: `novora-fp-phase-a-20-23.1-s01.png`
- Expected result: The exact nullable-first ai_sketch_jobs ALTER succeeds once without warning or error. No data is edited; row and duplicate counts are n/a.
- STOP: any canonical-hash mismatch, SQL error or warning, missing/truncated result, or failure of the expected result above.

```sql
ALTER TABLE public.ai_sketch_jobs
  ADD COLUMN generation_purpose text,
  ADD COLUMN idempotency_key text,
  ADD COLUMN attempt_number smallint,
  ADD COLUMN lineage_identity text,
  ADD COLUMN parent_job_id uuid,
  ADD COLUMN parent_generation_purpose text,
  ADD COLUMN parent_attempt_number smallint,
  ADD COLUMN source_output_id uuid,
  ADD COLUMN design_spec_version text,
  ADD COLUMN design_spec_hash text,
  ADD COLUMN hand_sketch_instruction_version text,
  ADD COLUMN hand_sketch_instruction_hash text,
  ADD COLUMN provider_name text,
  ADD COLUMN provider_request_id text,
  ADD COLUMN provider_endpoint text,
  ADD COLUMN request_image_count smallint,
  ADD COLUMN request_streaming boolean,
  ADD COLUMN request_partial_images smallint,
  ADD COLUMN request_size text,
  ADD COLUMN request_quality text,
  ADD COLUMN output_format text,
  ADD COLUMN moderation_mode text,
  ADD COLUMN started_at timestamptz,
  ADD COLUMN deadline_at timestamptz,
  ADD COLUMN completed_at timestamptz,
  ADD COLUMN failed_at timestamptz,
  ADD COLUMN cancelled_at timestamptz,
  ADD COLUMN timed_out_at timestamptz,
  ADD COLUMN failure_category text,
  ADD COLUMN retry_eligible boolean,
  ADD COLUMN terminal_reason text,
  ADD COLUMN estimated_cost_micros bigint,
  ADD COLUMN actual_cost_micros bigint,
  ADD COLUMN cost_currency text,
  ADD COLUMN pricing_assumption_version text;
```

### 21 - 23.2-S01

- Source: Frozen Agent 70B-2 source heading 23.2
- Canonical SHA-256: `4db11692e2e0147e23772f6649d6250786bf23fcaa2542d48d1d001f3e6561b4`
- Evidence: `novora-fp-phase-a-21-23.2-s01.png`
- Expected result: The exact nullable ai_sketch_outputs integrity/readiness ALTER succeeds once without warning or error. No data is edited; row and duplicate counts are n/a.
- STOP: any canonical-hash mismatch, SQL error or warning, missing/truncated result, or failure of the expected result above.

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

### 22 - B08

- Source: Frozen Agent 70B-2 source heading B08
- Canonical SHA-256: `2e067968c77a8f83133b2c0937f7fcef2e4cf7bc6926e6320fe2a07e5e691fc9`
- Evidence: `novora-fp-phase-a-22-b08.csv`
- Expected result: Capture every nullable-hardening count exactly. This is evidence only; Phase A does not authorize NOT NULL hardening.
- STOP: any canonical-hash mismatch, SQL error or warning, missing/truncated result, or failure of the expected result above.

```sql
SELECT
  count(*) FILTER (WHERE generation_purpose IS NULL) AS null_generation_purpose_count,
  count(*) FILTER (WHERE idempotency_key IS NULL) AS null_idempotency_key_count,
  count(*) FILTER (WHERE attempt_number IS NULL) AS null_attempt_number_count,
  count(*) FILTER (WHERE design_spec_hash IS NULL) AS null_design_spec_hash_count,
  count(*) FILTER (WHERE hand_sketch_instruction_hash IS NULL) AS null_instruction_hash_count
FROM public.ai_sketch_jobs;
```

### 23 - B09

- Source: Frozen Agent 70B-2 source heading B09
- Canonical SHA-256: `43298fdb1c47ef119ecc4477cf32745e3cd1743782c31ad854ae9be422780f88`
- Evidence: `novora-fp-phase-a-23-b09.csv`
- Expected result: The idempotency duplicate-candidate count is zero.
- STOP: any canonical-hash mismatch, SQL error or warning, missing/truncated result, or failure of the expected result above.

```sql
WITH duplicates AS (
  SELECT idempotency_key
  FROM public.ai_sketch_jobs
  WHERE idempotency_key IS NOT NULL
  GROUP BY idempotency_key
  HAVING count(*) > 1
)
SELECT count(*) AS duplicate_idempotency_key_count
FROM duplicates;
```

### 24 - B10

- Source: Frozen Agent 70B-2 source heading B10
- Canonical SHA-256: `0e85c8b6d1344417ebea34a03b63dc5b7f3e0fa5fd594c6ada0f662a11468d4c`
- Evidence: `novora-fp-phase-a-24-b10.csv`
- Expected result: The attempt-identity duplicate-candidate count is zero.
- STOP: any canonical-hash mismatch, SQL error or warning, missing/truncated result, or failure of the expected result above.

```sql
WITH duplicates AS (
  SELECT concept_brief_id, attempt_number
  FROM public.ai_sketch_jobs
  WHERE attempt_number IS NOT NULL
  GROUP BY concept_brief_id, attempt_number
  HAVING count(*) > 1
)
SELECT count(*) AS duplicate_attempt_identity_count
FROM duplicates;
```

### 25 - B11

- Source: Frozen Agent 70B-2 source heading B11
- Canonical SHA-256: `a5373006e603f366bb630456421f5dd8b79e163430f92a2a2d7f03a0833cad56`
- Evidence: `novora-fp-phase-a-25-b11.csv`
- Expected result: The current-preview duplicate-candidate count is zero.
- STOP: any canonical-hash mismatch, SQL error or warning, missing/truncated result, or failure of the expected result above.

```sql
WITH duplicates AS (
  SELECT concept_brief_id
  FROM public.ai_sketch_outputs
  WHERE is_current_customer_preview IS TRUE
  GROUP BY concept_brief_id
  HAVING count(*) > 1
)
SELECT count(*) AS duplicate_current_preview_brief_count
FROM duplicates;
```

### 26 - B12

- Source: Frozen Agent 70B-2 source heading B12
- Canonical SHA-256: `69c93100d88be69e4c1a5ce365b548d75f2cca1fe04a5530545c0384ad02ce67`
- Evidence: `novora-fp-phase-a-26-b12.csv`
- Expected result: The Provider-request duplicate-candidate count is zero.
- STOP: any canonical-hash mismatch, SQL error or warning, missing/truncated result, or failure of the expected result above.

```sql
WITH duplicates AS (
  SELECT provider_name, provider_request_id
  FROM public.ai_sketch_jobs
  WHERE provider_name IS NOT NULL AND provider_request_id IS NOT NULL
  GROUP BY provider_name, provider_request_id
  HAVING count(*) > 1
)
SELECT count(*) AS duplicate_provider_request_count
FROM duplicates;
```

### 27 - B13

- Source: Frozen Agent 70B-2 source heading B13
- Canonical SHA-256: `c1b7ebf089780ffb3ca1bf4a7b4facc4e9873c009bf7061148b3c0da3bd47bf5`
- Evidence: `novora-fp-phase-a-27-b13.csv`
- Expected result: Every named proposed Job CHECK and Provider-profile violation count is zero.
- STOP: any canonical-hash mismatch, SQL error or warning, missing/truncated result, or failure of the expected result above.

```sql
SELECT
  count(*) FILTER (WHERE status IS NULL OR status NOT IN (
    'draft', 'queued', 'processing', 'succeeded', 'failed', 'timed_out', 'cancelled'
  )) AS invalid_job_status_count,
  count(*) FILTER (
    WHERE status IS NOT DISTINCT FROM 'draft'
      AND num_nonnulls(
        generation_purpose, attempt_number, idempotency_key, lineage_identity,
        parent_job_id, parent_generation_purpose, parent_attempt_number,
        source_output_id, design_spec_version, design_spec_hash,
        hand_sketch_instruction_version, hand_sketch_instruction_hash,
        provider_name, model_name, provider_endpoint, request_image_count,
        request_streaming, request_partial_images, request_size, request_quality,
        output_format, moderation_mode, provider_request_id, started_at,
        deadline_at, completed_at, failed_at, cancelled_at, timed_out_at,
        failure_category,
        retry_eligible, terminal_reason, error_message, estimated_cost_micros,
        actual_cost_micros, cost_currency, pricing_assumption_version
      ) <> 0
  ) AS invalid_staged_state_count,
  count(*) FILTER (
    WHERE status IS DISTINCT FROM 'draft'
      AND (
        generation_purpose IS NULL
        OR attempt_number IS NULL
        OR idempotency_key IS NULL
        OR lineage_identity IS NULL
        OR design_spec_version IS NULL
        OR btrim(design_spec_version) = ''
        OR design_spec_hash IS NULL
        OR hand_sketch_instruction_version IS NULL
        OR btrim(hand_sketch_instruction_version) = ''
        OR hand_sketch_instruction_hash IS NULL
      )
  ) AS incomplete_nonstaged_identity_count,
  count(*) FILTER (
    WHERE (status IS NOT DISTINCT FROM 'draft'
           AND (generation_purpose IS NOT NULL OR attempt_number IS NOT NULL))
       OR (status IS DISTINCT FROM 'draft' AND (
             generation_purpose IS NULL
             OR attempt_number IS NULL
             OR (generation_purpose IS DISTINCT FROM 'first_preview'
                 AND generation_purpose IS DISTINCT FROM 'feedback_regeneration')
             OR (generation_purpose IS NOT DISTINCT FROM 'first_preview'
                 AND attempt_number NOT BETWEEN 1 AND 2)
             OR (generation_purpose IS NOT DISTINCT FROM 'feedback_regeneration'
                 AND attempt_number NOT BETWEEN 2 AND 3)
           ))
  ) AS invalid_attempt_policy_count,
  count(*) FILTER (
    WHERE ((
      (status IS NOT DISTINCT FROM 'draft'
       AND generation_purpose IS NULL
       AND lineage_identity IS NULL
       AND parent_job_id IS NULL
       AND parent_generation_purpose IS NULL
       AND parent_attempt_number IS NULL
       AND source_output_id IS NULL)
      OR (status IS DISTINCT FROM 'draft'
          AND generation_purpose IS NOT DISTINCT FROM 'first_preview'
          AND attempt_number IS NOT DISTINCT FROM 1
          AND lineage_identity IS NOT DISTINCT FROM 'first-preview:v1'
          AND parent_job_id IS NULL
          AND parent_generation_purpose IS NULL
          AND parent_attempt_number IS NULL
          AND source_output_id IS NULL)
      OR (status IS DISTINCT FROM 'draft'
          AND generation_purpose IS NOT DISTINCT FROM 'first_preview'
          AND attempt_number IS NOT DISTINCT FROM 2
          AND lineage_identity IS NOT DISTINCT FROM 'first-preview:v1'
          AND parent_job_id IS NOT NULL
          AND parent_generation_purpose IS NOT DISTINCT FROM 'first_preview'
          AND parent_attempt_number IS NOT DISTINCT FROM 1
          AND source_output_id IS NULL)
      OR (status IS DISTINCT FROM 'draft'
          AND generation_purpose IS NOT DISTINCT FROM 'feedback_regeneration'
          AND attempt_number IS NOT NULL
          AND attempt_number BETWEEN 2 AND 3
          AND lineage_identity IS NOT DISTINCT FROM 'first-preview:v1'
          AND parent_job_id IS NOT NULL
          AND parent_generation_purpose IS NOT DISTINCT FROM 'first_preview'
          AND parent_attempt_number IS NOT NULL
          AND attempt_number = parent_attempt_number + 1
          AND source_output_id IS NOT NULL)
    ) IS NOT TRUE)
  ) AS invalid_lineage_shape_count,
  count(*) FILTER (
    WHERE (started_at IS NULL AND deadline_at IS NOT NULL)
       OR (started_at IS NOT NULL
           AND (deadline_at IS NULL OR deadline_at <= started_at))
       OR (completed_at IS NOT NULL
           AND started_at IS NOT NULL
           AND completed_at < started_at)
       OR (failed_at IS NOT NULL
           AND started_at IS NOT NULL
           AND failed_at < started_at)
       OR (cancelled_at IS NOT NULL
           AND started_at IS NOT NULL
           AND cancelled_at < started_at)
       OR (timed_out_at IS NOT NULL
           AND started_at IS NOT NULL
           AND timed_out_at < started_at)
  ) AS invalid_attempt_timing_count,
  count(*) FILTER (
    WHERE num_nonnulls(completed_at, failed_at, cancelled_at, timed_out_at) > 1
  ) AS conflicting_terminal_timestamp_count,
  count(*) FILTER (
    WHERE (status IS NOT DISTINCT FROM 'succeeded' AND completed_at IS NULL)
       OR (status IS NOT DISTINCT FROM 'failed' AND failed_at IS NULL)
       OR (status IS NOT DISTINCT FROM 'cancelled' AND cancelled_at IS NULL)
       OR (status IS NOT DISTINCT FROM 'timed_out' AND timed_out_at IS NULL)
  ) AS missing_status_specific_terminal_timestamp_count,
  count(*) FILTER (
    WHERE (completed_at IS NOT NULL AND status IS DISTINCT FROM 'succeeded')
       OR (failed_at IS NOT NULL AND status IS DISTINCT FROM 'failed')
       OR (cancelled_at IS NOT NULL AND status IS DISTINCT FROM 'cancelled')
       OR (timed_out_at IS NOT NULL AND status IS DISTINCT FROM 'timed_out')
  ) AS terminal_timestamp_status_mismatch_count,
  count(*) FILTER (
    WHERE (status IS NOT DISTINCT FROM 'queued' AND (
             started_at IS NOT NULL OR deadline_at IS NOT NULL
             OR completed_at IS NOT NULL OR failed_at IS NOT NULL
             OR cancelled_at IS NOT NULL OR timed_out_at IS NOT NULL
             OR failure_category IS NOT NULL
             OR retry_eligible IS NOT NULL OR terminal_reason IS NOT NULL
             OR error_message IS NOT NULL
           ))
       OR (status IS NOT DISTINCT FROM 'processing' AND (
             started_at IS NULL OR deadline_at IS NULL
             OR deadline_at <= started_at
             OR completed_at IS NOT NULL OR failed_at IS NOT NULL
             OR cancelled_at IS NOT NULL OR timed_out_at IS NOT NULL
             OR failure_category IS NOT NULL
             OR retry_eligible IS NOT NULL OR terminal_reason IS NOT NULL
             OR error_message IS NOT NULL
           ))
       OR (status IS NOT DISTINCT FROM 'succeeded' AND (
             started_at IS NULL OR deadline_at IS NULL
             OR deadline_at <= started_at OR completed_at IS NULL
             OR completed_at < started_at OR failed_at IS NOT NULL
             OR cancelled_at IS NOT NULL OR timed_out_at IS NOT NULL
             OR failure_category IS NOT NULL
             OR retry_eligible IS NOT NULL OR terminal_reason IS NOT NULL
             OR error_message IS NOT NULL
           ))
       OR (status IS NOT DISTINCT FROM 'failed' AND (
             failed_at IS NULL OR completed_at IS NOT NULL
             OR cancelled_at IS NOT NULL OR timed_out_at IS NOT NULL
             OR failure_category IS NULL
             OR failure_category IS NOT DISTINCT FROM 'timeout'
             OR failure_category IS NOT DISTINCT FROM 'cancelled'
             OR retry_eligible IS NULL OR terminal_reason IS NULL
             OR btrim(terminal_reason) = ''
             OR (started_at IS NULL AND deadline_at IS NOT NULL)
             OR (started_at IS NOT NULL AND (
                   deadline_at IS NULL OR deadline_at <= started_at
                   OR failed_at < started_at
                 ))
           ))
       OR (status IS NOT DISTINCT FROM 'timed_out' AND (
             started_at IS NULL OR deadline_at IS NULL
             OR deadline_at <= started_at OR timed_out_at IS NULL
             OR timed_out_at < deadline_at OR completed_at IS NOT NULL
             OR failed_at IS NOT NULL OR cancelled_at IS NOT NULL
             OR failure_category IS DISTINCT FROM 'timeout'
             OR retry_eligible IS DISTINCT FROM false
             OR terminal_reason IS NULL OR btrim(terminal_reason) = ''
           ))
       OR (status IS NOT DISTINCT FROM 'cancelled' AND (
             completed_at IS NOT NULL OR failed_at IS NOT NULL
             OR timed_out_at IS NOT NULL OR cancelled_at IS NULL
             OR failure_category IS DISTINCT FROM 'cancelled'
             OR retry_eligible IS DISTINCT FROM false
             OR terminal_reason IS NULL OR btrim(terminal_reason) = ''
             OR (started_at IS NULL AND deadline_at IS NOT NULL)
             OR (started_at IS NOT NULL AND (
                   deadline_at IS NULL OR deadline_at <= started_at
                   OR cancelled_at < started_at
                 ))
           ))
  ) AS invalid_status_timestamp_evidence_count,
  count(*) FILTER (
    WHERE (design_spec_hash IS NOT NULL AND design_spec_hash !~ '^[0-9a-f]{64}$')
       OR (hand_sketch_instruction_hash IS NOT NULL
           AND hand_sketch_instruction_hash !~ '^[0-9a-f]{64}$')
       OR (idempotency_key IS NOT NULL AND idempotency_key !~ '^[0-9a-f]{64}$')
  ) AS invalid_hash_format_count,
  count(*) FILTER (
    WHERE failure_category IS NOT NULL
      AND failure_category NOT IN (
        'configuration_missing', 'invalid_structured_input', 'precondition_failed',
        'invalid_request', 'authentication_failed', 'permission_denied',
        'moderation_blocked', 'rate_limited', 'provider_unavailable',
        'network_failure', 'timeout', 'cancelled', 'invalid_provider_response',
        'invalid_base64', 'invalid_image_format', 'invalid_image_dimensions',
        'image_too_large', 'unsafe_output', 'privacy_failure', 'access_failure',
        'storage_failure', 'lifecycle_conflict', 'budget_blocked',
        'unexpected_provider_error'
      )
  ) AS invalid_failure_category_count,
  count(*) FILTER (
    WHERE retry_eligible IS TRUE
      AND failure_category IS DISTINCT FROM 'rate_limited'
      AND failure_category IS DISTINCT FROM 'provider_unavailable'
      AND failure_category IS DISTINCT FROM 'network_failure'
  ) AS invalid_retry_eligibility_count,
  count(*) FILTER (
    WHERE estimated_cost_micros < 0
       OR actual_cost_micros < 0
       OR (cost_currency IS NOT NULL AND cost_currency !~ '^[A-Z]{3}$')
       OR (status IS NOT DISTINCT FROM 'draft' AND num_nonnulls(
             estimated_cost_micros, actual_cost_micros, cost_currency,
             pricing_assumption_version
           ) <> 0)
       OR (status IS DISTINCT FROM 'draft' AND (
             (estimated_cost_micros IS NULL
              AND actual_cost_micros IS NULL
              AND (cost_currency IS NOT NULL
                   OR pricing_assumption_version IS NOT NULL))
             OR ((estimated_cost_micros IS NOT NULL
                  OR actual_cost_micros IS NOT NULL)
                 AND (cost_currency IS NULL
                      OR cost_currency !~ '^[A-Z]{3}$'
                      OR pricing_assumption_version IS NULL
                      OR btrim(pricing_assumption_version) = ''))
           ))
  ) AS invalid_cost_count,
  count(*) FILTER (
    WHERE (status IS NOT DISTINCT FROM 'draft' AND num_nonnulls(
             provider_name, model_name, provider_endpoint, request_image_count,
             request_streaming, request_partial_images, request_size,
             request_quality, output_format, moderation_mode
           ) <> 0)
       OR (status IS DISTINCT FROM 'draft' AND num_nonnulls(
             provider_name, model_name, provider_endpoint, request_image_count,
             request_streaming, request_partial_images, request_size,
             request_quality, output_format, moderation_mode
           ) <> 10)
  ) AS incomplete_request_profile_count,
  count(*) FILTER (
    WHERE status IS DISTINCT FROM 'draft'
      AND (
        provider_name IS DISTINCT FROM 'openai'
        OR model_name IS DISTINCT FROM 'gpt-image-2-2026-04-21'
        OR provider_endpoint IS DISTINCT FROM '/v1/images/generations'
        OR request_image_count IS DISTINCT FROM 1
        OR request_streaming IS DISTINCT FROM false
        OR request_partial_images IS DISTINCT FROM 0
        OR request_size IS DISTINCT FROM '1024x1024'
        OR request_quality IS DISTINCT FROM 'medium'
        OR output_format IS DISTINCT FROM 'png'
        OR moderation_mode IS DISTINCT FROM 'auto'
      )
  ) AS mismatched_request_profile_count,
  count(*) FILTER (
    WHERE (status IS NOT DISTINCT FROM 'draft' AND provider_request_id IS NOT NULL)
       OR (status IS DISTINCT FROM 'draft'
           AND provider_request_id IS NOT NULL
           AND (provider_name IS DISTINCT FROM 'openai'
                OR btrim(provider_request_id) = ''))
  ) AS provider_request_without_profile_count
FROM public.ai_sketch_jobs;
```

### 28 - B14

- Source: Frozen Agent 70B-2 source heading B14
- Canonical SHA-256: `73621c68392dc73b3331669e0ec3d91918c2720b587845c5de8da18e0cd931af`
- Evidence: `novora-fp-phase-a-28-b14.csv`
- Expected result: Every named proposed Output readiness, integrity, ownership, privacy, lifecycle, and chronology violation count is zero.
- STOP: any canonical-hash mismatch, SQL error or warning, missing/truncated result, or failure of the expected result above.

```sql
SELECT
  count(*) FILTER (WHERE readiness_status IS NOT NULL AND readiness_status NOT IN (
    'not_ready', 'first_preview_ready', 'revoked'
  )) AS invalid_readiness_status_count,
  count(*) FILTER (WHERE automatic_gate_status IS NOT NULL AND automatic_gate_status NOT IN (
    'pending', 'passed', 'failed'
  )) AS invalid_gate_status_count,
  count(*) FILTER (WHERE asset_validation_status IS NOT NULL AND asset_validation_status NOT IN (
    'pending', 'passed', 'failed'
  )) AS invalid_asset_validation_status_count,
  count(*) FILTER (
    WHERE num_nonnulls(
            mime_type, byte_size, width_px, height_px, content_sha256
          ) BETWEEN 1 AND 4
       OR (num_nonnulls(
             mime_type, byte_size, width_px, height_px, content_sha256
           ) = 5 AND (
             mime_type IS DISTINCT FROM 'image/png'
             OR byte_size NOT BETWEEN 1 AND 16777216
             OR width_px IS DISTINCT FROM 1024
             OR height_px IS DISTINCT FROM 1024
             OR content_sha256 !~ '^[0-9a-f]{64}$'
           ))
  ) AS invalid_integrity_shape_count,
  count(*) FILTER (
    WHERE asset_created_at IS NOT NULL
      AND (
        bucket_name IS NULL OR btrim(bucket_name) = ''
        OR object_path IS NULL OR btrim(object_path) = ''
      )
  ) AS invalid_asset_persistence_count,
  count(*) FILTER (
    WHERE (asset_validation_status IS NULL AND (
             asset_validation_evidence IS NOT NULL
             OR asset_validated_at IS NOT NULL
             OR num_nonnulls(
                  mime_type, byte_size, width_px, height_px, content_sha256
                ) <> 0
           ))
       OR (asset_validation_status IS NOT DISTINCT FROM 'pending' AND (
             asset_created_at IS NULL
             OR bucket_name IS NULL OR btrim(bucket_name) = ''
             OR object_path IS NULL OR btrim(object_path) = ''
             OR asset_validation_evidence IS NOT NULL
             OR asset_validated_at IS NOT NULL
             OR num_nonnulls(
                  mime_type, byte_size, width_px, height_px, content_sha256
                ) <> 0
           ))
       OR (asset_validation_status IS NOT DISTINCT FROM 'failed' AND (
             asset_created_at IS NULL
             OR bucket_name IS NULL OR btrim(bucket_name) = ''
             OR object_path IS NULL OR btrim(object_path) = ''
             OR asset_validation_evidence IS NULL
             OR jsonb_typeof(asset_validation_evidence) IS DISTINCT FROM 'object'
             OR asset_validation_evidence = '{}'::jsonb
             OR asset_validated_at IS NOT NULL
             OR num_nonnulls(
                  mime_type, byte_size, width_px, height_px, content_sha256
                ) <> 0
           ))
       OR (asset_validation_status IS NOT DISTINCT FROM 'passed' AND (
             asset_created_at IS NULL
             OR bucket_name IS NULL OR btrim(bucket_name) = ''
             OR object_path IS NULL OR btrim(object_path) = ''
             OR asset_validation_evidence IS NULL
             OR jsonb_typeof(asset_validation_evidence) IS DISTINCT FROM 'object'
             OR asset_validation_evidence = '{}'::jsonb
             OR asset_validated_at IS NULL
             OR asset_validated_at < asset_created_at
             OR mime_type IS DISTINCT FROM 'image/png'
             OR byte_size IS NULL OR byte_size NOT BETWEEN 1 AND 16777216
             OR width_px IS DISTINCT FROM 1024
             OR height_px IS DISTINCT FROM 1024
             OR content_sha256 IS NULL
             OR content_sha256 !~ '^[0-9a-f]{64}$'
           ))
  ) AS invalid_asset_validation_consistency_count,
  count(*) FILTER (
    WHERE (automatic_gate_status IS NULL AND (
             automatic_gate_policy_version IS NOT NULL
             OR automatic_gate_evidence IS NOT NULL
             OR automatic_gate_passed_at IS NOT NULL
           ))
       OR (automatic_gate_status IS NOT DISTINCT FROM 'pending' AND (
             asset_validation_status IS DISTINCT FROM 'passed'
             OR asset_validated_at IS NULL
             OR automatic_gate_policy_version IS NULL
             OR btrim(automatic_gate_policy_version) = ''
             OR automatic_gate_evidence IS NOT NULL
             OR automatic_gate_passed_at IS NOT NULL
           ))
       OR (automatic_gate_status IS NOT DISTINCT FROM 'failed' AND (
             asset_validation_status IS DISTINCT FROM 'passed'
             OR asset_validated_at IS NULL
             OR automatic_gate_policy_version IS NULL
             OR btrim(automatic_gate_policy_version) = ''
             OR automatic_gate_evidence IS NULL
             OR jsonb_typeof(automatic_gate_evidence) IS DISTINCT FROM 'object'
             OR automatic_gate_evidence = '{}'::jsonb
             OR automatic_gate_passed_at IS NOT NULL
           ))
       OR (automatic_gate_status IS NOT DISTINCT FROM 'passed' AND (
             asset_validation_status IS DISTINCT FROM 'passed'
             OR asset_validated_at IS NULL
             OR automatic_gate_policy_version IS NULL
             OR btrim(automatic_gate_policy_version) = ''
             OR automatic_gate_evidence IS NULL
             OR jsonb_typeof(automatic_gate_evidence) IS DISTINCT FROM 'object'
             OR automatic_gate_evidence = '{}'::jsonb
             OR automatic_gate_passed_at IS NULL
             OR automatic_gate_passed_at < asset_validated_at
           ))
  ) AS invalid_automatic_gate_consistency_count,
  count(*) FILTER (
    WHERE (readiness_status IS NOT DISTINCT FROM 'first_preview_ready'
           OR readiness_status IS NOT DISTINCT FROM 'revoked')
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
        OR object_path IS NULL
        OR btrim(object_path) = ''
        OR bucket_name IS NULL
        OR btrim(bucket_name) = ''
        OR mime_type IS NULL
        OR mime_type IS DISTINCT FROM 'image/png'
        OR byte_size IS NULL
        OR byte_size NOT BETWEEN 1 AND 16777216
        OR width_px IS NULL
        OR width_px IS DISTINCT FROM 1024
        OR height_px IS NULL
        OR height_px IS DISTINCT FROM 1024
        OR content_sha256 IS NULL
        OR content_sha256 !~ '^[0-9a-f]{64}$'
      )
  ) AS invalid_ready_or_revoked_evidence_count,
  count(*) FILTER (
    WHERE is_current_customer_preview IS TRUE
      AND readiness_status IS DISTINCT FROM 'first_preview_ready'
  ) AS invalid_current_marker_count,
  count(*) FILTER (
    WHERE readiness_status IS NOT DISTINCT FROM 'revoked'
      AND (
        first_preview_ready_at IS NULL
        OR readiness_revoked_at IS NULL
        OR readiness_revoked_at < first_preview_ready_at
        OR is_current_customer_preview IS TRUE
      )
  ) AS invalid_revocation_count,
  count(*) FILTER (
    WHERE (readiness_status IS DISTINCT FROM 'revoked' AND readiness_revoked_at IS NOT NULL)
       OR (readiness_status IS NOT DISTINCT FROM 'revoked' AND readiness_revoked_at IS NULL)
       OR (readiness_status IS DISTINCT FROM 'first_preview_ready'
           AND readiness_status IS DISTINCT FROM 'revoked'
           AND first_preview_ready_at IS NOT NULL)
  ) AS invalid_readiness_timestamp_state_count,
  count(*) FILTER (
    WHERE (asset_validated_at IS NOT NULL
           AND (asset_created_at IS NULL OR asset_validated_at < asset_created_at))
       OR (automatic_gate_passed_at IS NOT NULL
           AND (asset_validated_at IS NULL OR automatic_gate_passed_at < asset_validated_at))
       OR (first_preview_ready_at IS NOT NULL
           AND (automatic_gate_passed_at IS NULL OR first_preview_ready_at < automatic_gate_passed_at))
       OR (readiness_revoked_at IS NOT NULL
           AND (first_preview_ready_at IS NULL OR readiness_revoked_at < first_preview_ready_at))
  ) AS invalid_chronology_count
FROM public.ai_sketch_outputs;
```

### 29 - B16

- Source: Frozen Agent 70B-2 source heading B16
- Canonical SHA-256: `370cf1f47ab85c491a57ea383659d12b7297fc5ab0780ee4c28606352bde17cd`
- Evidence: `novora-fp-phase-a-29-b16.csv`
- Expected result: Every lineage and source-output compatibility count is zero, including the recursive lineage-cycle count.
- STOP: any canonical-hash mismatch, SQL error or warning, missing/truncated result, or failure of the expected result above.

```sql
WITH RECURSIVE lineage_walk AS (
  SELECT
    child.id AS start_id,
    child.id AS current_id,
    child.parent_job_id AS next_parent_id,
    ARRAY[child.id]::uuid[] AS visited,
    false AS cycle_found
  FROM public.ai_sketch_jobs child
  WHERE child.parent_job_id IS NOT NULL

  UNION ALL

  SELECT
    walk.start_id,
    parent.id AS current_id,
    parent.parent_job_id AS next_parent_id,
    walk.visited || parent.id,
    parent.id = ANY(walk.visited) AS cycle_found
  FROM lineage_walk walk
  JOIN public.ai_sketch_jobs parent ON parent.id = walk.next_parent_id
  WHERE walk.cycle_found IS FALSE
), row_counts AS (
  SELECT
    count(*) FILTER (
      WHERE child.parent_job_id IS NOT NULL AND parent.id IS NULL
    ) AS missing_parent_count,
    count(*) FILTER (
      WHERE child.parent_job_id IS NOT NULL AND child.parent_job_id = child.id
    ) AS direct_self_parent_count,
    count(*) FILTER (
      WHERE parent.id IS NOT NULL
        AND child.concept_brief_id IS DISTINCT FROM parent.concept_brief_id
    ) AS cross_brief_parent_count,
    count(*) FILTER (
      WHERE child.generation_purpose IS NOT NULL
        AND child.parent_job_id IS NULL
        AND (
          child.generation_purpose IS DISTINCT FROM 'first_preview'
          OR child.attempt_number IS DISTINCT FROM 1
          OR child.lineage_identity IS DISTINCT FROM 'first-preview:v1'
          OR child.parent_generation_purpose IS NOT NULL
          OR child.parent_attempt_number IS NOT NULL
          OR child.source_output_id IS NOT NULL
        )
    ) AS invalid_root_count,
    count(*) FILTER (
      WHERE (child.parent_job_id IS NULL AND (
               child.parent_generation_purpose IS NOT NULL
               OR child.parent_attempt_number IS NOT NULL
             ))
         OR (child.parent_job_id IS NOT NULL AND (
               child.parent_generation_purpose IS NULL
               OR child.parent_attempt_number IS NULL
             ))
    ) AS incomplete_parent_identity_count,
    count(*) FILTER (
      WHERE parent.id IS NOT NULL
        AND (
          child.lineage_identity IS DISTINCT FROM 'first-preview:v1'
          OR child.parent_generation_purpose IS DISTINCT FROM parent.generation_purpose
          OR child.parent_attempt_number IS DISTINCT FROM parent.attempt_number
          OR child.attempt_number IS DISTINCT FROM parent.attempt_number + 1
          OR (child.generation_purpose IS NOT DISTINCT FROM 'first_preview' AND (
                parent.generation_purpose IS DISTINCT FROM 'first_preview'
                OR parent.attempt_number IS DISTINCT FROM 1
                OR child.attempt_number IS DISTINCT FROM 2
                OR child.source_output_id IS NOT NULL
              ))
          OR (child.generation_purpose IS NOT DISTINCT FROM 'feedback_regeneration' AND (
                parent.generation_purpose IS DISTINCT FROM 'first_preview'
                OR child.attempt_number NOT BETWEEN 2 AND 3
                OR child.source_output_id IS NULL
              ))
          OR (child.generation_purpose IS DISTINCT FROM 'first_preview'
              AND child.generation_purpose IS DISTINCT FROM 'feedback_regeneration')
        )
    ) AS invalid_parent_transition_count,
    count(*) FILTER (
      WHERE child.source_output_id IS NOT NULL AND source_output.id IS NULL
    ) AS missing_source_output_count,
    count(*) FILTER (
      WHERE source_output.id IS NOT NULL
        AND source_output.job_id IS DISTINCT FROM child.parent_job_id
    ) AS source_output_parent_job_mismatch_count,
    count(*) FILTER (
      WHERE source_output.id IS NOT NULL
        AND source_output.concept_brief_id IS DISTINCT FROM child.concept_brief_id
    ) AS source_output_brief_mismatch_count
  FROM public.ai_sketch_jobs child
  LEFT JOIN public.ai_sketch_jobs parent ON parent.id = child.parent_job_id
  LEFT JOIN public.ai_sketch_outputs source_output ON source_output.id = child.source_output_id
)
SELECT
  row_counts.*,
  (SELECT count(DISTINCT start_id)
   FROM lineage_walk
   WHERE cycle_found IS TRUE) AS multi_row_cycle_start_count
FROM row_counts;
```

### 30 - B18

- Source: Frozen Agent 70B-2 source heading B18
- Canonical SHA-256: `e800146ca454edb7c30716df56ba3b3957fea2a7eae7893f73bb3cb20c69ad43`
- Evidence: `novora-fp-phase-a-30-b18.csv`
- Expected result: The one-active-job duplicate count is zero and the active predicate remains exactly status IN ('queued', 'processing').
- STOP: any canonical-hash mismatch, SQL error or warning, missing/truncated result, or failure of the expected result above.

```sql
WITH duplicates AS (
  SELECT concept_brief_id, generation_purpose
  FROM public.ai_sketch_jobs
  WHERE generation_purpose IS NOT NULL
    AND status IN ('queued', 'processing')
  GROUP BY concept_brief_id, generation_purpose
  HAVING count(*) > 1
)
SELECT count(*) AS duplicate_active_purpose_count
FROM duplicates;
```

### 31 - B19

- Source: Frozen Agent 70B-2 source heading B19
- Canonical SHA-256: `0afc1a46385826ba11bad462dfada088a5569541a039a3fd6efaa539bb6fcde2`
- Evidence: `novora-fp-phase-a-31-b19.csv`
- Expected result: Every composite-key target and future-foreign-key compatibility count is zero.
- STOP: any canonical-hash mismatch, SQL error or warning, missing/truncated result, or failure of the expected result above.

```sql
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
    SELECT id, job_id, concept_brief_id
    FROM public.ai_sketch_outputs
    GROUP BY id, job_id, concept_brief_id
    HAVING count(*) > 1
  ) duplicates) AS duplicate_source_output_target_count,
  (SELECT count(*)
   FROM public.ai_sketch_outputs output
   LEFT JOIN public.ai_sketch_jobs job
     ON job.id = output.job_id
    AND job.concept_brief_id = output.concept_brief_id
   WHERE job.id IS NULL) AS output_composite_fk_violation_count;
```

### 32 - 23.3-S01

- Source: Frozen Agent 70B-2 source heading 23.3
- Canonical SHA-256: `10ecfe446e295fca518eba4efcb05bb74bc6098433662a3d5554f21129157e5c`
- Evidence: `novora-fp-phase-a-32-23.3-s01.png`
- Expected result: The exact ai_sketch_jobs CHECK-constraint ALTER succeeds once; every added candidate constraint remains NOT VALID. Row and duplicate counts are n/a.
- STOP: any canonical-hash mismatch, SQL error or warning, missing/truncated result, or failure of the expected result above.

```sql
ALTER TABLE public.ai_sketch_jobs
  ADD CONSTRAINT ai_sketch_jobs_status_check
    CHECK (status IS NOT NULL AND status IN (
      'draft', 'queued', 'processing', 'succeeded', 'failed', 'timed_out', 'cancelled'
    )) NOT VALID,
  ADD CONSTRAINT ai_sketch_jobs_attempt_policy_check
    CHECK (
      (status IS NOT DISTINCT FROM 'draft'
       AND generation_purpose IS NULL
       AND attempt_number IS NULL)
      OR (
        status IS DISTINCT FROM 'draft'
        AND generation_purpose IS NOT NULL
        AND attempt_number IS NOT NULL
        AND (
          (generation_purpose IS NOT DISTINCT FROM 'first_preview'
           AND attempt_number BETWEEN 1 AND 2)
          OR (generation_purpose IS NOT DISTINCT FROM 'feedback_regeneration'
              AND attempt_number BETWEEN 2 AND 3)
        )
      )
    ) NOT VALID,
  ADD CONSTRAINT ai_sketch_jobs_reserved_identity_completeness_check
    CHECK (
      (status IS NOT DISTINCT FROM 'draft'
       AND generation_purpose IS NULL
       AND idempotency_key IS NULL
       AND lineage_identity IS NULL
       AND design_spec_version IS NULL
       AND design_spec_hash IS NULL
       AND hand_sketch_instruction_version IS NULL
       AND hand_sketch_instruction_hash IS NULL)
      OR (
        status IS DISTINCT FROM 'draft'
        AND generation_purpose IS NOT NULL
        AND idempotency_key IS NOT NULL
        AND lineage_identity IS NOT NULL
        AND design_spec_version IS NOT NULL
        AND btrim(design_spec_version) <> ''
        AND design_spec_hash IS NOT NULL
        AND hand_sketch_instruction_version IS NOT NULL
        AND btrim(hand_sketch_instruction_version) <> ''
        AND hand_sketch_instruction_hash IS NOT NULL
      )
    ) NOT VALID,
  ADD CONSTRAINT ai_sketch_jobs_lineage_shape_check
    CHECK (
      (status IS NOT DISTINCT FROM 'draft'
       AND generation_purpose IS NULL
       AND lineage_identity IS NULL
       AND parent_job_id IS NULL
       AND parent_generation_purpose IS NULL
       AND parent_attempt_number IS NULL
       AND source_output_id IS NULL)
      OR (
        status IS DISTINCT FROM 'draft'
        AND generation_purpose IS NOT DISTINCT FROM 'first_preview'
        AND attempt_number IS NOT DISTINCT FROM 1
        AND lineage_identity IS NOT DISTINCT FROM 'first-preview:v1'
        AND parent_job_id IS NULL
        AND parent_generation_purpose IS NULL
        AND parent_attempt_number IS NULL
        AND source_output_id IS NULL
      )
      OR (
        status IS DISTINCT FROM 'draft'
        AND generation_purpose IS NOT DISTINCT FROM 'first_preview'
        AND attempt_number IS NOT DISTINCT FROM 2
        AND lineage_identity IS NOT DISTINCT FROM 'first-preview:v1'
        AND parent_job_id IS NOT NULL
        AND parent_generation_purpose IS NOT DISTINCT FROM 'first_preview'
        AND parent_attempt_number IS NOT DISTINCT FROM 1
        AND source_output_id IS NULL
      )
      OR (
        status IS DISTINCT FROM 'draft'
        AND generation_purpose IS NOT DISTINCT FROM 'feedback_regeneration'
        AND attempt_number IS NOT NULL
        AND attempt_number BETWEEN 2 AND 3
        AND lineage_identity IS NOT DISTINCT FROM 'first-preview:v1'
        AND parent_job_id IS NOT NULL
        AND parent_generation_purpose IS NOT DISTINCT FROM 'first_preview'
        AND parent_attempt_number IS NOT NULL
        AND attempt_number = parent_attempt_number + 1
        AND source_output_id IS NOT NULL
      )
    ) NOT VALID,
  ADD CONSTRAINT ai_sketch_jobs_hash_format_check
    CHECK (
      (design_spec_hash IS NULL OR design_spec_hash ~ '^[0-9a-f]{64}$')
      AND (hand_sketch_instruction_hash IS NULL OR hand_sketch_instruction_hash ~ '^[0-9a-f]{64}$')
      AND (idempotency_key IS NULL OR idempotency_key ~ '^[0-9a-f]{64}$')
    ) NOT VALID,
  ADD CONSTRAINT ai_sketch_jobs_attempt_timing_check
    CHECK (
      ((started_at IS NULL AND deadline_at IS NULL)
       OR (started_at IS NOT NULL
           AND deadline_at IS NOT NULL
           AND deadline_at > started_at))
      AND (completed_at IS NULL
           OR started_at IS NULL
           OR completed_at >= started_at)
      AND (failed_at IS NULL
           OR started_at IS NULL
           OR failed_at >= started_at)
      AND (cancelled_at IS NULL
           OR started_at IS NULL
           OR cancelled_at >= started_at)
      AND (timed_out_at IS NULL
           OR started_at IS NULL
           OR timed_out_at >= started_at)
    ) NOT VALID,
  ADD CONSTRAINT ai_sketch_jobs_terminal_timestamp_check
    CHECK (
      num_nonnulls(completed_at, failed_at, cancelled_at, timed_out_at) <= 1
    ) NOT VALID,
  ADD CONSTRAINT ai_sketch_jobs_status_terminal_consistency_check
    CHECK (
      (status IS NOT DISTINCT FROM 'draft'
       AND num_nonnulls(
         started_at, deadline_at, completed_at, failed_at, cancelled_at,
         timed_out_at, failure_category, retry_eligible, terminal_reason,
         error_message
       ) = 0)
      OR (status IS NOT DISTINCT FROM 'queued'
          AND num_nonnulls(
            started_at, deadline_at, completed_at, failed_at, cancelled_at,
            timed_out_at, failure_category, retry_eligible, terminal_reason,
            error_message
          ) = 0)
      OR (status IS NOT DISTINCT FROM 'processing'
          AND started_at IS NOT NULL
          AND deadline_at IS NOT NULL
          AND deadline_at > started_at
          AND num_nonnulls(
            completed_at, failed_at, cancelled_at, timed_out_at, failure_category,
            retry_eligible, terminal_reason, error_message
          ) = 0)
      OR (status IS NOT DISTINCT FROM 'succeeded'
          AND started_at IS NOT NULL
          AND deadline_at IS NOT NULL
          AND deadline_at > started_at
          AND completed_at IS NOT NULL
          AND completed_at >= started_at
          AND num_nonnulls(
            failed_at, cancelled_at, timed_out_at, failure_category, retry_eligible,
            terminal_reason, error_message
          ) = 0)
      OR (status IS NOT DISTINCT FROM 'failed'
          AND completed_at IS NULL
          AND failed_at IS NOT NULL
          AND cancelled_at IS NULL
          AND timed_out_at IS NULL
          AND failure_category IS NOT NULL
          AND failure_category IS DISTINCT FROM 'timeout'
          AND failure_category IS DISTINCT FROM 'cancelled'
          AND retry_eligible IS NOT NULL
          AND terminal_reason IS NOT NULL
          AND btrim(terminal_reason) <> ''
          AND (
            (started_at IS NULL AND deadline_at IS NULL)
            OR (started_at IS NOT NULL
                AND deadline_at IS NOT NULL
                AND deadline_at > started_at
                AND failed_at >= started_at)
          ))
      OR (status IS NOT DISTINCT FROM 'timed_out'
          AND started_at IS NOT NULL
          AND deadline_at IS NOT NULL
          AND deadline_at > started_at
          AND timed_out_at IS NOT NULL
          AND timed_out_at >= deadline_at
          AND completed_at IS NULL
          AND failed_at IS NULL
          AND cancelled_at IS NULL
          AND failure_category IS NOT DISTINCT FROM 'timeout'
          AND retry_eligible IS NOT DISTINCT FROM false
          AND terminal_reason IS NOT NULL
          AND btrim(terminal_reason) <> '')
      OR (status IS NOT DISTINCT FROM 'cancelled'
          AND completed_at IS NULL
          AND failed_at IS NULL
          AND timed_out_at IS NULL
          AND cancelled_at IS NOT NULL
          AND failure_category IS NOT DISTINCT FROM 'cancelled'
          AND retry_eligible IS NOT DISTINCT FROM false
          AND terminal_reason IS NOT NULL
          AND btrim(terminal_reason) <> ''
          AND (
            (started_at IS NULL AND deadline_at IS NULL)
            OR (started_at IS NOT NULL
                AND deadline_at IS NOT NULL
                AND deadline_at > started_at
                AND cancelled_at >= started_at)
          ))
    ) NOT VALID,
  ADD CONSTRAINT ai_sketch_jobs_failure_category_check
    CHECK (failure_category IS NULL OR failure_category IN (
      'configuration_missing', 'invalid_structured_input', 'precondition_failed',
      'invalid_request', 'authentication_failed', 'permission_denied',
      'moderation_blocked', 'rate_limited', 'provider_unavailable',
      'network_failure', 'timeout', 'cancelled', 'invalid_provider_response',
      'invalid_base64', 'invalid_image_format', 'invalid_image_dimensions',
      'image_too_large', 'unsafe_output', 'privacy_failure', 'access_failure',
      'storage_failure', 'lifecycle_conflict', 'budget_blocked',
      'unexpected_provider_error'
    )) NOT VALID,
  ADD CONSTRAINT ai_sketch_jobs_retry_eligibility_check
    CHECK (
      retry_eligible IS NOT TRUE
      OR failure_category IS NOT DISTINCT FROM 'rate_limited'
      OR failure_category IS NOT DISTINCT FROM 'provider_unavailable'
      OR failure_category IS NOT DISTINCT FROM 'network_failure'
    ) NOT VALID,
  ADD CONSTRAINT ai_sketch_jobs_cost_check
    CHECK (
      (status IS NOT DISTINCT FROM 'draft'
       AND num_nonnulls(
         estimated_cost_micros, actual_cost_micros, cost_currency,
         pricing_assumption_version
       ) = 0)
      OR (status IS DISTINCT FROM 'draft'
          AND (estimated_cost_micros IS NULL OR estimated_cost_micros >= 0)
          AND (actual_cost_micros IS NULL OR actual_cost_micros >= 0)
          AND (
            (estimated_cost_micros IS NULL
             AND actual_cost_micros IS NULL
             AND cost_currency IS NULL
             AND pricing_assumption_version IS NULL)
            OR ((estimated_cost_micros IS NOT NULL
                 OR actual_cost_micros IS NOT NULL)
                AND cost_currency IS NOT NULL
                AND cost_currency ~ '^[A-Z]{3}$'
                AND pricing_assumption_version IS NOT NULL
                AND btrim(pricing_assumption_version) <> '')
          ))
    ) NOT VALID,
  ADD CONSTRAINT ai_sketch_jobs_first_preview_request_profile_check
    CHECK (
      (status IS NOT DISTINCT FROM 'draft'
       AND num_nonnulls(
         provider_name, model_name, provider_endpoint, request_image_count,
         request_streaming, request_partial_images, request_size,
         request_quality, output_format, moderation_mode
       ) = 0)
      OR (
        status IS DISTINCT FROM 'draft'
        AND provider_name IS NOT DISTINCT FROM 'openai'
        AND model_name IS NOT DISTINCT FROM 'gpt-image-2-2026-04-21'
        AND provider_endpoint IS NOT DISTINCT FROM '/v1/images/generations'
        AND request_image_count IS NOT DISTINCT FROM 1
        AND request_streaming IS NOT DISTINCT FROM false
        AND request_partial_images IS NOT DISTINCT FROM 0
        AND request_size IS NOT DISTINCT FROM '1024x1024'
        AND request_quality IS NOT DISTINCT FROM 'medium'
        AND output_format IS NOT DISTINCT FROM 'png'
        AND moderation_mode IS NOT DISTINCT FROM 'auto'
      )
    ) NOT VALID,
  ADD CONSTRAINT ai_sketch_jobs_provider_request_identity_check
    CHECK (
      (status IS NOT DISTINCT FROM 'draft' AND provider_request_id IS NULL)
      OR (status IS DISTINCT FROM 'draft' AND (
            provider_request_id IS NULL
            OR (provider_name IS NOT DISTINCT FROM 'openai'
                AND btrim(provider_request_id) <> '')
          ))
    ) NOT VALID;
```

### 33 - 23.4-S01

- Source: Frozen Agent 70B-2 source heading 23.4
- Canonical SHA-256: `92582cd0195a5c8bb595ea79905c75a8425810eae32b30e4cdbc463798a95859`
- Evidence: `novora-fp-phase-a-33-23.4-s01.png`
- Expected result: The exact ai_sketch_outputs CHECK-constraint ALTER succeeds once; every added candidate constraint remains NOT VALID. Row and duplicate counts are n/a.
- STOP: any canonical-hash mismatch, SQL error or warning, missing/truncated result, or failure of the expected result above.

```sql
ALTER TABLE public.ai_sketch_outputs
  ADD CONSTRAINT ai_sketch_outputs_integrity_shape_check
    CHECK (
      num_nonnulls(
        mime_type, byte_size, width_px, height_px, content_sha256
      ) = 0
      OR (
        mime_type IS NOT DISTINCT FROM 'image/png'
        AND byte_size IS NOT NULL
        AND byte_size BETWEEN 1 AND 16777216
        AND width_px IS NOT DISTINCT FROM 1024
        AND height_px IS NOT DISTINCT FROM 1024
        AND content_sha256 IS NOT NULL
        AND content_sha256 ~ '^[0-9a-f]{64}$'
      )
    ) NOT VALID,
  ADD CONSTRAINT ai_sketch_outputs_asset_persistence_check
    CHECK (
      asset_created_at IS NULL
      OR (bucket_name IS NOT NULL
          AND btrim(bucket_name) <> ''
          AND object_path IS NOT NULL
          AND btrim(object_path) <> '')
    ) NOT VALID,
  ADD CONSTRAINT ai_sketch_outputs_asset_validation_status_check
    CHECK (
      asset_validation_status IS NULL
      OR asset_validation_status IN ('pending', 'passed', 'failed')
    ) NOT VALID,
  ADD CONSTRAINT ai_sketch_outputs_asset_validation_consistency_check
    CHECK (
      (asset_validation_status IS NULL
       AND asset_validation_evidence IS NULL
       AND asset_validated_at IS NULL
       AND num_nonnulls(
         mime_type, byte_size, width_px, height_px, content_sha256
       ) = 0)
      OR (asset_validation_status IS NOT DISTINCT FROM 'pending'
          AND asset_created_at IS NOT NULL
          AND bucket_name IS NOT NULL
          AND btrim(bucket_name) <> ''
          AND object_path IS NOT NULL
          AND btrim(object_path) <> ''
          AND asset_validation_evidence IS NULL
          AND asset_validated_at IS NULL
          AND num_nonnulls(
            mime_type, byte_size, width_px, height_px, content_sha256
          ) = 0)
      OR (asset_validation_status IS NOT DISTINCT FROM 'failed'
          AND asset_created_at IS NOT NULL
          AND bucket_name IS NOT NULL
          AND btrim(bucket_name) <> ''
          AND object_path IS NOT NULL
          AND btrim(object_path) <> ''
          AND asset_validation_evidence IS NOT NULL
          AND jsonb_typeof(asset_validation_evidence) IS NOT DISTINCT FROM 'object'
          AND asset_validation_evidence <> '{}'::jsonb
          AND asset_validated_at IS NULL
          AND num_nonnulls(
            mime_type, byte_size, width_px, height_px, content_sha256
          ) = 0)
      OR (asset_validation_status IS NOT DISTINCT FROM 'passed'
          AND asset_created_at IS NOT NULL
          AND bucket_name IS NOT NULL
          AND btrim(bucket_name) <> ''
          AND object_path IS NOT NULL
          AND btrim(object_path) <> ''
          AND asset_validation_evidence IS NOT NULL
          AND jsonb_typeof(asset_validation_evidence) IS NOT DISTINCT FROM 'object'
          AND asset_validation_evidence <> '{}'::jsonb
          AND asset_validated_at IS NOT NULL
          AND asset_validated_at >= asset_created_at
          AND mime_type IS NOT DISTINCT FROM 'image/png'
          AND byte_size IS NOT NULL
          AND byte_size BETWEEN 1 AND 16777216
          AND width_px IS NOT DISTINCT FROM 1024
          AND height_px IS NOT DISTINCT FROM 1024
          AND content_sha256 IS NOT NULL
          AND content_sha256 ~ '^[0-9a-f]{64}$')
    ) NOT VALID,
  ADD CONSTRAINT ai_sketch_outputs_automatic_gate_status_check
    CHECK (
      automatic_gate_status IS NULL
      OR automatic_gate_status IN ('pending', 'passed', 'failed')
    ) NOT VALID,
  ADD CONSTRAINT ai_sketch_outputs_automatic_gate_consistency_check
    CHECK (
      (automatic_gate_status IS NULL
       AND automatic_gate_evidence IS NULL
       AND automatic_gate_policy_version IS NULL
       AND automatic_gate_passed_at IS NULL)
      OR (automatic_gate_status IS NOT DISTINCT FROM 'pending'
          AND asset_validation_status IS NOT DISTINCT FROM 'passed'
          AND asset_validated_at IS NOT NULL
          AND automatic_gate_policy_version IS NOT NULL
          AND btrim(automatic_gate_policy_version) <> ''
          AND automatic_gate_evidence IS NULL
          AND automatic_gate_passed_at IS NULL)
      OR (automatic_gate_status IS NOT DISTINCT FROM 'failed'
          AND asset_validation_status IS NOT DISTINCT FROM 'passed'
          AND asset_validated_at IS NOT NULL
          AND automatic_gate_policy_version IS NOT NULL
          AND btrim(automatic_gate_policy_version) <> ''
          AND automatic_gate_evidence IS NOT NULL
          AND jsonb_typeof(automatic_gate_evidence) IS NOT DISTINCT FROM 'object'
          AND automatic_gate_evidence <> '{}'::jsonb
          AND automatic_gate_passed_at IS NULL)
      OR (automatic_gate_status IS NOT DISTINCT FROM 'passed'
          AND asset_validation_status IS NOT DISTINCT FROM 'passed'
          AND asset_validated_at IS NOT NULL
          AND automatic_gate_policy_version IS NOT NULL
          AND btrim(automatic_gate_policy_version) <> ''
          AND automatic_gate_evidence IS NOT NULL
          AND jsonb_typeof(automatic_gate_evidence) IS NOT DISTINCT FROM 'object'
          AND automatic_gate_evidence <> '{}'::jsonb
          AND automatic_gate_passed_at IS NOT NULL
          AND automatic_gate_passed_at >= asset_validated_at)
    ) NOT VALID,
  ADD CONSTRAINT ai_sketch_outputs_readiness_status_check
    CHECK (
      readiness_status IS NULL
      OR readiness_status IN ('not_ready', 'first_preview_ready', 'revoked')
    ) NOT VALID,
  ADD CONSTRAINT ai_sketch_outputs_current_preview_consistency_check
    CHECK (
      is_current_customer_preview IS NOT TRUE
      OR readiness_status IS NOT DISTINCT FROM 'first_preview_ready'
    ) NOT VALID,
  ADD CONSTRAINT ai_sketch_outputs_readiness_timestamp_state_check
    CHECK (
      (readiness_status IS NULL
       AND first_preview_ready_at IS NULL
       AND readiness_revoked_at IS NULL)
      OR (readiness_status IS NOT DISTINCT FROM 'not_ready'
          AND first_preview_ready_at IS NULL
          AND readiness_revoked_at IS NULL)
      OR (readiness_status IS NOT DISTINCT FROM 'first_preview_ready'
          AND first_preview_ready_at IS NOT NULL
          AND readiness_revoked_at IS NULL)
      OR (readiness_status IS NOT DISTINCT FROM 'revoked'
          AND first_preview_ready_at IS NOT NULL
          AND readiness_revoked_at IS NOT NULL
          AND readiness_revoked_at >= first_preview_ready_at
          AND is_current_customer_preview IS NOT TRUE)
    ) NOT VALID,
  ADD CONSTRAINT ai_sketch_outputs_readiness_chronology_check
    CHECK (
      (asset_validated_at IS NULL
       OR (asset_created_at IS NOT NULL AND asset_validated_at >= asset_created_at))
      AND (automatic_gate_passed_at IS NULL
           OR (asset_validated_at IS NOT NULL
               AND automatic_gate_passed_at >= asset_validated_at))
      AND (first_preview_ready_at IS NULL
           OR (automatic_gate_passed_at IS NOT NULL
               AND first_preview_ready_at >= automatic_gate_passed_at))
      AND (readiness_revoked_at IS NULL
           OR (first_preview_ready_at IS NOT NULL
               AND readiness_revoked_at >= first_preview_ready_at))
    ) NOT VALID,
  ADD CONSTRAINT ai_sketch_outputs_ready_evidence_check
    CHECK (
      (readiness_status IS DISTINCT FROM 'first_preview_ready'
       AND readiness_status IS DISTINCT FROM 'revoked')
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
        AND object_path IS NOT NULL
        AND btrim(object_path) <> ''
        AND bucket_name IS NOT NULL
        AND btrim(bucket_name) <> ''
        AND mime_type IS NOT DISTINCT FROM 'image/png'
        AND byte_size IS NOT NULL
        AND byte_size BETWEEN 1 AND 16777216
        AND width_px IS NOT DISTINCT FROM 1024
        AND height_px IS NOT DISTINCT FROM 1024
        AND content_sha256 IS NOT NULL
        AND content_sha256 ~ '^[0-9a-f]{64}$'
      )
    ) NOT VALID;
```

### 34 - 23.5-S01

- Source: Frozen Agent 70B-2 source heading 23.5
- Canonical SHA-256: `74b7179a16b4cc4c3c615e2e2e16511dd994fb66fa442ff6131512093e5610ad`
- Evidence: `novora-fp-phase-a-34-23.5-s01.png`
- Expected result: This exact composite-target or foreign-key statement succeeds once without warning or error. Do not combine it with adjacent statements; row and duplicate counts are n/a.
- STOP: any canonical-hash mismatch, SQL error or warning, missing/truncated result, or failure of the expected result above.

```sql
CREATE UNIQUE INDEX ai_sketch_jobs_id_brief_uidx
  ON public.ai_sketch_jobs (id, concept_brief_id);
```

### 35 - 23.5-S02

- Source: Frozen Agent 70B-2 source heading 23.5
- Canonical SHA-256: `f1b5c748320efe877cd772800d618f9ac6a132538b91e2acfdc72e04d8b62f4f`
- Evidence: `novora-fp-phase-a-35-23.5-s02.png`
- Expected result: This exact composite-target or foreign-key statement succeeds once without warning or error. Do not combine it with adjacent statements; row and duplicate counts are n/a.
- STOP: any canonical-hash mismatch, SQL error or warning, missing/truncated result, or failure of the expected result above.

```sql
CREATE UNIQUE INDEX ai_sketch_jobs_parent_lineage_target_uidx
  ON public.ai_sketch_jobs (
    id, concept_brief_id, generation_purpose, attempt_number
  );
```

### 36 - 23.5-S03

- Source: Frozen Agent 70B-2 source heading 23.5
- Canonical SHA-256: `be3f2628489d7eb33a2d07e9477c8d77e5f0fbd9c35c1f6ac5403605fb7760e3`
- Evidence: `novora-fp-phase-a-36-23.5-s03.png`
- Expected result: This exact composite-target or foreign-key statement succeeds once without warning or error. Do not combine it with adjacent statements; row and duplicate counts are n/a.
- STOP: any canonical-hash mismatch, SQL error or warning, missing/truncated result, or failure of the expected result above.

```sql
CREATE UNIQUE INDEX ai_sketch_outputs_source_target_uidx
  ON public.ai_sketch_outputs (id, job_id, concept_brief_id);
```

### 37 - 23.5-S04

- Source: Frozen Agent 70B-2 source heading 23.5
- Canonical SHA-256: `5aa97feb78a7632b23ee5bde98676ab4c5f757ae97de59bcb7ea69699ed6ac2d`
- Evidence: `novora-fp-phase-a-37-23.5-s04.png`
- Expected result: This exact composite-target or foreign-key statement succeeds once without warning or error. Do not combine it with adjacent statements; row and duplicate counts are n/a.
- STOP: any canonical-hash mismatch, SQL error or warning, missing/truncated result, or failure of the expected result above.

```sql
ALTER TABLE public.ai_sketch_outputs
  ADD CONSTRAINT ai_sketch_outputs_job_brief_fkey
  FOREIGN KEY (job_id, concept_brief_id)
  REFERENCES public.ai_sketch_jobs (id, concept_brief_id)
  NOT VALID;
```

### 38 - 23.5-S05

- Source: Frozen Agent 70B-2 source heading 23.5
- Canonical SHA-256: `50fe3219c8841718f6b0a0f97a9ef3d8524526df72905fd22592928665458c00`
- Evidence: `novora-fp-phase-a-38-23.5-s05.png`
- Expected result: This exact composite-target or foreign-key statement succeeds once without warning or error. Do not combine it with adjacent statements; row and duplicate counts are n/a.
- STOP: any canonical-hash mismatch, SQL error or warning, missing/truncated result, or failure of the expected result above.

```sql
ALTER TABLE public.ai_sketch_jobs
  ADD CONSTRAINT ai_sketch_jobs_parent_lineage_fkey
  FOREIGN KEY (
    parent_job_id, concept_brief_id,
    parent_generation_purpose, parent_attempt_number
  )
  REFERENCES public.ai_sketch_jobs (
    id, concept_brief_id, generation_purpose, attempt_number
  )
  NOT VALID,
  ADD CONSTRAINT ai_sketch_jobs_source_output_lineage_fkey
  FOREIGN KEY (source_output_id, parent_job_id, concept_brief_id)
  REFERENCES public.ai_sketch_outputs (id, job_id, concept_brief_id)
  NOT VALID;
```

### 39 - 23.6-S01

- Source: Frozen Agent 70B-2 source heading 23.6
- Canonical SHA-256: `b37bcc6c0d8b6ba6bfa1a2fa55b472ba65065080eaced57cee960942bfc1e62a`
- Evidence: `novora-fp-phase-a-39-23.6-s01.png`
- Expected result: This exact unique/support-index statement succeeds once without warning or error. Do not combine it with adjacent statements; row and duplicate counts are n/a.
- STOP: any canonical-hash mismatch, SQL error or warning, missing/truncated result, or failure of the expected result above.

```sql
CREATE UNIQUE INDEX ai_sketch_jobs_idempotency_key_uidx
  ON public.ai_sketch_jobs (idempotency_key)
  WHERE idempotency_key IS NOT NULL;
```

### 40 - 23.6-S02

- Source: Frozen Agent 70B-2 source heading 23.6
- Canonical SHA-256: `4f7bbaf2df1ec0a17e1cdedd8d612a8d2760b1bf1dbefe6eb81c80af495655c0`
- Evidence: `novora-fp-phase-a-40-23.6-s02.png`
- Expected result: This exact unique/support-index statement succeeds once without warning or error. Do not combine it with adjacent statements; row and duplicate counts are n/a.
- STOP: any canonical-hash mismatch, SQL error or warning, missing/truncated result, or failure of the expected result above.

```sql
CREATE UNIQUE INDEX ai_sketch_jobs_attempt_identity_uidx
  ON public.ai_sketch_jobs (concept_brief_id, attempt_number)
  WHERE attempt_number IS NOT NULL;
```

### 41 - 23.6-S03

- Source: Frozen Agent 70B-2 source heading 23.6
- Canonical SHA-256: `26191b3b066c6077712d080f86b917c3030621e62e22c54edd8984c71bf743ff`
- Evidence: `novora-fp-phase-a-41-23.6-s03.png`
- Expected result: This exact unique/support-index statement succeeds once without warning or error. Do not combine it with adjacent statements; row and duplicate counts are n/a.
- STOP: any canonical-hash mismatch, SQL error or warning, missing/truncated result, or failure of the expected result above.

```sql
CREATE UNIQUE INDEX ai_sketch_jobs_provider_request_uidx
  ON public.ai_sketch_jobs (provider_name, provider_request_id)
  WHERE provider_name IS NOT NULL AND provider_request_id IS NOT NULL;
```

### 42 - 23.6-S04

- Source: Frozen Agent 70B-2 source heading 23.6
- Canonical SHA-256: `b0b9d7c289d86145c7dd7438a98ad4914d807e3a5bcc884dafa530555eee1cad`
- Evidence: `novora-fp-phase-a-42-23.6-s04.png`
- Expected result: This exact unique/support-index statement succeeds once without warning or error. Do not combine it with adjacent statements; row and duplicate counts are n/a.
- STOP: any canonical-hash mismatch, SQL error or warning, missing/truncated result, or failure of the expected result above.

```sql
CREATE UNIQUE INDEX ai_sketch_jobs_one_active_purpose_uidx
  ON public.ai_sketch_jobs (concept_brief_id, generation_purpose)
  WHERE status IN ('queued', 'processing');
```

### 43 - 23.6-S05

- Source: Frozen Agent 70B-2 source heading 23.6
- Canonical SHA-256: `114af88f24bc06527aa858fe6e9075982133a8fdc960e370bec91dc05a6506c6`
- Evidence: `novora-fp-phase-a-43-23.6-s05.png`
- Expected result: This exact unique/support-index statement succeeds once without warning or error. Do not combine it with adjacent statements; row and duplicate counts are n/a.
- STOP: any canonical-hash mismatch, SQL error or warning, missing/truncated result, or failure of the expected result above.

```sql
CREATE UNIQUE INDEX ai_sketch_outputs_one_per_job_uidx
  ON public.ai_sketch_outputs (job_id);
```

### 44 - 23.6-S06

- Source: Frozen Agent 70B-2 source heading 23.6
- Canonical SHA-256: `f77a3b96c0fabdfb6717f4ebd988ff22c0f91de557b1e6493e90560df1034e5b`
- Evidence: `novora-fp-phase-a-44-23.6-s06.png`
- Expected result: This exact unique/support-index statement succeeds once without warning or error. Do not combine it with adjacent statements; row and duplicate counts are n/a.
- STOP: any canonical-hash mismatch, SQL error or warning, missing/truncated result, or failure of the expected result above.

```sql
CREATE UNIQUE INDEX ai_sketch_outputs_one_current_customer_preview_uidx
  ON public.ai_sketch_outputs (concept_brief_id)
  WHERE is_current_customer_preview IS TRUE;
```

### 45 - 23.6-S07

- Source: Frozen Agent 70B-2 source heading 23.6
- Canonical SHA-256: `6ec796a3a9329ce0b06263923d1b0f578dc1197c88ed42ae44fcf187f6477ba6`
- Evidence: `novora-fp-phase-a-45-23.6-s07.png`
- Expected result: This exact unique/support-index statement succeeds once without warning or error. Do not combine it with adjacent statements; row and duplicate counts are n/a.
- STOP: any canonical-hash mismatch, SQL error or warning, missing/truncated result, or failure of the expected result above.

```sql
CREATE INDEX ai_sketch_jobs_parent_job_id_idx
  ON public.ai_sketch_jobs (parent_job_id)
  WHERE parent_job_id IS NOT NULL;
```

### 46 - 23.6-S08

- Source: Frozen Agent 70B-2 source heading 23.6
- Canonical SHA-256: `7a3b3b2a8c090e55c80e05f75d753e665c3ae1b50b5bcd125328ab7ca8a20d85`
- Evidence: `novora-fp-phase-a-46-23.6-s08.png`
- Expected result: This exact unique/support-index statement succeeds once without warning or error. Do not combine it with adjacent statements; row and duplicate counts are n/a.
- STOP: any canonical-hash mismatch, SQL error or warning, missing/truncated result, or failure of the expected result above.

```sql
CREATE INDEX ai_sketch_outputs_readiness_lookup_idx
  ON public.ai_sketch_outputs (concept_brief_id, readiness_status);
```

### 47 - 23.6-S09

- Source: Frozen Agent 70B-2 source heading 23.6
- Canonical SHA-256: `82483af631469d290144b8a793c9c4a0179b522aa28526db75a5879f26950cd4`
- Evidence: `novora-fp-phase-a-47-23.6-s09.png`
- Expected result: This exact unique/support-index statement succeeds once without warning or error. Do not combine it with adjacent statements; row and duplicate counts are n/a.
- STOP: any canonical-hash mismatch, SQL error or warning, missing/truncated result, or failure of the expected result above.

```sql
CREATE INDEX ai_sketch_reviews_ai_sketch_output_id_idx
  ON public.ai_sketch_reviews (ai_sketch_output_id);
```

### 48 - V01-A

- Source: Frozen Agent 70B-2 source heading V01
- Canonical SHA-256: `806c8935f4e41661d1bcfef55e52346125534aa11e8e8a19d3936dfcfb9a28f1`
- Evidence: `novora-fp-phase-a-48-v01-a.csv`
- Expected result: verified_baseline_total equals 17, expected_added_total equals 52, actual_candidate_added_total equals 52, and every drift, missing, unexpected, duplicate, type, nullability, default, and invalid-shape count is zero.
- STOP: any canonical-hash mismatch, SQL error or warning, missing/truncated result, or failure of the expected result above.

```sql
WITH verified_q02_baseline_columns(
  table_name, column_name, data_type, udt_name, is_nullable, column_default
) AS (
  VALUES
    ('ai_sketch_jobs', 'id', 'uuid', 'uuid', 'NO', 'gen_random_uuid()'),
    ('ai_sketch_jobs', 'concept_brief_id', 'uuid', 'uuid', 'NO', NULL::text),
    ('ai_sketch_jobs', 'status', 'text', 'text', 'NO', '''draft''::text'),
    ('ai_sketch_jobs', 'prompt_version', 'text', 'text', 'YES', NULL::text),
    ('ai_sketch_jobs', 'prompt_payload', 'jsonb', 'jsonb', 'NO', '''{}''::jsonb'),
    ('ai_sketch_jobs', 'model_name', 'text', 'text', 'YES', NULL::text),
    ('ai_sketch_jobs', 'error_message', 'text', 'text', 'YES', NULL::text),
    ('ai_sketch_jobs', 'created_at', 'timestamp with time zone', 'timestamptz', 'NO', 'now()'),
    ('ai_sketch_jobs', 'updated_at', 'timestamp with time zone', 'timestamptz', 'NO', 'now()'),
    ('ai_sketch_outputs', 'id', 'uuid', 'uuid', 'NO', 'gen_random_uuid()'),
    ('ai_sketch_outputs', 'job_id', 'uuid', 'uuid', 'NO', NULL::text),
    ('ai_sketch_outputs', 'concept_brief_id', 'uuid', 'uuid', 'NO', NULL::text),
    ('ai_sketch_outputs', 'bucket_name', 'text', 'text', 'NO', '''novora-ai-sketches''::text'),
    ('ai_sketch_outputs', 'object_path', 'text', 'text', 'YES', NULL::text),
    ('ai_sketch_outputs', 'preview_status', 'text', 'text', 'NO', '''pending_review''::text'),
    ('ai_sketch_outputs', 'metadata', 'jsonb', 'jsonb', 'NO', '''{}''::jsonb'),
    ('ai_sketch_outputs', 'created_at', 'timestamp with time zone', 'timestamptz', 'NO', 'now()')
), expected_added_columns(
  table_name, column_name, data_type, udt_name, is_nullable, column_default
) AS (
  VALUES
    ('ai_sketch_jobs', 'generation_purpose', 'text', 'text', 'YES', NULL::text),
    ('ai_sketch_jobs', 'idempotency_key', 'text', 'text', 'YES', NULL::text),
    ('ai_sketch_jobs', 'attempt_number', 'smallint', 'int2', 'YES', NULL::text),
    ('ai_sketch_jobs', 'lineage_identity', 'text', 'text', 'YES', NULL::text),
    ('ai_sketch_jobs', 'parent_job_id', 'uuid', 'uuid', 'YES', NULL::text),
    ('ai_sketch_jobs', 'parent_generation_purpose', 'text', 'text', 'YES', NULL::text),
    ('ai_sketch_jobs', 'parent_attempt_number', 'smallint', 'int2', 'YES', NULL::text),
    ('ai_sketch_jobs', 'source_output_id', 'uuid', 'uuid', 'YES', NULL::text),
    ('ai_sketch_jobs', 'design_spec_version', 'text', 'text', 'YES', NULL::text),
    ('ai_sketch_jobs', 'design_spec_hash', 'text', 'text', 'YES', NULL::text),
    ('ai_sketch_jobs', 'hand_sketch_instruction_version', 'text', 'text', 'YES', NULL::text),
    ('ai_sketch_jobs', 'hand_sketch_instruction_hash', 'text', 'text', 'YES', NULL::text),
    ('ai_sketch_jobs', 'provider_name', 'text', 'text', 'YES', NULL::text),
    ('ai_sketch_jobs', 'provider_request_id', 'text', 'text', 'YES', NULL::text),
    ('ai_sketch_jobs', 'provider_endpoint', 'text', 'text', 'YES', NULL::text),
    ('ai_sketch_jobs', 'request_image_count', 'smallint', 'int2', 'YES', NULL::text),
    ('ai_sketch_jobs', 'request_streaming', 'boolean', 'bool', 'YES', NULL::text),
    ('ai_sketch_jobs', 'request_partial_images', 'smallint', 'int2', 'YES', NULL::text),
    ('ai_sketch_jobs', 'request_size', 'text', 'text', 'YES', NULL::text),
    ('ai_sketch_jobs', 'request_quality', 'text', 'text', 'YES', NULL::text),
    ('ai_sketch_jobs', 'output_format', 'text', 'text', 'YES', NULL::text),
    ('ai_sketch_jobs', 'moderation_mode', 'text', 'text', 'YES', NULL::text),
    ('ai_sketch_jobs', 'started_at', 'timestamp with time zone', 'timestamptz', 'YES', NULL::text),
    ('ai_sketch_jobs', 'deadline_at', 'timestamp with time zone', 'timestamptz', 'YES', NULL::text),
    ('ai_sketch_jobs', 'completed_at', 'timestamp with time zone', 'timestamptz', 'YES', NULL::text),
    ('ai_sketch_jobs', 'failed_at', 'timestamp with time zone', 'timestamptz', 'YES', NULL::text),
    ('ai_sketch_jobs', 'cancelled_at', 'timestamp with time zone', 'timestamptz', 'YES', NULL::text),
    ('ai_sketch_jobs', 'timed_out_at', 'timestamp with time zone', 'timestamptz', 'YES', NULL::text),
    ('ai_sketch_jobs', 'failure_category', 'text', 'text', 'YES', NULL::text),
    ('ai_sketch_jobs', 'retry_eligible', 'boolean', 'bool', 'YES', NULL::text),
    ('ai_sketch_jobs', 'terminal_reason', 'text', 'text', 'YES', NULL::text),
    ('ai_sketch_jobs', 'estimated_cost_micros', 'bigint', 'int8', 'YES', NULL::text),
    ('ai_sketch_jobs', 'actual_cost_micros', 'bigint', 'int8', 'YES', NULL::text),
    ('ai_sketch_jobs', 'cost_currency', 'text', 'text', 'YES', NULL::text),
    ('ai_sketch_jobs', 'pricing_assumption_version', 'text', 'text', 'YES', NULL::text),
    ('ai_sketch_outputs', 'mime_type', 'text', 'text', 'YES', NULL::text),
    ('ai_sketch_outputs', 'byte_size', 'bigint', 'int8', 'YES', NULL::text),
    ('ai_sketch_outputs', 'width_px', 'integer', 'int4', 'YES', NULL::text),
    ('ai_sketch_outputs', 'height_px', 'integer', 'int4', 'YES', NULL::text),
    ('ai_sketch_outputs', 'content_sha256', 'text', 'text', 'YES', NULL::text),
    ('ai_sketch_outputs', 'asset_created_at', 'timestamp with time zone', 'timestamptz', 'YES', NULL::text),
    ('ai_sketch_outputs', 'asset_validation_status', 'text', 'text', 'YES', NULL::text),
    ('ai_sketch_outputs', 'asset_validation_evidence', 'jsonb', 'jsonb', 'YES', NULL::text),
    ('ai_sketch_outputs', 'asset_validated_at', 'timestamp with time zone', 'timestamptz', 'YES', NULL::text),
    ('ai_sketch_outputs', 'automatic_gate_status', 'text', 'text', 'YES', NULL::text),
    ('ai_sketch_outputs', 'automatic_gate_evidence', 'jsonb', 'jsonb', 'YES', NULL::text),
    ('ai_sketch_outputs', 'automatic_gate_policy_version', 'text', 'text', 'YES', NULL::text),
    ('ai_sketch_outputs', 'automatic_gate_passed_at', 'timestamp with time zone', 'timestamptz', 'YES', NULL::text),
    ('ai_sketch_outputs', 'readiness_status', 'text', 'text', 'YES', NULL::text),
    ('ai_sketch_outputs', 'first_preview_ready_at', 'timestamp with time zone', 'timestamptz', 'YES', NULL::text),
    ('ai_sketch_outputs', 'readiness_revoked_at', 'timestamp with time zone', 'timestamptz', 'YES', NULL::text),
    ('ai_sketch_outputs', 'is_current_customer_preview', 'boolean', 'bool', 'NO', 'false')
), current_actual_columns AS (
  SELECT table_name, column_name, data_type, udt_name, is_nullable,
         column_default
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name IN ('ai_sketch_jobs', 'ai_sketch_outputs')
), actual_candidate_added_columns AS (
  SELECT actual.*
  FROM current_actual_columns actual
  LEFT JOIN verified_q02_baseline_columns baseline
    USING (table_name, column_name)
  WHERE baseline.column_name IS NULL
), duplicate_expected_definitions AS (
  SELECT table_name, column_name
  FROM expected_added_columns
  GROUP BY table_name, column_name
  HAVING count(*) > 1
), duplicate_actual_identities AS (
  SELECT table_name, column_name
  FROM actual_candidate_added_columns
  GROUP BY table_name, column_name
  HAVING count(*) > 1
)
SELECT
  (SELECT count(*) FROM verified_q02_baseline_columns)
    AS verified_baseline_total,
  (SELECT count(*)
   FROM verified_q02_baseline_columns baseline
   LEFT JOIN current_actual_columns actual
     USING (table_name, column_name)
   WHERE actual.column_name IS NULL) AS missing_baseline_column_count,
  (SELECT count(*)
   FROM verified_q02_baseline_columns baseline
   JOIN current_actual_columns actual
     USING (table_name, column_name)
   WHERE actual.data_type IS DISTINCT FROM baseline.data_type
      OR actual.udt_name IS DISTINCT FROM baseline.udt_name
      OR actual.is_nullable IS DISTINCT FROM baseline.is_nullable
      OR actual.column_default IS DISTINCT FROM baseline.column_default)
    AS baseline_shape_mismatch_count,
  (SELECT count(*) FROM expected_added_columns) AS expected_added_total,
  (SELECT count(*) FROM actual_candidate_added_columns)
    AS actual_candidate_added_total,
  (SELECT count(*)
   FROM expected_added_columns expected
   LEFT JOIN actual_candidate_added_columns actual
     USING (table_name, column_name)
   WHERE actual.column_name IS NULL) AS missing_added_column_count,
  (SELECT count(*)
   FROM actual_candidate_added_columns actual
   LEFT JOIN expected_added_columns expected
     USING (table_name, column_name)
   WHERE expected.column_name IS NULL) AS unexpected_added_column_count,
  (SELECT count(*) FROM duplicate_expected_definitions)
    AS duplicate_expected_definition_count,
  (SELECT count(*) FROM duplicate_actual_identities)
    AS duplicate_actual_identity_count,
  (SELECT count(*)
   FROM expected_added_columns expected
   JOIN actual_candidate_added_columns actual
     USING (table_name, column_name)
   WHERE actual.data_type IS DISTINCT FROM expected.data_type
      OR actual.udt_name IS DISTINCT FROM expected.udt_name)
    AS wrong_added_column_type_count,
  (SELECT count(*)
   FROM expected_added_columns expected
   JOIN actual_candidate_added_columns actual
     USING (table_name, column_name)
   WHERE actual.is_nullable IS DISTINCT FROM expected.is_nullable)
    AS wrong_added_column_nullability_count,
  (SELECT count(*)
   FROM expected_added_columns expected
   JOIN actual_candidate_added_columns actual
     USING (table_name, column_name)
   WHERE actual.column_default IS DISTINCT FROM expected.column_default)
    AS wrong_added_column_default_count,
  (SELECT count(*)
   FROM expected_added_columns expected
   JOIN actual_candidate_added_columns actual
     USING (table_name, column_name)
   WHERE actual.data_type IS DISTINCT FROM expected.data_type
      OR actual.udt_name IS DISTINCT FROM expected.udt_name
      OR actual.is_nullable IS DISTINCT FROM expected.is_nullable
      OR actual.column_default IS DISTINCT FROM expected.column_default)
    AS invalid_added_column_shape_count;
```

### 49 - V01-B

- Source: Frozen Agent 70B-2 source heading V01
- Canonical SHA-256: `1f9fa5012c1dec24c381732eca0c614c044fbadec636f78042f95f20c51dc730`
- Evidence: `novora-fp-phase-a-49-v01-b.csv`
- Expected result: Every named Job invariant count and invalid_job_row_count is zero.
- STOP: any canonical-hash mismatch, SQL error or warning, missing/truncated result, or failure of the expected result above.

```sql
WITH job_invariant_flags AS (
  SELECT
    (status IS NULL OR status NOT IN (
      'draft', 'queued', 'processing', 'succeeded', 'failed', 'timed_out', 'cancelled'
    )) AS invalid_job_status,
    (status IS NOT DISTINCT FROM 'draft'
     AND num_nonnulls(
       generation_purpose, attempt_number, idempotency_key, lineage_identity,
       parent_job_id, parent_generation_purpose, parent_attempt_number,
       source_output_id, design_spec_version, design_spec_hash,
       hand_sketch_instruction_version, hand_sketch_instruction_hash,
       provider_name, model_name, provider_endpoint, request_image_count,
       request_streaming, request_partial_images, request_size, request_quality,
       output_format, moderation_mode, provider_request_id, started_at,
       deadline_at, completed_at, failed_at, cancelled_at, timed_out_at,
       failure_category, retry_eligible, terminal_reason, error_message,
       estimated_cost_micros, actual_cost_micros, cost_currency,
       pricing_assumption_version
     ) <> 0) AS invalid_staged_state,
    (status IS DISTINCT FROM 'draft'
     AND (
       generation_purpose IS NULL OR attempt_number IS NULL
       OR idempotency_key IS NULL OR lineage_identity IS NULL
       OR design_spec_version IS NULL OR btrim(design_spec_version) = ''
       OR design_spec_hash IS NULL
       OR hand_sketch_instruction_version IS NULL
       OR btrim(hand_sketch_instruction_version) = ''
       OR hand_sketch_instruction_hash IS NULL
     )) AS incomplete_nonstaged_identity,
    ((status IS NOT DISTINCT FROM 'draft'
      AND (generation_purpose IS NOT NULL OR attempt_number IS NOT NULL))
     OR (status IS DISTINCT FROM 'draft' AND (
       generation_purpose IS NULL OR attempt_number IS NULL
       OR (generation_purpose IS DISTINCT FROM 'first_preview'
           AND generation_purpose IS DISTINCT FROM 'feedback_regeneration')
       OR (generation_purpose IS NOT DISTINCT FROM 'first_preview'
           AND attempt_number NOT BETWEEN 1 AND 2)
       OR (generation_purpose IS NOT DISTINCT FROM 'feedback_regeneration'
           AND attempt_number NOT BETWEEN 2 AND 3)
     ))) AS invalid_attempt_policy,
    ((
      (status IS NOT DISTINCT FROM 'draft'
       AND generation_purpose IS NULL
       AND lineage_identity IS NULL
       AND parent_job_id IS NULL
       AND parent_generation_purpose IS NULL
       AND parent_attempt_number IS NULL
       AND source_output_id IS NULL)
      OR (status IS DISTINCT FROM 'draft'
          AND generation_purpose IS NOT DISTINCT FROM 'first_preview'
          AND attempt_number IS NOT DISTINCT FROM 1
          AND lineage_identity IS NOT DISTINCT FROM 'first-preview:v1'
          AND parent_job_id IS NULL
          AND parent_generation_purpose IS NULL
          AND parent_attempt_number IS NULL
          AND source_output_id IS NULL)
      OR (status IS DISTINCT FROM 'draft'
          AND generation_purpose IS NOT DISTINCT FROM 'first_preview'
          AND attempt_number IS NOT DISTINCT FROM 2
          AND lineage_identity IS NOT DISTINCT FROM 'first-preview:v1'
          AND parent_job_id IS NOT NULL
          AND parent_generation_purpose IS NOT DISTINCT FROM 'first_preview'
          AND parent_attempt_number IS NOT DISTINCT FROM 1
          AND source_output_id IS NULL)
      OR (status IS DISTINCT FROM 'draft'
          AND generation_purpose IS NOT DISTINCT FROM 'feedback_regeneration'
          AND attempt_number IS NOT NULL
          AND attempt_number BETWEEN 2 AND 3
          AND lineage_identity IS NOT DISTINCT FROM 'first-preview:v1'
          AND parent_job_id IS NOT NULL
          AND parent_generation_purpose IS NOT DISTINCT FROM 'first_preview'
          AND parent_attempt_number IS NOT NULL
          AND attempt_number = parent_attempt_number + 1
          AND source_output_id IS NOT NULL)
    ) IS NOT TRUE) AS invalid_lineage_shape,
    ((started_at IS NULL AND deadline_at IS NOT NULL)
     OR (started_at IS NOT NULL
         AND (deadline_at IS NULL OR deadline_at <= started_at)))
      AS invalid_start_deadline_pairing,
    ((completed_at IS NOT NULL
      AND started_at IS NOT NULL
      AND completed_at < started_at)
     OR (failed_at IS NOT NULL
         AND started_at IS NOT NULL
         AND failed_at < started_at)
     OR (cancelled_at IS NOT NULL
         AND started_at IS NOT NULL
         AND cancelled_at < started_at)
     OR (timed_out_at IS NOT NULL
         AND started_at IS NOT NULL
         AND timed_out_at < started_at))
      AS terminal_timestamp_before_start,
    (timed_out_at IS NOT NULL
     AND (deadline_at IS NULL OR timed_out_at < deadline_at))
      AS timeout_before_deadline,
    (num_nonnulls(
       completed_at, failed_at, cancelled_at, timed_out_at
     ) > 1) AS conflicting_terminal_timestamp,
    ((status IS NOT DISTINCT FROM 'succeeded' AND completed_at IS NULL)
     OR (status IS NOT DISTINCT FROM 'failed' AND failed_at IS NULL)
     OR (status IS NOT DISTINCT FROM 'cancelled' AND cancelled_at IS NULL)
     OR (status IS NOT DISTINCT FROM 'timed_out' AND timed_out_at IS NULL))
      AS missing_status_specific_terminal_timestamp,
    ((completed_at IS NOT NULL AND status IS DISTINCT FROM 'succeeded')
     OR (failed_at IS NOT NULL AND status IS DISTINCT FROM 'failed')
     OR (cancelled_at IS NOT NULL AND status IS DISTINCT FROM 'cancelled')
     OR (timed_out_at IS NOT NULL AND status IS DISTINCT FROM 'timed_out'))
      AS terminal_timestamp_status_mismatch,
    (status IS NOT DISTINCT FROM 'draft'
     AND num_nonnulls(
       started_at, deadline_at, completed_at, failed_at, cancelled_at,
       timed_out_at, failure_category, retry_eligible, terminal_reason,
       error_message
     ) <> 0) AS invalid_staged_terminal_evidence,
    ((status IS NOT DISTINCT FROM 'queued' AND (
        started_at IS NOT NULL OR deadline_at IS NOT NULL
        OR completed_at IS NOT NULL OR failed_at IS NOT NULL
        OR cancelled_at IS NOT NULL OR timed_out_at IS NOT NULL
        OR failure_category IS NOT NULL OR retry_eligible IS NOT NULL
        OR terminal_reason IS NOT NULL OR error_message IS NOT NULL
      ))
     OR (status IS NOT DISTINCT FROM 'processing' AND (
          started_at IS NULL OR deadline_at IS NULL
          OR deadline_at <= started_at OR completed_at IS NOT NULL
          OR failed_at IS NOT NULL OR cancelled_at IS NOT NULL
          OR timed_out_at IS NOT NULL OR failure_category IS NOT NULL
          OR retry_eligible IS NOT NULL OR terminal_reason IS NOT NULL
          OR error_message IS NOT NULL
        ))) AS invalid_nonterminal_status_evidence,
    ((status IS NOT DISTINCT FROM 'succeeded' AND (
        started_at IS NULL OR deadline_at IS NULL
        OR deadline_at <= started_at OR completed_at IS NULL
        OR completed_at < started_at OR failed_at IS NOT NULL
        OR cancelled_at IS NOT NULL OR timed_out_at IS NOT NULL
        OR failure_category IS NOT NULL OR retry_eligible IS NOT NULL
        OR terminal_reason IS NOT NULL OR error_message IS NOT NULL
      ))
     OR (status IS NOT DISTINCT FROM 'failed' AND (
          failed_at IS NULL OR completed_at IS NOT NULL
          OR cancelled_at IS NOT NULL OR timed_out_at IS NOT NULL
          OR failure_category IS NULL
          OR failure_category IS NOT DISTINCT FROM 'timeout'
          OR failure_category IS NOT DISTINCT FROM 'cancelled'
          OR retry_eligible IS NULL OR terminal_reason IS NULL
          OR btrim(terminal_reason) = ''
          OR (started_at IS NULL AND deadline_at IS NOT NULL)
          OR (started_at IS NOT NULL AND (
                deadline_at IS NULL OR deadline_at <= started_at
                OR failed_at < started_at
              ))
        ))
     OR (status IS NOT DISTINCT FROM 'timed_out' AND (
          started_at IS NULL OR deadline_at IS NULL
          OR deadline_at <= started_at OR timed_out_at IS NULL
          OR timed_out_at < deadline_at OR completed_at IS NOT NULL
          OR failed_at IS NOT NULL OR cancelled_at IS NOT NULL
          OR failure_category IS DISTINCT FROM 'timeout'
          OR retry_eligible IS DISTINCT FROM false
          OR terminal_reason IS NULL OR btrim(terminal_reason) = ''
        ))
     OR (status IS NOT DISTINCT FROM 'cancelled' AND (
          completed_at IS NOT NULL OR failed_at IS NOT NULL
          OR timed_out_at IS NOT NULL OR cancelled_at IS NULL
          OR failure_category IS DISTINCT FROM 'cancelled'
          OR retry_eligible IS DISTINCT FROM false
          OR terminal_reason IS NULL OR btrim(terminal_reason) = ''
          OR (started_at IS NULL AND deadline_at IS NOT NULL)
          OR (started_at IS NOT NULL AND (
                deadline_at IS NULL OR deadline_at <= started_at
                OR cancelled_at < started_at
              ))
        ))) AS invalid_terminal_status_evidence,
    ((design_spec_hash IS NOT NULL
      AND design_spec_hash !~ '^[0-9a-f]{64}$')
     OR (hand_sketch_instruction_hash IS NOT NULL
         AND hand_sketch_instruction_hash !~ '^[0-9a-f]{64}$')
     OR (idempotency_key IS NOT NULL
         AND idempotency_key !~ '^[0-9a-f]{64}$')) AS invalid_hash_format,
    (failure_category IS NOT NULL
     AND failure_category NOT IN (
       'configuration_missing', 'invalid_structured_input', 'precondition_failed',
       'invalid_request', 'authentication_failed', 'permission_denied',
       'moderation_blocked', 'rate_limited', 'provider_unavailable',
       'network_failure', 'timeout', 'cancelled', 'invalid_provider_response',
       'invalid_base64', 'invalid_image_format', 'invalid_image_dimensions',
       'image_too_large', 'unsafe_output', 'privacy_failure', 'access_failure',
       'storage_failure', 'lifecycle_conflict', 'budget_blocked',
       'unexpected_provider_error'
     )) AS invalid_failure_category,
    (retry_eligible IS TRUE
     AND failure_category IS DISTINCT FROM 'rate_limited'
     AND failure_category IS DISTINCT FROM 'provider_unavailable'
     AND failure_category IS DISTINCT FROM 'network_failure')
      AS invalid_retry_eligibility,
    (estimated_cost_micros < 0
     OR actual_cost_micros < 0
     OR (cost_currency IS NOT NULL AND cost_currency !~ '^[A-Z]{3}$')
     OR (status IS NOT DISTINCT FROM 'draft' AND num_nonnulls(
       estimated_cost_micros, actual_cost_micros, cost_currency,
       pricing_assumption_version
     ) <> 0)
     OR (status IS DISTINCT FROM 'draft' AND (
       (estimated_cost_micros IS NULL AND actual_cost_micros IS NULL
        AND (cost_currency IS NOT NULL
             OR pricing_assumption_version IS NOT NULL))
       OR ((estimated_cost_micros IS NOT NULL
            OR actual_cost_micros IS NOT NULL)
           AND (cost_currency IS NULL OR cost_currency !~ '^[A-Z]{3}$'
                OR pricing_assumption_version IS NULL
                OR btrim(pricing_assumption_version) = ''))
     ))) IS TRUE AS invalid_cost,
    ((status IS NOT DISTINCT FROM 'draft' AND num_nonnulls(
       provider_name, model_name, provider_endpoint, request_image_count,
       request_streaming, request_partial_images, request_size,
       request_quality, output_format, moderation_mode
     ) <> 0)
     OR (status IS DISTINCT FROM 'draft' AND num_nonnulls(
       provider_name, model_name, provider_endpoint, request_image_count,
       request_streaming, request_partial_images, request_size,
       request_quality, output_format, moderation_mode
     ) <> 10)) AS incomplete_request_profile,
    (status IS DISTINCT FROM 'draft' AND (
       provider_name IS DISTINCT FROM 'openai'
       OR model_name IS DISTINCT FROM 'gpt-image-2-2026-04-21'
       OR provider_endpoint IS DISTINCT FROM '/v1/images/generations'
       OR request_image_count IS DISTINCT FROM 1
       OR request_streaming IS DISTINCT FROM false
       OR request_partial_images IS DISTINCT FROM 0
       OR request_size IS DISTINCT FROM '1024x1024'
       OR request_quality IS DISTINCT FROM 'medium'
       OR output_format IS DISTINCT FROM 'png'
       OR moderation_mode IS DISTINCT FROM 'auto'
     )) AS mismatched_request_profile,
    ((status IS NOT DISTINCT FROM 'draft' AND provider_request_id IS NOT NULL)
     OR (status IS DISTINCT FROM 'draft'
         AND provider_request_id IS NOT NULL
         AND (provider_name IS DISTINCT FROM 'openai'
              OR btrim(provider_request_id) = '')))
      AS provider_request_without_profile
  FROM public.ai_sketch_jobs
)
SELECT
  count(*) FILTER (WHERE invalid_job_status)
    AS invalid_job_status_count,
  count(*) FILTER (WHERE invalid_staged_state)
    AS invalid_staged_state_count,
  count(*) FILTER (WHERE incomplete_nonstaged_identity)
    AS incomplete_nonstaged_identity_count,
  count(*) FILTER (WHERE invalid_attempt_policy)
    AS invalid_attempt_policy_count,
  count(*) FILTER (WHERE invalid_lineage_shape)
    AS invalid_lineage_shape_count,
  count(*) FILTER (WHERE invalid_start_deadline_pairing)
    AS invalid_start_deadline_pairing_count,
  count(*) FILTER (WHERE terminal_timestamp_before_start)
    AS terminal_timestamp_before_start_count,
  count(*) FILTER (WHERE timeout_before_deadline)
    AS timeout_before_deadline_count,
  count(*) FILTER (WHERE conflicting_terminal_timestamp)
    AS conflicting_terminal_timestamp_count,
  count(*) FILTER (WHERE missing_status_specific_terminal_timestamp)
    AS missing_status_specific_terminal_timestamp_count,
  count(*) FILTER (WHERE terminal_timestamp_status_mismatch)
    AS terminal_timestamp_status_mismatch_count,
  count(*) FILTER (WHERE invalid_staged_terminal_evidence)
    AS invalid_staged_terminal_evidence_count,
  count(*) FILTER (WHERE invalid_nonterminal_status_evidence)
    AS invalid_nonterminal_status_evidence_count,
  count(*) FILTER (WHERE invalid_terminal_status_evidence)
    AS invalid_terminal_status_evidence_count,
  count(*) FILTER (WHERE invalid_hash_format)
    AS invalid_hash_format_count,
  count(*) FILTER (WHERE invalid_failure_category)
    AS invalid_failure_category_count,
  count(*) FILTER (WHERE invalid_retry_eligibility)
    AS invalid_retry_eligibility_count,
  count(*) FILTER (WHERE invalid_cost)
    AS invalid_cost_count,
  count(*) FILTER (WHERE incomplete_request_profile)
    AS incomplete_request_profile_count,
  count(*) FILTER (WHERE mismatched_request_profile)
    AS mismatched_request_profile_count,
  count(*) FILTER (WHERE provider_request_without_profile)
    AS provider_request_without_profile_count,
  count(*) FILTER (
    WHERE invalid_job_status
       OR invalid_staged_state
       OR incomplete_nonstaged_identity
       OR invalid_attempt_policy
       OR invalid_lineage_shape
       OR invalid_start_deadline_pairing
       OR terminal_timestamp_before_start
       OR timeout_before_deadline
       OR conflicting_terminal_timestamp
       OR missing_status_specific_terminal_timestamp
       OR terminal_timestamp_status_mismatch
       OR invalid_staged_terminal_evidence
       OR invalid_nonterminal_status_evidence
       OR invalid_terminal_status_evidence
       OR invalid_hash_format
       OR invalid_failure_category
       OR invalid_retry_eligibility
       OR invalid_cost
       OR incomplete_request_profile
       OR mismatched_request_profile
       OR provider_request_without_profile
  ) AS invalid_job_row_count
FROM job_invariant_flags;
```

### 50 - V02

- Source: Frozen Agent 70B-2 source heading V02
- Canonical SHA-256: `e68b2fc113384d0ca9678eb6302a078266fd380d4551b5685df20cd75ca7082a`
- Evidence: `novora-fp-phase-a-50-v02.csv`
- Expected result: Every expected candidate constraint exists with the exact reviewed definition and remains NOT VALID; existing constraints remain separately identified.
- STOP: any canonical-hash mismatch, SQL error or warning, missing/truncated result, or failure of the expected result above.

```sql
SELECT
  rel.relname AS table_name,
  con.conname AS constraint_name,
  con.convalidated AS is_validated,
  pg_catalog.pg_get_constraintdef(con.oid, true) AS exact_definition
FROM pg_catalog.pg_constraint con
JOIN pg_catalog.pg_class rel ON rel.oid = con.conrelid
JOIN pg_catalog.pg_namespace ns ON ns.oid = rel.relnamespace
WHERE ns.nspname = 'public'
  AND rel.relname IN ('ai_sketch_jobs', 'ai_sketch_outputs')
  AND (con.conname LIKE 'ai_sketch_jobs_%' OR con.conname LIKE 'ai_sketch_outputs_%')
ORDER BY rel.relname, con.conname;
```

### 51 - V03

- Source: Frozen Agent 70B-2 source heading V03
- Canonical SHA-256: `093679155d0e0c32904dbd0ab02748954c6dccb9b232339b2e9c292f6058e038`
- Evidence: `novora-fp-phase-a-51-v03.csv`
- Expected result: All 12 named indexes exist with exact reviewed definitions and are valid, ready, and live.
- STOP: any canonical-hash mismatch, SQL error or warning, missing/truncated result, or failure of the expected result above.

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
  AND index_rel.relname IN (
    'ai_sketch_jobs_idempotency_key_uidx',
    'ai_sketch_jobs_attempt_identity_uidx',
    'ai_sketch_jobs_provider_request_uidx',
    'ai_sketch_jobs_one_active_purpose_uidx',
    'ai_sketch_outputs_one_per_job_uidx',
    'ai_sketch_outputs_one_current_customer_preview_uidx',
    'ai_sketch_jobs_id_brief_uidx',
    'ai_sketch_jobs_parent_lineage_target_uidx',
    'ai_sketch_outputs_source_target_uidx',
    'ai_sketch_jobs_parent_job_id_idx',
    'ai_sketch_outputs_readiness_lookup_idx',
    'ai_sketch_reviews_ai_sketch_output_id_idx'
  )
ORDER BY table_name, index_name;
```

### 52 - V04

- Source: Frozen Agent 70B-2 source heading V04
- Canonical SHA-256: `024ccfa94327d6bfe01798a9cc6e6f426d815d931f69f1aab0e91071fe1a37bb`
- Evidence: `novora-fp-phase-a-52-v04.csv`
- Expected result: Every asset, validation, gate, readiness, current, revocation, ownership, privacy, lifecycle, and chronology violation count is zero.
- STOP: any canonical-hash mismatch, SQL error or warning, missing/truncated result, or failure of the expected result above.

```sql
SELECT
  count(*) FILTER (WHERE asset_validation_status IS NOT NULL AND asset_validation_status NOT IN (
    'pending', 'passed', 'failed'
  )) AS invalid_asset_validation_status_count,
  count(*) FILTER (
    WHERE asset_created_at IS NOT NULL
      AND (
        bucket_name IS NULL OR btrim(bucket_name) = ''
        OR object_path IS NULL OR btrim(object_path) = ''
      )
  ) AS invalid_asset_persistence_count,
  count(*) FILTER (
    WHERE (asset_validation_status IS NULL AND (
             asset_validation_evidence IS NOT NULL
             OR asset_validated_at IS NOT NULL
             OR num_nonnulls(
                  mime_type, byte_size, width_px, height_px, content_sha256
                ) <> 0
           ))
       OR (asset_validation_status IS NOT DISTINCT FROM 'pending' AND (
             asset_created_at IS NULL
             OR bucket_name IS NULL OR btrim(bucket_name) = ''
             OR object_path IS NULL OR btrim(object_path) = ''
             OR asset_validation_evidence IS NOT NULL
             OR asset_validated_at IS NOT NULL
             OR num_nonnulls(
                  mime_type, byte_size, width_px, height_px, content_sha256
                ) <> 0
           ))
       OR (asset_validation_status IS NOT DISTINCT FROM 'failed' AND (
             asset_created_at IS NULL
             OR bucket_name IS NULL OR btrim(bucket_name) = ''
             OR object_path IS NULL OR btrim(object_path) = ''
             OR asset_validation_evidence IS NULL
             OR jsonb_typeof(asset_validation_evidence) IS DISTINCT FROM 'object'
             OR asset_validation_evidence = '{}'::jsonb
             OR asset_validated_at IS NOT NULL
             OR num_nonnulls(
                  mime_type, byte_size, width_px, height_px, content_sha256
                ) <> 0
           ))
       OR (asset_validation_status IS NOT DISTINCT FROM 'passed' AND (
             asset_created_at IS NULL
             OR bucket_name IS NULL OR btrim(bucket_name) = ''
             OR object_path IS NULL OR btrim(object_path) = ''
             OR asset_validation_evidence IS NULL
             OR jsonb_typeof(asset_validation_evidence) IS DISTINCT FROM 'object'
             OR asset_validation_evidence = '{}'::jsonb
             OR asset_validated_at IS NULL
             OR asset_validated_at < asset_created_at
             OR mime_type IS DISTINCT FROM 'image/png'
             OR byte_size IS NULL OR byte_size NOT BETWEEN 1 AND 16777216
             OR width_px IS DISTINCT FROM 1024
             OR height_px IS DISTINCT FROM 1024
             OR content_sha256 IS NULL
             OR content_sha256 !~ '^[0-9a-f]{64}$'
           ))
  ) AS invalid_asset_validation_consistency_count,
  count(*) FILTER (WHERE automatic_gate_status IS NOT NULL AND automatic_gate_status NOT IN (
    'pending', 'passed', 'failed'
  )) AS invalid_gate_status_count,
  count(*) FILTER (
    WHERE (automatic_gate_status IS NULL AND (
             automatic_gate_policy_version IS NOT NULL
             OR automatic_gate_evidence IS NOT NULL
             OR automatic_gate_passed_at IS NOT NULL
           ))
       OR (automatic_gate_status IS NOT DISTINCT FROM 'pending' AND (
             asset_validation_status IS DISTINCT FROM 'passed'
             OR asset_validated_at IS NULL
             OR automatic_gate_policy_version IS NULL
             OR btrim(automatic_gate_policy_version) = ''
             OR automatic_gate_evidence IS NOT NULL
             OR automatic_gate_passed_at IS NOT NULL
           ))
       OR (automatic_gate_status IS NOT DISTINCT FROM 'failed' AND (
             asset_validation_status IS DISTINCT FROM 'passed'
             OR asset_validated_at IS NULL
             OR automatic_gate_policy_version IS NULL
             OR btrim(automatic_gate_policy_version) = ''
             OR automatic_gate_evidence IS NULL
             OR jsonb_typeof(automatic_gate_evidence) IS DISTINCT FROM 'object'
             OR automatic_gate_evidence = '{}'::jsonb
             OR automatic_gate_passed_at IS NOT NULL
           ))
       OR (automatic_gate_status IS NOT DISTINCT FROM 'passed' AND (
             asset_validation_status IS DISTINCT FROM 'passed'
             OR asset_validated_at IS NULL
             OR automatic_gate_policy_version IS NULL
             OR btrim(automatic_gate_policy_version) = ''
             OR automatic_gate_evidence IS NULL
             OR jsonb_typeof(automatic_gate_evidence) IS DISTINCT FROM 'object'
             OR automatic_gate_evidence = '{}'::jsonb
             OR automatic_gate_passed_at IS NULL
             OR automatic_gate_passed_at < asset_validated_at
           ))
  ) AS invalid_automatic_gate_consistency_count,
  count(*) FILTER (
    WHERE (readiness_status IS NOT DISTINCT FROM 'first_preview_ready'
           OR readiness_status IS NOT DISTINCT FROM 'revoked')
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
        OR object_path IS NULL
        OR btrim(object_path) = ''
        OR bucket_name IS NULL
        OR btrim(bucket_name) = ''
        OR mime_type IS DISTINCT FROM 'image/png'
        OR byte_size IS NULL
        OR byte_size NOT BETWEEN 1 AND 16777216
        OR width_px IS DISTINCT FROM 1024
        OR height_px IS DISTINCT FROM 1024
        OR content_sha256 IS NULL
        OR content_sha256 !~ '^[0-9a-f]{64}$'
      )
  ) AS invalid_ready_or_revoked_evidence_count,
  count(*) FILTER (
    WHERE is_current_customer_preview IS TRUE
      AND readiness_status IS DISTINCT FROM 'first_preview_ready'
  ) AS invalid_current_count,
  count(*) FILTER (
    WHERE readiness_status IS NOT DISTINCT FROM 'revoked'
      AND (
        first_preview_ready_at IS NULL
        OR readiness_revoked_at IS NULL
        OR readiness_revoked_at < first_preview_ready_at
        OR is_current_customer_preview IS TRUE
      )
  ) AS invalid_revocation_count,
  count(*) FILTER (
    WHERE (readiness_status IS DISTINCT FROM 'revoked' AND readiness_revoked_at IS NOT NULL)
       OR (readiness_status IS NOT DISTINCT FROM 'revoked' AND readiness_revoked_at IS NULL)
       OR (readiness_status IS DISTINCT FROM 'first_preview_ready'
           AND readiness_status IS DISTINCT FROM 'revoked'
           AND first_preview_ready_at IS NOT NULL)
  ) AS invalid_readiness_timestamp_state_count,
  count(*) FILTER (
    WHERE (asset_validated_at IS NOT NULL
           AND (asset_created_at IS NULL OR asset_validated_at < asset_created_at))
       OR (automatic_gate_passed_at IS NOT NULL
           AND (asset_validated_at IS NULL OR automatic_gate_passed_at < asset_validated_at))
       OR (first_preview_ready_at IS NOT NULL
           AND (automatic_gate_passed_at IS NULL OR first_preview_ready_at < automatic_gate_passed_at))
       OR (readiness_revoked_at IS NOT NULL
           AND (first_preview_ready_at IS NULL OR readiness_revoked_at < first_preview_ready_at))
  ) AS invalid_chronology_count
FROM public.ai_sketch_outputs;
```

### 53 - V05

- Source: Frozen Agent 70B-2 source heading V05
- Canonical SHA-256: `6f56cea6d1392d104d8b2b1e13ae294fd7ccaa387a7b70a1c2851517774fee73`
- Evidence: `novora-fp-phase-a-53-v05.csv`
- Expected result: Every duplicate-invariant count is zero.
- STOP: any canonical-hash mismatch, SQL error or warning, missing/truncated result, or failure of the expected result above.

```sql
SELECT
  (SELECT count(*) FROM (
    SELECT idempotency_key FROM public.ai_sketch_jobs
    WHERE idempotency_key IS NOT NULL GROUP BY idempotency_key HAVING count(*) > 1
  ) d) AS duplicate_idempotency_count,
  (SELECT count(*) FROM (
    SELECT concept_brief_id, attempt_number FROM public.ai_sketch_jobs
    WHERE attempt_number IS NOT NULL GROUP BY concept_brief_id, attempt_number HAVING count(*) > 1
  ) d) AS duplicate_attempt_count,
  (SELECT count(*) FROM (
    SELECT provider_name, provider_request_id FROM public.ai_sketch_jobs
    WHERE provider_name IS NOT NULL AND provider_request_id IS NOT NULL
    GROUP BY provider_name, provider_request_id HAVING count(*) > 1
  ) d) AS duplicate_provider_request_count,
  (SELECT count(*) FROM (
    SELECT concept_brief_id, generation_purpose FROM public.ai_sketch_jobs
    WHERE generation_purpose IS NOT NULL AND status IN ('queued', 'processing')
    GROUP BY concept_brief_id, generation_purpose HAVING count(*) > 1
  ) d) AS duplicate_active_purpose_count,
  (SELECT count(*) FROM (
    SELECT job_id FROM public.ai_sketch_outputs GROUP BY job_id HAVING count(*) > 1
  ) d) AS multi_output_job_count,
  (SELECT count(*) FROM (
    SELECT concept_brief_id FROM public.ai_sketch_outputs
    WHERE is_current_customer_preview IS TRUE
    GROUP BY concept_brief_id HAVING count(*) > 1
  ) d) AS duplicate_current_preview_count,
  (SELECT count(*) FROM (
    SELECT id, concept_brief_id FROM public.ai_sketch_jobs
    GROUP BY id, concept_brief_id HAVING count(*) > 1
  ) d) AS duplicate_job_brief_target_count,
  (SELECT count(*) FROM (
    SELECT id, concept_brief_id, generation_purpose, attempt_number
    FROM public.ai_sketch_jobs
    GROUP BY id, concept_brief_id, generation_purpose, attempt_number
    HAVING count(*) > 1
  ) d) AS duplicate_parent_lineage_target_count,
  (SELECT count(*) FROM (
    SELECT id, job_id, concept_brief_id FROM public.ai_sketch_outputs
    GROUP BY id, job_id, concept_brief_id HAVING count(*) > 1
  ) d) AS duplicate_source_output_target_count;
```

## 8. Evidence alternatives and final manifest

For a SELECT result, use the listed `.csv` filename when the complete result can be exported, including headers for a legitimate zero-row result. If a complete zero-row CSV cannot be exported, use the same stem with `-zero.png`. If a SELECT errors, use the same stem with `-error.png` and STOP. Each DDL `.png` must show only that statement's sanitized success or error result.

Create `novora-fp-phase-a-54-manifest-v1.json` outside the repository. It must identify the packet and source blobs/hashes; list exactly one chosen artifact per attempted step with format, SHA-256, row count, duplicate count, expected/actual canonical hash for DDL, explicit hash equality, exact outcome, and exact result values; mark every later step `not_run`; identify the exact last successful statement; and state Phase A COMPLETE or STOPPED, block 23.7 NOT EXECUTED, rollback NOT EXECUTED, and no unapproved action taken.

Do not return row IDs, brief references, customer/contact values, prompts, payloads, notes, object paths, URLs, images, keys, tokens, environment values, or Provider data. Do not copy evidence into the repository.

## 9. Completion boundary

Phase A is complete only when all 53 approved SQL statements have executed in order, every expected result passes, all evidence artifacts and the manifest are complete, V01-A/V01-B/V02-V05 pass, block 23.7 remains unexecuted, rollback remains unexecuted, and no unapproved action occurred. Return the sanitized manifest and evidence summary for independent reconciliation before any application compatibility work.

Successful Phase A does not authorize Production writer activation, Provider calls, Storage changes, deployment, customer visibility, real business-row writes, or block 23.7. Those remain separate gates.
