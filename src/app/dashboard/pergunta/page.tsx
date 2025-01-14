'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { usePerguntaStore } from '@/stores/perguntaStore'

export default function PerguntaPage() {
  const router = useRouter()
  const user = useAuthStore(state => state.user)
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const enviarPergunta = usePerguntaStore(state => state.enviarPergunta)
  const [situacao, setSituacao] = useState('')
  const [pergunta, setPergunta] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!situacao.trim() || !pergunta.trim()) {
      setError('Por favor, preencha todos os campos')
      return
    }

    if (pergunta.split('?').length > 2) {
      setError('Por favor, faça apenas uma pergunta por vez')
      return
    }

    if (!user?.id) {
      setError('Usuário não autenticado')
      return
    }

    setIsLoading(true)

    try {
      const result = await enviarPergunta(situacao, pergunta, user.id)
      if (result.success) {
        router.push('/dashboard/espera')
      } else {
        setError(result.error || 'Erro ao enviar pergunta')
      }
    } catch (err) {
      setError('Erro ao enviar pergunta. Por favor, tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white relative space-y-8 p-8">
      {/* Cabeçalho */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-raleway font-bold text-primary">
          Faça sua Pergunta
        </h1>
        <p className="text-xl text-gray-300">
          Descreva sua situação e faça uma pergunta objetiva
        </p>
      </div>

      {/* Formulário */}
      <div className="max-w-2xl mx-auto">
        <form 
          onSubmit={handleSubmit}
          className="space-y-6 bg-black/40 p-8 rounded-2xl backdrop-blur-md border border-primary/20"
        >
          {/* Campo Situação */}
          <div className="space-y-2">
            <label 
              htmlFor="situacao" 
              className="block text-lg font-medium text-primary"
            >
              Descreva sua Situação
            </label>
            <textarea
              id="situacao"
              value={situacao}
              onChange={(e) => setSituacao(e.target.value)}
              placeholder="Descreva o contexto e detalhes importantes da sua situação..."
              className="w-full h-40 bg-gray-800/50 text-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {/* Campo Pergunta */}
          <div className="space-y-2">
            <label 
              htmlFor="pergunta" 
              className="block text-lg font-medium text-primary"
            >
              Sua Pergunta
            </label>
            <textarea
              id="pergunta"
              value={pergunta}
              onChange={(e) => setPergunta(e.target.value)}
              placeholder="Faça uma pergunta objetiva sobre sua situação..."
              className="w-full h-24 bg-gray-800/50 text-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
            <p className="text-sm text-gray-400">
              Limite de 1 pergunta por consulta. Seja específico e objetivo.
            </p>
          </div>

          {/* Erro */}
          {error && (
            <div className="text-red-500 text-center">
              {error}
            </div>
          )}

          {/* Botão Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className={`
              w-full py-3 rounded-lg font-medium text-black
              ${isLoading 
                ? 'bg-primary/50 cursor-not-allowed' 
                : 'bg-primary hover:bg-primary/90 transition-colors'
              }
            `}
          >
            {isLoading ? 'Enviando...' : 'Enviar Pergunta'}
          </button>
        </form>
      </div>
    </div>
  )
}
