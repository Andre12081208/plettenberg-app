import { useState } from 'react'

export default function HomeBoard({ onBack }) {
  const [showHint, setShowHint] = useState(false)

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>Home Board</h1>
      </div>
      <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
        <button className="link-text" onClick={onBack} style={{ position: 'absolute', top: 90, left: 24 }}>← Zurück</button>

        <button className="btn btn-primary" onClick={() => setShowHint(true)} style={{ width: 'auto', padding: '16px 28px' }}>
          Gestalte für dein Homeboard die erste Kachel
        </button>

        {showHint && (
          <p className="hint" style={{ marginTop: 16 }}>
            Das bauen wir im nächsten Schritt gemeinsam.
          </p>
        )}
      </main>
    </div>
  )
}
