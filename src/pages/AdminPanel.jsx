import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const STATUS_OPTIONS = [
  { value: 'in_pruefung', label: 'In Prüfung' },
  { value: 'vertrag_in_arbeit', label: 'Vertrag in Arbeit' },
  { value: 'live', label: 'Live' },
  { value: 'abgelehnt', label: 'Abgelehnt' }
]

const STATUS_CLASS = {
  in_pruefung: 'status-pruefung',
  vertrag_in_arbeit: 'status-vertrag',
  live: 'status-live',
  abgelehnt: 'status-abgelehnt'
}

export default function AdminPanel({ onBack }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingId, setSavingId] = useState(null)

  useEffect(() => {
    loadEntries()
  }, [])

  async function loadEntries() {
    setLoading(true)
    setError('')
    const { data, error } = await supabase
      .from('business_profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setEntries(data || [])
    }
    setLoading(false)
  }

  async function updateStatus(id, newStatus) {
    setSavingId(id)
    const { error } = await supabase
      .from('business_profiles')
      .update({ status: newStatus })
      .eq('id', id)

    if (error) {
      setError(error.message)
    } else {
      setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, status: newStatus } : e)))
    }
    setSavingId(null)
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">Plettenberg · Admin</div>
        <h1>Gewerbeanfragen</h1>
      </div>
      <main>
        <button className="link-text" onClick={onBack} style={{ marginBottom: 16 }}>← Zurück</button>

        {error && <div className="error-box">{error}</div>}

        {loading && <div className="loading-dot">Lädt...</div>}

        {!loading && entries.length === 0 && (
          <p className="center-note">Noch keine Gewerbeanfragen vorhanden.</p>
        )}

        {!loading && entries.map((entry) => (
          <div className="card" key={entry.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <h3 style={{ margin: 0 }}>{entry.company_name}</h3>
              <span className={`status-pill ${STATUS_CLASS[entry.status]}`}>
                {STATUS_OPTIONS.find((s) => s.value === entry.status)?.label}
              </span>
            </div>

            <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--ink-soft)' }}>
              Kategorie: {entry.category}
            </p>
            {entry.contact_person && (
              <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--ink-soft)' }}>
                Ansprechpartner: {entry.contact_person}
              </p>
            )}
            {entry.phone && (
              <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--ink-soft)' }}>
                Telefon: {entry.phone}
              </p>
            )}
            {entry.website && (
              <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--ink-soft)' }}>
                Website: {entry.website}
              </p>
            )}

            <div className="field" style={{ marginTop: 12, marginBottom: 0 }}>
              <label>Status ändern</label>
              <select
                value={entry.status}
                disabled={savingId === entry.id}
                onChange={(e) => updateStatus(entry.id, e.target.value)}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </main>
    </div>
  )
}
