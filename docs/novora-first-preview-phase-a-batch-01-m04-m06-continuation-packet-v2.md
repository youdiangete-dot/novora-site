# NOVORA First Preview Phase A Resume Batch 01 - M04-M06 Continuation Packet v2

Date: 2026-07-17

Status: **FROZEN FOR SEPARATE OWNER APPROVAL - NOT EXECUTED**

## 1. Decision and exact scope

Resume Steps 01-07 have complete, independently reconciled PASS evidence.
Resume Steps 08-68 remain `not_run`; Phase A Resume and Phase A remain
**STOPPED**.

This packet covers only Batch 01, in this exact order:

1. Step 08 / `M04` - effective DML access posture;
2. Step 09 / `M05` - effective TRUNCATE posture; and
3. Step 10 / `M06` - role, schema-usage, ownership, RLS, and policy posture.

All three are SELECT-only catalog/access-control verification statements. If
separately approved with the exact post-merge identities, the Owner may execute
each statement manually and individually once. M04 must pass before M05; M05
must pass before M06. Whether the batch completes or stops, no Step 11 or later
statement is released.

Merging this packet authorizes no SQL.

The historical single-step
`docs/novora-first-preview-phase-a-step-08-m04-continuation-packet-v1.md`, Git
blob `8798f99fb50ed57e951a92ddd4f53704e6e178fa`, remains immutable, unapproved,
and unexecuted. It is not an alternative execution authority for this batch.

## 2. Verified evidence and immutable identities

- Preparation base, merged `origin/main`:
  `3d18ef7ab1424190a3d1b2b013265cd1bddef0b3`
- PR #221 reviewed head:
  `50fe22c2fab3e56d1f1e0a221d2ce0e36de94205`
- Completed Step 07 supplement:
  `novora-fp-phase-a-resume-step-07-m03-continuation-08-manifest-v1.json`
- Completed Step 07 supplement byte size: `12025`
- Completed Step 07 supplement SHA-256:
  `b1b9161bc89704ee97eac7ba93aa6d403b21f2fc18bc7854514a5d0ab8a61381`
- Frozen Resume Packet:
  `docs/novora-first-preview-phase-a-resume-packet-v1.md`
- Frozen Resume Packet Git blob:
  `98e6b4a70fba66e317b57fd6f6bfc1bb3274bc85`
- Frozen MANUAL source:
  `docs/novora-first-preview-schema-phase-a-owner-manual-execution-sequence-v1.md`
- Frozen MANUAL source Git blob:
  `1d7ee46755254e6c01ac125793ecbd9bf3451204`
- Accelerated plan:
  `docs/novora-first-preview-phase-a-accelerated-batch-resume-plan-v2.md`

The three statements are incorporated from the exact MANUAL Git blob and the
exact sequence rows in the Resume Packet. The only executable text is the
complete fenced `sql` block under the named MANUAL heading. The reproduced SQL
below is for Owner convenience and was independently extracted from that blob.

Canonicalization: normalize CRLF/CR to LF; trim leading and trailing statement
whitespace; require and remove exactly one terminal semicolon; trim the body;
append exactly one semicolon and one LF; hash those UTF-8 bytes without a BOM.

| Step | Label | MANUAL heading | Canonical bytes | Canonical SHA-256 | PASS artifact | ERROR artifact |
| ---: | --- | --- | ---: | --- | --- | --- |
| 08 | `M04` | label `07 - M04`; full heading `### 07 - M04` | `842` | `88079b80be9b150a3313d152aaf4da5dc328c0448bfc3d2322757aeac7348191` | `novora-fp-phase-a-resume-08-m04.csv` | `novora-fp-phase-a-resume-08-m04-error.png` |
| 09 | `M05` | label `08 - M05`; full heading `### 08 - M05` | `531` | `6716fd72b1392be20d03404839c9becf656dc438a60822e4dbcb5bd0e4761109` | `novora-fp-phase-a-resume-09-m05.csv` | `novora-fp-phase-a-resume-09-m05-error.png` |
| 10 | `M06` | label `09 - M06`; full heading `### 09 - M06` | `1037` | `a7282515ace0354f60a24ae403603c6333312e48f929a8695caab7c255ba73c7` | `novora-fp-phase-a-resume-10-m06.csv` | `novora-fp-phase-a-resume-10-m06-error.png` |

