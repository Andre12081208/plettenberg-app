import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import CreateChannel from './CreateChannel.jsx'
import ChannelDetail from './ChannelDetail.jsx'
import QRScanner from './QRScanner.jsx'

export default function ChannelsHub({ userId, onBack, initialChannelCode, onConsumedInitial }) {
  const [view, setView] = useState('list')
  const [channels, setChannels] = useState([])
  const [catalog, setCatalog] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedChannelId, setSelectedChannelId] = useState(null)
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)

  useEffect(() => { loadChannels(); loadCatalog() }, [])

  useEffect(() => {
    if (initialChannelCode) resolveCode(initialChannelCode)
    // eslint-disable-next-line
  }, [initialChannelCode])

  async function resolveCode(code) {
    const { data } = await supabase.rpc('get_channel_preview', { code })
    if (data && data.length > 0) {
      setSelectedChannelId(data[0].id)
    } else {
      setError('Dieser Channel-Link ist ungültig oder abgelaufen.')
    }
    onConsumedInitial?.()
  }

  async function loadChannels() {
    setLoading(true)
    const { data, error } = await supabase.rpc('get_my_channels')
    if (error) setError(error.message)
    setChannels(data || [])
    setLoading(false)
  }

  async function loadCatalog() {
    const { data, error } = await supabase.rpc('get_public_channels')
    if (error) setError(error.message)
    setCatalog(data || [])
  }

  async function handleSearch(e) {
    e?.preventDefault()
    if (!query.trim()) { setSearchResults([]); return }
    setSearching(true)
    const { data, error } = await supabase.rpc('search_channels', { query: query.trim() })
    if (error) setError(error.message)
    setSearchResults(data || [])
    setSearching(false)
  }

  function handleScanResult(text) {
    let code = text
    try {
      const url = new URL(text)
      const c = url.searchParams.get('c')
      if (c) code = c
    } catch {
      // war schon nur der Code, kein Link
    }
    setView('list')
    resolveCode(code)
  }

  if (selectedChannelId) {
    return (
      <ChannelDetail
        userId={userId}
        channelId={selectedChannelId}
        onBack={() => { setSelectedChannelId(null); loadChannels(); loadCatalog() }}
      />
    )
  }

  if (view === 'create') {
    return (
      <CreateChannel
        userId={userId}
        onBack={() => setView('list')}
        onDone={(channelId) => { setSelectedChannelId(channelId); setView('list') }}
      />
    )
  }

  if (view === 'scan') {
    return (
      <QRScanner
        onBack={() => setView('list')}
        onScan={handleScanResult}
      />
    )
  }

  const followedIds = new Set(channels.map((c) => c.channel_id))

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>Channels</h1>
      </div>
      <main style={{ paddingBottom: 20 }}>
        <button className="link-text" onClick={onBack} style={{ marginBottom: 16 }}>← Zurück</button>

        {error && <div className="error-box">{error}</div>}

        <div className="btn-row" style={{ marginBottom: 18 }}>
          <button className="btn btn-primary" onClick={() => setView('create')}>+ Neuer Channel</button>
          <button className="btn btn-secondary" onClick={() => setView('scan')}>QR-Code scannen</button>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Channel suchen</h3>
          <p className="hint" style={{ marginTop: -4, marginBottom: 10 }}>Findet auch private Channels, die nicht im Katalog stehen.</p>
          <form onSubmit={handleSearch}>
            <div className="field">
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name des Channels" />
            </div>
            <button className="btn btn-secondary" type="submit" disabled={searching}>
              {searching ? 'Sucht...' : 'Suchen'}
            </button>
          </form>

          {searchResults.map((r) => (
            <button
              key={r.id}
              className="card-choice"
              style={{ marginTop: 12 }}
              onClick={() => setSelectedChannelId(r.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <h3 style={{ margin: 0 }}>{r.name}</h3>
                {!r.is_public && <span className="status-pill status-vertrag" style={{ fontSize: 10 }}>Privat</span>}
              </div>
              {r.description && <p style={{ margin: 0 }}>{r.description}</p>}
            </button>
          ))}
        </div>

        <h3 style={{ marginBottom: 10 }}>Deine Channels</h3>
        {loading && <div className="loading-dot">Lädt...</div>}
        {!loading && channels.length === 0 && <p className="center-note">Noch keine Channels abonniert.</p>}

        {channels.map((c) => (
          <button key={c.channel_id} className="card-choice" onClick={() => setSelectedChannelId(c.channel_id)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <h3 style={{ margin: 0 }}>{c.name}</h3>
              {c.is_owner && <span className="status-pill status-live" style={{ fontSize: 10 }}>Eigener Channel</span>}
              {c.follow_status === 'pending' && <span className="status-pill status-pruefung" style={{ fontSize: 10 }}>Warte auf Bestätigung</span>}
            </div>
            {c.last_post && <p style={{ margin: 0 }}>{c.last_post.length > 50 ? c.last_post.slice(0, 50) + '…' : c.last_post}</p>}
          </button>
        ))}

        <h3 style={{ marginTop: 24, marginBottom: 10 }}>Katalog – öffentliche Channels</h3>
        {catalog.filter((c) => !followedIds.has(c.id)).length === 0 && (
          <p className="center-note">Keine weiteren öffentlichen Channels verfügbar.</p>
        )}
        {catalog.filter((c) => !followedIds.has(c.id)).map((c) => (
          <button key={c.id} className="card-choice" onClick={() => setSelectedChannelId(c.id)}>
            <h3 style={{ margin: 0 }}>{c.name}</h3>
            {c.description && <p style={{ margin: 0 }}>{c.description}</p>}
          </button>
        ))}
      </main>
    </div>
  )
}
