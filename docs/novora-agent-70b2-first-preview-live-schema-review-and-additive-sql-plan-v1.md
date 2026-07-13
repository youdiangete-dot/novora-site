# NOVORA Agent 70B-2 First Preview Live-Schema Review And Additive SQL Plan v1

## 1. Purpose and hard boundary

This document reviews the owner-supplied Agent 70B-1 live-schema metadata and
prepares an additive, reuse-first SQL candidate plan for NOVORA First Preview.
It is documentation-only and offline.

No SQL was executed. Codex did not connect to Supabase, use Supabase MCP, use a
database CLI or connection string, inspect Production rows or customer data,
read secrets or environment values, operate Storage, call an image provider,
generate an image, deploy, or change Production. No migration or `.sql` file
was created. Application, runtime, route, component, test, package, dependency,
Storage, environment, and deployment code are unchanged.

Every SQL statement below is either a candidate for a later separately approved
SQL Agent or an owner-run `SELECT`-only preflight. Nothing in this document is
authorization to execute SQL.

## 2. Product authority

The governing direction remains:

- Generation may begin only after durable Concept Brief persistence is
  confirmed with a valid internal UUID and valid `NOVORA-CB-...` reference.
- One AI hand-drawn First Preview may become customer-visible immediately after
  every trusted automatic safety, privacy, identity, lifecycle, asset,
  output-validity, access-control, and false-success gate passes.
- Per-image human pre-approval is not the initial First Preview display gate.
- Human review is a later structural, gemstone-orientation, composition,
  construction, manufacturability, correction, regeneration, feedback, and
  formal downstream decision workflow.
- Provider success, an output row, an object path, an asset identifier, or a URL
  alone never means `first_preview_ready`.
- Generated assets remain private. Later customer delivery must be
  server-mediated or use narrowly scoped, short-lived signed access. Permanent
  public generated-asset URLs are prohibited.
- The First Preview is an early AI hand-drawn concept direction. It is not CAD,
  a quotation, payment approval, an order confirmation, gemstone approval,
  manufacturing approval, production approval, or a manufacturability
  guarantee. Paid CAD and formal production decisions remain later and
  human-controlled.

## 3. Evidence manifest

The owner identified the evidence as sanitized metadata manually collected from
the `novora-production` project on 2026-07-13. Codex read only the supplied
evidence directory and did not query Supabase.

| Query | Primary evidence file | Expected rows | Validated rows | Evidence form | Result |
| --- | --- | ---: | ---: | --- | --- |
| Q01 | `NOVORA_70B1_Q01_relation_inventory_2026-07-13.csv` | 6 | 6 | Complete CSV metadata | Pass |
| Q02 | `NOVORA_70B1_Q02_columns_2026-07-13.csv` | 63 | 63 | Complete CSV metadata | Pass |
| Q03 | `NOVORA_70B1_Q03_constraints_2026-07-13.csv` | 9 | 9 | Complete CSV metadata | Pass |
| Q04 | `NOVORA_70B1_Q04_foreign_keys_2026-07-13.csv` | 7 | 7 | Complete CSV metadata | Pass |
| Q05 | `NOVORA_70B1_Q05_indexes_2026-07-13.csv` | 14 | 14 | Complete CSV metadata | Pass |
| Q06 | `NOVORA_70B1_Q06_triggers_2026-07-13.csv` | 2 | 2 | Complete CSV metadata | Pass |
| Q07 | `NOVORA_70B1_Q07_rls_policies_2026-07-13.docx` | 0 | 0 | Owner-attested screenshot | Pass with limitation |
| Q08 | `NOVORA_70B1_Q08_table_grants_2026-07-13.csv` | 103 | 103 | Complete visible direct-grant CSV | Pass with interpretation limit |
| Q09 | `NOVORA_70B1_Q09_review_safety_constraints_2026-07-13.csv` | 5 | 5 | Complete CSV metadata | Pass |
| Q10 | `NOVORA_70B1_Q10_capability_fields_2026-07-13.csv` | 10 | 10 | Column-name match CSV | Pass with false-positive review |
| Q11 | `NOVORA_70B1_Q11_feedback_relationships_2026-07-13.csv` | 9 | 9 | Direct-relationship CSV metadata | Pass with scope limit |

The supplemental owner summary TXT was present but was not used as a substitute
for any primary Q01-Q11 result. No raw evidence file was copied into the
repository.

## 4. Q01-Q11 filenames

The primary filenames are recorded verbatim in section 3. Durable repository
documentation intentionally does not preserve the machine-specific owner-local
absolute evidence path.

## 5. Q01-Q11 validated row counts

The complete validated sequence is `6, 63, 9, 7, 14, 2, 0, 103, 5, 10, 9` for
Q01 through Q11. Every CSV header matched the corresponding Agent 70B-1 query
projection. No required CSV appeared truncated or malformed, and the inspected
rows contained schema metadata rather than business/customer values.

## 6. Evidence-quality notes

- Q01-Q06 and Q08-Q11 are complete, sanitized metadata CSV results.
- Q01 is CSV metadata evidence, not a screenshot or owner summary.
- Q07 is not a raw zero-row CSV; its limitation is recorded separately below.
- Q08 inventories visible direct table grants from
  `information_schema.role_table_grants`. It is not an effective-privilege,
  role-membership, ownership, BYPASSRLS, PostgREST, or exploitability audit.
- Q10 is regex-based column-name discovery only. It does not prove capability
  semantics.
- Q11 covers directly connected foreign keys where at least one endpoint is an
  approved table. It is not an inventory of the entire database.
- Repository code, tests, mocks, types, historical SQL, and old plans were used
  only as compatibility evidence. Live metadata wins where they differ.
- No evidence included current business-row values. Every row-dependent change
  therefore remains blocked on the supplemental aggregate preflights below.

## 7. Q07 zero-row screenshot-evidence limitation

The DOCX contains one screenshot of the Q07 query result. The screenshot visibly
shows `Success. No rows returned`, `0 rows`, and the six approved table names in
the query filter. This supports the owner-attested conclusion that Q07 returned
a complete zero-row explicit-policy inventory.

It is still screenshot evidence, not a raw CSV. It cannot independently prove
effective privileges, role membership, table ownership, BYPASSRLS behavior,
PostgREST role switching, or external API exploitability.

## 8. Consolidated live-schema inventory

### 8.1 Relations and access flags

