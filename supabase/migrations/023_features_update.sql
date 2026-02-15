-- Migration 023: Features Update (Profiles & Coupons)
-- ================================================

-- 1. UPDATE PROFILES (Capabilities)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS allows_video BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS allows_text BOOLEAN DEFAULT TRUE;

-- 2. UPDATE COUPONS (Extended Logic)
-- We need to check if the enum exists or create it. 
-- Since we can't easily alter ENUMs in pure SQL without recreation or specific command, 
-- we will use text check constraints or just add columns and let logic handle it.
-- Let's stick to text for flexibility or create new types if needed.

DO $$ BEGIN
    CREATE TYPE discount_type AS ENUM ('percent', 'fixed_value', 'consultation_credit');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE coupon_target_type AS ENUM ('package', 'consultation');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE public.coupons
ADD COLUMN IF NOT EXISTS discount_type discount_type DEFAULT 'percent',
ADD COLUMN IF NOT EXISTS discount_value DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS min_purchase_value DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS target_type coupon_target_type DEFAULT 'package';

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_coupons_owner ON public.coupons(owner_id);

-- 4. RLS UPDATES (If needed)
-- Ensure Oracles can manage their own coupons (already in 019 but let's reinforce if columns changed impact anything)
-- No RLS change needed if policies were "ALL" for owner_id = auth.uid()

-- 5. FUNCTION TO VALIDATE COUPON (Optional helper)
-- Can be done in application logic.

-- 6. GRANT PERMISSIONS (Safety check)
GRANT ALL ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
