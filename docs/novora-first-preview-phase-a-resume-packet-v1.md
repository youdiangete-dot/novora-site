# NOVORA First Preview Phase A Resume Packet v1

Date: 2026-07-16

Status: **FROZEN FOR SEPARATE OWNER APPROVAL - NOT EXECUTED**

## 1. Decision and exact next safe start

The completed repair evidence establishes the exact live starting state required
by this packet: all 35 frozen `23.1-S01` job columns and all 17 frozen
`23.2-S01` output columns are present with the reviewed definitions. The
historical cause of the earlier 23.2/B11 contradiction is not proven.

The next safe start is a new Phase 0 followed by R01. It is not B11. The Owner
must refresh every statement in steps 01-30 below before executing any remaining
candidate DDL. This packet excludes and must never re-execute `23.1-S01` or
`23.2-S01`.

This packet does not authorize execution. Merging it does not authorize
execution. Every prior Phase A, recovery, and repair approval is exhausted for
new work. A separate exact Owner approval tied to the merged packet identity,
reviewed PR head, external repair-manifest identity, target, and all 68
canonical SQL hashes is required.

## 2. Verified starting state and immutable identities

- Pre-repair approved `origin/main`:
  `28625b345908a3ed372dfc650219253e828a2f28`
- PR #207 reviewed head:
  `3b7cb61afbf53f63a698279ba704632d50ff8131`
- Repair packet Git blob:
  `98017d94ec4711ed673cde9c75a9e8f0947850dc`
- Repair packet raw-file SHA-256:
  `8f63c74c5a11a8c90c44f6d8ed9be956d00e95c6a8595d4083bd0c5979a27acd`
- Recovery manifest SHA-256:
  `43916fa5dad233c15aad2865c602ccbe75fbe28380440bfd51077ac29f1cba5d`
- Repair manifest filename:
  `novora-fp-phase-a-repair-09-manifest-v1.json`
- Repair manifest SHA-256:
  `cbffdbb90ada2f897fa7fe558add2e8a8f5a65bbf03e9ae780f7406832cf5575`
- Original STOPPED Phase A manifest SHA-256:
  `3551b06cc2ccfa75802177c05603cf9b8a1028637ab816977ab3e7d4bdbffe97`
- Frozen recovery SQL packet Git blob:
  `e853e2992f4d556a1d41b089006bdd288aa2d7bc`
- Frozen original Phase A manual sequence Git blob:
  `1d7ee46755254e6c01ac125793ecbd9bf3451204`
- Frozen Phase A Owner Execution Packet Git blob:
  `d347663d740cc766eb07c9c93b9130d16fc9f51f`
- Frozen Agent 70B-2 source Git blob:
  `714a30d16760dc98602dcbd8dc92d8785895811c`
- Frozen Agent 70B-2 source raw SHA-256:
  `4763a425a9e22098a3dd43d3773c8352d83fd201b72d48dd116d7f9619cceecc`

The repair manifest records Repair `COMPLETE`, Phase A `STOPPED`, exact output
relation OID `17619`, all 25 output attributes, no dropped slots, output row
count zero, and the exact five pre-existing output objects preserved. The
completed recovery manifest records job relation OID `17602`, all 44 job
attributes, review relation OID `17641`, and the complete 16-object baseline for
the three tables.

## 3. Exact target and quiet-window rule

If separately approved, the Owner may manually run this packet only against:

- Supabase project: `novora-production`
- Branch/environment context: `main` / Production
- Database: Primary Database (`postgres`)
- Schema: `public`
- Role and session role: `postgres`
- SQL Editor row limit: at least `1000`

Before Phase 0, confirm a quiet window with no First Preview writer, migration,
schema operation, application rollout, or other actor targeting
`ai_sketch_jobs`, `ai_sketch_outputs`, or `ai_sketch_reviews`. STOP before R01
if that cannot be confirmed. The quiet window must remain in effect through
V05.

Use a blank SQL Editor. Execute each statement manually and individually in the
exact order below. Do not add comments, combine statements, add a transaction
wrapper, edit identifiers, or reuse a prior result. Verify the packet/source
identity and canonical hash before each execution.

## 4. Canonical SHA-256 and incorporated-statement rule

For each complete statement: normalize CRLF/CR to LF; trim leading/trailing
statement whitespace; require and remove exactly one terminal semicolon; trim
the remaining body; append exactly one semicolon and one LF; hash those UTF-8
bytes without a BOM. Do not alter the statement.

Except for new L01, every executable statement is incorporated verbatim by the
immutable Git blob, exact heading, and canonical SHA-256 in the sequence table.
The only executable text is the complete fenced `sql` block under that heading
in that blob. A rendered working-tree file, branch, copied note, or earlier
evidence is not authoritative. STOP if the source blob, heading, complete SQL
block, or canonical hash cannot be verified exactly.

Source aliases used below:

- `RECOVERY`: Git blob `e853e2992f4d556a1d41b089006bdd288aa2d7bc`,
  `docs/novora-first-preview-phase-a-read-only-recovery-packet-v1.md`.
- `MANUAL`: Git blob `1d7ee46755254e6c01ac125793ecbd9bf3451204`,
  `docs/novora-first-preview-schema-phase-a-owner-manual-execution-sequence-v1.md`.
- `THIS`: the merged Git blob of this packet, which must be included in the
  separate approval before execution.

This incorporation freezes the complete SQL text; it is not permission to use
any other statement from either source blob.

## 5. Universal STOP and evidence rules

