import Link from 'next/link';

import sharedStyles from '../../brief/brief.module.css';
import styles from './preview.module.css';

type FirstPreviewCustomerView = Awaited<
  ReturnType<
    typeof import('../../../../lib/server/ai-sketch/first-preview-customer-view').readFirstPreviewCustomerView
  >
>;

type PreviewPageProps = {
  params: Promise<{
    public_reference: string;
  }>;
};

type PreviewStateContentProps = {
  publicReference: string;
  view: FirstPreviewCustomerView;
};

const PUBLIC_REFERENCE_PATTERN = /^NOVORA-CB-\d{8}-[A-Z0-9]{4}$/;
const ASSET_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readRouteReference(rawReference: string): string | null {
  if (typeof rawReference !== 'string' || rawReference.length > 64) {
    return null;
  }

  try {
    const publicReference = decodeURIComponent(rawReference);
    return PUBLIC_REFERENCE_PATTERN.test(publicReference) ? publicReference : null;
  } catch {
    return null;
  }
}

async function readAuthorizedCustomerView(): Promise<FirstPreviewCustomerView> {
  // The exact integration baseline has no authorized Production adapter for
  // readFirstPreviewCustomerView(). This presentation slice must not construct
  // signing, clock, Cookie, Supabase, or customer-state dependencies.
  return { state: 'unavailable' };
}

function constrainViewToRoute(
  view: FirstPreviewCustomerView,
  publicReference: string,
): FirstPreviewCustomerView {
  if (
    view.state === 'ready' &&
    (view.assetRequest.publicReference !== publicReference ||
      !ASSET_UUID_PATTERN.test(view.assetRequest.outputId))
  ) {
    return { state: 'denied' };
  }

  return view;
}

function ConceptBoundary() {
  return (
    <section className={styles.boundaryPanel} aria-labelledby="concept-boundary-heading">
      <p className={sharedStyles.eyebrow}>Early concept boundary</p>
      <h2 id="concept-boundary-heading">A First Preview is a starting point</h2>
      <p>
        This is an early AI hand-drawn concept sketch for exploring a design direction. It is not CAD, a quotation,
        payment confirmation, an order, production approval, or a manufacturability guarantee.
      </p>
      <ul>
        <li>Not CAD</li>
        <li>Not a quotation</li>
        <li>Not payment confirmation</li>
        <li>Not an order</li>
        <li>Not production approval</li>
        <li>Not a manufacturability guarantee</li>
      </ul>
    </section>
  );
}

function PreviewStateContent({ publicReference, view }: PreviewStateContentProps) {
  if (view.state === 'pending') {
    return (
      <section className={styles.statePanel} aria-labelledby="preview-state-heading" aria-live="polite">
        <span className={styles.statusBadge}>Preparing your preview</span>
        <h2 id="preview-state-heading">Your First Preview is being prepared</h2>
        <p>
          NOVORA is generating your early AI hand-drawn concept sketch and completing the automatic safety, privacy,
          customer-isolation, asset-validity, and lifecycle checks.
        </p>
        <p>
          The page will show the preview only when those automatic checks pass. Failed, unsafe, ambiguous, complex,
          low-confidence, or correction cases may require human handling.
        </p>
        <div className={styles.actions}>
          <a
            className={sharedStyles.primaryButton}
            href={`/design/preview/${encodeURIComponent(publicReference)}`}
          >
            Refresh status
          </a>
          <Link className={sharedStyles.secondaryButton} href="/design/start">
            Back to design start
          </Link>
        </div>
      </section>
    );
  }

  if (view.state === 'ready') {
    const assetPath = `/api/first-preview-assets/${encodeURIComponent(
      view.assetRequest.publicReference,
    )}/${encodeURIComponent(view.assetRequest.outputId)}`;

    return (
      <>
        <section className={styles.statePanel} aria-labelledby="preview-state-heading" aria-live="polite">
          <span className={styles.statusBadge}>First Preview ready</span>
          <h2 id="preview-state-heading">Your First Preview is ready</h2>
          <p>
            The required automatic gates passed for this exact customer preview. You can now view the early concept
            direction directly on the website.
          </p>
        </section>
        <section className={styles.imagePanel} aria-labelledby="preview-image-heading">
          <div className={styles.sectionHeading}>
            <p className={sharedStyles.eyebrow}>AI hand-drawn concept sketch</p>
            <h2 id="preview-image-heading">Your first concept direction</h2>
          </div>
          <div className={styles.imageFrame}>
            <img
              className={styles.previewImage}
              src={assetPath}
              alt="AI hand-drawn concept sketch for your NOVORA First Preview"
              aria-describedby="ready-preview-boundary"
            />
          </div>
          <p className={styles.imageNote} id="ready-preview-boundary">
            This protected image is an early concept preview only. It is not CAD, a quotation, payment confirmation,
            an order, production approval, or a manufacturability guarantee.
          </p>
          <div className={styles.actions}>
            <Link className={sharedStyles.secondaryButton} href="/design/start">
              Back to design start
            </Link>
          </div>
        </section>
      </>
    );
  }

  if (view.state === 'unavailable') {
    return (
      <section className={styles.statePanel} aria-labelledby="preview-state-heading" aria-live="polite">
        <span className={styles.statusBadge}>Preview unavailable</span>
        <h2 id="preview-state-heading">Your First Preview cannot be shown right now</h2>
        <p>
          We cannot safely show a preview at this time. NOVORA may use the contact details already provided for
          exception or correction follow-up.
        </p>
        <p>
          Please return to your Concept Brief if you need to review your information. No further action is required
          here.
        </p>
        <div className={styles.actions}>
          <Link className={sharedStyles.primaryButton} href="/design/brief">
            Return to Concept Brief
          </Link>
          <Link className={sharedStyles.secondaryButton} href="/design/start">
            Back to design start
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.statePanel} aria-labelledby="preview-state-heading" aria-live="polite">
      <span className={styles.statusBadge}>Link unavailable</span>
      <h2 id="preview-state-heading">This preview link is unavailable</h2>
      <p>
        We cannot open a First Preview from this link. For privacy, this page cannot provide more information.
      </p>
      <div className={styles.actions}>
        <Link className={sharedStyles.primaryButton} href="/design/start">
          Back to design start
        </Link>
      </div>
    </section>
  );
}

export default async function CustomerPreviewPage({ params }: PreviewPageProps) {
  const { public_reference: rawPublicReference } = await params;
  const publicReference = readRouteReference(rawPublicReference);

  let view: FirstPreviewCustomerView = { state: 'denied' };
  if (publicReference) {
    try {
      view = constrainViewToRoute(await readAuthorizedCustomerView(), publicReference);
    } catch {
      view = { state: 'unavailable' };
    }
  }

  return (
    <main className={sharedStyles.pageBackground}>
      <section className={`${sharedStyles.shell} ${styles.previewShell}`}>
        <div className={styles.layout}>
          <header className={styles.hero}>
            <p className={sharedStyles.eyebrow}>NOVORA First Preview</p>
            <h1>Your NOVORA First Preview</h1>
            <p>
              The first AI hand-drawn concept sketch is generated automatically after a confirmed Concept Brief and
              becomes visible here only when the required automatic gates pass.
            </p>
          </header>

          <PreviewStateContent publicReference={publicReference ?? ''} view={view} />
          <ConceptBoundary />
        </div>
      </section>
    </main>
  );
}
