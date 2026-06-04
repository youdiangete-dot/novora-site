# NOVORA Auth, Whitelist, Credits, Payment, And AI Sketch Ownership Schema Plan

## 1. Purpose And Current Boundary

This document is a planning packet for future NOVORA authentication,
whitelist, trial quota, prepaid credit, payment, final sketch package, and AI
sketch ownership work. It is intended to prepare a later implementation sequence
before real automatic AI sketch generation becomes customer-facing.

This Agent does not implement schema, SQL, auth, payment, provider calls, API
keys, environment variables, RLS, storage policies, app behavior, or Production
behavior. No table is created by this document. No Supabase setting is changed.
No login, checkout, credit deduction, AI generation, or final package unlock is
implemented here.

Auth, whitelist, credits, and ownership need to be designed before real
auto-generation because high-quality image generation has direct cost, privacy,
and entitlement risk. NOVORA needs to know who owns each sketch attempt, who is
allowed to generate, whether a user is inside a trial window, whether the user
has enough balance, and which outputs are private, paid, or approved before
opening high-quality generation beyond a tiny controlled group.

## 2. Current Existing Data Capability

Current confirmed project state, based on the project ledger:

- `concept_briefs` exists and stores real Concept Brief rows.
- `concept_brief_contacts` exists and stores contact rows.
- `concept_brief_reference_assets` exists and stores uploaded reference
  metadata.
- `admin_notes` exists and persists admin review status and internal notes.
- `concept_brief_notification_events` exists for durable admin notification
  idempotency.
- Supabase Storage buckets include `novora-reference-images` and
  `novora-ai-sketches`.
- The current customer flow does not have customer login, account ownership,
  prepaid credits, payment records, or customer-owned AI sketch history.

Older planning documents mention `ai_sketch_jobs`, `ai_sketch_outputs`, and
`ai_sketch_reviews` as future AI sketch generation tables. The current ledger
does not list those as confirmed live tables. Treat their existence and shape as
to verify before SQL execution.

## 3. Target Future Capabilities

Future auth and commercial sketch infrastructure should support:

- Customer registration and login.
- Invite-only whitelist access for the early test.
- Trial window tracking.
- Daily free attempt limits.
- Project-wide budget caps.
- Credit balance and prepaid point deduction.
- Append-only credit ledger entries in principle.
- Payment records for manual, semi-automated, and automated payment flows.
- Final sketch package orders for `$19`, `$29`, and `$49` paid output levels.
- AI sketch job ownership by customer profile and Concept Brief.
- Customer selection and refinement events.
- Admin override and abuse controls.
- Private generated output access, with customer visibility only when allowed.

The product boundary must remain clear: an AI sketch is an AI hand-drawn concept
sketch only. It is not CAD, not a quote, not an order, not sourcing
confirmation, not final pricing, and not production approval.

## 4. Proposed Table Map

This is a table planning map only, not SQL.

- `customer_profiles`: durable NOVORA customer profile record, separate from
  any provider-specific auth identity.
- `customer_auth_links`: optional mapping between `customer_profiles` and the
  selected auth provider identity, if the auth provider needs a separate mapping
  table.
- `whitelist_access`: invite and test eligibility state for the controlled
  early whitelist.
- `trial_usage_counters`: per-user, per-day usage counters for free attempts,
  generated direction images, and refinements.
- `credit_accounts`: current customer point balance and lifetime point totals.
- `credit_ledger`: append-only style credit grants, deductions, reversals, and
  admin adjustments.
- `payment_records`: payment provider or manual payment confirmation records.
- `final_sketch_orders`: paid package entitlement and final output tracking.
- `ai_sketch_customer_events`: customer-side selection, refinement, note, and
  package-interest events.
- `ai_sketch_generation_limits`: flexible limit records for daily, trial,
  package, admin, or abuse-control caps.
- `invite_codes`: optional invite-code table if NOVORA uses invite links in
  addition to email-only whitelist access.

