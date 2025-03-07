import { getResolvedPrompt } from '@/config/prompts/chatAgentPrompt'
import { Message, ApiMessage, MessageRole, DatabaseMessage } from '../types/message'

export class ChatService {
  private messages: ApiMessage[] = []
  private apiUrl = 'https://api.deepseek.com/v1/chat/completions'
  private apiKey: string
  private baseUrl: string

  constructor() {
    this.initializeChat()
    const apiKey = process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY
    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY não está configurada no .env.local')
    }
    this.apiKey = apiKey
    
    // Usar a origem atual do navegador ou um fallback para localhost
    // Verificar se estamos em desenvolvimento e usar a porta 3001 se necessário
    if (typeof window !== 'undefined') {
      this.baseUrl = window.location.origin;
    } else {
      // Em ambiente de servidor, verificar se estamos em desenvolvimento
      const isDev = process.env.NODE_ENV === 'development';
      this.baseUrl = process.env.NEXT_PUBLIC_APP_URL || (isDev ? 'http://localhost:3001' : 'http://localhost:3000');
    }
    
    console.log('ChatService - URL base:', this.baseUrl)
  }

  private async initializeChat() {
    try {
      const systemPrompt = await getResolvedPrompt()
      this.messages = [
        { role: 'system', content: systemPrompt }
      ]
    } catch (error) {
      console.error('ChatService - Erro ao inicializar chat:', error)
      // Fallback para um prompt básico em caso de erro
      this.messages = [
        { role: 'system', content: 'Você é Priscila, uma atendente simpática do StarTarot.' }
      ]
    }
  }

  async retrieveHistory(userId: string): Promise<Message[]> {
    try {
      console.log(`ChatService - Recuperando histórico para userId: ${userId}`)
      const response = await fetch(`${this.baseUrl}/api/chat?userId=${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        cache: 'no-store', // Evita cache para sempre obter dados atualizados
        mode: 'cors',
        credentials: 'omit'
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`ChatService - Erro ao recuperar histórico: ${response.status}`, errorText)
        throw new Error('Erro ao recuperar histórico')
      }

      const messages = await response.json()
      console.log(`ChatService - Histórico recuperado: ${messages.length} mensagens`)
      
      return messages.map((msg: DatabaseMessage) => ({
        id: msg.id,
        content: msg.content,
        role: msg.role,
        timestamp: msg.created_at
      }))
    } catch (error) {
      console.error('ChatService - Erro ao recuperar histórico do chat:', error)
      throw error
    }
  }

  async saveMessage(message: ApiMessage & { userId: string }): Promise<Message> {
    try {
      console.log(`ChatService - Salvando mensagem: ${message.role} para userId: ${message.userId}`)
      
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        mode: 'cors',
        credentials: 'omit',
        body: JSON.stringify({
          content: message.content,
          role: message.role,
          userId: message.userId
        })
      })

      if (!response.ok) {
        const errorData = await response.text()
        console.error(`ChatService - Resposta da API: ${response.status}`, errorData)
        throw new Error(`Erro ao salvar mensagem: ${response.status}`)
      }

      const savedMessage = await response.json()
      
      return {
        id: savedMessage.id,
        content: savedMessage.content,
        role: savedMessage.role,
        timestamp: savedMessage.created_at
      }
    } catch (error) {
      console.error('ChatService - Erro ao salvar mensagem:', error)
      throw error
    }
  }

  async clearHistory(userId: string): Promise<void> {
    try {
      console.log(`ChatService - Limpando histórico para userId: ${userId}`)
      const response = await fetch(`${this.baseUrl}/api/chat?userId=${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        mode: 'cors',
        credentials: 'omit'
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`ChatService - Erro ao limpar histórico: ${response.status}`, errorText)
        throw new Error('Erro ao limpar histórico')
      }
      
      console.log('ChatService - Histórico limpo com sucesso')
    } catch (error) {
      console.error('ChatService - Erro ao limpar histórico:', error)
      throw error
    }
  }

  async sendMessage(content: string, userId: string): Promise<Message> {
    try {
      console.log(`ChatService - Enviando mensagem para userId: ${userId}`)
      
      // Salva a mensagem do usuário diretamente na API do chat
      // Isso evita fazer chamadas separadas para a API DeepSeek
      const userMessage = await this.saveMessage({
        content,
        role: 'user',
        userId
      })

      // Adiciona a mensagem do usuário ao contexto local
      this.messages.push({
        role: 'user',
        content
      })

      // A API do backend já processará a resposta do assistente
      // Não precisamos fazer a chamada direta para a API DeepSeek aqui
      // Isso reduz a duplicação de chamadas e melhora a performance

      // Aguarda a resposta do assistente
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos de timeout
      
      try {
        // Aguarda um curto período para dar tempo da API processar a mensagem
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Busca as últimas mensagens para obter a resposta do assistente
        const history = await this.retrieveHistory(userId);
        clearTimeout(timeoutId);
        
        // A última mensagem deve ser a resposta do assistente
        const assistantMessage = history[history.length - 1];
        
        if (assistantMessage && assistantMessage.role === 'assistant') {
          // Adiciona a resposta do assistente ao contexto local
          this.messages.push({
            role: 'assistant',
            content: assistantMessage.content
          });
          
          return assistantMessage;
        } else {
          throw new Error('Não foi possível obter a resposta do assistente');
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.error('ChatService - Timeout ao aguardar resposta do assistente');
          throw new Error('Timeout ao aguardar resposta do assistente');
        }
        throw fetchError;
      }
    } catch (error) {
      console.error('ChatService - Erro ao enviar mensagem:', error)
      throw error
    }
  }
}
