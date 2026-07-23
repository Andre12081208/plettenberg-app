import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function ProfileCard({ contactId, onBack }) {
  const [card, setCard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadCard()
    // eslint-disable-next-line
  }, [])

  async function loadCard() {
    setLoading(true)
    setError('')
    const { data, error } = await supabase.rpc('get_contact_card', { target_id: contactId })
    if (error) setError(error.message)
    setCard(data?.[0] || null)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="app-shell">
        <div className="topbar"><div className="mark">Plettenberg</div><h1>Profil</h1></div>
        <main><div className="loading-dot">Lädt...</div></main>
      </div>
    )
  }

  if (error || !card) {
    return (
      <div className="app-shell">
        <div className="topbar"><div className="mark">Plettenberg</div><h1>Profil</h1></div>
        <main>
          <button className="link-text" onClick={onBack} style={{ marginBottom: 16 }}>← Zurück</button>
          <div className="error-box">{error || 'Profil nicht verfügbar.'}</div>
        </main>
      </div>
    )
  }

  const initials = `${card.first_name?.[0] || ''}${card.last_name?.[0] || ''}`.toUpperCase()

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>{card.first_name} {card.last_name}</h1>
      </div>
      <main>
        <button className="link-text" onClick={onBack} style={{ marginBottom: 16 }}>← Zurück</button>

        <div className="card">
          <div className="avatar-upload" style={{ marginBottom: 18 }}>
            <div className="avatar-preview" style={{ width: 72, height: 72, fontSize: 26 }}>
              {card.avatar_url ? <img src={card.avatar_url} alt="" /> : (initials || '?')}
            </div>
            <div>
              <h3 style={{ margin: 0 }}>{card.first_name} {card.last_name}</h3>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-soft)' }}>@{card.username}</p>
            </div>
          </div>

          {card.birthday && (
            <p style={{ margin: '6px 0', fontSize: 14 }}>🎂 {new Date(card.birthday).toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })}</p>
          )}
          {card.phone && <p style={{ margin: '6px 0', fontSize: 14 }}>📞 {card.phone}</p>}
          {card.contact_email && <p style={{ margin: '6px 0', fontSize: 14 }}>✉️ {card.contact_email}</p>}
          {card.website && (
            <p style={{ margin: '6px 0', fontSize: 14 }}>
              🔗 <a href={card.website} target="_blank" rel="noreferrer" style={{ color: 'var(--forest)' }}>{card.website}</a>
            </p>
          )}
          {card.instagram && <p style={{ margin: '6px 0', fontSize: 14 }}>📷 Instagram: {card.instagram}</p>}
          {card.tiktok && <p style={{ margin: '6px 0', fontSize: 14 }}>🎵 TikTok: {card.tiktok}</p>}
          {card.info && <p style={{ margin: '10px 0 0', fontSize: 14 }}>{card.info}</p>}
        </div>
      </main>
    </div>
  )
}
