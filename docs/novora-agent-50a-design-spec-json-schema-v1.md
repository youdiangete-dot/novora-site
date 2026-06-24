# NOVORA Agent 50A Design Spec JSON Schema v1

## Purpose And Role

Design Spec JSON Schema v1 is the canonical internal structured design
specification that NOVORA should produce from a submitted customer Concept
Brief before any hand-sketch instruction or future internal AI sketch draft
workflow begins.

The intended chain is:

```text
Customer Concept Brief -> Design Spec JSON -> Hand Sketch Instruction -> internal AI sketch draft workflow
```

This schema is a planning contract only. It is not app code, not an API route,
not a database schema, not a validation library, not a prompt, and not an
OpenAI or image-generation integration.

Design Spec JSON v1 is:

- A structured internal design specification.
- Generated from customer Concept Brief data.
- Used before hand-sketch instruction generation.
- A stable intermediate layer for future prompt versioning and human review.

Design Spec JSON v1 is not:

- Customer-facing copy.
- A CAD specification.
- A quote.
- A production approval file.
- An order confirmation.
- A sourcing, gemstone, material, timeline, or manufacturability promise.

The customer brief must not be used directly as the final sketch-generation
prompt. Customer natural-language input should first be normalized into this
structured Design Spec JSON, then transformed into a fixed hand-sketch
instruction in a later Agent 50B task.

## Input Sources

Likely source inputs come from the existing NOVORA Concept Brief flow and
server-side Concept Brief records. Agent 50A does not inspect live customer
data, live schema, rows, customer IDs, customer notes, `reviewer_note`, or
`customer_safe_note`.

Expected input categories:

- Piece type.
- Style direction.
- Metal preference.
- Stone preference.
- Customer description and design notes.
- Reference image metadata, including count and high-level roles.
- Contact-independent project intent.
- Constraints, uncertainty, and customer "not sure" choices.
- Customer-visible public reference when persistence is confirmed.

Contact details, private customer notes, admin notes, and sensitive operational
metadata should not be copied into generation-facing fields unless a future
approved privacy and review policy explicitly allows it.

## Schema Design Principles

- Use stable field names so future transformation, validation, and prompt
  generation can depend on a predictable contract.
- Allow explicit uncertainty instead of forcing unsupported precision.
- Avoid hallucinating missing details.
- Separate customer-stated details from inferred internal interpretation.
- Separate customer-safe summary from internal generation notes.
- Keep sensitive customer notes out of generation-facing schema fields unless
  explicitly approved.
- Preserve human review before generation and before customer delivery.
- Support future prompt policy versioning.
- Support future validation without requiring a database migration for every
  wording change.
- Support future internal AI sketch drafts only.
- Preserve the rule that unreviewed AI/GPT drafts must never be shown or
  delivered to customers.
- Preserve the rule that AI sketches are concept sketches only, not CAD, quote,
  order, sourcing confirmation, or production approval.

## Proposed Top-Level JSON Shape

```json
{
  "schema_version": "design_spec_json_v1",
  "source": {},
  "customer_intent": {},
  "piece": {},
  "style": {},
  "materials": {},
  "stones": {},
  "composition": {},
  "wearability": {},
  "manufacturing_constraints": {},
  "reference_images": {},
  "unknowns": [],
  "avoid": {},
  "internal_review_flags": {},
  "customer_safe_summary": {},
  "internal_generation_notes": {},
  "human_review": {}
}
```

## Suggested Fields

### A. Schema Metadata

Suggested fields:

- `schema_version`: fixed value, initially `design_spec_json_v1`.
- `created_from`: source type, such as `concept_brief`.
- `brief_public_reference`: customer-visible `NOVORA-CB-...` reference when
  confirmed.
- `prompt_policy_version`: future policy version for prompt/instruction rules.
- `language`: source language or normalized internal language, initially
  likely `en`.
- `units`: measurement convention used for any optional sizes, such as `mm`.

### B. Customer Intent

Suggested fields:

- `occasion`: customer-stated event or purpose when provided.
- `recipient`: recipient relationship or wearer context when provided.
- `emotion_or_story`: symbolism, mood, memory, or story.
- `budget_signal`: broad customer budget direction only, not a quote.
- `timeline_signal`: broad timing signal only, not a delivery promise.
- `must_have`: customer-stated requirements.
- `nice_to_have`: softer preferences.

