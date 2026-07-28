import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function BusinessDirectory({ onOpenBusiness, onBack }) {
  const [categories, setCategories] = useState([])
  const [subcategories, setSubcategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedSubcategory, setSelectedSubcategory] = useState(null)
  const [businesses, setBusinesses] = useState([])
  const [loadingBusinesses, setLoadingBusinesses] = useState(false)

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
    setLoadingBusinesses(true)

    const { data, error: bizError } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('directory_subcategory_id', sub.id)
      .eq('status', 'live')
      .order('company_name')

    if (bizError) setError(bizError.message)
    setBusinesses(data || [])
    setLoadingBusinesses(false)
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

          {loadingBusinesses && <div className="loading-dot">Lädt...</div>}
          {!loadingBusinesses && businesses.length === 0 && (
            <p className="center-note">Noch kein Betrieb in dieser Kategorie eingetragen.</p>
          )}

          {!loadingBusinesses && businesses.map((biz) => (
            <button key={biz.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer' }} onClick={() => onOpenBusiness(biz)}>
              <div className="avatar-preview" style={{ width: 44, height: 44, flexShrink: 0 }}>
                {biz.logo_url ? <img src={biz.logo_url} alt="" /> : '🏬'}
              </div>
              <div>
                <h3 style={{ margin: 0 }}>{biz.company_name}</h3>
                {biz.tagline && <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>{biz.tagline}</p>}
              </div>
            </button>
          ))}
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
