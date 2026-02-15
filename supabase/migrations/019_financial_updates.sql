-- Migration 019: Coupons, Welcome Bonus, and Storage
-- ================================================

-- 1. COUPONS TABLE
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_percent INTEGER NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 60),
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  owner_id UUID REFERENCES public.profiles(id), -- Quem gerou (NULL = sistema/owner)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  active BOOLEAN DEFAULT TRUE
);

-- Index for coupon code lookup
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);

-- RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Owner vê tudo
CREATE POLICY "Owner view all coupons" ON public.coupons FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner')
);

-- Oracles vêem seus próprios cupons
CREATE POLICY "Oracles view own coupons" ON public.coupons FOR ALL USING (
  owner_id = auth.uid()
);

-- Publico (clientes) pode ler cupons (para validar no checkout)
CREATE POLICY "Ref: Public read coupons" ON public.coupons FOR SELECT USING (true);


-- 2. WELCOME BONUS TRIGGER
-- Função para dar coins iniciais
CREATE OR REPLACE FUNCTION public.handle_new_user_bonus()
RETURNS TRIGGER AS $$
BEGIN
  -- Cria wallet se não existir (já deve existir pelo trigger anterior, mas por segurança)
  INSERT INTO public.wallets (user_id, balance)
  VALUES (new.id, 25) -- 25 Free Credits
  ON CONFLICT (user_id) DO UPDATE
  SET balance = wallets.balance + 25;

  -- Registra transação de bonus
  INSERT INTO public.transactions (user_id, amount, type, status, metadata)
  VALUES (new.id, 25, 'bonus', 'confirmed', '{"description": "Welcome Bonus"}'::jsonb);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger (após insert em profiles)
DROP TRIGGER IF EXISTS on_auth_user_created_bonus ON public.profiles;
CREATE TRIGGER on_auth_user_created_bonus
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_bonus();


-- 3. STORAGE BUCKET FOR AVATARS (If not exists via API, we try via SQL extension if available, otherwise manual)
-- Note: Supabase storage buckets are usually managed via API or dashboard, but we can try inserting if the extension is enabled.
-- This might fail if storage schema is not accessible, so we wrap in a block or just skip and rely on dashboard.
-- Instead, we will create a policy to allow public upload if it exists.

-- Policy for avatars bucket (assuming it exists or will be created)
-- We cannot create buckets via SQL in standard Supabase easily without pg_net or storage schema access.
-- We will assume the user creates the bucket "avatars" and sets it to public.

-- Update Transaction Type to support 'coupon_usage' or similar if needed
-- (No schema change needed for text type)
