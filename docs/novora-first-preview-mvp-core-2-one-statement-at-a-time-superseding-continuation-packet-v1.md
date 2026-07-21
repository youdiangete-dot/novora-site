# NOVORA First Preview MVP-CORE-2 One-Statement-at-a-Time Superseding Continuation Packet v1

Date: 2026-07-21

Status: **FROZEN - NOT APPROVED FOR EXECUTION**

This documentation-only packet supersedes only the temporal release rule in
the merged MVP-CORE-2 L01-Core Plus Core DDL Packet v1. It preserves the
accepted Phase 0 PASS and permits a strict one-statement-at-a-time Owner
workflow with independent evidence reconciliation before the next statement is
released.

This packet contains no SQL fence and does not change, regenerate, reproduce,
simplify, combine, substitute, or re-freeze SQL. Preparing, reviewing, merging,
or citing it authorizes no Supabase connection or SQL execution.

## 1. Immutable identities and stopped state

- Creation base / merged `origin/main`:
  `ae0cb6606f676b3c2206034cf2a1df897fe55272`.
- Original merged MVP-CORE-2 packet:
  `docs/novora-first-preview-mvp-core-2-l01-core-ddl-packet-v1.md`, Git blob
  `839bbd3f6f6e49b631b0faf163cbe7b27f734cd1`.
- Original packet PR #230 reviewed head:
  `760482ed458692436a3cf70e0396b16e694ea8e1`.
- Original packet merge commit:
  `ae0cb6606f676b3c2206034cf2a1df897fe55272`.
- Accepted Phase 0 artifact:
  `novora-fp-mvp-core-2-00-context.png`, `96355` bytes, SHA-256
  `59f95c6904b09ba9d6bab78749dc523490895e35cf4baf1e2aadcd2ad21cec38`.

The exact stopped state carried into this packet is:

- Phase 0: `PASS`;
- Owner-attested quiet window at STOP: active;
- Owner SQL executions: `0`;
- DDL executions: `0`;
- `L01-CORE`: `not_run`;
- D01 through `CORE2-FINAL`: `not_run`;
- retry or rerun: not performed; and
- Production database modification: none.

The Phase 0 artifact remains external evidence. It must not be copied into Git,
re-encoded, replaced, renamed, normalized, or deleted.

## 2. Exact supersession boundary

This packet changes only the temporal release contract. It replaces the
original requirement to proceed from a passed statement directly into the next
statement without an evidence-reconciliation gate.

The new contract explicitly permits, and requires, after every statement:

1. completion of the packet-defined result and evidence capture;
2. return of exactly the selected PASS or ERROR artifact to Codex;
3. independent reconciliation of that artifact against the immutable original
   packet;
4. a STOP while reconciliation is pending; and
5. release of exactly one next statement only after the preceding statement is
   independently reconciled `PASS`.

Accordingly:

- L01 PASS evidence must be returned and reconciled before D01 is released;
- every DDL result must be returned and reconciled before its immediately
  following assertion is released;
- every assertion result must be returned and reconciled before the next DDL is
  released; and
- `CORE2-FINAL` evidence must be returned for final reconciliation.

The instruction gate may include only the next statement. The Owner must not
execute a later statement merely because its SQL is visible in the original
packet or a prior conversation.

No non-temporal rule is superseded. In particular, statement identity, order,
expected results, evidence filenames, one-attempt limits, every non-temporal
original STOP rule, privacy rules, exclusions, and the final manifest contract
remain unchanged. The temporal adjacency/delay STOP behavior is superseded only
as specified in this packet, and the new release-gate STOP conditions are added.

## 3. Immutable incorporation of all 36 statements

The authoritative SQL source remains only original packet Git blob
`839bbd3f6f6e49b631b0faf163cbe7b27f734cd1`.

All 36 SQL fences are incorporated by exact immutable reference from section 5
of that blob. Their sequence names, types, canonical UTF-8 LF-only byte
lengths, canonical SHA-256 values, expected results, PASS filenames, ERROR
filenames, assertion progression, and final-result requirements are
incorporated unchanged from sections 4 through 7 of that blob.

