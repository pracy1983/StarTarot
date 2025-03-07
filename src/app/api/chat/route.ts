import { NextResponse } from 'next/server'
import { getResolvedPrompt } from '@/config/prompts/chatAgentPrompt'
import { query } from '@/lib/db'

// Armazenamento temporário em memória para mensagens
interface ChatMessage {
  id: string;
  content: string;
  role: string;
  user_id: string;
  created_at: string;
}

// Mapa de usuários para mensagens
const messageStore: Record<string, ChatMessage[]> = {};

// Função auxiliar para adicionar cabeçalhos CORS
function corsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}

// Lidar com requisições OPTIONS (preflight)
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 })
  return corsHeaders(response)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return corsHeaders(NextResponse.json({ error: 'UserId é obrigatório' }, { status: 400 }))
  }

  try {
    // Tentar recuperar mensagens do banco de dados
    try {
      const result = await query('SELECT * FROM messages WHERE user_id = $1 ORDER BY created_at ASC', [userId])
      const messages = result.rows
      console.log(`API Chat - Recuperadas ${messages.length} mensagens para o usuário ${userId}`)
      return corsHeaders(NextResponse.json(messages))
    } catch (dbError) {
      console.error('Erro ao recuperar mensagens do banco de dados:', dbError)
      
      // Fallback para o armazenamento em memória
      const messages = messageStore[userId] || [];
      console.log(`API Chat - Usando fallback em memória: ${messages.length} mensagens para o usuário ${userId}`)
      return corsHeaders(NextResponse.json(messages))
    }
  } catch (error) {
    console.error('Erro ao recuperar histórico do chat:', error)
    return corsHeaders(NextResponse.json(
      { error: 'Erro ao recuperar histórico' },
      { status: 200 } // Retornar 200 mesmo com erro para evitar quebrar o cliente
    ))
  }
}