| Object | Exact live definition | Repository usage | Evidence | Reuse decision | Additive delta | Row preflight | Access evidence incomplete | Blocks later SQL | Unresolved |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `public.ai_sketch_jobs` | Ordinary table; RLS enabled; forced RLS false; no table comment | Planned job persistence; no current First Preview DB write path | Q01 | Reuse | Job lifecycle fields and constraints | Yes | Yes | Yes | Effective privileges and current statuses |
| `public.ai_sketch_outputs` | Ordinary table; RLS enabled; forced RLS false; no table comment | Planned output persistence; runtime currently returns only an internal result | Q01 | Reuse | Asset integrity, automatic gate, readiness, current marker | Yes | Yes | Yes | Current `preview_status` values and output cardinality |
| `public.ai_sketch_reviews` | Ordinary table; RLS enabled; forced RLS false; no table comment | Server-side admin read/write helper | Q01 | Reuse unchanged for human review | No First Preview readiness field | Yes for compatibility only | Yes | No automatic-readiness SQL | Required output ID versus current create helper |
| `public.concept_briefs` | Ordinary table; RLS enabled; forced RLS false; no table comment | Confirmed persistence parent and customer reference source | Q01 | Reuse | None in this plan | No | Yes | No | Effective access posture |
| `public.concept_brief_reference_assets` | Ordinary table; RLS enabled; forced RLS false; no table comment | Customer reference assets only | Q01 | Reuse only for customer references | None; do not mix with generated outputs | No | Yes | No | Storage access remains separate |
| `public.admin_notes` | Ordinary table; RLS enabled; forced RLS false; no table comment | Admin note persistence | Q01 | Reuse only for admin notes | None | No | Yes | No | Effective access posture |

### 8.2 `ai_sketch_jobs` fields

| Live field | Exact live definition | Repository usage | Compatibility | Decision / delta | Preflight / blocker |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid NOT NULL DEFAULT gen_random_uuid()` | Planned internal job identity | Reuse unchanged | Primary identity | None |
| `concept_brief_id` | `uuid NOT NULL`; FK to `concept_briefs(id)` `ON DELETE CASCADE` | Required persisted-brief binding | Reuse unchanged | Preserve | Cross-brief aggregate checks |
| `status` | `text NOT NULL DEFAULT 'draft'` with no Q03 CHECK | No current persistent First Preview state writer | Partially compatible | Reuse for job lifecycle; do not change default or legal values until B01/B13 pass | Current grouped values unknown |
| `prompt_version` | Nullable `text` | Adapter has a deterministic prompt contract/version | Partially compatible | Reuse for prompt/template contract version; do not overload as Design Spec or Hand Sketch Instruction version | Existing semantics unknown |
| `prompt_payload` | `jsonb NOT NULL DEFAULT '{}'::jsonb` | No current First Preview DB write | Partially compatible | Retain as internal legacy/bounded structured payload only; never use it instead of dedicated invariants; never store secrets, contact data, raw provider payloads, or raw prompts | Existing values were not inspected |
| `model_name` | Nullable `text` | Adapter pins `gpt-image-2-2026-04-21` | Reuse | Store pinned request model on the job; do not duplicate on output | Future write contract |
| `error_message` | Nullable `text` | Runtime/adapter normalize failure categories | Partially compatible | Reuse only for sanitized non-secret failure detail; add dedicated `failure_category` and `terminal_reason` | Existing values were not inspected |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` | Audit timestamp | Reuse unchanged | Preserve | None |
| `updated_at` | `timestamptz NOT NULL DEFAULT now()`; maintained by live trigger | Audit timestamp | Reuse unchanged | Preserve trigger | None |

Required additive job capabilities are `generation_purpose`, deterministic
`idempotency_key`, `attempt_number`, `parent_job_id`, Design Spec version/hash,
Hand Sketch Instruction version/hash, `provider_name`, provider request
identity, request size/quality/format/moderation, `started_at`, `deadline_at`,
`completed_at`, `cancelled_at`, `timed_out_at`, normalized failure category,
retry eligibility, terminal reason, cost micros, currency, and pricing
assumption version.

One initial attempt and at most one eligible automatic retry belong to the
initial First Preview lineage. Timeout is not automatically retryable. A later
separately approved feedback lineage may make one additional attempt, giving a
product maximum of three provider attempts before human intervention. The
database can constrain attempt identity and bounded numbers, but the future
authorized server transaction must also enforce lineage purpose, eligibility,
budget, limiter, and atomic terminal transitions.

For the selected live profile, the future authorized server writer must record
`deadline_at` as the 150-second NOVORA attempt deadline derived from
`started_at`. The database timing check guards ordering; it does not initiate,
cancel, retry, or guarantee hosting duration.

### 8.3 `ai_sketch_outputs` fields

| Live field | Exact live definition | Repository usage | Compatibility | Decision / delta | Preflight / blocker |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid NOT NULL DEFAULT gen_random_uuid()` | Review FK target; future output identity | Reuse unchanged | Preserve | None |
| `job_id` | `uuid NOT NULL`; FK to `ai_sketch_jobs(id)` `ON DELETE CASCADE` | Agent 69B historical candidate incorrectly allowed another name; live name wins | Reuse unchanged | Preserve exact live name; add uniqueness only if one-output-per-attempt preflight passes | B04/B15 |
| `concept_brief_id` | `uuid NOT NULL`; FK to `concept_briefs(id)` `ON DELETE CASCADE` | Required output-to-brief binding | Reuse unchanged | Preserve | B06 cross-brief consistency |
| `bucket_name` | `text NOT NULL DEFAULT 'novora-ai-sketches'` | Planned private generated-asset bucket identity | Reuse | Keep internal; default is not proof that a bucket/object exists or is private | Storage evidence separate |
| `object_path` | Nullable `text` | Future internal generated-object locator | Reuse with readiness condition | Keep nullable globally; require non-null only for a ready output; never return it to customers | B03/B14 |
| `preview_status` | `text NOT NULL DEFAULT 'pending_review'`; no Q03 CHECK | Mock/docs use mixed historical terminology | Partially compatible | Preserve as a historical output-workflow field. Do not change its default, add a CHECK, or reinterpret `pending_review` as readiness without B02/B17 and repository review | Current values/semantics unknown |
| `metadata` | `jsonb NOT NULL DEFAULT '{}'::jsonb` | No current persistent First Preview writer | Partially compatible | Keep for optional non-authoritative technical metadata only; do not store readiness-critical invariants only in this JSONB | Existing values were not inspected |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` | Output creation audit | Reuse | Preserve; add explicit asset/readiness timestamps instead of inferring them from creation | None |

Required additive output capabilities are MIME type, byte size, width, height,
SHA-256 content hash, asset-created/validated timestamps, automatic-gate status,
bounded automatic-gate evidence, gate-policy version, validation time,
readiness status, ready/revoked timestamps, and a current-customer-preview
marker with a partial unique index.

Provider, pinned model, size, quality, format, moderation mode, and provider
request identity belong on the job because they describe the attempt request.
The output inherits them through required `job_id`; duplicating them on every
output would permit contradictory evidence. Binary facts belong on the output.

`automatic_gate_evidence` may be JSONB only for a bounded collection of gate
code, boolean/result, trusted producer ID, validator/policy version, validation
time, and input/output binding hashes. It must not contain prompts, customer
contact data, notes, secrets, object paths, provider payloads, URLs, or image
content. Dedicated columns and constraints remain authoritative for readiness,
current selection, timestamps, identity, asset integrity, attempt identity, and
uniqueness.

