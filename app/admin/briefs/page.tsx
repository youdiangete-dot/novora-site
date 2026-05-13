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
  hasReferenceMetadata,
  loadAdminBriefRecords,
  statusOptions,
} from './briefReviewData';
import styles from './admin-briefs.module.css';

const allStatuses = ['All', ...statusOptions] as const;

export default function AdminBriefsPage() {
  const [briefs, setBriefs] = useState<AdminBriefRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [statusFilter, setStatusFilter] = useState<(typeof allStatuses)[number]>('All');
  const [pieceTypeFilter, setPieceTypeFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setBriefs(loadAdminBriefRecords());
    setIsLoaded(true);
  }, []);

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
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Internal planning draft</p>
          <h1>NOVORA Brief Review</h1>
          <p>
            Front-end-only mock review dashboard for concept briefs, local browser submissions, and planning-only
            review state.
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

        <section className={styles.panel} aria-label="Brief review list">
          <div className={styles.panelHeader}>
            <div>
              <h2>Brief queue</h2>
              <p>
                Showing mock seed records and any locally submitted concept brief saved in this browser localStorage.
              </p>
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
                    <th>Contact summary</th>
                    <th>Piece type</th>
                    <th>Submission / review status</th>
                    <th>CAD readiness</th>
                    <th>Reference metadata</th>
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
                          <span>{brief.source === 'localStorage' ? 'Local browser submission' : 'Mock seed record'}</span>
                        </div>
                      </td>
                      <td>
                        <div className={styles.primaryCell}>
                          <span>{getContactSummary(brief)}</span>
                          <span>{brief.contactNote || 'No contact note provided'}</span>
                        </div>
                      </td>
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
                          <span>{hasReferenceMetadata(brief) ? 'Metadata present' : 'No reference metadata'}</span>
                          <span>{brief.referenceImageCount || 0} reference image(s)</span>
                        </div>
                      </td>
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
                No mock or submitted brief matches the current view. Submit a front-end-only concept brief to seed this
                local browser mock dashboard.
              </p>
              <Link className={styles.secondaryButton} href="/design/start">
                Back to /design/start
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
