import { types as nodeUtilTypes } from "node:util";

import Link from "next/link";
import { headers } from "next/headers";

import {
  isValidFirstPreviewAssetUuid,
  isValidFirstPreviewPublicReference,
} from "../../../../lib/server/ai-sketch/first-preview-generated-assets-contract";
import { FIRST_PREVIEW_CUSTOMER_ACCESS_SIGNING_SECRET_ENV } from "../../../../lib/server/ai-sketch/first-preview-customer-access-contract";
import { createFirstPreviewCustomerDesignConfirmationBinding } from "../../../../lib/server/ai-sketch/first-preview-customer-design-confirmation";
import { createFirstPreviewCustomerFeedbackBinding } from "../../../../lib/server/ai-sketch/first-preview-customer-feedback";
import { prepareCommercialSpecificationConfirmation } from "../../../../lib/server/commercial-specification-confirmation";
import { readCustomerCommercialQuotation } from "../../../../lib/server/commercial-quotation";
import { prepareCommercialPayment } from "../../../../lib/server/commercial-payment";
import sharedStyles from "../../brief/brief.module.css";
import CommercialPayment from "./CommercialPayment";
import CommercialQuotation from "./CommercialQuotation";
import CommercialSpecificationConfirmation from "./CommercialSpecificationConfirmation";
import FirstPreviewDesignConfirmation from "./FirstPreviewDesignConfirmation";
import FirstPreviewFeedbackForm from "./FirstPreviewFeedbackForm";
import styles from "./preview.module.css";
import { getRequestI18n } from '../../../../lib/i18n/request';
import { localizePath } from '../../../../lib/i18n/routing';

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
      outputId: string;
      customerAssetSrc: string;
    }>;

type PreviewPageProps = {
  params: Promise<{
    public_reference: string;
  }>;
};

const INTERNAL_TRUSTED_HEADERS = {
  state: "x-novora-preview-ui-trusted-state",
  reference: "x-novora-preview-ui-trusted-reference",
  output: "x-novora-preview-ui-trusted-output",
} as const;

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

async function readTrustedCustomerPreview(
  publicReference: string,
): Promise<TrustedCustomerPreview> {
  const focusedTestResult = await readTrustedTestResult();
  if (focusedTestResult) return focusedTestResult;

  const { readFirstPreviewCustomerViewBinding } = await import(
    "../../../../lib/server/ai-sketch/first-preview-customer-view-binding"
  );
  const customerView = await readFirstPreviewCustomerViewBinding({
    publicReference,
  });
  if (customerView.state !== "ready") {
    return { state: customerView.state };
  }

  return {
    state: "ready",
    publicReference: customerView.assetRequest.publicReference,
    outputId: customerView.assetRequest.outputId,
  };
}

export default async function CustomerPreviewPage({
  params,
}: PreviewPageProps) {
  const { dictionary, locale } = await getRequestI18n();
  const copy = dictionary.firstPreview;
  const legalCopy = dictionary.legalDisclaimer;
  const accessibilityCopy = dictionary.accessibility;
  const { public_reference: routePublicReference } = await params;
  const trustedResult = await readTrustedCustomerPreview(routePublicReference);
  const preview = resolveCustomerPreview(
    routePublicReference,
    trustedResult,
  );
  const stateCopy = copy.states[preview.state];
  const feedbackBinding = preview.state === "ready"
    ? createFirstPreviewCustomerFeedbackBinding(
        {
          publicReference: preview.publicReference,
          outputId: preview.outputId,
        },
        process.env[FIRST_PREVIEW_CUSTOMER_ACCESS_SIGNING_SECRET_ENV] ?? "",
      )
    : null;
  const confirmationBinding = preview.state === "ready"
    ? createFirstPreviewCustomerDesignConfirmationBinding(
        {
          publicReference: preview.publicReference,
          outputId: preview.outputId,
        },
        process.env[FIRST_PREVIEW_CUSTOMER_ACCESS_SIGNING_SECRET_ENV] ?? "",
      )
    : null;
  const commercialSpecification = preview.state === "ready"
    ? await prepareCommercialSpecificationConfirmation(
        preview.publicReference,
        preview.outputId,
      )
    : null;
  const commercialQuotation = preview.state === "ready"
    ? await readCustomerCommercialQuotation(
        preview.publicReference,
        preview.outputId,
      )
    : null;
  const commercialPayment = preview.state === "ready" && commercialQuotation
    ? await prepareCommercialPayment(
        preview.publicReference,
        preview.outputId,
        commercialQuotation,
      )
    : null;

  return (
    <main className={sharedStyles.pageBackground}>
      <section className={`${sharedStyles.shell} ${styles.previewShell}`}>
        <header className={styles.hero}>
          <div>
            <p className={sharedStyles.eyebrow}>{copy.fp001}</p>
            <h1>{copy.fp002}</h1>
            <p className={styles.heroLead}>
              {copy.fp003}</p>
          </div>
          <div className={styles.referenceCard}>
            <span>{copy.fp004}</span>
            <strong>
              {preview.publicReference ?? copy.fp005}
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
          <>
            <section className={styles.previewCard} aria-labelledby="concept-preview-heading">
              <div className={styles.sectionHeading}>
                <div>
                  <p className={sharedStyles.eyebrow}>{copy.fp006}</p>
                  <h2 id="concept-preview-heading">
                    {copy.fp007}</h2>
                </div>
                <span>{copy.fp008}</span>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className={styles.previewImage}
                src={preview.customerAssetSrc}
                alt={copy.fp009}
              />
              <p className={styles.imageNote}>
                {copy.fp010}</p>
            </section>
            {confirmationBinding ? (
              <FirstPreviewDesignConfirmation
                confirmationBinding={confirmationBinding}
                publicReference={preview.publicReference}
              />
            ) : null}
            {commercialSpecification ? (
              <CommercialSpecificationConfirmation
                confirmationBinding={commercialSpecification.binding}
                items={commercialSpecification.items}
                publicReference={preview.publicReference}
              />
            ) : null}
            {commercialQuotation ? (
              <CommercialQuotation quotation={commercialQuotation} />
            ) : null}
            {commercialPayment ? (
              <CommercialPayment
                binding={commercialPayment.binding}
                initialPayment={commercialPayment.payment}
                providerConfigured={commercialPayment.providerConfigured}
                publicReference={preview.publicReference}
              />
            ) : null}
            {feedbackBinding ? (
              <FirstPreviewFeedbackForm
                feedbackBinding={feedbackBinding}
                publicReference={preview.publicReference}
              />
            ) : null}
          </>
        ) : null}

        <section
          className={styles.boundaryCard}
          aria-labelledby="preview-boundary-heading"
        >
          <p className={sharedStyles.eyebrow}>{copy.fp011}</p>
          <h2 id="preview-boundary-heading">
            {copy.fp012}</h2>
          <p>
            {legalCopy.firstPreviewBoundary}</p>
          <p>
            {copy.fp014}</p>
          <ul>
            {preview.state !== "denied" ? (
              <li>
                {copy.fp015}</li>
            ) : null}
            <li>
              {copy.fp016}</li>
            <li>
              {copy.fp017}</li>
            <li>
              {copy.fp018}</li>
            <li>
              {copy.fp019}</li>
          </ul>
        </section>

        <nav className={styles.actions} aria-label={accessibilityCopy.previewActions}>
          <Link href={localizePath('/design/submitted', locale)}>{copy.fp021}</Link>
          <Link href={localizePath('/design/start', locale)}>{copy.fp022}</Link>
        </nav>
      </section>
    </main>
  );
}
