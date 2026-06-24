# NOVORA Agent 50B Hand Sketch Instruction Template v1

## Purpose And Role

Hand Sketch Instruction Template v1 is the canonical internal fixed-format
instruction template that NOVORA should generate from Design Spec JSON before
any future internal AI sketch draft workflow begins.

The required sequence is:

```text
Customer Concept Brief -> Design Spec JSON -> Hand Sketch Instruction -> future internal AI sketch draft workflow
```

The Hand Sketch Instruction is:

- Internal only.
- Generated from Design Spec JSON.
- Used before any future internal AI sketch draft generation.
- A controlled, production-aware hand-sketch direction.
- A reviewable template that can support future prompt versioning and revision
  cycles.

The Hand Sketch Instruction is not:

- Customer-facing copy.
- CAD.
- A quote.
- An order confirmation.
- Production approval.
- A model call.
- A live prompt execution request.
- A direct raw customer brief.

Raw customer natural-language brief text must not be used as the final
sketch-generation prompt. Customer intent should first be normalized into
Design Spec JSON, then transformed into this fixed instruction shape, then
reviewed before any future internal draft generation path is allowed.

## Relationship To Agent 50A, 50C, And 53A

Agent 50A defines Design Spec JSON Schema v1, the canonical internal structured
layer between the customer Concept Brief and future sketch work.

Agent 50B defines how that Design Spec becomes a structured hand-sketch
instruction. This task documents the template and rules only. It does not
implement transformation code, create prompts for live model execution, call
OpenAI, call an image model, store generated images, or add customer delivery.

Agent 50C should later plan how submitted customer Concept Brief data becomes
Design Spec JSON, including normalization, uncertainty handling, safe review
flags, and boundaries around raw customer text.

Agent 53A may later plan an internal AI sketch draft pipeline. That future
pipeline must consume reviewed structured instruction content, not raw
customer brief text, and must preserve internal-only generation and human
review gates.

## Template Design Principles

- Use deterministic structure and stable section order.
- State the sketch purpose clearly.
- Keep human-review-first language in the instruction.
- Be production-aware without authorizing production.
- Do not hallucinate missing details.
- Preserve uncertainty explicitly.
- Separate customer-stated details from internal interpretation.
- Separate the customer-safe summary from internal sketch guidance.
- Treat reference images as inspiration only; do not copy them exactly.
- Keep sensitive customer notes out of generation-facing content unless a
  separate approved policy allows them.
- Exclude customer contact information from sketch instructions.
- Exclude live customer data examples.
- Support future prompt policy and template versioning.
- Support future revision cycles without changing the fixed section contract.
- Preserve the rule that AI generation success alone must not approve a sketch.
- Preserve human final approval before any customer-facing delivery.
- Preserve email-only customer-facing sketch delivery after human review,
  optimization, and approval.
- Preserve that customer pages must not display unreviewed AI sketches.

## Proposed Fixed Template Structure

Every Hand Sketch Instruction v1 should use this stable section order:

1. `template_version`
2. `instruction_purpose`
3. `source_design_spec`
4. `customer_safe_design_summary`
5. `sketch_objective`
6. `piece_overview`
7. `style_direction`
8. `materials_and_finish_direction`
9. `stone_and_setting_direction`
10. `composition_and_proportion`
11. `wearability_and_scale_notes`
12. `manufacturing_awareness`
13. `reference_image_guidance`
14. `must_include`
15. `must_avoid`
16. `uncertainties_to_preserve`
17. `view_and_angle_requirements`
18. `linework_and_rendering_style`
19. `annotation_requirements`
20. `internal_review_flags`
21. `human_review_requirements`
22. `forbidden_outputs`

## Section Details

### A. Template Metadata

Include:

- `template_version`: fixed value for this template, initially
  `hand_sketch_instruction_template_v1`.
- `design_spec_schema_version`: expected Design Spec source schema, initially
  `design_spec_json_v1`.
- `source_type`: expected source, such as `design_spec_json`.
- `prompt_policy_version`: future policy reference for prompt/instruction
  guardrails.
