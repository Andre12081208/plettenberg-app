import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const STATUS_LABELS = {
  in_pruefung: 'In Prüfung',
  vertrag_in_arbeit: 'Vertrag in Arbeit',
  live: 'Verifiziert',
  abgelehnt: 'Abgelehnt'
}

export default function BusinessAccountProfile({ profile, onBack, onGoToMySeite, onProfileUpdated }) {
  const [userEmail, setUserEmail] = useState('')
  const [categories, setCategories] = useState([])
  const [subcategories, setSubcategories] = useState([])
  const [loading, setLoading] = useState(true)

  const [editing, setEditing] = useState(false)
  const [companyName, setCompanyName] = useState(profile.company_name || '')
  const [contactPerson, setContactPerson] = useState(profile.contact_person || '')
  const [phone, setPhone] = useState(profile.phone || '')
  const [address, setAddress] = useState(profile.address || '')
  const [website, setWebsite] = useState(profile.website || '')
  const [subcategoryId, setSubcategoryId] = useState(profile.directory_subcategory_id || '')
  const [vatId, setVatId] = useState(profile.vat_id || '')
  const [registerNumber, setRegisterNumber] = useState(profile.impressum_register_number || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    const [{ data: userData }, { data: cats }, { data: subs }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('directory_categories').select('*').order('sort_order'),
      supabase.from('directory_subcategories').select('*').order('sort_order')
    ])
    setUserEmail(userData?.user?.email || '')
    setCategories(cats || [])
    setSubcategories(subs || [])
    setLoading(false)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const { error } = await supabase.from('business_profiles').update({
      company_name: companyName.trim(),
      contact_person: contactPerson.trim() || null,
      phone: phone.trim() || null,
      address: address.trim() || null,
      website: website.trim() || null,
      directory_subcategory_id: subcategoryId || null,
      vat_id: vatId.trim() || null,
      impressum_register_number: registerNumber.trim() || null
    }).eq('id', profile.id)

    if (error) {
      setError(error.message)
    } else {
      setEditing(false)
      onProfileUpdated?.()
    }
    setSaving(false)
  }

  const currentSubcategory = subcategories.find((s) => s.id === profile.directory_subcategory_id)
  const currentCategory = currentSubcategory ? categories.find((c) => c.id === currentSubcategory.category_id) : null

  return (
    <>
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>Profil</h1>
      </div>
      <main style={{ paddingBottom: 90 }}>
        <button className="link-text" onClick={onBack} style={{ marginBottom: 16 }}>← Zurück zu Einstellungen</button>

        {error && <div className="error-box">{error}</div>}
        {loading && <div className="loading-dot">Lädt...</div>}

        {!loading && (
          <>
            {editing ? (
              <form onSubmit={handleSave} className="card">
                <h3 style={{ marginTop: 0 }}>Unternehmensdaten bearbeiten</h3>
                <div className="field">
                  <label htmlFor="companyName">Unternehmensname</label>
                  <input id="companyName" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="contactPerson">Ansprechpartner</label>
                  <input id="contactPerson" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="phone">Telefonnummer</label>
                  <input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="address">Unternehmensanschrift</label>
                  <input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="website">Website</label>
                  <input id="website" value={website} onChange={(e) => setWebsite(e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="subcategory">Branche</label>
                  <select id="subcategory" value={subcategoryId} onChange={(e) => setSubcategoryId(e.target.value)}>
                    <option value="">– keine Kategorie –</option>
                    {categories.map((cat) => (
                      <optgroup key={cat.id} label={`${cat.icon} ${cat.name}`}>
                        {subcategories.filter((s) => s.category_id === cat.id).map((sub) => (
                          <option key={sub.id} value={sub.id}>{sub.name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="vatId">Umsatzsteuer-ID (optional)</label>
                  <input id="vatId" value={vatId} onChange={(e) => setVatId(e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="registerNumber">Handelsregistereintrag (optional)</label>
                  <input id="registerNumber" value={registerNumber} onChange={(e) => setRegisterNumber(e.target.value)} />
                </div>
                <div className="btn-row">
                  <button className="btn btn-primary" type="submit" disabled={saving}>
                    {saving ? 'Wird gespeichert...' : 'Speichern'}
                  </button>
                  <button className="btn btn-secondary" type="button" onClick={() => setEditing(false)} disabled={saving}>Abbrechen</button>
                </div>
              </form>
            ) : (
              <div className="card">
                <h3 style={{ marginTop: 0 }}>Unternehmensdaten</h3>
                <p style={{ margin: '4px 0', fontSize: 14 }}><strong>Unternehmensname:</strong> {profile.company_name}</p>
                <p style={{ margin: '4px 0', fontSize: 14 }}><strong>Ansprechpartner:</strong> {profile.contact_person || '–'}</p>
                <p style={{ margin: '4px 0', fontSize: 14 }}><strong>E-Mail:</strong> {userEmail}</p>
                <p style={{ margin: '4px 0', fontSize: 14 }}><strong>Telefonnummer:</strong> {profile.phone || '–'}</p>
                <p style={{ margin: '4px 0', fontSize: 14 }}><strong>Anschrift:</strong> {profile.address || '–'}</p>
                <p style={{ margin: '4px 0', fontSize: 14 }}><strong>Website:</strong> {profile.website || '–'}</p>
                <p style={{ margin: '4px 0', fontSize: 14 }}><strong>Branche:</strong> {currentSubcategory ? `${currentCategory?.name} → ${currentSubcategory.name}` : '–'}</p>
                <p style={{ margin: '4px 0', fontSize: 14 }}><strong>Umsatzsteuer-ID:</strong> {profile.vat_id || '–'}</p>
                <p style={{ margin: '4px 0', fontSize: 14 }}><strong>Handelsregistereintrag:</strong> {profile.impressum_register_number || '–'}</p>
                <button className="btn btn-secondary" onClick={() => setEditing(true)} style={{ marginTop: 12 }}>
                  Unternehmensdaten bearbeiten
                </button>
              </div>
            )}

            <div className="card">
              <h3 style={{ marginTop: 0 }}>Öffentliches Unternehmensprofil</h3>
              <p style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--ink-soft)' }}>
                Logo, Titelbild, Beschreibung, Öffnungszeiten und Kontaktangaben verwaltest du direkt auf deiner öffentlichen Seite.
              </p>
              <button className="btn btn-secondary" onClick={onGoToMySeite}>Profil bearbeiten</button>
            </div>

            <div className="card">
              <h3 style={{ marginTop: 0 }}>Kontostatus</h3>
              <p style={{ margin: '4px 0', fontSize: 14 }}><strong>Status:</strong> {profile.account_status === 'gesperrt' ? 'Deaktiviert' : 'Aktiv'}</p>
              <p style={{ margin: '4px 0', fontSize: 14 }}><strong>Mitglied seit:</strong> {new Date(profile.created_at).toLocaleDateString('de-DE')}</p>
              <p style={{ margin: '4px 0', fontSize: 14 }}><strong>Business-ID:</strong> {profile.id}</p>
              <p style={{ margin: '4px 0', fontSize: 14 }}><strong>Verifizierungsstatus:</strong> {STATUS_LABELS[profile.status] || profile.status}</p>
            </div>
          </>
        )}
      </main>
    </>
  )
}
