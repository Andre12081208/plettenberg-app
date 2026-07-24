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
import PasswordChangedCountdown from './pages/PasswordChangedCountdown.jsx'
import AccountBlocked from './pages/AccountBlocked.jsx'

export default function App() {
  const [justConfirmedMsg, setJustConfirmedMsg] = useState('')
  const [session, setSession] = useState(undefined)
  const [profileType, setProfileType] = useState(null)
  const [profile, setProfile] = useState(null)
  const [checkingProfile, setCheckingProfile] = useState(false)
  const [chosenType, setChosenType] = useState(null)
  const [view, setView] = useState('dashboard')
  const [passwordJustChanged, setPasswordJustChanged] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      const isEmailConfirmation = window.location.hash.includes('type=signup')

      if (event === 'SIGNED_IN' && isEmailConfirmation) {
        window.history.replaceState({}, '', window.location.pathname)
        supabase.auth.signOut().then(() => {
          setJustConfirmedMsg('Deine Email-Adresse wurde bestätigt. Du kannst dich jetzt anmelden.')
        })
        return
      }

      if (event === 'SIGNED_IN') {
        sessionStorage.removeItem('pb_activeTab')
        sessionStorage.removeItem('pb_openApp')
      }
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
    useEffect(() => {
    const preference = profile?.theme_preference || 'auto'
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    function applyTheme() {
      let isDark
      if (preference === 'hell') isDark = false
      else if (preference === 'dunkel') isDark = true
      else isDark = mediaQuery.matches
      document.body.classList.toggle('dark-mode', isDark)
    }

    applyTheme()
    mediaQuery.addEventListener('change', applyTheme)
    return () => mediaQuery.removeEventListener('change', applyTheme)
  }, [profile])

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

  if (passwordJustChanged) {
    return <PasswordChangedCountdown />
  }

  if (session === undefined || checkingProfile) {
    return <div className="loading-dot">Einen Moment...</div>
  }

  if (!session) {
    return <Auth confirmedMessage={justConfirmedMsg} />
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
        onPasswordChanged={() => setPasswordJustChanged(true)}
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
