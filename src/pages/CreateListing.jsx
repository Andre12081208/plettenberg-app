import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function CreateListing({ userId, onDone, onBack }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
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

    let imageUrl = null

    try {
      if (file) {
        const ext = file.name.split('.').pop()
        const path = `${userId}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('marketplace-images')
          .upload(path, file)

        if (uploadError) throw uploadError

        const { data } = supabase.storage.from('marketplace-images').getPublicUrl(path)
        imageUrl = data.publicUrl
      }

      const { error: dbError } = await supabase.from('marketplace_listings').insert({
        seller_id: userId,
        title: title.trim(),
        description: description.trim() || null,
        price: price ? parseFloat(price) : null,
        image_url: imageUrl
      })

      if (dbError) throw dbError

      onDone()
    } catch (err) {
      setError(err.message || 'Etwas ist schiefgelaufen.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>Anzeige erstellen</h1>
      </div>
      <main>
        <button className="link-text" onClick={onBack} style={{ marginBottom: 16 }}>← Zurück</button>

        {error && <div className="error-box">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="avatar-upload">
            <div className="avatar-preview" style={{ borderRadius: 10, width: 72, height: 72 }}>
              {preview ? <img src={preview} alt="Vorschau" /> : '📷'}
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
            <label htmlFor="title">Titel</label>
            <input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="price">Preis in €</label>
            <input
              id="price"
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Optional, z.B. für Verschenken leer lassen"
            />
          </div>

          <div className="field">
            <label htmlFor="description">Beschreibung</label>
            <textarea id="description" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Wird veröffentlicht...' : 'Anzeige veröffentlichen'}
          </button>
        </form>
      </main>
    </div>
  )
}