STOP before execution if any blob, path, sequence row, heading, SQL block,
canonical byte length, or canonical hash cannot be verified exactly.

## 3. Exact target, context boundary, and quiet window

If separately approved, Owner execution is limited to:

- Supabase project: `novora-production`
- Branch/environment: `main` / Production
- Database: Primary Database (`postgres`)
- Target schema: `public`
- Selected current role and session role: `postgres`
- SQL Editor row limit: at least `1000`

Before the context capture, establish a fresh uninterrupted quiet window with no
role or membership change; table ACL grant or revoke; ownership, schema,
default-privilege, RLS, or policy change; migration; application rollout; or
other actor changing the effective access posture of `anon`, `authenticated`,
or `service_role` on the six approved tables. It must remain active through the
M06 artifact capture.

Open a fresh blank SQL Editor. The fresh visual context gate independently
proves only the visible project, `main` / Production environment, Primary
Database selection, selected current role `postgres`, row limit, and blank
editor/result pane. It does not freshly prove `current_schema = public`,
`session_role = postgres`, `server_is_in_recovery = false`, reuse of one database
backend session, or the quiet-window truth. Those session values remain bounded
reliance on the accepted fresh R01 PASS evidence. The quiet window and the
statement that no visible target control changed are Owner-attested and are not
independently database-verified.

The same visual context may support M04-M06 only while every visible target
control remains unchanged and there is no refresh, reconnection, context drift,
warning, error, transport/fetch failure, or export failure. Any such event is an
immediate batch STOP; do not capture a replacement context inside the same
approval.

On context PASS, capture exactly:

`novora-fp-phase-a-resume-batch-01-m04-m06-00-context.png`

On context ERROR, capture exactly:

`novora-fp-phase-a-resume-batch-01-m04-m06-00-context-error.png`

If context fails, mark Steps 08-10 `not_run` and STOP.

## 4. Step 08 / M04 - exact SQL and expected result

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

PASS requires these six headers, exactly in order: `role_name`, `table_name`,
`can_select`, `can_insert`, `can_update`, `can_delete`.

It requires exactly these 18 ordered rows:

| role_name | table_name | can_select | can_insert | can_update | can_delete |
| --- | --- | --- | --- | --- | --- |
| `anon` | `admin_notes` | `false` | `false` | `false` | `false` |
| `anon` | `ai_sketch_jobs` | `false` | `false` | `false` | `false` |
| `anon` | `ai_sketch_outputs` | `false` | `false` | `false` | `false` |
| `anon` | `ai_sketch_reviews` | `false` | `false` | `false` | `false` |
| `anon` | `concept_brief_reference_assets` | `false` | `false` | `false` | `false` |
| `anon` | `concept_briefs` | `false` | `false` | `false` | `false` |
| `authenticated` | `admin_notes` | `false` | `false` | `false` | `false` |
| `authenticated` | `ai_sketch_jobs` | `false` | `false` | `false` | `false` |
| `authenticated` | `ai_sketch_outputs` | `false` | `false` | `false` | `false` |
| `authenticated` | `ai_sketch_reviews` | `false` | `false` | `false` | `false` |
| `authenticated` | `concept_brief_reference_assets` | `false` | `false` | `false` | `false` |
| `authenticated` | `concept_briefs` | `false` | `false` | `false` | `false` |
| `service_role` | `admin_notes` | `true` | `true` | `false` | `false` |
| `service_role` | `ai_sketch_jobs` | `true` | `true` | `true` | `false` |
| `service_role` | `ai_sketch_outputs` | `true` | `true` | `true` | `false` |
| `service_role` | `ai_sketch_reviews` | `true` | `true` | `true` | `false` |
| `service_role` | `concept_brief_reference_assets` | `true` | `true` | `false` | `false` |
| `service_role` | `concept_briefs` | `true` | `true` | `false` | `true` |

Full-row duplicates and duplicate `(role_name, table_name)` identities must both
be zero. Missing, additional, null, malformed, differently valued, broadened,
or truncated rows are a STOP.

Execute M04 once with ordinary manual `Run`. On PASS, export the complete CSV
with headers to `novora-fp-phase-a-resume-08-m04.csv`. On any mismatch, warning,
SQL error, transport/fetch failure, or export failure, capture
`novora-fp-phase-a-resume-08-m04-error.png` and STOP. Only after the PASS artifact
is safely captured may the Owner continue to M05.

