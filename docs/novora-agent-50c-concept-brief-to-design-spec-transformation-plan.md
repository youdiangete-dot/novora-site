# NOVORA Agent 50C Concept Brief To Design Spec Transformation Plan

## Purpose And Role

Agent 50C defines the planning rules for converting NOVORA customer Concept
Brief data into Design Spec JSON Schema v1.

The required sequence remains:

```text
Customer Concept Brief -> Design Spec JSON -> Hand Sketch Instruction -> future internal AI sketch draft workflow
```

Agent 50C is an internal planning contract only. It is not customer-facing, not
transformation implementation, not a model call, not an API route, not a server
action, not a Supabase migration, not a customer delivery feature, and not CAD,
a quote, an order, or production approval.

Raw customer natural-language brief text must not be used directly as the final
sketch-generation prompt. The future path must first normalize customer brief
data into Design Spec JSON, then produce a Hand Sketch Instruction, then pass
through a separately approved internal-only draft workflow.

## Relationship To Agent 50A, 50B, And 53A

Agent 50A defines Design Spec JSON Schema v1, the canonical internal structured
layer between a customer Concept Brief and any later sketch workflow.

Agent 50B defines Hand Sketch Instruction Template v1, the fixed internal
instruction shape generated from Design Spec JSON before any future internal
AI sketch draft workflow.

Agent 50C defines how a future implementation should transform existing
Concept Brief fields into Design Spec JSON. Agent 50C does not generate Hand
Sketch Instructions, does not create image prompts, does not call OpenAI or an
image model, and does not start Agent 53A.

Agent 53A may later plan the internal AI sketch draft pipeline. That future
pipeline should consume reviewed Design Spec JSON and reviewed Hand Sketch
Instruction content, keep AI drafts internal-only, and preserve human review
before any customer delivery.

## Existing Source Concept Brief Inputs

Source inputs should be derived from local NOVORA Concept Brief flow behavior
and persisted Concept Brief payload shape. Agent 50C does not inspect live
Supabase data, live schema, customer rows, customer IDs, customer names,
customer emails, customer phone numbers, reviewer notes, `reviewer_note`,
`customer_safe_note`, or live notes.

Likely source categories from the current local flow include:

- Piece type: ring, pendant / necklace, bracelet / bangle, earrings, or other /
  custom piece.
- Piece branch, structure, and sub-structure where available.
- Stone logic: no required stones, center stone, multi-stone, repeated stone,
  optional stone, or manual review.
- Ring-specific fields such as simple band width, profile, engraving, and
  future ring-size unknowns when applicable.
- Pendant, necklace, bracelet, and chain/attachment fields such as chain style,
  thickness, length, station type, station spacing, station setting, chain
  notes, and manual chain confirmation.
- Style direction, visual focus, silhouette, size direction, wearability,
  personalization, emotional story, must-include, and must-avoid text.
- Metal preference and finish direction.
- Stone preference, including focal stone type, color, shape, approximate size,
  multi-stone type mix, shape mix, size relationship, layout, repeated-stone
  coverage, repeated-stone feeling, repeated-stone size, setting style,
  optional stone direction, and free-text stone direction.
- Reference image metadata and reference notes, including planning-reference
  count/names from `/design/concept` and final uploaded reference metadata from
  `/design/brief` where a future approved implementation has safe access.
- Customer contact-independent project intent such as recipient relationship,
  start style preference, budget planning range, emotional story, occasion-like
  notes, and design purpose.
- "Not sure yet" selections, unknown or optional choices, constraints,
  customer-stated dislikes, special requests, custom visual review fields, and
  production concern notes.

Contact details must not be copied into generation-facing Design Spec fields.
Contact fields may remain part of the Concept Brief submission record for
manual studio follow-up, but the future transformation should exclude real
customer names, emails, phone numbers, private contact notes, protected URLs,
and operational metadata from generation-facing output.

## Target Output Contract

The future transformation output is Design Spec JSON Schema v1 from Agent 50A.
The expected top-level sections are:

- `schema_version`
- `source`
- `customer_intent`
- `piece`
- `style`
- `materials`
- `stones`
- `composition`
- `wearability`
- `manufacturing_constraints`
- `reference_images`
- `unknowns`
- `avoid`
- `internal_review_flags`
- `customer_safe_summary`
- `internal_generation_notes`
- `human_review`

