export interface Oraculista {
  id: string
  nome: string
  foto: string
}

export interface Mensagem {
  id: string
  userId: string
  oraculistaId: string
  titulo: string
  conteudo: string
  lida: boolean
  data: Date
  tipo: 'pergunta' | 'resposta'
  threadId?: string
  createdAt: Date
  updatedAt: Date
  oraculista?: Oraculista
  de: string
}

export type MensagemFiltro = 'todas' | 'nao_lidas' | 'respondidas'

export interface MensagemFormData {
  oraculistaId: string
  titulo: string
  conteudo: string
}
