# NOVORA Agent 70B-1 First Preview Live-Schema Preflight v1

## 1. Purpose, authority, and hard boundary

This is a copy-ready, owner-run metadata verification packet for the existing
NOVORA Production schema. Its purpose is to establish exact current live
metadata before any migration SQL or persistent First Preview implementation is
designed.

This packet is documentation-only, metadata-only, read-only, and unexecuted.
Codex did not connect to Supabase, execute SQL, inspect business rows, inspect
customer data, or change Production. The owner must run each query manually in
the Supabase SQL Editor for the confirmed `novora-production` project and return
only sanitized metadata results.

Every executable SQL block in this document begins with `SELECT` or `WITH`
leading to `SELECT`. The blocks use PostgreSQL metadata catalogues only. They do
not read application-table rows, create temporary objects, use dynamic SQL,
change session settings, invoke state-changing functions, or execute with an
elevated function context.

Exact migration SQL remains blocked until every required sanitized result has
been returned and reviewed. SQL execution is a later, separately approved Agent.

## 2. Evidence classification

### A. Verified repository facts

- Agent 70A / PR #196 merged into `main` with normal merge commit
  `68c0042d1fec70cf07b87d47e6d8ef6f3b74e074`.
- Agent 70A added a server-only, dependency-injected OpenAI GPT Image 2 adapter
  foundation behind the provider-neutral First Preview contract.
- The adapter pins `gpt-image-2-2026-04-21`, builds one non-streaming
  1024-by-1024 medium-quality PNG request with `moderation=auto`, selects a deep
  Hand Sketch Instruction allowlist, validates exactly one canonical base64 PNG
  up to 16 MiB, and normalizes safe provider failure categories.
- The adapter accepts an already-constructed injected client. It does not
  construct a real OpenAI client, read an API key, call a provider by itself,
  persist output, wire an application route, or establish a durable
  `first_preview_ready` state.
- The provider-neutral runtime defines `first_preview_ready` only as an
  internal TypeScript runtime decision. It explicitly reports that no
  persistence mutation was performed.
- Agent 69B's reuse-first plan proposes reusing `ai_sketch_jobs` and
  `ai_sketch_outputs`, while keeping `ai_sketch_reviews` as the later human
  review boundary.

Repository usage is compatibility evidence, not proof of current Production
metadata.

### B. Historical live-schema evidence

Earlier owner-run metadata and verification recorded in the repository history
reported the following at those earlier verification times:

- `public.ai_sketch_jobs`, `public.ai_sketch_outputs`, and
  `public.ai_sketch_reviews` existed.
- RLS was enabled and forced RLS was false on those three AI-sketch tables.
- No explicit policies were visible for those three tables in the supplied
  metadata, and visible grants did not show `anon` or `authenticated` DML
  privileges. This was not a complete independent grant audit.
- `public.ai_sketch_jobs` had a before-row-change trigger named
  `set_ai_sketch_jobs_updated_at` using `set_updated_at()`.
- `public.ai_sketch_reviews` had foreign keys to
  `public.ai_sketch_outputs(id)` and `public.concept_briefs(id)`.
- Later owner-run verification recorded the four legal human-review statuses:
  `internal_draft_not_generated`, `draft_generated_internal_only`,
  `needs_revision`, and `approved_for_customer`; `pending` was excluded.
- Later owner-run verification recorded
  `ai_sketch_reviews_concept_brief_id_key UNIQUE (concept_brief_id)`.
- The durable ledger records `public.concept_briefs`,
  `public.concept_brief_reference_assets`, and `public.admin_notes` as existing.

These are historical observations. This packet does not assume they remain
current.

### C. Currently unknown live-schema facts

Current exact metadata remains unknown for all six approved tables, including:

- Complete columns, positions, PostgreSQL types, UDT names, nullability,
  defaults, identity state, generated state, and comments.
- Current primary keys, unique constraints, foreign keys, referential actions,
  check constraints, indexes, partial predicates, and expressions.
- Current trigger definitions, timing, events, enabled state, function names,
  and function privilege posture.
- Current RLS and forced-RLS flags, policies, roles, commands, expressions, and
  grants.
- Current job/output linkage, status constraints, attempt lineage,
  idempotency, visibility, controlled-asset, failure, retry, cancellation, cost,
  and readiness-evidence fields.
- Whether any compatible customer-feedback relationship already exists.

