import {
  MOCK_NOVORA_DESIGN_SPEC,
  NOVORA_DESIGN_SPEC_VERSION,
  type NovoraDesignSpec,
  ZODIAC_MOUSE_EYE_GEMSTONE_RULE,
} from "./design-spec";
import {
  createMockNovoraHandSketchInstruction,
  createNovoraHandSketchInstructionFromDesignSpec,
  MOCK_NOVORA_HAND_SKETCH_INSTRUCTION,
  NOVORA_HAND_SKETCH_INSTRUCTION_VERSION,
  NOVORA_HAND_SKETCH_SAFETY_BOUNDARIES,
  type NovoraHandSketchInstruction,
} from "./hand-sketch-instruction";

export const NOVORA_PREVIEW_GENERATION_MOCK_VERSION = "novora_preview_generation_mock_v1";

export const NOVORA_PREVIEW_LIFECYCLE_STATES = [
  "processing",
  "first_preview_ready",
  "generation_delayed",
  "generation_failed",
  "preview_unavailable",
  "feedback_submitted",
  "human_followup_needed",
] as const;

export const NOVORA_PREVIEW_OUTPUT_TYPES = [
  "css_placeholder",
  "instruction_summary",
  "mock_sketch_sheet_placeholder",
  "no_real_image",
] as const;

export const NOVORA_PREVIEW_STATUS_BOUNDARIES = {
  first_preview_ready: "first_preview_ready",
  approved_for_customer: "approved_for_customer",
  first_preview_ready_is_separate_from_approved_for_customer: true,
  approved_for_customer_is_human_review_customer_safe_delivery_status: true,
  approved_for_customer_is_not_first_preview_lifecycle_state: true,
  concept_preview_only: true,
  not_cad: true,
  not_quote: true,
  not_order_approval: true,
  not_payment_approval: true,
  not_production_approval: true,
  human_review_required_for_customer_safe_delivery: true,
  human_review_required_for_production_decisions: true,
} as const;

export type NovoraPreviewGenerationMockLifecycleState =
  (typeof NOVORA_PREVIEW_LIFECYCLE_STATES)[number];

export type NovoraPreviewGenerationMockOutputType =
  (typeof NOVORA_PREVIEW_OUTPUT_TYPES)[number];

export type NovoraPreviewGenerationMockOutput = {
  output_type: NovoraPreviewGenerationMockOutputType;
  mock_only: true;
  placeholder_label: string;
  sheet_style_version: NovoraHandSketchInstruction["sheet_style"]["style_version"];
  image_url: null;
  base64_image_data: null;
  provider_output_id: null;
  generated_at: null;
  provider_name: null;
  display_watermark_context: string;
  disclaimer_context: string;
};

export type NovoraPreviewGenerationMockResult = {
  mock_version: typeof NOVORA_PREVIEW_GENERATION_MOCK_VERSION;
  public_reference: string;
  lifecycle_state: NovoraPreviewGenerationMockLifecycleState;
  design_spec_version: typeof NOVORA_DESIGN_SPEC_VERSION;
  hand_sketch_instruction_version: typeof NOVORA_HAND_SKETCH_INSTRUCTION_VERSION;
  source_design_spec_summary: NovoraHandSketchInstruction["source_design_spec_summary"];
  source_hand_sketch_instruction_summary: {
    sheet_style_version: NovoraHandSketchInstruction["sheet_style"]["style_version"];
    concept_preview_label: string;
    disclaimer_required_label: string;
    text_only_watermark_or_footer_label: boolean;
    view_count: number;
    human_review_focus: string[];
    zodiac_mouse_eye_gemstone_rule: typeof ZODIAC_MOUSE_EYE_GEMSTONE_RULE;
  };
  mock_output: NovoraPreviewGenerationMockOutput;
  display_copy: {
    title: string;
    body: string;
    concept_preview_disclaimer: string;
    non_approval_disclaimer: string;
  };
  feedback_entry: {
    mock_only: true;
    submitting_enabled: false;
    database_write: false;
    disabled_reason: string;
    future_feedback_categories: string[];
  };
  status_boundaries: typeof NOVORA_PREVIEW_STATUS_BOUNDARIES;
  safety_boundaries: typeof NOVORA_HAND_SKETCH_SAFETY_BOUNDARIES;
  generation_flags: {
    design_spec_created: true;
    hand_sketch_instruction_created: true;
    provider_prompt_generated: false;
    image_generation_requested: false;
    image_generation_performed: false;
    provider_called: false;
    database_written: false;
    customer_safe_delivery_approved: false;
    production_approval_granted: false;
  };
  human_review: {
    required_for_customer_safe_delivery: true;
    required_for_production_decisions: true;
    review_focus: string[];
  };
  internal_notes: {
    raw_customer_brief_is_not_used_directly_as_final_image_generation_prompt: true;
    design_spec_precedes_hand_sketch_instruction: true;
    hand_sketch_instruction_precedes_future_provider_specific_image_prompt: true;
    helper_calls_gpt_openai_or_image_api: false;
    helper_generates_images: false;
    helper_reads_supabase: false;
    helper_writes_supabase: false;
    helper_wires_live_route_submission_or_customer_flow: false;
    note_text: string[];
  };
  validation_warnings: string[];
};

