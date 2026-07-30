import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const METRIC_REGISTRY = [
  { key: 'bestellungen_offen', label: 'Offene Bestellungen', type: 'number' },
  { key: 'bestellungen_gesamt', label: 'Bestellungen gesamt', type: 'number' },
  { key: 'anfragen_offen', label: 'Offene Anfragen', type: 'number' },
  { key: 'anfragen_gesamt', label: 'Anfragen gesamt', type: 'number' },
  { key: 'termine_kommend', label: 'Anstehende gebuchte Termine', type: 'number' },
  { key: 'angebote_aktiv', label: 'Aktive Angebote', type: 'number' },
  { key: 'bestellungen_nach_status', label: 'Bestellungen nach Status', type: 'breakdown' },
  { key: 'anfragen_nach_status', label: 'Anfragen nach Status', type: 'breakdown' }
]

const PIE_COLORS = ['#1F4D3D', '#3A7A5E', '#6FA98A', '#A8C9B5', '#D9E5DD', '#C4704F', '#8C5A3C']

function metricInfo(key) {
  return METRIC_REGISTRY.find((m) => m.key === key)
}

function BarChart({ data, showTotal }) {
  const totalValue = data.reduce((sum, d) => sum + d.value, 0)
  const fullData = showTotal ? [{ label: 'Gesamt', value: totalValue, isTotal: true }, ...data] : data
  const max = Math.max(...fullData.map((d) => d.value), 1)

  return (
    <div>
      {fullData.map((d, i) => (
        <div key={i} style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 3 }}>
            <span style={{ fontWeight: d.isTotal ? 700 : 400 }}>{d.label}</span>
            <span style={{ fontWeight: 600 }}>{d.value}</span>
          </div>
          <div style={{ height: 10, borderRadius: 5, background: 'var(--line)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(d.value / max) * 100}%`, background: d.isTotal ? 'var(--clay)' : 'var(--forest)', borderRadius: 5 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function PieChart({ data }) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1
  let cumulative = 0
  const parts = data.map((d, i) => {
    const start = (cumulative / total) * 360
    cumulative += d.value
    const end = (cumulative / total) * 360
    return `${d.color || PIE_COLORS[i % PIE_COLORS.length]} ${start}deg ${end}deg`
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
      <div style={{ width: 110, height: 110, borderRadius: '50%', background: `conic-gradient(${parts.join(', ')})`, flexShrink: 0 }} />
      <div>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: d.color || PIE_COLORS[i % PIE_COLORS.length], display: 'inline-block' }} />
            {d.label}: {d.value}
          </div>
        ))}
      </div>
    </div>
  )
}

function Ampel({ value, low, high }) {
  let color = 'var(--forest)'
  let label = 'Gut'
  if (value < (low ?? 0)) { color = '#A3402F'; label = 'Kritisch' }
  else if (value < (high ?? 0)) { color = '#C89B3C'; label = 'Beachten' }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ width: 22, height: 22, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <div>
        <p style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>{value}</p>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-soft)' }}>{label}</p>
      </div>
    </div>
  )
}

const STATUS_EXPLANATION = {
  in_pruefung: 'Dein Profil wird gerade von unserem Team geprüft.',
  vertrag_in_arbeit: 'Der Vertrag mit dir wird gerade fertiggemacht.',
  abgelehnt: 'Dein Profil wurde aktuell nicht freigeschaltet.'
}

