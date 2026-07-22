import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function PrivateProfileForm({ userId, onDone }) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [username, setUsername] = useState('')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleFileChange(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    let avatarUrl = null

    try {
      if (file) {
        const ext = file.name.split('.').pop()
        const path = `${userId}/avatar.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, file, { upsert: true })

        if (uploadError) throw uploadError

        const { data } = supabase.storage.from('avatars').getPublicUrl(path)
        avatarUrl = data.publicUrl
      }

      const { error: dbError } = await supabase.from('private_profiles').insert({
        id: userId,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        username: username.trim().toLowerCase(),
        avatar_url: avatarUrl
      })

      if (dbError) throw dbError

      onDone()
    } catch (err) {
      if (err.message?.includes('duplicate key') || err.message?.includes('already exists')) {
        setError('Dieser Nutzername ist schon vergeben, wähl bitte einen anderen.')
      } else {
        setError(err.message || 'Etwas ist schiefgelaufen, versuch es noch einmal.')
      }
    } finally {
      setLoading(false)
    }
  }

  const initials = `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase()

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>Dein Profil</h1>
      </div>
      <main>
        {error && <div className="error-box">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="avatar-upload">
            <div className="avatar-preview">
              {preview ? <img src={preview} alt="Vorschau" /> : (initials || '?')}
            </div>
            <div>
              <label className="link-text" htmlFor="photo" style={{ cursor: 'pointer' }}>
                Foto auswählen
              </label>
              <input
                id="photo"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <div className="hint">Optional</div>
            </div>
          </div>

          <div className="field">
            <label htmlFor="firstName">Vorname</label>
            <input
              id="firstName"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="lastName">Nachname</label>
            <input
              id="lastName"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="username">Nutzername</label>
            <input
              id="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="z.B. wanderfreund23"
            />
            <div className="hint">Frei wählbar, nicht dein echter Name. Andere finden dich nur darüber.</div>
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Wird gespeichert...' : 'Profil anlegen'}
          </button>
        </form>
      </main>
    </div>
  )
}