export type NovoraPreviewGenerationMockValidationIssueCode =
  | "not_an_object"
  | "missing_required_section"
  | "invalid_mock_version"
  | "invalid_lifecycle_state"
  | "missing_status_separation"
  | "approval_boundary_broken"
  | "provider_or_image_generation_flag_enabled"
  | "real_image_or_provider_output_present"
  | "feedback_marked_submitting"
  | "missing_human_review_boundary"
  | "missing_zodiac_mouse_rule";

export type NovoraPreviewGenerationMockValidationIssue = {
  code: NovoraPreviewGenerationMockValidationIssueCode;
  path: string;
  message: string;
};

export type NovoraPreviewGenerationMockValidationResult = {
  ok: boolean;
  issues: NovoraPreviewGenerationMockValidationIssue[];
};

const REQUIRED_TOP_LEVEL_SECTIONS = [
  "mock_version",
  "public_reference",
  "lifecycle_state",
  "design_spec_version",
  "hand_sketch_instruction_version",
  "source_design_spec_summary",
  "source_hand_sketch_instruction_summary",
  "mock_output",
  "display_copy",
  "feedback_entry",
  "status_boundaries",
  "safety_boundaries",
  "generation_flags",
  "human_review",
  "internal_notes",
  "validation_warnings",
] as const;

const HUMAN_REVIEW_FOCUS = [
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
  issues: NovoraPreviewGenerationMockValidationIssue[],
  code: NovoraPreviewGenerationMockValidationIssueCode,
  path: string,
  message: string,
) {
  issues.push({
    code,
    path,
    message,
  });
}

