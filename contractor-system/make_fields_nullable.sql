-- Make required fields nullable to support Finance.jsx quote-based transactions
-- Run this in Supabase SQL Editor

-- These fields are currently NOT NULL but need to be nullable because:
-- - Quote-based transactions use revenue/estimated_cost/estimated_profit fields
-- - Traditional manual transactions still use type/category/amount/description
-- - Both transaction types should coexist in the same table

-- Make type nullable
ALTER TABLE financial_transactions 
ALTER COLUMN type DROP NOT NULL;

-- Make category nullable
ALTER TABLE financial_transactions 
ALTER COLUMN category DROP NOT NULL;

-- Make amount nullable
ALTER TABLE financial_transactions 
ALTER COLUMN amount DROP NOT NULL;

-- Make description nullable
ALTER TABLE financial_transactions 
ALTER COLUMN description DROP NOT NULL;

-- Drop the existing amount check constraint
ALTER TABLE financial_transactions 
DROP CONSTRAINT IF EXISTS financial_transactions_amount_check;

-- Recreate the amount check constraint to only validate when amount is provided
ALTER TABLE financial_transactions 
ADD CONSTRAINT financial_transactions_amount_check 
CHECK (amount IS NULL OR amount > 0::numeric);

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'financial_transactions'
  AND column_name IN ('type', 'category', 'amount', 'description', 'revenue', 'estimated_cost', 'estimated_profit', 'status', 'project_type')
ORDER BY column_name;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Migration complete! Fields type, category, amount, description are now nullable.';
    RAISE NOTICE '✅ Finance.jsx can now create quote-based transactions using revenue/cost fields.';
    RAISE NOTICE '✅ Traditional transactions with type/category/amount still work.';
END $$;

