-- Libera permissões para o bucket de avatars no Supabase Storage

-- 1. Permitir que qualquer usuário autenticado faça upload (ADMINS)
CREATE POLICY "Permitir upload de avatars para autenticados"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- 2. Permitir que qualquer pessoa veja as fotos (PÚBLICO)
CREATE POLICY "Permitir visualização pública de avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- 3. Permitir que usuários autenticados deletem ou atualizem (Manutenção)
CREATE POLICY "Permitir update de avatars para autenticados"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars');

CREATE POLICY "Permitir delete de avatars para autenticados"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');
