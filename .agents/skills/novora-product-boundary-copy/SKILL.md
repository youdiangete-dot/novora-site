---
name: novora-product-boundary-copy
description: NOVORA product copy and UX boundary guidance. Use when writing or editing customer-facing copy, admin-facing review copy, concept brief language, AI sketch descriptions, CAD/payment/order wording, localization notes, or any text that could imply unsupported jewelry production promises.
---

# NOVORA Product Boundary Copy

## When To Use

Use this skill when changing copy on the customer design flow, submitted page, admin review UI, documentation that describes product behavior, or any future-facing product text involving AI sketches, CAD, pricing, ordering, production, localization, or designer workflows.

## Step-By-Step Checklist

1. Identify whether the copy is customer-facing, admin-facing, developer documentation, or future roadmap language.
2. Keep the current MVP promise clear: NOVORA collects a concept brief and can guide an AI hand-drawn concept sketch direction; paid CAD and production decisions happen later.
3. Prefer phrases such as `concept direction`, `AI hand-drawn concept sketch`, `manual confirmation`, `design brief`, `review`, and `paid CAD later`.
4. Avoid unsupported specifics around materials, stone sizes, chain specs, pricing, timelines, shipping, tax, sourcing, manufacturing, or final approval unless backed by data and validation.
5. Keep jewelry studio tone warm, precise, professional, and trustworthy.
6. Keep admin copy framed as manual concept-brief review, not approval for CAD,
   pricing, sourcing, production, fulfillment, or retry/resend guarantees.
7. Preserve realistic choices and constraints already present in the current model.
8. For future markets, discuss localization as a future system that may affect language, currency, sizing, contact preferences, tax/shipping notes, trust copy, and support flow.
9. Keep AI sketch language separate from final reference uploads, paid CAD,
   pricing, sourcing, and production approval.
10. If copy is asserted in Playwright tests, update tests intentionally.
11. Review mobile readability when the copy appears in UI.
12. Report any wording that intentionally narrows or clarifies the product promise.

## Forbidden Actions

- Do not imply that an AI sketch is CAD-ready, production-ready, priced, sourced, or final-order approved.
- Do not promise final order creation, payment, manufacturing, fulfillment, delivery dates, or production approval during brief intake.
- Do not add unsupported materials, stone grades, stone sizes, chain specifications, prices, taxes, shipping claims, or market-specific legal claims.
- Do not implement language selectors, multilingual routing, translation files, country routing, currency, accounts, quota systems, AI generation, or designer portal features unless explicitly requested.
- Do not dilute required trust boundaries with vague luxury claims that overpromise the MVP.
- Do not imply admin review sends, retries, or guarantees email delivery unless
  the task explicitly covers notification behavior.

## Validation And Reporting Expectations

- For copy-only documentation changes, no build is required unless requested.
- For UI copy changes, run focused tests when existing tests assert the changed text.
- For layout-impacting copy changes, verify responsive behavior when feasible.
- In the final report, summarize the product boundary preserved and list any tests or checks performed.
