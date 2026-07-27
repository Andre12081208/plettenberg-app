import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function BusinessMiniApp({ app, userId, onBack }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const hasShop = app.plan === 'basis'

  useEffect(() => {
    if (hasShop) loadProducts()
    else setLoading(false)
    // eslint-disable-next-line
  }, [])

  async function loadProducts() {
    setLoading(true)
    const { data, error } = await supabase
      .from('business_products')
      .select('*')
      .eq('business_profile_id', app.id)
      .eq('active', true)
      .order('created_at', { ascending: false })

    if (error) setError(error.message)
    setProducts(data || [])
    setLoading(false)
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>{app.company_name}</h1>
      </div>
      <main>
        <button className="link-text" onClick={onBack} style={{ marginBottom: 16 }}>← Zurück</button>

        <div className="card">
          {app.description && <p style={{ fontSize: 14 }}>{app.description}</p>}
          {app.address && <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{app.address}</p>}
          {app.phone && <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Tel: {app.phone}</p>}
          {app.website && (
            <p style={{ fontSize: 13 }}>
              <a href={app.website} target="_blank" rel="noreferrer" style={{ color: 'var(--forest)' }}>
                {app.website}
              </a>
            </p>
          )}
          {app.contact_person && (
            <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Ansprechpartner: {app.contact_person}</p>
          )}
        </div>

        {hasShop && (
          <>
            <h3 style={{ margin: '20px 0 10px' }}>Angebot</h3>
            {error && <div className="error-box">{error}</div>}
            {loading && <div className="loading-dot">Lädt...</div>}
            {!loading && products.length === 0 && (
              <p className="center-note">Noch keine Produkte eingestellt.</p>
            )}

            {!loading && products.map((product) => (
              <div className="card" key={product.id}>
                {product.image_url && (
                  <img src={product.image_url} alt="" style={{ width: '100%', borderRadius: 10, marginBottom: 10, maxHeight: 160, objectFit: 'cover' }} />
                )}
                <h3 style={{ margin: '0 0 4px' }}>{product.name}</h3>
                {product.price != null && (
                  <p style={{ margin: '0 0 6px', fontWeight: 600, color: 'var(--forest)' }}>{product.price} €</p>
                )}
                {product.description && <p style={{ margin: '0 0 10px', fontSize: 14 }}>{product.description}</p>}
                <button className="btn btn-primary" disabled>
                  {product.sale_mode === 'bestellung' ? 'In den Warenkorb' : 'Anfrage senden'}
                </button>
                <p className="hint" style={{ marginTop: 6 }}>Bestellen/Anfragen kommt im nächsten Schritt.</p>
              </div>
            ))}
          </>
        )}
      </main>
    </div>
  )
}
