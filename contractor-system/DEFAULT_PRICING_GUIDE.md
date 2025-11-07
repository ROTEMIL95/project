# Default Contractor Pricing - Implementation Guide

## 🎯 Overview

The database schema now includes **automatic population** of default contractor pricing for all new users. When a user registers, they immediately get **22 pre-configured pricing items** across 5 categories, ready to use for creating quotes.

---

## ✨ Features

### Automatic Creation
- ✅ Triggers when new user profile is created
- ✅ No manual intervention required
- ✅ Each user gets their own copy
- ✅ Users can customize immediately

### Comprehensive Coverage
- ✅ 22 common construction items
- ✅ 5 categories covered
- ✅ Based on Israeli market pricing (2025)
- ✅ Realistic base costs

### User-Friendly
- ✅ Start quoting immediately after registration
- ✅ Modify/delete/add items as needed
- ✅ Independent pricing per user
- ✅ No shared data conflicts

---

## 📊 Default Pricing Items

### כללי (General) - 4 Items

| Item Name | Unit | Base Cost | Notes |
|-----------|------|-----------|-------|
| עבודות פירוק | m² | ₪80 | Demolition - walls, floors |
| בניית קירות גבס | m² | ₪120 | Drywall construction |
| נגרות כללית | hour | ₪150 | General carpentry |
| איטום גג | m² | ₪90 | Roof waterproofing |

### חשמל (Electrical) - 4 Items

| Item Name | Unit | Base Cost | Notes |
|-----------|------|-----------|-------|
| נקודת חשמל | unit | ₪150 | Power point with materials |
| נקודת תקשורת/טלפון | unit | ₪180 | Data point cat6 |
| לוח חשמל ביתי | unit | ₪2,500 | 3-phase electrical panel |
| גוף תאורה | unit | ₪120 | Light fixture installation |

### אינסטלציה (Plumbing) - 5 Items

| Item Name | Unit | Base Cost | Notes |
|-----------|------|-----------|-------|
| נקודת מים | unit | ₪200 | Hot/cold water point |
| נקודת ביוב | unit | ₪220 | 50mm sewer point |
| התקנת אסלה | unit | ₪800 | Toilet installation |
| התקנת כיור | unit | ₪600 | Sink with faucets |
| מערכת סולארית | unit | ₪3,500 | 150L solar system |

### ריצוף (Tiling) - 5 Items

| Item Name | Unit | Base Cost | Notes |
|-----------|------|-----------|-------|
| ריצוף רגיל | m² | ₪100 | Regular tiles up to 60x60 |
| ריצוף מורכב | m² | ₪150 | Large tiles or complex pattern |
| ריצוף פסיפס | m² | ₪200 | Mosaic or small tiles |
| חיפוי קירות | m² | ₪120 | Wall cladding |
| פינת שיש | meter | ₪180 | Marble edge/special cut |

### צבע (Painting) - 4 Items

| Item Name | Unit | Base Cost | Notes |
|-----------|------|-----------|-------|
| צביעת קירות | m² | ₪35 | Wall painting 2 coats |
| צביעת תקרה | m² | ₪40 | Ceiling painting 2 coats |
| עבודות שפכטל | m² | ₪50 | Plastering and smoothing |
| צבע מיוחד/טקסטורה | m² | ₪60 | Decorative paint/texture |

**Total: 22 Items**

---

## 🔧 Implementation

### Step 1: Add to Your Schema

You have two options:

#### Option A: Use the Addon File (Recommended)

```sql
-- In Supabase SQL Editor:

-- 1. First, run the full database_schema_improved.sql
-- (This creates all tables, categories, etc.)

-- 2. Then, run database_default_pricing_addon.sql
-- (This adds the default pricing functionality)
```

#### Option B: Manually Integrate

1. Open `database_schema_improved.sql`
2. Find the line after `set_user_id_from_auth()` function (around line 548)
3. Copy entire contents of `database_default_pricing_addon.sql`
4. Paste into schema file
5. Run the complete schema

### Step 2: Verify Installation

```sql
-- Check function exists
SELECT proname FROM pg_proc
WHERE proname IN ('create_default_contractor_pricing', 'trigger_create_default_contractor_pricing');
-- Should return 2 rows

-- Check trigger exists
SELECT tgname FROM pg_trigger WHERE tgname = 'after_user_profile_insert';
-- Should return 1 row
```

### Step 3: Test with New User

```sql
-- Create test user in Supabase Auth first (via UI or app)
-- Then create their profile:

INSERT INTO user_profiles (auth_user_id, email, full_name, role)
VALUES (
    'your-test-user-auth-id',
    'test@example.com',
    'Test User',
    'user'
);

-- Check pricing was created:
SELECT
    cp.item_name,
    c.name as category_name,
    cp.base_cost,
    cp.unit
FROM contractor_pricing cp
JOIN categories c ON c.id = cp.category_id
WHERE cp.user_id = 'your-test-user-auth-id'
ORDER BY c.name, cp.item_name;

-- Should see 22 rows!
```

