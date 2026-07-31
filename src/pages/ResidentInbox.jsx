import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useCity } from '../lib/useCity.js'
import BusinessInquiryChat from './BusinessInquiryChat.jsx'
import { IdeaDetail } from './Ideenwerkstatt.jsx'

const CATEGORY_META = {
  gewerbe: { icon: '🏬', label: 'Gewerbe', tagClass: 'postfach-tag-gewerbe' },
  stadtverwaltung: { icon: '🏛️', label: 'Stadtverwaltung', tagClass: 'postfach-tag-stadtverwaltung' },
  ideenwerkstatt: { icon: '💡', label: 'Ideenwerkstatt', tagClass: 'postfach-tag-ideenwerkstatt' }
}

export default function ResidentInbox({ userId, onBack }) {
  const { name: cityName } = useCity()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('alle')
  const [mailboxTab, setMailboxTab] = useState('inbox') // 'inbox' | 'archiviert'
  const [openMenuId, setOpenMenuId] = useState(null)

  const [selected, setSelected] = useState(null)
  const [selectedIdea, setSelectedIdea] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const [showPicker, setShowPicker] = useState(false)
  const [pickerSearch, setPickerSearch] = useState('')
  const [contacts, setContacts] = useState([])
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [composeTarget, setComposeTarget] = useState(null)
  const [composeMessage, setComposeMessage] = useState('')
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    loadConversations()
  }, [])

  async function loadConversations() {
    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('postfach_conversations')
      .select('*')
      .eq('user_id', userId)
      .order('is_pinned', { ascending: false })
      .order('last_activity_at', { ascending: false })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    const withCounts = await Promise.all(
      (data || []).map(async (conv) => {
        let unreadCount = 0
        if (conv.source_type === 'idea') {
          const { data: msgs } = await supabase
            .from('idea_messages')
            .select('id')
            .eq('idea_id', conv.source_id)
            .eq('is_developer', true)
            .gt('created_at', conv.last_read_at)
          unreadCount = (msgs || []).length
        } else {
          const { data: msgs } = await supabase
            .from('business_inquiry_messages')
            .select('id')
            .eq('inquiry_id', conv.source_id)
            .eq('is_business', true)
            .is('read_at', null)
          unreadCount = (msgs || []).length
        }
        return { ...conv, unreadCount }
      })
    )

    setConversations(withCounts)
    setLoading(false)
  }

  async function openPicker() {
    setShowPicker(true)
    setLoadingContacts(true)
    const { data } = await supabase.rpc('get_my_business_contacts')
    setContacts(data || [])
    setLoadingContacts(false)
  }

  async function selectContact(business) {
    setError('')
    const { data: existing } = await supabase
      .from('business_inquiries')
      .select('id')
      .eq('business_profile_id', business.business_id)
      .eq('buyer_id', userId)
      .is('product_id', null)
      .maybeSingle()

    if (existing) {
      const { data: conv } = await supabase
        .from('postfach_conversations')
        .select('*')
        .eq('source_type', 'business_inquiry')
        .eq('source_id', existing.id)
        .eq('user_id', userId)
        .maybeSingle()

      if (conv) {
        setShowPicker(false)
        setComposeTarget(null)
        openConversation(conv)
        return
      }
    }

    setComposeTarget(business)
  }

  async function sendNewConversation(e) {
    e.preventDefault()
    if (!composeMessage.trim()) return
    setStarting(true)
    setError('')

    const { data: created, error: createError } = await supabase
      .from('business_inquiries')
      .insert({
        business_profile_id: composeTarget.business_id,
        buyer_id: userId,
        product_name_snapshot: 'Allgemeine Anfrage',
        is_anonymous: false
      })
      .select('id')
      .single()

    if (createError) {
      setError(createError.message)
      setStarting(false)
      return
    }

    await supabase.from('business_inquiry_messages').insert({
      inquiry_id: created.id,
      sender_id: userId,
      is_business: false,
      content: composeMessage.trim()
    })

    const { data: conv } = await supabase
      .from('postfach_conversations')
      .select('*')
      .eq('source_type', 'business_inquiry')
      .eq('source_id', created.id)
      .eq('user_id', userId)
      .maybeSingle()

    setStarting(false)
    setShowPicker(false)
    setComposeTarget(null)
    setComposeMessage('')

    if (conv) openConversation(conv)
  }

  async function openConversation(conv) {
    setLoadingDetail(true)

    if (conv.source_type === 'idea') {
      const { data } = await supabase.from('ideas').select('*').eq('id', conv.source_id).maybeSingle()
      setSelectedIdea(data)
    } else {
      setSelectedIdea(null)
    }

    await supabase.from('postfach_conversations').update({ last_read_at: new Date().toISOString(), manually_unread: false }).eq('id', conv.id)

    setSelected(conv)
    setLoadingDetail(false)
  }

  function closeConversation() {
    setSelected(null)
    setSelectedIdea(null)
    loadConversations()
  }

  async function updateConversation(id, patch) {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
    await supabase.from('postfach_conversations').update(patch).eq('id', id)
    setOpenMenuId(null)
  }

  function isUnread(conv) {
    return conv.manually_unread || new Date(conv.last_activity_at) > new Date(conv.last_read_at)
  }

  const filtered = conversations
    .filter((c) => c.mailbox_status === mailboxTab)
    .filter((c) => categoryFilter === 'alle' || c.category === categoryFilter)
    .filter((c) => {
      if (!search.trim()) return true
      const needle = search.trim().toLowerCase()
      return (
        c.title?.toLowerCase().includes(needle) ||
        c.subtitle?.toLowerCase().includes(needle) ||
        c.counterpart_name?.toLowerCase().includes(needle)
      )
    })

  const listContent = (
    <>
      {error && <div className="error-box">{error}</div>}

      <div className="btn-row" style={{ marginBottom: 12 }}>
        <button className="btn btn-primary" onClick={openPicker}>+ Neue Nachricht</button>
      </div>

      <div className="field">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Suchen: Name, Betrieb oder Inhalt..."
        />
      </div>

      <div className="btn-row" style={{ marginBottom: 10, flexWrap: 'wrap' }}>
        {[
          { value: 'alle', label: 'Alle' },
          { value: 'gewerbe', label: '🏬 Gewerbe' },
          { value: 'stadtverwaltung', label: '🏛️ Stadtverwaltung' },
          { value: 'ideenwerkstatt', label: '💡 Ideenwerkstatt' }
        ].map((f) => (
          <button
            key={f.value}
            className={categoryFilter === f.value ? 'btn btn-primary' : 'btn btn-secondary'}
            style={{ width: 'auto', padding: '8px 14px' }}
            onClick={() => setCategoryFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="btn-row" style={{ marginBottom: 16 }}>
        <button className={mailboxTab === 'inbox' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setMailboxTab('inbox')}>Posteingang</button>
        <button className={mailboxTab === 'archiviert' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setMailboxTab('archiviert')}>Archiviert</button>
      </div>

      {loading && <div className="loading-dot">Lädt...</div>}
      {!loading && filtered.length === 0 && <p className="center-note">Keine Nachrichten gefunden.</p>}

      {!loading && filtered.map((conv) => {
        const meta = CATEGORY_META[conv.category]
        const unread = isUnread(conv)
        const displayCount = conv.unreadCount > 0 ? conv.unreadCount : (unread ? 1 : 0)
        return (
          <div className="card" key={conv.id} style={{ padding: 0, overflow: 'hidden' }}>
            <button
              style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', padding: 16, display: 'flex', alignItems: 'center', gap: 10 }}
              onClick={() => openConversation(conv)}
            >
              <div className="avatar-preview" style={{ width: 44, height: 44, flexShrink: 0 }}>
                {conv.counterpart_avatar_url ? <img src={conv.counterpart_avatar_url} alt="" /> : meta.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {conv.is_pinned && <span style={{ fontSize: 12 }}>📌</span>}
                  <h3 style={{ margin: 0, fontWeight: unread ? 700 : 600 }}>{conv.title}</h3>
                </div>
                {conv.subtitle && <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>{conv.subtitle}</p>}
                <span className={`status-pill ${meta.tagClass}`} style={{ fontSize: 11, marginTop: 4, display: 'inline-block' }}>
                  {meta.icon} {meta.label}
                </span>
              </div>
              {displayCount > 0 && (
                <span style={{ minWidth: 22, height: 22, borderRadius: 11, background: 'var(--clay)', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px', flexShrink: 0 }}>
                  {displayCount}
                </span>
              )}
            </button>

            <div style={{ padding: '0 16px 12px' }}>
              {openMenuId === conv.id ? (
                <div className="btn-row" style={{ flexWrap: 'wrap' }}>
                  <button className="link-text" onClick={() => updateConversation(conv.id, { is_pinned: !conv.is_pinned })}>
                    {conv.is_pinned ? 'Lösen' : 'Fixieren'}
                  </button>
                  <button className="link-text" onClick={() => updateConversation(conv.id, { manually_unread: true })}>Als ungelesen markieren</button>
                  {conv.mailbox_status === 'inbox' ? (
                    <button className="link-text" onClick={() => updateConversation(conv.id, { mailbox_status: 'archiviert' })}>Archivieren</button>
                  ) : (
                    <button className="link-text" onClick={() => updateConversation(conv.id, { mailbox_status: 'inbox' })}>Zurück in Posteingang</button>
                  )}
                  <button className="link-text" onClick={() => updateConversation(conv.id, { mailbox_status: 'geloescht' })}>Löschen</button>
                  <button className="link-text" onClick={() => setOpenMenuId(null)}>Schließen</button>
                </div>
              ) : (
                <button className="link-text" onClick={() => setOpenMenuId(conv.id)}>⋯ Mehr</button>
              )}
            </div>
          </div>
        )
      })}
    </>
  )

  const detailContent = loadingDetail ? (
    <div className="loading-dot">Lädt...</div>
  ) : selected?.source_type === 'business_inquiry' ? (
    <BusinessInquiryChat
      userId={userId}
      inquiryId={selected.source_id}
      isBusiness={false}
      onBack={closeConversation}
    />
  ) : selected?.source_type === 'idea' && selectedIdea ? (
    <IdeaDetail
      userId={userId}
      idea={selectedIdea}
      onBack={closeConversation}
      onUpdated={(updated) => setSelectedIdea(updated)}
    />
  ) : (
    <p className="center-note" style={{ marginTop: 40 }}>Wähle eine Unterhaltung aus.</p>
  )

  if (showPicker) {
    const filteredContacts = contacts.filter((c) => c.company_name.toLowerCase().includes(pickerSearch.trim().toLowerCase()))

    if (composeTarget) {
      return (
        <div className="app-shell">
          <div className="topbar">
            <div className="mark">{cityName}</div>
            <h1>{composeTarget.company_name}</h1>
          </div>
          <main>
            <button className="link-text" onClick={() => setComposeTarget(null)} style={{ marginBottom: 16 }}>← Zurück</button>
            {error && <div className="error-box">{error}</div>}
            <form onSubmit={sendNewConversation}>
              <div className="field">
                <label htmlFor="composeMessage">Deine Nachricht</label>
                <textarea id="composeMessage" required rows={4} value={composeMessage} onChange={(e) => setComposeMessage(e.target.value)} placeholder={`Schreib ${composeTarget.company_name} eine Nachricht...`} />
              </div>
              <button className="btn btn-primary" type="submit" disabled={starting}>
                {starting ? 'Wird gesendet...' : 'Senden'}
              </button>
            </form>
          </main>
        </div>
      )
    }

    return (
      <div className="app-shell">
        <div className="topbar">
          <div className="mark">{cityName}</div>
          <h1>Neue Nachricht</h1>
        </div>
        <main>
          <button className="link-text" onClick={() => setShowPicker(false)} style={{ marginBottom: 16 }}>← Zurück zum Postfach</button>

          <div className="field">
            <input value={pickerSearch} onChange={(e) => setPickerSearch(e.target.value)} placeholder="Betrieb oder Stadtverwaltung suchen..." />
          </div>

          {loadingContacts && <div className="loading-dot">Lädt...</div>}
          {!loadingContacts && filteredContacts.length === 0 && (
            <p className="center-note">Keine Treffer. Füge Betriebe zu deinen Apps hinzu oder folge ihrem Channel, um sie hier anschreiben zu können.</p>
          )}

          {!loadingContacts && filteredContacts.map((c) => (
            <button
              key={c.business_id}
              className="card"
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer' }}
              onClick={() => selectContact(c)}
            >
              <div className="avatar-preview" style={{ width: 44, height: 44, flexShrink: 0 }}>
                {c.logo_url ? <img src={c.logo_url} alt="" /> : (c.category === 'stadtverwaltung' ? '🏛️' : '🏬')}
              </div>
              <h3 style={{ margin: 0 }}>{c.company_name}</h3>
            </button>
          ))}
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">{cityName}</div>
        <h1>Postfach</h1>
      </div>
      <main>
        <button className="link-text" onClick={onBack} style={{ marginBottom: 16 }}>← Zurück</button>

        <div className={`postfach-split ${selected ? 'detail-open' : ''}`}>
          <div className="postfach-list">{listContent}</div>
          <div className="postfach-detail">{detailContent}</div>
        </div>
      </main>
    </div>
  )
}
