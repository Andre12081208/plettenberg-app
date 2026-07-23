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
import Settings from './Settings.jsx'
import ChannelsHub from './ChannelsHub.jsx'
import GastroHub from './GastroHub.jsx'

const INACTIVITY_LIMIT_MS = 10 * 60 * 1000

const SYSTEM_APP_META = {
  calendar: { icon: '📅', label: 'Kalender' },
  snake: { icon: '🐍', label: 'Snake' }
}

export default function HomeScreen({ profile, userId, isAdmin, onProfileUpdated }) {
  const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem('pb_activeTab') || 'apps')
  const [openApp, setOpenApp] = useState(() => {
    const saved = sessionStorage.getItem('pb_openApp')
    if (!saved || saved.startsWith('business:')) return null
    return saved
  })
  const [pendingBusinessAppId, setPendingBusinessAppId] = useState(() => {
    const saved = sessionStorage.getItem('pb_openApp')
    return saved && saved.startsWith('business:') ? saved.replace('business:', '') : null
  })
  const [movableTiles, setMovableTiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false)
  const [initialUsername, setInitialUsername] = useState(null)
  const [initialGroupCode, setInitialGroupCode] = useState(null)
  const [initialChannelCode, setInitialChannelCode] = useState(null)

  useEffect(() => {
    loadInstalled()

    const params = new URLSearchParams(window.location.search)
    const u = params.get('u')
    const g = params.get('g')
    const c = params.get('c')

    if (u || g) {
      setTimeout(() => setActiveTab('contacts'), 0)
      if (u) setInitialUsername(u)
      if (g) setInitialGroupCode(g)
      window.history.replaceState({}, '', window.location.pathname)
    } else if (c) {
      setOpenApp('channels')
      setInitialChannelCode(c)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  useEffect(() => {
    checkUnreadMessages()
    const interval = setInterval(checkUnreadMessages, 20000)
    return () => clearInterval(interval)
  }, [])

  async function checkUnreadMessages() {
    const { data } = await supabase
      .from('messages')
      .select('id')
      .is('read_at', null)
      .neq('sender_id', userId)
      .limit(1)
    setHasUnreadMessages((data || []).length > 0)
  }

  async function loadInstalled() {
    setLoading(true)

    const [{ data: businessApps }, { data: systemApps }] = await Promise.all([
      supabase.from('installed_apps').select('position, business_profiles(*)').eq('user_id', userId).order('position'),
      supabase.from('installed_system_apps').select('position, app_key').eq('user_id', userId).order('position')
    ])

    const businessTiles = (businessApps || [])
      .filter((row) => row.business_profiles)
      .map((row) => ({ type: 'business', position: row.position, data: row.business_profiles }))

    const systemTiles = (systemApps || [])
      .map((row) => ({ type: 'system', position: row.position, key: row.app_key }))

    const merged = [...businessTiles, ...systemTiles].sort((a, b) => a.position - b.position)

    setMovableTiles(merged)
    setLoading(false)
  }

  async function moveTile(index, direction) {
    const otherIndex = index + direction
    if (otherIndex < 0 || otherIndex >= movableTiles.length) return

    const a = movableTiles[index]
    const b = movableTiles[otherIndex]

    async function updateOne(tile, newPosition) {
      if (tile.type === 'business') {
        await supabase.from('installed_apps').update({ position: newPosition }).eq('user_id', userId).eq('business_profile_id', tile.data.id)
      } else {
        await supabase.from('installed_system_apps').update({ position: newPosition }).eq('user_id', userId).eq('app_key', tile.key)
      }
    }

    await Promise.all([updateOne(a, b.position), updateOne(b, a.position)])
    loadInstalled()
  }

  async function removeTile(tile) {
    if (tile.type === 'business') {
      await supabase.from('installed_apps').delete().eq('user_id', userId).eq('business_profile_id', tile.data.id)
    } else {
      await supabase.from('installed_system_apps').delete().eq('user_id', userId).eq('app_key', tile.key)
    }
    loadInstalled()
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  useEffect(() => {
    if (!pendingBusinessAppId) return
    supabase
      .from('business_profiles')
      .select('*')
      .eq('id', pendingBusinessAppId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setOpenApp(data)
        setPendingBusinessAppId(null)
      })
  }, [pendingBusinessAppId])

  useEffect(() => {
    sessionStorage.setItem('pb_activeTab', activeTab)
  }, [activeTab])

  useEffect(() => {
    if (openApp && typeof openApp === 'object' && openApp.id) {
      sessionStorage.setItem('pb_openApp', `business:${openApp.id}`)
    } else if (typeof openApp === 'string') {
      sessionStorage.setItem('pb_openApp', openApp)
    } else {
      sessionStorage.removeItem('pb_openApp')
    }
  }, [openApp])

  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === 'hidden') {
        sessionStorage.setItem('pb_hiddenAt', Date.now().toString())
      } else if (document.visibilityState === 'visible') {
        const hiddenAt = parseInt(sessionStorage.getItem('pb_hiddenAt') || '0', 10)
        if (hiddenAt && Date.now() - hiddenAt > INACTIVITY_LIMIT_MS) {
          setActiveTab('apps')
          setOpenApp(null)
        }
        sessionStorage.removeItem('pb_hiddenAt')
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

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
  if (openApp === 'settings') {
    return <Settings profile={profile} onBack={() => setOpenApp(null)} onProfileUpdated={onProfileUpdated} />
  }

  if (openApp === 'channels') {
    return (
      <ChannelsHub
        userId={userId}
        onBack={() => setOpenApp(null)}
        initialChannelCode={initialChannelCode}
        onConsumedInitial={() => setInitialChannelCode(null)}
      />
    )
  }if (openApp === 'gastro') {
    return <GastroHub onBack={() => setOpenApp(null)} />
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

  if (openApp && typeof openApp === 'object' && openApp.id) {
    return <BusinessMiniApp app={openApp} onBack={() => setOpenApp(null)} />
  }

  return (
    <div className="app-shell">
      {activeTab === 'feed' && <Newsfeed userId={userId} embedded />}

      {activeTab === 'contacts' && (
        <Contacts
          userId={userId}
          profile={profile}
          embedded
          onUnreadChanged={checkUnreadMessages}
          initialUsername={initialUsername}
          initialGroupCode={initialGroupCode}
          onConsumedInitial={() => { setInitialUsername(null); setInitialGroupCode(null) }}
        />
      )}

      {activeTab === 'admin' && isAdmin && <AdminPanel embedded />}

      {activeTab === 'apps' && (
        <>
          <div className="topbar">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="mark">Plettenberg</div>
              <button className="link-text" onClick={() => setEditMode(!editMode)}>
                {editMode ? 'Fertig' : 'Anordnen'}
              </button>
            </div>
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

              <button className="app-tile" onClick={() => setOpenApp('channels')}>
                <div className="app-tile-icon">📢</div>
                <div className="app-tile-label">Channels</div>
              </button>

              <button className="app-tile" onClick={() => setOpenApp('marketplace')}>
                <div className="app-tile-icon">🛍️</div>
                <div className="app-tile-label">Marktplatz</div>
              </button>

              <button className="app-tile" onClick={() => setOpenApp('kiosk')}>
                <div className="app-tile-icon">🏪</div>
                <div className="app-tile-label">Kiosk</div>
              </button>
              <button className="app-tile" onClick={() => setOpenApp('gastro')}>
                <div className="app-tile-icon">🍽️</div>
                <div className="app-tile-label">Gastro</div>
              </button>
              <button className="app-tile" onClick={() => setOpenApp('settings')}>
                <div className="app-tile-icon">⚙️</div>
                <div className="app-tile-label">Einstellungen</div>
              </button>

              <button className="app-tile" onClick={() => setOpenApp('store')}>
                <div className="app-tile-icon" style={{ background: 'var(--clay)' }}>+</div>
                <div className="app-tile-label">App Store</div>
              </button>

              {!loading && movableTiles.map((tile, index) => {
                const icon = tile.type === 'business'
                  ? (tile.data.logo_url
                      ? <img src={tile.data.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 18 }} />
                      : tile.data.company_name[0])
                  : (SYSTEM_APP_META[tile.key]?.icon || '❓')
                const label = tile.type === 'business' ? tile.data.company_name : (SYSTEM_APP_META[tile.key]?.label || tile.key)
                const tileKey = tile.type === 'business' ? `business-${tile.data.id}` : `system-${tile.key}`

                return (
                  <div key={tileKey} style={{ position: 'relative' }}>
                    <button
                      className="app-tile"
                      style={{ width: '100%' }}
                      onClick={editMode ? undefined : () => setOpenApp(tile.type === 'business' ? tile.data : tile.key)}
                    >
                      <div className="app-tile-icon">{icon}</div>
                      <div className="app-tile-label">{label}</div>
                    </button>

                    {editMode && (
                      <>
                        <button
                          onClick={() => removeTile(tile)}
                          style={{ position: 'absolute', top: -6, right: 6, width: 20, height: 20, borderRadius: '50%', background: 'var(--danger)', color: '#fff', border: 'none', fontSize: 12, lineHeight: '20px', cursor: 'pointer' }}
                        >
                          ✕
                        </button>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginTop: 2 }}>
                          <button className="link-text" style={{ fontSize: 13 }} disabled={index === 0} onClick={() => moveTile(index, -1)}>‹</button>
                          <button className="link-text" style={{ fontSize: 13 }} disabled={index === movableTiles.length - 1} onClick={() => moveTile(index, 1)}>›</button>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
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
          style={{ position: 'relative' }}
        >
          <span className="tab-bar-icon">🤝</span>
          Kontakte
          {hasUnreadMessages && (
            <span style={{ position: 'absolute', top: 6, right: '30%', width: 8, height: 8, borderRadius: '50%', background: 'var(--clay)' }} />
          )}
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
