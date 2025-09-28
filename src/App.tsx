import { useState, useEffect } from 'react'
import './App.css'
import { supabase } from './lib/supabase'

interface User {
  id: string
  email: string
  name: string
  picture: string
}

function App() {
  const [count, setCount] = useState(0)
  const [functionResponse, setFunctionResponse] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(false)

  // Check for existing session on component mount
  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.full_name || '',
          picture: session.user.user_metadata?.avatar_url || ''
        })
      }
    }
    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.full_name || '',
          picture: session.user.user_metadata?.avatar_url || ''
        })
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleGoogleAuth = async () => {
    setAuthLoading(true)
    try {
      // Get the current URL for redirect
      const redirectUri = `${window.location.origin}/auth/callback`
      
      // Create Google OAuth URL
      const googleClientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || 'your_google_client_id_here'
      const scope = 'openid email profile'
      const responseType = 'code'
      const state = Math.random().toString(36).substring(7) // Random state for security
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${googleClientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scope)}&` +
        `response_type=${responseType}&` +
        `state=${state}`
      
      // Store state in localStorage for verification
      localStorage.setItem('oauth_state', state)
      
      // Redirect to Google OAuth
      window.location.href = authUrl
    } catch (error) {
      console.error('Auth error:', error)
      setFunctionResponse(`Auth Error: ${error}`)
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  const callSupabaseFunction = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('hello-world', {
        body: { name: user?.name || 'YouTube Hackathon User' }
      })

      if (error) {
        setFunctionResponse(`Error: ${error.message}`)
      } else {
        setFunctionResponse(`Response: ${JSON.stringify(data, null, 2)}`)
      }
    } catch (err) {
      setFunctionResponse(`Error: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <h1>YouTube Hackathon</h1>
      
      {/* Authentication Section */}
      <div className="card">
        <h2>Authentication</h2>
        {user ? (
          <div style={{ textAlign: 'center' }}>
            <img 
              src={user.picture} 
              alt={user.name}
              style={{ 
                width: '64px', 
                height: '64px', 
                borderRadius: '50%',
                marginBottom: '1rem'
              }}
            />
            <p>Welcome, <strong>{user.name}</strong>!</p>
            <p>Email: {user.email}</p>
            <button 
              onClick={handleLogout}
              style={{ 
                marginTop: '1rem',
                padding: '0.5rem 1rem',
                backgroundColor: '#ff4444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Logout
            </button>
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <p>Sign in with Google to get started</p>
            <button 
              onClick={handleGoogleAuth}
              disabled={authLoading}
              style={{ 
                padding: '0.75rem 1.5rem',
                backgroundColor: '#4285f4',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: authLoading ? 'not-allowed' : 'pointer',
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                margin: '0 auto'
              }}
            >
              {authLoading ? 'Loading...' : '🔐 Sign in with Google'}
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      
      <div className="card">
        <h2>Supabase Function Test</h2>
        <button 
          onClick={callSupabaseFunction} 
          disabled={loading}
          style={{ marginBottom: '1rem' }}
        >
          {loading ? 'Calling Function...' : 'Call Hello World Function'}
        </button>
        {functionResponse && (
          <pre style={{ 
            background: '#f4f4f4', 
            padding: '1rem', 
            borderRadius: '4px',
            textAlign: 'left',
            fontSize: '0.9rem',
            overflow: 'auto'
          }}>
            {functionResponse}
          </pre>
        )}
      </div>

      <p className="read-the-docs">
        Welcome to your YouTube Hackathon project!
      </p>
    </>
  )
}

export default App
