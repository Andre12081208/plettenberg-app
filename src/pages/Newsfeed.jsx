import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Newsfeed({ userId, onBack, embedded }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadFeed()
  }, [])

  async function loadFeed() {
    setLoading(true)
    setError('')

    const [{ data: followed }, { data: stadtverwaltung }, { data: channelFollows }] = await Promise.all([
      supabase.from('follows').select('business_profile_id').eq('user_id', userId),
      supabase.from('business_profiles').select('id').eq('category', 'stadtverwaltung').eq('status', 'live'),
      supabase.from('channel_follows').select('channel_id').eq('user_id', userId)
    ])

    const businessIds = [
      ...(followed || []).map((f) => f.business_profile_id),
      ...(stadtverwaltung || []).map((s) => s.id)
    ]
    const channelIds = (channelFollows || []).map((c) => c.channel_id)

    const [businessPosts, channelPosts] = await Promise.all([
      businessIds.length > 0
        ? supabase.from('posts').select('*, business_profiles(company_name, logo_url)').in('business_profile_id', businessIds).order('created_at', { ascending: false })
        : Promise.resolve({ data: [] }),
      channelIds.length > 0
        ? supabase.from('channel_posts').select('*, channels(name)').in('channel_id', channelIds).order('created_at', { ascending: false })
        : Promise.resolve({ data: [] })
    ])

    const combined = [
      ...(businessPosts.data || []).map((p) => ({ ...p, kind: 'business' })),
      ...(channelPosts.data || []).map((p) => ({ ...p, kind: 'channel' }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    setPosts(combined)
    setLoading(false)
  }

  const content = (
    <>
      {error && <div className="error-box">{error}</div>}
      {loading && <div className="loading-dot">Lädt...</div>}

      {!loading && posts.length === 0 && (
        <p className="center-note">Noch keine Neuigkeiten. Folge Anbietern oder Channels im App Store, um hier ihre News zu sehen.</p>
      )}

      {!loading && posts.map((post) => (
        <div className="card" key={`${post.kind}-${post.id}`}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
            {post.kind === 'business' ? (
              <div className="avatar-preview" style={{ width: 36, height: 36, fontSize: 14 }}>
                {post.business_profiles?.logo_url
                  ? <img src={post.business_profiles.logo_url} alt="" />
                  : post.business_profiles?.company_name?.[0]}
              </div>
            ) : (
              <div className="avatar-preview" style={{ width: 36, height: 36, fontSize: 14 }}>📢</div>
            )}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                {post.kind === 'business' ? post.business_profiles?.company_name : post.channels?.name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
                {new Date(post.created_at).toLocaleDateString('de-DE')}
              </div>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: 14 }}>{post.content}</p>
        </div>
      ))}
    </>
  )

  if (embedded) {
    return (
      <>
        <div className="topbar">
          <div className="mark">Plettenberg</div>
          <h1>Newsfeed</h1>
        </div>
        <main style={{ paddingBottom: 90 }}>{content}</main>
      </>
    )
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>Newsfeed</h1>
      </div>
      <main>
        <button className="link-text" onClick={onBack} style={{ marginBottom: 16 }}>← Zurück</button>
        {content}
      </main>
    </div>
  )
}
