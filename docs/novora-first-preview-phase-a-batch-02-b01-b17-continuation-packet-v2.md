# NOVORA First Preview Phase A Resume Batch 02 - B01-B17 Continuation Packet v2

Date: 2026-07-17

Status: **FROZEN FOR SEPARATE OWNER APPROVAL - NOT EXECUTED**

## 1. Decision and exact scope

Phase A Resume Batch 01 completed with independently reconciled PASS evidence.
Resume Steps 08/M04, 09/M05, and 10/M06 are PASS. The external combined
manifest
`novora-fp-phase-a-resume-batch-01-m04-m06-11-manifest-v2.json` is `23043`
bytes with SHA-256
`f04d60c5f1e86def72a9a5b6cef56788fd1668a9dc7475a81678cffeab88feef`.
Its independent review found no identity, context, header, row, duplicate,
result, privacy, manifest, or stability mismatch.

This packet covers only Batch 02, in this exact order:

1. Resume Step 11 / `B01`;
2. Resume Step 12 / `B02`;
3. Resume Step 13 / `B03`;
4. Resume Step 14 / `B04`;
5. Resume Step 15 / `B05`;
6. Resume Step 16 / `B06`;
7. Resume Step 17 / `B07`;
8. Resume Step 18 / `B15`; and
9. Resume Step 19 / `B17`.

All nine statements are SELECT-only aggregate or bounded system-status
verification statements. If separately approved with every exact post-merge
identity, the Owner may execute each statement manually and individually once,
in order. Each statement and its selected evidence must pass before the next
statement is released. Whether Batch 02 completes or stops, Resume Step 20 and
all later statements remain prohibited.

Merging this packet authorizes no SQL.

## 2. Immutable evidence and source identities

- Batch 01 approved and packet post-merge `origin/main`:
  `6e7d5174c8dee0daa9670956ea50f28cf52f9da4`
- Batch 01 packet PR: #222
- Batch 01 packet reviewed head:
  `cb4f9aa6c38d1235e2289c74393a81568e9040a2`
- Accelerated Batch Resume Plan v2 path:
  `docs/novora-first-preview-phase-a-accelerated-batch-resume-plan-v2.md`
- Accelerated-plan Git blob:
  `64f5e128ba0e4de0d59e7357d788e4c159f6bb4c`
- Batch 01 packet path:
  `docs/novora-first-preview-phase-a-batch-01-m04-m06-continuation-packet-v2.md`
- Batch 01 packet Git blob:
  `54ed421fbae7347266b9e06a0f6559c7ec4645f5`
- Completed Batch 01 combined manifest filename:
  `novora-fp-phase-a-resume-batch-01-m04-m06-11-manifest-v2.json`
- Completed Batch 01 combined manifest byte size: `23043`
- Completed Batch 01 combined manifest SHA-256:
  `f04d60c5f1e86def72a9a5b6cef56788fd1668a9dc7475a81678cffeab88feef`
- Frozen Resume Packet path:
  `docs/novora-first-preview-phase-a-resume-packet-v1.md`
- Frozen Resume Packet Git blob:
  `98e6b4a70fba66e317b57fd6f6bfc1bb3274bc85`
- Frozen MANUAL source path:
  `docs/novora-first-preview-schema-phase-a-owner-manual-execution-sequence-v1.md`
- Frozen MANUAL source Git blob:
  `1d7ee46755254e6c01ac125793ecbd9bf3451204`

The only executable SQL is the complete fenced `sql` block under the exact
MANUAL heading identified below. The statements reproduced in this packet were
independently extracted byte-for-byte from that MANUAL blob. A rendered file,
copied note, editor history, or earlier result is not authoritative.

Canonicalize each complete statement by normalizing CRLF/CR to LF; trimming
leading and trailing statement whitespace; requiring and removing exactly one
terminal semicolon; trimming the remaining body; then appending exactly one
semicolon and one LF. Hash those UTF-8 bytes without a BOM.

