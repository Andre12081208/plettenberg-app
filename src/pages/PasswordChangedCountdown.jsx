import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function PasswordChangedCountdown() {
  const [count, setCount] = useState(3)

  useEffect(() => {
    if (count <= 0) {
      supabase.auth.signOut({ scope: 'global' })
      return
    }
    const timer = setTimeout(() => setCount((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [count])

  return (
    <div className="app-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="card" style={{ textAlign: 'center', maxWidth: 360 }}>
        <h3 style={{ marginTop: 0 }}>Passwort geändert</h3>
        <p>Du wirst jetzt auf allen Geräten abgemeldet in {count}...</p>
      </div>
    </div>
  )
}
