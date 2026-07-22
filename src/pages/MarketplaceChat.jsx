import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function MarketplaceChat({ userId, threadId, role, onBack }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    loadMessages()

    const channel = supabase
      .channel(`marketplace-messages-${threadId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'marketplace_messages',
        filter: `thread_id=eq.${threadId}`
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new])
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line
  }, [threadId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadMessages() {
    setLoading(true)
    const { data, error } = await supabase
      .from('marketplace_messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })

    if (error) setError(error.message)
    setMessages(data || [])
    setLoading(false)
  }

  async function sendMessage(e) {
    e.preventDefault()
    if (!text.trim()) return
    setSending(true)

    const { error } = await supabase.from('marketplace_messages').insert({
      thread_id: threadId,
      sender_id: userId,
      content: text.trim()
    })

    if (error) setError(error.message)
    else setText('')
    setSending(false)
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>{role === 'anbieter' ? 'Interessent' : 'Anbieter'}</h1>
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
              <p style={{ margin: 0 }}>{m.content}</p>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={sendMessage} style={{ display: 'flex', gap: 8 }}>
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
