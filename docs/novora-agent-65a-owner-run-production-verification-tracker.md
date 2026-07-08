# NOVORA Agent 65A Owner-Run Production Verification Execution Tracker

## 1. Title And Purpose

This is the owner-run Production verification execution tracker for NOVORA.

Use this document to record manual Production verification checks, test-data
results, evidence references, blockers, rollback or stop actions, and the final
go/no-go decision.

This document is for recording manual checks only. It does not perform
verification, deploy, mutate Production, execute SQL, send emails, inspect
secrets, approve launch, approve commercial readiness, or change any Supabase,
Vercel, Resend, Cloudflare, OpenAI, payment, CAD, quote, order, or production
behavior by itself.

## 2. Safety Rules Before Filling The Tracker

Before filling this tracker:

- Use only clearly marked test data.
- Never use real customer briefs without customer consent.
- Never paste secrets, environment values, tokens, row data, customer data,
  email contents containing private data, or protected URLs into ChatGPT,
  Codex, GitHub, or docs.
- Store screenshot evidence privately with the owner.
- Avoid public links in this tracker unless they are intentionally
  non-sensitive.
- If sensitive data appears, stop and redact it privately before continuing.
- Do not give Codex or ChatGPT Production access.

## 3. Test Data Template

Use placeholder or clearly marked test values only. Do not include real
secrets, real customer data, protected links, or real customer email contents.

| Field | Owner-filled value |
| --- | --- |
| Test run ID | `TEST-RUN-YYYYMMDD-001` |
| Date/time | `YYYY-MM-DD HH:MM timezone` |
| Owner/operator | `Owner Name` |
| Environment | Production |
| Test customer name, clearly marked as TEST | `TEST Customer Name` |
| Test email | `test-customer@example.com` |
| Test phone/WhatsApp, optional | `TEST optional phone or WhatsApp` |
| Test country/region | `TEST country or region` |
| Test jewelry category | `Ring / Necklace / Bracelet / Earrings / Other` |
| Test brief summary | `Short TEST-only design summary` |
| Reference image used | `yes/no` |
| public_reference generated | `NOVORA-CB-YYYYMMDD-XXXX` |
| Admin notification received | `yes/no` |
| Admin detail link tested | `yes/no` |
| Final decision | `PASS / FAIL / BLOCKED` |

## 4. Evidence Log Template

Evidence files are private owner records and must not be committed to Git.
Keep screenshots, dashboard captures, email captures, and logs outside the
repository unless a separate reviewed task explicitly approves a sanitized
documentation artifact.

| Evidence ID | Check area | Private evidence filename or location | Sensitive data included? yes/no | Redaction needed? yes/no | Owner notes | Pass/fail/blocker reference |
| --- | --- | --- | --- | --- | --- | --- |
| `EV-001` | `Public website` | `Private owner folder / sanitized filename` | `yes/no` | `yes/no` | `Owner notes only` | `PASS / FAIL / BLK-001` |
| `EV-002` | `Admin protected flow` | `Private owner folder / sanitized filename` | `yes/no` | `yes/no` | `Owner notes only` | `PASS / FAIL / BLK-002` |
| `EV-003` | `Email notification` | `Private owner folder / sanitized filename` | `yes/no` | `yes/no` | `Owner notes only` | `PASS / FAIL / BLK-003` |

## 5. Production Preflight Tracker

| Check | Result | Owner notes |
| --- | --- | --- |
| Local `main` is clean and aligned before verification | `PASS / FAIL / BLOCKED` |  |
| Latest readiness docs are merged | `PASS / FAIL / BLOCKED` |  |
| Owner has Vercel dashboard access | `PASS / FAIL / BLOCKED` |  |
| Owner has Supabase dashboard access | `PASS / FAIL / BLOCKED` |  |
| Owner has Resend dashboard access | `PASS / FAIL / BLOCKED` |  |
| Owner has Cloudflare dashboard access | `PASS / FAIL / BLOCKED` |  |
| Owner has admin mailbox access | `PASS / FAIL / BLOCKED` |  |
| Rollback/stop path is understood | `PASS / FAIL / BLOCKED` |  |
| Test data is prepared | `PASS / FAIL / BLOCKED` |  |
| No real customer data is used | `PASS / FAIL / BLOCKED` |  |

## 6. Public Website Verification Tracker

| Check | Result | Evidence ID | Owner notes |
| --- | --- | --- | --- |
| Homepage opens | `PASS / FAIL / BLOCKED` |  |  |
| `/design/start` opens | `PASS / FAIL / BLOCKED` |  |  |
| `/design/concept` opens | `PASS / FAIL / BLOCKED` |  |  |
| `/design/brief` opens | `PASS / FAIL / BLOCKED` |  |  |
| Test brief submits successfully | `PASS / FAIL / BLOCKED` |  |  |
| Optional test reference image upload works | `PASS / FAIL / BLOCKED` |  |  |
| `/design/submitted` opens | `PASS / FAIL / BLOCKED` |  |  |
| `public_reference` appears safe | `PASS / FAIL / BLOCKED` |  |  |
| Demo/mock preview wording remains clear | `PASS / FAIL / BLOCKED` |  |  |
| No unreviewed AI sketch appears as customer final | `PASS / FAIL / BLOCKED` |  |  |
| No CAD, quote, payment, order, or production approval is implied | `PASS / FAIL / BLOCKED` |  |  |

## 7. Admin/Protected Verification Tracker

