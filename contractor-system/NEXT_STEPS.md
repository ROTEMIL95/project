# Next Steps - Database Rebuild & Testing

## 📋 What We've Done

✅ **Fixed Authentication System**
- Implemented Pure Supabase Auth (frontend → Supabase → backend)
- Removed conflicting custom JWT logic
- Added comprehensive error logging
- Improved error messages throughout

✅ **Created Database Schema**
- Generated complete SQL schema from your Pydantic models
- Includes all 13 tables with proper relationships
- Implements Row Level Security (RLS) for data isolation
- Auto-generates quote numbers
- Includes sample data for categories

✅ **Created Documentation**
- Environment variable templates (.env.example)
- Complete database setup guide (DATABASE_SETUP.md)
- Authentication fix summary (AUTH_FIX_SUMMARY.md)
- Architecture diagrams and troubleshooting guides

## 🎯 Your Action Items

### Phase 1: Database Rebuild (20-30 minutes)

1. **Backup Current Data (if needed)**
   ```bash
   # If you have any data you want to keep, export it first
   # Go to Supabase Dashboard → Database → Backups
   ```

2. **Delete Old Tables**
   - Open Supabase SQL Editor
   - Run the DROP TABLE commands from DATABASE_SETUP.md
   - Or use the Supabase UI to delete tables manually

3. **Create New Schema**
   - Open `database_schema.sql`
   - Copy ALL contents
   - Paste into Supabase SQL Editor
   - Run it
   - Wait for completion (30-60 seconds)

4. **Verify Tables Created**
   ```sql
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_type = 'BASE TABLE'
   ORDER BY table_name;
   ```
   You should see 13 tables.

5. **Verify Sample Data**
   ```sql
   SELECT * FROM categories ORDER BY "order";
   ```
   You should see 5 categories in Hebrew.

### Phase 2: Environment Setup (10 minutes)

1. **Get Supabase Credentials**
   - Go to Settings → API in Supabase Dashboard
   - Copy:
     - Project URL
     - anon public key
     - service_role key (keep secret!)

2. **Update Backend .env**
   ```bash
   cd contractor-system/Backend
   # Copy the example file
   cp .env.example .env
   # Edit .env and paste your Supabase credentials
   ```

3. **Update Frontend .env**
   ```bash
   cd contractor-system/Frontend
   # Copy the example file
   cp .env.example .env
   # Edit .env and paste your Supabase credentials
   # Make sure they MATCH the backend!
   ```

4. **Critical Check**
   - ✅ VITE_SUPABASE_URL = SUPABASE_URL
   - ✅ VITE_SUPABASE_ANON_KEY = SUPABASE_KEY
   - ✅ CORS_ORIGINS includes http://localhost:5173

### Phase 3: Testing (30-45 minutes)

#### Test 1: Backend Startup
```bash
cd contractor-system/Backend
# Activate virtual environment if needed
# Windows: venv\Scripts\activate
# Mac/Linux: source venv/bin/activate
python -m uvicorn app.main:app --reload
```

**Expected:**
- Server starts on http://localhost:8000
- No error messages
- Logs show CORS configuration
- Visit http://localhost:8000/docs - should see API docs

**If errors:**
- Check .env file exists and has correct values
- Check all dependencies installed: `pip install -r requirements.txt`
- Look for specific error messages in logs

#### Test 2: Frontend Startup
```bash
cd contractor-system/Frontend
npm run dev
```

**Expected:**
- Server starts on http://localhost:5173
- No error messages
- Visit http://localhost:5173 - should see login page

**If errors:**
- Check .env file exists
- Run `npm install` to ensure dependencies are installed
- Check for specific error messages

#### Test 3: User Registration
1. Go to http://localhost:5173/register
2. Fill out form:
   - Email: test@example.com
   - Password: Test1234! (at least 8 chars)
   - Full Name: Test User
   - Phone: 555-1234
3. Click Register

**Expected:**
- Success message appears
- Redirected to dashboard
- User appears in Supabase Auth → Users

