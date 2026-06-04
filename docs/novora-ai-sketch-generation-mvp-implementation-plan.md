# NOVORA AI Sketch Generation MVP Implementation Plan

## A. Current State

This is an implementation packet only. It does not implement real AI sketch
generation, does not add provider calls, does not add API keys, does not change
Vercel environment variables, does not execute SQL, and does not change
Supabase schema, RLS, grants, policies, or storage configuration.

Current `main` state as of Agent 31A:

- Real Concept Brief submission persistence exists through `/api/concept-briefs`.
- Customer receipt success on `/design/submitted` is gated on confirmed server
  persistence, a valid `NOVORA-CB-...` public reference, and a valid Concept
  Brief UUID.
- Final reference image upload exists on `/design/brief` and stores uploaded
  customer reference image metadata in Supabase.
- Protected `/admin/briefs` and `/admin/briefs/[publicReference]` can show
  Supabase-backed submissions after the server-side admin access gate.
- Admin notification email works for submitted Concept Briefs.
- Supabase Storage buckets listed in the project ledger include
  `novora-reference-images` and `novora-ai-sketches`.
- `/design/sketch` is still a client-side mock/placeholder experience. It reads
  browser storage and must not be treated as real generated output.
- Real AI sketch generation, CAD automation, payment, orders, customer accounts,
  and production workflow are not implemented.

Agent 31B later added
`docs/novora-ai-sketch-whitelist-credits-payment-strategy.md` as a docs-only
owner strategy packet for whitelist testing, staged direction/refinement UX,
prepaid credits, manual-to-formal payment strategy, future account requirements,
and budget guardrails. Treat that document as the business strategy companion
to this technical implementation packet.

Older planning docs may still describe backend or admin behavior as future-only.
For implementation work, `docs/novora-current-project-state.md` and current
`main` are the source of truth.

## B. MVP Goal

Build the first real AI hand-drawn concept sketch MVP as an admin-triggered,
server-controlled workflow:

- One generated concept sketch per explicit admin action in the MVP.
- Generation uses the submitted Concept Brief and optional final reference
  images attached to that persisted brief.
- Output is stored in NOVORA-controlled Supabase Storage, likely
  `novora-ai-sketches`.
- Job and output state are stored in compatible database tables, preferably
  existing `ai_sketch_jobs` and `ai_sketch_outputs` if a later verification task
  confirms they exist and match the app contract.
- Customers see a generated sketch on `/design/sketch` only when a real,
  approved, customer-visible output exists.
- All copy keeps the sketch boundary clear: concept direction only, not CAD,
  quote, order, sourcing, feasibility, or production approval.

## C. Recommended Architecture

Use a protected, server-only generation path:

- Admin detail page shows the Concept Brief, reference metadata, current sketch
  job/output state, and a generate action only after valid admin access.
- A protected server route or server action validates the admin access cookie,
  validates the Concept Brief UUID/public reference, and starts one generation
  attempt.
- A server-only prompt builder assembles a concise visual prompt from structured
  Concept Brief fields, customer-safe notes, and final reference metadata.
- A provider adapter handles mock output first, then the selected real image
  provider later.
- A storage helper copies the generated output into private Supabase Storage and
  records storage metadata.
- Admin pages can view pending, failed, and generated outputs for internal
  review.
- Customer pages read only approved/customer-visible output state and receive a
  server-mediated or signed image URL.

Do not call the provider from browser code. Do not expose provider secrets,
service-role keys, raw storage keys, private signed URLs, raw internal errors,
or unapproved outputs to customers.

## D. Data Flow

Target flow:

1. Customer completes `/design/concept` and submits `/design/brief`.
2. `/api/concept-briefs` persists the Concept Brief and returns a valid
   `publicReference` plus Concept Brief UUID.
3. Optional final reference images upload after confirmed persistence and are
   linked to that Concept Brief.
4. Admin reviews the protected detail page under
   `/admin/briefs/[publicReference]`.
5. Admin clicks generate sketch.
6. Server validates admin access, Concept Brief identity, current job/output
   state, retry limits, and provider/mock mode.
7. Server creates or updates an AI sketch job record.
8. Server builds the prompt from approved Concept Brief inputs and final
   reference metadata.
