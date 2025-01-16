import { BaseEntity } from '@/types/global'

export type ConsultaStatus = 'pendente' | 'confirmada' | 'concluida' | 'cancelada'

export interface Consulta extends BaseEntity {
  dataHora: Date
  valor: number
  status: ConsultaStatus
  oraculistaId: string
  clienteId: string
  pagamentoId?: string
}

export interface ConsultasState {
  consultas: Consulta[]
  loading: boolean
  error: string | null
  carregarConsultas: () => Promise<void>
} 