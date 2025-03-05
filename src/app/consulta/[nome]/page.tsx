'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Oraculista } from '@/modules/oraculistas/types/oraculista'
import { useOraculistasStore } from '@/modules/oraculistas/store/oraculistasStore'
import { useRouter } from 'next/navigation'

export default function ConsultaPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const oraculista = useOraculistasStore((state) => state.oraculistas.find(o => o.nome === params?.nome))

  useEffect(() => {
    const fetchOraculista = async () => {
      if (!params?.nome) {
        setError('Nome do oraculista não fornecido')
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/oraculistas/${params.nome}`)
        if (!response.ok) {
          throw new Error('Oraculista não encontrado')
        }

        const data = await response.json()
        useOraculistasStore.setState((state) => ({
          oraculistas: state.oraculistas.map((o) =>
            o.nome === params.nome ? { ...o, ...data } : o
          ),
        }))

        setLoading(false)
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Erro ao carregar oraculista')
        setLoading(false)
      }
    }

    if (!oraculista) {
      fetchOraculista()
    } else {
      setLoading(false)
    }
  }, [params?.nome, oraculista])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="text-gray-400 mt-4">Carregando oraculista...</p>
        </div>
      </div>
    )
  }

  if (error || !oraculista) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary mb-4">
            {error || 'Oraculista não encontrado'}
          </h1>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 text-black font-medium bg-gradient-to-r from-primary to-primary/80 rounded-lg
              hover:from-primary/90 hover:to-primary/70 transition-all"
          >
            Voltar para a página inicial
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-primary mb-6">
          Consulta com {oraculista.nome}
        </h1>

        {/* Detalhes do oraculista */}
        <div className="bg-black/40 backdrop-blur-md border border-primary/20 rounded-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-xl font-semibold text-primary mb-2">
                Sobre o Oraculista
              </h2>
              <p className="text-gray-400">
                {oraculista.descricao}
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-primary mb-2">
                Especialidades
              </h2>
              <div className="flex flex-wrap gap-2">
                {oraculista.especialidades.map((especialidade, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                  >
                    {especialidade}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Formulário de consulta */}
        <div className="bg-black/40 backdrop-blur-md border border-primary/20 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-primary mb-4">
            Iniciar Consulta
          </h2>

          <form className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Sua Pergunta
              </label>
              <textarea
                rows={4}
                className="w-full bg-black/40 border border-primary/20 rounded-lg px-4 py-2 text-white
                  focus:border-primary focus:ring-1 focus:ring-primary resize-none"
                placeholder="Digite sua pergunta para o oraculista..."
              />
            </div>

            <div>
              <button
                type="submit"
                className="w-full px-4 py-2 text-black font-medium bg-gradient-to-r from-primary to-primary/80 
                  rounded-lg hover:from-primary/90 hover:to-primary/70 transition-all"
              >
                Iniciar Consulta ({oraculista.preco} créditos)
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
