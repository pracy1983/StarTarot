'use client'

import { Mensagem } from '../types/mensagem'

interface MensagemItemProps {
  mensagem: Mensagem
  selecionada: boolean
  onClick: () => void
}

export function MensagemItem({ mensagem, selecionada, onClick }: MensagemItemProps) {
  const formatarData = (data: Date) => {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div
      onClick={onClick}
      className={`
        p-3 cursor-pointer transition-all duration-200 border-b border-primary/10
        ${selecionada ? 'bg-primary/10' : 'hover:bg-primary/5'}
        ${!mensagem.lida ? 'bg-black/40' : ''}
      `}
    >
      <div className="flex items-center justify-between">
        <h3 className={`text-sm font-medium truncate flex-1 ${!mensagem.lida ? 'text-primary' : 'text-gray-300'}`}>
          {mensagem.titulo}
        </h3>
        {!mensagem.lida && (
          <span className="bg-primary/20 text-primary text-xs px-1.5 py-0.5 rounded-full ml-2">
            Nova
          </span>
        )}
      </div>
      <div className="flex items-center justify-between mt-1">
        <p className="text-xs text-gray-500">
          {formatarData(mensagem.data)}
        </p>
        <span className={`text-xs ${mensagem.tipo === 'resposta' ? 'text-primary/60' : 'text-gray-500'}`}>
          {mensagem.tipo === 'pergunta' ? 'Pergunta' : 'Resposta'}
        </span>
      </div>
    </div>
  )
}
