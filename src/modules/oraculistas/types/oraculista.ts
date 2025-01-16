export interface Oraculista {
  id: string
  nome: string
  foto: string
  especialidades: string[]
  descricao: string
  preco: number
  disponivel: boolean
  prompt?: string
  prompt_formatado?: string
  emPromocao: boolean
  precoPromocional?: number | null
  consultas: number // Número total de consultas realizadas
  createdAt: Date
  updatedAt: Date
  descontoTemp?: string // Campo temporário para armazenar o valor do desconto antes de aplicar
  rating?: number // Avaliação do oraculista (0-5)
  status?: 'online' | 'offline' | 'ocupado' // Status de disponibilidade
  totalAvaliacoes?: number // Total de avaliações recebidas
  created_at?: string // Campo do banco de dados
  updated_at?: string // Campo do banco de dados
  em_promocao: boolean
  preco_promocional?: number | null
}

export interface OraculistaFormData extends Omit<Oraculista, 'id' | 'createdAt' | 'updatedAt' | 'consultas'> {
  fotoFile?: File
  precoPromocional?: number | null
}

export type OraculistaStatus = 'disponivel' | 'indisponivel'