## 5. Step 09 / M05 - exact SQL and expected result

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

PASS requires these three headers, exactly in order: `role_name`, `table_name`,
`can_truncate`.

It requires exactly these 18 ordered rows:

| role_name | table_name | can_truncate |
| --- | --- | --- |
| `anon` | `admin_notes` | `false` |
| `anon` | `ai_sketch_jobs` | `false` |
| `anon` | `ai_sketch_outputs` | `false` |
| `anon` | `ai_sketch_reviews` | `false` |
| `anon` | `concept_brief_reference_assets` | `false` |
| `anon` | `concept_briefs` | `false` |
| `authenticated` | `admin_notes` | `false` |
| `authenticated` | `ai_sketch_jobs` | `false` |
| `authenticated` | `ai_sketch_outputs` | `false` |
| `authenticated` | `ai_sketch_reviews` | `false` |
| `authenticated` | `concept_brief_reference_assets` | `false` |
| `authenticated` | `concept_briefs` | `false` |
| `service_role` | `admin_notes` | `false` |
| `service_role` | `ai_sketch_jobs` | `false` |
| `service_role` | `ai_sketch_outputs` | `false` |
| `service_role` | `ai_sketch_reviews` | `false` |
| `service_role` | `concept_brief_reference_assets` | `false` |
| `service_role` | `concept_briefs` | `false` |

Full-row duplicates and duplicate `(role_name, table_name)` identities must both
be zero. Every `can_truncate` value must be false.

Execute M05 once with ordinary manual `Run`. On PASS, export the complete CSV
with headers to `novora-fp-phase-a-resume-09-m05.csv`. On any mismatch, warning,
SQL error, transport/fetch failure, or export failure, capture
`novora-fp-phase-a-resume-09-m05-error.png` and STOP. Only after the PASS artifact
is safely captured may the Owner continue to M06.

## 6. Step 10 / M06 - exact SQL and expected result

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

PASS requires these eight headers, exactly in order: `role_name`,
`rolbypassrls`, `has_public_schema_usage`, `table_name`, `table_owner`,
`rls_enabled`, `rls_forced`, `policy_count`.

It requires exactly these 18 ordered rows:

| role_name | rolbypassrls | has_public_schema_usage | table_name | table_owner | rls_enabled | rls_forced | policy_count |
| --- | --- | --- | --- | --- | --- | --- | ---: |
| `anon` | `false` | `true` | `admin_notes` | `postgres` | `true` | `false` | `0` |
| `anon` | `false` | `true` | `ai_sketch_jobs` | `postgres` | `true` | `false` | `0` |
| `anon` | `false` | `true` | `ai_sketch_outputs` | `postgres` | `true` | `false` | `0` |
| `anon` | `false` | `true` | `ai_sketch_reviews` | `postgres` | `true` | `false` | `0` |
| `anon` | `false` | `true` | `concept_brief_reference_assets` | `postgres` | `true` | `false` | `0` |
| `anon` | `false` | `true` | `concept_briefs` | `postgres` | `true` | `false` | `0` |
| `authenticated` | `false` | `true` | `admin_notes` | `postgres` | `true` | `false` | `0` |
| `authenticated` | `false` | `true` | `ai_sketch_jobs` | `postgres` | `true` | `false` | `0` |
| `authenticated` | `false` | `true` | `ai_sketch_outputs` | `postgres` | `true` | `false` | `0` |
| `authenticated` | `false` | `true` | `ai_sketch_reviews` | `postgres` | `true` | `false` | `0` |
| `authenticated` | `false` | `true` | `concept_brief_reference_assets` | `postgres` | `true` | `false` | `0` |
| `authenticated` | `false` | `true` | `concept_briefs` | `postgres` | `true` | `false` | `0` |
| `service_role` | `true` | `true` | `admin_notes` | `postgres` | `true` | `false` | `0` |
| `service_role` | `true` | `true` | `ai_sketch_jobs` | `postgres` | `true` | `false` | `0` |
| `service_role` | `true` | `true` | `ai_sketch_outputs` | `postgres` | `true` | `false` | `0` |
| `service_role` | `true` | `true` | `ai_sketch_reviews` | `postgres` | `true` | `false` | `0` |
| `service_role` | `true` | `true` | `concept_brief_reference_assets` | `postgres` | `true` | `false` | `0` |
| `service_role` | `true` | `true` | `concept_briefs` | `postgres` | `true` | `false` | `0` |

