# NOVORA Agent 63B Final MVP Launch Readiness Checklist

## 1. Purpose

This is the final MVP launch readiness checklist for deciding whether NOVORA is
ready for controlled owner-led soft-launch preparation.

This document is not a deployment action. It does not approve CAD, quotation,
payment, production, or automatic customer-facing AI delivery. It does not
change app behavior, execute QA, access Production data, connect providers, send
email, or approve a full automated launch.

The checklist is a conservative go/no-go planning artifact for the current MVP
boundary: guided Concept Brief intake, protected owner review, manually managed
follow-up, and mock/demo-bound public preview behavior.

## 2. Current Readiness Summary

- Agent 63A smoke QA rerun passed.
- PR #179 merged.
- Merge commit: `0c798040e609655dc0e23cdafc8ce9b3f6aef213`.
- Preview-route stale tests were fixed after Agent 63A found the mismatch.
- Public preview remains mock/demo-bound and safety-bound.
- Human review boundary remains intact.
- No live image generation or automatic customer-facing sketch delivery is
  enabled.

## 3. MVP Launch Posture

| Label | Current posture |
| --- | --- |
| Ready for controlled soft-launch review | Yes, if this checklist remains green and owner-run manual checks pass. |
| Not ready for full automation | True. Manual owner review and follow-up remain required. |
| Not ready for paid image-generation automation | True. No paid or live customer image-generation automation is approved. |
| Not ready for automatic customer-facing sketch delivery | True. Customer delivery remains human-reviewed and manual. |
| Not a CAD, quote, order, payment, or production approval system | True. The MVP must not be represented as any of those systems. |

## 4. Public User-Flow Checklist

Use this checklist before any controlled owner-led soft-launch preparation.

| Area | Readiness check | Status |
| --- | --- | --- |
| `/design/start` | Entry page frames the journey as Concept Brief intake and studio review, not order placement. | Owner verify |
| `/design/concept` | Guided concept questions collect direction without promising final CAD, price, production, or instant live AI output. | Owner verify |
| `/design/brief` | Contact fields, final reference upload, and submission path remain clear and use safe expectation-setting copy. | Owner verify |
| `/design/submitted` | Submitted page confirms receipt only after the existing persistence gate conditions are met. | Owner verify |
| Submitted `publicReference` behavior | Customer-visible reference remains in the `NOVORA-CB-...` format and is not casually changed. | Owner verify |
| Demo/mock preview link wording | Any public preview link is worded as mock/demo/navigation testing and not tied to the real submitted brief. | Owner verify |
| Unreviewed AI sketch delivery | No unreviewed AI sketch, internal draft, provider output, or generated image is customer-facing. | Must remain green |
| Contact fields and submission path | Name, email, optional phone/preference fields, and submission flow continue to support manual studio follow-up. | Owner verify |
| Concept, CAD, quote, and production timeline expectations | Copy keeps concept direction, paid CAD, quotation, order, and production timeline as later manual steps. | Must remain green |

No-go if any public route implies that a Concept Brief creates a final order,
quote, CAD approval, payment approval, sourcing commitment, or production
approval.

## 5. Preview And AI-Sketch Boundary Checklist

| Boundary | Required condition | Status |
| --- | --- | --- |
| Exact mock route only | Only `/design/preview/NOVORA-CB-MOCK-001?state=first_preview_ready` can show the `first_preview_ready` demo state. | Must remain green |
| Safe collapse states | Missing, unsupported, approved, and non-real states collapse to safe unavailable copy. | Must remain green |
| Lifecycle separation | `first_preview_ready` remains separate from `approved_for_customer`. | Must remain green |
| Internal draft status | AI sketch output remains an internal draft until separately reviewed. | Must remain green |
| Human review | Human review is required before any customer-facing delivery. | Must remain green |
| Customer delivery | Customer delivery remains email-only after approval, not public automatic web delivery. | Must remain green |
| Prompt safety | Raw customer brief text is not used as the final image prompt. | Must remain green |
| Design Spec ordering | Design Spec JSON must precede Hand Sketch Instruction. | Must remain green |
| Provider prompt ordering | Hand Sketch Instruction must precede any provider-specific prompt. | Must remain green |
| Public exposure limits | No provider prompt, response, provider IDs, image URLs, or base64 image data is exposed publicly. | Must remain green |

This MVP state does not enable live OpenAI/image API calls, customer-facing
generated images, or paid image-generation automation.

## 6. Admin And Operational Checklist

