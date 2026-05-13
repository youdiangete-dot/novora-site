# NOVORA Backend API and Database Contract

## 1. Scope and non-scope

This document is a planning contract for a future real NOVORA backend. It defines expected data entities, validation rules, API route shapes, admin data needs, and security boundaries before implementation begins.

This document does not implement:

- Backend routes
- Database tables, migrations, policies, or clients
- Email delivery
- Payment processing
- Login, authentication, or authorization
- File storage or upload handling
- PDF generation
- Vercel configuration
- Production environment variables

NOVORA currently separates two workflow stages:

- Concept Brief: an exploratory customer submission used for human review, early design direction, and possible AI sketch preparation. It is not final pricing, CAD approval, sourcing confirmation, or production approval.
- CAD-ready Production Order: a later, reviewed, quoted, and approved workflow stage that may include CAD requests, quote acceptance, payment handling, and production tracking after the concept brief is qualified.

The future backend should preserve this boundary in data models, API names, validation, status values, admin UI copy, and customer-facing responses.

## 2. Future data model overview

Planned entities:

- Customer: durable customer contact identity and preferred communication details.
- ConceptBrief: the submitted design intent, jewelry direction, and AI sketch brief text.
- ConceptBriefContact: contact information captured with a specific concept brief.
- ConceptBriefReferenceAsset: reference image metadata associated with a concept brief.
- AdminReview: internal review state, notes, reviewer identity, and readiness decisions.
- CADRequest: later CAD workflow request created only after admin review.
- Quote: pricing and terms proposal connected to a reviewed concept brief or CAD request.
- ProductionOrder: later production workflow record created only after quote and readiness checks.
- OrderTimelineEvent: audit-style event history for admin, CAD, quote, and production changes.

## 3. Database schema draft

Exact table names, enum syntax, indexes, and relationship constraints should be selected with the final database provider. The field lists below define the intended durable contract.

### Customer

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string/uuid | Yes | Primary customer identifier. |
| `createdAt` | datetime | Yes | Server-generated creation time. |
| `updatedAt` | datetime | Yes | Server-generated update time. |
| `name` | string | Yes | Customer display name. |
| `email` | string | Yes | Normalized customer email. |
| `phone` | string | No | Optional phone number, stored as submitted or normalized by future rules. |
| `whatsapp` | string | No | Optional WhatsApp contact. |
| `country` | string | No | Optional country or market context. |
| `contactNote` | string | No | Optional customer communication note. |

### ConceptBrief

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string/uuid | Yes | Primary concept brief identifier. |
| `publicId` | string | Yes | Customer-safe reference such as a readable concept brief number. |
| `customerId` | string/uuid | Yes | References `Customer.id`. |
| `createdAt` | datetime | Yes | Server-generated creation time. |
| `updatedAt` | datetime | Yes | Server-generated update time. |
| `submittedAt` | datetime | Yes | Time the customer submitted the brief. |
| `pieceType` | string/enum | Yes | Planned jewelry type, such as ring, necklace, bracelet, earrings, pendant, or other supported values. |
| `designStructure` | string | Yes | Customer-selected structure or design family. |
| `designSubStructure` | string | No | More specific structure detail when present. |
| `stoneDirection` | string | No | Stone preference or direction, not sourcing confirmation. |
| `metalDirection` | string | No | Metal preference or direction, not production confirmation. |
| `budgetDirection` | string | No | Budget range or customer guidance, not final quote. |
| `styleNotes` | text | No | Customer design notes. |
| `referenceNotes` | text | No | Customer notes about reference images. |
| `aiSketchBriefText` | text | No | Instruction text used for future AI sketch preparation. |
| `status` | string/enum | Yes | Initial value should be `new`. |
| `cadReadiness` | string/enum | Yes | Initial value should be `not_ready`; confirms concept brief is not CAD-ready by default. |

