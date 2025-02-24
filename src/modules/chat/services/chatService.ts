import { getResolvedPrompt } from '@/config/prompts/chatAgentPrompt'
import { Message, ApiMessage, MessageRole } from '../types/message'

export class ChatService {
  private messages: ApiMessage[] = []
  private apiUrl = 'https://api.deepseek.com/v1/chat/completions'
  private apiKey: string

  constructor() {
    this.initializeChat()
    const apiKey = process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY
    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY não está configurada no .env.local')
    }
    this.apiKey = apiKey
  }

  private async initializeChat() {
    const systemPrompt = await getResolvedPrompt()
    this.messages = [
      { role: 'system', content: systemPrompt }
    ]
  }

  async retrieveHistory(userId: string): Promise<Message[]> {
    try {
      const response = await fetch(`/api/chat?userId=${userId}`)
      if (!response.ok) {
        throw new Error('Erro ao recuperar histórico')
      }

      const messages = await response.json()
      return messages.map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        role: msg.role as MessageRole,
        createdAt: msg.created_at,
        userId: msg.user_id
      }))
    } catch (error) {
      console.error('Erro ao recuperar histórico do chat:', error)
      throw error
    }
  }

  async saveMessage(message: Omit<Message, 'id'>): Promise<Message> {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: message.content, userId: message.userId })
      })

      if (!response.ok) {
        throw new Error('Erro ao salvar mensagem')
      }

      const savedMessage = await response.json()
      return {
        id: savedMessage.id,
        content: savedMessage.content,
        role: savedMessage.role as MessageRole,
        createdAt: savedMessage.created_at,
        userId: savedMessage.user_id
      }
    } catch (error) {
      console.error('Erro ao salvar mensagem:', error)
      throw error
    }
  }

  async clearHistory(userId: string): Promise<void> {
    try {
      const response = await fetch(`/api/chat?userId=${userId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Erro ao limpar histórico')
      }
    } catch (error) {
      console.error('Erro ao limpar histórico:', error)
      throw error
    }
  }

  async sendMessage(content: string, userId: string): Promise<Message> {
    // Salvar mensagem do usuário
    const userMessage = await this.saveMessage({
      content,
      role: 'user',
      userId
    })

    try {
      // Preparar mensagens para a API
      const apiMessages = [
        ...this.messages,
        { role: 'user', content }
      ]

      // Fazer requisição para a API
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          messages: apiMessages,
          model: 'deepseek-chat',
          temperature: 0.7,
          max_tokens: 2000
        })
      })

      if (!response.ok) {
        throw new Error('Erro na resposta da API')
      }

      const data = await response.json()
      const assistantResponse = data.choices[0].message.content

      // Salvar resposta do assistente
      const assistantMessage = await this.saveMessage({
        content: assistantResponse,
        role: 'assistant',
        userId
      })

      return assistantMessage
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      throw error
    }
  }
}
