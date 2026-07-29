'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import submittedStyles from './submitted.module.css';
import styles from '../brief/brief.module.css';

type StartSelection = {
  pieceType?: string;
  pieceTypeLabel?: string;
  recipient?: string;
  recipientLabel?: string;
  style?: string;
  styleLabel?: string;
  budget?: string;
};

type SummaryItem = {
  label: string;
  value: string;
};

type SubmittedConceptBrief = {
  conceptBriefId: string;
  localConceptBriefId?: string;
  publicReference?: string;
  submittedAt: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerCountry?: string;
  contactNote?: string;
  startSelection?: StartSelection;
  summaryItems?: SummaryItem[];
  pieceType?: string;
  branch?: string;
  structure?: string;
  subStructure?: string;
  stoneLogic?: string;
  referenceImageCount?: number;
  referenceImageNames?: string[];
  referenceNotes?: string;
  referenceUpload?: {
    uploaded?: boolean;
    message?: string;
    uploadedCount?: number;
    fileNames?: string[];
  };
  aiSketchInstruction?: string;
  apiSubmission?: {
    persisted?: boolean;
    publicReference?: string;
    conceptBriefId?: string;
  };
};

const SUBMITTED_BRIEF_STORAGE_KEY = 'novora_submitted_concept_brief';
const SERVER_RECEIPT_WARNING =
  'We could not confirm server receipt. Your brief is still saved in this browser. Please try again in a moment or contact NOVORA.';
const MOCK_PREVIEW_PUBLIC_REFERENCE = 'NOVORA-CB-MOCK-001';
const MOCK_PREVIEW_STATE = 'first_preview_ready';
const MOCK_PREVIEW_HREF = `/design/preview/${MOCK_PREVIEW_PUBLIC_REFERENCE}?state=${MOCK_PREVIEW_STATE}`;

type ConfirmedSubmittedConceptBrief = SubmittedConceptBrief & {
  apiSubmission: {
    persisted: true;
    publicReference: string;
    conceptBriefId: string;
  };
};

type OrdinaryObject = Record<PropertyKey, unknown>;

function isOrdinaryObject(value: unknown): value is OrdinaryObject {
  try {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      return false;
    }

    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
}

function getEnumerableOwnDataValue(object: OrdinaryObject, property: PropertyKey): unknown | undefined {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(object, property);

    if (!descriptor?.enumerable || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
      return undefined;
    }

    return descriptor.value;
  } catch {
    return undefined;
  }
}

function hasConfirmedServerReceipt(submittedBrief: unknown): submittedBrief is ConfirmedSubmittedConceptBrief {
  if (!isOrdinaryObject(submittedBrief)) {
    return false;
  }

  const apiSubmission = getEnumerableOwnDataValue(submittedBrief, 'apiSubmission');

  if (!isOrdinaryObject(apiSubmission)) {
    return false;
  }

  const persisted = getEnumerableOwnDataValue(apiSubmission, 'persisted');
  const publicReference = getEnumerableOwnDataValue(apiSubmission, 'publicReference');
  const conceptBriefId = getEnumerableOwnDataValue(apiSubmission, 'conceptBriefId');

  return (
    persisted === true &&
    typeof publicReference === 'string' &&
    /^NOVORA-CB-\d{8}-[A-Z0-9]{4}$/.test(publicReference) &&
    typeof conceptBriefId === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(conceptBriefId)
  );
}

function formatSubmittedTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function DesignSubmittedPage() {
  const [submittedBrief, setSubmittedBrief] = useState<unknown>(null);
  const [hasStoredBrief, setHasStoredBrief] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const rawBrief = window.localStorage.getItem(SUBMITTED_BRIEF_STORAGE_KEY);

      if (rawBrief !== null) {
        setHasStoredBrief(true);
        setSubmittedBrief(JSON.parse(rawBrief) as unknown);
      }
    } catch {
      setSubmittedBrief(null);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  if (!isLoaded) {
    return <main className={styles.pageBackground} />;
  }

  if (!hasStoredBrief) {
    return (
      <main className={styles.pageBackground}>
        <section className={`${styles.shell} ${styles.emptyShell}`}>
          <div className={styles.emptyPanel}>
            <p className={styles.eyebrow}>Concept brief submitted</p>
            <h1>No submitted concept brief found</h1>
            <p>
              Start a new concept intake so NOVORA can organize your design direction for studio review and follow-up.
            </p>
            <Link className={styles.primaryButton} href="/design/start">
              Back to design start
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (!hasConfirmedServerReceipt(submittedBrief)) {
    return (
      <main className={styles.pageBackground}>
        <section className={`${styles.shell} ${styles.emptyShell}`}>
          <div className={styles.emptyPanel}>
            <p className={styles.eyebrow}>Concept brief</p>
            <h1>Server receipt not confirmed</h1>
            <p>{SERVER_RECEIPT_WARNING}</p>
            <Link className={styles.primaryButton} href="/design/brief">
              Back to concept brief
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const displayedConceptBriefId = submittedBrief.apiSubmission.publicReference;

  return (
    <main className={styles.pageBackground}>
      <section className={`${styles.shell} ${styles.submittedShell}`}>
        <div className={styles.submittedPanel}>
          <p className={styles.eyebrow}>Concept brief submitted</p>
          <h1>Concept brief received</h1>
          <p className={styles.successLead}>
            NOVORA received your Concept Brief for studio review and may follow up using the contact details you
            provided.
          </p>

          <dl className={styles.submittedDetails}>
            <div>
              <dt>Concept Brief ID</dt>
              <dd>{displayedConceptBriefId}</dd>
            </div>
            <div>
              <dt>Submitted time</dt>
              <dd>{formatSubmittedTime(submittedBrief.submittedAt)}</dd>
            </div>
            <div>
              <dt>Customer name</dt>
              <dd>{submittedBrief.customerName || 'Not provided'}</dd>
            </div>
            <div>
              <dt>Customer email</dt>
              <dd>{submittedBrief.customerEmail || 'Not provided'}</dd>
            </div>
          </dl>

          {(submittedBrief.customerPhone || submittedBrief.customerCountry || submittedBrief.contactNote) ? (
            <section className={styles.boundaryCard}>
              <h2>Contact details</h2>
              <dl className={styles.submittedDetails}>
                {submittedBrief.customerPhone ? (
                  <div>
                    <dt>Phone or WhatsApp</dt>
                    <dd>{submittedBrief.customerPhone}</dd>
                  </div>
                ) : null}
                {submittedBrief.customerCountry ? (
                  <div>
                    <dt>Country / region</dt>
                    <dd>{submittedBrief.customerCountry}</dd>
                  </div>
                ) : null}
                {submittedBrief.contactNote ? (
                  <div>
                    <dt>Contact note</dt>
                    <dd>{submittedBrief.contactNote}</dd>
                  </div>
                ) : null}
              </dl>
            </section>
          ) : null}

          {submittedBrief.startSelection ? (
            <section className={styles.boundaryCard}>
              <h2>Design start summary</h2>
              <dl className={styles.submittedDetails}>
                {submittedBrief.startSelection.recipientLabel ? (
                  <div>
                    <dt>Recipient</dt>
                    <dd>{submittedBrief.startSelection.recipientLabel}</dd>
                  </div>
                ) : null}
                {submittedBrief.startSelection.styleLabel ? (
                  <div>
                    <dt>Start style preference</dt>
                    <dd>{submittedBrief.startSelection.styleLabel}</dd>
                  </div>
                ) : null}
                {submittedBrief.startSelection.budget ? (
                  <div>
                    <dt>Budget planning range</dt>
                    <dd>{submittedBrief.startSelection.budget}</dd>
                  </div>
                ) : null}
              </dl>
              <p>
                These selections guide the concept direction only. They are not final pricing, CAD approval, or
                production confirmation.
              </p>
            </section>
          ) : null}

          {submittedBrief.referenceUpload ? (
            <section className={styles.boundaryCard}>
              <h2>Reference images</h2>
              <p>
                {submittedBrief.referenceUpload.uploaded
                  ? `${submittedBrief.referenceUpload.uploadedCount || 0} reference image(s) were attached for concept review.`
                  : submittedBrief.referenceUpload.message || 'No final reference images were uploaded.'}
              </p>
              <p>
                Reference images support concept review only. They are not CAD approval, final pricing, final design
                approval, or production confirmation.
              </p>
            </section>
          ) : null}

          <section className={styles.boundaryCard}>
            <h2>Important boundary</h2>
            <p>
              This submission helps NOVORA understand your design direction, but it is not a final order, final pricing,
              CAD approval, or production confirmation.
            </p>
            <p>
              This is not a CAD-ready production order. Final CAD, pricing, sourcing, and production feasibility are
              confirmed later.
            </p>
            <ul className={submittedStyles.boundaryList}>
              <li>Not a final order</li>
              <li>Not final pricing</li>
              <li>Not CAD approval</li>
              <li>Not production confirmation</li>
            </ul>
          </section>

          <section className={submittedStyles.nextSteps}>
            <div>
              <p className={styles.eyebrow}>What happens next</p>
              <h2>What NOVORA reviews next</h2>
            </div>
            <p className={submittedStyles.nextStepsIntro}>
              NOVORA will review the submitted details and use them as a starting point for the next conversation.
            </p>
            <ol className={submittedStyles.nextStepList}>
              <li>
                <span className={submittedStyles.stepNumber}>1</span>
                <div>
                  <h3>Brief review</h3>
                  <p>NOVORA reviews the concept brief, references, materials direction, and contact details.</p>
                </div>
              </li>
              <li>
                <span className={submittedStyles.stepNumber}>2</span>
                <div>
                  <h3>Concept direction</h3>
                  <p>NOVORA reviews the concept direction and follows up to discuss possible next steps.</p>
                </div>
              </li>
              <li>
                <span className={submittedStyles.stepNumber}>3</span>
                <div>
                  <h3>CAD path confirmation</h3>
                  <p>
                    If you want production-level CAD, NOVORA will confirm details, CAD fee, and process separately.
                  </p>
                </div>
              </li>
              <li>
                <span className={submittedStyles.stepNumber}>4</span>
                <div>
                  <h3>Later feasibility checks</h3>
                  <p>
                    Final quote, gemstone sourcing, CAD feasibility, and any production-related decisions are confirmed
                    later through manual follow-up.
                  </p>
                </div>
              </li>
            </ol>
            <p className={submittedStyles.contactExpectation}>
              NOVORA will use the submitted email or contact information for follow-up about this Concept Brief. This
              receipt is not final order, payment, CAD, quote, or production confirmation. No automated customer email is
              sent from this submission flow.
            </p>
            <div className={submittedStyles.mockPreviewEntry}>
              <div>
                <p className={submittedStyles.mockPreviewLabel}>Demo mock preview route</p>
                <h3>Demo navigation testing only</h3>
                <p>
                  This demo link is for navigation testing only. It is not connected to your submitted Concept Brief,
                  does not display a generated image, and is not customer-safe final delivery.
                </p>
              </div>
              <Link className={styles.secondaryButton} href={MOCK_PREVIEW_HREF}>
                View demo mock preview
              </Link>
              <p className={submittedStyles.mockPreviewBoundary}>
                Human review and offline follow-up remain required. This mock preview is not CAD, not a quote, not
                order approval, not payment approval, and not production approval. first_preview_ready is separate from
                approved_for_customer.
              </p>
            </div>
          </section>

          <div className={styles.actions}>
            <Link className={styles.primaryButton} href="/design/start">
              Back to design start
            </Link>
            <Link className={styles.secondaryButton} href="/design/brief">
              Back to concept brief
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
