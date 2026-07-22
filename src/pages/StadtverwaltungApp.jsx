import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function StadtverwaltungApp({ onBack }) {
  const [entry, setEntry] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadEntry()
  }, [])

  async function loadEntry() {
    setLoading(true)
    setError('')
    const { data, error } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('category', 'stadtverwaltung')
      .eq('profile_kind', 'anbieter')
      .eq('status', 'live')
      .maybeSingle()

    if (error) {
      setError(error.message)
    } else {
      setEntry(data)
    }
    setLoading(false)
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>Stadtverwaltung</h1>
      </div>
      <main>
        <button className="link-text" onClick={onBack} style={{ marginBottom: 16 }}>← Zurück</button>

        {error && <div className="error-box">{error}</div>}
        {loading && <div className="loading-dot">Lädt...</div>}

        {!loading && !entry && (
          <p className="center-note">Die Stadtverwaltung ist noch nicht eingerichtet.</p>
        )}

        {!loading && entry && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>{entry.company_name}</h3>
            {entry.description && <p style={{ fontSize: 14 }}>{entry.description}</p>}
            {entry.address && <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{entry.address}</p>}
            {entry.phone && <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Tel: {entry.phone}</p>}
            {entry.website && (
              <p style={{ fontSize: 13 }}>
                <a href={entry.website} target="_blank" rel="noreferrer" style={{ color: 'var(--forest)' }}>
                  {entry.website}
                </a>
              </p>
            )}
            {entry.contact_person && (
              <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Ansprechpartner: {entry.contact_person}</p>
            )}
            <p className="hint" style={{ marginTop: 16 }}>Formulare und Ankündigungen folgen in Kürze.</p>
          </div>
        )}
      </main>
    </div>
  )
}