STOP immediately on any project, environment, database, schema, current role,
session role, recovery state, row-limit, quiet-window, source-blob, packet-blob,
heading, canonical-hash, relation identity/OID, row count, duplicate count,
column, dropped slot, type, nullability, default, identity/generated field,
constraint, index, object OID, definition, validation/readiness/liveness,
ownership, privilege, RLS/policy, lock, result-completeness, truncation, filename,
warning, SQL error, or expected-result mismatch. Do not retry, repair,
compensate, roll back, clean up, or continue after a STOP. Mark every later step
`not_run`.

Capture Phase 0 as
`novora-fp-phase-a-resume-00-context.png`. It must visibly show the exact target,
role, row limit, blank editor, and no unrelated SQL/history, customer content,
secrets, or environment values.

For each attempted SELECT, the ordinary PASS artifact is the exact CSV filename
in the table, exported with headers and complete results. A valid zero-row
result is permitted only for B01, B02, B04, B05, or B17 and uses the exact
mutually exclusive PASS filename formed by replacing `.csv` with `-zero.png`.
That screenshot must show the complete frozen statement, exact target context,
headers/zero-row result, and no warning/error. Zero rows at any other SELECT are
an immediate STOP.

For each attempted DDL, the PASS artifact is the exact PNG filename in the
table. It must visibly show the exact target context, editor success, no
warning/error, and enough unambiguous statement context to identify the step.
For a statement too long to fit in one screenshot, the screenshot is outcome
evidence only; it must not be represented as proof of submitted bytes. The
Owner must still verify the canonical hash before execution, and the immediately
following unfiltered R04 assertion must prove the exact durable catalog effect before
any next DDL. The manifest's actual SQL hash and equality remain null unless the
single selected artifact truly contains the complete reconstructable statement.

On an unexpected zero-row result, missing/truncated result, SQL error, or
warning, capture only the same base filename with `-error.png` replacing `.csv`
or `.png`, then STOP. Select exactly one mutually exclusive artifact for each
attempted step. Never create a placeholder for a `not_run` step.

Final sanitized manifest filename:
`novora-fp-phase-a-resume-69-manifest-v1.json`.

The manifest must record the approved commit/PR/packet/source identities,
quiet-window confirmation, exactly one selected artifact per attempted step,
filename/format/bytes/file SHA-256, row and duplicate counts, exact sanitized
results, expected canonical SQL SHA-256, nullable actual canonical SQL SHA-256,
nullable equality, exact proof basis, PASS/ERROR/`not_run`, last successful and
failed step, Phase A status, and every exclusion. CSV results do not prove
submitted statement bytes: their actual SQL hash and equality must be null.
Never place customer data, row IDs, brief references, prompts, notes, object
paths, URLs, images, secrets, tokens, keys, environment values, or Provider data
in the manifest.

## 6. Exact access baseline for M01-M06

The M01-M06 results must exactly reproduce the following sanitized baseline,
not merely appear reasonable:

- M01: exactly `admin_notes`, `ai_sketch_jobs`, `ai_sketch_outputs`,
  `ai_sketch_reviews`, `concept_brief_reference_assets`, and `concept_briefs`
  in `public`, each owned by `postgres`.
- M02: exactly four roles. `anon` and `authenticated` are
  `rolsuper=false`, `rolinherit=true`, `rolcanlogin=false`,
  `rolbypassrls=false`; `postgres` is `false,true,true,true` in that field
  order; `service_role` is `false,true,false,true`.
- M03: exactly these 12
  `(granted_role, member_role, grantor_role, admin_option)` tuples, all unique:
  `(anon,authenticator,supabase_admin,false)`,
  `(anon,postgres,supabase_admin,true)`,
  `(authenticated,authenticator,supabase_admin,false)`,
  `(authenticated,postgres,supabase_admin,true)`,
  `(authenticator,postgres,supabase_admin,true)`,
  `(pg_create_subscription,postgres,supabase_admin,true)`,
  `(pg_monitor,postgres,supabase_admin,true)`,
  `(pg_read_all_data,postgres,supabase_admin,true)`,
  `(pg_signal_backend,postgres,supabase_admin,true)`,
  `(service_role,authenticator,supabase_admin,false)`,
  `(service_role,postgres,supabase_admin,true)`, and
  `(supabase_privileged_role,postgres,supabase_admin,false)`.
- M04: exactly 18 role/table rows. Every DML value is false for `anon` and
  `authenticated`. `service_role` has SELECT/INSERT only on `admin_notes` and
  `concept_brief_reference_assets`; SELECT/INSERT/UPDATE and no DELETE on each
  AI table; and SELECT/INSERT/DELETE with no UPDATE on `concept_briefs`.
- M05: exactly 18 role/table rows and every `can_truncate` value false.
- M06: exactly 18 role/table rows. Every row has public-schema usage true,
  owner `postgres`, RLS true, FORCE RLS false, and policy count 0. BYPASSRLS is
  false for `anon` and `authenticated`, and true for `service_role`.

Any missing, additional, duplicate, or different row/value is an immediate
STOP.

## 7. Exact 68-statement execution sequence

Every row inherits every universal STOP condition. The row-specific expected
result is additionally mandatory; any deviation is an immediate STOP.

