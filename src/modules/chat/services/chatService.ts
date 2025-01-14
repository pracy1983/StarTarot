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

      // Salva apenas a mensagem do usuário no banco
      await this.storeMessage(userId, userMessage)

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

      // Removido o armazenamento da mensagem do assistente
      return assistantMessage
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      throw error
    }
  }

  async storeMessage(userId: string, message: Message) {
    try {
      // Só armazena se for mensagem do usuário
      if (message.role !== 'user') return;

      console.log('Enviando mensagem para o Supabase:', {
        user_id: userId,
        message: message.content,
        sender: message.role,
        timestamp: new Date()
      });

      // Primeiro, verificamos quantas mensagens o usuário já tem
      const { data: existingMessages, error: countError } = await supabase
        .from('chat_history')
        .select('id, timestamp')
        .eq('user_id', userId)
        .order('timestamp', { ascending: true });

      if (countError) {
        throw countError;
      }

      // Se já temos 50 mensagens ou mais, removemos as mais antigas
      if (existingMessages && existingMessages.length >= 50) {
        const messagesToRemove = existingMessages.slice(0, existingMessages.length - 49);
        const idsToRemove = messagesToRemove.map(msg => msg.id);
        
        // Remove as mensagens mais antigas
        const { error: deleteError } = await supabase
          .from('chat_history')
          .delete()
          .in('id', idsToRemove);

        if (deleteError) {
          throw deleteError;
        }
      }

      // Insere a nova mensagem
      const { error: insertError } = await supabase
        .from('chat_history')
        .insert({
          user_id: userId,
          message: message.content,
          sender: message.role,
          timestamp: new Date()
        });

      if (insertError) {
        throw insertError;
      }

    } catch (error) {
      console.error('Erro ao armazenar mensagem:', error);
      throw error;
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
