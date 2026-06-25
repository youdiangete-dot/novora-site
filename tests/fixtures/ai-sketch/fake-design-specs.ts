export const fakeSimpleRingUnknownStoneSize = {
  internal_only: true,
  schema_version: "design_spec_json_v1",
  source: {
    created_from: "fake_concept_brief",
    source_identifier: "fake_ring_unknown_stone_size",
    prompt_policy_version: "hand_sketch_instruction_policy_v1_placeholder",
    language: "en",
    units: "mm",
  },
  customer_intent: {
    must_have: ["low-profile ring", "soft blue stone direction"],
    nice_to_have: ["quiet vintage feeling"],
  },
  piece: {
    piece_type: "ring",
    subtype: "center-stone ring",
    size_context: "not bulky",
    ring_size: {
      is_known: false,
      system: null,
      value: null,
    },
  },
  style: {
    primary_style_keywords: ["soft vintage", "delicate"],
    silhouette: "rounded low profile",
    visual_complexity: "moderate",
  },
  materials: {
    metal_preference: "yellow gold direction",
    metal_color: "yellow",
    finish: "polished",
    material_uncertainty: ["exact alloy requires later confirmation"],
  },
  stones: {
    stone_plan_type: "center_stone",
    center_stone: {
      stone_family: "not sure blue gemstone direction",
      stone_color_direction: "soft blue",
      shape: "oval",
      size: "not sure",
      carat_estimate: null,
      setting_direction: "low bezel or low prong direction",
    },
    stone_uncertainty: ["exact stone family and size need human follow-up"],
  },
  composition: {
    focal_point: "single oval blue center-stone direction",
    layout: "centered",
    proportion_notes: "preserve modest scale; do not invent dimensions",
  },
  reference_images: {
    has_reference_images: false,
    reference_image_count: 0,
    reference_image_roles: [],
    do_not_copy_exactly: true,
    use_as_inspiration_only: true,
  },
  unknowns: [
    {
      field: "stones.center_stone.size",
      resolution: "not_safe_to_infer",
      note: "Preserve not sure; do not invent gemstone size or carat weight.",
    },
  ],
  human_review: {
    required_before_generation: true,
    required_before_customer_delivery: true,
    reviewer_decisions_needed: ["confirm stone family", "confirm stone size direction"],
    approval_boundary: "internal_spec_only",
  },
};

export const fakePendantReferenceInspiration = {
  ...fakeSimpleRingUnknownStoneSize,
  source: {
    ...fakeSimpleRingUnknownStoneSize.source,
    source_identifier: "fake_pendant_reference_inspiration",
  },
  customer_intent: {
    must_have: ["botanical pendant direction"],
    nice_to_have: ["small green accent if reviewed"],
  },
  piece: {
    piece_type: "pendant",
    subtype: "pendant necklace",
    chain_or_attachment: {
      chain_direction: "not sure",
      attachment_direction: "integrated bail direction",
    },
  },
  style: {
    primary_style_keywords: ["botanical", "modern heirloom"],
    silhouette: "vertical leaf-inspired pendant",
    visual_complexity: "moderate",
  },
  stones: {
    stone_plan_type: "multi_stone",
    accent_stones: [
      {
        stone_family: "green gemstone direction",
        size: "not sure",
        carat_estimate: null,
      },
    ],
    stone_uncertainty: ["exact green accent count and size require review"],
  },
  composition: {
    focal_point: "original leaf-inspired pendant",
    layout: "organic vertical",
    proportion_notes: "use references for broad mood and scale only",
  },
  reference_images: {
    has_reference_images: true,
    reference_image_count: 2,
    reference_image_roles: ["leaf silhouette inspiration", "texture mood"],
    do_not_copy_exactly: true,
    use_as_inspiration_only: true,
  },
  unknowns: [
    {
      field: "piece.chain_or_attachment.chain_direction",
      resolution: "needs_human_followup",
      note: "Customer is not sure about chain type.",
    },
  ],
};