### D. Agent 69B candidate future fields and constraints

Agent 69B proposed candidate responsibilities and names such as job purpose,
idempotency key, attempt number, parent lineage, structured-input versions and
hashes, timeout/cancellation fields, sanitized failure and retry fields, cost
fields, controlled asset identity, automatic-gate evidence, visibility state,
first-preview-ready time, and a current-customer-preview marker. It also
proposed candidate uniqueness and status constraints.

Those fields and constraints are planning candidates only. This packet never
states that they exist in Production. A compatible existing object must be
reused instead of duplicated.

### E. Facts requiring owner-run read-only evidence

Queries Q01-Q11 below are the required current evidence. Empty, partial,
truncated, unsanitized, or ambiguous output is not sufficient evidence.

## 3. Approved metadata scope

The approved tables are exactly:

- `public.ai_sketch_jobs`
- `public.ai_sketch_outputs`
- `public.ai_sketch_reviews`
- `public.concept_briefs`
- `public.concept_brief_reference_assets`
- `public.admin_notes`

Q11 may reveal a public foreign-key relationship whose other endpoint has a
feedback-like name, but only when that relationship directly touches one of
the six approved tables. It does not inventory unrelated tables or read their
rows.

Do not paste customer rows, customer names, email addresses, telephone or
WhatsApp details, country or region, raw briefs, customer notes, prompts,
reviewer notes, admin-note content, generated image content, provider response
content, asset or Storage paths, public references, row IDs, secrets, tokens,
API keys, or environment values into a result attachment or chat.

## 4. Owner execution rules

For every query:

1. Confirm the Supabase project displayed in the UI is `novora-production`.
2. Run one query block at a time without modifying it.
3. Record the execution in section 6.
4. Sanitize the metadata result before sharing it.
5. Stop if output appears to contain business/customer data or cannot be
   sanitized safely.
6. Do not run any migration or remediation statement after observing a result.

The packet intentionally contains no application-row query and no migration
statement.

## 5. Copy-ready metadata queries

### Q01 - Table existence, relation kind, table comment, and RLS state

Purpose: return one row per approved table, including an explicit missing-table
signal, relation kind, table comment, RLS enabled state, and forced-RLS state.

Expected metadata category: relation inventory and access posture.

```sql
WITH approved_tables(table_name) AS (
  VALUES
    ('ai_sketch_jobs'),
    ('ai_sketch_outputs'),
    ('ai_sketch_reviews'),
    ('concept_briefs'),
    ('concept_brief_reference_assets'),
    ('admin_notes')
)
SELECT
  'public' AS table_schema,
  a.table_name,
  c.oid IS NOT NULL AS verified_existing,
  CASE c.relkind
    WHEN 'r' THEN 'ordinary_table'
    WHEN 'p' THEN 'partitioned_table'
    WHEN 'v' THEN 'view'
    WHEN 'm' THEN 'materialized_view'
    WHEN 'f' THEN 'foreign_table'
    ELSE NULL
  END AS relation_kind,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced,
  obj_description(c.oid, 'pg_class') AS table_comment
FROM approved_tables a
LEFT JOIN pg_catalog.pg_namespace n
  ON n.nspname = 'public'
LEFT JOIN pg_catalog.pg_class c
  ON c.relnamespace = n.oid
 AND c.relname = a.table_name
ORDER BY a.table_name;
```

Capture: complete the Q01 row in section 6.

### Q02 - Complete column definitions

Purpose: verify column positions, names, formatted PostgreSQL types, UDT names,
nullability, defaults, identity/generated state, and column comments.

Expected metadata category: column inventory.

```sql
SELECT
  cols.table_schema,
  cols.table_name,
  cols.ordinal_position,
  cols.column_name,
  cols.data_type,
  cols.udt_schema,
  cols.udt_name,
  pg_catalog.format_type(att.atttypid, att.atttypmod) AS formatted_type,
  cols.is_nullable,
  cols.column_default,
  cols.is_identity,
  cols.identity_generation,
  cols.is_generated,
  cols.generation_expression,
  col_description(cls.oid, att.attnum) AS column_comment
FROM information_schema.columns cols
JOIN pg_catalog.pg_namespace ns
  ON ns.nspname = cols.table_schema
JOIN pg_catalog.pg_class cls
  ON cls.relnamespace = ns.oid
 AND cls.relname = cols.table_name
JOIN pg_catalog.pg_attribute att
  ON att.attrelid = cls.oid
 AND att.attname = cols.column_name
 AND att.attnum > 0
 AND NOT att.attisdropped
WHERE cols.table_schema = 'public'
  AND cols.table_name IN (
    'ai_sketch_jobs',
    'ai_sketch_outputs',
    'ai_sketch_reviews',
    'concept_briefs',
    'concept_brief_reference_assets',
    'admin_notes'
  )
ORDER BY cols.table_name, cols.ordinal_position;
```

