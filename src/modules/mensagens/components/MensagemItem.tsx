'use client'

import { Mensagem } from '../types/mensagem'
import { MouseEvent } from 'react'

interface MensagemItemProps {
  mensagem: Mensagem
  selecionada: boolean
  onClick: (event: MouseEvent) => void
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
