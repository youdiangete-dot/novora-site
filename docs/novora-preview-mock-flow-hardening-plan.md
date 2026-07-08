# NOVORA Preview Mock Flow Hardening Plan

## Current Baseline

Agent 61K added the submitted-page mock preview entry/link. The link label is
`View mock concept preview` and the link target is:

`/design/preview/NOVORA-CB-MOCK-001?state=first_preview_ready`

Agent 61L completed read-only QA PASS for the mock flow from
`/design/submitted` to the mock preview route.

Agent 61M recorded the mock preview flow milestone in the project ledger.

The current flow remains mock-only:

- `/design/submitted` contains a mock preview link.
- `/design/preview/[public_reference]` renders local mock route states.
- The fixed mock reference is `NOVORA-CB-MOCK-001`.
- The first-preview demo state is `first_preview_ready`.
- The preview route uses mock-only bridge data.
- Design Spec fixture precedes Hand Sketch Instruction fixture.
- Hand Sketch Instruction fixture precedes the fake preview generation result.
- There is no real provider, no real image generation, no Supabase read/write,
  no database write, and no API integration.

## Non-Negotiable Safety Boundaries

- Raw customer brief text must not be used directly as a final
  image-generation prompt.
- Design Spec must precede Hand Sketch Instruction.
- Hand Sketch Instruction must precede any future provider-specific image
  prompt.
- `first_preview_ready` must remain separate from `approved_for_customer`.
- `first_preview_ready` is only a first concept preview lifecycle state.
- `approved_for_customer` is the human-reviewed customer-safe delivery concept.
- Mock preview is not customer-safe delivery approval.
- Human review remains required before customer-safe delivery or production
  decisions.
- AI sketch / preview is not CAD.
- AI sketch / preview is not a quote.
- AI sketch / preview is not order approval.
- AI sketch / preview is not payment approval.
- AI sketch / preview is not production approval.
- Current phase must not connect real GPT/OpenAI/image APIs.
- Current phase must not perform real image generation.
- Current phase must not read or write Supabase.
- Current phase must not execute SQL or migrations.
- Current phase must not touch Vercel env, deploy, Production data, or
  protected admin data.
- NOVORA branding must remain text-only watermark/footer label context.
- Do not create logo assets.
- Do not make any logo part of jewelry structure.

## Hardening Questions To Answer Before Implementation

- Should `/design/preview` require `state=first_preview_ready` for the mock
  route?
- What should happen if `state` is missing?
- What should happen if `state` is unsupported?
- What should happen if `public_reference` is not `NOVORA-CB-MOCK-001`?
- Should an unsupported `public_reference` show a safe mock unavailable state
  instead of pretending a real record exists?
- Should the submitted-page mock link remain customer-visible, or be clearly
  labeled as demo/internal planning only?
- Should the preview route expose Design Spec / Hand Sketch Instruction
  details, or keep them internal-facing only?
- Should the page copy more explicitly say no generated image exists yet?
- Should mock preview navigation be kept in the MVP, hidden later, or converted
  to partner-beta demo behavior?
- What QA should be required before any future real provider integration?

## Recommended Implementation Sequence

These are recommendations only. Agent 62A does not implement them.

- Agent 62B: plan or implement preview route behavior for missing/unsupported
  `state` and unsupported `public_reference`.
- Agent 62C: decide submitted-page mock link copy hardening or visibility.
- Agent 62D: harden preview route copy and disclaimers.
- Agent 62E: add focused e2e coverage for missing/unsupported `state` and
  unsupported `public_reference`.

Each follow-up Agent should remain narrow, start from latest `main`, and restate
whether it is docs-only, app-code, or test work before making changes.

## Risk Checklist

- Do not accidentally treat the mock public reference as a real record.
- Do not create customer confusion about approval state.
- Do not expose provider prompt details as customer-facing copy.
- Do not expose raw brief text as a provider prompt.
- Do not create an implied production workflow.
- Do not introduce Supabase, API, or image provider dependencies.
- Do not weaken existing tests.
- Avoid generated-file churn such as `next-env.d.ts`.

## Proposed Acceptance Criteria For Future Hardening Agents

- Exact route behavior is documented before or alongside implementation.
- Safe customer-facing copy is present.
- `first_preview_ready` and `approved_for_customer` remain separated.
- No live integration is added.
- No generated image claims are introduced.
- Build passes where applicable.
- Focused Playwright passes where applicable.
- `next-env.d.ts` remains clean or is restored if known local churn occurs.

## Out Of Scope

- No real GPT/OpenAI/image API integration.
- No real image generation.
- No Supabase read/write.
- No SQL or migration.
- No Production, admin, or protected data access.
- No deploy or environment-variable changes.
- No CAD approval.
- No quote approval.
- No payment approval.
- No order approval.
- No production approval.
