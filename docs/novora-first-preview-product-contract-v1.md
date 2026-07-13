# NOVORA First Preview Product Contract v1

## 1. Purpose And Status

This document defines the product and trust contract for NOVORA's first AI
hand-drawn concept preview after Agent 68A / PR #192. It translates the locked
instant-first-preview direction into lifecycle, evidence, access, state,
failure, human-review, idempotency, retry, and cost boundaries.

This is a docs-only contract. It does not prove that the contract is implemented
and does not authorize implementation. Current Production has no real AI image
generation API, `/design/preview/[public_reference]` remains mock-only, and the
submitted-page preview entry remains a demo/mock connection.

Agent 69A does not modify app code, tests, schema, SQL, Supabase, Storage,
provider integration, APIs, UI, environment variables, deployment, Production,
real image generation, or customer data.

## 2. Product Positioning

The first AI preview is part of NOVORA's internal concept-preview process. The
runtime orchestration, provider request and response, raw generated asset,
validation evidence, internal prompts, provider metadata, reviewer notes, and
private storage locations remain internal.

Only a sanitized first concept preview for which every required automatic gate
has trusted evidence may become visible through a future secure customer-access
mechanism. That early preview may become visible without per-image human
pre-approval under the locked post-Agent-60I direction. It remains an early
concept direction for communication and feedback, not a formal downstream
approval or final deliverable.

The first AI preview is not:

- CAD or CAD-ready output.
- A quotation or final price.
- Payment confirmation.
- An order or order approval.
- Production approval or a manufacturability guarantee.
- Gallery approval, publication consent, or public-use permission.

Paid CAD, quotation, payment, order, sourcing, and production decisions remain
separate, offline, and human-controlled. `approved_for_gallery` remains a
separate consent, privacy, curation, and publication decision.

## 3. Lifecycle Contract

The target end-to-end lifecycle is:

```text
Concept Brief
  -> Design Spec
  -> Hand Sketch Instruction
  -> Preview Job
  -> Provider Processing
  -> Asset Generated
  -> Safety Validation
  -> Human Review
  -> Customer Delivery Eligible
```

This sequence contains two different visibility boundaries that must not be
collapsed:

1. **First concept-preview visibility:** after generation and all required
   automatic safety, privacy, identity, asset, access, and false-success gates
   pass, the runtime may decide `first_preview_ready`. Per-image human approval
   is not a prerequisite for this early preview under the locked direction.
2. **Formal customer-delivery eligibility:** human review may later set
   `approved_for_customer` for a formal, human-approved customer-safe artifact
   or downstream communication. This is not a prerequisite for the first early
   concept preview and is not CAD, quotation, payment, order, production, or
   gallery approval.

The lifecycle stages have these responsibilities:

- **Concept Brief:** the server-confirmed customer intake record. A local draft,
  `persisted: false`, an unconfirmed response, or a `429` is not a persisted
  Concept Brief and must not start preview generation.
- **Design Spec:** the validated, versioned internal source of truth derived
  from the persisted brief.
- **Hand Sketch Instruction:** the validated, versioned rendering instruction
  derived from and consistent with the Design Spec.
- **Preview Job:** the idempotent orchestration record reserved before any
  provider call in a future persistence implementation.
- **Provider Processing:** a bounded server-side provider operation. It is not
  customer-visible success.
- **Asset Generated:** an untrusted candidate output until independent asset,
  safety, privacy, and leakage checks pass.
- **Safety Validation:** server-controlled evaluation of all required automatic
  gate evidence. Provider assertions alone are insufficient.
- **Human Review:** post-preview review for jewelry structure, stone placement,
  construction, feasibility, mismatch, correction, regeneration, and later
  formal customer-safe delivery decisions.
- **Customer Delivery Eligible:** the separate human-reviewed
  `approved_for_customer` state for formal delivery. It is not gallery, CAD,
  quotation, payment, order, or production approval.

## 4. Evidence And Trust Principles

Every required gate must have all three of the following:

- An identified server-side **evidence producer** with authority for that gate.
- A defined **validation point** before a readiness decision or asset release.
- A fail-closed **failure behavior** that produces `not_ready` or a specific
  failure state without exposing the candidate asset.

The following are not authoritative evidence by themselves:

- A browser or client-provided boolean.
- A provider returning `completed`.
- A provider-provided safety or privacy boolean without server-side trust and
  normalization rules.
