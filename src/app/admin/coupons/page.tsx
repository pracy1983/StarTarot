'use client'

import { useState } from 'react'
import { PlusIcon } from '@/components/icons/PlusIcon'

export default function CouponsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-primary">Cupons e Descontos</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 text-black font-medium bg-gradient-to-r from-primary to-primary/80 rounded-lg
            hover:from-primary/90 hover:to-primary/70 transition-all whitespace-nowrap"
        >
          <span className="flex items-center gap-2">
            <PlusIcon className="h-5 w-5" />
            Novo Cupom
          </span>
        </button>
      </div>

      {/* Lista de Cupons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card de Cupom */}
        <div className="bg-black/40 backdrop-blur-md border border-primary/20 rounded-lg p-6
          hover:border-primary/40 transition-all duration-300 relative">
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-semibold text-primary">BEMVINDO10</h3>
                <p className="text-sm text-gray-400">Cupom de boas-vindas</p>
              </div>
              <span className="px-2 py-1 bg-primary/10 text-primary text-sm rounded-full">
                Ativo
              </span>
            </div>

            <div className="space-y-2">
              <div>
                <div className="text-sm text-gray-400">Desconto</div>
                <div className="text-lg font-semibold text-primary">10%</div>
              </div>

              <div>
                <div className="text-sm text-gray-400">Validade</div>
                <div className="text-lg font-semibold text-primary">
                  31/12/2025
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-400">Usos</div>
                <div className="text-lg font-semibold text-primary">
                  12/100
                </div>
              </div>
            </div>

            {/* Botões de ação */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {}}
                className="flex-1 px-4 py-2 bg-primary/10 text-primary rounded-lg
                  hover:bg-primary/20 transition-colors text-sm"
              >
                Editar
              </button>
              <button
                onClick={() => {}}
                className="flex-1 px-4 py-2 bg-red-500/10 text-red-500 rounded-lg
                  hover:bg-red-500/20 transition-colors text-sm"
              >
                Desativar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
