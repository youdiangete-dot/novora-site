# NOVORA CURRENT AUTHORITY — Project Rules

- **Status:** CURRENT AUTHORITY
- **Version:** 2026-09-10
- **Purpose:** Unify controlling NOVORA project rules, resolve conflicts with
  historical documents, chats, and Memory, and prevent superseded product rules
  from becoming future implementation authority.

This is a **RULE AUTHORITY**. It is not a live branch, pull request, deployment,
or progress ledger. Mutable implementation and environment state remains in the
current project ledger and freshly verified evidence. The NOVORA Commercial
Website Completion Contract in `AGENTS.md` remains the sole authority for final
commercial completion semantics.

## 1. Authority Precedence

The effective order of authority is:

1. The Owner's newest explicit CURRENT AUTHORITY decision.
2. `docs/novora-current-authority-project-rules.md`.
3. The newest exact task-specific authorized instruction.
4. The current project ledger and explicitly authorized Git baseline.
5. `AGENTS.md` and active NOVORA operating skills.
6. Historical project documents and implementation notes.
7. Older chats, summaries, Memory, archived notes, and assumptions.

A lower-priority source MUST NOT override a higher-priority source. Mutable
repository, remote, deployment, service, security, API, legal, pricing, and
environment facts must still be freshly verified; this rules authority is not
evidence that a feature is implemented, merged, deployed, configured, or live.

## 2. Mandatory First Preview Supersession

Any older document, chat, Memory, summary, checklist, runbook, implementation
plan, PR note, milestone, prompt, or historical source that says or implies any
of the following is **SUPERSEDED / HISTORICAL ONLY** for initial First Preview
visibility:

- First Preview must wait for human review before customer visibility.
- First Preview is internal-only.
- First Preview is email-only.
- Each generated First Preview requires per-image human pre-approval.
- `approved_for_customer` is required before initial First Preview visibility.
- Human review must occur before the initial customer website display.

These statements MUST NOT be used as current implementation, code-review,
merge, product, or test authority. Historical records may remain for audit and
must not be physically deleted merely because they contain superseded rules.

## 3. Current Automatic-Gates-First First Preview Flow

The controlling product flow is:

```text
Customer Concept Brief
  -> successful persistence
  -> automatic First Preview trigger
  -> structured Design Spec
  -> Hand Sketch Instruction
  -> AI First Preview generation
  -> required automatic gates
  -> trusted first_preview_ready
  -> immediate authorized customer website visibility
  -> customer feedback
  -> human structural review, correction, and refinement afterward
  -> downstream human-controlled CAD, quotation, payment, order, and production
```

Successful and verifiable Concept Brief persistence automatically enters First
Preview generation. Raw customer prose is not the final provider prompt;
provider input is derived from structured design requirements and a Hand Sketch
Instruction.

## 4. `first_preview_ready` And `approved_for_customer`

These concepts are not equivalent:

- `first_preview_ready` is trusted automatic readiness for the initial First
  Preview. It permits immediate visibility to the exact authorized customer
  only after every required automatic gate passes.
- `approved_for_customer` is a separate, later human-review/downstream approval
  status for formal customer-safe material or communication.

`approved_for_customer` MUST NOT gate initial First Preview visibility.
Per-image human pre-approval is NOT required before the initial trusted First
Preview becomes visible. AI generation success alone does not establish
`first_preview_ready`; all required automatic gates must still pass. No review
record may be automatically promoted to `approved_for_customer`.

The legal AI-sketch review statuses remain:

- `internal_draft_not_generated`
- `draft_generated_internal_only`
- `needs_revision`
- `approved_for_customer`

`pending` is not a legal AI-sketch review status unless a newer authority
changes that contract. `approved_for_customer` is separate from gallery
approval, and generation success alone is not human approval.

## 5. Automatic Safety, Privacy, Access, Output, And Failure Boundaries

Before `first_preview_ready`, trusted server-side evidence must establish, where
applicable:

