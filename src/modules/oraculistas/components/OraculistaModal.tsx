'use client'

import { useState, useEffect } from 'react'
import { Dialog } from '@headlessui/react'
import { XMarkIcon, PhotoIcon } from '@heroicons/react/24/outline'
import { useOraculistasStore } from '../store/oraculistasStore'
import { OraculistaFormData } from '../types/oraculista'
import Image from 'next/image'

interface OraculistaModalProps {
  isOpen: boolean
  onClose: () => void
  oraculistaId?: string | null
}

interface EstadoOraculista extends Partial<OraculistaFormData> {
  emPromocao: boolean;
  precoPromocional?: number;
}

export function OraculistaModal({ isOpen, onClose, oraculistaId }: OraculistaModalProps) {
  const { oraculistas, adicionarOraculista, atualizarOraculista, carregarOraculistas } = useOraculistasStore()
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
        await carregarOraculistas()
        console.log('Oraculistas carregados:', oraculistas.length)
      }
      loadData()
    }
  }, [isOpen, carregarOraculistas])

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
        const result = await atualizarOraculista(oraculistaId, {
          ...formData,
          prompt_formatado: formData.prompt // Garante que o prompt é salvo no campo correto
        })
        if (!result.success) {
          setError(result.error || 'Erro ao atualizar oraculista')
          return
        }
      } else {
        // Adicionar novo oraculista
        const result = await adicionarOraculista({
          ...formData,
          prompt_formatado: formData.prompt // Garante que o prompt é salvo no campo correto
        })
        if (!result.success) {
          setError(result.error || 'Erro ao salvar oraculista')
          return
        }
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

  const handleEmPromocaoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const novoEstado: EstadoOraculista = {
      ...formData,
      emPromocao: e.target.checked,
      precoPromocional: e.target.checked ? formData.precoPromocional : undefined
    };

    handleFormChange(novoEstado);

    // Salva imediatamente se houver um oraculistaId
    if (oraculistaId) {
      setLoading(true);
      try {
        const result = await atualizarOraculista(oraculistaId, novoEstado);
        if (!result.success) {
          setError(result.error || 'Erro ao atualizar promoção');
          // Reverte a mudança em caso de erro
          handleFormChange({ emPromocao: !e.target.checked });
        }
      } catch (err: any) {
        console.error('Erro ao atualizar promoção:', err);
        setError(err.message || 'Erro ao atualizar promoção');
        // Reverte a mudança em caso de erro
        handleFormChange({ emPromocao: !e.target.checked });
      } finally {
        setLoading(false);
      }
    }
  };

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
                <div className="flex items-center gap-4">
                  <div className="relative w-24 h-24 rounded-full overflow-hidden bg-primary/10">
                    {previewImage ? (
                      <Image
                        src={previewImage}
                        alt="Preview"
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <PhotoIcon className="w-12 h-12 text-primary/40 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="block w-full text-sm text-gray-300
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-primary/10 file:text-primary
                      hover:file:bg-primary/20"
                  />
                </div>
              </div>

              {/* Dados Básicos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Nome
                  </label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={e => handleFormChange({ nome: e.target.value })}
                    className="w-full bg-black border border-primary/20 rounded-lg px-4 py-2 text-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Preço da Consulta
                  </label>
                  <input
                    type="number"
                    value={formData.preco}
                    onChange={e => handleFormChange({ preco: Number(e.target.value) })}
                    className="w-full bg-black border border-primary/20 rounded-lg px-4 py-2 text-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              {/* Especialidades */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Especialidades
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.especialidades.map((esp, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 rounded-full text-sm text-primary"
                    >
                      {esp}
                      <button
                        type="button"
                        onClick={() => removerEspecialidade(index)}
                        className="text-primary hover:text-primary/80"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={novaEspecialidade}
                    onChange={e => setNovaEspecialidade(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), adicionarEspecialidade())}
                    className="flex-1 bg-black border border-primary/20 rounded-lg px-4 py-2 text-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="Digite uma especialidade e pressione Enter"
                  />
                  <button
                    type="button"
                    onClick={adicionarEspecialidade}
                    className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors duration-200"
                  >
                    Adicionar
                  </button>
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Descrição
                </label>
                <textarea
                  value={formData.descricao}
                  onChange={e => handleFormChange({ descricao: e.target.value })}
                  className="w-full bg-black border border-primary/20 rounded-lg px-4 py-2 text-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                  rows={3}
                  required
                />
              </div>

              {/* Prompt */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Prompt Personalizado
                </label>
                <textarea
                  value={formData.prompt}
                  onChange={e => handleFormChange({ prompt: e.target.value })}
                  className="w-full bg-black border border-primary/20 rounded-lg px-4 py-2 text-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                  rows={5}
                  placeholder="Digite o prompt que será usado para personalizar as respostas deste oraculista..."
                />
              </div>

              {/* Status e Promoção */}
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="disponivel"
                    checked={formData.disponivel}
                    onChange={e => handleFormChange({ disponivel: e.target.checked })}
                    className="rounded border-primary/20 text-primary focus:ring-primary"
                  />
                  <label htmlFor="disponivel" className="text-sm text-gray-300">
                    Disponível para consultas
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="promocao"
                    checked={formData.emPromocao}
                    onChange={handleEmPromocaoChange}
                    className="rounded border-primary/20 text-primary focus:ring-primary"
                  />
                  <label htmlFor="promocao" className="text-sm text-gray-300">
                    Ativar preço promocional
                  </label>
                </div>

                {formData.emPromocao && (
                  <div className="flex-1">
                    <input
                      type="number"
                      value={formData.precoPromocional || ''}
                      onChange={async (e) => {
                        const novoPreco = Number(e.target.value);
                        
                        // Atualiza o estado local primeiro
                        const novoFormData = {
                          ...formData,
                          precoPromocional: novoPreco
                        };
                        handleFormChange(novoFormData);
                        
                        // Salva no banco
                        if (oraculistaId) {
                          setLoading(true);
                          try {
                            const result = await atualizarOraculista(oraculistaId, novoFormData);
                            if (!result.success) {
                              setError(result.error || 'Erro ao atualizar preço promocional');
                              // Reverte em caso de erro
                              handleFormChange({ ...formData });
                            }
                          } catch (err: any) {
                            console.error('Erro ao atualizar preço promocional:', err);
                            setError(err.message || 'Erro ao atualizar preço promocional');
                            // Reverte em caso de erro
                            handleFormChange({ ...formData });
                          } finally {
                            setLoading(false);
                          }
                        }
                      }}
                      className="w-full bg-black border border-primary/20 rounded-lg px-4 py-2 text-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                      min="0"
                      step="0.01"
                      placeholder="Preço promocional"
                      required
                    />
                  </div>
                )}
              </div>

              {error && (
                <div className="mt-2 text-red-500 text-sm">
                  {error}
                </div>
              )}

              {/* Botões */}
              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-gray-300 hover:text-white"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors duration-200 disabled:opacity-50"
                  disabled={loading}
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
