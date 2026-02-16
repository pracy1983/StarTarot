-- Consolidated Fix for Oracle System and Database Issues

-- 1. FIX PROFILES TABLE
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS initial_fee_credits INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS initial_fee_brl NUMERIC(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS name_fantasy TEXT,
ADD COLUMN IF NOT EXISTS application_status TEXT DEFAULT 'pending' CHECK (application_status IN ('pending', 'approved', 'rejected', 'suspended', 'none'));

-- Add missing columns to transactions
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS description TEXT;

-- Ensure columns exist for old profiles
UPDATE public.profiles SET application_status = 'approved' WHERE application_status IS NULL AND role = 'oracle';
UPDATE public.profiles SET initial_fee_credits = 0 WHERE initial_fee_credits IS NULL;

-- 2. FIX TRANSACTIONS TABLE
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS description TEXT;

-- 3. FIX SPECIALTIES TABLE (Cleanup and Populate)
CREATE TABLE IF NOT EXISTS public.specialties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    active BOOLEAN DEFAULT TRUE
);

-- Delete entries with null names if any
DELETE FROM public.specialties WHERE name IS NULL;

-- Insert default specialties if missing
INSERT INTO public.specialties (name, slug)
VALUES 
    ('Tarot', 'tarot'),
    ('Astrologia', 'astrologia'),
    ('Búzios', 'buzios'),
    ('Runas', 'runas'),
    ('Numerologia', 'numerologia'),
    ('Espelho Negro', 'espelho-negro'),
    ('Oráculo dos Ossos', 'oraculo-ossos'),
    ('Baralho Cigano', 'baralho-cigano'),
    ('Reiki', 'reiki'),
    ('Clarividência', 'clarividencia'),
    ('Amor e Relacionamento', 'amor-relacionamento')
ON CONFLICT (name) DO NOTHING;

-- 4. FIX RATINGS TABLE
CREATE TABLE IF NOT EXISTS public.ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consultation_id UUID REFERENCES public.consultations(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.profiles(id),
    oracle_id UUID REFERENCES public.profiles(id),
    stars INTEGER CHECK (stars >= 1 AND stars <= 5),
    comment TEXT, -- User requested 'comment' instead of 'testimonial' for rewards? Actually the UI uses 'comment' in the insert.
    is_approved BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(consultation_id)
);

-- Ensure correct columns in ratings
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ratings' AND column_name='comment') THEN
        ALTER TABLE public.ratings RENAME COLUMN testimonial TO comment;
    END IF;
EXCEPTION WHEN others THEN 
    -- handle testimonial not existing
END $$;

-- 5. RPC: grant_reward_credits
CREATE OR REPLACE FUNCTION public.grant_reward_credits(
    user_id UUID,
    amount INTEGER,
    description TEXT
) RETURNS VOID AS $$
BEGIN
    -- Update or Insert wallet
    INSERT INTO public.wallets (user_id, balance, updated_at)
    VALUES (user_id, amount, NOW())
    ON CONFLICT (user_id) DO UPDATE
    SET balance = wallets.balance + EXCLUDED.balance,
        updated_at = NOW();

    -- Log transaction
    INSERT INTO public.transactions (
        user_id,
        amount,
        type,
        status,
        description,
        metadata
    ) VALUES (
        user_id,
        amount,
        'bonus',
        'confirmed',
        description,
        jsonb_build_object('source', 'rating_reward')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RPC: purchase_gift (Fixed)
CREATE OR REPLACE FUNCTION public.purchase_gift(
    p_consultation_id UUID,
    p_sender_id UUID,
    p_receiver_id UUID,
    p_gift_name TEXT,
    p_credits INTEGER
) RETURNS VOID AS $$
DECLARE
    v_commission INTEGER;
    v_oracle_gain INTEGER;
BEGIN
    -- 1. Deduct from sender
    UPDATE public.wallets 
    SET balance = balance - p_credits,
        updated_at = now()
    WHERE user_id = p_sender_id;

    -- 2. Calculate split (80% for oracle as per standard, or adjust if needed)
    -- For now, let's assume 100% gain for oracle for gifts as per previous descriptions
    v_oracle_gain := p_credits;

    -- 3. Add to receiver
    UPDATE public.wallets 
    SET balance = balance + v_oracle_gain,
        updated_at = now()
    WHERE user_id = p_receiver_id;

    -- 4. Record sender transaction
    INSERT INTO public.transactions (
        user_id, amount, type, status, description, metadata
    ) VALUES (
        p_sender_id, -p_credits, 'gift_send', 'confirmed', 
        'Envio de presente: ' || p_gift_name, 
        jsonb_build_object('consultation_id', p_consultation_id, 'receiver_id', p_receiver_id)
    );

    -- 5. Record receiver transaction
    INSERT INTO public.transactions (
        user_id, amount, type, status, description, metadata
    ) VALUES (
        p_receiver_id, v_oracle_gain, 'gift_receive', 'confirmed', 
        'Recebimento de presente: ' || p_gift_name, 
        jsonb_build_object('consultation_id', p_consultation_id, 'sender_id', p_sender_id)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
