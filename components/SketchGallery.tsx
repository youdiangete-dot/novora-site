import styles from './SketchGallery.module.css';

type SketchGalleryItem = {
  title: string;
  pieceType: string;
  tags: string[];
  boundaryLabel: string;
  variant: 'halo' | 'pendant' | 'band' | 'threeStone' | 'pearlDrop' | 'emeraldCut';
};

// Future replacement can come from an approved `/api/public/sketch-gallery` endpoint with approved, non-sensitive items only.
const sketchGalleryItems: SketchGalleryItem[] = [
  {
    title: 'Oval halo engagement ring concept',
    pieceType: 'Ring',
    tags: ['Oval center', 'Soft halo', 'Refined'],
    boundaryLabel: 'Concept sketch only',
    variant: 'halo',
  },
  {
    title: 'Modern lab diamond pendant concept',
    pieceType: 'Pendant',
    tags: ['Lab diamond', 'Minimal', 'Daily wear'],
    boundaryLabel: 'Concept direction',
    variant: 'pendant',
  },
  {
    title: 'Minimal pave band concept',
    pieceType: 'Band',
    tags: ['Pave detail', 'Low profile', 'Quiet shine'],
    boundaryLabel: 'Not CAD or quote',
    variant: 'band',
  },
  {
    title: 'Romantic three-stone ring concept',
    pieceType: 'Ring',
    tags: ['Three stone', 'Balanced', 'Personal'],
    boundaryLabel: 'Studio review first',
    variant: 'threeStone',
  },
  {
    title: 'Sculptural pearl drop earring concept',
    pieceType: 'Earrings',
    tags: ['Pearl drop', 'Sculptural', 'Warm line'],
    boundaryLabel: 'Concept sketch only',
    variant: 'pearlDrop',
  },
  {
    title: 'Art deco emerald-cut ring concept',
    pieceType: 'Ring',
    tags: ['Emerald cut', 'Art deco', 'Architectural'],
    boundaryLabel: 'Concept direction',
    variant: 'emeraldCut',
  },
];

function SketchPreview({ variant, title }: Pick<SketchGalleryItem, 'variant' | 'title'>) {
  return (
    <div className={`${styles.preview} ${styles[variant]}`} role="img" aria-label={`Mock hand-drawn preview for ${title}`}>
      <span className={styles.sketchLine} />
      <span className={styles.sketchLineSecondary} />
      <span className={styles.sketchStone} />
      <span className={styles.sketchAccentOne} />
      <span className={styles.sketchAccentTwo} />
    </div>
  );
}

function SketchCard({ item, isDuplicate = false }: { item: SketchGalleryItem; isDuplicate?: boolean }) {
  return (
    <article className={`${styles.card} ${isDuplicate ? styles.duplicateCard : ''}`} aria-hidden={isDuplicate}>
      <SketchPreview variant={item.variant} title={item.title} />
      <div className={styles.cardBody}>
        <div className={styles.cardHeader}>
          <span>{item.pieceType}</span>
          <span>{item.boundaryLabel}</span>
        </div>
        <h3>{item.title}</h3>
        <ul className={styles.tags} aria-label={`${item.title} style tags`}>
          {item.tags.map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
      </div>
    </article>
  );
}

export default function SketchGallery() {
  return (
    <section className={styles.gallerySection} aria-labelledby="sketch-gallery-heading">
      <div className={styles.sectionHeader}>
        <p className={styles.eyebrow}>Curated mock concept sketch preview</p>
        <h2 id="sketch-gallery-heading">From idea notes to refined sketch direction.</h2>
        <p>
          Mock previews of the kind of concept-only visual language NOVORA can shape before any later CAD, quotation,
          order, or production approval discussion.
        </p>
      </div>

      <div className={styles.marquee} aria-label="Curated mock concept sketch gallery">
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
