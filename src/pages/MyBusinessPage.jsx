import { useState, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useCity } from '../lib/useCity.js'
import BusinessMiniApp from './BusinessMiniApp.jsx'

const DAYS = [
  { key: 'mo', label: 'Montag' },
  { key: 'di', label: 'Dienstag' },
  { key: 'mi', label: 'Mittwoch' },
  { key: 'do', label: 'Donnerstag' },
  { key: 'fr', label: 'Freitag' },
  { key: 'sa', label: 'Samstag' },
  { key: 'so', label: 'Sonntag' }
]

function LogoCropEditor({ imageUrl, onSave, onCancel }) {
  const [posX, setPosX] = useState(50)
  const [posY, setPosY] = useState(50)
  const [zoom, setZoom] = useState(100)
  const [saving, setSaving] = useState(false)
  const dragging = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })

  function getPoint(e) {
    if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY }
    return { x: e.clientX, y: e.clientY }
  }

  function handleDown(e) {
    dragging.current = true
    lastPos.current = getPoint(e)
  }
  function handleMove(e) {
    if (!dragging.current) return
    const point = getPoint(e)
    const dx = point.x - lastPos.current.x
    const dy = point.y - lastPos.current.y
    lastPos.current = point
    setPosX((prev) => Math.min(100, Math.max(0, prev - dx / 2)))
    setPosY((prev) => Math.min(100, Math.max(0, prev - dy / 2)))
  }
  function handleUp() {
    dragging.current = false
  }

  async function handleSave() {
    setSaving(true)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = imageUrl
    await new Promise((resolve) => { img.onload = resolve })

    const OUTPUT_SIZE = 400
    const scaledWidth = OUTPUT_SIZE * (zoom / 100)
    const scaledHeight = scaledWidth * (img.naturalHeight / img.naturalWidth)
    const offsetX = (OUTPUT_SIZE - scaledWidth) * (posX / 100)
    const offsetY = (OUTPUT_SIZE - scaledHeight) * (posY / 100)

    const canvas = document.createElement('canvas')
    canvas.width = OUTPUT_SIZE
    canvas.height = OUTPUT_SIZE
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight)

    canvas.toBlob((blob) => {
      setSaving(false)
      onSave(blob)
    }, 'image/png')
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
      <div className="card" style={{ maxWidth: 340, width: '100%' }}>
        <h3 style={{ marginTop: 0 }}>Logo anpassen</h3>
        <p className="hint" style={{ marginBottom: 14 }}>Zum Verschieben ziehen, mit dem Regler zoomen.</p>
        <div
          style={{
            width: 180, height: 180, margin: '0 auto 16px', borderRadius: 16, overflow: 'hidden',
            backgroundImage: `url(${imageUrl})`, backgroundPosition: `${posX}% ${posY}%`, backgroundSize: `${zoom}%`, backgroundRepeat: 'no-repeat',
            cursor: 'grab', touchAction: 'none', border: '2px solid var(--line)'
          }}
          onMouseDown={handleDown}
          onMouseMove={handleMove}
          onMouseUp={handleUp}
          onMouseLeave={handleUp}
          onTouchStart={handleDown}
          onTouchMove={handleMove}
          onTouchEnd={handleUp}
        />
        <div className="field">
          <label htmlFor="logoZoom">Zoom</label>
          <input id="logoZoom" type="range" min={100} max={300} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} style={{ width: '100%' }} />
        </div>
        <div className="btn-row">
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Wird verarbeitet...' : 'Speichern'}</button>
          <button className="btn btn-secondary" onClick={onCancel}>Abbrechen</button>
        </div>
      </div>
    </div>
  )
}

