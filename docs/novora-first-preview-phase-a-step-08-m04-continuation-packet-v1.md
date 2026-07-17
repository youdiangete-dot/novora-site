# NOVORA First Preview Phase A Resume Step 08 - M04 Continuation Packet v1

Date: 2026-07-17

Status: **FROZEN FOR SEPARATE OWNER APPROVAL - NOT EXECUTED**

## 1. Decision and exact scope

The separately approved Resume Step 07 (`M03`) produced complete PASS evidence.
The exact external context PNG and membership CSV, the sanitized external
supplement, and a separate independent read-only review all passed without an
identity, completeness, duplicate, privacy, or evidence-contract mismatch.
That evidence permits preparation of this packet; it does not authorize another
query.

The exact next item in the frozen 68-step Resume Packet is **Step 08, label
`M04`**. If separately approved with every immutable identity in this packet,
the only SQL this packet may release is one Owner-performed manual execution of
the exact frozen SELECT-only Step 08 (`M04`). A fresh visual context gate and
fresh quiet window are mandatory before the statement. Whether the statement
passes or fails, all SQL stops for independent evidence reconciliation. Resume
Steps 09-68 remain prohibited.

Merging this packet does not authorize execution.

## 2. Verified evidence and immutable identities

- Step 07 Continuation Packet post-merge `origin/main` and this packet's
  preparation base: `0288905552cae1e3d5f2ee6923bf509b10d77d41`
- Step 07 Continuation Packet PR #220 reviewed head:
  `990afdf5bff7486a43339e2dc0a236045ba070c4`
- Step 07 Continuation Packet Git blob:
  `e124986cf3f4420b1569edf4e8772d413b395bc7`
- Completed Step 07 continuation supplement filename:
  `novora-fp-phase-a-resume-step-07-m03-continuation-08-manifest-v1.json`
- Completed Step 07 continuation supplement byte size: `12025`
- Completed Step 07 continuation supplement SHA-256:
  `b1b9161bc89704ee97eac7ba93aa6d403b21f2fc18bc7854514a5d0ab8a61381`
- Fresh Step 07 context artifact filename:
  `novora-fp-phase-a-resume-step-07-m03-continuation-00-context.png`
- Fresh Step 07 context artifact byte size: `91121`
- Fresh Step 07 context artifact SHA-256:
  `ea6f2e7c262768afb529e3a08f62c6a4920cfd9e6f909475717cdebf8186d5a0`
- Step 07 (`M03`) PASS artifact filename:
  `novora-fp-phase-a-resume-07-m03.csv`
- Step 07 (`M03`) PASS artifact byte size: `601`
- Step 07 (`M03`) PASS artifact SHA-256:
  `9c128badda0467a599866f0c6f0d1e4ecacf2933b4b7233d0a4729dc8579e72a`
- Frozen Resume Packet path:
  `docs/novora-first-preview-phase-a-resume-packet-v1.md`
- Frozen Resume Packet Git blob:
  `98e6b4a70fba66e317b57fd6f6bfc1bb3274bc85`
- Frozen original Phase A MANUAL source path:
  `docs/novora-first-preview-schema-phase-a-owner-manual-execution-sequence-v1.md`
- Frozen original Phase A MANUAL source Git blob:
  `1d7ee46755254e6c01ac125793ecbd9bf3451204`

The final Step 07 supplement selects exactly two PASS artifacts and zero error
artifacts. The context PNG, M03 CSV, and supplement identities remained
unchanged between the independent reviewer's start and end hashes. The CSV has
the exact four headers, 12 complete rows in the required order, zero full-row
duplicates, zero duplicate membership tuples, and the exact frozen Stage A
membership baseline with no additional or unreviewed inherited privilege path.
`actual_canonical_sql_sha256` and `canonical_hash_equality` correctly remain
null because the CSV does not independently prove the SQL Editor input bytes.
Phase A Resume and Phase A remain STOPPED; Steps 08-68 remain `not_run`.

