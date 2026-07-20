# NOVORA First Preview MVP Critical Path Cutline v3

Date: 2026-07-20

Status: **FROZEN PRODUCT/EXECUTION CUTLINE - NO SQL AUTHORIZED**

## 1. Decision

This cutline replaces only the future execution mapping for Phase A Resume
Steps 20-68. It preserves every completed artifact, manifest, review, and
durable database change through Batch 02.

The former Accelerated Batch Resume Plan v2 Batch 03-08 map is superseded for
future execution because it contains a blocking temporal-preflight defect and
because it carries post-beta hardening into the First Preview MVP critical
path. It must not be used to freeze, approve, or execute another batch.

The remaining database path is reduced to exactly three separately reviewed,
separately approved, fail-closed human execution gates:

1. `MVP-CORE-1` - Core-only SELECT preflight.
2. `MVP-CORE-2` - uninterrupted L01-Core, Core DDL, and immediate assertions.
3. `MVP-CORE-3` - Core constraint validation and final verification.

After `MVP-CORE-3` evidence passes independent reconciliation and is recorded
on merged `main`, the MVP database phase is complete. No additional
planning-only packet, mapping, or review loop may block application
implementation.

Merging this document authorizes no SQL, Supabase connection, schema change,
validation, or application rollout.

## 2. Authoritative completed baseline

This cutline starts from merged `origin/main`
`7eb3ee20cce8d920591d236dd3e1de0fa2c91de2`, the normal merge of PR #224 at
reviewed head `32258555a38694d885a1c96aae16172d0fa05206`.

The following completed state remains immutable:

- Stage A existing-table ACL correction: complete; rollback not executed.
- Stage B `postgres` future-public-table default privileges: complete;
  rollback not executed.
- Phase A repair of frozen `23.2-S01`: complete; historical failure cause not
  proven.
- Phase A Resume Steps 01-19: independently reconciled PASS.
- Batch 01 manifest:
  `novora-fp-phase-a-resume-batch-01-m04-m06-11-manifest-v2.json`, `23043`
  bytes, SHA-256
  `f04d60c5f1e86def72a9a5b6cef56788fd1668a9dc7475a81678cffeab88feef`.
- Batch 02 manifest:
  `novora-fp-phase-a-resume-batch-02-b01-b17-20-manifest-v2.json`, `21342`
  bytes, SHA-256
  `08cce41ec14d7c91730ce2d3ad2a513c7a50079786327d525ee5cf750a69c7dc`.
- Batch 02 proves the current Job and Output tables are empty, relationship and
  review-status violation counts are zero, no job has more than one output,
  and no unreviewed lifecycle status is present.
- Resume Steps 20-68 remain `not_run`.
- Block 23.7, rollback, cleanup, retry, and post-Batch-02 SQL remain not
  executed.
- Phase A Resume and Phase A remain `STOPPED`.

Raw evidence remains external. This cutline does not replace, rewrite, copy,
normalize, or delete any packet, manifest, branch, worktree, or evidence file.

## 3. Critical temporal-preflight defect

Accelerated Batch Resume Plan v2 maps:

- Batch 03: Steps 20/B08 through 30/L01.
- Batch 04: Step 31/`23.3-S01` and its later assertions.

The same plan requires a combined manifest, independent evidence review,
ledger update, documentation PR, merge, and separate Owner approval between
batches. The frozen Resume Packet requires L01 to run **immediately before**
`23.3-S01`.

L01 is a point-in-time candidate-object and lock assertion. A reconciliation,
PR, approval boundary, refresh, reconnection, context change, or multi-hour/day
delay after L01 can make its result stale before the dependent DDL. Therefore
the former mapping defeats its own preflight even if Batch 03 and Batch 04 each
pass in isolation.

Permanent reusable rule:

> A lock, candidate-object, or temporal preflight must run in the same
> uninterrupted execution gate immediately adjacent to its dependent DDL. No
> reconciliation, manifest, PR, approval gate, refresh, reconnection, context
> switch, or long delay may occur between preflight PASS and DDL execution.

