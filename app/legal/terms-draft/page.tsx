import type { Metadata } from 'next';
import styles from '../legal-draft.module.css';

export const metadata: Metadata = {
  title: 'Draft Terms / Service Boundary | NOVORA',
  description: 'Draft NOVORA terms and service-boundary text for owner and legal review.',
};

export default function TermsDraftPage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.hero} aria-labelledby="terms-draft-title">
          <p className={styles.eyebrow}>Draft for owner/legal review</p>
          <h1 id="terms-draft-title">Draft Terms / Service Boundary</h1>
          <p className={styles.lead}>
            This review page frames the current NOVORA Concept Brief service boundary in plain
            language. It is not approved final Terms of Service text.
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
          <section className={`${styles.section} ${styles.sectionWide}`}>
            <h2>Concept Brief Is Not An Order</h2>
            <p>
              A Concept Brief is not an order. Submitting a Concept Brief asks NOVORA to review a
              design direction and contact details for possible manual follow-up. It does not create
              a payment, binding quote, CAD approval, production start, order tracking, confirmed
              project acceptance, or final custom jewelry order.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Concept Direction And AI Boundary</h2>
            <p>
              Any sketch preview or concept-direction language is separate from production CAD.
              Real AI generation is not currently implemented in the Concept Brief flow unless
              NOVORA later implements and discloses it through separately reviewed text.
            </p>
          </section>

          <section className={styles.section}>
            <h2>CAD, Pricing, And Production</h2>
            <p>
              CAD scope, CAD fees, quote discussion, gemstone sourcing, production feasibility,
              quality control, packaging, and logistics remain separate manual or offline steps.
              Each requires separate NOVORA confirmation if the project proceeds.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Reference Images</h2>
            <p>
              Customers should upload or share only reference images they have the right to provide.
              References guide concept review only and do not approve CAD, pricing, final design,
              production, or use of any third-party design.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Communication And Follow-Up</h2>
            <p>
              NOVORA may use the provided name, email, optional phone or WhatsApp, country or
              region, and contact note to follow up manually about the Concept Brief. Response
              timing and project next steps are not guaranteed by submission alone.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Demo And Future Workflow Pages</h2>
            <p>
              Any demo or future workflow page is a non-functional preview unless NOVORA explicitly
              implements the feature. The current website does not provide live customer accounts,
              checkout, order tracking, CAD automation, or production milestone tracking.
            </p>
          </section>

          <section className={styles.section}>
            <h2>No Project Guarantee</h2>
            <p>
              NOVORA may request more information, decline a concept, or determine that a project is
              not suitable for CAD, sourcing, production, or continued review. Submission does not
              guarantee that NOVORA will accept or produce a project.
            </p>
          </section>

          <section className={`${styles.section} ${styles.sectionWide}`}>
            <h2>Owner And Legal Review Required</h2>
            <p>
              These draft service-boundary terms need owner/legal review before publication. Final
              Terms should be approved separately before NOVORA adds final legal pages, footer
              links, acceptance language, launch approval claims, or commercial-readiness claims.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