### C. Piece

Suggested fields:

- `piece_type`: supported jewelry type.
- `subtype`: more specific type, such as solitaire ring or pendant necklace.
- `wearing_context`: daily, occasion, bridal, gift, or other context.
- `size_context`: scale direction, not final dimensions unless reviewed.
- `chain_or_attachment`: pendant or necklace chain/attachment direction when
  applicable.
- `ring_size`: ring size when applicable, including `system`, `value`, and
  `is_known`; HK sizing may be represented with `system: "HK"` when known.

### D. Style

Suggested fields:

- `primary_style_keywords`: main customer-stated or reviewed style terms.
- `secondary_style_keywords`: supporting style terms.
- `era_or_culture_reference`: high-level reference, if safe and non-appropriative.
- `mood`: overall feeling.
- `silhouette`: outline or form direction.
- `symmetry`: symmetry direction.
- `surface_language`: polished, textured, organic, geometric, or similar.
- `visual_complexity`: practical complexity level.

### E. Materials

Suggested fields:

- `metal_preference`: customer-stated metal direction.
- `metal_color`: visual metal color direction.
- `finish`: surface finish.
- `enamel`: enamel interest, color, or `none`.
- `mixed_materials`: mixed-material direction when supported.
- `material_uncertainty`: unresolved or unsupported material questions.

Materials remain design direction only. The schema must not imply availability,
pricing, sourcing, assay, or production confirmation.

### F. Stones

Stone planning should support:

- No stone.
- Center stone.
- Repeated stone.
- Multi-stone.

Suggested fields:

- `stone_plan_type`: `none`, `center_stone`, `repeated_stone`, or
  `multi_stone`.
- `center_stone`: center stone direction, if present.
- `side_stones`: side stone direction, if present.
- `accent_stones`: accent stone direction, if present.
- `stone_family`: diamond, sapphire, pearl, colored gemstone, birthstone, or
  other broad family.
- `stone_color_direction`: color or palette direction.
- `shape`: round, oval, pear, emerald cut, cushion, marquise, baguette, cabochon,
  irregular, or unknown.
- `size`: customer-stated size direction only.
- `carat_estimate`: customer-stated or rough internal planning signal only.
- `lab_or_natural_preference`: customer-stated preference when provided.
- `setting_direction`: prong, bezel, flush, pave, channel, cluster, or unknown.
- `stone_uncertainty`: unresolved stone details and safe follow-up needs.

Stone fields must not create certification, sourcing, availability, pricing, or
quality promises.

### G. Composition

Suggested fields:

- `focal_point`: primary visual focus.
- `layout`: layout relationship, such as centered, asymmetrical, stacked, halo,
  scattered, or linear.
- `proportion_notes`: proportion guidance.
- `motif_elements`: symbols, shapes, botanical elements, initials, or other
  motifs.
- `negative_space`: desired openness or solidness.
- `view_requirements`: required views, such as top, front, side, or clasp.
- `sketch_angle_requirements`: preferred sketch angles for future instruction
  generation.

### H. Wearability And Scale

Suggested fields:

- `comfort_notes`: comfort guidance.
- `daily_wear_level`: expected wearing frequency.
- `height_width_depth_targets`: reviewed targets or broad ranges when known.
- `weight_sensitivity`: sensitivity to heaviness.
- `sharp_edge_risk`: risk level and note.
- `snag_risk`: risk level and note.

### I. Manufacturing Constraints

Suggested fields:

- `production_feasibility_notes`: internal early feasibility notes.
- `cad_required_later`: always `true` for production work.
- `not_for_direct_production`: always `true`.
- `minimum_thickness_notes`: early caution only, not CAD dimensions.
- `stone_setting_risk`: risk level and note.
- `chain_strength_notes`: chain or attachment caution when applicable.
- `avoid_unbuildable_details`: details that should be simplified or reviewed.

This section keeps concept sketching honest: it can guide a sketch, but it does
not approve manufacture.

### J. Reference Images

Suggested fields:

- `has_reference_images`: boolean.
- `reference_image_count`: count from metadata, not file contents.
- `reference_image_roles`: inspiration roles, such as silhouette, stone layout,
  mood, texture, color, or attachment.
- `do_not_copy_exactly`: should default to `true`.
- `use_as_inspiration_only`: should default to `true`.

