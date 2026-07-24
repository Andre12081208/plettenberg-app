import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function CreateListing({ userId, onDone, onBack }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isFree, setIsFree] = useState(false)
  const [price, setPrice] = useState('')
  const [pickupAvailable, setPickupAvailable] = useState(true)
  const [deliveryAvailable, setDeliveryAvailable] = useState(false)
  const [deliveryFee, setDeliveryFee] = useState('')
  const [files, setFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleFileChange(e) {
    const selected = Array.from(e.target.files || []).slice(0, 8)
    setFiles(selected)
    setPreviews(selected.map((f) => URL.createObjectURL(f)))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!isFree && (!price || parseFloat(price) <= 0)) {
      setError('Bitte einen Preis angeben oder "Zu verschenken" auswählen.')
      return
    }
    if (!pickupAvailable && !deliveryAvailable) {
      setError('Bitte mindestens "Abholung möglich" oder "Ich liefere selbst" auswählen.')
      return
    }

    setLoading(true)

    try {
      const imageUrls = []

      for (const file of files) {
        const ext = file.name.split('.').pop()
        const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('marketplace-images')
          .upload(path, file)

        if (uploadError) throw uploadError

        const { data } = supabase.storage.from('marketplace-images').getPublicUrl(path)
        imageUrls.push(data.publicUrl)
      }

      const { error: dbError } = await supabase.from('marketplace_listings').insert({
        seller_id: userId,
        title: title.trim(),
        description: description.trim() || null,
        price: isFree ? null : parseFloat(price),
        is_free: isFree,
        image_url: imageUrls[0] || null,
        image_urls: imageUrls,
        pickup_available: pickupAvailable,
        delivery_available: deliveryAvailable,
        delivery_fee: deliveryAvailable && deliveryFee ? parseFloat(deliveryFee) : null
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
          <div className="field">
            <label className="link-text" htmlFor="photos" style={{ cursor: 'pointer' }}>
              Fotos auswählen (bis zu 8)
            </label>
            <input
              id="photos"
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            {previews.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                {previews.map((src, i) => (
                  <img key={i} src={src} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8 }} />
                ))}
              </div>
            )}
            <div className="hint">{files.length}/8 ausgewählt</div>
          </div>

          <div className="field">
            <label htmlFor="title">Titel</label>
            <input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="field">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={isFree}
                onChange={(e) => { setIsFree(e.target.checked); if (e.target.checked) setPrice('') }}
              />
              Zu verschenken
            </label>
          </div>

          {!isFree && (
            <div className="field">
              <label htmlFor="price">Preis in €</label>
              <input
                id="price"
                type="number"
                step="0.01"
                min="0"
                required={!isFree}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="z.B. 15.00"
              />
            </div>
          )}

          <div className="field">
            <label style={{ display: 'block', marginBottom: 6 }}>Übergabe</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <input
                type="checkbox"
                checked={pickupAvailable}
                onChange={(e) => setPickupAvailable(e.target.checked)}
              />
              Abholung bei mir möglich
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={deliveryAvailable}
                onChange={(e) => setDeliveryAvailable(e.target.checked)}
              />
              Ich liefere selbst
            </label>
          </div>

          {deliveryAvailable && (
            <div className="field">
              <label htmlFor="deliveryFee">Liefergebühr in € (leer lassen = kostenlos)</label>
              <input
                id="deliveryFee"
                type="number"
                step="0.01"
                min="0"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(e.target.value)}
                placeholder="z.B. 5.00"
              />
            </div>
          )}

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
