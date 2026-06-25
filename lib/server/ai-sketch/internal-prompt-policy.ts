export type InternalPromptPolicyPreview = {
  prompt_policy_version: string;
  template_version: string;
  internal_only: true;
  human_review: {
    required_before_generation: true;
    required_after_generation: true;
    final_customer_approval_required: true;
  };
  provider_boundary: {
    provider_ready_payload: false;
    includes_api_key: false;
    calls_model: false;
    generated_image_output: false;
  };
  approval_boundary: {
    automatic_approval: false;
    automatic_email_delivery: false;
    gallery_approval_shortcut: false;
    generation_success_is_approval: false;
  };
};

export function createInternalPromptPolicyPreview(options: {
  promptPolicyVersion?: string;
  templateVersion?: string;
} = {}): InternalPromptPolicyPreview {
  return {
    prompt_policy_version: options.promptPolicyVersion ?? "internal_prompt_policy_v1_placeholder",
    template_version: options.templateVersion ?? "hand_sketch_instruction_template_v1",
    internal_only: true,
    human_review: {
      required_before_generation: true,
      required_after_generation: true,
      final_customer_approval_required: true,
    },
    provider_boundary: {
      provider_ready_payload: false,
      includes_api_key: false,
      calls_model: false,
      generated_image_output: false,
    },
    approval_boundary: {
      automatic_approval: false,
      automatic_email_delivery: false,
      gallery_approval_shortcut: false,
      generation_success_is_approval: false,
    },
  };
}
