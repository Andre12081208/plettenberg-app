import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Connections from './Connections.jsx'
import Chat from './Chat.jsx'
import Calendar from './Calendar.jsx'

export default function Contacts({ userId, profile, onBack, embedded, onUnreadChanged }) {
  const [view, setView] = useState('list') // 'list' | 'connect' | 'contactList' | 'viewCalendar'
  const [openChat, setOpenChat] = useState(null)
  const [chats, setChats] = useState([])
  const [connections, setConnections] = useState([])
  const [loading, setLoading] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const [calendarTarget, setCalendarTarget] = useState(null)

  useEffect(() => {
    loadAll()
  }, [])

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
        const [{ data: username }, { data: displayName }] = await Promise.all([
          supabase.rpc('get_username', { target_id: otherId }),
          supabase.rpc('get_display_name', { target_id: otherId })
        ])
        return { ...c, otherId, otherUsername: username, otherDisplayName: displayName }
      })
    )

    setConnections(withNames)
    setPendingCount((allConnections || []).filter((c) => c.status === 'pending' && c.addressee_id === userId).length)

    const { data: chatList } = await supabase.rpc('get_chat_list')
    setChats(chatList || [])

    setLoading(false)
    onUnreadChanged?.()
  }

  async function handleDeleteChat(connectionId) {
    await supabase.rpc('hide_chat', { target_connection_id: connectionId })
    loadAll()
  }

  if (openChat) {
    return (
      <Chat
        userId={userId}
        connectionId={openChat.connectionId}
        otherUsername={openChat.otherUsername}
        otherDisplayName={openChat.otherDisplayName}
        onBack={() => { setOpenChat(null); loadAll() }}
      />
    )
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
        onBack={() => { setView('list'); loadAll() }}
      />
    )
  }

  if (view === 'contactList') {
    return (
      <ContactSearch
        connections={connections}
        onBack={() => setView('list')}
        onMessage={(c) => setOpenChat({ connectionId: c.id, otherUsername: c.otherUsername, otherDisplayName: c.otherDisplayName })}
        onViewCalendar={(c) => { setCalendarTarget(c.otherId); setView('viewCalendar') }}
      />
    )
  }

  const content = (
    <>
      <button className="card-choice" onClick={() => setView('connect')}>
        <span className="eyebrow">
          {pendingCount > 0 ? `${pendingCount} neue Anfrage${pendingCount > 1 ? 'n' : ''}` : 'Neue Kontakte'}
        </span>
        <h3>Vernetzen</h3>
        <p>Freunde per Nutzername, Link oder QR-Code finden, Anfragen annehmen.</p>
      </button>

      <button className="card-choice" onClick={() => setView('contactList')}>
        <h3 style={{ margin: 0 }}>Deine Kontakte</h3>
        <p style={{ margin: 0 }}>Suchen, Nachricht senden, Kalender ansehen</p>
      </button>

      <h3 style={{ marginBottom: 10 }}>Chats</h3>
      {loading && <div className="loading-dot">Lädt...</div>}
      {!loading && chats.length === 0 && <p className="center-note">Noch keine Chats.</p>}

      {chats.map((c) => (
        <div key={c.connection_id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            style={{ background: 'none', border: 'none', textAlign: 'left', flex: 1, cursor: 'pointer', padding: 0 }}
            onClick={() => setOpenChat({ connectionId: c.connection_id, otherUsername: c.username, otherDisplayName: c.display_name })}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>{c.display_name}</h3>
              {c.has_unread && (
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--clay)', display: 'inline-block' }} />
              )}
            </div>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>
              {c.last_message ? (c.last_message.length > 40 ? c.last_message.slice(0, 40) + '…' : c.last_message) : ''}
            </p>
          </button>
          <button
            className="link-text"
            style={{ fontSize: 12, marginLeft: 10 }}
            onClick={() => handleDeleteChat(c.connection_id)}
          >
            Löschen
          </button>
        </div>
      ))}
    </>
  )

  if (embedded) {
    return (
      <>
        <div className="topbar">
          <div className="mark">Plettenberg</div>
          <h1>Kontakte</h1>
        </div>
        <main style={{ paddingBottom: 90 }}>{content}</main>
      </>
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
        {content}
      </main>
    </div>
  )
}

function ContactSearch({ connections, onBack, onMessage, onViewCalendar }) {
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
              style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', padding: 0 }}
              onClick={() => setOpenActionsFor(openActionsFor === c.id ? null : c.id)}
            >
              <h3 style={{ margin: 0 }}>{c.otherDisplayName}</h3>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-soft)' }}>@{c.otherUsername}</p>
            </button>

            {openActionsFor === c.id && (
              <div className="btn-row" style={{ marginTop: 12 }}>
                <button className="btn btn-primary" onClick={() => onMessage(c)}>Nachricht senden</button>
                <button className="btn btn-secondary" onClick={() => onViewCalendar(c)}>Kalender ansehen</button>
              </div>
            )}
          </div>
        ))}
      </main>
    </div>
  )
}
