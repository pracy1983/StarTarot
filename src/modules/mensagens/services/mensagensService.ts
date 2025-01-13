import { supabase } from '@/lib/supabase'
import { Mensagem, MensagemFormData } from '../types/mensagem'

export async function carregarMensagens(userId: string) {
  try {
    const { data, error } = await supabase
      .from('mensagens')
      .select(`
        id,
        user_id,
        oraculista_id,
        titulo,
        conteudo,
        lida,
        data,
        tipo,
        thread_id,
        created_at,
        updated_at,
        oraculistas (
          id,
          nome,
          foto
        )
      `)
      .eq('user_id', userId)
      .order('data', { ascending: false })

    if (error) {
      console.error('Erro ao carregar mensagens:', error)
      throw error
    }

    return data ? data.map(formatarMensagem) : []
  } catch (error) {
    console.error('Erro ao carregar mensagens:', error)
    throw error
  }
}

export async function enviarPergunta(userId: string, formData: MensagemFormData) {
  try {
    const { data, error } = await supabase
      .from('mensagens')
      .insert({
        user_id: userId,
        oraculista_id: formData.oraculistaId,
        titulo: formData.titulo,
        conteudo: formData.conteudo,
        tipo: 'pergunta',
        data: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Erro ao enviar pergunta:', error)
      throw error
    }

    return formatarMensagem(data)
  } catch (error) {
    console.error('Erro ao enviar pergunta:', error)
    throw error
  }
}

export async function marcarComoLida(mensagemId: string) {
  try {
    const { error } = await supabase
      .from('mensagens')
      .update({ lida: true })
      .eq('id', mensagemId)

    if (error) {
      console.error('Erro ao marcar mensagem como lida:', error)
      throw error
    }
  } catch (error) {
    console.error('Erro ao marcar mensagem como lida:', error)
    throw error
  }
}

function formatarMensagem(data: any): Mensagem {
  return {
    id: data.id,
    userId: data.user_id,
    oraculistaId: data.oraculista_id,
    titulo: data.titulo,
    conteudo: data.conteudo,
    lida: data.lida,
    data: new Date(data.data),
    tipo: data.tipo,
    threadId: data.thread_id,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
    oraculista: data.oraculistas ? {
      id: data.oraculistas.id,
      nome: data.oraculistas.nome,
      foto: data.oraculistas.foto
    } : undefined
  }
}
