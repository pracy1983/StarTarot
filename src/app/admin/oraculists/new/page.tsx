'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useOraculistasStore } from '@/modules/oraculistas/store/oraculistasStore'
import { savePromptForOraculista } from '@/config/prompts/oraculistas'
import { OraculistaFormData } from '@/modules/oraculistas/types/oraculista'

export default function NovoOraculistaPage() {
  const router = useRouter()
  const { adicionarOraculista } = useOraculistasStore()
  const [loading, setLoading] = useState(false)
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
    setLoading(true)
    setError(null)

    try {
      // Salva o prompt em um arquivo separado
      await savePromptForOraculista(formData.nome, formData.prompt)

      // Adiciona o oraculista
      const result = await adicionarOraculista(formData)
      
      if (result.success) {
        router.push('/admin/oraculists')
      } else {
        setError(result.error || 'Erro ao adicionar oraculista')
      }
    } catch (err) {
      setError('Erro ao salvar oraculista')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-primary">Novo Oraculista</h1>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-sm text-gray-300 hover:text-white"
          >
            Voltar
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Foto */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Foto do Oraculista
            </label>
            <div className="flex items-center space-x-4">
              <div className="relative w-32 h-32 border-2 border-dashed border-primary/50 rounded-lg overflow-hidden">
                {previewImage ? (
                  <img
                    src={previewImage}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full text-gray-400">
                    <span>Sem foto</span>
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="block w-full text-sm text-gray-300
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-semibold
                  file:bg-primary/10 file:text-primary
                  hover:file:bg-primary/20"
              />
            </div>
          </div>

          {/* Nome */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Nome
            </label>
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
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Especialidades
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={novaEspecialidade}
                onChange={e => setNovaEspecialidade(e.target.value)}
                className="flex-1 px-4 py-2 bg-black/40 border border-primary/20 rounded-lg
                  focus:ring-2 focus:ring-primary/20 focus:border-primary/40
                  text-white placeholder-gray-500"
                placeholder="Nova especialidade"
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
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Descrição
            </label>
            <textarea
              value={formData.descricao}
              onChange={e => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
              className="w-full px-4 py-2 bg-black/40 border border-primary/20 rounded-lg
                focus:ring-2 focus:ring-primary/20 focus:border-primary/40
                text-white placeholder-gray-500 h-32"
              placeholder="Descrição do oraculista"
              required
            />
          </div>

          {/* Valor */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Valor da Consulta
            </label>
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

          {/* Prompt */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Prompt de Personalidade
            </label>
            <textarea
              value={formData.prompt}
              onChange={e => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
              className="w-full px-4 py-2 bg-black/40 border border-primary/20 rounded-lg
                focus:ring-2 focus:ring-primary/20 focus:border-primary/40
                text-white placeholder-gray-500 h-48"
              placeholder="Descreva a personalidade e características do oraculista..."
              required
            />
            <p className="text-sm text-gray-400">
              Este prompt será usado para definir como o oraculista responde às consultas.
              Seja detalhado na descrição da personalidade, modo de falar e especialidades.
            </p>
          </div>

          {/* Botões */}
          <div className="flex justify-end space-x-4 pt-6">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-primary/20 text-primary rounded-lg
                hover:bg-primary/10 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-primary text-white rounded-lg
                hover:bg-primary/90 transition-colors disabled:opacity-50
                disabled:cursor-not-allowed"
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>

        {/* Estatísticas */}
        <div className="mt-8 p-6 bg-black/40 border border-primary/20 rounded-lg">
          <h2 className="text-xl font-semibold text-primary mb-4">
            Estatísticas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-black/40 rounded-lg">
              <p className="text-sm text-gray-400">Total de Consultas</p>
              <p className="text-2xl font-bold text-primary">0</p>
            </div>
            <div className="p-4 bg-black/40 rounded-lg">
              <p className="text-sm text-gray-400">Avaliação Média</p>
              <p className="text-2xl font-bold text-primary">-</p>
            </div>
            <div className="p-4 bg-black/40 rounded-lg">
              <p className="text-sm text-gray-400">Cliente Desde</p>
              <p className="text-2xl font-bold text-primary">Hoje</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
