import Link from 'next/link';
import styles from './SiteHeader.module.css';

const navItems = [
  { label: 'How It Works', href: '/#how-it-works' },
  { label: 'Concept vs CAD', href: '/#concept-vs-cad' },
  { label: 'CAD Process', href: '/design/pro-cad' },
];

export default function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.brand} aria-label="NOVORA home">
          NOVORA
        </Link>
        <nav aria-label="Main navigation" className={styles.nav}>
          {navItems.map((item) => (
            <Link key={item.label} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <Link href="/design/start" className="btn" aria-label="Start a Concept Brief">
          Start a Concept Brief
        </Link>
      </div>
    </header>
  );
}
