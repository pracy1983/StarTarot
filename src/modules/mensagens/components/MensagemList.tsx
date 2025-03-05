'use client'

import { useState, useEffect } from 'react'
import { Message } from '../types/message'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface MensagemListProps {
  mensagens: Message[]
  mensagemAtual: Message | null
  setMensagemAtual: (mensagem: Message | null) => void
}

export function MensagemList({
  mensagens,
  mensagemAtual,
  setMensagemAtual
}: MensagemListProps) {
  return (
    <div className="bg-black/40 backdrop-blur-md border border-primary/20 rounded-lg p-4">
      <h2 className="text-xl font-semibold text-primary mb-4">
        Suas Mensagens
      </h2>

      <div className="space-y-2">
        {mensagens.map((mensagem) => (
          <button
            key={mensagem.id}
            onClick={() => setMensagemAtual(mensagem)}
            className={`w-full text-left p-4 rounded-lg transition-all ${
              mensagemAtual?.id === mensagem.id
                ? 'bg-primary/20 border-primary'
                : 'bg-black/20 hover:bg-black/30 border-transparent'
            } border`}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-medium text-primary">
                {mensagem.oraculista_nome}
              </h3>
              <span className="text-xs text-gray-400">
                {format(new Date(mensagem.data), "d 'de' MMMM", {
                  locale: ptBR,
                })}
              </span>
            </div>

            <p className="text-sm text-gray-300 line-clamp-2">
              {mensagem.conteudo}
            </p>

            {!mensagem.lida && (
              <div className="mt-2">
                <span className="inline-block px-2 py-1 text-xs bg-primary/10 text-primary rounded-full">
                  Nova mensagem
                </span>
              </div>
            )}
          </button>
        ))}

        {mensagens.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-400">
              Você ainda não tem mensagens
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
