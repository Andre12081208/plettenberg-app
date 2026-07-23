import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const GASTRO_CATEGORIES = [
  { value: 'alle', label: 'Alle' },
  { value: 'doener', label: 'Döner / Imbiss' },
  { value: 'pizza', label: 'Pizza' },
  { value: 'cafe', label: 'Café' },
  { value: 'bar', label: 'Bar / Kneipe' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'sonstiges', label: 'Sonstiges' }
]

export default function GastroHub({ onBack }) {
  const [places, setPlaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeCategory, setActiveCategory] = useState('alle')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    loadPlaces()
  }, [])

  async function loadPlaces() {
    setLoading(true)
    setError('')
    const { data, error } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('status', 'live')
      .eq('profile_kind', 'anbieter')
      .eq('app_category', 'restaurant')
      .order('company_name', { ascending: true })

    if (error) setError(error.message)
    setPlaces(data || [])
    setLoading(false)
  }

  const filtered = activeCategory === 'alle'
    ? places
    : places.filter((p) => p.gastro_category === activeCategory)

  if (selected) {
    return (
      <div className="app-shell">
        <div className="topbar">
          <div className="mark">Plettenberg</div>
          <h1>{selected.company_name}</h1>
        </div>
        <main>
          <button className="link-text" onClick={() => setSelected(null)} style={{ marginBottom: 16 }}>← Zurück zum Katalog</button>

          {selected.logo_url && (
            <img src={selected.logo_url} alt="" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 10, marginBottom: 14 }} />
          )}

          <div className="card">
            <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              {GASTRO_CATEGORIES.find((c) => c.value === selected.gastro_category)?.label || 'Sonstiges'}
            </span>

            {selected.description && <p style={{ fontSize: 14, marginTop: 10 }}>{selected.description}</p>}

            {selected.opening_hours && (
              <>
                <h3 style={{ marginBottom: 6, marginTop: 16 }}>Öffnungszeiten</h3>
                <p style={{ fontSize: 14, whiteSpace: 'pre-line' }}>{selected.opening_hours}</p>
              </>
            )}

            {selected.address && (
              <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 10 }}>{selected.address}</p>
            )}
            {selected.phone && (
              <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Tel: {selected.phone}</p>
            )}
            {selected.website && (
              <p style={{ fontSize: 13 }}>
                <a href={selected.website} target="_blank" rel="noreferrer" style={{ color: 'var(--forest)' }}>
                  {selected.website}
                </a>
              </p>
            )}

            <p className="hint" style={{ marginTop: 16 }}>Speisekarte und Bestellfunktion folgen in Kürze.</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>Gastro</h1>
      </div>
      <main>
        <button className="link-text" onClick={onBack} style={{ marginBottom: 16 }}>← Zurück</button>

        {error && <div className="error-box">{error}</div>}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
          {GASTRO_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              style={{
                padding: '6px 14px',
                borderRadius: 999,
                border: '1px solid var(--forest)',
                background: activeCategory === cat.value ? 'var(--forest)' : 'transparent',
                color: activeCategory === cat.value ? '#fff' : 'var(--forest)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {loading && <div className="loading-dot">Lädt...</div>}

        {!loading && filtered.length === 0 && (
          <p className="center-note">Noch keine Lokale in dieser Kategorie.</p>
        )}

        {!loading && filtered.map((place) => (
          <button key={place.id} className="card-choice" onClick={() => setSelected(place)}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div className="avatar-preview" style={{ width: 48, height: 48, fontSize: 16 }}>
                {place.logo_url ? <img src={place.logo_url} alt="" /> : place.company_name[0]}
              </div>
              <div>
                <h3 style={{ margin: 0 }}>{place.company_name}</h3>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-soft)' }}>
                  {GASTRO_CATEGORIES.find((c) => c.value === place.gastro_category)?.label || 'Sonstiges'}
                </p>
              </div>
            </div>
          </button>
        ))}
      </main>
    </div>
  )
}