- `language`: instruction language, initially likely `en`.
- `units`: measurement convention, usually `mm` when dimensions are present.

### B. Customer-Safe Design Summary

Include a short customer-safe design summary that could be reviewed for later
customer communication if needed. It must not include internal notes, quote
language, CAD language, production approval language, unapproved promises,
private customer details, or operational metadata.

This section is distinct from internal sketch guidance. A customer-safe summary
may describe concept direction, but it does not authorize direct delivery.

### C. Sketch Objective

Explain the purpose of the sketch:

- Communicate concept direction.
- Show silhouette, proportion, and motif.
- Support designer review.
- Remain a concept sketch only.
- Avoid production-ready, CAD-ready, final jewelry specification, quote, order,
  or sourcing language.

### D. Piece Overview

Include:

- Piece type.
- Subtype.
- Wearing context.
- Ring size, pendant size, chain attachment, or other type-specific context
  when applicable.
- Known dimensions or explicit unknowns.

### E. Style Direction

Include:

- Primary style keywords.
- Secondary style keywords.
- Era or cultural reference when applicable and safe.
- Mood.
- Silhouette.
- Symmetry.
- Visual complexity.
- Surface language.

### F. Materials And Finish Direction

Include:

- Metal color.
- Material direction.
- Finish.
- Enamel or mixed-material direction when applicable.
- Explicit uncertainty where material, alloy, finish, sourcing, or support is
  not confirmed.

Materials remain design direction only. The instruction must not imply material
availability, pricing, sourcing, assay, or production confirmation.

### G. Stone And Setting Direction

Support:

- No stone.
- Center stone.
- Repeated stone.
- Multi-stone.

Include:

- Stone family.
- Color direction.
- Shape.
- Size or carat estimate only when customer-stated or reviewed.
- Lab or natural preference.
- Setting direction.
- Side stones or accent stones.
- Unknowns.
- Production risk notes.

Stone guidance must not create certification, sourcing, quality, price, or
availability promises.

### H. Composition And Proportion

Include:

- Focal point.
- Layout.
- Motif elements.
- Negative space.
- Proportion notes.
- Scale hierarchy.
- Relationship between stone, metal, and motif.

### I. Wearability And Scale

Include:

- Comfort notes.
- Daily wear level.
- Height, width, and depth targets when known.
- Weight sensitivity.
- Snag risk.
- Sharp edge risk.
- Chain strength notes when applicable.

### J. Manufacturing Awareness

Provide production-aware guidance without approving production:

- CAD is required later for production work.
- The instruction is not for direct production.
- Avoid impossible thinness.
- Avoid unsupported floating stones.
- Avoid unbuildable geometry.
- Mark possible risks for human review.

This section keeps concept sketching realistic without turning the instruction
into CAD, a quote, or production authorization.

### K. Reference Image Guidance

Include:

- Reference images are inspiration only.
- Do not copy exactly.
- Which elements may inspire style, mood, silhouette, texture, color, scale, or
  composition.
- Which elements must not be copied.
- Reference image count and roles when available from reviewed metadata.

Do not include private file names, protected URLs, customer contact details, or
raw reference image contents in the instruction.

### L. Must Include

Examples:

- Specific motif.
- Stone arrangement.
- Customer-stated required element.
- Symbolic or emotional detail.
- Ring, pendant, earring, bracelet, or necklace structure requirement.

Must-include items should separate customer-stated requirements from internal
interpretation.

### M. Must Avoid

Examples:

- Unsupported NOVORA MVP options.
- Unbuildable construction.
- Customer-stated dislikes.
- Overpromising CAD, quote, order, sourcing, production, price, or delivery.
- Exact copying of reference images.
- Illegal AI review status.
- Customer-facing unreviewed draft.

The final AI sketch review statuses remain only:

- `internal_draft_not_generated`
- `draft_generated_internal_only`
- `needs_revision`
- `approved_for_customer`

`pending` is illegal, excluded, and not valid for final AI sketch review
status.

### N. Uncertainties To Preserve

Include:

