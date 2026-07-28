import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function BusinessAccessSecurity({ onBack }) {
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

  const [confirmingLogoutAll, setConfirmingLogoutAll] = useState(false)
  const [loggingOutAll, setLoggingOutAll] = useState(false)

  const canSubmitNewPassword = newPassword1.length >= 6 && newPassword2.length >= 6 && newPassword1 === newPassword2 && !passwordSaving

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
      const { data: userData } = await supabase.auth.getUser()
      if (userData?.user?.id) {
        await supabase.from('business_account_events').insert({ business_profile_id: userData.user.id, event_type: 'passwort_geaendert' })
      }
      await supabase.auth.signOut({ scope: 'global' })
    }
  }

  async function handleLogoutAllDevices() {
    setLoggingOutAll(true)
    await supabase.auth.signOut({ scope: 'global' })
  }

  return (
    <>
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>Zugang &amp; Sicherheit</h1>
      </div>
      <main style={{ paddingBottom: 90 }}>
        <button className="link-text" onClick={onBack} style={{ marginBottom: 16 }}>← Zurück zu Einstellungen</button>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>E-Mail ändern</h3>
          {emailError && <div className="error-box">{emailError}</div>}
          {emailMsg && <div className="error-box" style={{ background: '#E5EFEA', color: '#1F4D3F', borderColor: '#1F4D3F' }}>{emailMsg}</div>}
          <form onSubmit={handleChangeEmail}>
            <div className="field">
              <label htmlFor="newEmail">Neue E-Mail-Adresse</label>
              <input id="newEmail" type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            </div>
            <button className="btn btn-primary" type="submit" disabled={emailSaving}>
              {emailSaving ? 'Wird gesendet...' : 'E-Mail ändern'}
            </button>
          </form>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Passwort ändern</h3>
          {passwordError && <div className="error-box">{passwordError}</div>}

          {!currentPasswordVerified ? (
            <form onSubmit={handleVerifyCurrentPassword}>
              {currentPasswordError && <div className="error-box">{currentPasswordError}</div>}
              <div className="field">
                <label htmlFor="currentPassword">Aktuelles Passwort</label>
                <input id="currentPassword" type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
              </div>
              <button className="btn btn-primary" type="submit" disabled={verifyingCurrent || !currentPassword}>
                {verifyingCurrent ? 'Wird geprüft...' : 'Weiter'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleChangePassword}>
              <div className="field">
                <label htmlFor="newPassword1">Neues Passwort</label>
                <input id="newPassword1" type="password" required value={newPassword1} onChange={(e) => setNewPassword1(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="newPassword2">Neues Passwort wiederholen</label>
                <input id="newPassword2" type="password" required value={newPassword2} onChange={(e) => setNewPassword2(e.target.value)} />
              </div>
              <p className="hint" style={{ marginBottom: 12 }}>
                Du wirst nach der Änderung aus Sicherheitsgründen automatisch abgemeldet.
              </p>
              <button className="btn btn-primary" type="submit" disabled={!canSubmitNewPassword}>
                {passwordSaving ? 'Wird geändert...' : 'Passwort ändern'}
              </button>
            </form>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Sitzungen</h3>
          <p style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--ink-soft)' }}>
            Melde dich überall ab, falls du dein Konto auf einem fremden oder verlorenen Gerät genutzt hast.
          </p>
          {confirmingLogoutAll ? (
            <div className="btn-row">
              <button className="btn btn-secondary" onClick={handleLogoutAllDevices} disabled={loggingOutAll}>
                {loggingOutAll ? 'Wird abgemeldet...' : 'Wirklich überall abmelden'}
              </button>
              <button className="btn btn-secondary" onClick={() => setConfirmingLogoutAll(false)}>Abbrechen</button>
            </div>
          ) : (
            <button className="btn btn-secondary" onClick={() => setConfirmingLogoutAll(true)}>Von allen Geräten abmelden</button>
          )}
        </div>
      </main>
    </>
  )
}
