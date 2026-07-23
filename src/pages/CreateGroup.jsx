import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function CreateGroup({ onDone, onBack }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)

    const { data, error } = await supabase.rpc('create_group', {
      group_name: name.trim(),
      group_description: description.trim() || null
    })

    if (error) {
      setError(error.message)
      setSaving(false)
    } else {
      onDone(data, name.trim())
    }
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>Neue Gruppe</h1>
      </div>
      <main>
        <button className="link-text" onClick={onBack} style={{ marginBottom: 16 }}>← Zurück</button>

        {error && <div className="error-box">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="name">Gruppenname</label>
            <input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="description">Beschreibung</label>
            <textarea id="description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? 'Wird erstellt...' : 'Gruppe erstellen'}
          </button>
        </form>
      </main>
    </div>
  )
}
