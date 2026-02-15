-- ================================================
-- Migration 014: Fix missing tables, columns and enums
-- ratings, inbox_messages, transactions, profiles
-- ================================================

-- 1. Fix Transaction Enum (add 'earnings')
-- Enum cannot be altered directly in a simple way in all Postgres versions, 
-- but we can try adding the value if it doesn't exist.
DO $$ 
BEGIN
  ALTER TYPE transaction_type ADD VALUE 'earnings';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Inbox Messages: Add is_deleted
ALTER TABLE public.inbox_messages 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- 3. Profiles: Add Birth Info & Requirements
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS requires_birthdate BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS requires_birthtime BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS birth_place TEXT,
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS birth_time TIME;

-- 4. Create Ratings Table
CREATE TABLE IF NOT EXISTS public.ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID NOT NULL, -- Logical reference, might not be FK if consultations are off-chain or old
  oracle_id UUID REFERENCES public.profiles(id),
  client_id UUID REFERENCES public.profiles(id),
  stars INTEGER CHECK (stars >= 1 AND stars <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for Ratings
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can create ratings" ON public.ratings 
FOR INSERT WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Public read ratings" ON public.ratings 
FOR SELECT USING (true);

-- 5. Fix Transactions Policy (Ensure 'earnings' type is handled if logic relies on it)
-- (Existing policies usually cover 'select *' by user_id, so should be fine)
