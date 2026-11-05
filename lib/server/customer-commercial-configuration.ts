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

// Server-only, default OFF. Invitation trials always exclude commercial controls.
// Activation requires both NOVORA_COMMERCIAL_CONFIGURATION_ENABLED=true and
// NOVORA_INVITATION_TRIAL_RECEIPTS_ENABLED=false in a separately approved environment.
function enabled(env: Readonly<Record<string, string | undefined>>) {
  return env.NOVORA_COMMERCIAL_CONFIGURATION_ENABLED === "true" &&
    env.NOVORA_INVITATION_TRIAL_RECEIPTS_ENABLED === "false";
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
