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
    
    // Usar a porta 3001, que é onde o servidor Next.js está rodando
    this.baseUrl = 'http://localhost:3001'
    console.log('ChatService - URL base:', this.baseUrl)
  }

  private async initializeChat() {
    const systemPrompt = await getResolvedPrompt()
    this.messages = [
      { role: 'system', content: systemPrompt }
    ]
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
      console.log('ChatService - Conteúdo da mensagem:', message.content.substring(0, 50) + '...')
      
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
      console.log('ChatService - Mensagem salva com sucesso:', savedMessage)
      
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
      console.log('ChatService - Conteúdo da mensagem:', content)
      
      // Salva a mensagem do usuário
      const userMessage = await this.saveMessage({
        content,
        role: 'user',
        userId
      })

      // Adiciona a mensagem do usuário ao contexto
      this.messages.push({
        role: 'user',
        content
      })

      // Faz a chamada para a API do DeepSeek
      console.log('ChatService - Fazendo chamada para a API DeepSeek')
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          messages: this.messages,
          model: 'deepseek-chat',
          temperature: 0.7,
          max_tokens: 1000
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`ChatService - Erro ao obter resposta do DeepSeek: ${response.status}`, errorText)
        throw new Error('Erro ao obter resposta do DeepSeek')
      }

      console.log('ChatService - Resposta recebida da API DeepSeek')
      const data = await response.json()
      const assistantContent = data.choices[0].message.content

      // Salva a resposta do assistente
      console.log('ChatService - Salvando resposta do assistente')
      const assistantMessage = await this.saveMessage({
        content: assistantContent,
        role: 'assistant',
        userId
      })

      // Adiciona a resposta do assistente ao contexto
      this.messages.push({
        role: 'assistant',
        content: assistantContent
      })

      console.log('ChatService - Mensagem processada com sucesso')
      return assistantMessage
    } catch (error) {
      console.error('ChatService - Erro ao enviar mensagem:', error)
      throw error
    }
  }
}
