-- Add visibilidade column to mensagens table
ALTER TABLE mensagens
ADD COLUMN visibilidade TEXT NOT NULL DEFAULT 'publica';

-- Create enum type for visibilidade
CREATE TYPE visibilidade_tipo AS ENUM ('publica', 'privada');

-- Update column to use enum type
ALTER TABLE mensagens
ALTER COLUMN visibilidade TYPE visibilidade_tipo USING visibilidade::visibilidade_tipo;

-- Update existing messages to be public
UPDATE mensagens SET visibilidade = 'publica';
