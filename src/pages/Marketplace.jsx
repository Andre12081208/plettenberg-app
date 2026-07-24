import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import CreateListing from './CreateListing.jsx'
import MarketplaceInbox from './MarketplaceInbox.jsx'
import MarketplaceChat from './MarketplaceChat.jsx'

export default function Marketplace({ userId, onBack }) {
  const [view, setView] = useState('browse') // 'browse' | 'create' | 'inbox'
  const [openThread, setOpenThread] = useState(null)
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    if (view === 'browse') loadListings()
  }, [view])

  async function loadListings() {
    setLoading(true)
    setError('')
    const { data, error } = await supabase
      .from('marketplace_listings')
      .select('*')
      .eq('status', 'aktiv')
      .order('created_at', { ascending: false })

    if (error) setError(error.message)
    setListings(data || [])
    setLoading(false)
  }

  async function contactSeller(listing) {
    setBusyId(listing.id)
    setError('')

    const { data: existing } = await supabase
      .from('marketplace_threads')
      .select('id')
      .eq('listing_id', listing.id)
      .eq('buyer_id', userId)
      .maybeSingle()

    let threadId = existing?.id

    if (!threadId) {
      const { data: created, error: createError } = await supabase
        .from('marketplace_threads')
        .insert({
          listing_id: listing.id,
          buyer_id: userId,
          seller_id: listing.seller_id,
          listing_title: listing.title,
          listing_image_url: listing.image_urls?.[0] || listing.image_url || null
        })
        .select('id')
        .single()

      if (createError) {
        setError(createError.message)
        setBusyId(null)
        return
      }
      threadId = created.id
    }

    setBusyId(null)
    setOpenThread({ threadId, role: 'interessent' })
  }

  if (openThread) {
    return (
      <MarketplaceChat
        userId={userId}
        threadId={openThread.threadId}
        role={openThread.role}
        onBack={() => setOpenThread(null)}
      />
    )
  }

  if (view === 'create') {
    return (
      <CreateListing
        userId={userId}
        onDone={() => setView('browse')}
        onBack={() => setView('browse')}
      />
    )
  }

  if (view === 'inbox') {
    return (
      <MarketplaceInbox
        userId={userId}
        onOpenThread={(threadId, role) => setOpenThread({ threadId, role })}
        onBack={() => setView('browse')}
      />
    )
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>Marktplatz</h1>
      </div>
      <main>
        <button className="link-text" onClick={onBack} style={{ marginBottom: 16 }}>← Zurück</button>

        {error && <div className="error-box">{error}</div>}

        <div className="btn-row" style={{ marginBottom: 18 }}>
          <button className="btn btn-primary" onClick={() => setView('create')}>Anzeige erstellen</button>
          <button className="btn btn-secondary" onClick={() => setView('inbox')}>Postfach</button>
        </div>

        {loading && <div className="loading-dot">Lädt...</div>}

        {!loading && listings.length === 0 && (
          <p className="center-note">Noch keine Anzeigen vorhanden.</p>
        )}

        {!loading && listings.map((listing) => {
          const isOwn = listing.seller_id === userId
          const photos = listing.image_urls?.length ? listing.image_urls : (listing.image_url ? [listing.image_url] : [])
          return (
            <div className="card" key={listing.id}>
              {photos.length > 0 && (
                <>
                  <img src={photos[0]} alt="" style={{ width: '100%', borderRadius: 10, marginBottom: 8, maxHeight: 180, objectFit: 'cover' }} />
                  {photos.length > 1 && (
                    <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                      {photos.slice(1).map((url, i) => (
                        <img key={i} src={url} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }} />
                      ))}
                    </div>
                  )}
                </>
              )}
              <h3 style={{ margin: '0 0 4px' }}>{listing.title}</h3>

              {listing.is_free ? (
                <p style={{ margin: '0 0 6px', fontWeight: 600, color: 'var(--forest)' }}>Zu verschenken</p>
              ) : listing.price != null ? (
                <p style={{ margin: '0 0 6px', fontWeight: 600, color: 'var(--forest)' }}>{listing.price} €</p>
              ) : null}

              {listing.description && (
                <p style={{ margin: '0 0 10px', fontSize: 14 }}>{listing.description}</p>
              )}

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                {listing.pickup_available && (
                  <span className="status-pill status-live" style={{ fontSize: 11 }}>📍 Abholung möglich</span>
                )}
                {listing.delivery_available && (
                  <span className="status-pill status-live" style={{ fontSize: 11 }}>
                    🚗 Lieferung {listing.delivery_fee > 0 ? `(${listing.delivery_fee} € Gebühr)` : '(kostenlos)'}
                  </span>
                )}
              </div>

              {isOwn ? (
                <span className="hint">Deine Anzeige</span>
              ) : (
                <button
                  className="btn btn-primary"
                  onClick={() => contactSeller(listing)}
                  disabled={busyId === listing.id}
                >
                  {busyId === listing.id ? 'Einen Moment...' : 'Kontakt aufnehmen'}
                </button>
              )}
            </div>
          )
        })}
      </main>
    </div>
  )
}
