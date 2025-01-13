import { getResolvedPrompt } from '@/config/prompts/chatAgentPrompt'
import { Message } from '../types/message'
import { useOraculistasStore } from '@/modules/oraculistas/store/oraculistasStore'

export class ChatService {
  private messages: Message[] = []
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

  async sendMessage(content: string): Promise<Message> {
    const userMessage: Message = { role: 'user', content }
    this.messages.push(userMessage)

    try {
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
          max_tokens: 1000
        })
      })

      if (!response.ok) {
        throw new Error('Falha na comunicação com a API')
      }

      const data = await response.json()
      const assistantMessage: Message = data.choices[0].message

      this.messages.push(assistantMessage)
      return assistantMessage
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      throw error
    }
  }
}
