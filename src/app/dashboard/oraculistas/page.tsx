'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useOraculistasStore } from '@/modules/oraculistas/store/oraculistasStore'
import { OraculistaCard } from '@/modules/oraculistas/components/OraculistaCard'

export default function OraculistasPage() {
  const router = useRouter()
  const oraculistas = useOraculistasStore((state) => state.oraculistas)
  const loading = useOraculistasStore((state) => state.loading)
  const fetchOraculistas = useOraculistasStore((state) => state.fetchOraculistas)

  useEffect(() => {
    fetchOraculistas()
  }, [fetchOraculistas])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="text-gray-400 mt-4">Carregando oraculistas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">
            Oraculistas
          </h1>
          <p className="text-gray-400">
            Escolha um oraculista para iniciar sua consulta
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {oraculistas.map((oraculista) => (
            <OraculistaCard
              key={oraculista.id}
              oraculista={oraculista}
              onClick={() => router.push(`/consulta/${oraculista.nome}`)}
            />
          ))}

          {oraculistas.length === 0 && (
            <div className="col-span-full text-center py-8">
              <p className="text-gray-400">
                Nenhum oraculista disponível no momento
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