Full-row duplicates and duplicate `(role_name, table_name)` identities must both
be zero. Missing, additional, null, malformed, differently valued, broadened,
or truncated rows are a STOP.

Execute M06 once with ordinary manual `Run`. On PASS, export the complete CSV
with headers to `novora-fp-phase-a-resume-10-m06.csv`. On any mismatch, warning,
SQL error, transport/fetch failure, or export failure, capture
`novora-fp-phase-a-resume-10-m06-error.png` and STOP. Whether M06 passes or
fails, all SQL stops for reconciliation. Step 11 is not authorized.

## 7. Privacy and access-control boundary

M04-M06 return only the three approved database role names, the six approved
table names, effective privilege booleans, approved table ownership, RLS/FORCE
RLS booleans, public-schema usage, and policy counts. They must not return,
inspect, export, or record any application user, auth-user row, business-row
value or identity, customer value or identity, row ID, brief reference, prompt,
note, object path, URL, image, secret, token, key, environment-variable value,
or Provider data.

The results are evidence only. They authorize no role, membership, admin option,
grant, revoke, privilege, ownership, schema, default-privilege, RLS, policy,
Storage, table, or row change.

## 8. Batch execution and evidence sequence

1. Capture exactly one fresh context PASS or ERROR artifact from section 3.
2. After context PASS, paste only the exact M04 statement, verify its identity,
   and run it once. Capture exactly one M04 PASS or ERROR artifact.
3. After M04 PASS and evidence export, paste only exact M05, verify its identity,
   and run it once. Capture exactly one M05 PASS or ERROR artifact.
4. After M05 PASS and evidence export, paste only exact M06, verify its identity,
   and run it once. Capture exactly one M06 PASS or ERROR artifact.
5. After M06 PASS or any STOP, run no more SQL. Preserve all artifacts for one
   independent batch reconciliation.

Do not return for a reconciliation packet or approval between M04, M05, and
M06. Do not use Retry. Do not create an evidence placeholder for a `not_run`
statement.

## 9. Combined reconciliation contract

After Batch 01 completes or stops, the read-only reconciliation must create one
sanitized external manifest:

`novora-fp-phase-a-resume-batch-01-m04-m06-11-manifest-v2.json`

It must bind the exact Owner approval, post-merge commit, reviewed PR head,
Batch 01 packet blob, accelerated-plan blob, Resume Packet blob, MANUAL blob,
completed Step 07 supplement, quiet-window attestation, context proof boundary,
and every attempted statement identity. It must select exactly one context
artifact and one mutually exclusive result artifact for every attempted
statement; record actual filename, format, bytes, file SHA-256, headers, row and
duplicate counts, exact sanitized results, expected canonical SQL hash, nullable
actual hash/equality, proof basis, PASS/ERROR/`not_run`, last successful and
failed items, and all exclusions.

CSV results do not prove the submitted SQL bytes. For each CSV,
`actual_canonical_sql_sha256` and `canonical_hash_equality` must remain null
unless separate selected evidence genuinely proves the complete reconstructable
submitted bytes. The manifest contains no protected data identified in section
7.

One independent read-only evidence review must rehash the selected external
artifacts and manifest, verify exact results and STOP behavior, and confirm
start/end identity stability. One ledger update and one documentation-only PR
follow. Phase A Resume and Phase A remain STOPPED pending that reconciliation
and the next separately reviewed batch decision.

## 10. Universal STOP conditions and exclusions

STOP immediately on any project, environment, database, selected role,
row-limit, quiet-window, context, target-control, bounded-reliance, source/packet
blob, heading, sequence, canonical-byte-length, canonical-hash, filename,
header, row, duplicate, role, table, privilege, ownership, schema usage, RLS,
policy, completeness, truncation, warning, SQL error, transport/fetch, export,
or expected-result mismatch. Mark every later Batch 01 item `not_run`.

After STOP, do not retry, repair, compensate, roll back, clean up, inspect rows,
change SQL, capture a replacement context, or continue.

