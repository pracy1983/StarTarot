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
  rating?: number
  createdAt: Date
  updatedAt: Date
  descontoTemp?: number | string
}

export interface OraculistaFormData extends Omit<Oraculista, 'id' | 'createdAt' | 'updatedAt' | 'consultas'> {
  fotoFile?: File
}

export type OraculistaStatus = 'disponivel' | 'indisponivel'
