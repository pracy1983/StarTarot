import { getResolvedPrompt } from '@/config/prompts/chatAgentPrompt'
import { Message } from '../types/message'
import { useOraculistasStore } from '@/modules/oraculistas/store/oraculistasStore'
import { supabase } from '@/lib/supabase'

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

  async sendMessage(content: string, userId: string): Promise<Message> {
    try {
      // Primeiro, recupera o histórico de mensagens
      const history = await this.retrieveHistory(userId)
      
      // Reseta as mensagens com o prompt do sistema e o histórico
      const systemPrompt = await getResolvedPrompt()
      this.messages = [
        { role: 'system', content: systemPrompt },
        ...history
      ]

      // Adiciona a nova mensagem do usuário
      const userMessage: Message = { role: 'user', content }
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
          max_tokens: 1000
        })
      })

      if (!response.ok) {
        throw new Error('Falha na comunicação com a API')
      }

      const data = await response.json()
      const assistantMessage: Message = data.choices[0].message

      // Armazena a nova mensagem no histórico
      await this.storeMessage(userId, assistantMessage)
      return assistantMessage
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      throw error
    }
  }

  async storeMessage(userId: string, message: Message) {
    console.log('Enviando mensagem para o Supabase:', {
      user_id: userId,
      message: message.content,
      sender: message.role,
      timestamp: new Date()
    });

    await supabase.from('chat_history').insert({
      user_id: userId,
      message: message.content,
      sender: message.role,
      timestamp: new Date()
    });

    const { data, error } = await supabase
      .from('chat_history')
      .select('id')
      .eq('user_id', userId)
      .order('timestamp', { ascending: true });

    if (data && data.length > 50) {
      const idsToRemove = data.slice(0, data.length - 50).map((msg) => msg.id);
      await supabase.from('chat_history').delete().in('id', idsToRemove);
    }
  }

  async retrieveHistory(userId: string) {
    const { data, error } = await supabase
      .from('chat_history')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: true })
      .limit(50);

    if (error) {
      console.error('Erro ao recuperar histórico:', error);
      return [];
    }

    return data.map((msg) => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.message
    }));
  }
}
