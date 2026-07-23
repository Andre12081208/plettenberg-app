import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function ChannelDetail({ userId, channelId, onBack }) {
  const [channel, setChannel] = useState(null)
  const [posts, setPosts] = useState([])
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [content, setContent] = useState('')
  const [posting, setPosting] = useState(false)
  const [reported, setReported] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line
  }, [])

  async function loadAll() {
    setLoading(true)
    setError('')

    const [{ data: ch, error: chError }, { data: follow }, { data: postData }] = await Promise.all([
      supabase.from('channels').select('*').eq('id', channelId).maybeSingle(),
      supabase.from('channel_follows').select('id').eq('user_id', userId).eq('channel_id', channelId).maybeSingle(),
      supabase.from('channel_posts').select('*').eq('channel_id', channelId).order('created_at', { ascending: false })
    ])

    if (chError) setError(chError.message)
    setChannel(ch)
    setIsFollowing(!!follow)
    setPosts(postData || [])
    setLoading(false)
  }

  const isOwner = channel?.created_by === userId

  async function toggleFollow() {
    setBusy(true)
    if (isFollowing) {
      await supabase.from('channel_follows').delete().eq('user_id', userId).eq('channel_id', channelId)
      setIsFollowing(false)
    } else {
      await supabase.from('channel_follows').insert({ user_id: userId, channel_id: channelId })
      setIsFollowing(true)
    }
    setBusy(false)
  }

  async function handlePost(e) {
    e.preventDefault()
    setPosting(true)
    const { error } = await supabase.from('channel_posts').insert({ channel_id: channelId, content: content.trim() })
    if (error) setError(error.message)
    else { setContent(''); loadAll() }
    setPosting(false)
  }

  async function handleReport() {
    const { error } = await supabase.from('channel_reports').insert({ channel_id: channelId, reported_by: userId })
    if (error) setError(error.message)
    else setReported(true)
  }

  if (loading) {
    return (
      <div className="app-shell">
        <div className="topbar"><div className="mark">Plettenberg</div><h1>Channel</h1></div>
        <main><div className="loading-dot">Lädt...</div></main>
      </div>
    )
  }

  if (!channel) {
    return (
      <div className="app-shell">
        <div className="topbar"><div className="mark">Plettenberg</div><h1>Channel</h1></div>
        <main>
          <button className="link-text" onClick={onBack} style={{ marginBottom: 16 }}>← Zurück</button>
          <div className="error-box">Dieser Channel ist nicht (mehr) verfügbar.</div>
        </main>
      </div>
    )
  }

  const inviteLink = `${window.location.origin}?c=${channel.invite_code}`
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(inviteLink)}`

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>{channel.name}</h1>
      </div>
      <main>
        <button className="link-text" onClick={onBack} style={{ marginBottom: 16 }}>← Zurück</button>

        {error && <div className="error-box">{error}</div>}

        {channel.description && <p style={{ fontSize: 14, marginBottom: 14 }}>{channel.description}</p>}

        <div className="btn-row" style={{ marginBottom: 18 }}>
          <button className={isFollowing ? 'btn btn-secondary' : 'btn btn-primary'} onClick={toggleFollow} disabled={busy}>
            {isFollowing ? 'Entfolgen' : 'Folgen'}
          </button>
          {!isOwner && (
            <button className="btn btn-secondary" onClick={handleReport} disabled={reported}>
              {reported ? 'Gemeldet' : 'Melden'}
            </button>
          )}
        </div>

        {isOwner && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Einladung</h3>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', wordBreak: 'break-all' }}>{inviteLink}</p>
            <img src={qrUrl} alt="QR-Code" style={{ width: 140, height: 140 }} />
          </div>
        )}

        {isOwner && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>News veröffentlichen</h3>
            <form onSubmit={handlePost}>
              <div className="field">
                <textarea rows={3} required value={content} onChange={(e) => setContent(e.target.value)} placeholder="Was gibt's Neues?" />
              </div>
              <button className="btn btn-primary" type="submit" disabled={posting}>
                {posting ? 'Wird veröffentlicht...' : 'Veröffentlichen'}
              </button>
            </form>
          </div>
        )}

        <h3 style={{ marginBottom: 10 }}>Beiträge</h3>
        {posts.length === 0 && <p className="center-note">Noch keine Beiträge.</p>}
        {posts.map((p) => (
          <div className="card" key={p.id}>
            <p style={{ margin: 0, fontSize: 14 }}>{p.content}</p>
            <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{new Date(p.created_at).toLocaleString('de-DE')}</span>
          </div>
        ))}
      </main>
    </div>
  )
}
