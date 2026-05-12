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
        title: 'Brief overview',
        rows: [
          { label: 'Concept Brief ID', value: brief.conceptBriefId },
          { label: 'Submitted time', value: formatSubmittedTime(brief.submittedAt) },
          { label: 'Last updated', value: formatSubmittedTime(lastUpdatedAt || brief.lastUpdatedAt || brief.submittedAt) },
          { label: 'Source', value: brief.source === 'localStorage' ? 'Local browser submission' : 'Mock seed record' },
        ],
      },
      {
        title: 'Customer contact',
        rows: [
          { label: 'Customer name', value: brief.customerName || 'Not provided' },
          { label: 'Customer email', value: brief.customerEmail || 'Not provided' },
          { label: 'Country / region', value: brief.customerCountry || 'Not provided' },
        ],
      },
      {
        title: 'Design direction',
        rows: [
          { label: 'Piece type', value: displayValue('pieceType', brief.pieceType) },
          { label: 'Branch', value: displayValue('branch', brief.branch) },
          { label: 'Structure', value: displayValue('structure', brief.structure) },
          { label: 'SubStructure', value: displayValue('subStructure', brief.subStructure) },
          { label: 'Stone logic', value: displayValue('stoneLogic', brief.stoneLogic) },
        ],
      },
      {
        title: 'Reference images metadata',
        rows: [
          { label: 'Reference image count', value: brief.referenceImageCount || 0 },
          { label: 'Reference image names', value: getReferenceNames(brief) },
          { label: 'Reference notes', value: brief.referenceNotes || 'Not provided' },
        ],
      },
      {
        title: 'AI sketch instruction',
        rows: [{ label: 'Instruction', value: brief.aiSketchInstruction || 'Not provided' }],
      },
      {
        title: 'Internal review',
        rows: [
          { label: 'Status', value: status },
          { label: 'Internal notes storage', value: 'Saved only in this browser localStorage for mock planning.' },
        ],
      },
      {
        title: 'Boundary notes',
        rows: [
          { label: 'Front-end-only', value: 'This is front-end-only.' },
          { label: 'Customer data', value: 'No real customer data is stored on a server.' },
          { label: 'Upload files', value: 'No real upload files are available here.' },
          { label: 'Future admin system', value: 'Database and protected admin login will be added later.' },
          { label: 'Production boundary', value: 'This is not a CAD-ready production order.' },
          {
            label: 'Final confirmation',
            value: 'Final CAD, pricing, sourcing, and production feasibility are confirmed later.',
          },
        ],
      },
    ];
  }, [brief, lastUpdatedAt, status]);

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
            This is front-end-only. No real customer data is stored on a server. No real upload files are available here.
            Database and protected admin login will be added later. This is not a CAD-ready production order.
          </p>
          <p>Final CAD, pricing, sourcing, and production feasibility are confirmed later.</p>
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
          <p>Front-end-only concept brief review detail. This does not represent an operational admin system.</p>
        </section>

        <section className={styles.notice} aria-label="Mock admin warning">
          <h2>Mock admin view. Not connected to a real database.</h2>
          <ul>
            <li>This is front-end-only.</li>
            <li>No real customer data is stored on a server.</li>
            <li>No real upload files are available here.</li>
            <li>Database and protected admin login will be added later.</li>
            <li>This is not a CAD-ready production order.</li>
            <li>Final CAD, pricing, sourcing, and production feasibility are confirmed later.</li>
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
