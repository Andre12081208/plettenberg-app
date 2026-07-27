import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const STATUS_LABELS = {
  in_pruefung: { text: 'In Prüfung', cls: 'status-pruefung' },
  vertrag_in_arbeit: { text: 'Vertrag in Arbeit', cls: 'status-vertrag' },
  live: { text: 'Live', cls: 'status-live' },
  abgelehnt: { text: 'Abgelehnt', cls: 'status-abgelehnt' }
}

export default function BusinessOverview({ profile, isAdmin, onOpenAdmin }) {
  const [newOrderCount, setNewOrderCount] = useState(0)
  const [openInquiryCount, setOpenInquiryCount] = useState(0)
  const [upcomingAppointments, setUpcomingAppointments] = useState([])
  const [loading, setLoading] = useState(true)

  const isLive = profile.status === 'live'

  useEffect(() => {
    if (isLive) loadOverview()
    else setLoading(false)
    // eslint-disable-next-line
  }, [])

  async function loadOverview() {
    setLoading(true)

    const [{ data: newOrders }, { data: inquiries }, { data: appointmentSlots }] = await Promise.all([
      supabase.from('business_orders').select('id').eq('business_profile_id', profile.id).eq('status', 'neu'),
      supabase.from('business_inquiries').select('id, business_inquiry_messages(is_business)').eq('business_profile_id', profile.id),
      supabase.from('business_appointment_slots').select('*').eq('business_profile_id', profile.id).not('booked_by', 'is', null).gte('start_at', new Date().toISOString()).order('start_at', { ascending: true }).limit(5)
    ])

    setNewOrderCount((newOrders || []).length)
    setOpenInquiryCount((inquiries || []).filter((i) => !i.business_inquiry_messages?.some((m) => m.is_business)).length)
    setUpcomingAppointments(appointmentSlots || [])
    setLoading(false)
  }

  return (
    <>
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>Dashboard</h1>
        {profile.account_status === 'beobachter' && (
          <div className="error-box" style={{ background: '#FCEFE1', color: 'var(--clay)', borderColor: 'var(--clay)' }}>
            Beobachter-Modus: Du kannst aktuell nichts schreiben oder senden.
          </div>
        )}
      </div>
      <main style={{ paddingBottom: 90 }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <h3 style={{ margin: 0 }}>{profile.company_name}</h3>
            <span className={`status-pill ${STATUS_LABELS[profile.status]?.cls}`}>
              {STATUS_LABELS[profile.status]?.text}
            </span>
          </div>
          <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: 14 }}>
            {profile.status === 'in_pruefung' &&
              'Wir melden uns bei dir, sobald dein Profil geprüft wurde und ein Vertrag zustande kommt.'}
            {profile.status === 'vertrag_in_arbeit' &&
              'Der Vertrag wird gerade fertiggemacht. Danach schalten wir dein Profil live.'}
            {profile.status === 'live' &&
              'Dein Profil ist öffentlich sichtbar.'}
            {profile.status === 'abgelehnt' &&
              'Dein Profil wurde aktuell nicht freigeschaltet.'}
          </p>
          {isLive && profile.category !== 'stadtverwaltung' && (
            <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>
              Paket: {profile.plan === 'basis' ? 'Basis (virtueller Laden aktiv)' : 'Kein Paket gebucht'}
            </p>
          )}
        </div>

        {isLive && (
          <>
            {loading && <div className="loading-dot">Lädt...</div>}

            {!loading && (
              <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                <div className="card" style={{ flex: 1, textAlign: 'center', minWidth: 100 }}>
                  <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: 'var(--forest)' }}>{newOrderCount}</p>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-soft)' }}>Neue Bestellungen</p>
                </div>
                <div className="card" style={{ flex: 1, textAlign: 'center', minWidth: 100 }}>
                  <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: 'var(--forest)' }}>{openInquiryCount}</p>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-soft)' }}>Offene Anfragen</p>
                </div>
              </div>
            )}

            {!loading && upcomingAppointments.length > 0 && (
              <div className="card">
                <h3 style={{ marginTop: 0 }}>Nächste Termine</h3>
                {upcomingAppointments.map((slot) => (
                  <p key={slot.id} style={{ margin: '4px 0', fontSize: 14 }}>
                    {slot.service_name} · {new Date(slot.start_at).toLocaleDateString('de-DE')}, {new Date(slot.start_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                ))}
              </div>
            )}
          </>
        )}

        {isAdmin && (
          <button className="btn btn-primary" onClick={onOpenAdmin} style={{ marginBottom: 12 }}>
            Gewerbeanfragen verwalten
          </button>
        )}
      </main>
    </>
  )
}
