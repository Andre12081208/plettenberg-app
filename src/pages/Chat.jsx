import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Chat({ userId, connectionId, otherUsername, onBack }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [recording, setRecording] = useState(false)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const bottomRef = useRef(null)

  useEffect(() => {
    loadMessages()

    const channel = supabase
      .channel(`messages-${connectionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `connection_id=eq.${connectionId}`
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new])
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line
  }, [connectionId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadMessages() {
    setLoading(true)
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('connection_id', connectionId)
      .order('created_at', { ascending: true })

    if (error) setError(error.message)
    setMessages(data || [])
    setLoading(false)
  }

  async function sendMessage(e) {
    e?.preventDefault()
    if (!text.trim()) return
    setSending(true)

    const { error } = await supabase.from('messages').insert({
      connection_id: connectionId,
      sender_id: userId,
      content: text.trim()
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
      const path = `${connectionId}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(path, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('chat-files').getPublicUrl(path)

      const { error: dbError } = await supabase.from('messages').insert({
        connection_id: connectionId,
        sender_id: userId,
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

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

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
      const path = `${connectionId}/${Date.now()}.webm`
      const { error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(path, blob)

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('chat-files').getPublicUrl(path)

      const { error: dbError } = await supabase.from('messages').insert({
        connection_id: connectionId,
        sender_id: userId,
        attachment_url: data.publicUrl,
        attachment_type: 'audio'
      })

      if (dbError) throw dbError
    } catch (err) {
      setError(err.message || 'Sprachnachricht konnte nicht gesendet werden.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>@{otherUsername}</h1>
      </div>
      <main style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
        <button className="link-text" onClick={onBack} style={{ marginBottom: 16 }}>← Zurück</button>

        {error && <div className="error-box">{error}</div>}

        <div style={{ flex: 1, overflowY: 'auto', marginBottom: 12 }}>
          {loading && <div className="loading-dot">Lädt...</div>}

          {!loading && messages.map((m) => (
            <div
              key={m.id}
              className={`chat-bubble ${m.sender_id === userId ? 'chat-bubble-own' : 'chat-bubble-other'}`}
            >
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
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={sendMessage} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label className="link-text" style={{ cursor: 'pointer', fontSize: 20 }}>
            📎
            <input type="file" onChange={handleFileChange} style={{ display: 'none' }} />
          </label>

          <button
            type="button"
            className="link-text"
            style={{ fontSize: 20, cursor: 'pointer' }}
            onClick={recording ? stopRecording : startRecording}
          >
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