- The presence of an `assetId`.
- The presence of any URL, including a signed-looking URL.
- A syntactically valid `publicReference`.
- A localStorage or sessionStorage record.
- A lifecycle value supplied through a customer query string.

Evidence must be scoped to the same Concept Brief UUID, `publicReference`,
Design Spec version, Hand Sketch Instruction version, job, attempt, and output.
Unknown, missing, stale, contradictory, cross-brief, or unverifiable evidence
fails closed.

## 5. Safety Gate Contract

The producers below are logical ownership boundaries for future implementation;
Agent 69A does not implement them.

| Gate | Evidence producer | Validation point | Failure behavior |
| --- | --- | --- | --- |
| Confirmed persistence | Existing server-side Concept Brief persistence result | Before job reservation and again before readiness | Do not create/invoke a preview job; return `not_ready`; never convert fallback or local state into receipt or generation success |
| Concept Brief identity | Server persistence layer using the internal Concept Brief UUID and existing `NOVORA-CB-...` reference rules | At job creation, structured artifact linkage, output linkage, and readiness | Reject mismatched, missing, invalid, or cross-brief identity; no asset release |
| Structured input validity | Server-side Design Spec and Hand Sketch Instruction validators | Before provider invocation and at readiness using the exact versioned inputs | Do not invoke the provider when invalid; mark safe failure; preserve no raw-prompt bypass |
| Structured input consistency | Server orchestration comparing reference, language, type, and version linkage | Before provider invocation and readiness | Reject inconsistent Design Spec/instruction pairs; no generation or visibility |
| Provider completion | Server-side provider adapter normalized to the provider-neutral contract | After bounded provider processing | Treat timeout, exception, cancellation, malformed response, zero/multiple images, or unknown status as failure; provider completion alone never means ready |
| Content safety | A future server-controlled content-safety evaluation step with normalized, auditable evidence | After asset generation and before any first-preview access decision | Set `validation_failed` or `not_ready`; quarantine or retain privately per a separately approved retention policy; never expose the asset |
| Privacy and leakage | A future server-controlled privacy/leakage evaluator checking customer data, prompts, metadata, reviewer/admin notes, secrets, and private paths | After provider normalization and before asset release | Fail closed, strip the candidate from the customer response, record only a sanitized failure category |
| Access eligibility | A future server-side customer-access policy evaluator | Immediately before issuing or serving customer access and on every protected asset request | Deny access without revealing asset existence or private paths; a client boolean and `publicReference` alone are insufficient |
| Asset validity | A future server-side output/storage verifier | After storage and immediately before readiness/access | Require expected ownership/linkage, existence, supported image type, integrity, safe locator, and private-access posture; an `assetId` or URL alone fails |
| Output validity | A future server-side output validator against the exactly-one-image MVP contract and required render constraints | After provider normalization and storage verification | Set `validation_failed` or `not_ready`; do not expose malformed, missing, unsupported, or multiple output assets |
| No false success | Server orchestration aggregating all current evidence | At every state transition and response that could imply readiness | Any missing or contradictory evidence forces `not_ready`; never reuse stale ready state from another attempt |
| Human review boundary | Authorized future admin/reviewer workflow operating on the exact output version | After automatic validation for correction work; before setting `approved_for_customer` | Human rejection/correction does not retroactively become CAD or production approval; keep `approved_for_customer` unset and route to correction/regeneration |

Provider-originated `contentSafetyPassed`, `privacyPassed`, and
`outputValidityPassed` fields in the Agent 68A runtime are normalized contract
inputs, not proof that independent safety, privacy, or access systems exist.
A later implementation must document how each field is produced, verified, and
bound to the exact output before it can be trusted.

## 6. `first_preview_ready` Contract

`first_preview_ready` is an automatic, fail-closed decision that a specific
sanitized output may be shown as the first early concept preview through secure
customer access. It is not automatically a database status, durable event, or
delivery receipt until a separately approved data model defines persistence.

The following must never directly set `first_preview_ready`:

- The provider returned successfully.
- The provider returned `completed`.
- An `assetId` exists or matches a string pattern.
- A URL exists, resolves, or appears signed.
- A job is `processing` or `generated`.
- The browser reports a successful request.
- A customer supplies `state=first_preview_ready` in a URL.

`first_preview_ready` requires all current, output-bound evidence to pass:

- Confirmed Concept Brief persistence.
- Valid and matching Concept Brief UUID and `publicReference`.
- Valid and mutually consistent Design Spec and Hand Sketch Instruction.
- A completed, bounded provider attempt with exactly one normalized output.
- Verified output/storage asset existence, integrity, ownership, and safe
  private-access posture.
- Passed content-safety, privacy, leakage, and output-validity checks from
  trusted server-side producers.
- Passed server-side access eligibility for the requesting customer context.
- No timeout, cancellation, duplicate conflict, invalid output, stale evidence,
  or false-success condition.

Missing or unknown evidence is failure, not a warning. A readiness decision must
be recomputed or verified at the server boundary before access is issued.

`first_preview_ready` does not require `approved_for_customer` and is unrelated
to `approved_for_gallery`. Human review remains required for correction,
regeneration, jewelry logic, manufacturability analysis, and formal downstream
delivery or approval decisions.

## 7. Access Boundary

The route-shaped `public_reference` value and app-level `publicReference` are
the same category of customer-visible identifier. Neither is:

- Authentication.
- Authorization.
- A secret.
- A bearer token.
- Proof that the requester owns or may view a Concept Brief or output.

A future customer preview must use either a narrowly scoped, expiring signed URL
or server-mediated access. In either design, the server must first verify the
requester context, Concept Brief/output linkage, current visibility decision,
expiry or revocation state, and private asset posture.

Requirements for future access implementation:

- Keep generated outputs private by default.
- Never return provider URLs, raw storage object paths, service-role URLs,
  provider metadata, prompts, reviewer/admin notes, or secrets.
- Scope access to one intended output and customer context with a short expiry.
- Revalidate access on each server-mediated request; do not trust a prior page
  render or query parameter.
- Fail without confirming whether a protected asset exists.
- Treat sharing, revocation, expiry, replay, and cache behavior as explicit
  decisions before external beta.

No access design is selected or implemented by Agent 69A.

## 8. State Machine

The candidate persistent state machine for later data-model planning is:

```text
not_started
  -> queued
  -> processing
  -> generated
  -> validation_failed

generated
  -> ready_for_review
  -> approved_for_customer
```

The states mean:

- `not_started`: no first-preview job has been reserved.
- `queued`: one idempotent first-preview job has been reserved but provider work
  has not completed.
- `processing`: provider work is active or awaiting a bounded result.
- `generated`: one candidate asset was returned or stored; automatic validation
  is not yet complete.
- `validation_failed`: required automatic evidence failed or could not be
  established. The asset is not customer-visible.
- `ready_for_review`: automatic validation completed for the exact output and
  the artifact is available to the internal human-review workflow.
- `approved_for_customer`: an authorized human made a separate formal
  customer-delivery decision for the exact output version.

`processing` must never transition directly to customer-visible output.
`generated` must never be treated as customer-visible success. Both require
completed automatic evidence evaluation first.

`first_preview_ready` is a separate automatic visibility decision for the early
concept preview. It may be established when all required automatic gates pass
and can coexist with `ready_for_review`; it does not imply the later
`approved_for_customer` state. The exact persistence mapping between the job,
output, validation, review, and visibility states belongs to Agent 69B's future
data-model planning and must not be invented in application code first.

Every state transition must be monotonic for one attempt, scoped to one output,
and recorded by an authorized server-side actor. Client input cannot advance a
state. A later revision or regeneration creates new lineage and cannot silently
inherit readiness or approval from an older output.

## 9. Idempotency, Retry, Timeout, And Cost Boundary

### Duplicate prevention

- Reserve the first-preview job before any provider call.
- Use a deterministic idempotency scope including Concept Brief UUID,
  generation purpose, Design Spec version, Hand Sketch Instruction version,
  output lineage, and first-preview attempt.
- Refreshes, redirects, polling, repeated submissions, and concurrent requests
  must reuse the active or completed job instead of creating duplicate charges.
- A customer-visible `publicReference` alone is not a sufficient idempotency
  key.

### Retry limits

- Automatic retries require a separately approved finite attempt limit.
- Retry eligibility must depend on a sanitized failure category; unsafe,
  privacy-failed, invalid-input, or access-failed results must not be blindly
  retried.
- A retry creates a new attempt/output lineage and must not inherit prior safety,
  asset, access, review, or readiness evidence.
- Manual retry/regeneration must be separately authorized and auditable.
- Agent 69A does not change existing retry or resend behavior.

