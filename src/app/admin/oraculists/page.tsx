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
import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { savePromptForOraculista } from '@/config/prompts/oraculistas'
import { OraculistaFormData } from '@/modules/oraculistas/types/oraculista'

export default function OraculistasAdminPage() {
  const router = useRouter()
  const { oraculistas, loading, adicionarOraculista } = useOraculistasStore()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState<OraculistaFormData>({
    nome: '',
    foto: '',
    especialidades: [],
    descricao: '',
    preco: 0,
    disponivel: true,
    prompt: '',
    emPromocao: false
  })
  const [novaEspecialidade, setNovaEspecialidade] = useState('')
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewImage(reader.result as string)
        setFormData(prev => ({ ...prev, foto: reader.result as string }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAddEspecialidade = () => {
    if (novaEspecialidade.trim()) {
      setFormData(prev => ({
        ...prev,
        especialidades: [...prev.especialidades, novaEspecialidade.trim()]
      }))
      setNovaEspecialidade('')
    }
  }

  const handleRemoveEspecialidade = (index: number) => {
    setFormData(prev => ({
      ...prev,
      especialidades: prev.especialidades.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      await savePromptForOraculista(formData.nome, formData.prompt)
      const result = await adicionarOraculista(formData)
      
      if (result.success) {
        setIsModalOpen(false)
        setFormData({
          nome: '',
          foto: '',
          especialidades: [],
          descricao: '',
          preco: 0,
          disponivel: true,
          prompt: '',
          emPromocao: false
        })
        setPreviewImage(null)
      } else {
        setError(result.error || 'Erro ao adicionar oraculista')
      }
    } catch (err) {
      setError('Erro ao salvar oraculista')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-primary">Oraculistas</h1>
          <button
            onClick={() => setIsModalOpen(true)}
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

        {/* Modal de Novo Oraculista */}
        <Transition appear show={isModalOpen} as={Fragment}>
          <Dialog as="div" className="relative z-50" onClose={() => setIsModalOpen(false)}>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
            </Transition.Child>

            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4">
                <Transition.Child
                  as={Fragment}
                  enter="ease-out duration-300"
                  enterFrom="opacity-0 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="ease-in duration-200"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95"
                >
                  <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-black/90 border border-primary/20 p-6 shadow-xl transition-all">
                    <Dialog.Title as="h3" className="text-2xl font-bold text-primary mb-6">
                      Novo Oraculista
                    </Dialog.Title>

                    {error && (
                      <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500">
                        {error}
                      </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                        {/* Foto */}
                        <div className="col-span-2 flex items-center gap-4">
                          <div className="relative w-24 h-24 border-2 border-dashed border-primary/50 rounded-lg overflow-hidden">
                            {previewImage ? (
                              <img
                                src={previewImage}
                                alt="Preview"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="flex items-center justify-center w-full h-full text-gray-400">
                                <span>Foto</span>
                              </div>
                            )}
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="flex-1 text-sm text-gray-300
                              file:mr-4 file:py-2 file:px-4
                              file:rounded-lg file:border-0
                              file:text-sm file:font-semibold
                              file:bg-primary/10 file:text-primary
                              hover:file:bg-primary/20"
                          />
                        </div>

                        {/* Nome */}
                        <div className="col-span-2">
                          <input
                            type="text"
                            value={formData.nome}
                            onChange={e => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                            className="w-full px-4 py-2 bg-black/40 border border-primary/20 rounded-lg
                              focus:ring-2 focus:ring-primary/20 focus:border-primary/40
                              text-white placeholder-gray-500"
                            placeholder="Nome do oraculista"
                            required
                          />
                        </div>

                        {/* Especialidades */}
                        <div className="col-span-2">
                          <div className="flex space-x-2">
                            <input
                              type="text"
                              value={novaEspecialidade}
                              onChange={e => setNovaEspecialidade(e.target.value)}
                              className="flex-1 px-4 py-2 bg-black/40 border border-primary/20 rounded-lg
                                focus:ring-2 focus:ring-primary/20 focus:border-primary/40
                                text-white placeholder-gray-500"
                              placeholder="Nova especialidade"
                              onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), handleAddEspecialidade())}
                            />
                            <button
                              type="button"
                              onClick={handleAddEspecialidade}
                              className="px-4 py-2 bg-primary/10 text-primary rounded-lg
                                hover:bg-primary/20 transition-colors"
                            >
                              Adicionar
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {formData.especialidades.map((esp, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-3 py-1 rounded-full
                                  text-sm bg-primary/10 text-primary"
                              >
                                {esp}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveEspecialidade(index)}
                                  className="ml-2 text-primary hover:text-white"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Descrição */}
                        <div className="col-span-2">
                          <textarea
                            value={formData.descricao}
                            onChange={e => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                            className="w-full px-4 py-2 bg-black/40 border border-primary/20 rounded-lg
                              focus:ring-2 focus:ring-primary/20 focus:border-primary/40
                              text-white placeholder-gray-500 h-24"
                            placeholder="Descrição do oraculista"
                            required
                          />
                        </div>

                        {/* Valor */}
                        <div>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                              R$
                            </span>
                            <input
                              type="number"
                              value={formData.preco}
                              onChange={e => setFormData(prev => ({ ...prev, preco: Number(e.target.value) }))}
                              className="w-full pl-10 pr-4 py-2 bg-black/40 border border-primary/20 rounded-lg
                                focus:ring-2 focus:ring-primary/20 focus:border-primary/40
                                text-white placeholder-gray-500"
                              min="0"
                              step="0.01"
                              required
                            />
                          </div>
                        </div>

                        {/* Status */}
                        <div>
                          <select
                            value={formData.disponivel ? 'disponivel' : 'indisponivel'}
                            onChange={e => setFormData(prev => ({ ...prev, disponivel: e.target.value === 'disponivel' }))}
                            className="w-full px-4 py-2 bg-black/40 border border-primary/20 rounded-lg
                              focus:ring-2 focus:ring-primary/20 focus:border-primary/40
                              text-white"
                          >
                            <option value="disponivel">Disponível</option>
                            <option value="indisponivel">Indisponível</option>
                          </select>
                        </div>

                        {/* Prompt */}
                        <div className="col-span-2">
                          <textarea
                            value={formData.prompt}
                            onChange={e => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
                            className="w-full px-4 py-2 bg-black/40 border border-primary/20 rounded-lg
                              focus:ring-2 focus:ring-primary/20 focus:border-primary/40
                              text-white placeholder-gray-500 h-32"
                            placeholder="Descreva a personalidade e características do oraculista..."
                            required
                          />
                        </div>
                      </div>

                      {/* Botões */}
                      <div className="flex justify-end space-x-4 pt-6">
                        <button
                          type="button"
                          onClick={() => setIsModalOpen(false)}
                          className="px-6 py-2 border border-primary/20 text-primary rounded-lg
                            hover:bg-primary/10 transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={saving}
                          className="px-6 py-2 bg-primary text-white rounded-lg
                            hover:bg-primary/90 transition-colors disabled:opacity-50
                            disabled:cursor-not-allowed"
                        >
                          {saving ? 'Salvando...' : 'Salvar'}
                        </button>
                      </div>
                    </form>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition>
      </div>
    </div>
  )
}
