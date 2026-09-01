import "server-only";

import type { FirstPreviewValidatedUsage } from "./first-preview-cost-contract";
import type { FirstPreviewFailureCategory } from "./first-preview-persistence-contract";
import type { FirstPreviewProviderRequest } from "./first-preview-runtime";

export const FIRST_PREVIEW_PROVIDER_TIMEOUT_MS = 150_000;

export type FirstPreviewProviderAdapterResult =
  | Readonly<{
      ok: true;
      imageBase64: string;
      mimeType: "image/png";
      width: 1024;
      height: 1024;
      byteSize: number;
      model: string;
      providerRequestId: string | null;
    }>
  | Readonly<{
      ok: false;
      category: FirstPreviewFailureCategory;
      retryEligible: boolean;
    }>;

export interface FirstPreviewProviderAdapter {
  generateFirstPreviewImage(
    request: FirstPreviewProviderRequest,
    context: Readonly<{ signal: AbortSignal }>,
  ): Promise<FirstPreviewProviderAdapterResult>;
}

export type FirstPreviewProviderBinding = Readonly<{
  adapter: FirstPreviewProviderAdapter;
  readValidatedUsage(): FirstPreviewValidatedUsage | null;
  readProviderRequestId(): string | null;
}>;
