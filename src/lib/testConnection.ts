import { pool } from './db'

async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW()')
    console.log('Conexão com o banco de dados testada com sucesso:', result.rows[0])
    return true
  } catch (error) {
    console.error('Erro ao testar conexão com o banco:', error)
    return false
  }
}

export default testConnection
