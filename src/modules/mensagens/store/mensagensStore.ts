import { create } from 'zustand'
import { Mensagem } from '../types/mensagem'
import { supabase } from '@/lib/supabase'

interface MensagemFormData {
  oraculista_id: string
  conteudo: string
}

interface MensagensState {
  mensagens: Mensagem[]
  mensagemAtual: Mensagem | null
  carregando: boolean
  erro: string | null
  statusEntrega: Record<string, 'enviada' | 'entregue' | 'falha'>
  logsErros: string[]
  carregarMensagens: (userId?: string) => Promise<void>
  enviarMensagem: (userId: string, mensagem: MensagemFormData) => Promise<void>
  deletarMensagem: (id: string) => Promise<void>
  marcarComoLida: (id: string) => Promise<void>
  setMensagemAtual: (mensagem: Mensagem | null) => void
  atualizarMensagem: (id: string, dados: Partial<Mensagem>) => Promise<void>
  getMensagensFiltradas: (filtro: 'todas' | 'nao_lidas' | 'respondidas') => Mensagem[]
  limparMensagens: () => void
  atualizarStatus: (titulo: string, status: 'enviada' | 'entregue' | 'falha') => void
  receberResposta: (mensagemId: string, resposta: string) => Promise<void>
  processarRespostaOraculo: (mensagem: Mensagem) => Promise<string>
  carregarMensagemComResposta: (mensagemId: string) => Promise<Mensagem[]>
}