This packet does not authorize Codex, MCP, CLI, script, or automated Supabase
connection or SQL execution; more than one attempt per statement; a generic
Retry action; R01-R04, C03, M01-M03, Step 11 or any later Resume statement;
`23.1-S01` or `23.2-S01`; candidate DDL; block 23.7; constraint validation;
replacement or ad hoc SQL; DML; repair; compensation; backfill; data edits;
DELETE; rollback; cleanup; role/membership/grant/privilege/ownership/schema/
default-privilege/ACL/RLS/policy/trigger/function/Storage changes; customer or
business-row inspection; Provider/generated-asset actions; Production or
environment changes; deployment; application rollout; email; payment;
customer-visible behavior; or branch, worktree, packet, manifest, evidence, or
artifact deletion.

## 11. Copy-ready separate Owner approval sentence

Replace only the four angle-bracket placeholders after this documentation PR is
independently reviewed at its unchanged exact head, merged, and all post-merge
identities are recomputed. Do not use this sentence before then.

> APPROVE NOVORA FIRST PREVIEW PHASE A RESUME BATCH 01 (`M04`-`M06`) CONTINUATION PACKET v2, and only that packet, for three sequential Owner-performed manual SELECT-only attempts against Supabase project `novora-production`, `main` / Production, Primary Database (`postgres`), target schema `public`, selected current role and session role `postgres`, and SQL Editor row limit at least `1000`, using merged `origin/main` commit `<POST_MERGE_ORIGIN_MAIN_COMMIT>`, PR #`<PR_NUMBER>` reviewed head `<REVIEWED_PR_HEAD>`, Batch 01 packet `docs/novora-first-preview-phase-a-batch-01-m04-m06-continuation-packet-v2.md` Git blob `<BATCH_01_PACKET_GIT_BLOB>`, completed Step 07 supplement `novora-fp-phase-a-resume-step-07-m03-continuation-08-manifest-v1.json` SHA-256 `b1b9161bc89704ee97eac7ba93aa6d403b21f2fc18bc7854514a5d0ab8a61381`, frozen Resume Packet Git blob `98e6b4a70fba66e317b57fd6f6bfc1bb3274bc85`, and frozen MANUAL source Git blob `1d7ee46755254e6c01ac125793ecbd9bf3451204`; I explicitly accept the packet's bounded context-proof basis, Owner-attested uninterrupted quiet window, and no-visible-target-control-change statement; approval is limited to one fresh Batch 01 visual context capture and then, only in exact order and only while every preceding gate passes, one ordinary-Run execution of Step `08` / `M04` under heading `### 07 - M04`, canonical byte length `842`, SHA-256 `88079b80be9b150a3313d152aaf4da5dc328c0448bfc3d2322757aeac7348191`, PASS `novora-fp-phase-a-resume-08-m04.csv` or ERROR `novora-fp-phase-a-resume-08-m04-error.png`; one ordinary-Run execution of Step `09` / `M05` under heading `### 08 - M05`, canonical byte length `531`, SHA-256 `6716fd72b1392be20d03404839c9becf656dc438a60822e4dbcb5bd0e4761109`, PASS `novora-fp-phase-a-resume-09-m05.csv` or ERROR `novora-fp-phase-a-resume-09-m05-error.png`; and one ordinary-Run execution of Step `10` / `M06` under heading `### 09 - M06`, canonical byte length `1037`, SHA-256 `a7282515ace0354f60a24ae403603c6333312e48f929a8695caab7c255ba73c7`, PASS `novora-fp-phase-a-resume-10-m06.csv` or ERROR `novora-fp-phase-a-resume-10-m06-error.png`; M04 PASS requires the exact 18-row effective-DML matrix, M05 PASS requires the exact 18-row all-false TRUNCATE matrix, and M06 PASS requires the exact 18-row ownership/RLS/policy/schema-usage/role-posture matrix, each with exact headers, ordering, values, zero full-row duplicates, zero duplicate `(role_name, table_name)` identities, and no application-user, auth-user, business-row, or customer value or identity; stop the entire batch immediately on any packet-defined mismatch, warning, SQL error, transport/fetch failure, or export failure, do not Retry or execute any remaining statement, and after completion or STOP run no more SQL pending one combined sanitized Batch 01 manifest and independent evidence reconciliation; this approval authorizes no Step 11 or later Resume statement, candidate DDL, block 23.7, repair, rollback, cleanup, access change, customer-data inspection, Provider, Storage, Production, deployment, application, customer-visible, automated Supabase, or deletion action.