The exact preserved sequence is:

`L01-CORE`; D01; A01; D02; A02; D03; A03; D04; A04; D05; A05; D06; A06;
D07; A07; D08; A08; D09; A09; D10; A10; D11; A11; D12; A12; D13; A13;
D14; A14; D15; A15; D16; A16; D17; A17; `CORE2-FINAL`.

Before any statement is released, the releaser must:

1. retrieve the original packet by exact Git blob identity;
2. extract only the next statement's existing SQL fence;
3. recompute its canonical byte length and SHA-256;
4. compare both values with the original packet's frozen identity table; and
5. STOP without releasing SQL on any blob, fence, byte, hash, name, sequence,
   result, or evidence mismatch.

This packet deliberately contains zero SQL fences. Any SQL fence or altered
statement identity added to this packet is a blocker and invalidates it.

## 4. One-statement-at-a-time Owner contract

After a new exact approval bound to the final merged identities, each cycle is:

1. Codex releases exactly one next statement from the original packet blob,
   with its frozen name, sequence, bytes, SHA-256, expected PASS result, PASS
   filename, ERROR filename, and STOP conditions.
2. The Owner verifies that the quiet-window and target-context attestations
   remain true, manually pastes that one statement into a blank SQL Editor, and
   executes it exactly once using ordinary `Run`.
3. The Owner captures only the packet-defined PASS or ERROR evidence and runs
   no later SQL.
4. The Owner returns the selected evidence for independent reconciliation.
5. Codex rehashes and inspects the external artifact in place, reconciles the
   complete frozen result contract, and records verified facts separately from
   unproven assumptions.
6. Only after exact PASS may Codex release exactly one next statement.

The execution attempt for a statement is consumed when the Owner uses ordinary
`Run`, regardless of whether SQL succeeds, errors, or encounters a client/API/
transport/fetch failure. There is no generic Retry, automatic retry, second
attempt, rerun, repair, compensation, or replacement evidence under this
packet.

## 5. Temporal-proof boundary and quiet-window reliance

Independent reconciliation and an instruction gate introduce an intentional
delay after every statement. This packet expressly accepts that release cadence
while preserving the original uninterrupted quiet-window requirement.

Throughout every reconciliation gap, the Owner must attest that:

- no First Preview writer, migration, schema operation, application rollout,
  or other actor targets `ai_sketch_jobs`, `ai_sketch_outputs`, or
  `ai_sketch_reviews`;
- the Supabase project remains `novora-production`;
- the branch/environment remains `main` / Production;
- Primary Database (`postgres`) remains selected;
- selected role remains `postgres`;
- SQL Editor row limit remains at least `1000`;
- no Supabase reconnect, browser refresh, SQL Editor target/context switch, or
  target-control change occurs; and
- no unapproved SQL or database action occurs.

Returning evidence to Codex and waiting for reconciliation are the only newly
permitted intervening actions. The Owner may switch to the Codex conversation
solely to return evidence, but must not change or refresh the Supabase editor
or its target controls.

The accepted Phase 0 screenshot proves only the visible controls at capture
time. L01 is a point-in-time SELECT. Neither proves future quiet-window truth or
catalog stability across a reconciliation delay. Continuation therefore relies
on the Owner's renewed attestation at every release gate. This limitation must
be included in the new exact execution approval and every evidence
reconciliation.

If the Owner cannot truthfully maintain or renew any attestation, the whole
sequence must STOP; the next and all later statements remain `not_run`.
Continuation then requires a newly reviewed immutable decision packet and
separate approval.

## 6. Preserved evidence, STOP, privacy, and manifest contracts

Every original PASS and ERROR filename remains unchanged. Each attempted
statement selects exactly one authoritative artifact. Evidence must remain in
the external evidence folder and must not be copied into Git.

Sections 8 through 10 of original packet blob
`839bbd3f6f6e49b631b0faf163cbe7b27f734cd1` are incorporated unchanged,
including deterministic STOP/`not_run`, the external sanitized manifest
contract, privacy restrictions, and explicit exclusions.

