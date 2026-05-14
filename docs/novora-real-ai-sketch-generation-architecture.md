# NOVORA Real AI Sketch Generation Architecture

## 1. Purpose

NOVORA wants to convert a submitted Concept Brief into a real AI-generated hand-drawn jewelry concept sketch. The sketch should help the customer and NOVORA align on design direction before any professional production work begins.

This architecture keeps the AI sketch as an early concept artifact only. Production CAD, formal pricing, gemstone sourcing, production feasibility, and manufacturing approval remain later professional paid workflow steps handled separately by NOVORA.

## 2. Current mock state

The current NOVORA flow is front-end-only and mock-only:

- `/design/concept` collects the customer's design direction and concept intake choices.
- `/design/brief` can create submitted Concept Brief metadata in the browser.
- `/design/submitted` confirms the submission and includes a "View AI Sketch Preview" CTA.
- `/design/sketch` shows a mock AI Sketch Preview page.
- `/admin/briefs` and `/admin/briefs/[id]` show mock admin review surfaces.

There is no real backend, database, file storage, OpenAI API call, image generation job, admin approval persistence, customer account, payment flow, email notification, PDF generation, or production deployment behavior behind these pages today. Any current submitted brief or preview behavior should be treated as browser-side simulation only.

## 3. Target future user flow

The future flow should be:

1. Customer submits a Concept Brief.
2. The server creates a durable `concept_brief` record.
3. The system creates an AI sketch generation job linked to that Concept Brief.
4. The job moves through explicit states: `pending`, `generating`, `succeeded`, `failed`, `needs_review`, and `approved`.
5. The generated sketch image is stored in durable object storage.
6. The database stores the generated image URL or storage key, job metadata, and review state.
7. An admin reviews the generated image before it becomes customer-facing.
8. The customer sees only an approved preview or a safe waiting/failure state.
9. CAD, pricing, sourcing, quote approval, payment, and production remain separate later steps.

The generated sketch should feel close to the quality and taste of OpenAI/ChatGPT-style hand-drawn jewelry image generation, but the product experience must still communicate that it is a concept direction, not a final deliverable.

## 4. Recommended architecture

Use a server-controlled architecture:

- Frontend pages collect Concept Brief input, display status, and render approved sketch previews.
- A server-side API route or server action receives the request to generate a sketch.
- The OpenAI image generation call happens only on the server.
- Generated image bytes or URLs are copied into NOVORA-controlled object storage.
- Database records track Concept Briefs, AI sketch jobs, outputs, and admin review decisions.
- Admin review pages read generation results and update review state through protected server endpoints.
- Customer pages read only approved or safe customer-visible states.

Recommended page responsibilities:

- `/design/concept`: concept intake entry point.
- `/design/brief`: customer brief submission surface.
- `/design/submitted`: submitted state and safe sketch status entry point.
- `/design/sketch`: customer-facing approved preview display, or safe pending/failure copy.
- `/admin/briefs`: internal list of Concept Briefs and AI sketch statuses.
- `/admin/briefs/[id]`: internal detail view for prompt, output, failure state, review notes, and approval decision.

Do not expose provider secrets, raw internal errors, unapproved sketch outputs, or unrestricted customer data to browser code.

## 5. OpenAI API approach

OpenAI offers different API paths for image work:

- Image API: best for direct single-prompt image generation or image edit requests where NOVORA sends a constructed prompt and receives an image output.
- Responses API: better for conversational, multi-turn, or tool-orchestrated image experiences where a user or admin iteratively refines the result inside a broader assistant-style flow.

Recommended phased approach:

- Phase 1: Generate one sketch from one submitted Concept Brief using a server-side OpenAI image generation call.
- Phase 2: Add admin-only regeneration and prompt refinement, still server-side.
- Phase 3: Add customer-visible revision requests after approval rules, rate limits, and storage are ready.
- Phase 4: Add reference-image-aware generation only after durable upload storage, permissions, file validation, and image retention rules are in place.