For future mapping purposes, the Step 30/L01 slot and the Step
31/`23.3-S01` slot move into `MVP-CORE-2`. Because the old grouped
`23.3-S01` contains deferred hardening, its executable SQL is not reused; a new
Core-only Job CHECK statement occupies the dependent DDL slot. L01 must likewise
be frozen as `L01-CORE` against the exact new Core object set.

## 4. Supersession boundary

The following remain authoritative historical sources and evidence contracts:

- `docs/novora-first-preview-phase-a-resume-packet-v1.md`, Git blob
  `98e6b4a70fba66e317b57fd6f6bfc1bb3274bc85`.
- `docs/novora-first-preview-schema-phase-a-owner-manual-execution-sequence-v1.md`,
  Git blob `1d7ee46755254e6c01ac125793ecbd9bf3451204`.
- `docs/novora-first-preview-phase-a-accelerated-batch-resume-plan-v2.md`, Git
  blob `64f5e128ba0e4de0d59e7357d788e4c159f6bb4c`.
- Every completed Resume Step 01-19 artifact and reconciliation record.

Only the unexecuted future Plan v2 Batch 03-08 mapping is superseded. Old
Steps 20-68 remain useful as reviewed source material, but no old batch packet,
statement grouping, cumulative object total, or final expected-object set may
be executed or asserted unchanged after this cutline.

In particular:

- Old `23.3-S01` adds 13 Job CHECKs, including deferred feedback-lineage,
  lifecycle, cost/pricing, Provider-profile, and Provider-request hardening.
  It must be replaced by a new immutable Core-only ALTER.
- Old `23.4-S01` adds 11 Output CHECKs, including deferred non-ready-state and
  full revocation chronology. It must be replaced by a new immutable Core-only
  ALTER.
- Old B13, B14, B16, and B19 cannot be reused wholesale because future-only
  failures must not block MVP Core.
- Old L01 does not know the new Core review/output/brief composite objects. A
  new exact `L01-CORE` is required.
- Old cumulative R04 totals and V01-V05 expected sets are invalid after object
  selection changes. Core-only assertions must derive the actual set
  independently from the verified baseline plus the exact Core object set.

No replacement SQL is frozen by this document. Every executable statement
requires a later immutable packet with complete SQL, canonical bytes, SHA-256,
expected results, evidence filenames, STOP rules, and independent review.

## 5. MVP_CORE_REQUIRED

MVP Core retains only database enforcement directly required for the limited
beta First Preview read/write path.

### 5.1 Job status and non-draft First Preview identity

Freeze new Core-only Job CHECK statements for:

1. Valid status vocabulary:
   `draft`, `queued`, `processing`, `succeeded`, `failed`, `timed_out`, and
   `cancelled`.
2. Complete non-draft First Preview identity:
   - `generation_purpose = 'first_preview'`;
   - `attempt_number` limited to `1` or `2` for `first_preview` only;
   - non-null idempotency key and `first-preview:v1` lineage identity;
   - nonblank Design Spec and Hand Sketch Instruction versions;
   - valid Design Spec, instruction, and idempotency hashes;
   - attempt 1 is the root: `parent_job_id`, parent-purpose and parent-attempt
     snapshots, and `source_output_id` are all null; and
   - attempt 2 is the single bounded retry: `parent_job_id` is non-null, its
     parent-purpose and parent-attempt snapshots are exactly `first_preview`
     and `1`, and `source_output_id` is null.
3. Legacy `draft` rows remain allowed only with the frozen nullable identity
   posture required by the current empty-table baseline.

The immutable packet must preserve that exact `first_preview` attempt range and
bounded root/retry lineage. It must not reintroduce feedback-regeneration
attempts 2-3 or source-output chains.

### 5.2 Idempotency and active-job uniqueness

Retain:

- `ai_sketch_jobs_idempotency_key_uidx` on non-null `idempotency_key`.
- `ai_sketch_jobs_attempt_identity_uidx` on
  `(concept_brief_id, attempt_number)` where `attempt_number` is non-null. Core
  permits only `first_preview`, so this prevents duplicate
  `(concept_brief_id, generation_purpose, attempt_number)` identities.
