-- 011_ratings_and_rewards.sql
-- Migration to support rating system, rewards, and expanded oracle profiles

-- 1. ADICIONAR COLUNAS EM PROFILES
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS video_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS message_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS initial_fee DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS application_status TEXT DEFAULT 'approved' CHECK (application_status IN ('pending', 'approved', 'rejected', 'waitlist')),
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 2. ADICIONAR NOVO TIPO DE TRANSAÇÃO (SE EXISTIR ENUM)
-- Nota: Supabase as vezes usa check constraints em vez de ENUM real.
-- Verificando se podemos adicionar 'reward_grant' à tabela transactions (supondo que exista)
-- Se a tabela transactions tiver uma constraint de tipo, precisaremos ajustá-la.

-- 3. CRIAR TABELA DE RATINGS
CREATE TABLE IF NOT EXISTS public.ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consultation_id UUID REFERENCES public.consultations(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.profiles(id),
    oracle_id UUID REFERENCES public.profiles(id),
    stars INTEGER CHECK (stars >= 1 AND stars <= 5),
    testimonial TEXT,
    is_approved BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- Garante que só exista um rating por consulta
    UNIQUE(consultation_id)
);

-- 4. RLS PARA RATINGS
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view approved ratings" ON public.ratings;
CREATE POLICY "Anyone can view approved ratings" ON public.ratings FOR SELECT USING (is_approved = true);

DROP POLICY IF EXISTS "Clients can insert own ratings" ON public.ratings;
CREATE POLICY "Clients can insert own ratings" ON public.ratings FOR INSERT WITH CHECK (auth.uid() = client_id);

DROP POLICY IF EXISTS "Clients can update own ratings" ON public.ratings;
CREATE POLICY "Clients can update own ratings" ON public.ratings FOR UPDATE USING (auth.uid() = client_id);

-- 5. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_ratings_oracle ON public.ratings(oracle_id);
CREATE INDEX IF NOT EXISTS idx_ratings_consultation ON public.ratings(consultation_id);

-- 6. FUNÇÃO PARA CONCEDER RECOMPENSAS (REWARDS)
-- Esta função garante que o aumento de saldo e o log da transação ocorram atomicamente
CREATE OR REPLACE FUNCTION public.grant_reward_credits(
    user_id UUID,
    amount DECIMAL,
    description TEXT
) RETURNS VOID AS $$
BEGIN
    -- 1. Atualizar saldo na carteira
    UPDATE public.wallets 
    SET balance = balance + amount,
        updated_at = now()
    WHERE public.wallets.user_id = grant_reward_credits.user_id;

    -- 2. Registrar transação
    -- Nota: Assumindo que a tabela transactions existe conforme padrões anteriores
    INSERT INTO public.transactions (
        user_id,
        amount,
        type,
        description,
        status,
        metadata
    ) VALUES (
        user_id,
        amount,
        'reward',
        description,
        'completed',
        jsonb_build_object('source', 'rating_reward')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. FUNÇÃO PARA COBRANÇA DE VÍDEO POR MINUTO
CREATE OR REPLACE FUNCTION public.deduct_video_fee(
    client_id UUID,
    oracle_id UUID,
    amount DECIMAL,
    consultation_id UUID
) RETURNS VOID AS $$
BEGIN
    -- 1. Deduzir saldo do cliente
    UPDATE public.wallets 
    SET balance = balance - amount,
        updated_at = now()
    WHERE user_id = client_id;

    -- 2. Adicionar saldo ao oráculo (Earnings)
    UPDATE public.wallets 
    SET balance = balance + amount,
        updated_at = now()
    WHERE user_id = oracle_id;

    -- 3. Registrar transação de débito (Cliente)
    INSERT INTO public.transactions (
        user_id, amount, type, description, status, metadata
    ) VALUES (
        client_id, -amount, 'usage', 'Minuto de vídeo consulta', 'completed', 
        jsonb_build_object('consultation_id', consultation_id, 'mode', 'video')
    );

    -- 4. Registrar transação de crédito (Oráculo)
    INSERT INTO public.transactions (
        user_id, amount, type, description, status, metadata
    ) VALUES (
        oracle_id, amount, 'earnings', 'Ganho por minuto de vídeo', 'completed', 
        jsonb_build_object('consultation_id', consultation_id, 'mode', 'video')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
