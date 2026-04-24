import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="page-shell">
      <p className="kicker">NOVORA</p>
      <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)', letterSpacing: '-0.03em', maxWidth: 720 }}>
        Professional custom jewelry, made easier.
      </h1>
      <p style={{ color: 'var(--muted)', maxWidth: 620, lineHeight: 1.6 }}>
        A modern, efficient design workflow for custom pieces—from guided intake to concept, professional CAD,
        and transparent order tracking.
      </p>

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
        <Link href="/design/start" className="btn primary">
          Start a design
        </Link>
        <Link href="/account/orders/demo" className="btn">
          View order center demo
        </Link>
      </div>
    </main>
  );
}
