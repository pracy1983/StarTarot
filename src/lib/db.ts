// @ts-nocheck
import { Pool } from 'pg'

// Tentar usar variáveis separadas primeiro, depois cair para URL completa
const user = process.env.POSTGRES_USER || 'postgres'
const password = process.env.POSTGRES_PASSWORD
const host = process.env.POSTGRES_HOST || 'easypanel.server.pracy.com.br'
const database = process.env.POSTGRES_DB || 'tarot_db'
const port = parseInt(process.env.POSTGRES_PORT || '5432')

console.log('Tentando conectar ao banco de dados...')
console.log('Host:', host)
console.log('Database:', database)
console.log('User:', user)

if (!password) {
  console.error('POSTGRES_PASSWORD não está definido')
  throw new Error('POSTGRES_PASSWORD não está definido')
}

const pool = new Pool({
  user,
  password,
  host,
  port,
  database,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: false
})

pool.on('connect', () => {
  console.log('Conexão com o banco de dados estabelecida')
})

pool.on('error', (err) => {
  console.error('Erro na conexão com o banco de dados:', err)
})

// Testar a conexão
pool.query('SELECT NOW()')
  .then(() => console.log('Conexão com o banco de dados testada com sucesso'))
  .catch(err => console.error('Erro ao testar conexão com o banco:', err))

export default pool

// Helper para executar queries
export async function query(text: string, params?: any[]) {
  const start = Date.now()
  try {
    const res = await pool.query(text, params)
    const duration = Date.now() - start
    console.log('Query executada:', { text, duration, rows: res.rowCount })
    return res
  } catch (error) {
    console.error('Erro ao executar query:', error)
    throw error
  }
}
