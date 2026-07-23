import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function ChannelDetail({ userId, channelId, onBack }) {
  const [channel, setChannel] = useState(null)
  const [posts, setPosts] = useState([])
  const [followStatus, setFollowStatus] = useState('none') // 'none' | 'active' | 'pending'
  const [pendingFollowers, setPendingFollowers] = useState([])
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
      supabase.from('channel_follows').select('status').eq('user_id', userId).eq('channel_id', channelId).maybeSingle(),
      supabase.from('channel_posts').select('*').eq('channel_id', channelId).order('created_at', { ascending: false })
    ])

    if (chError) setError(chError.message)
    setChannel(ch)
    setFollowStatus(follow ? follow.status : 'none')
    setPosts(postData || [])

    if (ch?.created_by === userId) {
      const { data: pending } = await supabase.rpc('get_channel_pending_followers', { gid: channelId })
      setPendingFollowers(pending || [])
    }

    setLoading(false)
  }

  const isOwner = channel?.created_by === userId

  async function toggleFollow() {
    setBusy(true)
    if (followStatus !== 'none') {
      await supabase.from('channel_follows').delete().eq('user_id', userId).eq('channel_id', channelId)
      setFollowStatus('none')
    } else {
      const newStatus = channel.require_approval ? 'pending' : 'active'
      await supabase.from('channel_follows').insert({ user_id: userId, channel_id: channelId, status: newStatus })
      setFollowStatus(newStatus)
    }
    setBusy(false)
  }

  async function handleTogglePublic() {
    const newValue = !channel.is_public
    const { error } = await supabase.from('channels').update({ is_public: newValue }).eq('id', channelId)
    if (error) setError(error.message)
    else setChannel((prev) => ({ ...prev, is_public: newValue }))
  }

  async function handleToggleApproval() {
    const newValue = !channel.require_approval
    const { error } = await supabase.from('channels').update({ require_approval: newValue }).eq('id', channelId)
    if (error) setError(error.message)
    else setChannel((prev) => ({ ...prev, require_approval: newValue }))
  }

  async function approveFollower(uid) {
    setBusy(true)
    await supabase.from('channel_follows').update({ status: 'active' }).eq('channel_id', channelId).eq('user_id', uid)
    setPendingFollowers((prev) => prev.filter((p) => p.user_id !== uid))
    setBusy(false)
  }

  async function declineFollower(uid) {
    setBusy(true)
    await supabase.from('channel_follows').delete().eq('channel_id', channelId).eq('user_id', uid)
    setPendingFollowers((prev) => prev.filter((p) => p.user_id !== uid))
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

        {followStatus === 'pending' && (
          <div className="error-box" style={{ background: '#FCEFE1', color: 'var(--clay)', borderColor: 'var(--clay)' }}>
            Deine Anfrage wartet auf Bestätigung durch den Ersteller.
          </div>
        )}

        <div className="btn-row" style={{ marginBottom: 18 }}>
          <button className={followStatus !== 'none' ? 'btn btn-secondary' : 'btn btn-primary'} onClick={toggleFollow} disabled={busy}>
            {followStatus === 'active' ? 'Entfolgen' : followStatus === 'pending' ? 'Anfrage zurückziehen' : 'Folgen'}
          </button>
          {!isOwner && (
            <button className="btn btn-secondary" onClick={handleReport} disabled={reported}>
              {reported ? 'Gemeldet' : 'Melden'}
            </button>
          )}
        </div>

        {isOwner && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Einstellungen</h3>
            <div className="field" style={{ marginBottom: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={channel.is_public} onChange={handleTogglePublic} style={{ width: 'auto' }} />
                Öffentlich (erscheint im Katalog aller Nutzer)
              </label>
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={channel.require_approval} onChange={handleToggleApproval} style={{ width: 'auto' }} />
                Neue Abonnenten müssen von mir bestätigt werden
              </label>
            </div>
          </div>
        )}

        {isOwner && pendingFollowers.length > 0 && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Wartende Abonnenten</h3>
            {pendingFollowers.map((p) => (
              <div key={p.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span>@{p.username}</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary" style={{ width: 'auto', padding: '6px 12px' }} onClick={() => approveFollower(p.user_id)} disabled={busy}>Annehmen</button>
                  <button className="btn btn-secondary" style={{ width: 'auto', padding: '6px 12px' }} onClick={() => declineFollower(p.user_id)} disabled={busy}>Ablehnen</button>
                </div>
              </div>
            ))}
          </div>
        )}

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
