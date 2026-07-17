# NOVORA First Preview Phase A Resume Step 07 - M03 Continuation Packet v1

Date: 2026-07-17

Status: **FROZEN FOR SEPARATE OWNER APPROVAL - NOT EXECUTED**

## 1. Decision and exact scope

The separately approved Resume Step 06 (`M02`) produced complete PASS evidence.
The exact external context PNG and role-attribute CSV, the sanitized external
supplement, and a separate independent read-only review all passed without an
identity, completeness, duplicate, privacy, or evidence-contract mismatch.
That evidence permits preparation of this packet; it does not authorize another
query.

The exact next item in the frozen 68-step Resume Packet is **Step 07, label
`M03`**. If separately approved with every immutable identity in this packet,
the only SQL this packet may release is one Owner-performed manual execution of
the exact frozen SELECT-only Step 07 (`M03`). A fresh visual context gate and
fresh quiet window are mandatory before the statement. Whether the statement
passes or fails, all SQL stops for independent evidence reconciliation. Resume
Steps 08-68 remain prohibited.

Merging this packet does not authorize execution.

## 2. Verified evidence and immutable identities

- Step 06 Continuation Packet post-merge `origin/main` and this packet's
  preparation base: `c493df96a0b3c9ee05e3ae73344e1337f46c162c`
- Step 06 Continuation Packet PR #219 reviewed head:
  `4a6b3f53cd719a1bcc89c68fdf4634c79ce1083b`
- Step 06 Continuation Packet Git blob:
  `55532fa4bcd0eeec68299905555b12c7a0b3d738`
- Completed Step 06 continuation supplement filename:
  `novora-fp-phase-a-resume-step-06-m02-continuation-07-manifest-v1.json`
- Completed Step 06 continuation supplement byte size: `10867`
- Completed Step 06 continuation supplement SHA-256:
  `3fbf130c64f0f2a1089adddb88aa8123bd40f3d40ba0e784f48493941eed35a1`
- Fresh Step 06 context artifact filename:
  `novora-fp-phase-a-resume-step-06-m02-continuation-00-context.png`
- Fresh Step 06 context artifact byte size: `91167`
- Fresh Step 06 context artifact SHA-256:
  `a5e057d87c9193221d40e30855d52901e07eb630613db1afb8d9cb9f6a6f7d9a`
- Step 06 (`M02`) PASS artifact filename:
  `novora-fp-phase-a-resume-06-m02.csv`
- Step 06 (`M02`) PASS artifact byte size: `186`
- Step 06 (`M02`) PASS artifact SHA-256:
  `2bb7414ac2388bbf56c16ad329a3bdc094400b608d61609d937f8efb2dca2b40`
- Frozen Resume Packet path:
  `docs/novora-first-preview-phase-a-resume-packet-v1.md`
- Frozen Resume Packet Git blob:
  `98e6b4a70fba66e317b57fd6f6bfc1bb3274bc85`
- Frozen original Phase A MANUAL source path:
  `docs/novora-first-preview-schema-phase-a-owner-manual-execution-sequence-v1.md`
- Frozen original Phase A MANUAL source Git blob:
  `1d7ee46755254e6c01ac125793ecbd9bf3451204`

The final Step 06 supplement selects exactly two PASS artifacts and zero error
artifacts. The context PNG, M02 CSV, and supplement identities remained
unchanged between the independent reviewer's start and end hashes. The CSV has
the exact five headers, four complete rows in the required order, zero full-row
duplicates, zero duplicate role identities, and the exact frozen catalog
attributes for `anon`, `authenticated`, `postgres`, and `service_role`.
`actual_canonical_sql_sha256` and `canonical_hash_equality` correctly remain
null because the CSV does not independently prove the SQL Editor input bytes.
Phase A Resume and Phase A remain STOPPED; Steps 07-68 remain `not_run`.

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

