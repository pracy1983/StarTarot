import React from 'react'
import { Mensagem } from '../types/mensagem'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface MensagemItemProps {
  mensagem: Mensagem
  selecionada: boolean
  onClick: (event: React.MouseEvent) => void
}

export const MensagemItem: React.FC<MensagemItemProps> = ({
  mensagem,
  selecionada,
  onClick
}) => {
  const formatarData = (data: Date) => {
    return format(data, "dd 'de' MMMM", {
      locale: ptBR
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
      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-400">
            {mensagem.tipo === 'pergunta' 
              ? `De: Eu | Para: ${mensagem.oraculista?.nome || 'Oraculista'}`
              : `De: ${mensagem.oraculista?.nome || 'Oraculista'} | Para: Mim`
            }
          </span>
          {!mensagem.lida && (
            <span className="bg-primary/20 text-primary text-xs px-1.5 py-0.5 rounded-full ml-2">
              Nova
            </span>
          )}
        </div>
        <h3 className={`text-sm font-medium truncate ${!mensagem.lida ? 'text-primary' : 'text-gray-300'}`}>
          {mensagem.titulo}
        </h3>
        <span className="text-xs text-gray-500 mt-1">
          {formatarData(mensagem.data)}
        </span>
      </div>
    </div>
  )
}
