import { chatAgentPrompt } from '@/config/prompts/chatAgentPrompt'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export class ChatService {
  private apiKey: string
  private baseUrl: string = 'https://api.deepseek.com/v1/chat/completions'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async sendMessage(message: string, conversationHistory: ChatMessage[] = []): Promise<string> {
    try {
      const messages = [
        { role: 'system', content: chatAgentPrompt },
        ...conversationHistory,
        { role: 'user', content: message }
      ]

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages,
          temperature: 0.7,
          max_tokens: 1000
        })
      })

      if (!response.ok) {
        throw new Error('Falha na comunicação com a API')
      }

      const data = await response.json()
      return data.choices[0].message.content

    } catch (error) {
      console.error('Erro no serviço de chat:', error)
      throw error
    }
  }
}
