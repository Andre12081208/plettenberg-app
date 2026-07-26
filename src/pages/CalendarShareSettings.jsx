import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function CalendarShareSettings({ userId, onBack }) {
  const [shares, setShares] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [username, setUsername] = useState('')
  const [searching, setSearching] = useState(false)
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    loadShares()
  }, [])

  async function loadShares() {
    setLoading(true)
    const { data, error } = await supabase
      .from('calendar_shares')
      .select('*')
      .eq('owner_id', userId)

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    const withNames = await Promise.all(
      (data || []).map(async (s) => {
        const { data: uname } = await supabase.rpc('get_username', { target_id: s.viewer_id })
        return { ...s, username: uname }
      })
    )
    setShares(withNames)
    setLoading(false)
  }

  async function grantAccess(e) {
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

    const { error: insertError } = await supabase.from('calendar_shares').insert({
      owner_id: userId,
      viewer_id: data[0].user_id
    })

    if (insertError) {
      setError(insertError.message.includes('duplicate') ? 'Diese Person hat schon Zugriff.' : insertError.message)
    } else {
      setUsername('')
      loadShares()
    }
    setSearching(false)
  }

  async function revoke(shareId) {
    setBusyId(shareId)
    const { error } = await supabase.from('calendar_shares').delete().eq('id', shareId)
    if (!error) {
      setShares((prev) => prev.filter((s) => s.id !== shareId))
    } else {
      setError(error.message)
    }
    setBusyId(null)
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

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Zugriff gewähren</h3>
          <form onSubmit={grantAccess}>
            <div className="field">
              <label htmlFor="username">Nutzername</label>
              <input id="username" required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="z.B. wanderfreund23" />
            </div>
            <button className="btn btn-primary" type="submit" disabled={searching}>
              {searching ? 'Einen Moment...' : 'Zugriff geben'}
            </button>
          </form>
        </div>

        <h3 style={{ marginBottom: 10 }}>Hat aktuell Zugriff</h3>
        {loading && <div className="loading-dot">Lädt...</div>}
        {!loading && shares.length === 0 && <p className="center-note">Noch niemand hat Zugriff auf deinen Kalender.</p>}

        {shares.map((s) => (
          <div className="card" key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>@{s.username}</span>
            <button className="btn btn-secondary" style={{ width: 'auto', padding: '8px 16px' }} onClick={() => revoke(s.id)} disabled={busyId === s.id}>
              Entziehen
            </button>
          </div>
        ))}
      </main>
    </div>
  )
}
