import { getResolvedPrompt } from '@/config/prompts/chatAgentPrompt'
import { Message, ApiMessage, DatabaseMessage } from '../types/message'
import { supabase } from '@/lib/supabase'

export class ChatService {
  private messages: ApiMessage[] = []
  private apiUrl = 'https://api.deepseek.com/v1/chat/completions'

  constructor() {
    this.initializeChat()
  }

  private async initializeChat() {
    // Pega o prompt já com os oraculistas
    const systemPrompt = await getResolvedPrompt()
    this.messages = [
      { role: 'system', content: systemPrompt }
    ]
  }

  async sendMessage(content: string, userId: string): Promise<Message> {
    try {
      // Primeiro, recupera o histórico de mensagens
      const history = await this.retrieveHistory(userId)
      
      // Adiciona a nova mensagem do usuário
      const userMessage: ApiMessage = { role: 'user', content }
      
      // Combina o histórico com a nova mensagem
      const messages = [...history, userMessage]
      
      // Faz a chamada para a API
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: messages,
          temperature: 0.7,
          max_tokens: 1000
        })
      })

      if (!response.ok) {
        throw new Error('Falha ao obter resposta da API')
      }

      const data = await response.json()
      const assistantMessage: ApiMessage = data.choices[0].message

      // Salva a conversa no Supabase
      await this.saveMessages(userId, [userMessage, assistantMessage])

      // Retorna a mensagem do assistente
      return {
        id: crypto.randomUUID(),
        content: assistantMessage.content,
        role: assistantMessage.role,
        timestamp: new Date()
      }

    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      throw error
    }
  }

  async retrieveHistory(userId: string): Promise<ApiMessage[]> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('content, role, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })

      if (error) throw error

      return (data || []).map(msg => ({
        content: msg.content,
        role: msg.role,
        timestamp: msg.created_at
      }))

    } catch (error) {
      console.error('Erro ao recuperar histórico:', error)
      return []
    }
  }

  private async saveMessages(userId: string, messages: ApiMessage[]) {
    try {
      const now = new Date()
      const messagesToSave: DatabaseMessage[] = messages.map(msg => ({
        id: crypto.randomUUID(),
        user_id: userId,
        content: msg.content,
        role: msg.role,
        created_at: now
      }))

      const { error } = await supabase
        .from('messages')
        .insert(messagesToSave)

      if (error) throw error

    } catch (error) {
      console.error('Erro ao salvar mensagens:', error)
      throw error
    }
  }
}
