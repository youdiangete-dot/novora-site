'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  type AdminBriefRecord,
  displayValue,
  formatSubmittedTime,
  loadAdminBriefRecords,
} from './briefReviewData';
import styles from './admin-briefs.module.css';

export default function AdminBriefsPage() {
  const [briefs, setBriefs] = useState<AdminBriefRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setBriefs(loadAdminBriefRecords());
    setIsLoaded(true);
  }, []);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Internal planning draft</p>
          <h1>NOVORA Brief Review</h1>
          <p>
            A front-end-only workspace draft for reviewing concept brief data shape before protected admin and database
            work exists.
          </p>
        </section>

        <section className={styles.notice} aria-label="Mock admin warning">
          <h2>Internal mock admin view. Not connected to a real database.</h2>
          <p>
            This is front-end-only. No real customer data is stored on a server, no real upload files are available here,
            and database plus protected admin login will be added later.
          </p>
        </section>

        <section className={styles.panel} aria-label="Brief review list">
          <div className={styles.tableWrap}>
            <table className={styles.briefTable}>
              <thead>
                <tr>
                  <th>Concept Brief ID</th>
                  <th>Submitted time</th>
                  <th>Piece type</th>
                  <th>Structure</th>
                  <th>Stone logic</th>
                  <th>Reference image count</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {(isLoaded ? briefs : []).map((brief) => (
                  <tr key={`${brief.source}-${brief.conceptBriefId}`}>
                    <td className={styles.briefId}>{brief.conceptBriefId}</td>
                    <td>{formatSubmittedTime(brief.submittedAt)}</td>
                    <td>{displayValue('pieceType', brief.pieceType)}</td>
                    <td>{displayValue('structure', brief.structure)}</td>
                    <td>{displayValue('stoneLogic', brief.stoneLogic)}</td>
                    <td>{brief.referenceImageCount || 0}</td>
                    <td>
                      <span className={styles.status}>{brief.status}</span>
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
        </section>
      </div>
    </main>
  );
}
