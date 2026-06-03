import Link from 'next/link';

export default function ProCadPage() {
  return (
    <main className="page-shell">
      <p className="kicker">CAD Process Preview</p>
      <h1>How NOVORA approaches paid CAD later</h1>

      <section className="card" style={{ maxWidth: 880 }}>
        <p style={{ lineHeight: 1.7, color: 'var(--muted)' }}>
          Professional CAD is a separate paid studio step discussed after NOVORA reviews your Concept Brief. The
          website does not automatically generate CAD files, start production, or open an online order workflow.
        </p>
        <p style={{ lineHeight: 1.7, color: 'var(--muted)' }}>
          When a piece is ready for CAD discussion, NOVORA confirms the scope, fee, materials direction, stone details,
          and revision process with you separately before any technical design work begins.
        </p>
        <ul style={{ marginBottom: '1.2rem', lineHeight: 1.7 }}>
          <li>Studio review of the Concept Brief first</li>
          <li>CAD scope, fee, and process confirmed separately</li>
          <li>Quotation and production decisions handled through manual follow-up</li>
        </ul>
        <Link href="/design/start" className="btn primary">
          Start a Concept Brief
        </Link>
      </section>
    </main>
  );
}
