'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import submittedStyles from './submitted.module.css';
import styles from '../brief/brief.module.css';
import { useI18n } from '../../../lib/i18n/client';
import { formatDateTime, formatMessage } from '../../../lib/i18n/format';
import { localizePath } from '../../../lib/i18n/routing';

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

function isValidFirstPreviewPublicReference(value: string): boolean {
  const match = /^NOVORA-CB-(\d{4})(\d{2})(\d{2})-[A-Z0-9]{4}$/.exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year === 0 || month < 1 || month > 12 || day < 1) {
    return false;
  }

  const isLeapYear =
    year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [
    31,
    isLeapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  return day <= daysInMonth[month - 1];
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
    isValidFirstPreviewPublicReference(publicReference) &&
    typeof conceptBriefId === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(conceptBriefId)
  );
}

export default function DesignSubmittedPage() {
  const { dictionary, locale } = useI18n();
  const copy = dictionary.submitted;
  const errorCopy = dictionary.errors;
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
            <p className={styles.eyebrow}>{copy.sub001}</p>
            <h1>{copy.sub002}</h1>
            <p>
              {copy.sub003}</p>
            <Link className={styles.primaryButton} href={localizePath('/design/start', locale)}>
              {copy.sub004}</Link>
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
            <p className={styles.eyebrow}>{copy.sub005}</p>
            <h1>{copy.sub006}</h1>
            <p>{errorCopy.serverReceiptWarning}</p>
            <Link className={styles.primaryButton} href={localizePath('/design/brief', locale)}>
              {copy.sub007}</Link>
          </div>
        </section>
      </main>
    );
  }

  const displayedConceptBriefId = submittedBrief.apiSubmission.publicReference;
  const previewHref = localizePath(
    `/design/preview/${submittedBrief.apiSubmission.publicReference}`,
    locale,
  );

  return (
    <main className={styles.pageBackground}>
      <section className={`${styles.shell} ${styles.submittedShell}`}>
        <div className={styles.submittedPanel}>
          <p className={styles.eyebrow}>{copy.sub001}</p>
          <h1>{copy.sub008}</h1>
          <p className={styles.successLead}>
            {copy.sub009}</p>

          <dl className={styles.submittedDetails}>
            <div>
              <dt>{copy.sub010}</dt>
              <dd>{displayedConceptBriefId}</dd>
            </div>
            <div>
              <dt>{copy.sub011}</dt>
              <dd>{formatDateTime(submittedBrief.submittedAt, locale)}</dd>
            </div>
            <div>
              <dt>{copy.sub012}</dt>
              <dd>{submittedBrief.customerName || copy.sub013}</dd>
            </div>
            <div>
              <dt>{copy.sub014}</dt>
              <dd>{submittedBrief.customerEmail || copy.sub013}</dd>
            </div>
          </dl>

          {(submittedBrief.customerPhone || submittedBrief.customerCountry || submittedBrief.contactNote) ? (
            <section className={styles.boundaryCard}>
              <h2>{copy.sub015}</h2>
              <dl className={styles.submittedDetails}>
                {submittedBrief.customerPhone ? (
                  <div>
                    <dt>{copy.sub016}</dt>
                    <dd>{submittedBrief.customerPhone}</dd>
                  </div>
                ) : null}
                {submittedBrief.customerCountry ? (
                  <div>
                    <dt>{copy.sub017}</dt>
                    <dd>{submittedBrief.customerCountry}</dd>
                  </div>
                ) : null}
                {submittedBrief.contactNote ? (
                  <div>
                    <dt>{copy.sub018}</dt>
                    <dd>{submittedBrief.contactNote}</dd>
                  </div>
                ) : null}
              </dl>
            </section>
          ) : null}

          {submittedBrief.startSelection ? (
            <section className={styles.boundaryCard}>
              <h2>{copy.sub019}</h2>
              <dl className={styles.submittedDetails}>
                {submittedBrief.startSelection.recipientLabel ? (
                  <div>
                    <dt>{copy.sub020}</dt>
                    <dd>{submittedBrief.startSelection.recipientLabel}</dd>
                  </div>
                ) : null}
                {submittedBrief.startSelection.styleLabel ? (
                  <div>
                    <dt>{copy.sub021}</dt>
                    <dd>{submittedBrief.startSelection.styleLabel}</dd>
                  </div>
                ) : null}
                {submittedBrief.startSelection.budget ? (
                  <div>
                    <dt>{copy.sub022}</dt>
                    <dd>{submittedBrief.startSelection.budget}</dd>
                  </div>
                ) : null}
              </dl>
              <p>
                {copy.sub023}</p>
            </section>
          ) : null}

          {submittedBrief.referenceUpload ? (
            <section className={styles.boundaryCard}>
              <h2>{copy.sub024}</h2>
              <p>
                {submittedBrief.referenceUpload.uploaded
                  ? formatMessage(copy.sub025, { value0: submittedBrief.referenceUpload.uploadedCount || 0 })
                  : locale === 'zh-TW'
                    ? copy.sub026
                    : submittedBrief.referenceUpload.message || copy.sub026}
              </p>
              <p>
                {copy.sub027}</p>
            </section>
          ) : null}

          <section className={styles.boundaryCard}>
            <h2>{copy.sub028}</h2>
            <p>
              {copy.sub029}</p>
            <p>
              {copy.sub030}</p>
            <ul className={submittedStyles.boundaryList}>
              <li>{copy.sub031}</li>
              <li>{copy.sub032}</li>
              <li>{copy.sub033}</li>
              <li>{copy.sub034}</li>
            </ul>
          </section>

          <section className={submittedStyles.nextSteps}>
            <div>
              <p className={styles.eyebrow}>{copy.sub035}</p>
              <h2>{copy.sub036}</h2>
            </div>
            <p className={submittedStyles.nextStepsIntro}>
              {copy.sub037}</p>
            <ol className={submittedStyles.nextStepList}>
              <li>
                <span className={submittedStyles.stepNumber}>{copy.sub038}</span>
                <div>
                  <h3>{copy.sub039}</h3>
                  <p>
                    {copy.sub040}</p>
                </div>
              </li>
              <li>
                <span className={submittedStyles.stepNumber}>{copy.sub041}</span>
                <div>
                  <h3>{copy.sub042}</h3>
                  <p>
                    {copy.sub043}</p>
                </div>
              </li>
              <li>
                <span className={submittedStyles.stepNumber}>{copy.sub044}</span>
                <div>
                  <h3>{copy.sub045}</h3>
                  <p>
                    {copy.sub046}</p>
                </div>
              </li>
              <li>
                <span className={submittedStyles.stepNumber}>{copy.sub047}</span>
                <div>
                  <h3>{copy.sub048}</h3>
                  <p>
                    {copy.sub049}</p>
                </div>
              </li>
            </ol>
            <p className={submittedStyles.contactExpectation}>
              {copy.sub050}</p>
            <div className={submittedStyles.previewEntry}>
              <div>
                <p className={submittedStyles.previewLabel}>{copy.sub051}</p>
                <h3>{copy.sub052}</h3>
                <p>
                  {copy.sub053}</p>
              </div>
              <Link className={styles.secondaryButton} href={previewHref}>
                {copy.sub054}</Link>
              <p className={submittedStyles.previewBoundary}>
                {copy.sub055}</p>
            </div>
          </section>

          <div className={styles.actions}>
            <Link className={styles.primaryButton} href={localizePath('/design/start', locale)}>
              {copy.sub004}</Link>
            <Link className={styles.secondaryButton} href={localizePath('/design/brief', locale)}>
              {copy.sub007}</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
