'use client'

import { useEffect, useState } from 'react'
import { Message } from '@/modules/mensagens/types/message'
import { useMensagensStore } from '@/modules/mensagens/store/mensagensStore'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function ConsultasPage() {
  const mensagens = useMensagensStore((state) => state.mensagens)
  const loading = useMensagensStore((state) => state.loading)
  const carregarMensagens = useMensagensStore((state) => state.carregarMensagens)
  const marcarComoLida = useMensagensStore((state) => state.marcarComoLida)

  const [mensagensEnviadas, setMensagensEnviadas] = useState<Message[]>([])
  const [filtro, setFiltro] = useState<'todas' | 'pendentes' | 'respondidas'>('todas')

  useEffect(() => {
    carregarMensagens()
  }, [carregarMensagens])

  const handleMarcarEnviada = (mensagemId: string) => {
    const mensagem = mensagens.find(m => m.id === mensagemId)
    if (mensagem && !mensagensEnviadas.some(m => m.id === mensagemId)) {
      setMensagensEnviadas(prev => [...prev, mensagem])
    }
  }

  const getMensagensFiltradas = () => {
    switch (filtro) {
      case 'pendentes':
        return mensagens.filter(m => !mensagensEnviadas.some(me => me.id === m.id))
      case 'respondidas':
        return mensagensEnviadas
      default:
        return mensagens
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="text-gray-400 mt-4">Carregando consultas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">
            Consultas
          </h1>
          <p className="text-gray-400">
            Gerencie as consultas dos usuários
          </p>
        </div>

        {/* Filtros */}
        <div className="mb-6 flex gap-4">
          <button
            onClick={() => setFiltro('todas')}
            className={`px-4 py-2 rounded-lg transition-all ${
              filtro === 'todas'
                ? 'bg-primary text-black'
                : 'bg-black/40 text-primary hover:bg-black/60'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setFiltro('pendentes')}
            className={`px-4 py-2 rounded-lg transition-all ${
              filtro === 'pendentes'
                ? 'bg-primary text-black'
                : 'bg-black/40 text-primary hover:bg-black/60'
            }`}
          >
            Pendentes
          </button>
          <button
            onClick={() => setFiltro('respondidas')}
            className={`px-4 py-2 rounded-lg transition-all ${
              filtro === 'respondidas'
                ? 'bg-primary text-black'
                : 'bg-black/40 text-primary hover:bg-black/60'
            }`}
          >
            Respondidas
          </button>
        </div>

        {/* Lista de Consultas */}
        <div className="space-y-4">
          {getMensagensFiltradas().map((mensagem) => (
            <div
              key={mensagem.id}
              className="bg-black/40 backdrop-blur-md border border-primary/20 rounded-lg p-4"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-medium text-primary">
                    {mensagem.oraculista_nome}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {format(new Date(mensagem.data), "d 'de' MMMM 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!mensagem.lida && (
                    <button
                      onClick={() => marcarComoLida(mensagem.id)}
                      className="px-3 py-1 text-xs bg-primary/10 text-primary rounded-full"
                    >
                      Marcar como lida
                    </button>
                  )}
                  {!mensagensEnviadas.some(m => m.id === mensagem.id) && (
                    <button
                      onClick={() => handleMarcarEnviada(mensagem.id)}
                      className="px-3 py-1 text-xs bg-green-500/10 text-green-400 rounded-full"
                    >
                      Marcar como enviada
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-black/20 rounded-lg p-4">
                  <h4 className="text-primary font-medium mb-2">
                    Pergunta do Usuário
                  </h4>
                  <p className="text-gray-300">
                    {mensagem.conteudo}
                  </p>
                </div>

                {mensagem.respostas?.map((resposta) => (
                  <div
                    key={resposta.id}
                    className="bg-primary/5 rounded-lg p-4 ml-4 border-l-2 border-primary/20"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-primary font-medium">
                        Resposta do Oraculista
                      </h4>
                      <span className="text-xs text-gray-400">
                        {format(new Date(resposta.data), "d 'de' MMMM 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                    <p className="text-gray-300">
                      {resposta.conteudo}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {getMensagensFiltradas().length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-400">
                Nenhuma consulta encontrada
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
