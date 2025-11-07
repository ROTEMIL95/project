-- =============================================
-- Migration: Add Missing User Profiles Columns
-- Purpose: Add contractor pricing and category-related columns to user_profiles table
-- Date: 2025-11-07
-- Database: Supabase PostgreSQL
-- =============================================
-- 
-- INSTRUCTIONS:
-- 1. Run this migration in your Supabase SQL Editor
-- 2. This migration is safe to run multiple times (idempotent)
-- 3. Existing rows will get default values automatically
-- 4. No data loss will occur
--
-- =============================================

-- =============================================
-- CONTRACTOR PRICING COLUMNS (Construction)
-- =============================================

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS construction_subcontractor_items JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS construction_defaults JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN user_profiles.construction_subcontractor_items IS 'Array of construction/building pricing items with materials, labor hours, and costs';
COMMENT ON COLUMN user_profiles.construction_defaults IS 'Default settings for construction pricing (desiredProfitPercent, workerCostPerUnit)';

-- =============================================
-- CONTRACTOR PRICING COLUMNS (Electrical)
-- =============================================

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS electrical_subcontractor_items JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS electrical_defaults JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN user_profiles.electrical_subcontractor_items IS 'Array of electrical work pricing items';
COMMENT ON COLUMN user_profiles.electrical_defaults IS 'Default settings for electrical pricing';

-- =============================================
-- CONTRACTOR PRICING COLUMNS (Plumbing)
-- =============================================

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS plumbing_subcontractor_items JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS plumbing_defaults JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN user_profiles.plumbing_subcontractor_items IS 'Array of plumbing/sanitation pricing items';
COMMENT ON COLUMN user_profiles.plumbing_defaults IS 'Default settings for plumbing pricing';

-- =============================================
-- PAINT CATEGORY COLUMNS
-- =============================================

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS paint_items JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS paint_user_defaults JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS custom_paint_types JSONB;

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS custom_plaster_types JSONB;

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS paint_work_category_preference TEXT;

COMMENT ON COLUMN user_profiles.paint_items IS 'Array of paint work pricing items';
COMMENT ON COLUMN user_profiles.paint_user_defaults IS 'Default settings for paint pricing';
COMMENT ON COLUMN user_profiles.custom_paint_types IS 'Custom paint type definitions';
COMMENT ON COLUMN user_profiles.custom_plaster_types IS 'Custom plaster type definitions';
COMMENT ON COLUMN user_profiles.paint_work_category_preference IS 'User preference for paint work categorization';

-- =============================================
-- TILING CATEGORY COLUMNS
-- =============================================

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS tiling_items JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS tiling_user_defaults JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN user_profiles.tiling_items IS 'Array of tiling work pricing items';
COMMENT ON COLUMN user_profiles.tiling_user_defaults IS 'Default settings for tiling pricing';

-- =============================================
-- DEMOLITION CATEGORY COLUMNS
-- =============================================

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS demolition_items JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS demolition_defaults JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN user_profiles.demolition_items IS 'Array of demolition work pricing items';
COMMENT ON COLUMN user_profiles.demolition_defaults IS 'Default settings for demolition pricing';

-- =============================================
-- ROOM ESTIMATES & CATEGORY DATA
-- =============================================

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS room_estimates JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS category_commitments JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS category_active_map JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS additional_cost_defaults JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN user_profiles.room_estimates IS 'Saved room estimation templates';
COMMENT ON COLUMN user_profiles.category_commitments IS 'Custom commitment text per category';
COMMENT ON COLUMN user_profiles.category_active_map IS 'Map of which categories are active for this user';
COMMENT ON COLUMN user_profiles.additional_cost_defaults IS 'Default additional cost items (permits, insurance, etc)';

-- =============================================
-- GENERAL SETTINGS & CONFIGURATION
-- =============================================

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS pricebook_general_notes TEXT;

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS desired_daily_profit NUMERIC(12,2);

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS default_payment_terms JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS company_info JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN user_profiles.pricebook_general_notes IS 'General notes for pricebook/quote generation';
COMMENT ON COLUMN user_profiles.is_active IS 'Whether the user account is active';
COMMENT ON COLUMN user_profiles.desired_daily_profit IS 'Desired daily profit amount';
COMMENT ON COLUMN user_profiles.default_payment_terms IS 'Default payment terms structure for quotes';
COMMENT ON COLUMN user_profiles.company_info IS 'Company information (name, address, tax ID, etc)';
COMMENT ON COLUMN user_profiles.notes IS 'General notes about the user';

-- =============================================
-- CREATE INDEXES FOR JSONB COLUMNS
-- =============================================
-- Add GIN indexes for JSONB columns that will be queried frequently

CREATE INDEX IF NOT EXISTS idx_user_profiles_construction_items_gin 
ON user_profiles USING GIN (construction_subcontractor_items);

CREATE INDEX IF NOT EXISTS idx_user_profiles_electrical_items_gin 
ON user_profiles USING GIN (electrical_subcontractor_items);

CREATE INDEX IF NOT EXISTS idx_user_profiles_plumbing_items_gin 
ON user_profiles USING GIN (plumbing_subcontractor_items);

CREATE INDEX IF NOT EXISTS idx_user_profiles_paint_items_gin 
ON user_profiles USING GIN (paint_items);

CREATE INDEX IF NOT EXISTS idx_user_profiles_tiling_items_gin 
ON user_profiles USING GIN (tiling_items);

-- =============================================
-- VERIFICATION QUERY
-- =============================================
-- Run this query after migration to verify all columns exist:

-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'user_profiles'
-- AND column_name IN (
--     'construction_subcontractor_items', 'construction_defaults',
--     'electrical_subcontractor_items', 'electrical_defaults',
--     'plumbing_subcontractor_items', 'plumbing_defaults',
--     'paint_items', 'paint_user_defaults', 'tiling_items', 'tiling_user_defaults',
--     'demolition_items', 'demolition_defaults',
--     'room_estimates', 'category_commitments', 'category_active_map',
--     'additional_cost_defaults', 'pricebook_general_notes',
--     'is_active', 'desired_daily_profit', 'default_payment_terms',
--     'company_info', 'notes', 'custom_paint_types', 'custom_plaster_types',
--     'paint_work_category_preference'
-- )
-- ORDER BY column_name;

-- =============================================
-- MIGRATION COMPLETE
-- =============================================

-- Summary of changes:
-- ✅ Added 6 contractor pricing columns (construction, electrical, plumbing)
-- ✅ Added 5 paint category columns
-- ✅ Added 2 tiling category columns
-- ✅ Added 2 demolition category columns
-- ✅ Added 4 general data columns (room_estimates, category_commitments, etc)
-- ✅ Added 6 settings/configuration columns
-- ✅ Added GIN indexes for performance on JSONB columns
-- ✅ Total: 25 new columns added

-- All existing rows will have default values:
-- - JSONB arrays: []
-- - JSONB objects: {}
-- - BOOLEAN: true
-- - TEXT/NUMERIC: NULL (nullable)

-- No data migration needed - application can now read/write to these columns

