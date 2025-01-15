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
  precoPromocional?: number
  consultas: number // Número total de consultas realizadas
  createdAt: Date
  updatedAt: Date
  descontoTemp?: string // Campo temporário para armazenar o valor do desconto antes de aplicar
}

export interface OraculistaFormData extends Omit<Oraculista, 'id' | 'createdAt' | 'updatedAt' | 'consultas'> {
  fotoFile?: File
}

export type OraculistaStatus = 'disponivel' | 'indisponivel'