### ConceptBriefContact

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string/uuid | Yes | Primary contact record identifier. |
| `conceptBriefId` | string/uuid | Yes | References `ConceptBrief.id`. |
| `createdAt` | datetime | Yes | Server-generated creation time. |
| `customerName` | string | Yes | Name captured at submission time. |
| `customerEmail` | string | Yes | Email captured at submission time. |
| `customerPhone` | string | No | Optional phone captured at submission time. |
| `customerWhatsapp` | string | No | Optional WhatsApp captured at submission time. |
| `customerCountry` | string | No | Optional country captured at submission time. |
| `contactNote` | string | No | Optional note captured at submission time. |
| `preferredContactMethod` | string/enum | No | Future value such as email, phone, or WhatsApp. |

### ConceptBriefReferenceAsset

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string/uuid | Yes | Primary asset metadata identifier. |
| `conceptBriefId` | string/uuid | Yes | References `ConceptBrief.id`. |
| `createdAt` | datetime | Yes | Server-generated creation time. |
| `originalFileName` | string | No | Sanitized display name only. |
| `mimeType` | string | Yes | Expected image MIME type metadata. |
| `fileSizeBytes` | integer | Yes | File size metadata. |
| `widthPx` | integer | No | Optional image width metadata. |
| `heightPx` | integer | No | Optional image height metadata. |
| `assetLabel` | string | No | Optional customer or admin label. |
| `assetNote` | string | No | Optional note about the reference. |
| `storageProvider` | string | No | Future provider name only after storage exists. |
| `storageObjectKey` | string | No | Future private object key only after storage exists. |
| `displayOrder` | integer | No | Sort order for admin review. |

Reference asset fields describe metadata only. This contract does not add file storage, upload URLs, public file URLs, signed URLs, bucket policies, or binary persistence.

### AdminReview

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string/uuid | Yes | Primary admin review identifier. |
| `conceptBriefId` | string/uuid | Yes | References `ConceptBrief.id`. |
| `createdAt` | datetime | Yes | Server-generated creation time. |
| `updatedAt` | datetime | Yes | Server-generated update time. |
| `reviewStatus` | string/enum | Yes | Suggested values: `new`, `reviewing`, `needs_more_info`, `sketch_preparing`, `sketch_sent`, `ready_for_cad_discussion`, `closed`. |
| `cadReadiness` | string/enum | Yes | Suggested values: `not_ready`, `needs_review`, `ready_for_cad_request`, `blocked`. |
| `internalNotes` | text | No | Admin-only notes. |
| `customerFollowUpNeeded` | boolean | Yes | Defaults to `false`. |
| `reviewedBy` | string/uuid | No | Future admin user identifier. |
| `reviewedAt` | datetime | No | Time of last meaningful review. |

### CADRequest

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string/uuid | Yes | Primary CAD request identifier. |
| `conceptBriefId` | string/uuid | Yes | References `ConceptBrief.id`. |
| `createdAt` | datetime | Yes | Server-generated creation time. |
| `updatedAt` | datetime | Yes | Server-generated update time. |
| `status` | string/enum | Yes | Suggested values: `draft`, `requested`, `in_progress`, `revision_needed`, `completed`, `cancelled`. |
| `requestNotes` | text | Yes | Admin-authored CAD instructions. |
| `cadFeeAmount` | decimal | No | Future fee amount, if applicable. |
| `cadFeeCurrency` | string | No | ISO-style currency code, if a fee exists. |
| `approvedForQuote` | boolean | Yes | Defaults to `false`. |
| `requestedBy` | string/uuid | No | Future admin user identifier. |
| `requestedAt` | datetime | No | Time CAD was formally requested. |

