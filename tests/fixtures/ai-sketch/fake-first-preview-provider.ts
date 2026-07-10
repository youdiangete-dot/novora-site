import type {
  FirstPreviewProvider,
  FirstPreviewProviderRequest,
  FirstPreviewProviderResponse,
} from "../../../lib/server/ai-sketch/first-preview-runtime";

export type FakeFirstPreviewProviderScenario =
  | "success"
  | "provider_error"
  | "timeout"
  | "malformed_result"
  | "unsafe_result"
  | "privacy_failure"
  | "missing_asset"
  | "metadata_leak"
  | "internal_prompt_leak"
  | "reviewer_note_leak"
  | "multiple_images";

const VALID_IMAGE = {
  assetId: "preview_asset_agent68a_001",
  contentSafetyPassed: true,
  privacyPassed: true,
  outputValidityPassed: true,
} as const;

export class FakeFirstPreviewProvider implements FirstPreviewProvider {
  callCount = 0;
  networkRequestCount = 0;
  lastRequest: FirstPreviewProviderRequest | null = null;

  constructor(private readonly scenario: FakeFirstPreviewProviderScenario) {}

  async generateFirstPreview(
    request: FirstPreviewProviderRequest,
    _context: { signal: AbortSignal },
  ): Promise<FirstPreviewProviderResponse> {
    this.callCount += 1;
    this.lastRequest = request;

    if (this.scenario === "provider_error") {
      throw new Error("Synthetic provider failure for deterministic local testing.");
    }

    if (this.scenario === "timeout") {
      return new Promise<FirstPreviewProviderResponse>(() => undefined);
    }

    if (this.scenario === "malformed_result") {
      return { outcome: "completed", images: "not-an-array" } as unknown as FirstPreviewProviderResponse;
    }

    if (this.scenario === "unsafe_result") {
      return {
        outcome: "completed",
        images: [{ ...VALID_IMAGE, contentSafetyPassed: false }],
      };
    }

    if (this.scenario === "privacy_failure") {
      return {
        outcome: "completed",
        images: [{ ...VALID_IMAGE, privacyPassed: false }],
      };
    }

    if (this.scenario === "missing_asset") {
      return {
        outcome: "completed",
        images: [{ ...VALID_IMAGE, assetId: null }],
      } as unknown as FirstPreviewProviderResponse;
    }

    if (this.scenario === "metadata_leak") {
      return {
        outcome: "completed",
        images: [VALID_IMAGE],
        providerMetadata: { model: "must-not-cross-runtime-boundary" },
      } as unknown as FirstPreviewProviderResponse;
    }

    if (this.scenario === "internal_prompt_leak") {
      return {
        outcome: "completed",
        images: [VALID_IMAGE],
        internalPrompt: "must-not-cross-runtime-boundary",
      } as unknown as FirstPreviewProviderResponse;
    }

    if (this.scenario === "reviewer_note_leak") {
      return {
        outcome: "completed",
        images: [VALID_IMAGE],
        reviewerNote: "must-not-cross-runtime-boundary",
      } as unknown as FirstPreviewProviderResponse;
    }

    if (this.scenario === "multiple_images") {
      return {
        outcome: "completed",
        images: [VALID_IMAGE, { ...VALID_IMAGE, assetId: "preview_asset_agent68a_002" }],
      } as unknown as FirstPreviewProviderResponse;
    }

    return {
      outcome: "completed",
      images: [VALID_IMAGE],
    };
  }
}
