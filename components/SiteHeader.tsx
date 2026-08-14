import Link from 'next/link';
import LanguageSwitcher from './LanguageSwitcher';
import styles from './SiteHeader.module.css';
import { getRequestI18n } from '../lib/i18n/request';
import { localizePath } from '../lib/i18n/routing';

const navItems = [
  { labelKey: 'nav001', href: '/#how-it-works' },
  { labelKey: 'nav002', href: '/#concept-vs-cad' },
  { labelKey: 'nav003', href: '/design/pro-cad' },
] as const;

export default async function SiteHeader() {
  const { dictionary, locale } = await getRequestI18n();
  const copy = dictionary.navigation;
  const accessibilityCopy = dictionary.accessibility;
  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link href={localizePath('/', locale)} className={styles.brand} aria-label={copy.nav004}>
          {copy.nav005}</Link>
        <nav aria-label={accessibilityCopy.mainNavigation} className={styles.nav}>
          {navItems.map((item) => (
            <Link key={item.href} href={localizePath(item.href, locale)}>
              {copy[item.labelKey]}
            </Link>
          ))}
        </nav>
        <div className={styles.actions}>
          <LanguageSwitcher />
          <Link href={localizePath('/design/start', locale)} className="btn" aria-label={copy.nav007}>
            {copy.nav007}</Link>
        </div>
      </div>
    </header>
  );
}
