import "server-only";

import {
  buildCommercialSpecificationSnapshot,
  hashCommercialSpecificationSnapshot,
  normalizeCommercialSpecificationInput,
  prepareCommercialSpecificationConfirmation,
} from "./commercial-specification-confirmation";
import { readCustomerCommercialQuotation } from "./commercial-quotation";
import { isValidFirstPreviewAssetUuid, isValidFirstPreviewPublicReference } from "./ai-sketch/first-preview-generated-assets-contract";

type PreparedSpecification = NonNullable<Awaited<ReturnType<typeof prepareCommercialSpecificationConfirmation>>>;
type Dependencies = Readonly<{
  environment?: Readonly<Record<string, string | undefined>>;
  prepareSpecification?: typeof prepareCommercialSpecificationConfirmation;
  readQuotation?: typeof readCustomerCommercialQuotation;
}>;

// Server-only, default OFF. Ordinary invitation trials exclude these controls.
// A separately approved, non-generating isolated acceptance may reuse stable
// receipt authentication without changing the receipt's owner or namespace.
function enabled(env: Readonly<Record<string, string | undefined>>) {
  if (env.NOVORA_COMMERCIAL_CONFIGURATION_ENABLED !== "true") return false;
  const context = env.NOVORA_COMMERCIAL_CONFIGURATION_CONTEXT;
  if (context === undefined) return env.NOVORA_INVITATION_TRIAL_RECEIPTS_ENABLED === "false";
  if (context !== "isolated_invitation_acceptance_v1") return false;
  const runtime = env === process.env ? process.env.NEXT_RUNTIME : env.NEXT_RUNTIME;
  return runtime === "nodejs" &&
    (env !== process.env || env.NEXT_RUNTIME === undefined || env.NEXT_RUNTIME === runtime) &&
    env.NODE_ENV === "production" && env.NEXT_PHASE !== "phase-production-build" &&
    env.VERCEL === "1" && env.VERCEL_ENV === "preview" &&
    (env.VERCEL_TARGET_ENV ?? env.VERCEL_ENV) === "preview" &&
    env.VERCEL_PROJECT_ID === "prj_H9Di3TIvXiZJHO06WwoaW8RqFfVg" &&
    env.VERCEL_GIT_COMMIT_REF === "integration/instant-first-preview-agent" &&
    /^[a-f0-9]{40}$/.test(env.VERCEL_GIT_COMMIT_SHA ?? "") &&
    /^dpl_[A-Za-z0-9]{16,80}$/.test(env.VERCEL_DEPLOYMENT_ID ?? "") &&
    env.NEXT_PUBLIC_SUPABASE_URL === "https://dibpksbbzjczpjusujwk.supabase.co" &&
    env.NOVORA_INVITATION_TRIAL_RECEIPTS_ENABLED === "true" &&
    /^[a-zA-Z0-9_-]{16,64}$/.test(env.NOVORA_INVITATION_TRIAL_RECEIPT_NAMESPACE ?? "") &&
    env.NOVORA_BETA_ADMISSION_ENABLED === "true" &&
    env.NOVORA_INSTANT_PREVIEW_AGENT_ENABLED === "true" &&
    env.NOVORA_FIRST_PREVIEW_QUEUE_EXECUTION_CONFIRMED === "false" &&
    env.NOVORA_INVITATION_TRIAL_SPENDING_MODE === "disabled" &&
    env.NOVORA_TEST_IMAGE_PACKAGES_ENABLED === "false" &&
    env.NOVORA_PAYPAL_SANDBOX_ENABLED === "false";
}

function specificationHash(prepared: PreparedSpecification): string | null {
  const values = Object.fromEntries(prepared.items.filter(item => item.value.trim()).map(item => [item.key, item.value]));
  const normalized = normalizeCommercialSpecificationInput(values);
  return normalized ? hashCommercialSpecificationSnapshot(buildCommercialSpecificationSnapshot(normalized)) : null;
}

export async function prepareCustomerCommercialConfiguration(
  publicReference: string,
  outputId: string,
  dependencies: Dependencies = {},
) {
  if (!enabled(dependencies.environment ?? process.env) ||
      !isValidFirstPreviewPublicReference(publicReference) || !isValidFirstPreviewAssetUuid(outputId)) return null;
  const prepare = dependencies.prepareSpecification ?? prepareCommercialSpecificationConfirmation;
  const readQuotation = dependencies.readQuotation ?? readCustomerCommercialQuotation;
  try {
    // This performs the real cookie/view authorization; UI test headers or route IDs
    // cannot authorize specification or quotation reads.
    const specification = await prepare(publicReference, outputId);
    if (!specification) return null;
    const expectedHash = specificationHash(specification);
    if (!expectedHash) return null;
    const quotation = specification.confirmed
      ? await readQuotation(publicReference, outputId, undefined, expectedHash)
      : null;
    const current = await prepare(publicReference, outputId);
    if (!current || current.binding !== specification.binding || current.confirmed !== specification.confirmed ||
        specificationHash(current) !== expectedHash) return null;
    return { specification: current, quotation };
  } catch {
    return null;
  }
}
