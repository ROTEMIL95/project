# How to Integrate Default Pricing into Schema

## 🎯 Quick Start

You have **2 options** to add default contractor pricing to your database:

---

## Option 1: Separate Addon File (Easiest)

### Step 1: Run Main Schema
```sql
-- In Supabase SQL Editor:
-- Copy and run entire: database_schema_improved.sql
```

### Step 2: Run Pricing Addon
```sql
-- In Supabase SQL Editor:
-- Copy and run entire: database_default_pricing_addon.sql
```

**Done!** ✅

**Pros:**
- ✅ Easiest to implement
- ✅ Keep files separate and modular
- ✅ Easy to update pricing independently

**Cons:**
- ⚠️ Two files to manage

---

## Option 2: Integrated Single File (Recommended for Production)

### Integration Point

Add the default pricing code to `database_schema_improved.sql` at this location:

```sql
-- =============================================
-- TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
...
[existing code]
...

-- Function to set user_id from auth context
CREATE OR REPLACE FUNCTION set_user_id_from_auth()
...
[existing code]
...

-- ⬇️⬇️⬇️ INSERT DEFAULT PRICING CODE HERE ⬇️⬇️⬇️
-- (After line 548, before ROW LEVEL SECURITY section)

[PASTE ENTIRE CONTENTS OF database_default_pricing_addon.sql HERE]

-- ⬆️⬆️⬆️ END OF DEFAULT PRICING CODE ⬆️⬆️⬆️

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================
```

### Exact Line Number

In `database_schema_improved.sql`:
- **After line 548** - After `set_user_id_from_auth()` function closes
- **Before line 550** - Before the RLS section starts

### Visual Guide

```
LINE 546: $$ LANGUAGE plpgsql
LINE 547:    SECURITY DEFINER
LINE 548:    SET search_path = 'pg_catalog', 'public';
LINE 549:
LINE 550: -- ===== ROW LEVEL SECURITY =====  ← BEFORE THIS
         👆
         INSERT DEFAULT PRICING HERE
         (All content from database_default_pricing_addon.sql)
```

---

## 📋 Step-by-Step Integration

### Method A: Manual Copy-Paste

1. **Open Both Files**
   - `database_schema_improved.sql` in one editor
   - `database_default_pricing_addon.sql` in another

2. **Find Insertion Point**
   - Search for: `SET search_path = 'pg_catalog', 'public';` (last one)
   - Look for the comment: `-- ROW LEVEL SECURITY`
   - Insert between these two

3. **Copy Content**
   - Select ALL content from `database_default_pricing_addon.sql`
   - Copy it

4. **Paste**
   - Position cursor after line 548
   - Paste the content

5. **Verify**
   - Check formatting looks correct
   - Make sure no duplicate lines
   - Save file

6. **Run**
   - Copy entire modified schema
   - Paste into Supabase SQL Editor
   - Execute

### Method B: Using File Concatenation (Command Line)

#### On Windows (PowerShell):
```powershell
# Navigate to contractor-system directory
cd contractor-system

# Create backup
Copy-Item database_schema_improved.sql database_schema_improved_backup.sql

# Split the file at the insertion point (line 549)
$content = Get-Content database_schema_improved.sql
$part1 = $content[0..548]
$part2 = $content[549..($content.Length-1)]
$addon = Get-Content database_default_pricing_addon.sql

# Combine
$part1 + $addon + $part2 | Set-Content database_schema_improved_with_pricing.sql

# Result: database_schema_improved_with_pricing.sql (ready to use)
```

#### On Mac/Linux (Bash):
```bash
# Navigate to contractor-system directory
cd contractor-system

# Create backup
cp database_schema_improved.sql database_schema_improved_backup.sql

# Split and combine
head -n 548 database_schema_improved.sql > temp_part1.sql
cat database_default_pricing_addon.sql >> temp_part1.sql
tail -n +549 database_schema_improved.sql >> temp_part1.sql
mv temp_part1.sql database_schema_improved_with_pricing.sql

# Result: database_schema_improved_with_pricing.sql (ready to use)
```

---

## ✅ Verification After Integration

### Check 1: Functions Exist
```sql
SELECT proname FROM pg_proc
WHERE proname IN (
    'create_default_contractor_pricing',
    'trigger_create_default_contractor_pricing'
);
```
**Expected:** 2 rows

### Check 2: Trigger Exists
```sql
SELECT tgname FROM pg_trigger
WHERE tgname = 'after_user_profile_insert';
```
**Expected:** 1 row

### Check 3: Test with New User
```sql
-- Create test user profile
INSERT INTO user_profiles (auth_user_id, email, full_name, role)
VALUES (
    'test-uuid-here',
    'test@example.com',
    'Test User',
    'user'
);

-- Check pricing created
SELECT COUNT(*) FROM contractor_pricing
WHERE user_id = 'test-uuid-here';
```
**Expected:** 22 (rows)

### Check 4: Verify Categories Linked
```sql
SELECT
    c.name as category,
    COUNT(cp.id) as item_count
FROM contractor_pricing cp
JOIN categories c ON c.id = cp.category_id
WHERE cp.user_id = 'test-uuid-here'
GROUP BY c.name
ORDER BY c.name;
```
**Expected:**
```
category       | item_count
---------------|------------
אינסטלציה     | 5
כללי           | 4
חשמל           | 4
צבע            | 4
ריצוף          | 5
```