- Fields not specified.
- Options that need human follow-up.
- Details safe to infer.
- Details not safe to infer.

Uncertainty should remain visible rather than filled with unreviewed precision.

### O. View And Angle Requirements

Include:

- Main perspective view.
- Optional side view.
- Optional top view.
- Optional detail callout.
- Annotation needs.
- A reminder to avoid conflicting views.

Views should help the designer inspect the concept, not imply CAD completeness.

### P. Linework And Rendering Style

Define hand-sketch output direction:

- Clean jewelry concept sketch.
- Readable proportions.
- Controlled linework.
- Not photorealistic unless separately approved.
- Avoid excessive decorative noise.
- Avoid misleading CAD-like precision.
- Avoid over-rendered gemstone claims.

### Q. Annotation Requirements

Include:

- Label uncertain details.
- Label concept-only areas.
- Label stone direction if relevant.
- Label human-review flags.
- Do not include private customer details.

Annotations should assist internal review. They must not expose contact
details, raw private notes, protected references, `reviewer_note`, or
`customer_safe_note`.

### R. Internal Review Flags

Include:

- Needs human follow-up.
- Ambiguous stone request.
- Production risk.
- Reference copying risk.
- Customer expectation risk.
- Possible unsupported material or rule risk.

Flags are internal review signals only. They are not customer copy and must not
approve generation, delivery, or gallery use.

### S. Human Review Requirements

Include:

- Human review required before generation.
- Human review required before customer delivery.
- Review decisions needed.
- Approval boundary.
- No automatic approval from generation success.

`approved_for_customer` is not equal to `approved_for_gallery`. Customer-facing
sketch delivery remains email-only after human review, optimization, and
approval. Customer pages must not display unreviewed AI sketches.

### T. Forbidden Outputs

List:

- Customer-ready final design.
- CAD drawing.
- Quote.
- Production approval.
- Order confirmation.
- Direct customer delivery.
- Gallery approval.
- Unreviewed customer-facing sketch.
- Copied reference image.
- Image-generation execution instruction.

## Fixed Template Format

Future agents should reuse this shape when generating a Hand Sketch
Instruction from Design Spec JSON:

```json
{
  "template_version": "hand_sketch_instruction_template_v1",
  "instruction_purpose": {
    "purpose": "Create an internal hand-sketch instruction from reviewed Design Spec JSON.",
    "audience": "NOVORA internal designer or future internal draft workflow",
    "not_customer_facing": true,
    "not_cad": true,
    "not_quote": true,
    "not_order_confirmation": true,
    "not_production_approval": true,
    "not_model_call": true,
    "not_raw_customer_brief": true
  },
  "source_design_spec": {
    "design_spec_schema_version": "design_spec_json_v1",
    "source_type": "design_spec_json",
    "prompt_policy_version": "hand_sketch_instruction_policy_v1",
    "language": "en",
    "units": "mm",
    "source_identifier": "internal_or_example_source_only"
  },
  "customer_safe_design_summary": {
    "short_summary": "",
    "excluded_content": [
      "internal notes",
      "customer contact details",
      "private file names",
      "quote language",
      "CAD or production approval language",
      "unapproved promises"
    ]
  },
  "sketch_objective": {
    "objective": "",
    "concept_only": true,
    "supports_designer_review": true,
    "not_final_jewelry_specification": true
  },
  "piece_overview": {
    "piece_type": "",
    "subtype": "",
    "wearing_context": "",
    "size_context": "",
    "known_dimensions": [],
    "unknown_dimensions": []
  },
  "style_direction": {
    "primary_style_keywords": [],
    "secondary_style_keywords": [],
    "era_or_cultural_reference": null,
    "mood": "",
    "silhouette": "",
    "symmetry": "",
    "visual_complexity": "",
    "surface_language": ""
  },
  "materials_and_finish_direction": {
    "metal_color": "",
    "material_direction": "",
    "finish": "",
    "enamel_or_mixed_materials": "",
    "uncertainty": []
  },
  "stone_and_setting_direction": {
    "stone_plan_type": "none | center_stone | repeated_stone | multi_stone | unknown",
    "stone_family": "",
    "color_direction": "",
    "shape": "",
    "size_or_carat_estimate": "",
    "lab_or_natural_preference": "",
    "setting_direction": "",
    "side_or_accent_stones": [],
    "unknowns": [],
    "production_risk_notes": []
  },
  "composition_and_proportion": {
    "focal_point": "",
    "layout": "",
    "motif_elements": [],
    "negative_space": "",
    "proportion_notes": "",
    "scale_hierarchy": "",
    "stone_metal_motif_relationship": ""
  },
  "wearability_and_scale_notes": {
    "comfort_notes": [],
    "daily_wear_level": "",
    "height_width_depth_targets": "",
    "weight_sensitivity": "",
    "snag_risk": "",
    "sharp_edge_risk": "",
    "chain_strength_notes": ""
  },
  "manufacturing_awareness": {
    "cad_required_later": true,
    "not_for_direct_production": true,
    "avoid_impossible_thinness": true,
    "avoid_unsupported_floating_stones": true,
    "avoid_unbuildable_geometry": true,
    "human_review_risks": []
  },
  "reference_image_guidance": {
    "has_reference_images": false,
    "reference_image_count": 0,
    "reference_image_roles": [],
    "inspiration_only": true,
    "do_not_copy_exactly": true,
    "may_inspire": [],
    "must_not_copy": []
  },
  "must_include": [],
  "must_avoid": [],
  "uncertainties_to_preserve": [
    {
      "topic": "",
      "resolution": "needs_human_followup | safe_to_infer | not_safe_to_infer | leave_unspecified",
      "instruction": ""
    }
  ],
  "view_and_angle_requirements": {
    "main_view": "",
    "optional_side_view": "",
    "optional_top_view": "",
    "optional_detail_callout": "",
    "annotation_needs": [],
    "avoid_conflicting_views": true
  },
  "linework_and_rendering_style": {
    "style": "clean jewelry concept sketch",
    "readable_proportions": true,
    "controlled_linework": true,
    "avoid_photorealism": true,
    "avoid_cad_like_precision": true,
    "avoid_excessive_decorative_noise": true,
    "avoid_over_rendered_gemstone_claims": true
  },
  "annotation_requirements": {
    "label_uncertain_details": true,
    "label_concept_only_areas": true,
    "label_stone_direction_if_relevant": true,
    "label_human_review_flags": true,
    "exclude_private_customer_details": true
  },
  "internal_review_flags": {
    "needs_human_followup": false,
    "ambiguous_stone_request": "none | low | medium | high",
    "production_risk": "none | low | medium | high",
    "reference_copying_risk": "none | low | medium | high",
    "customer_expectation_risk": "none | low | medium | high",
    "unsupported_material_or_rule_risk": "none | low | medium | high"
  },
  "human_review_requirements": {
    "required_before_generation": true,
    "required_before_customer_delivery": true,
    "review_decisions_needed": [],
    "approval_boundary": "internal_instruction_only",
    "generation_success_does_not_approve": true,
    "approved_for_customer_is_not_gallery_approval": true
  },
  "forbidden_outputs": [
    "customer-ready final design",
    "CAD drawing",
    "quote",
    "production approval",
    "order confirmation",
    "direct customer delivery",
    "gallery approval",
    "unreviewed customer-facing sketch",
    "copied reference image",
    "image-generation execution instruction"
  ]
}
```

## Example Generated Hand-Sketch Instructions

These examples are fake and illustrative only. They do not use real customer
data, names, emails, phone numbers, public references, live customer IDs,
reviewer notes, customer-safe notes, or live submissions.

### Example 1: Simple Ring With Center-Stone Uncertainty

