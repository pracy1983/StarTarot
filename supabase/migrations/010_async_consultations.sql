-- ================================================
-- Migration 010: Sistema de Consultas Assíncronas
-- consultations, consultation_questions, fixes
-- ================================================

-- 1. CRIAR WALLETS PARA PROFILES EXISTENTES (corrigir erro 406)
INSERT INTO public.wallets (user_id, balance)
SELECT id, 0 FROM public.profiles
WHERE id NOT IN (SELECT user_id FROM public.wallets)
ON CONFLICT (user_id) DO NOTHING;

-- 2. GARANTIR COLUNAS EM TRANSACTIONS
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS money_amount DECIMAL(10,2);
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS asaas_payment_id TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS metadata JSONB;

-- 3. CRIAR TABELA DE CONSULTAS
CREATE TABLE IF NOT EXISTS public.consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  oracle_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- pending, processing, answered
  total_questions INTEGER DEFAULT 0,
  total_credits INTEGER DEFAULT 0,
  subject_name TEXT,
  subject_birthdate DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  answered_at TIMESTAMPTZ
);

-- 4. CRIAR TABELA DE PERGUNTAS/RESPOSTAS
CREATE TABLE IF NOT EXISTS public.consultation_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID REFERENCES public.consultations(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  answer_text TEXT,
  question_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. INDEXES
CREATE INDEX IF NOT EXISTS idx_consultations_client ON public.consultations(client_id);
CREATE INDEX IF NOT EXISTS idx_consultations_oracle ON public.consultations(oracle_id);
CREATE INDEX IF NOT EXISTS idx_consultations_status ON public.consultations(status);
CREATE INDEX IF NOT EXISTS idx_consultation_questions_consultation ON public.consultation_questions(consultation_id);
CREATE INDEX IF NOT EXISTS idx_inbox_recipient_unread ON public.inbox_messages(recipient_id, is_read);

-- 6. RLS POLICIES

ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_questions ENABLE ROW LEVEL SECURITY;

-- Consultations: client vê as próprias, oracle vê as dele, owner vê todas
CREATE POLICY "Clients view own consultations" ON public.consultations FOR SELECT USING (client_id = auth.uid());
CREATE POLICY "Oracles view their consultations" ON public.consultations FOR SELECT USING (oracle_id = auth.uid());
CREATE POLICY "Owner view all consultations" ON public.consultations FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner')
);
CREATE POLICY "Clients create consultations" ON public.consultations FOR INSERT WITH CHECK (client_id = auth.uid());
CREATE POLICY "System update consultations" ON public.consultations FOR UPDATE USING (
  client_id = auth.uid() OR oracle_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner')
);

-- Questions: mesmas regras da consultation pai
CREATE POLICY "Users view questions of their consultations" ON public.consultation_questions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.consultations 
    WHERE id = consultation_id 
    AND (client_id = auth.uid() OR oracle_id = auth.uid() OR 
         EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner'))
  )
);
CREATE POLICY "System insert questions" ON public.consultation_questions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.consultations WHERE id = consultation_id AND client_id = auth.uid())
);
CREATE POLICY "System update questions" ON public.consultation_questions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner')
);
