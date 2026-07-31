import { supabase } from '../lib/supabaseClient'
import { useCity } from '../lib/useCity.js'

export default function AccountBlocked({ status }) {
  const { name: cityName } = useCity()
  async function handleLogout() {
    await supabase.auth.signOut()
  }

  const isArchived = status === 'archiviert'

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">{cityName}g</div>
        <h1>Hinweis</h1>
      </div>
      <main>
        <div className="card">
          {isArchived ? (
            <>
              <p style={{ margin: '0 0 12px' }}>
                Dieses Konto wurde zur Löschung eingereicht und ist archiviert. Es ist für andere Nutzer nicht mehr sichtbar.
              </p>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-soft)' }}>
                Falls das ein Irrtum war oder du das Konto reaktivieren möchtest, wende dich bitte an den Support:
              </p>
            </>
          ) : (
            <>
              <p style={{ margin: '0 0 12px' }}>
                Sorry, hier ist etwas schiefgelaufen. Dein Zugang ist aktuell eingeschränkt.
              </p>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-soft)' }}>
                Bei Fragen wende dich bitte an den Support:
              </p>
            </>
          )}
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
