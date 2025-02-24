import pool from './db'

async function testConnection() {
  try {
    const client = await pool.connect()
    console.log('Conexão com o PostgreSQL estabelecida com sucesso!')
    const result = await client.query('SELECT NOW()')
    console.log('Teste de query:', result.rows[0])
    client.release()
  } catch (err) {
    console.error('Erro ao conectar com o PostgreSQL:', err)
  } finally {
    await pool.end()
  }
}

testConnection()
