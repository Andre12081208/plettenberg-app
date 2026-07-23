import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { ADMIN_EMAIL } from '../lib/adminConfig'

const STATUS_OPTIONS = [
  { value: 'in_pruefung', label: 'In Prüfung' },
  { value: 'vertrag_in_arbeit', label: 'Vertrag in Arbeit' },
  { value: 'live', label: 'Live' },
  { value: 'abgelehnt', label: 'Abgelehnt' }
]

const STATUS_CLASS = {
  in_pruefung: 'status-pruefung',
  vertrag_in_arbeit: 'status-vertrag',
  live: 'status-live',
  abgelehnt: 'status-abgelehnt'
}

const ORDER_STATUS_OPTIONS = [
  { value: 'eingegangen', label: 'Eingegangen' },
  { value: 'in_zubereitung', label: 'In Zubereitung' },
  { value: 'unterwegs', label: 'Unterwegs' },
  { value: 'geliefert', label: 'Geliefert' }
]

function PresenceDot({ lastSeenAt }) {
  if (!lastSeenAt) {
    return <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#A3402F' }} title="Noch nie online" />
  }

  const diffMs = Date.now() - new Date(lastSeenAt).getTime()
  const minutes = diffMs / 1000 / 60
  const hours = minutes / 60
  const days = hours / 24

  let color = '#A3402F' // rot
  let label = 'Länger als 7 Tage nicht online'

  if (minutes <= 3) {
    color = '#2E9E5B' // grün
    label = 'Gerade online'
  } else if (hours <= 24) {
    color = '#9AA0A6' // grau
    label = 'Innerhalb der letzten 24 Stunden online'
  } else if (days <= 7) {
    color = '#20241F' // schwarz
    label = 'Innerhalb der letzten 7 Tage online'
  }

  return <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: color }} title={label} />
}

export default function AdminPanel({ onBack, embedded }) {
  const [tab, setTab] = useState('nutzer')

  const content = (
    <>
      <div className="btn-row" style={{ marginBottom: 18, flexWrap: 'wrap' }}>
        <button className={tab === 'insights' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setTab('insights')}>Insights</button>
        <button className={tab === 'nutzer' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setTab('nutzer')}>Nutzer</button>
        <button className={tab === 'gewerbe' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setTab('gewerbe')}>Gewerbe</button>
        <button className={tab === 'produkte' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setTab('produkte')}>Produkte</button>
        <button className={tab === 'bestellungen' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setTab('bestellungen')}>Bestellungen</button>
        <button className={tab === 'channels' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setTab('channels')}>Channels</button>
      </div>

      {tab === 'insights' && <InsightsTab />}
      {tab === 'nutzer' && <NutzerTab />}
      {tab === 'gewerbe' && <GewerbeTab />}
      {tab === 'produkte' && <ProdukteTab />}
      {tab === 'bestellungen' && <BestellungenTab />}
      {tab === 'channels' && <ChannelsTab />}
    </>
  )

  const header = (
    <div className="topbar">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="mark">Plettenberg · Admin</div>
        <span className="status-pill status-live">Admin · Voller Zugriff</span>
      </div>
      <h1>Verwaltung</h1>
    </div>
  )

  if (embedded) {
    return (
      <>
        {header}
        <main style={{ paddingBottom: 90 }}>{content}</main>
      </>
    )
  }

  return (
    <div className="app-shell">
      {header}
      <main>
        <button className="link-text" onClick={onBack} style={{ marginBottom: 16 }}>← Zurück</button>
        {content}
      </main>
    </div>
  )
}

