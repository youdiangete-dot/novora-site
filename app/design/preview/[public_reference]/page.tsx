import { types as nodeUtilTypes } from "node:util";

import Link from "next/link";
import { headers } from "next/headers";

import {
  isValidFirstPreviewAssetUuid,
  isValidFirstPreviewPublicReference,
} from "../../../../lib/server/ai-sketch/first-preview-generated-assets-contract";
import sharedStyles from "../../brief/brief.module.css";
import styles from "./preview.module.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export type CustomerPreviewState =
  | "pending"
  | "ready"
  | "unavailable"
  | "denied";

type TrustedCustomerPreview =
  | Readonly<{ state: "pending" }>
  | Readonly<{
      state: "ready";
      publicReference: string;
      outputId: string;
    }>
  | Readonly<{ state: "unavailable" }>
  | Readonly<{ state: "denied" }>;

type ResolvedCustomerPreview =
  | Readonly<{
      state: "pending" | "unavailable" | "denied";
      publicReference: string | null;
    }>
  | Readonly<{
      state: "ready";
      publicReference: string;
      customerAssetSrc: string;
    }>;

type PreviewPageProps = {
  params: Promise<{
    public_reference: string;
  }>;
};

type StateCopy = Readonly<{
  badge: string;
  title: string;
  lead: string;
  detail: string;
}>;

const INTERNAL_TRUSTED_HEADERS = {
  state: "x-novora-preview-ui-trusted-state",
  reference: "x-novora-preview-ui-trusted-reference",
  output: "x-novora-preview-ui-trusted-output",
} as const;

const COPY: Record<CustomerPreviewState, StateCopy> = {
  pending: {
    badge: "Preparing automatically",
    title: "Your First Preview is being prepared",
    lead:
      "NOVORA has started preparing your first AI hand-drawn concept sketch automatically. Generation and the required automatic gates are still running.",
    detail:
      "You do not need to trigger anything. We cannot promise an exact completion time, and human handling is used only when the system cannot safely converge.",
  },
  ready: {
    badge: "First Preview ready",
    title: "Your early concept direction is ready",
    lead:
      "The first AI hand-drawn concept sketch passed the required automatic safety, privacy, access-control, and output-validity gates for this customer view.",
    detail:
      "Use it to discuss the design direction. It may still need refinement and a later production-feasibility review.",
  },
  unavailable: {
    badge: "Unavailable",
    title: "First Preview unavailable",
    lead:
      "We cannot safely show a First Preview for this link right now.",
    detail:
      "Please return to your submitted Concept Brief receipt or contact NOVORA. No provider, database, storage, or internal error details are disclosed here.",
  },
  denied: {
    badge: "Access unavailable",
    title: "You cannot access this First Preview",
    lead:
      "This customer link cannot open the requested First Preview.",
    detail:
      "Please use the Preview link from your confirmed Concept Brief receipt or contact NOVORA for help.",
  },
};

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
    customerAssetSrc:
      `/api/first-preview-assets/${publicReference}/current`,
  };
}

async function readTrustedTestResult(): Promise<TrustedCustomerPreview | null> {
  if (process.env.NODE_ENV === "production") return null;

  const requestHeaders = await headers();
  const state = requestHeaders.get(INTERNAL_TRUSTED_HEADERS.state);
  if (
    state === "pending" ||
    state === "unavailable" ||
    state === "denied"
  ) {
    return { state };
  }
  if (state !== "ready") return null;

  return {
    state,
    publicReference:
      requestHeaders.get(INTERNAL_TRUSTED_HEADERS.reference) ?? "",
    outputId: requestHeaders.get(INTERNAL_TRUSTED_HEADERS.output) ?? "",
  };
}

