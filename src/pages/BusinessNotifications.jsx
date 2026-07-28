import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function BusinessNotifications({ profile, onBack, onProfileUpdated }) {
  const [values, setValues] = useState({
    notif_push: profile.notif_push,
    notif_email: profile.notif_email,
    privacy_allow_marketing_emails: profile.privacy_allow_marketing_emails,
    notif_system: profile.notif_system,
    notif_rechnungen: profile.notif_rechnungen,
    notif_abonnement: profile.notif_abonnement,
    notif_ideenwerkstatt: profile.notif_ideenwerkstatt,
    notif_wartung: profile.notif_wartung,
    notif_neue_funktionen: profile.notif_neue_funktionen
  })
  const [saving, setSaving] = useState(false)

  async function toggle(field, label) {
    const newValue = !values[field]
    setValues((prev) => ({ ...prev, [field]: newValue }))
    setSaving(true)

    const { error } = await supabase.from('business_profiles').update({ [field]: newValue }).eq('id', profile.id)

    if (!error) {
      await supabase.from('business_account_events').insert({
        business_profile_id: profile.id,
        event_type: 'benachrichtigungen_geaendert',
        detail: `${label}: ${newValue ? 'Aktiviert' : 'Deaktiviert'}`
      })
      onProfileUpdated?.()
    }
    setSaving(false)
  }

  function Row({ field, label, hint }) {
    return (
      <div style={{ padding: '10px 0', borderTop: '1px solid var(--line)' }}>
        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14 }}>
          <span>{label}</span>
          <input type="checkbox" checked={values[field]} disabled={saving} onChange={() => toggle(field, label)} />
        </label>
        {hint && <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--ink-soft)' }}>{hint}</p>}
      </div>
    )
  }

  return (
    <>
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>Benachrichtigungen</h1>
      </div>
      <main style={{ paddingBottom: 90 }}>
        <button className="link-text" onClick={onBack} style={{ marginBottom: 16 }}>← Zurück zu Einstellungen</button>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Funktioniert bereits</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14, padding: '10px 0' }}>
            <span>Nachrichten (Anfragen)</span>
            <span className="status-pill status-live">Immer aktiv</span>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-soft)' }}>
            Die Zahl in deiner Leiste bei "Nachrichten" bleibt bewusst immer eingeschaltet, damit du nie eine Kundenanfrage verpasst – aktuell gibt es keine zweite Benachrichtigungs-Quelle als Rückfallebene.
          </p>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Vorbereitung für später</h3>
          <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--ink-soft)' }}>
            Diese Kanäle gibt es technisch noch nicht – deine Auswahl wird gespeichert und automatisch angewendet, sobald sie verfügbar sind.
          </p>

          <Row field="notif_push" label="Push-Benachrichtigungen" hint="Wird aktiviert, sobald diese Funktion verfügbar ist." />
          <Row field="notif_email" label="E-Mail-Benachrichtigungen" hint="Wird aktiviert, sobald diese Funktion verfügbar ist." />
          <Row field="privacy_allow_marketing_emails" label="Marketing-E-Mails" hint="Diese Einstellung ist identisch mit der unter Datenschutz." />
          <Row field="notif_system" label="Systemmeldungen" />
          <Row field="notif_rechnungen" label="Rechnungen" hint="Die Rechnungs-Funktion selbst ist noch nicht verfügbar." />
          <Row field="notif_abonnement" label="Abonnement" />
          <Row field="notif_ideenwerkstatt" label="Ideenwerkstatt" hint="Steht Gewerbeprofilen aktuell noch nicht zur Verfügung." />
          <Row field="notif_wartung" label="Wartungsinformationen" />
          <Row field="notif_neue_funktionen" label="Neue Funktionen" />
        </div>
      </main>
    </>
  )
}