### Quote

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string/uuid | Yes | Primary quote identifier. |
| `conceptBriefId` | string/uuid | Yes | References `ConceptBrief.id`. |
| `cadRequestId` | string/uuid | No | References `CADRequest.id` when quote follows CAD. |
| `createdAt` | datetime | Yes | Server-generated creation time. |
| `updatedAt` | datetime | Yes | Server-generated update time. |
| `status` | string/enum | Yes | Suggested values: `draft`, `sent`, `accepted`, `declined`, `expired`, `cancelled`. |
| `currency` | string | Yes | ISO-style currency code. |
| `estimatedAmountMin` | decimal | No | Optional estimate floor. |
| `estimatedAmountMax` | decimal | No | Optional estimate ceiling. |
| `finalAmount` | decimal | No | Final quoted amount when confirmed. |
| `quoteNotes` | text | No | Scope, caveats, material notes, or timeline context. |
| `validUntil` | date | No | Optional quote expiry date. |
| `sentAt` | datetime | No | Time quote was sent. |
| `acceptedAt` | datetime | No | Time customer accepted quote. |

### ProductionOrder

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string/uuid | Yes | Primary production order identifier. |
| `conceptBriefId` | string/uuid | Yes | References `ConceptBrief.id`. |
| `quoteId` | string/uuid | Yes | References accepted `Quote.id`. |
| `createdAt` | datetime | Yes | Server-generated creation time. |
| `updatedAt` | datetime | Yes | Server-generated update time. |
| `status` | string/enum | Yes | Suggested values: `draft`, `pending_payment`, `approved`, `in_production`, `quality_check`, `ready_to_ship`, `completed`, `cancelled`. |
| `productionNotes` | text | No | Admin-only production notes. |
| `targetCompletionDate` | date | No | Planning date only. |
| `paymentStatus` | string/enum | No | Future value such as `not_required`, `pending`, `paid`, `partially_paid`, or `refunded`. |
| `approvedBy` | string/uuid | No | Future admin user identifier. |
| `approvedAt` | datetime | No | Time production order was approved. |

### OrderTimelineEvent

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string/uuid | Yes | Primary event identifier. |
| `conceptBriefId` | string/uuid | Yes | References `ConceptBrief.id`. |
| `entityType` | string/enum | Yes | Suggested values: `concept_brief`, `admin_review`, `cad_request`, `quote`, `production_order`. |
| `entityId` | string/uuid | No | Related entity identifier. |
| `eventType` | string/enum | Yes | Status change, note added, CAD requested, quote sent, production approved, or similar. |
| `fromStatus` | string | No | Previous status when applicable. |
| `toStatus` | string | No | New status when applicable. |
| `note` | text | No | Internal event note. |
| `createdAt` | datetime | Yes | Server-generated event time. |
| `createdBy` | string/uuid | No | Future admin user identifier or system actor. |

## 4. Validation rules

Customer and contact validation:

- `customerName` is required and must contain visible non-whitespace characters.
- `customerEmail` is required and must be a valid email format.
- `customerPhone` is optional; if present, trim whitespace and reject clearly invalid placeholder values.
- `customerWhatsapp` is optional; if present, trim whitespace and reject clearly invalid placeholder values.
- `customerCountry` is optional and should be stored consistently once a country list is selected.
- `contactNote` is optional and should have a maximum length.

Concept brief validation:

- `pieceType` is required and must be one of the supported concept brief piece types.
- `designStructure` is required when the intake flow provides it.
- `stoneDirection`, `metalDirection`, `budgetDirection`, `styleNotes`, and `referenceNotes` are customer intent only and must not be treated as sourcing, pricing, or production confirmation.
- `aiSketchBriefText` may be generated or assembled later, but should remain text-only and reviewable by an admin.
- A concept brief must default to a non-CAD-ready state.

CAD readiness boundary:

- A concept brief submission cannot create a production order directly.
- A concept brief submission cannot imply final quote, CAD approval, payment requirement, or production feasibility.
- A CAD request can be created only by a future protected admin action after review.
- A production order can be created only after the future quote and readiness rules are satisfied.

Reference image metadata validation:

- Reference image metadata may include MIME type, file size, dimensions, sanitized original file name, label, and notes.
- Metadata must not include raw binary file contents.
- Metadata must not require a storage provider until file storage is implemented.
- MIME type and file size should be validated against future upload limits before storage integration goes live.

Admin review validation:

- Admin review status must be one of the approved values.
- Internal notes are optional but should have a maximum length.
- Status changes should create timeline events once audit logging exists.
- Public customer views must not receive admin-only notes.

Quote validation:

- Quote status must be one of the approved values.
- Currency is required when quote amounts are present.
- Amount fields must be non-negative decimal values.
- `estimatedAmountMin` must not exceed `estimatedAmountMax`.
- `finalAmount` should be present before a quote can be accepted.
- Quote acceptance should not occur from a public unauthenticated mutation.

Production order validation:

- Production order status must be one of the approved values.
- A production order should require an accepted quote.
- Payment status, if used, must come from a future compliant payment workflow.
- Production notes must remain admin-only.

## 5. Future API route contract

These routes are draft contracts only. They do not exist yet and should not be treated as implemented behavior.

### POST `/api/concept-briefs`

Purpose: create a real concept brief submission from the customer intake flow.

Request body:

```json
{
  "customer": {
    "name": "string",
    "email": "string",
    "phone": "string optional",
    "whatsapp": "string optional",
    "country": "string optional",
    "contactNote": "string optional"
  },
  "brief": {
    "pieceType": "string",
    "designStructure": "string",
    "designSubStructure": "string optional",
    "stoneDirection": "string optional",
    "metalDirection": "string optional",
    "budgetDirection": "string optional",
    "styleNotes": "string optional",
    "referenceNotes": "string optional",
    "aiSketchBriefText": "string optional"
  },
  "referenceAssets": [
    {
      "originalFileName": "string optional",
      "mimeType": "string",
      "fileSizeBytes": 12345,
      "widthPx": 1200,
      "heightPx": 900,
      "assetLabel": "string optional",
      "assetNote": "string optional"
    }
  ]
}
```

Response body:

```json
{
  "conceptBrief": {
    "id": "string",
    "publicId": "string",
    "status": "new",
    "cadReadiness": "not_ready",
    "submittedAt": "datetime"
  }
}
```

Validation behavior: validate required customer and brief fields, normalize contact values, validate reference metadata only, and default the brief to non-CAD-ready.

Error cases: invalid email, missing name, unsupported piece type, oversized metadata payload, too many reference metadata entries, duplicate submission risk, or internal persistence failure.

Permission/auth assumptions: public customer route with rate limiting, spam prevention, and server-side validation in the future.

### GET `/api/admin/concept-briefs`

Purpose: return protected admin list data for concept brief review.

Request body: none.

Response body:

```json
{
  "items": [
    {
      "id": "string",
      "publicId": "string",
      "submittedAt": "datetime",
      "customerName": "string",
      "customerEmail": "string",
      "pieceType": "string",
      "status": "string",
      "cadReadiness": "string",
      "referenceAssetCount": 2,
      "lastTimelineEventAt": "datetime optional"
    }
  ],
  "pagination": {
    "cursor": "string optional",
    "hasMore": false
  }
}
```

Validation behavior: validate pagination, filters, and sort parameters once supported.

Error cases: unauthorized, forbidden, invalid query, or backend read failure.

Permission/auth assumptions: future admin-only route requiring server-side authentication and authorization.

### GET `/api/admin/concept-briefs/:id`

Purpose: return protected admin detail data for one concept brief.

Request body: none.

Response body:

