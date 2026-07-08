# NOVORA Agent 64A Production Owner-Run Verification Plan

## 1. Title And Purpose

This is the owner-run Production verification plan for NOVORA controlled soft
launch.

This document does not deploy NOVORA, mutate Production, execute SQL, send
emails, approve launch, approve commercial readiness, or change any customer,
provider, Supabase, Vercel, Resend, Cloudflare, OpenAI, payment, CAD, order, or
production behavior by itself.

All real Production checks must be intentionally run by the owner. Codex should
not perform these checks unless a separate reviewed task explicitly approves the
exact action and the action does not violate a must-stop boundary.

## 2. Preconditions Before Starting Production Verification

Before any Production verification starts, confirm:

- `main` is clean and aligned with `origin/main`.
- The latest MVP readiness checklist is merged.
- The owner has access to Vercel, Supabase, Resend, Cloudflare, and the
  Gmail/admin mailbox.
- The owner uses only clearly marked test data.
- No real customer brief is used without customer consent.
- Secrets are never pasted into ChatGPT, Codex, GitHub, docs, screenshots, logs,
  tickets, commits, or pull requests.
- The owner has a rollback and stop plan before testing starts.

Do not ask Codex to read, print, inspect, transform, summarize, or store secret
values.

## 3. Production Environment Verification Checklist

Owner-run manual checks only:

- [ ] Confirm a Vercel Production deployment exists for the current `main`
      baseline.
- [ ] Confirm `novora.design` resolves to the intended Production deployment.
- [ ] Confirm `www.novora.design` redirect behavior is acceptable.
- [ ] Confirm required Production environment variables exist in Vercel without
      exposing values.
- [ ] Confirm Supabase URL, anon key, service-role key, and database/storage
      assumptions exist only in secure provider dashboards.
- [ ] Confirm Resend environment values exist only in secure provider
      dashboards.
- [ ] Confirm no secrets are committed to the repository.

Do not copy environment variable values out of provider dashboards. Do not ask
Codex to read or print environment values.

## 4. Public Website Smoke Verification Checklist

Owner-run manual checks using test data only:

- [ ] Open the homepage.
- [ ] Verify `/design/start`.
- [ ] Verify `/design/concept`.
- [ ] Verify `/design/brief`.
- [ ] Submit one clearly marked test Concept Brief only.
- [ ] Include one small test reference image only if needed.
- [ ] Verify `/design/submitted`.
- [ ] Verify the customer-visible `public_reference` is shown safely.
- [ ] Verify any demo/mock preview link remains clearly mock/demo and not real
      customer delivery.
- [ ] Verify no unreviewed AI sketch is shown to the customer as final.

Stop if any public route implies that submitting a Concept Brief creates a
payment, quote, CAD approval, order, production approval, or final customer
delivery.

## 5. Admin And Protected Flow Verification Checklist

Owner-run manual checks using test data only:

- [ ] Verify admin login/access.
- [ ] Verify `/admin/briefs` list loads.
- [ ] Verify the test brief appears.
- [ ] Verify the detail page opens only through the protected admin path.
- [ ] Verify the protected admin detail link from email works.
- [ ] Verify reference image count and Open reference behavior with test data.
- [ ] Verify no protected admin detail link or protected reference asset link
      appears publicly.
- [ ] Verify admin review state remains internal.

Do not expose admin access keys, protected links for real customer records, row
data, screenshots containing customer data, or internal notes to ChatGPT, Codex,
GitHub, public docs, or public tickets.

## 6. Email Notification Verification Checklist

Owner-run manual checks:

- [ ] Submit a clearly marked test Concept Brief.
- [ ] Verify the admin notification email arrives.
- [ ] Verify sender, reply-to, and sending domain look correct.
- [ ] Verify the email contains a protected admin detail link only.
- [ ] Verify no customer-facing AI sketch is sent automatically.
- [ ] Verify no real customer-facing approved sketch email is sent unless it is
      intentionally done outside MVP automation.

This checklist does not approve sending any real customer email or changing
retry, resend, notification, Resend, Gmail, or domain behavior.

## 7. AI Sketch And Preview Safety Verification Checklist

Confirm:

- [ ] No live OpenAI/image API generation occurs during the public flow.
- [ ] No provider prompt, provider response, provider ID, image URL, base64
      image data, or internal prompt data is visible publicly.
- [ ] `first_preview_ready` remains mock/demo-only.
- [ ] `approved_for_customer` is not automatic public delivery.
- [ ] Human review remains required.
- [ ] Customer-facing delivery remains email-only after human approval.
- [ ] Raw customer brief text is not used directly as a final image prompt.

The public MVP must continue to treat the sketch preview as concept direction
only, not CAD, quote, payment confirmation, order approval, or production
approval.

## 8. Supabase And Storage Verification Checklist

Owner-run dashboard/manual checks only:

- [ ] Confirm expected Supabase tables exist.
- [ ] Confirm expected Supabase Storage buckets exist.
- [ ] Confirm reference image uploads work with test data.
- [ ] Confirm RLS and storage access assumptions remain safe.
- [ ] Do not run SQL from Codex.
- [ ] Do not expose row data or customer data to ChatGPT.
- [ ] Do not mutate Production except intentional test submissions.

Any SQL, schema, RLS, grant, policy, storage, or customer-data change requires a
separate reviewed task and explicit owner approval.

## 9. Soft-Launch Go/No-Go Decision Checklist

Green-light conditions:

- [ ] Public flow passes with test data.
- [ ] Admin flow passes with test data.
- [ ] Email notification passes with test data.
- [ ] Protected links do not leak.
- [ ] No unreviewed AI sketch is publicly delivered.
- [ ] No secrets are exposed.
- [ ] The owner understands the manual-only workflow.

No-go conditions:

- Build or deploy failure.
- Public submission failure.
- Admin cannot access the test brief.
- Protected links leak publicly.
- Reference image access leaks publicly.
- Email fails or sends wrong content.
- An unreviewed AI sketch appears customer-facing.
- Provider or internal prompt data appears publicly.
- Any payment, CAD, quote, order, or production approval is implied.
- Secrets or environment values are missing or exposed.
- Rollback path is unclear.

If any no-go condition appears, stop verification and fix the issue in a
separate scoped task before launch preparation resumes.

## 10. Rollback And Stop Procedure

If verification exposes a serious issue:

- Stop accepting new test submissions.
- Revert the recent deployment through Vercel if needed.
- Disable or remove problematic environment variables only from secure provider
  dashboards, not in Git.
- Pause public sharing of the URL.
- Preserve logs and screenshots privately for debugging.
- Do not expose customer data in bug reports.

If real customer data may be involved, keep all evidence private and redacted,
and avoid moving screenshots, logs, or row data into ChatGPT, Codex, GitHub
issues, pull requests, or public documentation.

## 11. Soft-Launch Execution Posture

The approved posture is controlled soft launch only:

- Owner-led manual verification.
- Small number of trusted testers only.
- No public marketing blast yet.
- No paid automation.
- No real AI sketch automation.
- No production-order commitment through the website.

NOVORA remains a guided Concept Brief intake and manual studio review MVP. Paid
CAD, quote, payment, order approval, production approval, and real customer-safe
AI sketch delivery remain separate future workflows.

## 12. Final Recommendation

If all owner-run Production checks pass with test data, NOVORA can proceed to a
controlled soft launch with trusted testers.

If any no-go condition appears, stop and fix the issue before launch.

Full automation remains out of scope.