| Step | Label | Frozen source | Canonical SHA-256 | PASS evidence | Exact expected result |
| ---: | --- | --- | --- | --- | --- |
| 01 | R01 | `RECOVERY` section 7 / heading `R01 - session context and same-name relation identity` | `ebae5e128fdb57e3e6426ddd9a7dd6419d47a907c2d1a4c2229199e2d27db6f8` | `novora-fp-phase-a-resume-01-r01.csv` | Exactly 3 rows; context is `postgres`/`public`/`postgres`/`postgres`, recovery false; only the 3 approved public relations exist, owned by `postgres`, relkind `r`, persistence `p`, with OIDs jobs `17602`, outputs `17619`, reviews `17641`; duplicate and nonapproved-schema identities 0. |
| 02 | R02 | `RECOVERY` section 8 / heading `R02 - complete public target attribute catalog, including dropped slots` | `9d71ada08b5eb39137545921f3b7034c3ebe3bc37475e53809ab73c3983a158f` | `novora-fp-phase-a-resume-02-r02.csv` | Exactly 69 complete positive-attribute rows: 44 jobs and 25 outputs; ordinals unique; dropped slots 0; jobs match the recovery manifest and outputs match repair A01 exactly for name, type, nullability, default, identity, and generated metadata; no missing, partial, or unexpected live attribute. |
| 03 | R04 | `RECOVERY` section 10 / heading `R04 - unfiltered current constraint and index catalog` | `2526d2aea62509ceb89ffc95dfd9b383aa302b4c91f9b58d5a0bf95454403d09` | `novora-fp-phase-a-resume-03-r04.csv` | Exactly the 16 recovery/A03 baseline objects with matching table/relation/object OIDs and definitions: jobs 2 constraints + 2 indexes, outputs 3 + 2, reviews 5 + 2; duplicate object identities 0; every constraint validated and every index valid, ready, live; no candidate object exists. |
| 04 | C03 | `MANUAL` heading `03 - C03` | `b962dd936744916de446cbf28a1583769c863d309c2fed35098021f5f639ca9b` | `novora-fp-phase-a-resume-04-c03.csv` | Exactly 3 table rows; every total size is at most 67108864 bytes and exact row count at most 10000; no row values or identities returned. |
| 05 | M01 | `MANUAL` heading `04 - M01` | `03ad56a7e1c7f965f7972f84595df18da8fb0a58fa5988906a2f842894d814d5` | `novora-fp-phase-a-resume-05-m01.csv` | Exactly the 6 approved public tables; every owner `postgres`. |
| 06 | M02 | `MANUAL` heading `05 - M02` | `70eebd62612586e6e76338a1e9c75268d01021f6e8e2ba20e37a44d15aa9a010` | `novora-fp-phase-a-resume-06-m02.csv` | Role attributes/BYPASSRLS exactly match the frozen Stage A evidence; no broadened posture. |
| 07 | M03 | `MANUAL` heading `06 - M03` | `fdc2eecd481f69deb262eb35390495ed90a383a7d208131909b2c9566b8dd74c` | `novora-fp-phase-a-resume-07-m03.csv` | Relevant membership exactly matches frozen Stage A evidence; no unreviewed inherited path. |
| 08 | M04 | `MANUAL` heading `07 - M04` | `88079b80be9b150a3313d152aaf4da5dc328c0448bfc3d2322757aeac7348191` | `novora-fp-phase-a-resume-08-m04.csv` | Complete effective DML matrix exactly matches completed Stage A. |
| 09 | M05 | `MANUAL` heading `08 - M05` | `6716fd72b1392be20d03404839c9becf656dc438a60822e4dbcb5bd0e4761109` | `novora-fp-phase-a-resume-09-m05.csv` | `anon`, `authenticated`, and `service_role` have no effective TRUNCATE on any approved table. |
| 10 | M06 | `MANUAL` heading `09 - M06` | `a7282515ace0354f60a24ae403603c6333312e48f929a8695caab7c255ba73c7` | `novora-fp-phase-a-resume-10-m06.csv` | Ownership, RLS, FORCE RLS, policy count, schema usage, and role posture exactly match Stage A evidence. |
| 11 | B01 | `MANUAL` heading `10 - B01` | `9cf2f8365954544726d01f562d06115ec373768fa30d598d384954f2465eed4f` | `novora-fp-phase-a-resume-11-b01.csv` or `novora-fp-phase-a-resume-11-b01-zero.png` | Every status is approved; only `draft` may represent staged legacy state; zero rows is a valid empty-table PASS. |
| 12 | B02 | `MANUAL` heading `11 - B02` | `4ac61e3c8d2c1b6a75fbbaf1ddfe5241778f654134705dcc1c332be66dfd75d6` | `novora-fp-phase-a-resume-12-b02.csv` or `novora-fp-phase-a-resume-12-b02-zero.png` | Every preview status understood; `pending_review` is not automatic readiness; zero rows is a valid empty-table PASS. |
| 13 | B03 | `MANUAL` heading `12 - B03` | `33218418b894c3479d3d3e20f0a7caa610a3863cecfb2b02770d4ad6bb1446f5` | `novora-fp-phase-a-resume-13-b03.csv` | Exactly one complete scalar aggregate row with all three counts; never interpret it as asset existence/readiness proof. Zero rows is a STOP. |
| 14 | B04 | `MANUAL` heading `13 - B04` | `a1a8a358f6d2779947a5e13ce15c85181b88e0840825dce356698d9bb7b73e1c` | `novora-fp-phase-a-resume-14-b04.csv` or `novora-fp-phase-a-resume-14-b04-zero.png` | Complete output/job distribution; no job has more than 1 output; zero rows is a valid empty-table PASS. |
| 15 | B05 | `MANUAL` heading `14 - B05` | `2a456c2671be654cc4aee18bd03d8e0102e1d94ec0d5c8bd9348fd40f6a1feb3` | `novora-fp-phase-a-resume-15-b05.csv` or `novora-fp-phase-a-resume-15-b05-zero.png` | Complete job/brief distribution compatible with bounded attempt model; zero rows is a valid empty-table PASS. |
| 16 | B06 | `MANUAL` heading `15 - B06` | `56277764a42962df29d8dc151cf34da723d9454c6833490ef271cb8625841c88` | `novora-fp-phase-a-resume-16-b06.csv` | Every orphan, cross-brief, and output/review/brief consistency violation count 0. |
| 17 | B07 | `MANUAL` heading `16 - B07` | `0359f22286e7a294d6ac01d47bf140bf1da3297765c44c943fc37274f9f66ea7` | `novora-fp-phase-a-resume-17-b07.csv` | `invalid_review_status_count` 0. |
| 18 | B15 | `MANUAL` heading `17 - B15` | `9c3e4473238a83b0ca10bceb699029eb89a52d7ef43df34ea6838343d3e44701` | `novora-fp-phase-a-resume-18-b15.csv` | One-output-per-job duplicate count 0. |
| 19 | B17 | `MANUAL` heading `18 - B17` | `60227942aa9689ff9b8e5c90a6dcfc896d755419846eefbd31b47be92b7c3ce6` | `novora-fp-phase-a-resume-19-b17.csv` or `novora-fp-phase-a-resume-19-b17-zero.png` | Every `pending_review` semantic understood and distinct from automatic readiness; zero rows is a valid empty-table PASS. |
| 20 | B08 | `MANUAL` heading `22 - B08` | `2e067968c77a8f83133b2c0937f7fcef2e4cf7bc6926e6320fe2a07e5e691fc9` | `novora-fp-phase-a-resume-20-b08.csv` | Every nullable-hardening count captured exactly; evidence only, no NOT NULL hardening. |
| 21 | B09 | `MANUAL` heading `23 - B09` | `43298fdb1c47ef119ecc4477cf32745e3cd1743782c31ad854ae9be422780f88` | `novora-fp-phase-a-resume-21-b09.csv` | Idempotency duplicate-candidate count 0. |
| 22 | B10 | `MANUAL` heading `24 - B10` | `0e85c8b6d1344417ebea34a03b63dc5b7f3e0fa5fd594c6ada0f662a11468d4c` | `novora-fp-phase-a-resume-22-b10.csv` | Attempt-identity duplicate-candidate count 0. |
| 23 | B11 | `MANUAL` heading `25 - B11` | `a5373006e603f366bb630456421f5dd8b79e163430f92a2a2d7f03a0833cad56` | `novora-fp-phase-a-resume-23-b11.csv` | Current-preview duplicate-candidate count 0. |
| 24 | B12 | `MANUAL` heading `26 - B12` | `69c93100d88be69e4c1a5ce365b548d75f2cca1fe04a5530545c0384ad02ce67` | `novora-fp-phase-a-resume-24-b12.csv` | Provider-request duplicate-candidate count 0. |
| 25 | B13 | `MANUAL` heading `27 - B13` | `c1b7ebf089780ffb3ca1bf4a7b4facc4e9873c009bf7061148b3c0da3bd47bf5` | `novora-fp-phase-a-resume-25-b13.csv` | Every named proposed Job CHECK and Provider-profile violation count 0. |
| 26 | B14 | `MANUAL` heading `28 - B14` | `73621c68392dc73b3331669e0ec3d91918c2720b587845c5de8da18e0cd931af` | `novora-fp-phase-a-resume-26-b14.csv` | Every named Output readiness, integrity, ownership, privacy, lifecycle, and chronology violation count 0. |
| 27 | B16 | `MANUAL` heading `29 - B16` | `370cf1f47ab85c491a57ea383659d12b7297fc5ab0780ee4c28606352bde17cd` | `novora-fp-phase-a-resume-27-b16.csv` | Every lineage/source-output compatibility count, including recursive cycle count, 0. |
| 28 | B18 | `MANUAL` heading `30 - B18` | `e800146ca454edb7c30716df56ba3b3957fea2a7eae7893f73bb3cb20c69ad43` | `novora-fp-phase-a-resume-28-b18.csv` | One-active-job duplicate count 0; predicate exactly status in `queued`, `processing`. |
| 29 | B19 | `MANUAL` heading `31 - B19` | `0afc1a46385826ba11bad462dfada088a5569541a039a3fd6efaa539bb6fcde2` | `novora-fp-phase-a-resume-29-b19.csv` | Every composite-key target and future-FK compatibility count 0. |
| 30 | L01 | `THIS` section 8 | `26e397288814cca6260d138d1d464dc643599c270b9ccc74ddec7f91853828f8` | `novora-fp-phase-a-resume-30-l01.csv` | Exactly 3 rows with OIDs jobs `17602`, outputs `17619`, reviews `17641`; candidate-object, external-lock, and waiting-external-lock counts all 0. Run immediately before 23.3-S01. |
| 31 | 23.3-S01 | `MANUAL` heading `32 - 23.3-S01` | `10ecfe446e295fca518eba4efcb05bb74bc6098433662a3d5554f21129157e5c` | `novora-fp-phase-a-resume-31-23.3-s01.png` | Exact Job CHECK ALTER succeeds once; all 13 added candidate constraints remain NOT VALID. |
| 32 | A31-R04 | `RECOVERY` section 10 / heading `R04 - unfiltered current constraint and index catalog` | `2526d2aea62509ceb89ffc95dfd9b383aa302b4c91f9b58d5a0bf95454403d09` | `novora-fp-phase-a-resume-32-a31-r04.csv` | Immediate unfiltered assertion: exactly 29 objects, the exact baseline 16 plus all 13 exact 23.3 constraints on jobs; relation OIDs exact, object identities unique, new definitions exact and NOT VALID, baseline health unchanged, no missing/additional/changed object. |
| 33 | 23.4-S01 | `MANUAL` heading `33 - 23.4-S01` | `92582cd0195a5c8bb595ea79905c75a8425810eae32b30e4cdbc463798a95859` | `novora-fp-phase-a-resume-33-23.4-s01.png` | Exact Output CHECK ALTER succeeds once; all 11 added candidate constraints remain NOT VALID. |
| 34 | A33-R04 | `RECOVERY` section 10 / heading `R04 - unfiltered current constraint and index catalog` | `2526d2aea62509ceb89ffc95dfd9b383aa302b4c91f9b58d5a0bf95454403d09` | `novora-fp-phase-a-resume-34-a33-r04.csv` | Immediate unfiltered assertion: exactly 40 objects, the exact baseline 16 plus all 24 exact 23.3/23.4 CHECK constraints; relation OIDs exact, identities unique, new definitions exact and NOT VALID, baseline health unchanged, no missing/additional/changed object. |
| 35 | 23.5-S01 | `MANUAL` heading `34 - 23.5-S01` | `74b7179a16b4cc4c3c615e2e2e16511dd994fb66fa442ff6131512093e5610ad` | `novora-fp-phase-a-resume-35-23.5-s01.png` | Exact composite-target unique index succeeds once. |
| 36 | A35-R04 | `RECOVERY` section 10 / heading `R04 - unfiltered current constraint and index catalog` | `2526d2aea62509ceb89ffc95dfd9b383aa302b4c91f9b58d5a0bf95454403d09` | `novora-fp-phase-a-resume-36-a35-r04.csv` | Immediate unfiltered assertion: exactly 41 objects, exact prior 40 plus the 23.5-S01 index; relation OIDs exact, identities unique, new index exact/unique/valid/ready/live, all prior objects unchanged, no missing/additional/changed object. |
| 37 | 23.5-S02 | `MANUAL` heading `35 - 23.5-S02` | `f1b5c748320efe877cd772800d618f9ac6a132538b91e2acfdc72e04d8b62f4f` | `novora-fp-phase-a-resume-37-23.5-s02.png` | Exact composite-target unique index succeeds once. |
| 38 | A37-R04 | `RECOVERY` section 10 / heading `R04 - unfiltered current constraint and index catalog` | `2526d2aea62509ceb89ffc95dfd9b383aa302b4c91f9b58d5a0bf95454403d09` | `novora-fp-phase-a-resume-38-a37-r04.csv` | Immediate unfiltered assertion: exactly 42 objects, exact prior 41 plus the 23.5-S02 index; relation OIDs exact, identities unique, new index exact/unique/valid/ready/live, all prior objects unchanged, no missing/additional/changed object. |
| 39 | 23.5-S03 | `MANUAL` heading `36 - 23.5-S03` | `be3f2628489d7eb33a2d07e9477c8d77e5f0fbd9c35c1f6ac5403605fb7760e3` | `novora-fp-phase-a-resume-39-23.5-s03.png` | Exact composite-target unique index succeeds once. |
| 40 | A39-R04 | `RECOVERY` section 10 / heading `R04 - unfiltered current constraint and index catalog` | `2526d2aea62509ceb89ffc95dfd9b383aa302b4c91f9b58d5a0bf95454403d09` | `novora-fp-phase-a-resume-40-a39-r04.csv` | Immediate unfiltered assertion: exactly 43 objects, exact prior 42 plus the 23.5-S03 index; relation OIDs exact, identities unique, new index exact/unique/valid/ready/live, all prior objects unchanged, no missing/additional/changed object. |
| 41 | 23.5-S04 | `MANUAL` heading `37 - 23.5-S04` | `5aa97feb78a7632b23ee5bde98676ab4c5f757ae97de59bcb7ea69699ed6ac2d` | `novora-fp-phase-a-resume-41-23.5-s04.png` | Exact output/job-brief foreign key succeeds once and remains NOT VALID. |
| 42 | A41-R04 | `RECOVERY` section 10 / heading `R04 - unfiltered current constraint and index catalog` | `2526d2aea62509ceb89ffc95dfd9b383aa302b4c91f9b58d5a0bf95454403d09` | `novora-fp-phase-a-resume-42-a41-r04.csv` | Immediate unfiltered assertion: exactly 44 objects, exact prior 43 plus `ai_sketch_outputs_job_brief_fkey`; relation OIDs exact, identities unique, new FK definition exact and NOT VALID, all prior objects unchanged, no missing/additional/changed object. |
| 43 | 23.5-S05 | `MANUAL` heading `38 - 23.5-S05` | `50fe3219c8841718f6b0a0f97a9ef3d8524526df72905fd22592928665458c00` | `novora-fp-phase-a-resume-43-23.5-s05.png` | Exact two Job lineage foreign keys succeed once and remain NOT VALID. |
| 44 | A43-R04 | `RECOVERY` section 10 / heading `R04 - unfiltered current constraint and index catalog` | `2526d2aea62509ceb89ffc95dfd9b383aa302b4c91f9b58d5a0bf95454403d09` | `novora-fp-phase-a-resume-44-a43-r04.csv` | Immediate unfiltered assertion: exactly 46 objects, exact prior 44 plus both named Job lineage FKs; relation OIDs exact, identities unique, both definitions exact and NOT VALID, all prior objects unchanged, no missing/additional/changed object. |
| 45 | 23.6-S01 | `MANUAL` heading `39 - 23.6-S01` | `b37bcc6c0d8b6ba6bfa1a2fa55b472ba65065080eaced57cee960942bfc1e62a` | `novora-fp-phase-a-resume-45-23.6-s01.png` | Exact unique/support-index statement succeeds once. |
| 46 | A45-R04 | `RECOVERY` section 10 / heading `R04 - unfiltered current constraint and index catalog` | `2526d2aea62509ceb89ffc95dfd9b383aa302b4c91f9b58d5a0bf95454403d09` | `novora-fp-phase-a-resume-46-a45-r04.csv` | Immediate unfiltered assertion: exactly 47 objects, exact prior 46 plus the 23.6-S01 index; relation OIDs exact, identities unique, new index exact/valid/ready/live, all prior objects unchanged, no missing/additional/changed object. |
| 47 | 23.6-S02 | `MANUAL` heading `40 - 23.6-S02` | `4f7bbaf2df1ec0a17e1cdedd8d612a8d2760b1bf1dbefe6eb81c80af495655c0` | `novora-fp-phase-a-resume-47-23.6-s02.png` | Exact unique/support-index statement succeeds once. |
| 48 | A47-R04 | `RECOVERY` section 10 / heading `R04 - unfiltered current constraint and index catalog` | `2526d2aea62509ceb89ffc95dfd9b383aa302b4c91f9b58d5a0bf95454403d09` | `novora-fp-phase-a-resume-48-a47-r04.csv` | Immediate unfiltered assertion: exactly 48 objects, exact prior 47 plus the 23.6-S02 index; relation OIDs exact, identities unique, new index exact/valid/ready/live, all prior objects unchanged, no missing/additional/changed object. |
| 49 | 23.6-S03 | `MANUAL` heading `41 - 23.6-S03` | `26191b3b066c6077712d080f86b917c3030621e62e22c54edd8984c71bf743ff` | `novora-fp-phase-a-resume-49-23.6-s03.png` | Exact unique/support-index statement succeeds once. |
| 50 | A49-R04 | `RECOVERY` section 10 / heading `R04 - unfiltered current constraint and index catalog` | `2526d2aea62509ceb89ffc95dfd9b383aa302b4c91f9b58d5a0bf95454403d09` | `novora-fp-phase-a-resume-50-a49-r04.csv` | Immediate unfiltered assertion: exactly 49 objects, exact prior 48 plus the 23.6-S03 index; relation OIDs exact, identities unique, new index exact/valid/ready/live, all prior objects unchanged, no missing/additional/changed object. |
| 51 | 23.6-S04 | `MANUAL` heading `42 - 23.6-S04` | `b0b9d7c289d86145c7dd7438a98ad4914d807e3a5bcc884dafa530555eee1cad` | `novora-fp-phase-a-resume-51-23.6-s04.png` | Exact unique/support-index statement succeeds once. |
| 52 | A51-R04 | `RECOVERY` section 10 / heading `R04 - unfiltered current constraint and index catalog` | `2526d2aea62509ceb89ffc95dfd9b383aa302b4c91f9b58d5a0bf95454403d09` | `novora-fp-phase-a-resume-52-a51-r04.csv` | Immediate unfiltered assertion: exactly 50 objects, exact prior 49 plus the 23.6-S04 index; relation OIDs exact, identities unique, new index exact/valid/ready/live, all prior objects unchanged, no missing/additional/changed object. |
| 53 | 23.6-S05 | `MANUAL` heading `43 - 23.6-S05` | `114af88f24bc06527aa858fe6e9075982133a8fdc960e370bec91dc05a6506c6` | `novora-fp-phase-a-resume-53-23.6-s05.png` | Exact unique/support-index statement succeeds once. |
| 54 | A53-R04 | `RECOVERY` section 10 / heading `R04 - unfiltered current constraint and index catalog` | `2526d2aea62509ceb89ffc95dfd9b383aa302b4c91f9b58d5a0bf95454403d09` | `novora-fp-phase-a-resume-54-a53-r04.csv` | Immediate unfiltered assertion: exactly 51 objects, exact prior 50 plus the 23.6-S05 index; relation OIDs exact, identities unique, new index exact/valid/ready/live, all prior objects unchanged, no missing/additional/changed object. |
| 55 | 23.6-S06 | `MANUAL` heading `44 - 23.6-S06` | `f77a3b96c0fabdfb6717f4ebd988ff22c0f91de557b1e6493e90560df1034e5b` | `novora-fp-phase-a-resume-55-23.6-s06.png` | Exact unique/support-index statement succeeds once. |
| 56 | A55-R04 | `RECOVERY` section 10 / heading `R04 - unfiltered current constraint and index catalog` | `2526d2aea62509ceb89ffc95dfd9b383aa302b4c91f9b58d5a0bf95454403d09` | `novora-fp-phase-a-resume-56-a55-r04.csv` | Immediate unfiltered assertion: exactly 52 objects, exact prior 51 plus the 23.6-S06 index; relation OIDs exact, identities unique, new index exact/valid/ready/live, all prior objects unchanged, no missing/additional/changed object. |
| 57 | 23.6-S07 | `MANUAL` heading `45 - 23.6-S07` | `6ec796a3a9329ce0b06263923d1b0f578dc1197c88ed42ae44fcf187f6477ba6` | `novora-fp-phase-a-resume-57-23.6-s07.png` | Exact unique/support-index statement succeeds once. |
| 58 | A57-R04 | `RECOVERY` section 10 / heading `R04 - unfiltered current constraint and index catalog` | `2526d2aea62509ceb89ffc95dfd9b383aa302b4c91f9b58d5a0bf95454403d09` | `novora-fp-phase-a-resume-58-a57-r04.csv` | Immediate unfiltered assertion: exactly 53 objects, exact prior 52 plus the 23.6-S07 index; relation OIDs exact, identities unique, new index exact/valid/ready/live, all prior objects unchanged, no missing/additional/changed object. |
| 59 | 23.6-S08 | `MANUAL` heading `46 - 23.6-S08` | `7a3b3b2a8c090e55c80e05f75d753e665c3ae1b50b5bcd125328ab7ca8a20d85` | `novora-fp-phase-a-resume-59-23.6-s08.png` | Exact unique/support-index statement succeeds once. |
| 60 | A59-R04 | `RECOVERY` section 10 / heading `R04 - unfiltered current constraint and index catalog` | `2526d2aea62509ceb89ffc95dfd9b383aa302b4c91f9b58d5a0bf95454403d09` | `novora-fp-phase-a-resume-60-a59-r04.csv` | Immediate unfiltered assertion: exactly 54 objects, exact prior 53 plus the 23.6-S08 index; relation OIDs exact, identities unique, new index exact/valid/ready/live, all prior objects unchanged, no missing/additional/changed object. |
| 61 | 23.6-S09 | `MANUAL` heading `47 - 23.6-S09` | `82483af631469d290144b8a793c9c4a0179b522aa28526db75a5879f26950cd4` | `novora-fp-phase-a-resume-61-23.6-s09.png` | Exact unique/support-index statement succeeds once. |
| 62 | A61-R04 | `RECOVERY` section 10 / heading `R04 - unfiltered current constraint and index catalog` | `2526d2aea62509ceb89ffc95dfd9b383aa302b4c91f9b58d5a0bf95454403d09` | `novora-fp-phase-a-resume-62-a61-r04.csv` | Immediate unfiltered assertion: exactly 55 objects, exact baseline 16 plus all 39 candidate objects; relation OIDs exact, identities unique, all definitions/properties/validation/health exact, no missing/additional/changed object. |
| 63 | V01-A | `MANUAL` heading `48 - V01-A` | `806c8935f4e41661d1bcfef55e52346125534aa11e8e8a19d3936dfcfb9a28f1` | `novora-fp-phase-a-resume-63-v01-a.csv` | Baseline total 17, expected added total 52, actual candidate total 52; every drift/missing/unexpected/duplicate/type/nullability/default/shape count 0. |
| 64 | V01-B | `MANUAL` heading `49 - V01-B` | `1f9fa5012c1dec24c381732eca0c614c044fbadec636f78042f95f20c51dc730` | `novora-fp-phase-a-resume-64-v01-b.csv` | Every named Job invariant count and invalid-job-row count 0. |
| 65 | V02 | `MANUAL` heading `50 - V02` | `e68b2fc113384d0ca9678eb6302a078266fd380d4551b5685df20cd75ca7082a` | `novora-fp-phase-a-resume-65-v02.csv` | Exactly 32 filtered constraint rows: 5 exact validated baseline constraints and all 27 named candidate constraints with exact reviewed definitions and NOT VALID; step 62 is the authoritative unfiltered no-additional-object proof. |
| 66 | V03 | `MANUAL` heading `51 - V03` | `093679155d0e0c32904dbd0ab02748954c6dccb9b232339b2e9c292f6058e038` | `novora-fp-phase-a-resume-66-v03.csv` | Exactly all 12 named candidate indexes with exact reviewed definitions; all valid, ready, live; step 62 is the authoritative unfiltered no-additional-object proof. |
| 67 | V04 | `MANUAL` heading `52 - V04` | `024ccfa94327d6bfe01798a9cc6e6f426d815d931f69f1aab0e91071fe1a37bb` | `novora-fp-phase-a-resume-67-v04.csv` | Every asset, validation, gate, readiness, current, revocation, ownership, privacy, lifecycle, and chronology violation count 0. |
| 68 | V05 | `MANUAL` heading `53 - V05` | `6f56cea6d1392d104d8b2b1e13ae294fd7ccaa387a7b70a1c2851517774fee73` | `novora-fp-phase-a-resume-68-v05.csv` | Every duplicate-invariant count 0. |

