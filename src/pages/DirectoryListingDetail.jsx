import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useCity } from '../lib/useCity.js'
import BusinessMiniApp from './BusinessMiniApp.jsx'

export default function DirectoryListingDetail({ listing, userId, onBack, onFullScreenChange }) {
  const { name: cityName } = useCity()
  const [linkedBusiness, setLinkedBusiness] = useState(null)
  const [loading, setLoading] = useState(true)

  const [showPartnerForm, setShowPartnerForm] = useState(false)
  const [partnerName, setPartnerName] = useState('')
  const [partnerEmail, setPartnerEmail] = useState('')
  const [partnerPhone, setPartnerPhone] = useState('')
  const [partnerMessage, setPartnerMessage] = useState('')
  const [sendingPartner, setSendingPartner] = useState(false)
  const [partnerSent, setPartnerSent] = useState(false)

  const [showReportForm, setShowReportForm] = useState(false)
  const [reportMessage, setReportMessage] = useState('')
  const [sendingReport, setSendingReport] = useState(false)
  const [reportSent, setReportSent] = useState(false)

  useEffect(() => {
    loadLinkedBusiness()
  }, [])

  async function loadLinkedBusiness() {
    if (!listing.linked_business_profile_id) {
      setLoading(false)
      return
    }
    const { data } = await supabase.from('business_profiles').select('*').eq('id', listing.linked_business_profile_id).maybeSingle()
    setLinkedBusiness(data || null)
    setLoading(false)
  }

  async function submitPartnerRequest(e) {
    e.preventDefault()
    setSendingPartner(true)
    const { error } = await supabase.from('directory_partner_requests').insert({
      listing_id: listing.id,
      requester_id: userId,
      contact_name: partnerName.trim() || null,
      contact_email: partnerEmail.trim() || null,
      contact_phone: partnerPhone.trim() || null,
      message: partnerMessage.trim() || null
    })
    if (!error) setPartnerSent(true)
    setSendingPartner(false)
  }

  async function submitReport(e) {
    e.preventDefault()
    if (!reportMessage.trim()) return
    setSendingReport(true)
    const { error } = await supabase.from('directory_listing_reports').insert({
      listing_id: listing.id,
      reporter_id: userId,
      message: reportMessage.trim()
    })
    if (!error) setReportSent(true)
    setSendingReport(false)
  }

  if (loading) return <div className="loading-dot">Lädt...</div>

  const isPartner = linkedBusiness?.status === 'live' && linkedBusiness?.plan === 'basis'

  if (isPartner) {
    return <BusinessMiniApp app={linkedBusiness} userId={userId} onBack={onBack} fullScreenRoom onFullScreenChange={onFullScreenChange} />
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">{cityName}</div>
        <h1>{listing.name}</h1>
      </div>
      <main>
        <button className="link-text" onClick={onBack} style={{ marginBottom: 16 }}>← Zurück</button>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>{listing.name}</h3>
          {listing.description && <p style={{ fontSize: 14 }}>{listing.description}</p>}
          {listing.address && <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>📍 {listing.address}</p>}
          {listing.phone && <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>📞 {listing.phone}</p>}
          {listing.website && (
            <p style={{ fontSize: 13 }}>
              <a href={listing.website} target="_blank" rel="noreferrer" style={{ color: 'var(--forest)' }}>{listing.website}</a>
            </p>
          )}
          <p className="hint" style={{ marginTop: 12 }}>
            Dieser Eintrag ist ein Basis-Profil. Der Betrieb hat noch keinen eigenen virtuellen Laden in der App.
          </p>
        </div>

        {partnerSent ? (
          <div className="error-box" style={{ background: '#E5EFEA', color: '#1F4D3F', borderColor: '#1F4D3F' }}>
            Danke! Wir melden uns beim Betrieb.
          </div>
        ) : showPartnerForm ? (
          <form onSubmit={submitPartnerRequest} className="card">
            <div className="field">
              <label htmlFor="partnerName">Dein Name (optional)</label>
              <input id="partnerName" value={partnerName} onChange={(e) => setPartnerName(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="partnerEmail">E-Mail oder Telefon des Betriebs (optional)</label>
              <input id="partnerEmail" value={partnerEmail} onChange={(e) => setPartnerEmail(e.target.value)} placeholder="Falls du sie kennst" />
            </div>
            <div className="field">
              <label htmlFor="partnerMessage">Nachricht (optional)</label>
              <textarea id="partnerMessage" rows={3} value={partnerMessage} onChange={(e) => setPartnerMessage(e.target.value)} />
            </div>
            <div className="btn-row">
              <button className="btn btn-primary" type="submit" disabled={sendingPartner}>
                {sendingPartner ? 'Wird gesendet...' : 'Absenden'}
              </button>
              <button className="btn btn-secondary" type="button" onClick={() => setShowPartnerForm(false)}>Abbrechen</button>
            </div>
          </form>
        ) : (
          <button className="btn btn-primary" onClick={() => setShowPartnerForm(true)} style={{ marginBottom: 12 }}>
            🤝 Werde Partner
          </button>
        )}

        {reportSent ? (
          <div className="error-box" style={{ background: '#E5EFEA', color: '#1F4D3F', borderColor: '#1F4D3F' }}>
            Danke für den Hinweis!
          </div>
        ) : showReportForm ? (
          <form onSubmit={submitReport} className="card">
            <div className="field">
              <label htmlFor="reportMessage">Was ist veraltet oder falsch?</label>
              <textarea id="reportMessage" required rows={3} value={reportMessage} onChange={(e) => setReportMessage(e.target.value)} placeholder="z.B. gibt es nicht mehr, Adresse hat sich geändert..." />
            </div>
            <div className="btn-row">
              <button className="btn btn-secondary" type="submit" disabled={sendingReport}>
                {sendingReport ? 'Wird gesendet...' : 'Melden'}
              </button>
              <button className="btn btn-secondary" type="button" onClick={() => setShowReportForm(false)}>Abbrechen</button>
            </div>
          </form>
        ) : (
          <button className="link-text" onClick={() => setShowReportForm(true)}>🚩 Fehler melden</button>
        )}
      </main>
    </div>
  )
}
