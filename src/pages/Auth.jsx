import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Auth({ confirmedMessage }) {
  const [mode, setMode] = useState(confirmedMessage ? 'login' : 'signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })
      if (error) {
        setError(übersetzeFehler(error.message))
      } else {
        setInfo('Fast fertig: wir haben dir eine Bestätigungs-Email geschickt. Bitte den Link darin öffnen, dann kannst du dich anmelden.')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(übersetzeFehler(error.message))
      }
    }
    setLoading(false)
  }

  function übersetzeFehler(msg) {
    if (msg.includes('already registered')) return 'Diese Email ist schon registriert. Versuch dich anzumelden.'
    if (msg.includes('Invalid login credentials')) return 'Email oder Passwort stimmen nicht.'
    if (msg.includes('Password should be')) return 'Das Passwort muss mindestens 6 Zeichen haben.'
    return msg
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>{mode === 'signup' ? 'Konto erstellen' : 'Anmelden'}</h1>
      </div>
      <main>
        {error && <div className="error-box">{error}</div>}
        {confirmedMessage && <div className="error-box" style={{ background: '#E5EFEA', color: '#1F4D3F', borderColor: '#1F4D3F' }}>{confirmedMessage}</div>}
        {info && <div className="error-box" style={{ background: '#E5EFEA', color: '#1F4D3F', borderColor: '#1F4D3F' }}>{info}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="du@beispiel.de"
              autoComplete="email"
            />
          </div>
          <div className="field">
            <label htmlFor="password">Passwort</label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="mindestens 6 Zeichen"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Einen Moment...' : mode === 'signup' ? 'Konto erstellen' : 'Anmelden'}
          </button>
        </form>

        <p className="center-note">
          {mode === 'signup' ? 'Schon registriert?' : 'Noch kein Konto?'}{' '}
          <button
            className="link-text"
            onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError(''); setInfo('') }}
          >
            {mode === 'signup' ? 'Anmelden' : 'Konto erstellen'}
          </button>
        </p>
      </main>
    </div>
  )
}
