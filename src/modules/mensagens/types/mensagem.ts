export interface Oraculista {
  id: string
  nome: string
  foto: string
}

export interface Mensagem {
  id: string
  user_id: string
  oraculista_id: string
  conteudo: string
  tipo: 'pergunta' | 'resposta'
  data: Date
  lida: boolean
  updatedAt: Date
  status: 'enviada' | 'entregue' | 'falha'
  pergunta_ref?: string
  perguntaOriginal?: string
  thread_id?: string
  oraculista?: {
    id: string
    nome: string
    foto: string
  }
}

export type MensagemFiltro = 'todas' | 'nao_lidas' | 'respondidas'

export interface MensagemFormData {
  oraculistaId: string
  conteudo: string
}
