import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const APP_CATEGORIES = [
  { value: 'alle', label: 'Alle' },
  { value: 'restaurant', label: 'Restaurants' },
  { value: 'buergerservice', label: 'Bürgerservice' },
  { value: 'verein', label: 'Vereine' },
  { value: 'sonstiges', label: 'Sonstiges' }
]

export default function AppStore({ userId, onBack, onChanged }) {
  const [entries, setEntries] = useState([])
  const [installedIds, setInstalledIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeCategory, setActiveCategory] = useState('alle')
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    setError('')

    const [{ data: apps, error: appsError }, { data: installed, error: installedError }] = await Promise.all([
      supabase
        .from('business_profiles')
        .select('*')
        .eq('status', 'live')
        .eq('profile_kind', 'anbieter')
        .neq('category', 'stadtverwaltung')
        .order('company_name', { ascending: true }),
      supabase
        .from('installed_apps')
        .select('business_profile_id')
        .eq('user_id', userId)
    ])

    if (appsError) setError(appsError.message)
    if (installedError) setError(installedError.message)

    setEntries(apps || [])
    setInstalledIds(new Set((installed || []).map((i) => i.business_profile_id)))
    setLoading(false)
  }

  async function toggleInstall(app) {
    setBusyId(app.id)
    const isInstalled = installedIds.has(app.id)

    if (isInstalled) {
      const { error } = await supabase
        .from('installed_apps')
        .delete()
        .eq('user_id', userId)
        .eq('business_profile_id', app.id)

      if (!error) {
        setInstalledIds((prev) => {
          const next = new Set(prev)
          next.delete(app.id)
          return next
        })
      } else {
        setError(error.message)
      }
    } else {
      const { error } = await supabase
        .from('installed_apps')
        .insert({ user_id: userId, business_profile_id: app.id })

      if (!error) {
        setInstalledIds((prev) => new Set(prev).add(app.id))
      } else {
        setError(error.message)
      }
    }

    setBusyId(null)
    onChanged?.()
  }

  const filtered = activeCategory === 'alle'
    ? entries
    : entries.filter((e) => e.app_category === activeCategory)

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>App Store</h1>
      </div>
      <main>
        <button className="link-text" onClick={onBack} style={{ marginBottom: 16 }}>← Zurück</button>

        {error && <div className="error-box">{error}</div>}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
          {APP_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              style={{
                padding: '6px 14px',
                borderRadius: 999,
                border: '1px solid var(--forest)',
                background: activeCategory === cat.value ? 'var(--forest)' : 'transparent',
                color: activeCategory === cat.value ? '#fff' : 'var(--forest)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {loading && <div className="loading-dot">Lädt...</div>}

        {!loading && filtered.length === 0 && (
          <p className="center-note">Noch keine Mini-Apps in dieser Kategorie.</p>
        )}

        {!loading && filtered.map((app) => {
          const installed = installedIds.has(app.id)
          return (
            <div className="card" key={app.id}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10 }}>
                <div className="avatar-preview" style={{ width: 48, height: 48, fontSize: 16 }}>
                  {app.logo_url ? <img src={app.logo_url} alt={app.company_name} /> : app.company_name[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, fontSize: 16 }}>{app.company_name}</h3>
                  <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                    {APP_CATEGORIES.find((c) => c.value === app.app_category)?.label || 'Sonstiges'}
                  </span>
                </div>
              </div>

              {app.description && (
                <p style={{ margin: '0 0 10px', fontSize: 14 }}>{app.description}</p>
              )}

              <button
                className={installed ? 'btn btn-secondary' : 'btn btn-primary'}
                onClick={() => toggleInstall(app)}
                disabled={busyId === app.id}
              >
                {busyId === app.id ? 'Einen Moment...' : installed ? 'Entfernen' : 'Hinzufügen'}
              </button>
            </div>
          )
        })}
      </main>
    </div>
  )
}
