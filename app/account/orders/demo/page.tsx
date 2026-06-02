const futureWorkflowSteps = [
  'Concept Direction Review',
  'CAD Scope Discussion',
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
      <p className="kicker">Future Workflow Demo - Non-functional</p>
      <h1>Preview a possible future order workflow</h1>
      <p style={{ color: 'var(--muted)' }}>
        This illustration is not a live order center. NOVORA does not currently provide customer accounts, order
        tracking, or live production milestones.
      </p>

      <section className="card" style={{ maxWidth: 860 }}>
        <h2>Illustrative future steps</h2>
        <p style={{ color: 'var(--muted)' }}>
          Any CAD, quotation, production, quality-control, packaging, or shipping process is discussed and confirmed
          separately with NOVORA.
        </p>
        <ol style={{ margin: 0, paddingLeft: '1.2rem', display: 'grid', gap: '0.8rem' }}>
          {futureWorkflowSteps.map((step, index) => (
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
