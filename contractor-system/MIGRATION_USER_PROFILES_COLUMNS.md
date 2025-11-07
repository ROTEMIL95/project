# User Profiles Contractor Pricing Columns Migration

## Overview

This migration adds all missing contractor pricing and category-related columns to the `user_profiles` table in Supabase. These columns are required for the contractor pricing management features in the application.

## Migration File

**File:** `add_user_profiles_contractor_pricing_columns.sql`

## What This Migration Adds

### Contractor Pricing Columns (25 total)

#### Construction Category (2 columns)
- `construction_subcontractor_items` - Array of construction pricing items
- `construction_defaults` - Default settings (profit %, worker cost per day)

#### Electrical Category (2 columns)
- `electrical_subcontractor_items` - Array of electrical pricing items
- `electrical_defaults` - Default settings for electrical work

#### Plumbing Category (2 columns)
- `plumbing_subcontractor_items` - Array of plumbing pricing items
- `plumbing_defaults` - Default settings for plumbing work

#### Paint Category (5 columns)
- `paint_items` - Array of paint work items
- `paint_user_defaults` - Default settings for paint pricing
- `custom_paint_types` - Custom paint type definitions
- `custom_plaster_types` - Custom plaster type definitions
- `paint_work_category_preference` - User preference for paint categorization

#### Tiling Category (2 columns)
- `tiling_items` - Array of tiling work items
- `tiling_user_defaults` - Default settings for tiling pricing

#### Demolition Category (2 columns)
- `demolition_items` - Array of demolition work items
- `demolition_defaults` - Default settings for demolition pricing

#### General Data (4 columns)
- `room_estimates` - Saved room estimation templates
- `category_commitments` - Custom commitment text per category
- `category_active_map` - Map of active categories for user
- `additional_cost_defaults` - Default additional cost items

#### Settings & Configuration (6 columns)
- `pricebook_general_notes` - General notes for pricebook
- `is_active` - Whether user account is active
- `desired_daily_profit` - Desired daily profit amount
- `default_payment_terms` - Default payment terms structure
- `company_info` - Company information (name, address, tax ID)
- `notes` - General user notes

### Performance Indexes

The migration also creates GIN indexes on frequently-queried JSONB columns:
- `construction_subcontractor_items`
- `electrical_subcontractor_items`
- `plumbing_subcontractor_items`
- `paint_items`
- `tiling_items`

## How to Apply the Migration

### Option 1: Supabase SQL Editor (Recommended)

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy the entire contents of `add_user_profiles_contractor_pricing_columns.sql`
5. Paste into the SQL Editor
6. Click **Run** to execute the migration

### Option 2: Command Line (psql)

```bash
psql -h your-project.supabase.co -U postgres -d postgres -f add_user_profiles_contractor_pricing_columns.sql
```

## Safety & Idempotency

✅ **Safe to run multiple times** - All statements use `IF NOT EXISTS` or `ADD COLUMN IF NOT EXISTS`

✅ **No data loss** - Only adds new columns, doesn't modify existing data

✅ **Default values** - All existing rows automatically get appropriate defaults:
- JSONB arrays: `[]`
- JSONB objects: `{}`
- Boolean: `true`
- Nullable fields: `NULL`

✅ **Non-blocking** - Migration runs quickly, no table locks

## Verification

After running the migration, verify all columns were added:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles'
AND column_name IN (
    'construction_subcontractor_items', 'construction_defaults',
    'electrical_subcontractor_items', 'electrical_defaults',
    'plumbing_subcontractor_items', 'plumbing_defaults',
    'paint_items', 'paint_user_defaults', 'tiling_items', 'tiling_user_defaults',
    'demolition_items', 'demolition_defaults',
    'room_estimates', 'category_commitments', 'category_active_map',
    'additional_cost_defaults', 'pricebook_general_notes',
    'is_active', 'desired_daily_profit', 'default_payment_terms',
    'company_info', 'notes', 'custom_paint_types', 'custom_plaster_types',
    'paint_work_category_preference'
)
ORDER BY column_name;
```

Expected result: **25 rows** (all columns present)

## Expected Behavior After Migration

### Before Migration
- ❌ Frontend components fail when trying to read/write contractor pricing data
- ❌ Database errors: "column does not exist"
- ❌ Contractor pricing pages show errors or don't load

### After Migration
- ✅ All contractor pricing pages load correctly
- ✅ Construction, Electrical, Plumbing managers work properly
- ✅ Paint, Tiling, Demolition categories function as expected
- ✅ User settings and defaults save correctly
- ✅ No database errors related to missing columns

## Rollback (If Needed)

If you need to remove the columns for any reason:

```sql
-- WARNING: This will delete all data in these columns!
-- Only run if you're sure you want to remove them

ALTER TABLE user_profiles 
DROP COLUMN IF EXISTS construction_subcontractor_items,
DROP COLUMN IF EXISTS construction_defaults,
DROP COLUMN IF EXISTS electrical_subcontractor_items,
DROP COLUMN IF EXISTS electrical_defaults,
DROP COLUMN IF EXISTS plumbing_subcontractor_items,
DROP COLUMN IF EXISTS plumbing_defaults,
DROP COLUMN IF EXISTS paint_items,
DROP COLUMN IF EXISTS paint_user_defaults,
DROP COLUMN IF EXISTS tiling_items,
DROP COLUMN IF EXISTS tiling_user_defaults,
DROP COLUMN IF EXISTS demolition_items,
DROP COLUMN IF EXISTS demolition_defaults,
DROP COLUMN IF EXISTS room_estimates,
DROP COLUMN IF EXISTS category_commitments,
DROP COLUMN IF EXISTS category_active_map,
DROP COLUMN IF EXISTS additional_cost_defaults,
DROP COLUMN IF EXISTS pricebook_general_notes,
DROP COLUMN IF EXISTS is_active,
DROP COLUMN IF EXISTS desired_daily_profit,
DROP COLUMN IF EXISTS default_payment_terms,
DROP COLUMN IF EXISTS company_info,
DROP COLUMN IF EXISTS notes,
DROP COLUMN IF EXISTS custom_paint_types,
DROP COLUMN IF EXISTS custom_plaster_types,
DROP COLUMN IF EXISTS paint_work_category_preference;
```

## Related Files

- `database_schema_improved.sql` - Base schema (now needs these columns)
- `Frontend/src/components/contractorPricing/ConstructionSubcontractorManager.jsx` - Uses construction columns
- `Frontend/src/components/contractorPricing/PlumbingSubcontractorManager.jsx` - Uses plumbing columns
- `Frontend/src/components/contractorPricing/ElectricalSubcontractorManager.jsx` - Uses electrical columns
- `Backend/app/services/auth_service.py` - Auto-provisioning logic that reads these columns

## Migration Status

- [x] Migration file created
- [ ] Applied to development database
- [ ] Verified in development
- [ ] Applied to production database
- [ ] Verified in production

## Questions?

If you encounter any issues:
1. Check the SQL error message carefully
2. Verify you're connected to the correct database
3. Ensure you have appropriate permissions (admin/owner role)
4. Review the verification query results

## Summary

This migration brings the `user_profiles` table in sync with what the frontend application expects, enabling full functionality for all contractor pricing management features across all categories (Construction, Electrical, Plumbing, Paint, Tiling, Demolition).

