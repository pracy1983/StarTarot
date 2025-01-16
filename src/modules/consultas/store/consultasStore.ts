import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { Consulta, ConsultasState } from '../types/consulta'

const formatConsulta = (data: any): Consulta => ({
  id: data.id,
  dataHora: new Date(data.data_hora),
  valor: data.valor || 0,
  status: data.status || 'pendente',
  oraculistaId: data.oraculista_id,
  clienteId: data.cliente_id,
  pagamentoId: data.pagamento_id,
  createdAt: new Date(data.created_at),
  updatedAt: new Date(data.updated_at)
})

export const useConsultasStore = create<ConsultasState>()((set) => ({
  consultas: [],
  loading: false,
  error: null,

  carregarConsultas: async () => {
    try {
      set({ loading: true, error: null })
      const { data, error } = await supabase
        .from('consultas')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      const consultasFormatadas = (data || []).map(formatConsulta)
      set({ consultas: consultasFormatadas, loading: false })
    } catch (error: any) {
      console.error('Erro ao carregar consultas:', error)
      set({ error: error.message, loading: false })
    }
  }
})) 