### 8.4 `ai_sketch_reviews` fields and structural tension

All 14 live fields are preserved: `id`, `ai_sketch_output_id`,
`concept_brief_id`, `review_status`, `reviewer_note`, `customer_safe_note`,
`reviewed_at`, `created_at`, `revision_instruction`,
`approved_for_customer_at`, `approved_by`, `approval_revoked_at`, `revoked_by`,
and `updated_at`.

The exact legal `review_status` values remain:

- `internal_draft_not_generated`
- `draft_generated_internal_only`
- `needs_revision`
- `approved_for_customer`

`pending` remains illegal. `approved_for_customer` remains a human decision for
later formal customer-safe material or communication; it is not the automatic
gate for the initial First Preview.

Live `ai_sketch_output_id` is `NOT NULL`, so a review row cannot exist before a
real output exists. Therefore `internal_draft_not_generated` cannot be assumed
to mean that a pre-output review row exists. Current repository compatibility
evidence also shows that `createAdminAiSketchReview()` inserts
`concept_brief_id` and `review_status` without `ai_sketch_output_id`. This is a
documented code/live-schema tension for a later separately approved app task;
this Agent does not change the helper, nullability, FK, uniqueness, or review
model.

### 8.5 Other materially relevant fields

- `concept_briefs.id` and `public_reference` are the persisted identity pair.
  `public_reference` is `text NOT NULL` and unique. It remains customer-visible,
  not authentication, authorization, a secret, or a bearer token.
- `concept_briefs.status`, `brief_payload`, `api_submission`, and structured
  design fields are repository persistence inputs, but no business values were
  inspected and none becomes automatic readiness by itself.
- `concept_brief_reference_assets.bucket_name`, `object_path`, `mime_type`, and
  `size_bytes` describe customer reference assets, not generated First Preview
  assets. They are not reused for generated output integrity.
- `admin_notes.note` and review-note fields are internal and prohibited from
  automatic-gate evidence or customer responses.

## 9. Confirmed reusable tables and relationships

- Reuse `public.ai_sketch_jobs`, `public.ai_sketch_outputs`, and
  `public.ai_sketch_reviews`; do not create duplicate job, output, review,
  asset-status, or readiness tables.
- Preserve `ai_sketch_jobs.concept_brief_id -> concept_briefs.id ON DELETE
  CASCADE`.
- Preserve `ai_sketch_outputs.job_id -> ai_sketch_jobs.id ON DELETE CASCADE` and
  `ai_sketch_outputs.concept_brief_id -> concept_briefs.id ON DELETE CASCADE`.
- Preserve both review FKs and `UNIQUE (concept_brief_id)`.
- Preserve `concept_brief_reference_assets.concept_brief_id ->
  concept_briefs.id ON DELETE CASCADE` and `admin_notes.concept_brief_id ->
  concept_briefs.id ON DELETE CASCADE`.
- Keep output persistence separate from secure generated-asset delivery.
- Keep customer reference assets separate from generated output assets.

## 10. Confirmed reusable fields

Reuse job `id`, `concept_brief_id`, `status`, `prompt_version`, `prompt_payload`,
`model_name`, `error_message`, `created_at`, and `updated_at` within the bounded
responsibilities in section 8. Reuse output `id`, `job_id`, `concept_brief_id`,
`bucket_name`, `object_path`, `preview_status`, `metadata`, and `created_at`.
Reuse the complete review model unchanged.

## 11. Partially compatible fields

- Job `status` needs aggregate value evidence before a CHECK or lifecycle
  interpretation.
- `prompt_version` cannot replace the two structured artifact versions.
- `prompt_payload` and output `metadata` cannot replace critical structured
  invariants.
- `error_message` is reusable only as sanitized detail, not as a normalized
  failure category.
- Output `preview_status = 'pending_review'` is a historical live fact, not the
  automatic readiness gate.
- `bucket_name` and `object_path` identify a candidate location only; they do
  not establish existence, integrity, privacy, access, or readiness.

## 12. Confirmed missing capabilities

Q02 and Q10 confirm no dedicated live columns for idempotency, attempts,
lineage, structured input hashes, provider request identity, attempt timing,
normalized terminal state, retry eligibility, cost, output integrity,
automatic-gate evidence, readiness, ready/revoked time, or current-customer
preview selection. Q05 confirms no idempotency, one-output-per-job, active-job,
or current-preview unique index.

## 13. Existing constraints and indexes

Q03 confirms primary keys on all six tables, the exact review-status CHECK,
`ai_sketch_reviews_concept_brief_id_key UNIQUE (concept_brief_id)`, and
`concept_briefs_public_reference_key UNIQUE (public_reference)`.

Q05 confirms 14 valid/live B-tree indexes. No partial or expression index was
observed. Material First Preview findings:

- `ai_sketch_jobs_concept_brief_id_idx` exists.
- `ai_sketch_outputs_concept_brief_id_idx` exists.
- No separate `ai_sketch_outputs.job_id` index exists.
- No separate `ai_sketch_reviews.ai_sketch_output_id` index exists.
- No conditional unique current-preview or idempotency index exists.
- `concept_briefs.public_reference` has both the unique-constraint index and a
  separate non-unique index. This additive-only Agent does not recommend
  dropping either.

## 14. Trigger findings

Q06 confirms `set_ai_sketch_jobs_updated_at` and
`set_concept_briefs_updated_at`. Both are enabled, row-level `BEFORE UPDATE`
triggers calling `public.set_updated_at()`. The function is not
`SECURITY DEFINER`.

No equivalent non-internal trigger was observed for outputs, reviews,
reference assets, or admin notes. This plan does not add trigger SQL: the exact
function body and intended update semantics were not supplied, and output
readiness can use dedicated timestamps. Review trigger work remains separate
from this migration scope.

## 15. RLS findings

RLS is enabled and forced RLS is false on all six approved tables. Q07 shows
zero visible explicit policies. Zero policies does not by itself establish the
behavior of owners, inherited roles, BYPASSRLS roles, service-role requests, or
PostgREST role switching. Policy changes are not proposed here.

## 16. Grant findings and interpretation limits

Q08 shows these exact visible direct privilege sets:

- `anon` and `authenticated`: `REFERENCES`, `TRIGGER`, and `TRUNCATE` on each
  approved table; no visible direct `SELECT`, `INSERT`, `UPDATE`, or `DELETE`.
