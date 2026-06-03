import Link from 'next/link';
import HomeCarousel from '../components/HomeCarousel';
import styles from './page.module.css';

const steps = [
  {
    title: '01 · Guided intake',
    copy: 'Share the recipient, style, budget, and reference images in a focused custom brief.',
  },
  {
    title: '02 · Concept direction',
    copy: 'Shape an initial visual direction through a guided Concept Brief and illustrative previews.',
  },
  {
    title: '03 · Studio review + follow-up',
    copy: 'NOVORA reviews your brief and follows up to discuss offline CAD, quotation, and any later decisions separately.',
  },
];

const proofPoints = ['No template catalog', 'Guided Concept Brief', 'Personal studio follow-up'];

export default function HomePage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>NOVORA CUSTOM JEWELRY STUDIO</p>
          <h1>Professional custom jewelry, made easier.</h1>
          <p className={styles.lead}>
            A warm, guided path for modern bespoke pieces — start with a Concept Brief, then move into studio review
            and personal follow-up for any later CAD and quotation discussion.
          </p>
          <div className={styles.ctaRow}>
            <Link href="/design/start" className={styles.primaryCta}>
              Start your design
            </Link>
            <a href="#how-it-works" className={styles.secondaryCta}>
              See how it works
            </a>
          </div>
          <div className={styles.proofStrip}>
            {proofPoints.map((point) => (
              <span key={point}>{point}</span>
            ))}
          </div>
        </div>

        <div className={styles.heroVisualColumn}>
          <HomeCarousel />

          <div className={styles.supportGrid}>
            <article className={styles.supportCard}>
              <img src="/assets/novora_ai_sketch_ring.png" alt="Illustrative ring concept preview" />
              <div>
                <h3>Illustrative Preview</h3>
                <p>Example concept direction for your brief.</p>
              </div>
            </article>

            <article className={styles.supportCard}>
              <img src="/assets/novora_cad_ring_wireframe.png" alt="CAD ring wireframe preview" />
              <div>
                <h3>Paid CAD Later</h3>
                <p>Scope, fee, and process confirmed separately.</p>
              </div>
            </article>

            <article className={styles.supportCardWide}>
              <img src="/assets/novora_jewelry_type_icons_set.png" alt="Jewelry type icon set" />
              <div>
                <h3>Choose Your Piece Type</h3>
                <p>Ring, pendant, and more — with clear guided options.</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section id="how-it-works" className={styles.stepsSection}>
        <span id="concept-vs-cad" className={styles.anchorTarget} aria-hidden="true" />
        {steps.map((step) => (
          <article key={step.title} className={styles.stepCard}>
            <h2>{step.title}</h2>
            <p>{step.copy}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