Reference images are private customer materials. The schema should describe
their intended role without copying exact private or third-party designs.

### K. Unknowns

Each unknown can include:

- `field`: field path or topic.
- `customer_specified`: whether the customer specified it.
- `resolution`: `needs_human_followup`, `safe_to_infer`, `not_safe_to_infer`,
  or `leave_unspecified`.
- `note`: short internal note.

Unknowns should make missing information visible instead of filling gaps with
unreviewed assumptions.

### L. Avoid List

Suggested fields:

- `design_elements`: design features to avoid.
- `material_constraints`: unsupported or unwanted materials.
- `unsupported_mvp_options`: options outside current NOVORA MVP support.
- `generation_pitfalls`: internal prompt/sketch pitfalls to avoid.

### M. Internal Review Flags

Suggested fields:

- `needs_human_followup`: boolean.
- `ambiguous_stone_request`: `risk_level`.
- `production_risk`: `risk_level`.
- `possible_policy_or_claim_risk`: `risk_level`.
- `reference_copying_risk`: `risk_level`.
- `customer_expectation_risk`: `risk_level`.

### N. Customer-Safe Summary

Suggested fields:

- `short_summary`: neutral customer-safe design summary.
- `concept_boundary_note`: states concept direction only, if later surfaced.
- `excluded_internal_topics`: reminder that internal notes, private contact
  details, raw prompt material, provider payloads, and unapproved claims are
  excluded.

This section must not include internal notes, unapproved promises, quote/CAD
language, production approval language, or customer-private contact details.

### O. Internal Generation Notes

Suggested fields:

- `sketch_guidance`: internal-only visual guidance for the future hand-sketch
  instruction.
- `style_guardrails`: prompt or sketch guardrails.
- `privacy_guardrails`: details that must not be shown or copied into
  customer-facing output.
- `requires_review_before_image_generation`: should default to `true`.

Internal generation notes are not customer display copy and must be reviewed
before any future image generation.

### P. Human Review

Suggested fields:

- `required_before_generation`: should default to `true` for the first real
  internal workflow.
- `required_before_customer_delivery`: always `true`.
- `reviewer_decisions_needed`: open questions for the reviewer.
- `approval_boundary`: explicit boundary, such as `internal_spec_only`,
  `approved_for_instruction`, `approved_for_internal_draft`, or
  `approved_for_customer_delivery`.

`approved_for_customer_delivery` remains separate from gallery approval.
`approved_for_customer` in AI sketch review state is not equal to
`approved_for_gallery`.

## Enum Examples

These are practical enum examples for a future implementation. They are not
runtime code.

```json
{
  "piece_type": [
    "ring",
    "pendant",
    "necklace",
    "bracelet",
    "earrings",
    "other"
  ],
  "stone_plan_type": [
    "none",
    "center_stone",
    "repeated_stone",
    "multi_stone",
    "unknown"
  ],
  "metal_color": [
    "yellow",
    "white",
    "rose",
    "two_tone",
    "mixed",
    "unknown"
  ],
  "finish": [
    "polished",
    "matte",
    "brushed",
    "hammered",
    "textured",
    "mixed",
    "unknown"
  ],
  "symmetry": [
    "symmetrical",
    "asymmetrical",
    "radial",
    "organic",
    "unknown"
  ],
  "visual_complexity": [
    "minimal",
    "moderate",
    "ornate",
    "unknown"
  ],
  "daily_wear_level": [
    "daily",
    "frequent",
    "occasional",
    "ceremonial",
    "unknown"
  ],
  "risk_level": [
    "none",
    "low",
    "medium",
    "high"
  ],
  "unknown_resolution": [
    "needs_human_followup",
    "safe_to_infer",
    "not_safe_to_infer",
    "leave_unspecified"
  ],
  "approval_boundary": [
    "internal_spec_only",
    "approved_for_instruction",
    "approved_for_internal_draft",
    "approved_for_customer_delivery"
  ],
  "ai_sketch_review_status": [
    "internal_draft_not_generated",
    "draft_generated_internal_only",
    "needs_revision",
    "approved_for_customer"
  ]
}
```

`pending` is illegal, excluded, and not valid for final AI sketch review status.

## Illustrative Example JSON

