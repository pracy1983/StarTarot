const { Pool } = require('pg')

const pool = new Pool({
  user: 'postgres',
  password: '123qwe123',
  host: 'easypanel.server.pracy.com.br',
  port: 5432,
  database: 'tarot_db',  // Agora usando o banco correto
  ssl: false
})

async function testConnection() {
  try {
    const client = await pool.connect()
    console.log('✅ Conexão com o banco tarot_db estabelecida com sucesso!')
    
    // Testar se as tabelas foram criadas
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `)
    console.log('📊 Tabelas encontradas:', tables.rows.map(row => row.table_name))
    
    client.release()
  } catch (err) {
    console.error('❌ Erro ao conectar com o PostgreSQL:', err)
  } finally {
    await pool.end()
  }
}

testConnection()
