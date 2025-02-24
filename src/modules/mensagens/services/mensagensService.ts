import { Message } from '../types/message'

export class MensagensService {
  async iniciarConsulta(oraculistaId: string, userId: string) {
    try {
      const response = await fetch('/api/chat/iniciar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ oraculistaId, userId }),
      })

      if (!response.ok) {
        throw new Error('Erro ao iniciar consulta')
      }

      return { success: true }
    } catch (error) {
      console.error('Erro ao iniciar consulta:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Erro ao iniciar consulta' }
    }
  }

  async buscarMensagens(params: {
    userId?: string
    oraculistaId?: string
    dataInicio?: Date
    dataFim?: Date
    status?: string
    limit?: number
  }) {
    try {
      const queryParams = new URLSearchParams()
      if (params.userId) queryParams.append('userId', params.userId)
      if (params.oraculistaId) queryParams.append('oraculistaId', params.oraculistaId)
      if (params.dataInicio) queryParams.append('dataInicio', params.dataInicio.toISOString())
      if (params.dataFim) queryParams.append('dataFim', params.dataFim.toISOString())
      if (params.status) queryParams.append('status', params.status)
      if (params.limit) queryParams.append('limit', params.limit.toString())

      const response = await fetch(`/api/chat/mensagens?${queryParams}`)
      if (!response.ok) {
        throw new Error('Erro ao buscar mensagens')
      }

      const data = await response.json()
      return data.mensagens
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error)
      return []
    }
  }

  async enviarMensagem(mensagem: Omit<Message, 'id'>) {
    try {
      const response = await fetch('/api/chat/mensagens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mensagem),
      })

      if (!response.ok) {
        throw new Error('Erro ao enviar mensagem')
      }

      const data = await response.json()
      return { success: true, mensagem: data }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Erro ao enviar mensagem' }
    }
  }

  async atualizarMensagem(id: string, dados: Partial<Message>) {
    try {
      const response = await fetch(`/api/chat/mensagens/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dados),
      })

      if (!response.ok) {
        throw new Error('Erro ao atualizar mensagem')
      }

      const data = await response.json()
      return { success: true, mensagem: data }
    } catch (error) {
      console.error('Erro ao atualizar mensagem:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Erro ao atualizar mensagem' }
    }
  }

  async excluirMensagem(id: string) {
    try {
      const response = await fetch(`/api/chat/mensagens/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Erro ao excluir mensagem')
      }

      return { success: true }
    } catch (error) {
      console.error('Erro ao excluir mensagem:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Erro ao excluir mensagem' }
    }
  }

  async marcarComoLida(id: string) {
    try {
      const response = await fetch(`/api/chat/mensagens/${id}/lida`, {
        method: 'PUT',
      })

      if (!response.ok) {
        throw new Error('Erro ao marcar mensagem como lida')
      }

      return { success: true }
    } catch (error) {
      console.error('Erro ao marcar mensagem como lida:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Erro ao marcar mensagem como lida' }
    }
  }
}
