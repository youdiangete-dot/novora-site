---
name: novora-supabase-safe-backend
description: Safety workflow for NOVORA Supabase backend, persistence, server environment, storage, and concept brief API changes. Use when editing Supabase clients, server-only env helpers, concept brief persistence, storage bucket handling, database-facing routes, or docs that affect backend setup.
---

# NOVORA Supabase Safe Backend

## When To Use

Use this skill before changing Supabase-related code or documentation, including `app/api/concept-briefs/route.ts`, `lib/server/concept-brief-persistence.ts`, `lib/server/concept-brief-validation.ts`, `lib/server/supabase.ts`, `lib/server/env.ts`, backend setup docs, and any future storage helpers.

## Step-By-Step Checklist

1. Confirm whether the task is documentation-only, code skeleton, real persistence, or storage behavior.
2. Read `docs/novora-current-project-state.md` before any Supabase-facing
   implementation slice, because it records the current table, storage, email,
   and non-goal boundaries.
3. Read the relevant server files before editing: validation, persistence, Supabase client, server env, and the affected route.
4. Preserve graceful fallback behavior when Supabase is not configured, unless the user explicitly asks to make persistence mandatory.
5. Keep service-role operations server-only and behind deliberate route/helper boundaries.
6. Validate accepted payload shapes with the existing concept brief validation model before writing to persistence code.
7. Preserve `publicReference` and `NOVORA-CB-...` customer-visible ID semantics.
8. Keep storage bucket usage private/server-controlled unless auth, policies, and customer display rules are part of the explicit task.
9. Avoid logging raw payloads when they may contain customer contact details, reference descriptions, or future uploaded asset metadata.
10. Update focused tests or docs when payload, persistence, or environment behavior changes.
11. Run the narrowest meaningful verification, with `npm run build` as the baseline for server code changes.

## Forbidden Actions

- Do not expose or log `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DATABASE_URL`, storage secrets, `OPENAI_API_KEY`, or other server-only values.
- Do not move privileged values into `NEXT_PUBLIC_*`.
- Do not commit `.env.local`, provider env dumps, password notes, screenshots, or secret note files.
- Do not change Supabase schema, RLS, storage policies, buckets, migrations, or Vercel environment variables unless the task explicitly asks for that slice.
- Do not introduce auth, uploads, AI generation, order creation, payments, production approval, or customer-visible generated assets unless explicitly requested.
- Do not remove local fallback behavior from the MVP flow without clear approval.
- Stop and ask before SQL execution, schema changes, RLS changes, grants,
  policies, storage bucket changes, customer data mutation, service-role/admin
  key handling, retry/resend behavior, Vercel env changes, or Production deploy.
- Do not treat documentation approval as approval to execute SQL or mutate
  Supabase; those require explicit task-level approval.

## Validation And Reporting Expectations

- Report whether the change is docs-only, skeleton-only, or live persistence behavior.
- For code changes, report the validation performed, including build and any focused tests.
- For docs-only changes, report that no build was run because behavior was not changed.
- If any environment variable names change, call out the browser-visible versus server-only classification.
- If validation cannot run, state the blocker and the residual risk.