| Step | Label | MANUAL heading | Canonical bytes | Canonical SHA-256 | Ordinary PASS | Zero-row PASS, when allowed | ERROR |
| ---: | --- | --- | ---: | --- | --- | --- | --- |
| 11 | `B01` | label `10 - B01`; full `### 10 - B01` | `97` | `9cf2f8365954544726d01f562d06115ec373768fa30d598d384954f2465eed4f` | `novora-fp-phase-a-resume-11-b01.csv` | `novora-fp-phase-a-resume-11-b01-zero.png` | `novora-fp-phase-a-resume-11-b01-error.png` |
| 12 | `B02` | label `11 - B02`; full `### 11 - B02` | `124` | `4ac61e3c8d2c1b6a75fbbaf1ddfe5241778f654134705dcc1c332be66dfd75d6` | `novora-fp-phase-a-resume-12-b02.csv` | `novora-fp-phase-a-resume-12-b02-zero.png` | `novora-fp-phase-a-resume-12-b02-error.png` |
| 13 | `B03` | label `12 - B03`; full `### 12 - B03` | `224` | `33218418b894c3479d3d3e20f0a7caa610a3863cecfb2b02770d4ad6bb1446f5` | `novora-fp-phase-a-resume-13-b03.csv` | not allowed | `novora-fp-phase-a-resume-13-b03-error.png` |
| 14 | `B04` | label `13 - B04`; full `### 13 - B04` | `213` | `a1a8a358f6d2779947a5e13ce15c85181b88e0840825dce356698d9bb7b73e1c` | `novora-fp-phase-a-resume-14-b04.csv` | `novora-fp-phase-a-resume-14-b04-zero.png` | `novora-fp-phase-a-resume-14-b04-error.png` |
| 15 | `B05` | label `14 - B05`; full `### 14 - B05` | `232` | `2a456c2671be654cc4aee18bd03d8e0102e1d94ec0d5c8bd9348fd40f6a1feb3` | `novora-fp-phase-a-resume-15-b05.csv` | `novora-fp-phase-a-resume-15-b05-zero.png` | `novora-fp-phase-a-resume-15-b05-error.png` |
| 16 | `B06` | label `15 - B06`; full `### 15 - B06` | `781` | `56277764a42962df29d8dc151cf34da723d9454c6833490ef271cb8625841c88` | `novora-fp-phase-a-resume-16-b06.csv` | not allowed | `novora-fp-phase-a-resume-16-b06-error.png` |
| 17 | `B07` | label `16 - B07`; full `### 16 - B07` | `267` | `0359f22286e7a294d6ac01d47bf140bf1da3297765c44c943fc37274f9f66ea7` | `novora-fp-phase-a-resume-17-b07.csv` | not allowed | `novora-fp-phase-a-resume-17-b07-error.png` |
| 18 | `B15` | label `17 - B15`; full `### 17 - B15` | `170` | `9c3e4473238a83b0ca10bceb699029eb89a52d7ef43df34ea6838343d3e44701` | `novora-fp-phase-a-resume-18-b15.csv` | not allowed | `novora-fp-phase-a-resume-18-b15-error.png` |
| 19 | `B17` | label `18 - B17`; full `### 18 - B17` | `220` | `60227942aa9689ff9b8e5c90a6dcfc896d755419846eefbd31b47be92b7c3ce6` | `novora-fp-phase-a-resume-19-b17.csv` | `novora-fp-phase-a-resume-19-b17-zero.png` | `novora-fp-phase-a-resume-19-b17-error.png` |

STOP before execution if any blob, path, sequence row, heading, SQL block,
canonical byte length, canonical hash, or evidence filename cannot be verified
exactly.

## 3. Exact target, context boundary, and quiet window

If separately approved, Owner execution is limited to:

- Supabase project: `novora-production`
- Branch/environment: `main` / Production
- Database: Primary Database (`postgres`)
- Target schema: `public`
- Selected current role and session role: `postgres`
- SQL Editor row limit: at least `1000`

Before context capture, establish a fresh uninterrupted quiet window with no
First Preview writer, data edit, migration, schema operation, access-control
change, application rollout, or other actor changing `ai_sketch_jobs`,
`ai_sketch_outputs`, or `ai_sketch_reviews`. It must remain active through B17
evidence capture.

