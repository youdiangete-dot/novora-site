import {
  createMockNovoraDesignSpec,
  isContradictoryZodiacMouseEyeRule,
  MOCK_NOVORA_DESIGN_SPEC,
  NOVORA_DESIGN_SPEC_VERSION,
  type NovoraDesignSpec,
  type NovoraDesignSpecLanguage,
  ZODIAC_MOUSE_EYE_GEMSTONE_RULE,
} from "./design-spec";

export const NOVORA_HAND_SKETCH_INSTRUCTION_VERSION = "novora_hand_sketch_instruction_v1";

export const NOVORA_SKETCH_SHEET_STYLE = "novora_first_preview_sketch_style_v1";

export const NOVORA_SKETCH_VIEW_REQUIREMENTS = [
  "main_hero_view",
  "optional_side_profile_view",
  "optional_top_or_detail_view",
  "stone_setting_detail_view_if_needed",
  "view_consistency_required",
  "no_contradictory_construction_between_views",
] as const;

export const NOVORA_HAND_SKETCH_SAFETY_BOUNDARIES = {
  concept_preview_only: true,
  not_cad: true,
  not_quote: true,
  not_order_approval: true,
  not_payment_approval: true,
  not_production_approval: true,
  first_preview_ready: "first_preview_ready",
  approved_for_customer: "approved_for_customer",
  first_preview_ready_is_separate_from_approved_for_customer: true,
  human_review_required_for_customer_safe_delivery: true,
  human_review_required_for_production_decisions: true,
  human_review_requirement:
    "Human review remains required for customer-safe delivery and production decisions.",
} as const;

export type NovoraHandSketchViewInstruction = {
  view_type: (typeof NOVORA_SKETCH_VIEW_REQUIREMENTS)[number];
  required: boolean;
  instruction: string;
};

export type NovoraHandSketchAnnotationInstruction = {
  label: string;
  target: string;
  instruction: string;
};