export const fakeMultiStoneAmbiguity = {
  ...fakeSimpleRingUnknownStoneSize,
  source: {
    ...fakeSimpleRingUnknownStoneSize.source,
    source_identifier: "fake_multi_stone_ambiguity",
  },
  stones: {
    stone_plan_type: "multi_stone",
    accent_stones: [],
    stone_uncertainty: ["Customer wants several stones but not sure about count, size, or layout."],
  },
  unknowns: [
    {
      field: "stones.accent_stones",
      resolution: "needs_human_followup",
      note: "Multi-stone direction is ambiguous and must not be filled automatically.",
    },
  ],
};

export const fakeUnsupportedMaterialCase = {
  ...fakeSimpleRingUnknownStoneSize,
  source: {
    ...fakeSimpleRingUnknownStoneSize.source,
    source_identifier: "fake_unsupported_material",
  },
  materials: {
    metal_preference: "meteorite inlay request",
    material_uncertainty: ["Unsupported material must be routed to human review."],
  },
};

export const fakeExactCopyReferenceRisk = {
  ...fakePendantReferenceInspiration,
  source: {
    ...fakePendantReferenceInspiration.source,
    source_identifier: "fake_exact_copy_reference_risk",
  },
  reference_images: {
    has_reference_images: true,
    reference_image_count: 1,
    reference_image_roles: ["customer asked to copy exactly"],
    do_not_copy_exactly: false,
    use_as_inspiration_only: false,
  },
};

export const fakeInvalidPendingStatus = {
  ...fakeSimpleRingUnknownStoneSize,
  review_status: "pending",
};

export const fakeMissingRequiredSection = {
  internal_only: true,
  schema_version: "design_spec_json_v1",
  source: {
    source_identifier: "fake_missing_required_section",
  },
  human_review: {
    required_before_generation: true,
    required_before_customer_delivery: true,
  },
};

export const fakeHumanFollowUpRequired = {
  ...fakeSimpleRingUnknownStoneSize,
  source: {
    ...fakeSimpleRingUnknownStoneSize.source,
    source_identifier: "fake_human_followup_required",
  },
  unknowns: [
    {
      field: "piece.ring_size",
      resolution: "needs_human_followup",
      note: "Ring size must be confirmed before any production discussion.",
    },
  ],
};

export const fakeCadQuoteProductionExpectationRisk = {
  ...fakeSimpleRingUnknownStoneSize,
  source: {
    ...fakeSimpleRingUnknownStoneSize.source,
    source_identifier: "fake_cad_quote_production_expectation_risk",
  },
  customer_intent: {
    must_have: ["CAD-ready design", "final quote", "start production after sketch"],
  },
};

export const fakePrivateContactLeak = {
  ...fakeSimpleRingUnknownStoneSize,
  source: {
    ...fakeSimpleRingUnknownStoneSize.source,
    source_identifier: "fake_private_contact_leak",
  },
  customer_email: "fake-customer@example.invalid",
  customer_phone: "fake-phone-placeholder",
};

export const fakeReviewerCustomerNoteLeak = {
  ...fakeSimpleRingUnknownStoneSize,
  source: {
    ...fakeSimpleRingUnknownStoneSize.source,
    source_identifier: "fake_reviewer_customer_note_leak",
  },
  reviewer_note: "Fake reviewer note used only to ensure rejection.",
  customer_safe_note: "Fake customer-safe note used only to ensure rejection.",
};

export const fakeAiSketchDesignSpecs = [
  fakeSimpleRingUnknownStoneSize,
  fakePendantReferenceInspiration,
  fakeMultiStoneAmbiguity,
  fakeUnsupportedMaterialCase,
  fakeExactCopyReferenceRisk,
  fakeInvalidPendingStatus,
  fakeMissingRequiredSection,
  fakeHumanFollowUpRequired,
  fakeCadQuoteProductionExpectationRisk,
  fakePrivateContactLeak,
  fakeReviewerCustomerNoteLeak,
];
