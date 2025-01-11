'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
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

export default function OraculistasAdminPage() {
  const router = useRouter()
  const { oraculistas, loading } = useOraculistasStore()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedOraculista, setSelectedOraculista] = useState<string | null>(null)

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-primary">Oraculistas</h1>
          <button
            onClick={() => {
              setSelectedOraculista(null)
              setIsModalOpen(true)
            }}
            className="px-4 py-2 bg-primary text-white rounded-lg
              hover:bg-primary/90 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            Novo Oraculista
          </button>
        </div>

        {/* Lista de Oraculistas */}
        <div className="grid gap-6">
          {oraculistas.map((oraculista) => (
            <div
              key={oraculista.id}
              className="bg-black/40 backdrop-blur-md border border-primary/20 rounded-lg p-6
                hover:border-primary/40 transition-all duration-300"
            >
              <div className="flex items-start gap-6">
                {/* Foto */}
                <div className="w-32 h-32 rounded-lg overflow-hidden">
                  <img
                    src={oraculista.foto}
                    alt={oraculista.nome}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Informações */}
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-semibold text-primary">
                        {oraculista.nome}
                      </h2>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {oraculista.especialidades.map((esp, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 text-sm bg-primary/10 text-primary rounded-full"
                          >
                            {esp}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-400">Valor da Consulta</div>
                      <div className="text-xl font-semibold text-primary">
                        R$ {oraculista.preco.toFixed(2)}
                      </div>
                      {oraculista.emPromocao && oraculista.precoPromocional && (
                        <div className="text-sm text-green-500">
                          Promoção: R$ {oraculista.precoPromocional.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="mt-4 text-gray-300">
                    {oraculista.descricao}
                  </p>

                  {/* Estatísticas */}
                  <div className="mt-4 flex gap-6">
                    <div>
                      <div className="text-sm text-gray-400">Consultas</div>
                      <div className="text-lg font-semibold text-primary">
                        {oraculista.consultas}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Cliente Desde</div>
                      <div className="text-lg font-semibold text-primary">
                        {oraculista.createdAt.toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Status</div>
                      <div className={`text-lg font-semibold ${
                        oraculista.disponivel ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {oraculista.disponivel ? 'Disponível' : 'Indisponível'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de Cadastro/Edição */}
      <OraculistaModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        oraculistaId={selectedOraculista}
      />
    </div>
  )
}