Before any later approval, the final copy-ready approval sentence must replace
its four explicit placeholders with the post-merge `origin/main` commit, exact
reviewed PR head, PR number, and Git blob of this frozen packet. Any head change
after review requires a new review.

## 3. Exact target and fresh quiet window

If separately approved, the Owner may manually perform this packet only against:

- Supabase project: `novora-production`
- Branch/environment context: `main` / Production
- Database: Primary Database (`postgres`)
- Target schema: `public`
- Selected current role and session role: `postgres`
- SQL Editor row limit: at least `1000`

Before the visual context gate, confirm a fresh quiet window with no role or
membership change, table ACL grant or revoke, ownership or schema operation,
default-privilege change, RLS or policy change, migration, application rollout,
or other actor changing the effective DML access posture of `anon`,
`authenticated`, or `service_role` on `admin_notes`, `ai_sketch_jobs`,
`ai_sketch_outputs`, `ai_sketch_reviews`, `concept_brief_reference_assets`, or
`concept_briefs`. The quiet window must remain active through Step 08 evidence
capture. STOP before the context gate if it cannot be confirmed.

### Context-proof boundary

The fresh visual gate independently re-proves only the visible project,
`main` / Production environment, Primary Database selection, selected current
role `postgres`, row limit, and blank editor. The quiet-window status is
Owner-attested and is not independently proved by the visual artifact or by the
database query.

The accepted R01 CSV remains the last SQL evidence for
`current_schema = public`, `session_role = postgres`, and
`server_is_in_recovery = false`. The exact M04 statement returns effective table
privilege booleans, but neither the new visual gate nor M04 re-proves the
session's current schema, session role, or recovery state. The Owner must attest
that no visible project, environment, database, role, or target control changed
after accepted Step 07 evidence and before Step 08. This attestation does not
prove reuse of one database backend session.

Any future exact approval must explicitly accept this bounded reliance for the
single SELECT-only effective-DML query. If the Owner does not accept it, or
requires fresh SQL proof of session role or recovery state, STOP: this
Step-08-only packet cannot provide that proof, and a separately reviewed and
approved context-preflight packet is required. Do not add an ad hoc context
query.

## 4. Canonical SQL and frozen-source rule

Resume Step 08 is incorporated from frozen Resume Packet Git blob
`98e6b4a70fba66e317b57fd6f6bfc1bb3274bc85`, sequence-table Step `08`, label
`M04`, and only from MANUAL source Git blob
`1d7ee46755254e6c01ac125793ecbd9bf3451204`, repository path
`docs/novora-first-preview-schema-phase-a-owner-manual-execution-sequence-v1.md`,
heading label `07 - M04`, and exact full Markdown heading `### 07 - M04`.

The only executable SQL is the complete fenced `sql` block under that exact
source heading.

Canonicalize the complete statement by normalizing CRLF/CR to LF; trimming
leading and trailing statement whitespace; requiring and removing exactly one
terminal semicolon; trimming the remaining body; then appending exactly one
semicolon and one LF. Hash those UTF-8 bytes without a BOM.

Required Step 08 (`M04`) canonical SHA-256:

`88079b80be9b150a3313d152aaf4da5dc328c0448bfc3d2322757aeac7348191`

The independently recomputed canonical byte length is `842`.

Do not add comments, combine statements, add a transaction wrapper, edit
identifiers, substitute SQL, or execute if the complete Resume/MANUAL blob,
sequence row, heading, SQL block, byte length, or canonical hash does not match.

For Owner convenience, the exact incorporated Step 08 (`M04`) SQL is reproduced
below. The Git blobs, sequence row, and heading above remain authoritative.

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

## 5. Exact expected result and access-control boundary

PASS requires one complete, untruncated CSV with exactly these six headers in
this order:

1. `role_name`
2. `table_name`
3. `can_select`
4. `can_insert`
5. `can_update`
6. `can_delete`

It must contain exactly these 18 rows in `role_name`, `table_name` order:

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

