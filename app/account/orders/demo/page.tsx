const orderSteps = [
  'Concept Sketch Completed',
  'CAD Design In Progress',
  'Stone & Material Confirmation',
  'CAD Revision',
  'Quote Confirmation',
  'Production',
  'QC',
  'Packaging',
  'Shipping',
];

export default function OrdersDemoPage() {
  return (
    <main className="page-shell">
      <p className="kicker">Order Center Demo</p>
      <h1>Track your custom jewelry order</h1>
      <p style={{ color: 'var(--muted)' }}>Transparent milestones from concept to delivery.</p>

      <section className="card" style={{ maxWidth: 860 }}>
        <ol style={{ margin: 0, paddingLeft: '1.2rem', display: 'grid', gap: '0.8rem' }}>
          {orderSteps.map((step, index) => (
            <li key={step} style={{ padding: '0.7rem 0.2rem', borderBottom: '1px solid var(--line)' }}>
              <span style={{ fontWeight: 600 }}>{step}</span>
              <span style={{ marginLeft: 8, color: 'var(--muted)', fontSize: '0.88rem' }}>Step {index + 1}</span>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
