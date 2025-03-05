import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function GET() {
  try {
    // Migration 1: Atualizar tabela de usuários
    await pool.query(`
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
        RENAME COLUMN IF EXISTS isAdmin TO is_admin;

      -- Atualizar a senha do usuário admin para teste
      UPDATE users 
      SET password = 'adm@123'
      WHERE email = 'paularacy@gmail.com';
    `)

    // Migration 2: Criar tabela de mensagens do chat
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        role VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    return NextResponse.json({ message: 'Migração executada com sucesso' })
  } catch (error) {
    console.error('Erro ao executar migração:', error)
    return NextResponse.json(
      { error: 'Erro ao executar migração' },
      { status: 500 }
    )
  }
}
