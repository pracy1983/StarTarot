export interface Message {
  id: string
  user_id: string
  oraculista_id: string
  oraculista_nome: string
  conteudo: string
  tipo: 'pergunta' | 'resposta'
  data: string
  lida: boolean
  respostas?: Message[]
  pergunta_ref?: string
  updatedAt?: string
}
