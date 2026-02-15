-- ================================================
-- Migration 017: Módulo Financeiro Core
-- Packages, Wallets Update, Oracle Pricing
-- ================================================

-- 1. ADICIONAR COLUNAS DE PREÇO E PAPEL EM PROFILES
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS price_brl_per_minute DECIMAL(10,2) DEFAULT 5.00,
ADD COLUMN IF NOT EXISTS is_oracle BOOLEAN DEFAULT FALSE;

-- Se o usuário já tem role = 'oracle', marcar is_oracle = true
UPDATE public.profiles SET is_oracle = TRUE WHERE role = 'oracle' OR role = 'owner';

-- 2. ADICIONAR COLUNA PARA CORRIGIR BUG DA INBOX
-- Consultas que o usuário "deletou" da inbox mas que devem permanecer no banco
ALTER TABLE public.consultations 
ADD COLUMN IF NOT EXISTS hidden_inbox BOOLEAN DEFAULT FALSE;

-- 3. TABELA DE PACOTES DE CRÉDITO (RECARGA)
CREATE TABLE IF NOT EXISTS public.credit_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    price_brl DECIMAL(10,2) NOT NULL,
    coins_amount INTEGER NOT NULL,
    bonus_amount INTEGER DEFAULT 0,
    tag_label TEXT, -- "Mais Vendido", "Experimentar", etc
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir os pacotes definidos no plano de negócios
INSERT INTO public.credit_packages (name, price_brl, coins_amount, bonus_amount, tag_label)
VALUES 
('Pacote Starter', 20.00, 200, 0, 'Experimentar'),
('Pacote Popular', 50.00, 500, 50, 'Mais Vendido'),
('Pacote Místico', 100.00, 1000, 200, NULL),
('Pacote VIP', 200.00, 2000, 600, 'Melhor Custo-Benefício')
ON CONFLICT DO NOTHING;

-- 4. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_profiles_is_oracle ON public.profiles(is_oracle);
CREATE INDEX IF NOT EXISTS idx_consultations_hidden_inbox ON public.consultations(hidden_inbox);

-- 5. RLS PARA PACOTES
ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active packages" ON public.credit_packages;
CREATE POLICY "Public can view active packages" ON public.credit_packages FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Owner can manage packages" ON public.credit_packages;
CREATE POLICY "Owner can manage packages" ON public.credit_packages FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner')
);
