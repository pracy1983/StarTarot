import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Mensagem, MensagemFiltro } from '../types/mensagem'

interface MensagensState {
  mensagens: Mensagem[]
  mensagemAtual: Mensagem | null
  filtroAtual: MensagemFiltro
  naoLidas: number
  setMensagemAtual: (mensagem: Mensagem | null) => void
  marcarComoLida: (id: string) => void
  adicionarMensagem: (mensagem: Mensagem) => void
  setFiltro: (filtro: MensagemFiltro) => void
  getMensagensFiltradas: () => Mensagem[]
}

export const useMensagensStore = create<MensagensState>()(
  persist(
    (set, get) => ({
      mensagens: [],
      mensagemAtual: null,
      filtroAtual: 'todas',
      naoLidas: 0,

      setMensagemAtual: (mensagem) => {
        set({ mensagemAtual: mensagem })
      },

      marcarComoLida: (id) => {
        set(state => {
          const mensagensAtualizadas = state.mensagens.map(msg =>
            msg.id === id ? { ...msg, lida: true } : msg
          )
          
          const novoNaoLidas = mensagensAtualizadas.filter(msg => !msg.lida).length

          return {
            mensagens: mensagensAtualizadas,
            naoLidas: novoNaoLidas
          }
        })
      },

      adicionarMensagem: (mensagem) => {
        set(state => {
          const novasMensagens = [...state.mensagens, mensagem]
          const novoNaoLidas = novasMensagens.filter(msg => !msg.lida).length

          return {
            mensagens: novasMensagens,
            naoLidas: novoNaoLidas
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
    }),
    {
      name: 'mensagens-storage'
    }
  )
)
