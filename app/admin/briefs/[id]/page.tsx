import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import {
  ADMIN_ACCESS_COOKIE_NAME,
  ADMIN_ACCESS_COOKIE_MAX_AGE_SECONDS,
  ADMIN_ACCESS_COOKIE_PATH,
  createAdminAccessCookieValue,
  isAdminAccessConfigured,
  isValidAdminAccessCookie,
} from '../../../../lib/server/admin-access';
import { loadAdminConceptBriefRecordByReference } from '../../../../lib/server/admin-concept-briefs';
import styles from '../admin-briefs.module.css';
import AdminBriefDetailClient from './AdminBriefDetailClient';

export const dynamic = 'force-dynamic';

type AdminBriefDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    access?: string;
  }>;
};

async function submitAdminAccessKey(formData: FormData) {
  'use server';

  const submittedAccessKey = String(formData.get('adminAccessKey') || '');
  const returnPath = String(formData.get('returnPath') || '/admin/briefs');
  const cookieValue = createAdminAccessCookieValue(submittedAccessKey);

  if (!cookieValue) {
    redirect(`${returnPath}?access=denied`);
  }

  const cookieStore = await cookies();

  cookieStore.set(ADMIN_ACCESS_COOKIE_NAME, cookieValue, {
    httpOnly: true,
    maxAge: ADMIN_ACCESS_COOKIE_MAX_AGE_SECONDS,
    path: ADMIN_ACCESS_COOKIE_PATH,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
  });

  redirect(returnPath);
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

function AdminAccessForm({ returnPath, wasDenied }: { returnPath: string; wasDenied: boolean }) {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Protected internal MVP</p>
          <h1>NOVORA Brief Detail</h1>
          <p>Enter the temporary admin access key to view protected concept brief detail.</p>
        </section>

        <section className={styles.notice} aria-label="Admin access required">
          <h2>Admin access required</h2>
          <p>This MVP gate checks a server-only access key before loading customer data.</p>
          {wasDenied ? <p>The submitted access key was not accepted.</p> : null}
          <form action={submitAdminAccessKey} className={styles.accessForm}>
            <input name="returnPath" type="hidden" value={returnPath} />
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

export default async function AdminBriefDetailPage({ params, searchParams }: AdminBriefDetailPageProps) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);
  const returnPath = `/admin/briefs/${encodeURIComponent(decodedId)}`;

  if (!isAdminAccessConfigured()) {
    return <AdminConfigurationMessage />;
  }

  const cookieStore = await cookies();
  const hasAdminAccess = isValidAdminAccessCookie(cookieStore.get(ADMIN_ACCESS_COOKIE_NAME)?.value);
  const resolvedSearchParams = await searchParams;

  if (!hasAdminAccess) {
    return <AdminAccessForm returnPath={returnPath} wasDenied={resolvedSearchParams?.access === 'denied'} />;
  }

  const serverBrief = await loadAdminConceptBriefRecordByReference(decodedId);
  let serverDataMessage: string | undefined;

  if ('message' in serverBrief) {
    serverDataMessage = serverBrief.message;
  }

  return (
    <AdminBriefDetailClient
      decodedId={decodedId}
      serverBrief={serverBrief.record}
      serverDataMessage={serverDataMessage}
    />
  );
}