```json
{
  "template_version": "hand_sketch_instruction_template_v1",
  "instruction_purpose": {
    "purpose": "Create an internal hand-sketch instruction from reviewed Design Spec JSON.",
    "audience": "NOVORA internal designer or future internal draft workflow",
    "not_customer_facing": true,
    "not_cad": true,
    "not_quote": true,
    "not_order_confirmation": true,
    "not_production_approval": true,
    "not_model_call": true,
    "not_raw_customer_brief": true
  },
  "source_design_spec": {
    "design_spec_schema_version": "design_spec_json_v1",
    "source_type": "design_spec_json",
    "prompt_policy_version": "hand_sketch_instruction_policy_v1",
    "language": "en",
    "units": "mm",
    "source_identifier": "fake_example_ring_design_spec"
  },
  "customer_safe_design_summary": {
    "short_summary": "A low-profile ring concept with a soft blue center-stone direction and delicate vintage-inspired details.",
    "excluded_content": [
      "internal notes",
      "customer contact details",
      "quote language",
      "CAD or production approval language"
    ]
  },
  "sketch_objective": {
    "objective": "Show a wearable ring concept with a gentle oval focal stone, balanced shoulders, and concept-only proportion guidance.",
    "concept_only": true,
    "supports_designer_review": true,
    "not_final_jewelry_specification": true
  },
  "piece_overview": {
    "piece_type": "ring",
    "subtype": "low-profile statement ring",
    "wearing_context": "frequent wear",
    "size_context": "not bulky",
    "known_dimensions": [],
    "unknown_dimensions": ["ring size", "exact stone size"]
  },
  "style_direction": {
    "primary_style_keywords": ["soft vintage", "delicate"],
    "secondary_style_keywords": ["organic", "quiet detail"],
    "era_or_cultural_reference": null,
    "mood": "warm and personal",
    "silhouette": "rounded low profile",
    "symmetry": "symmetrical",
    "visual_complexity": "moderate",
    "surface_language": "polished with subtle texture"
  },
  "materials_and_finish_direction": {
    "metal_color": "yellow",
    "material_direction": "yellow metal direction only",
    "finish": "polished",
    "enamel_or_mixed_materials": "none",
    "uncertainty": ["exact alloy and production metal require later confirmation"]
  },
  "stone_and_setting_direction": {
    "stone_plan_type": "center_stone",
    "stone_family": "blue gemstone direction",
    "color_direction": "soft blue",
    "shape": "oval",
    "size_or_carat_estimate": "unknown; do not invent carat size",
    "lab_or_natural_preference": "unknown",
    "setting_direction": "low bezel or low prong direction",
    "side_or_accent_stones": [],
    "unknowns": ["exact stone family", "exact size", "lab or natural preference"],
    "production_risk_notes": ["center setting height needs later CAD review"]
  },
  "composition_and_proportion": {
    "focal_point": "single oval blue center-stone direction",
    "layout": "centered",
    "motif_elements": ["soft tapered shoulders"],
    "negative_space": "minimal",
    "proportion_notes": "keep the stone modest and the shoulders balanced",
    "scale_hierarchy": "stone is the focal point; band and shoulder details stay secondary",
    "stone_metal_motif_relationship": "metal frames the stone without making the ring tall"
  },
  "wearability_and_scale_notes": {
    "comfort_notes": ["avoid tall setting", "avoid sharp shoulder edges"],
    "daily_wear_level": "frequent",
    "height_width_depth_targets": "unknown; preserve as concept-only",
    "weight_sensitivity": "medium",
    "snag_risk": "medium",
    "sharp_edge_risk": "low",
    "chain_strength_notes": "not applicable"
  },
  "manufacturing_awareness": {
    "cad_required_later": true,
    "not_for_direct_production": true,
    "avoid_impossible_thinness": true,
    "avoid_unsupported_floating_stones": true,
    "avoid_unbuildable_geometry": true,
    "human_review_risks": ["confirm stone direction", "confirm ring size before production discussion"]
  },
  "reference_image_guidance": {
    "has_reference_images": false,
    "reference_image_count": 0,
    "reference_image_roles": [],
    "inspiration_only": true,
    "do_not_copy_exactly": true,
    "may_inspire": [],
    "must_not_copy": []
  },
  "must_include": [
    "low-profile ring concept",
    "single blue center-stone direction",
    "delicate vintage-inspired feeling"
  ],
  "must_avoid": [
    "high snag-prone setting",
    "invented carat size",
    "CAD-ready precision",
    "quote or production language",
    "customer-facing unreviewed draft"
  ],
  "uncertainties_to_preserve": [
    {
      "topic": "ring size",
      "resolution": "needs_human_followup",
      "instruction": "Do not imply final fit or production readiness."
    },
    {
      "topic": "stone size",
      "resolution": "not_safe_to_infer",
      "instruction": "Show modest scale direction only."
    }
  ],
  "view_and_angle_requirements": {
    "main_view": "three-quarter top view",
    "optional_side_view": "small side profile to show low setting height",
    "optional_top_view": "top view if needed for shoulder symmetry",
    "optional_detail_callout": "center setting concept callout",
    "annotation_needs": ["label center stone as direction only", "label ring size unknown"],
    "avoid_conflicting_views": true
  },
  "linework_and_rendering_style": {
    "style": "clean jewelry concept sketch",
    "readable_proportions": true,
    "controlled_linework": true,
    "avoid_photorealism": true,
    "avoid_cad_like_precision": true,
    "avoid_excessive_decorative_noise": true,
    "avoid_over_rendered_gemstone_claims": true
  },
  "annotation_requirements": {
    "label_uncertain_details": true,
    "label_concept_only_areas": true,
    "label_stone_direction_if_relevant": true,
    "label_human_review_flags": true,
    "exclude_private_customer_details": true
  },
  "internal_review_flags": {
    "needs_human_followup": true,
    "ambiguous_stone_request": "medium",
    "production_risk": "low",
    "reference_copying_risk": "none",
    "customer_expectation_risk": "medium",
    "unsupported_material_or_rule_risk": "low"
  },
  "human_review_requirements": {
    "required_before_generation": true,
    "required_before_customer_delivery": true,
    "review_decisions_needed": ["confirm stone family", "confirm ring size", "confirm setting direction"],
    "approval_boundary": "internal_instruction_only",
    "generation_success_does_not_approve": true,
    "approved_for_customer_is_not_gallery_approval": true
  },
  "forbidden_outputs": [
    "customer-ready final design",
    "CAD drawing",
    "quote",
    "production approval",
    "order confirmation",
    "direct customer delivery",
    "gallery approval",
    "unreviewed customer-facing sketch",
    "copied reference image",
    "image-generation execution instruction"
  ]
}
```

