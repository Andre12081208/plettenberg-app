import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import BusinessInquiryChat from './BusinessInquiryChat.jsx'
import ChannelDetail from './ChannelDetail.jsx'

function isCurrentlyOpen(hours) {
  if (!hours) return null
  const jsDayToKey = ['so', 'mo', 'di', 'mi', 'do', 'fr', 'sa']
  const now = new Date()
  const today = hours[jsDayToKey[now.getDay()]]
  if (!today || today.closed || !today.open || !today.close) return false

  const [openH, openM] = today.open.split(':').map(Number)
  const [closeH, closeM] = today.close.split(':').map(Number)
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  return nowMinutes >= openH * 60 + openM && nowMinutes < closeH * 60 + closeM
}

function RoomBackground({ imageUrl, transitionType, transitionDuration }) {
  const [layers, setLayers] = useState(() => [{ url: imageUrl, key: 0 }])
  const nextKey = useRef(1)

  useEffect(() => {
    setLayers((prev) => {
      if (prev[prev.length - 1]?.url === imageUrl) return prev
      return [...prev, { url: imageUrl, key: nextKey.current++ }]
    })
    // eslint-disable-next-line
  }, [imageUrl])

  useEffect(() => {
    if (layers.length <= 1) return
    const timer = setTimeout(() => {
      setLayers((prev) => prev.slice(-1))
    }, (transitionDuration || 0.5) * 1000 + 60)
    return () => clearTimeout(timer)
    // eslint-disable-next-line
  }, [layers])

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {layers.map((layer, i) => {
        const isNewest = i === layers.length - 1
        const animate = isNewest && layers.length > 1 && transitionType !== 'keine'
        return (
          <div
            key={layer.key}
            className={animate ? `room-transition-${transitionType || 'fade'}` : ''}
            style={{
              position: 'absolute', inset: 0,
              backgroundImage: `url(${layer.url})`,
              backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
              animationDuration: animate ? `${transitionDuration || 0.5}s` : undefined,
              zIndex: i
            }}
          />
        )
      })}
    </div>
  )
}

