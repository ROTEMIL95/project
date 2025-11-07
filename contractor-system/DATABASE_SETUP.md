# Database Setup Guide

Complete guide for setting up the Contractor Management System database in Supabase.

## 📋 Prerequisites

- Supabase account (sign up at https://supabase.com)
- Access to your Supabase project dashboard
- Basic understanding of SQL and PostgreSQL

## 🗂️ Database Overview

The system uses **Pure Supabase Auth** with PostgreSQL for data storage. The database consists of 13 main tables:

### Core Tables
1. **user_profiles** - Extended user information (linked to Supabase Auth)
2. **clients** - Customer/client records
3. **quotes** - Price quotes with JSONB for flexible item storage
4. **projects** - Active construction projects
5. **project_costs** - Expenses tracked per project

### Catalog & Templates
6. **categories** - Organization categories for items
7. **catalog_items** - Reusable catalog of services/products
8. **price_ranges** - Volume-based pricing for catalog items
9. **quote_templates** - Reusable quote templates
10. **template_items** - Items within quote templates

### Financial & Pricing
11. **financial_transactions** - Income and expense tracking
12. **contractor_pricing** - Contractor-specific pricing data
13. **customer_inquiries** - Lead/inquiry management

## 🚀 Step-by-Step Setup

### Step 1: Access Supabase SQL Editor

1. Log in to your Supabase dashboard at https://app.supabase.com
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar

### Step 2: Delete Existing Tables (Fresh Start)

⚠️ **WARNING**: This will delete ALL existing data!

```sql
-- Drop all existing tables (if you're starting fresh)
DROP TABLE IF EXISTS customer_inquiries CASCADE;
DROP TABLE IF EXISTS contractor_pricing CASCADE;
DROP TABLE IF EXISTS financial_transactions CASCADE;
DROP TABLE IF EXISTS template_items CASCADE;
DROP TABLE IF EXISTS quote_templates CASCADE;
DROP TABLE IF EXISTS project_costs CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS price_ranges CASCADE;
DROP TABLE IF EXISTS catalog_items CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS quotes CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
```

**How to run:**
1. Copy the SQL above
2. Paste into Supabase SQL Editor
3. Click **Run** button
4. Wait for confirmation

### Step 3: Create New Schema

1. Open the file `database_schema.sql` in your project root
2. Copy **ALL** of its contents
3. Paste into Supabase SQL Editor
4. Click **Run** button
5. Wait for all tables to be created (may take 30-60 seconds)

**Expected Output:**
- Success messages for each table creation
- Success messages for index creation
- Success messages for trigger creation
- Success messages for RLS policy creation

### Step 4: Verify Table Creation

Run this query to see all created tables:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

**You should see:**
- categories
- catalog_items
- clients
- contractor_pricing
- customer_inquiries
- financial_transactions
- price_ranges
- project_costs
- projects
- quote_templates
- quotes
- template_items
- user_profiles

### Step 5: Verify RLS Policies

Check that Row Level Security is enabled:

```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

**Expected:** `rowsecurity` should be `t` (true) for most tables.

### Step 6: Test Sample Data

The schema includes sample categories. Verify they were created:

```sql
SELECT * FROM categories ORDER BY "order";
```

**You should see 5 categories:**
- כללי (General)
- חשמל (Electrical)
- אינסטלציה (Plumbing)
- ריצוף (Tiling)
- צבע (Painting)

## 🔐 Authentication Setup

### Supabase Auth Configuration

1. Go to **Authentication** → **Providers** in Supabase dashboard
2. Enable **Email provider**
3. Configure email templates (optional but recommended)
4. Note your **Project URL** and **anon public** key

### Get Your Credentials

1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (e.g., https://xxxxx.supabase.co)
   - **anon public** key (starts with `eyJ...`)
   - **service_role** key (starts with `eyJ...`) - **Keep this SECRET!**

### Update Environment Variables

#### Backend (.env)
Create `contractor-system/Backend/.env`:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-public-key-here
SUPABASE_SERVICE_KEY=your-service-role-key-here

# JWT (optional for pure Supabase auth)
JWT_SECRET=your-generated-secret-here
JWT_ALGORITHM=HS256
JWT_EXPIRATION=3600
JWT_REFRESH_EXPIRATION=604800

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,https://your-frontend.netlify.app

# Other settings
APP_NAME=Contractor Management System
DEBUG=False
```

#### Frontend (.env)
Create `contractor-system/Frontend/.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
VITE_API_URL=http://localhost:8000
```

**⚠️ IMPORTANT:**
- Frontend and Backend MUST use the SAME `SUPABASE_URL` and keys
- Never commit `.env` files to git
- Use `.env.example` files as templates

## 🧪 Testing the Setup

### 1. Test User Registration

Register a test user through your frontend or use Supabase Auth directly:

1. Go to **Authentication** → **Users** in Supabase
2. Click **Add user** → **Create new user**
3. Enter email and password
4. User should appear in **auth.users** table automatically

### 2. Test User Profile Creation

After creating a user in Auth, create their profile:

```sql
-- Replace with your actual user ID from auth.users
INSERT INTO user_profiles (auth_user_id, email, full_name, phone, role)
VALUES (
    'your-auth-user-id-here',
    'test@example.com',
    'Test User',
    '555-1234',
    'user'
);
```

### 3. Test Data Access (RLS)

Try inserting test data as an authenticated user:

```sql
-- This should work if you're authenticated
INSERT INTO clients (user_id, name, email, phone)
VALUES (auth.uid(), 'Test Client', 'client@test.com', '555-5678');
```

### 4. Test Backend Connection

Start your backend:

```bash
cd contractor-system/Backend
python -m uvicorn app.main:app --reload
```

Visit http://localhost:8000/docs to see the API documentation.

### 5. Test Frontend Connection

Start your frontend:

```bash
cd contractor-system/Frontend
npm run dev
```

Visit http://localhost:5173 and try to log in.

## 🔍 Troubleshooting

### Issue: "relation does not exist"
**Solution:** Table wasn't created. Re-run the schema SQL.

### Issue: "permission denied for table"
**Solution:** RLS is blocking access. Check:
1. Are you authenticated?
2. Do RLS policies exist for that table?
3. Does the policy match your user_id/auth.uid()?

### Issue: "JWT expired" or "invalid token"
**Solution:**
- Ensure frontend and backend use the same Supabase credentials
- Check token expiration settings in Supabase
- Try logging out and back in

### Issue: Authentication fails between frontend and backend
**Solution:**
1. Verify `SUPABASE_URL` matches in both .env files
2. Verify keys match between frontend and backend
3. Check CORS settings in backend
4. Look at browser console for detailed errors
5. Check backend logs for auth errors

### Issue: "Could not find the public schema"
**Solution:** Your Supabase project may not have completed initialization. Wait a few minutes and try again.

## 📊 Database Maintenance

### Backup Your Database

1. Go to **Database** → **Backups** in Supabase
2. Enable automatic daily backups
3. Manually create a backup before major changes

### Monitor Performance

1. Go to **Database** → **Query Performance**
2. Watch for slow queries
3. Add indexes as needed

### View Logs

1. Go to **Logs** → **Database Logs**
2. Check for errors or warnings

## 🔄 Migration Strategy

If you need to update the schema later:

1. **Never** drop tables with live data
2. Use `ALTER TABLE` to add columns
3. Create new tables, migrate data, then drop old tables
4. Always test migrations on a development project first

### Example: Adding a Column

```sql
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS new_field TEXT;
```

### Example: Modifying RLS Policy

```sql
-- Drop old policy
DROP POLICY IF EXISTS "Users can view own quotes" ON quotes;

-- Create new policy
CREATE POLICY "Users can view own quotes"
    ON quotes FOR SELECT
    USING (auth.uid() = user_id OR status = 'published');
```

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)

## ✅ Setup Checklist

- [ ] Created Supabase project
- [ ] Dropped old tables (if needed)
- [ ] Ran database_schema.sql
- [ ] Verified all 13 tables exist
- [ ] Verified RLS is enabled
- [ ] Verified sample categories exist
- [ ] Enabled Email auth provider
- [ ] Copied Project URL and keys
- [ ] Updated Backend .env file
- [ ] Updated Frontend .env file
- [ ] Created test user in Supabase Auth
- [ ] Created test user_profile
- [ ] Tested backend startup
- [ ] Tested frontend login
- [ ] Verified API calls work

---

**Need Help?**
If you encounter issues not covered here, check:
1. Browser console for frontend errors
2. Backend logs for API errors
3. Supabase logs for database errors
