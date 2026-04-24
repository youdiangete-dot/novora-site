import Link from 'next/link';

export default function DesignConceptPage() {
  return (
    <main className="page-shell">
      <p className="kicker">AI Concept Sketch</p>
      <h1>Concept direction generated</h1>
      <div className="card" style={{ maxWidth: 860 }}>
        <p style={{ marginBottom: '0.4rem', fontWeight: 600 }}>Important clarification:</p>
        <p style={{ color: 'var(--muted)', lineHeight: 1.7, marginBottom: '1rem' }}>
          This is an AI-generated concept sketch for inspiration and direction. It is NOT a production-ready CAD file.
        </p>
        <div
          style={{
            background: 'linear-gradient(145deg, #f6efe5, #fff)',
            border: '1px solid var(--line)',
            borderRadius: 14,
            minHeight: 260,
            display: 'grid',
            placeItems: 'center',
            color: 'var(--muted)',
          }}
        >
          Hand-drawn style concept sketch preview area
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
        <Link href="/design/pro-cad" className="btn primary">
          Continue to professional CAD
        </Link>
        <Link href="/design/start" className="btn">
          Back to intake
        </Link>
      </div>
    </main>
  );
}
