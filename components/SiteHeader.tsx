import Link from 'next/link';
import styles from './SiteHeader.module.css';

const navItems = [
  { label: 'How It Works', href: '/#how-it-works' },
  { label: 'Concept Sketch', href: '/#concept-vs-cad' },
  { label: 'CAD Process', href: '/design/pro-cad' },
  { label: 'Order Tracking', href: '/account/orders/demo' },
];

export default function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.brand}>
          NOVORA
        </Link>
        <nav aria-label="Main navigation" className={styles.nav}>
          {navItems.map((item) => (
            <Link key={item.label} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <Link href="/design/start" className="btn">
          Start Your Design
        </Link>
      </div>
    </header>
  );
}
