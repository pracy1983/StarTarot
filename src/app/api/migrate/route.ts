import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { Client } from 'pg'

export async function GET() {
  try {
    console.log('Iniciando migração...')

    // Primeiro, conectar ao banco postgres para criar o banco tarot_db se não existir
    const client = new Client({
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      host: process.env.POSTGRES_HOST,
      port: Number(process.env.POSTGRES_PORT),
      database: 'postgres' // Conectar ao banco postgres primeiro
    })

    try {
      await client.connect()
      
      // Verificar se o banco tarot_db existe
      const dbResult = await client.query(`
        SELECT 1 FROM pg_database WHERE datname = 'tarot_db'
      `)

      if (dbResult.rows.length === 0) {
        console.log('Criando banco de dados tarot_db...')
        await client.query('CREATE DATABASE tarot_db')
        console.log('Banco de dados tarot_db criado com sucesso!')
      } else {
        console.log('Banco de dados tarot_db já existe')
      }
    } catch (error) {
      console.error('Erro ao verificar/criar banco de dados:', error)
      throw error
    } finally {
      await client.end()
    }

    // Migration 1: Criar extensão pgcrypto para gen_random_uuid()
    console.log('Criando extensão pgcrypto...')
    try {
      await pool.query(`
        CREATE EXTENSION IF NOT EXISTS pgcrypto;
      `)
    } catch (error) {
      console.error('Erro ao criar extensão pgcrypto:', error)
      throw error
    }

    // Migration 2: Criar ou atualizar tabela de usuários
    console.log('Criando/atualizando tabela de usuários...')
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          email VARCHAR(255) NOT NULL UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          name VARCHAR(255),
          is_admin BOOLEAN DEFAULT FALSE,
          admin_role VARCHAR(50),
          is_online BOOLEAN DEFAULT FALSE,
          last_online TIMESTAMP,
          credits INTEGER DEFAULT 0,
          last_consultation TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          phone_country_code VARCHAR(5),
          phone_area_code VARCHAR(3),
          phone_number VARCHAR(15),
          birth_date DATE,
          coupon_code VARCHAR(50),
          email_verified BOOLEAN DEFAULT FALSE,
          verification_code VARCHAR(6),
          verification_code_expires_at TIMESTAMP
        );

        -- Criar usuário admin inicial
        INSERT INTO users (
          email, 
          password_hash, 
          name, 
          is_admin, 
          admin_role,
          credits,
          email_verified,
          phone_country_code,
          phone_area_code,
          phone_number,
          birth_date
        )
        VALUES (
          'paularacy@gmail.com',
          'adm@123',
          'Admin',
          true,
          'super_admin',
          1000,
          true,
          '+55',
          '11',
          '986224808',
          '1983-12-04'
        )
        ON CONFLICT (email) DO NOTHING;
      `)

      // Verificar se o usuário foi criado
      const userResult = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        ['paularacy@gmail.com']
      )
      console.log('Usuário admin:', userResult.rows[0])

    } catch (error) {
      console.error('Erro ao criar tabela de usuários:', error)
      throw error
    }

    // Migration 3: Criar tabela de mensagens do chat
    console.log('Criando tabela de mensagens do chat...')
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS chat_messages (
          id SERIAL PRIMARY KEY,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          role VARCHAR(20) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `)
    } catch (error) {
      console.error('Erro ao criar tabela de mensagens do chat:', error)
      throw error
    }

    // Migration 4: Criar tabela de oraculistas
    console.log('Criando tabela de oraculistas...')
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS oraculistas (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          nome VARCHAR(255) NOT NULL UNIQUE,
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
      `)
    } catch (error) {
      console.error('Erro ao criar tabela de oraculistas:', error)
      throw error
    }

    console.log('Migração concluída com sucesso!')
    return NextResponse.json({ message: 'Migração executada com sucesso' })
  } catch (error) {
    console.error('Erro ao executar migração:', error)
    return NextResponse.json(
      { error: 'Erro ao executar migração', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
