# NOVORA AI Sketch API Parameter, Cost, And Gallery Pipeline Plan

## A. Purpose And Boundary

This is a review and planning document only. It does not implement OpenAI API
integration, provider SDKs, real image generation, SQL, Supabase schema changes,
storage bucket changes, storage policies, RLS, grants, auth/login, payment
logic, points deduction, app code, tests, package changes, environment
variables, secrets, Production access, admin access, submissions, email, deploy,
CAD, order, production, or customer-data operations.

No OpenAI API was called for this plan. No real AI images were generated.

The product boundary remains unchanged: a NOVORA AI sketch is an AI hand-drawn
concept sketch for early design direction only. It is not CAD, not a quote, not
an order, not sourcing confirmation, not final pricing, not production
feasibility confirmation, and not production approval. Paid CAD and production
decisions happen later through manual NOVORA review and separate paid workflow.

This packet is a companion to:

- `docs/novora-ai-sketch-generation-mvp-implementation-plan.md`
- `docs/novora-ai-sketch-whitelist-credits-payment-strategy.md`
- `docs/novora-auth-whitelist-credits-payment-schema-plan.md`
- `docs/novora-auth-whitelist-credits-payment-sql-packet.md`
- `docs/novora-database-storage-provider-decision.md`
- `docs/novora-production-security-runbook.md`

## B. Product Objective

AI sketch quality is central to NOVORA's customer experience because it shows
the studio's taste, design ability, and response speed before the customer has
committed to paid CAD or production. The first successful AI sketch experience
should help a customer feel that NOVORA understood the brief and can translate
their taste into a credible concept direction.

Early free testing is market validation cost, not an unlimited free-generation
program. The goal is to learn whether invited testers trust the visual quality,
understand the concept-sketch boundary, and show willingness to pay for stronger
final sketch packages. Free testing must stay capped, private, and measurable.

Demand-side market assumptions should focus on North America first, then
Europe, Japan, and Taiwan as secondary future markets. China should be treated
mainly as NOVORA's supply-chain base for gemstone processing, jewelry
manufacturing, production cost advantage, and factory support. Do not over-focus
demand-side AI sketch or gallery assumptions on China unless a future task
explicitly asks for that market analysis.

## C. Structured Brief To Generation Pipeline

Future generation should be server-controlled and structured:

1. Customer completes a guided design interaction.
2. The app stores a structured Concept Brief after confirmed server
   persistence.
3. A prompt builder converts safe structured fields into a versioned visual
   prompt.
4. A controlled parameter selector chooses a locked provider/model/quality/size
   profile for the allowed tier.
5. The system creates an AI generation job.
6. The provider returns an output, or the job records a safe failure state.
7. The output record stores metadata, storage information, cost estimate, and
   review state.
8. Admin reviews quality, privacy, customer visibility, and gallery eligibility.
9. The customer sees only an approved preview or a safe waiting/unavailable
   state.
10. The customer may choose an optional paid final sketch package.
11. A generated output may become an optional public gallery item only after
    separate approval and permission checks.

Example structured brief fields for generation:

- `piece_type`
- `stone_logic`
- `center_stone_shape`
- `center_stone_type`
- `accent_style`
- `metal_tone`
- `design_mood`
- `output_style`
- `boundary`

The `boundary` field should preserve the concept-sketch-only instruction:
exploratory AI hand-drawn concept sketch, not CAD, not quote, not order, not
production approval.

## D. Parameter Locking Plan

Future generation records should store the exact generation settings used for
each output. Production defaults may be configurable, but the effective
provider/model/quality/size must not drift silently.

Required planning fields:

| Field | Why it matters |
| --- | --- |
| `provider` | Distinguishes OpenAI or another future provider for cost, debugging, and migration. |
| `model` | Locks output behavior and cost assumptions; prevents silent model changes. |
| `quality` | Controls output quality, price, and tier separation. |
| `size` | Controls output format expectations and provider cost. |
| `output_format` | Records PNG, WebP, JPEG, or provider-native output when relevant. |
| `prompt_version` | Supports audit, quality analysis, and future prompt migration. |
| `prompt_template_id` | Separates stable template identity from version text. |
| `brief_schema_version` | Explains which structured brief fields were available. |
| `generation_type` | Differentiates direction image, refinement, final image, gallery sample, or retry. |
| `package_tier` | Links output to whitelist, paid refinement, or final package expectations. |
| `cost_estimate_usd` | Enables budget controls, margin review, and admin cost display. |
| `cost_currency` | Keeps future multi-currency or provider-currency accounting explicit. |
| `cost_source` / `pricing_assumption_version` | Shows which pricing assumption created the estimate. |
| `input_token_estimate` / `output_token_estimate` or image-cost estimate | Supports later provider analytics where available. |
| `created_by` / `requested_by` | Distinguishes customer, admin, system, or support trigger. |
| `concept_brief_id` | Links the generation to the submitted design-intake record. |
| `ai_sketch_job_id` | Links output to the orchestration and retry state. |
| `parent_generation_id` | Tracks refinements, retries, and regenerated variants. |
| `status` | Prevents duplicate work and gates customer visibility. |
| `failure_reason` | Supports support review without exposing raw provider errors. |
| `admin_review_status` | Keeps generated output private until reviewed. |

These fields support cost control, stable customer experience, debugging, point
deduction, refund/retry handling, quality analysis, and future migration. A
future implementation should reject or pause generation when the configured
production default changes without an explicit pricing and margin review.

## E. Recommended Generation Tiers

These tiers are future planning only and do not create live products, prices, or
credits.

| Tier | Intended quality | Public by default | Free quota / points | Human review | Gallery use | Cost-control notes |
| --- | --- | --- | --- | --- | --- | --- |
| `free_whitelist_direction` | Lower-cost draft or medium-quality direction tier, such as a mini model or medium quality profile if provider-supported. | No. | May consume whitelist free quota; should record promotional cost. | Required before customer/gallery display if quality or privacy is uncertain. | Only after separate approval and permission. | Capped to invited testers; no anonymous access. |
| `paid_refinement` | Stronger refinement of the selected direction. | No. | Planned 8 points per high-quality refinement. | Recommended, especially during beta. | Possible only after approval and permission. | Must link to selected parent direction and prevent duplicate deductions. |
| `single_final_image` | Production-quality AI concept sketch package. | No. | Planned 19 points or paid equivalent. | Required before delivery in early phases. | Possible only after approval and permission. | Must preserve concept-only boundary despite higher quality. |
| `proposal_final_package` | Main paid final sketch package with stronger presentation value. | No. | Planned 29 points or paid equivalent. | Required. | Possible only after approval and permission. | Recommended main customer package, not CAD or quote. |
| `commercial_presentation_package` | High-quality image tier plus human selection/retry if needed for presentation or print-ready style use. | No. | Planned 49 points or paid equivalent. | Required. | Possible only after approval, permission, and extra privacy review. | Do not imply manufacturing rights, CAD, exclusivity, trademark clearance, or production feasibility. |

Free and whitelist direction images should remain capped and non-public. Paid
final sketch packages may use a higher-quality image tier after official
provider pricing is verified. Do not hardcode current provider pricing as final
truth.

## F. Pricing-Change Safety

Image model pricing can change. This plan must not be treated as permanent
pricing truth, and no current provider price should be implemented without
checking official provider pricing at that time.

Required future implementation gate before enabling real API generation:

- Verify current official provider pricing for the chosen model, quality, size,
  output format, and any token/image billing dimensions.
- Update `cost_estimate_usd` assumptions.
- Update point deduction rules.
- Update free whitelist budget caps.
- Update paid package prices.
- Update retry, failed-output, and refund assumptions.
- Update admin dashboard cost display.
- Update ledger/payment docs if needed.
- Record the pricing assumption version in generation records.

If OpenAI image model pricing or another provider's image pricing changes, the
system and operating docs should remind the owner to re-check point deductions,
free-test budget caps, paid package pricing, refund/retry assumptions, and
margin assumptions before continuing real generation.