The examples below are illustrative only. They are not real customer data and
do not use real customer IDs, real customer names, real emails, real phone
numbers, real notes, live rows, or live submissions.

### Example 1: Simple Ring With Unknowns

```json
{
  "schema_version": "design_spec_json_v1",
  "source": {
    "created_from": "concept_brief",
    "brief_public_reference": "NOVORA-CB-EXAMPLE1",
    "prompt_policy_version": "hand_sketch_policy_v1_planned",
    "language": "en",
    "units": "mm"
  },
  "customer_intent": {
    "occasion": "anniversary",
    "recipient": "partner",
    "emotion_or_story": "quiet, personal, everyday reminder",
    "budget_signal": "moderate",
    "timeline_signal": "not urgent",
    "must_have": ["low-profile ring", "blue stone direction"],
    "nice_to_have": ["soft vintage feeling"]
  },
  "piece": {
    "piece_type": "ring",
    "subtype": "low-profile statement ring",
    "wearing_context": "frequent wear",
    "size_context": "not bulky",
    "chain_or_attachment": null,
    "ring_size": {
      "is_known": false,
      "system": null,
      "value": null
    }
  },
  "style": {
    "primary_style_keywords": ["soft vintage", "delicate"],
    "secondary_style_keywords": ["organic", "quiet detail"],
    "era_or_culture_reference": null,
    "mood": "warm and personal",
    "silhouette": "rounded low profile",
    "symmetry": "symmetrical",
    "surface_language": "polished with subtle texture",
    "visual_complexity": "moderate"
  },
  "materials": {
    "metal_preference": "yellow gold direction",
    "metal_color": "yellow",
    "finish": "polished",
    "enamel": "none",
    "mixed_materials": false,
    "material_uncertainty": ["exact karat and production metal require later confirmation"]
  },
  "stones": {
    "stone_plan_type": "center_stone",
    "center_stone": {
      "stone_family": "sapphire or blue gemstone direction",
      "stone_color_direction": "soft blue",
      "shape": "oval",
      "size": "modest",
      "carat_estimate": null,
      "lab_or_natural_preference": "unknown",
      "setting_direction": "bezel or low prong"
    },
    "side_stones": [],
    "accent_stones": [],
    "stone_uncertainty": ["exact stone type and size need human follow-up"]
  },
  "composition": {
    "focal_point": "single blue center stone",
    "layout": "centered",
    "proportion_notes": "low height and balanced shoulders",
    "motif_elements": ["soft tapered shoulders"],
    "negative_space": "minimal",
    "view_requirements": ["top", "side"],
    "sketch_angle_requirements": ["three-quarter top view", "small side profile"]
  },
  "wearability": {
    "comfort_notes": "avoid tall setting",
    "daily_wear_level": "frequent",
    "height_width_depth_targets": null,
    "weight_sensitivity": "medium",
    "sharp_edge_risk": "low",
    "snag_risk": "medium"
  },
  "manufacturing_constraints": {
    "production_feasibility_notes": ["confirm stone setting height during CAD later"],
    "cad_required_later": true,
    "not_for_direct_production": true,
    "minimum_thickness_notes": "do not sketch ultra-thin unsupported shoulders",
    "stone_setting_risk": "medium",
    "chain_strength_notes": null,
    "avoid_unbuildable_details": ["floating unsupported center stone"]
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
      "customer_specified": false,
      "resolution": "needs_human_followup",
      "note": "Ring size is needed before production discussion."
    },
    {
      "field": "stones.center_stone.carat_estimate",
      "customer_specified": false,
      "resolution": "not_safe_to_infer",
      "note": "Do not invent carat size."
    }
  ],
  "avoid": {
    "design_elements": ["high snag-prone prongs"],
    "material_constraints": ["unsupported production metal claims"],
    "unsupported_mvp_options": ["final quote", "production approval"],
    "generation_pitfalls": ["do not make the sketch look CAD-ready"]
  },
  "internal_review_flags": {
    "needs_human_followup": true,
    "ambiguous_stone_request": "medium",
    "production_risk": "low",
    "possible_policy_or_claim_risk": "low",
    "reference_copying_risk": "none",
    "customer_expectation_risk": "medium"
  },
  "customer_safe_summary": {
    "short_summary": "A low-profile ring concept with a soft blue center stone direction and delicate vintage-inspired details.",
    "concept_boundary_note": "Concept direction only; CAD, quote, sourcing, and production review would come later.",
    "excluded_internal_topics": ["internal review flags", "private notes", "provider or prompt details"]
  },
  "internal_generation_notes": {
    "sketch_guidance": "Keep the ring low, wearable, and hand-drawn; emphasize a gentle oval blue focal stone.",
    "style_guardrails": ["avoid photorealistic render", "avoid CAD-like precision"],
    "privacy_guardrails": ["no customer contact details"],
    "requires_review_before_image_generation": true
  },
  "human_review": {
    "required_before_generation": true,
    "required_before_customer_delivery": true,
    "reviewer_decisions_needed": ["confirm center stone direction", "confirm whether ring size is known"],
    "approval_boundary": "internal_spec_only"
  }
}
```

