import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function GroupSettings({ userId, groupId, onBack }) {
  const [members, setMembers] = useState([])
  const [inviteCode, setInviteCode] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    loadMembers()
    loadInviteCode()
  }, [])

  async function loadInviteCode() {
    const { data } = await supabase.from('groups').select('invite_code').eq('id', groupId).maybeSingle()
    setInviteCode(data?.invite_code || null)
  }

  async function loadMembers() {
    setLoading(true)
    const { data, error } = await supabase.rpc('get_group_members', { gid: groupId })
    if (error) setError(error.message)
    setMembers(data || [])
    setLoading(false)
  }

  async function approve(memberId) {
    setBusyId(memberId)
    const { error } = await supabase.from('group_members').update({ status: 'active' }).eq('group_id', groupId).eq('user_id', memberId)
    if (error) setError(error.message)
    loadMembers()
    setBusyId(null)
  }

  async function decline(memberId) {
    setBusyId(memberId)
    const { error } = await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', memberId)
    if (error) setError(error.message)
    loadMembers()
    setBusyId(null)
  }

  async function toggleAdmin(memberId, currentRole) {
    setBusyId(memberId)
    const { error } = await supabase.from('group_members').update({ role: currentRole === 'admin' ? 'member' : 'admin' }).eq('group_id', groupId).eq('user_id', memberId)
    if (error) setError(error.message)
    loadMembers()
    setBusyId(null)
  }

  async function removeMember(memberId) {
    setBusyId(memberId)
    const { error } = await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', memberId)
    if (error) setError(error.message)
    loadMembers()
    setBusyId(null)
  }

  const active = members.filter((m) => m.status === 'active')
  const pending = members.filter((m) => m.status === 'pending')

  const inviteLink = inviteCode ? `${window.location.origin}?g=${inviteCode}` : null
  const qrUrl = inviteLink ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(inviteLink)}` : null

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>Gruppe verwalten</h1>
      </div>
      <main>
        <button className="link-text" onClick={onBack} style={{ marginBottom: 16 }}>← Zurück</button>

        {error && <div className="error-box">{error}</div>}

        {inviteLink && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Einladung</h3>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', wordBreak: 'break-all' }}>{inviteLink}</p>
            <img src={qrUrl} alt="QR-Code" style={{ width: 140, height: 140 }} />
          </div>
        )}

        {pending.length > 0 && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Beitrittsanfragen</h3>
            {pending.map((m) => (
              <div key={m.member_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span>{m.display_name || `@${m.username}`}</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary" style={{ width: 'auto', padding: '6px 12px' }} onClick={() => approve(m.member_id)} disabled={busyId === m.member_id}>Annehmen</button>
                  <button className="btn btn-secondary" style={{ width: 'auto', padding: '6px 12px' }} onClick={() => decline(m.member_id)} disabled={busyId === m.member_id}>Ablehnen</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <h3 style={{ marginBottom: 10 }}>Mitglieder</h3>
        {loading && <div className="loading-dot">Lädt...</div>}
        {active.map((m) => (
          <div className="card" key={m.member_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 600 }}>{m.display_name || `@${m.username}`}</p>
              <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{m.role === 'admin' ? 'Admin' : 'Mitglied'}</span>
            </div>
            {m.member_id !== userId && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" style={{ width: 'auto', padding: '6px 12px' }} onClick={() => toggleAdmin(m.member_id, m.role)} disabled={busyId === m.member_id}>
                  {m.role === 'admin' ? 'Admin entziehen' : 'Zum Admin machen'}
                </button>
                <button className="btn btn-secondary" style={{ width: 'auto', padding: '6px 12px' }} onClick={() => removeMember(m.member_id)} disabled={busyId === m.member_id}>
                  Entfernen
                </button>
              </div>
            )}
          </div>
        ))}
      </main>
    </div>
  )
}