| Area | Required condition | Status |
| --- | --- | --- |
| Admin brief list | `/admin/briefs` remains protected and owner/operator-only. | Owner verify |
| Admin detail | `/admin/briefs/[publicReference]` remains protected. | Owner verify |
| Reference asset links | No public protected admin detail or reference asset links leak outside the intended admin gate. | Must remain green |
| Admin review state | Admin review state remains internal and does not become a public approval surface. | Must remain green |
| `approved_for_customer` | Approval does not automatically deliver public customer-facing output. | Must remain green |
| Email notification setup | Owner should manually verify notification setup before launch with test data only. | Pre-launch manual check |
| Vercel Production env | Owner should verify Production env values in Vercel dashboards without exposing secrets. | Pre-launch manual check |
| Supabase configuration | Owner should verify project, table, storage, and RLS assumptions from dashboards only, without committing secrets. | Pre-launch manual check |

Admin and operational checks must use synthetic or explicitly approved test data.
Do not use a real customer brief for testing without consent.

## 7. Technical Validation Checklist

Recent completed validation evidence:

- `npm.cmd run build` passed.
- Preview-route e2e runnable tests were ok.
- Concept-validation preview grep runnable tests were ok.
- Windows Playwright teardown/outer-timeout caveat was noted after runnable
  tests had reported ok.
- Final git status was clean after cleanup.

Agent 63B does not rerun build or Playwright because this is a docs-only
checklist task.

Pre-launch manual checks for a separately approved owner verification:

- [ ] Run `npm.cmd run build`.
- [ ] Optionally rerun the two preview e2e checks.
- [ ] Manually submit one test brief in Production only when the owner
      intentionally starts launch verification.
- [ ] Verify admin notification email only with test data.
- [ ] Verify protected admin detail link only with test data.
- [ ] Verify reference image upload/open only with test data.

No-go if build fails, focused preview checks fail, or manual Production
verification cannot be completed safely with synthetic data.

## 8. Launch-Day Manual Checklist

Owner steps to perform manually when intentionally starting launch-day
verification. Agent 63B does not execute any of these steps.

- [ ] Confirm Vercel Production env exists.
- [ ] Confirm Resend domain and sender remain valid.
- [ ] Confirm Cloudflare DNS remains valid.
- [ ] Confirm Supabase storage buckets and RLS assumptions.
- [ ] Confirm admin email recipient.
- [ ] Confirm privacy and customer expectation copy.
- [ ] Confirm no real customer brief is used for testing without consent.
- [ ] Confirm rollback path.

The owner should stop launch preparation if any dashboard value is missing,
unexpected, or cannot be verified without exposing secrets.

## 9. Explicit No-Go Conditions

Do not proceed with controlled soft-launch preparation if any condition below is
true:

- Build fails.
- Public flow fails.
- Admin/protected link leaks publicly.
- An unreviewed AI sketch appears customer-facing.
- Preview route exposes provider data, internal prompt data, provider responses,
  provider IDs, image URLs, or base64 image data.
- Email sends a real customer-facing sketch automatically.
- Payment, quote, CAD, order, or production approval is implied.
- Env values or secrets are missing, exposed, committed, pasted into chat, or
  visible in public docs/logs.
- Supabase or storage Production checks fail.
- Legal, privacy, or customer expectation copy is misleading.

Any no-go condition should be resolved in a separate scoped task before launch
preparation resumes.

## 10. Out Of Scope For MVP

The following are out of scope for this MVP readiness state:

- Real OpenAI/image API sketch generation for customers.
- Automatic sketch delivery.
- Payment.
- Online quotation.
- CAD approval.
- Production approval.
- Order management.
- Inventory.
- Full CRM.
- Customer portal for approved sketches.
- Self-serve production flow.

These items require separate product, technical, legal, and operational approval
before implementation.

## 11. Final Recommendation

NOVORA MVP is ready for controlled owner-led soft-launch preparation if this
checklist remains green and the owner-run manual checks pass.

NOVORA MVP is not ready for a fully automated launch. It is not ready for paid
image-generation automation, automatic customer-facing sketch delivery, CAD
approval, online quotation, payment, order approval, or production approval.

The next recommended step is owner-run Production verification. If the owner
wants one more narrow preparation layer first, the safer alternative is a small
launch-copy/manual-check agent that remains docs-only or copy-only within a
clearly approved scope.

## 12. Evidence And Recent History

- Agent 62B hardened the preview mock flow so only the exact mock route can show
  the `first_preview_ready` demo state, with unsupported states collapsing
  safely.
- Agent 63A smoke QA found stale preview-route tests after Agent 62B.
- Agent 63A-F1 aligned tests with the hardened preview boundaries and merged PR
  #179.
- Agent 63A smoke QA rerun passed.
- No deployment or Production mutation was performed by these agents.
- No Supabase, SQL, environment, protected admin data, email, payment, CAD,
  quotation, order, production, OpenAI/image API, or live image-generation action
  was performed by Agent 63B.