export default function BusinessMiniApp({ app, userId, onBack, fullScreenRoom, onFullScreenChange }) {
  const [showRoom, setShowRoom] = useState(true)
  const [hotspots, setHotspots] = useState([])
  const [hotspotActionsMap, setHotspotActionsMap] = useState({})
  const [hasRoomAddon, setHasRoomAddon] = useState(false)
  const [terminPicker, setTerminPicker] = useState(false)
  const [channelInfo, setChannelInfo] = useState(null)
  const [activeHotspotModal, setActiveHotspotModal] = useState(null)
  const [activeAreaImage, setActiveAreaImage] = useState(null)
  const [activeTransition, setActiveTransition] = useState({ type: 'fade', duration: 0.5 })

  function handleHotspotClick(h) {
    setActiveHotspotModal(h)
    if (h.area_image_url) {
      setActiveTransition({ type: h.transition_type || 'fade', duration: h.transition_duration || 0.5 })
      setActiveAreaImage(h.area_image_url)
    }
  }

  function goBackToRoom() {
    setActiveHotspotModal(null)
    setActiveTransition({ type: 'keine', duration: 0 })
    setActiveAreaImage(null)
  }
  const [isInstalled, setIsInstalled] = useState(true)
  const [hasChannelAddonForResident, setHasChannelAddonForResident] = useState(false)
  const [directoryChannel, setDirectoryChannel] = useState(null)
  const [showChannelView, setShowChannelView] = useState(false)
  const [showReportForm, setShowReportForm] = useState(false)
  const [reportMessage, setReportMessage] = useState('')
  const [sendingReport, setSendingReport] = useState(false)
  const [reportSent, setReportSent] = useState(false)
  const [view, setView] = useState('browse') // 'browse' | 'cart' | 'orders' | 'inquiries'
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cart, setCart] = useState({})

  const [note, setNote] = useState('')
  const [placing, setPlacing] = useState(false)
  const [placedMsg, setPlacedMsg] = useState('')

  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)

  const [inquiries, setInquiries] = useState([])
  const [inquiriesLoading, setInquiriesLoading] = useState(false)
  const [openInquiry, setOpenInquiry] = useState(null)
  const [inquiryBusyId, setInquiryBusyId] = useState(null)

  const [terminProduct, setTerminProduct] = useState(null) // Produkt, für das gerade Termine angezeigt werden
  const [terminSlots, setTerminSlots] = useState([])
  const [loadingTerminSlots, setLoadingTerminSlots] = useState(false)
  const [bookingId, setBookingId] = useState(null)
  const [bookedMsg, setBookedMsg] = useState('')

  const hasShop = app.plan === 'basis'

  useEffect(() => {
    if (hasShop) {
      loadProducts()
      loadInquiries()
      loadRoomInfo()
    } else {
      setLoading(false)
    }
    loadInstallAndChannelInfo()
    // eslint-disable-next-line
  }, [])

  async function loadInstallAndChannelInfo() {
    const [{ data: installedRow }, { data: addonRows }, { data: channelRow }] = await Promise.all([
      supabase.from('installed_apps').select('user_id').eq('user_id', userId).eq('business_profile_id', app.id).maybeSingle(),
      supabase.from('business_addons').select('addon_key').eq('business_profile_id', app.id),
      supabase.from('channels').select('id, name').eq('created_by', app.id).limit(1).maybeSingle()
    ])

    setIsInstalled(!!installedRow)
    setHasChannelAddonForResident((addonRows || []).some((a) => a.addon_key === 'channel'))
    setDirectoryChannel(channelRow || null)
  }

  async function installApp() {
    const { data: existingRows } = await supabase.from('installed_apps').select('position').eq('user_id', userId)
    const maxPosition = (existingRows || []).reduce((max, r) => Math.max(max, r.position), 0)

    const { error } = await supabase.from('installed_apps').insert({
      user_id: userId,
      business_profile_id: app.id,
      position: maxPosition + 1
    })

    if (!error) setIsInstalled(true)
  }

  async function submitListingReport(e) {
    e.preventDefault()
    if (!reportMessage.trim()) return
    setSendingReport(true)

    const { data: listing } = await supabase.from('directory_listings').select('id').eq('linked_business_profile_id', app.id).maybeSingle()

    if (listing) {
      await supabase.from('directory_listing_reports').insert({
        listing_id: listing.id,
        reporter_id: userId,
        message: reportMessage.trim()
      })
      setReportSent(true)
    }
    setSendingReport(false)
  }

  async function loadRoomInfo() {
    const [{ data: addonRows }, { data: hotspotRows }] = await Promise.all([
      supabase.from('business_addons').select('addon_key').eq('business_profile_id', app.id),
      supabase.from('business_room_hotspots').select('*').eq('business_profile_id', app.id)
    ])
    setHasRoomAddon((addonRows || []).some((a) => a.addon_key === 'raum'))
    setHotspots(hotspotRows || [])

    const hotspotIds = (hotspotRows || []).map((h) => h.id)
    if (hotspotIds.length > 0) {
      const { data: actionRows } = await supabase
        .from('business_room_hotspot_actions')
        .select('*')
        .in('hotspot_id', hotspotIds)

      const map = {}
      for (const row of actionRows || []) {
        if (!map[row.hotspot_id]) map[row.hotspot_id] = []
        map[row.hotspot_id].push(row.action_type)
      }
      setHotspotActionsMap(map)
    }
  }

 async function goToKontakt() {
    setActiveHotspotModal(null)
    setShowRoom(false)
  }

  async function goToAngebot() {
    setActiveHotspotModal(null)
    setShowRoom(false)
  }

  async function goToTermine() {
    setActiveHotspotModal(null)
    setShowRoom(false)
    setTerminPicker(true)
  }

  async function goToChannel() {
    const { data } = await supabase.from('channels').select('id, name').eq('created_by', app.id).limit(1).maybeSingle()
    setChannelInfo(data || 'none')
    setActiveHotspotModal(null)
    setShowRoom(false)
  }

  async function goToAnfragen(hotspotLabel) {
    setActiveHotspotModal(null)
    setInquiryBusyId('raum')
    const { data: created, error } = await supabase
      .from('business_inquiries')
      .insert({
        business_profile_id: app.id,
        buyer_id: userId,
        product_name_snapshot: hotspotLabel,
        is_anonymous: false
      })
      .select('id')
      .single()

    if (!error) {
      await supabase.from('business_inquiry_messages').insert({
        inquiry_id: created.id,
        sender_id: userId,
        is_business: false,
        content: `Ich habe eine Frage zu "${hotspotLabel}".`
      })
      setShowRoom(false)
      await openInquiryThread(created.id)
    }
    setInquiryBusyId(null)
  }

  const hasTerminOffers = products.some((p) => p.sale_mode === 'termin')
  useEffect(() => {
    if (view === 'orders') loadOrders()
    if (view === 'inquiries') loadInquiries()
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

  async function loadInquiries() {
    setInquiriesLoading(true)
    const [{ data, error }, { data: unreadRows }] = await Promise.all([
      supabase
        .from('business_inquiries')
        .select('*')
        .eq('business_profile_id', app.id)
        .eq('buyer_id', userId)
        .eq('buyer_mailbox_status', 'inbox')
        .order('updated_at', { ascending: false }),
      supabase.rpc('get_resident_inquiry_unread_map')
    ])

    const unreadMap = {}
    for (const row of unreadRows || []) unreadMap[row.inquiry_id] = row.unread_count

    if (error) setError(error.message)
    setInquiries((data || []).map((i) => ({ ...i, unreadCount: unreadMap[i.id] || 0 })))
    setInquiriesLoading(false)
  }

  function isUnread(inquiry) {
    return new Date(inquiry.updated_at) > new Date(inquiry.buyer_last_read_at)
  }

  const unreadInquiryCount = inquiries.filter(isUnread).length

  async function openInquiryThread(inquiryId) {
    await supabase.from('business_inquiries').update({ buyer_last_read_at: new Date().toISOString() }).eq('id', inquiryId)
    setInquiries((prev) => prev.map((i) => (i.id === inquiryId ? { ...i, buyer_last_read_at: new Date().toISOString() } : i)))
    setOpenInquiry(inquiryId)
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

  const [pendingInquiryProduct, setPendingInquiryProduct] = useState(null)

  async function startInquiry(product, isAnonymous) {
    setInquiryBusyId(product.id)
    setError('')
    setPendingInquiryProduct(null)

    const { data: existing } = await supabase
      .from('business_inquiries')
      .select('id')
      .eq('business_profile_id', app.id)
      .eq('product_id', product.id)
      .eq('buyer_id', userId)
      .maybeSingle()

    if (existing) {
      setInquiryBusyId(null)
      await openInquiryThread(existing.id)
      return
    }

    const { data: created, error: createError } = await supabase
      .from('business_inquiries')
      .insert({
        business_profile_id: app.id,
        product_id: product.id,
        product_name_snapshot: product.name,
        buyer_id: userId,
        is_anonymous: isAnonymous
      })
      .select('id')
      .single()

    if (createError) {
      setError(
        isAnonymous
          ? 'Anonyme Anfrage nicht möglich. Bitte versuch es mit deinem Profil.'
          : createError.message
      )
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
    await openInquiryThread(created.id)
  }

  async function openTerminView(product) {
    setTerminProduct(product)
    setLoadingTerminSlots(true)
    const { data, error } = await supabase
      .from('business_appointment_slots')
      .select('*')
      .eq('business_profile_id', app.id)
      .eq('product_id', product.id)
      .is('booked_by', null)
      .gte('start_at', new Date().toISOString())
      .order('start_at', { ascending: true })

    if (error) setError(error.message)
    setTerminSlots(data || [])
    setLoadingTerminSlots(false)
  }

  async function bookSlot(slot) {
    setBookingId(slot.id)
    setError('')

    const { error } = await supabase
      .from('business_appointment_slots')
      .update({ booked_by: userId, booked_at: new Date().toISOString() })
      .eq('id', slot.id)
      .is('booked_by', null)

    if (error) {
      setError('Dieser Termin wurde gerade eben von jemand anderem gebucht. Bitte einen anderen wählen.')
      setBookingId(null)
      openTerminView(terminProduct)
      return
    }

    await supabase.from('calendar_events').insert({
      user_id: userId,
      created_by: userId,
      title: `${slot.service_name || terminProduct.name} bei ${app.company_name}`,
      start_at: slot.start_at,
      end_at: slot.end_at,
      all_day: false
    })

    setTerminSlots((prev) => prev.filter((s) => s.id !== slot.id))
    setBookedMsg(`Termin gebucht und in deinen Kalender eingetragen.`)
    setBookingId(null)
  }

  useEffect(() => {
    onFullScreenChange?.(!!(showRoom && hasRoomAddon && app.room_image_url && fullScreenRoom))
    // eslint-disable-next-line
  }, [showRoom, hasRoomAddon, app.room_image_url, fullScreenRoom])

  function getModalWrapperStyle(hotspot) {
    const format = hotspot?.modal_format || 'zentriert'
    const base = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', zIndex: 50, padding: 20 }

    if (format === 'unten') return { ...base, alignItems: 'flex-end', justifyContent: 'center' }
    if (format === 'oben') return { ...base, alignItems: 'flex-start', justifyContent: 'center' }
    if (format === 'links') return { ...base, alignItems: 'center', justifyContent: 'flex-start' }
    if (format === 'rechts') return { ...base, alignItems: 'center', justifyContent: 'flex-end' }
    if (format === 'frei') return { ...base, padding: 0 }
    return { ...base, alignItems: 'center', justifyContent: 'center' }
  }

  function getModalCardStyle(hotspot) {
    const format = hotspot?.modal_format || 'zentriert'
    if (format === 'frei') {
      return {
        maxWidth: 360, width: '90%',
        position: 'absolute',
        left: `${hotspot.modal_position_x ?? 50}%`,
        top: `${hotspot.modal_position_y ?? 50}%`,
        transform: 'translate(-50%, -50%)'
      }
    }
    return { maxWidth: 360, width: '100%' }
  }

  const hotspotModalContent = activeHotspotModal && (
    <div
      className="card"
      style={getModalCardStyle(activeHotspotModal)}
      onClick={(e) => e.stopPropagation()}
    >
      <h3 style={{ marginTop: 0 }}>{activeHotspotModal.label}</h3>
      <p className="hint" style={{ marginBottom: 14 }}>Was möchtest du hier tun?</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(hotspotActionsMap[activeHotspotModal.id] || []).length === 0 && (
          <p className="center-note">Für diesen Bereich ist noch nichts hinterlegt.</p>
        )}
        {(hotspotActionsMap[activeHotspotModal.id] || []).includes('anfragen') && (
          <button className="btn btn-primary" onClick={() => goToAnfragen(activeHotspotModal.label)}>
            💬 Frage stellen / Chat
          </button>
        )}
        {(hotspotActionsMap[activeHotspotModal.id] || []).includes('termine') && hasTerminOffers && (
          <button className="btn btn-secondary" onClick={goToTermine}>
            📅 Termin buchen
          </button>
        )}
        {(hotspotActionsMap[activeHotspotModal.id] || []).includes('angebot') && (
          <button className="btn btn-secondary" onClick={goToAngebot}>
            🛍️ Angebot ansehen
          </button>
        )}
        {(hotspotActionsMap[activeHotspotModal.id] || []).includes('channel') && (
          <button className="btn btn-secondary" onClick={goToChannel}>
            📢 Neuigkeiten (Channel)
          </button>
        )}
        {(hotspotActionsMap[activeHotspotModal.id] || []).includes('kontakt') && (
          <button className="btn btn-secondary" onClick={goToKontakt}>
            📍 Kontaktinfos
          </button>
        )}
        <button className="link-text" onClick={goBackToRoom} style={{ marginTop: 6 }}>
          Abbrechen
        </button>
      </div>
    </div>
  )

  if (showRoom && hasRoomAddon && app.room_image_url && fullScreenRoom) {
    return (
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>
        <RoomBackground imageUrl={activeAreaImage || app.room_image_url} transitionType={activeTransition.type} transitionDuration={activeTransition.duration} />
        {!activeAreaImage && hotspots.map((h) => (
          <button
            key={h.id}
            onClick={() => handleHotspotClick(h)}
            style={{
              position: 'absolute', left: `${h.x_percent}%`, top: `${h.y_percent}%`,
              transform: 'translate(-50%, -50%)', padding: '8px 14px', borderRadius: 999,
              background: 'rgba(31,77,61,0.92)', color: '#fff', border: '2px solid #fff',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap'
            }}
          >
            {h.label}
          </button>
        ))}
        {activeAreaImage && !activeHotspotModal && (
          <button
            onClick={() => setActiveAreaImage(null)}
            style={{ position: 'absolute', top: 20, left: 20, padding: '8px 14px', borderRadius: 999, background: 'rgba(0,0,0,0.6)', color: '#fff', border: '2px solid #fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            ← Zurück zum Raum
          </button>
        )}
        {activeHotspotModal && (
          <div
            style={getModalWrapperStyle(activeHotspotModal)}
            onClick={goBackToRoom}
          >
            {hotspotModalContent}
          </div>
        )}
      </div>
    )
  }

  if (showRoom && hasRoomAddon && app.room_image_url) {
    return (
      <div className="app-shell">
        <div className="topbar">
          <div className="mark">Plettenberg</div>
          <h1>{app.company_name}</h1>
        </div>
        <main>
          <button className="link-text" onClick={onBack} style={{ marginBottom: 16 }}>← Zurück</button>
          <p className="hint" style={{ marginBottom: 12 }}>Tippe auf einen Bereich, um dort hinzugehen.</p>

          {activeAreaImage && (
            <button className="link-text" onClick={goBackToRoom} style={{ marginBottom: 10 }}>← Zurück zum Raum</button>
          )}
          <div style={{ position: 'relative', width: '100%', height: 280, borderRadius: 10, overflow: 'hidden' }}>
            <RoomBackground imageUrl={activeAreaImage || app.room_image_url} transitionType={activeTransition.type} transitionDuration={activeTransition.duration} />
            {!activeAreaImage && hotspots.map((h) => (
              <button
                key={h.id}
                onClick={() => handleHotspotClick(h)}
                style={{
                  position: 'absolute', left: `${h.x_percent}%`, top: `${h.y_percent}%`,
                  transform: 'translate(-50%, -50%)', padding: '8px 14px', borderRadius: 999,
                  background: 'rgba(31,77,61,0.92)', color: '#fff', border: '2px solid #fff',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap'
                }}
              >
                {h.label}
              </button>
            ))}
          </div>

          {activeHotspotModal && (
            <div
              style={getModalWrapperStyle(activeHotspotModal)}
              onClick={goBackToRoom}
            >
              <div
                className="card"
                style={getModalCardStyle(activeHotspotModal)}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 style={{ marginTop: 0 }}>{activeHotspotModal.label}</h3>
                <p className="hint" style={{ marginBottom: 14 }}>Was möchtest du hier tun?</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(hotspotActionsMap[activeHotspotModal.id] || []).length === 0 && (
                    <p className="center-note">Für diesen Bereich ist noch nichts hinterlegt.</p>
                  )}
                  {(hotspotActionsMap[activeHotspotModal.id] || []).includes('anfragen') && (
                    <button className="btn btn-primary" onClick={() => goToAnfragen(activeHotspotModal.label)}>
                      💬 Frage stellen / Chat
                    </button>
                  )}
                  {(hotspotActionsMap[activeHotspotModal.id] || []).includes('termine') && hasTerminOffers && (
                    <button className="btn btn-secondary" onClick={goToTermine}>
                      📅 Termin buchen
                    </button>
                  )}
                  {(hotspotActionsMap[activeHotspotModal.id] || []).includes('angebot') && (
                    <button className="btn btn-secondary" onClick={goToAngebot}>
                      🛍️ Angebot ansehen
                    </button>
                  )}
                  {(hotspotActionsMap[activeHotspotModal.id] || []).includes('channel') && (
                    <button className="btn btn-secondary" onClick={goToChannel}>
                      📢 Neuigkeiten (Channel)
                    </button>
                  )}
                  {(hotspotActionsMap[activeHotspotModal.id] || []).includes('kontakt') && (
                    <button className="btn btn-secondary" onClick={goToKontakt}>
                      📍 Kontaktinfos
                    </button>
                  )}
                  <button className="link-text" onClick={goBackToRoom} style={{ marginTop: 6 }}>
                    Abbrechen
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    )
  }

  if (terminPicker) {
    const terminProducts = products.filter((p) => p.sale_mode === 'termin')
    return (
      <div className="app-shell">
        <div className="topbar">
          <div className="mark">Plettenberg</div>
          <h1>Termin auswählen</h1>
        </div>
        <main>
          <button className="link-text" onClick={() => { setTerminPicker(false); setShowRoom(true) }} style={{ marginBottom: 16 }}>← Zurück zum Raum</button>
          {terminProducts.length === 0 && <p className="center-note">Aktuell keine Termin-Angebote.</p>}
          {terminProducts.map((p) => (
            <button key={p.id} className="card-choice" onClick={() => { setTerminPicker(false); openTerminView(p) }}>
              <h3 style={{ margin: 0 }}>{p.name}</h3>
            </button>
          ))}
        </main>
      </div>
    )
  }

  if (channelInfo) {
    return (
      <div className="app-shell">
        <div className="topbar">
          <div className="mark">Plettenberg</div>
          <h1>Newsfeed-Channel</h1>
        </div>
        <main>
          <button className="link-text" onClick={() => { setChannelInfo(null); setShowRoom(true) }} style={{ marginBottom: 16 }}>← Zurück zum Raum</button>
          {channelInfo === 'none' ? (
            <p className="center-note">Dieser Betrieb hat noch keinen Channel.</p>
          ) : (
            <p style={{ fontSize: 14 }}>
              Diesen Betrieb findest du unter Channels als <strong>{channelInfo.name}</strong> – dort kannst du folgen, um Neuigkeiten im Newsfeed zu sehen.
            </p>
          )}
        </main>
      </div>
    )
  }

  if (showChannelView && directoryChannel) {
    return (
      <ChannelDetail
        userId={userId}
        channelId={directoryChannel.id}
        onBack={() => setShowChannelView(false)}
      />
    )
  }

  if (openInquiry) {
    return (
      <BusinessInquiryChat
        userId={userId}
        inquiryId={openInquiry}
        isBusiness={false}
        onBack={() => { setOpenInquiry(null); loadInquiries() }}
      />
    )
  }

  if (terminProduct) {
    return (
      <div className="app-shell">
        <div className="topbar">
          <div className="mark">Plettenberg</div>
          <h1>{terminProduct.name}</h1>
        </div>
        <main>
          <button className="link-text" onClick={() => { setTerminProduct(null); setBookedMsg('') }} style={{ marginBottom: 16 }}>← Zurück</button>

          {error && <div className="error-box">{error}</div>}
          {bookedMsg && <div className="error-box" style={{ background: '#E5EFEA', color: '#1F4D3F', borderColor: '#1F4D3F' }}>{bookedMsg}</div>}

          {loadingTerminSlots && <div className="loading-dot">Lädt...</div>}
          {!loadingTerminSlots && terminSlots.length === 0 && (
            <p className="center-note">Aktuell keine freien Termine für dieses Angebot.</p>
          )}

          {!loadingTerminSlots && terminSlots.map((slot) => (
            <div className="card" key={slot.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ margin: 0, fontSize: 14 }}>
                {new Date(slot.start_at).toLocaleDateString('de-DE')}, {new Date(slot.start_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
              </p>
              <button className="btn btn-primary" style={{ width: 'auto', padding: '8px 14px' }} onClick={() => bookSlot(slot)} disabled={bookingId === slot.id}>
                {bookingId === slot.id ? '...' : 'Buchen'}
              </button>
            </div>
          ))}
        </main>
      </div>
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

  if (view === 'inquiries') {
    return (
      <div className="app-shell">
        <div className="topbar">
          <div className="mark">Plettenberg</div>
          <h1>Meine Anfragen</h1>
        </div>
        <main>
          <button className="link-text" onClick={() => setView('browse')} style={{ marginBottom: 16 }}>← Zurück</button>

          {inquiriesLoading && <div className="loading-dot">Lädt...</div>}
          {!inquiriesLoading && inquiries.length === 0 && <p className="center-note">Noch keine Anfragen bei diesem Betrieb.</p>}

          {!inquiriesLoading && inquiries.map((inquiry) => (
            <div className="card" key={inquiry.id} style={{ padding: 0, overflow: 'hidden' }}>
              <button
                style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', padding: 16, display: 'flex', alignItems: 'center', gap: 10 }}
                onClick={() => openInquiryThread(inquiry.id)}
              >
                <div className="avatar-preview" style={{ width: 44, height: 44, flexShrink: 0 }}>
                  {app.logo_url ? <img src={app.logo_url} alt="" /> : '🏬'}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0 }}>
                    {inquiry.product_name_snapshot || 'Anfrage'}
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>
                    {inquiry.unreadCount > 0 ? 'Neue Antwort vom Betrieb' : new Date(inquiry.updated_at).toLocaleDateString('de-DE')}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--ink-soft)' }}>
                    {inquiry.is_anonymous ? '🕶️ Anonym gesendet' : '👤 Mit Profil gesendet'}
                  </p>
                  <span className={`status-pill ${{ angefragt: 'status-pruefung', in_bearbeitung: 'status-vertrag', erledigt: 'status-live' }[inquiry.status] || 'status-pruefung'}`} style={{ fontSize: 11, marginTop: 4, display: 'inline-block' }}>
                    {{ angefragt: '⚪ Angefragt', in_bearbeitung: '🔵 In Bearbeitung', erledigt: '✅ Erledigt' }[inquiry.status] || '⚪ Angefragt'}
                  </span>
                </div>
                {inquiry.unreadCount > 0 && (
                  <span style={{ minWidth: 22, height: 22, borderRadius: 11, background: 'var(--clay)', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px', flexShrink: 0 }}>
                    {inquiry.unreadCount}
                  </span>
                )}
              </button>
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

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ width: '100%', height: 120, background: app.banner_url ? undefined : 'var(--forest-light)' }}>
            {app.banner_url && <img src={app.banner_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
          </div>
          <div style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginTop: -48, marginBottom: 10 }}>
              <div className="avatar-preview" style={{ width: 72, height: 72, border: '3px solid #fff' }}>
                {app.logo_url ? <img src={app.logo_url} alt="" /> : '🏬'}
              </div>
            </div>

            {app.tagline && <p style={{ margin: '0 0 10px', fontSize: 15, color: 'var(--forest)', fontWeight: 600 }}>{app.tagline}</p>}

            {isCurrentlyOpen(app.opening_hours_structured) !== null && (
              <span className={`status-pill ${isCurrentlyOpen(app.opening_hours_structured) ? 'status-live' : 'status-abgelehnt'}`} style={{ marginBottom: 10, display: 'inline-block' }}>
                {isCurrentlyOpen(app.opening_hours_structured) ? '🟢 Jetzt geöffnet' : '🔴 Geschlossen'}
              </span>
            )}

            {app.description && <p style={{ fontSize: 14 }}>{app.description}</p>}

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
              {app.address && <span className="status-pill status-live" style={{ fontSize: 12 }}>📍 {app.address}</span>}
              {app.phone && <span className="status-pill status-live" style={{ fontSize: 12 }}>📞 {app.phone}</span>}
              {app.website && (
                <a href={app.website} target="_blank" rel="noreferrer" className="status-pill status-live" style={{ fontSize: 12, textDecoration: 'none', color: 'inherit' }}>
                  🌐 Website
                </a>
              )}
            </div>
            {app.contact_person && <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 10 }}>Ansprechpartner: {app.contact_person}</p>}
          </div>
        </div>
        <div className="btn-row" style={{ marginTop: 12, flexWrap: 'wrap' }}>
          {!isInstalled ? (
            <button className="btn btn-secondary" onClick={installApp}>➕ Zur Startseite hinzufügen</button>
          ) : (
            <span style={{ fontSize: 13, color: 'var(--ink-soft)', alignSelf: 'center' }}>✓ Auf deiner Startseite</span>
          )}
          {hasChannelAddonForResident && directoryChannel && (
            <button className="btn btn-secondary" onClick={() => setShowChannelView(true)}>📢 Zum Channel</button>
          )}
        </div>

        {reportSent ? (
          <p style={{ fontSize: 13, color: 'var(--forest)', marginTop: 8 }}>Danke für den Hinweis!</p>
        ) : showReportForm ? (
          <form onSubmit={submitListingReport} style={{ marginTop: 10 }}>
            <div className="field">
              <textarea rows={2} required value={reportMessage} onChange={(e) => setReportMessage(e.target.value)} placeholder="Was ist veraltet oder falsch?" />
            </div>
            <div className="btn-row">
              <button className="btn btn-secondary" type="submit" disabled={sendingReport}>{sendingReport ? '...' : 'Melden'}</button>
              <button className="btn btn-secondary" type="button" onClick={() => setShowReportForm(false)}>Abbrechen</button>
            </div>
          </form>
        ) : (
          <button className="link-text" onClick={() => setShowReportForm(true)} style={{ marginTop: 8, fontSize: 13 }}>🚩 Fehler melden</button>
        )}

        {hasShop && (
          <>
            <div className="btn-row" style={{ marginBottom: 14, flexWrap: 'wrap' }}>
              <button className="btn btn-secondary" onClick={() => setView('cart')}>
                Warenkorb {cartCount > 0 ? `(${cartCount})` : ''}
              </button>
              <button className="btn btn-secondary" onClick={() => setView('orders')}>Meine Bestellungen</button>
              <button className="btn btn-secondary" onClick={() => setView('inquiries')} style={{ position: 'relative' }}>
                Meine Anfragen
                {unreadInquiryCount > 0 && (
                  <span style={{ position: 'absolute', top: -6, right: -6, minWidth: 18, height: 18, borderRadius: 9, background: 'var(--clay)', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                    {unreadInquiryCount}
                  </span>
                )}
              </button>
            </div>

            <h3 style={{ margin: '20px 0 10px' }}>Angebot</h3>
            {loading && <div className="loading-dot">Lädt...</div>}
            {!loading && products.length === 0 && (
              <p className="center-note">Noch keine Angebote eingestellt.</p>
            )}

            {!loading && products.map((product) => (
              <div className="card" key={product.id}>
                {product.image_url && (
                  <img src={product.image_url} alt="" style={{ width: '100%', borderRadius: 10, marginBottom: 10, maxHeight: 160, objectFit: 'cover' }} />
                )}
                <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--ink-soft)' }}>
                  {product.type === 'produkt' ? '📦 Produkt' : '🛠️ Dienstleistung'}
                </p>
                <h3 style={{ margin: '0 0 4px' }}>{product.name}</h3>
                {product.price != null && (
                  <p style={{ margin: '0 0 6px', fontWeight: 600, color: 'var(--forest)' }}>{product.price} €</p>
                )}
                {product.description && <p style={{ margin: '0 0 10px', fontSize: 14 }}>{product.description}</p>}

                {product.sale_mode === 'bestellung' && (
                  <button className="btn btn-primary" onClick={() => addToCart(product)}>In den Warenkorb</button>
                )}
                {product.sale_mode === 'anfrage' && (
                  pendingInquiryProduct?.id === product.id ? (
                    <div>
                      <p style={{ fontSize: 13, margin: '0 0 8px' }}>Wie möchtest du anfragen?</p>
                      <div className="btn-row">
                        <button className="btn btn-secondary" onClick={() => startInquiry(product, true)}>Anonym</button>
                        <button className="btn btn-secondary" onClick={() => startInquiry(product, false)}>Mit meinem Profil</button>
                      </div>
                    </div>
                  ) : (
                    <button className="btn btn-primary" onClick={() => setPendingInquiryProduct(product)} disabled={inquiryBusyId === product.id}>
                      {inquiryBusyId === product.id ? 'Einen Moment...' : 'Anfrage senden'}
                    </button>
                  )
                )}
                {product.sale_mode === 'termin' && (
                  <button className="btn btn-primary" onClick={() => openTerminView(product)}>Termin auswählen</button>
                )}
              </div>
            ))}
          </>
        )}
      </main>
    </div>
  )
}