9. Provider returns one concept sketch image.
10. Server stores the image in `novora-ai-sketches` and records output metadata.
11. Admin reviews the output and marks it customer-visible only when suitable.
12. `/design/sketch` displays the real output only after approved output state
    exists; otherwise it shows a safe waiting or unavailable state.

## E. Why Admin-Triggered Generation First

Admin-triggered generation is safer than automatic generation on every customer
submit because it:

- Prevents cost spikes from spam, repeated retries, and accidental refreshes.
- Lets NOVORA avoid generating from low-quality, unsafe, or obviously incomplete
  briefs.
- Reduces risk from uploaded reference images that may contain personal,
  copyrighted, confidential, or unsuitable material.
- Keeps partner-preview and Production smoke testing from using real customer
  data by accident.
- Avoids giving customers the impression that submission automatically creates a
  finished design, CAD, quote, or production path.
- Gives the owner an explicit review point before any customer-visible AI output
  exists.

## F. Required Environment Variables

No values should be recorded in docs, PR descriptions, screenshots, or chat.

Server-only variables expected for the real implementation path:

- `OPENAI_API_KEY` or the selected provider's server-only API key.
- `NOVORA_AI_SKETCH_PROVIDER`, for example `openai` or `mock`.
- `NOVORA_AI_SKETCH_MODEL`, for the selected image generation model.
- `NOVORA_AI_SKETCH_MODE`, for future separation of `mock` and `real` behavior
  if Agent 31B uses this flag.
- `SUPABASE_STORAGE_BUCKET_AI_SKETCHES`, expected to point at
  `novora-ai-sketches`.
- Existing Supabase variables used by current persistence and storage helpers,
  including browser-visible `NEXT_PUBLIC_SUPABASE_URL` and server-only
  `SUPABASE_SERVICE_ROLE_KEY`.
- Existing admin access variable `NOVORA_ADMIN_ACCESS_KEY`.

Browser-visible variables must remain limited to already-approved
`NEXT_PUBLIC_*` values. Provider keys and service-role keys must never be
browser-visible.

## G. Supabase Storage And Database Mapping

Storage:

- Use `novora-ai-sketches` for generated sketch outputs.
- Prefer private storage with server-mediated access or short-lived signed URLs.
- Store objects under a stable, non-secret key pattern such as
  `concept-briefs/{publicReference}/ai-sketches/{jobId}/{outputId}.png`.
- Do not make the bucket public unless a separate storage-policy task approves
  that model.

Database:

- Use `ai_sketch_jobs` and `ai_sketch_outputs` only after a later approved task
  verifies the tables exist and are compatible with the current app contract.
- The current ledger does not list those tables as confirmed current tables, so
  app code must not assume them without verification.
- Minimum job fields should include Concept Brief UUID, status, trigger source,
  prompt version, provider/model, attempt count, error category, started time,
  and completed time.
- Minimum output fields should include Concept Brief UUID, job UUID, status,
  storage bucket, object path, MIME type, dimensions if available,
  customer-visible flag, provider/model metadata, and created time.
- Keep customer-visible output separate from internal generated output. Default
  outputs to internal/needs-review until admin approves.

## H. Prompt-Building Strategy

Prompt construction should be deterministic, versioned, and server-side.

Use structured Concept Brief fields when present:

- Piece type.
- Branch or jewelry family.
- Structure and sub-structure.
- Stone direction or no-stone direction.
- Metal/material direction as visual guidance only.
- Design objective, emotional intent, symbol, story, or customer notes.
- `aiSketchInstruction` when present.
- Reference notes and final reference metadata.

Prompt rules:

- Prefer concise visual language over copying raw customer prose.
- Normalize unsupported or vague fields into safe design direction.
- Include NOVORA's boundary in the prompt: exploratory hand-drawn concept
  sketch, not CAD, not photorealistic render, not quote, not production
  approval.
- Do not ask the model to include fake pricing, gemstone certification,
  manufacturing claims, brand marks, or sourcing confirmation.
- Keep prompt versions stable, for example `ai_sketch_prompt_v1`, so output can
  be audited later.
- Avoid logging full raw prompts if they include customer contact information or
  sensitive free-text notes.

## I. Reference Image Handling Strategy

Use only final reference images uploaded from `/design/brief` after confirmed
server persistence.

Do not use `/design/concept` planning-only reference names as image inputs. They
may inform text context only if already present in the persisted brief payload,
and they must still be treated as non-final planning metadata.

