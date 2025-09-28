# Testing Google OAuth Setup

## Quick Test Steps

1. **Start Supabase**:
   ```bash
   supabase start
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```

3. **Open your browser** to `http://localhost:3000`

4. **Test the OAuth flow**:
   - Click "Sign in with Google" button
   - You should be redirected to Google's OAuth page
   - After authentication, you should be redirected back to your app
   - You should see your Google profile information displayed

## Expected Behavior

- ✅ Google OAuth button appears when not authenticated
- ✅ Clicking button redirects to Google OAuth
- ✅ After successful auth, user info is displayed
- ✅ Logout button works and clears the session
- ✅ Supabase function calls work with authenticated user

## Troubleshooting

If you encounter issues:

1. **Check environment variables** - Make sure all Google OAuth credentials are set
2. **Verify redirect URIs** - Ensure Google Console has the correct callback URL
3. **Check Supabase logs** - Run `supabase logs` to see Edge Function logs
4. **Browser console** - Check for any JavaScript errors

## Next Steps

Once OAuth is working, you can:
- Add user-specific data storage
- Implement role-based access control
- Add more OAuth providers
- Customize the user interface
