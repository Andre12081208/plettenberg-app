import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function MyProfile({ userId, profile, onBack, onProfileUpdated }) {
  const [firstName, setFirstName] = useState(profile.first_name || '')
  const [lastName, setLastName] = useState(profile.last_name || '')
  const [username, setUsername] = useState(profile.username || '')
  const [phone, setPhone] = useState(profile.phone || '')
  const [birthday, setBirthday] = useState(profile.birthday || '')
  const [showBirthday, setShowBirthday] = useState(profile.show_birthday_to_contacts || false)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(profile.avatar_url || null)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const [error, setError] = useState('')

  const [newEmail, setNewEmail] = useState('')
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailMsg, setEmailMsg] = useState('')
  const [emailError, setEmailError] = useState('')

  const [newPassword, setNewPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState('')
  const [passwordError, setPasswordError] = useState('')

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

  async function handleChangeEmail(e) {
    e.preventDefault()
    setEmailError('')
    setEmailMsg('')
    setEmailSaving(true)

    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() })

    if (error) {
      setEmailError(error.message)
    } else {
      setEmailMsg('Bestätigungslinks wurden an die alte und neue Email-Adresse geschickt. Erst nach Bestätigung ist die Änderung wirksam.')
      setNewEmail('')
    }
    setEmailSaving(false)
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    setPasswordError('')
    setPasswordMsg('')

    if (newPassword.length < 6) {
      setPasswordError('Das Passwort muss mindestens 6 Zeichen haben.')
      return
    }

    setPasswordSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      setPasswordError(error.message)
    } else {
      setPasswordMsg('Passwort geändert.')
      setNewPassword('')
    }
    setPasswordSaving(false)
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

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Stammdaten</h3>
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

            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Wird gespeichert...' : 'Stammdaten speichern'}
            </button>
          </form>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Email ändern</h3>
          {emailError && <div className="error-box">{emailError}</div>}
          {emailMsg && <div className="error-box" style={{ background: '#E5EFEA', color: '#1F4D3F', borderColor: '#1F4D3F' }}>{emailMsg}</div>}
          <form onSubmit={handleChangeEmail}>
            <div className="field">
              <label htmlFor="newEmail">Neue Email-Adresse</label>
              <input
                id="newEmail"
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="neue@email.de"
              />
            </div>
            <button className="btn btn-secondary" type="submit" disabled={emailSaving}>
              {emailSaving ? 'Einen Moment...' : 'Email ändern'}
            </button>
          </form>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Passwort ändern</h3>
          {passwordError && <div className="error-box">{passwordError}</div>}
          {passwordMsg && <div className="error-box" style={{ background: '#E5EFEA', color: '#1F4D3F', borderColor: '#1F4D3F' }}>{passwordMsg}</div>}
          <form onSubmit={handleChangePassword}>
            <div className="field">
              <label htmlFor="newPassword">Neues Passwort</label>
              <input
                id="newPassword"
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="mindestens 6 Zeichen"
              />
            </div>
            <button className="btn btn-secondary" type="submit" disabled={passwordSaving}>
              {passwordSaving ? 'Einen Moment...' : 'Passwort ändern'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