- `postgres`: `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `REFERENCES`, `TRIGGER`,
  and `TRUNCATE` on each approved table, grantable as recorded.
- `service_role`: `REFERENCES`, `TRIGGER`, and `TRUNCATE` on all six;
  `SELECT`/`INSERT` also on `admin_notes` and reference assets;
  `SELECT`/`INSERT`/`DELETE` also on `concept_briefs`; no visible direct DML on
  the three AI tables and no visible direct `UPDATE` on any approved table.

Visible anon/authenticated `TRUNCATE` is a security-review item. The asymmetric
service-role grants are unresolved. Q08 does not prove external exploitability,
effective `TRUNCATE`, lack of service-role access, API exposure, role
membership, ownership, inheritance, or BYPASSRLS behavior. No `GRANT`, `REVOKE`,
`CREATE POLICY`, or policy mutation is an approved candidate in this plan.

## 17. Q10 false-positive handling

Q10 matched `concept_briefs.design_objective` because its name contains
`object`. It is a design-intent field, not a Storage object field and not an
asset-integrity capability. It is not reused for object identity or readiness.

## 18. Q11 relationship-scope limitation

No directly connected FK relationship had a name matching `feedback`,
`remark`, `revision`, `request`, or `response`. This does not prove that the
whole database lacks a feedback model. Q11 also revealed direct Concept Brief
children `concept_brief_contacts` and `concept_brief_notification_events`; their
business rows were not read and their scope is not expanded here. No feedback
table is proposed by this Agent.

## 19. Human-review versus automatic-readiness separation

These states remain distinct:

1. Provider request succeeded.
2. Provider output passed binary/image validation.
3. The generated asset was persisted privately.
4. Trusted automatic safety/privacy/access/lifecycle gates passed.
5. The exact output became `first_preview_ready`.
6. The exact ready output became current for the customer.
7. Human review started.
8. Human review requested revision.
9. Human approval was granted.
10. Human approval was revoked.

Job `status` represents generation lifecycle, output `preview_status` remains a
historical output-workflow field pending evidence, new output automatic/readiness
fields represent the initial automatic decision, and review `review_status`
remains the human workflow. No one status collapses these responsibilities.

## 20. Existing-data compatibility risks

Current Production row values were not supplied. The following actions are
row-dependent and remain blocked: constraining job status, changing any live
default, hardening new nullable columns to `NOT NULL`, creating unique
idempotency/attempt/provider-request/output/current-preview indexes, validating
new CHECK/FK constraints, interpreting `pending_review`, and enforcing
timestamp, retry, asset, or readiness consistency. No backfill `UPDATE` is
included.

## 21. Owner-run supplemental metadata-only queries

Every query in this section is metadata-only. Results must be sanitized and
reviewed before any access-control conclusion.

### M01 - Table ownership

Purpose: identify owners of the six approved tables. Expected interpretation:
owners may have behavior not represented by direct grants, especially because
forced RLS is false. Pass: exactly six rows, all expected tables, known owners.
Fail closed: missing/unexpected rows or an owner whose role posture is not
reviewed.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

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

### M02 - Role attributes and BYPASSRLS

Purpose: verify existence, inheritance, login, superuser, and BYPASSRLS posture
for relevant roles. Pass: all expected roles are accounted for and reviewed.
Fail closed: any unexpected superuser/BYPASSRLS/inheritance fact or missing role.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

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

### M03 - Relevant role membership

Purpose: identify direct role-membership edges touching a relevant role. Pass:
every edge is understood and no unreviewed inheritance broadens access. Fail
closed: unexpected membership or incomplete output.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

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

### M04 - Effective DML privileges

Purpose: evaluate effective `SELECT`/`INSERT`/`UPDATE`/`DELETE` for
`service_role`, `anon`, and `authenticated` across approved tables. Pass: each
boolean is explicitly reviewed against the later server-access design. Fail
closed: missing rows, an unexpected privilege, or an unexplained service-role
denial.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

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

### M05 - Effective TRUNCATE privileges

Purpose: resolve effective `TRUNCATE` for relevant API roles without claiming
API exploitability. Pass: every boolean is reviewed with ownership, membership,
BYPASSRLS, and API posture. Fail closed: incomplete or unexplained results.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

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

### M06 - Schema usage and aggregate RLS context

Purpose: combine schema usage, ownership, RLS flags, explicit-policy counts,
and role BYPASSRLS facts needed to interpret zero-policy RLS. Pass: six tables
and three relevant roles are complete and consistent with Q01/Q07. Fail closed:
any mismatch. This still does not prove PostgREST or external API behavior.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

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

Database metadata cannot prove which role PostgREST assumes for every request,
whether an exposed endpoint is reachable, or whether an external exploit path
exists. Those require a separate approved access-control review; no SQL mutation
is prepared here.

## 22. Owner-run aggregate-only compatibility queries

Every query below reads the minimum necessary approved tables and returns only
counts or bounded system-controlled status groups. No query returns IDs,
prompts, notes, paths, payloads, contacts, references, or image content.

### B01 - Current job status counts

Purpose: learn existing system status values before constraining `status`.
Pass: every value maps explicitly to the later lifecycle. Fail closed: any
unknown/blank/null value or a value that cannot be preserved safely.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

```sql
SELECT status, count(*) AS row_count
FROM public.ai_sketch_jobs
GROUP BY status
ORDER BY status;
```

### B02 - Current output preview-status counts

Purpose: determine live `preview_status` values before interpreting
`pending_review`. Pass: every value and its repository meaning is reviewed.
Fail closed: unknown/blank/null values or ambiguous semantics.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

```sql
SELECT preview_status, count(*) AS row_count
FROM public.ai_sketch_outputs
GROUP BY preview_status
ORDER BY preview_status;
```

### B03 - Object-path presence

Purpose: measure nullable object identity without returning paths. Pass: counts
are accepted and no readiness is inferred. Fail closed: any plan that assumes
non-null means valid/ready.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

```sql
SELECT
  count(*) FILTER (WHERE object_path IS NULL) AS null_object_path_count,
  count(*) FILTER (WHERE object_path IS NOT NULL) AS nonnull_object_path_count,
  count(*) AS total_output_count
FROM public.ai_sketch_outputs;
```

### B04 - Output counts per job distribution

Purpose: determine output cardinality per job without returning job IDs. Pass
for one-output uniqueness: no distribution row with `output_count > 1`. Fail
closed: any multi-output job.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

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

### B05 - Job counts per Concept Brief distribution

Purpose: measure existing job lineage density without returning brief IDs.
Pass: distribution is understood; it does not by itself authorize a one-job
constraint. Fail closed: unexplained counts that conflict with attempt design.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

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

### B06 - Existing job/output/review/brief consistency

Purpose: count orphan and cross-brief relationships without returning IDs.
Pass: every count is zero. Fail closed: any nonzero count.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

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

### B07 - Existing review-status safety

Purpose: reconfirm that rows comply with the exact live review CHECK. Pass:
`invalid_review_status_count = 0`. Fail closed: any nonzero value. Known legal
labels are used only as system-controlled status values.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

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

### B08 - New-column null hardening, after additive columns exist

Purpose: identify rows that would violate any later `NOT NULL` hardening. Pass:
every field selected for hardening has zero nulls. Fail closed: any nonzero null
count. This query is not runnable until the additive columns exist.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

```sql
SELECT
  count(*) FILTER (WHERE generation_purpose IS NULL) AS null_generation_purpose_count,
  count(*) FILTER (WHERE idempotency_key IS NULL) AS null_idempotency_key_count,
  count(*) FILTER (WHERE attempt_number IS NULL) AS null_attempt_number_count,
  count(*) FILTER (WHERE design_spec_hash IS NULL) AS null_design_spec_hash_count,
  count(*) FILTER (WHERE hand_sketch_instruction_hash IS NULL) AS null_instruction_hash_count