### Example 2: Pendant With Reference Images

```json
{
  "template_version": "hand_sketch_instruction_template_v1",
  "instruction_purpose": {
    "purpose": "Create an internal hand-sketch instruction from reviewed Design Spec JSON.",
    "audience": "NOVORA internal designer or future internal draft workflow",
    "not_customer_facing": true,
    "not_cad": true,
    "not_quote": true,
    "not_order_confirmation": true,
    "not_production_approval": true,
    "not_model_call": true,
    "not_raw_customer_brief": true
  },
  "source_design_spec": {
    "design_spec_schema_version": "design_spec_json_v1",
    "source_type": "design_spec_json",
    "prompt_policy_version": "hand_sketch_instruction_policy_v1",
    "language": "en",
    "units": "mm",
    "source_identifier": "fake_example_pendant_design_spec"
  },
  "customer_safe_design_summary": {
    "short_summary": "A delicate botanical pendant concept with a protective leaf-inspired form and small green accent direction.",
    "excluded_content": [
      "internal notes",
      "reference file names",
      "customer contact details",
      "quote language",
      "CAD or production approval language"
    ]
  },
  "sketch_objective": {
    "objective": "Show an original leaf-inspired pendant concept with a clear bail direction, light scale, and inspiration-only reference handling.",
    "concept_only": true,
    "supports_designer_review": true,
    "not_final_jewelry_specification": true
  },
  "piece_overview": {
    "piece_type": "pendant",
    "subtype": "pendant necklace",
    "wearing_context": "daily or frequent wear",
    "size_context": "small to medium pendant",
    "known_dimensions": [],
    "unknown_dimensions": ["exact pendant height", "exact chain length", "exact chain type"]
  },
  "style_direction": {
    "primary_style_keywords": ["botanical", "modern heirloom"],
    "secondary_style_keywords": ["soft", "symbolic", "delicate"],
    "era_or_cultural_reference": null,
    "mood": "protective and hopeful",
    "silhouette": "vertical oval leaf-inspired pendant",
    "symmetry": "organic",
    "visual_complexity": "moderate",
    "surface_language": "polished edges with light vein texture"
  },
  "materials_and_finish_direction": {
    "metal_color": "white",
    "material_direction": "white metal direction only",
    "finish": "mixed polished and light texture",
    "enamel_or_mixed_materials": "none",
    "uncertainty": ["exact alloy and final finish require later confirmation"]
  },
  "stone_and_setting_direction": {
    "stone_plan_type": "multi_stone",
    "stone_family": "green gemstone accent direction",
    "color_direction": "soft green",
    "shape": "small round accent direction",
    "size_or_carat_estimate": "small accent only; do not invent carat size",
    "lab_or_natural_preference": "unknown",
    "setting_direction": "flush or tiny bezel direction",
    "side_or_accent_stones": ["one to three small green accents if human review accepts"],
    "unknowns": ["exact accent count", "exact stone family", "exact chain direction"],
    "production_risk_notes": ["open cutouts, bail strength, and small accents need later CAD review"]
  },
  "composition_and_proportion": {
    "focal_point": "leaf-inspired pendant silhouette with small green accent direction",
    "layout": "organic vertical",
    "motif_elements": ["leaf", "subtle initial direction", "protective oval outline"],
    "negative_space": "small open areas allowed only if buildable",
    "proportion_notes": "keep pendant light and wearable",
    "scale_hierarchy": "leaf silhouette first, accent stone second, initial detail subtle",
    "stone_metal_motif_relationship": "green accents should support the leaf motif without overpowering it"
  },
  "wearability_and_scale_notes": {
    "comfort_notes": ["smooth back", "soft edges", "avoid sharp leaf points"],
    "daily_wear_level": "daily",
    "height_width_depth_targets": "unknown; preserve as concept-only",
    "weight_sensitivity": "medium",
    "snag_risk": "medium",
    "sharp_edge_risk": "medium",
    "chain_strength_notes": "integrated bail and chain strength require later manual confirmation"
  },
  "manufacturing_awareness": {
    "cad_required_later": true,
    "not_for_direct_production": true,
    "avoid_impossible_thinness": true,
    "avoid_unsupported_floating_stones": true,
    "avoid_unbuildable_geometry": true,
    "human_review_risks": ["reference copying risk", "bail strength", "small accent setting", "thin leaf vein fragility"]
  },
  "reference_image_guidance": {
    "has_reference_images": true,
    "reference_image_count": 3,
    "reference_image_roles": ["leaf silhouette", "surface texture mood", "pendant scale reference"],
    "inspiration_only": true,
    "do_not_copy_exactly": true,
    "may_inspire": ["general leaf mood", "overall scale feeling", "soft texture language"],
    "must_not_copy": ["exact outline", "exact stone placement", "exact reference composition", "private file details"]
  },
  "must_include": [
    "original botanical pendant direction",
    "integrated bail or clear chain attachment direction",
    "small green accent direction",
    "concept-only annotations"
  ],
  "must_avoid": [
    "copying reference images exactly",
    "sharp leaf points",
    "unsupported floating initial",
    "hairline metal sections",
    "quote or production language",
    "direct customer delivery"
  ],
  "uncertainties_to_preserve": [
    {
      "topic": "chain type and length",
      "resolution": "needs_human_followup",
      "instruction": "Sketch only a simple chain attachment direction; do not specify final chain."
    },
    {
      "topic": "reference image interpretation",
      "resolution": "not_safe_to_infer",
      "instruction": "Use references as inspiration only; create an original composition."
    },
    {
      "topic": "accent stone count",
      "resolution": "needs_human_followup",
      "instruction": "Show one to three accents as a concept direction, not a final stone count."
    }
  ],
  "view_and_angle_requirements": {
    "main_view": "front concept view",
    "optional_side_view": "small side thickness note",
    "optional_top_view": "not required",
    "optional_detail_callout": "bail attachment and accent setting callouts",
    "annotation_needs": ["label references as inspiration only", "label CAD required later", "label exact chain unknown"],
    "avoid_conflicting_views": true
  },
  "linework_and_rendering_style": {
    "style": "clean jewelry concept sketch",
    "readable_proportions": true,
    "controlled_linework": true,
    "avoid_photorealism": true,
    "avoid_cad_like_precision": true,
    "avoid_excessive_decorative_noise": true,
    "avoid_over_rendered_gemstone_claims": true
  },
  "annotation_requirements": {
    "label_uncertain_details": true,
    "label_concept_only_areas": true,
    "label_stone_direction_if_relevant": true,
    "label_human_review_flags": true,
    "exclude_private_customer_details": true
  },
  "internal_review_flags": {
    "needs_human_followup": true,
    "ambiguous_stone_request": "medium",
    "production_risk": "medium",
    "reference_copying_risk": "high",
    "customer_expectation_risk": "medium",
    "unsupported_material_or_rule_risk": "low"
  },
  "human_review_requirements": {
    "required_before_generation": true,
    "required_before_customer_delivery": true,
    "review_decisions_needed": ["confirm reference image role", "confirm green accent plan", "confirm bail and chain direction"],
    "approval_boundary": "internal_instruction_only",
    "generation_success_does_not_approve": true,
    "approved_for_customer_is_not_gallery_approval": true
  },
  "forbidden_outputs": [
    "customer-ready final design",
    "CAD drawing",
    "quote",
    "production approval",
    "order confirmation",
    "direct customer delivery",
    "gallery approval",
    "unreviewed customer-facing sketch",
    "copied reference image",
    "image-generation execution instruction"
  ]
}
```

