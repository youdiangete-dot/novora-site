# NOVORA First Preview Phase A Repair Evidence Reconciliation v1

Date: 2026-07-16

Status: **RECONCILED - INDEPENDENT REVIEW PASSED**

## 1. Outcome

The exact approved Phase A STOPPED Repair Packet v1 completed successfully.
The live catalog evidence after X01 contains all 17 frozen `23.2-S01` output
columns with their exact reviewed definitions. The pre-repair and post-repair
table-empty assertions passed, and the exact five pre-existing output-table
objects remained unchanged and healthy. Repair status is `COMPLETE`; Phase A
status remains `STOPPED`.

This reconciliation does not prove why the earlier `23.2-S01` editor success
was followed by a missing-column failure at B11. The historical cause remains
`NOT PROVEN`.

No raw evidence is stored in Git. The selected artifacts and sanitized manifest
remain external in the Owner-controlled evidence folder.

## 2. Immutable authorization and source identities

- Approved pre-execution `origin/main`:
  `28625b345908a3ed372dfc650219253e828a2f28`
- PR #207 reviewed head:
  `3b7cb61afbf53f63a698279ba704632d50ff8131`
- Repair packet Git blob:
  `98017d94ec4711ed673cde9c75a9e8f0947850dc`
- Repair packet raw-file SHA-256:
  `8f63c74c5a11a8c90c44f6d8ed9be956d00e95c6a8595d4083bd0c5979a27acd`
- Recovery manifest SHA-256:
  `43916fa5dad233c15aad2865c602ccbe75fbe28380440bfd51077ac29f1cba5d`
- Exact repair approval record merge commit:
  `28625b345908a3ed372dfc650219253e828a2f28`
- Frozen Agent 70B-2 source Git blob:
  `714a30d16760dc98602dcbd8dc92d8785895811c`
- Frozen Agent 70B-2 source raw SHA-256:
  `4763a425a9e22098a3dd43d3773c8352d83fd201b72d48dd116d7f9619cceecc`

The Owner attested that execution targeted `novora-production`, Primary
Database (`postgres`), schema `public`, as role `postgres`, with SQL Editor row
limit `1000`, under the approved quiet window.

## 3. External sanitized manifest

- Filename: `novora-fp-phase-a-repair-09-manifest-v1.json`
- SHA-256:
  `cbffdbb90ada2f897fa7fe558add2e8a8f5a65bbf03e9ae780f7406832cf5575`
- Repair status: `COMPLETE`
- Phase A status: `STOPPED`
- Repair reconciliation status:
  `COMPLETE_WITH_CORRECTED_PHASE_0_ARTIFACT_HASH`

The manifest lists exactly one selected artifact for Phase 0 and each of P01,
P02, P03, P04, X01, A01, A02, and A03. It records actual file hashes, byte
sizes, CSV headers, row and duplicate counts, sanitized results, expected SQL
hashes, evidence-limited actual SQL hashes, execution order, and exclusions.

## 4. Phase 0 reported-hash correction

The Owner-provided text reported Phase 0 artifact SHA-256
`d019dff65dfad0b88e29b2f7258b1e041f23710a7264fd736aaf00add1d747fe`.
Repeated hashing of the selected file in place produced
`01c551e5970f938a7f664424dfe53479af3af57cd15059aba5e089d4a88b06dd`.
No file in the approved evidence folder had the reported hash.

The selected screenshot's visible content independently passed the Phase 0
context gate: correct project, Production/main context, Primary Database,
`postgres` role, row limit `1000`, and blank unexecuted editor. The sanitized
manifest preserves both values, identifies the discrepancy as a corrected
reported-hash error, and uses only the recomputed file hash as the actual
artifact identity. This correction does not change or reconstruct the image.

## 5. Step reconciliation

