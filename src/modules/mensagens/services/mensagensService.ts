import { supabase } from '@/lib/supabase'
import { Mensagem, MensagemFormData } from '../types/mensagem'

// Função auxiliar para verificar se as tabelas existem
async function verificarTabelasExistem() {
  const { error: mensagensError } = await supabase
    .from('mensagens')
    .select('id')
    .limit(1)

  const { error: oraculistasError } = await supabase
    .from('oraculistas')
    .select('id')
    .limit(1)

  if (mensagensError?.code === '42P01' || oraculistasError?.code === '42P01') {
    throw new Error(
      'As tabelas necessárias não existem no banco de dados. Por favor, execute o script de criação das tabelas.'
    )
  }
}

export async function carregarMensagens(userId?: string) {
  try {
    console.log('=== INÍCIO CARREGAMENTO ===')
    console.log('Carregando mensagens para usuário:', userId)
    await verificarTabelasExistem()

    let query = supabase
      .from('mensagens')
      .select(`
        *,
        oraculista:oraculistas (
          id,
          nome,
          foto
        )
      `)
      .order('data', { ascending: false })

    // Se um userId for fornecido, filtra por ele
    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Erro ao carregar mensagens:', error)
      throw error
    }

    console.log('Mensagens brutas do Supabase:', data)
    const mensagensFiltradas = data?.filter(msg => msg !== null) || []
    console.log('Mensagens filtradas:', mensagensFiltradas.length)
    console.log('=== FIM CARREGAMENTO ===')

    return mensagensFiltradas.map(formatarMensagem)
  } catch (error) {
    console.error('Erro ao carregar mensagens:', error)
    throw error
  }
}

export async function enviarPergunta(userId: string, formData: MensagemFormData) {
  try {
    await verificarTabelasExistem()

    console.log('Enviando mensagem para o oraculista:', formData.oraculistaId);

    // Verificar se o oraculista existe
    const { data: oraculista, error: oraculistaError } = await supabase
      .from('oraculistas')
      .select('id, nome, foto')
      .eq('id', formData.oraculistaId)
      .single()

    if (oraculistaError || !oraculista) {
      throw new Error('Oraculista não encontrado')
    }

    const { data: mensagem, error: mensagemError } = await supabase
      .from('mensagens')
      .insert({
        user_id: userId,
        oraculista_id: formData.oraculistaId,
        titulo: formData.titulo,
        conteudo: formData.conteudo,
        tipo: 'pergunta',
        data: new Date(),
        lida: false,
        created_at: new Date(),
        updated_at: new Date()
      })
      .select(`
        *,
        oraculista:oraculistas (
          id,
          nome,
          foto
        )
      `)
      .single()

    if (mensagemError) {
      console.error('Erro ao enviar pergunta:', mensagemError)
      throw mensagemError
    }

    return formatarMensagem(mensagem)
  } catch (error) {
    console.error('Erro ao enviar pergunta:', error)
    throw error
  }
}

export async function enviarResposta(mensagemId: string, oraculistaId: string, conteudo: string) {
  try {
    await verificarTabelasExistem()

    // Primeiro, vamos verificar se a mensagem original existe
    const { data: mensagemOriginal, error: mensagemOriginalError } = await supabase
      .from('mensagens')
      .select('user_id')
      .eq('id', mensagemId)
      .single()

    if (mensagemOriginalError || !mensagemOriginal) {
      console.error('Erro ao buscar mensagem original:', mensagemOriginalError)
      throw mensagemOriginalError || new Error('Mensagem original não encontrada')
    }

    // Verificar se o oraculista existe
    const { data: oraculista, error: oraculistaError } = await supabase
      .from('oraculistas')
      .select('id, nome, foto')
      .eq('id', oraculistaId)
      .single()

    if (oraculistaError || !oraculista) {
      console.error('Erro ao verificar oraculista:', oraculistaError)
      throw oraculistaError || new Error('Oraculista não encontrado')
    }

    // Agora vamos inserir a resposta
    const { data: mensagem, error: mensagemError } = await supabase
      .from('mensagens')
      .insert({
        user_id: mensagemOriginal.user_id,
        oraculista_id: oraculistaId,
        titulo: 'Resposta do Oraculista',
        conteudo: conteudo,
        tipo: 'resposta',
        thread_id: mensagemId,
        data: new Date(),
        lida: false,
        created_at: new Date(),
        updated_at: new Date()
      })
      .select(`
        *,
        oraculista:oraculistas (
          id,
          nome,
          foto
        )
      `)
      .single()

    if (mensagemError) {
      console.error('Erro ao enviar resposta:', mensagemError)
      throw mensagemError
    }

    return formatarMensagem(mensagem)
  } catch (error) {
    console.error('Erro ao enviar resposta:', error)
    throw error
  }
}

