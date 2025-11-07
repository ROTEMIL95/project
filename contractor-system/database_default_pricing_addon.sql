-- =============================================
-- DEFAULT CONTRACTOR PRICING AUTO-POPULATION
-- =============================================
-- Add this section to database_schema_improved.sql after the set_user_id_from_auth() function (around line 548)

-- Function to create default contractor pricing for a new user
-- This gives users starter pricing data they can customize
CREATE OR REPLACE FUNCTION create_default_contractor_pricing(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_category_id UUID;
BEGIN
    -- Get category IDs (these were inserted in sample data section)

    -- 1. כללי (General) - Default pricing
    SELECT id INTO v_category_id FROM categories WHERE name = 'כללי';
    IF v_category_id IS NOT NULL THEN
        INSERT INTO contractor_pricing (user_id, category_id, item_name, unit, base_cost, complexity_multiplier, region, notes) VALUES
        (p_user_id, v_category_id, 'עבודות פירוק', 'm²', 80.00, 1.0, NULL, 'פירוק כללי - קירות, רצפות'),
        (p_user_id, v_category_id, 'בניית קירות גבס', 'm²', 120.00, 1.2, NULL, 'קיר גבס רגיל חד צדדי'),
        (p_user_id, v_category_id, 'נגרות כללית', 'שעה', 150.00, 1.0, NULL, 'עבודות נגרות שונות'),
        (p_user_id, v_category_id, 'איטום גג', 'm²', 90.00, 1.5, NULL, 'איטום גג רעפים או בטון'),
        (p_user_id, v_category_id, 'תקרת גבס', 'm²', 100.00, 1.1, NULL, 'תקרת גבס רגילה'),
        (p_user_id, v_category_id, 'בניית קיר בלוקים', 'm²', 180.00, 1.0, NULL, 'קיר בלוקי בטון 20 ס״מ'),
        (p_user_id, v_category_id, 'טיח חוץ', 'm²', 70.00, 1.2, NULL, 'טיח חיצוני רגיל'),
        (p_user_id, v_category_id, 'טיח פנים', 'm²', 60.00, 1.0, NULL, 'טיח פנים רגיל');
    END IF;

    -- 2. חשמל (Electrical) - Default pricing
    SELECT id INTO v_category_id FROM categories WHERE name = 'חשמל';
    IF v_category_id IS NOT NULL THEN
        INSERT INTO contractor_pricing (user_id, category_id, item_name, unit, base_cost, complexity_multiplier, region, notes) VALUES
        (p_user_id, v_category_id, 'נקודת חשמל', 'יחידה', 150.00, 1.0, NULL, 'נקודת חשמל רגילה כולל חומרים'),
        (p_user_id, v_category_id, 'נקודת תקשורת/טלפון', 'יחידה', 180.00, 1.0, NULL, 'נקודת תקשורת cat6'),
        (p_user_id, v_category_id, 'לוח חשמל ביתי', 'יחידה', 2500.00, 1.0, NULL, 'לוח חשמל 3 פאזי'),
        (p_user_id, v_category_id, 'גוף תאורה', 'יחידה', 120.00, 1.0, NULL, 'התקנת גוף תאורה רגיל'),
        (p_user_id, v_category_id, 'נקודת טלוויזיה', 'יחידה', 200.00, 1.0, NULL, 'נקודת טלוויזיה עם מגבר'),
        (p_user_id, v_category_id, 'הכנה למזגן עילי', 'יחידה', 1200.00, 1.0, NULL, 'חשמל ונקודה למזגן עילי'),
        (p_user_id, v_category_id, 'נקודה לדוד חשמלי', 'יחידה', 250.00, 1.0, NULL, 'נקודת חשמל לדוד 3 פאזות'),
        (p_user_id, v_category_id, 'מערכת אינטרקום', 'יחידה', 800.00, 1.0, NULL, 'התקנת מערכת אינטרקום וידאו');
    END IF;

    -- 3. אינסטלציה (Plumbing) - Default pricing
    SELECT id INTO v_category_id FROM categories WHERE name = 'אינסטלציה';
    IF v_category_id IS NOT NULL THEN
        INSERT INTO contractor_pricing (user_id, category_id, item_name, unit, base_cost, complexity_multiplier, region, notes) VALUES
        (p_user_id, v_category_id, 'נקודת מים', 'יחידה', 200.00, 1.0, NULL, 'נקודת מים קרים/חמים'),
        (p_user_id, v_category_id, 'נקודת ביוב', 'יחידה', 220.00, 1.0, NULL, 'נקודת ביוב 50 מ״מ'),
        (p_user_id, v_category_id, 'התקנת אסלה', 'יחידה', 800.00, 1.0, NULL, 'התקנת אסלה כולל חיבורים'),
        (p_user_id, v_category_id, 'התקנת כיור', 'יחידה', 600.00, 1.0, NULL, 'התקנת כיור כולל ברזים'),
        (p_user_id, v_category_id, 'מערכת סולארית', 'יחידה', 3500.00, 1.0, NULL, 'התקנת מערכת סולארית 150 ליטר'),
        (p_user_id, v_category_id, 'התקנת מקלחון', 'יחידה', 1200.00, 1.0, NULL, 'מקלחון זכוכית כולל התקנה'),
        (p_user_id, v_category_id, 'התקנת אמבטיה', 'יחידה', 1500.00, 1.0, NULL, 'התקנת אמבטיה כולל חיבורים'),
        (p_user_id, v_category_id, 'ניקוז גג', 'מטר אורך', 80.00, 1.0, NULL, 'צנרת ניקוז גג 110 מ״מ'),
        (p_user_id, v_category_id, 'צנרת ראשית', 'מטר אורך', 150.00, 1.2, NULL, 'צנרת מים/ביוב ראשית');
    END IF;

    -- 4. ריצוף (Tiling) - Default pricing
    SELECT id INTO v_category_id FROM categories WHERE name = 'ריצוף';
    IF v_category_id IS NOT NULL THEN
        INSERT INTO contractor_pricing (user_id, category_id, item_name, unit, base_cost, complexity_multiplier, region, notes) VALUES
        (p_user_id, v_category_id, 'ריצוף רגיל', 'm²', 100.00, 1.0, NULL, 'ריצוף אריחים רגילים עד 60x60'),
        (p_user_id, v_category_id, 'ריצוף מורכב', 'm²', 150.00, 1.2, NULL, 'ריצוף אריחים גדולים או דוגמה מורכבת'),
        (p_user_id, v_category_id, 'ריצוף פסיפס', 'm²', 200.00, 1.5, NULL, 'ריצוף פסיפס או אריחים קטנים'),
        (p_user_id, v_category_id, 'חיפוי קירות', 'm²', 120.00, 1.1, NULL, 'חיפוי קירות באריחים'),
        (p_user_id, v_category_id, 'פינת שיש', 'מטר אורך', 180.00, 1.0, NULL, 'פינת שיש/חיתוך מיוחד'),
        (p_user_id, v_category_id, 'ריצוף פורצלן', 'm²', 130.00, 1.3, NULL, 'ריצוף פורצלן איכותי'),
        (p_user_id, v_category_id, 'חיפוי אמבטיה מלא', 'm²', 140.00, 1.2, NULL, 'חיפוי קירות אמבטיה מלא'),
        (p_user_id, v_category_id, 'פרקט למינציה', 'm²', 80.00, 1.0, NULL, 'התקנת פרקט למינציה'),
        (p_user_id, v_category_id, 'פרקט עץ', 'm²', 120.00, 1.2, NULL, 'התקנת פרקט עץ אמיתי'),
        (p_user_id, v_category_id, 'שיפולי עץ/פי וי סי', 'מטר אורך', 25.00, 1.0, NULL, 'התקנת שיפולים');
    END IF;

    -- 5. צבע (Painting) - Default pricing
    SELECT id INTO v_category_id FROM categories WHERE name = 'צבע';
    IF v_category_id IS NOT NULL THEN
        INSERT INTO contractor_pricing (user_id, category_id, item_name, unit, base_cost, complexity_multiplier, region, notes) VALUES
        (p_user_id, v_category_id, 'צביעת קירות', 'm²', 35.00, 1.0, NULL, 'צביעת קירות 2 שכבות'),
        (p_user_id, v_category_id, 'צביעת תקרה', 'm²', 40.00, 1.0, NULL, 'צביעת תקרה 2 שכבות'),
        (p_user_id, v_category_id, 'עבודות שפכטל', 'm²', 50.00, 1.3, NULL, 'שפכטל והחלקה'),
        (p_user_id, v_category_id, 'צבע מיוחד/טקסטורה', 'm²', 60.00, 1.5, NULL, 'צבע דקורטיבי או טקסטורה'),
        (p_user_id, v_category_id, 'צביעת דלתות וחלונות', 'יחידה', 250.00, 1.2, NULL, 'צביעת דלת או חלון'),
        (p_user_id, v_category_id, 'צביעת ברזל', 'm²', 45.00, 1.1, NULL, 'צביעת מעקות וברזל'),
        (p_user_id, v_category_id, 'צבע חוץ', 'm²', 50.00, 1.2, NULL, 'צביעה חיצונית עמידה');
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail user creation
        RAISE WARNING 'Failed to create default contractor pricing for user %: %', p_user_id, SQLERRM;
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = 'pg_catalog', 'public';

-- Trigger to automatically create default pricing when user profile is created
CREATE OR REPLACE FUNCTION trigger_create_default_contractor_pricing()
RETURNS TRIGGER AS $$
BEGIN
    -- Create default pricing for the new user
    PERFORM create_default_contractor_pricing(NEW.auth_user_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = 'pg_catalog', 'public';

-- Apply trigger to user_profiles table
CREATE TRIGGER after_user_profile_insert
    AFTER INSERT ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION trigger_create_default_contractor_pricing();

-- =============================================
-- NOTES ON DEFAULT PRICING
-- =============================================
/*
 * This section automatically creates default contractor pricing for each new user.
 *
 * WHEN IT RUNS:
 * - Automatically when a new user_profile is created
 * - Triggered AFTER INSERT on user_profiles table
 *
 * WHAT IT CREATES:
 * - ~22 default pricing items across 5 categories
 * - Each user gets their own copy to customize
 * - Pricing based on typical Israeli construction costs (2025)
 *
 * CUSTOMIZATION:
 * - Users can modify, delete, or add more items after creation
 * - Each user's pricing is independent
 * - Modifying defaults here affects only NEW users
 *
 * PRICING STRUCTURE:
 * - כללי (General): 4 items - demolition, drywall, carpentry, waterproofing
 * - חשמל (Electrical): 4 items - power points, data points, panels, lighting
 * - אינסטלציה (Plumbing): 5 items - water/sewer points, toilet, sink, solar
 * - ריצוף (Tiling): 5 items - regular, complex, mosaic tiling, wall cladding
 * - צבע (Painting): 4 items - walls, ceiling, plastering, special finishes
 *
 * MAINTENANCE:
 * - Update base_cost values periodically for inflation
 * - Add new common items as market changes
 * - Adjust complexity_multiplier for regional variations
 *
 * TESTING:
 * - Create new user → Check contractor_pricing table has 22 rows
 * - Each user should have separate pricing data
 * - Modifying one user's pricing doesn't affect others
 */