```json
{
  "conceptBrief": {
    "id": "string",
    "publicId": "string",
    "submittedAt": "datetime",
    "pieceType": "string",
    "designStructure": "string",
    "stoneDirection": "string optional",
    "metalDirection": "string optional",
    "aiSketchBriefText": "string optional",
    "status": "string",
    "cadReadiness": "string"
  },
  "contact": {
    "customerName": "string",
    "customerEmail": "string",
    "customerPhone": "string optional",
    "customerWhatsapp": "string optional",
    "customerCountry": "string optional",
    "contactNote": "string optional"
  },
  "referenceAssets": [],
  "adminReview": {},
  "cadRequest": null,
  "quote": null,
  "productionOrder": null,
  "timeline": []
}
```

Validation behavior: validate `id` format and admin access.

Error cases: unauthorized, forbidden, not found, invalid ID, or backend read failure.

Permission/auth assumptions: future admin-only route; customer contact data must never be returned to public UI routes.

### PATCH `/api/admin/concept-briefs/:id/review`

Purpose: update protected admin review fields for a concept brief.

Request body:

```json
{
  "reviewStatus": "string",
  "cadReadiness": "string",
  "internalNotes": "string optional",
  "customerFollowUpNeeded": false
}
```

Response body:

```json
{
  "adminReview": {
    "id": "string",
    "conceptBriefId": "string",
    "reviewStatus": "string",
    "cadReadiness": "string",
    "updatedAt": "datetime"
  }
}
```

Validation behavior: validate status enums, note length, admin permission, and allowed status transitions.

Error cases: unauthorized, forbidden, not found, invalid status transition, invalid notes, or backend write failure.

Permission/auth assumptions: future admin-only route with audit trail events.

### POST `/api/admin/concept-briefs/:id/cad-request`

Purpose: create a future CAD request after admin review confirms CAD discussion readiness.

Request body:

```json
{
  "requestNotes": "string",
  "cadFeeAmount": 0,
  "cadFeeCurrency": "USD",
  "approvedForQuote": false
}
```

Response body:

```json
{
  "cadRequest": {
    "id": "string",
    "conceptBriefId": "string",
    "status": "requested",
    "requestedAt": "datetime"
  }
}
```

Validation behavior: require admin authorization, require reviewed concept brief, require CAD-ready boundary state, and validate fee fields if present.

Error cases: unauthorized, forbidden, not found, concept brief not CAD-ready, duplicate active CAD request, invalid fee, or backend write failure.

Permission/auth assumptions: future admin-only route. This route should not be customer-callable.

### POST `/api/admin/concept-briefs/:id/quote`

Purpose: create or send a future quote for a reviewed concept brief or CAD request.

Request body:

```json
{
  "cadRequestId": "string optional",
  "status": "draft",
  "currency": "USD",
  "estimatedAmountMin": 0,
  "estimatedAmountMax": 0,
  "finalAmount": 0,
  "quoteNotes": "string optional",
  "validUntil": "date optional"
}
```

Response body:

```json
{
  "quote": {
    "id": "string",
    "conceptBriefId": "string",
    "status": "draft",
    "currency": "USD",
    "updatedAt": "datetime"
  }
}
```

Validation behavior: validate admin authorization, currency, amount ranges, quote status, optional CAD relationship, and quote readiness rules.

Error cases: unauthorized, forbidden, not found, invalid amount range, missing currency, invalid CAD relationship, or backend write failure.

Permission/auth assumptions: future admin-only route. Customer quote acceptance should be designed separately with explicit identity and security rules.

### POST `/api/admin/concept-briefs/:id/production-order`

Purpose: create a future production order after quote acceptance and production readiness checks.

Request body:

```json
{
  "quoteId": "string",
  "status": "draft",
  "productionNotes": "string optional",
  "targetCompletionDate": "date optional",
  "paymentStatus": "pending"
}
```

Response body:

```json
{
  "productionOrder": {
    "id": "string",
    "conceptBriefId": "string",
    "quoteId": "string",
    "status": "draft",
    "createdAt": "datetime"
  }
}
```

Validation behavior: require admin authorization, accepted quote, no duplicate active production order, valid production status, and valid payment status if present.