FROM public.ai_sketch_jobs;
```

No immediate `NOT NULL` hardening is authorized by this plan.

### B09 - Idempotency duplicate candidates, after population

Purpose: gate the idempotency unique index. Pass:
`duplicate_idempotency_key_count = 0`. Fail closed: any nonzero count.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

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

### B10 - Attempt-identity duplicate candidates, after population

Purpose: gate unique `(concept_brief_id, attempt_number)`. Pass:
`duplicate_attempt_identity_count = 0`. Fail closed: any nonzero count.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

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

### B11 - Current-preview duplicate candidates, after column creation

Purpose: gate the one-current-preview partial unique index. Pass:
`duplicate_current_preview_brief_count = 0`. Fail closed: any nonzero count.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

```sql
WITH duplicates AS (
  SELECT concept_brief_id
  FROM public.ai_sketch_outputs
  WHERE is_current_customer_preview = true
  GROUP BY concept_brief_id
  HAVING count(*) > 1
)
SELECT count(*) AS duplicate_current_preview_brief_count
FROM duplicates;
```

### B12 - Provider-request duplicate candidates, after population

Purpose: gate provider request uniqueness. Pass:
`duplicate_provider_request_count = 0`. Fail closed: any nonzero count.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

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

### B13 - Proposed job CHECK violations

Purpose: gate validation of job status, attempt, timing, retry, hash, and cost
checks. Pass: all counts are zero. Fail closed: any nonzero count. This query is
partly runnable only after additive columns exist.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

```sql
SELECT
  count(*) FILTER (WHERE status NOT IN (
    'draft', 'queued', 'processing', 'succeeded', 'failed', 'timed_out', 'cancelled'
  )) AS invalid_job_status_count,
  count(*) FILTER (
    WHERE NOT (
      (generation_purpose IS NULL AND attempt_number IS NULL)
      OR (generation_purpose = 'first_preview' AND attempt_number BETWEEN 1 AND 2)
      OR (generation_purpose = 'feedback_regeneration' AND attempt_number = 3)
    )
  ) AS invalid_attempt_policy_count,
  count(*) FILTER (WHERE deadline_at IS NOT NULL AND (started_at IS NULL OR deadline_at <= started_at)) AS invalid_deadline_count,
  count(*) FILTER (WHERE num_nonnulls(completed_at, cancelled_at, timed_out_at) > 1) AS conflicting_terminal_timestamp_count,
  count(*) FILTER (
    WHERE (status = 'timed_out' AND (timed_out_at IS NULL OR retry_eligible = true))
       OR (status = 'cancelled' AND cancelled_at IS NULL)
       OR (status IN ('succeeded', 'failed') AND completed_at IS NULL)
  ) AS invalid_status_terminal_count,
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
  count(*) FILTER (WHERE retry_eligible = true AND failure_category NOT IN (
    'rate_limited', 'provider_unavailable', 'network_failure'
  )) AS invalid_retry_eligibility_count,
  count(*) FILTER (WHERE estimated_cost_micros < 0 OR actual_cost_micros < 0) AS invalid_cost_count,
  count(*) FILTER (
    WHERE provider_name IS NOT NULL
      AND NOT (
        provider_name = 'openai'
        AND model_name = 'gpt-image-2-2026-04-21'
        AND request_size = '1024x1024'
        AND request_quality = 'medium'
        AND output_format = 'png'
        AND moderation_mode = 'auto'
      )
  ) AS invalid_request_profile_count
FROM public.ai_sketch_jobs;
```

### B14 - Proposed output readiness and integrity violations

Purpose: gate validation of output CHECK constraints. Pass: all counts are
zero. Fail closed: any nonzero count. It does not prove private Storage access.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

```sql
SELECT
  count(*) FILTER (WHERE readiness_status IS NOT NULL AND readiness_status NOT IN (
    'not_ready', 'first_preview_ready', 'revoked'
  )) AS invalid_readiness_status_count,
  count(*) FILTER (WHERE automatic_gate_status IS NOT NULL AND automatic_gate_status NOT IN (
    'pending', 'passed', 'failed'
  )) AS invalid_gate_status_count,
  count(*) FILTER (
    WHERE readiness_status = 'first_preview_ready'
      AND (
        automatic_gate_status IS DISTINCT FROM 'passed'
        OR automatic_gate_policy_version IS NULL
        OR automatic_gates_validated_at IS NULL
        OR first_preview_ready_at IS NULL
        OR object_path IS NULL
        OR mime_type IS NULL
        OR byte_size IS NULL
        OR width_px IS NULL
        OR height_px IS NULL
        OR content_sha256 IS NULL
        OR asset_validated_at IS NULL
        OR is_current_customer_preview IS DISTINCT FROM true
      )
  ) AS invalid_ready_evidence_count,
  count(*) FILTER (
    WHERE is_current_customer_preview = true
      AND readiness_status IS DISTINCT FROM 'first_preview_ready'
  ) AS invalid_current_marker_count
FROM public.ai_sketch_outputs;
```

### B15 - One-output-per-job duplicate candidates

Purpose: gate unique `job_id`. Pass: `multi_output_job_count = 0`. Fail closed:
any nonzero count.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

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

### B16 - Parent-lineage FK and self-cycle candidates

Purpose: gate the self-FK and detect direct self-parenting after the new column
is populated. Pass: both counts are zero. Fail closed: either nonzero count.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

```sql
SELECT
  count(*) FILTER (WHERE parent.id IS NULL AND child.parent_job_id IS NOT NULL) AS missing_parent_count,
  count(*) FILTER (WHERE child.parent_job_id = child.id) AS direct_self_parent_count
FROM public.ai_sketch_jobs child
LEFT JOIN public.ai_sketch_jobs parent ON parent.id = child.parent_job_id;
```

### B17 - `pending_review` semantics before any change

Purpose: quantify the historical status together with path presence only; it
does not infer readiness. Pass: results are reconciled with repository behavior
and an owner-approved mapping. Fail closed: any proposal to change the default
or CHECK without that mapping.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

```sql
SELECT
  preview_status,
  (object_path IS NOT NULL) AS has_object_path,
  count(*) AS row_count