### Example 2: Pendant With Reference Images

```json
{
  "schema_version": "design_spec_json_v1",
  "source": {
    "created_from": "concept_brief",
    "brief_public_reference": "NOVORA-CB-EXAMPLE2",
    "prompt_policy_version": "hand_sketch_policy_v1_planned",
    "language": "en",
    "units": "mm"
  },
  "customer_intent": {
    "occasion": "graduation gift",
    "recipient": "daughter",
    "emotion_or_story": "growth, protection, and a new chapter",
    "budget_signal": "not final quote",
    "timeline_signal": "would like a first concept soon",
    "must_have": ["pendant", "nature motif"],
    "nice_to_have": ["subtle initial", "green accent stone"]
  },
  "piece": {
    "piece_type": "pendant",
    "subtype": "pendant necklace",
    "wearing_context": "daily or frequent wear",
    "size_context": "small to medium pendant",
    "chain_or_attachment": {
      "attachment_direction": "integrated bail",
      "chain_direction": "simple chain, exact chain to confirm later"
    },
    "ring_size": null
  },
  "style": {
    "primary_style_keywords": ["botanical", "modern heirloom"],
    "secondary_style_keywords": ["soft", "symbolic", "delicate"],
    "era_or_culture_reference": null,
    "mood": "protective and hopeful",
    "silhouette": "vertical oval leaf-inspired pendant",
    "symmetry": "organic",
    "surface_language": "polished edges with light vein texture",
    "visual_complexity": "moderate"
  },
  "materials": {
    "metal_preference": "white metal direction",
    "metal_color": "white",
    "finish": "mixed",
    "enamel": "none",
    "mixed_materials": false,
    "material_uncertainty": ["exact alloy and finish require later confirmation"]
  },
  "stones": {
    "stone_plan_type": "multi_stone",
    "center_stone": null,
    "side_stones": [],
    "accent_stones": [
      {
        "stone_family": "green gemstone direction",
        "stone_color_direction": "soft green",
        "shape": "round",
        "size": "small accent",
        "carat_estimate": null,
        "lab_or_natural_preference": "unknown",
        "setting_direction": "flush or tiny bezel"
      }
    ],
    "stone_uncertainty": ["number of accents and exact stone family need human review"]
  },
  "composition": {
    "focal_point": "leaf-shaped pendant with subtle green accent",
    "layout": "organic vertical",
    "proportion_notes": "keep pendant light and wearable",
    "motif_elements": ["leaf", "subtle initial", "protective oval outline"],
    "negative_space": "small open cutouts allowed if buildable",
    "view_requirements": ["front", "side", "bail detail"],
    "sketch_angle_requirements": ["front concept view", "small side thickness note"]
  },
  "wearability": {
    "comfort_notes": "smooth back and edges",
    "daily_wear_level": "daily",
    "height_width_depth_targets": null,
    "weight_sensitivity": "medium",
    "sharp_edge_risk": "medium",
    "snag_risk": "medium"
  },
  "manufacturing_constraints": {
    "production_feasibility_notes": ["integrated bail and open cutouts need CAD review later"],
    "cad_required_later": true,
    "not_for_direct_production": true,
    "minimum_thickness_notes": "avoid hairline leaf veins that would be too fragile",
    "stone_setting_risk": "medium",
    "chain_strength_notes": "chain and bail strength require later manual confirmation",
    "avoid_unbuildable_details": ["unsupported floating initial", "overly thin leaf stems"]
  },
  "reference_images": {
    "has_reference_images": true,
    "reference_image_count": 3,
    "reference_image_roles": ["leaf silhouette", "surface texture mood", "pendant scale reference"],
    "do_not_copy_exactly": true,
    "use_as_inspiration_only": true
  },
  "unknowns": [
    {
      "field": "piece.chain_or_attachment.chain_direction",
      "customer_specified": false,
      "resolution": "needs_human_followup",
      "note": "Exact chain type and length should be confirmed later."
    },
    {
      "field": "composition.motif_elements.initial",
      "customer_specified": true,
      "resolution": "needs_human_followup",
      "note": "Initial placement should be reviewed to avoid making it too literal."
    }
  ],
  "avoid": {
    "design_elements": ["copying reference image details exactly", "sharp leaf points"],
    "material_constraints": ["unsupported alloy promises"],
    "unsupported_mvp_options": ["price guarantee", "delivery date promise", "production approval"],
    "generation_pitfalls": ["do not reproduce reference images as direct copies", "do not include customer name or contact details"]
  },
  "internal_review_flags": {
    "needs_human_followup": true,
    "ambiguous_stone_request": "medium",
    "production_risk": "medium",
    "possible_policy_or_claim_risk": "low",
    "reference_copying_risk": "high",
    "customer_expectation_risk": "medium"
  },
  "customer_safe_summary": {
    "short_summary": "A delicate botanical pendant concept with a protective leaf-inspired form and small green accent direction.",
    "concept_boundary_note": "This is an exploratory concept direction only; CAD, quote, material sourcing, and production review would happen later.",
    "excluded_internal_topics": ["reference copying risk", "private reference metadata", "internal generation notes"]
  },
  "internal_generation_notes": {
    "sketch_guidance": "Use the references only for broad mood and scale. Create an original leaf-inspired pendant, not a copy.",
    "style_guardrails": ["hand-drawn jewelry concept sketch", "warm paper background", "no photorealistic render"],
    "privacy_guardrails": ["no customer contact details", "do not expose reference file names", "do not copy exact reference design"],
    "requires_review_before_image_generation": true
  },
  "human_review": {
    "required_before_generation": true,
    "required_before_customer_delivery": true,
    "reviewer_decisions_needed": ["confirm reference image role", "confirm green accent plan", "confirm bail/chain direction"],
    "approval_boundary": "internal_spec_only"
  }
}
```

