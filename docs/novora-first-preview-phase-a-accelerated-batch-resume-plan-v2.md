# NOVORA First Preview Phase A Accelerated Batch Resume Plan v2

Date: 2026-07-17

Status: **FROZEN FOR SEPARATE BATCH APPROVALS - NO SQL AUTHORIZED**

## 1. Decision and current state

The remaining Phase A Resume workflow is changed from one statement, one
reconciliation, one packet, and one documentation PR to eight fail-closed
batches. Repeating the complete documentation lifecycle for every remaining
low-risk SELECT did not provide proportionate risk reduction. The accelerated
structure removes that per-SELECT overhead while preserving the controls that
matter: immutable SQL identities, individual manual execution, exact evidence,
independent reconciliation, DDL/assertion adjacency, and a separate human
approval for each batch.

This plan starts from merged `origin/main`
`3d18ef7ab1424190a3d1b2b013265cd1bddef0b3`. PR #221 was merged from reviewed
head `50fe22c2fab3e56d1f1e0a221d2ce0e36de94205`.

Resume Steps 01-07 are complete with independently reconciled PASS evidence.
The completed Step 07 supplement is
`novora-fp-phase-a-resume-step-07-m03-continuation-08-manifest-v1.json`, `12025`
bytes, SHA-256
`b1b9161bc89704ee97eac7ba93aa6d403b21f2fc18bc7854514a5d0ab8a61381`.
That completed evidence remains immutable and is not rerun by this plan.

Resume Steps 08-68 remain `not_run`. Phase A Resume remains **STOPPED** and
Phase A remains **STOPPED**. Merging this plan or any batch packet authorizes no
SQL. Each batch requires its own exact post-merge Owner approval.

The historical
`docs/novora-first-preview-phase-a-step-08-m04-continuation-packet-v1.md` at Git
blob `8798f99fb50ed57e951a92ddd4f53704e6e178fa` remains immutable, unapproved,
and unexecuted. It is preserved as historical documentation. It is superseded
for future execution only after this accelerated plan and the Batch 01 packet
are independently reviewed, merged, and separately approved. It must not be
used to release Step 08.

## 2. Immutable sources and statement contract

The remaining sequence and its exact expected results are frozen in:

- Resume Packet:
  `docs/novora-first-preview-phase-a-resume-packet-v1.md`, Git blob
  `98e6b4a70fba66e317b57fd6f6bfc1bb3274bc85`.
- MANUAL source:
  `docs/novora-first-preview-schema-phase-a-owner-manual-execution-sequence-v1.md`,
  Git blob `1d7ee46755254e6c01ac125793ecbd9bf3451204`.
- RECOVERY source, where the Resume Packet incorporates R04:
  `docs/novora-first-preview-phase-a-read-only-recovery-packet-v1.md`, Git blob
  `e853e2992f4d556a1d41b089006bdd288aa2d7bc`.
- Resume Packet section 8, where the packet freezes L01.

Every statement retains its exact frozen source blob, source heading, complete
SQL text, canonical byte length, canonical SHA-256, PASS filename, ERROR
filename, expected result, and sequence position. A batch packet may reproduce
those identities for Owner convenience but cannot alter or substitute them.
Canonicalization remains exactly the Resume Packet rule: normalize line endings
to LF; trim statement whitespace; require and remove exactly one terminal
semicolon; trim the body; append one semicolon and one LF; hash the UTF-8 bytes
without a BOM.

## 3. Exact eight-batch map

Execution order is the order shown. A step appears in exactly one batch.

| Batch | Scope | Exact ordered Resume steps |
| --- | --- | --- |
| 01 | Access posture | `08/M04`, `09/M05`, `10/M06` |
| 02 | Existing lifecycle and relationship baseline | `11/B01`, `12/B02`, `13/B03`, `14/B04`, `15/B05`, `16/B06`, `17/B07`, `18/B15`, `19/B17` |
| 03 | Candidate readiness and lock preflight | `20/B08`, `21/B09`, `22/B10`, `23/B11`, `24/B12`, `25/B13`, `26/B14`, `27/B16`, `28/B18`, `29/B19`, `30/L01` |
| 04 | CHECK-constraint additions | `31/23.3-S01`, `32/A31-R04`, `33/23.4-S01`, `34/A33-R04` |
| 05 | Composite targets and lineage constraints | `35/23.5-S01`, `36/A35-R04`, `37/23.5-S02`, `38/A37-R04`, `39/23.5-S03`, `40/A39-R04`, `41/23.5-S04`, `42/A41-R04`, `43/23.5-S05`, `44/A43-R04` |
| 06 | First support-index group | `45/23.6-S01`, `46/A45-R04`, `47/23.6-S02`, `48/A47-R04`, `49/23.6-S03`, `50/A49-R04`, `51/23.6-S04`, `52/A51-R04`, `53/23.6-S05`, `54/A53-R04` |
| 07 | Final support-index group | `55/23.6-S06`, `56/A55-R04`, `57/23.6-S07`, `58/A57-R04`, `59/23.6-S08`, `60/A59-R04`, `61/23.6-S09`, `62/A61-R04` |
| 08 | Final verification and Phase A evidence decision | `63/V01-A`, `64/V01-B`, `65/V02`, `66/V03`, `67/V04`, `68/V05` |

Coverage proof:

