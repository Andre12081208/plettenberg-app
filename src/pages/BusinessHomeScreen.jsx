import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import BusinessOverview from './BusinessOverview.jsx'
import BusinessSettings from './BusinessSettings.jsx'
import MyBusinessPage from './MyBusinessPage.jsx'
import BusinessInbox from './BusinessInbox.jsx'

export default function BusinessHomeScreen({ profile, isAdmin, isMasterAdmin, onBackToDashboard, onOpenAdmin, onProfileUpdated }) {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [unreadInquiryCount, setUnreadInquiryCount] = useState(0)
  const [settingsResetKey, setSettingsResetKey] = useState(0)

  useEffect(() => {
    checkUnreadInquiries()
    const interval = setInterval(checkUnreadInquiries, 20000)
    return () => clearInterval(interval)
  }, [])

  async function checkUnreadInquiries() {
    const { data } = await supabase.rpc('get_unread_business_inquiry_count')
    setUnreadInquiryCount(data || 0)
  }

  function goToTab(tab) {
    if (tab === 'settings' && activeTab === 'settings') {
      setSettingsResetKey((k) => k + 1)
    }
    setActiveTab(tab)
    if (tab !== 'inbox') checkUnreadInquiries()
  }

  let content
  if (activeTab === 'dashboard') {
    content = <BusinessOverview profile={profile} />
  } else if (activeTab === 'mypage') {
    content = <MyBusinessPage profile={profile} onProfileUpdated={onProfileUpdated} onGoToSettings={() => setActiveTab('settings')} />
  } else if (activeTab === 'inbox') {
    content = <BusinessInbox profile={profile} onInquiryRead={checkUnreadInquiries} />
  } else if (activeTab === 'settings') {
    content = <BusinessSettings key={settingsResetKey} profile={profile} onProfileUpdated={onProfileUpdated} onGoToMySeite={() => goToTab('mypage')} />
  }

  return (
    <div className="app-shell">
      {content}

      <nav className="tab-bar">
        <button className={`tab-bar-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => goToTab('dashboard')}>
          <span className="tab-bar-icon">🏠</span>
          Admin Dashboard
        </button>
        <button className={`tab-bar-item ${activeTab === 'mypage' ? 'active' : ''}`} onClick={() => goToTab('mypage')}>
          <span className="tab-bar-icon">🏬</span>
          Meine Seite
        </button>
        <button className={`tab-bar-item ${activeTab === 'inbox' ? 'active' : ''}`} onClick={() => goToTab('inbox')} style={{ position: 'relative' }}>
          <span className="tab-bar-icon">💬</span>
          Nachrichten
          {unreadInquiryCount > 0 && (
            <span style={{ position: 'absolute', top: 2, right: '20%', minWidth: 18, height: 18, borderRadius: 9, background: 'var(--clay)', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
              {unreadInquiryCount}
            </span>
          )}
        </button>
        <button className={`tab-bar-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => goToTab('settings')}>
          <span className="tab-bar-icon">⚙️</span>
          Einstellungen
        </button>
        {isMasterAdmin && (
          <button className="tab-bar-item" onClick={onBackToDashboard}>
            <span className="tab-bar-icon">🧭</span>
            Master Dashboard
          </button>
        )}
      </nav>
    </div>
  )
}
