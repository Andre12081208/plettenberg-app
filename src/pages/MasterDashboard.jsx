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
  { key: 'nutzer_nach_typ', label: 'Nutzer: Einwohner vs. Gewerbe', type: 'breakdown' },
  { key: 'einwohner_aktivitaet', label: 'Einwohner-Aktivität (24h/7T/30T/älter)', type: 'breakdown' },
  { key: 'einwohner_wachstum', label: 'Neue Einwohner (Wachstum über Zeit)', type: 'wachstum' }
]

const PIE_COLORS = ['#1F4D3D', '#3A7A5E', '#6FA98A', '#A8C9B5', '#D9E5DD', '#C4704F', '#8C5A3C']

function metricInfo(key) {
  return METRIC_REGISTRY.find((m) => m.key === key)
}

function BarChart({ data, showTotal }) {
  const totalValue = data.reduce((sum, d) => sum + d.value, 0)
  const fullData = showTotal
    ? [{ label: 'Gesamt', value: totalValue, isTotal: true }, ...data]
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

function PieChart({ data, showCumulativeRates }) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1
  let cumulative = 0
  const parts = data.map((d, i) => {
    const start = (cumulative / total) * 360
    cumulative += d.value
    const end = (cumulative / total) * 360
    return `${d.color || PIE_COLORS[i % PIE_COLORS.length]} ${start}deg ${end}deg`
  })

  let runningCount = 0

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
      <div style={{ width: 110, height: 110, borderRadius: '50%', background: `conic-gradient(${parts.join(', ')})`, flexShrink: 0 }} />
      <div>
        {data.map((d, i) => {
          runningCount += d.value
          const rate = Math.round((runningCount / total) * 100)
          const isLast = i === data.length - 1
          return (
          <div key={i} style={{ marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: d.color || PIE_COLORS[i % PIE_COLORS.length], display: 'inline-block' }} />
            {d.label}: {d.value}
          </div>
          {showCumulativeRates && !isLast && (
            <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginLeft: 16, marginTop: 2 }}>
              Rate: {rate}%
            </div>
          )}
          </div>
          )
        })}
      </div>
    </div>
  )
}

function Wachstum({ data }) {
  const [selectedWindow, setSelectedWindow] = useState(30)

  const windowMap = {
    7: data.windows.find((w) => w.label === 'Letzte 7 Tage')?.value || 0,
    30: data.windows.find((w) => w.label === 'Letzte 30 Tage')?.value || 0,
    180: data.windows.find((w) => w.label === 'Letzte 180 Tage')?.value || 0,
    365: data.windows.find((w) => w.label === 'Letzte 365 Tage')?.value || 0
  }

  const avg = windowMap[selectedWindow] / selectedWindow
  const avgLabel = avg.toFixed(2)

  let avgColor = '#A3402F'
  if (avg >= 1.5) avgColor = 'var(--forest)'
  else if (avg >= 1) avgColor = '#C89B3C'

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 10, paddingBottom: 12, borderBottom: '1px solid var(--line)' }}>
        <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: avgColor }}>Ø {avgLabel}</p>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-soft)' }}>Ø neue Einwohner pro Tag (letzte {selectedWindow} Tage)</p>
        <div className="btn-row" style={{ justifyContent: 'center', marginTop: 8, flexWrap: 'wrap' }}>
          {[7, 30, 180, 365].map((w) => (
            <button
              key={w}
              className={selectedWindow === w ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ width: 'auto', padding: '6px 12px', fontSize: 12 }}
              onClick={() => setSelectedWindow(w)}
            >
              {w} Tage
            </button>
          ))}
        </div>
      </div>
      {data.windows.map((w, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '4px 0' }}>
          <span>{w.label}</span>
          <span style={{ fontWeight: 600 }}>{w.value}</span>
        </div>
      ))}
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