---

## 🎨 Customization

### Changing Default Prices

Edit the function in `database_default_pricing_addon.sql`:

```sql
-- Example: Update demolition price from ₪80 to ₪100
-- Find this line:
(p_user_id, v_category_id, 'עבודות פירוק', 'm²', 80.00, 1.0, NULL, 'פירוק כללי'),

-- Change to:
(p_user_id, v_category_id, 'עבודות פירוק', 'm²', 100.00, 1.0, NULL, 'פירוק כללי'),
```

**Important:** Changes only affect **NEW** users created after the change!

### Adding More Default Items

```sql
-- Add after existing items in a category:
(p_user_id, v_category_id, 'New Item Name', 'unit', 250.00, 1.0, NULL, 'Description');
```

### Removing Default Items

Simply delete or comment out the INSERT line for that item.

### Regional Pricing

Use the `region` field for location-based pricing:

```sql
-- Tel Aviv pricing
(p_user_id, v_category_id, 'ריצוף רגיל', 'm²', 120.00, 1.0, 'Tel Aviv', 'Higher cost area'),

-- Jerusalem pricing
(p_user_id, v_category_id, 'ריצוף רגיל', 'm²', 100.00, 1.0, 'Jerusalem', 'Standard cost'),

-- South region pricing
(p_user_id, v_category_id, 'ריצוף רגיל', 'm²', 85.00, 1.0, 'South', 'Lower cost area')
```

---

## 👥 User Experience

### Registration Flow

**Before (Without Default Pricing):**
```
1. User registers → ✅
2. User profile created → ✅
3. contractor_pricing table → ❌ Empty
4. User wants to create quote → ⚠️ Must manually add all pricing first
5. Time to first quote → 30-60 minutes
```

**After (With Default Pricing):**
```
1. User registers → ✅
2. User profile created → ✅
3. contractor_pricing table → ✅ 22 items ready
4. User wants to create quote → ✅ Can start immediately
5. Time to first quote → 2-5 minutes
```

### Managing Pricing

Users can manage their pricing through your application:

```javascript
// Frontend - Fetch user's contractor pricing
const pricing = await api.get('/api/contractor-pricing');
// Returns all 22 default items (customizable)

// User can modify
await api.put('/api/contractor-pricing/item-id', {
  base_cost: 150.00, // Updated price
  notes: 'My custom notes'
});

// User can add new items
await api.post('/api/contractor-pricing', {
  category_id: 'category-uuid',
  item_name: 'My Custom Item',
  unit: 'm²',
  base_cost: 200.00
});

// User can delete items they don't use
await api.delete('/api/contractor-pricing/item-id');
```

---

## 🔒 Security & Data Isolation

### RLS Protection

Each user's pricing is protected by Row Level Security:

```sql
-- Users can ONLY see/modify their OWN pricing
CREATE POLICY "Users can view own pricing"
    ON contractor_pricing FOR SELECT
    USING (auth.uid() = user_id OR is_admin());
```

### Admin Access

Admins can view all users' pricing for support purposes:

```sql
-- Admin query - see all pricing
SELECT
    up.email,
    cp.item_name,
    cp.base_cost
FROM contractor_pricing cp
JOIN user_profiles up ON up.auth_user_id = cp.user_id
ORDER BY up.email, cp.item_name;
```

### Data Isolation

```sql
-- User A's pricing
user_id: 'a1b2c3...'
Items: 22 rows

-- User B's pricing
user_id: 'd4e5f6...'
Items: 22 rows (separate, independent)

-- User A modifies their pricing
UPDATE contractor_pricing SET base_cost = 200 WHERE id = 'item-x';
-- Only User A's data changes
-- User B's pricing unaffected ✅
```

---

## 🧪 Testing Checklist

### Basic Functionality
- [ ] Function `create_default_contractor_pricing()` exists
- [ ] Trigger `after_user_profile_insert` exists
- [ ] All 5 categories exist in database
- [ ] New user creation triggers pricing creation
- [ ] 22 items created for new user

### Data Integrity
- [ ] Each item links to correct category
- [ ] All prices are positive numbers
- [ ] All units are specified
- [ ] user_id correctly set

### User Isolation
- [ ] User A can see only their pricing
- [ ] User B can see only their pricing
- [ ] User A cannot see User B's pricing
- [ ] Modifying User A's pricing doesn't affect User B

