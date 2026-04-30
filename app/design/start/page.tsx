import Link from 'next/link';
import styles from './start.module.css';

const recipients = ['Myself', 'Partner', 'Family/Friend', 'Commemorative'];
const jewelryTypes = ['Ring', 'Pendant', 'Earrings', 'Bracelet'];
const stylesChips = ['Minimal', 'Organic', 'Vintage-inspired', 'Bold modern'];
const budgets = ['Under USD 500', 'USD 500-1200', 'USD 1200-2500', 'USD 2500+'];
const checklist = ['AI concept sketch first', 'Paid CAD after approval', 'Order center for production updates'];

export default function DesignStartPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.step}>Step 1 · Design Intake</p>
          <h1>Build your custom jewelry brief</h1>
        </div>
        <p className={styles.headerNote}>A compact studio flow for first-time custom jewelry buyers.</p>
      </header>

      <section className={styles.layout}>
        <div className={styles.leftCol}>
          <article className={styles.card}>
            <div className={styles.cardHead}>
              <h2>Recipient</h2>
              <span>Who is it for?</span>
            </div>
            <img src="/assets/novora_recipient_icons_set.png" alt="Recipient icon set" className={styles.inlineVisual} />
            <div className={styles.chips}>{recipients.map((item) => <button key={item}>{item}</button>)}</div>
          </article>

          <article className={styles.card}>
            <div className={styles.cardHead}>
              <h2>Jewelry type</h2>
              <span>Choose a starting form</span>
            </div>
            <img src="/assets/novora_jewelry_type_icons_set.png" alt="Jewelry type icon set" className={styles.inlineVisual} />
            <div className={styles.cardGrid}>{jewelryTypes.map((item) => <button key={item}>{item}</button>)}</div>
          </article>

          <article className={styles.card}>
            <div className={styles.cardHead}>
              <h2>Style preference</h2>
              <span>Set the visual tone</span>
            </div>
            <img src="/assets/novora_style_icons_set.png" alt="Style icon set" className={styles.inlineVisual} />
            <div className={styles.chips}>{stylesChips.map((item) => <button key={item}>{item}</button>)}</div>
          </article>

          <article className={styles.cardCompact}>
            <h2>Budget</h2>
            <div className={styles.chips}>{budgets.map((item) => <button key={item}>{item}</button>)}</div>
          </article>

          <article className={styles.cardCompact}>
            <h2>Upload references</h2>
            <div className={styles.uploadArea}>
              <img src="/assets/novora_upload_reference_placeholder.png" alt="Reference upload placeholder" />
              <p>Drop inspiration photos, sketches, or meaningful symbols.</p>
            </div>
          </article>
        </div>

        <aside className={styles.rightCol}>
          <div className={styles.stickyBox}>
            <article className={styles.panelCardHero}>
              <div>
                <h3>Preview lane</h3>
                <p>We start with an AI concept sketch based on your selections.</p>
              </div>
              <img src="/assets/novora_ai_sketch_pendant.png" alt="AI pendant sketch preview" />
            </article>

            <article className={styles.panelCard}>
              <h3>What happens next</h3>
              <ul>
                {checklist.map((item) => <li key={item}>{item}</li>)}
              </ul>
              <p className={styles.note}>
                You’ll receive an AI concept sketch first. Professional CAD is a separate paid step.
              </p>
              <Link href="/design/concept" className={styles.cta}>Continue to Concept</Link>
            </article>
          </div>
        </aside>
      </section>
    </main>
  );
}
