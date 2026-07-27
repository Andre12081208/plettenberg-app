import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import CreateChannel from './CreateChannel.jsx'
import ChannelDetail from './ChannelDetail.jsx'
import BusinessInquiryChat from './BusinessInquiryChat.jsx'

const STATUS_LABELS = {
  in_pruefung: { text: 'In Prüfung', cls: 'status-pruefung' },
  vertrag_in_arbeit: { text: 'Vertrag in Arbeit', cls: 'status-vertrag' },
  live: { text: 'Live', cls: 'status-live' },
  abgelehnt: { text: 'Abgelehnt', cls: 'status-abgelehnt' }
}

export default function Dashboard({ profileType, profile, isAdmin, onOpenAdmin }) {
  const [products, setProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [productError, setProductError] = useState('')
  const [editingProduct, setEditingProduct] = useState(null) // null | 'new' | product

  const [orders, setOrders] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [inquiries, setInquiries] = useState([])
  const [loadingInquiries, setLoadingInquiries] = useState(false)
  const [openInquiry, setOpenInquiry] = useState(null)

  const [hasAppointmentAddon, setHasAppointmentAddon] = useState(false)
  const [slots, setSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [newServiceName, setNewServiceName] = useState('')
  const [newSlotDate, setNewSlotDate] = useState('')
  const [newSlotStart, setNewSlotStart] = useState('')
  const [newSlotEnd, setNewSlotEnd] = useState('')
  const [savingSlot, setSavingSlot] = useState(false)
  const [slotError, setSlotError] = useState('')

  const [hasChannelAddon, setHasChannelAddon] = useState(false)
  const [ownChannel, setOwnChannel] = useState(null)
  const [loadingChannel, setLoadingChannel] = useState(false)
  const [view, setView] = useState(null) // null | 'createChannel' | 'channelDetail'

  const isStadtverwaltung = profileType === 'business' && profile.category === 'stadtverwaltung'
  const canManageProducts = profileType === 'business' && profile.profile_kind === 'anbieter' && profile.status === 'live' && profile.plan === 'basis' && profile.account_status !== 'beobachter'
  const canManageChannel = profileType === 'business' && profile.status === 'live' && profile.account_status !== 'beobachter' && !isStadtverwaltung

  const [content, setContentText] = useState('')
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState('')
  const [posts, setPosts] = useState([])
  const [loadingPosts, setLoadingPosts] = useState(false)

  const canPostDirectly = isStadtverwaltung && profile.status === 'live' && profile.account_status !== 'beobachter'

  useEffect(() => {
    if (canPostDirectly) loadPosts()
    if (canManageProducts) { loadProducts(); loadOrders(); loadInquiries(); loadAppointmentInfo() }
    if (canManageChannel) loadChannelInfo()
    // eslint-disable-next-line
  }, [canPostDirectly, canManageProducts, canManageChannel])

  async function loadAppointmentInfo() {
    setLoadingSlots(true)
    const [{ data: addonRows }, { data: slotRows }] = await Promise.all([
      supabase.from('business_addons').select('addon_key').eq('business_profile_id', profile.id),
      supabase.from('business_appointment_slots').select('*').eq('business_profile_id', profile.id).order('start_at', { ascending: true })
    ])

    setHasAppointmentAddon((addonRows || []).some((a) => a.addon_key === 'termine'))
    setSlots(slotRows || [])
    setLoadingSlots(false)
  }

  async function createSlot(e) {
    e.preventDefault()
    setSlotError('')
    setSavingSlot(true)

    const startAt = new Date(`${newSlotDate}T${newSlotStart}:00`)
    const endAt = new Date(`${newSlotDate}T${newSlotEnd}:00`)

    const { error } = await supabase.from('business_appointment_slots').insert({
      business_profile_id: profile.id,
      service_name: newServiceName.trim(),
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString()
    })

    if (error) {
      setSlotError(error.message)
    } else {
      setNewServiceName('')
      setNewSlotDate('')
      setNewSlotStart('')
      setNewSlotEnd('')
      loadAppointmentInfo()
    }
    setSavingSlot(false)
  }

  async function deleteSlot(slotId) {
    await supabase.from('business_appointment_slots').delete().eq('id', slotId)
    setSlots((prev) => prev.filter((s) => s.id !== slotId))
  }
  async function loadPosts() {
    setLoadingPosts(true)
    const { data } = await supabase
      .from('posts')
      .select('*')
      .eq('business_profile_id', profile.id)
      .order('created_at', { ascending: false })

    setPosts(data || [])
    setLoadingPosts(false)
  }

  async function handlePost(e) {
    e.preventDefault()
    setPostError('')
    setPosting(true)

    const { error } = await supabase.from('posts').insert({
      business_profile_id: profile.id,
      content: content.trim()
    })

    if (error) {
      setPostError(error.message)
    } else {
      setContentText('')
      loadPosts()
    }
    setPosting(false)
  }

  async function loadChannelInfo() {
    setLoadingChannel(true)

    const [{ data: addonRows }, { data: channelRows }] = await Promise.all([
      supabase.from('business_addons').select('addon_key').eq('business_profile_id', profile.id),
      supabase.from('channels').select('*').eq('created_by', profile.id).order('created_at', { ascending: false }).limit(1)
    ])

    setHasChannelAddon((addonRows || []).some((a) => a.addon_key === 'channel'))
    setOwnChannel(channelRows?.[0] || null)
    setLoadingChannel(false)
  }

  async function loadProducts() {
    setLoadingProducts(true)
    setProductError('')
    const { data, error } = await supabase
      .from('business_products')
      .select('*')
      .eq('business_profile_id', profile.id)
      .order('created_at', { ascending: false })

    if (error) setProductError(error.message)
    setProducts(data || [])
    setLoadingProducts(false)
  }

  async function toggleProductActive(product) {
    const { error } = await supabase
      .from('business_products')
      .update({ active: !product.active })
      .eq('id', product.id)

    if (!error) {
      setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, active: !p.active } : p)))
    } else {
      setProductError(error.message)
    }
  }

  async function deleteProduct(product) {
    const { error } = await supabase.from('business_products').delete().eq('id', product.id)
    if (!error) {
      setProducts((prev) => prev.filter((p) => p.id !== product.id))
    } else {
      setProductError(error.message)
    }
  }

  async function loadOrders() {
    setLoadingOrders(true)
    const { data } = await supabase
      .from('business_orders')
      .select('*, business_order_items(*)')
      .eq('business_profile_id', profile.id)
      .order('created_at', { ascending: false })

    setOrders(data || [])
    setLoadingOrders(false)
  }

  async function updateOrderStatus(orderId, newStatus) {
    const { error } = await supabase.from('business_orders').update({ status: newStatus }).eq('id', orderId)
    if (!error) {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)))
    }
  }

  async function loadInquiries() {
    setLoadingInquiries(true)
    const { data } = await supabase
      .from('business_inquiries')
      .select('*')
      .eq('business_profile_id', profile.id)
      .order('created_at', { ascending: false })

    setInquiries(data || [])
    setLoadingInquiries(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  if (openInquiry) {
    return (
      <BusinessInquiryChat
        userId={profile.id}
        inquiryId={openInquiry}
        isBusiness
        onBack={() => setOpenInquiry(null)}
      />
    )
  }

  if (editingProduct) {
    return (
      <ProductForm
        businessId={profile.id}
        existing={editingProduct === 'new' ? null : editingProduct}
        onDone={() => { setEditingProduct(null); loadProducts() }}
        onCancel={() => setEditingProduct(null)}
      />
    )
  }

  if (view === 'createChannel') {
    return (
      <CreateChannel
        userId={profile.id}
        onBack={() => setView(null)}
        onDone={(channelId, channelName) => {
          setOwnChannel({ id: channelId, name: channelName, created_by: profile.id })
          setView('channelDetail')
        }}
      />
    )
  }

  if (view === 'channelDetail' && ownChannel) {
    return (
      <ChannelDetail
        userId={profile.id}
        channelId={ownChannel.id}
        onBack={() => { setView(null); loadChannelInfo() }}
      />
    )
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>Willkommen{profileType === 'private' ? `, ${profile.first_name}` : ''}</h1>
        {profile.account_status === 'beobachter' && (
          <div className="error-box" style={{ background: '#FCEFE1', color: 'var(--clay)', borderColor: 'var(--clay)' }}>
            Beobachter-Modus: Du kannst aktuell nichts schreiben oder senden.
          </div>
        )}
      </div>
      <main>
        {profileType === 'private' ? (
          <div className="card">
            <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: 14 }}>
              Dein Profil ist angelegt und für andere Nutzer nicht sichtbar.
            </p>
          </div>
        ) : (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <h3 style={{ margin: 0 }}>{profile.company_name}</h3>
              <span className={`status-pill ${STATUS_LABELS[profile.status]?.cls}`}>
                {STATUS_LABELS[profile.status]?.text}
              </span>
            </div>
            <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: 14 }}>
              {profile.status === 'in_pruefung' &&
                'Wir melden uns bei dir, sobald dein Profil geprüft wurde und ein Vertrag zustande kommt.'}
              {profile.status === 'vertrag_in_arbeit' &&
                'Der Vertrag wird gerade fertiggemacht. Danach schalten wir dein Profil live.'}
              {profile.status === 'live' &&
                'Dein Profil ist öffentlich sichtbar.'}
              {profile.status === 'abgelehnt' &&
                'Dein Profil wurde aktuell nicht freigeschaltet.'}
            </p>
            {profile.status === 'live' && !isStadtverwaltung && (
              <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>
                Paket: {profile.plan === 'basis' ? 'Basis (virtueller Laden aktiv)' : 'Kein Paket gebucht'}
              </p>
            )}
          </div>
        )}

        {canManageProducts && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Meine Produkte</h3>
              <button className="btn btn-secondary" style={{ width: 'auto', padding: '8px 14px' }} onClick={() => setEditingProduct('new')}>
                + Neu
              </button>
            </div>

            {productError && <div className="error-box">{productError}</div>}
            {loadingProducts && <div className="loading-dot">Lädt...</div>}
            {!loadingProducts && products.length === 0 && (
              <p className="center-note">Noch keine Produkte eingestellt.</p>
            )}

            {!loadingProducts && products.map((product) => (
              <div key={product.id} style={{ borderTop: '1px solid var(--line)', paddingTop: 12, marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600 }}>{product.name}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>
                      {product.price != null ? `${product.price} €` : 'Ohne Preisangabe'} · {product.sale_mode === 'bestellung' ? 'Bestellung' : 'Anfrage'}
                    </p>
                  </div>
                  <span className={`status-pill ${product.active ? 'status-live' : 'status-abgelehnt'}`}>
                    {product.active ? 'Aktiv' : 'Inaktiv'}
                  </span>
                </div>
                <div className="btn-row" style={{ marginTop: 10 }}>
                  <button className="btn btn-secondary" onClick={() => setEditingProduct(product)}>Bearbeiten</button>
                  <button className="btn btn-secondary" onClick={() => toggleProductActive(product)}>
                    {product.active ? 'Deaktivieren' : 'Aktivieren'}
                  </button>
                  <button className="btn btn-secondary" onClick={() => deleteProduct(product)}>Löschen</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {canManageProducts && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Bestellungen</h3>
            {loadingOrders && <div className="loading-dot">Lädt...</div>}
            {!loadingOrders && orders.length === 0 && <p className="center-note">Noch keine Bestellungen.</p>}

            {!loadingOrders && orders.map((order) => (
              <div key={order.id} style={{ borderTop: '1px solid var(--line)', paddingTop: 12, marginTop: 12 }}>
                <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--ink-soft)' }}>
                  {new Date(order.created_at).toLocaleDateString('de-DE')}
                </p>
                {order.business_order_items?.map((item) => (
                  <p key={item.id} style={{ margin: '2px 0', fontSize: 14 }}>
                    {item.quantity}× {item.product_name}
                  </p>
                ))}
                {order.note && <p style={{ margin: '4px 0', fontSize: 13, fontStyle: 'italic' }}>„{order.note}"</p>}
                <select
                  value={order.status}
                  onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                  style={{ marginTop: 8 }}
                >
                  <option value="neu">Neu</option>
                  <option value="bestaetigt">Bestätigt</option>
                  <option value="abgeschlossen">Abgeschlossen</option>
                  <option value="abgelehnt">Abgelehnt</option>
                </select>
              </div>
            ))}
          </div>
        )}

        {canManageProducts && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Anfragen</h3>
            {loadingInquiries && <div className="loading-dot">Lädt...</div>}
            {!loadingInquiries && inquiries.length === 0 && <p className="center-note">Noch keine Anfragen.</p>}

            {!loadingInquiries && inquiries.map((inquiry) => (
              <button
                key={inquiry.id}
                className="card-choice"
                onClick={() => setOpenInquiry(inquiry.id)}
              >
                <h3 style={{ margin: 0 }}>{inquiry.product_name_snapshot || 'Anfrage'}</h3>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-soft)' }}>
                  {new Date(inquiry.created_at).toLocaleDateString('de-DE')}
                </p>
              </button>
            ))}
          </div>
        )}

        {canManageProducts && hasAppointmentAddon && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Meine Termine</h3>

            {slotError && <div className="error-box">{slotError}</div>}

            <form onSubmit={createSlot} style={{ marginBottom: 16 }}>
              <div className="field">
                <label htmlFor="serviceName">Bezeichnung</label>
                <input id="serviceName" required value={newServiceName} onChange={(e) => setNewServiceName(e.target.value)} placeholder="z.B. Beratungsgespräch" />
              </div>
              <div className="field">
                <label htmlFor="slotDate">Datum</label>
                <input id="slotDate" type="date" required value={newSlotDate} onChange={(e) => setNewSlotDate(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div className="field" style={{ flex: 1 }}>
                  <label htmlFor="slotStart">Von</label>
                  <input id="slotStart" type="time" required value={newSlotStart} onChange={(e) => setNewSlotStart(e.target.value)} />
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label htmlFor="slotEnd">Bis</label>
                  <input id="slotEnd" type="time" required value={newSlotEnd} onChange={(e) => setNewSlotEnd(e.target.value)} />
                </div>
              </div>
              <button className="btn btn-primary" type="submit" disabled={savingSlot}>
                {savingSlot ? 'Wird angelegt...' : 'Termin-Slot anlegen'}
              </button>
            </form>

            {loadingSlots && <div className="loading-dot">Lädt...</div>}
            {!loadingSlots && slots.length === 0 && <p className="center-note">Noch keine Termine angelegt.</p>}

            {!loadingSlots && slots.map((slot) => (
              <div key={slot.id} style={{ borderTop: '1px solid var(--line)', paddingTop: 10, marginTop: 10 }}>
                <p style={{ margin: 0, fontWeight: 600 }}>{slot.service_name}</p>
                <p style={{ margin: '2px 0', fontSize: 13, color: 'var(--ink-soft)' }}>
                  {new Date(slot.start_at).toLocaleDateString('de-DE')}, {new Date(slot.start_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} – {new Date(slot.end_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p style={{ margin: '2px 0 8px', fontSize: 13 }}>
                  {slot.booked_by ? '✅ Gebucht' : '⚪ Frei'}
                </p>
                {!slot.booked_by && (
                  <button className="link-text" onClick={() => deleteSlot(slot.id)}>Löschen</button>
                )}
              </div>
            ))}
          </div>
        )}

        {canManageChannel && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Newsfeed-Beiträge</h3>
            {loadingChannel && <div className="loading-dot">Lädt...</div>}

            {!loadingChannel && !hasChannelAddon && (
              <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-soft)' }}>
                Um Neuigkeiten zu veröffentlichen, die bei deinen Followern im Newsfeed erscheinen, buche den Zusatz "Eigener Channel".
              </p>
            )}

            {!loadingChannel && hasChannelAddon && !ownChannel && (
              <>
                <p style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--ink-soft)' }}>
                  Du hast den Channel-Zusatz gebucht, aber noch keinen Channel angelegt.
                </p>
                <button className="btn btn-primary" onClick={() => setView('createChannel')}>Channel erstellen</button>
              </>
            )}

            {!loadingChannel && hasChannelAddon && ownChannel && (
              <>
                <p style={{ margin: '0 0 12px', fontSize: 14 }}>Dein Channel: <strong>{ownChannel.name}</strong></p>
                <button className="btn btn-primary" onClick={() => setView('channelDetail')}>Zum Channel</button>
              </>
            )}
          </div>
        )}

        {canPostDirectly && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>News veröffentlichen</h3>
            {postError && <div className="error-box">{postError}</div>}
            <form onSubmit={handlePost}>
              <div className="field">
                <textarea
                  rows={3}
                  required
                  value={content}
                  onChange={(e) => setContentText(e.target.value)}
                  placeholder="Was gibt's Neues?"
                />
              </div>
              <button className="btn btn-primary" type="submit" disabled={posting}>
                {posting ? 'Wird veröffentlicht...' : 'Veröffentlichen'}
              </button>
            </form>

            {!loadingPosts && posts.length > 0 && (
              <div style={{ marginTop: 18 }}>
                {posts.map((p) => (
                  <div key={p.id} style={{ borderTop: '1px solid var(--line)', paddingTop: 10, marginTop: 10 }}>
                    <p style={{ margin: 0, fontSize: 14 }}>{p.content}</p>
                    <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                      {new Date(p.created_at).toLocaleDateString('de-DE')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {isAdmin && (
          <button className="btn btn-primary" onClick={onOpenAdmin} style={{ marginBottom: 12 }}>
            Gewerbeanfragen verwalten
          </button>
        )}

        <button className="btn btn-secondary" onClick={handleLogout}>Abmelden</button>
      </main>
    </div>
  )
}

function ProductForm({ businessId, existing, onDone, onCancel }) {
  const [name, setName] = useState(existing?.name || '')
  const [description, setDescription] = useState(existing?.description || '')
  const [price, setPrice] = useState(existing?.price != null ? String(existing.price) : '')
  const [saleMode, setSaleMode] = useState(existing?.sale_mode || 'anfrage')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(existing?.image_url || null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function handleFileChange(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      let imageUrl = existing?.image_url || null

      if (file) {
        const ext = file.name.split('.').pop()
        const path = `${businessId}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage.from('product-images').upload(path, file)
        if (uploadError) throw uploadError

        const { data } = supabase.storage.from('product-images').getPublicUrl(path)
        imageUrl = data.publicUrl
      }

      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        price: price ? parseFloat(price) : null,
        sale_mode: saleMode,
        image_url: imageUrl
      }

      const { error: dbError } = existing
        ? await supabase.from('business_products').update(payload).eq('id', existing.id)
        : await supabase.from('business_products').insert({ business_profile_id: businessId, ...payload })

      if (dbError) throw dbError

      onDone()
    } catch (err) {
      setError(err.message || 'Etwas ist schiefgelaufen.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>{existing ? 'Produkt bearbeiten' : 'Neues Produkt'}</h1>
      </div>
      <main>
        <button className="link-text" onClick={onCancel} style={{ marginBottom: 16 }}>← Zurück</button>

        {error && <div className="error-box">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label className="link-text" htmlFor="productImage" style={{ cursor: 'pointer' }}>Foto auswählen</label>
            <input id="productImage" type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
            {preview && (
              <img src={preview} alt="" style={{ width: '100%', borderRadius: 10, marginTop: 10, maxHeight: 160, objectFit: 'cover' }} />
            )}
          </div>

          <div className="field">
            <label htmlFor="name">Name</label>
            <input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="price">Preis in € (optional)</label>
            <input id="price" type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="z.B. 12.90" />
          </div>

          <div className="field">
            <label htmlFor="saleMode">Art</label>
            <select id="saleMode" value={saleMode} onChange={(e) => setSaleMode(e.target.value)}>
              <option value="anfrage">Anfrage – Einwohner schickt eine Nachricht</option>
              <option value="bestellung">Bestellung – direkt in der App bestellbar</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="description">Beschreibung</label>
            <textarea id="description" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? 'Wird gespeichert...' : 'Speichern'}
          </button>
        </form>
      </main>
    </div>
  )
}
