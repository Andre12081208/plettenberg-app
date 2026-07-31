export default function ChooseCity({ cities, onChoose }) {
  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">Plattform</div>
        <h1>Wähle deine Stadt</h1>
      </div>
      <main>
        <p className="hint" style={{ marginBottom: 16 }}>In welcher Stadt lebst oder arbeitest du?</p>
        {cities.map((city) => (
          <button key={city.id} className="card-choice" onClick={() => onChoose(city)}>
            <h3>{city.name}</h3>
          </button>
        ))}
      </main>
    </div>
  )
}
