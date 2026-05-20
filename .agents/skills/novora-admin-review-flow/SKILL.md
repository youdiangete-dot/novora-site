---
name: novora-admin-review-flow
description: Workflow guardrails for NOVORA admin review MVP under /admin/briefs. Use when changing admin brief listing, detail review, access gating, localStorage review state, concept brief visibility, admin copy, or tests that cover the admin review experience.
---

# NOVORA Admin Review Flow

## When To Use

Use this skill for tasks affecting `/admin/briefs`, `/admin/briefs/[id]`, admin access helpers, admin review state, concept brief review UI, and Playwright coverage that touches admin review or submitted brief behavior.

## Step-By-Step Checklist

1. Read the current admin pages, admin access helper, concept brief submission flow, and relevant tests before editing.
2. Confirm whether admin data is mock/local browser storage, API-backed, or Supabase-backed in the current branch.
3. Preserve local storage keys unless the task explicitly includes migration:
   - `novora_concept_brief`
   - `novora_submitted_concept_brief`
   - `novora_admin_brief_review_state`
4. Keep admin review framed as manual review of concept brief intake, not order approval, production readiness, or CAD confirmation.
5. Maintain access gating where it exists. Do not weaken or bypass admin access controls.
6. Keep customer contact information and brief details displayed only in admin contexts that are intentionally protected for the current MVP.
7. Preserve clear empty, loading, unavailable, and fallback states.
8. Maintain responsive layout and accessible controls for review actions.
9. Update `tests/e2e/design-concept-validation.spec.ts` or add focused coverage when behavior, copy asserted by tests, or state transitions change.
10. Verify the customer flow still lands on `/design/submitted` with the expected reference behavior when admin changes touch submitted brief data.

## Forbidden Actions

- Do not add real authentication, accounts, payments, order management, production workflows, or designer portal behavior unless explicitly requested.
- Do not expose server-only secrets or raw internal provider errors in admin UI.
- Do not change customer-visible reference formats casually.
- Do not remove the local/admin mock fallback unless the task explicitly replaces it with server persistence.
- Do not imply that admin review approves final CAD, pricing, sourcing, production, or fulfillment.

## Validation And Reporting Expectations

- For admin UI or state changes, run focused Playwright coverage when feasible.
- For protected/admin route changes, run a build check unless the change is documentation-only.
- For copy-only admin changes, report whether tests were updated or why no test change was needed.
- In the final report, identify affected admin routes, storage keys, and whether behavior remains local/mock or server-backed.