Phase 1 should avoid conversational complexity. Build a clear prompt, call OpenAI from the server, store the output, and require admin review before customer display.

## 6. Prompt-building strategy

Build the sketch prompt from structured Concept Brief fields:

- `pieceType`: ring, necklace, bracelet, earrings, pendant, or other supported jewelry type.
- `structure`: main design structure or silhouette.
- `subStructure`: secondary construction detail or motif.
- `stoneLogic`: stone placement, center stone direction, accent logic, or no-stone direction.
- `metalDirection`: customer metal preference as visual direction only, not production confirmation.
- `referenceNotes`: customer notes about inspiration images or style references.
- `emotionalIntent`: the mood, occasion, symbolism, or wearer story.
- `customerNotes`: freeform design wishes.
- `productionBoundaries`: NOVORA constraints that prevent misleading finality.

Prompt builder rules:

- Prefer concise, specific visual language over long customer prose.
- Normalize unsupported or vague fields into safe design direction.
- Include product boundary language in the prompt so the image does not imply a finished production design.
- Avoid claims about pricing, certification, sourcing, manufacturing readiness, or final approval.
- Keep model instructions server-side so they can be audited and versioned.

Suggested prompt template:

```text
Create a hand-drawn jewelry concept sketch for NOVORA.

Subject:
- Jewelry type: {pieceType}
- Structure: {structure}
- Detail direction: {subStructure}
- Stone direction: {stoneLogic}
- Metal direction: {metalDirection}
- Reference notes: {referenceNotes}
- Emotional intent: {emotionalIntent}
- Customer notes: {customerNotes}

Style:
- Warm white paper background
- Pencil and fine ink jewelry design sketch
- Professional concept board presentation
- Delicate jewelry proportions
- Elegant annotation marks are allowed, but keep text minimal and non-final
- Show concept direction, silhouette, stone placement, and wearable proportions

Boundaries:
- This is not CAD
- This is not a photorealistic render
- Do not include fake pricing
- Do not include fake gemstone certification
- Do not imply sourcing confirmation
- Do not imply production approval
- Avoid misleading finality; present the image as an exploratory concept sketch
```

## 7. Data model proposal

Future database tables or objects:

### `concept_briefs`

- `id`
- `customer_id` or captured contact fields
- `piece_type`
- `structure`
- `sub_structure`
- `stone_logic`
- `metal_direction`
- `reference_notes`
- `emotional_intent`
- `customer_notes`
- `status`
- `created_at`
- `updated_at`

### `ai_sketch_jobs`

- `id`
- `concept_brief_id`
- `status`
- `prompt`
- `model`
- `quality`
- `size`
- `error_message`
- `generation_cost_estimate`
- `created_at`
- `updated_at`

### `ai_sketch_outputs`

- `id`
- `concept_brief_id`
- `ai_sketch_job_id`
- `status`
- `model`
- `quality`
- `size`
- `image_url`
- `storage_key`
- `generation_cost_estimate`
- `created_at`
- `updated_at`

### `ai_sketch_reviews`

- `id`
- `concept_brief_id`
- `ai_sketch_output_id`
- `review_status`
- `reviewed_by`
- `admin_notes`
- `created_at`
- `updated_at`

Suggested status values:

- Job status: `pending`, `generating`, `succeeded`, `failed`.
- Review status: `needs_review`, `approved`, `needs_regeneration`, `unsuitable`, `ready_for_customer_preview`.
- Customer display status: `waiting`, `approved_preview_available`, `temporarily_unavailable`, `manual_review_required`.

## 8. Storage plan

Generated images should not live only in browser `localStorage`.

Future storage plan:

- Store generated image files in durable object storage.
- Store `image_url` or `storage_key` in the database.
- Prefer private storage keys plus signed or server-mediated access unless the selected provider and privacy model support safe public URLs.
- Admin pages read output metadata from the database.
- Customer pages read only approved output metadata from the database.
- Browser storage may cache non-sensitive display hints, but it must not be the source of truth.

This documentation PR does not select or implement a storage provider.

