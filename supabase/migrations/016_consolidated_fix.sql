-- ================================================
-- Migration 016: Consolidated fix for missing columns, enums and tables
-- ================================================

-- 1. Fix Transaction Enum (add 'earnings' and others if needed)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'transaction_type' AND e.enumlabel = 'earnings') THEN
    ALTER TYPE transaction_type ADD VALUE 'earnings';
  END IF;
EXCEPTION
  WHEN OTHERS THEN 
    -- If ALTER TYPE doesn't work (e.g. in a transaction block), it's handled manually in Supabase UI
    RAISE NOTICE 'Could not add earnings to transaction_type enum automatically';
END $$;

-- 2. Inbox Messages: Add is_deleted
ALTER TABLE public.inbox_messages 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- 3. Profiles: Add Birth & Billing Fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS birth_time TIME,
ADD COLUMN IF NOT EXISTS birth_place TEXT,
ADD COLUMN IF NOT EXISTS requires_birthdate BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS requires_birthtime BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS cpf TEXT,
ADD COLUMN IF NOT EXISTS zip_code TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS address_number TEXT,
ADD COLUMN IF NOT EXISTS address_complement TEXT,
ADD COLUMN IF NOT EXISTS neighborhood TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Brasil';

-- 4. Ensure Ratings Table Existence (Repetitive but safe)
CREATE TABLE IF NOT EXISTS public.ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID,
  oracle_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  stars INTEGER CHECK (stars >= 1 AND stars <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for Ratings (Safe to re-run)
DO $$ 
BEGIN
  ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DROP POLICY IF EXISTS "Clients can create ratings" ON public.ratings;
CREATE POLICY "Clients can create ratings" ON public.ratings 
FOR INSERT WITH CHECK (auth.uid() = client_id);

DROP POLICY IF EXISTS "Public read ratings" ON public.ratings;
CREATE POLICY "Public read ratings" ON public.ratings 
FOR SELECT USING (true);

-- 5. Add bio and personality to profiles if not already there
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS personality TEXT;
