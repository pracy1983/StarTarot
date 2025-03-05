'use client'

import { useState, useEffect } from 'react'
import { Dialog } from '@headlessui/react'
import { XMarkIcon, PhotoIcon } from '@heroicons/react/24/outline'
import { useOraculistasStore } from '../store/oraculistasStore'
import { OraculistaFormData } from '../types/oraculista'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Image from 'next/image'

interface OraculistaModalProps {
  isOpen: boolean
  onClose: () => void
  oraculistaId?: string | null
}

export function OraculistaModal({ isOpen, onClose, oraculistaId }: OraculistaModalProps) {
  const { oraculistas, createOraculista, updateOraculista, fetchOraculistas } = useOraculistasStore()
  const [formData, setFormData] = useState<OraculistaFormData>({
    nome: '',
    foto: '',
    especialidades: [],
    descricao: '',
    preco: 0,
    disponivel: true,
    prompt: '',
    emPromocao: false,
    precoPromocional: undefined
  })
  const [novaEspecialidade, setNovaEspecialidade] = useState('')
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formModified, setFormModified] = useState(false)

  // Carrega os oraculistas quando o modal abre
  useEffect(() => {
    if (isOpen) {
      const loadData = async () => {
        console.log('Carregando oraculistas...')
        await fetchOraculistas()
        console.log('Oraculistas carregados:', oraculistas.length)
      }
      loadData()
    }
  }, [isOpen, fetchOraculistas])

  // Atualiza o formulário quando um oraculista é selecionado
  useEffect(() => {
    if (oraculistaId) {
      console.log('Procurando oraculista:', oraculistaId)
      console.log('Oraculistas disponíveis:', oraculistas.map(o => ({ id: o.id, nome: o.nome })))
      
      const oraculista = oraculistas.find(o => o.id === oraculistaId)
      console.log('Oraculista encontrado:', oraculista)
      
      if (oraculista) {
        setFormData({
          nome: oraculista.nome,
          foto: oraculista.foto,
          especialidades: [...oraculista.especialidades],
          descricao: oraculista.descricao,
          preco: oraculista.preco,
          disponivel: oraculista.disponivel,
          prompt: oraculista.prompt_formatado || oraculista.prompt || '',
          emPromocao: oraculista.emPromocao,
          precoPromocional: oraculista.precoPromocional
        })
        setPreviewImage(oraculista.foto)
        setFormModified(false) // Reseta o estado de modificação
      }
    } else {
      // Limpa o form quando fecha o modal
      setFormData({
        nome: '',
        foto: '',
        especialidades: [],
        descricao: '',
        preco: 0,
        disponivel: true,
        prompt: '',
        emPromocao: false,
        precoPromocional: undefined
      })
      setPreviewImage(null)
      setFormModified(false) // Reseta o estado de modificação
    }
  }, [oraculistaId, oraculistas])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewImage(reader.result as string)
        setFormData(prev => ({
          ...prev,
          foto: reader.result as string,
          fotoFile: file
        }))
        setFormModified(true)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (oraculistaId) {
        // Atualizar oraculista existente
        await updateOraculista(oraculistaId, {
          ...formData,
          prompt_formatado: formData.prompt // Garante que o prompt é salvo no campo correto
        })
      } else {
        // Adicionar novo oraculista
        await createOraculista({
          ...formData,
          prompt_formatado: formData.prompt // Garante que o prompt é salvo no campo correto
        })
      }
      onClose()
    } catch (err: any) {
      console.error('Erro ao salvar oraculista:', err)
      setError(err.message || 'Erro ao salvar oraculista')
    } finally {
      setLoading(false)
    }
  }

  const handleFormChange = (newData: Partial<OraculistaFormData>) => {
    setFormData(prev => ({ ...prev, ...newData }))
    setFormModified(true)
  }

  const adicionarEspecialidade = () => {
    if (novaEspecialidade.trim() && !formData.especialidades.includes(novaEspecialidade.trim())) {
      setFormData(prev => ({
        ...prev,
        especialidades: [...prev.especialidades, novaEspecialidade.trim()]
      }))
      setNovaEspecialidade('')
      setFormModified(true)
    }
  }

  const removerEspecialidade = (index: number) => {
    setFormData(prev => ({
      ...prev,
      especialidades: prev.especialidades.filter((_, i) => i !== index)
    }))
    setFormModified(true)
  }

  const handleClose = () => {
    if (formModified) {
      if (window.confirm('Existem alterações não salvas. Deseja realmente sair?')) {
        onClose()
      }
    } else {
      onClose()
    }
  }

  const formatarData = (data: string) => {
    return format(new Date(data), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
      locale: ptBR
    })
  }

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/80" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-start justify-center p-4 overflow-y-auto">
        <div className="mt-[15vh] w-full">
          <Dialog.Panel className="mx-auto max-w-3xl w-full bg-black border border-primary/20 rounded-xl shadow-xl">
            <div className="flex justify-between items-center p-6 border-b border-primary/20">
              <Dialog.Title className="text-xl font-bold text-primary">
                {oraculistaId ? 'Editar Oraculista' : 'Novo Oraculista'}
              </Dialog.Title>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(75vh-8rem)]">
              {/* Foto */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Foto do Oraculista
                </label>
                <div className="mt-1 flex items-center gap-x-3">
                  {previewImage ? (
                    <Image
                      src={previewImage}
                      alt="Preview"
                      width={96}
                      height={96}
                      className="h-24 w-24 rounded-lg object-cover"
                    />
                  ) : (
                    <PhotoIcon className="h-24 w-24 text-gray-300" aria-hidden="true" />
                  )}
                  <button
                    type="button"
                    onClick={() => document.getElementById('foto-input')?.click()}
                    className="rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-white/20"
                  >
                    Alterar
                  </button>
                  <input
                    type="file"
                    id="foto-input"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Nome */}
              <div>
                <label htmlFor="nome" className="block text-sm font-medium text-gray-300">
                  Nome
                </label>
                <input
                  type="text"
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => handleFormChange({ nome: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white/5 py-2 px-3 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm text-white"
                  required
                />
              </div>

              {/* Especialidades */}
              <div>
                <label className="block text-sm font-medium text-gray-300">
                  Especialidades
                </label>
                <div className="mt-2 space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={novaEspecialidade}
                      onChange={(e) => setNovaEspecialidade(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), adicionarEspecialidade())}
                      className="flex-1 rounded-md border border-gray-300 bg-white/5 py-2 px-3 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm text-white"
                      placeholder="Nova especialidade..."
                    />
                    <button
                      type="button"
                      onClick={adicionarEspecialidade}
                      className="rounded-md bg-primary/20 px-3 py-2 text-sm font-semibold text-primary shadow-sm hover:bg-primary/30"
                    >
                      Adicionar
                    </button>
                  </div>
                  <div className="space-y-2">
                    {formData.especialidades.map((esp, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="flex-1 text-sm text-gray-300">{esp}</span>
                        <button
                          type="button"
                          onClick={() => removerEspecialidade(index)}
                          className="text-red-500 hover:text-red-400"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label htmlFor="descricao" className="block text-sm font-medium text-gray-300">
                  Descrição
                </label>
                <textarea
                  id="descricao"
                  rows={3}
                  value={formData.descricao}
                  onChange={(e) => handleFormChange({ descricao: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white/5 py-2 px-3 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm text-white"
                  required
                />
              </div>

              {/* Preço */}
              <div>
                <label htmlFor="preco" className="block text-sm font-medium text-gray-300">
                  Preço por consulta (R$)
                </label>
                <input
                  type="number"
                  id="preco"
                  value={formData.preco}
                  onChange={(e) => handleFormChange({ preco: Number(e.target.value) })}
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white/5 py-2 px-3 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm text-white"
                  required
                  min="0"
                  step="0.01"
                />
              </div>

              {/* Promoção */}
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="emPromocao"
                    checked={formData.emPromocao}
                    onChange={(e) => handleFormChange({ 
                      emPromocao: e.target.checked,
                      precoPromocional: e.target.checked ? formData.precoPromocional : undefined 
                    })}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="emPromocao" className="ml-2 block text-sm font-medium text-gray-300">
                    Em promoção
                  </label>
                </div>

                {formData.emPromocao && (
                  <div>
                    <label htmlFor="precoPromocional" className="block text-sm font-medium text-gray-300">
                      Preço promocional (R$)
                    </label>
                    <input
                      type="number"
                      id="precoPromocional"
                      value={formData.precoPromocional || ''}
                      onChange={(e) => handleFormChange({ precoPromocional: Number(e.target.value) })}
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-white/5 py-2 px-3 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm text-white"
                      required={formData.emPromocao}
                      min="0"
                      step="0.01"
                    />
                  </div>
                )}
              </div>

              {/* Disponibilidade */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="disponivel"
                  checked={formData.disponivel}
                  onChange={(e) => handleFormChange({ disponivel: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="disponivel" className="ml-2 block text-sm font-medium text-gray-300">
                  Disponível para consultas
                </label>
              </div>

              {/* Prompt */}
              <div>
                <label htmlFor="prompt" className="block text-sm font-medium text-gray-300">
                  Prompt de personalidade
                </label>
                <textarea
                  id="prompt"
                  rows={5}
                  value={formData.prompt}
                  onChange={(e) => handleFormChange({ prompt: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white/5 py-2 px-3 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm text-white"
                  placeholder="Descreva a personalidade e características do oraculista..."
                />
              </div>

              {error && (
                <div className="rounded-md bg-red-500/10 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      {/* Ícone de erro aqui */}
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        Erro ao salvar oraculista
                      </h3>
                      <div className="mt-2 text-sm text-red-700">
                        <p>{error}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-x-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-white/20"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </div>
    </Dialog>
  )
}
