-- Migration 1003: Add user favorites and notifications
-- =================================================

CREATE TABLE IF NOT EXISTS public.user_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    oracle_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    notify_online BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, oracle_id)
);

-- RLS
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own favorites"
    ON public.user_favorites
    FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users can see who favored them (oracle perspective)"
    ON public.user_favorites
    FOR SELECT
    USING (auth.uid() = oracle_id);

-- END OF FILE: 1003_add_user_favorites.sql --

-- Migration: Update deduct_video_fee to apply commission
-- ========================================================

CREATE OR REPLACE FUNCTION public.deduct_video_fee(
    client_id UUID,
    oracle_id UUID,
    amount DECIMAL,
    consultation_id UUID,
    is_initial BOOLEAN DEFAULT false
) RETURNS VOID AS $$
DECLARE
    description_text TEXT;
    v_commission_pc INTEGER;
    v_oracle_amount DECIMAL;
BEGIN
    -- 1. Fetch commission percentage from global settings
    SELECT CAST(value AS INTEGER) INTO v_commission_pc 
    FROM public.global_settings 
    WHERE key = 'oracle_commission_pc';

    IF v_commission_pc IS NULL THEN
        v_commission_pc := 70; -- Fallback
    END IF;

    -- 2. Calculate oracle's net amount
    v_oracle_amount := FLOOR(amount * (v_commission_pc / 100.0));

    -- THRESHOLD: In case we want to support 100% for specific cases, 
    -- but user said "descontado a porcentagem da casa".

    -- 3. Define description
    IF is_initial THEN
        description_text := 'Taxa inicial de vÃ­deo consulta';
    ELSE
        description_text := 'Minuto de vÃ­deo consulta';
    END IF;

    -- 4. Deduct full balance from client
    UPDATE public.wallets 
    SET balance = balance - amount,
        updated_at = now()
    WHERE user_id = client_id;

    -- 5. Add net amount to oracle (Earnings)
    UPDATE public.wallets 
    SET balance = balance + v_oracle_amount,
        updated_at = now()
    WHERE user_id = oracle_id;

    -- 6. Record debit transaction (Client)
    INSERT INTO public.transactions (
        user_id, amount, type, description, status, metadata
    ) VALUES (
        client_id, -amount, 'usage', description_text, 'confirmed', 
        jsonb_build_object(
            'consultation_id', consultation_id, 
            'mode', 'video', 
            'is_initial', is_initial,
            'oracle_id', oracle_id
        )
    );

    -- 7. Record earnings transaction (Oracle)
    INSERT INTO public.transactions (
        user_id, amount, type, description, status, metadata
    ) VALUES (
        oracle_id, v_oracle_amount, 'earnings', 'Ganho por ' || LOWER(description_text), 'confirmed', 
        jsonb_build_object(
            'consultation_id', consultation_id, 
            'mode', 'video', 
            'is_initial', is_initial,
            'client_id', client_id,
            'commission_pc', v_commission_pc,
            'total_charged', amount
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- END OF FILE: 1004_fix_video_commission.sql --

-- Migration: Add heartbeat support for oracles
-- ===========================================

-- 1. Add last_heartbeat_at to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ DEFAULT now();

-- 2. Index for performance on marketplace queries
CREATE INDEX IF NOT EXISTS idx_profiles_heartbeat ON public.profiles (is_online, last_heartbeat_at) 
WHERE role IN ('oracle', 'owner') AND application_status = 'approved';

-- 3. Function to update heartbeat (RPC)
CREATE OR REPLACE FUNCTION public.update_oracle_heartbeat(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles 
    SET last_heartbeat_at = now(),
        is_online = true -- Ensure online if heartbeating
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- END OF FILE: 1005_add_heartbeat_system.sql --

-- Migration: FinalizaÃ§Ã£o Robusta de Consultas de VÃ­deo V2
-- ======================================================

DROP FUNCTION IF EXISTS public.finalize_video_consultation(UUID, INTEGER, TEXT);

CREATE OR REPLACE FUNCTION public.finalize_video_consultation(
    p_consultation_id UUID,
    p_duration_seconds INTEGER,
    p_end_reason TEXT
) RETURNS TABLE (
    success BOOLEAN,
    total_credits DECIMAL,
    oracle_earnings DECIMAL
) AS $$
DECLARE
    v_consultation RECORD;
    v_total_charged DECIMAL;
    v_total_earned DECIMAL;
BEGIN
    -- 1. Buscar detalhes da consulta
    SELECT * INTO v_consultation FROM public.consultations WHERE id = p_consultation_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 0::DECIMAL, 0::DECIMAL;
        RETURN;
    END IF;

    -- Se jÃ¡ estiver finalizada, apenas retorna os valores atuais
    IF v_consultation.status IN ('answered', 'finished') THEN
        SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_total_charged
        FROM public.transactions
        WHERE metadata->>'consultation_id' = p_consultation_id::text
          AND type = 'usage';

        SELECT COALESCE(SUM(amount), 0) INTO v_total_earned
        FROM public.transactions
        WHERE metadata->>'consultation_id' = p_consultation_id::text
          AND type = 'earnings';

        RETURN QUERY SELECT true, v_total_charged, v_total_earned;
        RETURN;
    END IF;

    -- 2. Atualizar status, duraÃ§Ã£o e metadados
    UPDATE public.consultations 
    SET status = 'answered',
        duration_seconds = p_duration_seconds,
        ended_at = now(),
        metadata = jsonb_set(
            COALESCE(metadata, '{}'::jsonb), 
            '{end_info}', 
            jsonb_build_object(
                'reason', p_end_reason, 
                'ended_by_id', auth.uid(),
                'ended_at', now()
            )
        )
    WHERE id = p_consultation_id;

    -- 3. Calcular total cobrado do cliente (Gross)
    SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_total_charged
    FROM public.transactions
    WHERE metadata->>'consultation_id' = p_consultation_id::text
      AND type = 'usage';

    -- 4. Calcular ganhos lÃ­quidos do oraculista (Net)
    SELECT COALESCE(SUM(amount), 0) INTO v_total_earned
    FROM public.transactions
    WHERE metadata->>'consultation_id' = p_consultation_id::text
      AND type = 'earnings';

    -- 5. Gravar os crÃ©ditos totais na consulta para histÃ³rico rÃ¡pido
    UPDATE public.consultations 
    SET total_credits = v_total_charged
    WHERE id = p_consultation_id;

    RETURN QUERY SELECT true, v_total_charged, v_total_earned;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- END OF FILE: 1006_finalize_consultation_v2.sql --

-- Function to safely update profile and set to Oracle application state
-- Helps avoid RLS issues when a simple client tries to update restricted fields

CREATE OR REPLACE FUNCTION public.update_oracle_application(
    p_full_name TEXT,
    p_specialty TEXT,
    p_bio TEXT,
    p_personality TEXT,
    p_phone TEXT,
    p_custom_specialty TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    UPDATE public.profiles
    SET 
        full_name = p_full_name,
        specialty = p_specialty,
        bio = p_bio,
        personality = p_personality,
        phone = p_phone,
        custom_specialty = p_custom_specialty,
        application_status = 'pending',
        role = 'oracle',
        updated_at = now()
    WHERE id = v_user_id;

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- END OF FILE: 1007_fix_oracle_application.sql --

-- Migration: Cancelamento e Reembolso de Consultas Pendentes
-- ========================================================

-- 1. FunÃ§Ã£o para cancelar consulta pendente (Pelo Cliente ou Timeout)
CREATE OR REPLACE FUNCTION public.cancel_pending_consultation(
    p_consultation_id UUID,
    p_reason TEXT DEFAULT 'canceled_by_client'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_consultation RECORD;
    v_client_wallet RECORD;
    v_charge_txn RECORD;
    v_new_balance DECIMAL;
BEGIN
    -- Obter e bloquear a consulta
    SELECT * INTO v_consultation
    FROM public.consultations
    WHERE id = p_consultation_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Consultation not found');
    END IF;

    -- Verificar status
    IF v_consultation.status NOT IN ('pending', 'waiting_oracle') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Consultation is not pending');
    END IF;

    -- Verificar se o usuÃ¡rio que chama Ã© o cliente ou admin (ou sistema via timeout)
    -- Se for 'canceled_by_timeout', ignoramos auth.uid()
    IF p_reason != 'canceled_by_timeout' AND auth.uid() != v_consultation.client_id AND auth.uid() NOT IN (SELECT id FROM profiles WHERE role = 'owner') THEN
         RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;

    -- 1. Estornar CrÃ©ditos para o Cliente
    SELECT * INTO v_client_wallet FROM public.wallets WHERE user_id = v_consultation.client_id FOR UPDATE;
    
    IF NOT FOUND THEN
         -- Should verify wallet existence
         RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
    END IF;

    v_new_balance := v_client_wallet.balance + v_consultation.total_credits;

    UPDATE public.wallets
    SET balance = v_new_balance,
        updated_at = now()
    WHERE user_id = v_consultation.client_id;

    -- 2. Registrar TransaÃ§Ã£o de Estorno
    INSERT INTO public.transactions (
        user_id,
        type,
        amount,
        status,
        description,
        metadata
    ) VALUES (
        v_consultation.client_id,
        'refund',
        v_consultation.total_credits,
        'confirmed',
        CASE WHEN p_reason = 'canceled_by_timeout' THEN 'Estorno: OrÃ¡culo nÃ£o respondeu em 24h' ELSE 'Estorno: Cancelamento pelo cliente' END,
        jsonb_build_object('consultation_id', p_consultation_id, 'reason', p_reason)
    );

    -- 3. Atualizar Status da Consulta
    UPDATE public.consultations
    SET status = 'canceled',
        ended_at = now(),
        metadata = jsonb_set(
            COALESCE(metadata, '{}'::jsonb),
            '{cancellation_reason}',
            to_jsonb(p_reason)
        )
    WHERE id = p_consultation_id;

    -- 4. Cancelar TransaÃ§Ãµes Pendentes do OrÃ¡culo (Earnings)
    UPDATE public.transactions
    SET status = 'voided',
        description = description || ' (Cancelado)'
    WHERE metadata->>'consultation_id' = p_consultation_id::text
      AND type = 'earnings'
      AND status = 'pending';

    -- 5. Atualizar TransaÃ§Ã£o de CobranÃ§a Original (opcional, para clareza)
    UPDATE public.transactions
    SET description = description || ' (Estornado)'
    WHERE metadata->>'consultation_id' = p_consultation_id::text
      AND type = 'consultation_charge';

    RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 2. FunÃ§Ã£o para Timeout AutomÃ¡tico (24h)
-- Esta funÃ§Ã£o pode ser chamada por um CRON job do Supabase ou via API periodicamente
CREATE OR REPLACE FUNCTION public.check_consultation_timeouts()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rec RECORD;
    v_count INTEGER := 0;
BEGIN
    FOR v_rec IN 
        SELECT id 
        FROM public.consultations 
        WHERE status = 'pending' 
          AND created_at < (now() - INTERVAL '24 hours')
    LOOP
        PERFORM public.cancel_pending_consultation(v_rec.id, 'canceled_by_timeout');
        v_count := v_count + 1;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'canceled_count', v_count);
END;
$$;

-- END OF FILE: 1008_cancel_consultation.sql --

-- Migration: Add service flags to profiles
-- =======================================

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS allows_video BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS allows_text BOOLEAN DEFAULT true;

-- Update IA oracles to only allow text by default
UPDATE public.profiles 
SET allows_video = false, 
    allows_text = true 
WHERE oracle_type = 'ai';

-- END OF FILE: 1009_add_service_flags.sql --

-- Create a view to calculate average prices of oracles
CREATE OR REPLACE VIEW oracle_average_prices AS
SELECT
  ROUND(AVG(price_brl_per_minute)::numeric, 2) as avg_price_per_minute,
  ROUND(AVG(initial_fee_brl)::numeric, 2) as avg_initial_fee,
  ROUND(AVG(price_per_message)::numeric, 0) as avg_price_per_message
FROM profiles
WHERE (role = 'oracle' OR role = 'owner')
AND application_status = 'approved'
AND is_ai = false;

-- Grant access to authenticated users
GRANT SELECT ON oracle_average_prices TO authenticated;
GRANT SELECT ON oracle_average_prices TO anon;

-- END OF FILE: 1010_oracle_price_averages.sql --

create table if not exists public.profile_snapshots (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  admin_id uuid references public.profiles(id) on delete set null,
  data jsonb not null,
  reason text,
  created_at timestamptz default now() not null
);

-- Add RLS policies
alter table public.profile_snapshots enable row level security;

create policy "Admins can view all snapshots"
  on public.profile_snapshots
  for select
  using (
    auth.uid() in (
      select id from public.profiles where role = 'owner'
    )
  );

create policy "Admins can insert snapshots"
  on public.profile_snapshots
  for insert
  with check (
    auth.uid() in (
      select id from public.profiles where role = 'owner'
    )
  );

-- Users can view their own snapshots? Maybe not needed for now, but safe to allow.
create policy "Users can view own snapshots"
  on public.profile_snapshots
  for select
  using (auth.uid() = user_id);

-- END OF FILE: 1011_create_profile_snapshots.sql --

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

-- END OF FILE: 1012_fix_schedules_rls.sql --

-- Migration 1013: Add signup bonus and ensure global settings
-- ========================================================

-- Ensure global_settings table exists
CREATE TABLE IF NOT EXISTS public.global_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for global_settings
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public can view settings" ON public.global_settings;
DROP POLICY IF EXISTS "Owners can manage settings" ON public.global_settings;

CREATE POLICY "Public can view settings" 
ON public.global_settings FOR SELECT 
TO public 
USING (true);

CREATE POLICY "Owners can manage settings" 
ON public.global_settings FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'owner'
    )
);

-- Insert default values if not exists
INSERT INTO public.global_settings (key, value)
VALUES 
    ('oracle_commission_pc', '70'),
    ('signup_bonus_credits', '50'),
    ('credit_price_brl', '0.10')
ON CONFLICT (key) DO NOTHING;

-- END OF FILE: 1013_add_signup_bonus_config.sql --

-- Migration 1014: Multi-selection for Categories and Specialties + Signup Bonus
-- ========================================================

-- 1. Create or Rename Tables
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'specialties') THEN
        ALTER TABLE public.specialties RENAME TO oracle_specialties;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.oracle_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Insert Default Categories (Tools)
INSERT INTO public.oracle_categories (name)
VALUES 
    ('Tarot'),
    ('Baralho Cigano'),
    ('Runas'),
    ('BÃºzios'),
    ('Numerologia'),
    ('Astrologia'),
    ('Mesa RadiÃ´nica'),
    ('Outros')
ON CONFLICT (name) DO NOTHING;

-- 3. Update Profiles Columns
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS categories TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS topics TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS custom_category TEXT,
ADD COLUMN IF NOT EXISTS custom_topic TEXT;

-- 4. Initial Data Migration
-- Move current specialty to topics array
UPDATE public.profiles 
SET topics = ARRAY[specialty]
WHERE specialty IS NOT NULL AND specialty != 'Outros' AND (topics IS NULL OR cardinality(topics) = 0);

UPDATE public.profiles
SET custom_topic = custom_specialty
WHERE specialty = 'Outros' AND custom_specialty IS NOT NULL;

-- 5. Signup Bonus Trigger
CREATE OR REPLACE FUNCTION public.handle_signup_bonus()
RETURNS TRIGGER AS $$
DECLARE
    v_bonus_credits INTEGER;
BEGIN
    -- This trigger runs BEFORE INSERT on wallets.
    -- We assume any wallet created for a new user should get the bonus.
    -- However, we might want to check if they already have one or if it's a re-creation?
    -- For now, let's keep it simple: any new wallet gets it.
    
    SELECT CAST(value AS INTEGER) INTO v_bonus_credits 
    FROM public.global_settings 
    WHERE key = 'signup_bonus_credits';

    IF v_bonus_credits IS NULL THEN
        v_bonus_credits := 50;
    END IF;

    IF v_bonus_credits > 0 THEN
        NEW.balance := NEW.balance + v_bonus_credits;
        
        -- We record the transaction (transactions table must exist)
        -- Note: If this fails, the whole wallet creation fails.
        BEGIN
            INSERT INTO public.transactions (
                user_id, amount, type, description, status
            ) VALUES (
                NEW.user_id, v_bonus_credits, 'bonus', 'BÃ´nus de boas-vindas', 'confirmed'
            );
        EXCEPTION WHEN OTHERS THEN
            -- Ignore transaction failures but log if possible
            RAISE NOTICE 'Failed to record signup bonus transaction: %', SQLERRM;
        END;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_signup_bonus ON public.wallets;
CREATE TRIGGER tr_signup_bonus
BEFORE INSERT ON public.wallets
FOR EACH ROW
EXECUTE FUNCTION public.handle_signup_bonus();

-- 6. Update update_oracle_application function to support arrays
CREATE OR REPLACE FUNCTION public.update_oracle_application(
    p_full_name TEXT,
    p_categories TEXT[],
    p_topics TEXT[],
    p_bio TEXT,
    p_personality TEXT,
    p_phone TEXT,
    p_custom_category TEXT DEFAULT NULL,
    p_custom_topic TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    UPDATE public.profiles
    SET 
        full_name = p_full_name,
        categories = p_categories,
        topics = p_topics,
        custom_category = p_custom_category,
        custom_topic = p_custom_topic,
        bio = p_bio,
        personality = p_personality,
        phone = p_phone,
        application_status = 'pending',
        role = 'oracle',
        updated_at = now()
    WHERE id = v_user_id;

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- END OF FILE: 1014_multi_specialties_and_bonus.sql --

-- Create RLS policies for transactions table if they don't exist
-- We can't easily check for existence in pure SQL without PL/pgSQL, so we'll drop and recreate to be safe,
-- or use DO block.

DO $$
BEGIN
    -- Enable RLS just in case
    ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies to avoid conflicts
    DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
    DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.transactions;
    DROP POLICY IF EXISTS "Service role can manage all transactions" ON public.transactions;
    
    -- 1. Users can view their own transactions
    CREATE POLICY "Users can view their own transactions"
    ON public.transactions
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

    -- 2. Service role (admin) can do anything (handled by bypass RLS, but explicit policy is good for internal users)
    -- Actually service role bypasses RLS, so this is mostly for 'postgres' or similar roles if needed.
    
    -- 3. Allow insert?
    -- Usually transactions are created by server-side logic (Asaas integration), which uses service role.
    -- But if we want to allow some manual insertion? Probably not.
    -- However, if 'credit_purchase' is created by API Route using supabaseAdmin, it bypasses RLS.
    
    -- 4. Allow insert for authenticated users?
    -- NO. Transactions should be immutable from client side.
    
END
$$;

-- END OF FILE: 1015_add_transactions_rls.sql --

-- Migration 1016: Fix Bonus, Enforce Role Safety, and Fix Categories
-- =================================================================

-- 1. Update Signup Bonus to 50
INSERT INTO public.global_settings (key, value, description)
VALUES ('signup_bonus_credits', '50', 'CrÃ©ditos de bÃ´nus ao cadastrar')
ON CONFLICT (key) DO UPDATE SET value = '50';

-- 2. Improve ensure_user_profile to prevent auto-oracle approval
DROP FUNCTION IF EXISTS public.ensure_user_profile(uuid, text, text, text);

CREATE OR REPLACE FUNCTION public.ensure_user_profile(
    p_user_id UUID,
    p_email TEXT,
    p_full_name TEXT,
    p_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_profile_id UUID;
    v_final_role TEXT;
    v_app_status TEXT;
BEGIN
    -- Check if profile already exists
    SELECT id INTO v_profile_id FROM public.profiles WHERE id = p_user_id;
    
    IF v_profile_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', true, 'message', 'Profile already exists');
    END IF;

    -- Safety Check: If role is 'oracle', force status to 'pending'
    -- If role is 'owner' or 'admin', force to 'client' (safety first, admin must promote manually in DB)
    
    IF p_role = 'oracle' THEN
        v_final_role := 'oracle';
        v_app_status := 'pending'; -- FORCE PENDING
    ELSIF p_role = 'owner' THEN
         -- Prevent creating owners via public RPC
        v_final_role := 'client';
        v_app_status := NULL;
    ELSE
        v_final_role := 'client';
        v_app_status := NULL;
    END IF;

    -- Create Profile
    INSERT INTO public.profiles (
        id, 
        email, 
        full_name, 
        role, 
        application_status,
        is_online,
        created_at,
        updated_at
    ) VALUES (
        p_user_id,
        p_email,
        p_full_name,
        v_final_role,
        v_app_status,
        false,
        now(),
        now()
    );

    -- Create Wallet (Trigger tr_signup_bonus will handle the bonus)
    INSERT INTO public.wallets (user_id, balance)
    VALUES (p_user_id, 0)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 3. Trigger to ENFORCE pending status on any profile change/insert to 'oracle'
-- This catches cases where the user is created via the Auth Trigger (handle_new_user) 
-- and not just the RPC above.

CREATE OR REPLACE FUNCTION public.enforce_oracle_application_status()
RETURNS TRIGGER AS $$
BEGIN
    -- If role is oracle
    IF NEW.role = 'oracle' THEN
        -- And status is null or empty
        IF NEW.application_status IS NULL OR NEW.application_status = '' THEN
            NEW.application_status := 'pending';
        END IF;
        
        -- If it was previously a client and is becoming an oracle, force pending
        -- (Unless it's being updated by an admin - difficult to check here without extensive RLS/Context)
        -- Ideally we assume the APP sets 'approved' explicitly if it's an admin action.
        -- But for self-registration, it defaults to null/pending.
        
        -- Safe bet: If changing to oracle and status is NOT 'approved' or 'rejected', make it 'pending'.
        IF NEW.application_status NOT IN ('approved', 'rejected', 'waitlist', 'pending') THEN
            NEW.application_status := 'pending';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_enforce_oracle_status ON public.profiles;
CREATE TRIGGER tr_enforce_oracle_status
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_oracle_application_status();

-- END OF FILE: 1016_fix_bonus_and_categories.sql --

-- Migration 1017: name_fantasy separation and strict oracle workflow
-- =================================================================

-- 1. Initialize name_fantasy with full_name for current oracles who don't have it
-- Note: name_fantasy already exists in the table as per user feedback
UPDATE public.profiles 
SET name_fantasy = full_name 
WHERE role = 'oracle' AND (name_fantasy IS NULL OR name_fantasy = '');

-- 2. Stricter Trigger to enforce Oracle Pending Status and RESET on changes
CREATE OR REPLACE FUNCTION public.enforce_oracle_application_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Only apply logic to oracles
    IF NEW.role = 'oracle' THEN
        
        -- A: If changing role FROM client TO oracle, FORCE 'pending'
        IF (TG_OP = 'UPDATE' AND OLD.role != 'oracle') OR (TG_OP = 'INSERT') THEN
            NEW.application_status := 'pending';
        END IF;

        -- B: Reset to 'pending' if critical fields change and status was 'approved'
        -- (This ensures the admin must re-check significant bio/name changes)
        -- We EXCLUDE changes where the status itself is being transitioned by admin
        
        IF (TG_OP = 'UPDATE' AND OLD.application_status = 'approved' AND NEW.application_status = 'approved') THEN
            -- Check if significant fields changed
            IF (OLD.full_name IS DISTINCT FROM NEW.full_name) OR 
               (OLD.name_fantasy IS DISTINCT FROM NEW.name_fantasy) OR
               (OLD.bio IS DISTINCT FROM NEW.bio) OR
               (OLD.categories IS DISTINCT FROM NEW.categories) OR
               (OLD.topics IS DISTINCT FROM NEW.topics) OR
               (OLD.price_per_message IS DISTINCT FROM NEW.price_per_message)
            THEN
                NEW.application_status := 'pending';
                NEW.updated_at := now();
            END IF;
        END IF;

        -- C: Strict fallback for any null/invalid status for oracles
        IF NEW.application_status IS NULL OR NEW.application_status NOT IN ('approved', 'rejected', 'waitlist', 'pending') THEN
            NEW.application_status := 'pending';
        END IF;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Re-apply the trigger
DROP TRIGGER IF EXISTS tr_enforce_oracle_status ON public.profiles;
CREATE TRIGGER tr_enforce_oracle_status
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_oracle_application_status();

-- 4. Updated update_oracle_application with name_fantasy
CREATE OR REPLACE FUNCTION public.update_oracle_application(
    p_full_name TEXT,
    p_name_fantasy TEXT,
    p_categories TEXT[],
    p_topics TEXT[],
    p_bio TEXT,
    p_personality TEXT,
    p_phone TEXT,
    p_custom_category TEXT DEFAULT NULL,
    p_custom_topic TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    UPDATE public.profiles
    SET 
        full_name = p_full_name,
        name_fantasy = p_name_fantasy,
        categories = p_categories,
        topics = p_topics,
        custom_category = p_custom_category,
        custom_topic = p_custom_topic,
        bio = p_bio,
        personality = p_personality,
        phone = p_phone,
        application_status = 'pending',
        role = 'oracle',
        updated_at = now()
    WHERE id = v_user_id;

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 5. Updated ensure_user_profile for initial registration
DROP FUNCTION IF EXISTS public.ensure_user_profile(uuid, text, text, text);

CREATE OR REPLACE FUNCTION public.ensure_user_profile(
    p_user_id UUID,
    p_email TEXT,
    p_full_name TEXT,
    p_role TEXT,
    p_name_fantasy TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_profile_id UUID;
    v_final_role TEXT;
    v_app_status TEXT;
BEGIN
    SELECT id INTO v_profile_id FROM public.profiles WHERE id = p_user_id;
    
    IF v_profile_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', true, 'message', 'Profile already exists');
    END IF;

    IF p_role = 'oracle' THEN
        v_final_role := 'oracle';
        v_app_status := 'pending';
    ELSE
        v_final_role := 'client';
        v_app_status := NULL;
    END IF;

    INSERT INTO public.profiles (
        id, 
        email, 
        full_name, 
        name_fantasy,
        role, 
        application_status,
        is_online,
        created_at,
        updated_at
    ) VALUES (
        p_user_id,
        p_email,
        p_full_name,
        COALESCE(p_name_fantasy, p_full_name),
        v_final_role,
        v_app_status,
        false,
        now(),
        now()
    );

    INSERT INTO public.wallets (user_id, balance)
    VALUES (p_user_id, 0)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- END OF FILE: 1017_strict_oracle_approval.sql --

-- Migration 1018: Ensure Oracle Categories and Specialties
-- ========================================================

-- 1. Create oracle_categories if missing
CREATE TABLE IF NOT EXISTS public.oracle_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Insert Default Categories
INSERT INTO public.oracle_categories (name)
VALUES 
    ('Tarot'),
    ('Baralho Cigano'),
    ('Runas'),
    ('BÃºzios'),
    ('Numerologia'),
    ('Astrologia'),
    ('Mesa RadiÃ´nica'),
    ('Outros')
ON CONFLICT (name) DO NOTHING;

-- 3. Ensure oracle_specialties exists (renaming from specialties if it exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'specialties') THEN
        ALTER TABLE public.specialties RENAME TO oracle_specialties;
    END IF;
END $$;

-- Create oracle_specialties if missing
CREATE TABLE IF NOT EXISTS public.oracle_specialties (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Update Profiles Columns if missing (from Migration 1014)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS categories TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS topics TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS custom_category TEXT,
ADD COLUMN IF NOT EXISTS custom_topic TEXT;

-- END OF FILE: 1018_ensure_oracle_tables.sql --

-- Migration 1019: Fix missing slug column in oracle_categories
-- ========================================================

ALTER TABLE public.oracle_categories 
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Generate slugs for existing categories if any
UPDATE public.oracle_categories 
SET slug = lower(trim(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g')))
WHERE slug IS NULL;

-- Make slug NOT NULL after populating
ALTER TABLE public.oracle_categories 
ALTER COLUMN slug SET NOT NULL;

-- END OF FILE: 1019_fix_categories_slug.sql --

-- Ensure finalize_video_consultation matches the application usage
-- Replacing to guarantee signature matches

DROP FUNCTION IF EXISTS public.finalize_video_consultation(UUID, INTEGER, TEXT);
DROP FUNCTION IF EXISTS public.finalize_video_consultation(UUID, NUMERIC, TEXT);

CREATE OR REPLACE FUNCTION public.finalize_video_consultation(
    p_consultation_id UUID,
    p_duration_seconds INTEGER,
    p_end_reason TEXT
) RETURNS TABLE (
    success BOOLEAN,
    total_credits DECIMAL,
    oracle_earnings DECIMAL
) AS $$
DECLARE
    v_consultation RECORD;
    v_total_charged DECIMAL;
    v_total_earned DECIMAL;
BEGIN
    -- 1. Buscar detalhes da consulta
    SELECT * INTO v_consultation FROM public.consultations WHERE id = p_consultation_id;
    
    IF NOT FOUND THEN
        -- Retorna false mas com zeros para nÃ£o quebrar a desestruturaÃ§Ã£o do cliente
        RETURN QUERY SELECT false, 0::DECIMAL, 0::DECIMAL;
        RETURN;
    END IF;

    -- Se jÃ¡ estiver finalizada, apenas retorna os valores atuais
    IF v_consultation.status IN ('answered', 'completed', 'finished') THEN
        SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_total_charged
        FROM public.transactions
        WHERE metadata->>'consultation_id' = p_consultation_id::text
          AND type = 'usage';

        SELECT COALESCE(SUM(amount), 0) INTO v_total_earned
        FROM public.transactions
        WHERE metadata->>'consultation_id' = p_consultation_id::text
          AND type = 'earnings';

        RETURN QUERY SELECT true, v_total_charged, v_total_earned;
        RETURN;
    END IF;

    -- 2. Atualizar status, duraÃ§Ã£o e metadados
    UPDATE public.consultations 
    SET status = 'completed', -- Changed to 'completed' to match dashboard filters
        duration_seconds = p_duration_seconds,
        ended_at = now(),
        metadata = jsonb_set(
            COALESCE(metadata, '{}'::jsonb), 
            '{end_info}', 
            jsonb_build_object(
                'reason', p_end_reason, 
                'ended_by_id', auth.uid(),
                'ended_at', now()
            )
        )
    WHERE id = p_consultation_id;

    -- 3. Calcular total cobrado do cliente (Gross)
    SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_total_charged
    FROM public.transactions
    WHERE metadata->>'consultation_id' = p_consultation_id::text
      AND type = 'usage';

    -- 4. Calcular ganhos lÃ­quidos do oraculista (Net)
    SELECT COALESCE(SUM(amount), 0) INTO v_total_earned
    FROM public.transactions
    WHERE metadata->>'consultation_id' = p_consultation_id::text
      AND type = 'earnings';

    -- 5. Gravar os crÃ©ditos totais na consulta para histÃ³rico rÃ¡pido
    UPDATE public.consultations 
    SET total_credits = v_total_charged
    WHERE id = p_consultation_id;

    RETURN QUERY SELECT true, v_total_charged, v_total_earned;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- END OF FILE: 1020_finalize_consultation_strict.sql --

-- Migration to ensure ensure_user_profile RPC exists and is robust
-- Used for self-healing profiles when triggers fail
-- This version returns JSONB to match frontend expectations in authStore.ts

DROP FUNCTION IF EXISTS public.ensure_user_profile(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.ensure_user_profile(UUID, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.ensure_user_profile(
    p_user_id UUID,
    p_email TEXT,
    p_full_name TEXT,
    p_role TEXT,
    p_name_fantasy TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_profile_exists BOOLEAN;
BEGIN
    -- 1. Check if profile already exists
    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) INTO v_profile_exists;

    IF v_profile_exists THEN
        -- Ensure wallet exists
        INSERT INTO public.wallets (user_id, balance)
        VALUES (p_user_id, 0)
        ON CONFLICT (user_id) DO NOTHING;

        RETURN jsonb_build_object('success', true, 'message', 'Profile already exists');
    END IF;

    -- 2. Create Profile
    INSERT INTO public.profiles (
        id, 
        email, 
        full_name, 
        role,
        application_status,
        name_fantasy,
        is_oracle,
        is_online,
        created_at,
        updated_at
    ) VALUES (
        p_user_id,
        p_email,
        p_full_name,
        p_role,
        CASE WHEN p_role = 'oracle' THEN 'pending' ELSE 'approved' END,
        COALESCE(p_name_fantasy, p_full_name),
        CASE WHEN p_role = 'oracle' THEN true ELSE false END,
        false,
        now(),
        now()
    );

    -- 3. Create Wallet
    INSERT INTO public.wallets (user_id, balance)
    VALUES (p_user_id, 0)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN jsonb_build_object('success', true, 'message', 'Profile created successfully');

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- END OF FILE: 1021_ensure_profile_fix.sql --

-- Migration 1022: Final Fix for Profile Schema and Auto-Correction (v2)
-- ===================================================================

-- 1. Ensure ALL expected columns exist in profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_oracle BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS application_status TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name_fantasy TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS categories TEXT[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS topics TEXT[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS personality TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS specialty TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2. Update existing data to be consistent
UPDATE public.profiles SET is_oracle = true WHERE role = 'oracle' AND is_oracle = false;
UPDATE public.profiles SET is_oracle = false WHERE role != 'oracle' AND is_oracle = true;

-- 3. Final version of ensure_user_profile
-- Robust against partial failures and existing data
DROP FUNCTION IF EXISTS public.ensure_user_profile(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.ensure_user_profile(UUID, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.ensure_user_profile(
    p_user_id UUID,
    p_email TEXT,
    p_full_name TEXT,
    p_role TEXT,
    p_name_fantasy TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_final_role user_role;  -- Declarado como ENUM correto
    v_app_status TEXT;
BEGIN
    -- Detect desired role and status
    -- Cast explÃ­cito para o tipo ENUM 'user_role'
    IF p_role = 'oracle' THEN
        v_final_role := 'oracle'::user_role;
        v_app_status := 'pending';
    ELSIF p_role = 'owner' THEN
        v_final_role := 'owner'::user_role;
        v_app_status := NULL;
    ELSE
        v_final_role := 'client'::user_role;
        v_app_status := NULL;
    END IF;

    -- Upsert Profile usando ON CONFLICT para robustez
    INSERT INTO public.profiles (
        id, 
        email, 
        full_name, 
        role,
        application_status,
        name_fantasy,
        is_oracle,
        is_online,
        created_at,
        updated_at
    ) VALUES (
        p_user_id,
        LOWER(TRIM(p_email)),
        p_full_name,
        v_final_role,
        v_app_status,
        COALESCE(p_name_fantasy, p_full_name),
        (v_final_role = 'oracle'::user_role),
        false,
        now(),
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = LOWER(TRIM(EXCLUDED.email)),
        full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
        role = COALESCE(profiles.role, EXCLUDED.role),
        application_status = COALESCE(profiles.application_status, EXCLUDED.application_status),
        is_oracle = CASE WHEN profiles.role = 'oracle'::user_role THEN true ELSE (EXCLUDED.role = 'oracle'::user_role) END,
        updated_at = now();

    -- Garante que a carteira existe
    INSERT INTO public.wallets (user_id, balance)
    VALUES (p_user_id, 0)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN jsonb_build_object('success', true, 'message', 'Profile and wallet verified/created');

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false, 
        'error', SQLERRM, 
        'detail', SQLSTATE,
        'hint', 'Ensure role and application_status are TEXT or compatible'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- END OF FILE: 1022_final_profile_fix.sql --

-- Migration 1023: Strong Password & Reset Flow
-- =============================================

-- 1. Add force_password_change flag to profiles
-- Default is TRUE to ensure everyone updates their password to a strong one initially
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT true;

-- 2. Create table for password reset OTPs via WhatsApp
CREATE TABLE IF NOT EXISTS public.password_reset_otps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    otp_code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    is_used BOOLEAN DEFAULT false
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_user ON public.password_reset_otps(user_id);

-- 3. Security: RLS for password_reset_otps
ALTER TABLE public.password_reset_otps ENABLE ROW LEVEL SECURITY;

-- Only service role or specific flows should access this (usually handled via RPC)
CREATE POLICY "Service role only access" 
ON public.password_reset_otps 
FOR ALL TO service_role USING (true);

-- 4. RPC to verify OTP and facilitate password update
-- This function verifies the OTP and returns the user's ID if valid
CREATE OR REPLACE FUNCTION public.verify_password_reset_otp(
    p_phone TEXT,
    p_otp_code TEXT
) RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_otp_id UUID;
BEGIN
    -- Find the user by phone
    SELECT id INTO v_user_id FROM public.profiles WHERE phone = p_phone LIMIT 1;
    
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'UsuÃ¡rio nÃ£o encontrado');
    END IF;

    -- Check for valid, unused, and non-expired OTP
    SELECT id INTO v_otp_id 
    FROM public.password_reset_otps 
    WHERE user_id = v_user_id 
      AND otp_code = p_otp_code 
      AND is_used = false 
      AND expires_at > now()
    ORDER BY created_at DESC 
    LIMIT 1;

    IF v_otp_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'CÃ³digo invÃ¡lido ou expirado');
    END IF;

    -- Mark OTP as used
    UPDATE public.password_reset_otps SET is_used = true WHERE id = v_otp_id;

    RETURN jsonb_build_object('success', true, 'user_id', v_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- END OF FILE: 1023_strong_password_fix.sql --

-- Migration: Fix voided status for transactions
-- The cancel_pending_consultation function uses 'voided' status but the enum may not include it.
-- This migration ensures 'voided' is a valid status, or changes the function to use 'cancelled'.

-- Option: Update the cancel function to use 'cancelled' instead of 'voided'
CREATE OR REPLACE FUNCTION public.cancel_pending_consultation(
    p_consultation_id UUID,
    p_reason TEXT DEFAULT 'canceled_by_client'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_consultation RECORD;
    v_client_wallet RECORD;
    v_new_balance DECIMAL;
BEGIN
    SELECT * INTO v_consultation
    FROM public.consultations
    WHERE id = p_consultation_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Consultation not found');
    END IF;

    IF v_consultation.status NOT IN ('pending', 'waiting_oracle') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Consultation is not pending');
    END IF;

    IF p_reason != 'canceled_by_timeout' AND auth.uid() != v_consultation.client_id AND auth.uid() NOT IN (SELECT id FROM profiles WHERE role = 'owner') THEN
         RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;

    -- 1. Estornar CrÃ©ditos para o Cliente
    SELECT * INTO v_client_wallet FROM public.wallets WHERE user_id = v_consultation.client_id FOR UPDATE;
    
    IF NOT FOUND THEN
         RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
    END IF;

    v_new_balance := v_client_wallet.balance + v_consultation.total_credits;

    UPDATE public.wallets
    SET balance = v_new_balance,
        updated_at = now()
    WHERE user_id = v_consultation.client_id;

    -- 2. Registrar TransaÃ§Ã£o de Estorno
    INSERT INTO public.transactions (
        user_id, type, amount, status, description, metadata
    ) VALUES (
        v_consultation.client_id,
        'refund',
        v_consultation.total_credits,
        'confirmed',
        CASE WHEN p_reason = 'canceled_by_timeout' THEN 'Estorno: OrÃ¡culo nÃ£o respondeu em 24h' ELSE 'Estorno: Cancelamento pelo cliente' END,
        jsonb_build_object('consultation_id', p_consultation_id, 'reason', p_reason)
    );

    -- 3. Atualizar Status da Consulta
    UPDATE public.consultations
    SET status = 'canceled',
        ended_at = now(),
        metadata = jsonb_set(
            COALESCE(metadata, '{}'::jsonb),
            '{cancellation_reason}',
            to_jsonb(p_reason)
        )
    WHERE id = p_consultation_id;

    -- 4. Cancelar TransaÃ§Ãµes Pendentes do OrÃ¡culo (use 'cancelled' instead of 'voided')
    UPDATE public.transactions
    SET status = 'cancelled',
        description = description || ' (Cancelado)'
    WHERE metadata->>'consultation_id' = p_consultation_id::text
      AND type = 'earnings'
      AND status = 'pending';

    -- 5. Atualizar TransaÃ§Ã£o de CobranÃ§a Original
    UPDATE public.transactions
    SET description = description || ' (Estornado)'
    WHERE metadata->>'consultation_id' = p_consultation_id::text
      AND type = 'consultation_charge';

    RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Also recreate the timeout function (unchanged, just for completeness)
CREATE OR REPLACE FUNCTION public.check_consultation_timeouts()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rec RECORD;
    v_count INTEGER := 0;
BEGIN
    FOR v_rec IN 
        SELECT id 
        FROM public.consultations 
        WHERE status = 'pending' 
          AND created_at < (now() - INTERVAL '24 hours')
          -- Exclude AI consultations that are still being retried
          AND (metadata->>'processing_failed' IS NOT NULL OR metadata->>'is_ai_scheduled' IS NULL)
    LOOP
        PERFORM public.cancel_pending_consultation(v_rec.id, 'canceled_by_timeout');
        v_count := v_count + 1;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'canceled_count', v_count);
END;
$$;

-- END OF FILE: 1024_fix_voided_and_ai_delay.sql --

-- Migration: Adicionar coluna has_unseen_changes nos profiles
-- Usada para mostrar bolinha vermelha no admin quando oraculista atualiza perfil
-- enquanto estÃ¡ em status pending/rejected

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS has_unseen_changes BOOLEAN DEFAULT FALSE;

-- ComentÃ¡rio explicativo
COMMENT ON COLUMN profiles.has_unseen_changes IS
'TRUE quando o oraculista atualiza o perfil enquanto estÃ¡ pending/rejected e o admin ainda nÃ£o reviu. 
Seta FALSE automaticamente quando admin aprova ou rejeita novamente.';

-- END OF FILE: 1025_add_unseen_changes.sql --

-- Migration: Adicionar tabela de logs de processamento de consultas IA
CREATE TABLE IF NOT EXISTS consultation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
    event TEXT NOT NULL,           -- 'started', 'astrology_ok', 'astrology_error', 'generating_q1', 'answer_q1_ok', 'error', 'sent_to_client', 'completed'
    details TEXT,                   -- mensagem descritiva
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consultation_logs_consultation_id ON consultation_logs(consultation_id);
CREATE INDEX IF NOT EXISTS idx_consultation_logs_created_at ON consultation_logs(created_at DESC);

-- RLS: owner pode ver tudo, outros nÃ£o veem
ALTER TABLE consultation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_can_see_all_logs" ON consultation_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'
        )
    );

-- END OF FILE: 1026_consultation_logs.sql --

-- FunÃ§Ã£o para iniciar a consulta de vÃ­deo de forma atÃ´mica, evitando erros 406
CREATE OR REPLACE FUNCTION start_video_consultation(p_consultation_id UUID)
RETURNS JSON AS $$
DECLARE
    v_updated_row consultations%ROWTYPE;
BEGIN
    UPDATE consultations
    SET 
        status = 'active',
        started_at = COALESCE(started_at, NOW())
    WHERE id = p_consultation_id
      AND started_at IS NULL
    RETURNING * INTO v_updated_row;

    RETURN row_to_json(v_updated_row);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- END OF FILE: 1027_start_video_consultation.sql --

-- Migration 1028: Relax oracle application status reset on updates
-- =============================================================

CREATE OR REPLACE FUNCTION public.enforce_oracle_application_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Only apply logic to oracles
    IF NEW.role = 'oracle' THEN
        
        -- A: If changing role FROM client TO oracle, FORCE 'pending'
        IF (TG_OP = 'UPDATE' AND OLD.role != 'oracle') OR (TG_OP = 'INSERT') THEN
            NEW.application_status := 'pending';
        END IF;

        -- B: If the oracle was REJECTED and is now updating critical fields, set to 'pending' to notify admin
        -- (This ensures the admin knows the oracle "fixed" their profile)
        IF (TG_OP = 'UPDATE' AND OLD.application_status = 'rejected' AND NEW.application_status = 'rejected') THEN
            IF (OLD.full_name IS DISTINCT FROM NEW.full_name) OR 
               (OLD.name_fantasy IS DISTINCT FROM NEW.name_fantasy) OR
               (OLD.bio IS DISTINCT FROM NEW.bio) OR
               (OLD.categories IS DISTINCT FROM NEW.categories) OR
               (OLD.topics IS DISTINCT FROM NEW.topics) OR
               (OLD.price_per_message IS DISTINCT FROM NEW.price_per_message)
            THEN
                NEW.application_status := 'pending';
                NEW.updated_at := now();
            END IF;
        END IF;

        -- C: If the oracle is APPROVED, keep them approved even if they change fields
        -- But we set has_unseen_changes = true so the admin knows something changed (visual cue in table)
        IF (TG_OP = 'UPDATE' AND OLD.application_status = 'approved' AND NEW.application_status = 'approved') THEN
            IF (OLD.full_name IS DISTINCT FROM NEW.full_name) OR 
               (OLD.name_fantasy IS DISTINCT FROM NEW.name_fantasy) OR
               (OLD.bio IS DISTINCT FROM NEW.bio) OR
               (OLD.categories IS DISTINCT FROM NEW.categories) OR
               (OLD.topics IS DISTINCT FROM NEW.topics) OR
               (OLD.price_per_message IS DISTINCT FROM NEW.price_per_message)
            THEN
                NEW.has_unseen_changes := true;
                NEW.updated_at := now();
            END IF;
        END IF;

        -- D: Strict fallback for any null/invalid status for oracles
        IF NEW.application_status IS NULL OR NEW.application_status NOT IN ('approved', 'rejected', 'waitlist', 'pending') THEN
            NEW.application_status := 'pending';
        END IF;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- END OF FILE: 1028_relax_oracle_approval_trigger.sql --


-- Migration 1029: Create RPC for password reset request
-- This avoids RLS issues when an anonymous user needs to initiate a reset

CREATE OR REPLACE FUNCTION public.request_password_reset(
    p_email TEXT,
    p_phone TEXT,
    p_otp_code TEXT,
    p_expires_at TIMESTAMPTZ
) RETURNS JSONB AS $$
DECLARE
    v_user_profile RECORD;
BEGIN
    -- 1. Validate if user exists with this email AND phone
    SELECT id, full_name, phone INTO v_user_profile 
    FROM public.profiles 
    WHERE email = LOWER(TRIM(p_email))
      AND (
        phone = p_phone 
        OR phone = '+' || p_phone 
        OR phone = REPLACE(p_phone, '+', '')
        OR phone = RIGHT(p_phone, 11)
        OR RIGHT(phone, 11) = RIGHT(p_phone, 11)
      )
    LIMIT 1;

    IF v_user_profile IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Dados nÃ£o conferem. Verifique seu e-mail e telefone.');
    END IF;

    -- 2. Insert the OTP (SECURITY DEFINER allows this to bypass RLS)
    INSERT INTO public.password_reset_otps (user_id, otp_code, expires_at)
    VALUES (v_user_profile.id, p_otp_code, p_expires_at);

    RETURN jsonb_build_object(
        'success', true, 
        'user_id', v_user_profile.id, 
        'full_name', v_user_profile.full_name,
        'user_phone', v_user_profile.phone
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- END OF FILE: 1029_create_password_reset_rpc.sql --

-- Migration: Add usage to transaction_type enum
-- ===========================================

-- 1. Add 'usage' to transaction_type enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'transaction_type' AND e.enumlabel = 'usage') THEN
        ALTER TYPE public.transaction_type ADD VALUE 'usage';
    END IF;

    -- Also adding balance_adjustment just in case for future manual fixes
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'transaction_type' AND e.enumlabel = 'balance_adjustment') THEN
        ALTER TYPE public.transaction_type ADD VALUE 'balance_adjustment';
    END IF;
END $$;

-- END OF FILE: 1030_add_usage_to_transaction_type.sql --

-- Migration: Update billing to use consultation_charge and ensure integer amounts
-- =========================================================================

-- 1. Update deduct_video_fee
CREATE OR REPLACE FUNCTION public.deduct_video_fee(
    client_id UUID,
    oracle_id UUID,
    amount DECIMAL,
    consultation_id UUID,
    is_initial BOOLEAN DEFAULT false
) RETURNS VOID AS $$
DECLARE
    description_text TEXT;
    v_commission_pc INTEGER;
    v_oracle_amount INTEGER; -- Changed to INTEGER
BEGIN
    -- Fetch commission percentage
    SELECT CAST(value AS INTEGER) INTO v_commission_pc 
    FROM public.global_settings 
    WHERE key = 'oracle_commission_pc';

    IF v_commission_pc IS NULL THEN
        v_commission_pc := 70;
    END IF;

    -- Calculate oracle's net amount (as integer)
    v_oracle_amount := FLOOR(amount * (v_commission_pc / 100.0))::INTEGER;

    -- Define description
    IF is_initial THEN
        description_text := 'Taxa inicial de vÃ­deo consulta';
    ELSE
        description_text := 'Minuto de vÃ­deo consulta';
    END IF;

    -- Deduct from client
    UPDATE public.wallets 
    SET balance = balance - amount::INTEGER, -- Ensure integer
        updated_at = now()
    WHERE user_id = client_id;

    -- Add to oracle
    UPDATE public.wallets 
    SET balance = balance + v_oracle_amount,
        updated_at = now()
    WHERE user_id = oracle_id;

    -- Record debit (Client) - Using 'consultation_charge' for better compatibility
    INSERT INTO public.transactions (
        user_id, amount, type, description, status, metadata
    ) VALUES (
        client_id, -(amount::INTEGER), 'consultation_charge', description_text, 'confirmed', 
        jsonb_build_object(
            'consultation_id', consultation_id, 
            'mode', 'video', 
            'is_initial', is_initial,
            'oracle_id', oracle_id
        )
    );

    -- Record earnings (Oracle)
    INSERT INTO public.transactions (
        user_id, amount, type, description, status, metadata
    ) VALUES (
        oracle_id, v_oracle_amount, 'earnings', 'Ganho por ' || LOWER(description_text), 'confirmed', 
        jsonb_build_object(
            'consultation_id', consultation_id, 
            'mode', 'video', 
            'is_initial', is_initial,
            'client_id', client_id,
            'commission_pc', v_commission_pc,
            'total_charged', amount
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Update finalize_video_consultation to look for 'consultation_charge'
CREATE OR REPLACE FUNCTION public.finalize_video_consultation(
    p_consultation_id UUID,
    p_duration_seconds INTEGER,
    p_end_reason TEXT
) RETURNS TABLE (
    success BOOLEAN,
    total_credits DECIMAL,
    oracle_earnings DECIMAL
) AS $$
DECLARE
    v_consultation RECORD;
    v_total_charged DECIMAL;
    v_total_earned DECIMAL;
BEGIN
    SELECT * INTO v_consultation FROM public.consultations WHERE id = p_consultation_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 0::DECIMAL, 0::DECIMAL;
        RETURN;
    END IF;

    -- Se jÃ¡ estiver finalizada, apenas retorna os valores atuais
    IF v_consultation.status IN ('answered', 'completed', 'finished') THEN
        SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_total_charged
        FROM public.transactions
        WHERE metadata->>'consultation_id' = p_consultation_id::text
          AND type = 'consultation_charge'; -- Updated type

        SELECT COALESCE(SUM(amount), 0) INTO v_total_earned
        FROM public.transactions
        WHERE metadata->>'consultation_id' = p_consultation_id::text
          AND type = 'earnings';

        RETURN QUERY SELECT true, v_total_charged, v_total_earned;
        RETURN;
    END IF;

    -- Atualizar status
    UPDATE public.consultations 
    SET status = 'completed',
        duration_seconds = p_duration_seconds,
        ended_at = now(),
        metadata = jsonb_set(
            COALESCE(metadata, '{}'::jsonb), 
            '{end_info}', 
            jsonb_build_object(
                'reason', p_end_reason, 
                'ended_by_id', auth.uid(),
                'ended_at', now()
            )
        )
    WHERE id = p_consultation_id;

    -- Calcular totais
    SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_total_charged
    FROM public.transactions
    WHERE metadata->>'consultation_id' = p_consultation_id::text
      AND type = 'consultation_charge'; -- Updated type

    SELECT COALESCE(SUM(amount), 0) INTO v_total_earned
    FROM public.transactions
    WHERE metadata->>'consultation_id' = p_consultation_id::text
      AND type = 'earnings';

    UPDATE public.consultations 
    SET total_credits = v_total_charged
    WHERE id = p_consultation_id;

    RETURN QUERY SELECT true, v_total_charged, v_total_earned;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- END OF FILE: 1031_switch_to_consultation_charge.sql --

-- Migration: 1032 Fix Pulse Online Force
-- ===========================================

-- 1. Modify the function to NOT force is_online = true
-- This allows oracles to send heartbeat (showing they are technically connected) 
-- without actually appearing as "Online Agora" to clients if they chose to be offline.
CREATE OR REPLACE FUNCTION public.update_oracle_heartbeat(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles 
    SET last_heartbeat_at = now()
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- END OF FILE: 1032_fix_pulse_online_force.sql --

-- Fix start_video_consultation returning null values instead of actual row
CREATE OR REPLACE FUNCTION start_video_consultation(p_consultation_id UUID)
RETURNS JSON AS $$
DECLARE
    v_updated_row consultations%ROWTYPE;
BEGIN
    UPDATE consultations
    SET 
        status = 'active',
        started_at = COALESCE(started_at, NOW())
    WHERE id = p_consultation_id
      AND started_at IS NULL
    RETURNING * INTO v_updated_row;

    IF v_updated_row.id IS NULL THEN
        -- It was already started, so just return it as is.
        SELECT * INTO v_updated_row FROM consultations WHERE id = p_consultation_id;
    END IF;

    IF v_updated_row.id IS NULL THEN
        RETURN NULL;
    END IF;

    RETURN row_to_json(v_updated_row);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- END OF FILE: 1032_fix_start_video_consultation.sql --

