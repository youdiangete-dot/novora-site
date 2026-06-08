# NOVORA AI Sketch Review Status Row-Value Precheck

## A. Purpose And Boundary

This is a row-value metadata precheck packet for
`public.ai_sketch_reviews.review_status`.

No SQL was executed by Codex for this packet. Codex did not connect to
Supabase, did not inspect live schema, did not query customer rows, and did not
inspect `reviewer_note`, `customer_safe_note`, IDs, brief content, contact
content, reference assets, protected admin pages, or any customer data.

This packet prepares a manual aggregate-only Supabase SQL Editor check by the
user. The check is intended to return only review status values and aggregate
counts needed before final ALTER-only SQL can be reviewed.

Merging this document does not approve SQL execution. Future ALTER execution
still requires final exact SQL, target-project confirmation, row-value
interpretation, rollback/verification posture, and separate explicit user
approval.

The NOVORA product boundary remains unchanged. AI sketches are concept sketches
only. They are not CAD, not quotes, not orders, and not production approval. AI
sketches are internal drafts until reviewed and approved by the NOVORA design
team. Customers must only see sketches approved by the NOVORA design team.
Unreviewed GPT/AI drafts must never be shown directly to customers.
`approved_for_customer` does not equal `approved_for_gallery`, and AI generation
success alone must not approve a sketch.

## B. Why This Precheck Is Required

The user-provided manual metadata from PR #113 showed
`public.ai_sketch_reviews.review_status` currently defaults to
`'pending'::text`.

The planned target first-scope statuses are:

- `internal_draft_not_generated`
- `draft_generated_internal_only`
- `needs_revision`
- `approved_for_customer`

No visible `review_status` CHECK constraint was found in the metadata supplied
for PR #113. The current row values were not inspected by Codex, and Codex does
not know whether existing `public.ai_sketch_reviews` records exist or whether
any records currently store `pending` or another value.

A future CHECK constraint, default change, or status migration could fail or
misclassify existing data if current row values are unknown. Therefore,
aggregate row-value counts must be checked before final ALTER SQL is prepared
or approved.

## C. Manual Aggregate-Only Query Packet

Manual aggregate-only query — DO NOT MODIFY DATA

Run the following in the Supabase SQL Editor only after confirming the target
project shown in the Supabase UI. Do not add columns, updates, deletes,
constraints, policy changes, grants, or any data-modifying statement to this
packet.

```sql
select
  review_status,
  count(*) as row_count
from public.ai_sketch_reviews
group by review_status
order by review_status;

select
  count(*) as total_review_rows
from public.ai_sketch_reviews;

select
  count(*) filter (
    where review_status in (
      'internal_draft_not_generated',
      'draft_generated_internal_only',
      'needs_revision',
      'approved_for_customer'
    )
  ) as target_status_rows,
  count(*) filter (where review_status = 'pending') as legacy_pending_rows,
  count(*) filter (
    where review_status not in (
      'internal_draft_not_generated',
      'draft_generated_internal_only',
      'needs_revision',
      'approved_for_customer',
      'pending'
    )
  ) as unexpected_status_rows
from public.ai_sketch_reviews;
```

The query returns aggregate-only status counts. It must not return IDs,
Concept Brief IDs, AI sketch output IDs, reviewer notes, customer-safe notes,
brief content, contact content, reference asset details, storage paths,
customer data, or private business content.

## D. Manual Result Template

When reporting results back into a future review packet, include only this
aggregate metadata:

- Target Supabase project shown in UI:
- Date/time checked by user:
- Grouped `review_status` result rows:
- `total_review_rows`:
- `target_status_rows`:
- `legacy_pending_rows`:
- `unexpected_status_rows`:

Do not paste IDs, `reviewer_note`, `customer_safe_note`, brief content, contact
content, reference assets, uploaded file metadata, storage object paths,
customer details, protected admin page content, or any other customer data.

## E. Interpretation Guide

If `total_review_rows` is `0`, existing row-value conflict risk is low, but SQL
still needs final exact review and separate explicit approval before any ALTER
execution.

If all existing rows use only the four target statuses, future CHECK/default SQL
can be reviewed against known compatible values. This still does not approve
SQL execution.

If `legacy_pending_rows` is greater than `0`, stop before any default change,
CHECK constraint, or status migration. NOVORA must decide whether and how
legacy `pending` rows map to `internal_draft_not_generated` before final SQL.

If `unexpected_status_rows` is greater than `0`, stop before final SQL. NOVORA
must prepare an explicit mapping, compatibility exception, or no-go decision
without exposing customer data.

Any result from this aggregate-only check is informational only. It does not
approve SQL execution, Supabase changes, app code, customer visibility, OpenAI
integration, image storage, public gallery behavior, auth, payment, CAD, order,
Production deploy, or merge.

## F. Next Step

The recommended next step is manual aggregate-only review of
`review_status` values by the user in Supabase SQL Editor. After the aggregate
results are known, prepare final exact ALTER-only SQL for review.

SQL execution remains blocked until the final exact SQL and status-row
interpretation are reviewed and the user separately gives explicit approval for
SQL execution.
