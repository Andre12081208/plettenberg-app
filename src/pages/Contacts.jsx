import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Connections from './Connections.jsx'
import Chat from './Chat.jsx'
import Calendar from './Calendar.jsx'
import CreateGroup from './CreateGroup.jsx'
import GroupChat from './GroupChat.jsx'
import GroupSettings from './GroupSettings.jsx'
import ProfileCard from './ProfileCard.jsx'

export default function Contacts({ userId, profile, onBack, embedded, onUnreadChanged, initialUsername, initialGroupCode, onConsumedInitial }) {
  const [view, setView] = useState('list')
  const [openChat, setOpenChat] = useState(null)
  const [openGroup, setOpenGroup] = useState(null)
  const [chats, setChats] = useState([])
  const [groups, setGroups] = useState([])
  const [connections, setConnections] = useState([])
  const [loading, setLoading] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const [calendarTarget, setCalendarTarget] = useState(null)
  const [profileCardTarget, setProfileCardTarget] = useState(null)
  const [joinPreview, setJoinPreview] = useState(null)
  const [joinError, setJoinError] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinedMsg, setJoinedMsg] = useState('')

  useEffect(() => {
    loadAll()
  }, [])

  useEffect(() => {
    if (initialUsername) setView('connect')
  }, [initialUsername])

  useEffect(() => {
    if (initialGroupCode) loadJoinPreview(initialGroupCode)
    // eslint-disable-next-line
  }, [initialGroupCode])

  async function loadJoinPreview(code) {
    setJoinError('')
    setJoinedMsg('')
    const { data, error } = await supabase.rpc('get_group_preview', { code })
    if (error || !data || data.length === 0) {
      setJoinError('Diese Einladung ist ungültig oder abgelaufen.')
      setJoinPreview(null)
    } else {
      setJoinPreview({ ...data[0], code })
    }
    setView('joinGroupPreview')
  }

  async function confirmJoinGroup() {
    setJoining(true)
    const { error } = await supabase.rpc('request_join_group', { code: joinPreview.code })
    if (error) {
      setJoinError(error.message)
    } else {
      setJoinedMsg('Beitrittsanfrage gesendet. Ein Admin der Gruppe muss dich noch bestätigen.')
    }
    setJoining(false)
    onConsumedInitial?.()
  }

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

    const [{ data: chatList }, { data: groupList }] = await Promise.all([
      supabase.rpc('get_chat_list'),
      supabase.rpc('get_my_groups')
    ])

    setChats(chatList || [])
    setGroups(groupList || [])

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

  if (openGroup) {
    if (view === 'groupSettings') {
      return (
        <GroupSettings
          userId={userId}
          groupId={openGroup.id}
          onBack={() => setView('list')}
        />
      )
    }
    return (
      <GroupChat
        userId={userId}
        groupId={openGroup.id}
        groupName={openGroup.name}
        isAdmin={openGroup.isAdmin}
        onOpenSettings={() => setView('groupSettings')}
        onBack={() => { setOpenGroup(null); setView('list'); loadAll() }}
      />
    )
  }

  if (view === 'viewProfileCard' && profileCardTarget) {
    return <ProfileCard contactId={profileCardTarget} onBack={() => setView('contactList')} />
  }

  if (view === 'createGroup') {
    return (
      <CreateGroup
        onBack={() => setView('list')}
        onDone={(groupId, groupName) => { setOpenGroup({ id: groupId, name: groupName, isAdmin: true }); setView('list') }}
      />
    )
  }

  if (view === 'joinGroupPreview') {
    return (
      <div className="app-shell">
        <div className="topbar">
          <div className="mark">Plettenberg</div>
          <h1>Gruppeneinladung</h1>
        </div>
        <main>
          <button className="link-text" onClick={() => { setView('list'); onConsumedInitial?.() }} style={{ marginBottom: 16 }}>← Zurück</button>

          {joinError && <div className="error-box">{joinError}</div>}
          {joinedMsg && <div className="error-box" style={{ background: '#E5EFEA', color: '#1F4D3F', borderColor: '#1F4D3F' }}>{joinedMsg}</div>}

          {joinPreview && !joinedMsg && (
            <div className="card">
              <h3 style={{ marginTop: 0 }}>{joinPreview.name}</h3>
              {joinPreview.description && <p style={{ fontSize: 14 }}>{joinPreview.description}</p>}
              <button className="btn btn-primary" onClick={confirmJoinGroup} disabled={joining}>
                {joining ? 'Einen Moment...' : 'Beitritt anfragen'}
              </button>
            </div>
          )}
        </main>
      </div>
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
        initialSearchValue={initialUsername}
        onBack={() => { setView('list'); loadAll(); onConsumedInitial?.() }}
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
        onViewProfile={(c) => { setProfileCardTarget(c.otherId); setView('viewProfileCard') }}
      />
    )
  }

  const combined = [
    ...chats.map((c) => ({
      type: 'dm', key: `dm-${c.connection_id}`, title: c.display_name,
      subtitle: c.last_message, lastAt: c.last_message_at, hasUnread: c.has_unread, raw: c
    })),
    ...groups.map((g) => ({
      type: 'group', key: `group-${g.group_id}`, title: g.name,
      subtitle: g.last_message, lastAt: g.last_message_at, hasUnread: false, raw: g
    }))
  ].sort((a, b) => new Date(b.lastAt || 0) - new Date(a.lastAt || 0))

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
        <p style={{ margin: 0 }}>Suchen, Nachricht senden, Profil oder Kalender ansehen</p>
      </button>

      <div className="btn-row" style={{ marginBottom: 18 }}>
        <button className="btn btn-secondary" onClick={() => setView('createGroup')}>+ Neue Gruppe</button>
      </div>

      <h3 style={{ marginBottom: 10 }}>Chats</h3>
      {loading && <div className="loading-dot">Lädt...</div>}
      {!loading && combined.length === 0 && <p className="center-note">Noch keine Chats.</p>}

      {combined.map((item) => (
        <div key={item.key} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            style={{ background: 'none', border: 'none', textAlign: 'left', flex: 1, cursor: 'pointer', padding: 0 }}
            onClick={() => {
              if (item.type === 'dm') {
                setOpenChat({ connectionId: item.raw.connection_id, otherUsername: item.raw.username, otherDisplayName: item.raw.display_name })
              } else {
                setOpenGroup({ id: item.raw.group_id, name: item.raw.name, isAdmin: item.raw.is_admin })
              }
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>
                {item.type === 'group' ? '👥 ' : ''}{item.title}
              </h3>
              {item.hasUnread && (
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--clay)', display: 'inline-block' }} />
              )}
              {item.type === 'group' && item.raw.pending_count > 0 && (
                <span className="status-pill status-pruefung" style={{ fontSize: 10 }}>{item.raw.pending_count} wartet</span>
              )}
            </div>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>
              {item.subtitle ? (item.subtitle.length > 40 ? item.subtitle.slice(0, 40) + '…' : item.subtitle) : ''}
            </p>
          </button>
          {item.type === 'dm' && (
            <button
              className="link-text"
              style={{ fontSize: 12, marginLeft: 10 }}
              onClick={() => handleDeleteChat(item.raw.connection_id)}
            >
              Löschen
            </button>
          )}
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
              style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', padding: 0 }}
              onClick={() => setOpenActionsFor(openActionsFor === c.id ? null : c.id)}
            >
              <h3 style={{ margin: 0 }}>{c.otherDisplayName}</h3>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-soft)' }}>@{c.otherUsername}</p>
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