FROM public.ai_sketch_outputs
GROUP BY preview_status, (object_path IS NOT NULL)
ORDER BY preview_status, has_object_path;
```

### B18 - One active job per brief and purpose

Purpose: gate the partial unique active-purpose index after B01 confirms the
exact active-status mapping. Pass: `duplicate_active_purpose_count = 0`. Fail
closed: any duplicate or any change to the approved active-status predicate.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

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

## 23. Exact additive SQL candidate blocks

### 23.1 Nullable-first job columns

CANDIDATE ONLY — DO NOT EXECUTE

```sql
ALTER TABLE public.ai_sketch_jobs
  ADD COLUMN generation_purpose text,
  ADD COLUMN idempotency_key text,
  ADD COLUMN attempt_number smallint,
  ADD COLUMN parent_job_id uuid,
  ADD COLUMN design_spec_version text,
  ADD COLUMN design_spec_hash text,
  ADD COLUMN hand_sketch_instruction_version text,
  ADD COLUMN hand_sketch_instruction_hash text,
  ADD COLUMN provider_name text,
  ADD COLUMN provider_request_id text,
  ADD COLUMN request_size text,
  ADD COLUMN request_quality text,
  ADD COLUMN output_format text,
  ADD COLUMN moderation_mode text,
  ADD COLUMN started_at timestamptz,
  ADD COLUMN deadline_at timestamptz,
  ADD COLUMN completed_at timestamptz,
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

All fields are nullable to avoid fabricating legacy identity, lineage, hashes,
timing, terminal evidence, or costs. `model_name`, `prompt_version`, and
`error_message` are reused rather than duplicated.

### 23.2 Output integrity and readiness columns

CANDIDATE ONLY — DO NOT EXECUTE

```sql
ALTER TABLE public.ai_sketch_outputs
  ADD COLUMN mime_type text,
  ADD COLUMN byte_size bigint,
  ADD COLUMN width_px integer,
  ADD COLUMN height_px integer,
  ADD COLUMN content_sha256 text,
  ADD COLUMN asset_created_at timestamptz,
  ADD COLUMN asset_validated_at timestamptz,
  ADD COLUMN automatic_gate_status text,
  ADD COLUMN automatic_gate_evidence jsonb,
  ADD COLUMN automatic_gate_policy_version text,
  ADD COLUMN automatic_gates_validated_at timestamptz,
  ADD COLUMN readiness_status text,
  ADD COLUMN first_preview_ready_at timestamptz,
  ADD COLUMN readiness_revoked_at timestamptz,
  ADD COLUMN is_current_customer_preview boolean NOT NULL DEFAULT false;
```

The only immediate non-null default is fail-closed `false`; it cannot create a
ready or current legacy output. Null readiness must be interpreted as not ready.

### 23.3 Job checks, staged as NOT VALID

The status CHECK is exact candidate SQL but blocked on B01/B13 because current
values are unknown. The remaining checks can be added as `NOT VALID` only after
the later SQL Agent reconfirms names and lock/operational posture; validation is
separate.

CANDIDATE ONLY — DO NOT EXECUTE

```sql
ALTER TABLE public.ai_sketch_jobs
  ADD CONSTRAINT ai_sketch_jobs_status_check
    CHECK (status IN (
      'draft', 'queued', 'processing', 'succeeded', 'failed', 'timed_out', 'cancelled'
    )) NOT VALID,
  ADD CONSTRAINT ai_sketch_jobs_attempt_policy_check
    CHECK (
      (generation_purpose IS NULL AND attempt_number IS NULL)
      OR (generation_purpose = 'first_preview' AND attempt_number BETWEEN 1 AND 2)
      OR (generation_purpose = 'feedback_regeneration' AND attempt_number = 3)
    ) NOT VALID,
  ADD CONSTRAINT ai_sketch_jobs_hash_format_check
    CHECK (
      (design_spec_hash IS NULL OR design_spec_hash ~ '^[0-9a-f]{64}$')
      AND (hand_sketch_instruction_hash IS NULL OR hand_sketch_instruction_hash ~ '^[0-9a-f]{64}$')
      AND (idempotency_key IS NULL OR idempotency_key ~ '^[0-9a-f]{64}$')
    ) NOT VALID,
  ADD CONSTRAINT ai_sketch_jobs_attempt_timing_check
    CHECK (deadline_at IS NULL OR (started_at IS NOT NULL AND deadline_at > started_at)) NOT VALID,
  ADD CONSTRAINT ai_sketch_jobs_terminal_timestamp_check
    CHECK (num_nonnulls(completed_at, cancelled_at, timed_out_at) <= 1) NOT VALID,
  ADD CONSTRAINT ai_sketch_jobs_status_terminal_consistency_check
    CHECK (
      (status <> 'timed_out' OR (timed_out_at IS NOT NULL AND retry_eligible IS DISTINCT FROM true))
      AND (status <> 'cancelled' OR cancelled_at IS NOT NULL)
      AND (status NOT IN ('succeeded', 'failed') OR completed_at IS NOT NULL)
    ) NOT VALID,
  ADD CONSTRAINT ai_sketch_jobs_failure_category_check
    CHECK (failure_category IN (
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
      retry_eligible IS DISTINCT FROM true
      OR failure_category IN ('rate_limited', 'provider_unavailable', 'network_failure')
    ) NOT VALID,
  ADD CONSTRAINT ai_sketch_jobs_cost_check
    CHECK (
      (estimated_cost_micros IS NULL OR estimated_cost_micros >= 0)
      AND (actual_cost_micros IS NULL OR actual_cost_micros >= 0)
      AND (cost_currency IS NULL OR cost_currency ~ '^[A-Z]{3}$')
    ) NOT VALID,
  ADD CONSTRAINT ai_sketch_jobs_first_preview_request_profile_check
    CHECK (
      provider_name IS NULL
      OR (
        provider_name = 'openai'
        AND model_name = 'gpt-image-2-2026-04-21'
        AND request_size = '1024x1024'
        AND request_quality = 'medium'
        AND output_format = 'png'
        AND moderation_mode = 'auto'
      )
    ) NOT VALID;
```

The feedback-regeneration label does not create a feedback flow. That future
lineage remains disabled until a separately approved feedback persistence and
authorization design exists.

### 23.4 Output checks, staged as NOT VALID

CANDIDATE ONLY — DO NOT EXECUTE

