# NOVORA Production Security Runbook

This runbook is the concise operating checklist for NOVORA Production security,
provider safety, and incident response. It does not contain secrets, tokens,
admin keys, SQL statements, or raw environment values.

## Production Systems Overview

- Domain: `novora.design` and `www.novora.design`.
- Hosting: Vercel project `project-dd34e`, with `main` deploying to Production.
- Database and storage: Supabase project `novora-production`.
- Email delivery: Resend sender domain `notify.novora.design`.
- DNS and sender authentication: Cloudflare-managed domain and DNS records.
- Core customer data path: Concept Brief intake, Supabase persistence, reference
  image storage, admin review, and admin notification email.

## Secrets Handling Rules

- Never paste secrets into chat, docs, PR descriptions, logs, tickets, or test
  output.
- Never commit `.env*`, provider exports, password notes, service role keys,
  admin access keys, API keys, or files named like `SUPABASE *.txt` or
  `NOVORA-Supabase-env-*.txt`.
- Keep server secrets server-only. Browser-visible variables must use the
  `NEXT_PUBLIC_*` prefix and must not contain private credentials.
- Rotate exposed or suspected-exposed secrets immediately through the provider
  dashboard, then update Vercel environment variables through the approved
  manual process.
- Treat screenshots and copied terminal output as potentially sensitive if they
  include environment pages, provider dashboards, request headers, customer
  records, or admin URLs.

## Supabase Safety Rules

- Do not run SQL, alter schema, change RLS, grants, policies, storage buckets, or
  customer data without explicit task approval.
- Preserve service-role-only access for admin and notification internals.
- Keep graceful fallback behavior where the MVP already allows local front-end
  flow to continue without persistence.
- Before any approved Supabase change, prepare a written plan covering expected
  tables, policies, rollback, and verification.
- After approved Supabase changes, verify least-privilege access and record the
  change in `docs/novora-current-project-state.md` when it affects durable
  project state.

## Vercel Environment Safety Rules

- Do not add, edit, remove, or reveal Vercel environment variables without
  explicit approval.
- Apply environment changes manually through the approved Vercel workflow unless
  a task specifically authorizes CLI automation.
- Keep Production, Preview, and Development values intentionally scoped.
- After any approved Production environment change, trigger only the deployment
  or redeploy step that was explicitly approved.
- Verify that no environment values are printed by builds, logs, errors, or
  client bundles.

## Resend And Cloudflare Safety Rules

- Do not change Resend sender domains, API keys, webhook settings, recipients,
  DNS records, SPF, DKIM, DMARC, or Cloudflare configuration without explicit
  approval.
- Do not send real email unless the task explicitly authorizes the send, the
  recipient, and the purpose.
- Treat retry and resend behavior as high risk because it can create duplicate
  customer or admin notifications.
- Verify email changes with controlled test submissions only when the task
  explicitly permits them.
- Record durable provider state changes in the project ledger after verification.

## Incident Response Checklist

1. Pause unrelated work and preserve evidence: timestamps, deployment IDs,
   affected routes, request IDs, provider status, and screenshots with secrets
   redacted.
2. Classify impact: security exposure, data integrity issue, email delivery
   issue, customer-facing outage, admin access issue, or provider outage.
3. Contain first: disable the affected integration, revoke a key, roll back a
   deployment, or block access only when the action is approved and understood.
4. Rotate any exposed or suspected-exposed credential.
5. Verify customer data impact using approved read-only provider checks.
6. Communicate status with clear facts, unknowns, mitigation, and next update
   timing.
7. Document root cause, customer impact, remediation, and follow-up prevention.

## Rollback Checklist

1. Identify the last known good deployment, PR, schema state, and provider
   configuration.
2. Prefer Vercel rollback for app regressions that do not require data or
   provider changes.
3. Do not roll back SQL, storage, RLS, provider configuration, or environment
   variables without an explicit rollback plan and approval.
4. Confirm whether rollback could resend notifications, orphan uploads, hide
   admin data, or break protected reference links.
5. Verify the customer intake path and protected admin review path after the
   rollback.
6. Record the rollback action and current baseline in the project ledger when it
   changes durable Production state.

## Dependency And Security Update Process

- Treat package changes as out of scope unless the task explicitly asks for a
  dependency or security update.
- For approved updates, review release notes and security advisories before
  changing lockfiles.
- Prefer narrow updates for security fixes; avoid broad dependency churn.
- Run the appropriate validation for the touched surface, with `npm run build`
  as the minimum for app-code dependency updates.
- Document any runtime behavior, migration, or deployment follow-up that the
  update requires.

## Customer Data Handling Reminders

- Concept Briefs, contact details, reference images, admin notes, and protected
  admin URLs are customer or business-sensitive data.
- Use the minimum data needed to debug an issue.
- Redact names, emails, phone numbers, addresses, free-text brief content, image
  URLs, and public references when sharing outside the approved workspace.
- Do not download or export customer data unless explicitly approved for the
  incident or support task.
- Do not use real customer data in tests, screenshots, examples, or PR comments.

## Admin Access Emergency Checklist

1. Confirm whether the issue is credential loss, suspected credential exposure,
   unauthorized access, locked-out admin, or broken admin route.
2. Preserve relevant evidence without exposing admin keys or customer data.
3. Rotate the admin access key if exposure is suspected.
4. Update Vercel environment variables only through the approved manual process.
5. Redeploy only when explicitly approved.
6. Verify `/admin/briefs`, admin detail pages, protected reference links, and
   admin note behavior with controlled test data when permitted.
7. Record the emergency action and new operational baseline without recording
   the secret value.

## What Codex Must Never Do Automatically

- Do not edit app code during a docs-only security task.
- Do not run SQL or mutate Supabase schema, RLS, grants, policies, storage, or
  customer data.
- Do not read, print, copy, stage, commit, or summarize secrets or provider
  credentials.
- Do not change Vercel environment variables, Resend, Cloudflare, DNS, sender
  authentication, retry/resend behavior, payments, auth, CAD, orders, production
  workflows, or AI generation without explicit approval.
- Do not send real email, trigger Production deploys, merge PRs, force push, or
  run `git add .`.
- Do not broaden an incident or docs task into implementation work without a new
  approved scope.
