# NOVORA AI Sketch Whitelist, Credits, And Payment Strategy

## 1. Purpose And Current Decision

This document records the owner planning direction for NOVORA's early AI
hand-drawn concept sketch workflow. It is strategy documentation only. It does
not implement app code, authentication, payment, provider integration, API keys,
environment variables, SQL, Supabase schema or storage changes, Production
access, admin access, email behavior, or real AI generation.

The current owner decision is to prioritize customer-perceived image quality and
timely response during the first controlled AI sketch test. The whitelist test
may intentionally spend money to validate whether customers trust the design
ability, understand the concept direction, and show willingness to pay for a
stronger final output.

This early spend should be treated as a controlled marketing and validation
cost, not as a profit model. Long-term NOVORA operation must move to prepaid
credits or point deduction before public or semi-public high-quality generation,
because uncontrolled free generation can quickly crush project economics.

## 2. Staged Customer Sketch Journey

The intended customer sketch journey is staged rather than one-shot:

1. Customer submits a Concept Brief.
2. The first sketch stage shows 2 advanced concept direction images.
3. The customer chooses the preferred direction.
4. The system refines the selected direction 1 to 2 times.
5. The customer should reach approximately 5 useful visible images through the
   staged interaction.
6. A premium closing or finalization image remains paid.

This staged model is better than generating 10 one-shot images because it lets
the customer guide the direction while the system spends quality budget on the
path that matters. It creates a more studio-like interaction: compare two
directions, choose the stronger design path, then refine toward a near-final
concept direction. It also keeps cost and review effort more controlled than a
large blind batch.

Every stage must keep the product boundary clear: an AI hand-drawn concept
sketch is a concept direction only. It is not CAD, not a quote, not an order,
not sourcing confirmation, and not production approval.

## 3. Whitelist Test Design

The early test should use a fixed whitelist:

- 10 fixed whitelist test users.
- 3 free test days.
- Up to 5 complete sketch attempts per day per test user.
- A fixed quota and project-wide budget cap.
- Synthetic, low-risk, or explicitly approved test data where appropriate.
- No public open free generation.

Each complete free attempt may include:

1. 2 advanced initial concept direction images.
2. Customer selection of the preferred direction.
3. 1 to 2 high-quality refinement rounds.
4. A near-final concept direction experience.

The purpose is to test customer trust, perceived design quality, feedback,
timely response, and willingness to pay. The purpose is not immediate profit.

## 4. Free Test Experience Boundary

The free whitelist stage exists so invited testers can experience NOVORA's
design ability. It may generate near-final concept directions, but it must not
be presented as CAD, a quote, an order, sourcing confirmation, or production
approval.

The free test should not grant unlimited high-resolution commercial export.
However, because the whitelist test is about trust and quality validation, the
experience should avoid heavy-handed restrictions that make the product feel
cheap or adversarial. The customer should feel the design quality clearly.

For later formal operation, NOVORA can consider preview boundaries such as
watermarking, lower resolution previews, limited export rights, or clearer
commercial-use gating. Those boundaries should be chosen carefully so they
protect cost and commercial value without damaging trust.

## 5. Paid Final Image And Package Design

Planned paid final output options:

| Package | Price | Intended Role |
| --- | ---: | --- |
| Single final image | $19 | Low-friction paid conversion. |
| Proposal final package | $29 | Main recommended customer package. |
| Commercial presentation / print-ready style package | $49 | Higher-value package for serious same-industry users. |

The $19 option should make it easy for a tester to pay once they trust the
direction. The $29 proposal final package should be the main recommended offer
because it can feel meaningfully more complete without a large price jump. The
$49 commercial presentation / print-ready style package is for serious
same-industry users who may use the image for real customer acquisition or
client-facing presentation.

The paid final output must have visibly higher value than free previews and
refinements. That value can come from better resolution, cleaner composition,
stronger final selection, more polished presentation, clearer export format, or
packaging suited for proposal use. It still remains an AI hand-drawn concept
sketch package, not CAD, quote, order, sourcing, or production approval.

## 6. Cost Model

