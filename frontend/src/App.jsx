import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import './App.css'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Dashboard from './components/Dashboard'
import LoginPage from './components/LoginPage'

function App() {
  const [session, setSession] = useState(undefined) // undefined = loading

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    })

    if (error) {
      console.error('Google login error:', error.message)
    }
  }

  // Resolve initial session, then subscribe to future auth changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Save / upsert profile whenever a session is established
  useEffect(() => {
    if (!session?.user) return

    const user = session.user
    supabase.from('profiles').upsert({
      id: user.id,
      full_name: user.user_metadata?.full_name || user.user_metadata?.name,
      avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
      email: user.email
    }).then(({ error }) => {
      if (error) {
        console.error('Profile save error:', error)
      } else {
        console.log('Profile saved successfully!')
      }
    })
  }, [session])

  // While resolving the initial session, render nothing to avoid a flash
  if (session === undefined) return null

  // Not logged in → show login screen
  if (!session) {
    return <LoginPage onGoogleLogin={handleGoogleLogin} />
  }

  // Authenticated → show existing dashboard unchanged
  return (
    <>
      <Sidebar />
      <div className="ml-64 flex-1 flex flex-col min-w-0">

        <Header user={session.user} />
        <Dashboard user={session.user} />

        {/* Footer */}
        <footer className="px-8 py-6 border-t border-slate-100 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-4" data-purpose="dashboard-footer">
          <p>© 2025 BuddyJudge Inc. All rights reserved. Crafted for modern learners &amp; creators.</p>
          <div className="flex items-center gap-6">
            <a className="hover:text-slate-600 transition-colors" href="#">Privacy Policy</a>
            <a className="hover:text-slate-600 transition-colors" href="#">Terms of Service</a>
            <a className="hover:text-slate-600 transition-colors" href="#">System Status</a>
          </div>
        </footer>
      </div>
    </>
  )
}

export default App