### Timeout handling

- Every provider attempt requires a bounded server-side timeout and cancellation
  signal.
- Timeout or cancellation produces `not_ready`, never `generated` or
  `first_preview_ready`.
- A late provider result must not overwrite a terminal failure or newer attempt
  without explicit server-side reconciliation rules.
- Customer-facing failure remains non-technical and must not expose provider
  payloads, prompts, storage paths, or secrets.

### Cost protection

- Provider/model/quality/size, estimated cost, attempt count, and trigger source
  require future server-side recording.
- Define per-Concept-Brief generation and retry caps before live provider use.
- Enforce an invite-only beta and owner-approved budget boundary before real
  generation.
- Stop or hold generation when cost, abuse, rate-limit, or operating-owner
  limits are unknown or exceeded.
- Production rate-limit enforcement remains fail-open at the current MVP stage;
  therefore real generation and broader traffic must not proceed without a
  separately reviewed mitigation and budget decision.

No job persistence, retry loop, budget enforcement, provider call, or cost
record is implemented by this contract.

## 10. Safe Failure Contract

Failure must preserve the confirmed Concept Brief independently from preview
generation. A preview failure must not turn a persisted submission into an
unpersisted one, and a submission fallback must not be upgraded into preview
success.

Required safe behavior:

- `persisted: false`, unconfirmed persistence, local fallback, invalid identity,
  or intentional `429`: do not start generation.
- Provider exception, timeout, cancellation, malformed response, or multiple
  images: no ready state and no customer asset.
- Missing, inaccessible, cross-brief, unsafe, privacy-failed, or invalid asset:
  `validation_failed` or `not_ready`, with sanitized internal classification.
- Access denial or expired/revoked access: deny without revealing private asset
  existence or location.
- Human correction or regeneration need: preserve the early-preview boundary,
  create explicit new lineage later, and keep formal delivery approval unset.

No failure path may expose provider metadata, raw payloads, full private
prompts, customer contact data, reference-image paths, reviewer/admin notes,
secrets, or private storage locations.

## 11. Downstream Approval Separation

These concepts remain separate and must not be mapped to one status:

- Concept Brief persistence.
- Design Spec validity.
- Hand Sketch Instruction validity.
- Preview job state.
- Generated asset state.
- Automatic validation evidence.
- `first_preview_ready` early concept visibility.
- Human review and `approved_for_customer`.
- Customer feedback or revision request.
- `approved_for_gallery` consent/publication status.
- CAD, quotation, payment, order, sourcing, and production decisions.

Neither AI generation success nor human approval for customer delivery is CAD,
quotation, payment, order, production, or gallery approval.

## 12. Required Follow-Up Approval Boundaries

After Agent 69A is reviewed and merged, recommended separate work is:

1. **Agent 69B - preview data-model and SQL planning packet:** map job, attempt,
   output, validation evidence, access, review, and visibility states. Docs only;
   no SQL execution or Supabase change.
2. **Agent 69C - provider and operating decision packet:** choose provider/model,
   safety evidence, private access approach, retry and timeout limits, cost and
   budget caps, abuse/rate-limit controls, privacy disclosure, and operating
   owner. No provider, environment, Storage, or Production configuration.
3. **Later separately approved implementation Agents:** schema/SQL execution,
   provider adapter, private asset storage, access enforcement, submission/job
   trigger, preview API/UI, human review, and end-to-end QA must remain separate
   approval slices.

Do not combine SQL, provider setup, secrets, Storage/RLS, customer access, API,
UI, deployment, or Production verification into one implementation PR.

## 13. Acceptance Criteria For This Contract

This v1 contract is complete when it:

- Preserves the AI concept-preview versus CAD/quotation/payment/order/
  production/gallery boundary.
- Defines the Concept Brief through customer-delivery lifecycle.
- Assigns an evidence producer, validation point, and fail-closed behavior to
  each required gate.
- Prevents provider completion, `assetId`, URL presence, query parameters, or
  client booleans from directly creating readiness.
- States that `publicReference` is not authentication, authorization, or a
  secret.
- Separates the required state machine from `first_preview_ready`, formal human
  delivery approval, gallery approval, and production decisions.
- Defines duplicate prevention, bounded retry, timeout, and cost protection.
- Records that all implementation, provider, SQL, Storage, access, UI,
  deployment, and Production work remains unapproved and out of scope.
