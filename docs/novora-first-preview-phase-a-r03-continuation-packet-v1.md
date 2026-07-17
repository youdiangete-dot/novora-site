# NOVORA First Preview Phase A Resume Step 03 - R04 Continuation Packet v1

Date: 2026-07-17

Status: **FROZEN FOR SEPARATE OWNER APPROVAL - NOT EXECUTED**

## 1. Decision and exact scope

The separately approved Resume Step 02 (`R02`) produced complete PASS evidence.
That evidence permits preparation of this decision packet; it does not itself
authorize another query.

The exact next item in the frozen 68-step Resume Packet is **Step 03, label
`R04`**. This packet uses "R03 continuation" only to mean continuation to
Resume **Step 03**. It does not incorporate or authorize the separate Recovery
Packet query labeled `R03`, whose canonical SHA-256 is
`6e74dede3b24d6324123a2290cb90450bc79c49d126e360d71ab4e5d11f48559`.

If separately approved with every immutable identity in this packet, the only
SQL this packet may release is one manual execution of the exact frozen
SELECT-only Resume Step 03 (`R04`). A fresh visual context gate and fresh quiet
window are mandatory before the statement. Whether the statement passes or
fails, all SQL stops for independent evidence reconciliation. Resume Steps
04-68 remain prohibited.

Merging this packet does not authorize execution.

## 2. Verified evidence and immutable identities

- R02 approval point `origin/main`:
  `2b545efc2e75135c534319bbefef09c4223def81`
- R02 Continuation Packet PR #213 reviewed head:
  `e2b2a6b3baedf4e1731720d71a990f86692d37c8`
- R02 Continuation Packet Git blob:
  `e59bb48d28819d211cb31a0ed4d50755761d83b7`
- R02 approval-record PR #214 reviewed head:
  `63a4234cee358fe6d283aefe3a58acda4af7baa4`
- R02 approval-record merge commit and this packet's preparation base:
  `cc9d1e5842f992786194947bf253c59998655278`
- Completed R02 continuation supplement filename:
  `novora-fp-phase-a-resume-r02-continuation-03-manifest-v1.json`
- Completed R02 continuation supplement SHA-256:
  `fbb4a105aca1f7cd92eb034fc7d65eaaa84edb99b19283f0407dff60e98e26ce`
- Fresh R02 continuation Phase 0 artifact SHA-256:
  `7e82b02dbe975a4a30be7cbe8a0e3293d002a5052ac6543547c5a3cd68eeb4a2`
- R02 PASS CSV SHA-256:
  `01619c87bec0666a8965ffb6769e0683955178b039ada3611b5b3fe811ee15b6`
- Frozen Resume Packet Git blob:
  `98e6b4a70fba66e317b57fd6f6bfc1bb3274bc85`
- Authoritative Recovery source Git blob:
  `e853e2992f4d556a1d41b089006bdd288aa2d7bc`
- Completed Recovery manifest SHA-256:
  `43916fa5dad233c15aad2865c602ccbe75fbe28380440bfd51077ac29f1cba5d`
- Completed Repair manifest SHA-256:
  `cbffdbb90ada2f897fa7fe558add2e8a8f5a65bbf03e9ae780f7406832cf5575`
- Recovery R04 baseline artifact SHA-256:
  `92142e7e71f210bed22cb31b852354f1d93d80d7ea36e36602f47941ee0b6c3f`
- Repair A03 preservation artifact SHA-256:
  `ed4798c51a5f7974b1bd0f7970debbeaf3929b126e8d2f0f3a9f653aa131a470`

The completed R02 supplement records exactly two selected artifacts. Fresh
context passed. R02 passed with 69 complete rows, zero full-row duplicates,
zero duplicate table/ordinal identities, and zero dropped slots. All 44 Job
attributes match the completed Recovery R02 baseline, and all 25 Output
attributes match Repair A01, including all 17 frozen `23.2-S01` additions.
Its actual submitted-SQL hash and equality correctly remain null because the
CSV does not independently prove the SQL Editor input bytes. Phase A Resume and
Phase A remain STOPPED; Steps 03-68 remain `not_run`.

Before any later approval, the final copy-ready approval must additionally bind
the post-merge `origin/main` commit, exact reviewed PR head, and Git blob of
this frozen packet. Any head change after review requires a new review.

## 3. Exact target and fresh quiet window

If separately approved, the Owner may manually perform this packet only against:

- Supabase project: `novora-production`
- Branch/environment context: `main` / Production
- Database: Primary Database (`postgres`)
- Target schema: `public`
- Selected current role and session role: `postgres`
- SQL Editor row limit: at least `1000`

