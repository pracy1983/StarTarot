-- Criação da tabela de consultas
CREATE TABLE consultations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  oraculista_id UUID REFERENCES oraculistas(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  messages JSONB DEFAULT '[]'::jsonb
);

-- Habilitar RLS
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Usuários podem ver suas próprias consultas"
ON consultations
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar consultas"
ON consultations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas consultas"
ON consultations
FOR UPDATE
USING (auth.uid() = user_id);

-- Índices para melhorar performance
CREATE INDEX idx_consultations_user_id ON consultations(user_id);
CREATE INDEX idx_consultations_status ON consultations(status);
