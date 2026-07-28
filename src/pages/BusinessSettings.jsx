import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import CreateChannel from './CreateChannel.jsx'
import ChannelDetail from './ChannelDetail.jsx'
import BusinessAccountProfile from './BusinessAccountProfile.jsx'
import BusinessAccessSecurity from './BusinessAccessSecurity.jsx'
import BusinessAccountHistory from './BusinessAccountHistory.jsx'

export default function BusinessSettings({ profile, onProfileUpdated, onGoToMySeite }) {
  const [view, setView] = useState(null) // null | 'produkte' | 'termine' | 'news' | 'newsDirect' | 'createChannel' | 'channelDetail'

  const [products, setProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [productError, setProductError] = useState('')
  const [editingProduct, setEditingProduct] = useState(null) // null | 'new' | product
  const [productSearch, setProductSearch] = useState('')
  const [productFilter, setProductFilter] = useState('aktiv') // 'alle' | 'aktiv' | 'inaktiv' | 'geloescht'
  const [productSort, setProductSort] = useState('neu') // 'neu' | 'preis' | 'az' | 'verfuegbar'

  const [hasChannelAddon, setHasChannelAddon] = useState(false)
  const [ownChannel, setOwnChannel] = useState(null)
  const [loadingChannel, setLoadingChannel] = useState(false)

  const [hasAppointmentAddon, setHasAppointmentAddon] = useState(false)
  const [hasRoomAddon, setHasRoomAddon] = useState(false)
  const [roomImageUrl, setRoomImageUrl] = useState(null)
  const [roomFile, setRoomFile] = useState(null)
  const [roomPreview, setRoomPreview] = useState(null)
  const [uploadingRoom, setUploadingRoom] = useState(false)
  const [hotspots, setHotspots] = useState([])
  const [placingHotspot, setPlacingHotspot] = useState(null) // { x, y } | null
  const [newHotspotLabel, setNewHotspotLabel] = useState('')
  const [newHotspotActions, setNewHotspotActions] = useState([])
  const [newActionLabel, setNewActionLabel] = useState('')
  const [newActionType, setNewActionType] = useState('anfragen')
  const [roomError, setRoomError] = useState('')
  const [hotspotActionsMap, setHotspotActionsMap] = useState({})
  const [editingHotspotActionsId, setEditingHotspotActionsId] = useState(null)
  const [editActionLabel, setEditActionLabel] = useState('')
  const [editActionType, setEditActionType] = useState('anfragen')
  const [slots, setSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedTerminProductId, setSelectedTerminProductId] = useState('')
  const [newSlotDate, setNewSlotDate] = useState('')
  const [newSlotStart, setNewSlotStart] = useState('')
  const [newSlotEnd, setNewSlotEnd] = useState('')
  const [savingSlot, setSavingSlot] = useState(false)
  const [slotError, setSlotError] = useState('')

  const isStadtverwaltung = profile.category === 'stadtverwaltung'
  const canManageProducts = profile.profile_kind === 'anbieter' && profile.status === 'live' && profile.plan === 'basis' && profile.account_status !== 'beobachter'
  const canManageChannel = profile.status === 'live' && profile.account_status !== 'beobachter' && !isStadtverwaltung

  const [content, setContentText] = useState('')
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState('')
  const [posts, setPosts] = useState([])
  const [loadingPosts, setLoadingPosts] = useState(false)
  const canPostDirectly = isStadtverwaltung && profile.status === 'live' && profile.account_status !== 'beobachter'

  const terminProducts = products.filter((p) => p.sale_mode === 'termin' && !p.deleted_at)

  const ACTION_LABELS = {
    anfragen: 'Führt zu: Anfragen/Chat',
    termine: 'Führt zu: Termine buchen',
    angebot: 'Führt zu: Angebot ansehen',
    channel: 'Führt zu: Newsfeed-Channel',
    kontakt: 'Führt zu: Kontaktinfos'
  }

  useEffect(() => {
    if (canManageProducts) { loadProducts(); loadAppointmentInfo() }
    if (canManageChannel) loadChannelInfo()
    if (canPostDirectly) loadPosts()
    loadRoomInfo()
    // eslint-disable-next-line
  }, [])

  async function loadRoomInfo() {
    const [{ data: addonRows }, { data: profileRow }, { data: hotspotRows }] = await Promise.all([
      supabase.from('business_addons').select('addon_key').eq('business_profile_id', profile.id),
      supabase.from('business_profiles').select('room_image_url').eq('id', profile.id).maybeSingle(),
      supabase.from('business_room_hotspots').select('*').eq('business_profile_id', profile.id)
    ])

    setHasRoomAddon((addonRows || []).some((a) => a.addon_key === 'raum'))
    setRoomImageUrl(profileRow?.room_image_url || null)
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
        map[row.hotspot_id].push(row)
      }
      setHotspotActionsMap(map)
    } else {
      setHotspotActionsMap({})
    }
  }

  async function addActionToHotspot(hotspotId, label, actionType) {
    if (!label.trim()) return
    const { data, error } = await supabase.from('business_room_hotspot_actions').insert({
      hotspot_id: hotspotId, label: label.trim(), action_type: actionType
    }).select('*').single()

    if (!error) {
      setHotspotActionsMap((prev) => ({ ...prev, [hotspotId]: [...(prev[hotspotId] || []), data] }))
      setEditActionLabel('')
    } else {
      setRoomError(error.message)
    }
  }

  async function removeActionFromHotspot(hotspotId, actionId) {
    await supabase.from('business_room_hotspot_actions').delete().eq('id', actionId)
    setHotspotActionsMap((prev) => ({ ...prev, [hotspotId]: (prev[hotspotId] || []).filter((a) => a.id !== actionId) }))
  }

  function handleRoomFileChange(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setRoomFile(f)
    setRoomPreview(URL.createObjectURL(f))
  }

  async function uploadRoomImage() {
    if (!roomFile) return
    setUploadingRoom(true)
    setRoomError('')

    try {
      const ext = roomFile.name.split('.').pop()
      const path = `${profile.id}/room.${ext}`
      const { error: uploadError } = await supabase.storage.from('room-images').upload(path, roomFile, { upsert: true })
      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('room-images').getPublicUrl(path)
      const { error: dbError } = await supabase.from('business_profiles').update({ room_image_url: data.publicUrl }).eq('id', profile.id)
      if (dbError) throw dbError

      setRoomImageUrl(data.publicUrl)
      setRoomFile(null)
      setRoomPreview(null)
    } catch (err) {
      setRoomError(err.message || 'Bild konnte nicht hochgeladen werden.')
    } finally {
      setUploadingRoom(false)
    }
  }

  function handleRoomImageClick(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const xPercent = ((e.clientX - rect.left) / rect.width) * 100
    const yPercent = ((e.clientY - rect.top) / rect.height) * 100
    setPlacingHotspot({ x: xPercent, y: yPercent })
    setNewHotspotLabel('')
    setNewHotspotActions([])
    setNewActionLabel('')
    setNewActionType('anfragen')
  }

  function addNewHotspotAction() {
    if (!newActionLabel.trim()) return
    setNewHotspotActions((prev) => [...prev, { label: newActionLabel.trim(), action_type: newActionType }])
    setNewActionLabel('')
  }

  function removeNewHotspotAction(index) {
    setNewHotspotActions((prev) => prev.filter((_, i) => i !== index))
  }

  async function saveHotspot() {
    if (!placingHotspot || !newHotspotLabel.trim() || newHotspotActions.length === 0) return

    const { data, error } = await supabase.from('business_room_hotspots').insert({
      business_profile_id: profile.id,
      label: newHotspotLabel.trim(),
      x_percent: placingHotspot.x,
      y_percent: placingHotspot.y
    }).select('*').single()

    if (error) {
      setRoomError(error.message)
      return
    }

    const { data: insertedActions, error: actionsError } = await supabase.from('business_room_hotspot_actions').insert(
      newHotspotActions.map((a) => ({ hotspot_id: data.id, action_type: a.action_type, label: a.label }))
    ).select('*')

    if (actionsError) {
      setRoomError(actionsError.message)
    }

    setHotspots((prev) => [...prev, data])
    setHotspotActionsMap((prev) => ({ ...prev, [data.id]: insertedActions || [] }))
    setNewHotspotActions([])
    setPlacingHotspot(null)
  }

  async function deleteHotspot(id) {
    await supabase.from('business_room_hotspots').delete().eq('id', id)
    setHotspots((prev) => prev.filter((h) => h.id !== id))
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
    const nowIso = new Date().toISOString()
    const { error } = await supabase
      .from('business_products')
      .update({ active: false, deleted_at: nowIso })
      .eq('id', product.id)

    if (!error) {
      setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, active: false, deleted_at: nowIso } : p)))
    } else {
      setProductError(error.message)
    }
  }

  async function restoreProduct(product) {
    const { error } = await supabase
      .from('business_products')
      .update({ active: true, deleted_at: null })
      .eq('id', product.id)

    if (!error) {
      setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, active: true, deleted_at: null } : p)))
    } else {
      setProductError(error.message)
    }
  }

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

    if (!selectedTerminProductId) {
      setSlotError('Bitte zuerst ein Angebot auswählen, für das der Termin gilt.')
      return
    }

    setSavingSlot(true)

    const startAt = new Date(`${newSlotDate}T${newSlotStart}:00`)
    const endAt = new Date(`${newSlotDate}T${newSlotEnd}:00`)

    const { error } = await supabase.from('business_appointment_slots').insert({
      business_profile_id: profile.id,
      product_id: selectedTerminProductId,
      service_name: products.find((p) => p.id === selectedTerminProductId)?.name || '',
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString()
    })

    if (error) {
      setSlotError(error.message)
    } else {
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

  async function handleLogout() {
    await supabase.auth.signOut()
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
        onBack={() => setView('news')}
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
        onBack={() => { setView('news'); loadChannelInfo() }}
      />
    )
  }

  if (view === 'produkte') {
    const filtered = products
      .filter((p) => {
        if (productFilter === 'aktiv') return p.active && !p.deleted_at
        if (productFilter === 'inaktiv') return !p.active && !p.deleted_at
        if (productFilter === 'geloescht') return !!p.deleted_at
        return true
      })
      .filter((p) => p.name.toLowerCase().includes(productSearch.trim().toLowerCase()))
      .sort((a, b) => {
        if (productSort === 'preis') return (a.price ?? 0) - (b.price ?? 0)
        if (productSort === 'az') return a.name.localeCompare(b.name, 'de')
        if (productSort === 'verfuegbar') return (b.active ? 1 : 0) - (a.active ? 1 : 0)
        return new Date(b.created_at) - new Date(a.created_at)
      })

    return (
      <>
        <div className="topbar">
          <div className="mark">Plettenberg</div>
          <h1>Meine Angebote</h1>
        </div>
        <main style={{ paddingBottom: 90 }}>
          <button className="link-text" onClick={() => setView(null)} style={{ marginBottom: 16 }}>← Zurück zu Einstellungen</button>

          <div className="field">
            <input
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Angebot suchen..."
            />
          </div>

          {productSearch.trim() && (
            <div className="card" style={{ marginBottom: 16 }}>
              {products.filter((p) => p.name.toLowerCase().includes(productSearch.trim().toLowerCase())).length === 0 ? (
                <p className="center-note" style={{ margin: 0 }}>Keine Treffer.</p>
              ) : (
                products
                  .filter((p) => p.name.toLowerCase().includes(productSearch.trim().toLowerCase()))
                  .map((p) => (
                    <button
                      key={p.id}
                      style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', padding: '8px 0', borderTop: '1px solid var(--line)' }}
                      onClick={() => setEditingProduct(p)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <p style={{ margin: 0, fontWeight: 600 }}>{p.name}</p>
                        <span className={`status-pill ${p.deleted_at || !p.active ? 'status-abgelehnt' : 'status-live'}`} style={{ fontSize: 11 }}>
                          {p.deleted_at ? 'Gelöscht' : p.active ? 'Aktiv' : 'Inaktiv'}
                        </span>
                      </div>
                    </button>
                  ))
              )}
            </div>
          )}

          <div className="btn-row" style={{ marginBottom: 10, flexWrap: 'wrap' }}>
            {[
              { value: 'aktiv', label: 'Aktiv' },
              { value: 'inaktiv', label: 'Inaktiv' },
              { value: 'geloescht', label: 'Gelöscht' },
              { value: 'alle', label: 'Alle' }
            ].map((f) => (
              <button
                key={f.value}
                className={productFilter === f.value ? 'btn btn-primary' : 'btn btn-secondary'}
                style={{ width: 'auto', padding: '8px 14px' }}
                onClick={() => setProductFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="field" style={{ marginBottom: 16 }}>
            <label htmlFor="productSort">Sortieren nach</label>
            <select id="productSort" value={productSort} onChange={(e) => setProductSort(e.target.value)}>
              <option value="neu">Neueste zuerst</option>
              <option value="preis">Preis</option>
              <option value="az">A–Z</option>
              <option value="verfuegbar">Verfügbar zuerst</option>
            </select>
          </div>

          <div className="btn-row" style={{ marginBottom: 16 }}>
            <button className="btn btn-secondary" onClick={() => setEditingProduct('new')}>+ Neues Angebot</button>
          </div>

          {productError && <div className="error-box">{productError}</div>}
          {loadingProducts && <div className="loading-dot">Lädt...</div>}
          {!loadingProducts && filtered.length === 0 && (
            <p className="center-note">Keine Angebote gefunden.</p>
          )}

          {!loadingProducts && filtered.map((product) => (
            <div className="card" key={product.id} style={{ padding: 0, overflow: 'hidden' }}>
              <button
                style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', padding: 16, display: 'block' }}
                onClick={() => setEditingProduct(product)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600 }}>{product.name}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>
                      {product.type === 'produkt' ? '📦 Produkt' : '🛠️ Dienstleistung'} · {product.price != null ? `${product.price} €` : 'Ohne Preisangabe'} · {product.sale_mode === 'bestellung' ? 'Bestellung' : product.sale_mode === 'termin' ? 'Termin' : 'Anfrage'}
                    </p>
                  </div>
                  <span className={`status-pill ${product.deleted_at || !product.active ? 'status-abgelehnt' : 'status-live'}`}>
                    {product.deleted_at ? 'Gelöscht' : product.active ? 'Aktiv' : 'Inaktiv'}
                  </span>
                </div>
              </button>
              <div className="btn-row" style={{ padding: '0 16px 16px' }}>
                {product.deleted_at ? (
                  <button className="btn btn-secondary" onClick={() => restoreProduct(product)}>Wiederherstellen</button>
                ) : (
                  <>
                    <button className="btn btn-secondary" onClick={() => toggleProductActive(product)}>
                      {product.active ? 'Deaktivieren' : 'Aktivieren'}
                    </button>
                    <button className="btn btn-secondary" onClick={() => deleteProduct(product)}>Löschen</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </main>
      </>
    )
  }

  if (view === 'raum') {
    return (
      <>
        <div className="topbar">
          <div className="mark">Plettenberg</div>
          <h1>Virtueller Raum</h1>
        </div>
        <main style={{ paddingBottom: 90 }}>
          <button className="link-text" onClick={() => setView(null)} style={{ marginBottom: 16 }}>← Zurück zu Einstellungen</button>

          {roomError && <div className="error-box">{roomError}</div>}

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Raumbild</h3>
            <p className="hint" style={{ marginBottom: 12 }}>
              Lad ein Foto oder eine Illustration deines Ladens/Büros hoch. Danach kannst du direkt darauf klicken, um Bereiche festzulegen.
            </p>

            <label className="link-text" htmlFor="roomImageInput" style={{ cursor: 'pointer' }}>Bild auswählen</label>
            <input id="roomImageInput" type="file" accept="image/*" onChange={handleRoomFileChange} style={{ display: 'none' }} />

            {roomPreview && (
              <div style={{ marginTop: 10 }}>
                <img src={roomPreview} alt="" style={{ width: '100%', borderRadius: 10, maxHeight: 240, objectFit: 'cover' }} />
                <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={uploadRoomImage} disabled={uploadingRoom}>
                  {uploadingRoom ? 'Wird hochgeladen...' : 'Dieses Bild verwenden'}
                </button>
              </div>
            )}
          </div>

          {roomImageUrl && (
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Bereiche festlegen</h3>
              <p className="hint" style={{ marginBottom: 12 }}>Klick irgendwo auf das Bild, um dort einen neuen klickbaren Bereich anzulegen.</p>

              <div style={{ position: 'relative', width: '100%' }}>
                <img
                  src={roomImageUrl}
                  alt=""
                  onClick={handleRoomImageClick}
                  style={{ width: '100%', borderRadius: 10, display: 'block', cursor: 'crosshair' }}
                />
                {hotspots.map((h) => (
                  <div
                    key={h.id}
                    style={{
                      position: 'absolute', left: `${h.x_percent}%`, top: `${h.y_percent}%`,
                      transform: 'translate(-50%, -50%)', width: 28, height: 28, borderRadius: '50%',
                      background: 'var(--clay)', border: '2px solid #fff', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700
                    }}
                  >
                    📍
                  </div>
                ))}
                {placingHotspot && (
                  <div
                    style={{
                      position: 'absolute', left: `${placingHotspot.x}%`, top: `${placingHotspot.y}%`,
                      transform: 'translate(-50%, -50%)', width: 28, height: 28, borderRadius: '50%',
                      background: 'var(--forest)', border: '2px solid #fff'
                    }}
                  />
                )}
              </div>

              {placingHotspot && (
                <div style={{ marginTop: 16 }}>
                  <div className="field">
                    <label htmlFor="hotspotLabel">Beschriftung</label>
                    <input id="hotspotLabel" value={newHotspotLabel} onChange={(e) => setNewHotspotLabel(e.target.value)} placeholder="z.B. Servicebereich" />
                  </div>
                  <div className="field">
                    <label>Aktionen für diesen Bereich</label>
                    {newHotspotActions.length === 0 && <p className="hint">Noch keine Aktion hinzugefügt.</p>}
                    {newHotspotActions.map((a, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
                        <span style={{ fontSize: 14 }}>{a.label} <span style={{ color: 'var(--ink-soft)' }}>({ACTION_LABELS[a.action_type]})</span></span>
                        <button className="link-text" onClick={() => removeNewHotspotAction(i)}>Entfernen</button>
                      </div>
                    ))}
                  </div>

                  <div className="field">
                    <label htmlFor="newActionLabel">Neue Aktion: Beschriftung</label>
                    <input id="newActionLabel" value={newActionLabel} onChange={(e) => setNewActionLabel(e.target.value)} placeholder="z.B. Frag Andre direkt!" />
                  </div>
                  <div className="field">
                    <label htmlFor="newActionType">Verlinkt mit</label>
                    <select id="newActionType" value={newActionType} onChange={(e) => setNewActionType(e.target.value)}>
                      {Object.entries(ACTION_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <button className="btn btn-secondary" type="button" onClick={addNewHotspotAction} disabled={!newActionLabel.trim()} style={{ marginBottom: 16 }}>
                    + Aktion hinzufügen
                  </button>

                  <div className="btn-row">
                    <button className="btn btn-primary" onClick={saveHotspot} disabled={!newHotspotLabel.trim() || newHotspotActions.length === 0}>Bereich anlegen</button>
                    <button className="btn btn-secondary" onClick={() => setPlacingHotspot(null)}>Abbrechen</button>
                  </div>
                </div>
              )}

              <h3 style={{ margin: '20px 0 10px' }}>Bestehende Bereiche</h3>
              {hotspots.length === 0 && <p className="center-note">Noch keine Bereiche angelegt.</p>}
              {hotspots.map((h) => (
                <div key={h.id} style={{ borderTop: '1px solid var(--line)', paddingTop: 10, marginTop: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600 }}>{h.label}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>
                        {(hotspotActionsMap[h.id] || []).map((a) => a.label).join(' · ') || 'Keine Aktionen zugewiesen'}
                      </p>
                    </div>
                    <button className="link-text" onClick={() => deleteHotspot(h.id)}>Löschen</button>
                  </div>

                  <button
                    className="link-text"
                    style={{ marginTop: 6 }}
                    onClick={() => {
                      const opening = editingHotspotActionsId !== h.id
                      setEditingHotspotActionsId(opening ? h.id : null)
                      setEditActionLabel('')
                      setEditActionType('anfragen')
                    }}
                  >
                    {editingHotspotActionsId === h.id ? 'Fertig' : 'Aktionen bearbeiten'}
                  </button>

                  {editingHotspotActionsId === h.id && (
                    <div style={{ marginTop: 8, paddingLeft: 4 }}>
                      {(hotspotActionsMap[h.id] || []).map((a) => (
                        <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
                          <span style={{ fontSize: 14 }}>{a.label} <span style={{ color: 'var(--ink-soft)' }}>({ACTION_LABELS[a.action_type]})</span></span>
                          <button className="link-text" onClick={() => removeActionFromHotspot(h.id, a.id)}>Entfernen</button>
                        </div>
                      ))}

                      <div className="field" style={{ marginTop: 10 }}>
                        <label>Neue Aktion: Beschriftung</label>
                        <input value={editActionLabel} onChange={(e) => setEditActionLabel(e.target.value)} placeholder="z.B. Frag Andre direkt!" />
                      </div>
                      <div className="field">
                        <label>Verlinkt mit</label>
                        <select value={editActionType} onChange={(e) => setEditActionType(e.target.value)}>
                          {Object.entries(ACTION_LABELS).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        className="btn btn-secondary"
                        type="button"
                        disabled={!editActionLabel.trim()}
                        onClick={() => addActionToHotspot(h.id, editActionLabel, editActionType)}
                      >
                        + Aktion hinzufügen
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </>
    )
  }

  if (view === 'termine') {
    return (
      <>
        <div className="topbar">
          <div className="mark">Plettenberg</div>
          <h1>Meine Termine</h1>
        </div>
        <main style={{ paddingBottom: 90 }}>
          <button className="link-text" onClick={() => setView(null)} style={{ marginBottom: 16 }}>← Zurück zu Einstellungen</button>

          <div className="card">
            {slotError && <div className="error-box">{slotError}</div>}

            {terminProducts.length === 0 ? (
              <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-soft)' }}>
                Lege zuerst unter "Meine Angebote" ein Angebot mit Verkaufsart "Termin" an, dann kannst du hier dafür Zeiten anbieten.
              </p>
            ) : (
              <form onSubmit={createSlot} style={{ marginBottom: 16 }}>
                <div className="field">
                  <label htmlFor="terminProduct">Für welches Angebot?</label>
                  <select id="terminProduct" required value={selectedTerminProductId} onChange={(e) => setSelectedTerminProductId(e.target.value)}>
                    <option value="">– auswählen –</option>
                    {terminProducts.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
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
            )}

            {loadingSlots && <div className="loading-dot">Lädt...</div>}
            {!loadingSlots && slots.length === 0 && <p className="center-note">Noch keine Termine angelegt.</p>}

            {!loadingSlots && slots.map((slot) => {
              const linkedProduct = products.find((p) => p.id === slot.product_id)
              const displayName = linkedProduct?.name || slot.service_name || 'Termin'
              return (
                <div key={slot.id} style={{ borderTop: '1px solid var(--line)', paddingTop: 10, marginTop: 10 }}>
                  <p style={{ margin: 0, fontWeight: 600 }}>{displayName}</p>
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
              )
            })}
          </div>
        </main>
      </>
    )
  }

  if (view === 'news') {
    return (
      <>
        <div className="topbar">
          <div className="mark">Plettenberg</div>
          <h1>Newsfeed-Beiträge</h1>
        </div>
        <main style={{ paddingBottom: 90 }}>
          <button className="link-text" onClick={() => setView(null)} style={{ marginBottom: 16 }}>← Zurück zu Einstellungen</button>

          <div className="card">
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
        </main>
      </>
    )
  }

  if (view === 'newsDirect') {
    return (
      <>
        <div className="topbar">
          <div className="mark">Plettenberg</div>
          <h1>News veröffentlichen</h1>
        </div>
        <main style={{ paddingBottom: 90 }}>
          <button className="link-text" onClick={() => setView(null)} style={{ marginBottom: 16 }}>← Zurück zu Einstellungen</button>

          <div className="card">
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
        </main>
      </>
    )
  }

  if (view === 'konto-plan') {
    return (
      <PlanUndZusatzpakete profile={profile} onBack={() => setView(null)} />
    )
  }

  if (view === 'konto-sicherheit') {
    return <BusinessAccessSecurity onBack={() => setView(null)} />
  }

  if (view === 'konto-datenschutz' && false) {
    // Platzhalter, kommt in einer späteren Etappe
  }

  if (view === 'konto-profil') {
    return (
      <BusinessAccountProfile
        profile={profile}
        onBack={() => setView(null)}
        onGoToMySeite={onGoToMySeite}
        onProfileUpdated={onProfileUpdated}
      />
    )
  }

  const KONTO_ITEMS = [
    { key: 'konto-profil', icon: '👤', label: 'Profil' },
    { key: 'konto-sicherheit', icon: '🔒', label: 'Sicherheit' },
    { key: 'konto-datenschutz', icon: '🛡️', label: 'Datenschutz' },
    { key: 'konto-benachrichtigungen', icon: '🔔', label: 'Benachrichtigungen' },
    { key: 'konto-historie', icon: '🕓', label: 'Kontohistorie' },
    { key: 'konto-plan', icon: '💳', label: 'Mein Plan und Zusatzpakete' },
    { key: 'konto-rechnungen', icon: '🧾', label: 'Rechnungen' },
    { key: 'konto-zahlungsmethoden', icon: '💰', label: 'Zahlungsmethoden' },
    { key: 'konto-einstellungen', icon: '⚙️', label: 'Einstellungen' }
  ]

  if (view === 'konto-historie') {
    return <BusinessAccountHistory profile={profile} onBack={() => setView(null)} />
  }

  if (view && view.startsWith('konto-')) {
    const item = KONTO_ITEMS.find((i) => i.key === view)
    return (
      <>
        <div className="topbar">
          <div className="mark">Plettenberg</div>
          <h1>{item?.label || 'Mein Konto'}</h1>
        </div>
        <main style={{ paddingBottom: 90 }}>
          <button className="link-text" onClick={() => setView(null)} style={{ marginBottom: 16 }}>← Zurück zu Einstellungen</button>
          <div className="card">
            <p className="center-note">Dieser Bereich ist noch in Arbeit.</p>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>Einstellungen</h1>
      </div>
      <main style={{ paddingBottom: 90 }}>
        <div className="app-grid">
          {canManageProducts && (
            <button className="app-tile" onClick={() => setView('produkte')}>
              <div className="app-tile-icon">🛍️</div>
              <div className="app-tile-label">Meine Angebote</div>
            </button>
          )}

          {canManageProducts && hasAppointmentAddon && (
            <button className="app-tile" onClick={() => setView('termine')}>
              <div className="app-tile-icon">📅</div>
              <div className="app-tile-label">Meine Termine</div>
            </button>
          )}

          {canManageProducts && hasRoomAddon && (
            <button className="app-tile" onClick={() => setView('raum')}>
              <div className="app-tile-icon">🏠</div>
              <div className="app-tile-label">Virtueller Raum</div>
            </button>
          )}

          {canManageChannel && (
            <button className="app-tile" onClick={() => setView('news')}>
              <div className="app-tile-icon">📢</div>
              <div className="app-tile-label">Newsfeed-Beiträge</div>
            </button>
          )}

          {canPostDirectly && (
            <button className="app-tile" onClick={() => setView('newsDirect')}>
              <div className="app-tile-icon">📢</div>
              <div className="app-tile-label">News veröffentlichen</div>
            </button>
          )}
        </div>

        <button className="btn btn-secondary" onClick={handleLogout} style={{ marginTop: 24 }}>Abmelden</button>

        <h3 style={{ margin: '28px 0 12px' }}>Mein Konto</h3>
        <div className="app-grid">
          {KONTO_ITEMS.map((item) => (
            <button key={item.key} className="app-tile" onClick={() => setView(item.key)}>
              <div className="app-tile-icon">{item.icon}</div>
              <div className="app-tile-label">{item.label}</div>
            </button>
          ))}
        </div>
      </main>
    </>
  )
}

function ProductForm({ businessId, existing, onDone, onCancel }) {
  const [type, setType] = useState(existing?.type || 'dienstleistung')
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
        type,
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
    <>
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>{existing ? 'Angebot bearbeiten' : 'Neues Angebot'}</h1>
      </div>
      <main style={{ paddingBottom: 90 }}>
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
            <label htmlFor="type">Art</label>
            <select id="type" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="dienstleistung">Dienstleistung</option>
              <option value="produkt">Produkt</option>
            </select>
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
            <label htmlFor="saleMode">Verkaufsart</label>
            <select id="saleMode" value={saleMode} onChange={(e) => setSaleMode(e.target.value)}>
              <option value="anfrage">Anfrage – Einwohner schickt eine Nachricht</option>
              <option value="bestellung">Bestellung – direkt in der App bestellbar</option>
              <option value="termin">Termin – Zeiten anbieten, die man buchen kann</option>
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
    </>
  )
}
const ADDON_REGISTRY = [
  { key: 'channel', label: 'Eigener Channel', description: 'Poste Neuigkeiten, die deine Follower im Newsfeed sehen.' },
  { key: 'termine', label: 'Termine', description: 'Biete buchbare Zeitfenster für deine Dienstleistungen an.' },
  { key: 'raum', label: 'Virtueller Raum', description: 'Ein interaktives Raumbild statt der Standard-Ansicht.' }
]

function PlanUndZusatzpakete({ profile, onBack }) {
  const [addons, setAddons] = useState([])
  const [hasChannel, setHasChannel] = useState(false)
  const [hasTerminProduct, setHasTerminProduct] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyKey, setBusyKey] = useState(null)
  const [confirmingKey, setConfirmingKey] = useState(null)

  const isLive = profile.status === 'live'
  const isBasis = profile.plan === 'basis'

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line
  }, [])

  async function loadAll() {
    setLoading(true)
    const [{ data: addonRows }, { data: channelRow }, { data: terminRow }] = await Promise.all([
      supabase.from('business_addons').select('*').eq('business_profile_id', profile.id),
      supabase.from('channels').select('id').eq('created_by', profile.id).limit(1).maybeSingle(),
      supabase.from('business_products').select('id').eq('business_profile_id', profile.id).eq('sale_mode', 'termin').eq('active', true).limit(1).maybeSingle()
    ])
    setAddons(addonRows || [])
    setHasChannel(!!channelRow)
    setHasTerminProduct(!!terminRow)
    setLoading(false)
  }

  function isAddonLive(key) {
    if (!isLive) return false
    if (key === 'channel') return hasChannel
    if (key === 'termine') return hasTerminProduct
    if (key === 'raum') return !!profile.room_image_url
    return false
  }

  function nextRenewal(enabledAt) {
    const start = new Date(enabledAt)
    const msPerCycle = 30 * 24 * 60 * 60 * 1000
    const elapsed = Date.now() - start.getTime()
    const cyclesPassed = Math.floor(elapsed / msPerCycle) + 1
    return new Date(start.getTime() + cyclesPassed * msPerCycle)
  }

  async function bookAddon(key) {
    setBusyKey(key)
    setError('')
    const { error } = await supabase.from('business_addons').insert({ business_profile_id: profile.id, addon_key: key })
    if (error) {
      setError(error.message)
    } else {
      loadAll()
    }
    setBusyKey(null)
  }

  async function cancelAddon(key) {
    setBusyKey(key)
    setError('')
    const { error } = await supabase.from('business_addons').delete().eq('business_profile_id', profile.id).eq('addon_key', key)
    if (error) {
      setError(error.message)
    } else {
      setConfirmingKey(null)
      loadAll()
    }
    setBusyKey(null)
  }

  return (
    <>
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>Mein Plan und Zusatzpakete</h1>
      </div>
      <main style={{ paddingBottom: 90 }}>
        <button className="link-text" onClick={onBack} style={{ marginBottom: 16 }}>← Zurück zu Einstellungen</button>

        {error && <div className="error-box">{error}</div>}
        {loading && <div className="loading-dot">Lädt...</div>}

        {!loading && (
          <>
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <h3 style={{ margin: 0 }}>Basis-Paket</h3>
                <span className={`status-pill ${isBasis && isLive ? 'status-live' : 'status-abgelehnt'}`}>
                  {isBasis ? (isLive ? 'Live' : 'Noch nicht live') : 'Nicht gebucht'}
                </span>
              </div>
              {isBasis ? (
                <>
                  <p style={{ margin: '0 0 4px', fontSize: 14 }}>Dein virtueller Laden ist Teil deines Pakets.</p>
                  {profile.plan_started_at && (
                    <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--ink-soft)' }}>
                      Gebucht seit {new Date(profile.plan_started_at).toLocaleDateString('de-DE')}
                    </p>
                  )}
                  {profile.plan_started_at && (
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-soft)' }}>
                      Verlängert sich automatisch am {nextRenewal(profile.plan_started_at).toLocaleDateString('de-DE')}
                    </p>
                  )}
                </>
              ) : (
                <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-soft)' }}>Du hast aktuell kein Paket gebucht.</p>
              )}
              <a
                className="link-text"
                style={{ display: 'inline-block', marginTop: 10 }}
                href={`mailto:andremanuel.koenig@gmail.com?subject=${encodeURIComponent('Frage zu meinem Paket')}&body=${encodeURIComponent('Betrieb: ' + profile.company_name)}`}
              >
                Für Änderungen am Basis-Paket: Support kontaktieren
              </a>
            </div>

            <h3 style={{ margin: '20px 0 10px' }}>Zusatzpakete</h3>

            {ADDON_REGISTRY.map((addonDef) => {
              const booked = addons.find((a) => a.addon_key === addonDef.key)
              const live = booked && isAddonLive(addonDef.key)

              return (
                <div className="card" key={addonDef.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <h3 style={{ margin: 0, fontSize: 16 }}>{addonDef.label}</h3>
                    {booked && (
                      <span className={`status-pill ${live ? 'status-live' : 'status-abgelehnt'}`}>
                        {live ? 'Live' : 'Noch nicht eingerichtet'}
                      </span>
                    )}
                  </div>
                  <p style={{ margin: '0 0 10px', fontSize: 14, color: 'var(--ink-soft)' }}>{addonDef.description}</p>

                  {booked ? (
                    <>
                      <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--ink-soft)' }}>
                        Gebucht seit {new Date(booked.enabled_at).toLocaleDateString('de-DE')}
                      </p>
                      <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--ink-soft)' }}>
                        Verlängert sich automatisch am {nextRenewal(booked.enabled_at).toLocaleDateString('de-DE')}
                      </p>

                      {confirmingKey === addonDef.key ? (
                        <div className="btn-row">
                          <button className="btn btn-secondary" onClick={() => cancelAddon(addonDef.key)} disabled={busyKey === addonDef.key}>
                            {busyKey === addonDef.key ? '...' : 'Wirklich kündigen'}
                          </button>
                          <button className="btn btn-secondary" onClick={() => setConfirmingKey(null)}>Abbrechen</button>
                        </div>
                      ) : (
                        <button className="link-text" onClick={() => setConfirmingKey(addonDef.key)}>Kündigen</button>
                      )}
                    </>
                  ) : (
                    <button
                      className="btn btn-primary"
                      onClick={() => bookAddon(addonDef.key)}
                      disabled={!isBasis || !isLive || busyKey === addonDef.key}
                    >
                      {busyKey === addonDef.key ? 'Wird gebucht...' : 'Jetzt buchen'}
                    </button>
                  )}
                  {!booked && (!isBasis || !isLive) && (
                    <p className="hint" style={{ marginTop: 6 }}>Zusatzpakete stehen erst zur Verfügung, sobald dein Basis-Paket live ist.</p>
                  )}
                </div>
              )
            })}
          </>
        )}
      </main>
    </>
  )
}
