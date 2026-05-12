'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  type AdminBriefRecord,
  displayValue,
  formatSubmittedTime,
  loadAdminBriefRecords,
  mockBriefs,
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

export default function AdminBriefDetailPage() {
  const params = useParams<{ id: string }>();
  const decodedId = decodeURIComponent(params.id);
  const [briefs, setBriefs] = useState<AdminBriefRecord[]>(mockBriefs);
  const [status, setStatus] = useState(statusOptions[0]);

  useEffect(() => {
    const records = loadAdminBriefRecords();
    const currentBrief = records.find((record) => record.conceptBriefId === decodedId);

    setBriefs(records);
    setStatus(currentBrief?.status || statusOptions[0]);
  }, [decodedId]);

  const brief = briefs.find((record) => record.conceptBriefId === decodedId);

  const detailRows = useMemo<DetailRow[]>(() => {
    if (!brief) {
      return [];
    }

    return [
      { label: 'Concept Brief ID', value: brief.conceptBriefId },
      { label: 'Submitted time', value: formatSubmittedTime(brief.submittedAt) },
      { label: 'Piece type', value: displayValue('pieceType', brief.pieceType) },
      { label: 'Branch', value: displayValue('branch', brief.branch) },
      { label: 'Structure', value: displayValue('structure', brief.structure) },
      { label: 'SubStructure', value: displayValue('subStructure', brief.subStructure) },
      { label: 'Stone logic', value: displayValue('stoneLogic', brief.stoneLogic) },
      { label: 'Reference image count', value: brief.referenceImageCount || 0 },
      { label: 'Reference image names', value: getReferenceNames(brief) },
      { label: 'Reference notes', value: brief.referenceNotes || 'Not provided' },
      { label: 'AI sketch instruction', value: brief.aiSketchInstruction || 'Not provided' },
      { label: 'Status', value: status },
    ];
  }, [brief, status]);

  if (!brief) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <section className={styles.notice} aria-label="Mock admin warning">
            <h1>Brief not found</h1>
            <p>
              This is a front-end-only mock admin view. No real customer data is stored on a server, no real upload files
              are available here, and database plus protected admin login will be added later.
            </p>
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
          <h2>Internal mock admin view. Not connected to a real database.</h2>
          <p>
            This is front-end-only. No real customer data is stored on a server, no real upload files are available here,
            and database plus protected admin login will be added later.
          </p>
        </section>

        <div className={styles.detailGrid}>
          <section className={styles.detailPanel} aria-label="Brief detail">
            <dl className={styles.detailList}>
              {detailRows.map((row) => (
                <div className={styles.detailRow} key={row.label}>
                  <dt className={styles.detailLabel}>{row.label}</dt>
                  <dd className={styles.detailValue}>{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <aside className={styles.notesPanel}>
            <label className={styles.fieldLabel}>
              Status
              <select className={styles.select} value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
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
