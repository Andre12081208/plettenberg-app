import { useState } from 'react'

export default function HomeBoard() {
  const [showHint, setShowHint] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
      <button className="btn btn-primary" onClick={() => setShowHint(true)} style={{ width: 'auto', padding: '16px 28px' }}>
        Gestalte für dein Homeboard die erste Kachel
      </button>

      {showHint && (
        <p className="hint" style={{ marginTop: 16 }}>
          Das bauen wir im nächsten Schritt gemeinsam.
        </p>
      )}
    </div>
  )
}
