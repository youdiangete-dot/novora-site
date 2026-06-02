---
name: novora-customer-submission-integrity
description: NOVORA customer Concept Brief receipt and submission-success integrity rules. Use when changing or reviewing customer brief submission, submitted-page routing, local fallback, public references, Concept Brief IDs, rate-limit handling, admin notification triggers, or related copy.
---

# NOVORA Customer Submission Integrity

## When To Use

Use this skill when changing or reviewing `/design/brief`,
`/design/submitted`, `/api/concept-briefs`, local submission fallback,
submission-response validation, admin notification triggering, or copy that
tells a customer NOVORA received a Concept Brief.

## Receipt Integrity Rules

1. Customer-facing `received`, `submitted`, or success confirmation requires
   confirmed server persistence.
2. A response with `persisted: false`, missing persistence confirmation, or an
   otherwise unconfirmed save must not route a customer to `/design/submitted`
   as though NOVORA received the Concept Brief.
3. Before success confirmation, require both:
   - A valid customer-visible `publicReference` in the existing
     `NOVORA-CB-...` format.
   - A valid Concept Brief UUID.
4. Local storage and local fallback may preserve draft or summary state for
   recovery, but must not impersonate server receipt.
5. Legacy local-only records must not be displayed as confirmed NOVORA
   submissions.

## Rate Limit And Notification Rules

1. Preserve intentional `429` behavior: keep the customer on `/design/brief`
   and show safe retry messaging.
2. Do not turn a `429`, provider error, timeout, or unconfirmed response into
   local submitted success.
3. Admin notification must remain dependent on a confirmed persisted Concept
   Brief. Notification failure may be non-blocking after persistence succeeds,
   but notification must not be triggered for an unconfirmed brief.
4. Treat retry and resend behavior as a separate high-risk scope because it can
   create duplicate admin notifications.

## Product Boundary

- A received Concept Brief is an intake record for manual review.
- Do not imply CAD approval, production approval, final pricing, sourcing
  confirmation, payment, order confirmation, or real AI generation.
- Keep customer copy aligned with `novora-product-boundary-copy`.

## Review Checklist

1. Inspect both positive and negative submission paths.
2. Confirm success routing checks persistence, `publicReference`, and Concept
   Brief UUID together.
3. Confirm local draft or summary recovery cannot render server-receipt copy.
4. Confirm intentional `429` responses stay on `/design/brief`.
5. Confirm admin notification starts only after confirmed persistence.
6. Add or update focused Playwright coverage when behavior changes.
7. Run `npm run build` for app-code changes and the narrowest relevant test
   first.

## Forbidden Actions

- Do not weaken the confirmed-persistence success gate for convenience.
- Do not treat browser storage as evidence that NOVORA received a brief.
- Do not change retry/resend behavior, app code, tests, SQL, Supabase, Vercel
  environment variables, providers, secrets, email behavior, or Production
  deployment without the task-specific approval required by repository rules.