function ProfileStatusTile({ profile, isLive }) {
  const [addons, setAddons] = useState([])
  const [hasChannel, setHasChannel] = useState(false)
  const [hasTerminProduct, setHasTerminProduct] = useState(false)

  useEffect(() => {
    loadExtras()
    // eslint-disable-next-line
  }, [])

  async function loadExtras() {
    const [{ data: addonRows }, { data: channelRow }, { data: terminRow }] = await Promise.all([
      supabase.from('business_addons').select('addon_key').eq('business_profile_id', profile.id),
      supabase.from('channels').select('id').eq('created_by', profile.id).limit(1).maybeSingle(),
      supabase.from('business_products').select('id').eq('business_profile_id', profile.id).eq('sale_mode', 'termin').eq('active', true).limit(1).maybeSingle()
    ])
    setAddons((addonRows || []).map((a) => a.addon_key))
    setHasChannel(!!channelRow)
    setHasTerminProduct(!!terminRow)
  }

  const isBasisLive = isLive && profile.plan === 'basis'

  const items = [
    ...(profile.plan === 'basis' ? [{ key: 'basis', label: 'Basis-Seite (virtueller Laden)', live: isBasisLive }] : []),
    ...(addons.includes('channel') ? [{ key: 'channel', label: 'Eigener Channel', live: isLive && hasChannel }] : []),
    ...(addons.includes('termine') ? [{ key: 'termine', label: 'Termine', live: isLive && hasTerminProduct }] : []),
    ...(addons.includes('raum') ? [{ key: 'raum', label: 'Virtueller Raum', live: isLive && !!profile.room_image_url }] : [])
  ]

  return (
    <>
      <p style={{ margin: items.length > 0 ? '0 0 12px' : 0, fontSize: 14 }}>
        Dein Profil ist öffentlich sichtbar. {isLive ? '✅' : '❌'}
      </p>

      {items.map((item) => (
        <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderTop: '1px solid var(--line)' }}>
          <span>{item.label}</span>
          <span style={{ color: item.live ? 'var(--forest)' : 'var(--ink-soft)', fontWeight: 600 }}>
            {item.live ? '✅ Live' : '⚪ Noch nicht eingerichtet'}
          </span>
        </div>
      ))}
    </>
  )
}

const WIDTH_LABELS = { voll: 'Volle Breite', halb: 'Halbe Breite', drittel: 'Drittelbreite', viertel: 'Viertelbreite' }

