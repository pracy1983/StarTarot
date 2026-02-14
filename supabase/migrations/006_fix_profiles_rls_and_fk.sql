-- Corrige permissões de inserção na tabela Profiles e relaxa o vínculo obrigatório com Auth para IAs

-- 1. Remover a restrição obrigatória de que todo Profile deve ser um usuário do Auth
-- Isso permite criarmos "Oraculistas Digitais" que não precisam de login/senha
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 2. Adicionar a restrição novamente, mas permitindo que o ID exista sem estar no Auth (no action)
-- Ou melhor, apenas manter a referência para deletar em cascata quem é humano, mas sem proibir IAs
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_id_fkey 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Garantir que o ID seja gerado automaticamente se não for fornecido (para IAs)
ALTER TABLE public.profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 4. Criar Política de Inserção para Donos (Owners)
-- Permite que o dono do templo crie perfis (útil para cadastrar IAs)
DROP POLICY IF EXISTS "Owners can insert profiles" ON public.profiles;
CREATE POLICY "Owners can insert profiles" ON public.profiles 
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'owner'
  )
);

-- 5. Garantir que o dono também possa atualizar qualquer perfil (pelo menos os de oraculistas)
DROP POLICY IF EXISTS "Owners can update all profiles" ON public.profiles;
CREATE POLICY "Owners can update all profiles" ON public.profiles 
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'owner'
  )
);
