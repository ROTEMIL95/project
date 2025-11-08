-- Quick fix: Remove is_admin() check from financial_transactions RLS policies
-- Run this in Supabase SQL Editor

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own transactions" ON financial_transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON financial_transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON financial_transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON financial_transactions;

-- Recreate policies without is_admin() check
CREATE POLICY "Users can view own transactions"
    ON financial_transactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
    ON financial_transactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
    ON financial_transactions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
    ON financial_transactions FOR DELETE
    USING (auth.uid() = user_id);

