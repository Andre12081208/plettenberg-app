import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function CreateChannel({ userId, onDone, onBack }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)

    const { data, error } = await supabase
      .from('channels')
      .insert({ name: name.trim(), description: description.trim() || null, created_by: userId })
      .select('id')
      .single()

    if (error) {
      setError(error.message)
      setSaving(false)
      return
    }

    await supabase.from('channel_follows').insert({ user_id: userId, channel_id: data.id })

    onDone(data.id)
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>Neuer Channel</h1>
      </div>
      <main>
        <button className="link-text" onClick={onBack} style={{ marginBottom: 16 }}>← Zurück</button>

        {error && <div className="error-box">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="name">Channel-Name</label>
            <input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="description">Beschreibung</label>
            <textarea id="description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? 'Wird erstellt...' : 'Channel erstellen'}
          </button>
        </form>
      </main>
    </div>
  )
}