```sql
ALTER TABLE public.ai_sketch_outputs
  ADD CONSTRAINT ai_sketch_outputs_integrity_shape_check
    CHECK (
      (mime_type IS NULL OR mime_type = 'image/png')
      AND (byte_size IS NULL OR byte_size BETWEEN 1 AND 16777216)
      AND (width_px IS NULL OR width_px = 1024)
      AND (height_px IS NULL OR height_px = 1024)
      AND (content_sha256 IS NULL OR content_sha256 ~ '^[0-9a-f]{64}$')
    ) NOT VALID,
  ADD CONSTRAINT ai_sketch_outputs_automatic_gate_status_check
    CHECK (automatic_gate_status IN ('pending', 'passed', 'failed')) NOT VALID,
  ADD CONSTRAINT ai_sketch_outputs_readiness_status_check
    CHECK (readiness_status IN ('not_ready', 'first_preview_ready', 'revoked')) NOT VALID,
  ADD CONSTRAINT ai_sketch_outputs_current_preview_consistency_check
    CHECK (
      is_current_customer_preview = false
      OR readiness_status = 'first_preview_ready'
    ) NOT VALID,
  ADD CONSTRAINT ai_sketch_outputs_revocation_time_check
    CHECK (
      readiness_status IS DISTINCT FROM 'revoked'
      OR readiness_revoked_at IS NOT NULL
    ) NOT VALID,
  ADD CONSTRAINT ai_sketch_outputs_ready_evidence_check
    CHECK (
      readiness_status IS DISTINCT FROM 'first_preview_ready'
      OR (
        automatic_gate_status = 'passed'
        AND jsonb_typeof(automatic_gate_evidence) = 'object'
        AND automatic_gate_evidence <> '{}'::jsonb
        AND automatic_gate_policy_version IS NOT NULL
        AND automatic_gates_validated_at IS NOT NULL
        AND first_preview_ready_at IS NOT NULL
        AND object_path IS NOT NULL
        AND btrim(object_path) <> ''
        AND btrim(bucket_name) <> ''
        AND mime_type = 'image/png'
        AND byte_size BETWEEN 1 AND 16777216
        AND width_px = 1024
        AND height_px = 1024
        AND content_sha256 ~ '^[0-9a-f]{64}$'
        AND asset_validated_at IS NOT NULL
        AND is_current_customer_preview = true
      )
    ) NOT VALID;
```

These checks are defense in depth. They cannot prove private Storage posture,
trusted evidence producers, current access eligibility, or safe serialization;
future server code must verify those independently.

### 23.5 Parent lineage FK

Blocked until B16 passes. The FK is additive and preserves the existing
brief-to-job cascade. No delete action is added, so PostgreSQL `NO ACTION`
prevents casual parent deletion while lineage remains.

CANDIDATE ONLY — DO NOT EXECUTE

```sql
ALTER TABLE public.ai_sketch_jobs
  ADD CONSTRAINT ai_sketch_jobs_parent_job_id_fkey
  FOREIGN KEY (parent_job_id)
  REFERENCES public.ai_sketch_jobs(id)
  NOT VALID;
```

### 23.6 Unique and support indexes

Every unique index is blocked until its named duplicate preflight returns zero.
No `CREATE UNIQUE INDEX` should be run in the same unreviewed step as column
creation.

CANDIDATE ONLY — DO NOT EXECUTE

```sql
CREATE UNIQUE INDEX ai_sketch_jobs_idempotency_key_uidx
  ON public.ai_sketch_jobs (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX ai_sketch_jobs_attempt_identity_uidx
  ON public.ai_sketch_jobs (concept_brief_id, attempt_number)
  WHERE attempt_number IS NOT NULL;

CREATE UNIQUE INDEX ai_sketch_jobs_provider_request_uidx
  ON public.ai_sketch_jobs (provider_name, provider_request_id)
  WHERE provider_name IS NOT NULL AND provider_request_id IS NOT NULL;

CREATE UNIQUE INDEX ai_sketch_jobs_one_active_purpose_uidx
  ON public.ai_sketch_jobs (concept_brief_id, generation_purpose)
  WHERE status IN ('queued', 'processing');

CREATE UNIQUE INDEX ai_sketch_outputs_one_per_job_uidx
  ON public.ai_sketch_outputs (job_id);

CREATE UNIQUE INDEX ai_sketch_outputs_one_current_customer_preview_uidx
  ON public.ai_sketch_outputs (concept_brief_id)
  WHERE is_current_customer_preview = true;

CREATE INDEX ai_sketch_jobs_parent_job_id_idx
  ON public.ai_sketch_jobs (parent_job_id)
  WHERE parent_job_id IS NOT NULL;

CREATE INDEX ai_sketch_outputs_readiness_lookup_idx
  ON public.ai_sketch_outputs (concept_brief_id, readiness_status);

CREATE INDEX ai_sketch_reviews_ai_sketch_output_id_idx
  ON public.ai_sketch_reviews (ai_sketch_output_id);
```

The one-active-purpose index is additionally blocked on B01 and an owner-approved
mapping of active statuses. The one-output-per-job index also supplies the
currently missing `job_id` lookup index.

### 23.7 Constraint validation is a separate gate

CANDIDATE ONLY — DO NOT EXECUTE

```sql
ALTER TABLE public.ai_sketch_jobs
  VALIDATE CONSTRAINT ai_sketch_jobs_status_check;

ALTER TABLE public.ai_sketch_jobs
  VALIDATE CONSTRAINT ai_sketch_jobs_attempt_policy_check;

ALTER TABLE public.ai_sketch_jobs
  VALIDATE CONSTRAINT ai_sketch_jobs_hash_format_check;

ALTER TABLE public.ai_sketch_jobs
  VALIDATE CONSTRAINT ai_sketch_jobs_attempt_timing_check;

ALTER TABLE public.ai_sketch_jobs
  VALIDATE CONSTRAINT ai_sketch_jobs_terminal_timestamp_check;

ALTER TABLE public.ai_sketch_jobs
  VALIDATE CONSTRAINT ai_sketch_jobs_status_terminal_consistency_check;

ALTER TABLE public.ai_sketch_jobs
  VALIDATE CONSTRAINT ai_sketch_jobs_failure_category_check;

ALTER TABLE public.ai_sketch_jobs
  VALIDATE CONSTRAINT ai_sketch_jobs_retry_eligibility_check;

ALTER TABLE public.ai_sketch_jobs
  VALIDATE CONSTRAINT ai_sketch_jobs_cost_check;

ALTER TABLE public.ai_sketch_jobs
  VALIDATE CONSTRAINT ai_sketch_jobs_first_preview_request_profile_check;

ALTER TABLE public.ai_sketch_jobs
  VALIDATE CONSTRAINT ai_sketch_jobs_parent_job_id_fkey;

ALTER TABLE public.ai_sketch_outputs
  VALIDATE CONSTRAINT ai_sketch_outputs_integrity_shape_check;

ALTER TABLE public.ai_sketch_outputs
  VALIDATE CONSTRAINT ai_sketch_outputs_automatic_gate_status_check;

ALTER TABLE public.ai_sketch_outputs
  VALIDATE CONSTRAINT ai_sketch_outputs_readiness_status_check;

ALTER TABLE public.ai_sketch_outputs
  VALIDATE CONSTRAINT ai_sketch_outputs_current_preview_consistency_check;

ALTER TABLE public.ai_sketch_outputs
  VALIDATE CONSTRAINT ai_sketch_outputs_revocation_time_check;

ALTER TABLE public.ai_sketch_outputs
  VALIDATE CONSTRAINT ai_sketch_outputs_ready_evidence_check;
```

## 24. Statement-by-statement prerequisites

