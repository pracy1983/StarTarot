import { create } from 'zustand'
import { MensagensService } from '../services/mensagensService'
import { Message } from '../types/message'

interface MensagensState {
  mensagens: Message[]
  loading: boolean
  error: string | null
  mensagensService: MensagensService
  carregarMensagens: (userId?: string) => Promise<void>
  enviarPergunta: (userId: string, formData: {
    oraculistaId: string
    conteudo: string
  }) => Promise<void>
  enviarResposta: (mensagemId: string, oraculistaId: string, conteudo: string) => Promise<void>
  marcarComoLida: (mensagemId: string) => Promise<void>
  deletarMensagem: (mensagemId: string, userId: string) => Promise<void>
}

export const useMensagensStore = create<MensagensState>((set, get) => ({
  mensagens: [],
  loading: false,
  error: null,
  mensagensService: new MensagensService(),

  carregarMensagens: async (userId?: string) => {
    try {
      set({ loading: true, error: null })
      const mensagens = await get().mensagensService.buscarMensagens({ userId })
      set({ mensagens, loading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Erro ao carregar mensagens',
        loading: false
      })
    }
  },

  enviarPergunta: async (userId: string, formData: { oraculistaId: string; conteudo: string }) => {
    try {
      set({ loading: true, error: null })
      const result = await get().mensagensService.enviarMensagem({
        user_id: userId,
        oraculista_id: formData.oraculistaId,
        conteudo: formData.conteudo,
        tipo: 'pergunta',
        data: new Date(),
        lida: false,
        updatedAt: new Date()
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      await get().carregarMensagens(userId)
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Erro ao enviar pergunta',
        loading: false
      })
    }
  },

  enviarResposta: async (mensagemId: string, oraculistaId: string, conteudo: string) => {
    try {
      set({ loading: true, error: null })
      const mensagem = get().mensagens.find(m => m.id === mensagemId)
      if (!mensagem) {
        throw new Error('Mensagem não encontrada')
      }

      const result = await get().mensagensService.enviarMensagem({
        user_id: mensagem.user_id,
        oraculista_id: oraculistaId,
        conteudo: conteudo,
        tipo: 'resposta',
        thread_id: mensagemId,
        data: new Date(),
        lida: false,
        updatedAt: new Date()
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      await get().carregarMensagens(mensagem.user_id)
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Erro ao enviar resposta',
        loading: false
      })
    }
  },

  marcarComoLida: async (mensagemId: string) => {
    try {
      set({ loading: true, error: null })
      const result = await get().mensagensService.marcarComoLida(mensagemId)
      if (!result.success) {
        throw new Error(result.error)
      }

      const mensagens = get().mensagens.map(m =>
        m.id === mensagemId ? { ...m, lida: true } : m
      )
      set({ mensagens, loading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Erro ao marcar mensagem como lida',
        loading: false
      })
    }
  },

  deletarMensagem: async (mensagemId: string, userId: string) => {
    try {
      set({ loading: true, error: null })
      const result = await get().mensagensService.excluirMensagem(mensagemId)
      if (!result.success) {
        throw new Error(result.error)
      }

      const mensagens = get().mensagens.filter(m => m.id !== mensagemId)
      set({ mensagens, loading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Erro ao deletar mensagem',
        loading: false
      })
    }
  }
}))
