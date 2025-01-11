import { create } from 'zustand'
import { Oraculista, OraculistaFormData } from '../types/oraculista'
import { getPromptByOraculista } from '@/config/prompts/oraculistas'

interface OraculistasState {
  oraculistas: Oraculista[]
  loading: boolean
  error: string | null
  adicionarOraculista: (data: OraculistaFormData) => Promise<{ success: boolean; error?: string }>
  atualizarOraculista: (id: string, data: Partial<OraculistaFormData>) => Promise<{ success: boolean; error?: string }>
  alternarDisponibilidade: (id: string) => Promise<{ success: boolean; error?: string }>
  alternarPromocao: (id: string, precoPromocional?: number) => Promise<{ success: boolean; error?: string }>
  excluirOraculista: (id: string) => Promise<{ success: boolean; error?: string }>
}

// Mock de oraculistas para desenvolvimento
const MOCK_ORACULISTAS: Oraculista[] = [
  {
    id: '1',
    nome: 'MAGO NEGRO',
    foto: '/oraculistas/mago-negro.jpg',
    especialidades: [
      'Trabalha com tarot dos daemons',
      'Especialista em amor e finanças',
      'Foco em questões mundanas e carnais',
      'Abordagem direta e prática'
    ],
    descricao: 'Especialista em questões mundanas e carnais, com abordagem direta e prática.',
    preco: 20,
    disponivel: true,
    prompt: getPromptByOraculista('MAGO NEGRO'),
    emPromocao: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    nome: 'VÓ CLEUSA',
    foto: '/oraculistas/vo-cleusa.jpg',
    especialidades: [
      'Trabalha com tarot dos anjos',
      'Especialista em destino e missão de vida',
      'Foco em caminhos a seguir e saúde',
      'Abordagem espiritual e orientadora'
    ],
    descricao: 'Especialista em destino e missão de vida, com abordagem espiritual.',
    preco: 20,
    disponivel: false,
    prompt: getPromptByOraculista('VÓ CLEUSA'),
    emPromocao: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '3',
    nome: 'CIGANA FLORA',
    foto: '/oraculistas/cigana-flora.jpg',
    especialidades: [
      'Trabalha com baralho cigano e baralho das fadas',
      'Especialista em amor, saúde e dinheiro',
      'Abordagem mística'
    ],
    descricao: 'Especialista em amor, saúde e dinheiro, com abordagem mística.',
    preco: 15,
    disponivel: true,
    prompt: getPromptByOraculista('CIGANA FLORA'),
    emPromocao: true,
    precoPromocional: 10,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

export const useOraculistasStore = create<OraculistasState>()((set, get) => ({
  oraculistas: MOCK_ORACULISTAS,
  loading: false,
  error: null,

  adicionarOraculista: async (data) => {
    try {
      set({ loading: true, error: null })
      
      // Simula delay de rede
      await new Promise(resolve => setTimeout(resolve, 1000))

      const novoOraculista: Oraculista = {
        id: Math.random().toString(36).substr(2, 9),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      set(state => ({
        oraculistas: [...state.oraculistas, novoOraculista]
      }))

      return { success: true }
    } catch (error) {
      set({ error: 'Erro ao adicionar oraculista' })
      return { success: false, error: 'Erro ao adicionar oraculista' }
    } finally {
      set({ loading: false })
    }
  },

  atualizarOraculista: async (id, data) => {
    try {
      set({ loading: true, error: null })
      
      await new Promise(resolve => setTimeout(resolve, 1000))

      set(state => ({
        oraculistas: state.oraculistas.map(oraculista =>
          oraculista.id === id
            ? { ...oraculista, ...data, updatedAt: new Date() }
            : oraculista
        )
      }))

      return { success: true }
    } catch (error) {
      set({ error: 'Erro ao atualizar oraculista' })
      return { success: false, error: 'Erro ao atualizar oraculista' }
    } finally {
      set({ loading: false })
    }
  },

  alternarDisponibilidade: async (id) => {
    try {
      set({ loading: true, error: null })
      
      await new Promise(resolve => setTimeout(resolve, 500))

      set(state => ({
        oraculistas: state.oraculistas.map(oraculista =>
          oraculista.id === id
            ? { ...oraculista, disponivel: !oraculista.disponivel, updatedAt: new Date() }
            : oraculista
        )
      }))

      return { success: true }
    } catch (error) {
      set({ error: 'Erro ao alterar disponibilidade' })
      return { success: false, error: 'Erro ao alterar disponibilidade' }
    } finally {
      set({ loading: false })
    }
  },

  alternarPromocao: async (id, precoPromocional) => {
    try {
      set({ loading: true, error: null })
      
      await new Promise(resolve => setTimeout(resolve, 500))

      set(state => ({
        oraculistas: state.oraculistas.map(oraculista =>
          oraculista.id === id
            ? {
                ...oraculista,
                emPromocao: !oraculista.emPromocao,
                precoPromocional: !oraculista.emPromocao ? precoPromocional : undefined,
                updatedAt: new Date()
              }
            : oraculista
        )
      }))

      return { success: true }
    } catch (error) {
      set({ error: 'Erro ao alterar promoção' })
      return { success: false, error: 'Erro ao alterar promoção' }
    } finally {
      set({ loading: false })
    }
  },

  excluirOraculista: async (id) => {
    try {
      set({ loading: true, error: null })
      
      await new Promise(resolve => setTimeout(resolve, 1000))

      set(state => ({
        oraculistas: state.oraculistas.filter(oraculista => oraculista.id !== id)
      }))

      return { success: true }
    } catch (error) {
      set({ error: 'Erro ao excluir oraculista' })
      return { success: false, error: 'Erro ao excluir oraculista' }
    } finally {
      set({ loading: false })
    }
  }
}))
