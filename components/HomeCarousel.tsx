'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import styles from './HomeCarousel.module.css';

const slides = [
  {
    src: '/assets/carousel_ring.png',
    alt: 'Custom NOVORA ring concept',
    title: 'Ring concept',
  },
  {
    src: '/assets/carousel_necklace.png',
    alt: 'Custom NOVORA necklace concept',
    title: 'Necklace concept',
  },
  {
    src: '/assets/carousel_chain_bracelet.png',
    alt: 'Custom NOVORA chain bracelet concept',
    title: 'Chain bracelet',
  },
  {
    src: '/assets/carousel_bangle.png',
    alt: 'Custom NOVORA bangle concept',
    title: 'Bangle concept',
  },
  {
    src: '/assets/carousel_pendant.png',
    alt: 'Custom NOVORA pendant concept',
    title: 'Pendant concept',
  },
  {
    src: '/assets/carousel_stud_earrings.png',
    alt: 'Custom NOVORA stud earrings concept',
    title: 'Stud earrings',
  },
  {
    src: '/assets/carousel_drop_earrings.png',
    alt: 'Custom NOVORA drop earrings concept',
    title: 'Drop earrings',
  },
  {
    src: '/assets/carousel_emerald_cut_eternity_ring.png',
    alt: 'Custom NOVORA emerald cut eternity ring concept',
    title: 'Emerald eternity',
  },
];

export default function HomeCarousel() {
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
    <div className={styles.carousel} aria-label="NOVORA custom jewelry carousel">
      <div className={styles.stage}>
        {slides.map((slide, index) => (
          <div
            key={slide.src}
            className={`${styles.slide} ${index === activeIndex ? styles.activeSlide : ''}`}
            aria-hidden={index !== activeIndex}
          >
            <Image src={slide.src} alt={slide.alt} fill priority={index === 0} sizes="(max-width: 1100px) 100vw, 50vw" />
          </div>
        ))}

        <div className={styles.caption}>
          <span>Illustrative concept preview</span>
          <strong>{slides[activeIndex].title}</strong>
        </div>

        <button className={`${styles.navButton} ${styles.previous}`} type="button" onClick={showPrevious} aria-label="Previous carousel image">
          {'<'}
        </button>
        <button className={`${styles.navButton} ${styles.next}`} type="button" onClick={showNext} aria-label="Next carousel image">
          {'>'}
        </button>
      </div>

      <div className={styles.dots} aria-label="Select carousel image">
        {slides.map((slide, index) => (
          <button
            key={slide.src}
            className={`${styles.dot} ${index === activeIndex ? styles.activeDot : ''}`}
            type="button"
            onClick={() => setActiveIndex(index)}
            aria-label={`Show ${slide.title}`}
            aria-current={index === activeIndex}
          />
        ))}
      </div>
    </div>
  );
}