**Backend logs should show:**
```
INFO - Creating new user in Supabase Auth: test@example.com
INFO - User created successfully in Auth: <uuid>
INFO - User profile created for: <uuid>
```

**If it fails:**
- Check browser console for errors
- Check backend logs for errors
- Verify Supabase credentials match
- Check network tab - is request reaching backend?

#### Test 4: User Login
1. Go to http://localhost:5173/login
2. Enter the credentials you just created
3. Click Login

**Expected:**
- Success message
- Redirected to dashboard
- Can see user's name in header

**Backend logs should show:**
```
INFO - Attempting login for user: test@example.com
INFO - User authenticated successfully: <uuid>
```

**If it fails:**
- Try logging in through Supabase Dashboard directly
- Check if user exists in both auth.users AND user_profiles
- Check backend logs for specific error

#### Test 5: Create a Client
1. While logged in, go to Clients page
2. Click "Add Client"
3. Fill in client details
4. Save

**Expected:**
- Client appears in list
- No errors in console

**Backend logs should show:**
```
DEBUG - Attempting to verify token for request to /api/clients
DEBUG - Successfully verified token for user <uuid>
```

**If it fails:**
- Check browser console - is token being sent?
- Check network tab - what's the response status?
- Check backend logs - is token validation failing?

#### Test 6: Create a Quote
1. Go to Quotes page
2. Click "Create Quote"
3. Fill in quote details
4. Add items
5. Save

**Expected:**
- Quote appears in list with auto-generated number (Q-2025-0001)
- Items stored correctly

**If it fails:**
- Check database: `SELECT * FROM quotes ORDER BY created_at DESC LIMIT 1;`
- Check if quote_number trigger is working
- Check backend logs

### Phase 4: Verify Data Isolation (RLS Testing)

This is critical - make sure users can't see each other's data!

1. **Create Second User**
   - Register another test account
   - Create some clients/quotes

2. **Test Isolation**
   - Log in as User 1
   - Try to see User 1's data → Should work
   - Log in as User 2
   - Try to see User 2's data → Should work
   - User 2 should NOT see User 1's data

3. **Check in Database**
   ```sql
   -- See all quotes (as admin)
   SELECT id, user_id, project_name, status FROM quotes;

   -- Verify they belong to different users
   ```

**If RLS fails:**
- Check RLS policies are enabled: `SELECT * FROM pg_tables WHERE schemaname = 'public';`
- Re-run RLS policy section from database_schema.sql
- Check Supabase logs for policy violations

## 🚨 Common Issues & Solutions

### Issue: "Cannot connect to backend"
**Symptoms:** All API calls fail, CORS errors

**Checklist:**
- [ ] Is backend running? Check http://localhost:8000/health
- [ ] Is CORS_ORIGINS correct in backend .env?
- [ ] Check backend logs for startup errors
- [ ] Try restarting backend

### Issue: "Token verification failed"
**Symptoms:** Login works but API calls return 401

**Checklist:**
- [ ] Do frontend and backend .env have SAME Supabase URL?
- [ ] Do frontend and backend .env have SAME Supabase keys?
- [ ] Is user in both auth.users AND user_profiles?
- [ ] Try logging out and back in
- [ ] Check browser console for token details

### Issue: "User profile not found"
**Symptoms:** Login succeeds, then immediate error

**Solution:**
```sql
-- Check if profile exists
SELECT * FROM user_profiles WHERE auth_user_id = 'user-id-from-auth';

-- If not, create it
INSERT INTO user_profiles (auth_user_id, email, full_name, role)
VALUES ('user-id-from-auth', 'user@email.com', 'User Name', 'user');
```

### Issue: "relation does not exist"
**Symptoms:** Backend errors mentioning missing tables

**Solution:**
- Re-run database_schema.sql
- Verify tables exist: `\dt` in psql or check Supabase Table Editor
- Check for typos in table names

### Issue: "RLS policy violation"
**Symptoms:** "new row violates row-level security policy"