Open a fresh blank SQL Editor. The visual context gate independently proves only
the visible project, `main` / Production environment, Primary Database
selection, selected current role `postgres`, row limit, and blank editor/result
pane. It does not freshly prove `current_schema = public`,
`session_role = postgres`, `server_is_in_recovery = false`, reuse of one database
backend session, or quiet-window truth. Those session values retain bounded
reliance on the accepted fresh R01 PASS evidence. Quiet-window truth and the
no-visible-target-control-change statement remain Owner-attested.

The same context may support all nine statements only while the quiet window
and every visible target control remain unchanged and there is no refresh,
reconnection, context drift, warning, SQL error, transport/fetch failure, or
export failure. Any such event is an immediate Batch 02 STOP; do not capture a
replacement context under the same approval.

On context PASS, capture exactly:

`novora-fp-phase-a-resume-batch-02-b01-b17-00-context.png`

On context ERROR, capture exactly:

`novora-fp-phase-a-resume-batch-02-b01-b17-00-context-error.png`

If context fails, mark Steps 11-19 `not_run` and STOP.

## 4. Manual execution and universal evidence rule

Execute every statement manually and individually with exactly one ordinary
`Run` action. Do not add comments, combine statements, add a transaction
wrapper, change identifiers, substitute SQL, or use a generic Retry control.

For an ordinary PASS, export the complete untruncated result with headers to the
exact CSV filename in section 2. A zero-row result is valid only for B01, B02,
B04, B05, or B17. For an allowed zero-row PASS, capture the exact `-zero.png`
artifact showing the complete frozen statement, unchanged target controls,
complete headers/zero-row result, and no warning or error. Never create both the
CSV and zero-row screenshot for one step.

For any unexpected zero-row result, missing or truncated result, warning, SQL
error, transport/fetch failure, export failure, or expected-result mismatch,
capture only the exact `-error.png` artifact, then STOP. Select exactly one
mutually exclusive result artifact for each attempted step and no placeholder
for a `not_run` step.

## 5. Step 11 / B01 - current job-status counts

```sql
SELECT status, count(*) AS row_count
FROM public.ai_sketch_jobs
GROUP BY status
ORDER BY status;
```

Exact headers: `status`, `row_count`.

PASS requires a complete ordered status distribution with zero duplicate
status identities. Every `row_count` must be a positive integer. Every returned
status must be exactly one of `draft`, `queued`, `processing`, `succeeded`,
`failed`, `timed_out`, or `cancelled`; only `draft` may represent staged legacy
state. A blank, null, unknown, ambiguous, additional, malformed, duplicate, or
unreviewable status is a STOP. Zero rows is a valid empty-table PASS only under
the zero-row evidence rule.

Only after B01 PASS evidence is captured may the Owner execute B02.

## 6. Step 12 / B02 - current output preview-status counts

```sql
SELECT preview_status, count(*) AS row_count
FROM public.ai_sketch_outputs
GROUP BY preview_status
ORDER BY preview_status;
```

Exact headers: `preview_status`, `row_count`.

PASS requires a complete ordered preview-status distribution with zero
duplicate identities and positive integer counts. Every returned value and its
repository meaning must be explicitly understood. `pending_review` is the
historical default and must not be interpreted as automatic First Preview
readiness. Blank, null, unknown, ambiguous, malformed, duplicate, or
unreviewable semantics are a STOP. Zero rows is a valid empty-table PASS only
under the zero-row evidence rule.

Only after B02 PASS evidence is captured may the Owner execute B03.

## 7. Step 13 / B03 - object-path presence aggregate

```sql
SELECT
  count(*) FILTER (WHERE object_path IS NULL) AS null_object_path_count,
  count(*) FILTER (WHERE object_path IS NOT NULL) AS nonnull_object_path_count,
  count(*) AS total_output_count
FROM public.ai_sketch_outputs;
```

Exact headers: `null_object_path_count`, `nonnull_object_path_count`,
`total_output_count`.

