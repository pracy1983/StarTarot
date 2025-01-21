-- Habilitar extensão UUID se ainda não estiver habilitada
create extension if not exists "uuid-ossp";

-- Configurar políticas de autenticação
alter table auth.users enable row level security;

-- Permitir que usuários não autenticados possam se registrar
create policy "Permitir registro público"
on auth.users for insert
with check (true);

-- Permitir que usuários vejam seus próprios dados
create policy "Usuários podem ver seus próprios dados"
on auth.users for select
using (auth.uid() = id);

-- Permitir que usuários atualizem seus próprios dados
create policy "Usuários podem atualizar seus próprios dados"
on auth.users for update
using (auth.uid() = id);

-- Configurar políticas para tabela users
alter table public.users enable row level security;

-- Permitir inserção na tabela users durante o registro
create policy "Permitir inserção durante registro"
on public.users for insert
with check (auth.role() = 'authenticated' or auth.role() = 'anon');

-- Permitir que usuários vejam seus próprios dados
create policy "Usuários podem ver seus dados"
on public.users for select
using (auth.uid() = id);

-- Permitir que usuários atualizem seus próprios dados
create policy "Usuários podem atualizar seus dados"
on public.users for update
using (auth.uid() = id);

-- Adicionar coluna avatar_url na tabela users
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Criar bucket para avatares se não existir
INSERT INTO storage.buckets (id, name)
SELECT 'avatars', 'avatars'
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'avatars'
);

-- Criar política de armazenamento para avatares
CREATE POLICY "Usuários podem fazer upload de seus próprios avatares"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Avatares são publicamente visíveis"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

CREATE POLICY "Usuários podem atualizar seus próprios avatares"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Usuários podem deletar seus próprios avatares"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Criar tabela de perfis
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    credits INTEGER DEFAULT 0,
    phone_country_code TEXT DEFAULT '+55',
    phone_area_code TEXT,
    phone_number TEXT,
    birth_date DATE,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Criar função para atualizar o timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar trigger para atualizar o timestamp
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Criar políticas de segurança para profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Criar política para inserção
CREATE POLICY "Usuários podem inserir seus próprios perfis"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Criar política para seleção
CREATE POLICY "Usuários podem ver seus próprios perfis"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Criar política para atualização
CREATE POLICY "Usuários podem atualizar seus próprios perfis"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- Criar função para criar perfil automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para criar perfil automaticamente
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Criar bucket para avatares se não existir
INSERT INTO storage.buckets (id, name)
SELECT 'avatars', 'avatars'
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'avatars'
);

-- Criar política de armazenamento para avatares
CREATE POLICY "Usuários podem fazer upload de seus próprios avatares"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Avatares são publicamente visíveis"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

CREATE POLICY "Usuários podem atualizar seus próprios avatares"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Usuários podem deletar seus próprios avatares"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
);