Before the visual context gate, confirm a fresh quiet window with no First
Preview writer, migration, schema operation, application rollout, or other
actor targeting `ai_sketch_jobs`, `ai_sketch_outputs`, or
`ai_sketch_reviews`. The quiet window must remain active through Step 03
evidence capture. STOP before the context gate if the quiet window cannot be
confirmed.

### Context-proof boundary

The fresh visual gate independently re-proves only the visible project,
`main` / Production environment, Primary Database selection, selected current
role `postgres`, row limit, and blank editor. The quiet-window status is
Owner-attested and is not independently proved by the visual artifact or by a
database query. The exact Step 03 (`R04`) predicate constrains the catalog
target to schema `public` and the three named AI tables.

The accepted fresh R01 CSV remains the last SQL evidence for
`current_schema = public`, `session_role = postgres`, and
`server_is_in_recovery = false`. R02 independently proved the expected public
Job and Output relation OIDs and attribute catalogs, but neither the new visual
gate nor Step 03 independently re-proves the three R01 session values. The
Owner must attest that no visible project, environment, database, role, or
target control changed after accepted R02 evidence and before Step 03. This
attestation does not prove reuse of one database backend session.

Any future exact approval must explicitly accept this bounded reliance for the
single SELECT-only catalog query. If the Owner does not accept it, or requires
fresh SQL proof of session role or recovery state, STOP: this Step-03-only
packet cannot provide that proof, and a separately reviewed and approved
context-preflight packet is required. Do not add an ad hoc context query.

## 4. Canonical SQL and frozen-source rule

Resume Step 03 is incorporated from frozen Resume Packet Git blob
`98e6b4a70fba66e317b57fd6f6bfc1bb3274bc85`, sequence-table Step `03`, label
`R04`, and only from authoritative Recovery source Git blob
`e853e2992f4d556a1d41b089006bdd288aa2d7bc`, repository path
`docs/novora-first-preview-phase-a-read-only-recovery-packet-v1.md`, section
`10`, exact full Markdown heading
`## 10. R04 - unfiltered current constraint and index catalog`.

The only executable SQL is the complete fenced `sql` block under that exact
source section and heading.

Canonicalize the complete statement by normalizing CRLF/CR to LF; trimming
leading and trailing statement whitespace; requiring and removing exactly one
terminal semicolon; trimming the remaining body; then appending exactly one
semicolon and one LF. Hash those UTF-8 bytes without a BOM.

Required Step 03 (`R04`) canonical SHA-256:

`2526d2aea62509ceb89ffc95dfd9b383aa302b4c91f9b58d5a0bf95454403d09`

The independently recomputed canonical byte length is `1800`.

Do not use the separate Recovery `R03` statement. Do not add comments, combine
statements, add a transaction wrapper, edit identifiers, substitute SQL, or
execute if the complete source blob, sequence row, heading, SQL block, byte
length, or canonical hash does not match.

For Owner convenience, the exact incorporated Step 03 (`R04`) SQL is reproduced
below. The Git blobs, sequence row, and heading above remain authoritative.

```sql
WITH target_relations AS (
  SELECT
    relation.oid AS relation_oid,
    relation.relname AS table_name
  FROM pg_catalog.pg_class relation
  JOIN pg_catalog.pg_namespace namespace
    ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname IN (
      'ai_sketch_jobs',
      'ai_sketch_outputs',
      'ai_sketch_reviews'
    )
    AND relation.relkind IN ('r', 'p')
)
SELECT
  targets.table_name,
  targets.relation_oid::text AS relation_oid,
  'constraint'::text AS object_type,
  constraint_object.oid::text AS object_oid,
  constraint_object.conname AS object_name,
  constraint_object.contype::text AS constraint_type,
  pg_catalog.pg_get_constraintdef(constraint_object.oid, true)
    AS exact_definition,
  constraint_object.convalidated AS is_validated,
  constraint_object.condeferrable AS is_deferrable,
  constraint_object.condeferred AS is_initially_deferred,
  NULL::boolean AS is_unique,
  NULL::boolean AS is_valid,
  NULL::boolean AS is_ready,
  NULL::boolean AS is_live
FROM target_relations targets
JOIN pg_catalog.pg_constraint constraint_object
  ON constraint_object.conrelid = targets.relation_oid
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
JOIN pg_catalog.pg_index index_metadata
  ON index_metadata.indrelid = targets.relation_oid
JOIN pg_catalog.pg_class index_relation
  ON index_relation.oid = index_metadata.indexrelid
ORDER BY table_name, object_type, object_name;
```

## 5. Exact expected result

PASS requires one complete, untruncated 16-row catalog with the exact 14 CSV
headers frozen by Recovery R04. Duplicate
`(table_name, object_type, object_oid)` identities must be zero. The object set,
OIDs, and exact definitions must be exactly:

