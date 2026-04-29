import Link from 'next/link';
import styles from './start.module.css';

const recipients = ['Myself', 'Partner', 'Family/Friend', 'Commemorative'];
const jewelryTypes = ['Ring', 'Pendant', 'Earrings', 'Bracelet'];
const stylesChips = ['Minimal', 'Organic', 'Vintage-inspired', 'Bold modern'];
const budgets = ['Under USD 500', 'USD 500-1200', 'USD 1200-2500', 'USD 2500+'];

export default function DesignStartPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.step}>Step 1 · Design Intake</p>
        <h1>Build your custom jewelry brief</h1>
      </header>

      <section className={styles.layout}>
        <div className={styles.leftCol}>
          <article className={styles.card}>
            <h2>Recipient</h2>
            <img src="/assets/novora_recipient_icons_set.png" alt="Recipient icon set" className={styles.inlineVisual} />
            <div className={styles.chips}>{recipients.map((item) => <button key={item}>{item}</button>)}</div>
          </article>

          <article className={styles.card}>
            <h2>Jewelry type</h2>
            <img src="/assets/novora_jewelry_type_icons_set.png" alt="Jewelry type icon set" className={styles.inlineVisual} />
            <div className={styles.cardGrid}>{jewelryTypes.map((item) => <button key={item}>{item}</button>)}</div>
          </article>

          <article className={styles.card}>
            <h2>Style preference</h2>
            <img src="/assets/novora_style_icons_set.png" alt="Style icon set" className={styles.inlineVisual} />
            <div className={styles.chips}>{stylesChips.map((item) => <button key={item}>{item}</button>)}</div>
          </article>

          <article className={styles.card}>
            <h2>Budget</h2>
            <div className={styles.chips}>{budgets.map((item) => <button key={item}>{item}</button>)}</div>
          </article>

          <article className={styles.card}>
            <h2>Upload references</h2>
            <div className={styles.uploadArea}>
              <img src="/assets/novora_upload_reference_placeholder.png" alt="Reference upload placeholder" />
              <p>Drop inspiration photos, sketches, or meaningful symbols.</p>
            </div>
          </article>
        </div>

        <aside className={styles.rightCol}>
          <div className={styles.stickyBox}>
            <article className={styles.panelCard}>
              <h3>Preview lane</h3>
              <img src="/assets/novora_ai_sketch_pendant.png" alt="AI pendant sketch preview" />
              <p>We start with an AI concept sketch based on your selections.</p>
            </article>

            <article className={styles.panelCard}>
              <h3>Brief summary</h3>
              <ul>
                <li>Recipient and style aligned</li>
                <li>Jewelry type and budget selected</li>
                <li>Reference images ready for upload</li>
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
