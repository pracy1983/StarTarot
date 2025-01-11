'use client'

import { Mensagem, MensagemFiltro } from '../types/mensagem'
import { MensagemItem } from './MensagemItem'
import { useMensagensStore } from '../store/mensagensStore'

interface MensagemListProps {
  mensagens: Mensagem[]
  onSelectMensagem: (mensagem: Mensagem) => void
  mensagemSelecionada: Mensagem | null
}

export function MensagemList({ 
  mensagens, 
  onSelectMensagem, 
  mensagemSelecionada 
}: MensagemListProps) {
  const setFiltro = useMensagensStore(state => state.setFiltro)
  const filtroAtual = useMensagensStore(state => state.filtroAtual)

  const filtros: { valor: MensagemFiltro; label: string }[] = [
    { valor: 'todas', label: 'Todas' },
    { valor: 'nao_lidas', label: 'Não Lidas' },
    { valor: 'respondidas', label: 'Respondidas' }
  ]

  return (
    <div className="h-full bg-black/40 backdrop-blur-md border border-primary/20 rounded-2xl flex flex-col">
      {/* Cabeçalho com Filtros */}
      <div className="p-3 border-b border-primary/20">
        <div className="flex space-x-2">
          {filtros.map(f => (
            <button
              key={f.valor}
              onClick={() => setFiltro(f.valor)}
              className={`
                px-2 py-1 rounded-full text-xs transition-colors duration-200
                ${filtroAtual === f.valor
                  ? 'bg-primary text-black'
                  : 'text-gray-300 hover:text-primary'
                }
              `}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Mensagens */}
      <div className="flex-1 overflow-y-auto">
        {mensagens.length === 0 ? (
          <div className="p-3 text-center text-gray-500 text-sm">
            Nenhuma mensagem encontrada
          </div>
        ) : (
          mensagens.map(mensagem => (
            <MensagemItem
              key={mensagem.id}
              mensagem={mensagem}
              selecionada={mensagemSelecionada?.id === mensagem.id}
              onClick={() => onSelectMensagem(mensagem)}
            />
          ))
        )}
      </div>
    </div>
  )
}
