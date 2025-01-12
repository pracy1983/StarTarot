'use client'

import { useState } from 'react'

export default function CouponsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Dados de exemplo
  const cupons = [
    {
      id: 1,
      codigo: 'BEMVINDO10',
      descricao: 'Cupom de boas-vindas',
      usos: 12,
      limite: 100,
      ativo: true
    },
    {
      id: 2,
      codigo: 'NATAL2024',
      descricao: 'Promoção de Natal',
      usos: 45,
      limite: 50,
      ativo: true
    }
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-primary">Cupons</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 text-black font-medium bg-gradient-to-r from-primary to-primary/80 rounded-lg
            hover:from-primary/90 hover:to-primary/70 transition-all"
        >
          + Adicionar Cupom
        </button>
      </div>

      {/* Lista de Cupons */}
      <div className="bg-black/40 backdrop-blur-md border border-primary/20 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-primary/20">
              <th className="px-6 py-4 text-left text-sm text-gray-400">Código</th>
              <th className="px-6 py-4 text-left text-sm text-gray-400">Descrição</th>
              <th className="px-6 py-4 text-left text-sm text-gray-400">Usos</th>
              <th className="px-6 py-4 text-left text-sm text-gray-400">Status</th>
            </tr>
          </thead>
          <tbody>
            {cupons.map((cupom) => (
              <tr key={cupom.id} className="border-b border-primary/10 last:border-0">
                <td className="px-6 py-4 text-primary font-medium">{cupom.codigo}</td>
                <td className="px-6 py-4 text-gray-300">{cupom.descricao}</td>
                <td className="px-6 py-4 text-gray-300">{cupom.usos}/{cupom.limite}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-primary/10 text-primary text-sm rounded-full">
                    {cupom.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