- safety;
- privacy and leakage protection;
- access control;
- exact customer identity;
- exact Concept Brief identity;
- exact Output identity and lineage;
- output validity;
- a successful linked generation job;
- trusted, private asset ownership, integrity, and availability; and
- safe-failure behavior with no false-success state.

Missing, invalid, malformed, stale, contradictory, ambiguous, revoked, or
cross-identity evidence fails closed. Provider completion, a generated asset,
an `assetId`, a URL, a client boolean, or a syntactically valid
`publicReference` is not sufficient by itself. Client input cannot advance a
trusted lifecycle state or authorize asset access.

## 6. Human Review After First Preview

Human review remains mandatory in NOVORA's downstream design workflow, but its
correct position is after initial First Preview visibility. It covers:

- structural and jewelry-geometry correctness;
- manufacturability, setting, prong, and collision review;
- mismatch correction, redraw, regeneration, and refinement;
- customer-feedback interpretation and formal customer-safe material; and
- downstream CAD, quotation, sourcing, payment, order, and production
  decisions.

First Preview is concept communication only. It is not CAD approval, final CAD,
a quotation, payment approval, order approval, production approval, or a
manufacturability guarantee.

## 7. OpenAI And Provider Boundaries

The current simplified official-API MVP architecture is:

```text
NOVORA server-side runtime / Vercel -> official OpenAI API
```

Sub2API and Japan Gateway are not required for this simplified MVP unless a
newer CURRENT AUTHORITY explicitly restores them.

`OPENAI_API_KEY` is server-side only. It must never be `NEXT_PUBLIC`, exposed to
the browser/client, emitted in API output, logged, committed, placed in
screenshots or fixtures, or pasted into Chat.

A real paid provider call requires a separately authorized execution gate.
Preparing a Design Spec, Hand Sketch Instruction, provider implementation, or
tests does not authorize a live or paid OpenAI request.

## 8. Vercel, Production, And Environment Boundaries

Separate explicit Owner approval is required for Production deployment,
Production mutation, Production environment-variable changes, Secret changes,
paid provider activation, and material live Production probes.

Merge, deployment, provider activation, and Production probe are distinct gates
and must not be silently chained. The existence of a Secret or environment
value in Vercel does not prove deployed code uses it.

## 9. Supabase, Private Storage, And Customer Data

Live SQL, schema, migration, RLS, grants, policies, Storage policy, and customer-
data mutations require separately bounded explicit authorization. Service-role
credentials remain server-side.

Generated First Preview assets remain private-storage assets. Customer access
must be mediated by trusted server authorization and exact identity binding;
AI asset storage must not be made public merely to simplify delivery.

## 10. One-Step Scope Brake v1.2

The active Scope Brake requires:

- exactly one acceptance question per Work task;
- exactly one execution gate;
- WIP = 1;
- `PASS`, `BLOCKED`, or `INSUFFICIENT_EVIDENCE` followed by STOP;
- no "if PASS, automatically continue" instruction;
- no running-task expansion; and
- reuse of accepted evidence when relevant hashes, diff, and environment
  identity remain unchanged.

Build, focused validation, TypeScript, staging, commit, push, PR creation, PR
review, Ready transition, merge, deployment, runtime probe, rollback, and
cleanup remain separate gates.

## 11. No-Infinite-Expansion Rule

Only a finding that directly blocks the currently locked endpoint may create a
new bounded correction gate. Unrelated historical findings, optional
refactoring, wording or style preferences, speculative improvements, unrelated
worktrees, non-blocking warnings, post-MVP ideas, and revalidation of unchanged
evidence do not automatically create more NOVORA work.

Do not create endless chains of diagnosis, broadened scope, more documentation,
more reviews, more tests, more cleanup, and another diagnosis. A narrow blocker
gets one narrow correction.

## 12. Git, Branch, PR, And Preserved-Worktree Rules

- Canonical repository: `C:\Projects\NOVORA\novora-site`.
- Repository remote: `https://github.com/youdiangete-dot/novora-site.git`.
- Copied repositories with broken or foreign worktree metadata are not
  authority.