PASS requires exactly one complete scalar aggregate row. Every value must be a
nonnegative integer and
`null_object_path_count + nonnull_object_path_count = total_output_count`.
This aggregate never proves that an asset exists, is valid, is private, passes
automatic gates, or is ready. Zero rows is a STOP; an empty output table still
returns one aggregate row with three zero counts.

Only after B03 PASS evidence is captured may the Owner execute B04.

## 8. Step 14 / B04 - output-per-job distribution

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

Exact headers: `output_count`, `job_count`.

PASS requires the complete ordered distribution, unique `output_count`
identities, positive integer counts, and no row with `output_count > 1`. The
statement returns no job identity. Zero rows is a valid empty-table PASS only
under the zero-row evidence rule.

Only after B04 PASS evidence is captured may the Owner execute B05.

## 9. Step 15 / B05 - job-per-brief distribution

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

Exact headers: `job_count`, `concept_brief_count`.

PASS requires a complete ordered distribution, unique `job_count` identities,
and positive integer counts. Every density must be understood and remain
compatible with the approved bounded-attempt design. This distribution does not
authorize a one-job constraint and returns no Concept Brief identity. Any
unexplained density that conflicts with the attempt design is a STOP. Zero rows
is a valid empty-table PASS only under the zero-row evidence rule.

Only after B05 PASS evidence is captured may the Owner execute B06.

## 10. Step 16 / B06 - relationship consistency counts

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

Exact headers: `output_missing_job_count`,
`output_job_brief_mismatch_count`, `review_missing_output_count`,
`review_output_brief_mismatch_count`.

PASS requires exactly one complete scalar row and every count exactly `0`.
Zero rows, null, missing, additional, malformed, nonzero, or truncated values
are a STOP. The query uses relationship identities internally but returns only
sanitized aggregate counts.

Only after B06 PASS evidence is captured may the Owner execute B07.

## 11. Step 17 / B07 - review-status safety count

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

Exact header: `invalid_review_status_count`.

PASS requires exactly one complete scalar row with
`invalid_review_status_count = 0`. Zero rows, null, missing, additional,
malformed, nonzero, or truncated values are a STOP. Legal labels are
system-controlled status values only; `approved_for_customer` remains distinct
from automatic First Preview readiness and production approval.

Only after B07 PASS evidence is captured may the Owner execute B15.

## 12. Step 18 / B15 - one-output-per-job duplicate count

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

Exact header: `multi_output_job_count`.

PASS requires exactly one complete scalar row with
`multi_output_job_count = 0`. Zero rows, null, missing, additional, malformed,
nonzero, or truncated values are a STOP. The query groups job identities
internally but returns no job identity.

Only after B15 PASS evidence is captured may the Owner execute B17.

## 13. Step 19 / B17 - pending-review semantics aggregate

```sql
SELECT
  preview_status,
  (object_path IS NOT NULL) AS has_object_path,
  count(*) AS row_count
FROM public.ai_sketch_outputs
GROUP BY preview_status, (object_path IS NOT NULL)
ORDER BY preview_status, has_object_path;
```

Exact headers: `preview_status`, `has_object_path`, `row_count`.

PASS requires a complete ordered distribution with zero duplicate
`(preview_status, has_object_path)` identities, boolean `has_object_path`, and
positive integer counts. Every status and its repository meaning must be
understood. `pending_review` remains a historical workflow value distinct from
automatic readiness; object-path presence does not establish asset existence,
validity, privacy, gates, or readiness. Any blank, null, unknown, ambiguous,
malformed, duplicate, or unreviewable result is a STOP. Zero rows is a valid
empty-table PASS only under the zero-row evidence rule.

Whether B17 passes or fails, STOP all SQL. Resume Step 20 is not authorized.

## 14. Privacy boundary

Batch 02 returns only bounded system-controlled statuses, booleans, and
aggregate counts. B03 and B17 test object-path nullability but never return an
object path. B04, B05, B06, and B15 may group or join identities internally but
never return job, output, review, Concept Brief, or row identities.

