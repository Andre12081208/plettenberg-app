import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const DAYS = [
  { key: 'mo', label: 'Montag' },
  { key: 'di', label: 'Dienstag' },
  { key: 'mi', label: 'Mittwoch' },
  { key: 'do', label: 'Donnerstag' },
  { key: 'fr', label: 'Freitag' },
  { key: 'sa', label: 'Samstag' },
  { key: 'so', label: 'Sonntag' }
]

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

export default function MyBusinessPage({ profile, onProfileUpdated, onGoToSettings }) {
  const [editing, setEditing] = useState(false)
  const [tagline, setTagline] = useState(profile.tagline || '')
  const [description, setDescription] = useState(profile.description || '')
  const [address, setAddress] = useState(profile.address || '')
  const [phone, setPhone] = useState(profile.phone || '')
  const [website, setWebsite] = useState(profile.website || '')
  const [contactPerson, setContactPerson] = useState(profile.contact_person || '')
  const [hours, setHours] = useState(profile.opening_hours_structured || {})

  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(profile.logo_url || null)
  const [bannerFile, setBannerFile] = useState(null)
  const [bannerPreview, setBannerPreview] = useState(profile.banner_url || null)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedMsg, setSavedMsg] = useState('')

  const [products, setProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [slots, setSlots] = useState([])
  const [hasAppointmentAddon, setHasAppointmentAddon] = useState(false)

  const hasShop = profile.plan === 'basis'
  const openNow = isCurrentlyOpen(profile.opening_hours_structured)

  useEffect(() => {
    if (hasShop) {
      loadProducts()
      loadAppointmentInfo()
    }
    // eslint-disable-next-line
  }, [])

  async function loadProducts() {
    setLoadingProducts(true)
    const { data } = await supabase
      .from('business_products')
      .select('*')
      .eq('business_profile_id', profile.id)
      .eq('active', true)
      .order('created_at', { ascending: false })

    setProducts(data || [])
    setLoadingProducts(false)
  }

  async function loadAppointmentInfo() {
    const [{ data: addonRows }, { data: slotRows }] = await Promise.all([
      supabase.from('business_addons').select('addon_key').eq('business_profile_id', profile.id),
      supabase.from('business_appointment_slots').select('*').eq('business_profile_id', profile.id).is('booked_by', null).gte('start_at', new Date().toISOString()).order('start_at', { ascending: true })
    ])

    setHasAppointmentAddon((addonRows || []).some((a) => a.addon_key === 'termine'))
    setSlots(slotRows || [])
  }

  function handleLogoChange(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setLogoFile(f)
    setLogoPreview(URL.createObjectURL(f))
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

      setSavedMsg('Gespeichert.')
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

  return (
    <>
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>Meine Seite</h1>
      </div>
      <main style={{ paddingBottom: 90 }}>
        <p className="hint" style={{ marginBottom: 16 }}>
          So sehen Einwohner deinen virtuellen Laden.
        </p>

        {savedMsg && <div className="error-box" style={{ background: '#E5EFEA', color: '#1F4D3F', borderColor: '#1F4D3F' }}>{savedMsg}</div>}
        {error && <div className="error-box">{error}</div>}

        {editing ? (
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
              </div>

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
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ width: '100%', height: 120, background: profile.banner_url ? undefined : 'var(--forest-light)' }}>
              {profile.banner_url && <img src={profile.banner_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginTop: -48, marginBottom: 10 }}>
                <div className="avatar-preview" style={{ width: 72, height: 72, border: '3px solid #fff' }}>
                  {profile.logo_url ? <img src={profile.logo_url} alt="" /> : '🏬'}
                </div>
              </div>

              <h3 style={{ margin: '0 0 4px' }}>{profile.company_name}</h3>
              {profile.tagline && <p style={{ margin: '0 0 10px', fontSize: 15, color: 'var(--forest)', fontWeight: 600 }}>{profile.tagline}</p>}

              {openNow !== null && (
                <span className={`status-pill ${openNow ? 'status-live' : 'status-abgelehnt'}`} style={{ marginBottom: 10, display: 'inline-block' }}>
                  {openNow ? '🟢 Jetzt geöffnet' : '🔴 Geschlossen'}
                </span>
              )}

              {profile.description && <p style={{ fontSize: 14 }}>{profile.description}</p>}

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
                {profile.address && <span className="status-pill status-live" style={{ fontSize: 12 }}>📍 {profile.address}</span>}
                {profile.phone && <span className="status-pill status-live" style={{ fontSize: 12 }}>📞 {profile.phone}</span>}
                {profile.website && <span className="status-pill status-live" style={{ fontSize: 12 }}>🌐 Website</span>}
              </div>
              {profile.contact_person && <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 10 }}>Ansprechpartner: {profile.contact_person}</p>}

              <button className="btn btn-secondary" onClick={() => setEditing(true)} style={{ marginTop: 16 }}>
                Angaben bearbeiten
              </button>
            </div>
          </div>
        )}

        {hasShop && (
          <>
            {hasAppointmentAddon && (
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h3 style={{ margin: 0 }}>Freie Termine</h3>
                  <button className="link-text" onClick={onGoToSettings}>Verwalten</button>
                </div>
                {slots.length === 0 ? (
                  <p className="center-note">Aktuell keine freien Termine.</p>
                ) : (
                  <p style={{ margin: 0, fontSize: 14 }}>{slots.length} freie Termine verfügbar</p>
                )}
              </div>
            )}

            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <h3 style={{ margin: 0 }}>Angebot</h3>
                <button className="link-text" onClick={onGoToSettings}>Verwalten</button>
              </div>

              {loadingProducts && <div className="loading-dot">Lädt...</div>}
              {!loadingProducts && products.length === 0 && (
                <p className="center-note">Noch keine Produkte eingestellt.</p>
              )}

              {!loadingProducts && products.map((product) => (
                <div key={product.id} style={{ borderTop: '1px solid var(--line)', paddingTop: 10, marginTop: 10 }}>
                  {product.image_url && (
                    <img src={product.image_url} alt="" style={{ width: '100%', borderRadius: 10, marginBottom: 8, maxHeight: 140, objectFit: 'cover' }} />
                  )}
                  <p style={{ margin: 0, fontWeight: 600 }}>{product.name}</p>
                  {product.price != null && (
                    <p style={{ margin: '2px 0', fontSize: 13, color: 'var(--forest)', fontWeight: 600 }}>{product.price} €</p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </>
  )
}