Before the visual context gate, confirm a fresh quiet window with no role
creation or deletion, role-membership or admin-option change, membership grant
or revoke, ownership or schema operation, migration, application rollout, or
other actor changing the access posture of `anon`, `authenticated`,
`service_role`, `postgres`, `authenticator`, `supabase_admin`,
`pg_create_subscription`, `pg_monitor`, `pg_read_all_data`,
`pg_signal_backend`, or `supabase_privileged_role`. The quiet window must remain
active through Step 07 evidence capture. STOP before the context gate if it
cannot be confirmed.

### Context-proof boundary

The fresh visual gate independently re-proves only the visible project,
`main` / Production environment, Primary Database selection, selected current
role `postgres`, row limit, and blank editor. The quiet-window status is
Owner-attested and is not independently proved by the visual artifact or by the
database query.

The accepted R01 CSV remains the last SQL evidence for
`current_schema = public`, `session_role = postgres`, and
`server_is_in_recovery = false`. The exact M03 statement returns catalog
role-membership attributes, but neither the new visual gate nor M03 re-proves
the session's current schema, session role, or recovery state. The Owner must
attest that no visible project, environment, database, role, or target control
changed after accepted Step 06 evidence and before Step 07. This attestation
does not prove reuse of one database backend session.

Any future exact approval must explicitly accept this bounded reliance for the
single SELECT-only role-membership query. If the Owner does not accept it, or
requires fresh SQL proof of session role or recovery state, STOP: this
Step-07-only packet cannot provide that proof, and a separately reviewed and
approved context-preflight packet is required. Do not add an ad hoc context
query.

## 4. Canonical SQL and frozen-source rule

Resume Step 07 is incorporated from frozen Resume Packet Git blob
`98e6b4a70fba66e317b57fd6f6bfc1bb3274bc85`, sequence-table Step `07`, label
`M03`, and only from MANUAL source Git blob
`1d7ee46755254e6c01ac125793ecbd9bf3451204`, repository path
`docs/novora-first-preview-schema-phase-a-owner-manual-execution-sequence-v1.md`,
heading label `06 - M03`, and exact full Markdown heading `### 06 - M03`.

The only executable SQL is the complete fenced `sql` block under that exact
source heading.

Canonicalize the complete statement by normalizing CRLF/CR to LF; trimming
leading and trailing statement whitespace; requiring and removing exactly one
terminal semicolon; trimming the remaining body; then appending exactly one
semicolon and one LF. Hash those UTF-8 bytes without a BOM.

Required Step 07 (`M03`) canonical SHA-256:

`fdc2eecd481f69deb262eb35390495ed90a383a7d208131909b2c9566b8dd74c`

The independently recomputed canonical byte length is `581`.

Do not add comments, combine statements, add a transaction wrapper, edit
identifiers, substitute SQL, or execute if the complete Resume/MANUAL blob,
sequence row, heading, SQL block, byte length, or canonical hash does not match.

For Owner convenience, the exact incorporated Step 07 (`M03`) SQL is reproduced
below. The Git blobs, sequence row, and heading above remain authoritative.

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

## 5. Exact expected result and privacy boundary

PASS requires one complete, untruncated CSV with exactly these four headers in
this order:

1. `granted_role`
2. `member_role`
3. `grantor_role`
4. `admin_option`

It must contain exactly these 12 rows in this order:

| granted_role | member_role | grantor_role | admin_option |
| --- | --- | --- | --- |
| `anon` | `authenticator` | `supabase_admin` | `false` |
| `anon` | `postgres` | `supabase_admin` | `true` |
| `authenticated` | `authenticator` | `supabase_admin` | `false` |
| `authenticated` | `postgres` | `supabase_admin` | `true` |
| `authenticator` | `postgres` | `supabase_admin` | `true` |
| `pg_create_subscription` | `postgres` | `supabase_admin` | `true` |
| `pg_monitor` | `postgres` | `supabase_admin` | `true` |
| `pg_read_all_data` | `postgres` | `supabase_admin` | `true` |
| `pg_signal_backend` | `postgres` | `supabase_admin` | `true` |
| `service_role` | `authenticator` | `supabase_admin` | `false` |
| `service_role` | `postgres` | `supabase_admin` | `true` |
| `supabase_privileged_role` | `postgres` | `supabase_admin` | `false` |