const PROJECT_BIRTH = new Date(2026, 6, 22, 9, 30, 0)
const MS_PER_SECOND = 1000
const MS_PER_MINUTE = MS_PER_SECOND * 60
const MS_PER_HOUR = MS_PER_MINUTE * 60
const MS_PER_DAY = MS_PER_HOUR * 24
const MS_PER_WEEK = MS_PER_DAY * 7
const MS_PER_MONTH = MS_PER_DAY * 30.44
const MS_PER_YEAR = MS_PER_DAY * 365.25

const UNIT_BUTTONS = [
  { key: 'sek', label: 'Sek.' },
  { key: 'min', label: 'Min.' },
  { key: 'std', label: 'Std.' },
  { key: 'tage', label: 'T.' },
  { key: 'wochen', label: 'W.' },
  { key: 'monate', label: 'M.' },
  { key: 'jahre', label: 'J.' }
]

function ProjectAgeClock() {
  const [now, setNow] = useState(() => new Date())
  const [unit, setUnit] = useState(null)

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const elapsedMs = Math.max(0, now.getTime() - PROJECT_BIRTH.getTime())

  const isWeeklyAnniversary = now.getDay() === 3
  const isMonthlyAnniversary = now.getDate() === 22
  const isYearlyAnniversary = now.getMonth() === 6 && now.getDate() === 22
  const ageInYears = now.getFullYear() - PROJECT_BIRTH.getFullYear()

  const DEFAULT_COLOR = '#D9E5DD'
  let tageColor = DEFAULT_COLOR
  let stdColor = DEFAULT_COLOR
  let minColor = DEFAULT_COLOR
  let sekColor = DEFAULT_COLOR

  if (isYearlyAnniversary) {
    tageColor = '#FF6B6B'
    stdColor = '#FFD93D'
    minColor = '#6BCB77'
    sekColor = '#4D96FF'
  } else if (isMonthlyAnniversary) {
    tageColor = '#E3CE8C'
  } else if (isWeeklyAnniversary) {
    tageColor = '#A9C7E8'
  }

  let unitDisplay = null
  if (unit === 'sek') {
    unitDisplay = `${Math.floor(elapsedMs / MS_PER_SECOND).toLocaleString('de-DE')} Sek.`
  } else if (unit === 'min') {
    unitDisplay = `${Math.floor(elapsedMs / MS_PER_MINUTE).toLocaleString('de-DE')} Min.`
  } else if (unit === 'std') {
    unitDisplay = `${Math.floor(elapsedMs / MS_PER_HOUR).toLocaleString('de-DE')} Std.`
  } else if (unit === 'tage') {
    unitDisplay = `${Math.floor(elapsedMs / MS_PER_DAY).toLocaleString('de-DE')} Tage`
  } else if (unit === 'wochen') {
    unitDisplay = `${(elapsedMs / MS_PER_WEEK).toFixed(2)} Wochen`
  } else if (unit === 'monate') {
    unitDisplay = `${(elapsedMs / MS_PER_MONTH).toFixed(2)} Monate`
  } else if (unit === 'jahre') {
    unitDisplay = `${(elapsedMs / MS_PER_YEAR).toFixed(2)} Jahre`
  }

  const days = Math.floor(elapsedMs / MS_PER_DAY)
  const hours = Math.floor((elapsedMs % MS_PER_DAY) / MS_PER_HOUR)
  const minutes = Math.floor((elapsedMs % MS_PER_HOUR) / MS_PER_MINUTE)
  const seconds = Math.floor((elapsedMs % MS_PER_MINUTE) / MS_PER_SECOND)

  return (
    <div style={{ width: '100%', marginTop: 10 }}>
      <div
        style={{
          width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 4,
          background: 'var(--forest)', fontFamily: 'monospace',
          fontSize: 13, fontWeight: 600, letterSpacing: '0.05em', padding: '6px 10px',
          borderRadius: 8, whiteSpace: 'nowrap'
        }}
      >
        {unit ? (
          <span style={{ color: DEFAULT_COLOR }}>{unitDisplay}</span>
        ) : (
          <>
            <span style={{ color: tageColor }}>{days}T</span>
            <span style={{ color: stdColor }}>{String(hours).padStart(2, '0')}</span>
            <span style={{ color: DEFAULT_COLOR }}>:</span>
            <span style={{ color: minColor }}>{String(minutes).padStart(2, '0')}</span>
            <span style={{ color: DEFAULT_COLOR }}>:</span>
            <span style={{ color: sekColor }}>{String(seconds).padStart(2, '0')}</span>
          </>
        )}
      </div>
      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 }}>
        {UNIT_BUTTONS.map((u) => (
          <button
            key={u.key}
            onClick={() => setUnit((prev) => (prev === u.key ? null : u.key))}
            style={{
              fontSize: 10, padding: '2px 5px', borderRadius: 5, border: '1px solid var(--line)',
              background: unit === u.key ? 'var(--forest)' : 'transparent',
              color: unit === u.key ? '#fff' : 'var(--ink-soft)',
              cursor: 'pointer'
            }}
          >
            {u.label}
          </button>
        ))}
      </div>
      {isYearlyAnniversary && (
        <p style={{ textAlign: 'center', marginTop: 8, fontSize: 13 }}>
          🎂 Alles Gute zum {ageInYears}. Geburtstag, Plettenberg App!
        </p>
      )}
    </div>
  )
}

