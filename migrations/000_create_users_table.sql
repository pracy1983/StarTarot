-- Criar tabela de usuários
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  is_admin BOOLEAN DEFAULT FALSE,
  admin_role VARCHAR(50),
  is_online BOOLEAN DEFAULT FALSE,
  last_online TIMESTAMP,
  credits INTEGER DEFAULT 0,
  last_consultation TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar usuário admin inicial
INSERT INTO users (email, password, name, is_admin)
VALUES ('paularacy@gmail.com', 'adm@123', 'Paula Racy', true)
ON CONFLICT (email) DO NOTHING;