| Check | Result | Evidence ID | Owner notes |
| --- | --- | --- | --- |
| Admin access works | `PASS / FAIL / BLOCKED` |  |  |
| `/admin/briefs` list loads | `PASS / FAIL / BLOCKED` |  |  |
| Test brief appears in admin | `PASS / FAIL / BLOCKED` |  |  |
| Detail page opens only through protected admin path | `PASS / FAIL / BLOCKED` |  |  |
| Protected admin detail link works from test email | `PASS / FAIL / BLOCKED` |  |  |
| Reference image count is correct | `PASS / FAIL / BLOCKED` |  |  |
| Open reference works only as expected | `PASS / FAIL / BLOCKED` |  |  |
| No protected admin/reference link appears publicly | `PASS / FAIL / BLOCKED` |  |  |
| Admin review state remains internal | `PASS / FAIL / BLOCKED` |  |  |

## 8. Email Notification Tracker

| Check | Result | Evidence ID | Owner notes |
| --- | --- | --- | --- |
| Admin notification email arrives | `PASS / FAIL / BLOCKED` |  |  |
| Sender domain looks correct | `PASS / FAIL / BLOCKED` |  |  |
| Reply-to looks correct | `PASS / FAIL / BLOCKED` |  |  |
| Email subject/body are appropriate | `PASS / FAIL / BLOCKED` |  |  |
| Protected admin detail link exists | `PASS / FAIL / BLOCKED` |  |  |
| No customer-facing sketch email is sent automatically | `PASS / FAIL / BLOCKED` |  |  |
| No real customer-facing approved sketch is sent by automation | `PASS / FAIL / BLOCKED` |  |  |
| No sensitive secret appears in email | `PASS / FAIL / BLOCKED` |  |  |

## 9. AI Sketch / Preview Safety Tracker

| Check | Result | Evidence ID | Owner notes |
| --- | --- | --- | --- |
| No live OpenAI/image API generation in public flow | `PASS / FAIL / BLOCKED` |  |  |
| No provider prompt visible publicly | `PASS / FAIL / BLOCKED` |  |  |
| No provider response visible publicly | `PASS / FAIL / BLOCKED` |  |  |
| No provider IDs visible publicly | `PASS / FAIL / BLOCKED` |  |  |
| No image URLs/base64 visible publicly | `PASS / FAIL / BLOCKED` |  |  |
| `first_preview_ready` remains mock/demo-only | `PASS / FAIL / BLOCKED` |  |  |
| `approved_for_customer` is not automatic public delivery | `PASS / FAIL / BLOCKED` |  |  |
| Human review boundary remains clear | `PASS / FAIL / BLOCKED` |  |  |
| Customer delivery remains email-only after approval | `PASS / FAIL / BLOCKED` |  |  |
| Raw customer brief is not used directly as final image prompt | `PASS / FAIL / BLOCKED` |  |  |

## 10. Supabase/Storage Dashboard Tracker

Manual owner dashboard checks only. Do not paste row data, customer data,
protected links, secrets, dashboard exports, or screenshots with private data
into this tracker.

| Check | Result | Evidence ID | Owner notes |
| --- | --- | --- | --- |
| Expected tables are present | `PASS / FAIL / BLOCKED` |  |  |
| Expected storage buckets are present | `PASS / FAIL / BLOCKED` |  |  |
| Test submission row exists if owner intentionally submitted test data | `PASS / FAIL / BLOCKED` |  |  |
| Reference image upload recorded as expected | `PASS / FAIL / BLOCKED` |  |  |
| RLS/storage assumptions appear safe from dashboard review | `PASS / FAIL / BLOCKED` |  |  |
| No SQL run from Codex | `PASS / FAIL / BLOCKED` |  |  |
| No row/customer data pasted into docs or ChatGPT | `PASS / FAIL / BLOCKED` |  |  |
| No non-test Production mutation performed | `PASS / FAIL / BLOCKED` |  |  |

## 11. Go/No-Go Decision Record

| Field | Owner-filled value |
| --- | --- |
| Decision date | `YYYY-MM-DD` |
| Decision owner | `Owner Name` |
| Result | `GO / NO-GO / HOLD` |
| Required fixes before launch | `List required fixes or none` |
| No-go blockers | `List blocker IDs or none` |
| Rollback needed? | `yes/no` |
| Notes | `Owner notes` |
| Next authorized action | `Manual next step approved by owner` |

## 12. Blocker Log

| Blocker ID | Severity | Area | Description | Evidence ID | Owner action needed | Status | Resolved date |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `BLK-001` | `P0 / P1 / P2` | `Public / Admin / Email / Data / Safety` | `Short blocker description` | `EV-001` | `Owner action` | `Open / Fixed / Accepted / Deferred` | `YYYY-MM-DD or blank` |
| `BLK-002` | `P0 / P1 / P2` | `Public / Admin / Email / Data / Safety` | `Short blocker description` | `EV-002` | `Owner action` | `Open / Fixed / Accepted / Deferred` | `YYYY-MM-DD or blank` |

## 13. Rollback/Stop Log

| Trigger | Action taken | Vercel rollback needed? yes/no | Public sharing paused? yes/no | Env changed? yes/no | Data cleanup needed? yes/no | Owner notes |
| --- | --- | --- | --- | --- | --- | --- |
| `Issue or no-go condition` | `Action owner took` | `yes/no` | `yes/no` | `yes/no` | `yes/no` | `Owner notes` |

## 14. Final Recommendation

If all critical checks are `PASS` and no no-go blockers remain, the owner may
proceed to controlled trusted-tester soft launch.

If any no-go condition appears, stop and fix the issue before launch.

Full automation remains out of scope.
