import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useCity } from '../lib/useCity.js'
import { useLanguage } from '../lib/LanguageContext.jsx'
import { translations, LANGUAGE_NAMES } from '../lib/translations.js'
import CalendarShareSettings from './CalendarShareSettings.jsx'
import { ANON_AVATAR_BANK } from '../lib/anonAvatar.js'

export default function Settings({ profile, onBack, onProfileUpdated, onPasswordChanged }) {
  const { name: cityName } = useCity()
  const { t, language, setLanguage } = useLanguage()
  const [themePreference, setThemePreference] = useState(profile.theme_preference || 'auto')
  const [themeSaving, setThemeSaving] = useState(false)
  const [themeMsg, setThemeMsg] = useState('')
  const [languageSaving, setLanguageSaving] = useState(false)
  const [showCalendarSharing, setShowCalendarSharing] = useState(false)

  const [newEmail, setNewEmail] = useState('')
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailMsg, setEmailMsg] = useState('')
  const [emailError, setEmailError] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [currentPasswordVerified, setCurrentPasswordVerified] = useState(false)
  const [verifyingCurrent, setVerifyingCurrent] = useState(false)
  const [currentPasswordError, setCurrentPasswordError] = useState('')

  const [newPassword1, setNewPassword1] = useState('')
  const [newPassword2, setNewPassword2] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [logoutCountdown, setLogoutCountdown] = useState(null)

  const passwordsDontMatch = newPassword1.length > 0 && newPassword2.length > 0 && newPassword1 !== newPassword2
  const canSubmitNewPassword = newPassword1.length >= 6 && newPassword2.length >= 6 && newPassword1 === newPassword2 && !passwordSaving

  useEffect(() => {
    if (logoutCountdown === null) return

    if (logoutCountdown <= 0) {
      supabase.auth.signOut({ scope: 'global' })
      return
    }

    const timer = setTimeout(() => setLogoutCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [logoutCountdown])

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

  async function handleChangeLanguage(newLang) {
    setLanguageSaving(true)
    setLanguage(newLang)
    const { error } = await supabase.from('private_profiles').update({ language_preference: newLang }).eq('id', profile.id)
    if (!error) onProfileUpdated?.()
    setLanguageSaving(false)
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

  async function handleVerifyCurrentPassword(e) {
    e.preventDefault()
    setCurrentPasswordError('')
    setVerifyingCurrent(true)

    const { data, error } = await supabase.rpc('verify_current_password', { password: currentPassword })

    if (error) {
      setCurrentPasswordError('Es gab ein Problem bei der Prüfung. Bitte versuch es erneut.')
    } else if (data === true) {
      setCurrentPasswordVerified(true)
    } else {
      setCurrentPasswordError('Das eingegebene Passwort ist nicht korrekt.')
    }
    setVerifyingCurrent(false)
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    setPasswordError('')

    if (newPassword1.length < 6) {
      setPasswordError('Das Passwort muss mindestens 6 Zeichen haben.')
      return
    }
    if (newPassword1 !== newPassword2) {
      setPasswordError('Die beiden Passwörter stimmen nicht überein.')
      return
    }

    setPasswordSaving(true)
    const { error } = await supabase.auth.updateUser({
      password: newPassword1,
      current_password: currentPassword
    })

    if (error) {
      setPasswordError(error.message)
      setPasswordSaving(false)
    } else {
      setLogoutCountdown(3)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  async function saveAnonAvatar(key) {
    await supabase.from('private_profiles').update({ anonymous_avatar_url: key }).eq('id', profile.id)
    onProfileUpdated?.()
  }

  async function handleAnonAvatarUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return

    const ext = file.name.split('.').pop()
    const path = `${profile.id}/anonymous.${ext}`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (uploadError) return

    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    await supabase.from('private_profiles').update({ anonymous_avatar_url: data.publicUrl }).eq('id', profile.id)
    onProfileUpdated?.()
  }

  if (showCalendarSharing) {
    return <CalendarShareSettings userId={profile.id} onBack={() => setShowCalendarSharing(false)} />
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">{cityName}</div>
        <h1>{t('settings.title')}</h1>
      </div>
      <main>
        <button className="link-text" onClick={onBack} style={{ marginBottom: 16 }}>← Zurück</button>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>{t('settings.language')}</h3>
          <div className="field">
            <select value={language} disabled={languageSaving} onChange={(e) => handleChangeLanguage(e.target.value)}>
              {Object.keys(translations).map((code) => (
                <option key={code} value={code}>{LANGUAGE_NAMES[code] || code}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>{t('settings.appearance')}</h3>
          {themeMsg && <div className="error-box" style={{ background: '#E5EFEA', color: '#1F4D3F', borderColor: '#1F4D3F' }}>{themeMsg}</div>}
          <form onSubmit={handleSaveTheme}>
            <div className="field">
              <select value={themePreference} onChange={(e) => setThemePreference(e.target.value)}>
                <option value="auto">{t('settings.auto')}</option>
                <option value="hell">{t('settings.light')}</option>
                <option value="dunkel">{t('settings.dark')}</option>
              </select>
            </div>
            <button className="btn btn-secondary" type="submit" disabled={themeSaving}>
              {themeSaving ? 'Wird gespeichert...' : 'Speichern'}
            </button>
          </form>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Kalender-Zugriff</h3>
          <p className="hint" style={{ marginBottom: 12 }}>Verwalte, wer deinen Kalender sehen und Termine vorschlagen darf.</p>
          <button className="btn btn-secondary" onClick={() => setShowCalendarSharing(true)}>Zugriff verwalten</button>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>{t('settings.changeEmail')}</h3>
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
          <h3 style={{ marginTop: 0 }}>{t('settings.changePassword')}</h3>

          {logoutCountdown !== null ? (
            <div className="error-box" style={{ background: '#E5EFEA', color: '#1F4D3F', borderColor: '#1F4D3F' }}>
              Dein Passwort wurde geändert. Du wirst jetzt auf allen Geräten abgemeldet in {logoutCountdown}...
            </div>
          ) : !currentPasswordVerified ? (
            <>
              {currentPasswordError && <div className="error-box">{currentPasswordError}</div>}
              <form onSubmit={handleVerifyCurrentPassword}>
                <div className="field">
                  <label htmlFor="currentPassword">Aktuelles Passwort</label>
                  <input
                    id="currentPassword"
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Dein jetziges Passwort"
                  />
                </div>
                <button className="btn btn-secondary" type="submit" disabled={verifyingCurrent || !currentPassword}>
                  {verifyingCurrent ? 'Wird geprüft...' : 'Bestätigen'}
                </button>
              </form>
            </>
          ) : (
            <>
              {passwordError && <div className="error-box">{passwordError}</div>}
              {passwordsDontMatch && !passwordError && (
                <div className="error-box">Die beiden Passwörter stimmen nicht überein.</div>
              )}
              <form onSubmit={handleChangePassword}>
                <div className="field">
                  <label htmlFor="newPassword1">Neues Passwort</label>
                  <input
                    id="newPassword1"
                    type="password"
                    required
                    minLength={6}
                    value={newPassword1}
                    onChange={(e) => setNewPassword1(e.target.value)}
                    placeholder="mindestens 6 Zeichen"
                  />
                </div>
                <div className="field">
                  <label htmlFor="newPassword2">Neues Passwort wiederholen</label>
                  <input
                    id="newPassword2"
                    type="password"
                    required
                    minLength={6}
                    value={newPassword2}
                    onChange={(e) => setNewPassword2(e.target.value)}
                    placeholder="Passwort erneut eingeben"
                  />
                </div>
                <button className="btn btn-secondary" type="submit" disabled={!canSubmitNewPassword}>
                  {passwordSaving ? 'Einen Moment...' : 'Passwort ändern'}
                </button>
              </form>
            </>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Anonymes Profilbild</h3>
          <p style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--ink-soft)' }}>
            Wird verwendet, wenn du anonym eine Anfrage sendest – damit sieht dein Gegenüber trotzdem ein Bild statt nur eine leere Fläche, ohne dass deine echte Identität erkennbar ist.
          </p>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
            {ANON_AVATAR_BANK.map((option) => (
              <button
                key={option.key}
                onClick={() => saveAnonAvatar(option.key)}
                style={{
                  width: 52, height: 52, borderRadius: '50%', border: profile.anonymous_avatar_url === option.key ? '3px solid var(--forest)' : '2px solid var(--line)',
                  background: option.color, fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                }}
              >
                {option.key.replace('emoji:', '')}
              </button>
            ))}
          </div>

          <label className="link-text" htmlFor="anonAvatarUpload" style={{ cursor: 'pointer' }}>Eigenes Bild hochladen</label>
          <input id="anonAvatarUpload" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAnonAvatarUpload} />

          {profile.anonymous_avatar_url && !profile.anonymous_avatar_url.startsWith('emoji:') && (
            <div className="avatar-preview" style={{ width: 52, height: 52, marginTop: 10 }}>
              <img src={profile.anonymous_avatar_url} alt="" />
            </div>
          )}
        </div>

        <button className="btn btn-secondary" onClick={handleLogout}>{t('settings.logout')}</button>
      </main>
    </div>
  )
}
