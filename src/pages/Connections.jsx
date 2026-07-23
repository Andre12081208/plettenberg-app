import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Connections({ userId, profile, initialSearchValue, onBack }) {
  const [searchValue, setSearchValue] = useState(initialSearchValue || '')
  const [searchResult, setSearchResult] = useState(null)
  const [searchError, setSearchError] = useState('')
  const [searching, setSearching] = useState(false)

  const [connections, setConnections] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    loadConnections()
  }, [])

  useEffect(() => {
    if (initialSearchValue) {
      handleSearch(initialSearchValue)
    }
    // eslint-disable-next-line
  }, [initialSearchValue])

  async function loadConnections() {
    setLoading(true)
    const { data } = await supabase
      .from('connections')
      .select('*')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)

    const withNames = await Promise.all(
      (data || []).map(async (c) => {
        const otherId = c.requester_id === userId ? c.addressee_id : c.requester_id
        const [{ data: username }, { data: displayName }] = await Promise.all([
          supabase.rpc('get_username', { target_id: otherId }),
          supabase.rpc('get_display_name', { target_id: otherId })
        ])
        return { ...c, otherId, otherUsername: username, otherDisplayName: displayName }
      })
    )

    setConnections(withNames)
    setLoading(false)
  }

  async function handleSearch(value) {
    const clean = (value || '').trim().toLowerCase()
    setSearchValue(clean)
    setSearchError('')
    setSearchResult(null)
    if (!clean) return

    setSearching(true)
    const { data, error } = await supabase.rpc('find_profile_by_username', { search_username: clean })

    if (error) {
      setSearchError(error.message)
    } else if (!data || data.length === 0) {
      setSearchError('Kein Nutzer mit diesem Namen gefunden.')
    } else {
      setSearchResult(data[0])
    }
    setSearching(false)
  }

  function connectionWith(targetId) {
    return connections.find((c) => c.otherId === targetId)
  }

  async function sendRequest(targetId) {
    setBusyId(targetId)
    const { error } = await supabase.from('connections').insert({
      requester_id: userId,
      addressee_id: targetId,
      status: 'pending'
    })
    if (!error) loadConnections()
    setBusyId(null)
  }

  async function respond(connectionId, status) {
    setBusyId(connectionId)
    if (status === 'declined') {
      await supabase.from('connections').delete().eq('id', connectionId)
    } else {
      await supabase.from('connections').update({ status }).eq('id', connectionId)
    }
    loadConnections()
    setBusyId(null)
  }

  const shareLink = profile.username
    ? `${window.location.origin}?u=${profile.username}`
    : null
  const qrUrl = shareLink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(shareLink)}`
    : null

  const incoming = connections.filter((c) => c.status === 'pending' && c.addressee_id === userId)

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>Vernetzen</h1>
      </div>
      <main>
        <button className="link-text" onClick={onBack} style={{ marginBottom: 16 }}>← Zurück</button>

        {!profile.username && (
          <div className="error-box">
            Du hast noch keinen Nutzernamen. Ohne Nutzernamen können dich andere nicht finden.
          </div>
        )}

        {profile.username && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Dein Verbindungslink</h3>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', wordBreak: 'break-all' }}>{shareLink}</p>
            {qrUrl && <img src={qrUrl} alt="QR-Code" style={{ width: 140, height: 140 }} />}
          </div>
        )}

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Nutzer suchen</h3>
          <div className="field">
            <input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Nutzername eingeben"
            />
          </div>
          <button className="btn btn-secondary" onClick={() => handleSearch(searchValue)} disabled={searching}>
            {searching ? 'Sucht...' : 'Suchen'}
          </button>

          {searchError && <div className="error-box" style={{ marginTop: 12 }}>{searchError}</div>}

          {searchResult && (
            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>@{searchResult.username}</span>
              {searchResult.user_id === userId ? (
                <span className="hint">Das bist du</span>
              ) : connectionWith(searchResult.user_id) ? (
                <span className="hint">
                  {connectionWith(searchResult.user_id).status === 'accepted' ? 'Verbunden' : 'Anfrage ausstehend'}
                </span>
              ) : (
                <button
                  className="btn btn-primary"
                  style={{ width: 'auto', padding: '8px 16px' }}
                  onClick={() => sendRequest(searchResult.user_id)}
                  disabled={busyId === searchResult.user_id}
                >
                  Anfrage senden
                </button>
              )}
            </div>
          )}
        </div>

        {!loading && incoming.length > 0 && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Anfragen</h3>
            {incoming.map((c) => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
               <div>
                  <div style={{ fontWeight: 600 }}>{c.otherDisplayName}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>@{c.otherUsername}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-primary"
                    style={{ width: 'auto', padding: '6px 12px' }}
                    onClick={() => respond(c.id, 'accepted')}
                    disabled={busyId === c.id}
                  >
                    Annehmen
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={{ width: 'auto', padding: '6px 12px' }}
                    onClick={() => respond(c.id, 'declined')}
                    disabled={busyId === c.id}
                  >
                    Ablehnen
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