- `ai_sketch_jobs_one_active_purpose_uidx` on
  `(concept_brief_id, generation_purpose)` for only `queued` and `processing`.

Together with the server-only repository contract, these enforce deterministic
reservation identity and at most one active First Preview job per
brief/purpose. Completed rows remain queryable and are never directly deleted.

### 5.3 Job, output, review, and brief consistency

Retain or add:

- `ai_sketch_jobs_id_brief_uidx` on `(id, concept_brief_id)`.
- `ai_sketch_jobs_parent_lineage_target_uidx` on
  `(id, concept_brief_id, generation_purpose, attempt_number)`.
- A new Core-only composite parent-lineage FK that requires an attempt-2 Job's
  parent to be the same brief's exact `first_preview` attempt 1. The old grouped
  parent/source statement must not be reused because source-output lineage is
  deferred.
- `ai_sketch_jobs_parent_job_id_idx` for the bounded retry lookup and parent-FK
  child-side path.
- `ai_sketch_outputs_job_brief_fkey` from `(job_id, concept_brief_id)` to Jobs.
- A new unique target index on Outputs `(id, concept_brief_id)`.
- A new composite Review FK from
  `(ai_sketch_output_id, concept_brief_id)` to Outputs
  `(id, concept_brief_id)`.
- Existing separate Review-to-Output and Review-to-Brief FKs remain in place.
- `ai_sketch_reviews_ai_sketch_output_id_idx` for the actual review-linkage
  lookup and FK child-side path.

The new composite Review FK is required because two separate FKs prove that
both rows exist but do not prove that the Review and Output belong to the same
Concept Brief.

### 5.4 Output uniqueness and current-preview uniqueness

Retain:

- `ai_sketch_outputs_one_per_job_uidx` on `job_id`.
- `ai_sketch_outputs_one_current_customer_preview_uidx` on
  `concept_brief_id` where `is_current_customer_preview IS TRUE`.

### 5.5 First Preview readiness evidence

Freeze new Core-only Output CHECKs that enforce:

1. Valid readiness vocabulary.
2. A current marker is allowed only for `first_preview_ready`.
3. Every `first_preview_ready` row has complete persisted private-asset,
   validated PNG integrity, automatic-gate evidence and policy version, passed
   timestamps, ordered readiness timestamp, safe bucket/object locator, and
   content hash evidence.
4. A ready row and current marker cannot contradict each other. For the first
   limited beta, the immutable predicate must explicitly review both directions
   (`current -> ready` and `ready -> current`) rather than silently retaining
   the old one-way implication.
5. A revoked row can never remain current. Full revocation chronology remains
   deferred, but application behavior must fail closed and revoke access
   immediately.

The Core ready-evidence predicate protects customer-visible readiness. It does
not attempt to enforce every intermediate non-ready lifecycle state.

### 5.6 Indexes used by actual MVP paths

| MVP path | Required supporting object |
| --- | --- |
| Reserve or fetch by deterministic idempotency | `ai_sketch_jobs_idempotency_key_uidx` |
| Reject a concurrent active First Preview job | `ai_sketch_jobs_one_active_purpose_uidx` |
| Reject a duplicate brief/attempt reservation | `ai_sketch_jobs_attempt_identity_uidx` |
| Resolve and enforce the bounded attempt-2 parent | parent lineage target/FK plus `ai_sketch_jobs_parent_job_id_idx` |
| Persist exactly one output per job | `ai_sketch_outputs_one_per_job_uidx` |
| Resolve the single current preview for a brief | `ai_sketch_outputs_one_current_customer_preview_uidx` |
| Enforce and query Review-to-Output linkage | composite Review FK plus `ai_sketch_reviews_ai_sketch_output_id_idx` |
| Enforce cross-brief Job/Output linkage | Jobs composite target plus Output composite FK |

