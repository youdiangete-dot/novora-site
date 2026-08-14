'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import styles from './HomeCarousel.module.css';
import { useI18n } from '../lib/i18n/client';
import { formatMessage } from '../lib/i18n/format';

const slides = [
  {
    src: '/assets/carousel_ring.png',
    altKey: 'home001',
    titleKey: 'home002',
  },
  {
    src: '/assets/carousel_necklace.png',
    altKey: 'home003',
    titleKey: 'home004',
  },
  {
    src: '/assets/carousel_chain_bracelet.png',
    altKey: 'home005',
    titleKey: 'home006',
  },
  {
    src: '/assets/carousel_bangle.png',
    altKey: 'home007',
    titleKey: 'home008',
  },
  {
    src: '/assets/carousel_pendant.png',
    altKey: 'home009',
    titleKey: 'home010',
  },
  {
    src: '/assets/carousel_stud_earrings.png',
    altKey: 'home011',
    titleKey: 'home012',
  },
  {
    src: '/assets/carousel_drop_earrings.png',
    altKey: 'home013',
    titleKey: 'home014',
  },
  {
    src: '/assets/carousel_emerald_cut_eternity_ring.png',
    altKey: 'home015',
    titleKey: 'home016',
  },
] as const;

export default function HomeCarousel() {
  const { dictionary } = useI18n();
  const copy = dictionary.home;
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 4200);

    return () => window.clearInterval(timer);
  }, []);

  const showPrevious = () => {
    setActiveIndex((current) => (current - 1 + slides.length) % slides.length);
  };

  const showNext = () => {
    setActiveIndex((current) => (current + 1) % slides.length);
  };

  return (
    <div className={styles.carousel} aria-label={copy.home033}>
      <div className={styles.stage}>
        {slides.map((slide, index) => (
          <div
            key={slide.src}
            className={`${styles.slide} ${index === activeIndex ? styles.activeSlide : ''}`}
            aria-hidden={index !== activeIndex}
          >
            <Image src={slide.src} alt={copy[slide.altKey]} fill priority={index === 0} sizes="(max-width: 1100px) 100vw, 50vw" />
          </div>
        ))}

        <div className={styles.caption}>
          <span>{copy.home035}</span>
          <strong>{copy[slides[activeIndex].titleKey]}</strong>
        </div>

        <button
          className={`${styles.navButton} ${styles.previous}`}
          type="button"
          onClick={showPrevious}
          aria-label={copy.home036}
        >
          {'<'}
        </button>
        <button
          className={`${styles.navButton} ${styles.next}`}
          type="button"
          onClick={showNext}
          aria-label={copy.home037}
        >
          {'>'}
        </button>
      </div>

      <div className={styles.dots} aria-label={copy.home038}>
        {slides.map((slide, index) => (
          <button
            key={slide.src}
            className={`${styles.dot} ${index === activeIndex ? styles.activeDot : ''}`}
            type="button"
            onClick={() => setActiveIndex(index)}
            aria-label={formatMessage(copy.home039, { value0: copy[slide.titleKey] })}
            aria-current={index === activeIndex}
          />
        ))}
      </div>
    </div>
  );
}