## G. Points And Cost-Control Relationship

Existing planning defaults from the whitelist, credits, and payment strategy:

| Action or package | Planned points |
| --- | ---: |
| 2 advanced direction images | 6 |
| 1 high-quality refinement | 8 |
| Single final image | 19 |
| Proposal final package | 29 |
| Commercial presentation package | 49 |

These are future planning defaults only. They are not live credits, not active
customer balances, and not permission to implement points deduction.

Future point deduction rules should be:

- Idempotent per generation request, package order, payment event, and retry.
- Linked to `ai_sketch_job_id`, generation status, and output status.
- Server-side only; browser clients must not write balances or ledger entries.
- Transactional where possible, with one ledger entry per business event.
- Reversible through explicit ledger reversal rows when policy requires it.
- Paused when model pricing assumptions are stale or unverified.

Failed generation handling must be defined before implementation. Recommended
default: do not finalize a deduction for a provider/storage failure that creates
no usable output. If points are reserved before generation, a failed generation
should release the reservation or record an explicit reversal. Retried
generations should reference the parent generation, use idempotency keys, and
avoid double-spending the same customer action.

## H. Free Whitelist Test Control

The free test model remains:

- 10 fixed whitelist test users.
- 3 free test days.
- 5 complete experiences per day.
- Each complete experience includes:
  - 2 advanced direction images.
  - Customer selects one direction.
  - 1 to 2 high-quality refinements on the selected direction.

The recommended budget cap remains controlled and should be revisited against
official provider pricing before real generation. The free test is meant to
prove quality, taste, trust, and response speed; it is not an open public free
generation product.

Rules:

- No anonymous high-quality generation.
- No publicly open free high-quality generation.
- No unlimited retries.
- No generation outside the whitelist window without a separate approved task.
- No customer-visible claim that free sketches are CAD, quotes, orders, or
  production approvals.

## I. Gallery Pipeline Plan

The future gallery should be curated, not automatic.

Planned flow:

1. AI sketch output is generated and stored privately.
2. Admin reviews quality, privacy, and product-boundary fit.
3. Customer consent or internal sample authorization is checked.
4. Private details are hidden, cropped, or redacted if needed.
5. The record is marked `approved_for_gallery` only after review.
6. A public gallery API returns only approved, non-sensitive items.
7. Homepage rolling gallery and second-page rolling gallery consume the public
   gallery API.
8. Concept-sketch boundary copy is shown or linked near the gallery.

Gallery rules:

- Never automatically publish customer outputs.
- Never publish raw customer reference images.
- Never expose customer name, email, phone, WhatsApp, or private notes.
- Never expose admin notes.
- Never expose private storage paths or protected signed URLs.
- Gallery images should be curated and revocable.
- Concept sketch boundary must stay visible near gallery usage: AI hand-drawn
  concept sketch only, not CAD, not quote, not order, not production approval.

## J. Public Gallery API Shape

This endpoint is future planning only and must not be implemented in this task.

Planned endpoint:

```text
GET /api/public/sketch-gallery
```

Safe response fields:

- `id`
- `image_url` or `public_asset_url`
- `title`
- `piece_type`
- `style_tags`
- `alt_text`
- `display_order`
- `created_month` or a generic display label when useful
- `concept_boundary_label`

Fields that must not be returned:

- Customer email.
- Phone or WhatsApp.
- Full contact note.
- Raw prompt if it contains sensitive customer or reference details.
- Uploaded reference image URLs.
- Internal admin notes.
- Private storage paths.
- Payment IDs.
- Customer IDs.
- Provider response payloads.
- Internal failure reasons.

The API should only return rows that are approved, non-sensitive, and backed by
public-safe image delivery. Public gallery records should not be a direct view
of private generation records.

## K. Admin Review Requirements

Future admin controls should include:

- `approve_for_gallery`
- `reject_for_gallery`
- `needs_blur_or_crop`
- `needs_customer_permission`
- `hide_private_details`
- Quality rating.
- Display order.
- Gallery category.
- Audit event.