export async function marcarComoLida(mensagemId: string) {
  try {
    await verificarTabelasExistem()

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

export async function deletarMensagem(mensagemId: string, userId: string) {
  try {
    console.log('=== INÍCIO DELEÇÃO ===')
    console.log('Tentando deletar mensagem:', mensagemId, 'para usuário:', userId)

    // Primeiro, busca a mensagem para ver se é uma pergunta ou resposta
    const { data: mensagem, error: buscaError } = await supabase
      .from('mensagens')
      .select('*')
      .eq('id', mensagemId)
      .single()

    if (buscaError) {
      console.error('Erro ao buscar mensagem:', buscaError)
      throw buscaError
    }

    console.log('Mensagem encontrada:', mensagem)

    if (mensagem) {
      // Verifica se a mensagem pertence ao usuário
      if (mensagem.user_id !== userId) {
        throw new Error('Mensagem não pertence ao usuário')
      }

      if (mensagem.tipo === 'pergunta') {
        console.log('Deletando resposta para thread_id:', mensagem.id)
        // Se for uma pergunta, deleta também a resposta
        const { error: deleteRespostaError } = await supabase
          .from('mensagens')
          .delete()
          .eq('thread_id', mensagem.id)

        if (deleteRespostaError) {
          console.error('Erro ao deletar resposta:', deleteRespostaError)
          throw deleteRespostaError
        }
        console.log('Resposta deletada com sucesso')
      }

      console.log('Deletando mensagem principal:', mensagemId)
      // Deleta a mensagem em si
      const { error: deleteMensagemError } = await supabase
        .from('mensagens')
        .delete()
        .eq('id', mensagemId)

      if (deleteMensagemError) {
        console.error('Erro ao deletar mensagem:', deleteMensagemError)
        throw deleteMensagemError
      }

      console.log('Mensagem deletada com sucesso')
      console.log('=== FIM DELEÇÃO ===')
    } else {
      console.error('Mensagem não encontrada')
      throw new Error('Mensagem não encontrada')
    }
  } catch (error) {
    console.error('Erro ao deletar mensagem:', error)
    throw error
  }
}

// Função auxiliar para testes
export async function enviarMensagemTeste(userId: string) {
  try {
    console.log('=== INÍCIO VERIFICAÇÃO MENSAGEM TESTE ===')
    await verificarTabelasExistem()

    // Verifica se já existem mensagens no Supabase
    const { data: mensagensExistentes, error } = await supabase
      .from('mensagens')
      .select('id')
      .eq('user_id', userId)

    if (error) {
      console.error('Erro ao verificar mensagens existentes:', error)
      throw error
    }

    if (mensagensExistentes && mensagensExistentes.length > 0) {
      console.log('Já existem mensagens para o usuário:', mensagensExistentes.length)
      console.log('=== FIM VERIFICAÇÃO MENSAGEM TESTE ===')
      return false
    }

    console.log('Nenhuma mensagem encontrada, enviando mensagem de teste')

    // Primeiro, buscar um oraculista
    const { data: oraculista, error: oraculistaError } = await supabase
      .from('oraculistas')
      .select('id')
      .limit(1)
      .single()

    if (oraculistaError || !oraculista) {
      console.error('Erro ao buscar oraculista:', oraculistaError)
      throw oraculistaError || new Error('Nenhum oraculista encontrado')
    }

    // Enviar uma pergunta
    const pergunta = await enviarPergunta(userId, {
      oraculistaId: oraculista.id,
      titulo: 'Dúvida sobre relacionamento',
      conteudo: 'Olá, gostaria de saber sobre meu relacionamento atual. Tenho algumas dúvidas sobre o futuro.'
    })

    // Enviar a resposta do oraculista
    if (pergunta) {
      await enviarResposta(
        pergunta.id,
        oraculista.id,
        'Olá! Estou vendo que você está em um momento de reflexão sobre seu relacionamento. As cartas indicam um período de transformações positivas. Continue mantendo o diálogo aberto e a sinceridade com seu parceiro(a). Se precisar de mais orientações específicas, estou à disposição.'
      )
    }

    console.log('Mensagem de teste enviada com sucesso')
    console.log('=== FIM VERIFICAÇÃO MENSAGEM TESTE ===')
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
    } : undefined,
    de: data.tipo === 'pergunta' ? 'Usuário' : data.oraculista?.nome || 'Oraculista'
  }
}
