'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  type BriefStatus,
  type AdminBriefRecord,
  displayValue,
  formatSubmittedTime,
  getCadReadiness,
  getContactSummary,
  loadAdminBriefRecords,
  statusOptions,
} from './briefReviewData';
import styles from './admin-briefs.module.css';

const allStatuses = ['All', ...statusOptions] as const;

type AdminBriefsClientProps = {
  initialServerBriefs: AdminBriefRecord[];
  serverDataMessage?: string;
};

function getSourceLabel(source: AdminBriefRecord['source']) {
  if (source === 'supabase') {
    return 'Supabase submission';
  }

  return source === 'localStorage' ? 'Local browser submission' : 'Mock seed record';
}

export default function AdminBriefsClient({ initialServerBriefs, serverDataMessage }: AdminBriefsClientProps) {
  const [briefs, setBriefs] = useState<AdminBriefRecord[]>(initialServerBriefs);
  const [isLoaded, setIsLoaded] = useState(initialServerBriefs.length > 0);
  const [statusFilter, setStatusFilter] = useState<(typeof allStatuses)[number]>('All');
  const [pieceTypeFilter, setPieceTypeFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fallbackRecords = loadAdminBriefRecords(initialServerBriefs);

    setBriefs(fallbackRecords);
    setIsLoaded(true);
  }, [initialServerBriefs]);

  const pieceTypeOptions = Array.from(new Set(briefs.map((brief) => brief.pieceType).filter(Boolean) as string[]));
  const filteredBriefs = (isLoaded ? briefs : []).filter((brief) => {
    const matchesStatus = statusFilter === 'All' || brief.status === (statusFilter as BriefStatus);
    const matchesPieceType = pieceTypeFilter === 'All' || brief.pieceType === pieceTypeFilter;
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const matchesSearch =
      brief.conceptBriefId.toLowerCase().includes(normalizedSearch) ||
      (brief.customerName || '').toLowerCase().includes(normalizedSearch) ||
      (brief.customerEmail || '').toLowerCase().includes(normalizedSearch);

    return matchesStatus && matchesPieceType && matchesSearch;
  });

  return (
    <section className={styles.panel} aria-label="Brief review list">
      <div className={styles.panelHeader}>
        <div>
          <h2>Brief queue</h2>
          <p>
            Showing protected Supabase concept brief submissions when available, with local browser and mock data kept
            as an MVP fallback.
          </p>
          {serverDataMessage ? <p className={styles.helperText}>{serverDataMessage}</p> : null}
        </div>
        <span className={styles.countBadge}>{filteredBriefs.length} visible</span>
      </div>
      <div className={styles.filters} aria-label="Brief filters">
        <label className={styles.compactField}>
          Status
          <select
            className={styles.select}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
          >
            {allStatuses.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.compactField}>
          Piece type
          <select className={styles.select} value={pieceTypeFilter} onChange={(event) => setPieceTypeFilter(event.target.value)}>
            <option value="All">All</option>
            {pieceTypeOptions.map((option) => (
              <option key={option} value={option}>
                {displayValue('pieceType', option)}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.compactField}>
          Search by ID, name, or email
          <input
            className={styles.input}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="ID, name, or email"
            type="search"
          />
        </label>
      </div>

      {filteredBriefs.length ? (
        <div className={styles.tableWrap}>
          <table className={styles.briefTable}>
            <thead>
              <tr>
                <th>Concept Brief ID / public reference</th>
                <th>Customer name</th>
                <th>Customer email</th>
                <th>Piece type</th>
                <th>Submission / review status</th>
                <th>CAD readiness</th>
                <th>Submitted / updated</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredBriefs.map((brief) => (
                <tr key={`${brief.source}-${brief.conceptBriefId}`}>
                  <td>
                    <div className={styles.primaryCell}>
                      <span className={styles.briefId}>{brief.conceptBriefId}</span>
                      <span>{getSourceLabel(brief.source)}</span>
                    </div>
                  </td>
                  <td>
                    <div className={styles.primaryCell}>
                      <span>{brief.customerName || 'Not provided'}</span>
                      <span>{getContactSummary(brief)}</span>
                    </div>
                  </td>
                  <td>{brief.customerEmail || 'Not provided'}</td>
                  <td>
                    <div className={styles.primaryCell}>
                      <span>{displayValue('pieceType', brief.pieceType)}</span>
                      <span>{displayValue('structure', brief.structure)}</span>
                    </div>
                  </td>
                  <td>
                    <span className={styles.status}>{brief.status}</span>
                  </td>
                  <td>{getCadReadiness(brief)}</td>
                  <td>
                    <div className={styles.primaryCell}>
                      <span>Submitted: {formatSubmittedTime(brief.submittedAt)}</span>
                      <span>Updated: {formatSubmittedTime(brief.lastUpdatedAt || brief.submittedAt)}</span>
                    </div>
                  </td>
                  <td>
                    <Link className={styles.button} href={`/admin/briefs/${encodeURIComponent(brief.conceptBriefId)}`}>
                      View brief
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={styles.emptyPanel}>
          <h2>No concept briefs to review</h2>
          <p className={styles.emptyText}>
            No protected Supabase, mock, or submitted local brief matches the current view.
          </p>
          <Link className={styles.secondaryButton} href="/design/start">
            Back to /design/start
          </Link>
        </div>
      )}
    </section>
  );
}