## 8. L01 - fresh candidate-object and external-lock assertion

Canonical SHA-256:
`26e397288814cca6260d138d1d464dc643599c270b9ccc74ddec7f91853828f8`

```sql
WITH targets AS (
  SELECT
    relation.oid AS relation_oid,
    relation.relname AS table_name
  FROM pg_catalog.pg_class relation
  JOIN pg_catalog.pg_namespace namespace
    ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relkind IN ('r', 'p')
    AND relation.relname IN (
      'ai_sketch_jobs',
      'ai_sketch_outputs',
      'ai_sketch_reviews'
    )
),
candidate_names (object_name) AS (
  VALUES
    ('ai_sketch_jobs_status_check'),
    ('ai_sketch_jobs_attempt_policy_check'),
    ('ai_sketch_jobs_reserved_identity_completeness_check'),
    ('ai_sketch_jobs_lineage_shape_check'),
    ('ai_sketch_jobs_hash_format_check'),
    ('ai_sketch_jobs_attempt_timing_check'),
    ('ai_sketch_jobs_terminal_timestamp_check'),
    ('ai_sketch_jobs_status_terminal_consistency_check'),
    ('ai_sketch_jobs_failure_category_check'),
    ('ai_sketch_jobs_retry_eligibility_check'),
    ('ai_sketch_jobs_cost_check'),
    ('ai_sketch_jobs_first_preview_request_profile_check'),
    ('ai_sketch_jobs_provider_request_identity_check'),
    ('ai_sketch_outputs_integrity_shape_check'),
    ('ai_sketch_outputs_asset_persistence_check'),
    ('ai_sketch_outputs_asset_validation_status_check'),
    ('ai_sketch_outputs_asset_validation_consistency_check'),
    ('ai_sketch_outputs_automatic_gate_status_check'),
    ('ai_sketch_outputs_automatic_gate_consistency_check'),
    ('ai_sketch_outputs_readiness_status_check'),
    ('ai_sketch_outputs_current_preview_consistency_check'),
    ('ai_sketch_outputs_readiness_timestamp_state_check'),
    ('ai_sketch_outputs_readiness_chronology_check'),
    ('ai_sketch_outputs_ready_evidence_check'),
    ('ai_sketch_jobs_parent_lineage_fkey'),
    ('ai_sketch_jobs_source_output_lineage_fkey'),
    ('ai_sketch_outputs_job_brief_fkey'),
    ('ai_sketch_jobs_id_brief_uidx'),
    ('ai_sketch_jobs_parent_lineage_target_uidx'),
    ('ai_sketch_outputs_source_target_uidx'),
    ('ai_sketch_jobs_idempotency_key_uidx'),
    ('ai_sketch_jobs_attempt_identity_uidx'),
    ('ai_sketch_jobs_provider_request_uidx'),
    ('ai_sketch_jobs_one_active_purpose_uidx'),
    ('ai_sketch_outputs_one_per_job_uidx'),
    ('ai_sketch_outputs_one_current_customer_preview_uidx'),
    ('ai_sketch_jobs_parent_job_id_idx'),
    ('ai_sketch_outputs_readiness_lookup_idx'),
    ('ai_sketch_reviews_ai_sketch_output_id_idx')
),
actual_candidate_objects AS (
  SELECT targets.table_name, constraint_object.conname AS object_name
  FROM targets
  JOIN pg_catalog.pg_constraint constraint_object
    ON constraint_object.conrelid = targets.relation_oid
  JOIN candidate_names candidate
    ON candidate.object_name = constraint_object.conname
  UNION ALL
  SELECT targets.table_name, index_relation.relname
  FROM targets
  JOIN pg_catalog.pg_index index_metadata
    ON index_metadata.indrelid = targets.relation_oid
  JOIN pg_catalog.pg_class index_relation
    ON index_relation.oid = index_metadata.indexrelid
  JOIN candidate_names candidate
    ON candidate.object_name = index_relation.relname
),
current_database_identity AS (
  SELECT database_object.oid AS database_oid
  FROM pg_catalog.pg_database database_object
  WHERE database_object.datname = current_database()
),
external_locks AS (
  SELECT
    targets.table_name,
    count(locks.locktype) AS external_lock_count,
    count(locks.locktype) FILTER (WHERE locks.granted IS FALSE)
      AS waiting_external_lock_count
  FROM targets
  CROSS JOIN current_database_identity database_identity
  LEFT JOIN pg_catalog.pg_locks locks
    ON locks.locktype = 'relation'
   AND locks.database = database_identity.database_oid
   AND locks.relation = targets.relation_oid
   AND locks.pid IS DISTINCT FROM pg_catalog.pg_backend_pid()
  GROUP BY targets.table_name
)
SELECT
  targets.table_name,
  targets.relation_oid::text AS relation_oid,
  count(candidate.object_name) AS candidate_object_count,
  locks.external_lock_count,
  locks.waiting_external_lock_count
FROM targets
JOIN external_locks locks USING (table_name)
LEFT JOIN actual_candidate_objects candidate USING (table_name)
GROUP BY
  targets.table_name,
  targets.relation_oid,
  locks.external_lock_count,
  locks.waiting_external_lock_count
ORDER BY targets.table_name;
```