Capture: complete the Q02 row in section 6.

### Q03 - Primary, unique, check, and exclusion constraints

Purpose: verify exact non-foreign-key constraints and whether each constraint is
validated, deferrable, or initially deferred.

Expected metadata category: constraint inventory.

```sql
SELECT
  ns.nspname AS table_schema,
  rel.relname AS table_name,
  con.conname AS constraint_name,
  CASE con.contype
    WHEN 'p' THEN 'primary_key'
    WHEN 'u' THEN 'unique'
    WHEN 'c' THEN 'check'
    WHEN 'x' THEN 'exclusion'
    ELSE con.contype::text
  END AS constraint_kind,
  con.convalidated AS is_validated,
  con.condeferrable AS is_deferrable,
  con.condeferred AS is_initially_deferred,
  pg_catalog.pg_get_constraintdef(con.oid, true) AS exact_definition
FROM pg_catalog.pg_constraint con
JOIN pg_catalog.pg_class rel
  ON rel.oid = con.conrelid
JOIN pg_catalog.pg_namespace ns
  ON ns.oid = rel.relnamespace
WHERE ns.nspname = 'public'
  AND rel.relname IN (
    'ai_sketch_jobs',
    'ai_sketch_outputs',
    'ai_sketch_reviews',
    'concept_briefs',
    'concept_brief_reference_assets',
    'admin_notes'
  )
  AND con.contype IN ('p', 'u', 'c', 'x')
ORDER BY rel.relname, constraint_kind, con.conname;
```

Capture: complete the Q03 row in section 6.

### Q04 - Foreign keys, column mappings, and referential actions

Purpose: verify every outbound foreign key from an approved table, its ordered
source/target column mapping, and its parent-change and parent-removal actions.

Expected metadata category: relationship inventory.

```sql
SELECT
  src_ns.nspname AS source_schema,
  src.relname AS source_table,
  con.conname AS constraint_name,
  array_agg(src_att.attname ORDER BY key_map.position) AS source_columns,
  target_ns.nspname AS target_schema,
  target.relname AS target_table,
  array_agg(target_att.attname ORDER BY key_map.position) AS target_columns,
  CASE con.confupdtype
    WHEN 'a' THEN 'no_action'
    WHEN 'r' THEN 'restrict'
    WHEN 'c' THEN 'cascade'
    WHEN 'n' THEN 'set_null'
    WHEN 'd' THEN 'set_default'
    ELSE con.confupdtype::text
  END AS parent_change_action,
  CASE con.confdeltype
    WHEN 'a' THEN 'no_action'
    WHEN 'r' THEN 'restrict'
    WHEN 'c' THEN 'cascade'
    WHEN 'n' THEN 'set_null'
    WHEN 'd' THEN 'set_default'
    ELSE con.confdeltype::text
  END AS parent_removal_action,
  CASE con.confmatchtype
    WHEN 'f' THEN 'full'
    WHEN 'p' THEN 'partial'
    WHEN 's' THEN 'simple'
    ELSE con.confmatchtype::text
  END AS match_kind,
  con.convalidated AS is_validated,
  con.condeferrable AS is_deferrable,
  con.condeferred AS is_initially_deferred,
  pg_catalog.pg_get_constraintdef(con.oid, true) AS exact_definition
FROM pg_catalog.pg_constraint con
JOIN pg_catalog.pg_class src
  ON src.oid = con.conrelid
JOIN pg_catalog.pg_namespace src_ns
  ON src_ns.oid = src.relnamespace
JOIN pg_catalog.pg_class target
  ON target.oid = con.confrelid
JOIN pg_catalog.pg_namespace target_ns
  ON target_ns.oid = target.relnamespace
JOIN LATERAL unnest(con.conkey, con.confkey) WITH ORDINALITY
  AS key_map(source_attnum, target_attnum, position)
  ON true
JOIN pg_catalog.pg_attribute src_att
  ON src_att.attrelid = src.oid
 AND src_att.attnum = key_map.source_attnum
JOIN pg_catalog.pg_attribute target_att
  ON target_att.attrelid = target.oid
 AND target_att.attnum = key_map.target_attnum
WHERE con.contype = 'f'
  AND src_ns.nspname = 'public'
  AND src.relname IN (
    'ai_sketch_jobs',
    'ai_sketch_outputs',
    'ai_sketch_reviews',
    'concept_briefs',
    'concept_brief_reference_assets',
    'admin_notes'
  )
GROUP BY
  src_ns.nspname,
  src.relname,
  con.conname,
  target_ns.nspname,
  target.relname,
  con.confupdtype,
  con.confdeltype,
  con.confmatchtype,
  con.convalidated,
  con.condeferrable,
  con.condeferred,
  con.oid
ORDER BY src.relname, con.conname;
```

