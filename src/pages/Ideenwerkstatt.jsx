import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const CATEGORIES = {
  idee: { icon: '💡', label: 'Neue Idee' },
  verbesserung: { icon: '✨', label: 'Verbesserung' },
  fehler: { icon: '🐞', label: 'Fehler melden' }
}

const STATUSES = {
  eingegangen: { icon: '⚪', label: 'Eingegangen', color: '#9CA3AF' },
  in_pruefung: { icon: '🟡', label: 'In Prüfung', color: '#EAB308' },
  info_benoetigt: { icon: '🟠', label: 'Weitere Informationen benötigt', color: '#F97316' },
  in_entwicklung: { icon: '🔵', label: 'In Entwicklung', color: '#3B82F6' },
  geplant: { icon: '🟢', label: 'Geplant', color: '#22C55E' },
  umgesetzt: { icon: '✅', label: 'Umgesetzt', color: '#16A34A' },
  nicht_geplant: { icon: '❌', label: 'Derzeit nicht geplant', color: '#EF4444' }
}

function StatusPill({ status }) {
  const meta = STATUSES[status] || STATUSES.eingegangen
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px',
      borderRadius: 999, fontSize: 12, fontWeight: 600, background: `${meta.color}22`, color: meta.color
    }}>
      {meta.icon} {meta.label}
    </span>
  )
}

export default function Ideenwerkstatt({ userId, onBack }) {
  const [screen, setScreen] = useState('home')
  const [category, setCategory] = useState('idee')
  const [ideas, setIdeas] = useState([])
  const [selectedIdea, setSelectedIdea] = useState(null)
  const [lastIdeaNumber, setLastIdeaNumber] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (screen === 'list') loadIdeas()
  }, [screen])

  async function loadIdeas() {
    setLoading(true)
    setError('')
    const { data, error } = await supabase
      .from('ideas')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) setError(error.message)
    setIdeas(data || [])
    setLoading(false)
  }

  function openSubmit(cat) {
    setCategory(cat)
    setScreen('submit')
  }

  function openDetail(idea) {
    setSelectedIdea(idea)
    setScreen('detail')
  }

  if (screen === 'submit') {
    return (
      <IdeaForm
        userId={userId}
        initialCategory={category}
        onCancel={() => setScreen('home')}
        onDone={(ideaNumber) => { setLastIdeaNumber(ideaNumber); setScreen('success') }}
      />
    )
  }

  if (screen === 'success') {
    return (
      <div className="app-shell">
        <div className="topbar">
          <div className="mark">Plettenberg</div>
          <h1>💡 Ideenwerkstatt</h1>
        </div>
        <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: '60vh' }}>
          <h2>🎉 Vielen Dank!</h2>
          <p style={{ maxWidth: 320 }}>
            Deine Idee wurde erfolgreich an unser Entwicklerteam übermittelt.
          </p>
          <p style={{ maxWidth: 320, marginBottom: 20 }}>
            Wir prüfen jede Einsendung persönlich und halten dich über den Fortschritt auf dem Laufenden.
          </p>
          {lastIdeaNumber && (
            <p className="hint" style={{ marginBottom: 20 }}>Referenz: {lastIdeaNumber}</p>
          )}
          <button className="btn btn-primary" onClick={() => setScreen('list')}>Zu meinen Ideen</button>
        </main>
      </div>
    )
  }

  if (screen === 'list') {
    return (
      <div className="app-shell">
        <div className="topbar">
          <div className="mark">Plettenberg</div>
          <h1>Meine Ideen</h1>
        </div>
        <main>
          <button className="link-text" onClick={() => setScreen('home')} style={{ marginBottom: 16 }}>← Zurück</button>

          {error && <div className="error-box">{error}</div>}
          {loading && <div className="loading-dot">Lädt...</div>}
          {!loading && ideas.length === 0 && (
            <p className="center-note">Du hast noch keine Ideen eingereicht.</p>
          )}

          {!loading && ideas.map((idea) => (
            <div className="card" key={idea.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                <h3 style={{ margin: 0, fontSize: 16 }}>{idea.title}</h3>
                <StatusPill status={idea.status} />
              </div>
              <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--ink-soft)' }}>
                {CATEGORIES[idea.category]?.icon} {CATEGORIES[idea.category]?.label} · {idea.idea_number}
              </p>
              <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--ink-soft)' }}>
                {new Date(idea.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </p>
              <button className="btn btn-secondary" onClick={() => openDetail(idea)}>Details ansehen</button>
            </div>
          ))}
        </main>
      </div>
    )
  }

  if (screen === 'detail' && selectedIdea) {
    const idea = selectedIdea
    return (
      <div className="app-shell">
        <div className="topbar">
          <div className="mark">Plettenberg</div>
          <h1>{idea.idea_number}</h1>
        </div>
        <main>
          <button className="link-text" onClick={() => setScreen('list')} style={{ marginBottom: 16 }}>← Zurück</button>

          <h2 style={{ margin: '0 0 8px' }}>{idea.title}</h2>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <StatusPill status={idea.status} />
            <span className="status-pill status-live" style={{ fontSize: 12 }}>
              {CATEGORIES[idea.category]?.icon} {CATEGORIES[idea.category]?.label}
            </span>
          </div>

          <p className="hint" style={{ marginBottom: 16 }}>
            Eingereicht am {new Date(idea.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}, {new Date(idea.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
          </p>

          <div className="card">
            <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{idea.description}</p>
          </div>

          {idea.attachment_urls?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              {idea.attachment_urls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noreferrer">
                  <img src={url} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8 }} />
                </a>
              ))}
            </div>
          )}

          <p className="hint" style={{ marginTop: 20 }}>
            💬 Der Chat mit dem Entwicklerteam kommt im nächsten Schritt dazu.
          </p>
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>💡 Ideenwerkstatt</h1>
      </div>
      <main>
        <button className="link-text" onClick={onBack} style={{ marginBottom: 16 }}>← Zurück</button>

        <p className="hint" style={{ marginBottom: 20 }}>
          Hilf uns, die App weiterzuentwickeln. Egal ob neue Funktionen, Verbesserungen oder Fehler – jede Idee wird persönlich vom Entwicklerteam gelesen.
        </p>

        {Object.entries(CATEGORIES).map(([key, meta]) => (
          <button
            key={key}
            className="card"
            style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer' }}
            onClick={() => openSubmit(key)}
          >
            <span style={{ fontSize: 28 }}>{meta.icon}</span>
            <span style={{ fontWeight: 600, fontSize: 16 }}>{meta.label}</span>
          </button>
        ))}

        <button className="link-text" onClick={() => setScreen('list')} style={{ marginTop: 10 }}>
          Meine Ideen ansehen →
        </button>
      </main>
    </div>
  )
}

