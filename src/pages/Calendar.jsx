import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function addMonths(date, delta) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1)
}

function daysInMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

function toKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default function Calendar({ userId, onBack }) {
  const [viewDate, setViewDate] = useState(startOfMonth(new Date()))
  const [selectedDate, setSelectedDate] = useState(null)
  const [viewedOwnerId, setViewedOwnerId] = useState(userId)
  const [sharedWithMe, setSharedWithMe] = useState([])
  const [events, setEvents] = useState({})
  const [birthdays, setBirthdays] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [screen, setScreen] = useState('month') // 'month' | 'settings'
  const [editingEvent, setEditingEvent] = useState(null) // null | 'new' | event object

 useEffect(() => {
    loadSharedWithMe()
    loadBirthdays()
  }, [])

  async function loadBirthdays() {
    const { data } = await supabase.rpc('get_contact_birthdays')
    setBirthdays(data || [])
  }

  useEffect(() => {
    loadEvents()
    // eslint-disable-next-line
  }, [viewDate, viewedOwnerId])

  async function loadSharedWithMe() {
    const { data } = await supabase
      .from('calendar_shares')
      .select('owner_id')
      .eq('viewer_id', userId)

    const withNames = await Promise.all(
      (data || []).map(async (s) => {
        const { data: username } = await supabase.rpc('get_username', { target_id: s.owner_id })
        return { owner_id: s.owner_id, username }
      })
    )
    setSharedWithMe(withNames)
  }

  async function loadEvents() {
    setLoading(true)
    setError('')
    const from = viewDate
    const to = addMonths(viewDate, 1)

    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', viewedOwnerId)
      .gte('start_at', from.toISOString())
      .lt('start_at', to.toISOString())
      .order('start_at', { ascending: true })

    if (error) {
      setError(error.message)
      setEvents({})
    } else {
      const grouped = {}
      for (const ev of data || []) {
        const key = toKey(new Date(ev.start_at))
        if (!grouped[key]) grouped[key] = []
        grouped[key].push(ev)
      }
      setEvents(grouped)
    }
    setLoading(false)
  }

  const isOwnCalendar = viewedOwnerId === userId

  if (screen === 'settings') {
    return <ShareSettings userId={userId} onBack={() => setScreen('month')} />
  }

  if (editingEvent) {
    return (
      <EventForm
        userId={userId}
        date={selectedDate}
        existing={editingEvent === 'new' ? null : editingEvent}
        onDone={() => { setEditingEvent(null); loadEvents() }}
        onCancel={() => setEditingEvent(null)}
      />
    )
  }

  const totalDays = daysInMonth(viewDate)
  const firstWeekday = (new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay() + 6) % 7
  const cells = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= totalDays; d++) cells.push(new Date(viewDate.getFullYear(), viewDate.getMonth(), d))

  const monthLabel = viewDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })

  const selectedKey = selectedDate ? toKey(selectedDate) : null
  const selectedEvents = selectedKey ? (events[selectedKey] || []) : []

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>Kalender</h1>
      </div>
      <main>
        <button className="link-text" onClick={onBack} style={{ marginBottom: 16 }}>← Zurück</button>

        {error && <div className="error-box">{error}</div>}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          <button
            onClick={() => setViewedOwnerId(userId)}
            style={{
              padding: '6px 14px', borderRadius: 999, border: '1px solid var(--forest)',
              background: isOwnCalendar ? 'var(--forest)' : 'transparent',
              color: isOwnCalendar ? '#fff' : 'var(--forest)', fontSize: 13, fontWeight: 600, cursor: 'pointer'
            }}
          >
            Mein Kalender
          </button>
          {sharedWithMe.map((s) => (
            <button
              key={s.owner_id}
              onClick={() => setViewedOwnerId(s.owner_id)}
              style={{
                padding: '6px 14px', borderRadius: 999, border: '1px solid var(--forest)',
                background: viewedOwnerId === s.owner_id ? 'var(--forest)' : 'transparent',
                color: viewedOwnerId === s.owner_id ? '#fff' : 'var(--forest)', fontSize: 13, fontWeight: 600, cursor: 'pointer'
              }}
            >
              @{s.username}
            </button>
          ))}
        </div>

        {isOwnCalendar && (
          <button className="link-text" onClick={() => setScreen('settings')} style={{ marginBottom: 14 }}>
            Freigabe verwalten
          </button>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <button className="link-text" onClick={() => setViewDate(addMonths(viewDate, -1))}>←</button>
          <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{monthLabel}</span>
          <button className="link-text" onClick={() => setViewDate(addMonths(viewDate, 1))}>→</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
          {WEEKDAYS.map((d) => (
            <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--ink-soft)' }}>{d}</div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 20 }}>
          {cells.map((day, i) => {
            if (!day) return <div key={i} />
            const key = toKey(day)
           const hasEvents = (events[key] || []).length > 0
            const birthdaysOnDay = isOwnCalendar
              ? birthdays.filter((b) => {
                  const bd = new Date(b.birthday)
                  return bd.getMonth() === day.getMonth() && bd.getDate() === day.getDate()
                })
              : []
            const isSelected = selectedKey === key
            const isToday = toKey(new Date()) === key
            return (
              <button
                key={i}
                onClick={() => setSelectedDate(day)}
                style={{
                  aspectRatio: '1', borderRadius: 8, border: isToday ? '1px solid var(--forest)' : '1px solid var(--line)',
                  background: isSelected ? 'var(--forest)' : '#fff',
                  color: isSelected ? '#fff' : 'var(--ink)',
                  fontSize: 13, cursor: 'pointer', position: 'relative', padding: 0
                }}
              >
                {day.getDate()}
               {hasEvents && (
                  <span style={{
                    position: 'absolute', bottom: 4, left: 'calc(50% - 5px)',
                    width: 4, height: 4, borderRadius: '50%', background: isSelected ? '#fff' : 'var(--clay)'
                  }} />
                )}
                {birthdaysOnDay.length > 0 && (
                  <span style={{
                    position: 'absolute', bottom: 4, left: 'calc(50% + 1px)',
                    width: 4, height: 4, borderRadius: '50%', background: isSelected ? '#fff' : '#B0396A'
                  }} />
                )}
              </button>
            )
          })}
        </div>

        {loading && <div className="loading-dot">Lädt...</div>}

        {selectedDate && !loading && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>
              {selectedDate.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>

            {selectedDate && isOwnCalendar && (() => {
              const todaysBirthdays = birthdays.filter((b) => {
                const bd = new Date(b.birthday)
                return bd.getMonth() === selectedDate.getMonth() && bd.getDate() === selectedDate.getDate()
              })
              return todaysBirthdays.map((b) => (
                <p key={b.contact_id} style={{ margin: '0 0 10px', fontSize: 14, color: '#B0396A', fontWeight: 600 }}>
                  🎂 @{b.username} hat Geburtstag
                </p>
              ))
            })()}
            {selectedEvents.length === 0 && <p className="center-note">Keine Termine an diesem Tag.</p>}

            {selectedEvents.map((ev) => (
              <div
                key={ev.id}
                style={{ borderTop: '1px solid var(--line)', paddingTop: 10, marginTop: 10, cursor: isOwnCalendar ? 'pointer' : 'default' }}
                onClick={() => isOwnCalendar && setEditingEvent(ev)}
              >
                <p style={{ margin: 0, fontWeight: 600 }}>{ev.title}</p>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>
                  {ev.all_day ? 'Ganztägig' : `${new Date(ev.start_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} – ${new Date(ev.end_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`}
                </p>
                {ev.location && <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>{ev.location}</p>}
              </div>
            ))}

            {isOwnCalendar && (
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setEditingEvent('new')}>
                Termin hinzufügen
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function EventForm({ userId, date, existing, onDone, onCancel }) {
  const [title, setTitle] = useState(existing?.title || '')
  const [description, setDescription] = useState(existing?.description || '')
  const [location, setLocation] = useState(existing?.location || '')
  const [allDay, setAllDay] = useState(existing?.all_day || false)
  const [startTime, setStartTime] = useState(existing ? new Date(existing.start_at).toTimeString().slice(0, 5) : '09:00')
  const [endTime, setEndTime] = useState(existing ? new Date(existing.end_at).toTimeString().slice(0, 5) : '10:00')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)

    const base = existing ? new Date(existing.start_at) : date
    const dateStr = base.toISOString().slice(0, 10)

    let startAt, endAt
    if (allDay) {
      startAt = new Date(`${dateStr}T00:00:00`)
      endAt = new Date(`${dateStr}T23:59:59`)
    } else {
      startAt = new Date(`${dateStr}T${startTime}:00`)
      endAt = new Date(`${dateStr}T${endTime}:00`)
    }

    const payload = {
      user_id: userId,
      title: title.trim(),
      description: description.trim() || null,
      location: location.trim() || null,
      all_day: allDay,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString()
    }

    const { error } = existing
      ? await supabase.from('calendar_events').update(payload).eq('id', existing.id)
      : await supabase.from('calendar_events').insert(payload)

    if (error) {
      setError(error.message)
      setSaving(false)
    } else {
      onDone()
    }
  }

  async function handleDelete() {
    setSaving(true)
    const { error } = await supabase.from('calendar_events').delete().eq('id', existing.id)
    if (error) {
      setError(error.message)
      setSaving(false)
    } else {
      onDone()
    }
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>{existing ? 'Termin bearbeiten' : 'Neuer Termin'}</h1>
      </div>
      <main>
        <button className="link-text" onClick={onCancel} style={{ marginBottom: 16 }}>← Abbrechen</button>

        {error && <div className="error-box">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="title">Titel</label>
            <input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="field">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} style={{ width: 'auto' }} />
              Ganztägig
            </label>
          </div>

          {!allDay && (
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="field" style={{ flex: 1 }}>
                <label htmlFor="startTime">Von</label>
                <input id="startTime" type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label htmlFor="endTime">Bis</label>
                <input id="endTime" type="time" required value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
          )}

          <div className="field">
            <label htmlFor="location">Ort</label>
            <input id="location" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="description">Beschreibung</label>
            <textarea id="description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? 'Wird gespeichert...' : existing ? 'Speichern' : 'Termin anlegen'}
          </button>

          {existing && (
            <button type="button" className="btn btn-secondary" style={{ marginTop: 10 }} onClick={handleDelete} disabled={saving}>
              Termin löschen
            </button>
          )}
        </form>
      </main>
    </div>
  )
}

function ShareSettings({ userId, onBack }) {
  const [shares, setShares] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [username, setUsername] = useState('')
  const [searching, setSearching] = useState(false)
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    loadShares()
  }, [])

  async function loadShares() {
    setLoading(true)
    const { data, error } = await supabase
      .from('calendar_shares')
      .select('*')
      .eq('owner_id', userId)

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    const withNames = await Promise.all(
      (data || []).map(async (s) => {
        const { data: uname } = await supabase.rpc('get_username', { target_id: s.viewer_id })
        return { ...s, username: uname }
      })
    )
    setShares(withNames)
    setLoading(false)
  }

  async function grantAccess(e) {
    e.preventDefault()
    setError('')
    setSearching(true)

    const clean = username.trim().toLowerCase()
    const { data, error } = await supabase.rpc('find_profile_by_username', { search_username: clean })

    if (error || !data || data.length === 0) {
      setError('Kein Nutzer mit diesem Namen gefunden.')
      setSearching(false)
      return
    }

    const { error: insertError } = await supabase.from('calendar_shares').insert({
      owner_id: userId,
      viewer_id: data[0].user_id
    })

    if (insertError) {
      setError(insertError.message.includes('duplicate') ? 'Diese Person hat schon Zugriff.' : insertError.message)
    } else {
      setUsername('')
      loadShares()
    }
    setSearching(false)
  }

  async function revoke(shareId) {
    setBusyId(shareId)
    const { error } = await supabase.from('calendar_shares').delete().eq('id', shareId)
    if (!error) {
      setShares((prev) => prev.filter((s) => s.id !== shareId))
    } else {
      setError(error.message)
    }
    setBusyId(null)
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>Freigabe verwalten</h1>
      </div>
      <main>
        <button className="link-text" onClick={onBack} style={{ marginBottom: 16 }}>← Zurück</button>

        {error && <div className="error-box">{error}</div>}

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Zugriff gewähren</h3>
          <form onSubmit={grantAccess}>
            <div className="field">
              <label htmlFor="username">Nutzername</label>
              <input id="username" required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="z.B. wanderfreund23" />
            </div>
            <button className="btn btn-primary" type="submit" disabled={searching}>
              {searching ? 'Einen Moment...' : 'Zugriff geben'}
            </button>
          </form>
        </div>

        <h3 style={{ marginBottom: 10 }}>Hat aktuell Zugriff</h3>
        {loading && <div className="loading-dot">Lädt...</div>}
        {!loading && shares.length === 0 && <p className="center-note">Noch niemand hat Zugriff auf deinen Kalender.</p>}

        {shares.map((s) => (
          <div className="card" key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>@{s.username}</span>
            <button className="btn btn-secondary" style={{ width: 'auto', padding: '8px 16px' }} onClick={() => revoke(s.id)} disabled={busyId === s.id}>
              Entziehen
            </button>
          </div>
        ))}
      </main>
    </div>
  )
}
