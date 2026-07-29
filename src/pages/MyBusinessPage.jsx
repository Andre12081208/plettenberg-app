import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
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

export default function MyBusinessPage({ profile, onProfileUpdated, onFullScreenChange, startEditing, settingsBack }) {
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
  const [bannerFile, setBannerFile] = useState(null)
  const [bannerPreview, setBannerPreview] = useState(profile.banner_url || null)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

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
          <div className="mark">Plettenberg</div>
          <h1>Angaben bearbeiten</h1>
        </div>
        <main style={{ paddingBottom: 90 }}>
          <button className="link-text" onClick={() => (settingsBack ? settingsBack() : setEditing(false))} style={{ marginBottom: 16 }}>
            {settingsBack ? '← Zurück zu Einstellungen' : '← Zurück zu Meine Seite'}
          </button>

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
        </main>
      </>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        className="btn btn-primary"
        onClick={() => { setEditing(true); onFullScreenChange?.(false) }}
        style={{ position: 'fixed', bottom: 100, right: 16, zIndex: 40, width: 'auto', padding: '10px 18px', boxShadow: '0 2px 10px rgba(0,0,0,0.2)' }}
      >
        ✏️ Bearbeiten
      </button>
      <BusinessMiniApp app={profile} userId={profile.id} onBack={() => {}} fullScreenRoom onFullScreenChange={onFullScreenChange} />
    </div>
  )
}