The Design Spec is internal and reviewable. It is not customer-facing copy, not
CAD, not a quote, not an order confirmation, not production approval, and not a
direct prompt for live image generation.

## Transformation Stages

### Stage 1: Source Brief Normalization

Collect structured fields from the existing Concept Brief payload and normalize
missing fields to explicit unknowns. Preserve customer-stated wording where it
matters, especially free-text intent, dislikes, must-include items, and
reference notes. Do not invent gemstone sizes, carat weights, exact metals,
timelines, prices, production feasibility, or customer approval.

### Stage 2: Field Mapping

Map source categories into the Design Spec sections for piece, style,
materials, stones, composition, wearability, manufacturing constraints,
reference images, unknowns, avoid rules, and review flags. The mapping should
be deterministic enough for future tests and flexible enough to preserve
unknowns.

### Stage 3: Internal Interpretation

Create a clearly separated internal interpretation layer only when the source
brief supports it. Inferred values should record confidence or review needs and
must never overwrite customer-stated details. Customer-stated content and
internal interpretation should remain distinguishable.

### Stage 4: Unknown And Follow-Up Detection

Identify missing fields, "not sure yet" selections, contradictions, optional
details, and details that require human follow-up. Distinguish safe-to-infer
details from not-safe-to-infer details and from details that should simply
remain unspecified.

### Stage 5: Risk And Boundary Flags

Flag production risk, reference-copying risk, customer expectation risk,
unsupported material or option risk, ambiguous stone requests, and possible
CAD, quote, order, or production misunderstanding. Risk flags are internal
review signals only and do not approve generation or delivery.

### Stage 6: Customer-Safe Summary Generation

Generate a short neutral summary that could later be reviewed for customer
communication. It must exclude private contact data, internal notes,
`reviewer_note`, `customer_safe_note`, protected reference URLs, prompt
details, CAD/quote/production/order promises, and unreviewed AI sketch delivery
promises.

### Stage 7: Internal Generation Notes Preparation

Prepare internal-only notes that can later support Hand Sketch Instruction
generation after review. These notes must exclude private customer contact
data, `reviewer_note`, `customer_safe_note`, protected reference URLs, and
unreviewed customer delivery language. They must require review before any
future image generation.

### Stage 8: Human Review Gate

Require human review before the Design Spec is used for Hand Sketch
Instruction. Require human final approval before any customer-facing sketch
delivery. AI generation success alone must not approve a sketch. Customer-facing
sketch delivery remains email-only after human review, optimization, and
approval, and customer pages must not display unreviewed AI sketches.

## AI Sketch Review Status Boundary

The only legal final AI sketch review statuses remain:

- `internal_draft_not_generated`
- `draft_generated_internal_only`
- `needs_revision`
- `approved_for_customer`

`pending` is illegal, excluded, and not valid. `approved_for_customer` is not
gallery approval, and AI generation success alone must not approve a sketch.

## Field Mapping Matrix

