import { getResolvedPrompt } from '@/config/prompts/chatAgentPrompt'
import { Message, ApiMessage, MessageRole } from '../types/message'
import { supabase } from '@/lib/supabase'

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
      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: true })
        .limit(50)

      if (error) throw error

      return messages.map(msg => ({
        id: msg.id,
        content: msg.content,
        role: msg.role as MessageRole,
        timestamp: msg.timestamp
      }))
    } catch (error) {
      console.error('Erro ao recuperar histórico:', error)
      return []
    }
  }

  async sendMessage(content: string, userId: string): Promise<Message> {
    try {
      // Adiciona a mensagem do usuário ao banco
      const { data: userMessageData, error: userError } = await supabase
        .from('chat_messages')
        .insert([
          {
            user_id: userId,
            content,
            role: 'user',
            timestamp: new Date().toISOString()
          }
        ])
        .select()
        .single()

      if (userError) throw userError

      // Prepara o contexto para a API
      const userMessage: ApiMessage = { role: 'user', content }
      this.messages.push(userMessage)

      // Faz a chamada para a API
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: this.messages,
          temperature: 0.7,
          max_tokens: 1000
        })
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('Erro da API:', error)
        throw new Error(error.message || 'Falha ao obter resposta da API')
      }

      const data = await response.json()
      const assistantMessage = data.choices[0].message

      // Salva a resposta do assistente no banco
      const { data: assistantMessageData, error: assistantError } = await supabase
        .from('chat_messages')
        .insert([
          {
            user_id: userId,
            content: assistantMessage.content,
            role: 'assistant',
            timestamp: new Date().toISOString()
          }
        ])
        .select()
        .single()

      if (assistantError) throw assistantError

      // Adiciona a mensagem do assistente ao contexto
      this.messages.push(assistantMessage)

      return {
        id: assistantMessageData.id,
        content: assistantMessage.content,
        role: 'assistant',
        timestamp: new Date()
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      throw error
    }
  }
}
