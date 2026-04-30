import Link from 'next/link';
import styles from './page.module.css';

const steps = [
  {
    title: '01 · Guided intake',
    copy: 'Share the recipient, style, budget, and reference images in a focused custom brief.',
  },
  {
    title: '02 · AI concept sketch',
    copy: 'Receive a fast visual direction first, before paying for production-grade CAD.',
  },
  {
    title: '03 · Paid CAD + order tracking',
    copy: 'Move into professional CAD, quote review, production updates, QC, packaging, and delivery.',
  },
];

const proofPoints = ['No template catalog', 'Designer-reviewed CAD step', 'Transparent order milestones'];

export default function HomePage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>NOVORA CUSTOM JEWELRY STUDIO</p>
          <h1>Professional custom jewelry, made easier.</h1>
          <p className={styles.lead}>
            A warm, guided path for modern bespoke pieces — start with an AI concept sketch, then move into paid
            professional CAD and order tracking when you are ready.
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
          <div className={styles.heroVisualFrame}>
            <img src="/assets/novora_hero_main_visual.png" alt="NOVORA custom jewelry hero" className={styles.heroVisual} />
          </div>

          <div className={styles.supportGrid}>
            <article className={styles.supportCard}>
              <img src="/assets/novora_ai_sketch_ring.png" alt="AI sketch ring preview" />
              <div>
                <h3>AI Sketch First</h3>
                <p>Rapid concept direction in minutes.</p>
              </div>
            </article>

            <article className={styles.supportCard}>
              <img src="/assets/novora_cad_ring_wireframe.png" alt="CAD ring wireframe preview" />
              <div>
                <h3>Paid CAD Next</h3>
                <p>Technical precision before production.</p>
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