---

## 🔧 File Structure After Integration

### Option 1 (Separate Files):
```
contractor-system/
├── database_schema_improved.sql          (Main schema)
├── database_default_pricing_addon.sql    (Pricing addon)
└── [other files]
```

**Usage:** Run both files in Supabase

### Option 2 (Integrated):
```
contractor-system/
├── database_schema_improved.sql          (Original - backup)
├── database_schema_improved_with_pricing.sql   (New - with pricing)
├── database_default_pricing_addon.sql    (Reference only)
└── [other files]
```

**Usage:** Run only `database_schema_improved_with_pricing.sql`

---

## 🎨 Customization After Integration

### Update Pricing Values

If integrated (Option 2):
1. Find the pricing values in the integrated file
2. Modify base_cost values
3. Save and re-run schema

Example:
```sql
-- Find this line in integrated file:
(p_user_id, v_category_id, 'ריצוף רגיל', 'm²', 100.00, 1.0, NULL, 'ריצוף אריחים'),

-- Change to:
(p_user_id, v_category_id, 'ריצוף רגיל', 'm²', 120.00, 1.0, NULL, 'ריצוף אריחים'),
```

### Add New Items

Add new INSERT statements in the appropriate category section:

```sql
-- In the כללי (General) section, add:
(p_user_id, v_category_id, 'New Item', 'unit', 250.00, 1.0, NULL, 'Description'),
```

---

## 📊 Complete Schema Structure

After integration, your schema will have this structure:

```sql
-- =============================================
-- 1. EXTENSIONS
-- =============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 2. ENUM TYPES
-- =============================================
CREATE TYPE user_role_enum AS ENUM ...
[8 enum types]

-- =============================================
-- 3. HELPER FUNCTIONS
-- =============================================
CREATE FUNCTION is_admin() ...

-- =============================================
-- 4. TABLES (13 tables)
-- =============================================
CREATE TABLE user_profiles ...
CREATE TABLE clients ...
[11 more tables]

-- =============================================
-- 5. INDEXES
-- =============================================
CREATE INDEX idx_quotes_items_gin ...
[all indexes]

-- =============================================
-- 6. TRIGGERS
-- =============================================
CREATE FUNCTION update_updated_at_column() ...
CREATE FUNCTION generate_quote_number() ...
CREATE FUNCTION set_user_id_from_auth() ...

-- =============================================
-- 7. DEFAULT PRICING (NEW SECTION)
-- =============================================
CREATE FUNCTION create_default_contractor_pricing() ...
CREATE FUNCTION trigger_create_default_contractor_pricing() ...
CREATE TRIGGER after_user_profile_insert ...

-- =============================================
-- 8. ROW LEVEL SECURITY
-- =============================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
[all RLS policies]

-- =============================================
-- 9. SAMPLE DATA
-- =============================================
INSERT INTO categories VALUES ...
```

**Total Lines:** ~1,050 (with pricing integrated)

---

## 🚨 Common Integration Issues

### Issue 1: Syntax Error at Integration Point

**Cause:** Pasted in wrong location
**Fix:** Ensure you're between line 548 and 550

### Issue 2: Duplicate Function Names

**Cause:** Function already exists
**Fix:** Use `CREATE OR REPLACE FUNCTION` (already in addon)

### Issue 3: Category IDs Not Found

**Cause:** Categories not created yet
**Fix:** Ensure categories section (end of schema) runs before pricing

**Solution:** If using separate files, run in this order:
1. database_schema_improved.sql (includes categories)
2. database_default_pricing_addon.sql (references categories)

### Issue 4: Trigger Not Firing

**Check:**
```sql
SELECT * FROM pg_trigger WHERE tgrelid = 'user_profiles'::regclass;
```

**If missing:** Re-run the pricing addon section

---

## 📝 Recommended Workflow

### For New Projects
1. Use Option 2 (Integrated Single File)
2. Customize pricing values before first deployment
3. Run complete schema once
4. Test with new user creation

### For Existing Projects
1. Use Option 1 (Separate Addon File)
2. Run addon file after main schema is stable
3. Test thoroughly in development first
4. Apply to production during low-traffic period

### For Development
1. Keep files separate for easier updates
2. Use version control for both files
3. Document any custom pricing changes
4. Test with multiple users

---

## ✅ Pre-Deployment Checklist

Before running integrated schema in production:

- [ ] Backup current database
- [ ] Verify all 13 tables will be created
- [ ] Verify all 8 ENUM types defined
- [ ] Verify all 6 functions defined (4 original + 2 pricing)
- [ ] Verify pricing values are current
- [ ] Verify 22 items will be created per user
- [ ] Test in development environment first
- [ ] Plan for rollback if needed

---

## 🎯 Success Criteria

You'll know integration succeeded when:

1. ✅ Schema runs without errors
2. ✅ All tables created
3. ✅ New user profile creation works
4. ✅ 22 pricing items automatically created
5. ✅ Each user has independent pricing
6. ✅ Users can customize their pricing
7. ✅ RLS policies enforce data isolation

---

**Next Steps:**
- Choose Option 1 or Option 2
- Follow integration steps
- Run verification checks
- Test with new users
- Celebrate! 🎉
