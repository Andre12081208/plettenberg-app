export default function MasterDashboard({ hasPrivateProfile, hasBusinessProfile, onChooseMode }) {
  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>Dashboard</h1>
      </div>
      <main style={{ paddingBottom: 90 }}>
        <p className="hint" style={{ marginBottom: 16 }}>
          Hier entsteht deine Analyse-Zentrale mit frei anlegbaren Kacheln.
        </p>
        <div className="card">
          <p className="center-note">Noch keine Kacheln angelegt.</p>
        </div>
      </main>

      <nav className="tab-bar">
        {hasPrivateProfile && (
          <button className="tab-bar-item" onClick={() => onChooseMode('private')}>
            <span className="tab-bar-icon">🧑</span>
            Einwohner
          </button>
        )}
        {hasBusinessProfile && (
          <button className="tab-bar-item" onClick={() => onChooseMode('business')}>
            <span className="tab-bar-icon">🏬</span>
            Gewerbe
          </button>
        )}
        <button className="tab-bar-item" onClick={() => onChooseMode('admin')}>
          <span className="tab-bar-icon">🛠️</span>
          Verwaltung
        </button>
      </nav>
    </div>
  )
}
