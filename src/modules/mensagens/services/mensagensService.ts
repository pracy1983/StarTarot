import { supabase } from '@/lib/supabase'
import { Mensagem, MensagemFormData } from '../types/mensagem'

export async function carregarMensagens(userId: string) {
  try {
    const { data, error } = await supabase
      .from('mensagens')
      .select(`
        mensagens.id,
        mensagens.user_id,
        mensagens.oraculista_id,
        mensagens.titulo,
        mensagens.conteudo,
        mensagens.lida,
        mensagens.data,
        mensagens.tipo,
        mensagens.thread_id,
        mensagens.created_at,
        mensagens.updated_at,
        oraculista:oraculistas (
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
      .select(`
        mensagens.id,
        mensagens.user_id,
        mensagens.oraculista_id,
        mensagens.titulo,
        mensagens.conteudo,
        mensagens.lida,
        mensagens.data,
        mensagens.tipo,
        mensagens.thread_id,
        mensagens.created_at,
        mensagens.updated_at,
        oraculista:oraculistas (
          id,
          nome,
          foto
        )
      `)
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

export async function enviarResposta(mensagemId: string, oraculistaId: string, conteudo: string) {
  try {
    const { data, error } = await supabase
      .from('mensagens')
      .insert({
        user_id: (await supabase.from('mensagens').select('user_id').eq('id', mensagemId).single()).data?.user_id,
        oraculista_id: oraculistaId,
        titulo: 'Resposta do Oraculista',
        conteudo: conteudo,
        tipo: 'resposta',
        thread_id: mensagemId,
        data: new Date().toISOString()
      })
      .select(`
        mensagens.id,
        mensagens.user_id,
        mensagens.oraculista_id,
        mensagens.titulo,
        mensagens.conteudo,
        mensagens.lida,
        mensagens.data,
        mensagens.tipo,
        mensagens.thread_id,
        mensagens.created_at,
        mensagens.updated_at,
        oraculista:oraculistas (
          id,
          nome,
          foto
        )
      `)
      .single()

    if (error) {
      console.error('Erro ao enviar resposta:', error)
      throw error
    }

    return formatarMensagem(data)
  } catch (error) {
    console.error('Erro ao enviar resposta:', error)
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

// Função auxiliar para testes
export async function enviarMensagemTeste(userId: string) {
  try {
    // Primeiro, enviar uma pergunta
    const pergunta = await enviarPergunta(userId, {
      oraculistaId: '1', // ID do primeiro oraculista
      titulo: 'Dúvida sobre relacionamento',
      conteudo: 'Olá, gostaria de saber sobre meu relacionamento atual. Tenho algumas dúvidas sobre o futuro.'
    })

    // Depois, enviar a resposta do oraculista
    if (pergunta) {
      await enviarResposta(
        pergunta.id,
        pergunta.oraculistaId,
        'Querido consulente, analisando suas cartas, vejo que seu relacionamento está passando por uma fase de transformação importante. As cartas indicam que é um momento de crescimento mútuo, onde a comunicação será fundamental. Mantenha seu coração aberto e seja honesto com seus sentimentos. O período atual pede reflexão e paciência.'
      )
    }

    return true
  } catch (error) {
    console.error('Erro ao enviar mensagem de teste:', error)
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
    oraculista: data.oraculista ? {
      id: data.oraculista.id,
      nome: data.oraculista.nome,
      foto: data.oraculista.foto
    } : undefined
  }
}