export default function BusinessOverview({ profile }) {
  const [tiles, setTiles] = useState([])
  const [tileValues, setTileValues] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editingTileId, setEditingTileId] = useState(null)
  const [showWhyModal, setShowWhyModal] = useState(false)

  const [title, setTitle] = useState('')
  const [metric1, setMetric1] = useState('bestellungen_offen')
  const [metric2, setMetric2] = useState('')
  const [combineMode, setCombineMode] = useState('summe')
  const [vizType, setVizType] = useState('zahl')
  const [gaugeLow, setGaugeLow] = useState('')
  const [gaugeHigh, setGaugeHigh] = useState('')
  const [showTotal, setShowTotal] = useState(false)
  const [tileWidth, setTileWidth] = useState('voll')
  const [saving, setSaving] = useState(false)

  const isLive = profile.status === 'live'
  const info1 = metricInfo(metric1)
  const isNumberMetric = info1?.type === 'number'
  const vizOptions = isNumberMetric
    ? (metric2 ? ['zahl', 'ampel', 'balken'] : ['zahl', 'ampel'])
    : ['balken', 'kreis']

  useEffect(() => {
    if (isLive) loadTiles()
    else setLoading(false)
    // eslint-disable-next-line
  }, [])

  useEffect(() => {
    if (!vizOptions.includes(vizType)) setVizType(vizOptions[0])
    // eslint-disable-next-line
  }, [metric1, metric2])

  async function loadTiles() {
    setLoading(true)
    setError('')

    let { data, error: tilesError } = await supabase
      .from('business_dashboard_tiles')
      .select('*')
      .eq('business_profile_id', profile.id)
      .order('sort_order', { ascending: true })

    if (tilesError) {
      setError(tilesError.message)
      setLoading(false)
      return
    }

    if (!(data || []).some((t) => t.viz_type === 'status')) {
      const { data: created } = await supabase.from('business_dashboard_tiles').insert({
        business_profile_id: profile.id,
        title: 'Profil-Status',
        metric_key_1: 'profile_status',
        viz_type: 'status',
        tile_width: 'voll',
        sort_order: -1
      }).select('*').single()

      if (created) data = [created, ...(data || [])]
    }

    setTiles(data || [])

    const values = {}
    for (const tile of data || []) {
      values[tile.id] = await computeTileValue(tile)
    }
    setTileValues(values)
    setLoading(false)
  }

  async function computeTileValue(tile) {
    if (tile.viz_type === 'status') return true

    const { data: val1 } = await supabase.rpc('get_business_dashboard_metric', { metric_key: tile.metric_key_1 })

    if (tile.viz_type === 'balken' && tile.metric_key_2) {
      const { data: val2 } = await supabase.rpc('get_business_dashboard_metric', { metric_key: tile.metric_key_2 })
      return [
        { label: metricInfo(tile.metric_key_1)?.label || tile.metric_key_1, value: Number(val1 || 0) },
        { label: metricInfo(tile.metric_key_2)?.label || tile.metric_key_2, value: Number(val2 || 0) }
      ]
    }

    if (tile.metric_key_2 && tile.combine_mode !== 'einzeln') {
      const { data: val2 } = await supabase.rpc('get_business_dashboard_metric', { metric_key: tile.metric_key_2 })
      if (tile.combine_mode === 'summe') return Number(val1 || 0) + Number(val2 || 0)
      if (tile.combine_mode === 'differenz') return Number(val1 || 0) - Number(val2 || 0)
    }

    return val1
  }

  function resetForm() {
    setTitle('')
    setMetric1('bestellungen_offen')
    setMetric2('')
    setCombineMode('summe')
    setVizType('zahl')
    setGaugeLow('')
    setGaugeHigh('')
    setShowTotal(false)
    setTileWidth('voll')
    setEditingTileId(null)
  }

  function startEdit(tile) {
    setTitle(tile.title)
    setMetric1(tile.metric_key_1)
    setMetric2(tile.metric_key_2 || '')
    setCombineMode(tile.combine_mode || 'summe')
    setVizType(tile.viz_type)
    setGaugeLow(tile.gauge_low ?? '')
    setGaugeHigh(tile.gauge_high ?? '')
    setShowTotal(!!tile.show_total)
    setTileWidth(tile.tile_width || 'voll')
    setEditingTileId(tile.id)
    setShowForm(true)
  }

  async function saveTile(e) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    setError('')

    const payload = {
      title: title.trim(),
      metric_key_1: metric1,
      metric_key_2: isNumberMetric && metric2 ? metric2 : null,
      combine_mode: isNumberMetric && metric2 && vizType !== 'balken' ? combineMode : 'einzeln',
      viz_type: vizType,
      gauge_low: vizType === 'ampel' && gaugeLow !== '' ? Number(gaugeLow) : null,
      gauge_high: vizType === 'ampel' && gaugeHigh !== '' ? Number(gaugeHigh) : null,
      show_total: vizType === 'balken' ? showTotal : false,
      tile_width: tileWidth
    }

    const { error: saveError } = editingTileId
      ? await supabase.from('business_dashboard_tiles').update(payload).eq('id', editingTileId)
      : await supabase.from('business_dashboard_tiles').insert({
          ...payload,
          business_profile_id: profile.id,
          sort_order: tiles.length
        })

    if (saveError) {
      setError(saveError.message)
    } else {
      resetForm()
      setShowForm(false)
      loadTiles()
    }
    setSaving(false)
  }

  async function deleteTile(id) {
    await supabase.from('business_dashboard_tiles').delete().eq('id', id)
    setTiles((prev) => prev.filter((t) => t.id !== id))
  }

  async function moveTile(index, direction) {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= tiles.length) return

    const current = tiles[index]
    const swapped = tiles[newIndex]

    const newTiles = [...tiles]
    newTiles[index] = swapped
    newTiles[newIndex] = current
    setTiles(newTiles)

    await Promise.all([
      supabase.from('business_dashboard_tiles').update({ sort_order: newIndex }).eq('id', current.id),
      supabase.from('business_dashboard_tiles').update({ sort_order: index }).eq('id', swapped.id)
    ])
  }

  function renderTileContent(tile) {
    if (tile.viz_type === 'status') {
      return <ProfileStatusTile profile={profile} isLive={isLive} />
    }

    const value = tileValues[tile.id]
    if (value == null) return <p className="center-note">Keine Daten.</p>

    if (tile.viz_type === 'zahl') {
      return <p style={{ margin: 0, fontSize: 32, fontWeight: 700, color: 'var(--forest)' }}>{value}</p>
    }
    if (tile.viz_type === 'ampel') {
      return <Ampel value={value} low={tile.gauge_low} high={tile.gauge_high} />
    }
    if (tile.viz_type === 'balken') {
      return Array.isArray(value) ? <BarChart data={value} showTotal={tile.show_total} /> : <p className="center-note">Keine Daten.</p>
    }
    if (tile.viz_type === 'kreis') {
      return Array.isArray(value) ? <PieChart data={value} /> : <p className="center-note">Keine Daten.</p>
    }
    return null
  }

  return (
    <>
      <div className="topbar">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div>
            <div className="mark">Plettenberg</div>
            <h1>Admin Dashboard</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ margin: 0 }}>{profile.company_name}</h1>
              <button
                className={`status-pill ${isLive ? 'status-live' : 'status-abgelehnt'}`}
                style={{ border: 'none', cursor: isLive ? 'default' : 'pointer' }}
                onClick={() => { if (!isLive) setShowWhyModal(true) }}
              >
                {isLive ? 'Live' : 'Nicht live'}
              </button>
            </div>
            <div className="avatar-preview" style={{ width: 56, height: 56, flexShrink: 0 }}>
              {profile.logo_url ? <img src={profile.logo_url} alt="" /> : '🏬'}
            </div>
          </div>
        </div>
        {profile.account_status === 'beobachter' && (
          <div className="error-box" style={{ background: '#FCEFE1', color: 'var(--clay)', borderColor: 'var(--clay)' }}>
            Beobachter-Modus: Du kannst aktuell nichts schreiben oder senden.
          </div>
        )}
      </div>
      <main style={{ paddingBottom: 90 }}>
        {isLive && (
          <>
            <div className="btn-row" style={{ marginBottom: 16 }}>
              <button className="btn btn-secondary" onClick={() => { if (showForm) resetForm(); setShowForm(!showForm) }}>
                {showForm ? 'Abbrechen' : '+ Kachel hinzufügen'}
              </button>
              <button className="btn btn-secondary" onClick={() => setEditMode(!editMode)}>
                {editMode ? 'Fertig' : 'Ansicht bearbeiten'}
              </button>
            </div>

            {error && <div className="error-box">{error}</div>}

            {showForm && (
              <form onSubmit={saveTile} className="card">
                <h3 style={{ marginTop: 0 }}>{editingTileId ? 'Kachel bearbeiten' : 'Neue Kachel'}</h3>
                <div className="field">
                  <label htmlFor="tileTitle">Titel</label>
                  <input id="tileTitle" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z.B. Offene Bestellungen" />
                </div>

                <div className="field">
                  <label htmlFor="metric1">Datenquelle 1</label>
                  <select id="metric1" value={metric1} onChange={(e) => setMetric1(e.target.value)}>
                    {METRIC_REGISTRY.map((m) => (
                      <option key={m.key} value={m.key}>{m.label}</option>
                    ))}
                  </select>
                </div>

                {isNumberMetric && (
                  <div className="field">
                    <label htmlFor="metric2">Datenquelle 2 (optional)</label>
                    <select id="metric2" value={metric2} onChange={(e) => setMetric2(e.target.value)}>
                      <option value="">– keine –</option>
                      {METRIC_REGISTRY.filter((m) => m.type === 'number' && m.key !== metric1).map((m) => (
                        <option key={m.key} value={m.key}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {isNumberMetric && metric2 && vizType !== 'balken' && (
                  <div className="field">
                    <label htmlFor="combineMode">Verknüpfung</label>
                    <select id="combineMode" value={combineMode} onChange={(e) => setCombineMode(e.target.value)}>
                      <option value="summe">Summe (1 + 2)</option>
                      <option value="differenz">Differenz (1 − 2)</option>
                    </select>
                  </div>
                )}

                <div className="field">
                  <label htmlFor="vizType">Darstellung</label>
                  <select id="vizType" value={vizType} onChange={(e) => setVizType(e.target.value)}>
                    {vizOptions.map((v) => (
                      <option key={v} value={v}>
                        {v === 'zahl' ? 'Zahl' : v === 'ampel' ? 'Ampel' : v === 'balken' ? 'Balkendiagramm' : 'Kreisdiagramm'}
                      </option>
                    ))}
                  </select>
                </div>

                {vizType === 'ampel' && (
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div className="field" style={{ flex: 1 }}>
                      <label htmlFor="gaugeLow">Rot unter</label>
                      <input id="gaugeLow" type="number" value={gaugeLow} onChange={(e) => setGaugeLow(e.target.value)} />
                    </div>
                    <div className="field" style={{ flex: 1 }}>
                      <label htmlFor="gaugeHigh">Grün ab</label>
                      <input id="gaugeHigh" type="number" value={gaugeHigh} onChange={(e) => setGaugeHigh(e.target.value)} />
                    </div>
                  </div>
                )}

                {vizType === 'balken' && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <input type="checkbox" checked={showTotal} onChange={(e) => setShowTotal(e.target.checked)} />
                    Zusätzlichen "Gesamt"-Balken oben anzeigen
                  </label>
                )}

                <div className="field">
                  <label htmlFor="tileWidth">Kachelgröße</label>
                  <select id="tileWidth" value={tileWidth} onChange={(e) => setTileWidth(e.target.value)}>
                    {Object.entries(WIDTH_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                <div className="btn-row">
                  <button className="btn btn-primary" type="submit" disabled={saving}>
                    {saving ? 'Wird gespeichert...' : editingTileId ? 'Speichern' : 'Kachel anlegen'}
                  </button>
                  {editingTileId && (
                    <button className="btn btn-secondary" type="button" onClick={() => { resetForm(); setShowForm(false) }}>
                      Abbrechen
                    </button>
                  )}
                </div>
              </form>
            )}

            {loading && <div className="loading-dot">Lädt...</div>}

            <div className="dashboard-grid">
              {!loading && tiles.map((tile, index) => (
                <div className={`card tile-${tile.tile_width || 'voll'}`} key={tile.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <h3 className="dashboard-tile-title">{tile.title}</h3>
                    {editMode && (
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <button className="link-text" style={{ fontSize: 15 }} disabled={index === 0} onClick={() => moveTile(index, -1)}>‹</button>
                        <button className="link-text" style={{ fontSize: 15 }} disabled={index === tiles.length - 1} onClick={() => moveTile(index, 1)}>›</button>
                        {tile.viz_type !== 'status' && (
                          <button className="link-text" onClick={() => startEdit(tile)}>Bearbeiten</button>
                        )}
                        <button className="link-text" onClick={() => deleteTile(tile.id)}>Löschen</button>
                      </div>
                    )}
                  </div>
                  {renderTileContent(tile)}
                </div>
              ))}
            </div>
          </>
        )}

        {!isLive && (
          <div className="card">
            <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: 14 }}>
              {profile.status === 'in_pruefung' && 'Wir melden uns bei dir, sobald dein Profil geprüft wurde und ein Vertrag zustande kommt.'}
              {profile.status === 'vertrag_in_arbeit' && 'Der Vertrag wird gerade fertiggemacht. Danach schalten wir dein Profil live.'}
              {profile.status === 'abgelehnt' && 'Dein Profil wurde aktuell nicht freigeschaltet.'}
            </p>
          </div>
        )}

        {showWhyModal && (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}
            onClick={() => setShowWhyModal(false)}
          >
            <div className="card" style={{ maxWidth: 360, width: '100%' }} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ marginTop: 0 }}>Warum ist mein Profil nicht live?</h3>
              <p style={{ fontSize: 14 }}>{STATUS_EXPLANATION[profile.status] || 'Der Status ist gerade nicht "live".'}</p>
              <a
                className="btn btn-primary"
                style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginBottom: 8 }}
                href={`mailto:andremanuel.koenig@gmail.com?subject=${encodeURIComponent('Frage zu meinem Profil-Status')}&body=${encodeURIComponent('Betrieb: ' + profile.company_name)}`}
              >
                Support kontaktieren
              </a>
              <button className="btn btn-secondary" onClick={() => setShowWhyModal(false)}>Schließen</button>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
