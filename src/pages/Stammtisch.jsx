import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useCity } from '../lib/useCity.js'

export default function Stammtisch({ userId, onBack, initialCode, onConsumedInitial }) {
  const { name: cityName } = useCity()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [list, setList] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [tab, setTab] = useState('start')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [members, setMembers] = useState([])
  const [copyHint, setCopyHint] = useState('')

  useEffect(() => {
    if (initialCode) {
      handleJoin(initialCode)
      onConsumedInitial?.()
    } else {
      loadList()
    }
    // eslint-disable-next-line
  }, [])

  async function loadList() {
    setLoading(true)
    const { data, error } = await supabase.rpc('get_my_stammtische')
    if (error) setError(error.message)
    setList(data || [])
    setLoading(false)
  }

  async function handleCreate() {
    if (!newName.trim()) return
    setError('')
    const { data, error } = await supabase.rpc('create_stammtisch', { p_name: newName.trim() })
    if (error) { setError(error.message); return }
    setNewName('')
    setCreating(false)
    await loadList()
    setActiveId(data)
  }

  async function handleJoin(code) {
    setError('')
    const { data, error } = await supabase.rpc('join_stammtisch_by_code', { p_code: code.trim() })
    if (error) { setError(error.message); setLoading(false); return }
    await loadList()
    setActiveId(data)
  }

  async function loadMembers(stammtischId) {
    const { data, error } = await supabase.rpc('get_stammtisch_members', { p_stammtisch_id: stammtischId })
    if (error) setError(error.message)
    setMembers(data || [])
  }

  async function handleLeave(stammtischId) {
    if (!window.confirm('Diesen Stammtisch wirklich verlassen?')) return
    await supabase.rpc('leave_stammtisch', { p_stammtisch_id: stammtischId })
    setActiveId(null)
    loadList()
  }

  function shareLink(code) {
    const link = `${window.location.origin}/?st=${code}`
    navigator.clipboard.writeText(link)
    setCopyHint('Link kopiert!')
    setTimeout(() => setCopyHint(''), 2000)
  }

  const active = list.find((s) => s.id === activeId)

  useEffect(() => {
    if (active) loadMembers(active.id)
    // eslint-disable-next-line
  }, [activeId])

  if (loading) {
    return (
      <div className="app-shell">
        <div className="topbar">
          <div className="mark">{cityName}</div>
          <h1>Stammtisch</h1>
        </div>
        <main><div className="loading-dot">Lädt...</div></main>
      </div>
    )
  }

  if (!active) {
    return (
      <div className="app-shell">
        <div className="topbar">
          <div className="mark">{cityName}</div>
          <h1>Stammtisch</h1>
        </div>
        <main style={{ paddingBottom: 90 }}>
          <button className="link-text" onClick={onBack} style={{ marginBottom: 16 }}>← Zurück</button>

          {error && <div className="error-box">{error}</div>}

          {list.length === 0 && (
            <p className="hint" style={{ marginBottom: 16 }}>Du bist noch in keinem Stammtisch. Gründe deinen eigenen, oder tritt über einen Einladungslink bei.</p>
          )}

          {list.map((s) => (
            <button key={s.id} className="card-choice" onClick={() => setActiveId(s.id)} style={{ marginBottom: 10 }}>
              <h3 style={{ margin: 0 }}>{s.name}</h3>
              <p className="hint" style={{ margin: '4px 0 0' }}>{s.member_count} Mitglieder · {s.my_role === 'organisator' ? 'Organisator' : s.my_role === 'kassierer' ? 'Kassierer' : 'Mitglied'}</p>
            </button>
          ))}

          <div className="card" style={{ marginTop: 20 }}>
            <h3 style={{ marginTop: 0 }}>Neuen Stammtisch gründen</h3>
            {!creating ? (
              <button className="btn btn-primary" onClick={() => setCreating(true)}>+ Stammtisch gründen</button>
            ) : (
              <>
                <input
                  placeholder="Name des Stammtischs"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{ marginBottom: 10 }}
                />
                <div className="btn-row">
                  <button className="btn btn-primary" onClick={handleCreate}>Gründen</button>
                  <button className="btn btn-secondary" onClick={() => setCreating(false)}>Abbrechen</button>
                </div>
              </>
            )}
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <h3 style={{ marginTop: 0 }}>Einladungscode eingeben</h3>
            <input
              placeholder="z. B. a1b2c3d4"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              style={{ marginBottom: 10 }}
            />
            <button className="btn btn-secondary" onClick={() => handleJoin(joinCode)} disabled={!joinCode.trim()}>Beitreten</button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">{cityName}</div>
        <h1>{active.name}</h1>
      </div>
      <main style={{ paddingBottom: 90 }}>
        <button className="link-text" onClick={() => setActiveId(null)} style={{ marginBottom: 16 }}>← Zu meinen Stammtischen</button>

        {error && <div className="error-box">{error}</div>}

        {tab === 'start' && (
          <>
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Nächster Stammtisch</h3>
              <p className="hint">Noch kein Termin geplant. Termine kommen in der nächsten Ausbaustufe.</p>
            </div>
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Stammtischkasse</h3>
              <p className="hint">Die Kasse folgt in einer späteren Ausbaustufe.</p>
            </div>
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Mitglieder</h3>
              <p>{members.length} {members.length === 1 ? 'Mitglied' : 'Mitglieder'}</p>
            </div>
          </>
        )}

        {tab === 'termine' && (
          <div className="card"><p className="hint">Termine mit Zu- und Absage folgen in der nächsten Ausbaustufe.</p></div>
        )}

        {tab === 'kasse' && (
          <div className="card"><p className="hint">Die Stammtischkasse folgt in einer späteren Ausbaustufe.</p></div>
        )}

        {tab === 'mitglieder' && (
          <div>
            {members.map((m) => (
              <div key={m.user_id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="avatar-preview" style={{ width: 44, height: 44 }}>
                  {m.avatar_url ? <img src={m.avatar_url} alt="" /> : '👤'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{m.display_name || `@${m.username}`}</div>
                  <div className="hint">{m.role === 'organisator' ? 'Organisator' : m.role === 'kassierer' ? 'Kassierer' : 'Mitglied'} · seit {new Date(m.joined_at).toLocaleDateString('de-DE')}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'mehr' && (
          <div>
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Mitglieder einladen</h3>
              <p className="hint" style={{ marginBottom: 10 }}>Teile diesen Link mit Freunden – auch mit Leuten, die noch nicht verbunden sind.</p>
              <button className="btn btn-secondary" onClick={() => shareLink(active.invite_code)}>Einladungslink kopieren</button>
              {copyHint && <p className="hint" style={{ color: 'var(--forest)', marginTop: 8 }}>{copyHint}</p>}
            </div>
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Stammtisch verlassen</h3>
              <button className="btn btn-secondary" onClick={() => handleLeave(active.id)}>Verlassen</button>
            </div>
          </div>
        )}
      </main>

      <nav className="tab-bar" style={{ position: 'fixed' }}>
        <button className={tab === 'start' ? 'tab-active' : ''} onClick={() => setTab('start')}>
          <div className="app-tile-icon">🏠</div>
          <div className="app-tile-label">Stammtisch</div>
        </button>
        <button className={tab === 'termine' ? 'tab-active' : ''} onClick={() => setTab('termine')}>
          <div className="app-tile-icon">📅</div>
          <div className="app-tile-label">Termine</div>
        </button>
        <button className={tab === 'kasse' ? 'tab-active' : ''} onClick={() => setTab('kasse')}>
          <div className="app-tile-icon">💶</div>
          <div className="app-tile-label">Kasse</div>
        </button>
        <button className={tab === 'mitglieder' ? 'tab-active' : ''} onClick={() => setTab('mitglieder')}>
          <div className="app-tile-icon">👥</div>
          <div className="app-tile-label">Mitglieder</div>
        </button>
        <button className={tab === 'mehr' ? 'tab-active' : ''} onClick={() => setTab('mehr')}>
          <div className="app-tile-icon">⋯</div>
          <div className="app-tile-label">Mehr</div>
        </button>
      </nav>
    </div>
  )
}
