export type InternalHandSketchInstruction = {
  template_version: "hand_sketch_instruction_template_v1";
  internal_only: true;
  source_design_spec: {
    design_spec_schema_version: string;
    source_identifier: string;
    prompt_policy_version: string;
  };
  sketch_objective: {
    concept_only: true;
    supports_designer_review: true;
    not_cad: true;
    not_quote: true;
    not_order: true;
    not_production_approval: true;
  };
  piece_overview: Record<string, unknown>;
  style_direction: Record<string, unknown>;
  materials_and_finish_direction: Record<string, unknown>;
  stone_and_setting_direction: Record<string, unknown>;
  composition_and_proportion: Record<string, unknown>;
  reference_image_guidance: Record<string, unknown>;
  uncertainties_to_preserve: unknown[];
  human_review_requirements: {
    required_before_generation: true;
    required_before_customer_delivery: true;
    generation_success_does_not_approve: true;
    approved_for_customer_is_not_gallery_approval: true;
  };
  forbidden_outputs: string[];
};

type DesignSpecLike = Record<string, unknown>;

function readRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function readUnknowns(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function formatInternalHandSketchInstruction(
  designSpec: DesignSpecLike,
): InternalHandSketchInstruction {
  const source = readRecord(designSpec.source);
  const referenceImages = readRecord(designSpec.reference_images);

  return {
    template_version: "hand_sketch_instruction_template_v1",
    internal_only: true,
    source_design_spec: {
      design_spec_schema_version: readString(designSpec.schema_version, "design_spec_json_v1"),
      source_identifier: readString(source.source_identifier, "fake_internal_design_spec_only"),
      prompt_policy_version: readString(
        source.prompt_policy_version,
        "hand_sketch_instruction_policy_v1_placeholder",
      ),
    },
    sketch_objective: {
      concept_only: true,
      supports_designer_review: true,
      not_cad: true,
      not_quote: true,
      not_order: true,
      not_production_approval: true,
    },
    piece_overview: readRecord(designSpec.piece),
    style_direction: readRecord(designSpec.style),
    materials_and_finish_direction: readRecord(designSpec.materials),
    stone_and_setting_direction: readRecord(designSpec.stones),
    composition_and_proportion: readRecord(designSpec.composition),
    reference_image_guidance: {
      ...referenceImages,
      inspiration_only: true,
      do_not_copy_exactly: true,
      no_protected_urls: true,
    },
    uncertainties_to_preserve: readUnknowns(designSpec.unknowns),
    human_review_requirements: {
      required_before_generation: true,
      required_before_customer_delivery: true,
      generation_success_does_not_approve: true,
      approved_for_customer_is_not_gallery_approval: true,
    },
    forbidden_outputs: [
      "customer-facing sketch link",
      "gallery approval",
      "CAD approval",
      "quote",
      "order confirmation",
      "production approval",
      "invented gemstone size",
      "invented carat weight",
      "invented price",
      "invented timeline",
    ],
  };
}
