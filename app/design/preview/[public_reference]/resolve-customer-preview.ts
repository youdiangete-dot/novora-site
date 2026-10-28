import { types as nodeUtilTypes } from "node:util";
import { isValidFirstPreviewAssetUuid, isValidFirstPreviewPublicReference } from "../../../../lib/server/ai-sketch/first-preview-generated-assets-contract";

type ResolvedCustomerPreview =
  | Readonly<{
      state: "pending" | "unavailable" | "denied";
      publicReference: string | null;
    }>
  | Readonly<{
      state: "ready";
      publicReference: string;
      outputId: string;
      customerAssetSrc: string;
    }>;

function snapshotOwnDataRecord(
  value: unknown,
  allowedKeys: readonly string[],
): Record<string, unknown> | null {
  try {
    if (
      (typeof value === "object" || typeof value === "function") &&
      value !== null &&
      nodeUtilTypes.isProxy(value)
    ) {
      return null;
    }
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return null;
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;

    const ownKeys = Reflect.ownKeys(value);
    if (
      ownKeys.some(
        (key) => typeof key !== "string" || !allowedKeys.includes(key),
      )
    ) {
      return null;
    }

    const snapshot: Record<string, unknown> = Object.create(null);
    for (const key of ownKeys) {
      if (typeof key !== "string") return null;
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (
        !descriptor ||
        descriptor.enumerable !== true ||
        !Object.prototype.hasOwnProperty.call(descriptor, "value") ||
        Object.prototype.hasOwnProperty.call(descriptor, "get") ||
        Object.prototype.hasOwnProperty.call(descriptor, "set")
      ) {
        return null;
      }
      snapshot[key] = descriptor.value;
    }
    return snapshot;
  } catch {
    return null;
  }
}

function hasExactKeys(
  snapshot: Record<string, unknown>,
  keys: readonly string[],
) {
  const actual = Object.keys(snapshot).sort();
  const expected = [...keys].sort();
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  );
}

function safePublicReference(value: unknown): string | null {
  return (
    typeof value === "string" &&
    value.length <= 27 &&
    isValidFirstPreviewPublicReference(value)
  )
    ? value
    : null;
}

export function resolveCustomerPreview(
  routePublicReference: unknown,
  trustedResult: unknown,
): ResolvedCustomerPreview {
  const publicReference = safePublicReference(routePublicReference);
  if (publicReference === null) {
    return { state: "unavailable", publicReference: null };
  }

  const trusted = snapshotOwnDataRecord(trustedResult, [
    "state",
    "publicReference",
    "outputId",
  ]);
  if (!trusted || typeof trusted.state !== "string") {
    return { state: "unavailable", publicReference };
  }

  if (
    (trusted.state === "pending" ||
      trusted.state === "unavailable" ||
      trusted.state === "denied") &&
    hasExactKeys(trusted, ["state"])
  ) {
    return { state: trusted.state, publicReference };
  }

  if (
    trusted.state !== "ready" ||
    !hasExactKeys(trusted, ["state", "publicReference", "outputId"]) ||
    trusted.publicReference !== publicReference ||
    typeof trusted.outputId !== "string" ||
    !isValidFirstPreviewAssetUuid(trusted.outputId)
  ) {
    return { state: "unavailable", publicReference };
  }

  return {
    state: "ready",
    publicReference,
    outputId: trusted.outputId,
    customerAssetSrc:
      `/api/first-preview-assets/${encodeURIComponent(publicReference)}/${encodeURIComponent(trusted.outputId)}`,
  };
}