Error cases: unauthorized, forbidden, not found, quote not accepted, duplicate production order, invalid production status, invalid payment status, or backend write failure.

Permission/auth assumptions: future admin-only route until customer identity, payment, and order center rules are designed.

## 6. Error handling contract

Future API errors should use one consistent response shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more fields need attention.",
    "fieldErrors": {
      "customer.email": ["Enter a valid email address."]
    },
    "requestId": "req_123",
    "timestamp": "datetime"
  }
}
```

Recommended error code categories:

- `VALIDATION_ERROR`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `NOT_FOUND`
- `CONFLICT`
- `RATE_LIMITED`
- `PAYLOAD_TOO_LARGE`
- `INTERNAL_ERROR`

Customer-facing messages should be clear and restrained. Admin responses may include more operational detail, but must not expose secrets, private storage keys, database internals, or provider credentials.

## 7. Admin data contract

Future admin list pages should receive compact records optimized for review queues:

- Concept brief ID and public ID
- Submitted timestamp
- Customer name and email
- Contact summary
- Piece type
- Current admin review status
- CAD readiness
- Reference asset count
- Last timeline event timestamp
- Follow-up flag

Future admin detail pages should receive the complete protected review shape:

- Concept brief design direction
- Customer contact fields
- Reference asset metadata only
- AI sketch instruction text
- Internal notes
- Admin review status and CAD readiness
- CAD request status and request notes
- Quote status and quote summary
- Production order status
- Timeline events

Suggested admin status values:

- Concept brief review: `new`, `reviewing`, `needs_more_info`, `sketch_preparing`, `sketch_sent`, `ready_for_cad_discussion`, `closed`
- CAD request: `draft`, `requested`, `in_progress`, `revision_needed`, `completed`, `cancelled`
- Quote: `draft`, `sent`, `accepted`, `declined`, `expired`, `cancelled`
- Production order: `draft`, `pending_payment`, `approved`, `in_production`, `quality_check`, `ready_to_ship`, `completed`, `cancelled`

Admin data must distinguish public customer-safe fields from internal-only fields. Internal notes, admin identity, audit events, and operational risk notes should not be returned to public customer pages.

## 8. Security and privacy boundaries

- Admin routes must not be publicly accessible.
- Customer contact data must not appear in public UI responses unless the customer is authorized to view that specific data.
- Reference files require secure storage in the future; this document defines metadata only.
- Future file access should use private storage, signed URLs, or equivalent access controls appropriate to the selected provider.
- Admin status changes, internal notes, CAD request creation, quote changes, and production order changes should create audit trail events.
- Service role keys, database admin keys, email secrets, storage write tokens, and payment secrets must remain server-only.
- No payment card data should be stored directly by NOVORA unless using a compliant payment provider and a reviewed compliance design.
- Customer uploads and reference metadata should be treated as private customer data.
- Data retention, deletion, privacy policy, and custom-order terms should be confirmed before launch.

## 9. Suggested future implementation sequence

Documentation-only recommended sequence:

1. Backend provider setup.
2. Database schema and migration plan.
3. Concept brief submission API.
4. File upload provider and reference asset metadata persistence.
5. Admin authentication and authorization.
6. Admin data API.
7. CAD request workflow.
8. Quote workflow.
9. Production order workflow.
10. Email notifications.
11. Payment integration.

Each implementation phase should keep the Concept Brief and CAD-ready Production Order boundary explicit.

## 10. PR safety checklist

- [x] Documentation-only contract.
- [x] No app code changed.
- [x] No tests changed.
- [x] No package changes.
- [x] No backend route added.
- [x] No database integration added.
- [x] No email integration added.
- [x] No payment integration added.
- [x] No login or auth integration added.
- [x] No file storage integration added.
- [x] No PDF generation added.
- [x] No Vercel configuration changed.
- [x] No production environment variables added or changed.