## Validation Checklist

Future validation of a Hand Sketch Instruction should confirm:

- Has `template_version`.
- References Design Spec schema version.
- Includes sketch objective.
- Includes piece, style, material, stone, composition, wearability, and
  manufacturing sections.
- Preserves unknowns.
- Includes `must_include`.
- Includes `must_avoid`.
- Contains no private customer data.
- Contains no `reviewer_note`.
- Contains no `customer_safe_note`.
- Contains no illegal AI sketch review status.
- Does not include `pending` as a final AI sketch review status.
- Does not promise CAD, quote, order, sourcing, production, or production
  approval.
- Does not instruct customer-facing delivery.
- Requires human review before generation.
- Requires human review before customer delivery.
- Keeps `approved_for_customer` separate from gallery approval.
- Keeps reference images inspiration-only and not copied exactly.

## Relationship To Future Agent 50C And 53A

Agent 50C should plan how customer Concept Brief data becomes Design Spec JSON.
That future planning should define field mapping, normalization, uncertainty
handling, internal review flags, and customer-safe summary boundaries.

Agent 53A may later plan the internal AI sketch draft pipeline. That future
pipeline must preserve internal-only generation, human review before
generation, human final approval before customer delivery, and email-only
customer-facing sketch delivery after review, optimization, and approval.

Agent 50B does not implement AI generation, create an API, add UI, touch
Supabase, or start Agent 50C or Agent 53A.

## Hard Stop Boundaries

Agent 50B does not:

- Modify app or API code.
- Create an API route.
- Create a server action.
- Execute SQL.
- Connect to Supabase live.
- Inspect live schema, rows, customer data, IDs, or notes.
- Inspect `reviewer_note`.
- Inspect `customer_safe_note`.
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
- Start Agent 50C.
- Start Agent 53A.

## Agent 50B Validation

Expected docs-only validation:

- `git diff --stat`
- `git diff`
- `git diff --check`
- `git diff --cached --check` after path-specific staging

Build and Playwright are skipped because Agent 50B changes documentation only
and does not change runtime behavior, UI behavior, API behavior, package
contents, persisted data, or asserted test copy.
