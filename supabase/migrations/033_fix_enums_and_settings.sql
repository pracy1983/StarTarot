-- Migration to fix transaction types and add global prompt settings

-- 1. Update transaction_type enum
-- Since updating enums is tricky in Postgres, we use this safe way
DO $$ 
BEGIN 
    ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'earnings';
    ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'bonus';
    ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'gift_send';
    ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'gift_receive';
    ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'usage';
EXCEPTION 
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create global_settings table
CREATE TABLE IF NOT EXISTS public.global_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES public.profiles(id)
);

-- 3. Insert default master prompt
INSERT INTO public.global_settings (key, value, description)
VALUES (
    'master_ai_prompt',
    'Você é um oráculo divinatório de alta precisão no StarTarot. Sua missão é guiar almas com sabedoria, empatia e verdade.',
    'Prompt mestre que prefixa todas as consultas de IA'
)
ON CONFLICT (key) DO NOTHING;

-- 4. RLS for global_settings
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view settings" ON public.global_settings FOR SELECT USING (true);
CREATE POLICY "Only owner can edit settings" ON public.global_settings FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner')
);
