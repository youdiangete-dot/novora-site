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