| Concept Brief source category | Design Spec JSON target |
| --- | --- |
| Piece type | `piece.piece_type` |
| Branch, structure, sub-structure | `piece.subtype`, `piece.wearing_context`, `composition.layout`, `unknowns` |
| Ring size when available or absent | `piece.ring_size`, `unknowns` |
| Simple band fields | `piece.subtype`, `composition.proportion_notes`, `style.surface_language` |
| Pendant or necklace chain choice | `piece.chain_or_attachment`, `wearability.chain_strength_notes`, `manufacturing_constraints.chain_strength_notes` |
| Chain style, thickness, length, and chain note | `piece.chain_or_attachment`, `wearability`, `unknowns`, `internal_review_flags` |
| Station necklace fields | `composition.layout`, `stones.accent_stones`, `piece.chain_or_attachment`, `manufacturing_constraints` |
| Stone logic | `stones.stone_plan_type`; optional stone requests should map to `unknown` or reviewed accent-stone direction rather than inventing a new target enum |
| Focal stone type, color, shape, size | `stones.center_stone`, `stones.stone_uncertainty`, `unknowns` |
| Multi-stone type, shape, size relationship, layout | `stones.stone_plan_type`, `stones.accent_stones`, `composition.layout`, `unknowns` |
| Repeated-stone coverage, feeling, size, setting | `stones.accent_stones`, `composition.layout`, `manufacturing_constraints.stone_setting_risk` |
| Optional stone direction | `stones.accent_stones`, `unknowns`, `internal_review_flags.ambiguous_stone_request` |
| Style selections | `style.primary_style_keywords`, `style.secondary_style_keywords`, `style.visual_complexity` |
| Visual focus and silhouette | `composition.focal_point`, `style.silhouette`, `composition.proportion_notes` |
| Size direction and wearability | `piece.size_context`, `wearability`, `manufacturing_constraints` |
| Metal preference | `materials.metal_preference`, `materials.metal_color`, `materials.material_uncertainty` |
| Finish direction | `materials.finish`, `style.surface_language` |
| Emotional story, personalization, recipient, occasion-like notes | `customer_intent`, `composition.motif_elements`, `must_include`-style customer-stated notes |
| Free-text brief fields | Customer-stated notes, candidate internal interpretation, `unknowns`, `internal_review_flags` |
| Reference image count | `reference_images.reference_image_count` |
| Reference image role or notes | `reference_images.reference_image_roles`, `reference_images.use_as_inspiration_only`, `avoid.design_elements` |
| "Not sure yet" selections | `unknowns` |
| Unsupported or risky details | `internal_review_flags`, `avoid.unsupported_mvp_options`, `manufacturing_constraints` |
| Must include | `customer_intent.must_have`, `composition.motif_elements`, `avoid.generation_pitfalls` when needed |
| Must avoid and customer dislikes | `avoid.design_elements`, `avoid.material_constraints`, `internal_review_flags` |
| Contact fields | Excluded from generation-facing Design Spec; never mapped into sketch guidance |
| `reviewer_note` and `customer_safe_note` | Excluded; do not read, write, transform, or display |

## Uncertainty Handling Rules

Unknown is valid and should be explicit. The future transformer should preserve
"not sure yet" instead of forcing a choice.

Unknowns should be split into:

- Safe to infer: broad, reversible design hints that follow directly from the
  source brief.
- Not safe to infer: exact dimensions, exact carat weight, exact metal karat,
  pricing, timeline, feasibility, approval, or protected/private details.
- Requires human follow-up: details that materially affect design direction,
  customer expectation, feasibility, or future CAD/production discussion.
- Optional detail: details that can remain unspecified for early concept
  direction.

When details conflict, preserve the conflict and flag it for human review. Do
not silently choose one customer statement over another.

Never invent:

- Gemstone sizes.
- Carat weights.
- CAD constraints.
- Prices or quotes.
- Timeline commitments.
- Production feasibility.
- Material sourcing or availability.
- Customer approval.
- Gallery approval.
- Customer contact details.

## Inference Rules

Safe inference examples:

- If the piece type is ring, ring-specific fields may be included as unknown.
- If the piece type is pendant or necklace, chain or attachment fields may be
  included as unknown.
- If the customer says "minimal", style keywords may include minimal, clean, or
  restrained if clearly marked as interpretation.
- If the customer gives reference images, they may be treated as inspiration
  signals only.
- If a chain special request is selected, manual confirmation can be flagged.
- If a custom piece path is selected, manual review can be required.

Not-safe inference examples:

- Exact gemstone size.
- Exact carat weight.
- Exact metal karat unless stated.
- Exact price or quote.
- Production feasibility guarantee.
- CAD readiness.
- Timeline guarantee.
- Customer approval.
- Gallery approval.
- Personal or sensitive customer information.
- Exact copying of a reference image.
- Ownership or rights over an uploaded reference image.

## Reference Image Transformation Rules

Reference images are metadata and inspiration signals. They are not permission
to copy a design exactly, not proof of customer ownership, and not customer-safe
content by default.

Allowed inspiration roles include:

- Silhouette inspiration.
- Motif inspiration.
- Setting style inspiration.
- Mood or finish inspiration.
- Scale reference.
- Stone layout inspiration.
- Texture or surface-language inspiration.

The Design Spec should default to `do_not_copy_exactly: true` and
`use_as_inspiration_only: true`. It should flag reference-copying risk when a
customer asks to match a reference too closely or when reference notes appear to
request exact reproduction.

