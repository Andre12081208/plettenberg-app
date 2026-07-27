import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Connections from './Connections.jsx'
import Chat from './Chat.jsx'
import Calendar from './Calendar.jsx'
import ProfileCard from './ProfileCard.jsx'

export default function Kontakte({ userId, profile, onBack, initialUsername, onConsumedInitial }) {
  const [view, setView] = useState('menu')
  const [connections, setConnections] = useState([])
  const [loading, setLoading] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const [calendarTarget, setCalendarTarget] = useState(null)
  const [profileCardTarget, setProfileCardTarget] = useState(null)
  const [openChat, setOpenChat] = useState(null)

  useEffect(() => {
    loadAll()
  }, [])

  useEffect(() => {
    if (initialUsername) setView('connect')
  }, [initialUsername])

  async function loadAll() {
    setLoading(true)

    const { data: allConnections } = await supabase
      .from('connections')
      .select('*')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)

    const accepted = (allConnections || []).filter((c) => c.status === 'accepted')

    const withNames = await Promise.all(
      accepted.map(async (c) => {
        const otherId = c.requester_id === userId ? c.addressee_id : c.requester_id
        const [{ data: username }, { data: displayName }, { data: avatarUrl }] = await Promise.all([
          supabase.rpc('get_username', { target_id: otherId }),
          supabase.rpc('get_display_name', { target_id: otherId }),
          supabase.rpc('get_avatar_url', { target_id: otherId })
        ])
        return { ...c, otherId, otherUsername: username, otherDisplayName: displayName, otherAvatarUrl: avatarUrl }
      })
    )

    setConnections(withNames)
    setPendingCount((allConnections || []).filter((c) => c.status === 'pending' && c.addressee_id === userId).length)
    setLoading(false)
  }

  if (openChat) {
    return (
      <Chat
        userId={userId}
        connectionId={openChat.connectionId}
        otherUsername={openChat.otherUsername}
        otherDisplayName={openChat.otherDisplayName}
        otherAvatarUrl={openChat.otherAvatarUrl}
        onBack={() => setOpenChat(null)}
      />
    )
  }

  if (view === 'viewProfileCard' && profileCardTarget) {
    return <ProfileCard contactId={profileCardTarget} onBack={() => setView('contactList')} />
  }

  if (view === 'viewCalendar' && calendarTarget) {
    return (
      <Calendar
        userId={userId}
        viewOwnerId={calendarTarget}
        onBack={() => setView('contactList')}
      />
    )
  }

  if (view === 'connect') {
    return (
      <Connections
        userId={userId}
        profile={profile}
        initialSearchValue={initialUsername}
        onBack={() => { setView('menu'); loadAll(); onConsumedInitial?.() }}
      />
    )
  }

  if (view === 'contactList') {
    return (
      <ContactSearch
        connections={connections}
        onBack={() => setView('menu')}
        onMessage={(c) => setOpenChat({ connectionId: c.id, otherUsername: c.otherUsername, otherDisplayName: c.otherDisplayName, otherAvatarUrl: c.otherAvatarUrl })}
        onViewCalendar={(c) => { setCalendarTarget(c.otherId); setView('viewCalendar') }}
        onViewProfile={(c) => { setProfileCardTarget(c.otherId); setView('viewProfileCard') }}
      />
    )
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>Kontakte</h1>
      </div>
      <main>
        <button className="link-text" onClick={onBack} style={{ marginBottom: 16 }}>← Zurück</button>

        <button className="card-choice" onClick={() => setView('connect')}>
          <span className="eyebrow">
            {pendingCount > 0 ? `${pendingCount} neue Anfrage${pendingCount > 1 ? 'n' : ''}` : 'Neue Kontakte'}
          </span>
          <h3>Vernetzen</h3>
          <p>Freunde per Nutzername, Link oder QR-Code finden, Anfragen annehmen.</p>
        </button>

        <button className="card-choice" onClick={() => setView('contactList')}>
          <h3 style={{ margin: 0 }}>Deine Kontakte</h3>
          <p style={{ margin: 0 }}>Suchen, Nachricht senden, Profil oder Kalender ansehen</p>
        </button>
      </main>
    </div>
  )
}

function ContactSearch({ connections, onBack, onMessage, onViewCalendar, onViewProfile }) {
  const [query, setQuery] = useState('')
  const [openActionsFor, setOpenActionsFor] = useState(null)

  const filtered = query.trim()
    ? connections.filter((c) =>
        c.otherDisplayName?.toLowerCase().includes(query.trim().toLowerCase()) ||
        c.otherUsername?.toLowerCase().includes(query.trim().toLowerCase())
      )
    : connections

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>Deine Kontakte</h1>
      </div>
      <main>
        <button className="link-text" onClick={onBack} style={{ marginBottom: 16 }}>← Zurück</button>

        <div className="field">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name oder Nutzername suchen..."
          />
        </div>

        {filtered.length === 0 && <p className="center-note">Keine Kontakte gefunden.</p>}

        {filtered.map((c) => (
          <div className="card" key={c.id}>
            <button
              style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 10 }}
              onClick={() => setOpenActionsFor(openActionsFor === c.id ? null : c.id)}
            >
              <div className="avatar-preview" style={{ width: 44, height: 44, flexShrink: 0 }}>
                {c.otherAvatarUrl ? <img src={c.otherAvatarUrl} alt="" /> : '👤'}
              </div>
              <div>
                <h3 style={{ margin: 0 }}>{c.otherDisplayName}</h3>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-soft)' }}>@{c.otherUsername}</p>
              </div>
            </button>

            {openActionsFor === c.id && (
              <div className="btn-row" style={{ marginTop: 12, flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={() => onViewProfile(c)}>Profil ansehen</button>
                <button className="btn btn-secondary" onClick={() => onMessage(c)}>Nachricht senden</button>
                <button className="btn btn-secondary" onClick={() => onViewCalendar(c)}>Kalender ansehen</button>
              </div>
            )}
          </div>
        ))}
      </main>
    </div>
  )
}