Duplicate complete rows and duplicate
`(granted_role, member_role, grantor_role, admin_option)` tuples must both be
zero. Missing, duplicate, additional, null, malformed, differently valued, or
truncated results are a STOP. Any membership outside this exact frozen baseline
or any unreviewed inherited privilege path is a STOP.

The statement returns approved database role names and their membership catalog
attributes only. It must not return, inspect, export, or record any application
user, auth-user row, business-row value, business-row identity, customer value,
customer identity, brief reference, prompt, note, object path, URL, image,
secret, token, key, environment value, or Provider data. The approved database
role names are catalog identities, not customer or application-user identities.
The membership result does not authorize a role, membership, privilege,
ownership, schema, policy, or row change.

## 6. Exact manual sequence and evidence

### Step 00 - fresh visual context gate

Open a fresh blank SQL Editor and visibly verify the exact project,
branch/environment, Primary Database, selected role `postgres`, and row limit of
at least `1000`. The editor and result pane must not display unrelated SQL,
history, stale results, customer content, secrets, or environment-variable
values.

Before capture, the Owner must attest that the fresh quiet window is active,
that no visible target control changed after accepted Step 06 evidence, and that
the context-proof boundary's explicitly limited proof basis is accepted. STOP
if any statement cannot be made exactly.

On PASS, capture exactly:

`novora-fp-phase-a-resume-step-07-m03-continuation-00-context.png`

On any mismatch, missing control, stale content, warning, or incomplete visual
evidence, capture exactly:

`novora-fp-phase-a-resume-step-07-m03-continuation-00-context-error.png`

Then record Resume Step 07 as `not_run` and STOP. Select exactly one mutually
exclusive context artifact.

### Step 01 - exact frozen Resume Step 07 (`M03`)

Only after Step 00 passes, paste the complete authoritative statement into the
fresh blank editor, verify its canonical hash and byte length, and execute it
exactly once with the ordinary manual `Run` action.

On PASS, export the complete result with headers exactly as:

`novora-fp-phase-a-resume-07-m03.csv`

On any warning, SQL error, unexpected zero-row result, missing or truncated
result, membership mismatch, transport or fetch failure, or export failure,
capture exactly:

`novora-fp-phase-a-resume-07-m03-error.png`

Select exactly one mutually exclusive Step 07 result artifact. Whether Step 07
passes or fails, STOP. Do not retry and do not execute Resume Step 08.

## 7. Post-attempt reconciliation contract

The next read-only reconciliation must create the sanitized external supplement:

`novora-fp-phase-a-resume-step-07-m03-continuation-08-manifest-v1.json`

It must bind the exact approval, post-merge packet, reviewed PR head, MANUAL
source, Resume Packet, completed Step 06 supplement, canonical hash, and
selected-artifact identities; record the fresh quiet-window confirmation as
Owner-attested and not independently database-verified; record the
context-proof boundary and values not freshly re-proven; list exactly one
selected context artifact and, only if Step 07 was attempted, exactly one
selected result artifact; record actual bytes, SHA-256 values, exact four
headers, row and duplicate counts, exact sanitized 12-row result, expected
canonical hash, nullable actual canonical hash and equality with exact proof
basis, and PASS/ERROR/`not_run`; preserve Phase A Resume and Phase A as STOPPED;
mark Steps 08-68 `not_run`; and record every exclusion.

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
membership, grantor, admin option, completeness, truncation, filename, warning,
SQL error, transport/fetch error, export error, or expected-result mismatch.