These are rough internal planning estimates only, not exact provider pricing.
Real cost depends on provider, model, quality level, retry rate, failed outputs,
image size, and future provider terms.

Planning assumptions:

- Advanced image: about $0.50 each.
- High-quality refinement: about $1.00 each.
- One complete free attempt with 2 advanced images and 2 high-quality
  refinements: about $3.

Whitelist estimate:

| Scope | Estimate |
| --- | ---: |
| 1 complete free attempt | About $3 |
| 5 attempts/day x 3 days | 15 attempts per user |
| 15 attempts x $3 | About $45 per user |
| 10 users x $45 | About $450 |
| Suggested controlled test budget cap | About $500 to $700 |

The $500 to $700 cap allows some retry, quality, and buffer risk. This can be
acceptable only as controlled whitelist testing. It is not a sustainable
public-free model. Formal operation must use prepaid credits or point
deduction before high-quality generation opens beyond a tiny controlled group.

## 7. Credits / Point Deduction Model For Formal Operation

Prepaid credits must exist before public or semi-public high-quality AI sketch
generation. Credits should prevent surprise spend, make customer usage
intentional, and give NOVORA a clear unit economy.

Suggested credit packs:

| Price | Points |
| ---: | ---: |
| $29 | 30 points |
| $59 | 66 points |
| $99 | 120 points |
| $199 | 260 points |

Suggested point deduction defaults:

| Action | Points |
| --- | ---: |
| 2 advanced direction images | 6 points |
| 1 high-quality refinement | 8 points |
| Single final image | 19 points |
| Proposal final package | 29 points |
| Commercial presentation package | 49 points |

These are planning defaults only. They should be adjusted after real provider
cost data, retry rates, image-quality acceptance rate, customer conversion, and
owner support workload are known.

## 8. Customer Registration / Login Requirement

NOVORA should not allow anonymous high-quality generation. Whitelist test users
should register or be invited by email before using the free test quota.

The future account system should track:

- Customer profile.
- Whitelist status.
- Trial window.
- Daily quota.
- Credit balance.
- Generation history.
- Payment history.

Full authentication and login implementation is future work and must be
separately approved before any app code, database schema, provider setup, or
Production behavior changes.

## 9. Payment System Strategy

The payment path should be staged.

Test phase:

- Use manual PayPal invoice, PayPal payment link, or manual payment
  confirmation if available.
- The owner or admin manually grants final-image entitlement or credits after
  confirming payment.
- No automatic payment implementation is required for the first whitelist
  learning loop.

Semi-formal phase:

- Use PayPal or Stripe Checkout.
- Add webhook-based automatic credit grant only after a separate approved
  implementation task.
- Keep manual admin override for support, failed webhook, or exceptional cases.

Later formal phase:

- Add a full credit store.
- Show payment history.
- Define refund and chargeback rules.
- Record credit grants, deductions, reversals, and final package entitlement.

Payment provider choice depends on the owner's available legal, business,
regional, and payment setup. This document does not choose or implement a
payment provider.

## 10. Required Future Data Model Areas

Future implementation planning will likely need these data areas. This is a
planning list only and does not include SQL:

- User profile / customer account.
- Whitelist access table.
- Trial quota table.
- Credit account.
- Credit ledger.
- Payment records.
- Final sketch order/package table.
- AI sketch jobs.
- AI sketch outputs.
- Customer selection/refinement events.

The eventual schema should be reviewed in a separate approved Agent before any
SQL, Supabase schema, RLS, grants, policies, or storage changes.

## 11. Operational Guardrails

Required guardrails:

- Whitelist only during the test.
- Per-user daily quota.
- Project-wide spend cap.
- No unlimited retries.
- One active direction per attempt after the customer chooses.
- No public free high-quality generation.
- No unapproved customer data export.
- No API key exposure.
- No front-end API key.
- Budget monitoring.
- Admin override for abuse, exceptions, support, or owner-approved test cases.

Additional operating rules:

- Generation should stop when the project budget cap is reached.
- Quota should be checked before every generation action.
- Retry should require a reason or explicit admin/customer action, not an
  automatic loop.
