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
  carregarMensagens: (userId: string) => Promise<void>
  setFiltro: (filtro: MensagemFiltro) => void
  getMensagensFiltradas: () => Mensagem[]
  adicionarMensagem: (mensagem: Mensagem) => void 
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

  marcarComoLida: async (id) => {
    try {
      await MensagensService.marcarComoLida(id)
      
      set(state => {
        const mensagensAtualizadas = state.mensagens.map(msg =>
          msg.id === id ? { ...msg, lida: true } : msg
        )
        
        return {
          mensagens: mensagensAtualizadas,
          naoLidas: mensagensAtualizadas.filter(msg => !msg.lida).length
        }
      })
    } catch (error: any) {
      set({ error: error.message })
    }
  },

  enviarPergunta: async (userId, formData) => {
    set({ loading: true, error: null })
    try {
      const novaMensagem = await MensagensService.enviarPergunta(userId, formData)
      set(state => ({
        mensagens: [novaMensagem, ...state.mensagens],
        loading: false
      }))
    } catch (error: any) {
      set({ error: error.message, loading: false })
    }
  },

  carregarMensagens: async (userId) => {
    set({ loading: true, error: null })
    try {
      const mensagens = await MensagensService.carregarMensagens(userId)
      set({ 
        mensagens,
        naoLidas: mensagens.filter(msg => !msg.lida).length,
        loading: false
      })
    } catch (error: any) {
      set({ error: error.message, loading: false })
    }
  },

  adicionarMensagem: (mensagem) => {
    set(state => {
      const novasMensagens = [...state.mensagens, mensagem]
      return {
        mensagens: novasMensagens,
        naoLidas: novasMensagens.filter(msg => !msg.lida).length
      }
    })
  },

  setFiltro: (filtro) => {
    set({ filtroAtual: filtro })
  },

  getMensagensFiltradas: () => {
    const state = get()
    const { mensagens, filtroAtual } = state

    switch (filtroAtual) {
      case 'nao_lidas':
        return mensagens.filter(msg => !msg.lida)
      case 'respondidas':
        return mensagens.filter(msg => msg.tipo === 'resposta')
      default:
        return mensagens
    }
  }
}))
