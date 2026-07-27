export const NOVORA_DESIGN_SPEC_VERSION = "novora_design_spec_v1";

export const NOVORA_DESIGN_SPEC_LANGUAGES = ["en", "zh-Hant"] as const;

export const NOVORA_DESIGN_SPEC_PIECE_TYPES = [
  "ring",
  "pendant_necklace",
  "bracelet_bangle",
  "earrings",
  "other_custom",
] as const;

export const NOVORA_DESIGN_SPEC_SETTING_TYPES = [
  "prong",
  "bezel",
  "pave",
  "channel",
  "other",
  "to_confirm",
] as const;

export const NOVORA_DESIGN_SPEC_MOTIF_TYPES = [
  "animal",
  "zodiac",
  "cloud",
  "water",
  "floral",
  "mechanical",
  "gothic",
  "other",
] as const;

export const NOVORA_DESIGN_SPEC_STATUS_BOUNDARIES = [
  "first_preview_ready",
  "approved_for_customer",
] as const;

export const ZODIAC_MOUSE_EYE_GEMSTONE_RULE =
  "For zodiac mouse jewelry/sculpture designs, do not use ruby or red gemstones for mouse eyes. Preserve an explicitly requested non-red eye gemstone. If no eye gemstone is specified, keep it unknown and do not select a substitute; green, black, jadeite/emerald tones, or dark neutral stones are allowed only when explicitly requested or later approved by a human reviewer.";

const ZODIAC_MOUSE_EYE_CONTEXT_PATTERN =
  /\bmouse\b[\s\S]{0,220}\beyes?\b|\beyes?\b[\s\S]{0,220}\bmouse\b/i;

const SAFE_MOUSE_EYE_CHOICE_CONDITION_PATTERN =
  /\bonly\s+(?:when|if)\s+explicitly requested\b|\bonly\s+after\s+(?:a\s+)?human(?:\s+reviewer)?\s+approval\b|\bonly\s+(?:when|if)\s+(?:later\s+)?approved\s+by\s+(?:a\s+)?human reviewer\b/i;

const NEGATED_MOUSE_EYE_SUBSTITUTION_PATTERNS = [
  /\b(?:do not|don't|never|must not|should not|cannot|can't)\s+(?:automatically\s+|auto\s+)?(?:select|choose|assign|use|replace|substitute|default)(?:\s+to)?(?:\s+(?:a|an|the)\s+substitute)?\b/gi,
  /\bno\s+substitute\s+(?:should|must|may|can)\s+be\s+(?:selected|chosen|assigned|used)\b/gi,
  /\b(?:no|without)\s+(?:automatic(?:ally)?\s+|default\s+)?substitution\b/gi,
] as const;

const DETERMINISTIC_MOUSE_EYE_SUBSTITUTION_PATTERNS = [
  /\b(?:automatically|auto)\s*(?:select|choose|assign|use|replace|substitute)\b/i,
  /\bdefault(?:s|ed|ing)?\s+to\b|\bby\s+default\b/i,
  /\b(?:choose|select|assign|use)\s+(?:a|an|the)?\s*substitute\b/i,
  /\bsubstitut(?:e|es|ed|ing)\b/i,
  /\b(?:if|when)\b[^.;]{0,160}\b(?:none|no\b|unknown|unspecified|not specified|missing)\b[^.;]{0,160}\b(?:select|choose|assign|use|replace|substitute|default)\b/i,
  /\b(?:select|choose|assign|use|replace|substitute|default)\b[^.;]{0,160}\b(?:when|if)\b[^.;]{0,160}\b(?:none|no\b|unknown|unspecified|not specified|missing)\b/i,
  /\b(?:select|choose|assign|use|replace|substitute)\b[^.;]{0,180}\beyes?\b[^.;]{0,80}\binstead\b/i,
] as const;

export function isContradictoryZodiacMouseEyeRule(rule: string): boolean {
  if (
    rule === ZODIAC_MOUSE_EYE_GEMSTONE_RULE ||
    !ZODIAC_MOUSE_EYE_CONTEXT_PATTERN.test(rule)
  ) {
    return false;
  }

  return rule.split(/[.;]/).some((clause) => {
    if (SAFE_MOUSE_EYE_CHOICE_CONDITION_PATTERN.test(clause)) {
      return false;
    }

    const affirmativeClause = NEGATED_MOUSE_EYE_SUBSTITUTION_PATTERNS.reduce(
      (currentClause, pattern) => currentClause.replace(pattern, ""),
      clause,
    );

    return DETERMINISTIC_MOUSE_EYE_SUBSTITUTION_PATTERNS.some((pattern) =>
      pattern.test(affirmativeClause),
    );
  });
}

export type NovoraDesignSpecLanguage = (typeof NOVORA_DESIGN_SPEC_LANGUAGES)[number];
export type NovoraDesignSpecPieceType = (typeof NOVORA_DESIGN_SPEC_PIECE_TYPES)[number];
export type NovoraDesignSpecSettingType = (typeof NOVORA_DESIGN_SPEC_SETTING_TYPES)[number];
export type NovoraDesignSpecMotifType = (typeof NOVORA_DESIGN_SPEC_MOTIF_TYPES)[number];
export type NovoraDesignSpecStatusBoundary = (typeof NOVORA_DESIGN_SPEC_STATUS_BOUNDARIES)[number];

export type NovoraDesignSpecSource = {
  source_type: "fake_mock_fixture" | "concept_brief";
  source_label: string;
  raw_brief_usage_policy: string;
  mock_only: boolean;
  contains_real_customer_data: boolean;
};

export type NovoraDesignDirection = {
  style_keywords: string[];
  mood: string;
  target_customer_note: string;
  symmetry_preference: string;
  unified_novora_sketch_style_note: string;
};

export type NovoraJewelryStructure = {
  primary_form: string;
  view_requirements: string[];
  setting_logic: string;
  setting_planning: NovoraDesignSpecSettingType[];
  construction_consistency_notes: string[];
  structure_risk_flags: string[];
};

export type NovoraDesignSpecMaterials = {
  metal_preference: string;
  gold_color: string;
  enamel: string;
  lab_diamond_or_lab_colored_stone_preference: string;
  unknown_or_to_confirm: string[];
};

export type NovoraDesignSpecStones = {
  center_stone: string;
  side_stones: string;
  repeated_stones: string;
  stone_color_direction: string;
  stone_shape: string;
  stone_size_relationship: string;
  special_stone_rules: string[];
};

export type NovoraDesignSpecMotifs = {
  motif_types: NovoraDesignSpecMotifType[];
  motif_planning: string[];
  motif_placement: string;
  motif_to_structure_relationship: string;
};

export type NovoraDesignSpecDimensions = {
  approximate_size: string;
  ring_size_if_applicable: string;
  pendant_scale_if_applicable: string;
  unknown_or_to_confirm: string[];
};

export type NovoraDesignSpecSketchRequirements = {
  unified_novora_sketch_sheet_style: string;
  text_only_novora_branding_watermark_placement: string;
  logo_must_not_be_part_of_jewelry_structure: boolean;
  warm_light_background: boolean;
  consistent_line_weight: boolean;
  clear_annotations: boolean;
  main_view_plus_optional_detail_views: boolean;
  concept_preview_disclaimer_placement: string;
  no_cad_quote_or_production_approval_framing: boolean;
};

export type NovoraDesignSpecSafetyBoundaries = {
  concept_preview_only: boolean;
  not_cad: boolean;
  not_quote: boolean;
  not_order_approval: boolean;
  not_payment_approval: boolean;
  not_production_approval: boolean;
  first_preview_ready: "first_preview_ready";
  approved_for_customer: "approved_for_customer";
  first_preview_ready_is_separate_from_approved_for_customer: boolean;
};

export type NovoraDesignSpecInternalGenerationNotes = {
  prompt_readiness: string;
  missing_information: string[];
  human_review_focus: string[];
  structure_craft_production_feasibility_checks: string[];
  status_boundary_reminders: string[];
  provider_boundary: {
    calls_gpt: false;
    calls_image_api: false;
    generates_image: false;
    reads_database: false;
  };
};

export type NovoraDesignSpec = {
  spec_version: typeof NOVORA_DESIGN_SPEC_VERSION;
  source: NovoraDesignSpecSource;
  public_reference: string;
  language: NovoraDesignSpecLanguage;
  piece_type: NovoraDesignSpecPieceType;
  customer_intent_summary: string;
  design_direction: NovoraDesignDirection;
  jewelry_structure: NovoraJewelryStructure;
  materials: NovoraDesignSpecMaterials;
  stones: NovoraDesignSpecStones;
  motifs: NovoraDesignSpecMotifs;
  dimensions: NovoraDesignSpecDimensions;
  production_feasibility_notes: string[];
  sketch_requirements: NovoraDesignSpecSketchRequirements;
  safety_boundaries: NovoraDesignSpecSafetyBoundaries;
  open_questions: string[];
  internal_generation_notes: NovoraDesignSpecInternalGenerationNotes;
};

export type NovoraDesignSpecValidationIssueCode =
  | "not_an_object"
  | "missing_required_section"
  | "invalid_spec_version"
  | "invalid_language"
  | "invalid_piece_type"
  | "raw_brief_direct_prompt_not_forbidden"
  | "missing_concept_preview_boundary"
  | "missing_status_separation"
  | "missing_zodiac_mouse_rule"
  | "contradictory_zodiac_mouse_eye_rule";

export type NovoraDesignSpecValidationIssue = {
  code: NovoraDesignSpecValidationIssueCode;
  path: string;
  message: string;
};

export type NovoraDesignSpecValidationResult = {
  ok: boolean;
  issues: NovoraDesignSpecValidationIssue[];
};

const REQUIRED_TOP_LEVEL_SECTIONS = [
  "spec_version",
  "source",
  "public_reference",
  "language",
  "piece_type",
  "customer_intent_summary",
  "design_direction",
  "jewelry_structure",
  "materials",
  "stones",
  "motifs",
  "dimensions",
  "production_feasibility_notes",
  "sketch_requirements",
  "safety_boundaries",
  "open_questions",
  "internal_generation_notes",
] as const;

const REQUIRED_RAW_BRIEF_POLICY_PHRASES = [
  "must not be used directly",
  "final image-generation prompt",
  "Design Spec",
  "Hand Sketch Instruction",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function pushIssue(
  issues: NovoraDesignSpecValidationIssue[],
  code: NovoraDesignSpecValidationIssueCode,
  path: string,
  message: string,
) {
  issues.push({
    code,
    path,
    message,
  });
}

export function createMockNovoraDesignSpec(options: {
  language?: NovoraDesignSpecLanguage;
  publicReference?: string;
} = {}): NovoraDesignSpec {
  const language = options.language ?? "en";

  return {
    spec_version: NOVORA_DESIGN_SPEC_VERSION,
    source: {
      source_type: "fake_mock_fixture",
      source_label: "Agent 61G fake Design Spec fixture",
      raw_brief_usage_policy:
        "Raw customer natural language must not be used directly as a final image-generation prompt. It must first be converted into structured Design Spec and Hand Sketch Instruction.",
      mock_only: true,
      contains_real_customer_data: false,
    },
    public_reference: options.publicReference ?? "NOVORA-CB-MOCK-001",
    language,
    piece_type: "pendant_necklace",
    customer_intent_summary:
      language === "zh-Hant"
        ? "Mock-only zodiac mouse pendant concept with a soft heirloom mood and green eye stone direction."
        : "Mock-only zodiac mouse pendant concept with a soft heirloom mood and green eye stone direction.",
    design_direction: {
      style_keywords: ["warm heirloom", "soft sculptural", "clean luxury sketch"],
      mood: "gentle, personal, and refined",
      target_customer_note: "Synthetic fixture customer for local helper tests only.",
      symmetry_preference: "mostly symmetrical pendant body with a small natural tail gesture",
      unified_novora_sketch_style_note:
        "Use NOVORA first-preview sketch sheet style: warm light paper, consistent line weight, clear annotations, and a subtle text-only NOVORA watermark.",
    },
    jewelry_structure: {
      primary_form: "zodiac mouse pendant with integrated bail and rounded body volume",
      view_requirements: ["main front view", "small side thickness view", "eye stone detail callout"],
      setting_logic: "small bezel or flush setting for eye stones; keep stones supported by metal",
      setting_planning: ["bezel", "other", "to_confirm"],
      construction_consistency_notes: [
        "Bail must connect to pendant body and remain visually separate from the mouse ears.",
        "Eye stone placement must match between main and detail views.",
        "Tail curve must not create an unsupported snag-prone wire.",
      ],
      structure_risk_flags: ["tiny eye stone placement requires human review", "bail strength to confirm later"],
    },
    materials: {
      metal_preference: "solid gold direction to confirm later",
      gold_color: "warm yellow gold direction",
      enamel: "optional cream enamel accent to confirm",
      lab_diamond_or_lab_colored_stone_preference: "lab colored stones acceptable for small accents",
      unknown_or_to_confirm: ["exact alloy", "final finish", "whether enamel is used"],
    },
    stones: {
      center_stone: "none",
      side_stones: "small eye stones only",
      repeated_stones: "none planned",
      stone_color_direction: "green, black, jadeite or emerald tone for mouse eyes",
      stone_shape: "tiny round accent stones",
      stone_size_relationship: "eye stones must stay visually secondary to the mouse form",
      special_stone_rules: [ZODIAC_MOUSE_EYE_GEMSTONE_RULE],
    },
    motifs: {
      motif_types: ["animal", "zodiac"],
      motif_planning: ["zodiac mouse", "soft rounded body", "subtle tail gesture"],
      motif_placement: "mouse motif forms the pendant body; eye stones sit within the motif",
      motif_to_structure_relationship:
        "Motif must be structurally wearable as jewelry, not a loose sculpture without bail support.",
    },
    dimensions: {
      approximate_size: "small pendant scale, exact millimeters unknown",
      ring_size_if_applicable: "not applicable",
      pendant_scale_if_applicable: "everyday pendant scale to confirm with customer",
      unknown_or_to_confirm: ["exact pendant height", "exact chain relationship", "final stone size"],
    },
    production_feasibility_notes: [
      "Concept preview only; production feasibility must be checked later by a human.",
      "Tiny accent stone placement and bail support need later jewelry construction review.",
    ],
    sketch_requirements: {
      unified_novora_sketch_sheet_style: "novora_first_preview_sketch_style_v1",
      text_only_novora_branding_watermark_placement: "subtle lower-right sheet watermark",
      logo_must_not_be_part_of_jewelry_structure: true,
      warm_light_background: true,
      consistent_line_weight: true,
      clear_annotations: true,
      main_view_plus_optional_detail_views: true,
      concept_preview_disclaimer_placement: "visible footer or side note near sketch sheet",
      no_cad_quote_or_production_approval_framing: true,
    },
    safety_boundaries: {
      concept_preview_only: true,
      not_cad: true,
      not_quote: true,
      not_order_approval: true,
      not_payment_approval: true,
      not_production_approval: true,
      first_preview_ready: "first_preview_ready",
      approved_for_customer: "approved_for_customer",
      first_preview_ready_is_separate_from_approved_for_customer: true,
    },
    open_questions: [
      "Confirm exact pendant scale.",
      "Confirm final metal alloy and finish.",
      "Confirm whether cream enamel is desired.",
      "Confirm chain relationship in a later paid CAD or manual review step.",
    ],
    internal_generation_notes: {
      prompt_readiness: "mock_fixture_not_provider_ready",
      missing_information: ["exact dimensions", "exact alloy", "final chain relationship"],
      human_review_focus: [
        "structure logic",
        "jewelry construction",
        "production feasibility",
        "view consistency",
        "setting logic",
        "proportion",
        "customer request match",
      ],
      structure_craft_production_feasibility_checks: [
        "no unsupported floating stones",
        "bail support is visible",
        "eye stone color follows locked zodiac mouse rule",
        "branding is a sheet watermark only",
      ],
      status_boundary_reminders: [
        "first_preview_ready is separate from approved_for_customer",
        "concept preview is not CAD, quote, order, payment, or production approval",
      ],
      provider_boundary: {
        calls_gpt: false,
        calls_image_api: false,
        generates_image: false,
        reads_database: false,
      },
    },
  };
}

export const MOCK_NOVORA_DESIGN_SPEC = createMockNovoraDesignSpec();

export function validateNovoraDesignSpec(value: unknown): NovoraDesignSpecValidationResult {
  const issues: NovoraDesignSpecValidationIssue[] = [];

  if (!isRecord(value)) {
    return {
      ok: false,
      issues: [
        {
          code: "not_an_object",
          path: "$",
          message: "NOVORA Design Spec must be an object.",
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
        `Missing required NOVORA Design Spec section: ${section}.`,
      );
    }
  });

  if (value.spec_version !== NOVORA_DESIGN_SPEC_VERSION) {
    pushIssue(
      issues,
      "invalid_spec_version",
      "$.spec_version",
      "NOVORA Design Spec version must match the exported stable version.",
    );
  }

  if (!(NOVORA_DESIGN_SPEC_LANGUAGES as readonly unknown[]).includes(value.language)) {
    pushIssue(issues, "invalid_language", "$.language", "NOVORA Design Spec language is not supported.");
  }

  if (!(NOVORA_DESIGN_SPEC_PIECE_TYPES as readonly unknown[]).includes(value.piece_type)) {
    pushIssue(issues, "invalid_piece_type", "$.piece_type", "NOVORA Design Spec piece type is not supported.");
  }

  const source = readRecord(value.source);
  const rawBriefPolicy = readString(source.raw_brief_usage_policy);

  if (!REQUIRED_RAW_BRIEF_POLICY_PHRASES.every((phrase) => rawBriefPolicy.includes(phrase))) {
    pushIssue(
      issues,
      "raw_brief_direct_prompt_not_forbidden",
      "$.source.raw_brief_usage_policy",
      "Raw customer natural language must be forbidden as a direct final image-generation prompt.",
    );
  }

  const safetyBoundaries = readRecord(value.safety_boundaries);
  const requiredTrueSafetyKeys = [
    "concept_preview_only",
    "not_cad",
    "not_quote",
    "not_order_approval",
    "not_payment_approval",
    "not_production_approval",
  ];

  if (!requiredTrueSafetyKeys.every((key) => safetyBoundaries[key] === true)) {
    pushIssue(
      issues,
      "missing_concept_preview_boundary",
      "$.safety_boundaries",
      "NOVORA Design Spec must preserve concept-preview-only safety boundaries.",
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

  const stones = readRecord(value.stones);
  const specialStoneRules = readStringArray(stones.special_stone_rules);

  if (!specialStoneRules.includes(ZODIAC_MOUSE_EYE_GEMSTONE_RULE)) {
    pushIssue(
      issues,
      "missing_zodiac_mouse_rule",
      "$.stones.special_stone_rules",
      "NOVORA Design Spec must include the locked zodiac mouse eye gemstone rule.",
    );
  }

  if (specialStoneRules.some(isContradictoryZodiacMouseEyeRule)) {
    pushIssue(
      issues,
      "contradictory_zodiac_mouse_eye_rule",
      "$.stones.special_stone_rules",
      "NOVORA Design Spec must not automatically or by default substitute a zodiac mouse eye gemstone.",
    );
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}