## 5. Proposed Key Fields

### `customer_profiles`

- `id`
- `auth_user_id` nullable until auth provider chosen
- `email`
- `display_name`
- `company_name`
- `role_type`
- `country_region`
- `status`
- `created_at`
- `updated_at`

Planning notes: `role_type` can distinguish regular customer, designer, trade
customer, tester, or admin-managed contact later. Do not treat this table as
admin authorization by itself.

### `customer_auth_links`

- `id`
- `customer_profile_id`
- `provider`
- `provider_user_id`
- `email`
- `status`
- `last_login_at`
- `created_at`
- `updated_at`

Planning notes: this table is optional if Supabase Auth directly supplies a
stable `auth.users.id` that can be stored in `customer_profiles.auth_user_id`.
Keep it available as a planning option until auth provider choice is final.

### `whitelist_access`

- `id`
- `customer_profile_id`
- `email`
- `invite_code_hash` if used
- `status`
- `trial_start_at`
- `trial_end_at`
- `daily_attempt_limit`
- `total_attempt_limit`
- `notes`
- `created_by`
- `created_at`
- `updated_at`

Planning notes: the early test default is 10 fixed users, a 3-day free test, and
5 complete attempts per day per user.

### `trial_usage_counters`

- `id`
- `customer_profile_id`
- `usage_date`
- `attempts_used`
- `advanced_images_generated`
- `refinements_generated`
- `reset_timezone`
- `created_at`
- `updated_at`

Planning notes: `usage_date` should follow the selected reset timezone so the
5-attempt daily limit is predictable for invited testers.

### `credit_accounts`

- `id`
- `customer_profile_id`
- `balance_points`
- `lifetime_purchased_points`
- `lifetime_spent_points`
- `status`
- `created_at`
- `updated_at`

Planning notes: customers should never update `balance_points` directly. Balance
changes must happen server-side through reviewed credit logic.

### `credit_ledger`

- `id`
- `credit_account_id`
- `customer_profile_id`
- `delta_points`
- `balance_after`
- `reason`
- `related_payment_id`
- `related_ai_sketch_job_id`
- `related_final_sketch_order_id`
- `admin_note`
- `created_by`
- `created_at`

Planning notes: the ledger should be append-only in principle. Corrections,
refunds, promotional grants, chargebacks, and admin adjustments should create
new rows rather than editing old financial history, except for narrow
operational corrections defined by a later approved policy.

### `payment_records`

- `id`
- `customer_profile_id`
- `provider`
- `provider_payment_id`
- `amount_usd`
- `currency`
- `status`
- `package_type`
- `credits_granted`
- `manual_confirmation_by`
- `confirmed_at`
- `raw_provider_reference`
- `created_at`
- `updated_at`

Planning notes: `raw_provider_reference` should not store secrets, tokens, full
webhook payloads, or sensitive payment details unless a later privacy and
security review explicitly approves that shape.

### `final_sketch_orders`

- `id`
- `customer_profile_id`
- `concept_brief_id`
- `ai_sketch_job_id`
- `package_type`: `single_final_19` / `proposal_29` / `commercial_49`
- `price_usd`
- `status`
- `paid_payment_id`
- `output_asset_id`
- `revision_included`
- `created_at`
- `updated_at`

Planning notes: a final sketch order is a paid AI concept sketch package. It is
not CAD, not a quote, not an order, and not production approval.

### `ai_sketch_customer_events`

- `id`
- `customer_profile_id`
- `concept_brief_id`
- `ai_sketch_job_id`
- `event_type`
- `selected_output_id`
- `note`
- `created_at`

Planning notes: event types can later include direction viewed, direction
selected, refinement requested, final package viewed, final package requested,
or customer note added.

### `ai_sketch_generation_limits`

- `id`
- `customer_profile_id`
- `limit_type`
- `period_start`
- `period_end`
- `allowed_count`
- `used_count`
- `status`
- `created_at`
- `updated_at`

