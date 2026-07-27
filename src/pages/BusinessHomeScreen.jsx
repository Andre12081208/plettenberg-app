import { useState } from 'react'
import BusinessOverview from './BusinessOverview.jsx'
import BusinessSettings from './BusinessSettings.jsx'
import MyBusinessPage from './MyBusinessPage.jsx'
import BusinessInbox from './BusinessInbox.jsx'

export default function BusinessHomeScreen({ profile, isAdmin, onOpenAdmin, onProfileUpdated }) {
  const [activeTab, setActiveTab] = useState('dashboard')

  let content
  if (activeTab === 'dashboard') {
    content = <BusinessOverview profile={profile} isAdmin={isAdmin} onOpenAdmin={onOpenAdmin} />
  } else if (activeTab === 'mypage') {
    content = <MyBusinessPage profile={profile} onProfileUpdated={onProfileUpdated} onGoToSettings={() => setActiveTab('settings')} />
  } else if (activeTab === 'inbox') {
    content = <BusinessInbox profile={profile} />
  } else if (activeTab === 'settings') {
    content = <BusinessSettings profile={profile} onProfileUpdated={onProfileUpdated} />
  }

  return (
    <div className="app-shell">
      {content}

      <nav className="tab-bar">
        <button className={`tab-bar-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
          <span className="tab-bar-icon">🏠</span>
          Dashboard
        </button>
        <button className={`tab-bar-item ${activeTab === 'mypage' ? 'active' : ''}`} onClick={() => setActiveTab('mypage')}>
          <span className="tab-bar-icon">🏬</span>
          Meine Seite
        </button>
        <button className={`tab-bar-item ${activeTab === 'inbox' ? 'active' : ''}`} onClick={() => setActiveTab('inbox')}>
          <span className="tab-bar-icon">💬</span>
          Nachrichten
        </button>
        <button className={`tab-bar-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
          <span className="tab-bar-icon">⚙️</span>
          Einstellungen
        </button>
      </nav>
    </div>
  )
}