**Solution:**
- Check user is authenticated
- Check user_id matches auth.uid()
- Re-run RLS policy creation from schema
- Temporarily disable RLS for testing (not recommended for production!)

## 📊 Success Metrics

You'll know everything is working when:

- ✅ Backend starts without errors
- ✅ Frontend starts without errors
- ✅ Users can register
- ✅ Users can login
- ✅ Users can create clients
- ✅ Users can create quotes with items
- ✅ Users can only see their own data
- ✅ Quote numbers auto-generate correctly
- ✅ Timestamps update automatically
- ✅ No errors in browser console
- ✅ No errors in backend logs
- ✅ No errors in Supabase logs

## 🔄 If You Need to Start Over

If something goes wrong and you want to start fresh:

```bash
# 1. Stop backend and frontend
# Ctrl+C in both terminals

# 2. Delete .env files (you'll recreate them)
rm contractor-system/Backend/.env
rm contractor-system/Frontend/.env

# 3. Drop all tables in Supabase
# Run the DROP TABLE commands from DATABASE_SETUP.md

# 4. Start from Phase 1 again
```

## 📞 Getting Help

If you're stuck:

1. **Check the logs** - They're designed to be helpful now!
   - Browser console (F12)
   - Backend terminal
   - Supabase Dashboard → Logs

2. **Check documentation**
   - [DATABASE_SETUP.md](./DATABASE_SETUP.md) - Database issues
   - [AUTH_FIX_SUMMARY.md](./AUTH_FIX_SUMMARY.md) - Auth issues

3. **Common debugging commands**
   ```sql
   -- Check if user exists
   SELECT * FROM auth.users WHERE email = 'user@example.com';

   -- Check user profile
   SELECT * FROM user_profiles WHERE email = 'user@example.com';

   -- Check RLS policies
   SELECT * FROM pg_policies WHERE tablename = 'quotes';

   -- Check recent quotes
   SELECT id, user_id, quote_number, project_name, created_at
   FROM quotes
   ORDER BY created_at DESC
   LIMIT 5;
   ```

4. **Test endpoints directly**
   ```bash
   # Test health endpoint
   curl http://localhost:8000/health

   # Test with authentication (replace TOKEN)
   curl http://localhost:8000/api/quotes \
     -H "Authorization: Bearer YOUR_TOKEN_HERE"
   ```

## 🎯 Final Checklist

Before considering this complete:

### Database
- [ ] All 13 tables created
- [ ] Sample categories exist
- [ ] RLS enabled on user-scoped tables
- [ ] Triggers working (updated_at, quote_number)

### Environment
- [ ] Backend .env configured with Supabase credentials
- [ ] Frontend .env configured with Supabase credentials
- [ ] Credentials match between frontend and backend
- [ ] CORS_ORIGINS includes frontend URL

### Authentication
- [ ] Can register new users
- [ ] Can login with existing users
- [ ] Tokens validated correctly
- [ ] User profiles created automatically or manually

### Functionality
- [ ] Can create clients
- [ ] Can create quotes
- [ ] Can create projects
- [ ] Data isolated per user (RLS working)
- [ ] Auto-generated fields working (IDs, timestamps, quote numbers)

### Monitoring
- [ ] Backend logs show successful auth
- [ ] Frontend shows no console errors
- [ ] Supabase logs show no policy violations
- [ ] Network requests returning 200 (not 401 or 500)

## 🚀 After Everything Works

Once you've verified everything is working:

1. **Create a backup**
   - Supabase Dashboard → Database → Backups
   - Create manual backup

2. **Document your setup**
   - Note any custom configurations
   - Document any additional policies you added
   - Keep a copy of your .env values (securely!)

3. **Plan for production**
   - Set up production Supabase project
   - Update environment variables for production
   - Test thoroughly in production environment

4. **Monitor in production**
   - Set up Supabase monitoring
   - Check logs regularly
   - Monitor auth failures

---

**Good luck! You've got comprehensive docs and a clean architecture. Take it step by step and you'll have everything working soon! 🎉**
