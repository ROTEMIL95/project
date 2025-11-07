# Render Backend Deployment Fix - CORS Error

## Problem

The production backend at `https://project-b88e.onrender.com` is blocking requests from the frontend:

```
Access to fetch at 'https://project-b88e.onrender.com/api/auth/me' from origin 'https://calculatesmartil.netlify.app'
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
```

**Root Cause**: The backend's CORS configuration is **missing the production frontend URL** in its allowed origins.

- ❌ **Current**: Only allows `http://localhost:5173` and `http://localhost:3000`
- ✅ **Need**: Must include `https://calculatesmartil.netlify.app`

## Solution: Update Render Environment Variables

### Step 1: Access Render Dashboard

1. Go to: **https://dashboard.render.com**
2. Log in with your account
3. Click on your backend service: **project** (or your service name)

### Step 2: Navigate to Environment Variables

1. In the service dashboard, click **Environment** in the left sidebar
2. Scroll down to the **Environment Variables** section
3. You should see existing variables (if any)

### Step 3: Update/Add Environment Variables

Add or update the following critical environment variables:

#### Variable 1: CORS_ORIGINS (CRITICAL!)
- **Key**: `CORS_ORIGINS`
- **Value**: `http://localhost:5173,http://localhost:3000,https://calculatesmartil.netlify.app,https://project-b88e.onrender.com`
- **Note**: NO spaces, NO quotes, NO brackets - just comma-separated URLs

#### Variable 2: SUPABASE_URL
- **Key**: `SUPABASE_URL`
- **Value**: `https://tmyrplrwblqnusgctebp.supabase.co`

#### Variable 3: SUPABASE_KEY
- **Key**: `SUPABASE_KEY`
- **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRteXJwbHJ3YmxxbnVzZ2N0ZWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0ODgwMjksImV4cCI6MjA3ODA2NDAyOX0.SsAU8aknefdnkSsdg9k2IqgwiqEmacHYCw5RmetRiZk`

#### Variable 4: SUPABASE_SERVICE_KEY
- **Key**: `SUPABASE_SERVICE_KEY`
- **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRteXJwbHJ3YmxxbnVzZ2N0ZWJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ4ODAyOSwiZXhwIjoyMDc4MDY0MDI5fQ.xV66hQSL_JHpIIVgH1Abha7JVArtsDNpN8B7UAOaXRI`
- **⚠️ KEEP SECRET**: This is your admin key with full database access

#### Variable 5: JWT_SECRET
- **Key**: `JWT_SECRET`
- **Value**: `rWZuTceY5P6Z632WYCKhyjOQbRt9wT5EspcgEwYoDJN9RKCn5rlGPKcjBUvxriivtm1k5lI2pTqGPOFjcyEZew`
- **⚠️ KEEP SECRET**: Used for token signing

#### Variable 6: JWT_ALGORITHM
- **Key**: `JWT_ALGORITHM`
- **Value**: `HS256`

#### Variable 7: JWT_EXPIRATION
- **Key**: `JWT_EXPIRATION`
- **Value**: `3600`

#### Variable 8: JWT_REFRESH_EXPIRATION
- **Key**: `JWT_REFRESH_EXPIRATION`
- **Value**: `604800`

#### Variable 9: ALLOWED_EXTENSIONS
- **Key**: `ALLOWED_EXTENSIONS`
- **Value**: `.pdf,.jpg,.jpeg,.png,.docx,.xlsx`

#### Variable 10: MAX_FILE_SIZE
- **Key**: `MAX_FILE_SIZE`
- **Value**: `10485760`

#### Variable 11: DEBUG
- **Key**: `DEBUG`
- **Value**: `False` (for production)

### Step 4: Save and Deploy

1. Click **Save Changes** after adding all variables
2. Render will **automatically redeploy** your service when environment variables change
3. Wait for the deployment to complete (usually 3-10 minutes)
4. Check the **Logs** tab to verify the service started successfully

### Step 5: Verify CORS Configuration

After deployment completes, check the logs for CORS configuration:

```
INFO - CORS Configuration:
INFO -   Allowed Origins: ['http://localhost:5173', 'http://localhost:3000', 'https://calculatesmartil.netlify.app', 'https://project-b88e.onrender.com']
INFO -   Number of origins: 4
```

You should see all 4 origins listed.

### Step 6: Test Production

1. Visit: `https://calculatesmartil.netlify.app`
2. Open browser DevTools (F12) → Console tab
3. Try logging in or navigating to dashboard
4. Verify you see **NO CORS errors**
5. Check that API calls to `project-b88e.onrender.com` succeed

