import { useEffect, useState } from 'react'
import jsPDF from 'jspdf'
import { supabase } from '../lib/supabaseClient'
import { useCity } from '../lib/useCity.js'

const STATUS_META = {
  zugesagt: { label: 'Zugesagt', color: '#2E7D46' },
  abgesagt: { label: 'Abgesagt', color: '#C0392B' },
  unsicher: { label: 'Unsicher', color: '#D9B23C' }
}

const BUCHUNG_META = {
  einnahme: { label: 'Einnahme', color: '#2E7D46', sign: '+' },
  einzahlung: { label: 'Einzahlung', color: '#2E7D46', sign: '+' },
  ausgabe: { label: 'Ausgabe', color: '#C0392B', sign: '-' }
}

function TerminForm({ stammtischId, onDone, onCancel }) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!title.trim() || !date) return
    setSaving(true)
    setError('')
    const { error } = await supabase.rpc('create_stammtisch_termin', {
      p_stammtisch_id: stammtischId,
      p_title: title.trim(),
      p_date: date,
      p_time: time || null,
      p_location: location.trim() || null,
      p_description: description.trim() || null
    })
    setSaving(false)
    if (error) { setError(error.message); return }
    onDone()
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Neuer Termin</h3>
      {error && <div className="error-box">{error}</div>}
      <input placeholder="Titel" value={title} onChange={(e) => setTitle(e.target.value)} style={{ marginBottom: 10 }} />
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ marginBottom: 10 }} />
      <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={{ marginBottom: 10 }} />
      <input placeholder="Treffpunkt" value={location} onChange={(e) => setLocation(e.target.value)} style={{ marginBottom: 10 }} />
      <textarea placeholder="Beschreibung (optional)" value={description} onChange={(e) => setDescription(e.target.value)} style={{ marginBottom: 10, minHeight: 70 }} />
      <div className="btn-row">
        <button className="btn btn-primary" onClick={handleSave} disabled={saving || !title.trim() || !date}>Speichern</button>
        <button className="btn btn-secondary" onClick={onCancel}>Abbrechen</button>
      </div>
    </div>
  )
}

