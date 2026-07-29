import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import { ADMIN_EMAIL } from './lib/adminConfig'
import Auth from './pages/Auth.jsx'
import Onboarding from './pages/Onboarding.jsx'
import PrivateProfileForm from './pages/PrivateProfileForm.jsx'
import BusinessProfileForm from './pages/BusinessProfileForm.jsx'
import AdminPanel from './pages/AdminPanel.jsx'
import HomeScreen from './pages/HomeScreen.jsx'
import BusinessHomeScreen from './pages/BusinessHomeScreen.jsx'
import { LanguageProvider } from './lib/LanguageContext.jsx'
import PasswordChangedCountdown from './pages/PasswordChangedCountdown.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import AccountBlocked from './pages/AccountBlocked.jsx'
import MasterDashboard from './pages/MasterDashboard.jsx'
import { isInactivityExpired, markActivity } from './lib/inactivity.js'

export default function App() {
  const [justConfirmedMsg, setJustConfirmedMsg] = useState('')
  const [session, setSession] = useState(undefined)
  const [profileType, setProfileType] = useState(null)
  const [profile, setProfile] = useState(null)
  const [privateProfile, setPrivateProfile] = useState(null)
  const [businessProfile, setBusinessProfile] = useState(null)
  const [checkingProfile, setCheckingProfile] = useState(false)
  const [chosenType, setChosenType] = useState(null)
  const [view, setView] = useState('dashboard')
  const [adminMode, setAdminMode] = useState(() => {
    if (isInactivityExpired()) return null
    return sessionStorage.getItem('pb_adminMode') || null
  })
  const [passwordJustChanged, setPasswordJustChanged] = useState(false)
  const [passwordRecovery, setPasswordRecovery] = useState(false)

  useEffect(() => {
    markActivity()
    window.addEventListener('click', markActivity)
    window.addEventListener('keydown', markActivity)
    window.addEventListener('touchstart', markActivity)
    return () => {
      window.removeEventListener('click', markActivity)
      window.removeEventListener('keydown', markActivity)
      window.removeEventListener('touchstart', markActivity)
    }
  }, [])

  useEffect(() => {
    let isInitialCheck = true
    // Beim Neuladen feuert Supabase kurz nacheinander sowohl INITIAL_SESSION als auch SIGNED_IN.
    // Erst nach diesem kurzen "Anlauf-Fenster" gilt ein SIGNED_IN als echter, neuer Login.
    const settleTimer = setTimeout(() => { isInitialCheck = false }, 800)

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

      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true)
      }

      // Nur bei einem echten, neuen Login zurücksetzen – nicht wenn beim Neuladen der Seite
      // lediglich eine bestehende Sitzung wiederhergestellt wird (das feuert Supabase auch als "SIGNED_IN").
      if (event === 'SIGNED_IN' && !isInitialCheck) {
        sessionStorage.removeItem('pb_activeTab')
        sessionStorage.removeItem('pb_openApp')
        sessionStorage.removeItem('pb_adminMode')
      }
      setSession(newSession)
      setChosenType(null)
    })

    return () => {
      clearTimeout(settleTimer)
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!session) {
      setProfile(null)
      setProfileType(null)
      setPrivateProfile(null)
      setBusinessProfile(null)
      setPasswordJustChanged(false)
      setPasswordRecovery(false)
      return
    }
    loadProfile(session.user.id)
  }, [session])

  useEffect(() => {
    if (!profileType && !privateProfile && !businessProfile) return
    const ping = () => { supabase.rpc('touch_last_seen').then(() => {}) }
    ping()
    const interval = setInterval(ping, 60000)
    return () => clearInterval(interval)
  }, [profileType, privateProfile, businessProfile])

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

    const admin = session?.user?.email === ADMIN_EMAIL

    const { data: privateData } = await supabase
      .from('private_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (admin) {
      const { data: businessData } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      setPrivateProfile(privateData || null)
      setBusinessProfile(businessData || null)
      setProfile(privateData || businessData || null)
      setProfileType(privateData ? 'private' : businessData ? 'business' : null)
      setCheckingProfile(false)
      return
    }

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

  function backToAdminDashboard() {
    sessionStorage.removeItem('pb_adminMode')
    setAdminMode(null)
  }

  function chooseAdminMode(mode) {
    sessionStorage.setItem('pb_adminMode', mode)
    setAdminMode(mode)
  }

  if (session === undefined) {
    return <div className="loading-dot">Einen Moment...</div>
  }

  if (!session) {
    return <Auth confirmedMessage={justConfirmedMsg} />
  }

  if (passwordRecovery) {
    return <ResetPassword onDone={() => setPasswordRecovery(false)} />
  }

  if (passwordJustChanged) {
    return <PasswordChangedCountdown />
  }

  if (checkingProfile) {
    return <div className="loading-dot">Einen Moment...</div>
  }

  const isAdmin = session.user.email === ADMIN_EMAIL

  if (isAdmin) {
    if (!adminMode) {
      return (
        <MasterDashboard
          hasPrivateProfile={!!privateProfile}
          hasBusinessProfile={!!businessProfile}
          onChooseMode={chooseAdminMode}
        />
      )
    }

    if (adminMode === 'admin') {
      return <AdminPanel onBack={backToAdminDashboard} />
    }

    if (adminMode === 'private' && privateProfile) {
      return (
        <LanguageProvider initialLanguage={privateProfile.language_preference || 'de'}>
          <HomeScreen
            profile={privateProfile}
            userId={session.user.id}
            isAdmin={isAdmin}
            isMasterAdmin
            onBackToDashboard={backToAdminDashboard}
            onProfileUpdated={() => loadProfile(session.user.id)}
            onPasswordChanged={() => setPasswordJustChanged(true)}
          />
        </LanguageProvider>
      )
    }

    if (adminMode === 'business' && businessProfile) {
      return (
        <BusinessHomeScreen
          profile={businessProfile}
          isAdmin={isAdmin}
          isMasterAdmin
          onBackToDashboard={backToAdminDashboard}
          onOpenAdmin={() => setAdminMode('admin')}
          onProfileUpdated={() => loadProfile(session.user.id)}
        />
      )
    }

    backToAdminDashboard()
    return <div className="loading-dot">Einen Moment...</div>
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

  if (profile?.account_status === 'gesperrt' || profile?.account_status === 'archiviert') {
    return <AccountBlocked status={profile.account_status} />
  }

  if (view === 'admin') {
    return <AdminPanel onBack={() => setView('dashboard')} />
  }

  if (profileType === 'private') {
    return (
      <LanguageProvider initialLanguage={profile.language_preference || 'de'}>
        <HomeScreen
          profile={profile}
          userId={session.user.id}
          isAdmin={isAdmin}
          onProfileUpdated={() => loadProfile(session.user.id)}
          onPasswordChanged={() => setPasswordJustChanged(true)}
        />
      </LanguageProvider>
    )
  }

  return (
    <BusinessHomeScreen
      profile={profile}
      isAdmin={isAdmin}
      onOpenAdmin={() => setView('admin')}
      onProfileUpdated={() => loadProfile(session.user.id)}
    />
  )
}