export function createNovoraPreviewGenerationMockFromHandSketchInstruction(
  handSketchInstruction: NovoraHandSketchInstruction,
  options: {
    lifecycleState?: NovoraPreviewGenerationMockLifecycleState;
  } = {},
): NovoraPreviewGenerationMockResult {
  const lifecycleState = options.lifecycleState ?? "first_preview_ready";

  return {
    mock_version: NOVORA_PREVIEW_GENERATION_MOCK_VERSION,
    public_reference: handSketchInstruction.public_reference,
    lifecycle_state: lifecycleState,
    design_spec_version: handSketchInstruction.design_spec_version,
    hand_sketch_instruction_version: handSketchInstruction.instruction_version,
    source_design_spec_summary: handSketchInstruction.source_design_spec_summary,
    source_hand_sketch_instruction_summary: {
      sheet_style_version: handSketchInstruction.sheet_style.style_version,
      concept_preview_label: handSketchInstruction.sheet_style.concept_preview_label,
      disclaimer_required_label: handSketchInstruction.disclaimer_instructions.required_label,
      text_only_watermark_or_footer_label:
        handSketchInstruction.sheet_style.subtle_text_only_novora_watermark_or_footer_label,
      view_count: handSketchInstruction.views.length,
      human_review_focus: handSketchInstruction.generation_readiness.human_review_focus,
      zodiac_mouse_eye_gemstone_rule: ZODIAC_MOUSE_EYE_GEMSTONE_RULE,
    },
    mock_output: {
      output_type: "mock_sketch_sheet_placeholder",
      mock_only: true,
      placeholder_label: "Mock NOVORA concept preview placeholder",
      sheet_style_version: handSketchInstruction.sheet_style.style_version,
      image_url: null,
      base64_image_data: null,
      provider_output_id: null,
      generated_at: null,
      provider_name: null,
      display_watermark_context:
        "Text-only NOVORA sketch sheet watermark/footer context from the Hand Sketch Instruction.",
      disclaimer_context:
        "Concept preview only - not CAD, quote, order, payment, or production approval.",
    },
    display_copy: {
      title: "Mock first concept preview",
      body:
        "This is a local mock bridge result for a NOVORA concept preview placeholder. No image has been generated.",
      concept_preview_disclaimer:
        "Concept preview only - this placeholder supports early design direction and feedback.",
      non_approval_disclaimer:
        "This is not CAD, not a quote, not order approval, not payment approval, and not production approval.",
    },
    feedback_entry: {
      mock_only: true,
      submitting_enabled: false,
      database_write: false,
      disabled_reason:
        "Feedback categories are present for future planning only; this mock helper does not submit or persist feedback.",
      future_feedback_categories: [
        "like_direction",
        "request_revision",
        "clarify_details",
        "report_mismatch",
        "request_human_followup",
      ],
    },
    status_boundaries: NOVORA_PREVIEW_STATUS_BOUNDARIES,
    safety_boundaries: NOVORA_HAND_SKETCH_SAFETY_BOUNDARIES,
    generation_flags: {
      design_spec_created: true,
      hand_sketch_instruction_created: true,
      provider_prompt_generated: false,
      image_generation_requested: false,
      image_generation_performed: false,
      provider_called: false,
      database_written: false,
      customer_safe_delivery_approved: false,
      production_approval_granted: false,
    },
    human_review: {
      required_for_customer_safe_delivery: true,
      required_for_production_decisions: true,
      review_focus: [...HUMAN_REVIEW_FOCUS],
    },
    internal_notes: {
      raw_customer_brief_is_not_used_directly_as_final_image_generation_prompt: true,
      design_spec_precedes_hand_sketch_instruction: true,
      hand_sketch_instruction_precedes_future_provider_specific_image_prompt: true,
      helper_calls_gpt_openai_or_image_api: false,
      helper_generates_images: false,
      helper_reads_supabase: false,
      helper_writes_supabase: false,
      helper_wires_live_route_submission_or_customer_flow: false,
      note_text: [
        "Raw customer brief is not used directly as final image-generation prompt.",
        "Design Spec precedes Hand Sketch Instruction.",
        "Hand Sketch Instruction precedes any future provider-specific image prompt.",
        "This helper does not call GPT, OpenAI, or image APIs.",
        "This helper does not generate images.",
        "This helper does not read or write Supabase.",
      ],
    },
    validation_warnings: [],
  };
}

export function createNovoraPreviewGenerationMockFromDesignSpec(
  designSpec: NovoraDesignSpec,
  options: {
    lifecycleState?: NovoraPreviewGenerationMockLifecycleState;
  } = {},
): NovoraPreviewGenerationMockResult {
  return createNovoraPreviewGenerationMockFromHandSketchInstruction(
    createNovoraHandSketchInstructionFromDesignSpec(designSpec),
    options,
  );
}

export function createMockNovoraPreviewGenerationResult(
  options: {
    lifecycleState?: NovoraPreviewGenerationMockLifecycleState;
    publicReference?: string;
  } = {},
): NovoraPreviewGenerationMockResult {
  const handSketchInstruction = options.publicReference
    ? createMockNovoraHandSketchInstruction({ publicReference: options.publicReference })
    : MOCK_NOVORA_HAND_SKETCH_INSTRUCTION;

  return createNovoraPreviewGenerationMockFromHandSketchInstruction(handSketchInstruction, {
    lifecycleState: options.lifecycleState,
  });
}

export const MOCK_NOVORA_PREVIEW_GENERATION_RESULT = createNovoraPreviewGenerationMockFromDesignSpec(
  MOCK_NOVORA_DESIGN_SPEC,
);