### Admin Features
- [ ] Admin can view all users' pricing
- [ ] Admin can modify any user's pricing
- [ ] Admin bypass works correctly

---

## 🔍 Troubleshooting

### Issue: No Pricing Created for New User

**Check 1:** Verify trigger exists
```sql
SELECT * FROM pg_trigger WHERE tgname = 'after_user_profile_insert';
```

**Check 2:** Check for errors in logs
```sql
-- Look for warnings in Supabase logs
-- Warning will show: "Failed to create default contractor pricing for user..."
```

**Check 3:** Verify categories exist
```sql
SELECT * FROM categories ORDER BY name;
-- Should show 5 categories
```

**Solution:** Re-run the addon SQL file

### Issue: Wrong Number of Items Created

**Expected:** 22 items per user

**Check:**
```sql
SELECT user_id, COUNT(*) as item_count
FROM contractor_pricing
GROUP BY user_id;
```

**If count is wrong:**
- Check if any categories are missing
- Check for SQL errors in function
- Verify all INSERT statements in function

### Issue: Pricing Not Showing in Application

**Check 1:** RLS policies enabled
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'contractor_pricing';
-- rowsecurity should be 't' (true)
```

**Check 2:** User authenticated
```sql
-- Check current user
SELECT auth.uid();
-- Should return user's UUID
```

**Check 3:** Query correct
```javascript
// Frontend - make sure filtering by user
const pricing = await api.get('/api/contractor-pricing');
// Backend should filter: WHERE user_id = auth.uid()
```

---

## 📈 Maintenance

### Annual Price Updates

Update default pricing once per year for inflation:

```sql
-- Update all base_cost values by 5% inflation
-- Option 1: Update function code (affects new users only)
-- Edit database_default_pricing_addon.sql
-- Multiply all base_cost values by 1.05

-- Option 2: Update existing users (if needed)
UPDATE contractor_pricing
SET base_cost = base_cost * 1.05
WHERE created_at < '2025-01-01';  -- Adjust date
```

### Adding New Common Items

When new construction techniques become popular:

```sql
-- Add to function for future users
-- Example: Add "Smart Home Installation"
INSERT INTO contractor_pricing VALUES
(p_user_id, v_category_id, 'התקנת בית חכם', 'יחידה', 5000.00, 1.0, NULL, 'מערכת בית חכם בסיסית');
```

### Monitoring Usage

Track which items are most/least used:

```sql
-- Most popular pricing items
SELECT
    item_name,
    COUNT(DISTINCT user_id) as user_count
FROM contractor_pricing
GROUP BY item_name
ORDER BY user_count DESC
LIMIT 10;

-- Least used items (candidates for removal)
SELECT
    item_name,
    COUNT(DISTINCT user_id) as user_count
FROM contractor_pricing
GROUP BY item_name
ORDER BY user_count ASC
LIMIT 10;
```

---

## 🎓 Best Practices

### For Administrators

1. **Review annually** - Update pricing for inflation
2. **Monitor feedback** - Listen to user requests for new items
3. **Regional variations** - Consider location-based defaults
4. **Keep it lean** - Don't overwhelm with too many items

### For Users (Documentation for Your App)

1. **Review defaults** - Check prices match your costs
2. **Customize early** - Adjust before first quote
3. **Add specifics** - Create items for your specialty
4. **Use complexity factor** - For regional or difficulty adjustments

### For Developers

1. **Don't modify user data** - Defaults are just a starting point
2. **Respect RLS** - Always filter by user_id
3. **Log errors** - Function uses WARNING, not ERROR (won't fail user creation)
4. **Test thoroughly** - Verify with multiple users

---

## 📚 Related Documentation

- [database_schema_improved.sql](./database_schema_improved.sql) - Full schema
- [database_default_pricing_addon.sql](./database_default_pricing_addon.sql) - Pricing addon
- [SCHEMA_IMPROVEMENTS.md](./SCHEMA_IMPROVEMENTS.md) - Schema documentation
- [DATABASE_SETUP.md](./DATABASE_SETUP.md) - Setup guide

---

## ✅ Summary

**What It Does:**
- Automatically creates 22 default contractor pricing items for new users
- Covers 5 categories with realistic Israeli market pricing
- Each user gets independent, customizable pricing

**Benefits:**
- ✅ Users can start quoting immediately
- ✅ No manual data entry required
- ✅ Consistent starting point for all users
- ✅ Easy to customize per user
- ✅ No shared data conflicts

**Implementation:**
- Add `database_default_pricing_addon.sql` to your schema
- Test with new user creation
- Verify 22 items created
- Done!

---

**Total Items:** 22 default pricing items
**Categories Covered:** 5/5 (100%)
**Automation:** Fully automatic
**Customizable:** Yes, per user
**Status:** Production Ready ✅