Expected: exactly 3 rows; relation OIDs jobs `17602`, outputs `17619`, reviews
`17641`; `candidate_object_count`, `external_lock_count`, and
`waiting_external_lock_count` are 0 for every row. Duplicate/missing relation
identities, any candidate object, any lock, or any other universal mismatch is
an immediate STOP. Run L01 immediately before 23.3-S01.

## 9. Candidate execution and assertion boundary

Odd-numbered steps 31-61 are the 16 individually committed DDL statements.
Each is followed immediately by its even-numbered unfiltered R04 catalog assertion;
the next DDL is prohibited until that assertion passes. A success at one step
does not authorize continuing after a later failure. STOP leaves any earlier
successful statement in place; do not roll it back or compensate. Preserve all
evidence for a new reconciliation and separately reviewed decision packet.

V01-V05 are assertions only. They do not validate the NOT VALID constraints.
Even after V05 passes, block 23.7 remains NOT EXECUTED and all candidate CHECK
constraints remain NOT VALID as designed for this Phase A scope.

After V05, do not execute any other SQL. Return the complete external evidence
set and sanitized manifest for independent reconciliation. Successful evidence
may support recording the approved Phase A scope as complete, but does not by
itself authorize block 23.7 or application work.

## 10. Explicit exclusions

This packet does not authorize:

- `23.1-S01` or `23.2-S01` retry;
- any direct B11 start using stale evidence;
- block 23.7 or constraint validation;
- replacement SQL, extra preflight, ad hoc query, repair, backfill, data edit,
  DELETE, rollback, or cleanup;
- ACL, default-privilege, RLS, policy, trigger, function, or Storage change;
- customer/business-row inspection beyond the exact approved aggregate queries;
- Provider call, generated asset, environment/configuration change, deployment,
  application rollout, email, payment, or customer-visible behavior;
- Codex, MCP, CLI, script, or automated database execution.

Any such action requires a new immutable packet, independent review, and
separate exact human approval.
