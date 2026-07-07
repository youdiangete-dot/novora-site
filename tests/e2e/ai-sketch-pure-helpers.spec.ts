import { expect, test } from '@playwright/test';

import {
  fakeCadQuoteProductionExpectationRisk,
  fakeExactCopyReferenceRisk,
  fakeInvalidPendingStatus,
  fakeMissingRequiredSection,
  fakePrivateContactLeak,
  fakeReviewerCustomerNoteLeak,
  fakeSimpleRingUnknownStoneSize,
  fakeUnsupportedMaterialCase,
} from '../fixtures/ai-sketch/fake-design-specs';
import {
  generationSuccessRequiresHumanApproval,
  isIllegalPendingAiSketchReviewStatus,
  isLegalAiSketchReviewStatus,
  LEGAL_AI_SKETCH_REVIEW_STATUSES,
  normalizeAiSketchReviewStatus,
} from '../../lib/server/ai-sketch/status-guards';
import { validateInternalDesignSpecShape } from '../../lib/server/ai-sketch/design-spec-validation';
import { formatInternalHandSketchInstruction } from '../../lib/server/ai-sketch/hand-sketch-instruction-format';
import { createInternalPromptPolicyPreview } from '../../lib/server/ai-sketch/internal-prompt-policy';
import { flagInternalAiSketchRisks } from '../../lib/server/ai-sketch/risk-flags';
import {
  createMockNovoraDesignSpec,
  MOCK_NOVORA_DESIGN_SPEC,
  NOVORA_DESIGN_SPEC_VERSION,
  validateNovoraDesignSpec,
  ZODIAC_MOUSE_EYE_GEMSTONE_RULE,
} from '../../lib/server/ai-sketch/design-spec';
import {
  createMockNovoraHandSketchInstruction,
  createNovoraHandSketchInstructionFromDesignSpec,
  MOCK_NOVORA_HAND_SKETCH_INSTRUCTION,
  NOVORA_HAND_SKETCH_INSTRUCTION_VERSION,
  NOVORA_SKETCH_SHEET_STYLE,
  validateNovoraHandSketchInstruction,
} from '../../lib/server/ai-sketch/hand-sketch-instruction';

function validationIssueCodes(value: unknown) {
  return validateInternalDesignSpecShape(value).issues.map((issue) => issue.code);
}

function riskFlags(value: unknown) {
  return flagInternalAiSketchRisks(value).flags;
}

test.describe('pure AI sketch status guards', () => {
  test('allows only the locked legal review statuses', () => {
    expect(LEGAL_AI_SKETCH_REVIEW_STATUSES).toEqual([
      'internal_draft_not_generated',
      'draft_generated_internal_only',
      'needs_revision',
      'approved_for_customer',
    ]);

    for (const status of LEGAL_AI_SKETCH_REVIEW_STATUSES) {
      expect(isLegalAiSketchReviewStatus(status)).toBe(true);
      expect(normalizeAiSketchReviewStatus(` ${status} `)).toBe(status);
    }

    expect(isLegalAiSketchReviewStatus('pending')).toBe(false);
    expect(isIllegalPendingAiSketchReviewStatus(' pending ')).toBe(true);
    expect(normalizeAiSketchReviewStatus('pending')).toBeNull();
    expect(normalizeAiSketchReviewStatus('approved_for_gallery')).toBeNull();
    expect(LEGAL_AI_SKETCH_REVIEW_STATUSES).not.toContain('approved_for_gallery');
  });

  test('keeps generation success separate from human approval', () => {
    expect(generationSuccessRequiresHumanApproval({ generationSucceeded: true })).toBe(true);
    expect(
      generationSuccessRequiresHumanApproval({
        generationSucceeded: true,
        reviewStatus: 'draft_generated_internal_only',
      }),
    ).toBe(true);
    expect(
      generationSuccessRequiresHumanApproval({
        generationSucceeded: true,
        reviewStatus: 'approved_for_customer',
      }),
    ).toBe(false);
  });
});

test.describe('pure AI sketch Design Spec validation', () => {
  test('accepts the valid fake Design Spec shape', () => {
    expect(validateInternalDesignSpecShape(fakeSimpleRingUnknownStoneSize)).toEqual({
      ok: true,
      issues: [],
    });
  });

  test('rejects missing sections and illegal pending review status', () => {
    expect(validationIssueCodes(fakeMissingRequiredSection)).toContain('missing_required_section');
    expect(validationIssueCodes(fakeInvalidPendingStatus)).toContain('illegal_review_status');
  });

  test('rejects missing human review gates and private generation-facing data', () => {
    const missingHumanReviewGate = {
      ...fakeSimpleRingUnknownStoneSize,
      human_review: {
        required_before_generation: true,
        required_before_customer_delivery: false,
      },
    };

    expect(validationIssueCodes(missingHumanReviewGate)).toContain('missing_human_review_gate');
    expect(validationIssueCodes(fakePrivateContactLeak)).toContain('forbidden_private_contact_field');
    expect(validationIssueCodes(fakeReviewerCustomerNoteLeak)).toEqual(
      expect.arrayContaining(['forbidden_note_field', 'forbidden_note_field']),
    );
  });

  test('rejects gallery and generation-success approval shortcuts', () => {
    const galleryShortcut = {
      ...fakeSimpleRingUnknownStoneSize,
      gallery_approval: true,
    };
    const generationSuccessShortcut = {
      ...fakeSimpleRingUnknownStoneSize,
      generation_success_approves_customer: true,
    };

    expect(validationIssueCodes(galleryShortcut)).toContain('gallery_approval_present');
    expect(validationIssueCodes(generationSuccessShortcut)).toContain(
      'generation_success_treated_as_approval',
    );
  });
});

test.describe('pure NOVORA first-preview Design Spec helper', () => {
  test('creates a mock-only fixture with stable version and reference', () => {
    expect(MOCK_NOVORA_DESIGN_SPEC.spec_version).toBe(NOVORA_DESIGN_SPEC_VERSION);
    expect(MOCK_NOVORA_DESIGN_SPEC.public_reference).toBe('NOVORA-CB-MOCK-001');
    expect(MOCK_NOVORA_DESIGN_SPEC.source).toMatchObject({
      source_type: 'fake_mock_fixture',
      mock_only: true,
      contains_real_customer_data: false,
    });
    expect(validateNovoraDesignSpec(MOCK_NOVORA_DESIGN_SPEC)).toEqual({
      ok: true,
      issues: [],
    });
  });

  test('forbids raw customer language as a direct final image prompt', () => {
    expect(MOCK_NOVORA_DESIGN_SPEC.source.raw_brief_usage_policy).toContain(
      'Raw customer natural language must not be used directly as a final image-generation prompt',
    );
    expect(MOCK_NOVORA_DESIGN_SPEC.source.raw_brief_usage_policy).toContain('Design Spec');
    expect(MOCK_NOVORA_DESIGN_SPEC.source.raw_brief_usage_policy).toContain(
      'Hand Sketch Instruction',
    );
  });

  test('keeps first preview readiness separate from customer approval boundaries', () => {
    expect(MOCK_NOVORA_DESIGN_SPEC.safety_boundaries).toMatchObject({
      concept_preview_only: true,
      not_cad: true,
      not_quote: true,
      not_order_approval: true,
      not_payment_approval: true,
      not_production_approval: true,
      first_preview_ready: 'first_preview_ready',
      approved_for_customer: 'approved_for_customer',
      first_preview_ready_is_separate_from_approved_for_customer: true,
    });
  });

  test('includes the locked zodiac mouse eye gemstone rule', () => {
    expect(MOCK_NOVORA_DESIGN_SPEC.stones.special_stone_rules).toContain(
      ZODIAC_MOUSE_EYE_GEMSTONE_RULE,
    );
    expect(ZODIAC_MOUSE_EYE_GEMSTONE_RULE).toContain(
      'do not use ruby or red gemstones for mouse eyes',
    );
    expect(ZODIAC_MOUSE_EYE_GEMSTONE_RULE).toContain(
      'Use green gemstones, black gemstones, jadeite/emerald tones, or dark neutral stones',
    );
  });

  test('supports English and Traditional Chinese fixture language', () => {
    expect(createMockNovoraDesignSpec({ language: 'en' }).language).toBe('en');
    expect(createMockNovoraDesignSpec({ language: 'zh-Hant' }).language).toBe('zh-Hant');
  });
});

test.describe('pure NOVORA Hand Sketch Instruction helper fixture', () => {
  test('creates a mock-only instruction with stable version and Design Spec carry-through', () => {
    expect(MOCK_NOVORA_HAND_SKETCH_INSTRUCTION.instruction_version).toBe(
      NOVORA_HAND_SKETCH_INSTRUCTION_VERSION,
    );
    expect(MOCK_NOVORA_HAND_SKETCH_INSTRUCTION.public_reference).toBe(
      MOCK_NOVORA_DESIGN_SPEC.public_reference,
    );
    expect(MOCK_NOVORA_HAND_SKETCH_INSTRUCTION.design_spec_version).toBe(
      NOVORA_DESIGN_SPEC_VERSION,
    );
    expect(MOCK_NOVORA_HAND_SKETCH_INSTRUCTION.source_design_spec_summary).toMatchObject({
      source_type: 'fake_mock_fixture',
      mock_only: true,
      contains_real_customer_data: false,
    });
    expect(validateNovoraHandSketchInstruction(MOCK_NOVORA_HAND_SKETCH_INSTRUCTION)).toEqual({
      ok: true,
      issues: [],
    });
  });

  test('forbids raw customer language as a final image prompt and does not create provider prompts', () => {
    expect(MOCK_NOVORA_HAND_SKETCH_INSTRUCTION.prompt_usage_policy).toMatchObject({
      raw_customer_language_must_not_be_final_prompt: true,
      design_spec_precedes_hand_sketch_instruction: true,
      hand_sketch_instruction_precedes_provider_prompt: true,
      helper_calls_gpt: false,
      helper_calls_openai: false,
      helper_calls_image_api: false,
      helper_generates_images: false,
    });
    expect(MOCK_NOVORA_HAND_SKETCH_INSTRUCTION.prompt_usage_policy.policy_text).toEqual(
      expect.arrayContaining([
        'Raw customer natural language must not be used directly as the final image-generation prompt.',
        'Design Spec must precede Hand Sketch Instruction.',
        'Hand Sketch Instruction must precede any future provider-specific image prompt.',
        'This helper does not call GPT, OpenAI, image APIs, or generate images.',
      ]),
    );
    expect(MOCK_NOVORA_HAND_SKETCH_INSTRUCTION.generation_readiness).toMatchObject({
      ready_for_future_provider_prompt: false,
      provider_prompt_not_generated: true,
    });
  });

  test('includes unified NOVORA sketch sheet style and keeps brand mark out of jewelry structure', () => {
    expect(MOCK_NOVORA_HAND_SKETCH_INSTRUCTION.sheet_style).toMatchObject({
      style_version: NOVORA_SKETCH_SHEET_STYLE,
      warm_light_background: true,
      consistent_line_weight: true,
      clean_jewelry_hand_sketch_feel: true,
      main_view_plus_optional_detail_views: true,
      clear_annotations_and_callouts: true,
      subtle_text_only_novora_watermark_or_footer_label: true,
      concept_preview_label: 'NOVORA concept preview',
      no_cad_drawing_framing: true,
      no_quote_order_or_production_approval_framing: true,
    });
    expect(MOCK_NOVORA_HAND_SKETCH_INSTRUCTION.brand_placement).toMatchObject({
      novora_text_watermark_allowed: true,
      official_logo_asset_path_remains_separate_if_not_documented: true,
      logo_or_brand_mark_must_not_be_jewelry_structure: true,
      logo_or_brand_mark_must_not_cover_jewelry_annotations_or_view_labels: true,
    });
    expect(MOCK_NOVORA_HAND_SKETCH_INSTRUCTION.negative_constraints).toContain(
      'do not make NOVORA logo part of the jewelry design',
    );
  });

  test('keeps concept-preview boundaries and status separation explicit', () => {
    expect(MOCK_NOVORA_HAND_SKETCH_INSTRUCTION.safety_boundaries).toMatchObject({
      concept_preview_only: true,
      not_cad: true,
      not_quote: true,
      not_order_approval: true,
      not_payment_approval: true,
      not_production_approval: true,
      first_preview_ready: 'first_preview_ready',
      approved_for_customer: 'approved_for_customer',
      first_preview_ready_is_separate_from_approved_for_customer: true,
      human_review_required_for_customer_safe_delivery: true,
      human_review_required_for_production_decisions: true,
      human_review_requirement:
        'Human review remains required for customer-safe delivery and production decisions.',
    });
    expect(MOCK_NOVORA_HAND_SKETCH_INSTRUCTION.disclaimer_instructions).toMatchObject({
      concept_preview_only: true,
      not_cad: true,
      not_quote: true,
      not_order_approval: true,
      not_payment_approval: true,
      not_production_approval: true,
    });
  });

  test('carries forward the zodiac mouse eye gemstone rule into stones and review checklist', () => {
    expect(
      MOCK_NOVORA_HAND_SKETCH_INSTRUCTION.stone_and_setting_instructions.special_stone_rules,
    ).toContain(ZODIAC_MOUSE_EYE_GEMSTONE_RULE);
    expect(MOCK_NOVORA_HAND_SKETCH_INSTRUCTION.human_review_checklist).toEqual(
      expect.arrayContaining([
        'structure logic',
        'view consistency',
        'setting/prong/bezel logic',
        'production feasibility',
        'customer request match',
        ZODIAC_MOUSE_EYE_GEMSTONE_RULE,
      ]),
    );
  });

  test('supports English and Traditional Chinese mock instructions', () => {
    expect(createMockNovoraHandSketchInstruction({ language: 'en' }).language).toBe('en');
    expect(createMockNovoraHandSketchInstruction({ language: 'zh-Hant' }).language).toBe(
      'zh-Hant',
    );
  });

  test('builds from a supplied Design Spec without live integration behavior', () => {
    const designSpec = createMockNovoraDesignSpec({
      language: 'zh-Hant',
      publicReference: 'NOVORA-CB-MOCK-002',
    });
    const instruction = createNovoraHandSketchInstructionFromDesignSpec(designSpec);

    expect(instruction.public_reference).toBe('NOVORA-CB-MOCK-002');
    expect(instruction.internal_notes).toMatchObject({
      fixture_only: true,
      no_real_customer_data: true,
      no_database_read: true,
      no_database_write: true,
      no_gpt_openai_or_image_api_call: true,
      no_image_generation: true,
      no_live_route_submission_or_customer_flow_integration: true,
    });
  });

  test('validation catches missing required core fields', () => {
    const missingCoreField = {
      ...MOCK_NOVORA_HAND_SKETCH_INSTRUCTION,
      prompt_usage_policy: undefined,
      safety_boundaries: {
        ...MOCK_NOVORA_HAND_SKETCH_INSTRUCTION.safety_boundaries,
        human_review_required_for_customer_safe_delivery: undefined,
        human_review_required_for_production_decisions: undefined,
        human_review_requirement: undefined,
      },
    };
    delete (missingCoreField as Partial<typeof MOCK_NOVORA_HAND_SKETCH_INSTRUCTION>)
      .prompt_usage_policy;

    expect(validateNovoraHandSketchInstruction(missingCoreField).issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'missing_required_section',
          path: '$.prompt_usage_policy',
        }),
        expect.objectContaining({
          code: 'raw_brief_direct_prompt_not_forbidden',
        }),
        expect.objectContaining({
          code: 'missing_human_review_boundary',
        }),
      ]),
    );
  });
});

test.describe('pure AI sketch Hand Sketch Instruction formatting', () => {
  test('formats an internal-only instruction while preserving unknowns and boundaries', () => {
    const instruction = formatInternalHandSketchInstruction(fakeSimpleRingUnknownStoneSize);

    expect(instruction.internal_only).toBe(true);
    expect(instruction.template_version).toBe('hand_sketch_instruction_template_v1');
    expect(instruction.uncertainties_to_preserve).toEqual(fakeSimpleRingUnknownStoneSize.unknowns);
    expect(instruction.sketch_objective).toMatchObject({
      concept_only: true,
      supports_designer_review: true,
      not_cad: true,
      not_quote: true,
      not_order: true,
      not_production_approval: true,
    });
    expect(instruction.human_review_requirements).toMatchObject({
      required_before_generation: true,
      required_before_customer_delivery: true,
      generation_success_does_not_approve: true,
      approved_for_customer_is_not_gallery_approval: true,
    });
    expect(instruction.forbidden_outputs).toEqual(
      expect.arrayContaining([
        'customer-facing sketch link',
        'gallery approval',
        'CAD approval',
        'quote',
        'order confirmation',
        'production approval',
      ]),
    );
  });

  test('does not carry private contact fields into formatted instruction output', () => {
    const instructionText = JSON.stringify(formatInternalHandSketchInstruction(fakePrivateContactLeak));

    expect(instructionText).not.toContain('fake-customer@example.invalid');
    expect(instructionText).not.toContain('fake-phone-placeholder');
  });
});

test.describe('pure AI sketch internal prompt policy', () => {
  test('keeps prompt previews local-only and outside provider/customer delivery paths', () => {
    const preview = createInternalPromptPolicyPreview();

    expect(preview.internal_only).toBe(true);
    expect(preview.provider_boundary).toMatchObject({
      provider_ready_payload: false,
      includes_api_key: false,
      calls_model: false,
      generated_image_output: false,
    });
    expect(preview.human_review).toMatchObject({
      required_before_generation: true,
      required_after_generation: true,
      final_customer_approval_required: true,
    });
    expect(preview.approval_boundary).toMatchObject({
      automatic_approval: false,
      automatic_email_delivery: false,
      gallery_approval_shortcut: false,
      generation_success_is_approval: false,
    });
  });
});

test.describe('pure AI sketch risk flags', () => {
  test('flags unsupported materials, exact-copy requests, private data, and missing review gates', () => {
    const missingHumanReviewGate = {
      ...fakeSimpleRingUnknownStoneSize,
      human_review: {
        required_before_generation: false,
        required_before_customer_delivery: true,
      },
    };

    expect(riskFlags(fakeUnsupportedMaterialCase)).toContain('unsupported_material');
    expect(riskFlags(fakeExactCopyReferenceRisk)).toContain('exact_copy_reference_request');
    expect(riskFlags(fakePrivateContactLeak)).toContain('private_contact_data_present');
    expect(riskFlags(missingHumanReviewGate)).toContain('missing_human_review_gate');
  });

  test('flags CAD, quote, order, production, gallery, approval, and internal-only risks', () => {
    const galleryShortcut = {
      ...fakeSimpleRingUnknownStoneSize,
      gallery_approval: true,
    };
    const generationSuccessShortcut = {
      ...fakeSimpleRingUnknownStoneSize,
      generation_success_approves_customer: true,
    };
    const missingInternalOnlyFlag = {
      ...fakeSimpleRingUnknownStoneSize,
      internal_only: false,
    };

    expect(riskFlags(fakeCadQuoteProductionExpectationRisk)).toEqual(
      expect.arrayContaining([
        'cad_approval_implication',
        'quote_order_production_approval_implication',
      ]),
    );
    expect(riskFlags(galleryShortcut)).toContain('gallery_approval_implication');
    expect(riskFlags(generationSuccessShortcut)).toContain(
      'generation_success_treated_as_approval',
    );
    expect(riskFlags(missingInternalOnlyFlag)).toContain('missing_internal_only_flag');
  });
});