| Table / relation OID | Type / object OID | Object | Exact definition |
| --- | --- | --- | --- |
| `ai_sketch_jobs` / `17602` | constraint / `17614` | `ai_sketch_jobs_concept_brief_id_fkey` | `FOREIGN KEY (concept_brief_id) REFERENCES concept_briefs(id) ON DELETE CASCADE` |
| `ai_sketch_jobs` / `17602` | constraint / `17613` | `ai_sketch_jobs_pkey` | `PRIMARY KEY (id)` |
| `ai_sketch_jobs` / `17602` | index / `17681` | `ai_sketch_jobs_concept_brief_id_idx` | `CREATE INDEX ai_sketch_jobs_concept_brief_id_idx ON public.ai_sketch_jobs USING btree (concept_brief_id)` |
| `ai_sketch_jobs` / `17602` | index / `17612` | `ai_sketch_jobs_pkey` | `CREATE UNIQUE INDEX ai_sketch_jobs_pkey ON public.ai_sketch_jobs USING btree (id)` |
| `ai_sketch_outputs` / `17619` | constraint / `17636` | `ai_sketch_outputs_concept_brief_id_fkey` | `FOREIGN KEY (concept_brief_id) REFERENCES concept_briefs(id) ON DELETE CASCADE` |
| `ai_sketch_outputs` / `17619` | constraint / `17631` | `ai_sketch_outputs_job_id_fkey` | `FOREIGN KEY (job_id) REFERENCES ai_sketch_jobs(id) ON DELETE CASCADE` |
| `ai_sketch_outputs` / `17619` | constraint / `17630` | `ai_sketch_outputs_pkey` | `PRIMARY KEY (id)` |
| `ai_sketch_outputs` / `17619` | index / `17682` | `ai_sketch_outputs_concept_brief_id_idx` | `CREATE INDEX ai_sketch_outputs_concept_brief_id_idx ON public.ai_sketch_outputs USING btree (concept_brief_id)` |
| `ai_sketch_outputs` / `17619` | index / `17629` | `ai_sketch_outputs_pkey` | `CREATE UNIQUE INDEX ai_sketch_outputs_pkey ON public.ai_sketch_outputs USING btree (id)` |
| `ai_sketch_reviews` / `17641` | constraint / `17651` | `ai_sketch_reviews_ai_sketch_output_id_fkey` | `FOREIGN KEY (ai_sketch_output_id) REFERENCES ai_sketch_outputs(id) ON DELETE CASCADE` |
| `ai_sketch_reviews` / `17641` | constraint / `17656` | `ai_sketch_reviews_concept_brief_id_fkey` | `FOREIGN KEY (concept_brief_id) REFERENCES concept_briefs(id) ON DELETE CASCADE` |
| `ai_sketch_reviews` / `17641` | constraint / `18099` | `ai_sketch_reviews_concept_brief_id_key` | `UNIQUE (concept_brief_id)` |
| `ai_sketch_reviews` / `17641` | constraint / `17650` | `ai_sketch_reviews_pkey` | `PRIMARY KEY (id)` |
| `ai_sketch_reviews` / `17641` | constraint / `18073` | `ai_sketch_reviews_review_status_check` | `CHECK (review_status = ANY (ARRAY['internal_draft_not_generated'::text, 'draft_generated_internal_only'::text, 'needs_revision'::text, 'approved_for_customer'::text]))` |
| `ai_sketch_reviews` / `17641` | index / `18098` | `ai_sketch_reviews_concept_brief_id_key` | `CREATE UNIQUE INDEX ai_sketch_reviews_concept_brief_id_key ON public.ai_sketch_reviews USING btree (concept_brief_id)` |
| `ai_sketch_reviews` / `17641` | index / `17649` | `ai_sketch_reviews_pkey` | `CREATE UNIQUE INDEX ai_sketch_reviews_pkey ON public.ai_sketch_reviews USING btree (id)` |

Every constraint must be validated, nondeferrable, and not initially deferred.
Every index must have the exact expected uniqueness value and be valid, ready,
and live. Table totals must be exactly:

- jobs: 2 constraints and 2 indexes;
- outputs: 3 constraints and 2 indexes; and
- reviews: 5 constraints and 2 indexes.

No additional, missing, changed, invalid, unready, non-live, or candidate object
may exist. Any deviation is a STOP, not authorization to repair.

## 6. Exact manual sequence and evidence

### Step 00 - fresh visual context gate

Open a fresh blank SQL Editor and visibly verify the exact project,
branch/environment, Primary Database, selected role `postgres`, and row limit
of at least `1000`. The editor must not display unrelated SQL/history, customer
content, secrets, or environment-variable values.

