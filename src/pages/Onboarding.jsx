export default function Onboarding({ onChoose }) {
  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>Wer bist du?</h1>
      </div>
      <main>
        <button className="card-choice" onClick={() => onChoose('private')}>
          <span className="eyebrow">Kostenlos</span>
          <h3>Ich bin Einwohner</h3>
          <p>Für private Nutzung. Dein Profil bleibt für andere Nutzer unsichtbar.</p>
        </button>

        <button className="card-choice" onClick={() => onChoose('business')}>
          <span className="eyebrow">Für Betriebe</span>
          <h3>Ich vertrete ein Unternehmen oder einen Verein</h3>
          <p>Nach dem Anlegen prüfen wir dein Profil, bevor es sichtbar wird.</p>
        </button>
      </main>
    </div>
  )
}
