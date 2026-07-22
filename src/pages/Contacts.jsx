import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Connections from './Connections.jsx'

export default function Contacts({ userId, profile, onBack }) {
  const [view, setView] = useState('list') // 'list' | 'connect'
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
          const { data: username } = await supabase.rpc('get_username', { target_id: otherId })
          return { ...c, otherId, otherUsername: username }
        })
    )

    setConnections(withNames)
    setPendingCount(all.filter((c) => c.status === 'pending' && c.addressee_id === userId).length)
    setLoading(false)
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

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Deine Kontakte</h3>
          {loading && <div className="loading-dot">Lädt...</div>}
          {!loading && connections.length === 0 && (
            <p className="center-note">Noch keine Kontakte. Nutz "Vernetzen", um jemanden hinzuzufügen.</p>
          )}
          {connections.map((c) => (
            <p key={c.id} style={{ fontSize: 14 }}>@{c.otherUsername}</p>
          ))}
        </div>
      </main>
    </div>
  )
}