Additionally, STOP immediately on any missing or false release-gate
attestation, any execution of more than one statement before reconciliation,
or any release of a statement before the preceding evidence is independently
reconciled PASS.

On any STOP:

- preserve the exact selected artifact;
- mark the failed item `ERROR` when an execution was attempted;
- preserve the immediately preceding PASS as last PASS;
- mark every later statement `not_run`;
- execute no more SQL; and
- do not Retry, rerun, repair, compensate, backfill, validate, roll back, clean
  up, substitute SQL, combine SQL, add a transaction wrapper, use `IF NOT
  EXISTS` or `CONCURRENTLY`, or capture replacement evidence.

After `CORE2-FINAL` PASS or any earlier STOP, run no further SQL. A separately
scoped reconciliation must create only the original manifest filename:

`novora-fp-mvp-core-2-37-manifest-v1.json`

The manifest contract remains unchanged. The reconciliation must apply its
existing execution-count, outcome, quiet-window, context, and privacy fields to
the one-statement-at-a-time evidence without adding customer data, identities,
prompts, notes, object paths, URLs, images, secrets, tokens, keys, environment
values, or Provider data.

## 7. Explicit exclusions

Neither this packet nor its preparation, review, merge, or later approval
authorizes:

- Codex, MCP, CLI, script, or automation to connect to Supabase or execute SQL;
- any Owner SQL before a new exact approval bound to this packet's final merged
  identities;
- more than one Owner execution attempt per statement;
- release or execution of more than one statement before independent evidence
  reconciliation;
- Retry, rerun, repair, compensation, backfill, data edit, DELETE, rollback,
  cleanup, SQL substitution, combined SQL, transaction wrapper, `IF NOT
  EXISTS`, `CONCURRENTLY`, or replacement evidence;
- changed, regenerated, simplified, reproduced, broadened, or re-frozen SQL;
- constraint validation, `MVP-CORE-3`, block 23.7, or other DDL/DML;
- former Batch 03 material, old L01/evidence, candidate SQL, or any superseded
  approval;
- ACL, default-privilege, RLS, policy, trigger, function, routine, or Storage
  change;
- customer/business-row inspection beyond the exact frozen aggregates;
- Provider/generated-asset action, credential/secret/environment change,
  deployment, application rollout, email, payment, or customer-visible action;
  or
- branch, worktree, evidence, artifact, file, manifest, or other deletion or
  cleanup.

## 8. Independent review contract

The independent exact-head reviewer must verify:

- exactly one superseding packet PR and documentation-only scope;
- the accepted Phase 0 artifact identity and zero-execution stopped state;
- exact original packet blob identity;
- zero SQL fences in this packet;
- all 36 original fences still match their original names, sequence, canonical
  byte lengths, SHA-256 values, expected results, PASS/ERROR filenames, STOP
  rules, exclusions, and manifest contract;
- only temporal release behavior changed;
- evidence reconciliation is mandatory after every individual statement;
- one Owner attempt per statement and fail-closed behavior are explicit;
- temporal proof limitations and renewed Owner attestations are explicit; and
- no SQL, Supabase, Production, Storage, Provider, environment, deployment,
  customer-row, cleanup, or deletion action occurred during preparation.

The PR may merge only after exact-head review passes, required checks are green,
the PR changes only the superseding packet and durable ledger, and no unresolved
review thread or blocker remains.

## 9. Gate state

The current MVP-CORE-2 attempt is `STOPPED_BEFORE_SQL`; Phase 0 remains `PASS`;
all 36 statements remain `not_run`; SQL and DDL execution counts remain zero.

The earlier execution approval does not authorize the superseding temporal
release contract. After this packet is independently reviewed and merged, stop
at:

`HUMAN GATE - MVP-CORE-2 ONE-STATEMENT EXECUTION APPROVAL REQUIRED`

Only one later exact Owner approval bound to the final merged main, reviewed PR
head, this packet blob, the original packet blob, accepted Phase 0 artifact,
all preserved statement identities, the one-statement release contract, STOP
rules, and exclusions may release L01. No SQL is released by this packet.