Before capture, the Owner must attest that the fresh quiet window is active,
that no visible target control changed after accepted R02 evidence, and that the
context-proof boundary's explicitly limited proof basis is accepted. STOP if
any statement cannot be made exactly.

On PASS, capture exactly:

`novora-fp-phase-a-resume-step-03-r04-continuation-00-context.png`

On any mismatch, missing control, stale content, warning, or incomplete visual
evidence, capture exactly:

`novora-fp-phase-a-resume-step-03-r04-continuation-00-context-error.png`

Then record Resume Step 03 as `not_run` and STOP. Select exactly one mutually
exclusive context artifact.

### Step 01 - exact frozen Resume Step 03 (`R04`)

Only after Step 00 passes, paste the complete authoritative statement into the
fresh blank editor, verify its canonical hash and byte length, and execute it
exactly once with the ordinary manual `Run` action.

On PASS, export the complete result with headers exactly as:

`novora-fp-phase-a-resume-03-r04.csv`

On any warning, SQL error, unexpected zero-row result, missing or truncated
result, context/relation/object/OID/count/definition/validation/readiness/
liveness mismatch, transport or fetch failure, or export failure, capture
exactly:

`novora-fp-phase-a-resume-03-r04-error.png`

Select exactly one mutually exclusive Step 03 result artifact. Whether Step 03
passes or fails, STOP. Do not retry and do not execute Resume Step 04.

## 7. Post-attempt reconciliation contract

The next read-only reconciliation must create the sanitized external supplement:

`novora-fp-phase-a-resume-step-03-r04-continuation-04-manifest-v1.json`

It must bind the exact approval, post-merge packet, reviewed PR head, source,
Resume Packet, completed R02 supplement, canonical hash, and selected-artifact
identities; record the fresh quiet-window confirmation as Owner-attested and
not independently database-verified; record the context-proof boundary and
values not freshly re-proven; list exactly one selected context artifact and,
only if Step 03 was attempted, exactly one selected result artifact; record
actual bytes, SHA-256 values, headers, row/duplicate/table/object counts, exact
sanitized object metadata, expected canonical hash, nullable actual canonical
hash and equality with exact proof basis, and PASS/ERROR/`not_run`; preserve
Phase A Resume and Phase A as STOPPED; mark Steps 04-68 `not_run`; and record
every exclusion.

CSV result evidence does not prove submitted SQL bytes. For a PASS CSV,
`actual_canonical_sql_sha256` and `canonical_hash_equality` must remain null and
the proof basis must say so explicitly.

The supplement must contain no customer data, customer row IDs, brief
references, prompts, notes, Storage object-path values, URLs, images, secrets,
tokens, keys, environment-variable values, or Provider data.

## 8. Universal STOP conditions

STOP immediately on any visible project, environment, database, selected
current role, row limit, quiet-window, context-attestation, bounded-reliance
acceptance, target schema, packet/source/Resume blob, source heading, sequence
label, canonical hash, canonical byte length, relation/object identity or OID,
row/header/duplicate/table/object count, definition, constraint validation or
deferrability, index uniqueness/validity/readiness/liveness, completeness,
truncation, filename, warning, SQL error, transport/fetch error, export error,
or expected-result mismatch.

After a STOP, do not click a generic `Retry` control, rerun Step 03, change SQL,
repair, compensate, roll back, clean up, or continue.

## 9. Explicit exclusions

This packet does not authorize:

- Codex, MCP, CLI, script, or other automated Supabase connection or SQL
  execution;
- execution without a separate exact Owner approval tied to post-merge
  `origin/main`, exact reviewed PR head, this packet's Git blob, the completed
  R02 supplement SHA-256, Resume Packet blob, source blob, Step 03 label, and
  `R04` canonical SHA-256, while explicitly accepting the context-proof
  boundary;
- representing `current_schema`, `session_role`, recovery state, backend-session
  reuse, or quiet-window truth as freshly re-proven by the visual gate or Step
  03;
- the separate Recovery `R03` statement;
- more than one manual Step 03 attempt or any retry;
- R01, R02, Resume Step 04, or any later Resume statement;
- `23.1-S01` or `23.2-S01` retry;
- candidate DDL, block 23.7, constraint validation, replacement or ad hoc SQL;
- DML, repair, compensation, backfill, data edits, DELETE, rollback, or cleanup;
- ACL, default-privilege, RLS, policy, trigger, function, or Storage changes;
- customer or business-row inspection;
- Provider/generated-asset actions, environment changes, deployment,
  application rollout, email, payment, or customer-visible behavior; or
- branch, worktree, or evidence deletion.

Phase A Resume and Phase A remain **STOPPED** after Step 03 pending independent
evidence reconciliation and a separately reviewed continuation decision.
