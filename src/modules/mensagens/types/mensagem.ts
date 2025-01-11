export interface Mensagem {
  id: string
  userId: string
  titulo: string
  conteudo: string
  lida: boolean
  data: Date
  tipo: 'pergunta' | 'resposta'
  threadId?: string
}

export type MensagemFiltro = 'todas' | 'nao_lidas' | 'respondidas'
