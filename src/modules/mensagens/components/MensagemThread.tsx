import React, { useEffect, useState } from 'react'
import { Mensagem } from '../types/mensagem'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useMensagensStore } from '../store/mensagensStore'

interface MensagemThreadProps {
  mensagemId: string
  onDelete?: (id: string) => void
  onMarcarLida?: (id: string) => void
}

interface ThreadStyle {
  marginLeft: string
  borderLeft: string
  paddingLeft: string
}

export const MensagemThread: React.FC<MensagemThreadProps> = ({
  mensagemId,
  onDelete,
  onMarcarLida
}) => {
  const [mensagem, setMensagem] = useState<Mensagem | null>(null)
  const [resposta, setResposta] = useState<Mensagem | null>(null)
  const { carregarMensagemComResposta } = useMensagensStore()

  useEffect(() => {
    const carregarMensagens = async () => {
      try {
        const mensagens = await carregarMensagemComResposta(mensagemId)
        if (mensagens.length > 0) {
          setMensagem(mensagens[0])
          if (mensagens.length > 1) {
            setResposta(mensagens[1])
          }
        }
      } catch (error) {
        console.error('Erro ao carregar mensagens:', error)
      }
    }

    carregarMensagens()
  }, [mensagemId, carregarMensagemComResposta])

  if (!mensagem) {
    return <div>Carregando...</div>
  }

  const nivelThread = mensagem.thread_id ? 1 : 0
  
  const threadStyle: ThreadStyle = {
    marginLeft: `${nivelThread * 2}rem`,
    borderLeft: nivelThread > 0 ? '2px solid rgba(255, 255, 255, 0.1)' : 'none',
    paddingLeft: nivelThread > 0 ? '1rem' : '0'
  }
  const formatarData = (data: Date) => {
    return format(data, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
      locale: ptBR
    })
  }

  return (
    <div className="flex flex-col h-full p-4 space-y-4 scrollbar-custom">
      {/* Cabeçalho com foto e info */}
      <div className="flex items-center space-x-4">
        <img 
          src={mensagem.oraculista?.foto} 
          alt={mensagem.oraculista?.nome}
          className="w-16 h-16 rounded-full object-cover border-2 border-primary/30"
        />
        <div>
          <h3 className="text-lg font-medium text-primary">{mensagem.oraculista?.nome}</h3>
          <p className="text-sm text-gray-400">{formatarData(mensagem.data)}</p>
        </div>
      </div>

      {/* Container da mensagem */}
      <div className="flex-1 bg-black/40 backdrop-blur-md rounded-xl p-4 space-y-4 overflow-y-auto scrollbar-custom">
        {/* Resposta do oraculista */}
        <div className="space-y-2">
          <h4 className="text-primary font-medium">Resposta:</h4>
          <div
            dangerouslySetInnerHTML={{ __html: mensagem.conteudo }}
            className="text-gray-300 whitespace-pre-wrap"
          />
        </div>

        {/* Pergunta/Contexto do usuário */}
        {mensagem.perguntaOriginal && (
          <div className="mt-6 p-4 bg-gray-900/50 rounded-lg space-y-2">
            <h4 className="text-primary/80 font-medium">Sua Pergunta:</h4>
            <p className="text-gray-400 whitespace-pre-wrap">{mensagem.perguntaOriginal}</p>
          </div>
        )}
      </div>

      {/* Ações */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-200/20">
        <div className="flex space-x-4">
          {!mensagem.lida && onMarcarLida && (
            <button
              onClick={() => onMarcarLida(mensagem.id)}
              className="text-primary hover:text-primary/80"
            >
              Marcar como lida
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(mensagem.id)}
              className="text-red-500 hover:text-red-400"
            >
              Excluir
            </button>
          )}
        </div>
        <div className="flex items-center">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              mensagem.lida
                ? 'bg-green-500/20 text-green-400'
                : 'bg-yellow-500/20 text-yellow-400'
            }`}
          >
            {mensagem.lida ? 'Lida' : 'Não lida'}
          </span>
        </div>
      </div>
    </div>
  )
}