Admin approval should require enough context to prevent accidental publication:
the generated image, customer/public permission state, whether references were
used, whether any private details are visible, the output tier, and the
concept-sketch boundary label. Publication actions should be audited, reversible,
and separate from customer-visible sketch delivery approval.

## L. Data Model Notes

This section is planning only. Do not execute SQL from this document.

Likely future records:

- `ai_sketch_jobs`: generation orchestration, status, retry, parameter lock,
  cost estimate, requester, and Concept Brief linkage.
- `ai_sketch_outputs`: generated output metadata, storage reference, parameter
  lock, output status, and customer/admin visibility state.
- `ai_sketch_reviews`: admin review of quality, customer visibility, gallery
  eligibility, rejection reasons, and review timestamps.
- `ai_sketch_ownership_records`: customer/package/brief relationship for private
  output access.
- `credit_ledger_entries`: point grants, deductions, reversals, failed-generation
  reversals, payment grants, and admin adjustments.
- `final_sketch_package_orders`: paid package entitlement and fulfillment state.
- `gallery_items` or `approved_public_sketch_gallery_items`: public-safe curated
  gallery rows decoupled from private output tables.
- `admin_operation_audit_events`: audit trail for gallery approval, credit
  adjustments, whitelist changes, package fulfillment, and sensitive admin
  operations.

Current schema uncertainty: the project ledger confirms existing Concept Brief,
contact, reference asset, admin notes, notification event tables, and storage
buckets. It does not confirm live `ai_sketch_jobs`, `ai_sketch_outputs`, or
`ai_sketch_reviews` tables. A future implementation must verify live schema,
foreign keys, RLS, grants, storage policy, and current app contract before any
SQL, code, or provider integration.

## M. Implementation Sequence And Stop Gates

Recommended future sequence:

1. Review this docs-only plan.
2. Build a curated mock gallery UI with static or explicitly mock data.
3. Design the approved public gallery API contract.
4. Decide private storage versus public delivery strategy for gallery assets.
5. Add admin approval workflow for gallery eligibility.
6. Verify official model pricing and update cost/points/package assumptions.
7. Add real API integration behind a disabled feature flag, with no default
   Production generation.
8. Add generation job queue, retry policy, and idempotency.
9. Wire points deduction and reversal logic.
10. Run limited whitelist beta.
11. Move to monitored Production rollout only after separate approval.

Stop and ask for a separate approved task before:

- OpenAI API key or provider setup.
- Real image generation.
- SQL execution.
- Supabase schema changes.
- Supabase storage policy changes.
- RLS, grants, or policies.
- Auth/login.
- Payment/provider logic.
- Credit or point deduction.
- Public gallery automation.
- Production rollout.
- Accessing Production/admin pages.
- Creating submissions.
- Sending emails.
- Deploying.
- CAD, order, production, or customer-data operations.

## N. Risk Review

