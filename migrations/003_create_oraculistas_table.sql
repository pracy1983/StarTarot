-- Criar tabela de oraculistas
CREATE TABLE IF NOT EXISTS oraculistas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  disponivel BOOLEAN DEFAULT true,
  valor_consulta DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserir oraculista inicial
INSERT INTO oraculistas (nome, descricao, disponivel, valor_consulta)
VALUES ('Paula Racy', 'Oraculista experiente em Tarot', true, 50.00)
ON CONFLICT (nome) DO NOTHING;
