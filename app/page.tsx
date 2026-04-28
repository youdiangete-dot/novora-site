import fs from 'node:fs';
import path from 'node:path';
import Image from 'next/image';
import Link from 'next/link';
import styles from './page.module.css';

const processSteps = [
  {
    title: 'Tell us your idea',
    body: 'Share your story, inspiration image, and preferences in a guided intake designed for first-time custom buyers.',
  },
  {
    title: 'Receive an AI concept sketch',
    body: 'Get an AI-assisted hand-drawn concept sketch so you can align on style before technical production work begins.',
  },
  {
    title: 'Continue to professional CAD',
    body: 'Move into a paid CAD service led by professional designers for dimensions, structure, and manufacturability.',
  },
  {
    title: 'Track production and delivery',
    body: 'Follow CAD updates, quote progress, production, QC, packaging, and shipping in your order center.',
  },
];

const trustPoints = [
  'Guided customization for non-experts',
  'Designer-reviewed CAD workflow',
  'Stone and material confirmation checkpoints',
  'Production, QC, packaging, and shipping tracking',
];

export default function HomePage() {
  const heroAsset = '/assets/novora_hero_main_visual.png';
  const heroAssetPath = path.join(process.cwd(), 'public', heroAsset);
  const heroExists = fs.existsSync(heroAssetPath);

  return (
    <main>
      <section className={`section ${styles.hero}`}>
        <div className="container">
          <div className={styles.heroGrid}>
            <div>
              <p className={styles.kicker}>North America-ready custom jewelry flow</p>
              <h1>Professional custom jewelry, made easier.</h1>
              <p className={styles.lead}>
                Start with an idea, a memory, or a reference image. NOVORA turns it into an AI-assisted hand-drawn
                concept sketch, then helps you continue into professional CAD and handmade production when you&apos;re ready.
              </p>
              <div className={styles.actions}>
                <Link href="/design/start" className="btn">
                  Start Your Design
                </Link>
                <a href="#how-it-works" className="btnSecondary">
                  See How It Works
                </a>
              </div>
            </div>
            <div className={`card ${styles.heroVisual}`}>
              {heroExists ? (
                <Image src={heroAsset} alt="NOVORA concept-to-CAD visual" fill className={styles.image} />
              ) : (
                <div className={styles.fallbackVisual}>
                  <p>Inspiration</p>
                  <span>→</span>
                  <p>AI Sketch</p>
                  <span>→</span>
                  <p>Professional CAD</p>
                  <span>→</span>
                  <p>Final Piece Direction</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="section">
        <div className="container">
          <h2 className={styles.heading}>How It Works</h2>
          <div className={styles.processGrid}>
            {processSteps.map((step, index) => (
              <article key={step.title} className={`card ${styles.processCard}`}>
                <p className={styles.index}>0{index + 1}</p>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="concept-vs-cad" className="section">
        <div className="container">
          <h2 className={styles.heading}>Concept Sketch vs Professional CAD</h2>
          <div className={styles.compareGrid}>
            <article className={`card ${styles.compareCard}`}>
              <p className={styles.label}>AI Concept Sketch</p>
              <ul>
                <li>Fast visual direction</li>
                <li>AI-assisted</li>
                <li>Used for inspiration and early design alignment</li>
                <li>Not production-ready</li>
              </ul>
            </article>
            <article className={`card ${styles.compareCard} ${styles.cad}`}>
              <p className={styles.label}>Professional CAD</p>
              <ul>
                <li>Paid customization step</li>
                <li>Designer-reviewed</li>
                <li>Dimensioned and prepared for manufacturing</li>
                <li>Used for quoting, revisions, and production preparation</li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2 className={styles.heading}>Why NOVORA</h2>
          <div className={styles.trustList}>
            {trustPoints.map((point) => (
              <p key={point}>{point}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className={`card ${styles.cta}`}>
            <h2>Ready to begin your custom piece?</h2>
            <Link href="/design/start" className="btn">
              Start Your Design
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
