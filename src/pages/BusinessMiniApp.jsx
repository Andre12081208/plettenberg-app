export default function BusinessMiniApp({ app, onBack }) {
  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>{app.company_name}</h1>
      </div>
      <main>
        <button className="link-text" onClick={onBack} style={{ marginBottom: 16 }}>← Zurück</button>

        <div className="card">
          {app.description && <p style={{ fontSize: 14 }}>{app.description}</p>}
          {app.address && <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{app.address}</p>}
          {app.phone && <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Tel: {app.phone}</p>}
          {app.website && (
            <p style={{ fontSize: 13 }}>
              <a href={app.website} target="_blank" rel="noreferrer" style={{ color: 'var(--forest)' }}>
                {app.website}
              </a>
            </p>
          )}
          {app.contact_person && (
            <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Ansprechpartner: {app.contact_person}</p>
          )}
        </div>
      </main>
    </div>
  )
}
