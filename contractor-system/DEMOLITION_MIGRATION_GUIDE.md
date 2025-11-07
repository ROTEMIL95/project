# Demolition Items Migration Guide

## Overview

This guide explains how to migrate demolition calculator data from Supabase Auth metadata to the `user_profiles.demolition_items` database column.

## Current Architecture

### Before Migration:
- **Data Storage**: `user.user_metadata.demolitionItems` (Supabase Auth metadata)
- **Access Method**: `supabase.auth.updateUser()` from frontend
- **Location**: DemolitionCalculator.jsx (lines 354-380, 398-410, 429-434)

### After Migration:
- **Data Storage**: `user_profiles.demolition_items` (PostgreSQL JSONB column)
- **Access Method**: Backend REST API (`/api/demolition`)
- **Benefits**:
  - Proper database storage with indexing
  - Row-level security policies
  - Better query performance
  - Separation of concerns (auth vs app data)

## Migration Steps

### Step 1: Run Database Migration

Open Supabase SQL Editor and execute:

```bash
# In Supabase Dashboard > SQL Editor
# Run: seed_demolition_defaults.sql
```

This will:
1. ✅ Update all existing users with empty `demolition_items` to have 5 default items
2. ✅ Update all existing users with empty `demolition_defaults` to have default settings
3. ✅ Create trigger function to auto-seed new users
4. ✅ Apply trigger to `user_profiles` table

**Verification Query:**
```sql
-- Check migration results
SELECT
    COUNT(*) as total_users,
    COUNT(CASE WHEN demolition_items != '[]'::jsonb THEN 1 END) as users_with_items,
    COUNT(CASE WHEN demolition_items = '[]'::jsonb THEN 1 END) as users_without_items
FROM user_profiles;

-- View specific user data
SELECT email, demolition_items, demolition_defaults
FROM user_profiles
WHERE email = 'your-email@example.com';
```

### Step 2: Deploy Backend API

The backend API endpoints are ready:

```
GET    /api/demolition          - Get user's demolition data
PUT    /api/demolition/items    - Update demolition items
PUT    /api/demolition/defaults - Update default settings
DELETE /api/demolition/items/:id - Delete specific item
POST   /api/demolition/reset-defaults - Reset to 5 default items
```

**Deploy to Render:**
1. Code is already pushed to GitHub
2. Render will auto-deploy when you push
3. Wait 5-10 minutes for deployment
4. Verify at: `https://project-b88e.onrender.com/docs` (see `/api/demolition` endpoints)

### Step 3: Update Frontend (Optional - for immediate switch)

If you want to switch the frontend immediately, update `DemolitionCalculator.jsx`:

**Replace auth metadata approach:**
```javascript
// OLD: Reading from auth metadata
const items = user.user_metadata?.demolitionItems || [];

// NEW: Reading from API
const { data } = await api.get('/api/demolition');
const items = data.demolition_items;
```

**Replace auth metadata updates:**
```javascript
// OLD: Updating via auth
await supabase.auth.updateUser({
    data: {
        ...user.user_metadata,
        demolitionItems: updatedItems
    }
});

// NEW: Updating via API
await api.put('/api/demolition/items', {
    demolition_items: updatedItems
});
```

### Step 4: Test the Migration

1. **Test Default Seeding:**
   - Create new user account
   - Login and navigate to Demolition Calculator
   - Should see 5 default items immediately

2. **Test CRUD Operations:**
   - Add new demolition item
   - Edit existing item
   - Delete item
   - Update default settings (labor cost, profit %)

3. **Test Reset:**
   - Modify items
   - Use "Reset to Defaults" (if you add this button)
   - Should restore 5 default items

4. **Check Database:**
```sql
-- Verify data is in database
SELECT auth_user_id, email,
       jsonb_array_length(demolition_items) as item_count,
       demolition_defaults
FROM user_profiles
WHERE email = 'test@example.com';
```

## API Endpoints Documentation

### GET /api/demolition
Get user's demolition data

**Response:**
```json
{
  "demolition_items": [
    {
      "id": "default_demo_1",
      "name": "פירוק קיר גבס",
      "description": "פירוק קיר גבס רגיל כולל סילוק פסולת",
      "unit": "מ'ר",
      "hoursPerUnit": 0.5
    }
  ],
  "demolition_defaults": {
    "laborCostPerDay": 1000,
    "profitPercent": 40
  }
}
```