function InsightsTab() {
  const [overview, setOverview] = useState(null)
  const [usage, setUsage] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    setLoading(true)
    setError('')

    const [{ data: overviewData, error: overviewError }, { data: usageData, error: usageError }] = await Promise.all([
      supabase.rpc('admin_get_overview_stats'),
      supabase.rpc('admin_get_usage_stats')
    ])

    if (overviewError) setError(overviewError.message)
    if (usageError) setError(usageError.message)

    setOverview(overviewData?.[0] || null)
    setUsage(usageData || [])
    setLoading(false)
  }

  if (loading) return <div className="loading-dot">Lädt...</div>
  if (error) return <div className="error-box">{error}</div>
  if (!overview) return <p className="center-note">Keine Daten verfügbar.</p>

  const regularUsers = overview.total_users - overview.never_active

  return (
    <>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Übersicht</h3>
        <p style={{ margin: '4px 0' }}>👥 Registrierte Nutzer gesamt: <strong>{overview.total_users}</strong></p>
        <p style={{ margin: '4px 0', fontSize: 13, color: 'var(--ink-soft)' }}>davon {overview.total_private} Einwohner, {overview.total_business} Betriebe</p>
        <p style={{ margin: '12px 0 4px' }}>🟢 Gerade online: <strong>{overview.online_now}</strong></p>
        <p style={{ margin: '4px 0' }}>📅 Aktiv in den letzten 7 Tagen: <strong>{overview.active_7d}</strong></p>
        <p style={{ margin: '4px 0' }}>📅 Aktiv in den letzten 30 Tagen: <strong>{overview.active_30d}</strong></p>
        <p style={{ margin: '4px 0' }}>👤 Regelmäßig genutzt (mind. 1x eingeloggt): <strong>{regularUsers}</strong></p>
        <p style={{ margin: '4px 0' }}>💤 Registriert, aber nie eingeloggt: <strong>{overview.never_active}</strong></p>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Durchschnittliche Nutzungsdauer</h3>
        {usage.map((u) => (
          <div key={u.user_type} style={{ marginBottom: 14 }}>
            <p style={{ margin: '0 0 6px', fontWeight: 600 }}>
              {u.user_type === 'einwohner' ? 'Einwohner' : 'Betriebe (z.B. Restaurants)'}
            </p>
            <p style={{ margin: '2px 0', fontSize: 13, color: 'var(--ink-soft)' }}>Pro Tag: {u.avg_minutes_per_day} Min.</p>
            <p style={{ margin: '2px 0', fontSize: 13, color: 'var(--ink-soft)' }}>Pro Woche: {u.avg_minutes_per_week} Min.</p>
            <p style={{ margin: '2px 0', fontSize: 13, color: 'var(--ink-soft)' }}>Pro Monat: {u.avg_minutes_per_month} Min.</p>
          </div>
        ))}
      </div>
    </>
  )
}function NutzerTab() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    loadUsers()
    const interval = setInterval(loadUsers, 30000)
    return () => clearInterval(interval)
  }, [])

  async function loadUsers() {
    setLoading(true)
    setError('')
    const { data, error } = await supabase.rpc('admin_list_users')
    if (error) {
      setError(error.message)
    } else {
      const sorted = [...(data || [])].sort(
        (a, b) => new Date(b.last_seen_at || 0) - new Date(a.last_seen_at || 0)
      )
      setUsers(sorted)
    }
    setLoading(false)
  }

  async function setStatus(userId, newStatus) {
    setBusyId(userId)
    const { error } = await supabase.rpc('admin_set_account_status', { target_id: userId, new_status: newStatus })
    if (error) {
      setError(error.message)
    } else {
      setUsers((prev) => prev.map((u) => (u.user_id === userId ? { ...u, account_status: newStatus } : u)))
    }
    setBusyId(null)
  }

  const statusLabel = { aktiv: 'Aktiv', beobachter: 'Beobachter', gesperrt: 'Gesperrt' }
  const statusClass = { aktiv: 'status-live', beobachter: 'status-vertrag', gesperrt: 'status-abgelehnt' }

  function formatLastSeen(lastSeenAt) {
    if (!lastSeenAt) return 'Noch nie'
    const diffMs = Date.now() - new Date(lastSeenAt).getTime()
    if (diffMs / 1000 / 60 <= 3) return 'Gerade online'
    return `Zuletzt online vor: ${formatDuration(diffMs)}`
  }

  function formatDuration(diffMs) {
    const minutes = Math.floor(diffMs / 1000 / 60)
    if (minutes < 60) return `${minutes} Min.`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} Std.`
    const days = Math.floor(hours / 24)
    return `${days} Tag${days > 1 ? 'en' : ''}`
  }

  return (
    <>
      {error && <div className="error-box">{error}</div>}
      {loading && users.length === 0 && <div className="loading-dot">Lädt...</div>}
      {!loading && users.length === 0 && <p className="center-note">Keine Nutzer gefunden.</p>}

      {users.map((u) => (
        <div className="card" key={u.user_id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
            <div>
              <h3 style={{ margin: 0 }}>
                {u.display_name}
                {u.email === ADMIN_EMAIL && (
                  <span className="status-pill status-live" style={{ marginLeft: 8, fontSize: 10 }}>Admin</span>
                )}
              </h3>
              <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{u.kind === 'einwohner' ? 'Einwohner' : 'Betrieb'}</span>
            </div>
            <span className={`status-pill ${statusClass[u.account_status]}`}>
              {statusLabel[u.account_status]}
            </span>
          </div>
          <p style={{ margin: '4px 0', fontSize: 13, color: 'var(--ink-soft)' }}>{u.email}</p>
          <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--ink-soft)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <PresenceDot lastSeenAt={u.last_seen_at} />
            {formatLastSeen(u.last_seen_at)}
          </p>

          <div className="btn-row">
            <button className="btn btn-secondary" disabled={busyId === u.user_id || u.account_status === 'aktiv'} onClick={() => setStatus(u.user_id, 'aktiv')}>Aktiv</button>
            <button className="btn btn-secondary" disabled={busyId === u.user_id || u.account_status === 'beobachter'} onClick={() => setStatus(u.user_id, 'beobachter')}>Beobachter</button>
            <button className="btn btn-secondary" disabled={busyId === u.user_id || u.account_status === 'gesperrt'} onClick={() => setStatus(u.user_id, 'gesperrt')}>Sperren</button>
          </div>
        </div>
      ))}
    </>
  )
}

function GewerbeTab() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingId, setSavingId] = useState(null)

  useEffect(() => {
    loadEntries()
  }, [])

  async function loadEntries() {
    setLoading(true)
    setError('')
    const { data, error } = await supabase
      .from('business_profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setEntries(data || [])
    }
    setLoading(false)
  }

  async function updateStatus(id, newStatus) {
    setSavingId(id)
    const { error } = await supabase
      .from('business_profiles')
      .update({ status: newStatus })
      .eq('id', id)

    if (error) {
      setError(error.message)
    } else {
      setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, status: newStatus } : e)))
    }
    setSavingId(null)
  }

  return (
    <>
      {error && <div className="error-box">{error}</div>}
      {loading && <div className="loading-dot">Lädt...</div>}
      {!loading && entries.length === 0 && <p className="center-note">Noch keine Gewerbeanfragen vorhanden.</p>}

      {!loading && entries.map((entry) => (
        <div className="card" key={entry.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <h3 style={{ margin: 0 }}>{entry.company_name}</h3>
            <span className={`status-pill ${STATUS_CLASS[entry.status]}`}>
              {STATUS_OPTIONS.find((s) => s.value === entry.status)?.label}
            </span>
          </div>

          <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--ink-soft)' }}>
            Kategorie: {entry.category}
          </p>
          <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--ink-soft)' }}>
            Art: {entry.profile_kind === 'unternehmen' ? 'Unternehmen (Flip-Interesse)' : 'Anbieter'}
          </p>
          {entry.contact_person && (
            <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--ink-soft)' }}>
              Ansprechpartner: {entry.contact_person}
            </p>
          )}
          {entry.phone && (
            <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--ink-soft)' }}>
              Telefon: {entry.phone}
            </p>
          )}
          {entry.website && (
            <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--ink-soft)' }}>
              Website: {entry.website}
            </p>
          )}

          <div className="field" style={{ marginTop: 12, marginBottom: 0 }}>
            <label>Status ändern</label>
            <select
              value={entry.status}
              disabled={savingId === entry.id}
              onChange={(e) => updateStatus(entry.id, e.target.value)}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      ))}
    </>
  )
}

function ProdukteTab() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    loadProducts()
  }, [])

  async function loadProducts() {
    setLoading(true)
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) setError(error.message)
    setProducts(data || [])
    setLoading(false)
  }

  function handleFileChange(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function handleCreate(e) {
    e.preventDefault()
    setError('')
    setSaving(true)

    let imageUrl = null

    try {
      if (file) {
        const ext = file.name.split('.').pop()
        const path = `${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(path, file)

        if (uploadError) throw uploadError

        const { data } = supabase.storage.from('product-images').getPublicUrl(path)
        imageUrl = data.publicUrl
      }

      const { error: dbError } = await supabase.from('products').insert({
        name: name.trim(),
        description: description.trim() || null,
        price: parseFloat(price),
        image_url: imageUrl
      })

      if (dbError) throw dbError

      setName('')
      setDescription('')
      setPrice('')
      setFile(null)
      setPreview(null)
      loadProducts()
    } catch (err) {
      setError(err.message || 'Produkt konnte nicht angelegt werden.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(product) {
    setBusyId(product.id)
    const { error } = await supabase
      .from('products')
      .update({ active: !product.active })
      .eq('id', product.id)

    if (!error) {
      setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, active: !p.active } : p)))
    } else {
      setError(error.message)
    }
    setBusyId(null)
  }

  async function deleteProduct(product) {
    setBusyId(product.id)
    const { error } = await supabase.from('products').delete().eq('id', product.id)

    if (!error) {
      setProducts((prev) => prev.filter((p) => p.id !== product.id))
    } else {
      setError(error.message)
    }
    setBusyId(null)
  }

  return (
    <>
      {error && <div className="error-box">{error}</div>}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Neues Produkt anlegen</h3>
        <form onSubmit={handleCreate}>
          <div className="avatar-upload">
            <div className="avatar-preview" style={{ borderRadius: 10, width: 72, height: 72 }}>
              {preview ? <img src={preview} alt="Vorschau" /> : '📦'}
            </div>
            <div>
              <label className="link-text" htmlFor="productPhoto" style={{ cursor: 'pointer' }}>
                Foto auswählen
              </label>
              <input
                id="productPhoto"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <div className="hint">Optional</div>
            </div>
          </div>

          <div className="field">
            <label htmlFor="name">Name</label>
            <input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="price">Preis in €</label>
            <input id="price" type="number" step="0.01" min="0" required value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="description">Beschreibung</label>
            <textarea id="description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? 'Wird angelegt...' : 'Produkt anlegen'}
          </button>
        </form>
      </div>

      <h3 style={{ marginBottom: 10 }}>Vorhandene Produkte</h3>
      {loading && <div className="loading-dot">Lädt...</div>}
      {!loading && products.length === 0 && <p className="center-note">Noch keine Produkte angelegt.</p>}

      {!loading && products.map((product) => (
        <div className="card" key={product.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h3 style={{ margin: 0 }}>{product.name}</h3>
            <span className={`status-pill ${product.active ? 'status-live' : 'status-abgelehnt'}`}>
              {product.active ? 'Aktiv' : 'Inaktiv'}
            </span>
          </div>
          <p style={{ margin: '0 0 10px', fontSize: 14 }}>{product.price} €</p>

          <div className="btn-row">
            <button className="btn btn-secondary" onClick={() => toggleActive(product)} disabled={busyId === product.id}>
              {product.active ? 'Deaktivieren' : 'Aktivieren'}
            </button>
            <button className="btn btn-secondary" onClick={() => deleteProduct(product)} disabled={busyId === product.id}>
              Löschen
            </button>
          </div>
        </div>
      ))}
    </>
  )
}

