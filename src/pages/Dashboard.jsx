import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const STATUS_LABELS = {
  in_pruefung: { text: 'In Prüfung', cls: 'status-pruefung' },
  vertrag_in_arbeit: { text: 'Vertrag in Arbeit', cls: 'status-vertrag' },
  live: { text: 'Live', cls: 'status-live' },
  abgelehnt: { text: 'Abgelehnt', cls: 'status-abgelehnt' }
}

export default function Dashboard({ profileType, profile, isAdmin, onOpenAdmin }) {
  const [content, setContent] = useState('')
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState('')
  const [posts, setPosts] = useState([])
  const [loadingPosts, setLoadingPosts] = useState(false)

  const canPost = profileType === 'business' && profile.profile_kind === 'anbieter' && profile.status === 'live'

  useEffect(() => {
    if (canPost) loadPosts()
    // eslint-disable-next-line
  }, [canPost])

  async function loadPosts() {
    setLoadingPosts(true)
    const { data } = await supabase
      .from('posts')
      .select('*')
      .eq('business_profile_id', profile.id)
      .order('created_at', { ascending: false })

    setPosts(data || [])
    setLoadingPosts(false)
  }

  async function handlePost(e) {
    e.preventDefault()
    setPostError('')
    setPosting(true)

    const { error } = await supabase.from('posts').insert({
      business_profile_id: profile.id,
      content: content.trim()
    })

    if (error) {
      setPostError(error.message)
    } else {
      setContent('')
      loadPosts()
    }
    setPosting(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>Willkommen{profileType === 'private' ? `, ${profile.first_name}` : ''}</h1>
      </div>
      <main>
        {profileType === 'private' ? (
          <div className="card">
            <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: 14 }}>
              Dein Profil ist angelegt und für andere Nutzer nicht sichtbar.
            </p>
          </div>
        ) : (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <h3 style={{ margin: 0 }}>{profile.company_name}</h3>
              <span className={`status-pill ${STATUS_LABELS[profile.status]?.cls}`}>
                {STATUS_LABELS[profile.status]?.text}
              </span>
            </div>
            <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: 14 }}>
              {profile.status === 'in_pruefung' &&
                'Wir melden uns bei dir, sobald dein Profil geprüft wurde und ein Vertrag zustande kommt.'}
              {profile.status === 'vertrag_in_arbeit' &&
                'Der Vertrag wird gerade fertiggemacht. Danach schalten wir dein Profil live.'}
              {profile.status === 'live' &&
                'Dein Profil ist öffentlich sichtbar.'}
              {profile.status === 'abgelehnt' &&
                'Dein Profil wurde aktuell nicht freigeschaltet.'}
            </p>
          </div>
        )}

        {canPost && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>News veröffentlichen</h3>
            {postError && <div className="error-box">{postError}</div>}
            <form onSubmit={handlePost}>
              <div className="field">
                <textarea
                  rows={3}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Was gibt's Neues?"
                />
              </div>
              <button className="btn btn-primary" type="submit" disabled={posting}>
                {posting ? 'Wird veröffentlicht...' : 'Veröffentlichen'}
              </button>
            </form>

            {!loadingPosts && posts.length > 0 && (
              <div style={{ marginTop: 18 }}>
                {posts.map((p) => (
                  <div key={p.id} style={{ borderTop: '1px solid var(--line)', paddingTop: 10, marginTop: 10 }}>
                    <p style={{ margin: 0, fontSize: 14 }}>{p.content}</p>
                    <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                      {new Date(p.created_at).toLocaleDateString('de-DE')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {isAdmin && (
          <button className="btn btn-primary" onClick={onOpenAdmin} style={{ marginBottom: 12 }}>
            Gewerbeanfragen verwalten
          </button>
        )}

        <button className="btn btn-secondary" onClick={handleLogout}>Abmelden</button>
      </main>
    </div>
  )
}
