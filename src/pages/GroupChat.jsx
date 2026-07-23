import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function GroupChat({ userId, groupId, groupName, isAdmin, onOpenSettings, onBack }) {
  const [messages, setMessages] = useState([])
  const [members, setMembers] = useState({})
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [recording, setRecording] = useState(false)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const bottomRef = useRef(null)

  useEffect(() => {
    loadMembers()
    loadMessages()

    const channel = supabase
      .channel(`group-messages-${groupId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${groupId}`
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new])
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
    // eslint-disable-next-line
  }, [groupId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadMembers() {
    const { data } = await supabase.rpc('get_group_members', { gid: groupId })
    const map = {}
    for (const m of data || []) {
      map[m.member_id] = { displayName: m.display_name, username: m.username }
    }
    setMembers(map)
  }

  async function loadMessages() {
    setLoading(true)
    const { data, error } = await supabase
      .from('group_messages')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })

    if (error) setError(error.message)
    setMessages(data || [])
    setLoading(false)
  }

  function nameFor(senderId) {
    const m = members[senderId]
    if (!m) return 'Mitglied'
    return m.displayName || `@${m.username}`
  }

  async function sendMessage(e) {
    e?.preventDefault()
    if (!text.trim()) return
    setSending(true)
    const { error } = await supabase.from('group_messages').insert({
      group_id: groupId, sender_id: userId, content: text.trim()
    })
    if (error) setError(error.message)
    else setText('')
    setSending(false)
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setSending(true)
    setError('')
    try {
      const ext = file.name.split('.').pop()
      const path = `${groupId}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('chat-files').upload(path, file)
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('chat-files').getPublicUrl(path)
      const { error: dbError } = await supabase.from('group_messages').insert({
        group_id: groupId, sender_id: userId,
        attachment_url: data.publicUrl,
        attachment_type: file.type.startsWith('image/') ? 'image' : 'file'
      })
      if (dbError) throw dbError
    } catch (err) {
      setError(err.message || 'Datei konnte nicht gesendet werden.')
    } finally {
      setSending(false)
      e.target.value = ''
    }
  }

  async function startRecording() {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        stream.getTracks().forEach((t) => t.stop())
        await uploadVoiceMessage(blob)
      }
      recorder.start()
      mediaRecorderRef.current = recorder
      setRecording(true)
    } catch (err) {
      setError('Mikrofon-Zugriff wurde nicht erlaubt oder ist nicht verfügbar.')
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    setRecording(false)
  }

  async function uploadVoiceMessage(blob) {
    setSending(true)
    try {
      const path = `${groupId}/${Date.now()}.webm`
      const { error: uploadError } = await supabase.storage.from('chat-files').upload(path, blob)
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('chat-files').getPublicUrl(path)
      const { error: dbError } = await supabase.from('group_messages').insert({
        group_id: groupId, sender_id: userId, attachment_url: data.publicUrl, attachment_type: 'audio'
      })
      if (dbError) throw dbError
    } catch (err) {
      setError(err.message || 'Sprachnachricht konnte nicht gesendet werden.')
    } finally {
      setSending(false)
    }
  }

  async function handleLeaveGroup() {
    if (!window.confirm('Diese Gruppe wirklich verlassen?')) return
    const { error } = await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', userId)
    if (error) setError(error.message)
    else onBack()
  }

  function formatTime(iso) {
    return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  }

  function formatDateLabel(iso) {
    const date = new Date(iso)
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(today.getDate() - 1)
    if (date.toDateString() === today.toDateString()) return 'Heute'
    if (date.toDateString() === yesterday.toDateString()) return 'Gestern'
    return date.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>{groupName}</h1>
          {isAdmin && <button className="link-text" onClick={onOpenSettings}>Verwalten</button>}
        </div>
      </div>
      <main style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <button className="link-text" onClick={onBack}>← Zurück</button>
          <button className="link-text" onClick={handleLeaveGroup} style={{ color: 'var(--danger)' }}>Gruppe verlassen</button>
        </div>

        {error && <div className="error-box">{error}</div>}

        <div style={{ flex: 1, overflowY: 'auto', marginBottom: 12 }}>
          {loading && <div className="loading-dot">Lädt...</div>}

          {!loading && messages.map((m, index) => {
            const isOwn = m.sender_id === userId
            const currentDay = new Date(m.created_at).toDateString()
            const previousDay = index > 0 ? new Date(messages[index - 1].created_at).toDateString() : null
            const showDateDivider = currentDay !== previousDay

            return (
              <div key={m.id}>
                {showDateDivider && (
                  <div style={{ textAlign: 'center', margin: '14px 0' }}>
                    <span style={{ fontSize: 12, color: 'var(--ink-soft)', background: '#fff', border: '1px solid var(--line)', padding: '3px 12px', borderRadius: 999 }}>
                      {formatDateLabel(m.created_at)}
                    </span>
                  </div>
                )}
                <div className={`chat-bubble ${isOwn ? 'chat-bubble-own' : 'chat-bubble-other'}`}>
                  {!isOwn && (
                    <p style={{ margin: '0 0 2px', fontSize: 12, fontWeight: 600, color: 'var(--forest)' }}>{nameFor(m.sender_id)}</p>
                  )}
                  {m.content && <p style={{ margin: 0 }}>{m.content}</p>}
                  {m.attachment_type === 'image' && (
                    <img src={m.attachment_url} alt="Anhang" style={{ maxWidth: '100%', borderRadius: 10 }} />
                  )}
                  {m.attachment_type === 'audio' && (
                    <audio controls src={m.attachment_url} style={{ maxWidth: '100%' }} />
                  )}
                  {m.attachment_type === 'file' && (
                    <a href={m.attachment_url} target="_blank" rel="noreferrer">Datei öffnen</a>
                  )}
                  <div className="chat-meta">
                    <span>{formatTime(m.created_at)}</span>
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={sendMessage} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label className="link-text" style={{ cursor: 'pointer', fontSize: 20 }}>
            📎
            <input type="file" onChange={handleFileChange} style={{ display: 'none' }} />
          </label>
          <button type="button" className="link-text" style={{ fontSize: 20, cursor: 'pointer' }} onClick={recording ? stopRecording : startRecording}>
            {recording ? '⏹️' : '🎤'}
          </button>
          <input
            style={{ flex: 1, padding: '10px 12px', borderRadius: 20, border: '1px solid var(--line)' }}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Nachricht schreiben..."
          />
          <button className="btn btn-primary" style={{ width: 'auto', padding: '10px 18px' }} type="submit" disabled={sending}>
            Senden
          </button>
        </form>
      </main>
    </div>
  )
}