- Provider failures should not deduct credits unless the owner intentionally
  chooses a later policy.
- Real customer data should not be used in provider tests without a separate
  approved privacy and Production plan.

## 12. UX And Page Flow Implications

Future `/design/sketch` behavior should show the staged flow:

1. Show two initial directions first, such as Direction A and Direction B.
2. Let the customer select one direction.
3. Show the next refinement round for the selected direction.
4. Allow 1 to 2 refinement rounds within quota.
5. Show the final package call to action after the free staged experience.

The page should make the current state obvious: waiting, choose a direction,
refining, near-final direction, or paid final package available. It should not
show a mock or browser-local placeholder as if it were a real generated sketch.

The existing homepage secondary "See how it works" CTA currently feels
non-functional. A later app cleanup should remove it or change it to a clearer
Concept vs CAD link. This Agent does not change app code.

## 13. Future Agent Sequence

Recommended follow-up sequence:

- Agent 31C: auth/whitelist/credits schema planning packet or implementation
  skeleton.
- Agent 31D: sketch job/status code foundation with mock/manual provider.
- Agent 31E: customer `/design/sketch` staged direction selection UI.
- Agent 31F: payment manual-entitlement MVP.
- Agent 31G: real image provider environment/setup and limited smoke plan.
- Agent 31H: real auto-generation with quota and budget caps.
- Agent 31I: payment webhook / automatic credit grant.

The order may change if the owner chooses to keep payment fully manual longer,
or if provider availability requires a separate environment and legal review
before any real generation smoke test.

## 14. Risk Register

| Risk | What Could Happen | Planning Response |
| --- | --- | --- |
| Free testing cost grows too high | Testers use the full quota or retries create more spend than expected. | Fixed whitelist, daily quota, project cap, no public free generation. |
| Customers use free images commercially without paying | Free near-final directions may be valuable enough for external use. | Paid final value, export boundary planning, possible watermark/lower-res later. |
| Test customers misunderstand concept sketches as CAD | Customers may think the image is production-ready. | Repeat concept-sketch-only boundary in UI and owner communications. |
| Final package price is too low or too high | Pricing may miss willingness to pay or fail to cover cost/support. | Treat $19/$29/$49 as test defaults and adjust with data. |
| Payment friction reduces conversion | Manual payment may interrupt the customer's enthusiasm. | Use manual payment for test, then move to Checkout/webhook when validated. |
| No credit system causes uncontrolled cost | Public or semi-public usage could trigger expensive generation volume. | Require prepaid credits before broader access. |
| Image quality is inconsistent | Some generations may not match NOVORA's taste or customer intent. | Stage selection/refinement, collect feedback, monitor retry rate. |
| API provider unavailable or payment blocked | Provider or payment setup may be delayed. | Keep manual/mock paths and provider choice open. |
| Abuse from shared whitelist access | Invites may be shared outside the intended test group. | Email invite/account tracking and admin override. |
| Customer data/privacy issues | Briefs or references may include sensitive or third-party material. | Use synthetic/approved test data and current-project-only data boundaries. |
| Chargebacks/refunds | Paid final packages may require support and reversal policies. | Define refund/chargeback rules before semi-formal payment. |
| API key leakage | Provider keys could be exposed through browser code, logs, or docs. | Server-only env, no front-end key, no keys in docs or screenshots. |
| Operational burden grows too fast | Manual entitlement, review, and support may exceed owner capacity. | Keep whitelist tiny and introduce automation only after validation. |

## 15. Decisions Still Needed

The owner still needs to decide:

- Whether free preview images have watermark or lower resolution during the
  whitelist test.
- Final payment provider choice.
- Whether $29 or $49 is the main promoted package.
- Whether a final paid image includes one minor revision.
- Whether each test user gets exactly 5 attempts/day or an owner-adjustable
  quota.
- Whether the trial starts at account invite or first generation.
- Whether formal credits expire.
- Refund policy.
- Provider choice: OpenAI, domestic provider, manual upload, or hybrid.
