import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import BusinessInquiryChat from './BusinessInquiryChat.jsx'

export default function BusinessMiniApp({ app, userId, onBack }) {
  const [view, setView] = useState('browse') // 'browse' | 'cart' | 'orders'
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cart, setCart] = useState({})

  const [note, setNote] = useState('')
  const [placing, setPlacing] = useState(false)
  const [placedMsg, setPlacedMsg] = useState('')

  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)

  const [openInquiry, setOpenInquiry] = useState(null)
  const [inquiryBusyId, setInquiryBusyId] = useState(null)

  const hasShop = app.plan === 'basis'

  useEffect(() => {
    if (hasShop) loadProducts()
    else setLoading(false)
    // eslint-disable-next-line
  }, [])

  useEffect(() => {
    if (view === 'orders') loadOrders()
  }, [view])

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

  async function loadOrders() {
    setOrdersLoading(true)
    const { data, error } = await supabase
      .from('business_orders')
      .select('*, business_order_items(*)')
      .eq('business_profile_id', app.id)
      .eq('buyer_id', userId)
      .order('created_at', { ascending: false })

    if (error) setError(error.message)
    setOrders(data || [])
    setOrdersLoading(false)
  }

  function addToCart(product) {
    setCart((prev) => ({ ...prev, [product.id]: (prev[product.id] || 0) + 1 }))
  }

  function changeQuantity(productId, delta) {
    setCart((prev) => {
      const next = { ...prev }
      const newQty = (next[productId] || 0) + delta
      if (newQty <= 0) delete next[productId]
      else next[productId] = newQty
      return next
    })
  }

  const cartItems = Object.entries(cart)
    .map(([productId, quantity]) => {
      const product = products.find((p) => p.id === productId)
      return product ? { product, quantity } : null
    })
    .filter(Boolean)

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const cartTotal = cartItems.reduce((sum, item) => sum + item.quantity * (item.product.price || 0), 0)

  async function placeOrder(e) {
    e.preventDefault()
    if (cartItems.length === 0) return
    setError('')
    setPlacing(true)

    try {
      const { data: order, error: orderError } = await supabase
        .from('business_orders')
        .insert({
          business_profile_id: app.id,
          buyer_id: userId,
          note: note.trim() || null
        })
        .select('id')
        .single()

      if (orderError) throw orderError

      const itemsToInsert = cartItems.map((item) => ({
        order_id: order.id,
        product_id: item.product.id,
        product_name: item.product.name,
        unit_price: item.product.price,
        quantity: item.quantity
      }))

      const { error: itemsError } = await supabase.from('business_order_items').insert(itemsToInsert)
      if (itemsError) throw itemsError

      setCart({})
      setNote('')
      setPlacedMsg('Bestellung gesendet! Du kannst den Status unter "Meine Bestellungen" verfolgen.')
      setView('browse')
    } catch (err) {
      setError(err.message || 'Bestellung konnte nicht gesendet werden.')
    } finally {
      setPlacing(false)
    }
  }

  async function startInquiry(product) {
    setInquiryBusyId(product.id)
    setError('')

    const { data: existing } = await supabase
      .from('business_inquiries')
      .select('id')
      .eq('business_profile_id', app.id)
      .eq('product_id', product.id)
      .eq('buyer_id', userId)
      .maybeSingle()

    if (existing) {
      setInquiryBusyId(null)
      setOpenInquiry(existing.id)
      return
    }

    const { data: created, error: createError } = await supabase
      .from('business_inquiries')
      .insert({
        business_profile_id: app.id,
        product_id: product.id,
        product_name_snapshot: product.name,
        buyer_id: userId
      })
      .select('id')
      .single()

    if (createError) {
      setError(createError.message)
      setInquiryBusyId(null)
      return
    }

    await supabase.from('business_inquiry_messages').insert({
      inquiry_id: created.id,
      sender_id: userId,
      is_business: false,
      content: `Ich interessiere mich für "${product.name}".`
    })

    setInquiryBusyId(null)
    setOpenInquiry(created.id)
  }

  if (openInquiry) {
    return (
      <BusinessInquiryChat
        userId={userId}
        inquiryId={openInquiry}
        isBusiness={false}
        onBack={() => setOpenInquiry(null)}
      />
    )
  }

  if (view === 'cart') {
    return (
      <div className="app-shell">
        <div className="topbar">
          <div className="mark">Plettenberg</div>
          <h1>Warenkorb</h1>
        </div>
        <main>
          <button className="link-text" onClick={() => setView('browse')} style={{ marginBottom: 16 }}>← Zurück</button>

          {error && <div className="error-box">{error}</div>}

          {cartItems.length === 0 && <p className="center-note">Dein Warenkorb ist leer.</p>}

          {cartItems.map((item) => (
            <div className="card" key={item.product.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 600 }}>{item.product.name}</p>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-soft)' }}>{item.product.price} € × {item.quantity}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button className="link-text" onClick={() => changeQuantity(item.product.id, -1)}>–</button>
                <span>{item.quantity}</span>
                <button className="link-text" onClick={() => changeQuantity(item.product.id, 1)}>+</button>
              </div>
            </div>
          ))}

          {cartItems.length > 0 && (
            <form onSubmit={placeOrder}>
              <p style={{ fontWeight: 600, margin: '16px 0' }}>Gesamt: {cartTotal.toFixed(2)} €</p>
              <div className="field">
                <label htmlFor="note">Anmerkung (optional)</label>
                <textarea id="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
              <button className="btn btn-primary" type="submit" disabled={placing}>
                {placing ? 'Wird gesendet...' : 'Bestellung aufgeben'}
              </button>
            </form>
          )}
        </main>
      </div>
    )
  }

  if (view === 'orders') {
    return (
      <div className="app-shell">
        <div className="topbar">
          <div className="mark">Plettenberg</div>
          <h1>Meine Bestellungen</h1>
        </div>
        <main>
          <button className="link-text" onClick={() => setView('browse')} style={{ marginBottom: 16 }}>← Zurück</button>

          {ordersLoading && <div className="loading-dot">Lädt...</div>}
          {!ordersLoading && orders.length === 0 && <p className="center-note">Noch keine Bestellungen bei diesem Betrieb.</p>}

          {!ordersLoading && orders.map((order) => (
            <div className="card" key={order.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                  {new Date(order.created_at).toLocaleDateString('de-DE')}
                </span>
                <span className="status-pill status-live" style={{ fontSize: 11 }}>{order.status}</span>
              </div>
              {order.business_order_items?.map((item) => (
                <p key={item.id} style={{ margin: '2px 0', fontSize: 14 }}>
                  {item.quantity}× {item.product_name} ({item.unit_price != null ? `${item.unit_price} €` : 'ohne Preis'})
                </p>
              ))}
            </div>
          ))}
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>{app.company_name}</h1>
      </div>
      <main>
        <button className="link-text" onClick={onBack} style={{ marginBottom: 16 }}>← Zurück</button>

        {error && <div className="error-box">{error}</div>}
        {placedMsg && <div className="error-box" style={{ background: '#E5EFEA', color: '#1F4D3F', borderColor: '#1F4D3F' }}>{placedMsg}</div>}

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
            <div className="btn-row" style={{ marginBottom: 14 }}>
              <button className="btn btn-secondary" onClick={() => setView('cart')}>
                Warenkorb {cartCount > 0 ? `(${cartCount})` : ''}
              </button>
              <button className="btn btn-secondary" onClick={() => setView('orders')}>Meine Bestellungen</button>
            </div>

            <h3 style={{ margin: '20px 0 10px' }}>Angebot</h3>
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

                {product.sale_mode === 'bestellung' ? (
                  <button className="btn btn-primary" onClick={() => addToCart(product)}>In den Warenkorb</button>
                ) : (
                  <button className="btn btn-primary" onClick={() => startInquiry(product)} disabled={inquiryBusyId === product.id}>
                    {inquiryBusyId === product.id ? 'Einen Moment...' : 'Anfrage senden'}
                  </button>
                )}
              </div>
            ))}
          </>
        )}
      </main>
    </div>
  )
}
