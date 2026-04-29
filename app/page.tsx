import Link from 'next/link';
import styles from './page.module.css';

const steps = [
  {
    title: 'How It Works',
    copy: 'Tell us your story, style, and budget. We generate an AI concept sketch to start your direction quickly.',
  },
  {
    title: 'Concept Sketch vs Professional CAD',
    copy: 'Start with AI sketch exploration first. Move to precision CAD refinement as a separate paid production step.',
  },
  {
    title: 'Why NOVORA',
    copy: 'Modern U.S.-focused custom jewelry flow with clear milestones from concept to CAD to order center updates.',
  },
];

export default function HomePage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>NOVORA CUSTOM JEWELRY STUDIO</p>
          <h1>Professional custom jewelry, made easier.</h1>
          <p className={styles.lead}>
            A warm, guided experience for modern bespoke pieces — from AI concept sketch to paid professional CAD,
            then order center tracking.
          </p>
          <div className={styles.ctaRow}>
            <Link href="/design/start" className={styles.primaryCta}>
              Start your design
            </Link>
            <a href="#how-it-works" className={styles.secondaryCta}>
              See how it works
            </a>
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