export default function MyBusinessPage({ profile, onProfileUpdated, onFullScreenChange, startEditing, settingsBack, onSwitchToRoom, onSwitchToProducts, visitorMode, onBack }) {
  const { name: cityName } = useCity()
  const [editing, setEditing] = useState(!!startEditing)
  const [tagline, setTagline] = useState(profile.tagline || '')
  const [description, setDescription] = useState(profile.description || '')
  const [address, setAddress] = useState(profile.address || '')
  const [phone, setPhone] = useState(profile.phone || '')
  const [website, setWebsite] = useState(profile.website || '')
  const [contactPerson, setContactPerson] = useState(profile.contact_person || '')
  const [hours, setHours] = useState(profile.opening_hours_structured || {})

  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(profile.logo_url || null)
  const [logoEditorUrl, setLogoEditorUrl] = useState(null)
  const [bannerFile, setBannerFile] = useState(null)
  const [bannerPreview, setBannerPreview] = useState(profile.banner_url || null)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function handleLogoChange(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setLogoEditorUrl(URL.createObjectURL(f))
  }

  function handleLogoCropSave(blob) {
    const file = new File([blob], 'logo.png', { type: 'image/png' })
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(blob))
    setLogoEditorUrl(null)
  }

  function handleBannerChange(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setBannerFile(f)
    setBannerPreview(URL.createObjectURL(f))
  }

  function updateDayHours(dayKey, field, value) {
    setHours((prev) => ({
      ...prev,
      [dayKey]: { ...(prev[dayKey] || { closed: false, open: '09:00', close: '18:00' }), [field]: value }
    }))
  }

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      let logoUrl = profile.logo_url || null
      let bannerUrl = profile.banner_url || null

      if (logoFile) {
        const ext = logoFile.name.split('.').pop()
        const path = `${profile.id}/logo.${ext}`
        const { error: uploadError } = await supabase.storage.from('logos').upload(path, logoFile, { upsert: true })
        if (uploadError) throw uploadError
        const { data } = supabase.storage.from('logos').getPublicUrl(path)
        logoUrl = data.publicUrl
      }

      if (bannerFile) {
        const ext = bannerFile.name.split('.').pop()
        const path = `${profile.id}/banner.${ext}`
        const { error: uploadError } = await supabase.storage.from('banners').upload(path, bannerFile, { upsert: true })
        if (uploadError) throw uploadError
        const { data } = supabase.storage.from('banners').getPublicUrl(path)
        bannerUrl = data.publicUrl
      }

      const { error: dbError } = await supabase
        .from('business_profiles')
        .update({
          tagline: tagline.trim() || null,
          description: description.trim() || null,
          address: address.trim() || null,
          phone: phone.trim() || null,
          website: website.trim() || null,
          contact_person: contactPerson.trim() || null,
          opening_hours_structured: hours,
          logo_url: logoUrl,
          banner_url: bannerUrl
        })
        .eq('id', profile.id)

      if (dbError) throw dbError

      await supabase.from('business_account_events').insert({ business_profile_id: profile.id, event_type: 'profil_geaendert' })
      setEditing(false)
      setLogoFile(null)
      setBannerFile(null)
      onProfileUpdated?.()
    } catch (err) {
      setError(err.message || 'Etwas ist schiefgelaufen.')
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <>
        <div className="topbar">
          <div className="mark">{cityName}</div>
          <h1>Angaben bearbeiten</h1>
        </div>
        <main style={{ paddingBottom: 90 }}>
          <button className="link-text" onClick={() => (settingsBack ? settingsBack() : setEditing(false))} style={{ marginBottom: 16 }}>
            {settingsBack ? '← Zurück zu Meine Seite' : '← Zurück zu Meine Seite'}
          </button>

          {onSwitchToRoom && (
            <div className="btn-row" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
              <button className="btn btn-primary">Visitenkarte (Kostenlos)</button>
              <button className="btn btn-secondary" onClick={onSwitchToRoom}>Mein virtueller Standort (Zusatzpaket)</button>
            </div>
          )}

          {error && <div className="error-box">{error}</div>}

          <form onSubmit={handleSave}>
            <div className="card">
              <div className="field">
                <label className="link-text" htmlFor="bannerInput" style={{ cursor: 'pointer' }}>Titelbild auswählen</label>
                <input id="bannerInput" type="file" accept="image/*" onChange={handleBannerChange} style={{ display: 'none' }} />
                <div style={{ width: '100%', height: 120, borderRadius: 10, background: bannerPreview ? undefined : 'var(--forest-light)', overflow: 'hidden', marginTop: 8 }}>
                  {bannerPreview && <img src={bannerPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>
              </div>

              <div className="field">
                <label className="link-text" htmlFor="logoInput" style={{ cursor: 'pointer' }}>Logo auswählen</label>
                <input id="logoInput" type="file" accept="image/*" onChange={handleLogoChange} style={{ display: 'none' }} />
                <div className="avatar-preview" style={{ width: 72, height: 72, marginTop: 8 }}>
                  {logoPreview ? <img src={logoPreview} alt="" /> : '🏬'}
                </div>
                {logoPreview && (
                  <button type="button" className="link-text" style={{ marginTop: 6 }} onClick={() => setLogoEditorUrl(logoPreview)}>
                    Ausschnitt anpassen
                  </button>
                )}
              </div>

              {logoEditorUrl && (
                <LogoCropEditor
                  imageUrl={logoEditorUrl}
                  onSave={handleLogoCropSave}
                  onCancel={() => setLogoEditorUrl(null)}
                />
              )}

              <div className="field">
                <label htmlFor="tagline">Kurzer Slogan</label>
                <input id="tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="z.B. Ihr Zulassungsdienst in Plettenberg" />
              </div>
              <div className="field">
                <label htmlFor="description">Beschreibung</label>
                <textarea id="description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="address">Adresse</label>
                <input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="phone">Telefon</label>
                <input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="website">Website</label>
                <input id="website" value={website} onChange={(e) => setWebsite(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="contactPerson">Ansprechpartner</label>
                <input id="contactPerson" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
              </div>
            </div>

            <div className="card">
              <h3 style={{ marginTop: 0 }}>Öffnungszeiten</h3>
              {DAYS.map((day) => {
                const dayHours = hours[day.key] || { closed: false, open: '09:00', close: '18:00' }
                return (
                  <div key={day.key} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                    <span style={{ width: 90, fontSize: 14 }}>{day.label}</span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                      <input
                        type="checkbox"
                        checked={!!dayHours.closed}
                        onChange={(e) => updateDayHours(day.key, 'closed', e.target.checked)}
                      />
                      Geschlossen
                    </label>
                    {!dayHours.closed && (
                      <>
                        <input
                          type="time"
                          value={dayHours.open || '09:00'}
                          onChange={(e) => updateDayHours(day.key, 'open', e.target.value)}
                          style={{ width: 110 }}
                        />
                        <span>–</span>
                        <input
                          type="time"
                          value={dayHours.close || '18:00'}
                          onChange={(e) => updateDayHours(day.key, 'close', e.target.value)}
                          style={{ width: 110 }}
                        />
                      </>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="btn-row">
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? 'Wird gespeichert...' : 'Speichern'}
              </button>
              <button className="btn btn-secondary" type="button" onClick={() => setEditing(false)} disabled={saving}>
                Abbrechen
              </button>
            </div>
          </form>
        </main>
      </>
    )
  }

  return (
      <div style={{ position: 'relative' }}>
      {visitorMode ? (
        <button
          className="link-text"
          onClick={onBack}
          style={{ position: 'fixed', top: 16, left: 16, zIndex: 40, background: 'rgba(255,255,255,0.92)', padding: '8px 14px', borderRadius: 20, boxShadow: '0 2px 10px rgba(0,0,0,0.15)' }}
        >
          ← Zurück zum B.HUB
        </button>
      ) : (
        <button
          className="btn btn-primary"
          onClick={() => { setEditing(true); onFullScreenChange?.(false) }}
          style={{ position: 'fixed', bottom: 100, right: 16, zIndex: 40, width: 'auto', padding: '10px 18px', boxShadow: '0 2px 10px rgba(0,0,0,0.2)' }}
        >
          ✏️ Bearbeiten
        </button>
      )}
      <BusinessMiniApp app={profile} userId={profile.id} onBack={() => {}} fullScreenRoom onFullScreenChange={onFullScreenChange} hidePlanBanner={visitorMode} />
    </div>
  )
}