Capture: complete the Q04 row in section 6.

### Q05 - Indexes, uniqueness, predicates, and expressions

Purpose: verify primary/unique/index state, exact definitions, partial-index
predicates, and expression-index expressions.

Expected metadata category: index inventory.

```sql
SELECT
  table_ns.nspname AS table_schema,
  table_rel.relname AS table_name,
  index_rel.relname AS index_name,
  idx.indisprimary AS is_primary,
  idx.indisunique AS is_unique,
  idx.indisexclusion AS is_exclusion,
  idx.indisvalid AS is_valid,
  idx.indisready AS is_ready,
  idx.indislive AS is_live,
  idx.indnkeyatts AS key_attribute_count,
  idx.indnatts AS total_attribute_count,
  pg_catalog.pg_get_indexdef(index_rel.oid) AS exact_definition,
  pg_catalog.pg_get_expr(idx.indpred, idx.indrelid, true) AS partial_predicate,
  pg_catalog.pg_get_expr(idx.indexprs, idx.indrelid, true) AS expression_definition
FROM pg_catalog.pg_index idx
JOIN pg_catalog.pg_class table_rel
  ON table_rel.oid = idx.indrelid
JOIN pg_catalog.pg_namespace table_ns
  ON table_ns.oid = table_rel.relnamespace
JOIN pg_catalog.pg_class index_rel
  ON index_rel.oid = idx.indexrelid
WHERE table_ns.nspname = 'public'
  AND table_rel.relname IN (
    'ai_sketch_jobs',
    'ai_sketch_outputs',
    'ai_sketch_reviews',
    'concept_briefs',
    'concept_brief_reference_assets',
    'admin_notes'
  )
ORDER BY table_rel.relname, index_rel.relname;
```

Capture: complete the Q05 row in section 6.

### Q06 - Triggers, timing/events, enabled state, and functions

Purpose: verify non-internal triggers, their timing, row/statement level,
event flags, enabled state, exact definition, function identity, and whether the
function runs with owner privilege.

Expected metadata category: trigger and function inventory.

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
JOIN pg_catalog.pg_class table_rel
  ON table_rel.oid = trig.tgrelid
JOIN pg_catalog.pg_namespace table_ns
  ON table_ns.oid = table_rel.relnamespace
JOIN pg_catalog.pg_proc proc
  ON proc.oid = trig.tgfoid
JOIN pg_catalog.pg_namespace function_ns
  ON function_ns.oid = proc.pronamespace
WHERE table_ns.nspname = 'public'
  AND table_rel.relname IN (
    'ai_sketch_jobs',
    'ai_sketch_outputs',
    'ai_sketch_reviews',
    'concept_briefs',
    'concept_brief_reference_assets',
    'admin_notes'
  )
  AND NOT trig.tgisinternal
