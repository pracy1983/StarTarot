'use client'

import { useState, useEffect } from 'react'
import { Dialog } from '@headlessui/react'
import { XMarkIcon, PhotoIcon } from '@heroicons/react/24/outline'
import { useOraculistasStore } from '../store/oraculistasStore'
import { OraculistaFormData } from '../types/oraculista'
import Image from 'next/image'
import { NumericInput } from '@/components/common/NumericInput'

interface OraculistaModalProps {
  isOpen: boolean
  onClose: () => void
  oraculistaId?: string | null
}

interface EstadoOraculista extends Partial<OraculistaFormData> {
  emPromocao: boolean;
  em_promocao: boolean;
  precoPromocional?: number | null;
  preco_promocional?: number | null;
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
    em_promocao: false,
    precoPromocional: undefined,
    preco_promocional: undefined,
    rating: 0,
    status: 'offline',
    totalAvaliacoes: 0
  })
  const [novaEspecialidade, setNovaEspecialidade] = useState('')
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formModified, setFormModified] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Carrega os oraculistas quando o modal abre
  useEffect(() => {
    if (isOpen) {
      const loadData = async () => {
        try {
          console.log('Carregando oraculistas...')
          await carregarOraculistas()
          console.log('Oraculistas carregados:', oraculistas.length)
        } catch (err) {
          const error = err as Error;
          console.error('Erro ao carregar oraculistas:', error);
          setError(error.message || 'Erro ao carregar oraculistas');
        }
      }
      loadData()
    }
  }, [isOpen, carregarOraculistas])

  // Atualiza o formulário quando um oraculista é selecionado
  useEffect(() => {
    if (oraculistaId && oraculistas) {
      console.log('Procurando oraculista:', oraculistaId)
      console.log('Oraculistas disponíveis:', oraculistas.map(o => ({ id: o.id, nome: o.nome })))
      
      const oraculista = oraculistas.find(o => o.id === oraculistaId)
      console.log('Oraculista encontrado:', oraculista)
      
      if (oraculista) {
        setFormData({
          ...oraculista,
          emPromocao: oraculista.em_promocao || false,
          em_promocao: oraculista.em_promocao || false,
          precoPromocional: oraculista.preco_promocional || null,
          preco_promocional: oraculista.preco_promocional || null,
          rating: oraculista.rating || 0,
          status: oraculista.status || 'offline',
          totalAvaliacoes: oraculista.totalAvaliacoes || 0
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
        em_promocao: false,
        precoPromocional: undefined,
        preco_promocional: undefined,
        rating: 0,
        status: 'offline',
        totalAvaliacoes: 0
      })
      setPreviewImage(null)
      setFormModified(false) // Reseta o estado de modificação
    }
  }, [oraculistaId, oraculistas])

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        nome: '',
        foto: '',
        especialidades: [],
        descricao: '',
        preco: 0,
        disponivel: true,
        prompt: '',
        emPromocao: false,
        em_promocao: false,
        precoPromocional: null,
        preco_promocional: null,
        rating: 0,
        status: 'offline',
        totalAvaliacoes: 0
      });
      setPreviewImage(null);
      setError(null);
      setFormModified(false);
    }
  }, [isOpen]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        setError('Imagem muito grande. Máximo de 5MB.');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('Arquivo deve ser uma imagem.');
        return;
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string;
        if (result) {
          setPreviewImage(result)
          setFormData(prev => ({
            ...prev,
            foto: result,
            fotoFile: file
          }))
          setFormModified(true)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!validateForm()) {
      setLoading(false)
      return
    }

    try {
      const dataToSend: OraculistaFormData = {
        ...formData,
        em_promocao: formData.emPromocao || false,
        preco_promocional: formData.precoPromocional || null,
        prompt_formatado: formData.prompt || '',
        rating: formData.rating || 0,
        status: formData.status || 'offline',
        totalAvaliacoes: formData.totalAvaliacoes || 0
      }
      
      if (oraculistaId) {
        const result = await atualizarOraculista(oraculistaId, dataToSend)
        if (!result.success) {
          setError(result.error || 'Erro ao atualizar oraculista')
          return
        }
      } else {
        const result = await adicionarOraculista(dataToSend)
        if (!result.success) {
          setError(result.error || 'Erro ao salvar oraculista')
          return
        }
      }
      onClose()
    } catch (err) {
      const error = err as Error;
      if (error.message.includes('network') || error.message.includes('Network')) {
        setError('Erro de conexão. Verifique sua internet.');
      } else {
        setError(error.message || 'Erro ao salvar oraculista');
      }
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  }

  const handleFormChange = (newData: Partial<OraculistaFormData>) => {
    setFormData(prev => {
      const updated = { ...prev, ...newData };
      if ('emPromocao' in newData) {
        updated.em_promocao = newData.emPromocao || false;
      }
      if ('precoPromocional' in newData) {
        updated.preco_promocional = newData.precoPromocional || null;
      }
      return updated;
    });
    setFormModified(true);
  }

  const adicionarEspecialidade = () => {
    const especialidadeTrimmed = novaEspecialidade?.trim();
    if (!especialidadeTrimmed) {
      setError('Especialidade não pode estar vazia');
      return;
    }
    if (especialidadeTrimmed && 
        !formData.especialidades?.includes(especialidadeTrimmed) &&
        formData.especialidades?.length < 10) {
      setFormData(prev => ({
        ...prev,
        especialidades: [...(prev.especialidades || []), especialidadeTrimmed]
      }))
      setNovaEspecialidade('')
      setError(null)
    }
  }

  const removerEspecialidade = (index: number) => {
    setFormData(prev => ({
      ...prev,
      especialidades: prev.especialidades?.filter((_, i) => i !== index) || []
    }))
    setFormModified(true)
  }

  const handleClose = () => {
    if (loading) {
      return;
    }
    
    const limparForm = () => {
      setFormData({
        nome: '',
        foto: '',
        especialidades: [],
        descricao: '',
        preco: 0,
        disponivel: true,
        prompt: '',
        emPromocao: false,
        em_promocao: false,
        precoPromocional: null,
        preco_promocional: null,
        rating: 0,
        status: 'offline',
        totalAvaliacoes: 0
      });
      setPreviewImage(null);
      setError(null);
      setFormModified(false);
      setNovaEspecialidade('');
      onClose();
    };

    if (formModified) {
      if (window.confirm('Existem alterações não salvas. Deseja realmente sair?')) {
        limparForm();
      }
    } else {
      limparForm();
    }
  }

  const handleEmPromocaoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const novoEstado: EstadoOraculista = {
      ...formData,
      emPromocao: e.target.checked,
      em_promocao: e.target.checked,
      precoPromocional: e.target.checked ? formData.precoPromocional : null,
      preco_promocional: e.target.checked ? formData.preco_promocional : null
    };

    handleFormChange(novoEstado);

    // Salva imediatamente se houver um oraculistaId
    if (oraculistaId) {
      setLoading(true);
      try {
        const result = await atualizarOraculista(oraculistaId, novoEstado);
        if (!result.success) {
          setError(result.error || 'Erro ao atualizar promoção');
          handleFormChange({ emPromocao: !e.target.checked });
        }
      } catch (err) {
        const error = err as Error;
        console.error('Erro ao atualizar promoção:', error);
        setError(error.message || 'Erro ao atualizar promoção');
        handleFormChange({ emPromocao: !e.target.checked });
      } finally {
        setLoading(false);
      }
    }
  };

  const handlePrecoPromocionalChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const novoPreco = e.target.value === '' ? null : Number(e.target.value);
    
    if (novoPreco !== null && novoPreco >= formData.preco) {
      setError('Preço promocional deve ser menor que o preço normal');
      return;
    }
    
    const novoFormData = {
      ...formData,
      precoPromocional: novoPreco,
      preco_promocional: novoPreco
    };
    handleFormChange(novoFormData);
    
    // Salva no banco se houver um oraculistaId
    if (oraculistaId) {
      setLoading(true);
      try {
        const result = await atualizarOraculista(oraculistaId, novoFormData);
        if (!result.success) {
          setError(result.error || 'Erro ao atualizar preço promocional');
          handleFormChange({ ...formData });
        }
      } catch (err) {
        const error = err as Error;
        console.error('Erro ao atualizar preço promocional:', error);
        setError(error.message || 'Erro ao atualizar preço promocional');
        handleFormChange({ ...formData });
      } finally {
        setLoading(false);
      }
    }
  };

  // Validar preço
  const handlePrecoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = Number(e.target.value);
    if (valor >= 0) {
      handleFormChange({ preco: valor });
    }
  }

  const validateForm = (): boolean => {
    if (!formData.nome.trim()) {
      setError('Nome é obrigatório');
      return false;
    }
    if (formData.preco <= 0) {
      setError('Preço deve ser maior que zero');
      return false;
    }
    if (formData.emPromocao && (!formData.precoPromocional || formData.precoPromocional >= formData.preco)) {
      setError('Preço promocional deve ser menor que o preço normal');
      return false;
    }
    if (!formData.especialidades?.length) {
      setError('Adicione pelo menos uma especialidade');
      return false;
    }
    if (!formData.descricao?.trim()) {
      setError('Descrição é obrigatória');
      return false;
    }
    return true;
  }

  const getInputValue = (value: number | null | undefined): string | number => {
    if (value === null || value === undefined) return '';
    return value;
  }

  useEffect(() => {
    return () => {
      if (previewImage) {
        URL.revokeObjectURL(previewImage);
      }
    };
  }, [previewImage]);

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
                    onChange={handlePrecoChange}
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
                    <NumericInput
                      value={formData.precoPromocional}
                      onChange={(value) => {
                        handleFormChange({ 
                          precoPromocional: value,
                          preco_promocional: value 
                        });
                      }}
                      min={0}
                      step={0.01}
                      className="w-full bg-black border border-primary/20 rounded-lg px-4 py-2"
                    />
                  </div>
                )}
              </div>

              {loading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
                </div>
              )}

              {error && (
                <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-red-500 text-sm">
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
                  disabled={loading}
                  className={`px-4 py-2 rounded-lg ${
                    loading 
                      ? 'bg-gray-600 cursor-not-allowed' 
                      : 'bg-primary hover:bg-primary/80'
                  }`}
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
