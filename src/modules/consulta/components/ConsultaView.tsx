'use client'

import React from 'react'
import { useRouter } from 'next/navigation'

interface ConsultaViewProps {
  nome: string
}

export const ConsultaView: React.FC<ConsultaViewProps> = ({ nome }) => {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          <div className="px-6 py-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Consulta com {nome}
            </h2>
            {/* Adicione aqui o conteúdo da consulta */}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConsultaView
