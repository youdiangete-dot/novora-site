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
import {
  createMockNovoraPreviewGenerationResult,
  createNovoraPreviewGenerationMockFromDesignSpec,
  MOCK_NOVORA_PREVIEW_GENERATION_RESULT,
  NOVORA_PREVIEW_GENERATION_MOCK_VERSION,
  validateNovoraPreviewGenerationMockResult,
} from '../../lib/server/ai-sketch/preview-generation';
import {
  orchestrateFirstPreviewGeneration,
  type FirstPreviewRuntimeInput,
} from '../../lib/server/ai-sketch/first-preview-runtime';
import { FakeFirstPreviewProvider } from '../fixtures/ai-sketch/fake-first-preview-provider';

const PREVIOUS_ZODIAC_MOUSE_EYE_GEMSTONE_RULE =
  'For zodiac mouse jewelry/sculpture designs, do not use ruby or red gemstones for mouse eyes. Use green gemstones, black gemstones, jadeite/emerald tones, or dark neutral stones for eyes instead.';

const WEAKENED_ZODIAC_MOUSE_EYE_GEMSTONE_RULE =
  'For zodiac mouse designs, avoid red eye stones.';

const ZODIAC_MOUSE_EYE_COMPANION_RULES = [
  'For zodiac mouse eyes, auto-select green gemstones.',
  'For zodiac mouse eyes, automatic assignment is green.',
  'For zodiac mouse eyes, choose a replacement gemstone.',
  'For zodiac mouse eyes, the default is a black gemstone.',
  'For zodiac mouse eyes, deterministic replacement of unknown eye stones is green.',
  'For zodiac mouse eyes, green is allowed only when explicitly requested, but automatically select black when unspecified.',
  'Preserve an explicitly requested emerald for zodiac mouse eyes.',
  'Use green for mouse eyes only after human approval.',
] as const;

const MOUSE_EYE_CONTEXT_NORMALIZATION_VARIANTS = [
  'FOR ZODIAC MOUSE EYES, AUTO-SELECT GREEN GEMSTONES.',
  'For zodiac—mouse eyes,\nchoose green.',
  'For zodiac mouse‑eye gemstones, choose green.',
  'For zodiac_mouse/eyes: choose green.',
  'For   zodiac   mouse   eyes, choose green.',
] as const;

const UNRELATED_SAFE_STONE_RULES = [
  'Automatically select a bezel setting for the unrelated pendant center stone.',
  'Automatically place prongs around the emerald center stone.',
  'Default pendant bail behavior is a hidden integrated loop.',
] as const;

const AUTOMATIC_GREEN_ZODIAC_MOUSE_EYE_RULE =
  ZODIAC_MOUSE_EYE_COMPANION_RULES[0];

const RUNTIME_PUBLIC_REFERENCE = 'NOVORA-CB-20260727-PR243';
const RUNTIME_CONCEPT_BRIEF_ID = '123e4567-e89b-42d3-a456-426614174243';

function cloneFixture<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function designSpecWithSpecialStoneRules(rules: string[]) {
  const designSpec = cloneFixture(MOCK_NOVORA_DESIGN_SPEC);
  designSpec.stones.special_stone_rules = rules;
  return designSpec;
}

function createRuntimeInput(
  designSpec: typeof MOCK_NOVORA_DESIGN_SPEC,
): FirstPreviewRuntimeInput {
  return {
    persistenceConfirmed: true,
    conceptBriefId: RUNTIME_CONCEPT_BRIEF_ID,
    publicReference: RUNTIME_PUBLIC_REFERENCE,
    designSpec,
    handSketchInstruction: createNovoraHandSketchInstructionFromDesignSpec(designSpec),
    accessControlEligible: true,
    falseSuccessDetected: false,
  };
}

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

  test('locks the non-red preservation, unknown, and no-substitute mouse-eye semantics', () => {
    expect(MOCK_NOVORA_DESIGN_SPEC.stones.special_stone_rules).toContain(
      ZODIAC_MOUSE_EYE_GEMSTONE_RULE,
    );
    expect(ZODIAC_MOUSE_EYE_GEMSTONE_RULE).toContain(
      'do not use ruby or red gemstones for mouse eyes',
    );
    expect(ZODIAC_MOUSE_EYE_GEMSTONE_RULE).toContain(
      'Preserve an explicitly requested non-red eye gemstone',
    );
    expect(ZODIAC_MOUSE_EYE_GEMSTONE_RULE).toContain(
      'If no eye gemstone is specified, keep it unknown',
    );
    expect(ZODIAC_MOUSE_EYE_GEMSTONE_RULE).toContain(
      'do not select a substitute',
    );
    expect(ZODIAC_MOUSE_EYE_GEMSTONE_RULE).toContain(
      'green, black, jadeite/emerald tones, or dark neutral stones are allowed only when explicitly requested or later approved by a human reviewer',
    );
    expect(ZODIAC_MOUSE_EYE_GEMSTONE_RULE).not.toContain(
      'Use green gemstones, black gemstones, jadeite/emerald tones, or dark neutral stones for eyes instead.',
    );
  });

  test('accepts the corrected zodiac mouse rule alone', () => {
    const designSpec = designSpecWithSpecialStoneRules([
      ZODIAC_MOUSE_EYE_GEMSTONE_RULE,
    ]);

    expect(validateNovoraDesignSpec(designSpec)).toEqual({
      ok: true,
      issues: [],
    });
  });

  test('continues rejecting a missing, weakened, or replacement-only zodiac mouse rule', () => {
    for (const replacementRules of [
      [],
      [WEAKENED_ZODIAC_MOUSE_EYE_GEMSTONE_RULE],
    ]) {
      const designSpec = designSpecWithSpecialStoneRules(replacementRules);

      expect(validateNovoraDesignSpec(designSpec).issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'missing_zodiac_mouse_rule',
            path: '$.stones.special_stone_rules',
          }),
        ]),
      );
    }
  });

  test('rejects every additional zodiac mouse-eye companion rule', () => {
    for (const companionRule of [
      PREVIOUS_ZODIAC_MOUSE_EYE_GEMSTONE_RULE,
      ...ZODIAC_MOUSE_EYE_COMPANION_RULES,
    ]) {
      const result = validateNovoraDesignSpec(
        designSpecWithSpecialStoneRules([
          ZODIAC_MOUSE_EYE_GEMSTONE_RULE,
          companionRule,
        ]),
      );

      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'contradictory_zodiac_mouse_eye_rule',
            path: '$.stones.special_stone_rules',
          }),
        ]),
      );
      expect(result.issues.map((issue) => issue.code)).not.toContain(
        'missing_zodiac_mouse_rule',
      );
    }
  });

  test('normalizes punctuation, whitespace, capitalization, and hyphens before rejecting companions', () => {
    for (const companionRule of MOUSE_EYE_CONTEXT_NORMALIZATION_VARIANTS) {
      expect(
        validateNovoraDesignSpec(
          designSpecWithSpecialStoneRules([
            ZODIAC_MOUSE_EYE_GEMSTONE_RULE,
            companionRule,
          ]),
        ).issues,
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'contradictory_zodiac_mouse_eye_rule',
          }),
        ]),
      );
    }
  });

  test('allows unrelated automatic jewelry and setting rules', () => {
    expect(
      validateNovoraDesignSpec(
        designSpecWithSpecialStoneRules([
          ZODIAC_MOUSE_EYE_GEMSTONE_RULE,
          ...UNRELATED_SAFE_STONE_RULES,
        ]),
      ),
    ).toEqual({
      ok: true,
      issues: [],
    });
  });

  test('allows structured explicit emerald or black mouse-eye selection without a companion rule', () => {
    for (const selectedStone of ['emerald', 'black gemstone']) {
      const designSpec = designSpecWithSpecialStoneRules([
        ZODIAC_MOUSE_EYE_GEMSTONE_RULE,
      ]);
      designSpec.stones.side_stones =
        `Customer explicitly selected ${selectedStone} for the zodiac mouse eyes.`;
      designSpec.stones.stone_color_direction =
        `Preserve the customer-selected ${selectedStone} direction.`;

      expect(validateNovoraDesignSpec(designSpec)).toEqual({
        ok: true,
        issues: [],
      });

      const instruction = createNovoraHandSketchInstructionFromDesignSpec(designSpec);
      expect(instruction.stone_and_setting_instructions.side_stones).toContain(
        selectedStone,
      );
      expect(
        instruction.stone_and_setting_instructions.special_stone_rules,
      ).toEqual([ZODIAC_MOUSE_EYE_GEMSTONE_RULE]);
      expect(validateNovoraHandSketchInstruction(instruction)).toEqual({
        ok: true,
        issues: [],
      });
    }
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

  test('accepts the corrected rule and rejects old, weakened, or missing rule locations', () => {
    expect(validateNovoraHandSketchInstruction(MOCK_NOVORA_HAND_SKETCH_INSTRUCTION)).toEqual({
      ok: true,
      issues: [],
    });

    for (const replacementRule of [
      PREVIOUS_ZODIAC_MOUSE_EYE_GEMSTONE_RULE,
      WEAKENED_ZODIAC_MOUSE_EYE_GEMSTONE_RULE,
      'Automatically substitute a green eye stone when the eye gemstone is unknown.',
    ]) {
      const instruction = cloneFixture(MOCK_NOVORA_HAND_SKETCH_INSTRUCTION);
      instruction.stone_and_setting_instructions.special_stone_rules = [replacementRule];
      instruction.human_review_checklist = [replacementRule];

      expect(validateNovoraHandSketchInstruction(instruction).issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'missing_zodiac_mouse_rule',
          }),
        ]),
      );
    }

    const missingStoneRule = cloneFixture(MOCK_NOVORA_HAND_SKETCH_INSTRUCTION);
    missingStoneRule.stone_and_setting_instructions.special_stone_rules = [];
    expect(validateNovoraHandSketchInstruction(missingStoneRule).issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'missing_zodiac_mouse_rule',
        }),
      ]),
    );

    const missingReviewRule = cloneFixture(MOCK_NOVORA_HAND_SKETCH_INSTRUCTION);
    missingReviewRule.human_review_checklist =
      missingReviewRule.human_review_checklist.filter(
        (item) => item !== ZODIAC_MOUSE_EYE_GEMSTONE_RULE,
      );
    expect(validateNovoraHandSketchInstruction(missingReviewRule).issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'missing_zodiac_mouse_rule',
        }),
      ]),
    );
  });

  test('builder preserves the exact canonical rule and unrelated rules', () => {
    const designSpec = designSpecWithSpecialStoneRules([
      ZODIAC_MOUSE_EYE_GEMSTONE_RULE,
      ...UNRELATED_SAFE_STONE_RULES,
    ]);

    expect(validateNovoraDesignSpec(designSpec)).toEqual({
      ok: true,
      issues: [],
    });

    const instruction = createNovoraHandSketchInstructionFromDesignSpec(designSpec);

    expect(instruction.stone_and_setting_instructions.special_stone_rules).toEqual(
      expect.arrayContaining([
        ZODIAC_MOUSE_EYE_GEMSTONE_RULE,
        ...UNRELATED_SAFE_STONE_RULES,
      ]),
    );
    expect(validateNovoraHandSketchInstruction(instruction)).toEqual({
      ok: true,
      issues: [],
    });
  });

  test('rejects a contradictory companion rule in Hand Sketch special stone rules', () => {
    const instruction = cloneFixture(MOCK_NOVORA_HAND_SKETCH_INSTRUCTION);
    instruction.stone_and_setting_instructions.special_stone_rules.push(
      ZODIAC_MOUSE_EYE_COMPANION_RULES[6],
    );

    expect(validateNovoraHandSketchInstruction(instruction).issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'contradictory_zodiac_mouse_eye_rule',
          path: '$.stone_and_setting_instructions.special_stone_rules',
        }),
      ]),
    );
  });

  test('rejects a contradiction placed only in the Hand Sketch human review checklist', () => {
    const instruction = cloneFixture(MOCK_NOVORA_HAND_SKETCH_INSTRUCTION);
    instruction.human_review_checklist.push(ZODIAC_MOUSE_EYE_COMPANION_RULES[7]);

    expect(validateNovoraHandSketchInstruction(instruction).issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'contradictory_zodiac_mouse_eye_rule',
          path: '$.human_review_checklist',
        }),
      ]),
    );
  });

  test('independently supplied Hand Sketch Instruction cannot bypass contradiction validation', () => {
    const independentlySuppliedInstruction = cloneFixture(
      MOCK_NOVORA_HAND_SKETCH_INSTRUCTION,
    );
    independentlySuppliedInstruction.stone_and_setting_instructions.special_stone_rules.push(
      MOUSE_EYE_CONTEXT_NORMALIZATION_VARIANTS[2],
    );

    const result = validateNovoraHandSketchInstruction(
      independentlySuppliedInstruction,
    );

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'contradictory_zodiac_mouse_eye_rule',
        }),
      ]),
    );
  });

  test('does not instruct downstream substitution for an unspecified mouse-eye gemstone', () => {
    const serializedInstruction = JSON.stringify(MOCK_NOVORA_HAND_SKETCH_INSTRUCTION);

    expect(serializedInstruction).toContain(ZODIAC_MOUSE_EYE_GEMSTONE_RULE);
    expect(serializedInstruction).not.toContain(
      PREVIOUS_ZODIAC_MOUSE_EYE_GEMSTONE_RULE,
    );
    expect(serializedInstruction).not.toMatch(
      /if no eye gemstone is specified,\s*(?:use|choose|select)\b[^.]*\b(?:green|black|jadeite|emerald|neutral)\b/i,
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

test.describe('pure NOVORA Preview Generation Mock Bridge fixture', () => {
  test('creates a mock-only preview generation result with stable version and source carry-through', () => {
    expect(MOCK_NOVORA_PREVIEW_GENERATION_RESULT.mock_version).toBe(
      NOVORA_PREVIEW_GENERATION_MOCK_VERSION,
    );
    expect(MOCK_NOVORA_PREVIEW_GENERATION_RESULT.public_reference).toBe(
      MOCK_NOVORA_DESIGN_SPEC.public_reference,
    );
    expect(MOCK_NOVORA_PREVIEW_GENERATION_RESULT.design_spec_version).toBe(
      NOVORA_DESIGN_SPEC_VERSION,
    );
    expect(MOCK_NOVORA_PREVIEW_GENERATION_RESULT.hand_sketch_instruction_version).toBe(
      NOVORA_HAND_SKETCH_INSTRUCTION_VERSION,
    );
    expect(MOCK_NOVORA_PREVIEW_GENERATION_RESULT.source_design_spec_summary).toMatchObject({
      source_type: 'fake_mock_fixture',
      mock_only: true,
      contains_real_customer_data: false,
    });
    expect(validateNovoraPreviewGenerationMockResult(MOCK_NOVORA_PREVIEW_GENERATION_RESULT)).toEqual({
      ok: true,
      issues: [],
    });
  });

  test('keeps first preview readiness separate from customer-safe approval', () => {
    expect(MOCK_NOVORA_PREVIEW_GENERATION_RESULT.lifecycle_state).toBe('first_preview_ready');
    expect(MOCK_NOVORA_PREVIEW_GENERATION_RESULT.status_boundaries).toMatchObject({
      first_preview_ready: 'first_preview_ready',
      approved_for_customer: 'approved_for_customer',
      first_preview_ready_is_separate_from_approved_for_customer: true,
      approved_for_customer_is_not_first_preview_lifecycle_state: true,
      concept_preview_only: true,
      not_cad: true,
      not_quote: true,
      not_order_approval: true,
      not_payment_approval: true,
      not_production_approval: true,
    });
    expect(MOCK_NOVORA_PREVIEW_GENERATION_RESULT.generation_flags).toMatchObject({
      customer_safe_delivery_approved: false,
      production_approval_granted: false,
    });
  });

  test('does not create provider prompts, call providers, generate images, or write databases', () => {
    expect(MOCK_NOVORA_PREVIEW_GENERATION_RESULT.generation_flags).toMatchObject({
      design_spec_created: true,
      hand_sketch_instruction_created: true,
      provider_prompt_generated: false,
      image_generation_requested: false,
      image_generation_performed: false,
      provider_called: false,
      database_written: false,
    });
    expect(MOCK_NOVORA_PREVIEW_GENERATION_RESULT.internal_notes).toMatchObject({
      raw_customer_brief_is_not_used_directly_as_final_image_generation_prompt: true,
      design_spec_precedes_hand_sketch_instruction: true,
      hand_sketch_instruction_precedes_future_provider_specific_image_prompt: true,
      helper_calls_gpt_openai_or_image_api: false,
      helper_generates_images: false,
      helper_reads_supabase: false,
      helper_writes_supabase: false,
      helper_wires_live_route_submission_or_customer_flow: false,
    });
  });

  test('returns a clearly fake mock output with no real image or provider output fields', () => {
    expect(MOCK_NOVORA_PREVIEW_GENERATION_RESULT.mock_output).toMatchObject({
      output_type: 'mock_sketch_sheet_placeholder',
      mock_only: true,
      placeholder_label: 'Mock NOVORA concept preview placeholder',
      image_url: null,
      base64_image_data: null,
      provider_output_id: null,
      generated_at: null,
      provider_name: null,
    });
    expect(MOCK_NOVORA_PREVIEW_GENERATION_RESULT.display_copy.concept_preview_disclaimer).toContain(
      'Concept preview only',
    );
    expect(MOCK_NOVORA_PREVIEW_GENERATION_RESULT.display_copy.non_approval_disclaimer).toContain(
      'not CAD',
    );
    expect(MOCK_NOVORA_PREVIEW_GENERATION_RESULT.display_copy.non_approval_disclaimer).toContain(
      'not a quote',
    );
    expect(MOCK_NOVORA_PREVIEW_GENERATION_RESULT.display_copy.non_approval_disclaimer).toContain(
      'not order approval',
    );
    expect(MOCK_NOVORA_PREVIEW_GENERATION_RESULT.display_copy.non_approval_disclaimer).toContain(
      'not payment approval',
    );
    expect(MOCK_NOVORA_PREVIEW_GENERATION_RESULT.display_copy.non_approval_disclaimer).toContain(
      'not production approval',
    );
  });

  test('keeps feedback mock-only and carries human review boundaries', () => {
    expect(MOCK_NOVORA_PREVIEW_GENERATION_RESULT.feedback_entry).toMatchObject({
      mock_only: true,
      submitting_enabled: false,
      database_write: false,
    });
    expect(MOCK_NOVORA_PREVIEW_GENERATION_RESULT.feedback_entry.future_feedback_categories).toEqual(
      expect.arrayContaining(['request_revision', 'report_mismatch', 'request_human_followup']),
    );
    expect(MOCK_NOVORA_PREVIEW_GENERATION_RESULT.human_review).toMatchObject({
      required_for_customer_safe_delivery: true,
      required_for_production_decisions: true,
    });
    expect(MOCK_NOVORA_PREVIEW_GENERATION_RESULT.human_review.review_focus).toEqual(
      expect.arrayContaining([
        'structure logic',
        'view consistency',
        'setting/prong/bezel logic',
        'stone count and placement plausibility',
        'production feasibility',
        'customer request match',
        'unsafe claims',
        'brand placement',
        'disclaimer visibility',
        ZODIAC_MOUSE_EYE_GEMSTONE_RULE,
      ]),
    );
  });

  test('propagates only the corrected mouse-eye rule through the complete mock pipeline', () => {
    expect(
      MOCK_NOVORA_PREVIEW_GENERATION_RESULT.source_hand_sketch_instruction_summary
        .zodiac_mouse_eye_gemstone_rule,
    ).toBe(ZODIAC_MOUSE_EYE_GEMSTONE_RULE);
    expect(MOCK_NOVORA_PREVIEW_GENERATION_RESULT.human_review.review_focus).toContain(
      ZODIAC_MOUSE_EYE_GEMSTONE_RULE,
    );
    expect(validateNovoraPreviewGenerationMockResult(MOCK_NOVORA_PREVIEW_GENERATION_RESULT)).toEqual({
      ok: true,
      issues: [],
    });

    const completeMockPipeline = JSON.stringify({
      designSpec: MOCK_NOVORA_DESIGN_SPEC,
      handSketchInstruction: MOCK_NOVORA_HAND_SKETCH_INSTRUCTION,
      previewGeneration: MOCK_NOVORA_PREVIEW_GENERATION_RESULT,
    });
    expect(completeMockPipeline).toContain(ZODIAC_MOUSE_EYE_GEMSTONE_RULE);
    expect(completeMockPipeline).not.toContain(
      PREVIOUS_ZODIAC_MOUSE_EYE_GEMSTONE_RULE,
    );
    expect(completeMockPipeline).not.toContain(
      'Use green gemstones, black gemstones, jadeite/emerald tones, or dark neutral stones for eyes instead.',
    );
  });

  test('rejects a contradictory object at the real pre-Provider seam', async () => {
    const contradictoryDesignSpec = designSpecWithSpecialStoneRules([
      ZODIAC_MOUSE_EYE_GEMSTONE_RULE,
      AUTOMATIC_GREEN_ZODIAC_MOUSE_EYE_RULE,
    ]);
    contradictoryDesignSpec.public_reference = RUNTIME_PUBLIC_REFERENCE;
    const designSpecValidation = validateNovoraDesignSpec(contradictoryDesignSpec);

    expect(designSpecValidation.ok).toBe(false);
    expect(designSpecValidation.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'contradictory_zodiac_mouse_eye_rule',
        }),
      ]),
    );

    const contradictoryInstruction =
      createNovoraHandSketchInstructionFromDesignSpec(contradictoryDesignSpec);
    const handSketchValidation =
      validateNovoraHandSketchInstruction(contradictoryInstruction);

    expect(
      contradictoryInstruction.stone_and_setting_instructions.special_stone_rules,
    ).toContain(AUTOMATIC_GREEN_ZODIAC_MOUSE_EYE_RULE);
    expect(handSketchValidation.ok).toBe(false);
    expect(handSketchValidation.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'contradictory_zodiac_mouse_eye_rule',
        }),
      ]),
    );

    const provider = new FakeFirstPreviewProvider('success');
    const result = await orchestrateFirstPreviewGeneration(
      createRuntimeInput(contradictoryDesignSpec),
      { provider },
    );

    expect(provider.callCount).toBe(0);
    expect(result.providerInvoked).toBe(false);
    expect(result.generation.failureCategory).toBe('invalid_structured_input');
    expect(result.gates.failedGates).toEqual(
      expect.arrayContaining([
        'valid_design_spec',
        'valid_hand_sketch_instruction',
        'structured_inputs_consistent',
      ]),
    );
  });

  test('builds from a supplied Design Spec and supports mock lifecycle states', () => {
    const designSpec = createMockNovoraDesignSpec({
      language: 'zh-Hant',
      publicReference: 'NOVORA-CB-MOCK-003',
    });
    const result = createNovoraPreviewGenerationMockFromDesignSpec(designSpec, {
      lifecycleState: 'processing',
    });

    expect(result.public_reference).toBe('NOVORA-CB-MOCK-003');
    expect(result.lifecycle_state).toBe('processing');
    expect(result.design_spec_version).toBe(NOVORA_DESIGN_SPEC_VERSION);
    expect(result.hand_sketch_instruction_version).toBe(NOVORA_HAND_SKETCH_INSTRUCTION_VERSION);
    expect(validateNovoraPreviewGenerationMockResult(result)).toEqual({
      ok: true,
      issues: [],
    });
  });

  test('validation catches missing core fields and forbidden live-output signals', () => {
    const invalidResult = {
      ...createMockNovoraPreviewGenerationResult(),
      mock_output: {
        ...MOCK_NOVORA_PREVIEW_GENERATION_RESULT.mock_output,
        image_url: 'https://example.invalid/not-a-real-novora-image.png',
      },
      feedback_entry: {
        ...MOCK_NOVORA_PREVIEW_GENERATION_RESULT.feedback_entry,
        submitting_enabled: true,
        database_write: true,
      },
      generation_flags: {
        ...MOCK_NOVORA_PREVIEW_GENERATION_RESULT.generation_flags,
        provider_called: true,
        customer_safe_delivery_approved: true,
      },
      human_review: {
        ...MOCK_NOVORA_PREVIEW_GENERATION_RESULT.human_review,
        required_for_customer_safe_delivery: false,
      },
    } as unknown as typeof MOCK_NOVORA_PREVIEW_GENERATION_RESULT;
    delete (invalidResult as Partial<typeof MOCK_NOVORA_PREVIEW_GENERATION_RESULT>)
      .status_boundaries;

    expect(validateNovoraPreviewGenerationMockResult(invalidResult).issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'missing_required_section',
          path: '$.status_boundaries',
        }),
        expect.objectContaining({
          code: 'real_image_or_provider_output_present',
        }),
        expect.objectContaining({
          code: 'feedback_marked_submitting',
        }),
        expect.objectContaining({
          code: 'provider_or_image_generation_flag_enabled',
        }),
        expect.objectContaining({
          code: 'approval_boundary_broken',
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
