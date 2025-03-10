// Script para verificar a estrutura do banco de dados
const { Pool } = require('pg');
require('dotenv').config();

const user = process.env.POSTGRES_USER || 'postgres';
const password = process.env.POSTGRES_PASSWORD;
const host = process.env.POSTGRES_HOST || 'easypanel.server.pracy.com.br';
const database = process.env.POSTGRES_DB || 'tarot_db';
const port = parseInt(process.env.POSTGRES_PORT || '5432');

console.log('Conectando ao banco de dados...');
console.log('Host:', host);
console.log('Database:', database);
console.log('User:', user);

const pool = new Pool({
  user,
  password,
  host,
  port,
  database,
  ssl: false
});

async function checkDatabaseStructure() {
  try {
    // Verificar tabelas existentes
    console.log('\n=== TABELAS EXISTENTES ===');
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('Tabelas encontradas:', tablesResult.rows.length);
    tablesResult.rows.forEach(row => {
      console.log(`- ${row.table_name}`);
    });

    // Verificar estrutura da tabela users
    console.log('\n=== ESTRUTURA DA TABELA USERS ===');
    const usersStructure = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    usersStructure.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})${col.column_default ? ' DEFAULT ' + col.column_default : ''}`);
    });

    // Verificar estrutura da tabela de mensagens
    console.log('\n=== ESTRUTURA DA TABELA DE MENSAGENS ===');
    const messagesTable = tablesResult.rows.find(row => 
      row.table_name === 'chat_messages' || row.table_name === 'messages'
    );
    
    if (messagesTable) {
      const messagesStructure = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = '${messagesTable.table_name}'
        ORDER BY ordinal_position
      `);
      
      console.log(`Tabela encontrada: ${messagesTable.table_name}`);
      messagesStructure.rows.forEach(col => {
        console.log(`- ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})${col.column_default ? ' DEFAULT ' + col.column_default : ''}`);
      });
    } else {
      console.log('Nenhuma tabela de mensagens encontrada!');
    }

    // Verificar constraints e chaves estrangeiras
    console.log('\n=== CONSTRAINTS E CHAVES ESTRANGEIRAS ===');
    const constraintsResult = await pool.query(`
      SELECT
        tc.constraint_name,
        tc.table_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM
        information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        LEFT JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE
        tc.table_schema = 'public'
        AND tc.constraint_type IN ('FOREIGN KEY', 'PRIMARY KEY')
      ORDER BY
        tc.table_name,
        tc.constraint_type
    `);
    
    constraintsResult.rows.forEach(constraint => {
      if (constraint.constraint_type === 'PRIMARY KEY') {
        console.log(`- ${constraint.table_name}: PK em ${constraint.column_name}`);
      } else {
        console.log(`- ${constraint.table_name}: FK ${constraint.column_name} -> ${constraint.foreign_table_name}.${constraint.foreign_column_name}`);
      }
    });

  } catch (error) {
    console.error('Erro ao verificar estrutura do banco de dados:', error);
  } finally {
    await pool.end();
  }
}

checkDatabaseStructure();
