import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function ResetPassword({ onDone }) {
  const [password1, setPassword1] = useState('')
  const [password2, setPassword2] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const passwordsDontMatch = password1.length > 0 && password2.length > 0 && password1 !== password2
  const canSubmit = password1.length >= 6 && password2.length >= 6 && password1 === password2 && !saving

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password1.length < 6) {
      setError('Das Passwort muss mindestens 6 Zeichen haben.')
      return
    }
    if (password1 !== password2) {
      setError('Die beiden Passwörter stimmen nicht überein.')
      return
    }

    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: password1 })

    if (error) {
      setError(error.message)
      setSaving(false)
    } else {
      onDone?.()
    }
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>Neues Passwort festlegen</h1>
      </div>
      <main>
        {error && <div className="error-box">{error}</div>}
        {passwordsDontMatch && !error && (
          <div className="error-box">Die beiden Passwörter stimmen nicht überein.</div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="newPassword1">Neues Passwort</label>
            <input
              id="newPassword1"
              type="password"
              required
              minLength={6}
              value={password1}
              onChange={(e) => setPassword1(e.target.value)}
              placeholder="mindestens 6 Zeichen"
              autoComplete="new-password"
            />
          </div>
          <div className="field">
            <label htmlFor="newPassword2">Neues Passwort wiederholen</label>
            <input
              id="newPassword2"
              type="password"
              required
              minLength={6}
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              placeholder="Passwort erneut eingeben"
              autoComplete="new-password"
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={!canSubmit}>
            {saving ? 'Einen Moment...' : 'Passwort festlegen'}
          </button>
        </form>
      </main>
    </div>
  )
}