export async function POST(request: Request) {
  try {
    console.log('API Chat - Recebida requisição POST')
    
    // Verificar se o corpo da requisição é válido
    const body = await request.json().catch(e => {
      console.error('Erro ao fazer parse do JSON:', e)
      throw new Error('JSON inválido')
    })
    
    console.log('API Chat - Corpo da requisição:', body)
    
    const { content, role = 'user', userId } = body

    if (!content) {
      console.error('API Chat - Content não fornecido')
      return corsHeaders(NextResponse.json(
        { error: 'Content é obrigatório' },
        { status: 400 }
      ))
    }
    
    if (!userId) {
      console.error('API Chat - UserId não fornecido')
      return corsHeaders(NextResponse.json(
        { error: 'UserId é obrigatório' },
        { status: 400 }
      ))
    }

    console.log(`API Chat - Processando mensagem de ${role} com userId ${userId}`)

    // Salvar mensagem no banco de dados ou no armazenamento em memória
    try {
      console.log(`API Chat - Salvando mensagem do ${role} com userId ${userId}`)
      
      // Criar a mensagem
      let newMessage: ChatMessage;
      
      try {
        // Tentar salvar no banco de dados
        const timestamp = new Date().toISOString();
        const result = await query(
          'INSERT INTO messages (content, role, user_id, created_at) VALUES ($1, $2, $3, $4) RETURNING *',
          [content, role, userId, timestamp]
        );
        
        newMessage = {
          id: result.rows[0].id,
          content: result.rows[0].content,
          role: result.rows[0].role,
          user_id: result.rows[0].user_id,
          created_at: result.rows[0].created_at
        };
      } catch (dbError) {
        console.error('Erro ao salvar mensagem no banco de dados, usando fallback em memória:', dbError)
        
        // Fallback para armazenamento em memória
        newMessage = {
          id: Date.now().toString(),
          content,
          role,
          user_id: userId,
          created_at: new Date().toISOString()
        };
        
        // Inicializar o array de mensagens para o usuário se não existir
        if (!messageStore[userId]) {
          messageStore[userId] = [];
        }
        
        // Adicionar a mensagem ao armazenamento em memória
        messageStore[userId].push(newMessage);
      }
      
      console.log('API Chat - Mensagem salva com sucesso:', newMessage)

      // Se não for uma mensagem do usuário, apenas retornamos a mensagem salva
      if (role !== 'user') {
        return corsHeaders(NextResponse.json(newMessage))
      }

      // Preparar mensagens para a API DeepSeek
      console.log('API Chat - Preparando mensagens para a API DeepSeek')
      let systemPrompt;
      try {
        systemPrompt = await getResolvedPrompt();
      } catch (promptError) {
        console.error('Erro ao obter prompt resolvido, usando fallback:', promptError);
        systemPrompt = 'Você é Priscila, uma atendente simpática do StarTarot. Você ajuda os clientes com informações sobre serviços de tarot.';
      }
      
      const apiMessages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content }
      ]

      // Verificar se a chave da API está configurada
      const apiKey = process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY
      if (!apiKey) {
        console.error('API Chat - DEEPSEEK_API_KEY não está configurada')
        throw new Error('DEEPSEEK_API_KEY não está configurada')
      }

      // Fazer requisição para a API DeepSeek com timeout
      console.log('API Chat - Enviando requisição para a API DeepSeek')
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos de timeout
      
      try {
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            messages: apiMessages,
            model: 'deepseek-chat',
            temperature: 0.7,
            max_tokens: 1000 // Reduzido para melhorar o tempo de resposta
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        // Verificar se a resposta da API DeepSeek é válida
        if (!response.ok) {
          const errorText = await response.text()
          console.error(`API Chat - Erro na resposta da API DeepSeek: ${response.status}`, errorText)
          throw new Error(`Erro na resposta da API DeepSeek: ${response.status}`)
        }

        // Processar a resposta da API DeepSeek
        console.log('API Chat - Processando resposta da API DeepSeek')
        const data = await response.json()
        const assistantResponse = data.choices[0].message.content

        // Salvar resposta do assistente no banco de dados ou no armazenamento em memória
        console.log('API Chat - Salvando resposta do assistente')
        let assistantMessage: ChatMessage;
        
        try {
          // Tentar salvar no banco de dados
          const timestamp = new Date().toISOString();
          const result = await query(
            'INSERT INTO messages (content, role, user_id, created_at) VALUES ($1, $2, $3, $4) RETURNING *',
            [assistantResponse, 'assistant', userId, timestamp]
          );
          
          assistantMessage = {
            id: result.rows[0].id,
            content: result.rows[0].content,
            role: result.rows[0].role,
            user_id: result.rows[0].user_id,
            created_at: result.rows[0].created_at
          };
        } catch (dbError) {
          console.error('Erro ao salvar resposta do assistente no banco de dados, usando fallback em memória:', dbError)
          
          // Fallback para armazenamento em memória
          assistantMessage = {
            id: Date.now().toString(),
            content: assistantResponse,
            role: 'assistant',
            user_id: userId,
            created_at: new Date().toISOString()
          };
          
          // Adicionar a mensagem ao armazenamento em memória
          if (messageStore[userId]) {
            messageStore[userId].push(assistantMessage);
          }
        }

        console.log('API Chat - Resposta do assistente salva com sucesso')
        return corsHeaders(NextResponse.json(assistantMessage))
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.error('API Chat - Timeout ao aguardar resposta da API DeepSeek');
          throw new Error('Timeout ao aguardar resposta da API DeepSeek');
        }
        throw fetchError;
      }
    } catch (error) {
      console.error('API Chat - Erro ao processar mensagem:', error)
      return corsHeaders(NextResponse.json(
        { error: 'Erro ao processar mensagem', details: error.message },
        { status: 500 }
      ))
    }
  } catch (error) {
    console.error('API Chat - Erro ao processar mensagem:', error)
    return corsHeaders(NextResponse.json(
      { error: 'Erro ao processar mensagem', details: error.message },
      { status: 500 }
    ))
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return corsHeaders(NextResponse.json({ error: 'UserId é obrigatório' }, { status: 400 }))
  }

  try {
    // Tentar limpar mensagens do banco de dados
    try {
      await query('DELETE FROM messages WHERE user_id = $1', [userId])
    } catch (dbError) {
      console.error('Erro ao limpar mensagens do banco de dados:', dbError)
    }
    
    // Limpar também do armazenamento em memória
    messageStore[userId] = [];
    
    console.log(`API Chat - Histórico limpo para o usuário ${userId}`)
    return corsHeaders(NextResponse.json({ message: 'Histórico limpo com sucesso' }))
  } catch (error) {
    console.error('Erro ao limpar histórico do chat:', error)
    return corsHeaders(NextResponse.json(
      { error: 'Erro ao limpar histórico', details: error.message },
      { status: 500 }
    ))
  }
}
