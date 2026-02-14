-- Script de Correção: Criar perfis para usuários que existem no Auth mas não no Public
-- Cole este código no SQL Editor do seu Supabase Dashboard e clique em RUN.

-- 1. Inserir perfis faltantes
INSERT INTO public.profiles (id, email, full_name, role, credits_per_minute)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'full_name', 'Usuário StarTarot'), 
    'client', -- Default para client
    5
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);

-- 2. Transformar Paula Racy em Owner (Dona do Templo)
UPDATE public.profiles
SET 
    role = 'owner',
    full_name = 'Paula Racy',
    bio = 'Guardiã do Templo Star Tarot',
    credits_per_minute = 0 -- Owner não cobra/paga
WHERE email = 'paularacy@gmail.com';

-- 3. Criar Carteira para quem não tem
INSERT INTO public.wallets (user_id, balance)
SELECT id, 100 -- Bônus inicial de 100 créditos para sementes
FROM public.profiles
WHERE id NOT IN (SELECT user_id FROM public.wallets);

-- 4. Garantir que a Trigger de Novos Usuários está Ativa
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Novo Visitante'), 
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'client')
  )
  ON CONFLICT (id) DO NOTHING; -- Evita erro se já existir
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
