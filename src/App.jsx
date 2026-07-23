import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import { ADMIN_EMAIL } from './lib/adminConfig'
import Auth from './pages/Auth.jsx'
import Onboarding from './pages/Onboarding.jsx'
import PrivateProfileForm from './pages/PrivateProfileForm.jsx'
import BusinessProfileForm from './pages/BusinessProfileForm.jsx'
import Dashboard from './pages/Dashboard.jsx'
import AdminPanel from './pages/AdminPanel.jsx'
import HomeScreen from './pages/HomeScreen.jsx'
import AccountBlocked from './pages/AccountBlocked.jsx'

export default function App() {
  const [session, setSession] = useState(undefined)
  const [profileType, setProfileType] = useState(null)
  const [profile, setProfile] = useState(null)
  const [checkingProfile, setCheckingProfile] = useState(false)
  const [chosenType, setChosenType] = useState(null)
  const [view, setView] = useState('dashboard')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setChosenType(null)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) {
      setProfile(null)
      setProfileType(null)
      return
    }
    loadProfile(session.user.id)
  }, [session])

  useEffect(() => {
    if (!profileType) return
    const ping = () => { supabase.rpc('touch_last_seen').then(() => {}) }
    ping()
    const interval = setInterval(ping, 60000)
    return () => clearInterval(interval)
  }, [profileType])

  async function loadProfile(userId) {
    setCheckingProfile(true)

    const { data: privateData } = await supabase
      .from('private_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (privateData) {
      setProfile(privateData)
      setProfileType('private')
      setCheckingProfile(false)
      return
    }

    const { data: businessData } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (businessData) {
      setProfile(businessData)
      setProfileType('business')
      setCheckingProfile(false)
      return
    }

    setProfile(null)
    setProfileType(null)
    setCheckingProfile(false)
  }

  if (session === undefined || checkingProfile) {
    return <div className="loading-dot">Einen Moment...</div>
  }

  if (!session) {
    return <Auth />
  }

  if (!profileType && !chosenType) {
    return <Onboarding onChoose={setChosenType} />
  }

  if (!profileType && chosenType === 'private') {
    return (
      <PrivateProfileForm
        userId={session.user.id}
        onDone={() => loadProfile(session.user.id)}
      />
    )
  }

  if (!profileType && (chosenType === 'anbieter' || chosenType === 'unternehmen')) {
    return (
      <BusinessProfileForm
        userId={session.user.id}
        kind={chosenType}
        onDone={() => loadProfile(session.user.id)}
      />
    )
  }

  if (profile?.account_status === 'gesperrt') {
    return <AccountBlocked />
  }

  const isAdmin = session.user.email === ADMIN_EMAIL

  if (isAdmin && view === 'admin') {
    return <AdminPanel onBack={() => setView('dashboard')} />
  }

  if (profileType === 'private') {
    return (
      <HomeScreen
        profile={profile}
        userId={session.user.id}
        isAdmin={isAdmin}
        onProfileUpdated={() => loadProfile(session.user.id)}
      />
    )
  }

  return (
    <Dashboard
      profileType={profileType}
      profile={profile}
      isAdmin={isAdmin}
      onOpenAdmin={() => setView('admin')}
    />
  )
}
