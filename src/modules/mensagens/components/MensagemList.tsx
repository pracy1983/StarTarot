'use client'

import { useState, useEffect } from 'react'
import { Mensagem } from '../types/mensagem'
import { MensagemItem } from './MensagemItem'
import { Trash2 } from 'lucide-react'
import { useMensagensStore } from '../store/mensagensStore'

interface MensagemListProps {
  mensagens: Mensagem[]
  onSelectMensagem?: (mensagem: Mensagem | null) => void
  mensagemSelecionada?: Mensagem | null
}

export function MensagemList({ 
  mensagens,
  onSelectMensagem,
  mensagemSelecionada 
}: MensagemListProps) {
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
      onSelectMensagem?.(mensagem)
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return
    if (window.confirm(`Tem certeza que deseja deletar ${selectedIds.size} mensagem(ns)?`)) {
      for (const id of selectedIds) {
        await deletarMensagem(id)
      }
      setSelectedIds(new Set())
      onSelectMensagem?.(null)
    }
  }

  // Organiza as mensagens em pares (pergunta/resposta)
  const organizarMensagens = (msgs: Mensagem[]) => {
    const mensagensOrdenadas = [...msgs].sort((a, b) => {
      const dateA = a.data ? new Date(a.data) : 
        a.updatedAt ? new Date(a.updatedAt) : new Date(0)
      const dateB = b.data ? new Date(b.data) : 
        b.updatedAt ? new Date(b.updatedAt) : new Date(0)
      return dateB.getTime() - dateA.getTime()
    })

    const threads = new Map<string, Mensagem[]>()
    
    // Primeiro, organiza todas as perguntas
    mensagensOrdenadas.forEach(msg => {
      if (msg.tipo === 'pergunta') {
        threads.set(msg.id, [msg])
      }
    })

    // Depois, adiciona as respostas às suas perguntas
    mensagensOrdenadas.forEach(msg => {
      if (msg.tipo !== 'pergunta' && msg.pergunta_ref) {
        const thread = threads.get(msg.pergunta_ref)
        if (thread) {
          thread.push(msg)
        }
      }
    })

    // Retorna as threads mantendo a ordem
    return Array.from(threads.values()).flat()
  }

  const mensagensOrganizadas = organizarMensagens(mensagens)

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
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {mensagensOrganizadas.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            Nenhuma mensagem encontrada
          </div>
        ) : (
          mensagensOrganizadas.map((mensagem) => (
            <div 
              key={mensagem.id}
              onClick={(e) => handleSelect(mensagem, e)}
              className={`cursor-pointer transition-all ${
                mensagemSelecionada?.id === mensagem.id
                  ? 'scale-[1.02] ring-2 ring-primary'
                  : 'hover:scale-[1.01]'
              }`}
            >
              <MensagemItem 
                mensagem={mensagem}
                selecionada={mensagemSelecionada?.id === mensagem.id}
                onClick={(e) => handleSelect(mensagem, e)}
              />
            </div>
          ))
        )}
      </div>
    </div>
  )
}