| Risk | Consequence | Affected scope | Why the risk exists | Likelihood / severity | Mitigation |
| --- | --- | --- | --- | --- | --- |
| Model price changes | Points, free caps, package pricing, and margins become wrong. | Cost model, credits, packages, admin reporting. | Provider image pricing can change after docs are written. | Medium / high. | Require official pricing verification and `pricing_assumption_version` before real generation. |
| Runaway generation cost | Provider spend exceeds owner budget. | AI generation, whitelist beta, paid packages. | Retries, duplicate clicks, spam, or automatic generation can trigger many calls. | Medium / high. | No anonymous generation, locked tiers, idempotency, budget caps, job states, admin controls. |
| Anonymous abuse | Unknown users consume expensive generation. | Public routes, provider cost, storage. | High-quality image generation is valuable if exposed publicly. | High if open / high. | Require invite/login/entitlement before high-quality generation. |
| Public free high-quality abuse | Free high-quality outputs spread beyond intended testers. | Whitelist, costs, brand control. | Shared links or open endpoints can bypass tiny test assumptions. | Medium / high. | Fixed whitelist, 3-day window, daily caps, no public free high-quality endpoint. |
| Inconsistent quality between tiers | Free and paid output quality feels confusing or unfair. | Customer experience, conversion, support. | Different models/quality settings may produce visibly different style. | Medium / medium. | Lock parameters, label tiers, collect quality ratings, require human review for paid outputs. |
| Failed generation after point deduction | Customer loses points without usable output. | Credits, support, trust. | Provider, moderation, timeout, or storage may fail after reservation. | Medium / high. | Deduct on success or reserve then release/reverse; link ledger to job status. |
| Retry/idempotency gaps | Duplicate jobs, duplicate provider cost, or double deductions. | Jobs, ledger, quotas, payments. | Browser retries, refreshes, webhooks, and admin actions can repeat requests. | Medium / high. | Idempotency keys, parent generation links, one active job per action, audit retry reason. |
| Publishing private customer design | A customer-specific sketch appears publicly without permission. | Gallery, privacy, trust, legal risk. | Generated outputs may include customer story, taste, or confidential proposal details. | Medium / critical. | Manual gallery approval, consent/internal authorization, curated public-safe records only. |
| Publishing raw reference image | Customer or third-party inspiration image becomes public. | Gallery, storage, privacy, copyright. | Reference images may be linked to generated outputs and could be confused with gallery assets. | Medium / critical. | Never return uploaded reference URLs; use generated/authorized gallery assets only. |
| Copyright/reference-image concerns | Public gallery or generation may depend on third-party imagery. | Gallery, provider input, customer terms. | Customers may upload copyrighted or brand-sensitive references. | Medium / high. | Admin review, rights/permission checks, avoid raw references, require owner/legal review before public use. |
| Overpromising sketch as CAD/production | Customers treat AI sketch as manufacturable approval. | Product copy, support, paid packages. | High-quality images can look final. | Medium / high. | Repeat concept-sketch-only boundary near sketch, package, and gallery surfaces. |
| Unsafe gallery API fields | Sensitive metadata leaks publicly. | Public API, customer privacy, storage. | Directly exposing generation rows may include private prompts, paths, or IDs. | Medium / critical. | Separate public gallery model and whitelist exact response fields. |
| Admin accidental approval | Private or low-quality output becomes public. | Admin workflow, gallery, brand trust. | Approval UI can be rushed or ambiguous. | Medium / high. | Separate customer approval from gallery approval, add flags, preview, audit, and reversible status. |
| Storage/public URL exposure | Private generated or reference assets are reachable publicly. | Supabase Storage, gallery, customer previews. | Public buckets or long-lived URLs can bypass review. | Medium / critical. | Private storage by default, public-safe copies for gallery only, no private paths in API. |
| Customer consent ambiguity | NOVORA lacks proof that a customer output can be public. | Gallery, privacy, support. | Permission may be informal or missing in early workflow. | Medium / high. | Track consent/internal sample authorization before `approved_for_gallery`. |
| Future migration complexity | Older outputs lack parameter/cost/permission metadata. | Data model, analytics, gallery, credits. | Early generation may ship before records are fully locked. | Medium / medium. | Require parameter locking from first real generation and use nullable migration-safe fields. |

## O. Agent 33A Non-Goals

Agent 33A does not:

- Call OpenAI or any image provider.
- Generate real images.
- Add API keys or provider configuration.
- Execute SQL.
- Change Supabase schema, RLS, grants, policies, storage, or customer data.
- Implement auth/login.
- Implement payment/provider logic.
- Implement points deduction.
- Change app code, tests, packages, or runtime public API behavior.
- Access Production or protected admin pages.
- Create submissions.
- Send email.
- Deploy.
- Touch CAD, order, production, or customer data.

## P. Docs-Only Validation

Expected validation for this docs-only task:

- `git diff --check`
- `git diff --cached --check` after path-specific staging

Build and e2e tests are skipped because this task changes documentation only
and does not affect runtime behavior.
