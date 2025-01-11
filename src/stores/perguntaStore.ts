import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Pergunta {
  id: string
  userId: string
  situacao: string
  pergunta: string
  status: 'pendente' | 'em_analise' | 'respondida'
  createdAt: Date
  respondidaEm?: Date
}

interface PerguntaState {
  perguntas: Pergunta[]
  perguntaAtual: Pergunta | null
  enviarPergunta: (situacao: string, pergunta: string, userId: string) => Promise<{ success: boolean; error?: string }>
  atualizarStatus: (perguntaId: string, novoStatus: Pergunta['status']) => void
}

export const usePerguntaStore = create<PerguntaState>()(
  persist(
    (set, get) => ({
      perguntas: [],
      perguntaAtual: null,
      
      enviarPergunta: async (situacao, pergunta, userId) => {
        try {
          const novaPergunta: Pergunta = {
            id: Date.now().toString(),
            userId,
            situacao,
            pergunta,
            status: 'pendente',
            createdAt: new Date()
          }

          set(state => ({
            perguntas: [...state.perguntas, novaPergunta],
            perguntaAtual: novaPergunta
          }))

          return { success: true }
        } catch (error) {
          console.error('Erro ao enviar pergunta:', error)
          return { 
            success: false, 
            error: 'Erro ao enviar pergunta. Tente novamente.' 
          }
        }
      },

      atualizarStatus: (perguntaId, novoStatus) => {
        set(state => ({
          perguntas: state.perguntas.map(p => 
            p.id === perguntaId 
              ? { 
                  ...p, 
                  status: novoStatus,
                  ...(novoStatus === 'respondida' ? { respondidaEm: new Date() } : {})
                }
              : p
          )
        }))
      }
    }),
    {
      name: 'pergunta-storage'
    }
  )
)
