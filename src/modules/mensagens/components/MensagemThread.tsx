'use client'

import { useState } from 'react'
import { Message } from '../types/message'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Trash2 } from 'lucide-react'

interface MensagemThreadProps {
  mensagem: Message
  onEnviarResposta: (mensagemId: string, oraculistaId: string, conteudo: string) => Promise<void>
  onDeletarMensagem: (mensagemId: string, userId: string) => Promise<void>
}

export function MensagemThread({
  mensagem,
  onEnviarResposta,
  onDeletarMensagem
}: MensagemThreadProps) {
  const [resposta, setResposta] = useState('')
  const [enviando, setEnviando] = useState(false)

  const handleEnviarResposta = async () => {
    if (!resposta.trim()) return

    try {
      setEnviando(true)
      await onEnviarResposta(mensagem.id, mensagem.oraculista_id, resposta)
      setResposta('')
    } catch (error) {
      console.error('Erro ao enviar resposta:', error)
    } finally {
      setEnviando(false)
    }
  }

  const handleDeletar = async () => {
    if (window.confirm('Tem certeza que deseja deletar esta mensagem?')) {
      try {
        await onDeletarMensagem(mensagem.id, mensagem.user_id)
      } catch (error) {
        console.error('Erro ao deletar mensagem:', error)
      }
    }
  }

  return (
    <div className="bg-black/40 backdrop-blur-md border border-primary/20 rounded-lg p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-primary">
          Conversa com {mensagem.oraculista_nome}
        </h2>
        <button
          onClick={handleDeletar}
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
          title="Deletar conversa"
        >
          <Trash2 size={20} />
        </button>
      </div>

      <div className="space-y-4 mb-6">
        {/* Mensagem Original */}
        <div className="bg-black/20 rounded-lg p-4">
          <div className="flex justify-between items-start mb-2">
            <span className="text-primary font-medium">
              Sua Pergunta
            </span>
            <span className="text-xs text-gray-400">
              {format(new Date(mensagem.data), "d 'de' MMMM 'às' HH:mm", {
                locale: ptBR,
              })}
            </span>
          </div>
          <p className="text-gray-300">{mensagem.conteudo}</p>
        </div>

        {/* Respostas */}
        {mensagem.respostas?.map((resposta) => (
          <div
            key={resposta.id}
            className="bg-primary/5 rounded-lg p-4 ml-4 border-l-2 border-primary/20"
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-primary font-medium">
                {resposta.oraculista_nome}
              </span>
              <span className="text-xs text-gray-400">
                {format(new Date(resposta.data), "d 'de' MMMM 'às' HH:mm", {
                  locale: ptBR,
                })}
              </span>
            </div>
            <p className="text-gray-300">{resposta.conteudo}</p>
          </div>
        ))}
      </div>

      {/* Campo de Resposta */}
      <div className="space-y-4">
        <textarea
          value={resposta}
          onChange={(e) => setResposta(e.target.value)}
          placeholder="Digite sua resposta..."
          className="w-full bg-black/40 border border-primary/20 rounded-lg px-4 py-2 text-white
            focus:border-primary focus:ring-1 focus:ring-primary resize-none"
          rows={4}
        />

        <button
          onClick={handleEnviarResposta}
          disabled={enviando || !resposta.trim()}
          className="w-full px-4 py-2 text-black font-medium bg-gradient-to-r from-primary to-primary/80 
            rounded-lg hover:from-primary/90 hover:to-primary/70 transition-all disabled:opacity-50
            disabled:cursor-not-allowed"
        >
          {enviando ? 'Enviando...' : 'Enviar Resposta'}
        </button>
      </div>
    </div>
  )
}