ORDER BY table_rel.relname, trig.tgname;
```

Capture: complete the Q06 row in section 6.

### Q07 - RLS policy definitions

Purpose: verify policy names, permissive/restrictive posture, command category,
roles, predicate expressions, and row-check expressions.

Expected metadata category: RLS policy inventory.

```sql
SELECT
  ns.nspname AS table_schema,
  rel.relname AS table_name,
  policy.polname AS policy_name,
  policy.polpermissive AS is_permissive,
  CASE policy.polcmd
    WHEN 'r' THEN 'read'
    WHEN 'a' THEN 'row_add'
    WHEN 'w' THEN 'row_change'
    WHEN 'd' THEN 'row_remove'
    WHEN '*' THEN 'all_commands'
    ELSE policy.polcmd::text
  END AS command_category,
  CASE
    WHEN policy.polroles = ARRAY[0::oid] THEN ARRAY['public']::text[]
    ELSE ARRAY(
      SELECT pg_catalog.pg_get_userbyid(role_oid)
      FROM unnest(policy.polroles) AS role_oid
      ORDER BY pg_catalog.pg_get_userbyid(role_oid)
    )
  END AS policy_roles,
  pg_catalog.pg_get_expr(policy.polqual, policy.polrelid, true) AS using_expression,
  pg_catalog.pg_get_expr(policy.polwithcheck, policy.polrelid, true) AS row_check_expression
FROM pg_catalog.pg_policy policy
JOIN pg_catalog.pg_class rel
  ON rel.oid = policy.polrelid
JOIN pg_catalog.pg_namespace ns
  ON ns.oid = rel.relnamespace
WHERE ns.nspname = 'public'
  AND rel.relname IN (
    'ai_sketch_jobs',
    'ai_sketch_outputs',
    'ai_sketch_reviews',
    'concept_briefs',
    'concept_brief_reference_assets',
    'admin_notes'
  )
ORDER BY rel.relname, policy.polname;
```

Capture: complete the Q07 row in section 6. Zero rows is evidence only when the
owner confirms the complete result was returned.

### Q08 - Table grants by role

Purpose: verify every visible table grant by grantor, grantee, privilege,
grantable state, and hierarchy state.

Expected metadata category: grant inventory.

```sql
SELECT
  grantor,
  grantee,
  table_schema,
  table_name,
  privilege_type,
  is_grantable,
  with_hierarchy
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN (
    'ai_sketch_jobs',
    'ai_sketch_outputs',
    'ai_sketch_reviews',
    'concept_briefs',
    'concept_brief_reference_assets',
    'admin_notes'
  )
ORDER BY table_name, grantee, privilege_type, grantor;
```

Capture: complete the Q08 row in section 6.

### Q09 - Focused `ai_sketch_reviews` safety constraints

Purpose: verify the exact current review constraints and produce metadata-only
signals for the four legal statuses, exclusion of `pending`, Concept Brief
uniqueness, and review-to-output linkage.

Expected metadata category: focused human-review compatibility evidence.

```sql
WITH review_constraints AS (
  SELECT
    con.oid,
    con.conname,
    con.contype,
    pg_catalog.pg_get_constraintdef(con.oid, true) AS definition
  FROM pg_catalog.pg_constraint con
  JOIN pg_catalog.pg_class rel
    ON rel.oid = con.conrelid
  JOIN pg_catalog.pg_namespace ns
    ON ns.oid = rel.relnamespace
  WHERE ns.nspname = 'public'
    AND rel.relname = 'ai_sketch_reviews'
)
SELECT
  conname AS constraint_name,
  CASE contype
    WHEN 'p' THEN 'primary_key'
    WHEN 'u' THEN 'unique'
    WHEN 'f' THEN 'foreign_key'
    WHEN 'c' THEN 'check'
    ELSE contype::text
  END AS constraint_kind,
  definition AS exact_definition,
  position('internal_draft_not_generated' IN definition) > 0 AS has_internal_not_generated,
  position('draft_generated_internal_only' IN definition) > 0 AS has_internal_generated,
  position('needs_revision' IN definition) > 0 AS has_needs_revision,
  position('approved_for_customer' IN definition) > 0 AS has_customer_approval,
  position('pending' IN lower(definition)) > 0 AS mentions_pending,
  position('UNIQUE (concept_brief_id)' IN definition) > 0 AS is_concept_brief_unique,
  position('FOREIGN KEY (ai_sketch_output_id)' IN definition) > 0 AS links_review_to_output
