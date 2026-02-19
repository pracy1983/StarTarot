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
    ('Búzios'),
    ('Numerologia'),
    ('Astrologia'),
    ('Mesa Radiônica'),
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
                NEW.user_id, v_bonus_credits, 'bonus', 'Bônus de boas-vindas', 'confirmed'
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
