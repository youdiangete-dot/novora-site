import Link from 'next/link';

import type { FirstPreviewCustomerView } from '../../../../lib/server/ai-sketch/first-preview-customer-view';
import sharedStyles from '../../brief/brief.module.css';
import styles from './preview.module.css';

type PreviewPageProps = {
  params: Promise<{
    public_reference: string;
  }>;
};

type BoundPreviewView =
  | Readonly<{ state: 'pending'; publicReference: string }>
  | Readonly<{
      state: 'ready';
      publicReference: string;
      assetPath: string;
    }>
  | Readonly<{ state: 'unavailable' }>
  | Readonly<{ state: 'denied' }>;

const PUBLIC_REFERENCE_PATTERN = /^NOVORA-CB-\d{8}-[A-Z0-9]{4}$/;
const OUTPUT_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const UNAVAILABLE_CUSTOMER_VIEW: FirstPreviewCustomerView = { state: 'unavailable' };

function validateRoutePublicReference(value: unknown): string | null {
  if (
    typeof value !== 'string' ||
    value.length > 64 ||
    /[%/\u0000-\u001f\u007f\s]/.test(value) ||
    !PUBLIC_REFERENCE_PATTERN.test(value)
  ) {
    return null;
  }

  return value;
}

function bindTrustedCustomerView(
  publicReference: string,
  trustedCustomerView: FirstPreviewCustomerView,
): BoundPreviewView {
  try {
    if (trustedCustomerView.state === 'pending') {
      return { state: 'pending', publicReference };
    }

    if (trustedCustomerView.state === 'ready') {
      const { outputId, publicReference: readyPublicReference } = trustedCustomerView.assetRequest;

      if (
        readyPublicReference !== publicReference ||
        !OUTPUT_UUID_PATTERN.test(outputId)
      ) {
        return { state: 'denied' };
      }

      return {
        state: 'ready',
        publicReference,
        assetPath: `/api/first-preview-assets/${encodeURIComponent(publicReference)}/${encodeURIComponent(outputId)}`,
      };
    }

    if (trustedCustomerView.state === 'unavailable') {
      return { state: 'unavailable' };
    }

    return { state: 'denied' };
  } catch {
    return { state: 'denied' };
  }
}

function ProductBoundary() {
  return (
    <section className={styles.boundaryPanel} aria-labelledby="preview-boundary-heading">
      <p className={sharedStyles.eyebrow}>Early concept boundary</p>
      <h2 id="preview-boundary-heading">An AI hand-drawn concept sketch, not a production decision</h2>
      <p>
        First Preview is an early concept direction. It is not CAD, a quotation, payment confirmation, an order,
        production approval, or a manufacturability guarantee.
      </p>
      <p>
        Paid CAD, pricing, sourcing, construction review, manufacturability, and formal production decisions happen
        later through human-led follow-up.
      </p>
    </section>
  );
}

function PendingPreview({ publicReference }: { publicReference: string }) {
  const refreshHref = `/design/preview/${encodeURIComponent(publicReference)}`;

  return (
    <section className={styles.statusPanel} aria-labelledby="preview-state-heading" role="status">
      <span className={styles.statusBadge}>Preparing safely</span>
      <h2 id="preview-state-heading">Your First Preview is being prepared</h2>
      <p>
        NOVORA is preparing the first AI hand-drawn concept sketch. It becomes visible here only after automatic
        safety, privacy, customer-isolation, asset-validity, and lifecycle gates pass.
      </p>
      <p>
        There is no estimated completion percentage or guaranteed completion time. Failed, unsafe, ambiguous, complex,
        low-confidence, or correction cases may require human handling.
      </p>
      <Link
        aria-label={`Refresh First Preview status for ${publicReference}`}
        className={sharedStyles.secondaryButton}
        href={refreshHref}
      >
        Refresh status
      </Link>
    </section>
  );
}

function ReadyPreview({
  assetPath,
  publicReference,
}: {
  assetPath: string;
  publicReference: string;
}) {
  return (
    <section className={styles.readyPanel} aria-labelledby="preview-state-heading">
      <div className={styles.readyHeading}>
        <span className={styles.statusBadge}>First Preview ready</span>
        <h2 id="preview-state-heading">Your first concept direction is ready to view</h2>
        <p>
          The required automatic gates passed for this customer-safe website view. Human handling may still be needed
          later for structural logic, gemstone orientation, composition, construction, correction, or
          manufacturability review.
        </p>
      </div>
      <figure className={styles.imageFrame}>
        <img
          alt={`AI hand-drawn concept sketch for ${publicReference}`}
          className={styles.previewImage}
          src={assetPath}
        />
        <figcaption>
          First Preview is an early visual direction. It does not approve CAD, pricing, payment, an order, production,
          or manufacturability.
        </figcaption>
      </figure>
    </section>
  );
}

function UnavailablePreview() {
  return (
    <section className={styles.statusPanel} aria-labelledby="preview-state-heading" role="status">
      <span className={styles.statusBadge}>Unavailable</span>
      <h2 id="preview-state-heading">First Preview is unavailable</h2>
      <p>
        We cannot show a preview here right now. This page does not confirm whether a preview or customer record exists,
        and it does not expose technical or resource details.
      </p>
      <p>Please return to your confirmed receipt or contact NOVORA if you need help with your Concept Brief.</p>
    </section>
  );
}

function DeniedPreview() {
  return (
    <section className={styles.statusPanel} aria-labelledby="preview-state-heading" role="status">
      <span className={styles.statusBadge}>Unable to display</span>
      <h2 id="preview-state-heading">We cannot display this First Preview</h2>
      <p>
        Use the First Preview link from your confirmed Concept Brief receipt. NOVORA cannot provide additional details
        from this page.
      </p>
    </section>
  );
}

export default async function CustomerPreviewPage({
  params,
}: PreviewPageProps, trustedCustomerView: FirstPreviewCustomerView = UNAVAILABLE_CUSTOMER_VIEW) {
  const { public_reference: rawPublicReference } = await params;
  const publicReference = validateRoutePublicReference(rawPublicReference);
  const view = publicReference
    ? bindTrustedCustomerView(publicReference, trustedCustomerView)
    : ({ state: 'denied' } as const);

  return (
    <main className={sharedStyles.pageBackground}>
      <section className={`${sharedStyles.shell} ${styles.previewShell}`}>
        <div className={styles.layout}>
          <header className={styles.hero}>
            <p className={sharedStyles.eyebrow}>NOVORA First Preview</p>
            <h1>Customer First Preview</h1>
            <p>
              Confirmed receipt starts generation automatically. The first AI hand-drawn concept sketch becomes
              visible directly on the website after the required automatic gates pass.
            </p>
          </header>

          {view.state === 'pending' ? <PendingPreview publicReference={view.publicReference} /> : null}
          {view.state === 'ready' ? (
            <ReadyPreview assetPath={view.assetPath} publicReference={view.publicReference} />
          ) : null}
          {view.state === 'unavailable' ? <UnavailablePreview /> : null}
          {view.state === 'denied' ? <DeniedPreview /> : null}

          <ProductBoundary />

          <nav className={styles.actionsPanel} aria-label="First Preview navigation">
            <Link className={sharedStyles.primaryButton} href="/design/submitted">
              Return to submitted receipt
            </Link>
            <Link className={sharedStyles.secondaryButton} href="/design/start">
              Back to design start
            </Link>
          </nav>
        </div>
      </section>
    </main>
  );
}
