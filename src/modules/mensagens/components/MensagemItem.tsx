import React from 'react'
import { Mensagem } from '../types/mensagem'
import { useAuthStore } from '@/stores/authStore'
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
  const user = useAuthStore(state => state.user)

  const formatarData = (data: Date) => {
    return format(data, "dd 'de' MMMM", {
      locale: ptBR
    })
  }

  const isUserMessage = mensagem.tipo === 'pergunta'
  const isResponse = !isUserMessage && mensagem.pergunta_ref

  return (
    <div
      onClick={onClick}
      className={`
        p-3 cursor-pointer transition-all duration-200 border-b border-primary/10
        ${selecionada ? 'bg-primary/10' : 'hover:bg-primary/5'}
        ${!mensagem.lida ? 'bg-black/40' : ''}
        ${isResponse ? 'ml-4 border-l-2 border-l-primary/20' : ''}
      `}
    >
      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-400 flex gap-2">
            {isUserMessage ? (
              <>
                <span className="text-primary font-medium">De: Você</span>
                <span className="text-gray-400">Para: {mensagem.oraculista?.nome || 'Oraculista'}</span>
              </>
            ) : (
              <>
                <span className="text-primary font-medium">De: {mensagem.oraculista?.nome || 'Oraculista'}</span>
                <span className="text-gray-400">Para: Você</span>
              </>
            )}
          </span>
          {!mensagem.lida && (
            <span className="bg-primary/20 text-primary text-xs px-1.5 py-0.5 rounded-full ml-2">
              Nova
            </span>
          )}
        </div>
        <h3 className={`text-sm font-medium mb-1 ${!mensagem.lida ? 'text-primary' : 'text-gray-300'}`}>
          {mensagem.titulo || 'Consulta'} - {formatarData(mensagem.data)}
        </h3>
        <p className="text-xs text-gray-400 line-clamp-2">
          {mensagem.conteudo?.substring(0, 100)}...
        </p>
      </div>
    </div>
  )
}
