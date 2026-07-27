import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function MyBusinessPage({ profile, onProfileUpdated, onGoToSettings }) {
  const [editing, setEditing] = useState(false)
  const [description, setDescription] = useState(profile.description || '')
  const [address, setAddress] = useState(profile.address || '')
  const [phone, setPhone] = useState(profile.phone || '')
  const [website, setWebsite] = useState(profile.website || '')
  const [contactPerson, setContactPerson] = useState(profile.contact_person || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedMsg, setSavedMsg] = useState('')

  const [products, setProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [slots, setSlots] = useState([])
  const [hasAppointmentAddon, setHasAppointmentAddon] = useState(false)

  const hasShop = profile.plan === 'basis'

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

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    setSaving(true)

    const { error } = await supabase
      .from('business_profiles')
      .update({
        description: description.trim() || null,
        address: address.trim() || null,
        phone: phone.trim() || null,
        website: website.trim() || null,
        contact_person: contactPerson.trim() || null
      })
      .eq('id', profile.id)

    if (error) {
      setError(error.message)
    } else {
      setSavedMsg('Gespeichert.')
      setEditing(false)
      onProfileUpdated?.()
    }
    setSaving(false)
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

        <div className="card">
          {editing ? (
            <form onSubmit={handleSave}>
              <h3 style={{ marginTop: 0 }}>{profile.company_name}</h3>
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
            <>
              <h3 style={{ marginTop: 0 }}>{profile.company_name}</h3>
              {profile.description && <p style={{ fontSize: 14 }}>{profile.description}</p>}
              {profile.address && <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{profile.address}</p>}
              {profile.phone && <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Tel: {profile.phone}</p>}
              {profile.website && <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{profile.website}</p>}
              {profile.contact_person && <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Ansprechpartner: {profile.contact_person}</p>}
              <button className="btn btn-secondary" onClick={() => setEditing(true)} style={{ marginTop: 12 }}>
                Angaben bearbeiten
              </button>
            </>
          )}
        </div>

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
