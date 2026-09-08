import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabase'
import './App.css'

import LoginPage from './components/LoginPage'
import MainLayout from './layouts/MainLayout'

// Pages
import Home from './pages/Home'
import ProjectValidation from './pages/ProjectValidation'
import PPTAnalyzer from './pages/PPTAnalyzer'
import LabHub from './pages/LabHub'
import AIAssistant from './pages/AIAssistant'
import EventsExams from './pages/EventsExams'
import Settings from './pages/Settings'
import Profile from './pages/Profile'

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

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Logout error:', error.message)
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

  return (
    <BrowserRouter>
      <Routes>
        {/* Public / Login Route */}
        <Route 
          path="/login" 
          element={!session ? <LoginPage onGoogleLogin={handleGoogleLogin} /> : <Navigate to="/" replace />} 
        />

        {/* Protected Routes inside MainLayout */}
        {session ? (
          <Route element={<MainLayout user={session.user} onLogout={handleLogout} />}>
            <Route path="/" element={<Home user={session.user} />} />
            <Route path="/project-validation" element={<ProjectValidation />} />
            <Route path="/ppt-analyzer" element={<PPTAnalyzer />} />
            <Route path="/lab-hub" element={<LabHub />} />
            <Route path="/ai-assistant" element={<AIAssistant />} />
            <Route path="/events-exams" element={<EventsExams />} />
            <Route path="/settings" element={<Settings user={session.user} onLogout={handleLogout} />} />
            <Route path="/profile" element={<Profile user={session.user} />} />
          </Route>
        ) : (
          <Route path="*" element={<Navigate to="/login" replace />} />
        )}
      </Routes>
    </BrowserRouter>
  )
}

export default App
