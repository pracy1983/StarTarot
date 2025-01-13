'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useOraculistasStore } from '@/modules/oraculistas/store/oraculistasStore'

export default function ConsultaPage() {
  const params = useParams()
  const router = useRouter()
  const { oraculistas, carregarOraculistas } = useOraculistasStore()
  const nome = decodeURIComponent(params.nome as string)

  useEffect(() => {
    carregarOraculistas()
  }, [carregarOraculistas])

  useEffect(() => {
    const oraculista = oraculistas.find(o => 
      o.nome.toLowerCase() === nome.toLowerCase()
    )

    if (!oraculista) {
      router.push('/')
      return
    }

    // Inicia o chat com o oraculista selecionado
    // TODO: Implementar a lógica de iniciar o chat
  }, [oraculistas, nome, router])

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-primary mb-4">
          Iniciando consulta...
        </h1>
        <p className="text-gray-400">
          Aguarde enquanto conectamos você com {nome}
        </p>
      </div>
    </div>
  )
}
