import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import CreateListing from './CreateListing.jsx'
import MarketplaceInbox from './MarketplaceInbox.jsx'
import MarketplaceChat from './MarketplaceChat.jsx'
import ListingDetail from './ListingDetail.jsx'

export default function Marketplace({ userId, onBack }) {
  const [view, setView] = useState('browse') // 'browse' | 'create' | 'inbox' | 'mine'
  const [openThread, setOpenThread] = useState(null)
  const [selectedListing, setSelectedListing] = useState(null)
  const [editingListing, setEditingListing] = useState(null)
  const [listings, setListings] = useState([])
  const [myListings, setMyListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMine, setLoadingMine] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    if (view === 'browse') loadListings()
    if (view === 'mine') loadMyListings()
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

  async function loadMyListings() {
    setLoadingMine(true)
    setError('')
    const { data, error } = await supabase
      .from('marketplace_listings')
      .select('*')
      .eq('seller_id', userId)
      .eq('status', 'aktiv')
      .order('created_at', { ascending: false })

    if (error) setError(error.message)
    setMyListings(data || [])
    setLoadingMine(false)
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
    setSelectedListing(null)
    setOpenThread({ threadId, role: 'interessent' })
  }

  function renderListingCard(listing) {
    const photos = listing.image_urls?.length ? listing.image_urls : (listing.image_url ? [listing.image_url] : [])
    return (
      <div className="card" key={listing.id} style={{ padding: 0, overflow: 'hidden' }}>
        <button
          style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', padding: 0, display: 'block' }}
          onClick={() => setSelectedListing(listing)}
        >
          {photos.length > 0 && (
            <img src={photos[0]} alt="" style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} />
          )}
          <div style={{ padding: 14 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>{listing.title}</h3>
          </div>
        </button>
      </div>
    )
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

  if (editingListing) {
    return (
      <CreateListing
        userId={userId}
        existingListing={editingListing}
        onDone={() => { setEditingListing(null); loadListings(); loadMyListings() }}
        onBack={() => setEditingListing(null)}
      />
    )
  }

  if (selectedListing) {
    return (
      <ListingDetail
        listing={selectedListing}
        userId={userId}
        onBack={() => setSelectedListing(null)}
        onDeleted={() => { setSelectedListing(null); loadListings(); loadMyListings() }}
        onContact={contactSeller}
        contacting={busyId === selectedListing.id}
        onEdit={(listing) => { setSelectedListing(null); setEditingListing(listing) }}
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

  if (view === 'mine') {
    return (
      <div className="app-shell">
        <div className="topbar">
          <div className="mark">Plettenberg</div>
          <h1>Meine Anzeigen</h1>
        </div>
        <main>
          <button className="link-text" onClick={() => setView('browse')} style={{ marginBottom: 16 }}>← Zurück</button>

          {error && <div className="error-box">{error}</div>}

          {loadingMine && <div className="loading-dot">Lädt...</div>}
          {!loadingMine && myListings.length === 0 && (
            <p className="center-note">Du hast noch keine Anzeigen erstellt.</p>
          )}

          {!loadingMine && myListings.map(renderListingCard)}
        </main>
      </div>
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

        <div className="btn-row" style={{ marginBottom: 18, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => setView('create')}>Anzeige erstellen</button>
          <button className="btn btn-secondary" onClick={() => setView('mine')}>Meine Anzeigen</button>
          <button className="btn btn-secondary" onClick={() => setView('inbox')}>Postfach</button>
        </div>

        {loading && <div className="loading-dot">Lädt...</div>}

        {!loading && listings.length === 0 && (
          <p className="center-note">Noch keine Anzeigen vorhanden.</p>
        )}

        {!loading && listings.map(renderListingCard)}
      </main>
    </div>
  )
}
