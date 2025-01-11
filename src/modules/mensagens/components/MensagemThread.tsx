'use client'

import { Mensagem } from '../types/mensagem'

interface MensagemThreadProps {
  mensagem: Mensagem
}

export function MensagemThread({ mensagem }: MensagemThreadProps) {
  const formatarData = (data: Date) => {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="h-full flex flex-col">
      {/* Cabeçalho */}
      <div className="p-3 border-b border-primary/20">
        <h2 className="text-lg font-semibold text-primary">
          {mensagem.titulo}
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          {formatarData(mensagem.data)}
        </p>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 p-3 overflow-y-auto">
        <div className="prose prose-invert max-w-none">
          <div 
            className="text-gray-300 text-sm"
            dangerouslySetInnerHTML={{ __html: mensagem.conteudo }}
          />
        </div>
      </div>

      {/* Rodapé */}
      <div className="p-3 border-t border-primary/20">
        <p className="text-xs text-gray-500">
          {mensagem.tipo === 'pergunta' ? 'Pergunta enviada' : 'Resposta recebida'} em {formatarData(mensagem.data)}
        </p>
      </div>
    </div>
  )
}
