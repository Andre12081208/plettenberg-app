import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Settings({ profile, onBack, onProfileUpdated }) {
  const [themePreference, setThemePreference] = useState(profile.theme_preference || 'auto')
  const [themeSaving, setThemeSaving] = useState(false)
  const [themeMsg, setThemeMsg] = useState('')

  const [newEmail, setNewEmail] = useState('')
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailMsg, setEmailMsg] = useState('')
  const [emailError, setEmailError] = useState('')

  const [newPassword, setNewPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState('')
  const [passwordError, setPasswordError] = useState('')

  async function handleSaveTheme(e) {
    e.preventDefault()
    setThemeSaving(true)
    setThemeMsg('')
    const { error } = await supabase.from('private_profiles').update({ theme_preference: themePreference }).eq('id', profile.id)
    if (!error) {
      setThemeMsg('Gespeichert.')
      onProfileUpdated?.()
    }
    setThemeSaving(false)
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

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>Einstellungen</h1>
      </div>
      <main>
        <button className="link-text" onClick={onBack} style={{ marginBottom: 16 }}>← Zurück</button>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Erscheinungsbild</h3>
          {themeMsg && <div className="error-box" style={{ background: '#E5EFEA', color: '#1F4D3F', borderColor: '#1F4D3F' }}>{themeMsg}</div>}
          <form onSubmit={handleSaveTheme}>
            <div className="field">
              <select value={themePreference} onChange={(e) => setThemePreference(e.target.value)}>
                <option value="auto">Automatisch (nach Geräteeinstellung)</option>
                <option value="hell">Hell</option>
                <option value="dunkel">Dunkel</option>
              </select>
            </div>
            <button className="btn btn-secondary" type="submit" disabled={themeSaving}>
              {themeSaving ? 'Wird gespeichert...' : 'Speichern'}
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

        <button className="btn btn-secondary" onClick={handleLogout}>Abmelden</button>
      </main>
    </div>
  )
}
