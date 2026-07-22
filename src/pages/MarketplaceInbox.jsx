import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function MarketplaceInbox({ userId, onOpenThread, onBack }) {
  const [threads, setThreads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadThreads()
  }, [])

  async function loadThreads() {
    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('marketplace_threads')
      .select('*, marketplace_listings(title, price, image_url)')
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .order('created_at', { ascending: false })

    if (error) setError(error.message)
    setThreads(data || [])
    setLoading(false)
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>Postfach</h1>
      </div>
      <main>
        <button className="link-text" onClick={onBack} style={{ marginBottom: 16 }}>← Zurück</button>

        {error && <div className="error-box">{error}</div>}
        {loading && <div className="loading-dot">Lädt...</div>}

        {!loading && threads.length === 0 && (
          <p className="center-note">Noch keine Unterhaltungen.</p>
        )}

        {!loading && threads.map((t) => {
          const role = t.buyer_id === userId ? 'interessent' : 'anbieter'
          return (
            <button
              key={t.id}
              className="card-choice"
              onClick={() => onOpenThread(t.id, role)}
            >
              <span className="eyebrow">{role === 'anbieter' ? 'Du bist Anbieter' : 'Du bist Interessent'}</span>
              <h3>{t.marketplace_listings?.title}</h3>
              {t.marketplace_listings?.price != null && (
                <p>{t.marketplace_listings.price} €</p>
              )}
            </button>
          )
        })}
      </main>
    </div>
  )
}
