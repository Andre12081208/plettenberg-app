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

        <button className="card-choice" onClick={() => onChoose('anbieter')}>
          <span className="eyebrow">Für Bürger sichtbar</span>
          <h3>Ich biete etwas für Bürger an</h3>
          <p>Restaurant, Verein, Bürgerdienst. Erscheint nach Prüfung öffentlich.</p>
        </button>

        <button className="card-choice" onClick={() => onChoose('unternehmen')}>
          <span className="eyebrow">Kein Bürgerkontakt</span>
          <h3>Wir sind ein Unternehmen</h3>
          <p>Für Firmen, die Flip intern nutzen möchten. Erscheint nicht öffentlich.</p>
        </button>
      </main>
    </div>
  )
}