function TerminDetail({ termin, isOrganisator, onBack, onDeleted }) {
  const [zusagen, setZusagen] = useState([])
  const [kommentare, setKommentare] = useState([])
  const [comment, setComment] = useState('')
  const [myStatus, setMyStatus] = useState(termin.my_status)

  useEffect(() => {
    load()
    // eslint-disable-next-line
  }, [])

  async function load() {
    const [{ data: z }, { data: k }] = await Promise.all([
      supabase.rpc('get_termin_zusagen_detail', { p_termin_id: termin.id }),
      supabase.rpc('get_termin_kommentare', { p_termin_id: termin.id })
    ])
    setZusagen(z || [])
    setKommentare(k || [])
  }

  async function setStatus(status) {
    setMyStatus(status)
    await supabase.rpc('set_termin_zusage', { p_termin_id: termin.id, p_status: status })
    load()
  }

  async function sendComment() {
    if (!comment.trim()) return
    await supabase.rpc('add_termin_kommentar', { p_termin_id: termin.id, p_content: comment.trim() })
    setComment('')
    load()
  }

  async function handleDelete() {
    if (!window.confirm('Diesen Termin wirklich löschen?')) return
    await supabase.rpc('delete_stammtisch_termin', { p_termin_id: termin.id })
    onDeleted()
  }

  return (
    <div>
      <button className="link-text" onClick={onBack} style={{ marginBottom: 16 }}>← Zurück zu den Terminen</button>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>{termin.title}</h3>
        <p className="hint">{new Date(termin.termin_date).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}{termin.termin_time ? ` · ${termin.termin_time.slice(0, 5)} Uhr` : ''}</p>
        {termin.location && <p>📍 {termin.location}</p>}
        {termin.description && <p style={{ whiteSpace: 'pre-wrap' }}>{termin.description}</p>}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Deine Rückmeldung</h3>
        <div className="btn-row">
          {Object.entries(STATUS_META).map(([key, meta]) => (
            <button
              key={key}
              className={myStatus === key ? 'btn btn-primary' : 'btn btn-secondary'}
              onClick={() => setStatus(key)}
            >
              {meta.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Wer kommt?</h3>
        {zusagen.length === 0 && <p className="hint">Noch keine Rückmeldungen.</p>}
        {zusagen.map((z) => (
          <div key={z.user_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
            <span>{z.display_name}</span>
            <span style={{ color: STATUS_META[z.status]?.color, fontWeight: 600, fontSize: 13 }}>{STATUS_META[z.status]?.label}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Kommentare</h3>
        {kommentare.map((k) => (
          <div key={k.id} style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{k.display_name}</div>
            <div>{k.content}</div>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <input placeholder="Kommentar schreiben..." value={comment} onChange={(e) => setComment(e.target.value)} style={{ flex: 1 }} />
          <button className="btn btn-primary" onClick={sendComment} disabled={!comment.trim()}>Senden</button>
        </div>
      </div>

      {isOrganisator && (
        <button className="link-text" onClick={handleDelete} style={{ color: '#C0392B' }}>Termin löschen</button>
      )}
    </div>
  )
}

function BuchungForm({ stammtischId, members, onDone, onCancel }) {
  const [type, setType] = useState('ausgabe')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [splitIds, setSplitIds] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function toggleSplit(userId) {
    setSplitIds((prev) => prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId])
  }

  async function handleSave() {
    const amountNum = parseFloat(amount.replace(',', '.'))
    if (!amountNum || amountNum <= 0) return
    setSaving(true)
    setError('')
    const { error } = await supabase.rpc('create_kasse_buchung', {
      p_stammtisch_id: stammtischId,
      p_type: type,
      p_amount: amountNum,
      p_description: description.trim() || null,
      p_split_user_ids: type === 'ausgabe' && splitIds.length > 0 ? splitIds : null
    })
    setSaving(false)
    if (error) { setError(error.message); return }
    onDone()
  }

  const share = splitIds.length > 0 && amount ? (parseFloat(amount.replace(',', '.')) / splitIds.length).toFixed(2) : null

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Neue Buchung</h3>
      {error && <div className="error-box">{error}</div>}
      <select value={type} onChange={(e) => setType(e.target.value)} style={{ marginBottom: 10 }}>
        <option value="ausgabe">Ausgabe</option>
        <option value="einnahme">Einnahme</option>
        <option value="einzahlung">Einzahlung</option>
      </select>
      <input placeholder="Betrag in €" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ marginBottom: 10 }} />
      <input placeholder="Beschreibung" value={description} onChange={(e) => setDescription(e.target.value)} style={{ marginBottom: 10 }} />

      {type === 'ausgabe' && (
        <>
          <p className="hint" style={{ marginBottom: 8 }}>Auf Teilnehmer aufteilen (optional):</p>
          {members.map((m) => (
            <label key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
              <input type="checkbox" checked={splitIds.includes(m.user_id)} onChange={() => toggleSplit(m.user_id)} />
              {m.display_name || `@${m.username}`}
            </label>
          ))}
          {share && <p className="hint" style={{ marginTop: 8 }}>→ {share} € pro Person ({splitIds.length} Teilnehmer)</p>}
        </>
      )}

      <div className="btn-row" style={{ marginTop: 10 }}>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving || !amount}>Speichern</button>
        <button className="btn btn-secondary" onClick={onCancel}>Abbrechen</button>
      </div>
    </div>
  )
}

function BuchungRow({ buchung, isOrganisator, onChanged }) {
  const [expanded, setExpanded] = useState(false)
  const [anteile, setAnteile] = useState([])

  async function toggleExpand() {
    if (!expanded) {
      const { data } = await supabase.rpc('get_buchung_anteile', { p_buchung_id: buchung.id })
      setAnteile(data || [])
    }
    setExpanded(!expanded)
  }

  async function togglePaid(anteil) {
    await supabase.rpc('mark_anteil_paid', { p_anteil_id: anteil.id, p_paid: !anteil.paid })
    const { data } = await supabase.rpc('get_buchung_anteile', { p_buchung_id: buchung.id })
    setAnteile(data || [])
    onChanged()
  }

  const meta = BUCHUNG_META[buchung.type]

  return (
    <div className="card" style={{ marginBottom: 10 }}>
      <button className="card-choice" style={{ padding: 0 }} onClick={toggleExpand}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <strong>{buchung.description || meta.label}</strong>
            <p className="hint" style={{ margin: '4px 0 0' }}>{meta.label} · {buchung.creator_name} · {new Date(buchung.created_at).toLocaleDateString('de-DE')}</p>
          </div>
          <div style={{ color: meta.color, fontWeight: 700 }}>{meta.sign}{Number(buchung.amount).toFixed(2)} €</div>
        </div>
      </button>

      {expanded && anteile.length > 0 && (
        <div style={{ marginTop: 12, borderTop: '1px solid var(--line)', paddingTop: 10 }}>
          {anteile.map((a) => (
            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
              <span>{a.display_name} · {Number(a.amount).toFixed(2)} €</span>
              <button
                className={a.paid ? 'btn btn-primary' : 'btn btn-secondary'}
                style={{ padding: '4px 10px', fontSize: 12 }}
                onClick={() => togglePaid(a)}
              >
                {a.paid ? 'Bezahlt ✓' : 'Als bezahlt markieren'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function KasseTab({ stammtischId, stammtischName, members, isOrganisator }) {
  const [overview, setOverview] = useState(null)
  const [buchungen, setBuchungen] = useState([])
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    load()
    // eslint-disable-next-line
  }, [])

  async function load() {
    const [{ data: o }, { data: b }] = await Promise.all([
      supabase.rpc('get_kasse_overview', { p_stammtisch_id: stammtischId }),
      supabase.rpc('get_kasse_buchungen', { p_stammtisch_id: stammtischId })
    ])
    setOverview((o && o[0]) || null)
    setBuchungen(b || [])
  }

  function exportPdf() {
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text(`Stammtischkasse – ${stammtischName}`, 14, 18)
    doc.setFontSize(10)
    doc.text(`Erstellt am ${new Date().toLocaleDateString('de-DE')}`, 14, 25)
    doc.setFontSize(12)
    doc.text(`Kontostand: ${Number(overview?.kontostand || 0).toFixed(2)} €`, 14, 36)

    let y = 48
    doc.setFontSize(11)
    doc.text('Datum', 14, y)
    doc.text('Typ', 45, y)
    doc.text('Beschreibung', 75, y)
    doc.text('Betrag', 175, y)
    y += 6
    doc.line(14, y - 2, 196, y - 2)

    buchungen.forEach((b) => {
      if (y > 280) { doc.addPage(); y = 20 }
      doc.setFontSize(9)
      doc.text(new Date(b.created_at).toLocaleDateString('de-DE'), 14, y)
      doc.text(BUCHUNG_META[b.type].label, 45, y)
      doc.text((b.description || '-').slice(0, 45), 75, y)
      doc.text(`${BUCHUNG_META[b.type].sign}${Number(b.amount).toFixed(2)} €`, 175, y)
      y += 6
    })

    doc.save(`Stammtischkasse-${stammtischName}.pdf`)
  }

  if (!overview) return <div className="loading-dot">Lädt...</div>

  return (
    <div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Kontostand</h3>
        <p style={{ fontSize: 28, fontWeight: 700, margin: 0, color: overview.kontostand >= 0 ? 'var(--forest)' : '#C0392B' }}>
          {Number(overview.kontostand).toFixed(2)} €
        </p>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span>Einnahmen</span><span>{Number(overview.einnahmen).toFixed(2)} €</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span>Einzahlungen</span><span>{Number(overview.einzahlungen).toFixed(2)} €</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span>Ausgaben</span><span>{Number(overview.ausgaben).toFixed(2)} €</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#D9822B', fontWeight: 600 }}>
          <span>Offene Beträge ({overview.offene_anzahl})</span><span>{Number(overview.offene_betraege).toFixed(2)} €</span>
        </div>
      </div>

      <div className="btn-row" style={{ marginBottom: 16 }}>
        {!showForm && <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Neue Buchung</button>}
        <button className="btn btn-secondary" onClick={exportPdf}>Als PDF exportieren</button>
      </div>

      {showForm && (
        <BuchungForm
          stammtischId={stammtischId}
          members={members}
          onDone={() => { setShowForm(false); load() }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {buchungen.map((b) => (
        <BuchungRow key={b.id} buchung={b} isOrganisator={isOrganisator} onChanged={load} />
      ))}
    </div>
  )
}

export default function Stammtisch({ userId, onBack, initialCode, onConsumedInitial }) {
  const { name: cityName } = useCity()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [list, setList] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [tab, setTab] = useState('start')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [members, setMembers] = useState([])
  const [copyHint, setCopyHint] = useState('')

  const [termine, setTermine] = useState([])
  const [showTerminForm, setShowTerminForm] = useState(false)
  const [viewingTermin, setViewingTermin] = useState(null)

  const [addableContacts, setAddableContacts] = useState([])
  const [showAddMember, setShowAddMember] = useState(false)

  const [kontostand, setKontostand] = useState(null)

  useEffect(() => {
    if (initialCode) {
      handleJoin(initialCode)
      onConsumedInitial?.()
    } else {
      loadList()
    }
    // eslint-disable-next-line
  }, [])

  async function loadList() {
    setLoading(true)
    const { data, error } = await supabase.rpc('get_my_stammtische')
    if (error) setError(error.message)
    setList(data || [])
    setLoading(false)
  }

  async function handleCreate() {
    if (!newName.trim()) return
    setError('')
    const { data, error } = await supabase.rpc('create_stammtisch', { p_name: newName.trim() })
    if (error) { setError(error.message); return }
    setNewName('')
    setCreating(false)
    await loadList()
    setActiveId(data)
  }

  async function handleJoin(code) {
    setError('')
    const { data, error } = await supabase.rpc('join_stammtisch_by_code', { p_code: code.trim() })
    if (error) { setError(error.message); setLoading(false); return }
    await loadList()
    setActiveId(data)
  }

  async function loadMembers(stammtischId) {
    const { data, error } = await supabase.rpc('get_stammtisch_members', { p_stammtisch_id: stammtischId })
    if (error) setError(error.message)
    setMembers(data || [])
  }

  async function loadTermine(stammtischId) {
    const { data, error } = await supabase.rpc('get_stammtisch_termine', { p_stammtisch_id: stammtischId })
    if (error) setError(error.message)
    setTermine(data || [])
  }

  async function loadKontostand(stammtischId) {
    const { data } = await supabase.rpc('get_kasse_overview', { p_stammtisch_id: stammtischId })
    setKontostand((data && data[0]?.kontostand) ?? 0)
  }

  async function loadAddableContacts(stammtischId) {
    const { data } = await supabase.rpc('get_addable_contacts', { p_stammtisch_id: stammtischId })
    setAddableContacts(data || [])
  }

  async function handleAddMember(contactUserId) {
    await supabase.rpc('add_stammtisch_member', { p_stammtisch_id: active.id, p_user_id: contactUserId })
    loadMembers(active.id)
    loadAddableContacts(active.id)
  }

  async function handleRoleChange(memberUserId, newRole) {
    await supabase.rpc('set_stammtisch_member_role', { p_stammtisch_id: active.id, p_user_id: memberUserId, p_role: newRole })
    loadMembers(active.id)
  }

  async function handleLeave(stammtischId) {
    if (!window.confirm('Diesen Stammtisch wirklich verlassen?')) return
    await supabase.rpc('leave_stammtisch', { p_stammtisch_id: stammtischId })
    setActiveId(null)
    loadList()
  }

  function shareLink(code) {
    const link = `${window.location.origin}/?st=${code}`
    navigator.clipboard.writeText(link)
    setCopyHint('Link kopiert!')
    setTimeout(() => setCopyHint(''), 2000)
  }

  const active = list.find((s) => s.id === activeId)
  const isOrganisator = active?.my_role === 'organisator'
  const nextTermin = termine.find((t) => new Date(t.termin_date) >= new Date(new Date().toDateString()))

  useEffect(() => {
    if (active) {
      loadMembers(active.id)
      loadTermine(active.id)
      loadKontostand(active.id)
    }
    // eslint-disable-next-line
  }, [activeId])

  if (loading) {
    return (
      <div className="app-shell">
        <div className="topbar">
          <div className="mark">{cityName}</div>
          <h1>Stammtisch</h1>
        </div>
        <main><div className="loading-dot">Lädt...</div></main>
      </div>
    )
  }

  if (!active) {
    return (
      <div className="app-shell">
        <div className="topbar">
          <div className="mark">{cityName}</div>
          <h1>Stammtisch</h1>
        </div>
        <main style={{ paddingBottom: 90 }}>
          <button className="link-text" onClick={onBack} style={{ marginBottom: 16 }}>← Zurück</button>

          {error && <div className="error-box">{error}</div>}

          {list.length === 0 && (
            <p className="hint" style={{ marginBottom: 16 }}>Du bist noch in keinem Stammtisch. Gründe deinen eigenen, oder tritt über einen Einladungslink bei.</p>
          )}

          {list.map((s) => (
            <button key={s.id} className="card-choice" onClick={() => setActiveId(s.id)} style={{ marginBottom: 10 }}>
              <h3 style={{ margin: 0 }}>{s.name}</h3>
              <p className="hint" style={{ margin: '4px 0 0' }}>{s.member_count} Mitglieder · {s.my_role === 'organisator' ? 'Organisator' : s.my_role === 'kassierer' ? 'Kassierer' : 'Mitglied'}</p>
            </button>
          ))}

          <div className="card" style={{ marginTop: 20 }}>
            <h3 style={{ marginTop: 0 }}>Neuen Stammtisch gründen</h3>
            {!creating ? (
              <button className="btn btn-primary" onClick={() => setCreating(true)}>+ Stammtisch gründen</button>
            ) : (
              <>
                <input
                  placeholder="Name des Stammtischs"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{ marginBottom: 10 }}
                />
                <div className="btn-row">
                  <button className="btn btn-primary" onClick={handleCreate}>Gründen</button>
                  <button className="btn btn-secondary" onClick={() => setCreating(false)}>Abbrechen</button>
                </div>
              </>
            )}
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <h3 style={{ marginTop: 0 }}>Einladungscode eingeben</h3>
            <input
              placeholder="z. B. a1b2c3d4"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              style={{ marginBottom: 10 }}
            />
            <button className="btn btn-secondary" onClick={() => handleJoin(joinCode)} disabled={!joinCode.trim()}>Beitreten</button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">{cityName}</div>
        <h1>{active.name}</h1>
      </div>
      <main style={{ paddingBottom: 90 }}>
        <button className="link-text" onClick={() => { setActiveId(null); setViewingTermin(null) }} style={{ marginBottom: 16 }}>← Zu meinen Stammtischen</button>

        {error && <div className="error-box">{error}</div>}

        {tab === 'start' && (
          <>
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Nächster Stammtisch</h3>
              {nextTermin ? (
                <button className="card-choice" onClick={() => { setViewingTermin(nextTermin); setTab('termine') }}>
                  <strong>{nextTermin.title}</strong>
                  <p className="hint" style={{ margin: '4px 0 0' }}>
                    {new Date(nextTermin.termin_date).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
                    {nextTermin.termin_time ? ` · ${nextTermin.termin_time.slice(0, 5)} Uhr` : ''}
                    {nextTermin.location ? ` · ${nextTermin.location}` : ''}
                  </p>
                  <p className="hint" style={{ margin: '4px 0 0' }}>{nextTermin.zugesagt_count} Zusagen</p>
                </button>
              ) : (
                <p className="hint">Noch kein Termin geplant.</p>
              )}
            </div>
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Stammtischkasse</h3>
              <p style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{kontostand !== null ? `${Number(kontostand).toFixed(2)} €` : '...'}</p>
            </div>
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Mitglieder</h3>
              <p>{members.length} {members.length === 1 ? 'Mitglied' : 'Mitglieder'}</p>
            </div>
          </>
        )}

        {tab === 'termine' && (
          viewingTermin ? (
            <TerminDetail
              termin={viewingTermin}
              isOrganisator={isOrganisator}
              onBack={() => setViewingTermin(null)}
              onDeleted={() => { setViewingTermin(null); loadTermine(active.id) }}
            />
          ) : (
            <div>
              {!showTerminForm ? (
                <button className="btn btn-primary" onClick={() => setShowTerminForm(true)} style={{ marginBottom: 16 }}>+ Neuer Termin</button>
              ) : (
                <div style={{ marginBottom: 16 }}>
                  <TerminForm
                    stammtischId={active.id}
                    onDone={() => { setShowTerminForm(false); loadTermine(active.id) }}
                    onCancel={() => setShowTerminForm(false)}
                  />
                </div>
              )}

              {termine.length === 0 && <p className="hint">Noch keine Termine geplant.</p>}

              {termine.map((t) => (
                <button key={t.id} className="card-choice" onClick={() => setViewingTermin(t)} style={{ marginBottom: 10 }}>
                  <strong>{t.title}</strong>
                  <p className="hint" style={{ margin: '4px 0 0' }}>
                    {new Date(t.termin_date).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'long' })}
                    {t.termin_time ? ` · ${t.termin_time.slice(0, 5)} Uhr` : ''}
                  </p>
                  <p className="hint" style={{ margin: '4px 0 0' }}>✅ {t.zugesagt_count} · ❌ {t.abgesagt_count} · ❔ {t.unsicher_count}</p>
                </button>
              ))}
            </div>
          )
        )}

        {tab === 'kasse' && (
          <KasseTab stammtischId={active.id} stammtischName={active.name} members={members} isOrganisator={isOrganisator} />
        )}

        {tab === 'mitglieder' && (
          <div>
            {members.map((m) => (
              <div key={m.user_id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="avatar-preview" style={{ width: 44, height: 44 }}>
                  {m.avatar_url ? <img src={m.avatar_url} alt="" /> : '👤'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{m.display_name || `@${m.username}`}</div>
                  <div className="hint">seit {new Date(m.joined_at).toLocaleDateString('de-DE')}</div>
                </div>
                {isOrganisator && m.user_id !== userId ? (
                  <select value={m.role} onChange={(e) => handleRoleChange(m.user_id, e.target.value)}>
                    <option value="mitglied">Mitglied</option>
                    <option value="kassierer">Kassierer</option>
                    <option value="organisator">Organisator</option>
                  </select>
                ) : (
                  <span className="hint">{m.role === 'organisator' ? 'Organisator' : m.role === 'kassierer' ? 'Kassierer' : 'Mitglied'}</span>
                )}
              </div>
            ))}

            {isOrganisator && (
              <div className="card" style={{ marginTop: 16 }}>
                {!showAddMember ? (
                  <button className="btn btn-secondary" onClick={() => { setShowAddMember(true); loadAddableContacts(active.id) }}>+ Mitglied aus Kontakten hinzufügen</button>
                ) : (
                  <>
                    <h3 style={{ marginTop: 0 }}>Aus Kontakten hinzufügen</h3>
                    {addableContacts.length === 0 && <p className="hint">Keine passenden Kontakte gefunden.</p>}
                    {addableContacts.map((c) => (
                      <div key={c.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                        <span>{c.display_name || `@${c.username}`}</span>
                        <button className="link-text" onClick={() => handleAddMember(c.user_id)}>Hinzufügen</button>
                      </div>
                    ))}
                    <button className="link-text" onClick={() => setShowAddMember(false)} style={{ marginTop: 10 }}>Schließen</button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {tab === 'mehr' && (
          <div>
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Mitglieder einladen</h3>
              <p className="hint" style={{ marginBottom: 10 }}>Teile diesen Link mit Freunden – auch mit Leuten, die noch nicht verbunden sind.</p>
              <button className="btn btn-secondary" onClick={() => shareLink(active.invite_code)}>Einladungslink kopieren</button>
              {copyHint && <p className="hint" style={{ color: 'var(--forest)', marginTop: 8 }}>{copyHint}</p>}
            </div>
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Stammtisch verlassen</h3>
              <button className="btn btn-secondary" onClick={() => handleLeave(active.id)}>Verlassen</button>
            </div>
          </div>
        )}
      </main>

      <nav className="tab-bar" style={{ position: 'fixed' }}>
        <button className={tab === 'start' ? 'tab-active' : ''} onClick={() => { setTab('start'); setViewingTermin(null) }}>
          <div className="app-tile-icon">🏠</div>
          <div className="app-tile-label">Stammtisch</div>
        </button>
        <button className={tab === 'termine' ? 'tab-active' : ''} onClick={() => setTab('termine')}>
          <div className="app-tile-icon">📅</div>
          <div className="app-tile-label">Termine</div>
        </button>
        <button className={tab === 'kasse' ? 'tab-active' : ''} onClick={() => setTab('kasse')}>
          <div className="app-tile-icon">💶</div>
          <div className="app-tile-label">Kasse</div>
        </button>
        <button className={tab === 'mitglieder' ? 'tab-active' : ''} onClick={() => setTab('mitglieder')}>
          <div className="app-tile-icon">👥</div>
          <div className="app-tile-label">Mitglieder</div>
        </button>
        <button className={tab === 'mehr' ? 'tab-active' : ''} onClick={() => setTab('mehr')}>
          <div className="app-tile-icon">⋯</div>
          <div className="app-tile-label">Mehr</div>
        </button>
      </nav>
    </div>
  )
}