### PUT /api/demolition/items
Update demolition items

**Request Body:**
```json
{
  "demolition_items": [
    {
      "id": "demo_123",
      "name": "פירוק קיר",
      "description": "תיאור",
      "unit": "מ'ר",
      "hoursPerUnit": 1.5
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "item_count": 1,
  "message": "Updated 1 demolition items"
}
```

### PUT /api/demolition/defaults
Update default settings

**Request Body:**
```json
{
  "demolition_defaults": {
    "laborCostPerDay": 1200,
    "profitPercent": 45
  }
}
```

### DELETE /api/demolition/items/{item_id}
Delete specific demolition item

**Response:**
```json
{
  "success": true,
  "deleted_item_id": "demo_123",
  "remaining_count": 4
}
```

### POST /api/demolition/reset-defaults
Reset to 5 default items

**Response:**
```json
{
  "success": true,
  "item_count": 5,
  "message": "Reset to 5 default demolition items"
}
```

## Default Items

The system seeds these 5 default demolition items:

| ID | Name (Hebrew) | Name (English) | Unit | Hours/Unit |
|----|---------------|----------------|------|------------|
| default_demo_1 | פירוק קיר גבס | Drywall removal | m² | 0.5 |
| default_demo_2 | פירוק ריצוף קרמיקה | Tile flooring removal | m² | 1.2 |
| default_demo_3 | פירוק חיפוי קירות | Wall tile removal | m² | 1.5 |
| default_demo_4 | פירוק דלת פנים | Interior door removal | unit | 1.0 |
| default_demo_5 | פירוק ארון מטבח | Kitchen cabinet removal | linear meter | 2.0 |

**Default Settings:**
- `laborCostPerDay`: ₪1,000 (per 8-hour workday)
- `profitPercent`: 40% markup

## Rollback Plan

If you need to rollback:

1. **Remove trigger:**
```sql
DROP TRIGGER IF EXISTS before_insert_user_profile_demolition ON user_profiles;
DROP FUNCTION IF EXISTS seed_default_demolition_items();
```

2. **Clear data (optional):**
```sql
UPDATE user_profiles
SET demolition_items = '[]'::jsonb,
    demolition_defaults = '{}'::jsonb;
```

3. **Revert frontend:** Use auth metadata approach again

## Troubleshooting

### Users don't see default items
- Check if migration ran: `SELECT * FROM user_profiles WHERE demolition_items = '[]'::jsonb;`
- Check trigger exists: `SELECT * FROM pg_trigger WHERE tgname = 'before_insert_user_profile_demolition';`
- Manually populate: Run UPDATE statement from step 1

### API returns 404
- Verify backend deployed successfully
- Check Render logs for startup errors
- Verify CORS is configured correctly
- Test endpoint: `curl https://project-b88e.onrender.com/api/demolition -H "Authorization: Bearer YOUR_TOKEN"`

### Frontend shows empty list
- Check browser console for API errors
- Verify user is authenticated (has valid token)
- Check backend logs for errors
- Verify RLS policies allow user to read own data

## Files Modified

1. **`seed_demolition_defaults.sql`** - Database migration script
2. **`Backend/app/routers/demolition.py`** - New API router
3. **`Backend/app/main.py`** - Register demolition router
4. **`Frontend/src/pages/DemolitionCalculator.jsx`** - (Future) Update to use API

## Security Notes

- ✅ API endpoints require authentication (`get_current_user` dependency)
- ✅ Users can only access their own demolition data (RLS enforced)
- ✅ Input validation via Pydantic models
- ✅ JSONB type prevents SQL injection
- ✅ Trigger uses `SECURITY DEFINER` with restricted `search_path`

## Performance Notes

- GIN index already exists on `demolition_items` column (from previous migration)
- JSONB queries are efficient for small to medium arrays (5-50 items)
- Typical response time: < 100ms for GET requests
- No N+1 query issues (single database call per operation)

## Next Steps

After migration is complete:

1. ✅ Monitor Render logs for errors
2. ✅ Test with production users
3. ✅ Consider adding more default items if needed
4. ✅ Add frontend UI for "Reset to Defaults" button
5. ✅ Consider migrating other calculators (construction, electrical, etc.) to same pattern

## Support

If you encounter issues:
1. Check Supabase logs
2. Check Render backend logs
3. Check browser console for frontend errors
4. Verify database migration ran successfully
5. Test API endpoints directly with curl/Postman