Customer-facing output must not expose protected reference image URLs, private
file names, raw storage paths, or private reference details. Agent 50C does not
send reference images to external services.

## Sensitive Field And Customer Data Boundaries

The future Design Spec transformation must not include customer contact
information in generation-facing fields.

Do not include:

- Real customer names.
- Real customer emails.
- Real customer phone numbers.
- Private contact notes.
- Protected reference URLs.
- Live customer IDs.
- Real public references in examples.
- Real customer notes.
- `reviewer_note`.
- `customer_safe_note`.

Do not read or write `reviewer_note`. Do not read or write
`customer_safe_note`. Do not inspect live customer data, live Supabase rows, or
live Supabase schema for Agent 50C. Use fake examples only.

## Validation Plan

A future implementation should validate:

- Required top-level Design Spec sections exist.
- `schema_version` is present and equals `design_spec_json_v1`.
- Source metadata is present.
- Unknowns are explicit.
- Enum values are valid.
- No illegal AI sketch review status is present.
- `pending` is absent and invalid.
- No CAD, quote, order, sourcing, production approval, or delivery promise is
  present.
- No customer-facing unreviewed sketch output is present.
- No gallery approval is implied.
- No private customer contact data is present.
- No `reviewer_note` is present.
- No `customer_safe_note` is present.
- Human review gates are present.
- AI generation success does not approve customer delivery.
- `approved_for_customer` is not treated as gallery approval.
- Reference images are marked inspiration-only and do-not-copy.
- Unsupported options are flagged instead of normalized into promises.
- Customer-safe summary excludes internal notes and protected data.
- Internal generation notes remain internal and review-gated.

## Example Transformations

The examples below are fake and illustrative only. They do not use real
customer names, emails, phone numbers, IDs, public references, live rows, live
notes, `reviewer_note`, or `customer_safe_note`.

### Example 1: Simple Ring With Stone-Size Uncertainty

Fake source Concept Brief summary:

```json
{
  "pieceType": "ring",
  "structure": "ring_center_stone",
  "stoneLogic": "center_stone",
  "focalStoneType": "not_sure",
  "focalStoneColor": "blue",
  "focalStoneShape": "oval",
  "focalStoneSize": "",
  "styleDirection": "minimal",
  "metalDirection": "14k_gold",
  "finishDirection": "high_polish",
  "visualFocus": "low-profile everyday ring with a soft blue stone",
  "wearability": "comfortable for frequent wear",
  "mustAvoid": "high setting that catches on clothing"
}
```

Illustrative Design Spec mapping:

