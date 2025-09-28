// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

interface GoogleOAuthRequest {
  code: string;
  redirect_uri: string;
}

interface GoogleTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  id_token?: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
      },
    })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405,
          headers: { 
            "Content-Type": "application/json",
            'Access-Control-Allow-Origin': '*',
          } 
        }
      )
    }

    const { code, redirect_uri }: GoogleOAuthRequest = await req.json()

    if (!code || !redirect_uri) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: code and redirect_uri' }),
        { 
          status: 400,
          headers: { 
            "Content-Type": "application/json",
            'Access-Control-Allow-Origin': '*',
          } 
        }
      )
    }

    // Get environment variables
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
    const clientSecret = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET')
    const authUri = Deno.env.get('GOOGLE_AUTH_URI') || 'https://accounts.google.com/o/oauth2/auth'
    const tokenUri = Deno.env.get('GOOGLE_TOKEN_URI') || 'https://oauth2.googleapis.com/token'

    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: 'Google OAuth credentials not configured' }),
        { 
          status: 500,
          headers: { 
            "Content-Type": "application/json",
            'Access-Control-Allow-Origin': '*',
          } 
        }
      )
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch(tokenUri, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirect_uri,
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Token exchange failed:', errorText)
      return new Response(
        JSON.stringify({ error: 'Failed to exchange authorization code for token' }),
        { 
          status: 400,
          headers: { 
            "Content-Type": "application/json",
            'Access-Control-Allow-Origin': '*',
          } 
        }
      )
    }

    const tokenData: GoogleTokenResponse = await tokenResponse.json()

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    })

    if (!userInfoResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user information from Google' }),
        { 
          status: 400,
          headers: { 
            "Content-Type": "application/json",
            'Access-Control-Allow-Origin': '*',
          } 
        }
      )
    }

    const userInfo: GoogleUserInfo = await userInfoResponse.json()

    // Create or update user in Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'http://127.0.0.1:54321'
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Supabase service role key not configured' }),
        { 
          status: 500,
          headers: { 
            "Content-Type": "application/json",
            'Access-Control-Allow-Origin': '*',
          } 
        }
      )
    }

    // Create Supabase client with service role key
    const { createClient } = await import('supabase')
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check if user already exists
    const { data: existingUser, error: userError } = await supabase.auth.admin.getUserById(userInfo.id)

    let user
    if (userError || !existingUser.user) {
      // Create new user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: userInfo.email,
        email_confirm: true,
        user_metadata: {
          full_name: userInfo.name,
          avatar_url: userInfo.picture,
          provider: 'google',
          provider_id: userInfo.id,
        },
        app_metadata: {
          provider: 'google',
          providers: ['google'],
        },
      })

      if (createError) {
        console.error('Error creating user:', createError)
        return new Response(
          JSON.stringify({ error: 'Failed to create user account' }),
          { 
            status: 500,
            headers: { 
              "Content-Type": "application/json",
              'Access-Control-Allow-Origin': '*',
            } 
          }
        )
      }

      user = newUser.user
    } else {
      // Update existing user
      const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
        userInfo.id,
        {
          user_metadata: {
            full_name: userInfo.name,
            avatar_url: userInfo.picture,
            provider: 'google',
            provider_id: userInfo.id,
          },
        }
      )

      if (updateError) {
        console.error('Error updating user:', updateError)
        return new Response(
          JSON.stringify({ error: 'Failed to update user account' }),
          { 
            status: 500,
            headers: { 
              "Content-Type": "application/json",
              'Access-Control-Allow-Origin': '*',
            } 
          }
        )
      }

      user = updatedUser.user
    }

    // Generate a session token for the user
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: userInfo.email,
    })

    if (sessionError) {
      console.error('Error generating session:', sessionError)
      return new Response(
        JSON.stringify({ error: 'Failed to create user session' }),
        { 
          status: 500,
          headers: { 
            "Content-Type": "application/json",
            'Access-Control-Allow-Origin': '*',
          } 
        }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: userInfo.name,
          picture: userInfo.picture,
        },
        session: sessionData,
        access_token: tokenData.access_token,
      }),
      { 
        headers: { 
          "Content-Type": "application/json",
          'Access-Control-Allow-Origin': '*',
        } 
      }
    )

  } catch (error) {
    console.error('OAuth error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          'Access-Control-Allow-Origin': '*',
        } 
      }
    )
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/google-oauth' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"code":"authorization_code_from_google","redirect_uri":"http://localhost:3000/auth/callback"}'

*/
