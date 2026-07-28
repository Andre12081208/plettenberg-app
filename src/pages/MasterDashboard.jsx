import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const METRIC_REGISTRY = [
  { key: 'einwohner_anzahl', label: 'Anzahl Einwohner', type: 'number' },
  { key: 'gewerbe_anzahl', label: 'Anzahl Gewerbebetriebe', type: 'number' },
  { key: 'gewerbe_live_anzahl', label: 'Anzahl Betriebe (live)', type: 'number' },
  { key: 'gewerbe_basis_anzahl', label: 'Anzahl Betriebe mit Basis-Paket', type: 'number' },
  { key: 'bestellungen_offen', label: 'Offene Bestellungen', type: 'number' },
  { key: 'anfragen_offen', label: 'Offene Anfragen', type: 'number' },
  { key: 'termine_kommend', label: 'Anstehende gebuchte Termine', type: 'number' },
  { key: 'neue_nutzer_30tage', label: 'Neue Nutzer (30 Tage)', type: 'number' },
  { key: 'gewerbe_nach_kategorie', label: 'Betriebe nach Kategorie', type: 'breakdown' },
  { key: 'bestellungen_nach_status', label: 'Bestellungen nach Status', type: 'breakdown' },
  { key: 'anfragen_nach_status', label: 'Anfragen nach Status', type: 'breakdown' },
  { key: 'nutzer_nach_typ', label: 'Nutzer: Einwohner vs. Gewerbe', type: 'breakdown' }
]

const PIE_COLORS = ['#1F4D3D', '#3A7A5E', '#6FA98A', '#A8C9B5', '#D9E5DD', '#C4704F', '#8C5A3C']

function metricInfo(key) {
  return METRIC_REGISTRY.find((m) => m.key === key)
}

function BarChart({ data, showTotal }) {
  const fullData = showTotal
    ? [...data, { label: 'Gesamt', value: data.reduce((sum, d) => sum + d.value, 0), isTotal: true }]
    : data
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
    return `${PIE_COLORS[i % PIE_COLORS.length]} ${start}deg ${end}deg`
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
      <div style={{ width: 110, height: 110, borderRadius: '50%', background: `conic-gradient(${parts.join(', ')})`, flexShrink: 0 }} />
      <div>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: PIE_COLORS[i % PIE_COLORS.length], display: 'inline-block' }} />
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

export default function MasterDashboard({ hasPrivateProfile, hasBusinessProfile, onChooseMode }) {
  const [tiles, setTiles] = useState([])
  const [tileValues, setTileValues] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)

  const [title, setTitle] = useState('')
  const [metric1, setMetric1] = useState('einwohner_anzahl')
  const [metric2, setMetric2] = useState('')
  const [combineMode, setCombineMode] = useState('einzeln')
  const [vizType, setVizType] = useState('zahl')
  const [gaugeLow, setGaugeLow] = useState('')
  const [gaugeHigh, setGaugeHigh] = useState('')
  const [showTotal, setShowTotal] = useState(false)
  const [saving, setSaving] = useState(false)

  const info1 = metricInfo(metric1)
  const isNumberMetric = info1?.type === 'number'
  const vizOptions = isNumberMetric ? ['zahl', 'ampel'] : ['balken', 'kreis']

  useEffect(() => {
    loadTiles()
  }, [])

  useEffect(() => {
    if (!vizOptions.includes(vizType)) setVizType(vizOptions[0])
    // eslint-disable-next-line
  }, [metric1])

  async function loadTiles() {
    setLoading(true)
    setError('')

    const { data, error: tilesError } = await supabase
      .from('dashboard_tiles')
      .select('*')
      .order('sort_order', { ascending: true })

    if (tilesError) {
      setError(tilesError.message)
      setLoading(false)
      return
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
    const { data: val1 } = await supabase.rpc('get_dashboard_metric', { metric_key: tile.metric_key_1 })

    if (tile.metric_key_2 && tile.combine_mode !== 'einzeln') {
      const { data: val2 } = await supabase.rpc('get_dashboard_metric', { metric_key: tile.metric_key_2 })
      if (tile.combine_mode === 'summe') return Number(val1 || 0) + Number(val2 || 0)
      if (tile.combine_mode === 'differenz') return Number(val1 || 0) - Number(val2 || 0)
    }

    return val1
  }

  async function createTile(e) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    setError('')

    const { error: insertError } = await supabase.from('dashboard_tiles').insert({
      owner_id: (await supabase.auth.getUser()).data.user.id,
      title: title.trim(),
      metric_key_1: metric1,
      metric_key_2: isNumberMetric && metric2 ? metric2 : null,
      combine_mode: isNumberMetric && metric2 ? combineMode : 'einzeln',
      viz_type: vizType,
      gauge_low: vizType === 'ampel' && gaugeLow !== '' ? Number(gaugeLow) : null,
      gauge_high: vizType === 'ampel' && gaugeHigh !== '' ? Number(gaugeHigh) : null,
      show_total: vizType === 'balken' ? showTotal : false,
      sort_order: tiles.length
    })

    if (insertError) {
      setError(insertError.message)
    } else {
      setTitle('')
      setMetric1('einwohner_anzahl')
      setMetric2('')
      setCombineMode('einzeln')
      setVizType('zahl')
      setGaugeLow('')
      setGaugeHigh('')
      setShowTotal(false)
      setShowForm(false)
      loadTiles()
    }
    setSaving(false)
  }

  async function deleteTile(id) {
    await supabase.from('dashboard_tiles').delete().eq('id', id)
    setTiles((prev) => prev.filter((t) => t.id !== id))
  }

  function renderTileContent(tile) {
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
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>Master Dashboard</h1>
      </div>
      <main style={{ paddingBottom: 90 }}>
        {error && <div className="error-box">{error}</div>}

        <div className="btn-row" style={{ marginBottom: 16 }}>
          <button className="btn btn-secondary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Abbrechen' : '+ Kachel hinzufügen'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={createTile} className="card">
            <div className="field">
              <label htmlFor="tileTitle">Titel</label>
              <input id="tileTitle" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z.B. Nutzer gesamt" />
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

            {isNumberMetric && metric2 && (
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
                Zusätzlichen "Gesamt"-Balken anzeigen (Summe aller Werte)
              </label>
            )}

            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Wird angelegt...' : 'Kachel anlegen'}
            </button>
          </form>
        )}

        {loading && <div className="loading-dot">Lädt...</div>}
        {!loading && tiles.length === 0 && !showForm && (
          <p className="center-note">Noch keine Kacheln angelegt.</p>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {!loading && tiles.map((tile) => (
            <div className="card" key={tile.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <h3 style={{ margin: 0, fontSize: 15 }}>{tile.title}</h3>
                <button className="link-text" onClick={() => deleteTile(tile.id)}>Löschen</button>
              </div>
              {renderTileContent(tile)}
            </div>
          ))}
        </div>
      </main>

      <nav className="tab-bar">
        {hasPrivateProfile && (
          <button className="tab-bar-item" onClick={() => onChooseMode('private')}>
            <span className="tab-bar-icon">🧑</span>
            Einwohner
          </button>
        )}
        {hasBusinessProfile && (
          <button className="tab-bar-item" onClick={() => onChooseMode('business')}>
            <span className="tab-bar-icon">🏬</span>
            Gewerbe
          </button>
        )}
        <button className="tab-bar-item" onClick={() => onChooseMode('admin')}>
          <span className="tab-bar-icon">🛠️</span>
          Verwaltung
        </button>
      </nav>
    </div>
  )
}
