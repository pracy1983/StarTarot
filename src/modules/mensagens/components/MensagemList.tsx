'use client'

import { useState, useEffect } from 'react'
import { Mensagem } from '../types/mensagem'
import { MensagemItem } from './MensagemItem'
import { Trash2 } from 'lucide-react'
import { useMensagensStore } from '../store/mensagensStore'

interface MensagemListProps {
  mensagens: Mensagem[]
  onSelectMensagem: (mensagem: Mensagem | null) => void
  mensagemSelecionada: Mensagem | null
}

export function MensagemList({ mensagens, onSelectMensagem, mensagemSelecionada }: MensagemListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const deletarMensagem = useMensagensStore(state => state.deletarMensagem)

  // Limpa seleções quando as mensagens mudam
  useEffect(() => {
    setSelectedIds(new Set())
  }, [mensagens])

  const handleSelect = (mensagem: Mensagem, event: React.MouseEvent) => {
    if (event.ctrlKey || event.metaKey) {
      // Ctrl/Cmd + Click para selecionar múltiplos
      const newSelectedIds = new Set(selectedIds)
      if (selectedIds.has(mensagem.id)) {
        newSelectedIds.delete(mensagem.id)
      } else {
        newSelectedIds.add(mensagem.id)
      }
      setSelectedIds(newSelectedIds)
    } else if (event.shiftKey && mensagemSelecionada) {
      // Shift + Click para selecionar intervalo
      const currentIndex = mensagens.findIndex(m => m.id === mensagem.id)
      const lastIndex = mensagens.findIndex(m => m.id === mensagemSelecionada.id)
      const start = Math.min(currentIndex, lastIndex)
      const end = Math.max(currentIndex, lastIndex)
      const newSelectedIds = new Set(
        mensagens.slice(start, end + 1).map(m => m.id)
      )
      setSelectedIds(newSelectedIds)
    } else {
      // Click normal
      setSelectedIds(new Set([mensagem.id]))
      onSelectMensagem(mensagem)
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return
    if (window.confirm(`Tem certeza que deseja deletar ${selectedIds.size} mensagem(ns)?`)) {
      for (const id of selectedIds) {
        await deletarMensagem(id)
      }
      setSelectedIds(new Set())
      onSelectMensagem(null)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {selectedIds.size > 0 && (
        <div className="p-2 bg-black/40 border-b border-primary/20 flex items-center justify-between">
          <span className="text-sm text-gray-400">
            {selectedIds.size} mensagem(ns) selecionada(s)
          </span>
          <button
            onClick={handleDeleteSelected}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
            title="Deletar mensagens selecionadas"
          >
            <Trash2 size={18} />
          </button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        {mensagens.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            Nenhuma mensagem encontrada
          </div>
        ) : (
          mensagens.map((mensagem) => (
            <MensagemItem
              key={mensagem.id}
              mensagem={mensagem}
              selecionada={selectedIds.has(mensagem.id)}
              onClick={(e) => handleSelect(mensagem, e)}
            />
          ))
        )}
      </div>
    </div>
  )
}
