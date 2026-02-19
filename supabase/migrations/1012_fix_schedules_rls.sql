-- Migration 1012: Fix RLS for schedules table
-- This allows oracles to manage their own schedules even if they are in 'pending' status.
-- ======================================================================================

-- Ensure RLS is enabled
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

-- Drop existing restrictive policies if they exist (common names)
DROP POLICY IF EXISTS "Oracles can manage their own schedules" ON public.schedules;
DROP POLICY IF EXISTS "Users can manage their own schedules" ON public.schedules;
DROP POLICY IF EXISTS "Allow individual insert" ON public.schedules;
DROP POLICY IF EXISTS "Allow individual update" ON public.schedules;
DROP POLICY IF EXISTS "Allow individual delete" ON public.schedules;
DROP POLICY IF EXISTS "Anyone can view schedules" ON public.schedules;

-- 1. Anyone can view oracle schedules (needed for public profile display)
CREATE POLICY "Anyone can view schedules" 
ON public.schedules FOR SELECT 
TO public
USING (true);

-- 2. Oracles can manage their own schedules (all operations)
-- We check only that the oracle_id matches the authenticated user's ID
CREATE POLICY "Oracles can manage their own schedules" 
ON public.schedules FOR ALL 
TO authenticated 
USING (auth.uid() = oracle_id)
WITH CHECK (auth.uid() = oracle_id);