Duplicate complete rows and duplicate `(role_name, table_name)` identities must
both be zero. Missing, duplicate, additional, null, malformed, differently
valued, broadened, or truncated permission rows are a STOP.

The statement returns approved database role names, approved table names, and
effective DML booleans only. It must not return, inspect, export, or record any
application user, auth-user row, business-row value, business-row identity,
customer value, customer identity, brief reference, prompt, note, object path,
URL, image, secret, token, key, environment value, or Provider data. The result
does not authorize a role, membership, grant, privilege, ownership, schema,
RLS, policy, Storage, or row change.

## 6. Exact manual sequence and evidence

### Step 00 - fresh visual context gate

Open a fresh blank SQL Editor and visibly verify the exact project,
branch/environment, Primary Database, selected role `postgres`, and row limit of
at least `1000`. The editor and result pane must not display unrelated SQL,
history, stale results, customer content, secrets, or environment-variable
values.

Before capture, the Owner must attest that the fresh quiet window is active,
that no visible target control changed after accepted Step 07 evidence, and that
the context-proof boundary's explicitly limited proof basis is accepted. STOP
if any statement cannot be made exactly.

On PASS, capture exactly:

`novora-fp-phase-a-resume-step-08-m04-continuation-00-context.png`

On any mismatch, missing control, stale content, warning, or incomplete visual
evidence, capture exactly:

`novora-fp-phase-a-resume-step-08-m04-continuation-00-context-error.png`

Then record Resume Step 08 as `not_run` and STOP. Select exactly one mutually
exclusive context artifact.

### Step 01 - exact frozen Resume Step 08 (`M04`)

Only after Step 00 passes, paste the complete authoritative statement into the
fresh blank editor, verify its canonical hash and byte length, and execute it
exactly once with the ordinary manual `Run` action.

On PASS, export the complete result with headers exactly as:

`novora-fp-phase-a-resume-08-m04.csv`

On any warning, SQL error, unexpected zero-row result, missing or truncated
result, permission mismatch, transport or fetch failure, or export failure,
capture exactly:

`novora-fp-phase-a-resume-08-m04-error.png`

Select exactly one mutually exclusive Step 08 result artifact. Whether Step 08
passes or fails, STOP. Do not retry and do not execute Resume Step 09.

## 7. Post-attempt reconciliation contract

The next read-only reconciliation must create the sanitized external supplement:

`novora-fp-phase-a-resume-step-08-m04-continuation-09-manifest-v1.json`

It must bind the exact approval, post-merge packet, reviewed PR head, MANUAL
source, Resume Packet, completed Step 07 supplement, canonical hash, and
selected-artifact identities; record the fresh quiet-window confirmation as
Owner-attested and not independently database-verified; record the
context-proof boundary and values not freshly re-proven; list exactly one
selected context artifact and, only if Step 08 was attempted, exactly one
selected result artifact; record actual bytes, SHA-256 values, exact six
headers, row and duplicate counts, exact sanitized 18-row result, expected
canonical hash, nullable actual canonical hash and equality with exact proof
basis, and PASS/ERROR/`not_run`; preserve Phase A Resume and Phase A as STOPPED;
mark Steps 09-68 `not_run`; and record every exclusion.

CSV result evidence does not prove submitted SQL bytes. For a PASS CSV,
`actual_canonical_sql_sha256` and `canonical_hash_equality` must remain null and
the proof basis must say so explicitly.

The supplement must contain no application-user, auth-user, business-row, or
customer data; row IDs; brief references; prompts; notes; Storage object-path
values; URLs; images; secrets; tokens; keys; environment-variable values; or
Provider data.

## 8. Universal STOP conditions

STOP immediately on any visible project, environment, database, selected
current role, row limit, quiet-window, context attestation, bounded-reliance
acceptance, target schema, packet/source/Resume blob, source heading, sequence
label, canonical hash, canonical byte length, header, row, duplicate, role,
table, effective permission, completeness, truncation, filename, warning, SQL
error, transport/fetch error, export error, or expected-result mismatch.