Reference image handling rules:

- Verify the reference asset belongs to the same Concept Brief UUID.
- Load reference images server-side through existing protected storage access,
  not from public browser URLs.
- Treat uploaded images as customer data for the current project only.
- Do not use customer images for provider/model training, public datasets, or
  general model improvement.
- Start Agent 31B in mock mode without real reference image provider calls.
- Before real reference-image input is enabled, confirm provider retention/data
  use terms, privacy copy, and owner/legal disclosure posture.

## J. Output Storage Strategy

After generation:

- Convert provider output to a controlled image format where practical, such as
  PNG or WebP.
- Store exactly one MVP output per admin-triggered job unless a later task
  explicitly adds variants.
- Save to `novora-ai-sketches` using `upsert: false` style behavior to avoid
  overwriting prior outputs.
- Record output metadata before making anything customer-visible.
- Do not store generated images in browser `localStorage`.
- Do not rely on permanent public provider URLs.
- Keep provider response metadata minimal and avoid storing secret-bearing URLs
  or raw sensitive payloads.

Customer access should use a server route or short-lived signed URL only after
the output is approved/customer-visible.

## K. `/design/sketch` Display Behavior

The customer page must not present a mock or browser-local record as a real
generated sketch.

Future behavior:

- If no confirmed persisted Concept Brief is available, show safe "not
  available" guidance and a path back to the Concept Brief flow.
- If the brief exists but no approved output exists, show a waiting/manual-review
  state.
- If output generation failed or is under admin review, show non-technical copy
  that NOVORA is reviewing the concept direction.
- If an approved output exists, display the generated image with clear boundary
  copy: AI hand-drawn concept sketch only, not CAD, not final quote, not order,
  not sourcing, not production approval.
- Do not expose internal status codes, storage object keys, provider metadata,
  prompt text, or unapproved output images to the customer.

The existing mock page can remain until the implementation slice replaces it,
but the real-output task should make the distinction impossible to miss.

## L. Admin UI Behavior

The protected admin detail page should show:

- Current AI sketch state for the Concept Brief.
- Whether generation is unavailable, mock-only, ready, generating, failed,
  needs review, approved, or rejected.
- A generate button only when admin access is valid, the brief is Supabase-backed,
  no active job is running, and retry limits allow it.
- Prompt summary or prompt version for audit without exposing unnecessary raw
  customer data.
- Final reference image count and whether references are eligible for use.
- Output preview after generation.
- Review actions: approve for customer, reject/internal only, or mark needs
  regeneration.
- Retry/regeneration affordance only with explicit admin action and capped
  attempts.

Admin copy must stay internal and manual-review framed. It must not imply CAD,
pricing, sourcing, production, fulfillment, payment, or customer email behavior.

## M. Failure, Timeout, And Retry Behavior

Recommended statuses:

- Job: `pending`, `generating`, `succeeded`, `failed`, `cancelled`.
- Output: `generated`, `storage_failed`, `needs_review`, `approved`,
  `rejected`, `archived`.
- Customer display: `waiting`, `approved_preview_available`,
  `temporarily_unavailable`, `manual_review_required`.

Failure handling:

- Provider failure should mark the job failed and show an admin-safe error
  category.
- Storage failure should not show output to customers.
- Timeout should not create duplicate jobs on refresh.
- Retry should be admin-only and capped, for example one initial generation plus
  one or two explicit retries.
- Do not add automatic retry loops in the MVP.
- Do not expose raw provider errors to customers.

## N. Cost-Control And Abuse-Control Strategy

MVP controls:

- No automatic generation on customer submit.
- One sketch per explicit admin action.
- Mock provider first in Agent 31B.
- Real provider environment checklist before any real key is used.
- Cap attempts per Concept Brief.
- Disable generate while a job is pending or generating.
- Store job state so refreshes cannot trigger duplicate provider calls.
- Record provider/model/quality/size and a coarse estimated cost when available.
- Use synthetic test data for Preview and smoke tests.
- Revisit rate limits and audit logging before broader traffic or multi-admin
  use.

## O. Privacy And Data-Use Boundaries

Approved MVP boundary:

- Customer brief text and final reference images may be used only for that
  customer's current project AI sketch/concept review when the feature exists or
  is approved.
