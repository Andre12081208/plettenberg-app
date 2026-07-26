import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function CalendarShareSettings({ userId, onBack }) {
  const [contacts, setContacts] = useState([])
  const [shares, setShares] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  const [username, setUsername] = useState('')
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    setError('')

    const [{ data: allConnections }, { data: shareRows, error: sharesError }] = await Promise.all([
      supabase.from('connections').select('*').or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
      supabase.from('calendar_shares').select('*').eq('owner_id', userId)
    ])

    if (sharesError) {
      setError(sharesError.message)
      setLoading(false)
      return
    }

    const accepted = (allConnections || []).filter((c) => c.status === 'accepted')

    const withNames = await Promise.all(
      accepted.map(async (c) => {
        const otherId = c.requester_id === userId ? c.addressee_id : c.requester_id
        const [{ data: username }, { data: displayName }, { data: avatarUrl }] = await Promise.all([
          supabase.rpc('get_username', { target_id: otherId }),
          supabase.rpc('get_display_name', { target_id: otherId }),
          supabase.rpc('get_avatar_url', { target_id: otherId })
        ])
        return { otherId, otherUsername: username, otherDisplayName: displayName, otherAvatarUrl: avatarUrl }
      })
    )

    setContacts(withNames)
    setShares(shareRows || [])
    setLoading(false)
  }

  function shareIdFor(viewerId) {
    return shares.find((s) => s.viewer_id === viewerId)?.id
  }

  async function grantAccess(viewerId) {
    setBusyId(viewerId)
    setError('')
    const { data, error } = await supabase
      .from('calendar_shares')
      .insert({ owner_id: userId, viewer_id: viewerId })
      .select('*')
      .single()

    if (error) {
      setError(error.message.includes('duplicate') ? 'Diese Person hat schon Zugriff.' : error.message)
    } else {
      setShares((prev) => [...prev, data])
    }
    setBusyId(null)
  }

  async function revokeAccess(viewerId) {
    const shareId = shareIdFor(viewerId)
    if (!shareId) return

    setBusyId(viewerId)
    const { error } = await supabase.from('calendar_shares').delete().eq('id', shareId)

    if (error) {
      setError(error.message)
    } else {
      setShares((prev) => prev.filter((s) => s.id !== shareId))
    }
    setBusyId(null)
  }

  async function grantAccessByUsername(e) {
    e.preventDefault()
    setError('')
    setSearching(true)

    const clean = username.trim().toLowerCase()
    const { data, error } = await supabase.rpc('find_profile_by_username', { search_username: clean })

    if (error || !data || data.length === 0) {
      setError('Kein Nutzer mit diesem Namen gefunden.')
      setSearching(false)
      return
    }

    await grantAccess(data[0].user_id)
    setUsername('')
    setSearching(false)
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>Freigabe verwalten</h1>
      </div>
      <main>
        <button className="link-text" onClick={onBack} style={{ marginBottom: 16 }}>← Zurück</button>

        {error && <div className="error-box">{error}</div>}

        <h3 style={{ marginBottom: 10 }}>Deine Kontakte</h3>
        {loading && <div className="loading-dot">Lädt...</div>}
        {!loading && contacts.length === 0 && (
          <p className="center-note">Du hast noch keine bestätigten Kontakte.</p>
        )}

        {!loading && contacts.map((c) => {
          const hasAccess = !!shareIdFor(c.otherId)
          return (
            <div className="card" key={c.otherId} style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="avatar-preview" style={{ width: 44, height: 44, flexShrink: 0 }}>
                  {c.otherAvatarUrl ? <img src={c.otherAvatarUrl} alt="" /> : '👤'}
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 600 }}>{c.otherDisplayName}</p>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-soft)' }}>@{c.otherUsername}</p>
                </div>
              </div>

              {hasAccess ? (
                <button
                  className="btn btn-secondary"
                  style={{ width: 'auto', padding: '8px 14px', flexShrink: 0 }}
                  onClick={() => revokeAccess(c.otherId)}
                  disabled={busyId === c.otherId}
                >
                  Zugriff entziehen
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  style={{ width: 'auto', padding: '8px 14px', flexShrink: 0 }}
                  onClick={() => grantAccess(c.otherId)}
                  disabled={busyId === c.otherId}
                >
                  Zugriff gewähren
                </button>
              )}
            </div>
          )
        })}

        <div className="card" style={{ marginTop: 20 }}>
          <h3 style={{ marginTop: 0 }}>Über Nutzername freigeben</h3>
          <p className="hint" style={{ marginBottom: 12 }}>Falls die Person nicht in deiner Kontaktliste oben auftaucht.</p>
          <form onSubmit={grantAccessByUsername}>
            <div className="field">
              <label htmlFor="username">Nutzername</label>
              <input id="username" required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="z.B. wanderfreund23" />
            </div>
            <button className="btn btn-secondary" type="submit" disabled={searching}>
              {searching ? 'Einen Moment...' : 'Zugriff geben'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