The evidence and manifest must contain no application-user or auth-user data;
customer or business-row values or identities; row IDs; brief references;
prompts; notes; object paths; URLs; images; secrets; tokens; keys; environment
values; or Provider data. The results authorize no data, lifecycle, access,
schema, RLS, policy, Storage, Provider, application, or customer-visible change.

## 15. Combined Batch 02 reconciliation contract

After Batch 02 completes or stops, run no further SQL. The read-only
reconciliation must create one sanitized external manifest:

`novora-fp-phase-a-resume-batch-02-b01-b17-20-manifest-v2.json`

It must bind the exact approval, post-merge commit, reviewed PR head, Batch 02
packet blob, accelerated-plan blob, Batch 01 manifest identity, Resume Packet
blob, MANUAL blob, quiet-window attestation, context proof boundary, and every
attempted statement identity. It must select exactly one context artifact and
one mutually exclusive result artifact for each attempted statement; record
actual filenames, formats, bytes, file SHA-256 values, exact headers, row and
duplicate counts, sanitized results, expected canonical hashes, nullable actual
hashes/equality, proof bases, PASS/ERROR/`not_run`, last successful/failed item,
Steps 20-68 `not_run`, both Phase A statuses STOPPED, and all exclusions.

CSV output does not prove the submitted SQL bytes. For every selected CSV,
`actual_canonical_sql_sha256` and `canonical_hash_equality` remain null unless
separate selected evidence genuinely proves the complete reconstructable input
bytes. The manifest must contain no protected data identified in section 14.

One independent read-only reviewer must rehash the context, every selected
result artifact, and the manifest at review start and end; independently verify
all results and STOP behavior; and find no identity, completeness, semantic,
privacy, or stability mismatch. One ledger update and one documentation-only PR
follow. There is no reconciliation packet, approval, manifest, or PR between
individual Batch 02 statements.

## 16. Universal STOP conditions and exclusions

STOP immediately on any project, environment, database, selected role,
row-limit, quiet-window, context, target-control, bounded-reliance,
source/packet/plan/manifest blob, heading, sequence, canonical byte length,
canonical hash, filename, header, row, duplicate, status semantic, count,
boolean, completeness, truncation, warning, SQL error, transport/fetch, export,
privacy, or expected-result mismatch. Mark every later Batch 02 step `not_run`.

After STOP, do not Retry, rerun, repair, compensate, roll back, clean up,
inspect protected rows, change SQL, capture a replacement context, or continue.

This packet does not authorize Codex, MCP, CLI, script, or automated Supabase
connection or SQL execution; more than one attempt per statement; Retry; R01-
R04, C03, M01-M06, Step 20 or any later Resume statement; `23.1-S01` or
`23.2-S01`; candidate DDL; block 23.7; constraint validation; replacement or ad
hoc SQL; DML; repair; compensation; backfill; data edits; DELETE; rollback;
cleanup; role/membership/grant/privilege/ownership/schema/default-privilege/ACL/
RLS/policy/trigger/function/Storage changes; protected-row inspection beyond
the exact approved aggregates; Provider/generated-asset actions; Production or
environment changes; deployment; application rollout; email; payment;
customer-visible behavior; or branch, worktree, packet, manifest, evidence, or
artifact deletion.

Phase A Resume and Phase A remain **STOPPED** after Batch 02 pending independent
evidence reconciliation and a separately reviewed Batch 03 decision.

## 17. Copy-ready separate Owner approval sentence

Replace only the four angle-bracket placeholders after this documentation PR is
independently reviewed at its unchanged exact head, merged, and every post-merge
identity is recomputed. Do not use this sentence before then.