After a STOP, do not click a generic `Retry` control, rerun Step 08, change SQL,
inspect rows, repair, compensate, roll back, clean up, or continue.

## 9. Explicit exclusions

This packet does not authorize:

- Codex, MCP, CLI, script, or other automated Supabase connection or SQL
  execution;
- execution without a separate exact Owner approval tied to the post-merge
  `origin/main`, exact reviewed PR head, this packet's Git blob, the completed
  Step 07 supplement SHA-256, Resume Packet blob, MANUAL source blob, Step 08
  label, and M04 canonical SHA-256, while explicitly accepting the context-proof
  boundary;
- more than one manual Step 08 attempt or any retry;
- R01, R02, R04, C03, M01, M02, M03, Resume Step 09, or any later Resume
  statement;
- any role, membership, admin-option, grant, privilege, ownership, schema, RLS,
  policy, Storage, default-privilege, or ACL change;
- `23.1-S01` or `23.2-S01` retry;
- candidate DDL, block 23.7, constraint validation, replacement or ad hoc SQL;
- DML, repair, compensation, backfill, data edits, DELETE, rollback, or cleanup;
- application-user, auth-user, customer, or business-row inspection;
- Provider/generated-asset actions, environment changes, deployment,
  application rollout, email, payment, or customer-visible behavior; or
- branch, worktree, manifest, evidence, or artifact deletion.

Phase A Resume and Phase A remain **STOPPED** after Step 08 pending independent
evidence reconciliation and a separately reviewed continuation decision.

## 10. Copy-ready separate Owner approval sentence template

Replace every angle-bracket placeholder only after the documentation PR is
independently reviewed, unchanged at its reviewed head, merged, and the packet
Git blob plus post-merge `origin/main` are independently recomputed. Do not use
this template before then.

> APPROVE NOVORA FIRST PREVIEW PHASE A RESUME STEP 08 (`M04`) CONTINUATION PACKET v1, and only that packet, for one Owner-performed manual SELECT-only attempt against Supabase project `novora-production`, `main` / Production, Primary Database (`postgres`), target schema `public`, selected current role and session role `postgres`, and SQL Editor row limit at least `1000`, using merged `origin/main` commit `<POST_MERGE_ORIGIN_MAIN_COMMIT>`, PR #`<PR_NUMBER>` reviewed head `<REVIEWED_PR_HEAD>`, continuation packet `docs/novora-first-preview-phase-a-step-08-m04-continuation-packet-v1.md` Git blob `<PACKET_GIT_BLOB>`, completed Step 07 supplement `novora-fp-phase-a-resume-step-07-m03-continuation-08-manifest-v1.json` SHA-256 `b1b9161bc89704ee97eac7ba93aa6d403b21f2fc18bc7854514a5d0ab8a61381`, frozen Resume Packet Git blob `98e6b4a70fba66e317b57fd6f6bfc1bb3274bc85`, frozen MANUAL source Git blob `1d7ee46755254e6c01ac125793ecbd9bf3451204`, sequence Step `08`, label `M04`, source heading label `07 - M04`, exact full Markdown heading `### 07 - M04`, canonical byte length `842`, and canonical SHA-256 `88079b80be9b150a3313d152aaf4da5dc328c0448bfc3d2322757aeac7348191`; I explicitly accept the packet's bounded context-proof basis, Owner-attested quiet window, and no-visible-target-control-change statement; approval is limited to one fresh visual context capture and, only after that gate passes, one ordinary-Run execution of the exact frozen M04 statement with PASS evidence `novora-fp-phase-a-resume-08-m04.csv` or ERROR evidence `novora-fp-phase-a-resume-08-m04-error.png`; PASS requires exactly 18 complete ordered effective-DML rows with zero full-row or `(role_name, table_name)` duplicates and the exact frozen Stage A matrix for `anon`, `authenticated`, and `service_role` across the six approved tables, with no application-user, auth-user, business-row, or customer value or identity; whether Step 08 passes or fails, all SQL must STOP for independent evidence reconciliation and no Step 09 or later action is authorized.
