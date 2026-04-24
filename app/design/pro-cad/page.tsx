import Link from 'next/link';

export default function ProCadPage() {
  return (
    <main className="page-shell">
      <p className="kicker">Professional CAD Service</p>
      <h1>Move from concept to production-grade design</h1>

      <section className="card" style={{ maxWidth: 880 }}>
        <p style={{ lineHeight: 1.7, color: 'var(--muted)' }}>
          CAD is a paid customization service handled by professional designers. Your selected concept direction,
          materials, and stone preferences are translated into precision technical files suitable for quoting,
          revisions, and manufacturing preparation.
        </p>
        <ul style={{ marginBottom: '1.2rem', lineHeight: 1.7 }}>
          <li>Dedicated designer review</li>
          <li>Dimension and setting optimization</li>
          <li>Structured revision checkpoints</li>
        </ul>
        <Link href="/account/orders/demo" className="btn primary">
          Open order center demo
        </Link>
      </section>
    </main>
  );
}
