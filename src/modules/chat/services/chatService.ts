import { getResolvedPrompt } from '@/config/prompts/chatAgentPrompt'
import { Message, ApiMessage, MessageRole, DatabaseMessage } from '../types/message'

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
      return messages.map((msg: DatabaseMessage) => ({
        id: msg.id,
        content: msg.content,
        role: msg.role,
        timestamp: msg.created_at
      }))
    } catch (error) {
      console.error('Erro ao recuperar histórico do chat:', error)
      throw error
    }
  }

  async saveMessage(message: ApiMessage & { userId: string }): Promise<Message> {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: message.content,
          role: message.role,
          userId: message.userId
        })
      })

      if (!response.ok) {
        const errorData = await response.text()
        console.error('Resposta da API:', response.status, errorData)
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
    try {
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

      // A API agora processa a resposta do DeepSeek automaticamente
      // e retorna a mensagem do assistente já salva
      return userMessage
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      throw error
    }
  }
}