> APPROVE NOVORA FIRST PREVIEW PHASE A RESUME BATCH 02 (`B01`-`B17`) CONTINUATION PACKET v2, and only that packet, for nine sequential Owner-performed manual SELECT-only attempts against Supabase project `novora-production`, `main` / Production, Primary Database (`postgres`), target schema `public`, selected current role and session role `postgres`, and SQL Editor row limit at least `1000`, using merged `origin/main` commit `<POST_MERGE_ORIGIN_MAIN_COMMIT>`, PR #`<PR_NUMBER>` reviewed head `<REVIEWED_PR_HEAD>`, Batch 02 packet `docs/novora-first-preview-phase-a-batch-02-b01-b17-continuation-packet-v2.md` Git blob `<BATCH_02_PACKET_GIT_BLOB>`, completed Batch 01 manifest `novora-fp-phase-a-resume-batch-01-m04-m06-11-manifest-v2.json` byte size `23043` and SHA-256 `f04d60c5f1e86def72a9a5b6cef56788fd1668a9dc7475a81678cffeab88feef`, accelerated-plan Git blob `64f5e128ba0e4de0d59e7357d788e4c159f6bb4c`, frozen Resume Packet Git blob `98e6b4a70fba66e317b57fd6f6bfc1bb3274bc85`, and frozen MANUAL source Git blob `1d7ee46755254e6c01ac125793ecbd9bf3451204`; I explicitly accept the packet's bounded context-proof basis, Owner-attested uninterrupted quiet window, and no-visible-target-control-change statement; approval is limited to one fresh Batch 02 visual context capture and then, only in exact order, only once each with ordinary manual `Run`, and only while every preceding context, identity, result, evidence, and STOP gate passes, Step `11` / `B01` under heading `### 10 - B01`, canonical bytes `97`, SHA-256 `9cf2f8365954544726d01f562d06115ec373768fa30d598d384954f2465eed4f`; Step `12` / `B02` under heading `### 11 - B02`, canonical bytes `124`, SHA-256 `4ac61e3c8d2c1b6a75fbbaf1ddfe5241778f654134705dcc1c332be66dfd75d6`; Step `13` / `B03` under heading `### 12 - B03`, canonical bytes `224`, SHA-256 `33218418b894c3479d3d3e20f0a7caa610a3863cecfb2b02770d4ad6bb1446f5`; Step `14` / `B04` under heading `### 13 - B04`, canonical bytes `213`, SHA-256 `a1a8a358f6d2779947a5e13ce15c85181b88e0840825dce356698d9bb7b73e1c`; Step `15` / `B05` under heading `### 14 - B05`, canonical bytes `232`, SHA-256 `2a456c2671be654cc4aee18bd03d8e0102e1d94ec0d5c8bd9348fd40f6a1feb3`; Step `16` / `B06` under heading `### 15 - B06`, canonical bytes `781`, SHA-256 `56277764a42962df29d8dc151cf34da723d9454c6833490ef271cb8625841c88`; Step `17` / `B07` under heading `### 16 - B07`, canonical bytes `267`, SHA-256 `0359f22286e7a294d6ac01d47bf140bf1da3297765c44c943fc37274f9f66ea7`; Step `18` / `B15` under heading `### 17 - B15`, canonical bytes `170`, SHA-256 `9c3e4473238a83b0ca10bceb699029eb89a52d7ef43df34ea6838343d3e44701`; and Step `19` / `B17` under heading `### 18 - B17`, canonical bytes `220`, SHA-256 `60227942aa9689ff9b8e5c90a6dcfc896d755419846eefbd31b47be92b7c3ce6`; ordinary PASS/ERROR filenames and the valid zero-row PASS filenames only for B01, B02, B04, B05, and B17 are exactly those frozen in the packet; every result must satisfy its exact headers, completeness, ordering, uniqueness, status semantics, aggregate invariants, zero-count requirements, privacy boundary, and evidence contract; stop the entire batch immediately on any packet-defined mismatch, warning, SQL error, transport/fetch failure, export failure, or context drift, do not Retry or execute any remaining statement, and after completion or STOP run no more SQL pending one combined sanitized Batch 02 manifest and independent evidence reconciliation; this approval authorizes no Step 20 or later Resume statement, candidate DDL, block 23.7, repair, rollback, cleanup, access change, protected-row inspection beyond the exact aggregates, Provider, Storage, Production, deployment, application, customer-visible, automated Supabase, or deletion action.