FROM review_constraints
ORDER BY constraint_kind, constraint_name;
```

Capture: complete the Q09 row in section 6. Interpret status signals only on the
review-status check row, not across unrelated constraints.

### Q10 - Existing capability-field inventory

Purpose: identify current metadata whose names may already support Agent 69B's
attempt, idempotency, visibility, asset, failure, cost, retry, cancellation, or
lineage responsibilities. This is discovery, not proof of semantic
compatibility.

Expected metadata category: reuse-first candidate compatibility evidence.

```sql
SELECT
  table_schema,
  table_name,
  ordinal_position,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default,
  CASE
    WHEN column_name ~ '(attempt|idempot)' THEN 'attempt_or_idempotency'
    WHEN column_name ~ '(visibility|visible|ready)' THEN 'visibility_or_readiness'
    WHEN column_name ~ '(asset|storage|object|bucket|mime|checksum|hash)' THEN 'asset_or_integrity'
    WHEN column_name ~ '(failure|error)' THEN 'failure'
    WHEN column_name ~ '(cost|currency|price|budget)' THEN 'cost_or_budget'
    WHEN column_name ~ '(retry|cancel|timeout)' THEN 'retry_or_terminal_control'
    WHEN column_name ~ '(parent|lineage|version|sequence|current)' THEN 'lineage_or_version'
    WHEN column_name ~ '(provider|model|quality)' THEN 'provider_metadata'
    ELSE 'other_related'
  END AS capability_category
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'ai_sketch_jobs',
    'ai_sketch_outputs',
    'ai_sketch_reviews',
    'concept_briefs',
    'concept_brief_reference_assets',
    'admin_notes'
  )
  AND column_name ~ '(attempt|idempot|visibility|visible|ready|asset|storage|object|bucket|mime|checksum|hash|failure|error|cost|currency|price|budget|retry|cancel|timeout|parent|lineage|version|sequence|current|provider|model|quality)'
ORDER BY table_name, ordinal_position;
```

Capture: complete the Q10 row in section 6. A name match does not authorize a
new use; exact definition and semantics must be reviewed.

### Q11 - Feedback-compatible foreign-key relationship discovery

Purpose: discover metadata-only foreign-key relationships with at least one
approved endpoint and flag relationship names that may indicate an existing
feedback, comment, revision, request, or response model.

Expected metadata category: relationship compatibility evidence.

```sql
WITH approved_tables(table_name) AS (
  VALUES
    ('ai_sketch_jobs'),
    ('ai_sketch_outputs'),
    ('ai_sketch_reviews'),
    ('concept_briefs'),
    ('concept_brief_reference_assets'),
    ('admin_notes')
), related_foreign_keys AS (
  SELECT
    con.oid,
    con.conname,
    src.relname AS source_table,
    target.relname AS target_table,
    pg_catalog.pg_get_constraintdef(con.oid, true) AS definition
  FROM pg_catalog.pg_constraint con
  JOIN pg_catalog.pg_class src
    ON src.oid = con.conrelid
  JOIN pg_catalog.pg_namespace src_ns
    ON src_ns.oid = src.relnamespace
  JOIN pg_catalog.pg_class target
    ON target.oid = con.confrelid
  JOIN pg_catalog.pg_namespace target_ns
    ON target_ns.oid = target.relnamespace
  WHERE con.contype = 'f'
    AND src_ns.nspname = 'public'
    AND target_ns.nspname = 'public'
    AND (
      src.relname IN (SELECT table_name FROM approved_tables)
      OR target.relname IN (SELECT table_name FROM approved_tables)
    )
)
SELECT
  source_table,
  conname AS constraint_name,
  target_table,
  definition AS exact_definition,
  concat_ws(' ', source_table, conname, target_table)
    ~* '(feedback|remark|revision|request|response)' AS feedback_compatible_name_signal
