import { create } from 'zustand'
import { Oraculista, OraculistaFormData } from '../types/oraculista'
import { supabase } from '@/lib/supabase'
import { OraculistasService } from '../services/oraculistasService'

interface OraculistasState {
  oraculistas: Oraculista[]
  loading: boolean
  error: string | null
  adicionarOraculista: (data: OraculistaFormData) => Promise<{ success: boolean; error?: string }>
  atualizarOraculista: (id: string, data: Partial<OraculistaFormData>) => Promise<{ success: boolean; error?: string }>
  alternarDisponibilidade: (id: string) => Promise<{ success: boolean; error?: string }>
  alternarPromocao: (id: string, precoPromocional?: number | null) => Promise<{ success: boolean; error?: string }>
  excluirOraculista: (id: string) => Promise<{ success: boolean; error?: string }>
  carregarOraculistas: () => Promise<void>
}

// Garantir que os dados são formatados corretamente
const formatOraculista = (data: any): Oraculista => ({
  ...data,
  createdAt: data.created_at ? new Date(data.created_at) : new Date(),
  updatedAt: data.updated_at ? new Date(data.updated_at) : new Date(),
  rating: data.rating || 0,
  status: data.status || 'offline',
  totalAvaliacoes: data.totalAvaliacoes || 0,
  consultas: data.consultas || 0,
  especialidades: data.especialidades || [],
  emPromocao: data.em_promocao || false,
  precoPromocional: data.preco_promocional || undefined
})

export const useOraculistasStore = create<OraculistasState>()((set, get) => ({
  oraculistas: [],
  loading: false,
  error: null,

  carregarOraculistas: async () => {
    try {
      set({ loading: true, error: null })
      
      // Usar o service para carregar os dados
      const oraculistas = await OraculistasService.carregarOraculistas()

      // Garantir que todos os campos existem e estão no formato correto
      const oraculistasFormatados = oraculistas.map(formatOraculista)

      set({ oraculistas: oraculistasFormatados, loading: false })
    } catch (error: any) {
      console.error('Erro ao carregar oraculistas:', error)
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

      const oraculista = formatOraculista(newOraculista)

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
      const { data: updated, error } = await supabase
        .from('oraculistas')
        .update({
          nome: data.nome,
          foto: data.foto,
          especialidades: data.especialidades,
          descricao: data.descricao,
          preco: data.preco,
          disponivel: data.disponivel,
          prompt: data.prompt,
          prompt_formatado: data.prompt_formatado,
          em_promocao: data.emPromocao,
          preco_promocional: data.precoPromocional,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      // Atualiza o estado local com os dados formatados
      set(state => ({
        oraculistas: state.oraculistas.map(o => 
          o.id === id 
            ? {
                ...o,
                nome: data.nome ?? o.nome,
                foto: data.foto ?? o.foto,
                especialidades: data.especialidades ?? o.especialidades,
                descricao: data.descricao ?? o.descricao,
                preco: data.preco ?? o.preco,
                disponivel: data.disponivel ?? o.disponivel,
                prompt: data.prompt ?? o.prompt,
                prompt_formatado: data.prompt_formatado ?? o.prompt_formatado,
                emPromocao: data.emPromocao ?? o.emPromocao,
                precoPromocional: data.precoPromocional,
                updatedAt: new Date()
              }
            : o
        )
      }))

      // Recarrega os oraculistas para garantir sincronização
      await get().carregarOraculistas()

      return { success: true }
    } catch (error: any) {
      console.error('Erro ao atualizar oraculista:', error)
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

  excluirOraculista: async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('oraculistas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Atualiza o estado removendo o oraculista
      set((state) => ({
        oraculistas: state.oraculistas.filter((o) => o.id !== id)
      }));

      return { success: true };
    } catch (error: any) {
      console.error('Erro ao excluir oraculista:', error);
      return { success: false, error: error.message };
    }
  },
}))
