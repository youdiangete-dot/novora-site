import Link from 'next/link';
import { getRequestI18n } from '../../../lib/i18n/request';
import { localizePath } from '../../../lib/i18n/routing';

export default async function ProCadPage() {
  const { dictionary, locale } = await getRequestI18n();
  const copy = dictionary.cadProcess;
  return (
    <main className="page-shell">
      <p className="kicker">{copy.cad001}</p>
      <h1>{copy.cad002}</h1>

      <section className="card" style={{ maxWidth: 880 }}>
        <p style={{ lineHeight: 1.7, color: 'var(--muted)' }}>
          {copy.cad003}</p>
        <p style={{ lineHeight: 1.7, color: 'var(--muted)' }}>
          {copy.cad004}</p>
        <ul style={{ marginBottom: '1.2rem', lineHeight: 1.7 }}>
          <li>{copy.cad006}</li>
          <li>{copy.cad007}</li>
          <li>{copy.cad008}</li>
        </ul>
        <Link href={localizePath('/design/start', locale)} className="btn primary">
          {copy.cad010}</Link>
      </section>
    </main>
  );
}
