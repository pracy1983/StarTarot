import { create } from 'zustand'
import { createStore } from 'zustand/vanilla'
import { Oraculista } from '../types/oraculista'

interface OraculistasStore {
  oraculistas: Oraculista[]
  loading: boolean
  error: string | null
  fetchOraculistas: () => Promise<void>
  updateOraculista: (id: string, data: Partial<Oraculista>) => Promise<void>
  deleteOraculista: (id: string) => Promise<void>
  createOraculista: (data: Omit<Oraculista, 'id'>) => Promise<void>
  setError: (error: string | null) => void
}

const initialState: Pick<OraculistasStore, 'oraculistas' | 'loading' | 'error'> = {
  oraculistas: [],
  loading: false,
  error: null,
}

// Corrigindo para usar o createStore do Zustand corretamente
export const useOraculistasStore = create<OraculistasStore>((set, get) => ({
  ...initialState,
  fetchOraculistas: async () => {
    set({ loading: true, error: null })
    try {
      const response = await fetch('/api/oraculistas')
      if (!response.ok) {
        throw new Error('Erro ao buscar oraculistas')
      }
      const data = await response.json()
      set({ oraculistas: data.oraculistas })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Erro ao buscar oraculistas' })
    } finally {
      set({ loading: false })
    }
  },

  updateOraculista: async (id, data) => {
    set({ loading: true, error: null })
    try {
      const response = await fetch(`/api/oraculistas/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        throw new Error('Erro ao atualizar oraculista')
      }
      const updatedData = await response.json()
      set((state) => ({
        oraculistas: state.oraculistas.map((o) =>
          o.id === id ? { ...o, ...updatedData.oraculista } : o
        ),
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Erro ao atualizar oraculista' })
    } finally {
      set({ loading: false })
    }
  },

  deleteOraculista: async (id) => {
    set({ loading: true, error: null })
    try {
      const response = await fetch(`/api/oraculistas/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Erro ao excluir oraculista')
      }
      set((state) => ({
        oraculistas: state.oraculistas.filter((o) => o.id !== id),
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Erro ao excluir oraculista' })
    } finally {
      set({ loading: false })
    }
  },

  createOraculista: async (data) => {
    set({ loading: true, error: null })
    try {
      const response = await fetch('/api/oraculistas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        throw new Error('Erro ao criar oraculista')
      }
      const newData = await response.json()
      set((state) => ({
        oraculistas: [...state.oraculistas, newData.oraculista],
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Erro ao criar oraculista' })
    } finally {
      set({ loading: false })
    }
  },

  setError: (error) => set({ error }),
}))
