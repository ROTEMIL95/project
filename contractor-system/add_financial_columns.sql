-- Add additional columns to financial_transactions table
-- Run this in Supabase SQL Editor

-- Add new columns for quote-related financial tracking
-- All columns are nullable for backward compatibility

ALTER TABLE financial_transactions
ADD COLUMN IF NOT EXISTS revenue NUMERIC(12, 2),
ADD COLUMN IF NOT EXISTS estimated_cost NUMERIC(12, 2),
ADD COLUMN IF NOT EXISTS estimated_profit NUMERIC(12, 2),
ADD COLUMN IF NOT EXISTS status TEXT,
ADD COLUMN IF NOT EXISTS project_type TEXT;

-- Add comments to document the columns
COMMENT ON COLUMN financial_transactions.revenue IS 'Total revenue from the quote/project';
COMMENT ON COLUMN financial_transactions.estimated_cost IS 'Calculated cost from quote items (materials + labor + fixed costs)';
COMMENT ON COLUMN financial_transactions.estimated_profit IS 'Estimated profit (revenue - estimated_cost)';
COMMENT ON COLUMN financial_transactions.status IS 'Transaction status (e.g., completed, pending, cancelled)';
COMMENT ON COLUMN financial_transactions.project_type IS 'Type of project (e.g., renovation, construction, etc.)';

-- Verify the columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'financial_transactions'
  AND column_name IN ('revenue', 'estimated_cost', 'estimated_profit', 'status', 'project_type')
ORDER BY column_name;

