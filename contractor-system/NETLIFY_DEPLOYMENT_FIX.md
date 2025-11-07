# Netlify Deployment Fix - Supabase URL Error

## Problem

The production frontend at `https://calculatesmartil.netlify.app` is showing this error:

```
POST https://zrwstnwqbfuljpuedqvn.supabase.co/auth/v1/token?grant_type=refresh_token
net::ERR_NAME_NOT_RESOLVED
```

**Root Cause**: The production build is using an **old/incorrect Supabase URL** that was bundled during the build process.

- ❌ **Wrong URL in Production**: `https://zrwstnwqbfuljpuedqvn.supabase.co` (doesn't exist)
- ✅ **Correct URL**: `https://tmyrplrwblqnusgctebp.supabase.co` (actual Supabase project)

## Solution: Update Netlify Environment Variables

### Step 1: Access Netlify Dashboard

1. Go to: **https://app.netlify.com**
2. Log in with your account
3. Click on your site: **calculatesmartil** (or navigate from Sites list)

### Step 2: Navigate to Environment Variables

1. In the site dashboard, click **Site configuration** (or **Site settings**)
2. In the left sidebar, click **Environment variables**
3. You should see a list of current environment variables (if any)

### Step 3: Update/Add Environment Variables

Add or update the following environment variables:

#### Variable 1: VITE_SUPABASE_URL
- **Key**: `VITE_SUPABASE_URL`
- **Value**: `https://tmyrplrwblqnusgctebp.supabase.co`
- **Scopes**: All (Production, Deploy Previews, Branch deploys)

#### Variable 2: VITE_SUPABASE_ANON_KEY
- **Key**: `VITE_SUPABASE_ANON_KEY`
- **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRteXJwbHJ3YmxxbnVzZ2N0ZWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0ODgwMjksImV4cCI6MjA3ODA2NDAyOX0.SsAU8aknefdnkSsdg9k2IqgwiqEmacHYCw5RmetRiZk`
- **Scopes**: All (Production, Deploy Previews, Branch deploys)

#### Variable 3: VITE_API_URL (Backend API)
- **Key**: `VITE_API_URL`
- **Value**: `https://project-b88e.onrender.com`
- **Scopes**: All (Production, Deploy Previews, Branch deploys)

### Step 4: Save Changes

1. Click **Save** or **Add** for each variable
2. Verify all three variables are correctly listed

### Step 5: Trigger New Deployment

**IMPORTANT**: Environment variables are only applied during the build process. You must rebuild your site:

1. Go to **Deploys** tab (top of the page)
2. Click **Trigger deploy** button (top right)
3. Select **Clear cache and deploy site**
4. Wait for the build to complete (usually 2-5 minutes)

### Step 6: Verify Fix

1. Once deployment is complete, visit: `https://calculatesmartil.netlify.app`
2. Open browser DevTools (F12) → Console tab
3. Try logging in or refreshing the page
4. Verify you see **NO errors** about `zrwstnwqbfuljpuedqvn.supabase.co`
5. Check that authentication works correctly

## How Environment Variables Work in Netlify + Vite

1. **Build Time**: When Netlify runs `npm run build`, Vite reads environment variables starting with `VITE_`
2. **Bundle**: These values are **hardcoded** into the JavaScript bundle (e.g., `index-BqXB4W3C.js`)
3. **Runtime**: The frontend uses these bundled values (cannot be changed without rebuilding)

**This is why changing `.env` locally doesn't fix production** - you must update Netlify's environment variables and redeploy.

## Alternative: Using Netlify CLI (Advanced)

If you prefer command-line approach:

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Link to your site
cd Frontend
netlify link

# Set environment variables
netlify env:set VITE_SUPABASE_URL "https://tmyrplrwblqnusgctebp.supabase.co"
netlify env:set VITE_SUPABASE_ANON_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRteXJwbHJ3YmxxbnVzZ2N0ZWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0ODgwMjksImV4cCI6MjA3ODA2NDAyOX0.SsAU8aknefdnkSsdg9k2IqgwiqEmacHYCw5RmetRiZk"
netlify env:set VITE_API_URL "https://project-b88e.onrender.com"

# Trigger rebuild
netlify deploy --prod
```

## Troubleshooting

### Error persists after redeploy
- **Clear browser cache**: Hard refresh with `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- **Check Netlify build logs**: Deploys → Latest deploy → Deploy log
- **Verify env vars were applied**: Look for `VITE_SUPABASE_URL` in build log

### Build fails
- Check that Frontend builds locally: `cd Frontend && npm run build`
- Review build logs for errors
- Ensure `package.json` scripts are correct

### Still seeing old Supabase URL
- Check if there's a `netlify.toml` file overriding environment variables
- Verify the correct site is selected in Netlify dashboard
- Try "Clear cache and deploy" again

## Important Notes

⚠️ **Security**: The `VITE_SUPABASE_ANON_KEY` is public and safe to expose in frontend code. It only allows public access as configured in your Supabase Row Level Security (RLS) policies.

⚠️ **Backend URL**: Make sure your backend at `https://project-b88e.onrender.com` has CORS configured to allow `https://calculatesmartil.netlify.app`:

```python
# Backend/app/config.py
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,https://calculatesmartil.netlify.app,https://project-b88e.onrender.com
```

## Related Files

- `Frontend/.env.example` - Template with correct environment variable names
- `Frontend/src/lib/supabase.js` - Where Supabase client is initialized
- `Frontend/src/lib/api.js` - Where API_BASE_URL is set

## Support

If you continue to experience issues after following these steps:

1. Check Supabase dashboard to verify the project URL is correct
2. Review Netlify build logs for any warnings
3. Test locally with production environment variables to isolate the issue
