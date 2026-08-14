import styles from './SketchGallery.module.css';
import { getRequestI18n } from '../lib/i18n/request';
import { formatMessage } from '../lib/i18n/format';

type SketchGalleryItem = {
  copyIndex: number;
  variant: 'halo' | 'pendant' | 'band' | 'threeStone' | 'pearlDrop' | 'emeraldCut';
  imageSrc: string;
};

// Future replacement can come from an approved `/api/public/sketch-gallery` endpoint with approved, non-sensitive items only.
const sketchGalleryItems: SketchGalleryItem[] = [
  {
    copyIndex: 0,
    variant: 'halo',
    imageSrc: '/images/novora-early-sketch-assets/01-oval-halo-engagement-ring-early-sketch.png',
  },
  {
    copyIndex: 1,
    variant: 'pendant',
    imageSrc: '/images/novora-early-sketch-assets/02-modern-lab-diamond-pendant-early-sketch.png',
  },
  {
    copyIndex: 2,
    variant: 'band',
    imageSrc: '/images/novora-early-sketch-assets/03-minimal-pave-band-early-sketch.png',
  },
  {
    copyIndex: 3,
    variant: 'threeStone',
    imageSrc: '/images/novora-early-sketch-assets/04-romantic-three-stone-ring-early-sketch.png',
  },
  {
    copyIndex: 4,
    variant: 'pearlDrop',
    imageSrc: '/images/novora-early-sketch-assets/05-sculptural-pearl-drop-earring-early-sketch.png',
  },
  {
    copyIndex: 5,
    variant: 'emeraldCut',
    imageSrc: '/images/novora-early-sketch-assets/06-art-deco-emerald-cut-ring-early-sketch.png',
  },
];

async function SketchPreview({ imageSrc, title, variant }: { imageSrc: string; title: string; variant: SketchGalleryItem['variant'] }) {
  const { dictionary } = await getRequestI18n();
  const copy = dictionary.home;
  return (
    <div className={`${styles.preview} ${styles[variant]}`}>
      <img className={styles.previewImage} src={imageSrc} alt={formatMessage(copy.home040, { value0: title })} loading="lazy" />
    </div>
  );
}

async function SketchCard({ item, isDuplicate = false }: { item: SketchGalleryItem; isDuplicate?: boolean }) {
  const { dictionary } = await getRequestI18n();
  const copy = dictionary.home;
  const itemCopy = copy.sketchGalleryItems[item.copyIndex];
  return (
    <article className={`${styles.card} ${isDuplicate ? styles.duplicateCard : ''}`} aria-hidden={isDuplicate}>
      <SketchPreview imageSrc={item.imageSrc} title={itemCopy.title} variant={item.variant} />
      <div className={styles.cardBody}>
        <div className={styles.cardHeader}>
          <span>{itemCopy.pieceType}</span>
          <span>{itemCopy.boundaryLabel}</span>
        </div>
        <h3>{itemCopy.title}</h3>
        <ul className={styles.tags} aria-label={formatMessage(copy.home041, { value0: itemCopy.title })}>
          {itemCopy.tags.map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
      </div>
    </article>
  );
}

export default async function SketchGallery() {
  const { dictionary } = await getRequestI18n();
  const copy = dictionary.home;
  return (
    <section className={styles.gallerySection} aria-labelledby="sketch-gallery-heading">
      <div className={styles.sectionHeader}>
        <p className={styles.eyebrow}>{copy.home042}</p>
        <h2 id="sketch-gallery-heading">{copy.home043}</h2>
        <p>
          {copy.home044}</p>
      </div>

      <div className={styles.marquee} aria-label={copy.home045}>
        <div className={styles.track}>
          {sketchGalleryItems.map((item) => (
            <SketchCard key={item.variant} item={item} />
          ))}
          {sketchGalleryItems.map((item) => (
            <SketchCard key={`${item.variant}-duplicate`} item={item} isDuplicate />
          ))}
        </div>
      </div>
    </section>
  );
}