## Future Validation Approach

Future implementation should validate:

- Required top-level sections.
- Required metadata fields, including `schema_version`, `created_from`, and
  `prompt_policy_version`.
- Supported enum values.
- Nullable and unknown handling.
- No illegal AI sketch review statuses; `pending` must remain invalid for final
  review state.
- No unsupported material, stone, production, quote, certification, or delivery
  claims.
- No direct production approval.
- No customer-facing unreviewed output.
- No raw customer private contact details in generation-facing fields.
- No internal notes in `customer_safe_summary`.
- `cad_required_later` and `not_for_direct_production` remain true wherever the
  schema could influence sketch generation.
- Human review is required before generation and before customer delivery.

Validation should treat vague customer language as explicit unknowns or review
items, not as permission to invent precise specs.

## Relationship To Agent 50B And Agent 50C

Agent 50A defines the Design Spec JSON Schema v1 planning contract only.

Agent 50B should define Hand Sketch Instruction Template v1. That future
instruction should be generated from Design Spec JSON, not directly from raw
customer free text.

Agent 50C should plan how customer Concept Brief fields map into Design Spec
JSON, including normalization, uncertainty handling, and safe review flags.

Agent 50A does not implement the transformation, create prompts, call OpenAI,
call any image model, write storage records, create API routes, or add customer
delivery behavior.

## Hard Stop Boundaries

Agent 50A does not:

- Modify app or API code.
- Create an API route.
- Create a server action.
- Execute SQL.
- Connect to Supabase live.
- Inspect live schema, rows, customer data, IDs, or notes.
- Inspect `reviewer_note` or `customer_safe_note`.
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
- Start Agent 50B or Agent 50C.

## Agent 50A Validation

Expected docs-only validation:

- `git diff --stat`
- `git diff`
- `git diff --check`
- `git diff --cached --check` after path-specific staging

Build and Playwright are skipped because Agent 50A changes documentation only
and does not change runtime behavior, UI behavior, API behavior, persisted data,
or asserted test copy.
