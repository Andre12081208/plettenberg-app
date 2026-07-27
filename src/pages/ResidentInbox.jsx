import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import BusinessInquiryChat from './BusinessInquiryChat.jsx'

export default function ResidentInbox({ userId, onBack }) {
  const [inquiries, setInquiries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [openInquiry, setOpenInquiry] = useState(null)

  useEffect(() => {
    loadInquiries()
  }, [])

  async function loadInquiries() {
    setLoading(true)
    setError('')

    const [{ data, error }, { data: unreadRows }] = await Promise.all([
      supabase
        .from('business_inquiries')
        .select('*, business_profiles(company_name, logo_url)')
        .eq('buyer_id', userId)
        .order('updated_at', { ascending: false }),
      supabase.rpc('get_resident_inquiry_unread_map')
    ])

    const unreadMap = {}
    for (const row of unreadRows || []) unreadMap[row.inquiry_id] = row.unread_count

    if (error) setError(error.message)
    setInquiries((data || []).map((i) => ({ ...i, unreadCount: unreadMap[i.id] || 0 })))
    setLoading(false)
  }

  async function openThread(inquiryId) {
    await supabase.from('business_inquiries').update({ buyer_last_read_at: new Date().toISOString() }).eq('id', inquiryId)
    setOpenInquiry(inquiryId)
  }

  if (openInquiry) {
    return (
      <BusinessInquiryChat
        userId={userId}
        inquiryId={openInquiry}
        isBusiness={false}
        onBack={() => { setOpenInquiry(null); loadInquiries() }}
      />
    )
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>Postfach</h1>
      </div>
      <main>
        <button className="link-text" onClick={onBack} style={{ marginBottom: 16 }}>← Zurück</button>

        {error && <div className="error-box">{error}</div>}
        {loading && <div className="loading-dot">Lädt...</div>}
        {!loading && inquiries.length === 0 && <p className="center-note">Noch keine Anfragen.</p>}

        {!loading && inquiries.map((inquiry) => (
          <div className="card" key={inquiry.id} style={{ padding: 0, overflow: 'hidden' }}>
            <button
              style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', padding: 16, display: 'flex', alignItems: 'center', gap: 10 }}
              onClick={() => openThread(inquiry.id)}
            >
              <div className="avatar-preview" style={{ width: 44, height: 44, flexShrink: 0 }}>
                {inquiry.business_profiles?.logo_url ? <img src={inquiry.business_profiles.logo_url} alt="" /> : '🏬'}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0 }}>{inquiry.business_profiles?.company_name || 'Betrieb'}</h3>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>
                  {inquiry.product_name_snapshot || 'Anfrage'}
                </p>
                <span className={`status-pill ${{ angefragt: 'status-pruefung', in_bearbeitung: 'status-vertrag', erledigt: 'status-live' }[inquiry.status] || 'status-pruefung'}`} style={{ fontSize: 11, marginTop: 4, display: 'inline-block' }}>
                  {{ angefragt: '⚪ Angefragt', in_bearbeitung: '🔵 In Bearbeitung', erledigt: '✅ Erledigt' }[inquiry.status] || '⚪ Angefragt'}
                </span>
              </div>
              {inquiry.unreadCount > 0 && (
                <span style={{ minWidth: 22, height: 22, borderRadius: 11, background: 'var(--clay)', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px', flexShrink: 0 }}>
                  {inquiry.unreadCount}
                </span>
              )}
            </button>
          </div>
        ))}
      </main>
    </div>
  )
}
