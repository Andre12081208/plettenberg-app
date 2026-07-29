import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import DirectoryListingDetail from './DirectoryListingDetail.jsx'

export default function BusinessDirectory({ userId, onBack, onFullScreenChange }) {
  const [categories, setCategories] = useState([])
  const [subcategories, setSubcategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedSubcategory, setSelectedSubcategory] = useState(null)
  const [listings, setListings] = useState([])
  const [loadingListings, setLoadingListings] = useState(false)
  const [openListing, setOpenListing] = useState(null)

  useEffect(() => {
    loadTaxonomy()
  }, [])

  async function loadTaxonomy() {
    setLoading(true)
    const [{ data: cats, error: catError }, { data: subs, error: subError }] = await Promise.all([
      supabase.from('directory_categories').select('*').order('sort_order'),
      supabase.from('directory_subcategories').select('*').order('sort_order')
    ])

    if (catError || subError) setError((catError || subError).message)
    setCategories(cats || [])
    setSubcategories(subs || [])
    setLoading(false)
  }

  async function openSubcategory(sub) {
    setSelectedSubcategory(sub)
    setLoadingListings(true)

    const { data, error: listError } = await supabase
      .from('directory_listings')
      .select('*, business_profiles(status, plan, logo_url, tagline)')
      .eq('subcategory_id', sub.id)
      .order('name')

    if (listError) setError(listError.message)
    setListings(data || [])
    setLoadingListings(false)
  }

  if (openListing) {
    return (
      <DirectoryListingDetail
        onFullScreenChange={onFullScreenChange}
        listing={openListing}
        userId={userId}
        onBack={() => setOpenListing(null)}
      />
    )
  }

  if (selectedSubcategory) {
    return (
      <div className="app-shell">
        <div className="topbar">
          <div className="mark">Plettenberg</div>
          <h1>{selectedSubcategory.name}</h1>
        </div>
        <main>
          <button className="link-text" onClick={() => setSelectedSubcategory(null)} style={{ marginBottom: 16 }}>← Zurück</button>

          {loadingListings && <div className="loading-dot">Lädt...</div>}
          {!loadingListings && listings.length === 0 && (
            <p className="center-note">Noch kein Betrieb in dieser Kategorie eingetragen.</p>
          )}

          {!loadingListings && listings.map((listing) => {
            const isPartner = listing.business_profiles?.status === 'live' && listing.business_profiles?.plan === 'basis'
            return (
              <button key={listing.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer' }} onClick={() => setOpenListing(listing)}>
                <div className="avatar-preview" style={{ width: 44, height: 44, flexShrink: 0 }}>
                  {listing.business_profiles?.logo_url ? <img src={listing.business_profiles.logo_url} alt="" /> : '🏬'}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0 }}>{listing.name}</h3>
                  {listing.business_profiles?.tagline && <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>{listing.business_profiles.tagline}</p>}
                </div>
                {isPartner && <span className="status-pill status-live" style={{ fontSize: 11 }}>Partner</span>}
              </button>
            )
          })}
        </main>
      </div>
    )
  }

  if (selectedCategory) {
    const subsForCategory = subcategories.filter((s) => s.category_id === selectedCategory.id)
    return (
      <div className="app-shell">
        <div className="topbar">
          <div className="mark">Plettenberg</div>
          <h1>{selectedCategory.icon} {selectedCategory.name}</h1>
        </div>
        <main>
          <button className="link-text" onClick={() => setSelectedCategory(null)} style={{ marginBottom: 16 }}>← Zurück</button>

          <div className="app-grid">
            {subsForCategory.map((sub) => (
              <button key={sub.id} className="app-tile" onClick={() => openSubcategory(sub)}>
                <div className="app-tile-label">{sub.name}</div>
              </button>
            ))}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>Branchenverzeichnis</h1>
      </div>
      <main>
        <button className="link-text" onClick={onBack} style={{ marginBottom: 16 }}>← Zurück</button>

        {error && <div className="error-box">{error}</div>}
        {loading && <div className="loading-dot">Lädt...</div>}

        <div className="app-grid">
          {!loading && categories.map((cat) => (
            <button key={cat.id} className="app-tile" onClick={() => setSelectedCategory(cat)}>
              <div className="app-tile-icon">{cat.icon}</div>
              <div className="app-tile-label">{cat.name}</div>
            </button>
          ))}
        </div>
      </main>
    </div>
  )
}
