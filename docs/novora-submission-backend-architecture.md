# NOVORA Submission Backend Architecture

## 1. Current state

NOVORA currently has a front-end-only concept brief intake flow. The `/design/brief` page lets a customer submit a concept brief, and `/design/submitted` exists as the post-submission experience.

Submitted brief metadata is stored in the browser with localStorage under:

```text
novora_submitted_concept_brief
```

There is no real backend submission endpoint yet. There is also no database, real file upload storage, email notification system, payment flow, customer login, admin data protection, CAD order confirmation, or production order confirmation.

Reference image handling is not a real upload system yet. Any current front-end behavior should be treated as MVP simulation only, not durable storage.

## 2. Target MVP backend goal

The first real backend phase should turn the current front-end-only submission MVP into a lead capture system.

The MVP backend should:

- Save the customer concept brief.
- Save reference image files to durable upload storage.
- Store reference image URLs and metadata with the brief record.
- Notify NOVORA by internal email when a new brief is submitted.
- Send the customer a confirmation email.
- Provide data needed by a protected admin review page.

The MVP backend should preserve these boundaries:

- This is still not a CAD-ready order.
- This is still not final pricing.
- This is still not sourcing confirmation.
- This is still not production feasibility confirmation.
- This is still not production approval.

## 3. Recommended implementation phases

### Phase 1: Real brief submission API

Create the first server-side submission endpoint for concept briefs. The API should validate required customer and brief fields, create a durable concept brief record, generate or accept a stable `conceptBriefId`, and return a success response that the existing confirmation page can use.

This phase should not include payment, CAD automation, customer accounts, or order status features.

### Phase 2: Reference image upload storage

Add durable file upload storage for reference images. The application should upload image files to storage, then store only the resulting file URLs and metadata in the database.

This phase should replace any front-end-only file simulation with a real upload path while preserving conservative file type, count, and size limits.

### Phase 3: Email notification

Send an internal notification email to NOVORA for each successful brief submission. Send a customer confirmation email that clearly states the submission is a concept brief, not a CAD-ready production order.

Email failure handling should be explicit. A saved brief should not disappear because email delivery failed; instead, the admin review surface should expose notification status or retry needs.

### Phase 4: Protected admin review

Build a protected admin review page backed by real data. Admin pages must require authentication and authorization before any real customer data is displayed.

This phase should provide internal review fields, status changes, brief details, and reference image links. It should not expose service role keys or unrestricted customer data to the browser.

### Phase 5: CAD request flow

Add a separate CAD request flow after internal review. CAD requests should have their own status, fee boundary, paid status, and customer-facing copy.

This phase should make it clear that a CAD request is a later step after concept review, not the initial brief submission itself.

### Phase 6: Order status center

Add a customer-facing order or request status center after the backend, admin review, CAD request, and identity strategy are confirmed.

This should be deferred until the product has real status events, customer identity rules, and privacy boundaries in place.

## 4. Proposed data model

The exact database technology should be confirmed before implementation. The following tables or collections define the minimum durable shape for the backend phase.

### concept_briefs

- `id`
- `conceptBriefId`
- `createdAt`
- `updatedAt`
- `customerName`
- `customerEmail`
- `customerPhone` optional
- `pieceType`
- `branch`
- `structure`
- `subStructure`
- `stoneLogic`
- `metal`
- `budget`
- `aiSketchInstruction`
- `referenceNotes`
- `status`
- `internalNotes`

### reference_images

- `id`
- `conceptBriefId`
- `fileName`
- `fileUrl`
- `fileType`
- `fileSize`
- `uploadedAt`

### brief_status_history

- `id`
- `conceptBriefId`
- `status`
- `note`
- `createdAt`
- `createdBy`

### cad_requests

- `id`
- `conceptBriefId`
- `cadRequestId`
- `status`
- `paidStatus`
- `cadFee`
- `createdAt`

## 5. Status model

Recommended brief statuses:

- New
- Reviewing
- Need more info
- AI sketch preparing
- AI sketch sent
- Ready for CAD discussion
- CAD requested
- CAD in progress
- Quote preparing
- Production pending
- Closed

Status changes should be recorded in `brief_status_history` once an admin workflow exists.

## 6. File upload rules

Recommended initial upload rules:

- Allowed file types: `image/jpeg`, `image/png`, `image/webp`, and `image/heic` if supported by the selected upload stack.
- Max file count recommendation: 5 reference images per concept brief.
- Max file size recommendation: 10 MB per file for the first MVP.
- Do not store file binaries in localStorage.
- Do not store file binaries directly in normal database fields.
- Store only file URLs and metadata in the database.
- Keep original file names only if they are sanitized before display or storage.
- Add virus scanning and content safety review later, before scaling uploads or allowing higher-risk file types.

## 7. Email notification logic

The backend should send two email types after a successful brief submission.

Internal email to NOVORA:

- Include the concept brief ID.
- Include customer contact information.
- Include selected jewelry configuration fields.
- Include reference image links.
- Include admin review link once protected admin exists.

Customer confirmation email:

- Confirm that NOVORA received the concept brief.
- Include the concept brief ID.
- Summarize the submitted request.
- Set clear expectations for human review and next steps.

Required boundary copy:

```text
This concept brief is not a CAD-ready production order.
Final CAD, pricing, sourcing, and production feasibility are confirmed later.
```

## 8. Admin security requirements

Admin pages must be protected before real customer data is connected.

Requirements:

- No public admin page may display real customer data.
- Admin routes must require authentication and authorization.
- Use environment variables safely for server-only secrets.
- Never expose service role keys, database admin keys, email provider secrets, or storage write secrets to browser code.
- Use separate public and server-only environment variables when the platform supports that boundary.
- Validate admin authorization on the server, not only in the UI.
- Add an audit log later for status changes, internal notes, CAD request changes, and customer data access.

## 9. Privacy and legal boundaries

Customer uploads may contain personal information, identifying metadata, heirloom images, receipts, screenshots, or other sensitive details. NOVORA should treat all uploaded files and brief fields as customer data.

Before launching a real backend intake flow, NOVORA should add:

- Privacy policy coverage for concept briefs and uploaded reference images.
- Custom-order terms that distinguish concept review, CAD, quote, payment, and production.
- Refund, CAD fee, and payment boundary copy before taking any money.
- Retention rules for submitted briefs and uploaded files.
- Chargeback evidence retention later, before payment is introduced.

## 10. Integration risk checklist

Risks to address before or during backend implementation:

- Broken uploads.
- Duplicate submissions.
- Missing internal email.
- Missing customer confirmation email.
- Oversized files.
- Unsupported file types.
- Spam submissions.
- Fake customer emails.
- Payment and CAD confusion.
- Privacy exposure through uploaded files.
- Admin page exposure.
- Service keys accidentally exposed to browser code.
- Customer data shown in logs or analytics.
- Partial failure where a brief saves but image upload or email fails.

## 11. Suggested next PR after this document

Recommended next engineering PR:

```text
codex/add-real-brief-submission-api
```

Do not start this backend implementation until environment choices and credentials are confirmed.

Before that PR starts, confirm:

- Database provider and project.
- File storage provider and bucket/container strategy.
- Email provider and sender domain.
- Required environment variables.
- Admin authentication strategy.
- Data retention expectations.
- Whether the existing front-end submission payload needs any field renaming before persistence.

## 12. Non-goals

The first backend PR should explicitly exclude:

- No payment in the first backend PR.
- No CAD automation.
- No AI image generation API yet.
- No customer login yet.
- No order center yet.
- No real factory integration yet.
- No production confirmation.
- No final pricing workflow.
- No PDF generation.
