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
import { useLanguage } from '../lib/LanguageContext.jsx'

const INACTIVITY_LIMIT_MS = 10 * 60 * 1000

const SYSTEM_APP_META = {
  calendar: { icon: '📅', label: 'Kalender' },
  snake: { icon: '🐍', label: 'Snake' }
}

export default function HomeScreen({ profile, userId, isAdmin, onProfileUpdated, onPasswordChanged }) {
  const { t } = useLanguage()
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
  const [unreadChatCount, setUnreadChatCount] = useState(0)
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
    const { data } = await supabase.rpc('get_unread_chat_count')
    setUnreadChatCount(data || 0)
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

  function goToTab(tab) {
    setActiveTab(tab)
    setOpenApp(null)
  }

  let content

  if (openApp === 'stadtverwaltung') {
    content = <StadtverwaltungApp onBack={() => setOpenApp(null)} />
  } else if (openApp === 'profile') {
    content = (
      <MyProfile
        userId={userId}
        profile={profile}
        onBack={() => setOpenApp(null)}
        onProfileUpdated={onProfileUpdated}
      />
    )
  } else if (openApp === 'marketplace') {
    content = <Marketplace userId={userId} onBack={() => setOpenApp(null)} />
  } else if (openApp === 'kiosk') {
    content = <Kiosk userId={userId} onBack={() => setOpenApp(null)} />
  } else if (openApp === 'calendar') {
    content = <Calendar userId={userId} onBack={() => setOpenApp(null)} />
  } else if (openApp === 'settings') {
    content = <Settings profile={profile} onBack={() => setOpenApp(null)} onProfileUpdated={onProfileUpdated} onPasswordChanged={onPasswordChanged} />
  } else if (openApp === 'channels') {
    content = (
      <ChannelsHub
        userId={userId}
        onBack={() => setOpenApp(null)}
        initialChannelCode={initialChannelCode}
        onConsumedInitial={() => setInitialChannelCode(null)}
      />
    )
  } else if (openApp === 'gastro') {
    content = <GastroHub onBack={() => setOpenApp(null)} />
  } else if (openApp === 'snake') {
    content = <SnakeGame userId={userId} onBack={() => setOpenApp(null)} />
  } else if (openApp === 'store') {
    content = (
      <AppStore
        userId={userId}
        onBack={() => { setOpenApp(null); loadInstalled() }}
        onChanged={loadInstalled}
      />
    )
  } else if (openApp && typeof openApp === 'object' && openApp.id) {
    content = <BusinessMiniApp app={openApp} onBack={() => setOpenApp(null)} />
  } else {
    content = (
      <>
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
                  {editMode ? t('apps.done') : t('apps.arrange')}
                </button>
              </div>
              <h1>{t('apps.title')}</h1>
            </div>
            <main style={{ paddingBottom: 90 }}>
              <div className="app-grid">
                <button className="app-tile" onClick={() => setOpenApp('profile')}>
                  <div className="app-tile-icon">
                    {profile.avatar_url
                      ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 18 }} />
                      : '👤'}
                  </div>
                  <div className="app-tile-label">{t('apps.myProfile')}</div>
                </button>

                <button className="app-tile" onClick={() => setOpenApp('stadtverwaltung')}>
                  <div className="app-tile-icon">🏛️</div>
                  <div className="app-tile-label">{t('apps.cityHall')}</div>
                </button>

                <button className="app-tile" onClick={() => setOpenApp('channels')}>
                  <div className="app-tile-icon">📢</div>
                  <div className="app-tile-label">{t('apps.channels')}</div>
                </button>

                <button className="app-tile" onClick={() => setOpenApp('marketplace')}>
                  <div className="app-tile-icon">🛍️</div>
                  <div className="app-tile-label">{t('apps.marketplace')}</div>
                </button>

                <button className="app-tile" onClick={() => setOpenApp('kiosk')}>
                  <div className="app-tile-icon">🏪</div>
                  <div className="app-tile-label">{t('apps.kiosk')}</div>
                </button>
                <button className="app-tile" onClick={() => setOpenApp('gastro')}>
                  <div className="app-tile-icon">🍽️</div>
                  <div className="app-tile-label">{t('apps.gastro')}</div>
                </button>
                <button className="app-tile" onClick={() => setOpenApp('settings')}>
                  <div className="app-tile-icon">⚙️</div>
                  <div className="app-tile-label">{t('apps.settingsTile')}</div>
                </button>

                <button className="app-tile" onClick={() => setOpenApp('store')}>
                  <div className="app-tile-icon" style={{ background: 'var(--clay)' }}>+</div>
                  <div className="app-tile-label">{t('apps.appStore')}</div>
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
      </>
    )
  }

  return (
    <div className="app-shell">
      {content}

      <nav className="tab-bar">
        <button
          className={`tab-bar-item ${activeTab === 'feed' && !openApp ? 'active' : ''}`}
          onClick={() => goToTab('feed')}
        >
          <span className="tab-bar-icon">📰</span>
          Newsfeed
        </button>
        <button
          className={`tab-bar-item ${activeTab === 'contacts' && !openApp ? 'active' : ''}`}
          onClick={() => goToTab('contacts')}
          style={{ position: 'relative' }}
        >
          <span className="tab-bar-icon">🤝</span>
          {t('nav.contacts')}
          {unreadChatCount > 0 && (
            <span style={{ position: 'absolute', top: 2, right: '20%', minWidth: 18, height: 18, borderRadius: 9, background: 'var(--clay)', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
              {unreadChatCount}
            </span>
          )}
        </button>
        <button
          className={`tab-bar-item ${activeTab === 'apps' && !openApp ? 'active' : ''}`}
          onClick={() => goToTab('apps')}
        >
          <span className="tab-bar-icon">🔲</span>
          {t('nav.apps')}
        </button>
        {isAdmin && (
          <button
            className={`tab-bar-item ${activeTab === 'admin' && !openApp ? 'active' : ''}`}
            onClick={() => goToTab('admin')}
          >
            <span className="tab-bar-icon">🛠️</span>
            {t('nav.admin')}
          </button>
        )}
      </nav>
    </div>
  )
}
