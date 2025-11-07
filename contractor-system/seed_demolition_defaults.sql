-- =============================================
-- SEED DEFAULT DEMOLITION ITEMS
-- =============================================
-- Purpose: Populate user_profiles.demolition_items with default values
-- Date: 2025-11-07
-- Database: Supabase PostgreSQL
-- =============================================

-- =============================================
-- 1. UPDATE EXISTING USERS WITH DEFAULT ITEMS
-- =============================================
-- This populates demolition_items for users who have empty arrays or NULL

UPDATE user_profiles
SET demolition_items = '[
  {
    "id": "default_demo_1",
    "name": "פירוק קיר גבס",
    "description": "פירוק קיר גבס רגיל כולל סילוק פסולת",
    "unit": "מ''ר",
    "hoursPerUnit": 0.5
  },
  {
    "id": "default_demo_2",
    "name": "פירוק ריצוף קרמיקה",
    "description": "פירוק ריצוף קרמיקה/גרניט כולל פסולת",
    "unit": "מ''ר",
    "hoursPerUnit": 1.2
  },
  {
    "id": "default_demo_3",
    "name": "פירוק חיפוי קירות",
    "description": "פירוק חיפוי קרמיקה מקירות כולל פסולת",
    "unit": "מ''ר",
    "hoursPerUnit": 1.5
  },
  {
    "id": "default_demo_4",
    "name": "פירוק דלת פנים",
    "description": "פירוק דלת פנים כולל משקוף",
    "unit": "יחידה",
    "hoursPerUnit": 1.0
  },
  {
    "id": "default_demo_5",
    "name": "פירוק ארון מטבח",
    "description": "פירוק ארון מטבח כולל משטח עבודה",
    "unit": "מטר רץ",
    "hoursPerUnit": 2.0
  }
]'::jsonb
WHERE demolition_items = '[]'::jsonb OR demolition_items IS NULL;

-- =============================================
-- 2. POPULATE DEFAULT SETTINGS IF MISSING
-- =============================================
-- Set default laborCostPerDay and profitPercent if not already set

UPDATE user_profiles
SET demolition_defaults = '{
  "laborCostPerDay": 1000,
  "profitPercent": 40
}'::jsonb
WHERE demolition_defaults = '{}'::jsonb OR demolition_defaults IS NULL;

-- =============================================
-- 3. CREATE TRIGGER FUNCTION FOR NEW USERS
-- =============================================
-- This automatically populates defaults when new user profiles are created

CREATE OR REPLACE FUNCTION seed_default_demolition_items()
RETURNS TRIGGER AS $$
BEGIN
    -- Only seed if demolition_items is empty
    IF NEW.demolition_items = '[]'::jsonb OR NEW.demolition_items IS NULL THEN
        NEW.demolition_items = '[
          {
            "id": "default_demo_1",
            "name": "פירוק קיר גבס",
            "description": "פירוק קיר גבס רגיל כולל סילוק פסולת",
            "unit": "מ''ר",
            "hoursPerUnit": 0.5
          },
          {
            "id": "default_demo_2",
            "name": "פירוק ריצוף קרמיקה",
            "description": "פירוק ריצוף קרמיקה/גרניט כולל פסולת",
            "unit": "מ''ר",
            "hoursPerUnit": 1.2
          },
          {
            "id": "default_demo_3",
            "name": "פירוק חיפוי קירות",
            "description": "פירוק חיפוי קרמיקה מקירות כולל פסולת",
            "unit": "מ''ר",
            "hoursPerUnit": 1.5
          },
          {
            "id": "default_demo_4",
            "name": "פירוק דלת פנים",
            "description": "פירוק דלת פנים כולל משקוף",
            "unit": "יחידה",
            "hoursPerUnit": 1.0
          },
          {
            "id": "default_demo_5",
            "name": "פירוק ארון מטבח",
            "description": "פירוק ארון מטבח כולל משטח עבודה",
            "unit": "מטר רץ",
            "hoursPerUnit": 2.0
          }
        ]'::jsonb;
    END IF;

    -- Only seed default settings if empty
    IF NEW.demolition_defaults = '{}'::jsonb OR NEW.demolition_defaults IS NULL THEN
        NEW.demolition_defaults = '{
          "laborCostPerDay": 1000,
          "profitPercent": 40
        }'::jsonb;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = 'pg_catalog', 'public';

-- =============================================
-- 4. CREATE TRIGGER
-- =============================================
-- Apply trigger to user_profiles table

DROP TRIGGER IF EXISTS before_insert_user_profile_demolition ON user_profiles;

CREATE TRIGGER before_insert_user_profile_demolition
    BEFORE INSERT ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION seed_default_demolition_items();

-- =============================================
-- 5. VERIFICATION QUERIES
-- =============================================
-- Run these to verify the migration worked:

-- Check how many users have demolition items
-- SELECT
--     COUNT(*) as total_users,
--     COUNT(CASE WHEN demolition_items != '[]'::jsonb THEN 1 END) as users_with_items,
--     COUNT(CASE WHEN demolition_items = '[]'::jsonb THEN 1 END) as users_without_items
-- FROM user_profiles;

-- View demolition items for all users
-- SELECT
--     auth_user_id,
--     email,
--     jsonb_array_length(demolition_items) as item_count,
--     demolition_defaults,
--     demolition_items
-- FROM user_profiles
-- ORDER BY created_at DESC;

-- Check a specific user
-- SELECT demolition_items, demolition_defaults
-- FROM user_profiles
-- WHERE email = 'your-email@example.com';

-- =============================================
-- MIGRATION COMPLETE
-- =============================================

/*
 * Summary:
 * ✅ Updated all existing users with empty demolition_items to have 5 default items
 * ✅ Updated all existing users with empty demolition_defaults to have default settings
 * ✅ Created trigger function to auto-populate defaults for new users
 * ✅ Applied trigger to user_profiles table
 *
 * Default Items:
 * 1. פירוק קיר גבס (Drywall removal) - 0.5 hours per m²
 * 2. פירוק ריצוף קרמיקה (Tile flooring removal) - 1.2 hours per m²
 * 3. פירוק חיפוי קירות (Wall tile removal) - 1.5 hours per m²
 * 4. פירוק דלת פנים (Interior door removal) - 1.0 hour per unit
 * 5. פירוק ארון מטבח (Kitchen cabinet removal) - 2.0 hours per linear meter
 *
 * Default Settings:
 * - laborCostPerDay: ₪1000 (cost per 8-hour work day)
 * - profitPercent: 40% (markup percentage)
 *
 * Next Steps:
 * 1. Run verification queries above to confirm migration
 * 2. Update frontend DemolitionCalculator.jsx to read from user_profiles.demolition_items
 * 3. Create backend API endpoints for CRUD operations
 */
