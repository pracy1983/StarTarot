'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  TagIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { useOraculistasStore } from '@/modules/oraculistas/store/oraculistasStore'
import Image from 'next/image'
import { formatarPreco } from '@/utils/format'
import { OraculistaModal } from '@/modules/oraculistas/components/OraculistaModal'
import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { OraculistaFormData } from '@/modules/oraculistas/types/oraculista'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function OraculistasAdminPage() {
  const router = useRouter()
  const oraculistas = useOraculistasStore((state) => state.oraculistas)
  const loading = useOraculistasStore((state) => state.loading)
  const fetchOraculistas = useOraculistasStore((state) => state.fetchOraculistas)
  const deleteOraculista = useOraculistasStore((state) => state.deleteOraculista)
  const updateOraculista = useOraculistasStore((state) => state.updateOraculista)
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedOraculistaId, setSelectedOraculistaId] = useState<string | null>(null)

  useEffect(() => {
    fetchOraculistas()
  }, [fetchOraculistas])

  const formatarData = (data: Date | string) => {
    const date = data instanceof Date ? data : new Date(data)
    return format(date, "dd 'de' MMMM 'de' yyyy", {
      locale: ptBR
    })
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-primary">Oraculistas</h1>
          <button
            onClick={() => {
              setSelectedOraculistaId(null)
              setIsModalOpen(true)
            }}
            className="px-4 py-2 text-black font-medium bg-gradient-to-r from-primary to-primary/80 rounded-lg
              hover:from-primary/90 hover:to-primary/70 transition-all whitespace-nowrap"
          >
            <PlusIcon className="w-5 h-5 inline-block mr-2" />
            Novo Oraculista
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
            <p className="text-gray-400 mt-4">Carregando oraculistas...</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {oraculistas.map((oraculista) => (
              <div
                key={oraculista.id}
                className="bg-black/40 backdrop-blur-md border border-primary/20 rounded-lg p-6
                  hover:border-primary/40 transition-all duration-300"
              >
                <div className="flex items-start gap-6">
                  <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-black/40">
                    {oraculista.foto ? (
                      <Image
                        src={oraculista.foto}
                        alt={oraculista.nome}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <SparklesIcon className="w-8 h-8" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-2xl font-bold text-primary mb-2">
                          {oraculista.nome}
                        </h2>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {oraculista.especialidades.map((especialidade, index) => (
                            <div key={index} className="flex items-center gap-1 text-gray-400">
                              <TagIcon className="w-4 h-4" />
                              <span>{especialidade}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedOraculistaId(oraculista.id)
                            setIsModalOpen(true)
                          }}
                          className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => deleteOraculista(oraculista.id)}
                          className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div>
                        <div className="text-sm text-gray-400">Status</div>
                        <div className="text-lg font-semibold text-primary">
                          {oraculista.disponivel ? (
                            <span className="flex items-center gap-1 text-green-500">
                              <CheckCircleIcon className="w-5 h-5" />
                              Disponível
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-red-500">
                              <XCircleIcon className="w-5 h-5" />
                              Indisponível
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-gray-400">Preço Base</div>
                        <div className="text-lg font-semibold text-primary">
                          {formatarPreco(oraculista.preco)}
                          {oraculista.emPromocao && oraculista.precoPromocional && (
                            <span className="ml-2 text-green-500">
                              {formatarPreco(oraculista.precoPromocional)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-gray-400">Cadastro</div>
                        <div className="text-lg font-semibold text-primary">
                          {formatarData(oraculista.createdAt)}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-gray-400">Última Atualização</div>
                        <div className="text-lg font-semibold text-primary">
                          {formatarData(oraculista.updatedAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <OraculistaModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        oraculistaId={selectedOraculistaId}
      />
    </div>
  )
}
