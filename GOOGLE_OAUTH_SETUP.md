# Google OAuth Setup Instructions

## Overview
This project now includes Google OAuth authentication using Supabase Edge Functions. Users can sign in with their Google accounts and the authentication is handled securely through Supabase.

## Setup Steps

### 1. Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
# Frontend Environment Variables
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here

# Backend Environment Variables (already in your .env file)
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_OAUTH_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
GOOGLE_TOKEN_URI=https://oauth2.googleapis.com/token
AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
```

### 2. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Set the application type to "Web application"
6. Add authorized redirect URIs:
   - `http://localhost:3000/auth/callback` (for local development)
   - `http://127.0.0.1:3000/auth/callback` (alternative local)
   - Add your production domain when deploying

### 3. Supabase Configuration

The Supabase configuration has been updated to:
- Enable Google OAuth provider
- Add the new `google-oauth` Edge Function
- Configure proper CORS and authentication settings

### 4. Running the Application

1. Start Supabase locally:
   ```bash
   supabase start
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser to `http://localhost:3000`

## How It Works

1. **User clicks "Sign in with Google"** → Redirects to Google OAuth
2. **Google redirects back** → `/auth/callback` route handles the response
3. **AuthCallback component** → Calls the `google-oauth` Edge Function
4. **Edge Function** → Exchanges code for token, gets user info, creates/updates Supabase user
5. **User is authenticated** → Redirected back to main app with session

## Files Created/Modified

- `supabase/functions/google-oauth/index.ts` - OAuth Edge Function
- `supabase/functions/google-oauth/deno.json` - Function dependencies
- `supabase/config.toml` - Updated with Google OAuth config
- `src/App.tsx` - Added authentication UI and logic
- `src/AuthCallback.tsx` - OAuth callback handler
- `src/main.tsx` - Added routing for callback

## Testing

1. Make sure all environment variables are set correctly
2. Start Supabase and the dev server
3. Click "Sign in with Google" button
4. Complete the Google OAuth flow
5. You should be redirected back and see your user info

## Troubleshooting

- **"Google OAuth credentials not configured"** → Check your `.env` file has all required variables
- **"Invalid redirect URI"** → Make sure the redirect URI in Google Console matches your callback URL
- **CORS errors** → The Edge Function includes CORS headers, but check your Supabase config
- **Function not found** → Make sure `supabase start` is running and the function is deployed

## Security Notes

- Never commit your `.env` files to version control
- The Edge Function uses the service role key for admin operations
- State parameter is used to prevent CSRF attacks
- All OAuth tokens are handled server-side for security
