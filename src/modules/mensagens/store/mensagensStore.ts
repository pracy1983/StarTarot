import { create } from 'zustand'
import { Mensagem, MensagemFormData } from '../types/mensagem'
import { supabase } from '@/lib/supabase'

interface MensagensState {
  mensagens: Mensagem[]
  mensagemAtual: Mensagem | null
  carregando: boolean
  erro: string | null
  carregarMensagens: (userId?: string) => Promise<void>
  enviarMensagem: (userId: string, mensagem: MensagemFormData) => Promise<void>
  deletarMensagem: (id: string) => Promise<void>
  marcarComoLida: (id: string) => Promise<void>
  setMensagemAtual: (mensagem: Mensagem | null) => void
  atualizarMensagem: (id: string, dados: Partial<Mensagem>) => Promise<void>
  getMensagensFiltradas: (filtro: 'todas' | 'nao_lidas' | 'respondidas') => Mensagem[]
  limparMensagens: () => void
}

export const useMensagensStore = create<MensagensState>((set, get) => ({
  mensagens: [],
  mensagemAtual: null,
  carregando: false,
  erro: null,

  carregarMensagens: async (userId?: string) => {
    try {
      set({ carregando: true, erro: null })

      let query = supabase
        .from('mensagens')
        .select(`
          *,
          oraculista:oraculista_id (
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
        userId: msg.user_id,
        oraculistaId: msg.oraculista_id,
        titulo: msg.titulo,
        conteudo: msg.conteudo,
        lida: msg.lida,
        data: new Date(msg.data),
        tipo: msg.tipo,
        threadId: msg.thread_id,
        createdAt: new Date(msg.created_at),
        updatedAt: new Date(msg.updated_at),
        oraculista: msg.oraculista,
        de: msg.tipo === 'pergunta' ? 'Usuário' : msg.oraculista?.nome || 'Oraculista'
      }))

      set({ mensagens, carregando: false })
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error)
      set({ erro: 'Erro ao carregar mensagens', carregando: false })
    }
  },

  enviarMensagem: async (userId: string, mensagemData: MensagemFormData) => {
    try {
      set({ carregando: true, erro: null })

      const now = new Date()
      const { data: newMensagem, error } = await supabase
        .from('mensagens')
        .insert([{
          user_id: userId,
          oraculista_id: mensagemData.oraculistaId,
          titulo: mensagemData.titulo,
          conteudo: mensagemData.conteudo,
          lida: false,
          data: now,
          tipo: 'pergunta',
          created_at: now,
          updated_at: now
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
        userId: newMensagem.user_id,
        oraculistaId: newMensagem.oraculista_id,
        titulo: newMensagem.titulo,
        conteudo: newMensagem.conteudo,
        lida: newMensagem.lida,
        data: new Date(newMensagem.data),
        tipo: newMensagem.tipo,
        threadId: newMensagem.thread_id,
        createdAt: new Date(newMensagem.created_at),
        updatedAt: new Date(newMensagem.updated_at),
        oraculista: newMensagem.oraculista,
        de: newMensagem.tipo === 'pergunta' ? 'Usuário' : newMensagem.oraculista?.nome || 'Oraculista'
      }

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
          updated_at: new Date()
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
          updated_at: now
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

  limparMensagens: () => {
    set({ mensagens: [], mensagemAtual: null })
  }
}))
