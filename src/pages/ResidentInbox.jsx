import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import BusinessInquiryChat from './BusinessInquiryChat.jsx'

export default function ResidentInbox({ userId, onBack }) {
  const [view, setView] = useState('inbox') // 'inbox' | 'archiveBusinesses' | 'archiveDetail'
  const [archiveBusinessId, setArchiveBusinessId] = useState(null)
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

  async function archiveInquiry(inquiryId) {
    await supabase.from('business_inquiries').update({ buyer_mailbox_status: 'archiviert' }).eq('id', inquiryId)
    setInquiries((prev) => prev.map((i) => (i.id === inquiryId ? { ...i, buyer_mailbox_status: 'archiviert' } : i)))
  }

  async function deleteInquiry(inquiryId) {
    await supabase.from('business_inquiries').update({ buyer_mailbox_status: 'geloescht' }).eq('id', inquiryId)
    setInquiries((prev) => prev.map((i) => (i.id === inquiryId ? { ...i, buyer_mailbox_status: 'geloescht' } : i)))
  }

  async function restoreInquiry(inquiryId) {
    await supabase.from('business_inquiries').update({ buyer_mailbox_status: 'inbox' }).eq('id', inquiryId)
    setInquiries((prev) => prev.map((i) => (i.id === inquiryId ? { ...i, buyer_mailbox_status: 'inbox' } : i)))
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

  const inboxItems = inquiries.filter((i) => i.buyer_mailbox_status === 'inbox' || !i.buyer_mailbox_status)
  const archivedItems = inquiries.filter((i) => i.buyer_mailbox_status === 'archiviert')

  const archivedBusinesses = Object.values(
    archivedItems.reduce((acc, i) => {
      const bid = i.business_profile_id
      if (!acc[bid]) {
        acc[bid] = { id: bid, name: i.business_profiles?.company_name || 'Betrieb', logo_url: i.business_profiles?.logo_url, count: 0 }
      }
      acc[bid].count += 1
      return acc
    }, {})
  )

  function renderInquiryCard(inquiry, options = {}) {
    return (
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
        <div className="btn-row" style={{ padding: '0 16px 16px' }}>
          {options.showRestore ? (
            <button className="btn btn-secondary" onClick={() => restoreInquiry(inquiry.id)}>Zurück in den Posteingang</button>
          ) : (
            <button className="btn btn-secondary" onClick={() => archiveInquiry(inquiry.id)}>Als erledigt archivieren</button>
          )}
          <button className="btn btn-secondary" onClick={() => deleteInquiry(inquiry.id)}>Löschen</button>
        </div>
      </div>
    )
  }

  if (view === 'archiveBusinesses') {
    return (
      <div className="app-shell">
        <div className="topbar">
          <div className="mark">Plettenberg</div>
          <h1>Erledigt</h1>
        </div>
        <main>
          <button className="link-text" onClick={() => setView('inbox')} style={{ marginBottom: 16 }}>← Zurück zum Posteingang</button>

          {archivedBusinesses.length === 0 && <p className="center-note">Noch keine archivierten Anfragen.</p>}

          {archivedBusinesses.map((b) => (
            <button
              key={b.id}
              className="card"
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer' }}
              onClick={() => { setArchiveBusinessId(b.id); setView('archiveDetail') }}
            >
              <div className="avatar-preview" style={{ width: 44, height: 44, flexShrink: 0 }}>
                {b.logo_url ? <img src={b.logo_url} alt="" /> : '🏬'}
              </div>
              <div>
                <h3 style={{ margin: 0 }}>{b.name}</h3>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>{b.count} archivierte Anfrage{b.count > 1 ? 'n' : ''}</p>
              </div>
            </button>
          ))}
        </main>
      </div>
    )
  }

  if (view === 'archiveDetail') {
    const items = archivedItems.filter((i) => i.business_profile_id === archiveBusinessId)
    const businessName = items[0]?.business_profiles?.company_name || 'Betrieb'
    return (
      <div className="app-shell">
        <div className="topbar">
          <div className="mark">Plettenberg</div>
          <h1>{businessName}</h1>
        </div>
        <main>
          <button className="link-text" onClick={() => setView('archiveBusinesses')} style={{ marginBottom: 16 }}>← Zurück zu Erledigt</button>
          {items.map((i) => renderInquiryCard(i, { showRestore: true }))}
        </main>
      </div>
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

        <button className="card-choice" onClick={() => setView('archiveBusinesses')}>
          <h3 style={{ margin: 0 }}>📁 Erledigt</h3>
          <p style={{ margin: 0 }}>{archivedItems.length} archivierte Anfrage{archivedItems.length !== 1 ? 'n' : ''}</p>
        </button>

        {loading && <div className="loading-dot">Lädt...</div>}
        {!loading && inboxItems.length === 0 && <p className="center-note">Noch keine Anfragen.</p>}

        {!loading && inboxItems.map((i) => renderInquiryCard(i, { showRestore: false }))}
      </main>
    </div>
  )
}