## 9. Security and env plan

The OpenAI API key must never be exposed in browser or client code.

Future security plan:

- Store `OPENAI_API_KEY` in Vercel environment variables.
- Call OpenAI only from a server route, server action, or trusted server worker.
- Let the frontend call only NOVORA-owned backend endpoints.
- Validate all Concept Brief inputs before prompt construction.
- Protect admin routes before displaying real customer data or generated outputs.
- Add rate limiting and abuse protection before public launch.
- Log provider errors server-side without exposing secrets or raw sensitive payloads to customers.

This documentation PR does not add API keys, environment variables, backend routes, or Vercel config.

## 10. Cost and usage control

Control generation cost from the start:

- Generate only after a Concept Brief submission exists.
- Optionally require customer email or contact information before generation.
- In the earliest production stage, optionally require admin approval before generation starts.
- Limit retry and regenerate counts per Concept Brief.
- Store generation status so refreshes do not trigger duplicate jobs.
- Log model, quality, size, and estimated cost metadata.
- Prevent automatic infinite regeneration loops.
- Make admin-triggered regeneration explicit and auditable.

## 11. Failure handling

Customer and admin states should be explicit:

- `pending`: job exists but has not started.
- `generating`: OpenAI generation is in progress.
- `succeeded`: generation completed and output was stored.
- `failed`: generation failed or storage failed.
- `needs_review`: output exists but requires admin review.
- `approved`: output is safe for customer display.

Customer-facing failure copy should be graceful and non-technical, such as explaining that NOVORA is reviewing the concept direction and will continue manually if needed.

Admin-facing failure details can include safe error categories, retry availability, provider status, and internal notes. Retry should be available to admins only, with capped attempts.

## 12. Admin review workflow

Future `/admin/briefs/[id]` should show:

- Concept Brief details.
- Generated sketch status.
- Prompt text or prompt summary.
- Generated image preview.
- Storage metadata.
- Error state if generation failed.
- Admin notes.
- Review action controls.

Admin actions:

- Mark approved.
- Mark needs regeneration.
- Mark unsuitable.
- Mark ready for customer preview.
- Add internal notes.

Customers should see only approved or otherwise safe preview states. Unreviewed, failed, unsuitable, or internal-only outputs should not appear on customer-facing pages.

## 13. Customer-facing copy rules

Customer copy must preserve clear boundaries:

- The AI sketch is concept direction only.
- It is not a final jewelry design.
- It is not production CAD.
- It is not a final quote.
- It is not gemstone sourcing confirmation.
- It is not production feasibility confirmation.
- It is not production approval.
- Professional CAD is later, paid, and handled through NOVORA's review and production workflow.

Good language:

- "AI concept sketch"
- "early design direction"
- "preview for review"
- "next step: NOVORA review"

Avoid language:

- "final design"
- "approved for production"
- "confirmed price"
- "certified stone"
- "ready to manufacture"

## 14. Implementation roadmap

Break implementation into future PRs:

- PR A: Database and storage provider decision document.
- PR B: Backend API route skeleton without OpenAI call.
- PR C: Prompt builder utility with tests.
- PR D: Real OpenAI generation server route behind an environment guard.
- PR E: Storage integration for generated images.
- PR F: Admin review UI integration.
- PR G: Customer approved sketch display.
- PR H: Cost controls, rate limiting, retry limits, and failure handling.
- PR I: Production hardening, observability, privacy review, and operational runbook.

Each PR should preserve the Concept Brief versus CAD-ready production boundary.

## 15. Strict non-goals for this documentation PR

This documentation PR intentionally does not include:

- App code changes.
- Real OpenAI API calls.
- OpenAI SDK dependency.
- API keys.
- Environment variable changes.
- Backend route implementation.
- Database implementation.
- Storage implementation.
- Email integration.
- Payment integration.
- Login or authentication.
- PDF generation.
- Vercel configuration changes.
- Package changes.
- Production deployment behavior changes.

The only intended output of this PR is this architecture planning document.