export default function MasterDashboard({ hasPrivateProfile, hasBusinessProfile, onChooseMode }) {
  const [adminUnreadIdeaCount, setAdminUnreadIdeaCount] = useState(0)

  useEffect(() => {
    supabase.rpc('get_admin_unread_idea_count').then(({ data }) => setAdminUnreadIdeaCount(data || 0))
  }, [])
  const [tiles, setTiles] = useState([])
  const [tileValues, setTileValues] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingTileId, setEditingTileId] = useState(null)

  const [title, setTitle] = useState('')
  const [metric1, setMetric1] = useState('einwohner_anzahl')
  const [metric2, setMetric2] = useState('')
  const [combineMode, setCombineMode] = useState('summe')
  const [vizType, setVizType] = useState('zahl')
  const [gaugeLow, setGaugeLow] = useState('')
  const [gaugeHigh, setGaugeHigh] = useState('')
  const [showTotal, setShowTotal] = useState(false)
  const [tileWidth, setTileWidth] = useState('voll')
  const [saving, setSaving] = useState(false)
  const [editMode, setEditMode] = useState(false)

  const info1 = metricInfo(metric1)
  const isNumberMetric = info1?.type === 'number'
  const isWachstumMetric = info1?.type === 'wachstum'
  const vizOptions = isWachstumMetric
    ? ['wachstum']
    : isNumberMetric
      ? (metric2 ? ['zahl', 'ampel', 'balken'] : ['zahl', 'ampel'])
      : ['balken', 'kreis']

  useEffect(() => {
    loadTiles()
  }, [])

  useEffect(() => {
    if (!vizOptions.includes(vizType)) setVizType(vizOptions[0])
    // eslint-disable-next-line
  }, [metric1, metric2])

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

    if (tile.viz_type === 'balken' && tile.metric_key_2) {
      const { data: val2 } = await supabase.rpc('get_dashboard_metric', { metric_key: tile.metric_key_2 })
      return [
        { label: metricInfo(tile.metric_key_1)?.label || tile.metric_key_1, value: Number(val1 || 0) },
        { label: metricInfo(tile.metric_key_2)?.label || tile.metric_key_2, value: Number(val2 || 0) }
      ]
    }

    if (tile.metric_key_2 && tile.combine_mode !== 'einzeln') {
      const { data: val2 } = await supabase.rpc('get_dashboard_metric', { metric_key: tile.metric_key_2 })
      if (tile.combine_mode === 'summe') return Number(val1 || 0) + Number(val2 || 0)
      if (tile.combine_mode === 'differenz') return Number(val1 || 0) - Number(val2 || 0)
    }

    return val1
  }

  function resetForm() {
    setTitle('')
    setMetric1('einwohner_anzahl')
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
      ? await supabase.from('dashboard_tiles').update(payload).eq('id', editingTileId)
      : await supabase.from('dashboard_tiles').insert({
          ...payload,
          owner_id: (await supabase.auth.getUser()).data.user.id,
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
    await supabase.from('dashboard_tiles').delete().eq('id', id)
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
      supabase.from('dashboard_tiles').update({ sort_order: newIndex }).eq('id', current.id),
      supabase.from('dashboard_tiles').update({ sort_order: index }).eq('id', swapped.id)
    ])
  }

  function renderTileContent(tile) {
    const value = tileValues[tile.id]
    if (value == null) return <p className="center-note">Keine Daten.</p>

    if (tile.viz_type === 'wachstum') {
      return <Wachstum data={value} />
    }
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
      return Array.isArray(value) ? <PieChart data={value} showCumulativeRates={tile.metric_key_1 === 'einwohner_aktivitaet'} /> : <p className="center-note">Keine Daten.</p>
    }
    return null
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>Master Dashboard</h1>
        <ProjectAgeClock />
      </div>
      <main style={{ paddingBottom: 90 }}>
        {error && <div className="error-box">{error}</div>}

        <div className="btn-row" style={{ marginBottom: 16 }}>
          <button className="btn btn-secondary" onClick={() => { if (showForm) { resetForm() }; setShowForm(!showForm) }}>
            {showForm ? 'Abbrechen' : '+ Kachel hinzufügen'}
          </button>
          <button className="btn btn-secondary" onClick={() => setEditMode(!editMode)}>
            {editMode ? 'Fertig' : 'Ansicht bearbeiten'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={saveTile} className="card">
            <h3 style={{ marginTop: 0 }}>{editingTileId ? 'Kachel bearbeiten' : 'Neue Kachel'}</h3>
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
                    {v === 'zahl' ? 'Zahl' : v === 'ampel' ? 'Ampel' : v === 'balken' ? 'Balkendiagramm' : v === 'wachstum' ? 'Wachstum über Zeit' : 'Kreisdiagramm'}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="tileWidthMaster">Kachelgröße</label>
            <select id="tileWidthMaster" value={tileWidth} onChange={(e) => setTileWidth(e.target.value)}>
              <option value="voll">Volle Breite</option>
              <option value="halb">Halbe Breite</option>
              <option value="drittel">Drittelbreite</option>
              <option value="viertel">Viertelbreite</option>
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
                Zusätzlichen "Gesamt"-Balken oben anzeigen (Summe aller Werte)
              </label>
            )}

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
        {!loading && tiles.length === 0 && !showForm && (
          <p className="center-note">Noch keine Kacheln angelegt.</p>
        )}

        <div className="dashboard-grid">
          {!loading && tiles.map((tile, index) => (
            <div className={`card tile-${tile.tile_width || 'voll'}`} key={tile.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <h3 style={{ margin: 0, fontSize: 15 }}>{tile.title}</h3>
                {editMode && (
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <button className="link-text" style={{ fontSize: 15 }} disabled={index === 0} onClick={() => moveTile(index, -1)}>‹</button>
                    <button className="link-text" style={{ fontSize: 15 }} disabled={index === tiles.length - 1} onClick={() => moveTile(index, 1)}>›</button>
                    <button className="link-text" onClick={() => startEdit(tile)}>Bearbeiten</button>
                    <button className="link-text" onClick={() => deleteTile(tile.id)}>Löschen</button>
                  </div>
                )}
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
          <span className="tab-bar-icon" style={{ position: 'relative', display: 'inline-block' }}>
            🛠️
            {adminUnreadIdeaCount > 0 && (
              <span style={{ position: 'absolute', top: -6, right: -10, minWidth: 16, height: 16, borderRadius: 8, background: 'var(--clay)', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
                {adminUnreadIdeaCount}
              </span>
            )}
          </span>
          Verwaltung
        </button>
      </nav>
    </div>
  )
}
