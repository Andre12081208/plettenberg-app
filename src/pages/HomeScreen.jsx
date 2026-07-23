import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import StadtverwaltungApp from './StadtverwaltungApp.jsx'
import AppStore from './AppStore.jsx'
import BusinessMiniApp from './BusinessMiniApp.jsx'
import Newsfeed from './Newsfeed.jsx'
import Contacts from './Contacts.jsx'
import MyProfile from './MyProfile.jsx'
import Marketplace from './Marketplace.jsx'
import SnakeGame from './SnakeGame.jsx'
import Kiosk from './Kiosk.jsx'
import AdminPanel from './AdminPanel.jsx'
import Calendar from './Calendar.jsx'

export default function HomeScreen({ profile, userId, isAdmin, onProfileUpdated }) {
  const [activeTab, setActiveTab] = useState('feed')
  const [openApp, setOpenApp] = useState(null)
  const [installedApps, setInstalledApps] = useState([])
  const [installedSystemKeys, setInstalledSystemKeys] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadInstalled()
  }, [])

  async function loadInstalled() {
    setLoading(true)

    const [{ data: businessApps }, { data: systemApps }] = await Promise.all([
      supabase.from('installed_apps').select('business_profiles(*)').eq('user_id', userId),
      supabase.from('installed_system_apps').select('app_key').eq('user_id', userId)
    ])

    setInstalledApps((businessApps || []).map((row) => row.business_profiles).filter(Boolean))
    setInstalledSystemKeys((systemApps || []).map((s) => s.app_key))
    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  if (openApp === 'stadtverwaltung') {
    return <StadtverwaltungApp onBack={() => setOpenApp(null)} />
  }

  if (openApp === 'profile') {
    return (
      <MyProfile
        userId={userId}
        profile={profile}
        onBack={() => setOpenApp(null)}
        onProfileUpdated={onProfileUpdated}
      />
    )
  }

  if (openApp === 'marketplace') {
    return <Marketplace userId={userId} onBack={() => setOpenApp(null)} />
  }

  if (openApp === 'kiosk') {
    return <Kiosk userId={userId} onBack={() => setOpenApp(null)} />
  }

  if (openApp === 'calendar') {
    return <Calendar userId={userId} onBack={() => setOpenApp(null)} />
  }

  if (openApp === 'snake') {
    return <SnakeGame onBack={() => setOpenApp(null)} />
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
      {activeTab === 'feed' && <Newsfeed userId={userId} embedded />}

      {activeTab === 'contacts' && <Contacts userId={userId} profile={profile} embedded />}

      {activeTab === 'admin' && isAdmin && <AdminPanel embedded />}

      {activeTab === 'apps' && (
        <>
          <div className="topbar">
            <div className="mark">Plettenberg</div>
            <h1>Apps</h1>
          </div>
          <main style={{ paddingBottom: 90 }}>
            <div className="app-grid">
              <button className="app-tile" onClick={() => setOpenApp('profile')}>
                <div className="app-tile-icon">
                  {profile.avatar_url
                    ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 18 }} />
                    : '👤'}
                </div>
                <div className="app-tile-label">Mein Profil</div>
              </button>

              <button className="app-tile" onClick={() => setOpenApp('stadtverwaltung')}>
                <div className="app-tile-icon">🏛️</div>
                <div className="app-tile-label">Stadtverwaltung</div>
              </button>

              <button className="app-tile" onClick={() => setOpenApp('calendar')}>
                <div className="app-tile-icon">📅</div>
                <div className="app-tile-label">Kalender</div>
              </button>

              <button className="app-tile" onClick={() => setOpenApp('kiosk')}>
                <div className="app-tile-icon">🏪</div>
                <div className="app-tile-label">Kiosk</div>
              </button>

              <button className="app-tile" onClick={() => setOpenApp('marketplace')}>
                <div className="app-tile-icon">🛍️</div>
                <div className="app-tile-label">Marktplatz</div>
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

              {!loading && installedSystemKeys.includes('snake') && (
                <button className="app-tile" onClick={() => setOpenApp('snake')}>
                  <div className="app-tile-icon">🐍</div>
                  <div className="app-tile-label">Snake</div>
                </button>
              )}

              <button className="app-tile" onClick={() => setOpenApp('store')}>
                <div className="app-tile-icon" style={{ background: 'var(--clay)' }}>+</div>
                <div className="app-tile-label">App Store</div>
              </button>
            </div>

            <button className="btn btn-secondary" onClick={handleLogout} style={{ marginTop: 20 }}>
              Abmelden
            </button>
          </main>
        </>
      )}

      <nav className="tab-bar">
        <button
          className={`tab-bar-item ${activeTab === 'feed' ? 'active' : ''}`}
          onClick={() => setActiveTab('feed')}
        >
          <span className="tab-bar-icon">📰</span>
          Neuigkeiten
        </button>
        <button
          className={`tab-bar-item ${activeTab === 'contacts' ? 'active' : ''}`}
          onClick={() => setActiveTab('contacts')}
        >
          <span className="tab-bar-icon">🤝</span>
          Kontakte
        </button>
        <button
          className={`tab-bar-item ${activeTab === 'apps' ? 'active' : ''}`}
          onClick={() => setActiveTab('apps')}
        >
          <span className="tab-bar-icon">🔲</span>
          Apps
        </button>
        {isAdmin && (
          <button
            className={`tab-bar-item ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => setActiveTab('admin')}
          >
            <span className="tab-bar-icon">🛠️</span>
            Verwaltung
          </button>
        )}
      </nav>
    </div>
  )
}
