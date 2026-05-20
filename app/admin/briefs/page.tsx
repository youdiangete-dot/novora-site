import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import {
  ADMIN_ACCESS_COOKIE_NAME,
  createAdminAccessCookieValue,
  isAdminAccessConfigured,
  isValidAdminAccessCookie,
} from '../../../lib/server/admin-access';
import { loadAdminConceptBriefRecords } from '../../../lib/server/admin-concept-briefs';
import styles from './admin-briefs.module.css';
import AdminBriefsClient from './AdminBriefsClient';

export const dynamic = 'force-dynamic';

type AdminBriefsPageProps = {
  searchParams?: Promise<{
    access?: string;
  }>;
};

async function submitAdminAccessKey(formData: FormData) {
  'use server';

  const submittedAccessKey = String(formData.get('adminAccessKey') || '');
  const cookieValue = createAdminAccessCookieValue(submittedAccessKey);

  if (!cookieValue) {
    redirect('/admin/briefs?access=denied');
  }

  const cookieStore = await cookies();

  cookieStore.set(ADMIN_ACCESS_COOKIE_NAME, cookieValue, {
    httpOnly: true,
    maxAge: 60 * 60 * 8,
    path: '/admin/briefs',
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
  });

  redirect('/admin/briefs');
}

function AdminConfigurationMessage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.notice} aria-label="Admin configuration required">
          <h1>Admin review is not configured</h1>
          <p>
            Set the server-only NOVORA_ADMIN_ACCESS_KEY environment variable before this page can display protected
            concept brief data.
          </p>
          <p>No customer data is shown while the admin access key is missing.</p>
        </section>
      </div>
    </main>
  );
}

function AdminAccessForm({ wasDenied }: { wasDenied: boolean }) {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Protected internal MVP</p>
          <h1>NOVORA Brief Review</h1>
          <p>Enter the temporary admin access key to view real concept brief submissions.</p>
        </section>

        <section className={styles.notice} aria-label="Admin access required">
          <h2>Admin access required</h2>
          <p>This MVP gate checks a server-only access key before loading customer data.</p>
          {wasDenied ? <p>The submitted access key was not accepted.</p> : null}
          <form action={submitAdminAccessKey} className={styles.accessForm}>
            <label className={styles.fieldLabel}>
              Admin access key
              <input
                autoComplete="current-password"
                className={styles.input}
                name="adminAccessKey"
                required
                type="password"
              />
            </label>
            <button className={styles.button} type="submit">
              Continue
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

export default async function AdminBriefsPage({ searchParams }: AdminBriefsPageProps) {
  if (!isAdminAccessConfigured()) {
    return <AdminConfigurationMessage />;
  }

  const cookieStore = await cookies();
  const hasAdminAccess = isValidAdminAccessCookie(cookieStore.get(ADMIN_ACCESS_COOKIE_NAME)?.value);
  const resolvedSearchParams = await searchParams;

  if (!hasAdminAccess) {
    return <AdminAccessForm wasDenied={resolvedSearchParams?.access === 'denied'} />;
  }

  const serverBriefs = await loadAdminConceptBriefRecords();
  let initialServerBriefs = serverBriefs.records;
  let serverDataMessage: string | undefined;

  if ('message' in serverBriefs) {
    initialServerBriefs = [];
    serverDataMessage = serverBriefs.message;
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Protected internal MVP</p>
          <h1>NOVORA Brief Review</h1>
          <p>
            Protected review queue for real Supabase concept brief submissions. Admin review status and internal notes
            are loaded from Supabase when admin_notes persistence is available.
          </p>
        </section>

        <section className={styles.notice} aria-label="Protected admin warning">
          <h2>Temporary protected admin surface</h2>
          <ul>
            <li>Access is gated by the server-only NOVORA_ADMIN_ACCESS_KEY value.</li>
            <li>Real list data is loaded on the server with the existing Supabase admin client.</li>
            <li>Admin review status is internal concept direction state, not CAD approval or production confirmation.</li>
            <li>The service role key is never sent to browser code.</li>
            <li>No CAD requests, quotes, production orders, emails, payments, or file storage are created here.</li>
          </ul>
        </section>

        <AdminBriefsClient
          initialServerBriefs={initialServerBriefs}
          serverDataMessage={serverDataMessage}
        />
      </div>
    </main>
  );
}
