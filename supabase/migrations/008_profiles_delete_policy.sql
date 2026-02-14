-- Política de DELETE para Owners na tabela profiles
CREATE POLICY "Owners can delete profiles" ON public.profiles 
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'owner'
  )
);
