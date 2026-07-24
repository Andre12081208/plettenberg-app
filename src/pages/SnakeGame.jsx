import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const GRID_SIZE = 16
const CELL_SIZE = 20
const SPEED_MS = 140

function todayStr() {
  return new Date().toLocaleDateString('en-CA') // ergibt JJJJ-MM-TT nach lokaler Zeit
}

export default function SnakeGame({ userId, onBack }) {
  const canvasRef = useRef(null)
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const [dailyHighScore, setDailyHighScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [started, setStarted] = useState(false)
  const [round, setRound] = useState(0)
  const [screen, setScreen] = useState('game') // 'game' | 'settings'

  const stateRef = useRef({
    snake: [{ x: 8, y: 8 }],
    direction: { x: 1, y: 0 },
    nextDirection: { x: 1, y: 0 },
    food: { x: 12, y: 8 }
  })

  useEffect(() => {
    loadHighScores()
    // eslint-disable-next-line
  }, [])

  async function loadHighScores() {
    const { data } = await supabase
      .from('game_scores')
      .select('high_score, daily_high_score, daily_date')
      .eq('user_id', userId)
      .eq('game_key', 'snake')
      .maybeSingle()

    setHighScore(data?.high_score || 0)
    setDailyHighScore(data?.daily_date === todayStr() ? (data?.daily_high_score || 0) : 0)
  }

  useEffect(() => {
    if (!gameOver) return
    updateHighScores(score)
    // eslint-disable-next-line
  }, [gameOver])

  async function updateHighScores(finalScore) {
    const today = todayStr()

    const newAllTime = Math.max(highScore, finalScore)
    const newDaily = Math.max(dailyHighScore, finalScore)

    await supabase.from('game_scores').upsert({
      user_id: userId,
      game_key: 'snake',
      high_score: newAllTime,
      daily_high_score: newDaily,
      daily_date: today,
      updated_at: new Date().toISOString()
    })

    setHighScore(newAllTime)
    setDailyHighScore(newDaily)
  }

  async function handleResetHighscore() {
    if (!window.confirm('Highscore (gesamt und heute) wirklich zurücksetzen?')) return
    await supabase.from('game_scores').delete().eq('user_id', userId).eq('game_key', 'snake')
    setHighScore(0)
    setDailyHighScore(0)
  }

  useEffect(() => {
    if (!started) return

    stateRef.current = {
      snake: [{ x: 8, y: 8 }],
      direction: { x: 1, y: 0 },
      nextDirection: { x: 1, y: 0 },
      food: randomFood([{ x: 8, y: 8 }])
    }
    setScore(0)
    setGameOver(false)

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    function randomFood(snake) {
      let pos
      do {
        pos = {
          x: Math.floor(Math.random() * GRID_SIZE),
          y: Math.floor(Math.random() * GRID_SIZE)
        }
      } while (snake.some((s) => s.x === pos.x && s.y === pos.y))
      return pos
    }

    function tick() {
      const s = stateRef.current
      s.direction = s.nextDirection

      const head = s.snake[0]
      const newHead = { x: head.x + s.direction.x, y: head.y + s.direction.y }

      if (
        newHead.x < 0 || newHead.x >= GRID_SIZE ||
        newHead.y < 0 || newHead.y >= GRID_SIZE ||
        s.snake.some((seg) => seg.x === newHead.x && seg.y === newHead.y)
      ) {
        setGameOver(true)
        return false
      }

      s.snake.unshift(newHead)

      if (newHead.x === s.food.x && newHead.y === s.food.y) {
        s.food = randomFood(s.snake)
        setScore((prev) => prev + 1)
      } else {
        s.snake.pop()
      }

      return true
    }

    function draw() {
      const s = stateRef.current
      ctx.fillStyle = '#F6F4EE'
      ctx.fillRect(0, 0, GRID_SIZE * CELL_SIZE, GRID_SIZE * CELL_SIZE)

      ctx.fillStyle = '#C97A3D'
      ctx.fillRect(s.food.x * CELL_SIZE, s.food.y * CELL_SIZE, CELL_SIZE - 2, CELL_SIZE - 2)

      ctx.fillStyle = '#1F4D3F'
      s.snake.forEach((seg) => {
        ctx.fillRect(seg.x * CELL_SIZE, seg.y * CELL_SIZE, CELL_SIZE - 2, CELL_SIZE - 2)
      })
    }

    let interval = setInterval(() => {
      const alive = tick()
      draw()
      if (!alive) clearInterval(interval)
    }, SPEED_MS)

    draw()

    function handleKey(e) {
      const s = stateRef.current
      if (e.key === 'ArrowUp' && s.direction.y === 0) s.nextDirection = { x: 0, y: -1 }
      if (e.key === 'ArrowDown' && s.direction.y === 0) s.nextDirection = { x: 0, y: 1 }
      if (e.key === 'ArrowLeft' && s.direction.x === 0) s.nextDirection = { x: -1, y: 0 }
      if (e.key === 'ArrowRight' && s.direction.x === 0) s.nextDirection = { x: 1, y: 0 }
    }

    window.addEventListener('keydown', handleKey)

    return () => {
      clearInterval(interval)
      window.removeEventListener('keydown', handleKey)
    }
  }, [started, round])

  function setDirection(dx, dy) {
    const s = stateRef.current
    if (dx !== 0 && s.direction.x === 0) s.nextDirection = { x: dx, y: 0 }
    if (dy !== 0 && s.direction.y === 0) s.nextDirection = { x: 0, y: dy }
  }

  if (screen === 'settings') {
    return (
      <div className="app-shell">
        <div className="topbar">
          <div className="mark">Plettenberg</div>
          <h1>Snake · Einstellungen</h1>
        </div>
        <main>
          <button className="link-text" onClick={() => setScreen('game')} style={{ marginBottom: 16 }}>← Zurück zum Spiel</button>

          <div className="card">
            <p style={{ margin: '0 0 6px' }}>Highscore gesamt: <strong>{highScore}</strong></p>
            <p style={{ margin: '0 0 14px' }}>Highscore heute: <strong>{dailyHighScore}</strong></p>
            <button className="btn btn-secondary" onClick={handleResetHighscore}>Highscore zurücksetzen</button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>Snake</h1>
          <button className="link-text" onClick={() => setScreen('settings')}>⚙️</button>
        </div>
      </div>
      <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <button className="link-text" onClick={onBack} style={{ marginBottom: 16, alignSelf: 'flex-start' }}>← Zurück</button>

        <div style={{ display: 'flex', gap: 16, marginBottom: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <p style={{ fontWeight: 600, margin: 0 }}>Punkte: {score}</p>
          <p style={{ fontWeight: 600, margin: 0, color: 'var(--clay)' }}>Heute: {dailyHighScore}</p>
          <p style={{ fontWeight: 600, margin: 0, color: 'var(--forest)' }}>Gesamt: {highScore}</p>
        </div>

        <canvas
          ref={canvasRef}
          width={GRID_SIZE * CELL_SIZE}
          height={GRID_SIZE * CELL_SIZE}
          style={{ border: '1px solid var(--line)', borderRadius: 10, maxWidth: '100%' }}
        />

        {!started && (
          <button className="btn btn-primary" style={{ marginTop: 16, width: 'auto', padding: '10px 24px' }} onClick={() => setStarted(true)}>
            Spiel starten
          </button>
        )}

        {gameOver && (
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <p style={{ fontWeight: 600 }}>Game Over – {score} Punkte</p>
            <button className="btn btn-primary" style={{ width: 'auto', padding: '10px 24px' }} onClick={() => setRound((r) => r + 1)}>
              Nochmal spielen
            </button>
          </div>
        )}

        {started && !gameOver && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 50px)', gap: 6, marginTop: 20 }}>
            <div />
            <button className="btn btn-secondary" style={{ padding: 10 }} onClick={() => setDirection(0, -1)}>↑</button>
            <div />
            <button className="btn btn-secondary" style={{ padding: 10 }} onClick={() => setDirection(-1, 0)}>←</button>
            <div />
            <button className="btn btn-secondary" style={{ padding: 10 }} onClick={() => setDirection(1, 0)}>→</button>
            <div />
            <button className="btn btn-secondary" style={{ padding: 10 }} onClick={() => setDirection(0, 1)}>↓</button>
            <div />
          </div>
        )}

        <p className="hint" style={{ marginTop: 16 }}>Am Computer gehen auch die Pfeiltasten.</p>
      </main>
    </div>
  )
}