FROM related_foreign_keys
ORDER BY source_table, constraint_name, target_table;
```

Capture: complete the Q11 row in section 6. If no compatible relationship is
found, that does not prove no feedback table exists unless the approved future
scope is expanded by a separate decision.

## 6. Owner result-capture template

Complete every cell. Use `no` rather than leaving a field blank.

| Query ID | Purpose | Expected metadata category | Owner executed (yes/no) | Execution date | Row count | Sanitized result attached (yes/no) | Unexpected object found | Blocker | Follow-up required |
| --- | --- | --- | --- | --- | ---: | --- | --- | --- | --- |
| Q01 | Relation existence, kind, comments, RLS flags | Relation/access inventory | no |  |  | no |  |  |  |
| Q02 | Complete columns | Column inventory | no |  |  | no |  |  |  |
| Q03 | Non-FK constraints | Constraint inventory | no |  |  | no |  |  |  |
| Q04 | Foreign keys and actions | Relationship inventory | no |  |  | no |  |  |  |
| Q05 | Indexes and predicates | Index inventory | no |  |  | no |  |  |  |
| Q06 | Triggers and functions | Trigger/function inventory | no |  |  | no |  |  |  |
| Q07 | RLS policies | Policy inventory | no |  |  | no |  |  |  |
| Q08 | Role table grants | Grant inventory | no |  |  | no |  |  |  |
| Q09 | Review safety constraints | Focused review evidence | no |  |  | no |  |  |  |
| Q10 | Existing capability fields | Reuse compatibility | no |  |  | no |  |  |  |
| Q11 | Feedback-compatible relationships | Relationship compatibility | no |  |  | no |  |  |  |

Owner result handling:

- Attach only sanitized metadata output.
- Do not attach screenshots that expose secrets, browser sessions, unrelated
  projects, or business/customer rows.
- Do not paste customer rows, secrets, tokens, prompts, notes, image content,
  provider content, asset paths, public references, or row IDs.
- If a result is too large, export only the query's complete metadata result;
  do not replace it with a partial screenshot.

## 7. Consolidated live inventory template

Populate this only from reviewed, sanitized Q01-Q11 results. Add one row per
field, constraint, index, trigger, policy, or grant that affects First Preview.

| Table | Field, constraint, index, trigger, policy, or grant | Verified existing | Exact live definition | Compatible with Agent 69B plan | Migration delta required | Unresolved | Evidence query ID |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `public.ai_sketch_jobs` |  |  |  |  |  |  |  |
| `public.ai_sketch_outputs` |  |  |  |  |  |  |  |
| `public.ai_sketch_reviews` |  |  |  |  |  |  |  |
| `public.concept_briefs` |  |  |  |  |  |  |  |
| `public.concept_brief_reference_assets` |  |  |  |  |  |  |  |
| `public.admin_notes` |  |  |  |  |  |  |  |

Required focused conclusions after review:

- Whether the four legal `ai_sketch_reviews` statuses remain exact and
  `pending` remains excluded.
- Whether `UNIQUE (concept_brief_id)` remains enforced on
  `ai_sketch_reviews` and whether any overlapping index exists.
- Whether review-to-output and review-to-brief foreign keys remain present,
  including exact referential actions.
- Whether RLS remains enabled and forced RLS remains false or has changed for
  jobs, outputs, and reviews.
- Whether existing fields already satisfy attempt, idempotency, visibility,
  asset, failure, cost, retry, cancellation, or lineage requirements.
- Whether any feedback-compatible relationship already exists.

## 8. Fail-closed review and migration gates

Exact migration SQL must remain blocked until all Q01-Q11 outputs are complete,
sanitized, attached, and reviewed into the consolidated inventory.

Stop before migration design when:

- An expected table is missing or has an unexpected relation kind.
- Query output is incomplete, truncated, ambiguous, or internally inconsistent.
- A constraint or index conflicts with repository assumptions.
- A compatible existing field or object already solves a proposed requirement.
- RLS, policy, trigger, function privilege, or grant state is unclear.
- Output contains possible business/customer data or cannot be sanitized safely.
- Production metadata differs from repository history.
- The legal review statuses, review uniqueness, or review/output linkage cannot
  be confirmed exactly.
- Feedback compatibility cannot be determined within the approved scope.

Do not repair, normalize, or migrate anything during metadata verification.
Do not infer readiness from provider success, asset identity, URL presence,
human review, or historical documentation.

## 9. Required sequence after this packet

1. Agent 70B-1 supplies this owner-run SELECT-only metadata packet.
2. The owner manually executes Q01-Q11 and returns sanitized results.
3. A separately approved Agent reviews those results and prepares exact
   additive migration SQL, reusing compatible live objects.
4. A later separately approved SQL Agent performs any authorized SQL execution.
5. A separate slice implements private generated-asset Storage and secure
   server-mediated or short-lived signed access.
6. A separate provider/environment slice constructs the real provider client,
   handles credentials, and enforces budget, limiter, and call authorization.
7. Only after those boundaries pass may a separate implementation wire the
   confirmed-persistence generation trigger and customer preview route.

No later stage is implemented or approved by Agent 70B-1.

## 10. Agent 70B-1 safety record

Agent 70B-1 does not connect to Supabase, execute SQL, inspect business or
customer rows, inspect secrets, change schema/RLS/policies/grants/triggers,
operate Storage, access a provider, generate an image, change app/runtime/test
code, wire a route, change an environment, deploy, or operate Production.
