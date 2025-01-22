import React, { useEffect, useState } from 'react'
import { Mensagem } from '../types/mensagem'
import { useMensagensStore } from '../store/mensagensStore'
import { formatarData } from '../../../utils/format'

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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { carregarMensagemComResposta } = useMensagensStore()

  useEffect(() => {
    const carregarMensagens = async () => {
      try {
        setLoading(true)
        setError(null)
        
        if (!mensagemId || typeof mensagemId !== 'string') {
          setError('ID da mensagem inválido')
          setLoading(false)
          return
        }

        console.log('Iniciando carregamento da thread:', mensagemId)
        const mensagens = await carregarMensagemComResposta(mensagemId)
        console.log('Mensagens carregadas:', mensagens)

        // Encontra a mensagem específica que foi clicada
        const mensagemClicada = mensagens.find(m => m.id === mensagemId)
        
        if (mensagemClicada) {
          setMensagem(mensagemClicada)
          // Se for uma resposta, procura a pergunta original
          if (mensagemClicada.pergunta_ref) {
            const perguntaOriginal = mensagens.find(m => m.id === mensagemClicada.pergunta_ref)
            if (perguntaOriginal) {
              setMensagem(perguntaOriginal)
              setResposta(mensagemClicada)
            }
          } else {
            // Se for uma pergunta, procura a resposta
            const respostaAssociada = mensagens.find(m => m.pergunta_ref === mensagemClicada.id)
            setResposta(respostaAssociada || null)
          }
        } else {
          setError('Mensagem não encontrada')
        }
      } catch (error) {
        console.error('Erro ao carregar mensagens:', error)
        setError('Erro ao carregar mensagens')
      } finally {
        setLoading(false)
      }
    }

    carregarMensagens()
  }, [mensagemId, carregarMensagemComResposta])

  if (loading) {
    return <div className="p-4 text-center">Carregando...</div>
  }

  if (error) {
    return <div className="p-4 text-red-500 text-center">{error}</div>
  }

  if (!mensagem) {
    return <div className="p-4 text-center">Mensagem não encontrada</div>
  }

  const nivelThread = mensagem.thread_id ? 1 : 0
  
  const threadStyle: ThreadStyle = {
    marginLeft: `${nivelThread * 2}rem`,
    borderLeft: nivelThread > 0 ? '2px solid rgba(255, 255, 255, 0.1)' : 'none',
    paddingLeft: nivelThread > 0 ? '1rem' : '0'
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
        {/* Sempre mostra a mensagem principal */}
        <div className={`p-4 ${mensagem.tipo === 'pergunta' ? 'bg-gray-900/50' : ''} rounded-lg space-y-2`}>
          <h4 className="text-primary/80 font-medium">
            {mensagem.tipo === 'pergunta' ? 'Situação e Pergunta:' : 'Resposta do Oráculo:'}
          </h4>
          {mensagem.tipo === 'pergunta' ? (
            <p className="text-gray-400 whitespace-pre-wrap">
              {mensagem.perguntaOriginal || mensagem.conteudo}
            </p>
          ) : (
            <div
              dangerouslySetInnerHTML={{ 
                __html: mensagem.conteudo.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/\n/g, '<br>')
                  .replace(/\*(.*?)\*/g, '<em>$1</em>')
                  .split('**').join('')
                  .split('*').join('')
              }}
              className="text-gray-300 prose prose-invert max-w-none prose-headings:text-primary prose-strong:text-primary/90 prose-em:text-gray-400"
            />
          )}
        </div>

        {/* Se for uma pergunta e tiver resposta, mostra a resposta recuada */}
        {mensagem.tipo === 'pergunta' && resposta && (
          <div className="ml-4 p-4 border-l-2 border-l-primary/20 space-y-2">
            <div className="flex items-center gap-4 mb-2">
              <img 
                src={resposta.oraculista?.foto} 
                alt={resposta.oraculista?.nome}
                className="w-8 h-8 rounded-full object-cover border border-primary/30"
              />
              <div>
                <h4 className="text-primary font-medium text-sm">Resposta do Oráculo:</h4>
                <p className="text-xs text-gray-400">{formatarData(resposta.data)}</p>
              </div>
            </div>
            <div
              dangerouslySetInnerHTML={{ 
                __html: resposta.conteudo.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/\n/g, '<br>')
                  .replace(/\*(.*?)\*/g, '<em>$1</em>')
                  .split('**').join('')
                  .split('*').join('')
              }}
              className="text-gray-300 prose prose-invert max-w-none prose-headings:text-primary prose-strong:text-primary/90 prose-em:text-gray-400"
            />
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