Planning notes: this table can support daily whitelist limits, total trial
limits, paid package limits, abuse holds, and owner-approved exception caps.

### `invite_codes`

- `id`
- `code_hash`
- `email`
- `customer_profile_id`
- `status`
- `expires_at`
- `accepted_at`
- `created_by`
- `created_at`
- `updated_at`

Planning notes: store only hashed invite codes if codes are used. Email-only
magic-link access may make this table unnecessary for the first MVP.

## 6. Relationship To Existing AI Sketch Tables

The future account and credit tables should attach to existing Concept Brief
records without changing the customer-visible `NOVORA-CB-...` reference format.

Planned relationship direction:

- `customer_profiles` can own or be linked to one or more `concept_briefs`.
- `concept_briefs` remains the parent submitted design-intake record.
- `concept_brief_contacts` remains the submitted contact snapshot for that
  brief.
- `concept_brief_reference_assets` remains the metadata table for final
  reference uploads tied to a Concept Brief.
- `ai_sketch_jobs`, if verified, should link to `concept_briefs` and
  `customer_profiles` so generation ownership is explicit.
- `ai_sketch_outputs`, if verified, should link to `ai_sketch_jobs`,
  `concept_briefs`, and, where useful, the owning `customer_profiles`.
- `ai_sketch_reviews`, if verified, should continue to represent admin review
  decisions and should not be customer-writable.
- `admin_notes` can remain internal and may later reference account, whitelist,
  payment, or abuse-control context when appropriate.
- `concept_brief_notification_events` should remain an admin notification
  idempotency table, not a customer account or payment source of truth.

Compatibility must be verified before SQL execution. In particular, later
agents must confirm live table existence, field names, foreign key types, RLS
state, storage access model, and whether older planning documents differ from
current `main`.

## 7. Auth Provider Planning

Planning options:

- Supabase Auth: best aligned with current Supabase backend direction and can
  support email magic links, user IDs, and future RLS policies.
- Passwordless email magic link: lower-friction MVP login path for invited
  testers, especially when the whitelist is email-based.
- Invite-only access: strongest fit for the 10-user test because it avoids
  public open generation and lets the owner control cost and abuse risk.
- Later social login: possible future convenience, but not needed for the
  whitelist MVP and likely adds provider setup and account-linking complexity.

Recommended MVP direction:

- Use invite-only, email-based login with magic link.
- Require whitelist email to match the submitted customer email or an
  owner-approved alias.
- Do not allow anonymous high-quality generation.
- Keep admin access separate from customer login until a future admin auth
  design is approved.

## 8. Whitelist Test Enforcement Logic

Future enforcement should require:

- The user is logged in or verified by invite.
- The user has active `whitelist_access`.
- The whitelist trial window is active.
- The user has not exceeded 5 complete attempts for the current day.
- The user has not exceeded any total trial cap.
- The project-wide test budget cap is still available.
- No abuse hold or disabled status blocks the customer.

Each complete free attempt should allow:

- 2 advanced direction images.
- Customer choice of one direction.
- 1 to 2 high-quality refinement rounds on the chosen direction.

One active attempt should branch only after the customer chooses one direction.
The system should not spend refinement budget on both directions after the
choice. Admins should be able to disable, pause, or override abusive or
exceptional users.

## 9. Credit Deduction Logic

Planning defaults from Agent 31B:

| Purchase | Points |
| ---: | ---: |
| $29 | 30 points |
| $59 | 66 points |
| $99 | 120 points |
| $199 | 260 points |

| Action | Points |
| --- | ---: |
| 2 advanced direction images | 6 points |
| 1 high-quality refinement | 8 points |
| Single final image | 19 points |
| Proposal final package | 29 points |
| Commercial presentation package | 49 points |

Whitelist trial usage may bypass paid deduction or record zero-dollar
promotional credit consumption for cost analytics. Formal users must have
sufficient balance before generation starts.

Credit ledger behavior:

- Balance changes should happen server-side only.
- Customers should not write to `credit_accounts` or `credit_ledger`.
- Successful paid grants should create ledger rows.
- Successful generation deductions should create ledger rows.
- Failed provider calls should not deduct credits unless a later owner policy
  explicitly chooses otherwise.
- Refunds, chargebacks, or reversals should create ledger rows that explain the
  adjustment.

## 10. Payment Strategy Data Model

Payment implementation should be staged.

Test phase:

- Use manual PayPal invoice, PayPal payment link, or other owner-approved manual
  payment confirmation.
- Admin manually confirms payment.
- Admin manually grants final package entitlement or points.

Semi-formal phase:

- Use PayPal Checkout or Stripe Checkout.
- Webhook confirms payment.
- Server-side payment confirmation grants credits or final package entitlement.
- Manual admin override remains available for support and failed webhook cases.

Formal phase:

- Add full credit store behavior.
- Show customer payment history.
- Define refund and chargeback workflow.
- Record payment grants, deductions, reversals, and support adjustments.

No payment provider setup happens in this Agent. Provider choice depends on the
owner's legal, business, regional, tax, and payment setup.

## 11. RLS / Security Planning

High-level security direction:

- Customers can read only their own profile.
- Customers can read only their own credit account summary.
- Customers can read only their own sketch jobs and paid outputs after the
  output is allowed for customer visibility.
- Customers cannot directly update credit balance.
- Customers cannot write credit ledger rows.
- Customers cannot approve, publish, or mark outputs as paid.
- Service-role server code handles payment confirmation, credit grants,
  generation job writes, output writes, and protected admin operations.
- Admin route or service-role code can review outputs, override abuse controls,
  and grant manual entitlements.
- Public anonymous users cannot read private sketch outputs, private reference
  assets, customer profiles, credit balances, payment records, or final package
  orders.
- Final image files should not be public unless explicitly approved in a later
  storage and privacy task.
- Signed URLs or protected routes should be used for private outputs.
- No API keys, provider secrets, service-role keys, payment secrets, or admin
  secrets belong in frontend code.

RLS policy details must be written and reviewed in a later SQL packet before
execution.

## 12. Admin Operations

Future admin capabilities should include:

- Create whitelist invite.
- Activate or deactivate trial user.
- View trial usage.
- Manually confirm payment.
- Grant credits or final package entitlement.
- Adjust abuse status.
- View AI sketch job and output status.
- Approve or hold final outputs if a review gate is used.
- Leave admin notes.
- See enough payment and credit context to support the customer without exposing
  unnecessary provider details.

Admin changes should be auditable where practical, especially credit grants,
credit reversals, whitelist overrides, paid package unlocks, output approval,
and abuse holds.

## 13. Customer UX Implications

Future customer flow:

1. Customer submits a Concept Brief.
2. Customer registers or verifies an invite.
3. Customer enters `/design/sketch`.
4. Customer sees trial or credit status.
5. Customer receives 2 direction images.
6. Customer chooses one direction.
7. Customer requests refinement.
8. Customer sees remaining attempts or credits.
9. Final package CTA appears.
10. Paid final package unlocks the higher-value output.

The interface should continue to frame AI output as concept direction. The paid
final package should still be described as a stronger AI hand-drawn concept
sketch package, not CAD, not quote, not order, and not production approval.

The homepage secondary "See how it works" CTA currently feels non-functional.
A later UI cleanup should remove it or change it to a clearer Concept vs CAD
path. This document does not change app code.

## 14. Data Retention And Privacy Considerations

Accounts, credits, payment records, and generated outputs increase NOVORA's
privacy obligations.

Planning considerations:

- Customer account records and payment records require stronger privacy and
  access controls than anonymous browser-only drafts.
- Credit and payment records may need longer retention than generated sketches
  because they support accounting, refunds, chargebacks, and customer support.
- Reference images and generated outputs may need a removal workflow.
- Partner, designer, trade customer, and future international customer data
  sharing must remain controlled.