After a STOP, do not click a generic `Retry` control, rerun Step 07, change SQL,
inspect rows, repair, compensate, roll back, clean up, or continue.

## 9. Explicit exclusions

This packet does not authorize:

- Codex, MCP, CLI, script, or other automated Supabase connection or SQL
  execution;
- execution without a separate exact Owner approval tied to the post-merge
  `origin/main`, exact reviewed PR head, this packet's Git blob, the completed
  Step 06 supplement SHA-256, Resume Packet blob, MANUAL source blob, Step 07
  label, and M03 canonical SHA-256, while explicitly accepting the context-proof
  boundary;
- more than one manual Step 07 attempt or any retry;
- R01, R02, R04, C03, M01, M02, Resume Step 08, or any later Resume statement;
- `23.1-S01` or `23.2-S01` retry;
- candidate DDL, block 23.7, constraint validation, replacement or ad hoc SQL;
- DML, repair, compensation, backfill, data edits, DELETE, rollback, or cleanup;
- ACL, default-privilege, role, membership, grant, ownership, RLS, policy,
  trigger, function, or Storage changes;
- application-user, auth-user, customer, or business-row inspection;
- Provider/generated-asset actions, environment changes, deployment,
  application rollout, email, payment, or customer-visible behavior; or
- branch, worktree, or evidence deletion.

Phase A Resume and Phase A remain **STOPPED** after Step 07 pending independent
evidence reconciliation and a separately reviewed continuation decision.

## 10. Copy-ready separate Owner approval sentence template

Replace every angle-bracket placeholder only after the documentation PR is
independently reviewed, unchanged at its reviewed head, merged, and the packet
Git blob plus post-merge `origin/main` are independently recomputed. Do not use
this template before then.

> APPROVE NOVORA FIRST PREVIEW PHASE A RESUME STEP 07 (`M03`) CONTINUATION PACKET v1, and only that packet, for one Owner-performed manual SELECT-only attempt against Supabase project `novora-production`, `main` / Production, Primary Database (`postgres`), target schema `public`, selected current role and session role `postgres`, and SQL Editor row limit at least `1000`, using merged `origin/main` commit `<POST_MERGE_ORIGIN_MAIN_COMMIT>`, PR #`<PR_NUMBER>` reviewed head `<REVIEWED_PR_HEAD>`, continuation packet `docs/novora-first-preview-phase-a-step-07-m03-continuation-packet-v1.md` Git blob `<PACKET_GIT_BLOB>`, completed Step 06 supplement `novora-fp-phase-a-resume-step-06-m02-continuation-07-manifest-v1.json` SHA-256 `3fbf130c64f0f2a1089adddb88aa8123bd40f3d40ba0e784f48493941eed35a1`, frozen Resume Packet Git blob `98e6b4a70fba66e317b57fd6f6bfc1bb3274bc85`, frozen MANUAL source Git blob `1d7ee46755254e6c01ac125793ecbd9bf3451204`, sequence Step `07`, label `M03`, source heading label `06 - M03`, exact full Markdown heading `### 06 - M03`, canonical byte length `581`, and canonical SHA-256 `fdc2eecd481f69deb262eb35390495ed90a383a7d208131909b2c9566b8dd74c`; I explicitly accept the packet's bounded context-proof basis, Owner-attested quiet window, and no-visible-target-control-change statement; approval is limited to one fresh visual context capture and, only after that gate passes, one ordinary-Run execution of the exact frozen M03 statement with PASS evidence `novora-fp-phase-a-resume-07-m03.csv` or ERROR evidence `novora-fp-phase-a-resume-07-m03-error.png`; PASS requires exactly 12 complete ordered role-membership rows with zero full-row or tuple duplicates and the exact frozen Stage A membership baseline, with no application-user, auth-user, business-row, or customer value or identity; whether Step 07 passes or fails, all SQL must STOP for independent evidence reconciliation and no Step 08 or later action is authorized.
