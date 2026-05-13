'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  type BriefStatus,
  type AdminBriefRecord,
  displayValue,
  formatSubmittedTime,
  getCadReadiness,
  getContactSummary,
  hasReferenceMetadata,
  loadAdminReviewState,
  loadAdminBriefRecords,
  mockBriefs,
  saveAdminReviewState,
  statusOptions,
} from '../briefReviewData';
import styles from '../admin-briefs.module.css';

type DetailRow = {
  label: string;
  value: ReactNode;
};

function getReferenceNames(brief: AdminBriefRecord) {
  if (!brief.referenceImageNames?.length) {
    return <span>No real upload files are available here.</span>;
  }

  return (
    <ul className={styles.fileList}>
      {brief.referenceImageNames.map((name) => (
        <li key={name}>{name}</li>
      ))}
    </ul>
  );
}

function DetailSection({ title, rows }: { title: string; rows: DetailRow[] }) {
  return (
    <section className={styles.detailSection} aria-label={title}>
      <h2>{title}</h2>
      <dl className={styles.detailList}>
        {rows.map((row) => (
          <div className={styles.detailRow} key={row.label}>
            <dt className={styles.detailLabel}>{row.label}</dt>
            <dd className={styles.detailValue}>{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default function AdminBriefDetailPage() {
  const params = useParams<{ id: string }>();
  const decodedId = decodeURIComponent(params.id);
  const [briefs, setBriefs] = useState<AdminBriefRecord[]>(mockBriefs);
  const [status, setStatus] = useState(statusOptions[0]);
  const [internalNotes, setInternalNotes] = useState('');
  const [lastUpdatedAt, setLastUpdatedAt] = useState('');
  const [isReviewLoaded, setIsReviewLoaded] = useState(false);

  useEffect(() => {
    const records = loadAdminBriefRecords();
    const currentBrief = records.find((record) => record.conceptBriefId === decodedId);
    const reviewState = loadAdminReviewState(decodedId);

    setBriefs(records);
    setStatus(currentBrief?.status || reviewState.status || statusOptions[0]);
    setInternalNotes(reviewState.internalNotes || '');
    setLastUpdatedAt(reviewState.lastUpdatedAt || currentBrief?.lastUpdatedAt || currentBrief?.submittedAt || '');
    setIsReviewLoaded(true);
  }, [decodedId]);

  const brief = briefs.find((record) => record.conceptBriefId === decodedId);

  const detailSections = useMemo(() => {
    if (!brief) {
      return [];
    }

    return [
      {
        title: 'Concept Brief summary',
        rows: [
          { label: 'Concept Brief ID / public reference', value: brief.conceptBriefId },
          { label: 'Submitted time', value: formatSubmittedTime(brief.submittedAt) },
          { label: 'Last updated', value: formatSubmittedTime(lastUpdatedAt || brief.lastUpdatedAt || brief.submittedAt) },
          { label: 'Source', value: brief.source === 'localStorage' ? 'Local browser submission' : 'Mock seed record' },
          { label: 'Piece type', value: displayValue('pieceType', brief.pieceType) },
          { label: 'Branch', value: displayValue('branch', brief.branch) },
          { label: 'Structure', value: displayValue('structure', brief.structure) },
          { label: 'SubStructure', value: displayValue('subStructure', brief.subStructure) },
          { label: 'Stone logic', value: displayValue('stoneLogic', brief.stoneLogic) },
        ],
      },
      {
        title: 'Contact summary',
        rows: [
          { label: 'Review summary', value: getContactSummary(brief) },
          { label: 'Customer name', value: brief.customerName || 'Not provided' },
          { label: 'Customer email', value: brief.customerEmail || 'Not provided' },
          { label: 'Country / region', value: brief.customerCountry || 'Not provided' },
          { label: 'Phone', value: brief.customerPhone || 'Not provided' },
          { label: 'Contact note', value: brief.contactNote || 'Not provided' },
        ],
      },
      {
        title: 'Reference images metadata',
        rows: [
          { label: 'Metadata exists', value: hasReferenceMetadata(brief) ? 'Yes, mock/reference metadata is present' : 'No' },
          { label: 'Reference image count', value: brief.referenceImageCount || 0 },
          { label: 'Reference image names', value: getReferenceNames(brief) },
          { label: 'Reference notes', value: brief.referenceNotes || 'Not provided' },
        ],
      },
      {
        title: 'AI sketch instruction / concept direction',
        rows: [
          { label: 'Instruction', value: brief.aiSketchInstruction || 'Not provided' },
          { label: 'Boundary', value: 'Concept direction only. This does not approve CAD, sourcing, pricing, or production.' },
        ],
      },
      {
        title: 'Admin review status',
        rows: [
          { label: 'Status', value: status },
          { label: 'Last review update', value: formatSubmittedTime(lastUpdatedAt || brief.lastUpdatedAt || brief.submittedAt) },
          { label: 'Review state storage', value: 'Saved only in this browser localStorage for mock planning.' },
        ],
      },
      {
        title: 'CAD readiness',
        rows: [
          { label: 'Current signal', value: getCadReadiness({ ...brief, status }) },
          { label: 'CAD request boundary', value: 'No CAD request is created by this page.' },
          { label: 'Production boundary', value: 'This is not a quote, order, payment, production job, or final CAD handoff.' },
        ],
      },
      {
        title: 'Internal notes / mock review state',
        rows: [
          { label: 'Current notes', value: internalNotes || 'No internal notes saved in this browser yet.' },
          { label: 'Persistence', value: 'Status and notes remain local to this browser and are not sent to a server.' },
        ],
      },
      {
        title: 'Boundary notes',
        rows: [
          { label: 'Mock-only', value: 'This is a front-end-only mock admin review UI.' },
          { label: 'Database', value: 'It does not connect to a database.' },
          { label: 'Authentication', value: 'It does not authenticate admins.' },
          { label: 'Customer data', value: 'It does not display real server-side customer data.' },
          { label: 'Uploads', value: 'It does not store or retrieve real upload files.' },
          { label: 'Downstream actions', value: 'It does not create CAD requests, quotes, production orders, emails, payments, or file storage.' },
        ],
      },
    ];
  }, [brief, internalNotes, lastUpdatedAt, status]);

  function persistReviewState(nextStatus: BriefStatus, nextInternalNotes: string) {
    const nextLastUpdatedAt = new Date().toISOString();

    setLastUpdatedAt(nextLastUpdatedAt);
    saveAdminReviewState(decodedId, {
      status: nextStatus,
      internalNotes: nextInternalNotes,
      lastUpdatedAt: nextLastUpdatedAt,
    });
  }

  function handleStatusChange(nextStatus: BriefStatus) {
    setStatus(nextStatus);

    if (isReviewLoaded) {
      persistReviewState(nextStatus, internalNotes);
    }
  }

  function handleInternalNotesChange(nextInternalNotes: string) {
    setInternalNotes(nextInternalNotes);

    if (isReviewLoaded) {
      persistReviewState(status, nextInternalNotes);
    }
  }

  if (!brief) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <section className={styles.notice} aria-label="Mock admin warning">
            <h1>Brief not found</h1>
            <p>
              This front-end-only mock admin UI can only display mock seed records and a localStorage submission saved
              in this browser. It does not connect to a database or authenticate admins.
            </p>
            <p>No CAD request, quote, production order, email, payment, or file storage is created here.</p>
            <Link className={styles.secondaryButton} href="/admin/briefs">
              Back to /admin/briefs
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Internal planning draft</p>
          <h1>{brief.conceptBriefId}</h1>
          <p>
            Mock-only concept brief review detail for planning how NOVORA can inspect contact context, reference
            metadata, concept direction, review status, and CAD discussion readiness.
          </p>
        </section>

        <section className={styles.notice} aria-label="Mock admin warning">
          <h2>Mock admin-only review surface</h2>
          <ul>
            <li>This is a front-end-only mock admin review UI.</li>
            <li>It does not connect to a database or authenticate admins.</li>
            <li>It does not display real server-side customer data.</li>
            <li>It does not create CAD requests, quotes, production orders, emails, payments, or file storage.</li>
            <li>Reference files and customer examples shown in mock records are planning metadata only.</li>
          </ul>
        </section>

        <div className={styles.detailGrid}>
          <section className={styles.detailPanel} aria-label="Brief detail">
            {detailSections.map((section) => (
              <DetailSection key={section.title} title={section.title} rows={section.rows} />
            ))}
          </section>

          <aside className={styles.notesPanel}>
            <div>
              <h2>Front-end-only review controls</h2>
              <p className={styles.helperText}>Status and notes are saved only in this browser localStorage.</p>
            </div>
            <label className={styles.fieldLabel}>
              Status
              <select className={styles.select} value={status} onChange={(event) => handleStatusChange(event.target.value as BriefStatus)}>
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.fieldLabel}>
              Internal notes
              <textarea
                className={styles.textarea}
                placeholder="Front-end-only notes for planning. These notes are not saved to a server."
                value={internalNotes}
                onChange={(event) => handleInternalNotesChange(event.target.value)}
              />
            </label>

            <Link className={styles.secondaryButton} href="/admin/briefs">
              Back to /admin/briefs
            </Link>
          </aside>
        </div>
      </div>
    </main>
  );
}
