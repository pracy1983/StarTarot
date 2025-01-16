import { create } from 'zustand'
import { Mensagem, MensagemFiltro, MensagemFormData } from '../types/mensagem'
import * as MensagensService from '../services/mensagensService'

interface MensagensState {
  mensagens: Mensagem[]
  mensagemAtual: Mensagem | null
  filtroAtual: MensagemFiltro
  loading: boolean
  error: string | null
  naoLidas: number
  
  // Ações
  setMensagemAtual: (mensagem: Mensagem | null) => void
  marcarComoLida: (id: string) => Promise<void>
  enviarPergunta: (userId: string, formData: MensagemFormData) => Promise<void>
  carregarMensagens: (userId?: string) => Promise<void>
  setFiltro: (filtro: MensagemFiltro) => void
  getMensagensFiltradas: () => Mensagem[]
  adicionarMensagem: (mensagem: Mensagem) => void
  deletarMensagem: (id: string) => Promise<void>
  deletarMensagens: (ids: string[]) => Promise<void>
  limparMensagens: () => void
  atualizarMensagem: (id: string, mensagemAtualizada: Partial<Mensagem>) => void
}

export const useMensagensStore = create<MensagensState>()((set, get) => ({
  mensagens: [],
  mensagemAtual: null,
  filtroAtual: 'todas',
  loading: false,
  error: null,
  naoLidas: 0,

  setMensagemAtual: (mensagem) => {
    set({ mensagemAtual: mensagem })
  },

  limparMensagens: () => {
    set({ mensagens: [], mensagemAtual: null, naoLidas: 0 })
  },

  carregarMensagens: async (userId?: string) => {
    try {
      set({ loading: true, error: null })
      const mensagens = await MensagensService.carregarMensagens(userId)
      
      // Remove duplicatas baseado no ID
      const mensagensUnicas = mensagens.reduce((acc: Mensagem[], current) => {
        const exists = acc.find(msg => msg.id === current.id)
        if (!exists) {
          acc.push(current)
        }
        return acc
      }, [])

      // Ordena por data, mais recentes primeiro
      const mensagensOrdenadas = mensagensUnicas.sort(
        (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
      )

      set({ 
        mensagens: mensagensOrdenadas,
        naoLidas: mensagensOrdenadas.filter(msg => !msg.lida).length,
        loading: false 
      })
    } catch (error: any) {
      const err = error as Error | { message: string };
      set({ error: err.message, loading: false, mensagens: [] })
    }
  },

  marcarComoLida: async (id) => {
    try {
      await MensagensService.marcarComoLida(id)
      set(state => ({
        mensagens: state.mensagens.map(msg =>
          msg.id === id ? { ...msg, lida: true } : msg
        ),
        naoLidas: state.mensagens.filter(msg => !msg.lida && msg.id !== id).length
      }))
    } catch (error: any) {
      set({ error: error.message })
    }
  },

  enviarPergunta: async (userId, formData) => {
    try {
      const novaMensagem = await MensagensService.enviarPergunta(userId, formData)
      set(state => ({
        mensagens: [novaMensagem, ...state.mensagens]
      }))
    } catch (error: any) {
      set({ error: error.message })
    }
  },

  deletarMensagem: async (id) => {
    try {
      const state = get()
      const mensagem = state.mensagens.find(msg => msg.id === id)
      
      if (!mensagem) {
        throw new Error('Mensagem não encontrada no estado')
      }

      const userId = mensagem.userId
      if (!userId) {
        throw new Error('Usuário não encontrado para esta mensagem')
      }

      await MensagensService.deletarMensagem(id, userId)

      // Atualiza o estado local após confirmação do Supabase
      set(state => {
        const novasMensagens = state.mensagens.filter(msg => msg.id !== id)
        return {
          mensagens: novasMensagens,
          mensagemAtual: state.mensagemAtual?.id === id ? null : state.mensagemAtual,
          naoLidas: novasMensagens.filter(msg => !msg.lida).length
        }
      })
    } catch (error: any) {
      console.error('Erro ao deletar mensagem:', error)
      set({ error: error.message })
      throw error
    }
  },

  deletarMensagens: async (ids: string[]) => {
    try {
      const state = get()
      const mensagens = state.mensagens
      
      for (const id of ids) {
        const mensagem = mensagens.find(msg => msg.id === id)
        if (!mensagem) {
          throw new Error('Mensagem não encontrada: ' + id)
        }
        
        const userId = mensagem.userId
        if (!userId) {
          throw new Error('Usuário não encontrado para a mensagem: ' + id)
        }

        await MensagensService.deletarMensagem(id, userId)
      }

      // Atualiza o estado local após confirmação do Supabase
      set(state => {
        const novasMensagens = state.mensagens.filter(msg => !ids.includes(msg.id))
        return {
          mensagens: novasMensagens,
          mensagemAtual: state.mensagemAtual && ids.includes(state.mensagemAtual.id) ? null : state.mensagemAtual,
          naoLidas: novasMensagens.filter(msg => !msg.lida).length
        }
      })
    } catch (error: any) {
      console.error('Erro ao deletar mensagens:', error)
      set({ error: error.message })
      throw error
    }
  },

  setFiltro: (filtro) => {
    set({ filtroAtual: filtro })
  },

  getMensagensFiltradas: () => {
    const state = get()
    return state.mensagens.filter(msg => {
      switch (state.filtroAtual) {
        case 'nao_lidas':
          return !msg.lida
        case 'respondidas':
          return msg.tipo === 'resposta'
        default:
          return true
      }
    })
  },

  adicionarMensagem: (mensagem) => {
    set(state => {
      // Verifica se a mensagem já existe
      const mensagemExiste = state.mensagens.some(msg => msg.id === mensagem.id)
      if (mensagemExiste) {
        return state
      }

      // Adiciona a nova mensagem e ordena por data
      const novasMensagens = [mensagem, ...state.mensagens].sort(
        (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
      )

      return {
        mensagens: novasMensagens,
        naoLidas: novasMensagens.filter(msg => !msg.lida).length
      }
    })
  },
  atualizarMensagem: (id: string, mensagemAtualizada: Partial<Mensagem>) => {
    set(state => ({
      mensagens: state.mensagens.map(msg => 
        msg.id === id ? { ...msg, ...mensagemAtualizada } : msg
      )
    }))
  },
}))