- Verify Base, Head, SHA, and merge-base before PR operations. Do not assume
  `main` is the correct Base when active work is explicitly on another
  integration lineage.
- Preserved worktrees must not be cleaned, reset, restored, stashed, deleted,
  or reused without exact authorization.
- `out/codex-worktrees/**` is operational worktree storage, not canonical root
  application source.
- Use path-specific staging; do not use `git add .` by default.
- Stage, commit, push, PR creation, review, merge, deploy, and cleanup remain
  distinct execution gates.
- Do not force-push without an explicitly authorized recovery case.

## 13. Validation And Evidence Reuse

Use the narrowest validation that proves the current acceptance question. Do
not repeatedly rerun accepted validation when the relevant source hashes, diff,
and environment identity are unchanged. Rerun only when material evidence has
changed or prior validation did not execute.

Known generated development residue must not automatically create new product
investigation unless it directly blocks the locked endpoint.

## 14. Jewelry Global Structural Rules

- Center-stone and accent-stone table orientation must remain structurally
  valid.
- Directional center stones retain the same 3D orientation across front, side,
  profile, section, stacking, and enlarged-detail views; no accidental
  90-degree center-stone rotation is allowed.
- Local and detail geometry must agree with overall geometry.
- Stacking relationship diagrams use front-facing stacking elevation /
  正面叠戴层级示意图.
- Open stacking rings wrap the center stone from the left and right with
  realistic clearance.
- Avoid main-ring/companion-ring collision and front/side/detail structural
  contradictions.
- Preserve appropriate setting families when different stone positions require
  different settings.
- Explicit single-earring intent must not be automatically changed into a pair.
- AI concept output is not production CAD.

## 15. Current Material And Product Guardrails

- Do not introduce 10K Gold unless explicitly restored.
- Do not introduce unsupported material, stone, chain, or pricing claims
  without matching product and data authority.
- A Concept Brief is not an order, quotation, CAD approval, or Production
  confirmation.
- Historical machine-woven-chain thickness restrictions must not be
  generalized into unrelated fine structural gold-wire design rules.

Named design-specific rules may remain named design-specific authorities, but
they must not be generalized into unrelated product rules unless the Owner
explicitly does so.

## 16. Historical-Document Policy

Historical documents do not need to be deleted. Preserve useful factual and
audit history, but treat superseded product direction as non-authoritative.
Future Chat, Work, and Codex tasks must not interpret internal-only, email-only,
human-review-before-display, or `approved_for_customer`-before-first-preview as
the current initial First Preview rule.

## 17. NOVORA FIRST PREVIEW — CURRENT AUTHORITY

A successfully persisted Concept Brief automatically enters First Preview
generation.

Provider input is derived from structured design requirements and a Hand Sketch
Instruction.

The generated First Preview becomes customer-visible only after all required
automatic safety, privacy, access-control, exact-identity, output-validity, and
safe-failure gates pass and trusted state becomes `first_preview_ready`.

Per-image human pre-approval is NOT required before initial First Preview
visibility.

`approved_for_customer` remains a separate later human-review/downstream status
and MUST NOT gate initial First Preview visibility.

Human review remains required after First Preview for structural correction,
jewelry manufacturability, refinement, and downstream formal decisions.

First Preview is concept communication only; it is not CAD, quotation, payment,
order, production approval, or a manufacturability guarantee.

## 18. Mandatory Anti-Regression Rule

Before any future task changes First Preview visibility, First Preview customer
access, review-status semantics, or human-review timing, the task MUST check
this document.

If a proposed implementation reintroduces either relationship:

```text
approved_for_customer -> required before initial First Preview
```

or:

```text
human review -> required before initial First Preview display
```

it MUST be classified as **PRODUCT-RULE REGRESSION** unless the Owner has
explicitly issued a newer CURRENT AUTHORITY decision.

## 19. Authority Maintenance

This document controls rules, not live progress. Branch tips, PR state,
deployment state, environment state, Production behavior, validation results,
and remaining work belong in the current project ledger and fresh evidence.
Historical material may link here but must not copy or reinterpret this
authority in a way that creates competing current rules.
