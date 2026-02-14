-- =================================================================
-- FIX CRÍTICO: Permitir Oraculistas IA sem login (auth.users)
-- =================================================================
-- A tabela profiles tem uma Foreign Key obrigando que todo ID exista
-- em auth.users. Para IAs que não fazem login, precisamos remover isso.

-- 1. Remover a FK que liga profiles.id -> auth.users.id
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_pkey;

-- 2. Recriar a Primary Key sem a FK para auth.users
ALTER TABLE public.profiles ADD PRIMARY KEY (id);

-- 3. Garantir que IDs novos são gerados automaticamente
ALTER TABLE public.profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();
