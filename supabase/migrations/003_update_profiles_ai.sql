-- Adiciona colunas necessárias para o novo fluxo de oraculistas IA
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS personality TEXT,
ADD COLUMN IF NOT EXISTS price_per_message INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS system_prompt TEXT;

-- Garante que is_online e is_ai existam
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_ai BOOLEAN DEFAULT FALSE;

-- Atualiza oraculistas existentes que possam ser IA
UPDATE public.profiles SET is_ai = TRUE WHERE oracle_type = 'ai';
