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

// Verificar se estamos em ambiente de desenvolvimento
const isDev = process.env.NODE_ENV === 'development'

// Criar um pool com configurações diferentes para desenvolvimento e produção
export const pool = new Pool({
  user,
  password: password || (isDev ? 'postgres' : ''),
  host,
  port,
  database,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000, // Aumentado para 5 segundos
  ssl: false
})

// Flag para controlar o estado da conexão
let isDbConnected = false

pool.on('connect', () => {
  console.log('Conexão com o banco de dados estabelecida')
  isDbConnected = true
})

pool.on('error', (err) => {
  console.error('Erro na conexão com o banco de dados:', err)
  isDbConnected = false
})

// Testar a conexão
pool.query('SELECT NOW()')
  .then(() => {
    console.log('Conexão com o banco de dados testada com sucesso')
    isDbConnected = true
  })
  .catch(err => {
    console.error('Erro ao testar conexão com o banco:', err)
    isDbConnected = false
  })

// Helper para executar queries com fallback para dados em memória quando o banco estiver indisponível
export async function query(text: string, params?: any[]) {
  const start = Date.now()
  
  // Se estamos em desenvolvimento e a conexão falhou, podemos usar dados em memória para testes
  if (!isDbConnected && isDev) {
    return handleQueryWithFallback(text, params)
  }
  
  try {
    const res = await pool.query(text, params)
    const duration = Date.now() - start
    console.log('Query executada', { text, duration, rows: res.rowCount })
    return res
  } catch (error) {
    console.error('Erro ao executar query:', error)
    
    // Se estamos em desenvolvimento, usar fallback
    if (isDev) {
      return handleQueryWithFallback(text, params)
    }
    
    throw error
  }
}

// Função para lidar com queries quando o banco de dados está indisponível
function handleQueryWithFallback(text: string, params?: any[]) {
  console.log('Usando fallback para query:', text)
  
  // Verificar o tipo de query para fornecer dados simulados apropriados
  if (text.includes('SELECT * FROM messages WHERE user_id')) {
    // Retornar mensagens simuladas para o chat
    return {
      rows: [],
      rowCount: 0
    }
  } else if (text.includes('INSERT INTO messages')) {
    // Simular inserção de mensagem
    const now = new Date().toISOString()
    return {
      rows: [{
        id: Date.now().toString(),
        content: params?.[0] || 'Mensagem simulada',
        role: params?.[1] || 'user',
        user_id: params?.[2] || 'user-simulado',
        created_at: now
      }],
      rowCount: 1
    }
  } else if (text.includes('SELECT * FROM oraculistas')) {
    // Retornar oraculistas simulados
    return {
      rows: [
        {
          id: '1',
          nome: 'Priscila (Simulado)',
          descricao: 'Oraculista especializada em tarot',
          disponivel: true,
          preco: 50
        },
        {
          id: '2',
          nome: 'Carlos (Simulado)',
          descricao: 'Especialista em runas',
          disponivel: true,
          preco: 45
        }
      ],
      rowCount: 2
    }
  }
  
  // Para outras queries, retornar um resultado vazio
  return {
    rows: [],
    rowCount: 0
  }
}
