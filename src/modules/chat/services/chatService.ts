import { getResolvedPrompt } from '@/config/prompts/chatAgentPrompt'
import { ChatMessage, UIMessage, convertChatToUIMessage, convertUIToChatMessage } from '../types/message'
import { useOraculistasStore } from '@/modules/oraculistas/store/oraculistasStore'
import { supabase } from '@/lib/supabase'

export class ChatService {
  private messages: ChatMessage[] = []
  private apiUrl = 'https://api.deepseek.com/v1/chat/completions'

  constructor() {
    this.initializeChat()
  }

  private async initializeChat() {
    // Carrega os oraculistas primeiro
    const { carregarOraculistas } = useOraculistasStore.getState()
    await carregarOraculistas()
    
    // Depois pega o prompt já com os oraculistas carregados
    const systemPrompt = await getResolvedPrompt()
    this.messages = [
      { role: 'system', content: systemPrompt }
    ]
  }

  async sendMessage(content: string, history: UIMessage[]): Promise<string> {
    try {
      // Converte histórico para formato da API
      const chatHistory = history.map(convertUIToChatMessage)
      
      // Reseta as mensagens com o prompt do sistema e o histórico
      const systemPrompt = await getResolvedPrompt()
      this.messages = [
        { role: 'system', content: systemPrompt },
        ...chatHistory
      ]

      // Adiciona a nova mensagem do usuário
      const userMessage: ChatMessage = { role: 'user', content }
      this.messages.push(userMessage)

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: this.messages,
          temperature: 0.7,
          max_tokens: 2000
        })
      })

      if (!response.ok) {
        throw new Error('Falha ao enviar mensagem')
      }

      const data = await response.json()
      return data.choices[0].message.content
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      throw error
    }
  }

  async retrieveHistory(userId: string): Promise<ChatMessage[]> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })

      if (error) throw error

      return data.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }))
    } catch (error) {
      console.error('Erro ao recuperar histórico:', error)
      return []
    }
  }
}