export default async function CustomerPreviewPage({
  params,
}: PreviewPageProps) {
  const { public_reference: routePublicReference } = await params;
  const trustedResult = await readTrustedTestResult();
  const preview = resolveCustomerPreview(
    routePublicReference,
    trustedResult,
  );
  const stateCopy = COPY[preview.state];

  return (
    <main className={sharedStyles.pageBackground}>
      <section className={`${sharedStyles.shell} ${styles.previewShell}`}>
        <header className={styles.hero}>
          <div>
            <p className={sharedStyles.eyebrow}>NOVORA First Preview</p>
            <h1>Customer First Preview</h1>
            <p className={styles.heroLead}>
              A private early concept view for your submitted design direction.
            </p>
          </div>
          <div className={styles.referenceCard}>
            <span>Customer reference</span>
            <strong>
              {preview.publicReference ?? "Reference unavailable"}
            </strong>
          </div>
        </header>

        <section
          className={`${styles.statusCard} ${styles[preview.state]}`}
          aria-labelledby="preview-status-heading"
          role="status"
        >
          <span className={styles.statusBadge}>{stateCopy.badge}</span>
          <h2 id="preview-status-heading">{stateCopy.title}</h2>
          <p>{stateCopy.lead}</p>
          <p>{stateCopy.detail}</p>
        </section>

        {preview.state === "ready" ? (
          <section
            className={styles.previewCard}
            aria-labelledby="concept-preview-heading"
          >
            <div className={styles.sectionHeading}>
              <div>
                <p className={sharedStyles.eyebrow}>Concept direction</p>
                <h2 id="concept-preview-heading">
                  AI hand-drawn concept sketch
                </h2>
              </div>
              <span>Early preview</span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={styles.previewImage}
              src={preview.customerAssetSrc}
              alt="Early AI hand-drawn jewelry concept sketch for the submitted NOVORA design direction"
            />
            <p className={styles.imageNote}>
              This visual is an early communication asset. Details, structure,
              gemstone orientation, and construction may change during later
              refinement and production-feasibility review.
            </p>
          </section>
        ) : null}

        <section
          className={styles.boundaryCard}
          aria-labelledby="preview-boundary-heading"
        >
          <p className={sharedStyles.eyebrow}>What this Preview means</p>
          <h2 id="preview-boundary-heading">
            Concept communication before paid CAD
          </h2>
          <p>
            A First Preview is an early AI hand-drawn concept sketch. It is not
            CAD, a final quote, an order, payment approval, production approval,
            or a manufacturability guarantee.
          </p>
          <p>
            A confirmed persisted receipt or opening this route alone does not
            mean generation has started. Automatic First Preview preparation can
            begin only when NOVORA enables the live workflow for this submission.
            A trusted customer-view state and all mandatory gates are required
            before website visibility. The normal unavailable state is not
            evidence of active generation, and current Production may safely
            keep this route unavailable.
          </p>
          <ul>
            {preview.state !== "denied" ? (
              <li>
                When the live workflow is enabled for a confirmed submission,
                automatic First Preview preparation uses mandatory safety,
                privacy, access-control, output-validity, and safe-failure gates.
              </li>
            ) : null}
            <li>
              Website visibility occurs only after a trusted customer-view
              state and every required automatic gate pass.
            </li>
            <li>
              Human intervention during automatic First Preview preparation is
              exception-only when the automatic preparation system cannot safely
              converge; no per-image human pre-approval is required.
            </li>
            <li>
              After the First Preview, structural logic, gemstone orientation,
              composition, jewelry construction, manufacturability, correction
              and regeneration, and customer-feedback interpretation remain
              human-reviewed.
            </li>
            <li>
              Paid CAD and formal production decisions happen later; these
              steps, along with gemstone and material confirmation, quotation,
              order, and payment decisions, remain human-controlled.
            </li>
          </ul>
        </section>

        <nav className={styles.actions} aria-label="Preview actions">
          <Link href="/design/submitted">Back to submitted receipt</Link>
          <Link href="/design/start">Start another design direction</Link>
        </nav>
      </section>
    </main>
  );
}
