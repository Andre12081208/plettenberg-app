import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const ORDER_STATUS_LABELS = {
  eingegangen: 'Eingegangen',
  in_zubereitung: 'In Zubereitung',
  unterwegs: 'Unterwegs',
  geliefert: 'Geliefert'
}

export default function Kiosk({ userId, onBack }) {
  const [view, setView] = useState('browse')
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cart, setCart] = useState({})

  const [address, setAddress] = useState('')
  const [note, setNote] = useState('')
  const [placing, setPlacing] = useState(false)
  const [placedMsg, setPlacedMsg] = useState('')

  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)

  useEffect(() => {
    loadProducts()
  }, [])

  useEffect(() => {
    if (view === 'orders') loadOrders()
  }, [view])

  async function loadProducts() {
    setLoading(true)
    setError('')
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false })

    if (error) setError(error.message)
    setProducts(data || [])
    setLoading(false)
  }

  async function loadOrders() {
    setOrdersLoading(true)
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('user_id', userId)
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
      if (newQty <= 0) {
        delete next[productId]
      } else {
        next[productId] = newQty
      }
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
  const cartTotal = cartItems.reduce((sum, item) => sum + item.quantity * item.product.price, 0)

  async function placeOrder(e) {
    e.preventDefault()
    if (cartItems.length === 0) return
    setError('')
    setPlacing(true)

    try {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: userId,
          delivery_address: address.trim(),
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

      const { error: itemsError } = await supabase.from('order_items').insert(itemsToInsert)
      if (itemsError) throw itemsError

      setCart({})
      setAddress('')
      setNote('')
      setPlacedMsg('Bestellung aufgegeben! Du kannst den Status unter "Meine Bestellungen" verfolgen.')
      setView('browse')
    } catch (err) {
      setError(err.message || 'Bestellung konnte nicht aufgegeben werden.')
    } finally {
      setPlacing(false)
    }
  }

  if (view === 'cart') {
    return (
      <div className="app-shell">
        <div className="topbar">
          <div className="mark">Plettenberg</div>
          <h1>Warenkorb</h1>
        </div>
        <main>
          <button className="link-text" onClick={() => setView('browse')} style={{ marginBottom: 16 }}>← Weiter einkaufen</button>

          {error && <div className="error-box">{error}</div>}

          {cartItems.length === 0 && <p className="center-note">Dein Warenkorb ist leer.</p>}

          {cartItems.map((item) => (
            <div className="card" key={item.product.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px' }}>{item.product.name}</h3>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-soft)' }}>{item.product.price} € / Stück</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button className="btn btn-secondary" style={{ width: 32, padding: 6 }} onClick={() => changeQuantity(item.product.id, -1)}>−</button>
                  <span>{item.quantity}</span>
                  <button className="btn btn-secondary" style={{ width: 32, padding: 6 }} onClick={() => changeQuantity(item.product.id, 1)}>+</button>
                </div>
              </div>
            </div>
          ))}

          {cartItems.length > 0 && (
            <div className="card">
              <p style={{ fontWeight: 600, marginBottom: 14 }}>Gesamt: {cartTotal.toFixed(2)} €</p>

              <form onSubmit={placeOrder}>
                <div className="field">
                  <label htmlFor="address">Lieferadresse</label>
                  <input id="address" required value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Straße, Hausnummer, Ort" />
                </div>
                <div className="field">
                  <label htmlFor="note">Anmerkung</label>
                  <input id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional, z.B. Klingel defekt" />
                </div>
                <button className="btn btn-primary" type="submit" disabled={placing}>
                  {placing ? 'Wird bestellt...' : 'Jetzt bestellen'}
                </button>
                <p className="hint" style={{ marginTop: 8 }}>Bezahlung erfolgt bei Lieferung.</p>
              </form>
            </div>
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
          <button className="link-text" onClick={() => setView('browse')} style={{ marginBottom: 16 }}>← Zurück zum Kiosk</button>

          {ordersLoading && <div className="loading-dot">Lädt...</div>}
          {!ordersLoading && orders.length === 0 && <p className="center-note">Noch keine Bestellungen.</p>}

          {orders.map((order) => (
            <div className="card" key={order.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 600 }}>
                  {new Date(order.created_at).toLocaleDateString('de-DE')}
                </span>
                <span className="status-pill status-vertrag">
                  {ORDER_STATUS_LABELS[order.status] || order.status}
                </span>
              </div>
              {order.order_items?.map((item) => (
                <p key={item.id} style={{ margin: '2px 0', fontSize: 14 }}>
                  {item.quantity}× {item.product_name}
                </p>
              ))}
              <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>Lieferadresse: {order.delivery_address}</p>
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
        <h1>Kiosk</h1>
      </div>
      <main>
        <button className="link-text" onClick={onBack} style={{ marginBottom: 16 }}>← Zurück</button>

        {error && <div className="error-box">{error}</div>}
        {placedMsg && <div className="error-box" style={{ background: '#E5EFEA', color: '#1F4D3F', borderColor: '#1F4D3F' }}>{placedMsg}</div>}

        <div className="btn-row" style={{ marginBottom: 18 }}>
          <button className="btn btn-primary" onClick={() => setView('cart')}>
            Warenkorb {cartCount > 0 ? `(${cartCount})` : ''}
          </button>
          <button className="btn btn-secondary" onClick={() => setView('orders')}>Meine Bestellungen</button>
        </div>

        {loading && <div className="loading-dot">Lädt...</div>}
        {!loading && products.length === 0 && <p className="center-note">Aktuell keine Produkte verfügbar.</p>}

       {!loading && products.map((product) => {
          const isSoldOut = product.stock_status === 'sold_out'
          const isTemporarilyUnavailable = product.stock_status === 'temporarily_unavailable'
          const isUnavailable = isSoldOut || isTemporarilyUnavailable

          return (
            <div className="card" key={product.id}>
              {product.image_url && (
                <img src={product.image_url} alt="" style={{ width: '100%', borderRadius: 10, marginBottom: 10, maxHeight: 160, objectFit: 'cover', opacity: isUnavailable ? 0.5 : 1 }} />
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <h3 style={{ margin: 0 }}>{product.name}</h3>
                {isSoldOut && <span className="status-pill status-abgelehnt">Ausverkauft</span>}
                {isTemporarilyUnavailable && <span className="status-pill status-abgelehnt">Vorübergehend nicht verfügbar</span>}
                {!isUnavailable && product.stock_quantity != null && product.stock_quantity <= 5 && (
                  <span className="status-pill status-live">Nur noch {product.stock_quantity}x</span>
                )}
              </div>
              <p style={{ margin: '0 0 6px', fontWeight: 600, color: 'var(--forest)' }}>{product.price.toFixed(2)} €</p>
              {product.description && <p style={{ margin: '0 0 10px', fontSize: 14 }}>{product.description}</p>}
              <button className="btn btn-primary" onClick={() => addToCart(product)} disabled={isUnavailable}>
                {isUnavailable ? 'Nicht verfügbar' : 'In den Warenkorb'}
              </button>
            </div>
          )
        })}
      </main>
    </div>
  )
}
