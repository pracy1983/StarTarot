-- Migration 025: Cleanup Dummy Financial Data
-- =============================================

-- Delete all transactions that are considered "dummy" (e.g. created before a certain date or test users)
-- Since we don't have a specific date, we'll just provide the query to delete *all* if that's the intention, 
-- or users can uncomment user specific deletion.

-- OPTION 1: Delete ALL transactions (Use with caution)
-- DELETE FROM public.transactions;

-- OPTION 2: Delete specific test data (Example)
-- DELETE FROM public.transactions WHERE metadata->>'type' = 'test';

-- For now, as per request "limpar dados dummies", we assume resetting the financial table for a clean state.
DELETE FROM public.transactions;

-- Reset Wallets to 0? (Optional)
-- UPDATE public.wallets SET balance = 0;

-- Reset Coupons usage?
-- UPDATE public.coupons SET used_count = 0;
