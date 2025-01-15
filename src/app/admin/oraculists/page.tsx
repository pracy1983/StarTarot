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

export default function OraculistasAdminPage() {
  const router = useRouter()
  const { oraculistas, loading, carregarOraculistas, excluirOraculista, atualizarOraculista } = useOraculistasStore()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedOraculistaId, setSelectedOraculistaId] = useState<string | null>(null)

  useEffect(() => {
    carregarOraculistas()
  }, [carregarOraculistas])

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
            + Novo Oraculista
          </button>
        </div>

        {/* Lista de Oraculistas */}
        <div className="grid gap-6">
          {oraculistas.map((oraculista) => (
            <div
              key={oraculista.id}
              className="bg-black/40 backdrop-blur-md border border-primary/20 rounded-lg p-6
                hover:border-primary/40 transition-all duration-300 relative"
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
                      <div className={`text-xl font-bold text-primary ${oraculista.emPromocao ? 'line-through' : ''}`}>
                        R$ {oraculista.preco.toFixed(2)}
                      </div>
                      {oraculista.emPromocao && oraculista.precoPromocional && (
                        <div className="text-xl font-bold text-green-500">
                          R$ {oraculista.precoPromocional.toFixed(2)}
                        </div>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="number"
                          placeholder="Desconto"
                          className="w-24 px-2 py-1 bg-black/40 border border-primary/20 rounded text-sm"
                          value={oraculista.descontoTemp || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const desconto = parseFloat(e.target.value);
                            useOraculistasStore.setState(state => ({
                              oraculistas: state.oraculistas.map(o => 
                                o.id === oraculista.id 
                                  ? { ...o, descontoTemp: e.target.value }
                                  : o
                              )
                            }));
                          }}
                        />
                        <button
                          onClick={async () => {
                            const novoPreco = parseFloat(oraculista.descontoTemp || '0');
                            if (!isNaN(novoPreco)) {
                              // Atualiza o estado local
                              useOraculistasStore.setState(state => ({
                                oraculistas: state.oraculistas.map(o => 
                                  o.id === oraculista.id 
                                    ? { 
                                        ...o, 
                                        emPromocao: true,
                                        precoPromocional: novoPreco,
                                        descontoTemp: ''
                                      }
                                    : o
                                )
                              }));

                              // Atualiza no banco de dados
                              await atualizarOraculista(oraculista.id, {
                                emPromocao: true,
                                precoPromocional: novoPreco
                              });
                            }
                          }}
                          className="px-2 py-1 bg-primary/10 text-primary rounded hover:bg-primary/20 text-sm"
                        >
                          OK
                        </button>
                        {oraculista.emPromocao && (
                          <button
                            onClick={async () => {
                              // Atualiza o estado local
                              useOraculistasStore.setState(state => ({
                                oraculistas: state.oraculistas.map(o => 
                                  o.id === oraculista.id 
                                    ? { 
                                        ...o, 
                                        emPromocao: false,
                                        precoPromocional: undefined,
                                        descontoTemp: ''
                                      }
                                    : o
                                )
                              }));

                              // Atualiza no banco de dados
                              await atualizarOraculista(oraculista.id, {
                                emPromocao: false,
                                precoPromocional: undefined
                              });
                            }}
                            className="px-2 py-1 bg-red-500/10 text-red-500 rounded hover:bg-red-500/20 text-sm"
                          >
                            Remover
                          </button>
                        )}
                      </div>
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
                      <div className="text-sm text-gray-400">Adicionado em</div>
                      <div className="text-lg font-semibold text-primary">
                        {oraculista.createdAt.toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Avaliação</div>
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => {
                          const rating = oraculista.rating || 0;
                          const filled = rating - i;
                          return (
                            <svg
                              key={i}
                              className={`w-5 h-5 ${
                                filled >= 1
                                  ? 'text-yellow-500'
                                  : filled > 0
                                  ? 'text-yellow-500/50'
                                  : 'text-gray-300'
                              }`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Status</div>
                      <div className="flex items-center gap-2">
                        <div className={`text-lg font-semibold ${
                          oraculista.disponivel ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {oraculista.disponivel ? 'Disponível' : 'Indisponível'}
                        </div>
                        <button
                          onClick={() => {
                            useOraculistasStore.setState(state => ({
                              oraculistas: state.oraculistas.map(o => 
                                o.id === oraculista.id 
                                  ? { ...o, disponivel: !o.disponivel }
                                  : o
                              )
                            }));
                          }}
                          className={`w-12 h-6 rounded-full transition-colors relative
                            ${oraculista.disponivel ? 'bg-green-500' : 'bg-gray-400'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all
                            ${oraculista.disponivel ? 'left-7' : 'left-1'}`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="absolute bottom-6 right-6 flex gap-2">
                <button
                  onClick={() => {
                    if (window.confirm('Tem certeza que deseja excluir este oraculista?')) {
                      excluirOraculista(oraculista.id);
                    }
                  }}
                  className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    setSelectedOraculistaId(oraculista.id);
                    setIsModalOpen(true);
                  }}
                  className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                >
                  <PencilIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Modal de Oraculista */}
        <OraculistaModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedOraculistaId(null)
          }}
          oraculistaId={selectedOraculistaId}
        />
      </div>
    </div>
  )
}
