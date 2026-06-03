import type { Metadata } from 'next';
import styles from '../legal-draft.module.css';

export const metadata: Metadata = {
  title: 'Draft Privacy Policy | NOVORA',
  description: 'Draft NOVORA privacy policy text for owner and legal review.',
};

export default function PrivacyDraftPage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.hero} aria-labelledby="privacy-draft-title">
          <p className={styles.eyebrow}>Draft for owner/legal review</p>
          <h1 id="privacy-draft-title">Draft Privacy Policy</h1>
          <p className={styles.lead}>
            This review page describes how NOVORA currently expects to handle Concept Brief
            information. It is written for owner/legal review before any final public privacy
            policy is approved.
          </p>
          <ul className={styles.draftFlags} aria-label="Draft legal review status">
            <li>Draft for owner/legal review</li>
            <li>Not final legal text</li>
            <li>Not legal advice</li>
          </ul>
        </section>

        <section className={styles.reviewNotice} aria-label="Draft reliance notice">
          <p className={styles.statusLabel}>Review boundary</p>
          <p>
            Do not rely on this as a published Privacy Policy / Terms until reviewed and
            approved. This draft does not claim legal compliance, launch approval, or commercial
            readiness.
          </p>
        </section>

        <div className={styles.sectionGrid}>
          <section className={styles.section}>
            <h2>What NOVORA Collects</h2>
            <ul>
              <li>Customer name and email address.</li>
              <li>Optional phone or WhatsApp, country or region, and contact note.</li>
              <li>Concept Brief answers, design preferences, budget planning range, and notes.</li>
              <li>Final reference images uploaded on the brief submission page.</li>
              <li>Upload metadata such as filename, file type, size, and attachment status.</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>How NOVORA Uses It</h2>
            <ul>
              <li>To review the Concept Brief and understand the design direction.</li>
              <li>To follow up manually using the contact details the customer provides.</li>
              <li>To clarify reference images, materials direction, and project questions.</li>
              <li>To support internal studio review and operational tracking.</li>
              <li>To discuss paid CAD, quote, sourcing, or production questions later if the project proceeds.</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>Current Exclusions</h2>
            <ul>
              <li>NOVORA does not currently collect payment data through the website.</li>
              <li>NOVORA does not currently provide customer account login data.</li>
              <li>Real AI generation is not currently implemented in the Concept Brief flow.</li>
              <li>CAD automation, order tracking, checkout, and production workflows are not currently implemented online.</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>Service Providers</h2>
            <p>
              NOVORA currently uses Vercel for hosting, Supabase for database and private reference
              image storage, Resend for admin notification email, and Cloudflare for DNS and domain
              infrastructure. Future providers need separate owner/legal review before public use.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Reference Images</h2>
            <p>
              Customers should upload only files they have the right to share. Final reference
              images guide concept review and are not CAD approval, final design approval, pricing,
              or production approval. Planning references selected earlier in the concept flow are
              not the final uploaded files.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Internal Review Data</h2>
            <p>
              NOVORA may keep high-level internal review status, internal notes, notification
              metadata, and local browser/session storage used for draft recovery or receipt
              display. Browser storage alone is not proof that NOVORA received a brief.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Manual Studio Process</h2>
            <p>
              CAD, quote discussion, gemstone sourcing, production feasibility, quality control,
              packaging, and logistics remain separate manual or offline steps. They require
              separate confirmation outside the current Concept Brief submission.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Security Summary</h2>
            <p>
              NOVORA uses practical server-side controls, protected admin routes, private storage,
              and managed service providers. No system can be promised as perfectly secure, and
              this draft does not make a security guarantee.
            </p>
          </section>

          <section className={`${styles.section} ${styles.sectionWide}`}>
            <h2>Topics Still To Finalize</h2>
            <p>
              Data retention, access, deletion, correction requests, international privacy topics
              including California, EU, UK, Taiwan, and other markets, and children/minors language
              all require owner/legal review before publication. NOVORA is not intended for
              children or minors as a draft review point. Privacy contact: [privacy contact email to
              be confirmed].
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
