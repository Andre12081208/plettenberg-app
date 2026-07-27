import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function BusinessInquiryChat({ userId, inquiryId, isBusiness, onBack }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [otherName, setOtherName] = useState('')
  const [otherAvatarUrl, setOtherAvatarUrl] = useState(null)
  const [isAnon, setIsAnon] = useState(false)
  const [buyerId, setBuyerId] = useState(null)

  const [showReportForm, setShowReportForm] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reporting, setReporting] = useState(false)
  const [reportedMsg, setReportedMsg] = useState('')
  const [blocking, setBlocking] = useState(false)
  const [blockedMsg, setBlockedMsg] = useState('')

  const bottomRef = useRef(null)

  useEffect(() => {
    loadOtherParty()
    loadMessages()

    const channel = supabase
      .channel(`business-inquiry-${inquiryId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'business_inquiry_messages',
        filter: `inquiry_id=eq.${inquiryId}`
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new])
        if (payload.new.is_business !== isBusiness) {
          markAsRead()
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'business_inquiry_messages',
        filter: `inquiry_id=eq.${inquiryId}`
      }, (payload) => {
        setMessages((prev) => prev.map((m) => (m.id === payload.new.id ? payload.new : m)))
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line
  }, [inquiryId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadOtherParty() {
    const { data: inquiry } = await supabase
      .from('business_inquiries')
      .select('buyer_id, business_profile_id')
      .eq('id', inquiryId)
      .maybeSingle()

    if (!inquiry) return
    setBuyerId(inquiry.buyer_id)

    if (isBusiness) {
      const { data } = await supabase.rpc('get_inquiry_buyer_display', { target_inquiry_id: inquiryId })
      const row = data?.[0]
      setIsAnon(!!row?.is_anon)
      if (row?.is_anon) {
        setOtherName(`Interessent #${row.anon_number}`)
        setOtherAvatarUrl(null)
      } else {
        setOtherName(row?.display_name || 'Interessent')
        setOtherAvatarUrl(row?.avatar_url || null)
      }
    } else {
      const { data: business } = await supabase
        .from('business_profiles')
        .select('company_name, logo_url')
        .eq('id', inquiry.business_profile_id)
        .maybeSingle()
      setOtherName(business?.company_name || 'Anbieter')
      setOtherAvatarUrl(business?.logo_url || null)
    }
  }

  async function loadMessages() {
    setLoading(true)
    const { data, error } = await supabase
      .from('business_inquiry_messages')
      .select('*')
      .eq('inquiry_id', inquiryId)
      .order('created_at', { ascending: true })

    if (error) setError(error.message)
    setMessages(data || [])
    setLoading(false)
    markAsRead()
  }

  async function markAsRead() {
    await supabase
      .from('business_inquiry_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('inquiry_id', inquiryId)
      .neq('is_business', isBusiness)
      .is('read_at', null)
  }

  async function sendMessage(e) {
    e.preventDefault()
    if (!text.trim()) return
    setSending(true)

    const { error } = await supabase.from('business_inquiry_messages').insert({
      inquiry_id: inquiryId,
      sender_id: userId,
      is_business: isBusiness,
      content: text.trim()
    })

    if (error) setError(error.message)
    else setText('')
    setSending(false)
  }

  async function submitReport() {
    setReporting(true)
    const { error } = await supabase.from('business_inquiry_reports').insert({
      inquiry_id: inquiryId,
      business_profile_id: userId,
      reported_user_id: buyerId,
      reason: reportReason.trim() || null
    })
    if (!error) {
      setReportedMsg('Meldung wurde an die Verwaltung geschickt.')
      setShowReportForm(false)
      setReportReason('')
    } else {
      setError(error.message)
    }
    setReporting(false)
  }

  async function blockBuyer() {
    setBlocking(true)
    const { error } = await supabase.from('business_blocked_users').insert({
      business_profile_id: userId,
      blocked_user_id: buyerId
    })
    if (!error) {
      setBlockedMsg('Diese Person kann dich künftig nicht mehr anonym anschreiben.')
    } else {
      setError(error.message)
    }
    setBlocking(false)
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="avatar-preview" style={{ width: 44, height: 44, flexShrink: 0 }}>
            {otherAvatarUrl ? <img src={otherAvatarUrl} alt="" /> : (isBusiness ? '🕶️' : '🏬')}
          </div>
          <div>
            <h1 style={{ margin: 0 }}>{otherName || (isBusiness ? 'Anfrage' : 'Anbieter')}</h1>
          </div>
        </div>
      </div>
      <main style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
        <button className="link-text" onClick={onBack} style={{ marginBottom: 16 }}>← Zurück</button>

        {error && <div className="error-box">{error}</div>}
        {reportedMsg && <div className="error-box" style={{ background: '#E5EFEA', color: '#1F4D3F', borderColor: '#1F4D3F' }}>{reportedMsg}</div>}
        {blockedMsg && <div className="error-box" style={{ background: '#E5EFEA', color: '#1F4D3F', borderColor: '#1F4D3F' }}>{blockedMsg}</div>}

        {isBusiness && (
          <div style={{ marginBottom: 12 }}>
            {showReportForm ? (
              <div className="card">
                <div className="field">
                  <label htmlFor="reportReason">Grund (optional)</label>
                  <textarea id="reportReason" rows={2} value={reportReason} onChange={(e) => setReportReason(e.target.value)} />
                </div>
                <div className="btn-row">
                  <button className="btn btn-secondary" onClick={submitReport} disabled={reporting}>
                    {reporting ? 'Wird gesendet...' : 'Melden'}
                  </button>
                  <button className="btn btn-secondary" onClick={() => setShowReportForm(false)}>Abbrechen</button>
                </div>
              </div>
            ) : (
              <div className="btn-row" style={{ flexWrap: 'wrap' }}>
                <button className="link-text" onClick={() => setShowReportForm(true)}>Melden</button>
                {isAnon && (
                  <button className="link-text" onClick={blockBuyer} disabled={blocking}>
                    {blocking ? '...' : 'Anonyme Anfragen blockieren'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', marginBottom: 12 }}>
          {loading && <div className="loading-dot">Lädt...</div>}

          {!loading && messages.map((m, i) => {
            const isOwn = m.is_business === isBusiness
            const currentDay = new Date(m.created_at).toDateString()
            const previousDay = i > 0 ? new Date(messages[i - 1].created_at).toDateString() : null
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
                  <p style={{ margin: 0 }}>{m.content}</p>
                  <div className="chat-meta">
                    <span>{formatTime(m.created_at)}</span>
                    {isOwn && (
                      <span className={m.read_at ? 'chat-check-read' : 'chat-check-sent'}>
                        {m.read_at ? '✓✓' : '✓'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
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
