import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function ListingDetail({ listing, userId, onBack, onDeleted, onContact, contacting }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const isOwn = listing.seller_id === userId
  const photos = listing.image_urls?.length ? listing.image_urls : (listing.image_url ? [listing.image_url] : [])

  const createdAt = new Date(listing.created_at)
  const createdLabel = createdAt.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ', ' + createdAt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr'

  async function handleDelete() {
    setDeleting(true)
    setError('')
    const { error } = await supabase.rpc('delete_marketplace_listing', { target_listing_id: listing.id })

    if (error) {
      setError(error.message)
      setDeleting(false)
    } else {
      onDeleted?.()
    }
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>Anzeige</h1>
      </div>
      <main>
        <button className="link-text" onClick={onBack} style={{ marginBottom: 16 }}>← Zurück</button>

        {error && <div className="error-box">{error}</div>}

        {photos.length > 0 && (
          <>
            <img src={photos[0]} alt="" style={{ width: '100%', borderRadius: 10, marginBottom: 8, maxHeight: 260, objectFit: 'cover' }} />
            {photos.length > 1 && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                {photos.slice(1).map((url, i) => (
                  <img key={i} src={url} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8 }} />
                ))}
              </div>
            )}
          </>
        )}

        <h2 style={{ margin: '0 0 4px' }}>{listing.title}</h2>

        {listing.is_free ? (
          <p style={{ margin: '0 0 10px', fontWeight: 600, fontSize: 18, color: 'var(--forest)' }}>Zu verschenken</p>
        ) : listing.price != null ? (
          <p style={{ margin: '0 0 10px', fontWeight: 600, fontSize: 18, color: 'var(--forest)' }}>{listing.price} €</p>
        ) : null}

        {listing.description && (
          <p style={{ margin: '0 0 16px', fontSize: 15, whiteSpace: 'pre-wrap' }}>{listing.description}</p>
        )}

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {listing.pickup_available && (
            <span className="status-pill status-live">📍 Abholung möglich</span>
          )}
          {listing.delivery_available && (
            <span className="status-pill status-live">
              🚗 Lieferung {listing.delivery_fee > 0 ? `(${listing.delivery_fee} € Gebühr)` : '(kostenlos)'}
            </span>
          )}
        </div>

        <p className="hint" style={{ marginBottom: 20 }}>Anzeige erstellt am: {createdLabel}</p>

        {isOwn ? (
          confirmingDelete ? (
            <div className="btn-row">
              <button className="btn btn-secondary" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Wird gelöscht...' : 'Ja, endgültig löschen'}
              </button>
              <button className="btn btn-secondary" onClick={() => setConfirmingDelete(false)} disabled={deleting}>
                Abbrechen
              </button>
            </div>
          ) : (
            <button className="btn btn-secondary" onClick={() => setConfirmingDelete(true)}>
              Anzeige löschen
            </button>
          )
        ) : (
          <button className="btn btn-primary" onClick={() => onContact(listing)} disabled={contacting}>
            {contacting ? 'Einen Moment...' : 'Kontakt aufnehmen'}
          </button>
        )}
      </main>
    </div>
  )
}