- Final Privacy and Terms pages must be updated before public launch of accounts,
  payments, paid sketch packages, or real AI generation.
- Customer materials should remain current-project-only unless separately
  approved and disclosed.
- Provider data retention and training terms must be reviewed before sending
  real customer data to any image provider.

## 15. Migration / Implementation Sequence

Suggested future Agents:

- Agent 31D: SQL packet for auth, whitelist, credits, payment, and sketch
  ownership tables, with no execution unless separately approved.
- Agent 31E: Supabase Auth and invite-only account implementation skeleton.
- Agent 31F: whitelist and trial quota enforcement UI/backend skeleton.
- Agent 31G: credits ledger and manual admin credit grant.
- Agent 31H: staged `/design/sketch` direction selection UI with mock or manual
  outputs.
- Agent 31I: real provider environment/setup and limited smoke plan.
- Agent 31J: paid final package manual entitlement MVP.
- Agent 31K: payment webhook automation.

The sequence may change if the owner keeps payment fully manual longer, chooses
a different auth provider, or delays real provider setup.

## 16. Open Questions / Owner Decisions

Owner decisions still needed:

- Supabase Auth vs external auth provider.
- Whether the trial starts at invite acceptance or first generation.
- Whether whitelist access is email-only or invite-code-based.
- Whether free preview images get watermark or lower resolution.
- Whether `$29` or `$49` is the main promoted package.
- Whether paid final package includes one minor revision.
- Whether credits expire.
- Refund and chargeback policy.
- Payment provider choice.
- Whether final outputs require admin approval before customer visibility.
- Whether OpenAI, domestic provider, manual upload, or hybrid provider is used.
- Whether formal credit deductions occur at request time, success time, or after
  admin approval.
- Whether promotional whitelist usage should create zero-dollar ledger rows.

## 17. Risk Register

| Risk | What Could Happen | Planning Response |
| --- | --- | --- |
| Auth complexity delays launch | Account setup, magic links, sessions, and ownership checks slow the AI sketch timeline. | Keep MVP invite-only and email-based. |
| RLS mistakes expose private images | Customers or anonymous users could see private briefs, references, or outputs. | Write and review RLS/storage policies before execution; default private. |
| Credit balance bugs create financial loss | Incorrect deductions or grants could create customer disputes or unexpected cost. | Server-side balance writes and append-only ledger principle. |
| Payment confirmation errors | Paid users may not receive credits or unpaid users may receive entitlement. | Manual phase first, then reviewed webhook automation. |
| Chargeback/refund disputes | Payment reversal may not match credit/output access state. | Define reversal ledger and support process before formal payment. |
| Abuse via shared whitelist invite | Invites may spread outside the 10-user test. | Email match, invite status, trial caps, and admin disable. |
| Users exploit free trial | A tester may repeatedly generate expensive outputs. | Daily attempt limit, project budget cap, and abuse hold. |
| API cost grows faster than revenue | Real provider cost can exceed paid conversion. | Prepaid credits before broader access and monitor actual cost data. |
| Customer confusion between concept sketch and CAD/production | Users may treat AI images as manufacturable final design. | Repeat concept-only boundary in UX and payment copy. |
| Data privacy obligations increase | Accounts, payments, references, and sketches create higher compliance burden. | Update Privacy/Terms and define retention/removal workflow. |
| Provider/payment availability issues | Selected AI or payment provider may be unavailable or unsuitable. | Keep manual/mock/hybrid fallback options. |
| Manual admin workload grows too fast | Manual invites, payment grants, output review, and support can overwhelm the owner. | Keep whitelist tiny and automate only validated steps. |
| Admin override misuse | Manual grants or abuse changes could be hard to audit. | Record `created_by`, notes, and ledger/admin events where practical. |
| Public open free generation risk | If access opens too early, cost and abuse can spike. | No anonymous high-quality generation and no public open free generation. |
