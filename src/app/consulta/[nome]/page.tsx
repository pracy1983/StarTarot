'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Oraculista } from '@/modules/oraculistas/types/oraculista'
import { useOraculistasStore } from '@/modules/oraculistas/store/oraculistasStore'
import ConsultaView from '@/modules/consulta/components/ConsultaView'

export default function ConsultaPage() {
  const params = useParams()
  const [oraculista, setOraculista] = useState<Oraculista | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchOraculista = async () => {
      try {
        const response = await fetch(`/api/oraculistas/${params.nome}`)
        if (!response.ok) {
          throw new Error('Oraculista não encontrado')
        }
        const data = await response.json()
        setOraculista(data)
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Erro ao buscar oraculista')
      } finally {
        setLoading(false)
      }
    }

    if (params.nome) {
      fetchOraculista()
    }
  }, [params.nome])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-primary text-xl">Carregando...</div>
      </div>
    )
  }

  if (error || !oraculista) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500 text-xl">
          {error || 'Oraculista não encontrado'}
        </div>
      </div>
    )
  }

  return <ConsultaView oraculista={oraculista} />
}
