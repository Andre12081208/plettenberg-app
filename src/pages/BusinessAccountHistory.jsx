import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const EVENT_LABELS = {
  konto_erstellt: 'Konto erstellt',
  verifiziert: 'Verifizierung abgeschlossen',
  unternehmensdaten_geaendert: 'Unternehmensdaten geändert',
  passwort_geaendert: 'Passwort geändert',
  profil_geaendert: 'Profil geändert'
}

export default function BusinessAccountHistory({ profile, onBack }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadEvents()
    // eslint-disable-next-line
  }, [])

  async function loadEvents() {
    setLoading(true)
    const { data, error } = await supabase
      .from('business_account_events')
      .select('*')
      .eq('business_profile_id', profile.id)
      .order('created_at', { ascending: false })

    if (error) setError(error.message)

    const combined = [
      ...(data || []),
      { id: 'konto_erstellt', event_type: 'konto_erstellt', created_at: profile.created_at }
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    setEvents(combined)
    setLoading(false)
  }

  return (
    <>
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>Kontohistorie</h1>
      </div>
      <main style={{ paddingBottom: 90 }}>
        <button className="link-text" onClick={onBack} style={{ marginBottom: 16 }}>← Zurück zu Einstellungen</button>

        {error && <div className="error-box">{error}</div>}

        <div className="card">
          <p style={{ margin: 0, fontSize: 14 }}>
            <strong>Letzte Anmeldung:</strong> {profile.last_seen_at ? new Date(profile.last_seen_at).toLocaleString('de-DE') : 'Unbekannt'}
          </p>
        </div>

        {loading && <div className="loading-dot">Lädt...</div>}

        {!loading && events.map((event) => (
          <div key={event.id} className="card" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14 }}>{EVENT_LABELS[event.event_type] || event.event_type}</span>
              <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                {new Date(event.created_at).toLocaleString('de-DE')}
              </span>
            </div>
          </div>
        ))}
      </main>
    </>
  )
}