- Batch counts are `3 + 9 + 11 + 4 + 10 + 10 + 8 + 6 = 61`.
- The first mapped step is 08 and the last is 68, inclusive: `68 - 8 + 1 = 61`.
- Within each batch, step numbers are strictly increasing.
- Each batch begins at the integer immediately after the preceding batch ends:
  `08`, `11`, `20`, `31`, `35`, `45`, `55`, `63`.
- The corresponding ends are `10`, `19`, `30`, `34`, `44`, `54`, `62`, `68`.
- Therefore the union is exactly the contiguous set 08-68, with zero omitted
  steps and zero duplicate steps, and the frozen Resume order is preserved.

Batch 08 contains only the six frozen SELECT-only final verification statements
and the final evidence decision after their results are reconciled. Block 23.7
constraint validation is excluded from every batch and remains NOT EXECUTED.

## 4. Batch approval and manual execution rules

One separately reviewed and separately approved batch may authorize all and only
the exact statements listed in that batch. The approval must bind the merged
`origin/main`, PR number, reviewed exact head, batch-packet Git blob, immutable
Resume/MANUAL/RECOVERY identities as applicable, and every statement identity.
Merging documentation is never execution approval.

For an approved batch, the Owner must:

1. establish the packet-defined quiet window;
2. capture one fresh visual context gate before the first statement;
3. execute each exact statement manually and individually, in batch order, with
   one ordinary `Run` action;
4. never combine statements, add comments, add a transaction wrapper, edit
   identifiers, substitute SQL, or use a generic Retry action;
5. verify the source blob, heading, canonical byte length, canonical SHA-256,
   and expected result before each execution;
6. export or capture the exact selected evidence artifact immediately after
   each PASS before proceeding; and
7. stop all SQL after the batch completes or stops, pending one independent
   evidence reconciliation.

The single context artifact may support the entire batch only while the quiet
window remains active; visible project, environment, database, selected role,
row limit, and target controls remain unchanged; and no refresh, reconnection,
context drift, warning, error, transport/fetch failure, or export failure
occurs. The visual artifact proves only the controls it visibly contains. Any
packet reliance on earlier SQL evidence or Owner attestations must be explicit.

## 5. Fail-closed STOP rule

STOP immediately on any target, quiet-window, context, source-blob, heading,
canonical-byte-length, canonical-hash, filename, evidence, row, header,
duplicate, result, definition, OID, completeness, truncation, warning, SQL
error, transport/fetch, export, or packet-defined mismatch.

After a STOP:

- do not retry, repair, compensate, roll back, clean up, or execute any
  remaining statement;
- preserve the successful earlier statements and every selected artifact;
- record the failed item exactly and mark every later batch item `not_run`;
- keep Phase A Resume and Phase A `STOPPED`; and
- require independent reconciliation plus a newly reviewed decision before any
  new SQL attempt.

For Batches 04-07, every DDL and its immediately following R04 assertion form an
atomic evidence pair. Run the assertion immediately after the DDL. The next DDL
is prohibited unless that assertion passes exactly. No reconciliation PR is
inserted between a DDL and its assertion; one reconciliation follows completion
or STOP of the whole batch. Earlier durable DDL is not rolled back or
compensated after a later STOP.

## 6. Evidence, manifest, and review contract

Each completed or stopped batch produces exactly:

- one fresh context artifact;
- one mutually exclusive selected evidence artifact for every attempted
  statement and no placeholder for a `not_run` statement;
- one combined sanitized external batch manifest;
- one independent read-only evidence review;
- one durable project-ledger update; and
- one documentation-only reconciliation PR.

There is no packet, manifest, approval sentence, reconciliation cycle, or PR per
individual SELECT. Raw evidence remains outside Git and must not be modified,
renamed, normalized, copied into Git, or deleted.

The combined manifest must bind the exact approval, merged commit, reviewed PR
head, packet/source identities, context proof and attestations, selected file
identities, expected results, actual outcomes, last successful/failed item,
later `not_run` items, and every exclusion. It must contain only sanitized
catalog/aggregate evidence. CSV output does not prove submitted SQL bytes;
`actual_canonical_sql_sha256` and `canonical_hash_equality` remain null unless
the selected artifact genuinely proves the complete reconstructable submitted
bytes.

## 7. Progress target and continuation

The planned remaining Phase A path has no more than eight additional human SQL
execution gates: one per batch. It has no per-SELECT documentation PR, no
per-SELECT approval sentence, and no per-SELECT reconciliation cycle. This is a
progress target, not a calendar completion promise.

After independently reconciled Batch 08 evidence supports Phase A completion,
the long-running NOVORA Goal immediately resumes the First Preview MVP
application critical path: the review-output linkage compatibility fix,
server-only jobs/outputs/review-linkage persistence, private generated assets,
approved provider adapter behind the paid-call gate, automatic readiness and
revocation gates, customer route/UI, and required tests. It must not enter
additional planning-only loops merely because Phase A is complete.

## 8. Permanent exclusions

This plan and its merge do not authorize Codex, MCP, CLI, script, or automated
Supabase access or SQL execution. They do not authorize any statement outside a
separately approved batch; block 23.7; constraint validation; replacement or ad
hoc SQL; retry; repair; compensation; backfill; DML; customer or business-row
inspection; rollback; cleanup; ACL/default-privilege/RLS/policy/trigger/function
or Storage changes; Provider or generated-asset actions; Production or
environment changes; deployment; application rollout; email; payment;
customer-visible behavior; or deletion of a branch, worktree, packet, manifest,
evidence artifact, or other retained material.
