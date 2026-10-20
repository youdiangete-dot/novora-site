import { isDeepStrictEqual } from "node:util";
import {
  isInitiationIntent, isRecord, isUuid, prepareFirstPreviewHmacEnvelopeCandidate,
  type InitiationIntent, type PreparedInitiationGeneration,
  type FirstPreviewPreparationSourceSnapshot,
} from "../../lib/server/ai-sketch/first-preview-initiation-contract";
import { deriveFirstPreviewIdempotencyKey } from "../../lib/server/ai-sketch/first-preview-persistence-contract";
import { buildFirstPreviewStructuredGenerationInput } from "../../lib/server/ai-sketch/first-preview-structured-input";
import { FIRST_PREVIEW_COST_CONTRACT, FIRST_PREVIEW_PRICING_ASSUMPTION_VERSION } from
  "../../lib/server/ai-sketch/first-preview-cost-contract";
import type { AuthoritativePreparationDatabase, CommittedPreparationOperations } from "./contracts";

const SELECTION_VERSION = "novora_fp_selection_v1";
const PROVIDER_PROFILE = {
  provider_name: "openai", model_name: "gpt-image-2-2026-04-21",
  provider_endpoint: "/v1/images/generations", request_image_count: 1,
  request_streaming: false, request_partial_images: 0, request_size: "1024x1024",
  request_quality: "medium", output_format: "png", moderation_mode: "auto",
};
type Selection = {
  preparation_id: string; selection_version: typeof SELECTION_VERSION;
  intent: InitiationIntent; source_snapshot: FirstPreviewPreparationSourceSnapshot;
  reserved_job_id: string; preparation_policy: Record<string, unknown>;
  prepared: unknown; database_now_ms: number;
};
function readSelection(result: unknown, briefId: string): Selection | null {
  if (!isRecord(result) || result.ok !== true || !isRecord(result.value)) return null;
  const s = result.value;
  if (!isUuid(s.preparation_id) || s.selection_version !== SELECTION_VERSION ||
      !isUuid(s.reserved_job_id) || !isInitiationIntent(s.intent) ||
      s.intent.concept_brief_id !== briefId || s.intent.state !== "claimed" ||
      s.intent.handoff_stage !== "initiation" || s.intent.prepared !== null ||
      s.intent.dispatch_grant !== null || !s.intent.admission_context ||
      !isUuid(s.intent.lease_owner) || s.intent.fence === "0" ||
      !isDeepStrictEqual(s.admission_context, s.intent.admission_context) ||
      !Number.isSafeInteger(s.database_now_ms) || (s.database_now_ms as number) <= 0 ||
      s.intent.lease_until === null || Date.parse(s.intent.lease_until) <= (s.database_now_ms as number) ||
      !isRecord(s.source_snapshot) || !isRecord(s.preparation_policy)) return null;
  return structuredClone(s) as unknown as Selection;
}
function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

/** Dormant committed-RPC adapter. No factory selects it for live traffic.
 * The injected operations MUST be independently authenticated as the Signer.
 * Authorization is repeated by SQL at bind, release and Worker consumption;
 * this adapter never promises a lock across an await or releases on unknown commit.
 */
