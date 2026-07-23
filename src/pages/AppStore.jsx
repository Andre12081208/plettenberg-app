import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const APP_CATEGORIES = [
  { value: 'alle', label: 'Alle' },
  { value: 'restaurant', label: 'Restaurants' },
  { value: 'buergerservice', label: 'Bürgerservice' },
  { value: 'verein', label: 'Vereine' },
  { value: 'sonstiges', label: 'Sonstiges' }
]

const SYSTEM_APPS = [
  { key: 'calendar', name: 'Kalender', icon: '📅', description: 'Termine planen, mit Kontakten teilen und Geburtstage sehen.' },
  { key: 'snake', name: 'Snake', icon: '🐍', description: 'Klassisches Snake-Spiel, direkt in der App spielbar.' }
]

async function getNextPosition(userId) {
  const [{ data: a }, { data: b }] = await Promise.all([
    supabase.from('installed_apps').select('position').eq('user_id', userId),
    supabase.from('installed_system_apps').select('position').eq('user_id', userId)
  ])
  const positions = [...(a || []), ...(b || [])].map((r) => r.position || 0)
  return positions.length > 0 ? Math.max(...positions) + 1 : 0
}

export default function AppStore({ userId, onBack, onChanged }) {
  const [entries, setEntries] = useState([])
  const [installedIds, setInstalledIds] = useState(new Set())
  const [followedIds, setFollowedIds] = useState(new Set())
  const [installedSystemKeys, setInstalledSystemKeys] = useState(new Set())
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

    const [
      { data: apps, error: appsError },
      { data: installed, error: installedError },
      { data: followed, error: followedError },
      { data: systemApps, error: systemError }
    ] = await Promise.all([
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
        .eq('user_id', userId),
      supabase
        .from('follows')
        .select('business_profile_id')
        .eq('user_id', userId),
      supabase
        .from('installed_system_apps')
        .select('app_key')
        .eq('user_id', userId)
    ])

    if (appsError) setError(appsError.message)
    if (installedError) setError(installedError.message)
    if (followedError) setError(followedError.message)
    if (systemError) setError(systemError.message)

    setEntries(apps || [])
    setInstalledIds(new Set((installed || []).map((i) => i.business_profile_id)))
    setFollowedIds(new Set((followed || []).map((f) => f.business_profile_id)))
    setInstalledSystemKeys(new Set((systemApps || []).map((s) => s.app_key)))
    setLoading(false)
  }

  async function toggleSystemApp(app) {
    setBusyId(`system-${app.key}`)
    const isInstalled = installedSystemKeys.has(app.key)

    if (isInstalled) {
      const { error } = await supabase
        .from('installed_system_apps')
        .delete()
        .eq('user_id', userId)
        .eq('app_key', app.key)

      if (!error) {
        setInstalledSystemKeys((prev) => {
          const next = new Set(prev)
          next.delete(app.key)
          return next
        })
      } else {
        setError(error.message)
      }
    } else {
      const position = await getNextPosition(userId)
      const { error } = await supabase
        .from('installed_system_apps')
        .insert({ user_id: userId, app_key: app.key, position })

      if (!error) {
        setInstalledSystemKeys((prev) => new Set(prev).add(app.key))
      } else {
        setError(error.message)
      }
    }

    setBusyId(null)
    onChanged?.()
  }

  async function toggleInstall(app) {
    setBusyId(`install-${app.id}`)
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
      const position = await getNextPosition(userId)
      const { error } = await supabase
        .from('installed_apps')
        .insert({ user_id: userId, business_profile_id: app.id, position })

      if (!error) {
        setInstalledIds((prev) => new Set(prev).add(app.id))
      } else {
        setError(error.message)
      }
    }

    setBusyId(null)
    onChanged?.()
  }

  async function toggleFollow(app) {
    setBusyId(`follow-${app.id}`)
    const isFollowed = followedIds.has(app.id)

    if (isFollowed) {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('user_id', userId)
        .eq('business_profile_id', app.id)

      if (!error) {
        setFollowedIds((prev) => {
          const next = new Set(prev)
          next.delete(app.id)
          return next
        })
      } else {
        setError(error.message)
      }
    } else {
      const { error } = await supabase
        .from('follows')
        .insert({ user_id: userId, business_profile_id: app.id })

      if (!error) {
        setFollowedIds((prev) => new Set(prev).add(app.id))
      } else {
        setError(error.message)
      }
    }

    setBusyId(null)
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

        <h3 style={{ marginBottom: 10 }}>Spiele & Extras</h3>
        {SYSTEM_APPS.map((app) => {
          const installed = installedSystemKeys.has(app.key)
          return (
            <div className="card" key={app.key}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10 }}>
                <div className="avatar-preview" style={{ width: 48, height: 48, fontSize: 22 }}>
                  {app.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, fontSize: 16 }}>{app.name}</h3>
                </div>
              </div>
              <p style={{ margin: '0 0 10px', fontSize: 14 }}>{app.description}</p>
              <button
                className={installed ? 'btn btn-secondary' : 'btn btn-primary'}
                onClick={() => toggleSystemApp(app)}
                disabled={busyId === `system-${app.key}`}
              >
                {busyId === `system-${app.key}` ? '...' : installed ? 'Entfernen' : 'Hinzufügen'}
              </button>
            </div>
          )
        })}

        <h3 style={{ marginTop: 24, marginBottom: 10 }}>Anbieter</h3>

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
          const followed = followedIds.has(app.id)
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

              <div className="btn-row">
                <button
                  className={installed ? 'btn btn-secondary' : 'btn btn-primary'}
                  onClick={() => toggleInstall(app)}
                  disabled={busyId === `install-${app.id}`}
                >
                  {busyId === `install-${app.id}` ? '...' : installed ? 'Entfernen' : 'Hinzufügen'}
                </button>
                <button
                  className={followed ? 'btn btn-secondary' : 'btn btn-primary'}
                  onClick={() => toggleFollow(app)}
                  disabled={busyId === `follow-${app.id}`}
                >
                  {busyId === `follow-${app.id}` ? '...' : followed ? 'Entfolgen' : 'Folgen'}
                </button>
              </div>
            </div>
          )
        })}
      </main>
    </div>
  )
}
