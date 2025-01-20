import React from 'react'
import { Mensagem } from '../types/mensagem'
import { format, formatDistance } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface MensagemThreadProps {
  mensagem: Mensagem
  onDelete?: (id: string) => void
  onMarcarLida?: (id: string) => void
}

export const MensagemThread: React.FC<MensagemThreadProps> = ({
  mensagem,
  onDelete,
  onMarcarLida
}) => {
  const formatarData = (data: Date) => {
    return format(data, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
      locale: ptBR
    })
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          {mensagem.oraculista && (
            <img
              src={mensagem.oraculista.foto}
              alt={mensagem.oraculista.nome}
              className="w-10 h-10 rounded-full mr-4"
            />
          )}
          <div>
            <h3 className="text-lg font-semibold">{mensagem.titulo}</h3>
            <p className="text-sm text-gray-500">
              {mensagem.oraculista ? mensagem.oraculista.nome : 'Oraculista'}
            </p>
          </div>
        </div>
        <div className="text-sm text-gray-500">
          {formatarData(mensagem.data)}
        </div>
      </div>

      <div className="prose max-w-none mb-4">
        <div
          dangerouslySetInnerHTML={{ __html: mensagem.conteudo }}
          className="text-gray-700"
        />
      </div>

      <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
        <div className="flex space-x-4">
          {!mensagem.lida && onMarcarLida && (
            <button
              onClick={() => onMarcarLida(mensagem.id)}
              className="text-blue-600 hover:text-blue-800"
            >
              Marcar como lida
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(mensagem.id)}
              className="text-red-600 hover:text-red-800"
            >
              Excluir
            </button>
          )}
        </div>
        <div className="flex items-center">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              mensagem.lida
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            {mensagem.lida ? 'Lida' : 'Não lida'}
          </span>
        </div>
      </div>
    </div>
  )
}
