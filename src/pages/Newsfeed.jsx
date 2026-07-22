import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Newsfeed({ userId, onBack }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadFeed()
  }, [])

  async function loadFeed() {
    setLoading(true)
    setError('')

    const { data: followed, error: followError } = await supabase
      .from('follows')
      .select('business_profile_id')
      .eq('user_id', userId)

    const { data: stadtverwaltung, error: stadtError } = await supabase
      .from('business_profiles')
      .select('id')
      .eq('category', 'stadtverwaltung')
      .eq('status', 'live')

    if (followError) setError(followError.message)
    if (stadtError) setError(stadtError.message)

    const ids = [
      ...(followed || []).map((f) => f.business_profile_id),
      ...(stadtverwaltung || []).map((s) => s.id)
    ]

    if (ids.length === 0) {
      setPosts([])
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('posts')
      .select('*, business_profiles(company_name, logo_url)')
      .in('business_profile_id', ids)
      .order('created_at', { ascending: false })

    if (error) setError(error.message)
    setPosts(data || [])
    setLoading(false)
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>Neuigkeiten</h1>
      </div>
      <main>
        <button className="link-text" onClick={onBack} style={{ marginBottom: 16 }}>← Zurück</button>

        {error && <div className="error-box">{error}</div>}
        {loading && <div className="loading-dot">Lädt...</div>}

        {!loading && posts.length === 0 && (
          <p className="center-note">Noch keine Neuigkeiten. Folge Anbietern im App Store, um hier ihre News zu sehen.</p>
        )}

        {!loading && posts.map((post) => (
          <div className="card" key={post.id}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
              <div className="avatar-preview" style={{ width: 36, height: 36, fontSize: 14 }}>
                {post.business_profiles?.logo_url
                  ? <img src={post.business_profiles.logo_url} alt="" />
                  : post.business_profiles?.company_name?.[0]}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{post.business_profiles?.company_name}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
                  {new Date(post.created_at).toLocaleDateString('de-DE')}
                </div>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: 14 }}>{post.content}</p>
          </div>
        ))}
      </main>
    </div>
  )
}