| Candidate | Required evidence | Exact pass condition | Fail-closed condition |
| --- | --- | --- | --- |
| Job additive columns | Q02 confirms names absent; later lock/size review | No name/type conflict | Any conflict or unsafe operational window |
| Output additive columns | Q02 confirms names absent; later lock/size review | No name/type conflict; `false` is accepted fail-closed legacy value | Any conflict or different approved readiness model |
| Job status CHECK | B01 and B13 | Every current status is in the exact set and semantics are approved | Any unknown or incompatible value |
| Other job CHECKs | B13 | Every violation count is zero | Any nonzero count |
| Output CHECKs | B14 | Every violation count is zero | Any nonzero count |
| Parent FK | B16 | Both counts are zero | Missing parent or direct self-parent |
| Idempotency unique index | B09 | Zero duplicate keys | Any duplicate |
| Attempt unique index | B10 | Zero duplicate attempt identities | Any duplicate |
| Provider-request unique index | B12 | Zero duplicate provider identities | Any duplicate |
| Active-purpose unique index | B01 and B18 | Zero active duplicates and exact predicate approved | Ambiguous status or duplicate |
| One-output-per-job unique index | B04 and B15 | No job has more than one output | Any multi-output job |
| Current-preview unique index | B11 | Zero duplicate current briefs | Any duplicate |
| Review output support index | Q05 | Index remains absent; operational lock plan accepted | Existing equivalent index or unsafe window |
| Constraint validation | Matching B13/B14/B16 | All relevant counts zero after new writer population | Any violation or incomplete rollout |

## 25. Blocked candidate statements

All candidate SQL is unexecuted and requires a separate approval. Specifically
blocked on row evidence are the job status CHECK, all constraint validations,
all unique indexes, the parent FK validation, any future `NOT NULL` hardening,
any default change, and any reinterpretation of `pending_review`. No backfill,
destructive statement, review-status change, access-control mutation, or
Storage mutation is included.

## 26. Post-execution metadata verification queries

These are for a future owner-run verification only after separately authorized
SQL execution.

### V01 - Added columns

Purpose: verify exact types/nullability/defaults. Pass: the reviewed candidate
set appears exactly once with no unexpected default. Fail closed: any mismatch.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

```sql
SELECT table_name, ordinal_position, column_name, data_type, udt_name,
       is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('ai_sketch_jobs', 'ai_sketch_outputs')
  AND column_name IN (
    'generation_purpose', 'idempotency_key', 'attempt_number', 'parent_job_id',
    'design_spec_version', 'design_spec_hash',
    'hand_sketch_instruction_version', 'hand_sketch_instruction_hash',
    'provider_name', 'provider_request_id', 'request_size', 'request_quality',
    'output_format', 'moderation_mode', 'started_at', 'deadline_at',
    'completed_at', 'cancelled_at', 'timed_out_at', 'failure_category',
    'retry_eligible', 'terminal_reason', 'estimated_cost_micros',
    'actual_cost_micros', 'cost_currency', 'pricing_assumption_version',
    'mime_type', 'byte_size', 'width_px', 'height_px', 'content_sha256',
    'asset_created_at', 'asset_validated_at', 'automatic_gate_status',
    'automatic_gate_evidence', 'automatic_gate_policy_version',
    'automatic_gates_validated_at', 'readiness_status',
    'first_preview_ready_at', 'readiness_revoked_at',
    'is_current_customer_preview'
  )
ORDER BY table_name, ordinal_position;
```

### V02 - Added constraints and validation state

Purpose: verify exact definitions and validation state. Pass: every approved
constraint matches the reviewed SQL and expected phase. Fail closed: missing,
unexpected, invalid, or prematurely validated constraints.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

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

### V03 - Added indexes

Purpose: verify exact definitions and valid/ready/live state. Pass: only the
approved indexes exist and all are valid, ready, and live. Fail closed: any
mismatch or invalid state.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

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
    'ai_sketch_jobs_parent_job_id_idx',
    'ai_sketch_outputs_readiness_lookup_idx',
    'ai_sketch_reviews_ai_sketch_output_id_idx'
  )
ORDER BY table_name, index_name;
```

## 27. Post-execution aggregate verification queries

### V04 - Readiness integrity

Purpose: prove no row violates the new ready/current defense-in-depth rules.
Pass: all counts zero. Fail closed: any nonzero count and no customer rollout.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

```sql
SELECT
  count(*) FILTER (
    WHERE readiness_status = 'first_preview_ready'
      AND (
        automatic_gate_status IS DISTINCT FROM 'passed'
        OR automatic_gates_validated_at IS NULL
        OR first_preview_ready_at IS NULL
        OR object_path IS NULL
        OR asset_validated_at IS NULL
        OR is_current_customer_preview IS DISTINCT FROM true
      )
  ) AS invalid_ready_count,
  count(*) FILTER (
    WHERE is_current_customer_preview = true
      AND readiness_status IS DISTINCT FROM 'first_preview_ready'
  ) AS invalid_current_count
FROM public.ai_sketch_outputs;
```

### V05 - Duplicate invariants

Purpose: reconfirm idempotency, attempts, provider requests, output cardinality,
and current selection without returning identities. Pass: every count zero.
Fail closed: any nonzero count.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

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
    WHERE is_current_customer_preview = true
    GROUP BY concept_brief_id HAVING count(*) > 1
  ) d) AS duplicate_current_preview_count;
```

## 28. Roll-forward and recovery principles

- Prefer additive nullable columns and staged constraints.
- Treat null readiness as not ready; never fabricate legacy readiness.
- Roll forward by correcting future writers or adding a reviewed constraint;
  do not delete rows or rewrite evidence history.
- Disable future writes/customer visibility before any incident response.
- Preserve jobs, outputs, review history, automatic evidence, and audit times.
- Do not include destructive rollback SQL. Dropping columns, constraints, or
  indexes requires a separate dependency review and approval.
- Access-control remediation remains a separate scope after effective privilege
  evidence is complete.

## 29. Explicit no-execution statement

No SQL was executed. No Supabase connection was made. No business/customer row
was inspected. No schema, RLS, policy, grant, Storage, provider, environment,
route, UI, deployment, or Production action occurred. All SQL is unexecuted
documentation for later owner review.

## 30. Recommended later Agent sequence

1. Formal review of the Agent 70B-2 documentation PR.
2. Owner manually executes separately approved supplemental `SELECT`-only
   metadata and aggregate preflights.
3. A later documentation Agent reconciles the returned supplemental evidence
   and regenerates any blocked predicate or statement if required.
4. A separately approved SQL execution Agent executes only explicitly
   authorized additive SQL.
5. Owner runs post-execution metadata and aggregate verification.
6. A separate Agent implements private generated-asset Storage and secure
   server-mediated or short-lived signed access.
7. A separate provider/environment Agent constructs the real provider client,
   handles credentials, and enforces budget, limiter, and call authorization.
8. A separate Agent wires generation only after confirmed persistence.
9. A separate Agent implements trusted automatic readiness gates.
10. A separate Agent implements the customer First Preview route/UI.
11. A separate Agent integrates post-preview human review and correction.

No later stage is approved or implemented by Agent 70B-2.