function BestellungenTab() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingId, setSavingId] = useState(null)

  useEffect(() => {
    loadOrders()
  }, [])

  async function loadOrders() {
    setLoading(true)
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false })

    if (error) setError(error.message)
    setOrders(data || [])
    setLoading(false)
  }

  async function updateStatus(id, newStatus) {
    setSavingId(id)
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', id)

    if (!error) {
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o)))
    } else {
      setError(error.message)
    }
    setSavingId(null)
  }

  return (
    <>
      {error && <div className="error-box">{error}</div>}
      {loading && <div className="loading-dot">Lädt...</div>}
      {!loading && orders.length === 0 && <p className="center-note">Noch keine Bestellungen.</p>}

      {!loading && orders.map((order) => (
        <div className="card" key={order.id}>
          <p style={{ margin: '0 0 8px', fontWeight: 600 }}>
            {new Date(order.created_at).toLocaleString('de-DE')}
          </p>
          {order.order_items?.map((item) => (
            <p key={item.id} style={{ margin: '2px 0', fontSize: 14 }}>
              {item.quantity}× {item.product_name} ({item.unit_price} € / Stück)
            </p>
          ))}
          <p style={{ margin: '8px 0', fontSize: 13, color: 'var(--ink-soft)' }}>
            Lieferadresse: {order.delivery_address}
          </p>
          {order.note && (
            <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--ink-soft)' }}>Notiz: {order.note}</p>
          )}

          <div className="field" style={{ marginTop: 12, marginBottom: 0 }}>
            <label>Status ändern</label>
            <select
              value={order.status}
              disabled={savingId === order.id}
              onChange={(e) => updateStatus(order.id, e.target.value)}
            >
              {ORDER_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      ))}
    </>
  )
}
function ChannelsTab() {
  const [channels, setChannels] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    loadChannels()
  }, [])

  async function loadChannels() {
    setLoading(true)
    const { data, error } = await supabase.rpc('admin_list_channels')
    if (error) setError(error.message)
    setChannels(data || [])
    setLoading(false)
  }

  async function setStatus(channelId, newStatus) {
    setBusyId(channelId)
    const { error } = await supabase.rpc('admin_set_channel_status', { target_channel_id: channelId, new_status: newStatus })
    if (error) setError(error.message)
    else setChannels((prev) => prev.map((c) => (c.channel_id === channelId ? { ...c, status: newStatus } : c)))
    setBusyId(null)
  }

  return (
    <>
      {error && <div className="error-box">{error}</div>}
      {loading && <div className="loading-dot">Lädt...</div>}
      {!loading && channels.length === 0 && <p className="center-note">Noch keine Channels vorhanden.</p>}

      {channels.map((c) => (
        <div className="card" key={c.channel_id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
            <h3 style={{ margin: 0 }}>{c.name}</h3>
            <span className={`status-pill ${c.status === 'aktiv' ? 'status-live' : 'status-abgelehnt'}`}>
              {c.status === 'aktiv' ? 'Aktiv' : 'Deaktiviert'}
            </span>
          </div>
          <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--ink-soft)' }}>Erstellt von: @{c.creator_username}</p>
          {c.report_count > 0 && (
            <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--danger)', fontWeight: 600 }}>
              {c.report_count} Meldung{c.report_count > 1 ? 'en' : ''}
            </p>
          )}
          <div className="btn-row">
            <button className="btn btn-secondary" disabled={busyId === c.channel_id || c.status === 'aktiv'} onClick={() => setStatus(c.channel_id, 'aktiv')}>Aktivieren</button>
            <button className="btn btn-secondary" disabled={busyId === c.channel_id || c.status === 'deaktiviert'} onClick={() => setStatus(c.channel_id, 'deaktiviert')}>Deaktivieren</button>
          </div>
        </div>
      ))}
    </>
  )
}
