import Link from 'next/link';
import type { Metadata } from 'next';
import HomeCarousel from '../components/HomeCarousel';
import SketchGallery from '../components/SketchGallery';
import styles from './page.module.css';
import {
  getOpenGraphAlternateLocales,
  OPEN_GRAPH_LOCALES,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from '../lib/i18n/config';
import { getRequestI18n } from '../lib/i18n/request';
import type { Dictionary } from '../lib/i18n/dictionaries';
import { localizePath } from '../lib/i18n/routing';

type HomeCopy = Dictionary['home'];
type HomeCopyKey = {
  [Key in keyof HomeCopy]: HomeCopy[Key] extends string ? Key : never;
}[keyof HomeCopy];

const homeLanguageAlternates = Object.fromEntries(
  SUPPORTED_LOCALES.map((locale) => [locale, localizePath('/', locale)]),
) as Record<SupportedLocale, string>;

export async function generateMetadata(): Promise<Metadata> {
  const { dictionary, locale } = await getRequestI18n();
  const copy = dictionary.metadata.home;
  const canonicalPath = localizePath('/', locale);
  const previewImage = {
    url: '/assets/novora_hero_main_visual.png',
    width: 1448,
    height: 1086,
    alt: copy.previewImageAlt,
  };

  return {
    title: copy.title,
    description: copy.description,
    alternates: {
      canonical: canonicalPath,
      languages: homeLanguageAlternates,
    },
    openGraph: {
      siteName: 'NOVORA',
      type: 'website',
      title: `${copy.title} | NOVORA`,
      description: copy.description,
      url: canonicalPath,
      locale: OPEN_GRAPH_LOCALES[locale],
      alternateLocale: getOpenGraphAlternateLocales(locale),
      images: [previewImage],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${copy.title} | NOVORA`,
      description: copy.description,
      images: [previewImage],
    },
  };
}

const steps = [
  {
    titleKey: 'stepGuidedTitle',
    copyKey: 'stepGuidedCopy',
  },
  {
    titleKey: 'stepConceptTitle',
    copyKey: 'stepConceptCopy',
  },
  {
    titleKey: 'stepReviewTitle',
    copyKey: 'stepReviewCopy',
  },
] satisfies ReadonlyArray<{ titleKey: HomeCopyKey; copyKey: HomeCopyKey }>;

const proofPoints: HomeCopyKey[] = ['proofNoCatalog', 'proofGuidedBrief', 'proofFollowUp'];

export default async function HomePage() {
  const { dictionary, locale } = await getRequestI18n();
  const copy = dictionary.home;
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>{copy.home017}</p>
          <h1>{copy.home018}</h1>
          <p className={styles.lead}>
            {copy.home019}</p>
          <div className={styles.ctaRow}>
            <Link href={localizePath('/design/start', locale)} className={styles.primaryCta}>
              {copy.home020}</Link>
          </div>
          <div className={styles.proofStrip}>
            {proofPoints.map((point) => (
              <span key={point}>{copy[point]}</span>
            ))}
          </div>
        </div>

        <div className={styles.heroVisualColumn}>
          <HomeCarousel />

          <div className={styles.supportGrid}>
            <article className={styles.supportCard}>
              <img
                src="/assets/novora_ai_sketch_ring.png"
                alt={copy.home021}
                width="1448"
                height="1086"
                loading="lazy"
                decoding="async"
              />
              <div>
                <h3>{copy.home022}</h3>
                <p>{copy.home023}</p>
              </div>
            </article>

            <article className={styles.supportCard}>
              <img
                src="/assets/novora_cad_ring_wireframe.png"
                alt={copy.home024}
                width="1448"
                height="1086"
                loading="lazy"
                decoding="async"
              />
              <div>
                <h3>{copy.home025}</h3>
                <p>{copy.home026}</p>
              </div>
            </article>

            <article className={styles.supportCardWide}>
              <img
                src="/assets/novora_jewelry_type_icons_set.png"
                alt={copy.home027}
                width="1254"
                height="1254"
                loading="lazy"
                decoding="async"
              />
              <div>
                <h3>{copy.home028}</h3>
                <p>{copy.home029}</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <SketchGallery />

      <section id="how-it-works" className={styles.stepsSection}>
        {steps.map((step) => (
          <article key={step.titleKey} className={styles.stepCard}>
            <h2>{copy[step.titleKey]}</h2>
            <p>{copy[step.copyKey]}</p>
          </article>
        ))}
      </section>

      <section id="concept-vs-cad" className={styles.boundarySection} aria-labelledby="concept-vs-cad-heading">
        <div>
          <p className={styles.boundaryEyebrow}>{copy.home030}</p>
          <h2 id="concept-vs-cad-heading">{copy.home031}</h2>
        </div>
        <p>
          {copy.home032}</p>
      </section>
    </main>
  );
}