function IdeaForm({ userId, initialCategory, onCancel, onDone }) {
  const [category, setCategory] = useState(initialCategory)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('mittel')
  const [files, setFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function handleFileChange(e) {
    const selected = Array.from(e.target.files || []).slice(0, 5)
    setFiles(selected)
    setPreviews(selected.map((f) => URL.createObjectURL(f)))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!title.trim() || !description.trim()) {
      setError('Bitte Titel und Beschreibung ausfüllen.')
      return
    }

    setSaving(true)

    try {
      const attachmentUrls = []

      for (const file of files) {
        const ext = file.name.split('.').pop()
        const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: uploadError } = await supabase.storage.from('idea-attachments').upload(path, file)
        if (uploadError) throw uploadError

        const { data } = supabase.storage.from('idea-attachments').getPublicUrl(path)
        attachmentUrls.push(data.publicUrl)
      }

      const { data: inserted, error: dbError } = await supabase
        .from('ideas')
        .insert({
          user_id: userId,
          category,
          title: title.trim(),
          description: description.trim(),
          priority,
          attachment_urls: attachmentUrls
        })
        .select('idea_number')
        .single()

      if (dbError) throw dbError

      onDone(inserted.idea_number)
    } catch (err) {
      setError(err.message || 'Etwas ist schiefgelaufen.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>{CATEGORIES[category]?.icon} {CATEGORIES[category]?.label}</h1>
      </div>
      <main>
        <button className="link-text" onClick={onCancel} style={{ marginBottom: 16 }}>← Zurück</button>

        {error && <div className="error-box">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="category">Kategorie</label>
            <select id="category" value={category} onChange={(e) => setCategory(e.target.value)}>
              {Object.entries(CATEGORIES).map(([key, meta]) => (
                <option key={key} value={key}>{meta.icon} {meta.label}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="title">Titel</label>
            <input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="description">Beschreibung</label>
            <textarea id="description" rows={5} required value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="priority">Priorität</label>
            <select id="priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="niedrig">Niedrig</option>
              <option value="mittel">Mittel</option>
              <option value="hoch">Hoch</option>
              <option value="kritisch">Kritisch</option>
            </select>
          </div>

          <div className="field">
            <label className="link-text" htmlFor="attachments" style={{ cursor: 'pointer' }}>
              Screenshot, Bild oder Datei anhängen (optional, bis zu 5)
            </label>
            <input id="attachments" type="file" multiple onChange={handleFileChange} style={{ display: 'none' }} />
            {previews.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                {previews.map((src, i) => (
                  <img key={i} src={src} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8 }} />
                ))}
              </div>
            )}
          </div>

          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? 'Wird gesendet...' : 'Idee senden'}
          </button>
        </form>
      </main>
    </div>
  )
}
