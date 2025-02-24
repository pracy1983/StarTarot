ALTER TABLE IF EXISTS mensagens ENABLE ROW LEVEL SECURITY;

-- Política para leitura de mensagens privadas
CREATE POLICY "Usuários podem ver apenas suas mensagens privadas"
ON mensagens FOR SELECT
USING (
  visibilidade = 'privada' AND user_id = auth.uid()
);

-- Política para inserção de novas mensagens
CREATE POLICY "Usuários autenticados podem criar mensagens"
ON mensagens FOR INSERT
TO authenticated
WITH CHECK (true);

-- Política para administradores (acesso total)
CREATE POLICY "Administradores têm acesso total"
ON mensagens FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 
  FROM auth.users 
  WHERE id = auth.uid() AND role = 'admin'
))
WITH CHECK (EXISTS (
  SELECT 1 
  FROM auth.users 
  WHERE id = auth.uid() AND role = 'admin'
));
