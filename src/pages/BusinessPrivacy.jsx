import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function BusinessPrivacy({ profile, onBack, onGoToKontoverwaltung, onGoToBenachrichtigungen, onProfileUpdated }) {
  const [allowAnalytics, setAllowAnalytics] = useState(profile.privacy_allow_analytics)
  const [allowPersonalization, setAllowPersonalization] = useState(profile.privacy_allow_personalization)
  const [saving, setSaving] = useState(false)

  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')

  const [requestType, setRequestType] = useState('auskunft')
  const [requestMessage, setRequestMessage] = useState('')
  const [requestSending, setRequestSending] = useState(false)
  const [requestSent, setRequestSent] = useState(false)

  const [historyEvents, setHistoryEvents] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(true)

  useEffect(() => {
    loadHistory()
    // eslint-disable-next-line
  }, [])

  async function loadHistory() {
    setLoadingHistory(true)
    const { data } = await supabase
      .from('business_account_events')
      .select('*')
      .eq('business_profile_id', profile.id)
      .in('event_type', ['datenschutz_geaendert', 'datenexport_angefordert'])
      .order('created_at', { ascending: false })

    setHistoryEvents(data || [])
    setLoadingHistory(false)
  }

  async function savePreference(field, value, setter, label) {
    setter(value)
    setSaving(true)
    const { error } = await supabase.from('business_profiles').update({ [field]: value }).eq('id', profile.id)
    if (!error) {
      await supabase.from('business_account_events').insert({
        business_profile_id: profile.id,
        event_type: 'datenschutz_geaendert',
        detail: `${label}: ${value ? 'Aktiviert' : 'Deaktiviert'}`
      })
      onProfileUpdated?.()
      loadHistory()
    }
    setSaving(false)
  }

  async function handleExport() {
    setExporting(true)
    setExportError('')

    try {
      const [
        { data: products },
        { data: orders },
        { data: inquiries },
        { data: addons },
        { data: hotspots },
        { data: dashboardTiles },
        { data: events },
        { data: slots },
        { data: channels }
      ] = await Promise.all([
        supabase.from('business_products').select('*').eq('business_profile_id', profile.id),
        supabase.from('business_orders').select('*, business_order_items(*)').eq('business_profile_id', profile.id),
        supabase.from('business_inquiries').select('*, business_inquiry_messages(*)').eq('business_profile_id', profile.id),
        supabase.from('business_addons').select('*').eq('business_profile_id', profile.id),
        supabase.from('business_room_hotspots').select('*, business_room_hotspot_actions(*)').eq('business_profile_id', profile.id),
        supabase.from('business_dashboard_tiles').select('*').eq('business_profile_id', profile.id),
        supabase.from('business_account_events').select('*').eq('business_profile_id', profile.id),
        supabase.from('business_appointment_slots').select('*').eq('business_profile_id', profile.id),
        supabase.from('channels').select('*').eq('created_by', profile.id)
      ])

      const exportData = {
        exportiert_am: new Date().toISOString(),
        profil: profile,
        angebote: products || [],
        bestellungen: orders || [],
        anfragen: inquiries || [],
        zusatzpakete: addons || [],
        virtueller_raum: hotspots || [],
        dashboard_kacheln: dashboardTiles || [],
        kontoverlauf: events || [],
        termine: slots || [],
        channels: channels || []
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `meine-daten-${profile.company_name.replace(/\s+/g, '-').toLowerCase()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      await supabase.from('business_account_events').insert({ business_profile_id: profile.id, event_type: 'datenexport_angefordert' })
      loadHistory()
    } catch (err) {
      setExportError(err.message || 'Export ist fehlgeschlagen.')
    }
    setExporting(false)
  }

  async function submitDataRequest(e) {
    e.preventDefault()
    setRequestSending(true)
    const { error } = await supabase.from('data_access_requests').insert({
      business_profile_id: profile.id,
      request_type: requestType,
      message: requestMessage.trim() || null
    })
    if (!error) {
      setRequestSent(true)
      setRequestMessage('')
    }
    setRequestSending(false)
  }

  return (
    <>
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>Datenschutz</h1>
      </div>
      <main style={{ paddingBottom: 90 }}>
        <button className="link-text" onClick={onBack} style={{ marginBottom: 16 }}>← Zurück zu Einstellungen</button>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Sichtbarkeit des Unternehmens</h3>
          <p style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--ink-soft)' }}>
            Ob dein Unternehmen öffentlich sichtbar ist, steuerst du über "Profil deaktivieren" in der Kontoverwaltung.
          </p>
          <button className="btn btn-secondary" onClick={onGoToKontoverwaltung}>Zur Kontoverwaltung</button>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Einwilligungen</h3>
          <p style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--ink-soft)' }}>
            Marketing-E-Mails steuerst du zusammen mit den anderen Benachrichtigungs-Einstellungen an einer Stelle.
          </p>
          <button className="btn btn-secondary" onClick={onGoToBenachrichtigungen}>Zu Benachrichtigungen</button>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Cookie-Einstellungen &amp; Nutzung</h3>
          <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--ink-soft)' }}>
            Notwendige Cookies (z.B. für den Login) sind immer aktiv und lassen sich nicht deaktivieren.
          </p>
          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14, marginBottom: 10 }}>
            <span>Analyse erlauben</span>
            <input type="checkbox" checked={allowAnalytics} disabled={saving} onChange={(e) => savePreference('privacy_allow_analytics', e.target.checked, setAllowAnalytics, 'Analyse erlauben')} />
          </label>
          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14 }}>
            <span>Personalisierung erlauben</span>
            <input type="checkbox" checked={allowPersonalization} disabled={saving} onChange={(e) => savePreference('privacy_allow_personalization', e.target.checked, setAllowPersonalization, 'Personalisierung erlauben')} />
          </label>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Datenexport</h3>
          <p style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--ink-soft)' }}>
            Lade eine Kopie deiner in der App gespeicherten Daten herunter.
          </p>
          {exportError && <div className="error-box">{exportError}</div>}
          <button className="btn btn-secondary" onClick={handleExport} disabled={exporting}>
            {exporting ? 'Wird erstellt...' : 'Meine Daten herunterladen'}
          </button>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Daten anfordern</h3>
          <p style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--ink-soft)' }}>
            Für Auskünfte, die über den Sofort-Export hinausgehen, kannst du eine formale Anfrage an unser Team stellen.
          </p>
          {requestSent ? (
            <div className="error-box" style={{ background: '#E5EFEA', color: '#1F4D3F', borderColor: '#1F4D3F' }}>
              Deine Anfrage wurde eingereicht. Wir melden uns bei dir.
            </div>
          ) : (
            <form onSubmit={submitDataRequest}>
              <div className="field">
                <label htmlFor="requestType">Art der Anfrage</label>
                <select id="requestType" value={requestType} onChange={(e) => setRequestType(e.target.value)}>
                  <option value="auskunft">Auskunft über gespeicherte Daten</option>
                  <option value="sonstiges">Sonstiges</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="requestMessage">Nachricht (optional)</label>
                <textarea id="requestMessage" rows={3} value={requestMessage} onChange={(e) => setRequestMessage(e.target.value)} />
              </div>
              <button className="btn btn-secondary" type="submit" disabled={requestSending}>
                {requestSending ? 'Wird gesendet...' : 'Anfrage senden'}
              </button>
            </form>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Datenhistorie</h3>
          {loadingHistory && <div className="loading-dot">Lädt...</div>}
          {!loadingHistory && historyEvents.length === 0 && <p className="center-note">Noch keine Änderungen an den Datenschutz-Einstellungen.</p>}
          {!loadingHistory && historyEvents.map((event) => (
            <div key={event.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '6px 0', borderTop: '1px solid var(--line)' }}>
              <span>{event.event_type === 'datenexport_angefordert' ? 'Datenexport erstellt' : (event.detail || 'Einstellung geändert')}</span>
              <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{new Date(event.created_at).toLocaleString('de-DE')}</span>
            </div>
          ))}
        </div>
      </main>
    </>
  )
}
