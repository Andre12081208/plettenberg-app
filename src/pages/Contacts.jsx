import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Connections from './Connections.jsx'
import Chat from './Chat.jsx'

export default function Contacts({ userId, profile, onBack, embedded }) {
  const [view, setView] = useState('list') // 'list' | 'connect'
  const [openChat, setOpenChat] = useState(null)
  const [connections, setConnections] = useState([])
  const [loading, setLoading] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    loadConnections()
  }, [])

  async function loadConnections() {
    setLoading(true)
    const { data } = await supabase
      .from('connections')
      .select('*')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)

    const all = data || []

    const withNames = await Promise.all(
      all
        .filter((c) => c.status === 'accepted')
        .map(async (c) => {
          const otherId = c.requester_id === userId ? c.addressee_id : c.requester_id
          const [{ data: username }, { data: displayName }] = await Promise.all([
            supabase.rpc('get_username', { target_id: otherId }),
            supabase.rpc('get_display_name', { target_id: otherId })
          ])
          return { ...c, otherId, otherUsername: username, otherDisplayName: displayName }
        })
    )
    setConnections(withNames)
    setPendingCount(all.filter((c) => c.status === 'pending' && c.addressee_id === userId).length)
    setLoading(false)
  }

  if (openChat) {
    return (
      <Chat
        userId={userId}
        connectionId={openChat.connectionId}
        otherUsername={openChat.otherUsername}
        otherDisplayName={openChat.otherDisplayName}
        onBack={() => setOpenChat(null)}
      />
    )
  }

  if (view === 'connect') {
    return (
      <Connections
        userId={userId}
        profile={profile}
        onBack={() => { setView('list'); loadConnections() }}
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

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Deine Kontakte</h3>
        {loading && <div className="loading-dot">Lädt...</div>}
        {!loading && connections.length === 0 && (
          <p className="center-note">Noch keine Kontakte. Nutz "Vernetzen", um jemanden hinzuzufügen.</p>
        )}
        {connections.map((c) => (
          <button
            key={c.id}
            className="card-choice"
            style={{ marginBottom: 10 }}
            onClick={() => setOpenChat({ connectionId: c.id, otherUsername: c.otherUsername, otherDisplayName: c.otherDisplayName })}
          >
            <h3 style={{ margin: 0 }}>{c.otherDisplayName}</h3>
            <p style={{ margin: 0 }}>@{c.otherUsername}</p>
          </button>
        ))}
      </div>
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
