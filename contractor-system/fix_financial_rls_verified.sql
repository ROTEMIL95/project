-- Fix for financial_transactions RLS policies
-- This removes the is_admin() check that references the missing user_profiles table
-- Run this in Supabase SQL Editor

-- Ensure RLS is enabled on the table
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (if they exist)
DROP POLICY IF EXISTS "Users can view own transactions" ON financial_transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON financial_transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON financial_transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON financial_transactions;

-- Recreate policies without is_admin() check
-- Users can only access their own transactions based on user_id

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

-- Verify the policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'financial_transactions'
ORDER BY policyname;