| Step | Artifact SHA-256 | Rows | Duplicates | Result |
| --- | --- | ---: | ---: | --- |
| Phase 0 | `01c551e5970f938a7f664424dfe53479af3af57cd15059aba5e089d4a88b06dd` | n/a | n/a | PASS with reported-hash correction |
| P01 | `c90988f8b2f53013930aedfb46b829fb211c3114f916f4290b6f7e0ee675b99d` | 1 | 0 | PASS: exact approved context and output relation OID `17619` |
| P02 | `47ab7dae392ee4f1c855ff0f466f570122644180082db5e02ce2e60ac5a2e157` | 1 | 0 | PASS: exact original 8 output attributes, no candidate or dropped attributes |
| P03 | `698c73f962816472f428aa3c5d507b33a3332ab20dfe3629f6d8321b91a0c3b6` | 1 | 0 | PASS: output row count 0 |
| P04 | `ed4798c51a5f7974b1bd0f7970debbeaf3929b126e8d2f0f3a9f653aa131a470` | 1 | 0 | PASS: exact 5 objects, all healthy, external/waiting locks 0 |
| X01 | `f729fa021570d96b26f38fac9fca53f0f522021b2b92568eaccd909c4e62838f` | n/a | n/a | PASS: complete exact statement visible; editor success; no warning/error |
| A01 | `dd72c571b7280e2fa49a1ec818069c33161ad1a328011a86f65e5528850a0556` | 1 | 0 | PASS: exact 25 output attributes, all 17 additions durable |
| A02 | `698c73f962816472f428aa3c5d507b33a3332ab20dfe3629f6d8321b91a0c3b6` | 1 | 0 | PASS: output row count remains 0 |
| A03 | `ed4798c51a5f7974b1bd0f7970debbeaf3929b126e8d2f0f3a9f653aa131a470` | 1 | 0 | PASS: exact 5 objects preserved, all healthy, external/waiting locks 0 |

The P03/A02 files are byte-identical, as expected for the unchanged empty-table
aggregate. The P04/A03 files are byte-identical, as expected for the preserved
object and lock state.

CSV evidence does not independently prove submitted SQL bytes. Accordingly,
the manifest leaves actual canonical SQL hash and equality null for CSV steps.
The complete X01 screenshot supports a visual reconstruction of the exact
frozen statement and canonical hash
`4db11692e2e0147e23772f6649d6250786bf23fcaa2542d48d1d001f3e6561b4`;
A01 separately proves durable catalog persistence.

## 6. Verified facts and limits

Verified:

- all 35 frozen `23.1-S01` job columns remain present from the completed
  recovery evidence;
- X01 executed once according to the Owner attestation and the single selected
  X01 evidence artifact;
- all 17 frozen `23.2-S01` output columns are now durably present with exact
  definitions;
- `ai_sketch_outputs` remained empty through the repair;
- the five existing output constraints/indexes were preserved and healthy;
- no external or waiting output-table lock was present at the approved lock
  checks;
- B11, B12+, blocks 23.3-23.7, V01-V05, rollback, cleanup, Provider, Storage,
  deployment, application rollout, and customer-visible behavior were not
  executed under the repair approval.

Not proven:

- the historical cause of the first 23.2/B11 contradiction;
- that any prior approval remains reusable;
- that current preconditions for B11 or later steps will remain valid without
  fresh checks.

## 7. Independent review

A separate read-only reviewer re-hashed all ten exact external originals at the
start and end of one uninterrupted audit. Both snapshots matched the manifest
and each other. The reviewer independently inspected both screenshots, parsed
every CSV and the manifest, recomputed all repair SQL hashes, verified frozen
packet/source identities and Git ancestry, checked sanitization and execution
order, and returned PASS.

One earlier reviewer context could not continuously see the external Desktop
folder and failed closed. That was an agent-specific access limitation, not
evidence of deletion: the successful reviewer used continuous exact-path
start/end snapshots, and the primary reconciliation independently observed the
same unchanged bytes. No inaccessible partial review was used as evidence.

## 8. Decision boundary

The exact next safe action is not a direct B11 retry. It is a separately
reviewed, separately approved resume packet beginning with fresh fail-closed
context, catalog, size/count, access, data-compatibility, and lock preflights.
The completed `23.1-S01` and `23.2-S01` statements must not be executed again.

This document does not authorize SQL, Supabase access, a retry, a resume,
rollback, cleanup, Provider, Storage, deployment, application code, or any
customer-visible action.
