import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

// Dados de fallback para quando o banco de dados estiver indisponível
const fallbackOraculistas = [
  {
    id: '1',
    nome: 'Priscila (Fallback)',
    descricao: 'Oraculista especializada em tarot',
    disponivel: true,
    preco: 50
  },
  {
    id: '2',
    nome: 'Carlos (Fallback)',
    descricao: 'Especialista em runas',
    disponivel: true,
    preco: 45
  }
];

// Função auxiliar para adicionar cabeçalhos CORS
function corsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}

// Lidar com requisições OPTIONS (preflight)
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 })
  return corsHeaders(response)
}

export async function GET() {
  try {
    console.log('API Prompts Variables - Buscando oraculistas disponíveis')
    
    try {
      // Tentar buscar do banco de dados
      const result = await query(
        'SELECT * FROM oraculistas WHERE disponivel = true ORDER BY nome'
      )
      
      console.log(`API Prompts Variables - Encontrados ${result.rows.length} oraculistas disponíveis`)
      return corsHeaders(NextResponse.json(result.rows))
    } catch (dbError) {
      console.error('Erro ao buscar oraculistas do banco de dados, usando dados de fallback:', dbError)
      
      // Usar dados de fallback
      console.log(`API Prompts Variables - Usando ${fallbackOraculistas.length} oraculistas de fallback`)
      return corsHeaders(NextResponse.json(fallbackOraculistas))
    }
  } catch (error) {
    console.error('Erro ao buscar variáveis de prompt:', error)
    
    // Mesmo com erro, retornar dados de fallback para não quebrar o cliente
    console.log('API Prompts Variables - Erro geral, usando dados de fallback')
    return corsHeaders(NextResponse.json(fallbackOraculistas))
  }
}