- Do not use customer materials for AI model training.
- Do not add customer materials to public datasets.
- Do not use customer materials for general model improvement unless separately
  approved and disclosed.
- Do not use real customer data in testing.
- Do not send sensitive contact information into prompts when it is not needed
  for visual generation.
- Do not imply that AI sketch approval is CAD, quote, order, sourcing,
  feasibility, or production approval.

Any real provider implementation should confirm provider data retention,
training, abuse review, image-input handling, and deletion/export implications
before Production use.

## P. Testing Plan

Local mock mode:

- A later code foundation Agent should add a mock provider path with
  deterministic fake output state
  and no real API key.
- Test protected admin trigger gating, no duplicate job creation, failure state,
  retry limit, and customer display hiding unapproved output.
- Run `npm run build` and focused Playwright tests when app code changes.

Preview environment:

- Use synthetic Concept Brief submissions only.
- Verify admin-triggered mock generation first.
- After Agent 31C provider setup and Agent 31D real implementation, verify one
  real provider call only after separate approval.
- Confirm no real customer data, no protected admin keys in docs/chat, and no
  public exposure of output before approval.

Production smoke test:

- Requires a separate explicit approval boundary.
- Use exactly one synthetic brief with clearly marked test contact data.
- Do not use real customer data or confidential reference images.
- Confirm persisted brief, admin-triggered generation, storage output, admin
  approval, and customer display.
- Do not repeat generation unless the smoke plan explicitly approves the retry.

Docs-only validation for Agent 31A:

- `git diff --check`
- `git diff --cached --check`
- Build skipped because docs-only.
- E2E skipped because docs-only.

## Q. Suggested Follow-Up Agents

- Agent 31C: auth/whitelist/credits schema planning packet or implementation
  skeleton.
- Agent 31D: sketch job/status code foundation with mock/manual provider and no
  real API key.
- Agent 31E: customer `/design/sketch` staged direction selection UI.
- Agent 31F: payment manual-entitlement MVP.
- Agent 31G: real image provider environment/setup and limited smoke plan.
- Agent 31H: real auto-generation with quota and budget caps.
- Agent 31I: payment webhook / automatic credit grant.

## Risk Register

| Risk | What may happen | Mitigation |
| --- | --- | --- |
| Cost spike | Spam, refreshes, or automatic submit generation creates unexpected provider cost. | Admin-triggered only, no auto-generation, capped attempts, job state. |
| Slow generation | Provider latency makes admin/customer flow feel broken. | Explicit pending/generating states and no customer promise of instant output. |
| Poor sketch quality | Output does not match NOVORA taste or customer intent. | Prompt versioning, admin review, reject/regenerate path, mock-first testing. |
| Unsafe uploaded images | References include personal, copyrighted, confidential, or unsuitable material. | Use final uploads only, admin-triggered review, current-project-only data use. |
| Customer misunderstands sketch as CAD | Customer thinks the AI sketch is production-ready. | Repeated copy boundary: concept sketch only, paid CAD later. |
| Generated output not production-ready | Sketch lacks manufacturable details. | Do not connect output approval to CAD, quote, sourcing, or production status. |
| Storage permission errors | Output cannot be saved or accessed safely. | Private bucket, server-mediated access, storage failure status, no customer display on storage failure. |
| Admin trigger abuse | Admin accidentally generates too many sketches. | Disable during active jobs, capped attempts, clear button state, future audit logging. |
| Accidental real customer data in testing | Real customer brief or image is used in provider tests. | Synthetic-only testing and separate approval for any Production smoke. |
| Provider/API key leakage | Secret appears in browser, logs, docs, screenshots, or PR text. | Server-only env, no values in docs, no raw error logging, no client provider calls. |
| Privacy promise mismatch | Public copy or provider behavior conflicts with stated data-use boundaries. | Confirm provider terms, update legal/privacy planning before real launch, no training/public dataset use. |

## Agent 31A Non-Goals

Agent 31A does not:

- Change app code.
- Change tests.
- Change packages.
- Add real AI generation.
- Add provider SDKs or real API calls.
- Add or read API keys.
- Change Vercel environment variables.
- Access Production.
- Access protected admin pages.
- Create Production submissions.
- Trigger email.
- Execute SQL.
- Change Supabase schema, RLS, grants, policies, storage, or customer data.
- Deploy.
