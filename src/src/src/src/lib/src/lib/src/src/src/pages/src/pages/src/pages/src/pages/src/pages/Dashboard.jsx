import { supabase } from '../lib/supabaseClient'

const STATUS_LABELS = {
  in_pruefung: { text: 'In Prüfung', cls: 'status-pruefung' },
  vertrag_in_arbeit: { text: 'Vertrag in Arbeit', cls: 'status-vertrag' },
  live: { text: 'Live', cls: 'status-live' },
  abgelehnt: { text: 'Abgelehnt', cls: 'status-abgelehnt' }
}

export default function Dashboard({ profileType, profile, isAdmin, onOpenAdmin }) {
  async function handleLogout() {
    await supabase.auth.signOut()
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>Willkommen{profileType === 'private' ? `, ${profile.first_name}` : ''}</h1>
      </div>
      <main>
        {profileType === 'private' ? (
          <div className="card">
            <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: 14 }}>
              Dein Profil ist angelegt und für andere Nutzer nicht sichtbar. Bald kommen hier Ankündigungen
              aus der Stadt und ein Verzeichnis von Betrieben.
            </p>
          </div>
        ) : (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <h3 style={{ margin: 0 }}>{profile.company_name}</h3>
              <span className={`status-pill ${STATUS_LABELS[profile.status]?.cls}`}>
                {STATUS_LABELS[profile.status]?.text}
              </span>
            </div>
            <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: 14 }}>
              {profile.status === 'in_pruefung' &&
                'Wir melden uns bei dir, sobald dein Profil geprüft wurde und ein Vertrag zustande kommt.'}
              {profile.status === 'vertrag_in_arbeit' &&
                'Der Vertrag wird gerade fertiggemacht. Danach schalten wir dein Profil live.'}
              {profile.status === 'live' &&
                'Dein Profil ist öffentlich sichtbar.'}
              {profile.status === 'abgelehnt' &&
                'Dein Profil wurde aktuell nicht freigeschaltet.'}
            </p>
          </div>
        )}

        {isAdmin && (
          <button className="btn btn-primary" onClick={onOpenAdmin} style={{ marginBottom: 12 }}>
            Gewerbeanfragen verwalten
          </button>
        )}

        <button className="btn btn-secondary" onClick={handleLogout}>Abmelden</button>
      </main>
    </div>
  )
}
