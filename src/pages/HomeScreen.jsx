import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import StadtverwaltungApp from './StadtverwaltungApp.jsx'
import AppStore from './AppStore.jsx'
import BusinessMiniApp from './BusinessMiniApp.jsx'
import Newsfeed from './Newsfeed.jsx'
import Connections from './Connections.jsx'

export default function HomeScreen({ profile, userId, isAdmin, onOpenAdmin }) {
  const [openApp, setOpenApp] = useState(null)
  const [installedApps, setInstalledApps] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadInstalled()
  }, [])

  async function loadInstalled() {
    setLoading(true)
    const { data } = await supabase
      .from('installed_apps')
      .select('business_profiles(*)')
      .eq('user_id', userId)

    setInstalledApps((data || []).map((row) => row.business_profiles).filter(Boolean))
    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  if (openApp === 'stadtverwaltung') {
    return <StadtverwaltungApp onBack={() => setOpenApp(null)} />
  }

  if (openApp === 'newsfeed') {
    return <Newsfeed userId={userId} onBack={() => setOpenApp(null)} />
  }

  if (openApp === 'connections') {
    return <Connections userId={userId} profile={profile} onBack={() => setOpenApp(null)} />
  }

  if (openApp === 'store') {
    return (
      <AppStore
        userId={userId}
        onBack={() => { setOpenApp(null); loadInstalled() }}
        onChanged={loadInstalled}
      />
    )
  }

  if (openApp && openApp.id) {
    return <BusinessMiniApp app={openApp} onBack={() => setOpenApp(null)} />
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>Hallo, {profile.first_name}</h1>
      </div>
      <main>
        <div className="app-grid">
          <button className="app-tile" onClick={() => setOpenApp('stadtverwaltung')}>
            <div className="app-tile-icon">🏛️</div>
            <div className="app-tile-label">Stadtverwaltung</div>
          </button>

          <button className="app-tile" onClick={() => setOpenApp('newsfeed')}>
            <div className="app-tile-icon">📰</div>
            <div className="app-tile-label">Neuigkeiten</div>
          </button>

          <button className="app-tile" onClick={() => setOpenApp('connections')}>
            <div className="app-tile-icon">🤝</div>
            <div className="app-tile-label">Vernetzen</div>
          </button>

          {!loading && installedApps.map((app) => (
            <button key={app.id} className="app-tile" onClick={() => setOpenApp(app)}>
              <div className="app-tile-icon">
                {app.logo_url
                  ? <img src={app.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 18 }} />
                  : app.company_name[0]}
              </div>
              <div className="app-tile-label">{app.company_name}</div>
            </button>
          ))}

          <button className="app-tile" onClick={() => setOpenApp('store')}>
            <div className="app-tile-icon" style={{ background: 'var(--clay)' }}>+</div>
            <div className="app-tile-label">App Store</div>
          </button>
        </div>

        {isAdmin && (
          <button className="btn btn-primary" onClick={onOpenAdmin} style={{ marginTop: 28 }}>
            Gewerbeanfragen verwalten
          </button>
        )}

        <button className="btn btn-secondary" onClick={handleLogout} style={{ marginTop: 12 }}>
          Abmelden
        </button>
      </main>
    </div>
  )
}
