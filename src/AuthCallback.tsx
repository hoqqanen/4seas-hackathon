import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

export default function AuthCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search)
        const code = urlParams.get('code')
        const state = urlParams.get('state')
        const error = urlParams.get('error')

        if (error) {
          setStatus('error')
          setMessage(`OAuth error: ${error}`)
          return
        }

        if (!code) {
          setStatus('error')
          setMessage('No authorization code received')
          return
        }

        // Verify state parameter
        const storedState = localStorage.getItem('oauth_state')
        if (state !== storedState) {
          setStatus('error')
          setMessage('Invalid state parameter')
          return
        }

        // Clean up stored state
        localStorage.removeItem('oauth_state')

        // Call our Google OAuth function
        const redirectUri = `${window.location.origin}/auth/callback`
        const { data, error: functionError } = await supabase.functions.invoke('google-oauth', {
          body: {
            code,
            redirect_uri: redirectUri
          }
        })

        if (functionError) {
          setStatus('error')
          setMessage(`Authentication failed: ${functionError.message}`)
          return
        }

        if (data?.success) {
          setStatus('success')
          setMessage('Authentication successful! Redirecting...')
          
          // Redirect to main app after a short delay
          setTimeout(() => {
            window.location.href = '/'
          }, 2000)
        } else {
          setStatus('error')
          setMessage('Authentication failed')
        }

      } catch (error) {
        console.error('OAuth callback error:', error)
        setStatus('error')
        setMessage(`Error: ${error}`)
      }
    }

    handleOAuthCallback()
  }, [])

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      padding: '2rem',
      textAlign: 'center'
    }}>
      <h1>Authentication</h1>
      
      {status === 'loading' && (
        <div>
          <p>Processing authentication...</p>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '1rem auto'
          }} />
        </div>
      )}

      {status === 'success' && (
        <div style={{ color: 'green' }}>
          <p>✅ {message}</p>
        </div>
      )}

      {status === 'error' && (
        <div style={{ color: 'red' }}>
          <p>❌ {message}</p>
          <button 
            onClick={() => window.location.href = '/'}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Return to App
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