export const useMensagensStore = create<MensagensState>((set, get) => ({
  atualizarStatus: (titulo, status) => {
    set({
      statusEntrega: {
        ...get().statusEntrega,
        [titulo]: status
      }
    })
  },
  mensagens: [],
  mensagemAtual: null,
  carregando: false,
  erro: null,
  statusEntrega: {},
  logsErros: [],

  receberResposta: async (mensagemId: string, resposta: string) => {
    try {
      set({ carregando: true, erro: null })
      
      const { data: mensagemAtualizada, error } = await supabase
        .from('mensagens')
        .update({
          conteudo: resposta,
          updatedAt: new Date(),
          status: 'entregue'
        })
        .select()
        .single()

      if (error) throw error

      set(state => ({
        mensagens: state.mensagens.map(m => 
          m.id === mensagemId 
            ? { ...m, status: 'entregue' }
            : m
        ),
        carregando: false
      }))
    } catch (error) {
      console.error('Erro ao receber resposta:', error)
      set({ erro: 'Erro ao receber resposta', carregando: false })
      throw error
    }
  },

  carregarMensagens: async (userId?: string) => {
    try {
      set({ carregando: true, erro: null })

      let query = supabase
        .from('mensagens')
        .select(`
          *,
          oraculista:oraculistas (
            id,
            nome,
            foto
          )
        `)
        .order('created_at', { ascending: false })

      if (userId) {
        query = query.eq('user_id', userId)
      }

      const { data: mensagensData, error } = await query

      if (error) throw error

      const mensagens: Mensagem[] = mensagensData.map(msg => ({
        id: msg.id,
        user_id: msg.user_id,
        oraculista_id: msg.oraculista_id,
        conteudo: msg.conteudo,
        tipo: msg.tipo,
        data: new Date(msg.data),
        lida: msg.lida,
        updatedAt: msg.updatedAt ? new Date(msg.updatedAt) : new Date(msg.data),
        status: msg.status || 'enviada',
        thread_id: msg.thread_id,
        perguntaOriginal: msg.pergunta_original,
        oraculista: msg.oraculista
      }))

      set({ mensagens, carregando: false })
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error)
      set({ erro: 'Erro ao carregar mensagens', carregando: false })
    }
  },

  enviarMensagem: async (userId: string, mensagemData: MensagemFormData) => {
    try {
      if (get().carregando) {
        throw new Error('Já existe uma operação em andamento')
      }
      
      set({ carregando: true, erro: null })
      get().atualizarStatus('Nova mensagem', 'enviada')
      
      const now = new Date()
      const { data: newMensagem, error } = await supabase
        .from('mensagens')
        .insert([{
          user_id: userId,
          oraculista_id: mensagemData.oraculista_id,
          conteudo: mensagemData.conteudo,
          lida: false,
          data: now,
          tipo: 'pergunta',
          updatedAt: now,
          status: 'enviada'
        }])
        .select(`
          *,
          oraculista:oraculista_id (
            id,
            nome,
            foto
          )
        `)
        .single()
        
      if (error) throw error

      const mensagem: Mensagem = {
        id: newMensagem.id,
        user_id: newMensagem.user_id,
        oraculista_id: newMensagem.oraculista_id,
        conteudo: newMensagem.conteudo,
        lida: newMensagem.lida,
        data: new Date(newMensagem.data),
        tipo: newMensagem.tipo,
        thread_id: newMensagem.thread_id,
        updatedAt: newMensagem.updatedAt ? new Date(newMensagem.updatedAt) : new Date(newMensagem.data),
        oraculista: newMensagem.oraculista,
        status: 'enviada'
      }
      
      setTimeout(async () => {
        try {
          const resposta = await get().processarRespostaOraculo(mensagem)
          await get().receberResposta(mensagem.id, resposta)
        } catch (error) {
          console.error('Erro ao processar resposta:', error)
          get().atualizarStatus('Nova mensagem', 'falha')
        }
      }, 100)

      set(state => ({
        mensagens: [mensagem, ...state.mensagens],
        carregando: false
      }))
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      set({ erro: 'Erro ao enviar mensagem', carregando: false })
      throw error
    }
  },

  deletarMensagem: async (id: string) => {
    try {
      set({ carregando: true, erro: null })

      const { error } = await supabase
        .from('mensagens')
        .delete()
        .eq('id', id)

      if (error) throw error

      set(state => ({
        mensagens: state.mensagens.filter(m => m.id !== id),
        mensagemAtual: state.mensagemAtual?.id === id ? null : state.mensagemAtual,
        carregando: false
      }))
    } catch (error) {
      console.error('Erro ao deletar mensagem:', error)
      set({ erro: 'Erro ao deletar mensagem', carregando: false })
      throw error
    }
  },

  marcarComoLida: async (id: string) => {
    try {
      const { error } = await supabase
        .from('mensagens')
        .update({
          lida: true,
          updatedAt: new Date()
        })
        .eq('id', id)

      if (error) throw error

      set(state => ({
        mensagens: state.mensagens.map(m =>
          m.id === id
            ? { ...m, lida: true, updatedAt: new Date() }
            : m
        )
      }))
    } catch (error) {
      console.error('Erro ao marcar mensagem como lida:', error)
      throw error
    }
  },

  setMensagemAtual: (mensagem) => {
    set({ mensagemAtual: mensagem })
  },

  atualizarMensagem: async (id: string, dados: Partial<Mensagem>) => {
    try {
      set({ carregando: true, erro: null })

      const now = new Date()
      const { error } = await supabase
        .from('mensagens')
        .update({
          ...dados,
          updatedAt: now
        })
        .eq('id', id)

      if (error) throw error

      set(state => ({
        mensagens: state.mensagens.map(m =>
          m.id === id
            ? { ...m, ...dados, updatedAt: now }
            : m
        ),
        carregando: false
      }))
    } catch (error) {
      console.error('Erro ao atualizar mensagem:', error)
      set({ erro: 'Erro ao atualizar mensagem', carregando: false })
      throw error
    }
  },

  getMensagensFiltradas: (filtro) => {
    const state = get()
    switch (filtro) {
      case 'nao_lidas':
        return state.mensagens.filter(m => !m.lida)
      case 'respondidas':
        return state.mensagens.filter(m => m.tipo === 'resposta')
      default:
        return state.mensagens
    }
  },

  processarRespostaOraculo: async (mensagem: Mensagem) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      return `Resposta processada para a mensagem: ${mensagem.conteudo}`
    } catch (error) {
      console.error('Erro ao processar resposta:', error)
      throw error
    }
  },

  limparMensagens: () => {
    set({ mensagens: [], mensagemAtual: null })
  },

  carregarMensagemComResposta: async (mensagemId?: string) => {
    try {
      set({ carregando: true, erro: null })
      
      if (!mensagemId) {
        console.warn('Nenhum ID de mensagem fornecido')
        set({ carregando: false })
        return []
      }

      console.log('Iniciando carregamento da mensagem:', mensagemId)
      
      const { data: mensagens, error } = await supabase
        .from('mensagens')
        .select(`
          *,
          oraculista:oraculistas(*)
        `)
        .or(`id.eq.${mensagemId},pergunta_ref.eq.${mensagemId}`)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Erro na query:', error)
        throw error
      }

      if (!mensagens || mensagens.length === 0) {
        console.warn('Nenhuma mensagem encontrada para o ID:', mensagemId)
        set({ carregando: false })
        return []
      }

      // Retorna apenas as mensagens carregadas, sem acumular
      set({ 
        carregando: false,
        erro: null
      })

      return mensagens
    } catch (error) {
      console.error('Erro ao carregar mensagem com resposta:', error)
      set({ erro: 'Erro ao carregar mensagem com resposta', carregando: false })
      throw error
    }
  }
}))
