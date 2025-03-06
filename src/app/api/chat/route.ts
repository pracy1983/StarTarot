import { NextResponse } from 'next/server'
import { getResolvedPrompt } from '@/config/prompts/chatAgentPrompt'

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
    // Recuperar mensagens do armazenamento em memória
    const messages = messageStore[userId] || [];
    console.log(`API Chat - Recuperadas ${messages.length} mensagens para o usuário ${userId}`)
    
    return corsHeaders(NextResponse.json(messages))
  } catch (error) {
    console.error('Erro ao recuperar histórico do chat:', error)
    return corsHeaders(NextResponse.json(
      { error: 'Erro ao recuperar histórico' },
      { status: 500 }
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

    // Salvar mensagem no armazenamento em memória
    try {
      console.log(`API Chat - Salvando mensagem do ${role} com userId ${userId}`)
      
      // Criar a mensagem
      const newMessage: ChatMessage = {
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
      
      // Adicionar a mensagem ao armazenamento
      messageStore[userId].push(newMessage);
      
      console.log('API Chat - Mensagem salva com sucesso:', newMessage)

      // Se não for uma mensagem do usuário, apenas retornamos a mensagem salva
      if (role !== 'user') {
        return corsHeaders(NextResponse.json(newMessage))
      }

      // Preparar mensagens para a API DeepSeek
      console.log('API Chat - Preparando mensagens para a API DeepSeek')
      const systemPrompt = await getResolvedPrompt()
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

        // Salvar resposta do assistente no armazenamento em memória
        console.log('API Chat - Salvando resposta do assistente')
        const assistantMessage: ChatMessage = {
          id: Date.now().toString(),
          content: assistantResponse,
          role: 'assistant',
          user_id: userId,
          created_at: new Date().toISOString()
        };
        
        // Adicionar a mensagem ao armazenamento
        messageStore[userId].push(assistantMessage);

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
    // Limpar mensagens do usuário do armazenamento em memória
    messageStore[userId] = [];
    console.log(`API Chat - Histórico limpo para o usuário ${userId}`)
    
    return corsHeaders(NextResponse.json({ success: true }))
  } catch (error) {
    console.error('Erro ao limpar histórico:', error)
    return corsHeaders(NextResponse.json(
      { error: 'Erro ao limpar histórico' },
      { status: 500 }
    ))
  }
}
