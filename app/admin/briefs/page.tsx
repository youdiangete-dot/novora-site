'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  type BriefStatus,
  type AdminBriefRecord,
  displayValue,
  formatSubmittedTime,
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
          <p>Front-end-only mock review dashboard for submitted concept briefs.</p>
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

        <section className={styles.panel} aria-label="Brief review list">
          <div className={styles.panelHeader}>
            <div>
              <h2>Brief queue</h2>
              <p>Showing mock brief records and any locally submitted concept brief in this browser.</p>
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
              Search by Concept Brief ID
              <input
                className={styles.input}
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="NOVORA-CB-..."
                type="search"
              />
            </label>
          </div>

          {filteredBriefs.length ? (
            <div className={styles.tableWrap}>
              <table className={styles.briefTable}>
                <thead>
                  <tr>
                    <th>Concept Brief ID</th>
                    <th>Submitted time</th>
                    <th>Customer</th>
                    <th>Email</th>
                    <th>Country / region</th>
                    <th>Piece type</th>
                    <th>Structure</th>
                    <th>Stone logic</th>
                    <th>Reference image count</th>
                    <th>Status</th>
                    <th>Last updated</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBriefs.map((brief) => (
                    <tr key={`${brief.source}-${brief.conceptBriefId}`}>
                      <td className={styles.briefId}>{brief.conceptBriefId}</td>
                      <td>{formatSubmittedTime(brief.submittedAt)}</td>
                      <td>{brief.customerName || 'Not provided'}</td>
                      <td>{brief.customerEmail || 'Not provided'}</td>
                      <td>{brief.customerCountry || 'Not provided'}</td>
                      <td>{displayValue('pieceType', brief.pieceType)}</td>
                      <td>{displayValue('structure', brief.structure)}</td>
                      <td>{displayValue('stoneLogic', brief.stoneLogic)}</td>
                      <td>{brief.referenceImageCount || 0}</td>
                      <td>
                        <span className={styles.status}>{brief.status}</span>
                      </td>
                      <td>{formatSubmittedTime(brief.lastUpdatedAt || brief.submittedAt)}</td>
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
