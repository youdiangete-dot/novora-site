# NOVORA First Preview Phase A Resume Step 06 - M02 Continuation Packet v1

Date: 2026-07-17

Status: **FROZEN FOR SEPARATE OWNER APPROVAL - NOT EXECUTED**

## 1. Decision and exact scope

The separately approved Resume Step 05 (`M01`) produced complete PASS evidence.
The exact external context PNG and ownership CSV, the sanitized external
supplement, and a separate independent read-only review all passed without an
identity, completeness, duplicate, privacy, or evidence-contract mismatch.
That evidence permits preparation of this packet; it does not authorize another
query.

The exact next item in the frozen 68-step Resume Packet is **Step 06, label
`M02`**. If separately approved with every immutable identity in this packet,
the only SQL this packet may release is one Owner-performed manual execution of
the exact frozen SELECT-only Step 06 (`M02`). A fresh visual context gate and
fresh quiet window are mandatory before the statement. Whether the statement
passes or fails, all SQL stops for independent evidence reconciliation. Resume
Steps 07-68 remain prohibited.

Merging this packet does not authorize execution.

## 2. Verified evidence and immutable identities

- Step 05 Continuation Packet post-merge `origin/main` and this packet's
  preparation base: `7800d8affb1480fb4d4a9e51c04ee4fa97142575`
- Step 05 Continuation Packet PR #218 reviewed head:
  `1ae5f66f4c3ef687202a7de3bc0e3100aca0dadd`
- Step 05 Continuation Packet Git blob:
  `4c6bbd66d5c41c253ff4cf806fc71fd55d8642c6`
- Completed Step 05 continuation supplement filename:
  `novora-fp-phase-a-resume-step-05-m01-continuation-06-manifest-v1.json`
- Completed Step 05 continuation supplement byte size: `10687`
- Completed Step 05 continuation supplement SHA-256:
  `86cedd25177a5e5a0797f8f290c615c20530fa0a23376243d539896b6d6ae68e`
- Fresh Step 05 context artifact filename:
  `novora-fp-phase-a-resume-step-05-m01-continuation-00-context.png`
- Fresh Step 05 context artifact byte size: `91657`
- Fresh Step 05 context artifact SHA-256:
  `ca74318d260a1b6edb4d6ff16854cbec70587b8033b1927cc57e95abdd0b348c`
- Step 05 (`M01`) PASS artifact filename:
  `novora-fp-phase-a-resume-05-m01.csv`
- Step 05 (`M01`) PASS artifact byte size: `246`
- Step 05 (`M01`) PASS artifact SHA-256:
  `7fa29da59e354086f823335a2bdca24dff654700638867f5f3e19c8ba7f311eb`
- Frozen Resume Packet path:
  `docs/novora-first-preview-phase-a-resume-packet-v1.md`
- Frozen Resume Packet Git blob:
  `98e6b4a70fba66e317b57fd6f6bfc1bb3274bc85`
- Frozen original Phase A MANUAL source path:
  `docs/novora-first-preview-schema-phase-a-owner-manual-execution-sequence-v1.md`
- Frozen original Phase A MANUAL source Git blob:
  `1d7ee46755254e6c01ac125793ecbd9bf3451204`

The final Step 05 supplement selects exactly two PASS artifacts and zero error
artifacts. The context PNG, M01 CSV, and supplement identities remained
unchanged between the independent reviewer's start and end hashes. The CSV has
the exact three headers, six complete rows in the required order, zero full-row
duplicates, zero duplicate table identities, schema `public` on every row, and
owner `postgres` on every approved table. `actual_canonical_sql_sha256` and
`canonical_hash_equality` correctly remain null because the CSV does not
independently prove the SQL Editor input bytes. Phase A Resume and Phase A
remain STOPPED; Steps 06-68 remain `not_run`.

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
attribute alteration, membership/grant/default-privilege change, ownership or
schema operation, migration, application rollout, or other actor changing the
access posture of `anon`, `authenticated`, `postgres`, or `service_role`. The
quiet window must remain active through Step 06 evidence capture. STOP before
the context gate if it cannot be confirmed.

### Context-proof boundary

The fresh visual gate independently re-proves only the visible project,
`main` / Production environment, Primary Database selection, selected current
role `postgres`, row limit, and blank editor. The quiet-window status is
Owner-attested and is not independently proved by the visual artifact or by the
database query.

The accepted R01 CSV remains the last SQL evidence for
`current_schema = public`, `session_role = postgres`, and
`server_is_in_recovery = false`. The exact M02 statement returns catalog
attributes for four named roles, but neither the new visual gate nor M02
re-proves the session's current schema, session role, or recovery state. The
Owner must attest that no visible project, environment, database, role, or
target control changed after accepted Step 05 evidence and before Step 06. This
attestation does not prove reuse of one database backend session.

