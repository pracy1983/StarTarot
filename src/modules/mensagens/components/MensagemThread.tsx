'use client'

import { Mensagem } from '../types/mensagem'
import { useMensagensStore } from '../store/mensagensStore'
import { Trash2 } from 'lucide-react'

interface MensagemThreadProps {
  mensagem: Mensagem
}

export function MensagemThread({ mensagem }: MensagemThreadProps) {
  const deletarMensagem = useMensagensStore(state => state.deletarMensagem)

  const formatarData = (data: Date) => {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleDeletar = async () => {
    if (window.confirm('Tem certeza que deseja deletar esta mensagem?')) {
      await deletarMensagem(mensagem.id)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Cabeçalho */}
      <div className="p-3 border-b border-primary/20">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary">
            {mensagem.titulo}
          </h2>
          <button
            onClick={handleDeletar}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
            title="Deletar mensagem"
          >
            <Trash2 size={18} />
          </button>
        </div>
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