export function validateNovoraPreviewGenerationMockResult(
  value: unknown,
): NovoraPreviewGenerationMockValidationResult {
  const issues: NovoraPreviewGenerationMockValidationIssue[] = [];

  if (!isRecord(value)) {
    return {
      ok: false,
      issues: [
        {
          code: "not_an_object",
          path: "$",
          message: "NOVORA Preview Generation Mock Result must be an object.",
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
        `Missing required NOVORA Preview Generation Mock Result section: ${section}.`,
      );
    }
  });

  if (value.mock_version !== NOVORA_PREVIEW_GENERATION_MOCK_VERSION) {
    pushIssue(
      issues,
      "invalid_mock_version",
      "$.mock_version",
      "NOVORA Preview Generation Mock Result version must match the exported stable version.",
    );
  }

  if (!(NOVORA_PREVIEW_LIFECYCLE_STATES as readonly unknown[]).includes(value.lifecycle_state)) {
    pushIssue(
      issues,
      "invalid_lifecycle_state",
      "$.lifecycle_state",
      "NOVORA Preview Generation Mock Result lifecycle state is not supported.",
    );
  }

  const statusBoundaries = readRecord(value.status_boundaries);

  if (
    statusBoundaries.first_preview_ready !== "first_preview_ready" ||
    statusBoundaries.approved_for_customer !== "approved_for_customer" ||
    statusBoundaries.first_preview_ready_is_separate_from_approved_for_customer !== true ||
    statusBoundaries.approved_for_customer_is_not_first_preview_lifecycle_state !== true
  ) {
    pushIssue(
      issues,
      "missing_status_separation",
      "$.status_boundaries",
      "first_preview_ready must remain separate from approved_for_customer.",
    );
  }

  const generationFlags = readRecord(value.generation_flags);

  if (
    generationFlags.customer_safe_delivery_approved !== false ||
    generationFlags.production_approval_granted !== false
  ) {
    pushIssue(
      issues,
      "approval_boundary_broken",
      "$.generation_flags",
      "Mock preview generation must not approve customer-safe delivery or production decisions.",
    );
  }

  if (
    generationFlags.provider_prompt_generated !== false ||
    generationFlags.image_generation_requested !== false ||
    generationFlags.image_generation_performed !== false ||
    generationFlags.provider_called !== false ||
    generationFlags.database_written !== false
  ) {
    pushIssue(
      issues,
      "provider_or_image_generation_flag_enabled",
      "$.generation_flags",
      "Mock preview generation must not create provider prompts, request or perform image generation, call providers, or write databases.",
    );
  }

  const mockOutput = readRecord(value.mock_output);

  if (
    mockOutput.image_url !== null ||
    mockOutput.base64_image_data !== null ||
    mockOutput.provider_output_id !== null ||
    mockOutput.generated_at !== null ||
    mockOutput.provider_name !== null
  ) {
    pushIssue(
      issues,
      "real_image_or_provider_output_present",
      "$.mock_output",
      "Mock preview generation output must not include real image or provider output fields.",
    );
  }

  const feedbackEntry = readRecord(value.feedback_entry);

  if (feedbackEntry.submitting_enabled !== false || feedbackEntry.database_write !== false) {
    pushIssue(
      issues,
      "feedback_marked_submitting",
      "$.feedback_entry",
      "Mock preview generation feedback entry must remain non-submitting and non-persisting.",
    );
  }

  const humanReview = readRecord(value.human_review);
  const humanReviewFocus = readStringArray(humanReview.review_focus);

  if (
    humanReview.required_for_customer_safe_delivery !== true ||
    humanReview.required_for_production_decisions !== true
  ) {
    pushIssue(
      issues,
      "missing_human_review_boundary",
      "$.human_review",
      "Human review must remain required for customer-safe delivery and production decisions.",
    );
  }

  const handSketchSummary = readRecord(value.source_hand_sketch_instruction_summary);

  if (
    !humanReviewFocus.includes(ZODIAC_MOUSE_EYE_GEMSTONE_RULE) ||
    handSketchSummary.zodiac_mouse_eye_gemstone_rule !== ZODIAC_MOUSE_EYE_GEMSTONE_RULE
  ) {
    pushIssue(
      issues,
      "missing_zodiac_mouse_rule",
      "$.human_review.review_focus",
      "NOVORA Preview Generation Mock Result must carry the locked zodiac mouse eye gemstone rule.",
    );
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}