## Common Mistakes to Avoid

❌ **WRONG**: `CORS_ORIGINS='["http://localhost:5173","http://localhost:3000"]'`
✅ **CORRECT**: `CORS_ORIGINS=http://localhost:5173,http://localhost:3000,https://calculatesmartil.netlify.app,https://project-b88e.onrender.com`

❌ **WRONG**: Adding spaces between URLs: `http://localhost:5173, http://localhost:3000`
✅ **CORRECT**: No spaces: `http://localhost:5173,http://localhost:3000`

❌ **WRONG**: Using quotes or brackets from JSON
✅ **CORRECT**: Plain comma-separated values

## How CORS Works

1. **Browser sends OPTIONS preflight request**:
   ```
   Origin: https://calculatesmartil.netlify.app
   ```

2. **Backend checks if origin is in CORS_ORIGINS list**:
   ```python
   if origin in settings.cors_origins_list:
       # Allow the request
   else:
       # Block the request (CORS error)
   ```

3. **Backend responds with headers**:
   ```
   Access-Control-Allow-Origin: https://calculatesmartil.netlify.app
   Access-Control-Allow-Credentials: true
   ```

4. **Browser allows the actual request to proceed**

## Troubleshooting

### CORS error persists after redeploy
1. **Clear browser cache**: Hard refresh with `Ctrl+Shift+R`
2. **Check Render logs**: Look for "CORS Configuration" on startup
3. **Verify env var format**: No spaces, quotes, or brackets in CORS_ORIGINS
4. **Test backend directly**:
   ```bash
   curl -I -H "Origin: https://calculatesmartil.netlify.app" https://project-b88e.onrender.com/health
   ```
   Should return: `Access-Control-Allow-Origin: https://calculatesmartil.netlify.app`

### Backend not redeploying
1. Go to **Manual Deploy** tab
2. Click **Deploy latest commit**
3. Wait for deployment to complete

### Service failed to start
1. Check **Logs** tab for error messages
2. Common issues:
   - Missing required environment variables
   - Invalid Python syntax
   - Database connection errors
3. Verify all required env vars are set

### Still getting 401 Unauthorized after CORS fix
This is a separate issue from CORS. Check:
1. Frontend is sending valid Supabase access token
2. Backend SUPABASE_URL and SUPABASE_KEY match Supabase project
3. Token hasn't expired

## Alternative: Using Render CLI

If you prefer command-line approach:

```bash
# Install Render CLI (if not already installed)
npm install -g @render-io/cli

# Login
render login

# Set environment variables (replace YOUR_SERVICE_ID with actual ID)
render env set CORS_ORIGINS "http://localhost:5173,http://localhost:3000,https://calculatesmartil.netlify.app,https://project-b88e.onrender.com" --service YOUR_SERVICE_ID

# Check current environment variables
render env list --service YOUR_SERVICE_ID

# Trigger redeploy
render deploy --service YOUR_SERVICE_ID
```

## Security Notes

⚠️ **SUPABASE_SERVICE_KEY**:
- This key has **FULL admin access** to your Supabase database
- Never expose it in frontend code
- Only use it on the backend
- Rotate it if compromised

⚠️ **JWT_SECRET**:
- Used to sign authentication tokens
- Keep it secret and secure
- Change it if you suspect it's been exposed (will invalidate all existing tokens)

⚠️ **CORS_ORIGINS**:
- Only add trusted frontend URLs
- Never use `*` (allow all) in production
- Each URL must match EXACTLY (including protocol: http vs https)

## Production Checklist

Before going live, ensure:

- [ ] CORS_ORIGINS includes production frontend URL
- [ ] DEBUG=False (not True)
- [ ] All secrets (JWT_SECRET, SUPABASE_SERVICE_KEY) are unique and secure
- [ ] Database RLS policies are properly configured
- [ ] Backend health check endpoint works: `https://project-b88e.onrender.com/health`
- [ ] Frontend can successfully call `/api/auth/me` endpoint
- [ ] HTTPS is enforced (no HTTP in production URLs)

## Related Files

- `Backend/.env.example` - Template with all required environment variables
- `Backend/app/config.py` - Where CORS settings are defined and parsed
- `Backend/app/main.py` - Where CORSMiddleware is configured
- `Frontend/.env.example` - Frontend environment variable template

## Need Help?

If issues persist after following these steps:

1. Check Render service logs for detailed error messages
2. Test backend endpoints with curl/Postman to isolate CORS vs other issues
3. Verify Supabase project is accessible and RLS policies are correct
4. Review FastAPI CORS middleware documentation: https://fastapi.tiangolo.com/tutorial/cors/