```json
{
  "schema_version": "design_spec_json_v1",
  "source": {
    "created_from": "concept_brief",
    "source_identifier": "fake_example_ring_only",
    "language": "en",
    "units": "mm"
  },
  "customer_intent": {
    "must_have": ["low-profile everyday ring", "soft blue stone direction"],
    "nice_to_have": ["minimal look"]
  },
  "piece": {
    "piece_type": "ring",
    "subtype": "center-stone ring",
    "size_context": "low-profile",
    "ring_size": {
      "is_known": false,
      "system": null,
      "value": null
    }
  },
  "style": {
    "primary_style_keywords": ["minimal"],
    "secondary_style_keywords": ["clean", "restrained"],
    "silhouette": "low-profile",
    "visual_complexity": "minimal"
  },
  "materials": {
    "metal_preference": "14K Gold",
    "finish": "High polish",
    "material_uncertainty": ["final alloy, sourcing, and production feasibility require later review"]
  },
  "stones": {
    "stone_plan_type": "center_stone",
    "center_stone": {
      "stone_family": "unknown blue stone direction",
      "stone_color_direction": "blue",
      "shape": "oval",
      "size": "unknown",
      "carat_estimate": null,
      "setting_direction": "low setting direction"
    },
    "stone_uncertainty": ["stone family and exact size require human follow-up"]
  },
  "composition": {
    "focal_point": "single blue oval stone direction",
    "layout": "centered",
    "proportion_notes": "keep the ring low and wearable"
  },
  "wearability": {
    "comfort_notes": ["comfortable for frequent wear"],
    "snag_risk": "medium"
  },
  "manufacturing_constraints": {
    "cad_required_later": true,
    "not_for_direct_production": true,
    "stone_setting_risk": "medium",
    "avoid_unbuildable_details": ["high snag-prone setting"]
  },
  "reference_images": {
    "has_reference_images": false,
    "reference_image_count": 0,
    "reference_image_roles": [],
    "do_not_copy_exactly": true,
    "use_as_inspiration_only": true
  },
  "unknowns": [
    {
      "field": "piece.ring_size",
      "resolution": "needs_human_followup",
      "note": "Needed before any production discussion."
    },
    {
      "field": "stones.center_stone.size",
      "resolution": "not_safe_to_infer",
      "note": "Do not invent stone size or carat weight."
    }
  ],
  "avoid": {
    "design_elements": ["high setting that catches on clothing"],
    "unsupported_mvp_options": ["CAD approval", "quote", "production approval"]
  },
  "internal_review_flags": {
    "needs_human_followup": true,
    "ambiguous_stone_request": "medium",
    "production_risk": "low",
    "reference_copying_risk": "none",
    "customer_expectation_risk": "medium"
  },
  "customer_safe_summary": {
    "short_summary": "A minimal low-profile ring concept with a soft blue oval center-stone direction.",
    "concept_boundary_note": "Concept direction only; CAD, quote, sourcing, and production review would come later."
  },
  "internal_generation_notes": {
    "sketch_guidance": "Keep the ring low, clean, and hand-drawn; preserve stone size uncertainty.",
    "requires_review_before_image_generation": true
  },
  "human_review": {
    "required_before_generation": true,
    "required_before_customer_delivery": true,
    "reviewer_decisions_needed": ["confirm stone type", "confirm stone size direction", "confirm ring size"],
    "approval_boundary": "internal_spec_only"
  }
}
```

### Example 2: Pendant / Necklace With Reference Images

Fake source Concept Brief summary:

```json
{
  "pieceType": "pendant_necklace",
  "branch": "pendant_with_chain",
  "structure": "pendant_custom",
  "stoneLogic": "optional_stone",
  "styleDirection": "organic_floral",
  "metalDirection": "925_sterling_silver",
  "finishDirection": "matte_satin",
  "chainStyle": "not_sure",
  "referenceImageCount": 2,
  "referenceNotes": "Use the leaf mood from image 1 and the scale feeling from image 2, but not the exact design.",
  "customSymbol": "leaf",
  "mustInclude": "small green accent if it works",
  "mustAvoid": "do not copy the reference exactly"
}
```

Illustrative Design Spec mapping:

```json
{
  "schema_version": "design_spec_json_v1",
  "source": {
    "created_from": "concept_brief",
    "source_identifier": "fake_example_pendant_only",
    "language": "en",
    "units": "mm"
  },
  "customer_intent": {
    "must_have": ["leaf-inspired pendant direction"],
    "nice_to_have": ["small green accent if reviewed as feasible"]
  },
  "piece": {
    "piece_type": "pendant",
    "subtype": "pendant with chain",
    "chain_or_attachment": {
      "chain_direction": "unknown",
      "attachment_direction": "requires review"
    }
  },
  "style": {
    "primary_style_keywords": ["organic", "floral"],
    "secondary_style_keywords": ["soft", "nature-inspired"],
    "surface_language": "matte or satin direction",
    "visual_complexity": "moderate"
  },
  "materials": {
    "metal_preference": "925 Sterling Silver",
    "finish": "Matte / satin",
    "material_uncertainty": ["final alloy, finish, and production feasibility require later confirmation"]
  },
  "stones": {
    "stone_plan_type": "unknown",
    "accent_stones": [
      {
        "stone_family": "green accent direction",
        "stone_color_direction": "green",
        "size": "unknown",
        "carat_estimate": null,
        "setting_direction": "requires review"
      }
    ],
    "stone_uncertainty": ["green accent may be included only after human review"]
  },
  "composition": {
    "focal_point": "leaf-inspired pendant silhouette",
    "motif_elements": ["leaf"],
    "proportion_notes": "use references for mood and scale only"
  },
  "wearability": {
    "comfort_notes": ["smooth edges", "chain and pendant scale require review"],
    "snag_risk": "medium"
  },
  "manufacturing_constraints": {
    "cad_required_later": true,
    "not_for_direct_production": true,
    "production_feasibility_notes": ["leaf points, thin veins, bail strength, and accent setting need CAD review later"],
    "stone_setting_risk": "medium",
    "chain_strength_notes": "exact chain type and length require later manual confirmation"
  },
  "reference_images": {
    "has_reference_images": true,
    "reference_image_count": 2,
    "reference_image_roles": ["leaf mood inspiration", "scale reference"],
    "do_not_copy_exactly": true,
    "use_as_inspiration_only": true
  },
  "unknowns": [
    {
      "field": "piece.chain_or_attachment.chain_direction",
      "resolution": "needs_human_followup",
      "note": "Customer selected not sure for chain style."
    },
    {
      "field": "stones.accent_stones.size",
      "resolution": "not_safe_to_infer",
      "note": "Do not invent green accent size or carat weight."
    }
  ],
  "avoid": {
    "design_elements": ["copying the reference exactly", "sharp leaf points", "fragile hairline veins"],
    "unsupported_mvp_options": ["price guarantee", "delivery date promise", "production approval"]
  },
  "internal_review_flags": {
    "needs_human_followup": true,
    "ambiguous_stone_request": "medium",
    "production_risk": "medium",
    "reference_copying_risk": "high",
    "customer_expectation_risk": "medium"
  },
  "customer_safe_summary": {
    "short_summary": "An organic leaf-inspired pendant concept with a possible small green accent direction.",
    "concept_boundary_note": "Concept direction only; reference images are inspiration only and CAD, quote, sourcing, and production review would come later."
  },
  "internal_generation_notes": {
    "sketch_guidance": "Create an original leaf-inspired pendant. Use references for mood and scale only; do not copy exact outlines.",
    "requires_review_before_image_generation": true
  },
  "human_review": {
    "required_before_generation": true,
    "required_before_customer_delivery": true,
    "reviewer_decisions_needed": ["confirm reference roles", "confirm chain direction", "confirm whether green accent belongs in the concept"],
    "approval_boundary": "internal_spec_only"
  }
}
```

## Future Implementation Outline

Agent 50C does not implement these steps. A future approved task may proceed in
this order:

1. Run a docs/review pass on Agent 50A, Agent 50B, and Agent 50C together.
2. Add a pure local mapping helper only after approval.
3. Add fake local test fixtures that contain no real customer data.
4. Add schema validation tests for required sections, enums, unknowns, and
   forbidden content.
5. Add an admin-only preview if separately approved.
6. Keep image generation separate.
7. Keep Supabase writes separate.
8. Keep customer delivery separate.

Future implementation must keep raw customer brief text out of the final
sketch-generation prompt, keep unreviewed AI/GPT drafts internal-only, and
preserve human final approval before customer delivery.

## Relationship To Future Agent 53A

Agent 53A may later plan the internal AI sketch draft pipeline. It should
consume Design Spec JSON and Hand Sketch Instruction content, not raw customer
brief text. It must keep AI sketches internal-only, require human review, and
preserve email-only customer-facing delivery after human review, optimization,
and approval.

Agent 50C does not start Agent 53A.

## Hard Stop Boundaries

Agent 50C does not:

- Modify app or API code.
- Create an API route.
- Create a server action.
- Execute SQL.
- Connect to Supabase live.
- Inspect live schema, rows, customer data, IDs, or notes.
- Read or write `reviewer_note`.
- Read or write `customer_safe_note`.
- Modify environment variables or secrets.
- Deploy.
- Call OpenAI or image generation.
- Send email.
- Create customer-facing sketch display.
- Add gallery approval.
- Install plugins.
- Enable MCP.
- Modify Codex settings.
- Connect third-party services.
- Modify packages or lockfiles.
- Create real customer submissions.
- Add analytics, tracking, chat, booking, CRM, marketing, monitoring, payment,
  account, or other third-party service behavior.
- Start Agent 53A.

## Agent 50C Validation

Expected docs-only validation:

- `git diff --stat`
- `git diff`
- `git diff --check`
- `git diff --cached --check` after path-specific staging

Build and Playwright are skipped because Agent 50C changes documentation only
and does not change runtime behavior, UI behavior, API behavior, packages,
persisted data, customer delivery, or asserted test copy.
