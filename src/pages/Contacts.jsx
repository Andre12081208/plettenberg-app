import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useCity } from '../lib/useCity.js'
import Chat from './Chat.jsx'
import CreateGroup from './CreateGroup.jsx'
import GroupChat from './GroupChat.jsx'
import GroupSettings from './GroupSettings.jsx'

export default function Contacts({ userId, onBack, embedded, onUnreadChanged, initialGroupCode, onConsumedInitial }) {
  const { name: cityName } = useCity()
  const [view, setView] = useState('list')
  const [openChat, setOpenChat] = useState(null)
  const [openGroup, setOpenGroup] = useState(null)
  const [chats, setChats] = useState([])
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [joinPreview, setJoinPreview] = useState(null)
  const [joinError, setJoinError] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinedMsg, setJoinedMsg] = useState('')

  useEffect(() => {
    loadAll()
  }, [])

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
        otherAvatarUrl={openChat.otherAvatarUrl}
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
          <div className="mark">{cityName}</div>
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

  const combined = [
    ...chats.map((c) => ({
      type: 'dm', key: `dm-${c.connection_id}`, title: c.display_name,
      subtitle: c.last_message, lastAt: c.last_message_at, unreadCount: c.unread_count || 0, avatarUrl: c.avatar_url, raw: c
    })),
    ...groups.map((g) => ({
      type: 'group', key: `group-${g.group_id}`, title: g.name,
      subtitle: g.last_message, lastAt: g.last_message_at, unreadCount: 0, avatarUrl: null, raw: g
    }))
  ].sort((a, b) => new Date(b.lastAt || 0) - new Date(a.lastAt || 0))

  const content = (
    <>
      <div className="btn-row" style={{ marginBottom: 18 }}>
        <button className="btn btn-secondary" onClick={() => setView('createGroup')}>+ Neue Gruppe</button>
      </div>

      {loading && <div className="loading-dot">Lädt...</div>}
      {!loading && combined.length === 0 && <p className="center-note">Noch keine Chats.</p>}

      {combined.map((item) => (
        <div key={item.key} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            style={{ background: 'none', border: 'none', textAlign: 'left', flex: 1, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 10 }}
            onClick={() => {
              if (item.type === 'dm') {
                setOpenChat({ connectionId: item.raw.connection_id, otherUsername: item.raw.username, otherDisplayName: item.raw.display_name, otherAvatarUrl: item.raw.avatar_url })
              } else {
                setOpenGroup({ id: item.raw.group_id, name: item.raw.name, isAdmin: item.raw.is_admin })
              }
            }}
          >
            <div className="avatar-preview" style={{ width: 44, height: 44, flexShrink: 0 }}>
              {item.type === 'group' ? '👥' : (item.avatarUrl ? <img src={item.avatarUrl} alt="" /> : '👤')}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <h3 style={{ margin: 0, fontSize: 16 }}>{item.title}</h3>
                {item.type === 'group' && item.raw.pending_count > 0 && (
                  <span className="status-pill status-pruefung" style={{ fontSize: 10 }}>{item.raw.pending_count} wartet</span>
                )}
              </div>
              <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>
                {item.subtitle ? (item.subtitle.length > 40 ? item.subtitle.slice(0, 40) + '…' : item.subtitle) : ''}
              </p>
            </div>
            {item.unreadCount > 0 && (
              <span style={{ minWidth: 22, height: 22, borderRadius: 11, background: 'var(--clay)', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px', flexShrink: 0 }}>
                {item.unreadCount}
              </span>
            )}
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
          <div className="mark">{cityName}</div>
          <h1>Chats</h1>
        </div>
        <main style={{ paddingBottom: 90 }}>{content}</main>
      </>
    )
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">{cityName}</div>
        <h1>Chats</h1>
      </div>
      <main>
        <button className="link-text" onClick={onBack} style={{ marginBottom: 16 }}>← Zurück</button>
        {content}
      </main>
    </div>
  )
}
