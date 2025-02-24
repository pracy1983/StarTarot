-- Atualizar a estrutura da tabela users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS admin_role VARCHAR(50),
  ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_online TIMESTAMP,
  ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_consultation TIMESTAMP,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Renomear colunas para seguir o padrão snake_case
ALTER TABLE users
  RENAME COLUMN isAdmin TO is_admin;

-- Atualizar a senha do usuário admin para teste
UPDATE users 
SET password = 'adm@123'
WHERE email = 'paularacy@gmail.com';
