import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import BusinessInquiryChat from './BusinessInquiryChat.jsx'

export default function BusinessInbox({ profile }) {
  const [orders, setOrders] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [inquiries, setInquiries] = useState([])
  const [loadingInquiries, setLoadingInquiries] = useState(true)
  const [openInquiry, setOpenInquiry] = useState(null)

  useEffect(() => {
    loadOrders()
    loadInquiries()
  }, [])

  async function loadOrders() {
    setLoadingOrders(true)
    const { data } = await supabase
      .from('business_orders')
      .select('*, business_order_items(*)')
      .eq('business_profile_id', profile.id)
      .order('created_at', { ascending: false })

    setOrders(data || [])
    setLoadingOrders(false)
  }

  async function updateOrderStatus(orderId, newStatus) {
    const { error } = await supabase.from('business_orders').update({ status: newStatus }).eq('id', orderId)
    if (!error) {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)))
    }
  }

  async function loadInquiries() {
    setLoadingInquiries(true)
    const { data } = await supabase
      .from('business_inquiries')
      .select('*')
      .eq('business_profile_id', profile.id)
      .order('created_at', { ascending: false })

    const withNames = await Promise.all(
      (data || []).map(async (inquiry) => {
        const { data: displayRows } = await supabase.rpc('get_inquiry_buyer_display', { target_inquiry_id: inquiry.id })
        const row = displayRows?.[0]
        return {
          ...inquiry,
          buyerDisplayName: row?.is_anon ? `Interessent #${row.anon_number}` : (row?.display_name || 'Interessent'),
          buyerAvatarUrl: row?.is_anon ? null : row?.avatar_url
        }
      })
    )

    setInquiries(withNames)
    setLoadingInquiries(false)
  }

  if (openInquiry) {
    return (
      <BusinessInquiryChat
        userId={profile.id}
        inquiryId={openInquiry}
        isBusiness
        onBack={() => setOpenInquiry(null)}
      />
    )
  }

  return (
    <>
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>Nachrichten</h1>
      </div>
      <main style={{ paddingBottom: 90 }}>
        <h3 style={{ marginBottom: 10 }}>Bestellungen</h3>
        {loadingOrders && <div className="loading-dot">Lädt...</div>}
        {!loadingOrders && orders.length === 0 && <p className="center-note">Noch keine Bestellungen.</p>}

        {!loadingOrders && orders.map((order) => (
          <div key={order.id} className="card">
            <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--ink-soft)' }}>
              {new Date(order.created_at).toLocaleDateString('de-DE')}
            </p>
            {order.business_order_items?.map((item) => (
              <p key={item.id} style={{ margin: '2px 0', fontSize: 14 }}>
                {item.quantity}× {item.product_name}
              </p>
            ))}
            {order.note && <p style={{ margin: '4px 0', fontSize: 13, fontStyle: 'italic' }}>„{order.note}"</p>}
            <select
              value={order.status}
              onChange={(e) => updateOrderStatus(order.id, e.target.value)}
              style={{ marginTop: 8 }}
            >
              <option value="neu">Neu</option>
              <option value="bestaetigt">Bestätigt</option>
              <option value="abgeschlossen">Abgeschlossen</option>
              <option value="abgelehnt">Abgelehnt</option>
            </select>
          </div>
        ))}

        <h3 style={{ margin: '24px 0 10px' }}>Anfragen</h3>
        {loadingInquiries && <div className="loading-dot">Lädt...</div>}
        {!loadingInquiries && inquiries.length === 0 && <p className="center-note">Noch keine Anfragen.</p>}

        {!loadingInquiries && inquiries.map((inquiry) => (
          <div className="card" key={inquiry.id} style={{ padding: 0, overflow: 'hidden' }}>
            <button
              style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', padding: 16, display: 'flex', alignItems: 'center', gap: 10 }}
              onClick={() => setOpenInquiry(inquiry.id)}
            >
              <div className="avatar-preview" style={{ width: 44, height: 44, flexShrink: 0 }}>
                {inquiry.buyerAvatarUrl ? <img src={inquiry.buyerAvatarUrl} alt="" /> : (inquiry.buyerDisplayName?.startsWith('Interessent #') ? '🕶️' : '👤')}
              </div>
              <div>
                <h3 style={{ margin: 0 }}>{inquiry.buyerDisplayName || 'Interessent'}</h3>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>
                  {inquiry.product_name_snapshot || 'Anfrage'}
                </p>
                <span className={`status-pill ${{ angefragt: 'status-pruefung', in_bearbeitung: 'status-vertrag', erledigt: 'status-live' }[inquiry.status] || 'status-pruefung'}`} style={{ fontSize: 11, marginTop: 4, display: 'inline-block' }}>
                  {{ angefragt: '⚪ Angefragt', in_bearbeitung: '🔵 In Bearbeitung', erledigt: '✅ Erledigt' }[inquiry.status] || '⚪ Angefragt'}
                </span>
              </div>
            </button>
          </div>
        ))}
      </main>
    </>
  )
}