export type NovoraHandSketchInstruction = {
  instruction_version: typeof NOVORA_HAND_SKETCH_INSTRUCTION_VERSION;
  design_spec_version: typeof NOVORA_DESIGN_SPEC_VERSION;
  public_reference: string;
  language: NovoraDesignSpecLanguage;
  source_design_spec_summary: {
    piece_type: NovoraDesignSpec["piece_type"];
    customer_intent_summary: string;
    design_direction: string[];
    source_type: NovoraDesignSpec["source"]["source_type"];
    mock_only: boolean;
    contains_real_customer_data: boolean;
  };
  prompt_usage_policy: {
    raw_customer_language_must_not_be_final_prompt: true;
    design_spec_precedes_hand_sketch_instruction: true;
    hand_sketch_instruction_precedes_provider_prompt: true;
    helper_calls_gpt: false;
    helper_calls_openai: false;
    helper_calls_image_api: false;
    helper_generates_images: false;
    policy_text: string[];
  };
  sheet_style: {
    style_version: typeof NOVORA_SKETCH_SHEET_STYLE;
    warm_light_background: boolean;
    consistent_line_weight: boolean;
    clean_jewelry_hand_sketch_feel: boolean;
    main_view_plus_optional_detail_views: boolean;
    clear_annotations_and_callouts: boolean;
    subtle_text_only_novora_watermark_or_footer_label: boolean;
    concept_preview_label: string;
    disclaimer_placement: string;
    no_cad_drawing_framing: boolean;
    no_quote_order_or_production_approval_framing: boolean;
  };
  brand_placement: {
    novora_text_watermark_allowed: boolean;
    official_logo_asset_path_remains_separate_if_not_documented: boolean;
    logo_or_brand_mark_must_not_be_jewelry_structure: boolean;
    logo_or_brand_mark_must_not_cover_jewelry_annotations_or_view_labels: boolean;
    placement_instruction: string;
  };
  views: NovoraHandSketchViewInstruction[];
  jewelry_rendering_instructions: {
    piece_type: NovoraDesignSpec["piece_type"];
    primary_form: string;
    construction_consistency: string[];
    setting_logic: string;
    setting_treatments: NovoraDesignSpec["jewelry_structure"]["setting_planning"];
    material_rendering_direction: string[];
    production_feasibility_reminders: string[];
    structure_risk_flags: string[];
  };
  stone_and_setting_instructions: {
    center_stone: string;
    side_stones: string;
    repeated_stones: string;
    stone_color_direction: string;
    stone_shape_direction: string;
    stone_size_relationship: string;
    setting_logic: string;
    special_stone_rules: string[];
  };
  motif_instructions: {
    motif_types: NovoraDesignSpec["motifs"]["motif_types"];
    motif_planning: string[];
    motif_placement: string;
    motif_to_structure_relationship: string;
    avoid_impossible_motif_construction: boolean;
    motif_must_not_conflict_with_setting_or_wearability: boolean;
  };
  annotation_instructions: {
    callout_style: string;
    labels: NovoraHandSketchAnnotationInstruction[];
    avoid_pricing_cad_production_or_approval_claims: boolean;
  };
  dimension_and_scale_notes: {
    approximate_size: string;
    ring_size_if_applicable: string;
    pendant_scale_if_applicable: string;
    unknown_or_to_confirm: string[];
  };
  composition_instructions: {
    layout: string;
    main_view_priority: boolean;
    detail_views_optional: boolean;
    keep_disclaimer_and_branding_outside_jewelry: boolean;
  };
  disclaimer_instructions: {
    required_label: string;
    concept_preview_only: boolean;
    not_cad: boolean;
    not_quote: boolean;
    not_order_approval: boolean;
    not_payment_approval: boolean;
    not_production_approval: boolean;
  };
  safety_boundaries: typeof NOVORA_HAND_SKETCH_SAFETY_BOUNDARIES;
  negative_constraints: string[];
  human_review_checklist: string[];
  generation_readiness: {
    ready_for_future_provider_prompt: false;
    provider_prompt_not_generated: true;
    missing_information: string[];
    human_review_focus: string[];
  };
  internal_notes: {
    fixture_only: boolean;
    no_real_customer_data: boolean;
    no_database_read: boolean;
    no_database_write: boolean;
    no_gpt_openai_or_image_api_call: boolean;
    no_image_generation: boolean;
    no_live_route_submission_or_customer_flow_integration: boolean;
  };
};

export type NovoraHandSketchInstructionValidationIssueCode =
  | "not_an_object"
  | "missing_required_section"
  | "invalid_instruction_version"
  | "invalid_design_spec_version"
  | "raw_brief_direct_prompt_not_forbidden"
  | "provider_prompt_marked_generated"
  | "missing_concept_preview_boundary"
  | "missing_status_separation"
  | "missing_human_review_boundary"
  | "missing_zodiac_mouse_rule"
  | "contradictory_zodiac_mouse_eye_rule";

export type NovoraHandSketchInstructionValidationIssue = {
  code: NovoraHandSketchInstructionValidationIssueCode;
  path: string;
  message: string;
};

export type NovoraHandSketchInstructionValidationResult = {
  ok: boolean;
  issues: NovoraHandSketchInstructionValidationIssue[];
};

const REQUIRED_TOP_LEVEL_SECTIONS = [
  "instruction_version",
  "design_spec_version",
  "public_reference",
  "language",
  "source_design_spec_summary",
  "prompt_usage_policy",
  "sheet_style",
  "brand_placement",
  "views",
  "jewelry_rendering_instructions",
  "stone_and_setting_instructions",
  "motif_instructions",
  "annotation_instructions",
  "dimension_and_scale_notes",
  "composition_instructions",
  "disclaimer_instructions",
  "safety_boundaries",
  "negative_constraints",
  "human_review_checklist",
  "generation_readiness",
  "internal_notes",
] as const;

const REQUIRED_RAW_BRIEF_POLICY_PHRASES = [
  "Raw customer natural language must not be used directly as the final image-generation prompt.",
  "Design Spec must precede Hand Sketch Instruction.",
  "Hand Sketch Instruction must precede any future provider-specific image prompt.",
  "This helper does not call GPT, OpenAI, image APIs, or generate images.",
] as const;

const HUMAN_REVIEW_CHECKLIST = [
  "structure logic",
  "view consistency",
  "setting/prong/bezel logic",
  "stone count and placement plausibility",
  "production feasibility",
  "customer request match",
  "unsafe claims",
  "brand placement",
  "disclaimer visibility",
  ZODIAC_MOUSE_EYE_GEMSTONE_RULE,
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function pushIssue(
  issues: NovoraHandSketchInstructionValidationIssue[],
  code: NovoraHandSketchInstructionValidationIssueCode,
  path: string,
  message: string,
) {
  issues.push({
    code,
    path,
    message,
  });
}

export function createNovoraHandSketchInstructionFromDesignSpec(
  designSpec: NovoraDesignSpec,
): NovoraHandSketchInstruction {
  const missingInformation = [
    ...designSpec.dimensions.unknown_or_to_confirm,
    ...designSpec.materials.unknown_or_to_confirm,
    ...designSpec.open_questions,
  ];

  return {
    instruction_version: NOVORA_HAND_SKETCH_INSTRUCTION_VERSION,
    design_spec_version: designSpec.spec_version,
    public_reference: designSpec.public_reference,
    language: designSpec.language,
    source_design_spec_summary: {
      piece_type: designSpec.piece_type,
      customer_intent_summary: designSpec.customer_intent_summary,
      design_direction: designSpec.design_direction.style_keywords,
      source_type: designSpec.source.source_type,
      mock_only: designSpec.source.mock_only,
      contains_real_customer_data: designSpec.source.contains_real_customer_data,
    },
    prompt_usage_policy: {
      raw_customer_language_must_not_be_final_prompt: true,
      design_spec_precedes_hand_sketch_instruction: true,
      hand_sketch_instruction_precedes_provider_prompt: true,
      helper_calls_gpt: false,
      helper_calls_openai: false,
      helper_calls_image_api: false,
      helper_generates_images: false,
      policy_text: [...REQUIRED_RAW_BRIEF_POLICY_PHRASES],
    },
    sheet_style: {
      style_version: NOVORA_SKETCH_SHEET_STYLE,
      warm_light_background: designSpec.sketch_requirements.warm_light_background,
      consistent_line_weight: designSpec.sketch_requirements.consistent_line_weight,
      clean_jewelry_hand_sketch_feel: true,
      main_view_plus_optional_detail_views:
        designSpec.sketch_requirements.main_view_plus_optional_detail_views,
      clear_annotations_and_callouts: designSpec.sketch_requirements.clear_annotations,
      subtle_text_only_novora_watermark_or_footer_label: true,
      concept_preview_label: "NOVORA concept preview",
      disclaimer_placement: designSpec.sketch_requirements.concept_preview_disclaimer_placement,
      no_cad_drawing_framing: true,
      no_quote_order_or_production_approval_framing:
        designSpec.sketch_requirements.no_cad_quote_or_production_approval_framing,
    },
    brand_placement: {
      novora_text_watermark_allowed: true,
      official_logo_asset_path_remains_separate_if_not_documented: true,
      logo_or_brand_mark_must_not_be_jewelry_structure:
        designSpec.sketch_requirements.logo_must_not_be_part_of_jewelry_structure,
      logo_or_brand_mark_must_not_cover_jewelry_annotations_or_view_labels: true,
      placement_instruction:
        designSpec.sketch_requirements.text_only_novora_branding_watermark_placement,
    },
    views: [
      {
        view_type: "main_hero_view",
        required: true,
        instruction: designSpec.jewelry_structure.view_requirements[0] ?? "main front jewelry view",
      },
      {
        view_type: "optional_side_profile_view",
        required: false,
        instruction: designSpec.jewelry_structure.view_requirements[1] ?? "optional side/profile view",
      },
      {
        view_type: "optional_top_or_detail_view",
        required: false,
        instruction: "optional top/detail view if it clarifies the jewelry structure",
      },
      {
        view_type: "stone_setting_detail_view_if_needed",
        required: true,
        instruction:
          designSpec.jewelry_structure.view_requirements[2] ??
          "stone or setting detail callout if stones are present",
      },
      {
        view_type: "view_consistency_required",
        required: true,
        instruction: "all views must describe the same jewelry construction",
      },
      {
        view_type: "no_contradictory_construction_between_views",
        required: true,
        instruction: "do not introduce contradictory stone placement, bail support, or setting logic",
      },
    ],
    jewelry_rendering_instructions: {
      piece_type: designSpec.piece_type,
      primary_form: designSpec.jewelry_structure.primary_form,
      construction_consistency: designSpec.jewelry_structure.construction_consistency_notes,
      setting_logic: designSpec.jewelry_structure.setting_logic,
      setting_treatments: designSpec.jewelry_structure.setting_planning,
      material_rendering_direction: [
        designSpec.materials.metal_preference,
        designSpec.materials.gold_color,
        designSpec.materials.enamel,
        designSpec.materials.lab_diamond_or_lab_colored_stone_preference,
      ],
      production_feasibility_reminders: designSpec.production_feasibility_notes,
      structure_risk_flags: designSpec.jewelry_structure.structure_risk_flags,
    },
    stone_and_setting_instructions: {
      center_stone: designSpec.stones.center_stone,
      side_stones: designSpec.stones.side_stones,
      repeated_stones: designSpec.stones.repeated_stones,
      stone_color_direction: designSpec.stones.stone_color_direction,
      stone_shape_direction: designSpec.stones.stone_shape,
      stone_size_relationship: designSpec.stones.stone_size_relationship,
      setting_logic: designSpec.jewelry_structure.setting_logic,
      special_stone_rules: Array.from(
        new Set([...designSpec.stones.special_stone_rules, ZODIAC_MOUSE_EYE_GEMSTONE_RULE]),
      ),
    },
    motif_instructions: {
      motif_types: designSpec.motifs.motif_types,
      motif_planning: designSpec.motifs.motif_planning,
      motif_placement: designSpec.motifs.motif_placement,
      motif_to_structure_relationship: designSpec.motifs.motif_to_structure_relationship,
      avoid_impossible_motif_construction: true,
      motif_must_not_conflict_with_setting_or_wearability: true,
    },
    annotation_instructions: {
      callout_style: "short callouts only",
      labels: [
        {
          label: "Concept preview",
          target: "sheet label",
          instruction: "label this as a concept preview without approval wording",
        },
        {
          label: "Material direction",
          target: "metal and finish",
          instruction: "label material direction without implying exact final specs",
        },
        {
          label: "Stone direction",
          target: "stones and settings",
          instruction: "label stone color, shape, and setting direction where visible",
        },
        {
          label: "Motif",
          target: "decorative motif",
          instruction: "label important motif elements without crowding the jewelry",
        },
      ],
      avoid_pricing_cad_production_or_approval_claims: true,
    },
    dimension_and_scale_notes: {
      approximate_size: designSpec.dimensions.approximate_size,
      ring_size_if_applicable: designSpec.dimensions.ring_size_if_applicable,
      pendant_scale_if_applicable: designSpec.dimensions.pendant_scale_if_applicable,
      unknown_or_to_confirm: designSpec.dimensions.unknown_or_to_confirm,
    },
    composition_instructions: {
      layout: "main view with optional detail views and clean callout spacing",
      main_view_priority: true,
      detail_views_optional: true,
      keep_disclaimer_and_branding_outside_jewelry: true,
    },
    disclaimer_instructions: {
      required_label: "Concept preview only - not CAD, quote, order, payment, or production approval.",
      concept_preview_only: true,
      not_cad: true,
      not_quote: true,
      not_order_approval: true,
      not_payment_approval: true,
      not_production_approval: true,
    },
    safety_boundaries: NOVORA_HAND_SKETCH_SAFETY_BOUNDARIES,
    negative_constraints: [
      "do not make NOVORA logo part of the jewelry design",
      "do not use raw customer brief as final image prompt",
      "do not show CAD or technical manufacturing drawing unless explicitly future-approved",
      "do not imply exact gemstone specs if unknown",
      "do not imply price, production readiness, or order approval",
      "avoid structurally impossible jewelry construction",
    ],
    human_review_checklist: [...HUMAN_REVIEW_CHECKLIST],
    generation_readiness: {
      ready_for_future_provider_prompt: false,
      provider_prompt_not_generated: true,
      missing_information: missingInformation,
      human_review_focus: designSpec.internal_generation_notes.human_review_focus,
    },
    internal_notes: {
      fixture_only: designSpec.source.source_type === "fake_mock_fixture",
      no_real_customer_data: !designSpec.source.contains_real_customer_data,
      no_database_read: true,
      no_database_write: true,
      no_gpt_openai_or_image_api_call: true,
      no_image_generation: true,
      no_live_route_submission_or_customer_flow_integration: true,
    },
  };
}

export function createMockNovoraHandSketchInstruction(
  options: {
    language?: NovoraDesignSpecLanguage;
    publicReference?: string;
  } = {},
): NovoraHandSketchInstruction {
  const designSpec =
    options.language || options.publicReference
      ? createMockNovoraDesignSpec(options)
      : MOCK_NOVORA_DESIGN_SPEC;

  return createNovoraHandSketchInstructionFromDesignSpec(designSpec);
}

export const MOCK_NOVORA_HAND_SKETCH_INSTRUCTION = createMockNovoraHandSketchInstruction();

export function validateNovoraHandSketchInstruction(
  value: unknown,
): NovoraHandSketchInstructionValidationResult {
  const issues: NovoraHandSketchInstructionValidationIssue[] = [];

  if (!isRecord(value)) {
    return {
      ok: false,
      issues: [
        {
          code: "not_an_object",
          path: "$",
          message: "NOVORA Hand Sketch Instruction must be an object.",
        },
      ],
    };
  }

  REQUIRED_TOP_LEVEL_SECTIONS.forEach((section) => {
    if (!(section in value)) {
      pushIssue(
        issues,
        "missing_required_section",
        `$.${section}`,
        `Missing required NOVORA Hand Sketch Instruction section: ${section}.`,
      );
    }
  });

  if (value.instruction_version !== NOVORA_HAND_SKETCH_INSTRUCTION_VERSION) {
    pushIssue(
      issues,
      "invalid_instruction_version",
      "$.instruction_version",
      "NOVORA Hand Sketch Instruction version must match the exported stable version.",
    );
  }

  if (value.design_spec_version !== NOVORA_DESIGN_SPEC_VERSION) {
    pushIssue(
      issues,
      "invalid_design_spec_version",
      "$.design_spec_version",
      "NOVORA Hand Sketch Instruction must carry through the Design Spec version.",
    );
  }

  const promptUsagePolicy = readRecord(value.prompt_usage_policy);
  const policyText = readStringArray(promptUsagePolicy.policy_text);

  if (
    promptUsagePolicy.raw_customer_language_must_not_be_final_prompt !== true ||
    promptUsagePolicy.design_spec_precedes_hand_sketch_instruction !== true ||
    promptUsagePolicy.hand_sketch_instruction_precedes_provider_prompt !== true ||
    !REQUIRED_RAW_BRIEF_POLICY_PHRASES.every((phrase) => policyText.includes(phrase))
  ) {
    pushIssue(
      issues,
      "raw_brief_direct_prompt_not_forbidden",
      "$.prompt_usage_policy",
      "Raw customer natural language must be forbidden as a direct final image-generation prompt.",
    );
  }

  const generationReadiness = readRecord(value.generation_readiness);

  if (
    generationReadiness.ready_for_future_provider_prompt !== false ||
    generationReadiness.provider_prompt_not_generated !== true
  ) {
    pushIssue(
      issues,
      "provider_prompt_marked_generated",
      "$.generation_readiness",
      "Hand Sketch Instruction must not mark a future provider prompt as generated.",
    );
  }

  const safetyBoundaries = readRecord(value.safety_boundaries);
  const disclaimerInstructions = readRecord(value.disclaimer_instructions);
  const requiredTrueSafetyKeys = [
    "concept_preview_only",
    "not_cad",
    "not_quote",
    "not_order_approval",
    "not_payment_approval",
    "not_production_approval",
  ];

  if (
    !requiredTrueSafetyKeys.every(
      (key) => safetyBoundaries[key] === true && disclaimerInstructions[key] === true,
    )
  ) {
    pushIssue(
      issues,
      "missing_concept_preview_boundary",
      "$.safety_boundaries",
      "NOVORA Hand Sketch Instruction must preserve concept-preview-only safety boundaries.",
    );
  }

  if (
    safetyBoundaries.first_preview_ready !== "first_preview_ready" ||
    safetyBoundaries.approved_for_customer !== "approved_for_customer" ||
    safetyBoundaries.first_preview_ready_is_separate_from_approved_for_customer !== true
  ) {
    pushIssue(
      issues,
      "missing_status_separation",
      "$.safety_boundaries",
      "first_preview_ready must remain separate from approved_for_customer.",
    );
  }

  if (
    safetyBoundaries.human_review_required_for_customer_safe_delivery !== true ||
    safetyBoundaries.human_review_required_for_production_decisions !== true ||
    safetyBoundaries.human_review_requirement !==
      "Human review remains required for customer-safe delivery and production decisions."
  ) {
    pushIssue(
      issues,
      "missing_human_review_boundary",
      "$.safety_boundaries",
      "Human review must remain required for customer-safe delivery and production decisions.",
    );
  }

  const stoneInstructions = readRecord(value.stone_and_setting_instructions);
  const specialStoneRules = readStringArray(stoneInstructions.special_stone_rules);
  const humanReviewChecklist = readStringArray(value.human_review_checklist);

  if (
    !specialStoneRules.includes(ZODIAC_MOUSE_EYE_GEMSTONE_RULE) ||
    !humanReviewChecklist.includes(ZODIAC_MOUSE_EYE_GEMSTONE_RULE)
  ) {
    pushIssue(
      issues,
      "missing_zodiac_mouse_rule",
      "$.stone_and_setting_instructions.special_stone_rules",
      "NOVORA Hand Sketch Instruction must include the locked zodiac mouse eye gemstone rule.",
    );
  }

  if (specialStoneRules.some(isContradictoryZodiacMouseEyeRule)) {
    pushIssue(
      issues,
      "contradictory_zodiac_mouse_eye_rule",
      "$.stone_and_setting_instructions.special_stone_rules",
      "NOVORA Hand Sketch Instruction must not automatically or by default substitute a zodiac mouse eye gemstone.",
    );
  }

  if (humanReviewChecklist.some(isContradictoryZodiacMouseEyeRule)) {
    pushIssue(
      issues,
      "contradictory_zodiac_mouse_eye_rule",
      "$.human_review_checklist",
      "NOVORA Hand Sketch Instruction human review checklist must not automatically or by default substitute a zodiac mouse eye gemstone.",
    );
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}
