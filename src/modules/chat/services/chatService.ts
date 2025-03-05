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

  async saveMessage(message: ApiMessage & { user_id: string }): Promise<Message> {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: message.content,
          role: message.role,
          user_id: message.user_id
        })
      })

      if (!response.ok) {
        throw new Error('Erro ao salvar mensagem')
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
        user_id: userId
      })

      // Adiciona a mensagem do usuário ao contexto
      this.messages.push({
        role: 'user',
        content
      })

      // Faz a chamada para a API do DeepSeek
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
        throw new Error('Erro ao obter resposta do DeepSeek')
      }

      const data = await response.json()
      const assistantContent = data.choices[0].message.content

      // Salva a resposta do assistente
      const assistantMessage = await this.saveMessage({
        content: assistantContent,
        role: 'assistant',
        user_id: userId
      })

      // Adiciona a resposta do assistente ao contexto
      this.messages.push({
        role: 'assistant',
        content: assistantContent
      })

      return assistantMessage
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      throw error
    }
  }
}
