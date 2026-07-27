import "server-only";

import { createSupabaseAdminClientOrNull } from "../supabase";
import {
  FIRST_PREVIEW_CUSTOMER_ACCESS_SIGNING_SECRET_ENV,
} from "./first-preview-customer-access-contract";
import {
  isInstantFirstPreviewAgentEnabled,
} from "./instant-first-preview-feature-flag";
import {
  readFirstPreviewCustomerView,
  type FirstPreviewCustomerPreviewStateSource,
  type FirstPreviewCustomerView,
  type FirstPreviewCustomerViewRequest,
} from "./first-preview-customer-view";
import {
  createFirstPreviewCustomerViewDatabaseClient,
  createSupabaseFirstPreviewCustomerViewStateSource,
  createUnavailableFirstPreviewCustomerViewStateSource,
} from "./supabase-first-preview-customer-view";

export type FirstPreviewCustomerViewBindingRequest =
  FirstPreviewCustomerViewRequest;

export type FirstPreviewCustomerViewBinding = (
  request: FirstPreviewCustomerViewBindingRequest,
) => Promise<FirstPreviewCustomerView>;

export type FirstPreviewCustomerViewBindingDependencies = Readonly<{
  enabled: boolean;
  signingSecret: string | null;
  clock: () => number;
  stateSource: FirstPreviewCustomerPreviewStateSource;
}>;

function unavailable(): FirstPreviewCustomerView {
  return { state: "unavailable" };
}

function hasUsableSigningSecret(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 4_096 &&
    value.length === value.trim().length &&
    Buffer.byteLength(value, "utf8") >= 32
  );
}

export function createFirstPreviewCustomerViewBinding(
  dependencies: FirstPreviewCustomerViewBindingDependencies,
): FirstPreviewCustomerViewBinding {
  return async (request) => {
    if (
      dependencies.enabled !== true ||
      !hasUsableSigningSecret(dependencies.signingSecret)
    ) {
      return unavailable();
    }
    try {
      return await readFirstPreviewCustomerView(request, {
        clock: dependencies.clock,
        signingSecret: dependencies.signingSecret,
        stateSource: dependencies.stateSource,
      });
    } catch {
      return unavailable();
    }
  };
}

export async function readFirstPreviewCustomerViewBinding(
  request: FirstPreviewCustomerViewBindingRequest,
): Promise<FirstPreviewCustomerView> {
  try {
    if (!isInstantFirstPreviewAgentEnabled()) return unavailable();

    const signingSecret =
      process.env[FIRST_PREVIEW_CUSTOMER_ACCESS_SIGNING_SECRET_ENV] ?? null;
    if (!hasUsableSigningSecret(signingSecret)) return unavailable();

    const supabase = createSupabaseAdminClientOrNull();
    const stateSource = supabase
      ? createSupabaseFirstPreviewCustomerViewStateSource(
          createFirstPreviewCustomerViewDatabaseClient(supabase),
        )
      : createUnavailableFirstPreviewCustomerViewStateSource();

    return createFirstPreviewCustomerViewBinding({
      enabled: true,
      signingSecret,
      clock: () => Math.floor(Date.now() / 1_000),
      stateSource,
    })(request);
  } catch {
    return unavailable();
  }
}
