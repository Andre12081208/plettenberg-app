import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function BusinessProfileForm({ userId, onDone }) {
  const [companyName, setCompanyName] = useState('')
  const [category, setCategory] = useState('unternehmen')
  const [description, setDescription] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [representative, setRepresentative] = useState('')
  const [registerNumber, setRegisterNumber] = useState('')
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleLogoChange(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setLogoFile(f)
    setLogoPreview(URL.createObjectURL(f))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    let logoUrl = null

    try {
      if (logoFile) {
        const ext = logoFile.name.split('.').pop()
        const path = `${userId}/logo.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('logos')
          .upload(path, logoFile, { upsert: true })

        if (uploadError) throw uploadError

        const { data } = supabase.storage.from('logos').getPublicUrl(path)
        logoUrl = data.publicUrl
      }

      const { error: dbError } = await supabase.from('business_profiles').insert({
        id: userId,
        company_name: companyName.trim(),
        category,
        description: description.trim() || null,
        address: address.trim() || null,
        phone: phone.trim() || null,
        website: website.trim() || null,
        contact_person: contactPerson.trim() || null,
        impressum_representative: representative.trim() || null,
        impressum_register_number: registerNumber.trim() || null,
        logo_url: logoUrl,
        status: 'in_pruefung',
        plan: 'kostenlos'
      })

      if (dbError) throw dbError

      onDone()
    } catch (err) {
      setError(err.message || 'Etwas ist schiefgelaufen, versuch es noch einmal.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>Gewerbeprofil</h1>
      </div>
      <main>
        {error && <div className="error-box">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="avatar-upload">
            <div className="avatar-preview">
              {logoPreview ? <img src={logoPreview} alt="Logo-Vorschau" /> : 'Logo'}
            </div>
            <div>
              <label className="link-text" htmlFor="logo" style={{ cursor: 'pointer' }}>
                Logo auswählen
              </label>
              <input
                id="logo"
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                style={{ display: 'none' }}
              />
              <div className="hint">Optional</div>
            </div>
          </div>

          <div className="field">
            <label htmlFor="companyName">Name der Firma / des Vereins</label>
            <input id="companyName" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="category">Kategorie</label>
            <select id="category" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="unternehmen">Unternehmen</option>
              <option value="verein">Verein</option>
              <option value="verband">Verband</option>
              <option value="stadtverwaltung">Stadtverwaltung / Behörde</option>
              <option value="sonstiges">Sonstiges</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="description">Kurzbeschreibung</label>
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
            <input id="website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" />
          </div>
          <div className="field">
            <label htmlFor="contactPerson">Ansprechpartner</label>
            <input id="contactPerson" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="representative">Vertretungsberechtigte Person (Impressum)</label>
            <input id="representative" value={representative} onChange={(e) => setRepresentative(e.target.value)} />
            <div className="hint">Nach §5 TMG Pflicht für gewerbliche Profile</div>
          </div>
          <div className="field">
            <label htmlFor="registerNumber">Handelsregisternummer (falls vorhanden)</label>
            <input id="registerNumber" value={registerNumber} onChange={(e) => setRegisterNumber(e.target.value)} />
          </div>

          <button