Any future exact approval must explicitly accept this bounded reliance for the
single SELECT-only role-attribute query. If the Owner does not accept it, or
requires fresh SQL proof of session role or recovery state, STOP: this
Step-06-only packet cannot provide that proof, and a separately reviewed and
approved context-preflight packet is required. Do not add an ad hoc context
query.

## 4. Canonical SQL and frozen-source rule

Resume Step 06 is incorporated from frozen Resume Packet Git blob
`98e6b4a70fba66e317b57fd6f6bfc1bb3274bc85`, sequence-table Step `06`, label
`M02`, and only from MANUAL source Git blob
`1d7ee46755254e6c01ac125793ecbd9bf3451204`, repository path
`docs/novora-first-preview-schema-phase-a-owner-manual-execution-sequence-v1.md`,
heading label `05 - M02`, and exact full Markdown heading `### 05 - M02`.

The only executable SQL is the complete fenced `sql` block under that exact
source heading.

Canonicalize the complete statement by normalizing CRLF/CR to LF; trimming
leading and trailing statement whitespace; requiring and removing exactly one
terminal semicolon; trimming the remaining body; then appending exactly one
semicolon and one LF. Hash those UTF-8 bytes without a BOM.

Required Step 06 (`M02`) canonical SHA-256:

`70eebd62612586e6e76338a1e9c75268d01021f6e8e2ba20e37a44d15aa9a010`

The independently recomputed canonical byte length is `188`.

Do not add comments, combine statements, add a transaction wrapper, edit
identifiers, substitute SQL, or execute if the complete Resume/MANUAL blob,
sequence row, heading, SQL block, byte length, or canonical hash does not match.

For Owner convenience, the exact incorporated Step 06 (`M02`) SQL is reproduced
below. The Git blobs, sequence row, and heading above remain authoritative.

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

## 5. Exact expected result and privacy boundary

PASS requires one complete, untruncated CSV with exactly these five headers in
this order:

1. `rolname`
2. `rolsuper`
3. `rolinherit`
4. `rolcanlogin`
5. `rolbypassrls`

It must contain exactly these four rows in `rolname` order:

| rolname | rolsuper | rolinherit | rolcanlogin | rolbypassrls |
| --- | --- | --- | --- | --- |
| `anon` | `false` | `true` | `false` | `false` |
| `authenticated` | `false` | `true` | `false` | `false` |
| `postgres` | `false` | `true` | `true` | `true` |
| `service_role` | `false` | `true` | `false` | `true` |

Duplicate complete rows and duplicate `rolname` identities must both be zero.
Missing, duplicate, additional, null, malformed, differently valued, or
truncated results are a STOP.

The statement returns four approved database role names and their catalog role
attributes only. It must not return, inspect, export, or record any application
user, auth-user row, business-row value, business-row identity, customer value,
customer identity, brief reference, prompt, note, object path, URL, image,
secret, token, key, environment value, or Provider data. The approved database
role names are catalog identities, not customer or application-user identities.
The role-attribute result does not authorize role, membership, privilege,
ownership, schema, policy, or row changes.

## 6. Exact manual sequence and evidence

### Step 00 - fresh visual context gate

Open a fresh blank SQL Editor and visibly verify the exact project,
branch/environment, Primary Database, selected role `postgres`, and row limit of
at least `1000`. The editor and result pane must not display unrelated SQL,
history, stale results, customer content, secrets, or environment-variable
values.

Before capture, the Owner must attest that the fresh quiet window is active,
that no visible target control changed after accepted Step 05 evidence, and that
the context-proof boundary's explicitly limited proof basis is accepted. STOP
if any statement cannot be made exactly.

On PASS, capture exactly:

`novora-fp-phase-a-resume-step-06-m02-continuation-00-context.png`

On any mismatch, missing control, stale content, warning, or incomplete visual
evidence, capture exactly:

`novora-fp-phase-a-resume-step-06-m02-continuation-00-context-error.png`

Then record Resume Step 06 as `not_run` and STOP. Select exactly one mutually
exclusive context artifact.

### Step 01 - exact frozen Resume Step 06 (`M02`)

Only after Step 00 passes, paste the complete authoritative statement into the
fresh blank editor, verify its canonical hash and byte length, and execute it
exactly once with the ordinary manual `Run` action.

On PASS, export the complete result with headers exactly as:

`novora-fp-phase-a-resume-06-m02.csv`

On any warning, SQL error, unexpected zero-row result, missing or truncated
result, role/attribute mismatch, transport or fetch failure, or export failure,
capture exactly:

`novora-fp-phase-a-resume-06-m02-error.png`

Select exactly one mutually exclusive Step 06 result artifact. Whether Step 06
passes or fails, STOP. Do not retry and do not execute Resume Step 07.

## 7. Post-attempt reconciliation contract

The next read-only reconciliation must create the sanitized external supplement:

`novora-fp-phase-a-resume-step-06-m02-continuation-07-manifest-v1.json`

It must bind the exact approval, post-merge packet, reviewed PR head, MANUAL
source, Resume Packet, completed Step 05 supplement, canonical hash, and
selected-artifact identities; record the fresh quiet-window confirmation as
Owner-attested and not independently database-verified; record the
context-proof boundary and values not freshly re-proven; list exactly one
selected context artifact and, only if Step 06 was attempted, exactly one
selected result artifact; record actual bytes, SHA-256 values, exact five
headers, row and duplicate counts, exact sanitized four-row result, expected
canonical hash, nullable actual canonical hash and equality with exact proof
basis, and PASS/ERROR/`not_run`; preserve Phase A Resume and Phase A as STOPPED;
mark Steps 07-68 `not_run`; and record every exclusion.

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
attribute, completeness, truncation, filename, warning, SQL error,
transport/fetch error, export error, or expected-result mismatch.

After a STOP, do not click a generic `Retry` control, rerun Step 06, change SQL,
inspect rows, repair, compensate, roll back, clean up, or continue.

## 9. Explicit exclusions

This packet does not authorize:

- Codex, MCP, CLI, script, or other automated Supabase connection or SQL
  execution;
- execution without a separate exact Owner approval tied to the post-merge
  `origin/main`, exact reviewed PR head, this packet's Git blob, the completed
  Step 05 supplement SHA-256, Resume Packet blob, MANUAL source blob, Step 06
  label, and M02 canonical SHA-256, while explicitly accepting the context-proof
  boundary;
- more than one manual Step 06 attempt or any retry;
- R01, R02, R04, C03, M01, Resume Step 07, or any later Resume statement;
- `23.1-S01` or `23.2-S01` retry;
- candidate DDL, block 23.7, constraint validation, replacement or ad hoc SQL;
- DML, repair, compensation, backfill, data edits, DELETE, rollback, or cleanup;
- ACL, default-privilege, role, membership, grant, ownership, RLS, policy,
  trigger, function, or Storage changes;
- application-user, auth-user, customer, or business-row inspection;
- Provider/generated-asset actions, environment changes, deployment,
  application rollout, email, payment, or customer-visible behavior; or
- branch, worktree, or evidence deletion.

Phase A Resume and Phase A remain **STOPPED** after Step 06 pending independent
evidence reconciliation and a separately reviewed continuation decision.

## 10. Copy-ready separate Owner approval sentence template

Replace every angle-bracket placeholder only after the documentation PR is
independently reviewed, unchanged at its reviewed head, merged, and the packet
Git blob plus post-merge `origin/main` are independently recomputed. Do not use
this template before then.

> APPROVE NOVORA FIRST PREVIEW PHASE A RESUME STEP 06 (`M02`) CONTINUATION PACKET v1, and only that packet, for one Owner-performed manual SELECT-only attempt against Supabase project `novora-production`, `main` / Production, Primary Database (`postgres`), target schema `public`, selected current role and session role `postgres`, and SQL Editor row limit at least `1000`, using merged `origin/main` commit `<POST_MERGE_ORIGIN_MAIN_COMMIT>`, PR #`<PR_NUMBER>` reviewed head `<REVIEWED_PR_HEAD>`, continuation packet `docs/novora-first-preview-phase-a-step-06-m02-continuation-packet-v1.md` Git blob `<PACKET_GIT_BLOB>`, completed Step 05 supplement `novora-fp-phase-a-resume-step-05-m01-continuation-06-manifest-v1.json` SHA-256 `86cedd25177a5e5a0797f8f290c615c20530fa0a23376243d539896b6d6ae68e`, frozen Resume Packet Git blob `98e6b4a70fba66e317b57fd6f6bfc1bb3274bc85`, frozen MANUAL source Git blob `1d7ee46755254e6c01ac125793ecbd9bf3451204`, sequence Step `06`, label `M02`, source heading label `05 - M02`, exact full Markdown heading `### 05 - M02`, canonical byte length `188`, and canonical SHA-256 `70eebd62612586e6e76338a1e9c75268d01021f6e8e2ba20e37a44d15aa9a010`; I explicitly accept the packet's bounded context-proof basis, Owner-attested quiet window, and no-visible-target-control-change statement; approval is limited to one fresh visual context capture and, only after that gate passes, one ordinary-Run execution of the exact frozen M02 statement with PASS evidence `novora-fp-phase-a-resume-06-m02.csv` or ERROR evidence `novora-fp-phase-a-resume-06-m02-error.png`; PASS requires exactly four complete role-attribute rows with zero duplicates and the exact frozen attributes for `anon`, `authenticated`, `postgres`, and `service_role`, with no application-user, auth-user, business-row, or customer value or identity; whether Step 06 passes or fails, all SQL must STOP for independent evidence reconciliation and no Step 07 or later action is authorized.
