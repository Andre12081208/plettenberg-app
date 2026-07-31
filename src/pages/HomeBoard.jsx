import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'

const SYSTEM_APP_META = {
  calendar: { icon: '📅', label: 'Kalender' },
  snake: { icon: '🐍', label: 'Snake' },
  ideenwerkstatt: { icon: '💡', label: 'Ideenwerkstatt' },
  branchenverzeichnis: { icon: '📖', label: 'Branchenverzeichnis' },
  stammtisch: { icon: '👥', label: 'Stammtisch' }
}

export default function HomeBoard({ userId, installedApps, onOpenApp }) {
  const [tiles, setTiles] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [pickerStep, setPickerStep] = useState('type')
  const [draggingId, setDraggingId] = useState(null)
  const hasDraggedRef = useRef(false)

  useEffect(() => {
    loadTiles()
    // eslint-disable-next-line
  }, [])

  async function loadTiles() {
    const { data } = await supabase
      .from('home_board_tiles')
      .select('*, business_profiles(*)')
      .eq('user_id', userId)
    setTiles(data || [])
    setLoaded(true)
  }

  async function addTile(app) {
    const { error } = await supabase.from('home_board_tiles').insert({
      user_id: userId,
      app_type: app.type,
      app_key: app.type === 'system' ? app.key : null,
      business_profile_id: app.type === 'business' ? app.data.id : null,
      pos_x: 50,
      pos_y: 50
    })
    if (!error) {
      setShowPicker(false)
      setPickerStep('type')
      loadTiles()
    }
  }

  async function removeBoardTile(tileId) {
    await supabase.from('home_board_tiles').delete().eq('id', tileId)
    loadTiles()
  }

  function startDrag(e, tileId) {
    e.stopPropagation()
    hasDraggedRef.current = false
    setDraggingId(tileId)
  }

  function handleBoardMove(e) {
    if (!draggingId) return
    hasDraggedRef.current = true
    const rect = e.currentTarget.getBoundingClientRect()
    const point = e.touches?.[0] || e
    const x = Math.min(96, Math.max(4, ((point.clientX - rect.left) / rect.width) * 100))
    const y = Math.min(96, Math.max(4, ((point.clientY - rect.top) / rect.height) * 100))
    setTiles((prev) => prev.map((t) => (t.id === draggingId ? { ...t, pos_x: x, pos_y: y } : t)))
  }

  async function handleBoardUp() {
    if (draggingId) {
      const moved = tiles.find((t) => t.id === draggingId)
      if (moved) {
        await supabase.from('home_board_tiles').update({ pos_x: moved.pos_x, pos_y: moved.pos_y }).eq('id', moved.id)
      }
    }
    setDraggingId(null)
  }

  function handleTileClick(tile) {
    if (hasDraggedRef.current) {
      hasDraggedRef.current = false
      return
    }
    if (editing) return
    if (tile.app_type === 'business' && tile.business_profiles) {
      onOpenApp(tile.business_profiles)
    } else if (tile.app_type === 'system') {
      onOpenApp(tile.app_key)
    }
  }

  function tileMeta(tile) {
    if (tile.app_type === 'business' && tile.business_profiles) {
      return {
        icon: tile.business_profiles.logo_url
          ? <img src={tile.business_profiles.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 18 }} />
          : tile.business_profiles.company_name?.[0],
        label: tile.business_profiles.company_name
      }
    }
    return { icon: SYSTEM_APP_META[tile.app_key]?.icon || '❓', label: SYSTEM_APP_META[tile.app_key]?.label || tile.app_key }
  }

  if (!loaded) return <div className="loading-dot">Lädt...</div>

  if (tiles.length === 0 && !showPicker) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
        <button className="btn btn-primary" onClick={() => setShowPicker(true)} style={{ width: 'auto', padding: '16px 28px' }}>
          Gestalte für dein Homeboard die erste Kachel
        </button>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginBottom: 10 }}>
        <button className="link-text" onClick={() => setShowPicker(true)}>+ Kachel hinzufügen</button>
        <button className="link-text" onClick={() => setEditing(!editing)}>{editing ? 'Fertig' : 'Ansicht bearbeiten'}</button>
      </div>

      <div
        style={{ position: 'relative', width: '100%', minHeight: 'calc(100vh - 260px)', border: editing ? '2px dashed var(--line)' : 'none', borderRadius: 12 }}
        onMouseMove={handleBoardMove}
        onMouseUp={handleBoardUp}
        onMouseLeave={handleBoardUp}
        onTouchMove={handleBoardMove}
        onTouchEnd={handleBoardUp}
      >
        {tiles.map((tile) => {
          const meta = tileMeta(tile)
          return (
            <div
              key={tile.id}
              style={{
                position: 'absolute', left: `${tile.pos_x}%`, top: `${tile.pos_y}%`,
                transform: 'translate(-50%, -50%)', width: 76, textAlign: 'center'
              }}
              onMouseDown={editing ? (e) => startDrag(e, tile.id) : undefined}
              onTouchStart={editing ? (e) => startDrag(e, tile.id) : undefined}
            >
              <button
                className="app-tile"
                style={{ width: '100%', cursor: editing ? 'grab' : 'pointer', touchAction: 'none' }}
                onClick={() => handleTileClick(tile)}
              >
                <div className="app-tile-icon">{meta.icon}</div>
                <div className="app-tile-label">{meta.label}</div>
              </button>
              {editing && (
                <button
                  onClick={() => removeBoardTile(tile.id)}
                  style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, background: '#C0392B', color: '#fff', border: '2px solid #fff', fontSize: 13 }}
                >×</button>
              )}
            </div>
          )
        })}
      </div>

      {showPicker && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }} onClick={() => setShowPicker(false)}>
          <div className="card" style={{ maxWidth: 360, width: '100%', maxHeight: '80vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            {pickerStep === 'type' ? (
              <>
                <h3 style={{ marginTop: 0 }}>Kachel-Art wählen</h3>
                <button className="card-choice" onClick={() => setPickerStep('app')}>
                  <strong>📱 App</strong>
                  <p className="hint" style={{ margin: '4px 0 0' }}>Eine deiner installierten Apps frei platzieren</p>
                </button>
                <button className="link-text" onClick={() => setShowPicker(false)} style={{ marginTop: 10 }}>Abbrechen</button>
              </>
            ) : (
              <>
                <h3 style={{ marginTop: 0 }}>Welche App?</h3>
                {(!installedApps || installedApps.length === 0) && <p className="hint">Du hast noch keine Apps installiert.</p>}
                {installedApps?.map((app) => {
                  const label = app.type === 'business' ? app.data.company_name : (SYSTEM_APP_META[app.key]?.label || app.key)
                  const icon = app.type === 'business' ? (app.data.logo_url ? <img src={app.data.logo_url} alt="" style={{ width: 28, height: 28, borderRadius: 8, objectFit: 'cover' }} /> : app.data.company_name?.[0]) : (SYSTEM_APP_META[app.key]?.icon || '❓')
                  const key = app.type === 'business' ? `business-${app.data.id}` : `system-${app.key}`
                  return (
                    <button key={key} className="card-choice" onClick={() => addTile(app)} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span>{icon}</span>
                      <span>{label}</span>
                    </button>
                  )
                })}
                <button className="link-text" onClick={() => setPickerStep('type')} style={{ marginTop: 10 }}>← Zurück</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
