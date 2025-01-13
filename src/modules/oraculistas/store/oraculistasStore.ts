import { create } from 'zustand'
import { Oraculista, OraculistaFormData } from '../types/oraculista'
import { getPromptByOraculista, atualizarPromptOraculista } from '@/config/prompts/oraculistas'
import { supabase } from '@/lib/supabase'

interface OraculistasState {
  oraculistas: Oraculista[]
  loading: boolean
  error: string | null
  adicionarOraculista: (data: OraculistaFormData) => Promise<{ success: boolean; error?: string }>
  atualizarOraculista: (id: string, data: Partial<OraculistaFormData>) => Promise<{ success: boolean; error?: string }>
  alternarDisponibilidade: (id: string) => Promise<{ success: boolean; error?: string }>
  alternarPromocao: (id: string, precoPromocional?: number) => Promise<{ success: boolean; error?: string }>
  excluirOraculista: (id: string) => Promise<{ success: boolean; error?: string }>
  carregarOraculistas: () => Promise<void>
}

export const useOraculistasStore = create<OraculistasState>()((set, get) => ({
  oraculistas: [],
  loading: false,
  error: null,

  carregarOraculistas: async () => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('oraculistas')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      set({ 
        oraculistas: data.map(o => ({
          ...o,
          especialidades: o.especialidades || [],
          createdAt: new Date(o.created_at),
          updatedAt: new Date(o.updated_at),
          consultas: o.consultas || 0
        })),
        loading: false 
      })
    } catch (error: any) {
      set({ error: error.message, loading: false })
    }
  },

  adicionarOraculista: async (data) => {
    try {
      // Garantir que temos a sessão atual
      const { data: session } = await supabase.auth.getSession()
      if (!session?.session) {
        throw new Error('Usuário não autenticado')
      }

      const { data: newOraculista, error } = await supabase
        .from('oraculistas')
        .insert([{
          nome: data.nome,
          foto: data.foto,
          especialidades: data.especialidades,
          descricao: data.descricao,
          preco: data.preco,
          disponivel: data.disponivel,
          prompt: data.prompt,
          em_promocao: data.emPromocao,
          preco_promocional: data.precoPromocional,
          consultas: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) {
        console.error('Erro ao adicionar oraculista:', error)
        throw error
      }

      const oraculista = {
        ...newOraculista,
        especialidades: newOraculista.especialidades || [],
        createdAt: new Date(newOraculista.created_at),
        updatedAt: new Date(newOraculista.updated_at),
        emPromocao: newOraculista.em_promocao,
        precoPromocional: newOraculista.preco_promocional,
        consultas: 0
      }

      // Atualiza apenas o prompt do oraculista
      await atualizarPromptOraculista(oraculista)

      set(state => ({
        oraculistas: [oraculista, ...state.oraculistas]
      }))

      return { success: true }
    } catch (error: any) {
      console.error('Erro detalhado:', error)
      return { success: false, error: error.message }
    }
  },

  atualizarOraculista: async (id, data) => {
    try {
      const { error } = await supabase
        .from('oraculistas')
        .update({
          nome: data.nome,
          foto: data.foto,
          especialidades: data.especialidades,
          descricao: data.descricao,
          preco: data.preco,
          disponivel: data.disponivel,
          prompt: data.prompt,
          em_promocao: data.emPromocao,
          preco_promocional: data.precoPromocional,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error

      const oraculistaAtualizado = {
        id,
        ...data,
        updatedAt: new Date()
      }

      // Atualiza apenas o prompt do oraculista
      await atualizarPromptOraculista(oraculistaAtualizado)

      set(state => ({
        oraculistas: state.oraculistas.map(o => 
          o.id === id 
            ? oraculistaAtualizado
            : o
        )
      }))

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  },

  alternarDisponibilidade: async (id) => {
    const oraculista = get().oraculistas.find(o => o.id === id)
    if (!oraculista) return { success: false, error: 'Oraculista não encontrado' }

    try {
      const { error } = await supabase
        .from('oraculistas')
        .update({ 
          disponivel: !oraculista.disponivel,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error

      set(state => ({
        oraculistas: state.oraculistas.map(o =>
          o.id === id
            ? { ...o, disponivel: !o.disponivel, updatedAt: new Date() }
            : o
        )
      }))

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  },

  alternarPromocao: async (id, precoPromocional) => {
    const oraculista = get().oraculistas.find(o => o.id === id)
    if (!oraculista) return { success: false, error: 'Oraculista não encontrado' }

    try {
      const { error } = await supabase
        .from('oraculistas')
        .update({ 
          em_promocao: !oraculista.emPromocao,
          preco_promocional: !oraculista.emPromocao ? precoPromocional : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error

      set(state => ({
        oraculistas: state.oraculistas.map(o =>
          o.id === id
            ? { 
                ...o, 
                emPromocao: !o.emPromocao, 
                precoPromocional: !o.emPromocao ? precoPromocional : undefined,
                updatedAt: new Date()
              }
            : o
        )
      }))

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  },

  excluirOraculista: async (id) => {
    try {
      const { error } = await supabase
        .from('oraculistas')
        .delete()
        .eq('id', id)

      if (error) throw error

      set(state => ({
        oraculistas: state.oraculistas.filter(o => o.id !== id)
      }))

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
}))
