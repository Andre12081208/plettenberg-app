import { supabase } from '../lib/supabaseClient'

export default function AccountBlocked() {
  async function handleLogout() {
    await supabase.auth.signOut()
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>Hinweis</h1>
      </div>
      <main>
        <div className="card">
          <p style={{ margin: '0 0 12px' }}>
            Sorry, hier ist etwas schiefgelaufen. Dein Zugang ist aktuell eingeschränkt.
          </p>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-soft)' }}>
            Bei Fragen wende dich bitte an den Support:
          </p>
          <p style={{ margin: '4px 0 0' }}>
            <a href="mailto:andremanuel.koenig@gmail.com" style={{ color: 'var(--forest)', fontWeight: 600 }}>
              andremanuel.koenig@gmail.com
            </a>
          </p>
        </div>

        <button className="btn btn-secondary" onClick={handleLogout}>Abmelden</button>
      </main>
    </div>
  )
}