export function createAuthoritativePreparationDatabaseCandidate(
  operations: CommittedPreparationOperations | null,
): AuthoritativePreparationDatabase {
  return Object.freeze({
    async withAuthorizedPreparation(selector, use) {
      try {
        if (!operations || !isUuid(selector.concept_brief_id)) return null;
        const selected = readSelection(await operations.selectPreparationClaim({
          p_brief: selector.concept_brief_id,
        }), selector.concept_brief_id);
        if (!selected) return null;
        const source = selected.source_snapshot;
        const structured = buildFirstPreviewStructuredGenerationInput({
          payload: source.brief_payload, publicReference: source.public_reference,
        });
        if (!structured.ok) return null;
        const generation = structured.value;
        const expectedPolicy = {
          design_spec_version: generation.designSpec.spec_version,
          hand_sketch_instruction_version: generation.handSketchInstruction.instruction_version,
          estimated_cost_micros: FIRST_PREVIEW_COST_CONTRACT.estimatedCostMicros,
          cost_currency: FIRST_PREVIEW_COST_CONTRACT.currency,
          pricing_assumption_version: FIRST_PREVIEW_PRICING_ASSUMPTION_VERSION,
          provider_profile: PROVIDER_PROFILE,
        };
        // No pricing/profile defaults are substituted for missing database policy.
        if (!isDeepStrictEqual(selected.preparation_policy, expectedPolicy)) return null;
        const identity = {
          jobId: selected.reserved_job_id, conceptBriefId: selector.concept_brief_id,
          attemptNumber: 1, parentJobId: null, sourceOutputId: null,
          designSpecVersion: expectedPolicy.design_spec_version,
          designSpecSha256: generation.designSpecSha256,
          handSketchInstructionVersion: expectedPolicy.hand_sketch_instruction_version,
          handSketchInstructionSha256: generation.handSketchInstructionSha256,
          estimatedCostMicros: expectedPolicy.estimated_cost_micros,
          costCurrency: expectedPolicy.cost_currency,
          pricingAssumptionVersion: expectedPolicy.pricing_assumption_version,
        };
        const identityKey = deriveFirstPreviewIdempotencyKey(identity);
        if (!identityKey) return null;
        const prepared: PreparedInitiationGeneration = {
          job_id: selected.reserved_job_id, identity_key: identityKey,
          generation_input: { designSpec: generation.designSpec,
            handSketchInstruction: generation.handSketchInstruction,
            designSpecSha256: generation.designSpecSha256,
            handSketchInstructionSha256: generation.handSketchInstructionSha256 },
          design_spec_version: identity.designSpecVersion, design_spec_sha256: identity.designSpecSha256,
          hand_sketch_instruction_version: identity.handSketchInstructionVersion,
          hand_sketch_instruction_sha256: identity.handSketchInstructionSha256,
          estimated_cost_micros: identity.estimatedCostMicros, cost_currency: "USD",
          pricing_assumption_version: identity.pricingAssumptionVersion,
        };
        if ((selected.prepared !== null && !isDeepStrictEqual(selected.prepared, prepared)) ||
            !prepareFirstPreviewHmacEnvelopeCandidate({ sourceSnapshot: source, prepared,
              owner: selected.intent.lease_owner!, fence: selected.intent.fence, keyId: "shape-check" })) return null;
        const bound = readSelection(await operations.bindPreparation({
          p_preparation: selected.preparation_id, p_prepared: structuredClone(prepared),
        }), selector.concept_brief_id);
        if (!bound || bound.preparation_id !== selected.preparation_id ||
            bound.reserved_job_id !== selected.reserved_job_id ||
            !isDeepStrictEqual(bound.source_snapshot, source) ||
            !isDeepStrictEqual(bound.intent, selected.intent) ||
            !isDeepStrictEqual(bound.preparation_policy, selected.preparation_policy) ||
            !isDeepStrictEqual(bound.prepared, prepared)) return null;
        const proof = await use(deepFreeze({ intent: bound.intent,
          sourceSnapshot: bound.source_snapshot, prepared,
          databaseNowMs: bound.database_now_ms }));
        if (!proof) return null;
        // Defend the adapter boundary as well as the signer. Only exact canonical
        // material for this selection may be submitted to the release RPC.
        const material = prepareFirstPreviewHmacEnvelopeCandidate({ sourceSnapshot: source,
          prepared, owner: bound.intent.lease_owner!, fence: bound.intent.fence, keyId: proof.key_id });
        const { mac_sha256: mac, ...unsigned } = proof;
        if (!material || !/^[a-f0-9]{64}$/.test(mac) || !isDeepStrictEqual(unsigned, material.envelope)) return null;
        const release = await operations.authorizePreparationRelease({
          p_preparation: bound.preparation_id, p_envelope: structuredClone(proof),
        });
        if (!isRecord(release) || release.ok !== true || release.authorized !== true ||
            release.preparation_id !== bound.preparation_id || release.selection_version !== SELECTION_VERSION ||
            release.owner !== bound.intent.lease_owner || release.fence !== bound.intent.fence ||
            typeof release.lease_until !== "string" || !Number.isSafeInteger(release.database_now_ms) ||
            (release.database_now_ms as number) < bound.database_now_ms ||
            !Number.isFinite(Date.parse(release.lease_until)) ||
            Date.parse(release.lease_until) <= (release.database_now_ms as number)) return null;
        return proof;
      } catch { return null; }
    },
  } satisfies AuthoritativePreparationDatabase);
}
