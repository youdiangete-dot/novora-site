---
name: novora-admin-review-flow
description: Workflow guardrails for NOVORA admin review MVP under /admin/briefs. Use when changing admin brief listing, detail review, access gating, localStorage review state, concept brief visibility, admin copy, or tests that cover the admin review experience.
---

# NOVORA Admin Review Flow

## When To Use

Use this skill for tasks affecting `/admin/briefs`, `/admin/briefs/[id]`, admin access helpers, admin review state, concept brief review UI, and Playwright coverage that touches admin review or submitted brief behavior.

## Step-By-Step Checklist

1. Read `docs/novora-current-project-state.md` before admin review changes so
   the current mock, API-backed, or Supabase-backed state is not guessed from
   memory.
2. Read the current admin pages, admin access helper, concept brief submission flow, and relevant tests before editing.
3. Confirm whether admin data is mock/local browser storage, API-backed, or Supabase-backed in the current branch.
4. Treat read-only admin display, filtering, and copy changes differently from
   mutations. Review-state mutation, note persistence, retry/resend, customer
   data mutation, and notification behavior require explicit scope approval.
5. Preserve local storage keys unless the task explicitly includes migration:
   - `novora_concept_brief`
   - `novora_submitted_concept_brief`
   - `novora_admin_brief_review_state`
6. Keep admin review framed as manual review of concept brief intake, not order approval, production readiness, or CAD confirmation.
7. Maintain access gating where it exists. Do not weaken or bypass admin access controls.
8. Keep customer contact information and brief details displayed only in admin contexts that are intentionally protected for the current MVP.
9. Preserve clear empty, loading, unavailable, and fallback states.
10. Maintain responsive layout and accessible controls for review actions.
11. Update `tests/e2e/design-concept-validation.spec.ts` or add focused coverage when behavior, copy asserted by tests, or state transitions change.
12. Verify the customer flow still lands on `/design/submitted` with the expected reference behavior when admin changes touch submitted brief data.

## Forbidden Actions

- Do not add real authentication, accounts, payments, order management, production workflows, or designer portal behavior unless explicitly requested.
- Do not expose server-only secrets or raw internal provider errors in admin UI.
- Do not change customer-visible reference formats casually.
- Do not remove the local/admin mock fallback unless the task explicitly replaces it with server persistence.
- Do not imply that admin review approves final CAD, pricing, sourcing, production, or fulfillment.
- Do not add, change, or trigger retry/resend behavior without explicit approval.
- Do not mutate customer data, admin notes, notification events, or Supabase rows
  unless the task explicitly approves that mutation boundary.

## Validation And Reporting Expectations

- For admin UI or state changes, run focused Playwright coverage when feasible.
- For protected/admin route changes, run a build check unless the change is documentation-only.
- For copy-only admin changes, report whether tests were updated or why no test change was needed.
- In the final report, identify affected admin routes, storage keys, whether the
  change was read-only or mutating, and whether behavior remains local/mock,
  API-backed, or Supabase-backed.
