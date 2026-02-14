-- Script de reparo completo para a tabela Profiles
-- Garante que todas as colunas necessárias para o Marketplace e Admin existam

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS specialty TEXT,
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'client',
ADD COLUMN IF NOT EXISTS is_ai BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS oracle_type TEXT,
ADD COLUMN IF NOT EXISTS system_prompt TEXT,
ADD COLUMN IF NOT EXISTS personality TEXT,
ADD COLUMN IF NOT EXISTS credits_per_minute INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS price_per_message INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE;

-- Se o enum user_role deu erro em algum momento, as colunas role podem estar como TEXT. 
-- Vamos garantir que os índices existam para performance.
CREATE INDEX IF NOT EXISTS idx_profiles_role_new ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_ai_new ON public.profiles(is_ai);

-- Recarregar o cache do PostgREST (Supabase) acontece automaticamente após DDL, 
-- mas às vezes é bom rodar uma query simples para confirmar.
SELECT * FROM public.profiles LIMIT 1;