Existing primary keys and existing Concept Brief indexes remain unchanged. No
additional support index belongs in Core without an actual MVP query path.

## 6. POST_MVP_HARDENING

The following are explicitly deferred until after the first limited beta. They
remain valid future design work, not MVP database exit blockers.

### 6.1 Feedback and extended lineage

- Feedback-regeneration attempts 2-3.
- `ai_sketch_jobs_lineage_shape_check` branches beyond the bounded Core
  attempt-1 root and attempt-2 retry posture.
- `ai_sketch_outputs_source_target_uidx` where used only by lineage.
- Source-output-lineage foreign keys.
- Recursive cycle and extended-lineage preflights.

### 6.2 Provider, pricing, and extended job lifecycle enforcement

- Cost/pricing constraints and pricing-assumption enforcement.
- Provider-request uniqueness and Provider-request identity CHECKs.
- Pinned request-profile CHECK enforcement beyond the server-only adapter.
- Full attempt timing, terminal timestamp exclusivity, failure category,
  retry-eligibility, and complete status/timestamp chronology CHECKs.

Until hardening, the server-only repository/transition layer is the sole
enforcer for non-ready transition, timeout, failure, and retry semantics. No
browser write path or broader database grant is permitted.

### 6.3 Extended Output lifecycle and revocation chronology

- General non-ready integrity-shape enforcement.
- Intermediate asset-persistence and validation-state CHECKs.
- Intermediate automatic-gate state-machine CHECKs.
- Full readiness timestamp-state and revocation chronology.
- Historical revocation-event chronology beyond immediate safe access denial.
- `ai_sketch_outputs_readiness_lookup_idx` unless a measured production query
  demonstrates it is required.
- Any other support index unused by the actual limited-beta read/write path.

Core still requires complete evidence before `first_preview_ready` and forbids
a revoked/current contradiction. Deferral must never allow unvalidated output
to become customer-visible.

## 7. Revised three-gate database plan

### Gate MVP-CORE-1 - Core-only SELECT preflight

Purpose: prove the current empty/baseline state is compatible with only the
Core objects.

The new immutable packet must contain the minimum SELECT-only checks for:

- nullable legacy/core identity posture;
- idempotency duplicates;
- attempt-identity duplicates;
- bounded root/retry shape and same-brief parent mismatch counts;
- current-preview duplicates;
- Core-only Job CHECK predicates;
- Core-only ready/current Output predicates;
- one-active-job duplicates;
- one-output-per-job duplicates;
- Job/Output/Review/Brief mismatch and orphan counts;
- exact composite target/FK compatibility; and
- absence of every proposed Core object before execution.

Do not let Provider-request, feedback-regeneration/source-output lineage,
pricing, extended lifecycle, full revocation chronology, or unused-index checks
block Core. Gate 1 is SELECT-only and ends with one reconciliation lifecycle.

### Gate MVP-CORE-2 - L01-Core plus Core DDL

Purpose: install only the exact Core CHECKs, unique indexes, composite targets,
and foreign keys.

Mandatory sequence rule:

1. Establish one uninterrupted quiet window and fresh context.
2. Execute `L01-CORE` as the first executable database statement in the DDL
   portion of the gate.
3. After L01-Core PASS, execute the new Core-only Job CHECK ALTER occupying the
   former Step 31/`23.3-S01` dependent-DDL slot immediately.
4. Do not reconcile, create a manifest, open or merge a PR, seek another
   approval, refresh, reconnect, change context, or permit a long delay between
   steps 2 and 3.
5. After each Core DDL, execute its exact unfiltered catalog assertion before
   the next DDL.
6. Reconcile only after the whole gate completes or STOPs.

Any warning, SQL error, lock, context change, identity mismatch, unexpected
object, assertion failure, or evidence failure stops the entire gate. Do not
retry, repair, compensate, roll back, clean up, or continue.

### Gate MVP-CORE-3 - Core validation and database exit verification

Purpose: validate only Core NOT VALID CHECKs/FKs and prove the final limited-
beta database contract.

The immutable packet must:

- validate only the named Core constraints and FKs;
- prove every Core constraint exists with exact definition and is validated;
- prove every Core unique/support index is unique as required, valid, ready,
  and live;
- prove all Core invalid-row, duplicate, orphan, and cross-brief mismatch
  counts are zero;
- derive actual candidate objects independently from the verified baseline and
  exact Core set;
- prove no unexpected hardening object was installed;
- prove relation identities, baseline objects, ownership, grants, default
  privileges, RLS, policies, routines, and triggers remain unchanged; and
- exclude full block 23.7, DML, backfill, repair, rollback, cleanup, Storage,
  Provider, environment, deployment, and customer-data inspection.

## 8. Database-phase exit condition

The database portion of the First Preview MVP is complete only when all of the
following are independently evidenced and recorded on merged `main`:

1. Batch 02 remains reconciled PASS and stable.
2. `MVP-CORE-1` passes every exact Core compatibility preflight.
3. `MVP-CORE-2` proves L01-Core adjacency, every Core DDL, and every immediate
   catalog assertion.
4. `MVP-CORE-3` proves every Core CHECK/FK validated and every Core index
   healthy.
5. Core invalid-row, duplicate, orphan, cross-brief, ready-evidence, and
   current-marker violation counts are zero.
6. Baseline relation identities, access posture, RLS/policy posture, routines,
   triggers, and existing healthy objects are unchanged.
7. No post-MVP hardening, full block 23.7, DML, repair, rollback, cleanup,
   Storage, Provider, environment, deployment, or customer action occurred.
8. Each gate has one sanitized manifest, stable independent review, and durable
   ledger merge.

At that point record:

- `FIRST_PREVIEW_MVP_DATABASE_CORE = COMPLETE`.
- `POST_MVP_DATABASE_HARDENING = DEFERRED_NOT_EXECUTED`.
- Legacy full Phase A remains historical; it must not be used to claim that
  deferred hardening was executed.

This is a real limited-beta exit. Real Supabase repository integration may
begin immediately after it. No additional planning-only loop may be introduced
as a prerequisite.

## 9. Application work permitted before database exit

After this cutline merges, a separate low-risk application PR may add:

- a server-only First Preview persistence/repository interface;
- an in-memory/fake implementation;
- focused tests for reservation, output persistence, idempotency,
  ready/not-ready behavior, and safe failure; and
- a fail-closed Production binding that does not construct a real repository.

It must not connect to Supabase, call a real Provider, use credentials, write
Storage, inspect customer data, modify environment variables, deploy, or make
customer-visible behavior live.

The fake foundation is not proof of database readiness and does not bypass any
of the three database gates.

## 10. Next human gate

After this cutline and the fake-only application foundation merge, stop at:

**HUMAN GATE - MVP CORE DATABASE GATE 1 PACKET REQUIRED**

Exact Owner action:

> APPROVE PREPARATION AND INDEPENDENT REVIEW OF ONE IMMUTABLE NOVORA FIRST
> PREVIEW MVP-CORE-1 SELECT-ONLY PREFLIGHT PACKET AGAINST THE MERGED CUTLINE;
> DO NOT EXECUTE SQL, DO NOT REUSE THE FORMER BATCH 03 PACKET OR APPROVAL, AND
> RETURN THE NEW PACKET'S EXACT MERGED-MAIN, PR-HEAD, BLOB, STATEMENT-HASH,
> EVIDENCE, STOP, AND EXCLUSION IDENTITIES FOR SEPARATE EXECUTION APPROVAL.

The subsequent execution approval must bind the later reviewed immutable
packet. This cutline itself is not that approval.

## 11. Permanent exclusions

This document authorizes no Supabase connection, SQL, Retry, DDL, validation,
DML, backfill, repair, rollback, cleanup, ACL/default-privilege/RLS/policy/
trigger/function/Storage change, customer-row inspection, Provider call,
generated asset, credential or environment change, deployment, email, payment,
customer-visible behavior, or branch/worktree/evidence/artifact deletion.
