import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function MyProfile({ userId, profile, onBack, onProfileUpdated }) {
  const [firstName, setFirstName] = useState(profile.first_name || '')
  const [lastName, setLastName] = useState(profile.last_name || '')
  const [username, setUsername] = useState(profile.username || '')
  const [phone, setPhone] = useState(profile.phone || '')
  const [birthday, setBirthday] = useState(profile.birthday || '')
  const [showBirthday, setShowBirthday] = useState(profile.show_birthday_to_contacts || false)
  const [contactEmail, setContactEmail] = useState(profile.contact_email || '')
  const [website, setWebsite] = useState(profile.website || '')
  const [instagram, setInstagram] = useState(profile.instagram || '')
  const [tiktok, setTiktok] = useState(profile.tiktok || '')
  const [info, setInfo] = useState(profile.info || '')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(profile.avatar_url || null)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const [error, setError] = useState('')

  function handleFileChange(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function handleSaveProfile(e) {
    e.preventDefault()
    setError('')
    setSavedMsg('')
    setSaving(true)

    let avatarUrl = profile.avatar_url || null

    try {
      if (file) {
        const ext = file.name.split('.').pop()
        const path = `${userId}/avatar.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, file, { upsert: true })

        if (uploadError) throw uploadError

        const { data } = supabase.storage.from('avatars').getPublicUrl(path)
        avatarUrl = data.publicUrl
      }

      const { error: dbError } = await supabase
        .from('private_profiles')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          username: username.trim().toLowerCase(),
          phone: phone.trim() || null,
          birthday: birthday || null,
          show_birthday_to_contacts: showBirthday,
          contact_email: contactEmail.trim() || null,
          website: website.trim() || null,
          instagram: instagram.trim() || null,
          tiktok: tiktok.trim() || null,
          info: info.trim() || null,
          avatar_url: avatarUrl
        })
        .eq('id', userId)

      if (dbError) throw dbError

      setSavedMsg('Gespeichert.')
      onProfileUpdated?.()
    } catch (err) {
      if (err.message?.includes('duplicate key') || err.message?.includes('already exists')) {
        setError('Dieser Nutzername ist schon vergeben, wähl bitte einen anderen.')
      } else {
        setError(err.message || 'Etwas ist schiefgelaufen.')
      }
    } finally {
      setSaving(false)
    }
  }

  const initials = `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase()

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>Mein Profil</h1>
      </div>
      <main>
        <button className="link-text" onClick={onBack} style={{ marginBottom: 16 }}>← Zurück</button>

        <p className="hint" style={{ marginBottom: 16 }}>
          Das ist deine Visitenkarte. Bestätigte Kontakte sehen genau das, was du hier ausfüllst.
        </p>

        <div className="card">
          {error && <div className="error-box">{error}</div>}
          {savedMsg && <div className="error-box" style={{ background: '#E5EFEA', color: '#1F4D3F', borderColor: '#1F4D3F' }}>{savedMsg}</div>}

          <form onSubmit={handleSaveProfile}>
            <div className="avatar-upload">
              <div className="avatar-preview">
                {preview ? <img src={preview} alt="Vorschau" /> : (initials || '?')}
              </div>
              <div>
                <label className="link-text" htmlFor="photo" style={{ cursor: 'pointer' }}>
                  Foto ändern
                </label>
                <input
                  id="photo"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="firstName">Vorname</label>
              <input id="firstName" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="lastName">Nachname</label>
              <input id="lastName" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="username">Nutzername</label>
              <input id="username" required value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="phone">Telefonnummer</label>
              <input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" />
            </div>

            <div className="field">
              <label htmlFor="birthday">Geburtstag</label>
              <input id="birthday" type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
            </div>

            <div className="field">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={showBirthday}
                  onChange={(e) => setShowBirthday(e.target.checked)}
                  style={{ width: 'auto' }}
                />
                Meinen Geburtstag für bestätigte Kontakte sichtbar machen
              </label>
            </div>

            <div className="field">
              <label htmlFor="contactEmail">Email (für Kontakte sichtbar)</label>
              <input id="contactEmail" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="Optional" />
            </div>
            <div className="field">
              <label htmlFor="website">Webseite</label>
              <input id="website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" />
            </div>
            <div className="field">
              <label htmlFor="instagram">Instagram</label>
              <input id="instagram" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="Optional" />
            </div>
            <div className="field">
              <label htmlFor="tiktok">TikTok</label>
              <input id="tiktok" value={tiktok} onChange={(e) => setTiktok(e.target.value)} placeholder="Optional" />
            </div>
            <div className="field">
              <label htmlFor="info">Info</label>
              <textarea id="info" rows={3} value={info} onChange={(e) => setInfo(e.target.value)} placeholder="Optional, kurzer Text über dich" />
            </div>

            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Wird gespeichert...' : 'Visitenkarte speichern'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
